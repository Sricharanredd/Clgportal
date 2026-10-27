"""Step 2 of seeding: synthetic students, enrolments, parents,
attendance sessions/records, examinations and results.

Everything here is DEMO/SYNTHETIC data — never real student records.
"""
from __future__ import annotations

import logging
import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import AttendanceStatus, ResultStatus
from app.core.security import hash_password
from app.models.academic import ClassSection, Subject
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.exam import ExamResult, Examination
from app.models.student import Enrollment, Parent, Student, StudentParentLink
from app.models.user import User

logger = logging.getLogger("cmp.seed")

rng = random.Random(20251027)  # deterministic synthetic data

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Arjun", "Sai", "Ishaan", "Rohan", "Kiran",
    "Ananya", "Diya", "Ira", "Kavya", "Nisha", "Pooja", "Riya", "Sneha",
    "Tanvi", "Zoya", "Harsha", "Nikhil", "Praneeth", "Sandeep", "Varun",
    "Lakshmi", "Divya", "Swathi", "Mohan", "Tejas",
]
LAST_NAMES = [
    "Sharma", "Reddy", "Iyer", "Nair", "Rao", "Kumar", "Patel", "Das",
    "Verma", "Shetty", "Gowda", "Menon", "Pillai", "Choudhary", "Sinha",
    "Bose", "Mehta", "Joshi",
]

# students to generate per class key
STUDENTS_PER_CLASS = {
    "MPC-I-A": 12,
    "MPC-II-A": 10,
    "BiPC-I-A": 12,
    "BiPC-II-A": 9,
    "CEC-I-A": 11,
    "CEC-II-A": 8,
}


def _parent_access_code(roll: str) -> str:
    """Demo parent access code (documented in README; synthetic only)."""
    return f"DEMO-{roll}"


def seed_students(db: Session, ref: dict) -> list[dict]:
    """Create students + enrolments + parents. Returns student records."""
    branch_ids: dict[str, int] = ref["branch_ids"]
    class_ids: dict[str, int] = ref["class_ids"]
    year_id: int = ref["academic_year_id"]
    code_by_branch = {v: k for k, v in branch_ids.items()}
    branch_by_class = {k: k.split("-")[0] for k in class_ids}

    students: list[dict] = []
    seq_by_branch: dict[str, int] = {}

    # Skip if already seeded (idempotent re-run support)
    if db.query(Student).count() > 0:
        logger.info("Students already present (%d) — skipping", db.query(Student).count())
        return students

    for class_key, count in STUDENTS_PER_CLASS.items():
        class_id = class_ids[class_key]
        branch_code = branch_by_class[class_key]
        branch_id = branch_ids[branch_code]
        for _ in range(count):
            seq_by_branch[branch_code] = seq_by_branch.get(branch_code, 0) + 1
            roll = f"{branch_code.upper().replace('BIPC', 'BIP')}25{seq_by_branch[branch_code]:03d}"
            first = rng.choice(FIRST_NAMES)
            last = rng.choice(LAST_NAMES)
            student = Student(
                roll_number=roll,
                first_name=first,
                last_name=last,
                branch_id=branch_id,
                date_of_birth=date(2008 + rng.randint(0, 2), rng.randint(1, 12), rng.randint(1, 28)),
                gender=rng.choice(["male", "female"]),
                phone=f"98{rng.randint(10000000, 99999999)}",
                address=f"{rng.randint(1, 999)}, "
                f"{['Nehru Nagar', 'Gandhi Colony', 'Lake View', 'Rose Villa', 'MG Road'][rng.randint(0, 4)]}, "
                "Visakhapatnam",
                guardian_name=f"Mr./Ms. {last}",
                admission_date=date(2025, 6, rng.randint(1, 20)),
            )
            db.add(student)
            db.flush()
            db.add(
                Enrollment(
                    student_id=student.id,
                    class_section_id=class_id,
                    academic_year_id=year_id,
                    status="active",
                    enrolled_on=date(2025, 6, 1),
                )
            )
            parent = Parent(
                full_name=f"{student.guardian_name} ({first})",
                phone=student.phone,
                access_code_hash=hash_password(_parent_access_code(roll)),
                is_verified=True,
            )
            db.add(parent)
            db.flush()
            db.add(
                StudentParentLink(
                    student_id=student.id,
                    parent_id=parent.id,
                    relationship_type="guardian",
                )
            )
            students.append(
                {
                    "id": student.id,
                    "roll": roll,
                    "name": f"{first} {last}",
                    "class_id": class_id,
                    "branch_id": branch_id,
                    "access_code": _parent_access_code(roll),
                }
            )
    db.flush()
    db.commit()
    logger.info("Seeded %d students with enrolments & parents", len(students))
    return students


def _last_school_days(today: date, days: int) -> list[date]:
    """Most recent `days` weekdays (Mon–Sat, college works Mon–Sat)."""
    out: list[date] = []
    cursor = today
    while len(out) < days:
        if cursor.weekday() != 6:  # skip Sunday
            out.append(cursor)
        cursor -= timedelta(days=1)
    return list(reversed(out))


def seed_attendance(db: Session, ref: dict, students: list[dict]) -> None:
    """Attendance sessions for the last 10 school days for every class."""
    if db.query(AttendanceSession).count() > 0:
        logger.info("Attendance already present — skipping")
        return

    class_students: dict[int, list[int]] = {}
    for s in students:
        class_students.setdefault(s["class_id"], []).append(s["id"])

    faculty_for_class = _class_teacher_map(db, ref)
    today = date.today()
    work_days = _last_school_days(today, 10)

    sessions = 0
    records = 0
    for class_id, student_ids in class_students.items():
        teacher_id = faculty_for_class.get(class_id)
        if teacher_id is None:
            continue  # no assigned faculty (e.g. CEC in demo) → no sessions
        for d in work_days:
            session = AttendanceSession(
                class_section_id=class_id,
                attendance_date=d,
                status="submitted" if d < today else "draft",
                created_by=teacher_id,
                submitted_by=teacher_id if d < today else None,
                submitted_at=datetime.combine(d, time(10, 0)) if d < today else None,
            )
            db.add(session)
            db.flush()
            sessions += 1
            for sid in student_ids:
                r = rng.random()
                status = (
                    AttendanceStatus.PRESENT.value
                    if r > 0.10
                    else (
                        AttendanceStatus.LATE.value
                        if r > 0.05
                        else AttendanceStatus.ABSENT.value
                    )
                )
                db.add(
                    AttendanceRecord(
                        session_id=session.id,
                        student_id=sid,
                        status=status,
                        marked_by=teacher_id,
                    )
                )
                records += 1
    db.flush()
    db.commit()
    logger.info("Seeded %d attendance sessions, %d records", sessions, records)


def _class_teacher_map(db: Session, ref: dict) -> dict[int, int]:
    """class_section_id → faculty user id for seeding sessions.

    Prefers the class teacher; falls back to any faculty assigned to the
    class (subject teachers may take general attendance for their class)."""
    from app.models.academic import FacultyAssignment

    rows = db.query(FacultyAssignment).all()
    mapping: dict[int, int] = {}
    fallback: dict[int, int] = {}
    for r in rows:
        if r.assignment_type == "class_teacher":
            mapping.setdefault(r.class_section_id, r.user_id)
        else:
            fallback.setdefault(r.class_section_id, r.user_id)
    for class_id, user_id in fallback.items():
        mapping.setdefault(class_id, user_id)
    return mapping


def seed_examinations(db: Session, ref: dict, students: list[dict]) -> None:
    """Unit Test 1 (published) + Unit Test 2 (draft) with results."""
    if db.query(Examination).count() > 0:
        logger.info("Examinations already present — skipping")
        return

    class_ids: dict[str, int] = ref["class_ids"]
    subject_ids: dict[str, int] = ref["subject_ids"]
    year_id: int = ref["academic_year_id"]
    branch_of_class = {k: k.split("-")[0] for k in class_ids}
    subjects_by_branch: dict[str, list[str]] = {}
    for code, items in _subjects_by_branch().items():
        subjects_by_branch[code] = [c for c, _ in items]

    # enrolment lookup: student_id → enrollment id
    from app.models.student import Enrollment

    enrollments = {e.student_id: e.id for e in db.query(Enrollment).all()}
    students_by_class: dict[int, list[int]] = {}
    for s in students:
        students_by_class.setdefault(s["class_id"], []).append(s["id"])

    creator = db.query(User).filter(User.email == "principal@demo.edu").first().id
    publisher = creator

    exams_created = 0
    results_created = 0
    for class_key, class_id in class_ids.items():
        branch = branch_of_class[class_key]
        for sub_code in subjects_by_branch[branch]:
            for title, status in (("Unit Test 1", "published"), ("Unit Test 2", "draft")):
                exam = Examination(
                    title=title,
                    exam_type="unit_test",
                    class_section_id=class_id,
                    subject_id=subject_ids[sub_code],
                    academic_year_id=year_id,
                    exam_date=date(2025, 9, 15) if title == "Unit Test 1" else date(2025, 11, 5),
                    max_marks=Decimal("50.00"),
                    pass_marks=Decimal("17.00"),
                    status=status,
                    created_by=creator,
                    published_by=publisher if status == "published" else None,
                )
                db.add(exam)
                db.flush()
                exams_created += 1
                if status != "published":
                    # Draft exams carry partial entries (pending result work).
                    pass
                for sid in students_by_class.get(class_id, []):
                    if title == "Unit Test 2" and rng.random() < 0.55:
                        continue  # leave pending entries for the demo workflow
                    absent = rng.random() < 0.03
                    marks = Decimal(str(rng.randint(18, 50))) if not absent else Decimal("0.00")
                    db.add(
                        ExamResult(
                            examination_id=exam.id,
                            enrollment_id=enrollments[sid],
                            marks_obtained=marks,
                            is_absent=absent,
                            entered_by=creator,
                            updated_by=creator,
                        )
                    )
                    results_created += 1
    db.flush()
    db.commit()
    logger.info("Seeded %d examinations, %d results", exams_created, results_created)


def _subjects_by_branch() -> dict[str, list[tuple[str, str]]]:
    from app.seeding.reference import SUBJECTS

    return SUBJECTS


__all__ = ["seed_students", "seed_attendance", "seed_examinations"]
