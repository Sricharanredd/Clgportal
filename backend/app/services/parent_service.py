"""Parent lookup & verification service.

Security model (PRD §4 / §11):
- Step 1 (lookup): branch + roll number → masked identity + signed
  short-lived lookup token. Returns NO confidential data.
- Step 2 (verify): lookup token + parent access code (Argon2-hashed in DB)
  → read-only access token bound to `parent:{id}`.
- Every parent read request re-derives permissions and the linked-student
  set from the database; the token never grants write capability.
- Without verification (`PARENT_VERIFICATION_ENABLED=false`, demo only),
  synthetic students are still restricted to linked records.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt as pyjwt
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import create_access_token, decode_token, verify_password
from app.models.academic import AcademicYear, Branch, ClassSection
from app.models.student import Enrollment, Parent, Student, StudentParentLink
from app.schemas.parent import (
    DemoAttendanceStat,
    DemoBranchStat,
    DemoExamPassRate,
    DemoOverview,
    DemoYearPassRate,
    MaskedStudent,
    ParentChildSummary,
)

settings = get_settings()

LOOKUP_TOKEN_TTL_MINUTES = 10


def _mask(name: str) -> str:
    """'Aarav Sharma' → 'A*** S***' (first letter of each token kept)."""
    parts = [p for p in name.split() if p]
    return " ".join(f"{p[0]}***" if len(p) > 1 else "*" for p in parts)


def find_student(db: Session, branch_id: int, roll_number: str) -> Student | None:
    """Exact roll + branch match (case-insensitive, active students only)."""
    return (
        db.query(Student)
        .filter(
            Student.branch_id == branch_id,
            Student.roll_number == roll_number.strip().upper(),
            Student.is_active.is_(True),
        )
        .first()
    )


NAME_SEARCH_LIMIT = 10


def _escape_like(value: str) -> str:
    """Escape LIKE wildcards so user input is matched literally."""
    return (
        value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    )


def search_students_by_name(
    db: Session,
    *,
    name: str,
    branch_id: int | None = None,
    limit: int = NAME_SEARCH_LIMIT,
) -> list[tuple[Student, Branch, ClassSection | None]]:
    """Case-insensitive partial-name search for the public parent portal.

    Discovery aid only: returns `(student, branch, class_section)` rows so a
    guardian can disambiguate duplicates. It issues NO lookup token and NO
    confidential data — the caller must still pass `/lookup` + `/verify`.

    - Parameterised `ilike` with escaped wildcards (no string-built SQL).
    - Active students only; hard-capped `limit` so the table is never loaded.
    - Optional branch filter narrows the scan further.
    """
    from sqlalchemy import func, or_

    q = (
        db.query(Student, Branch, ClassSection)
        .join(Branch, Branch.id == Student.branch_id)
        .outerjoin(
            Enrollment,
            (Enrollment.student_id == Student.id) & (Enrollment.status == "active"),
        )
        .outerjoin(ClassSection, ClassSection.id == Enrollment.class_section_id)
        .filter(Student.is_active.is_(True))
    )
    if branch_id:
        q = q.filter(Student.branch_id == branch_id)

    pattern = f"%{_escape_like(name.strip())}%"
    q = q.filter(
        or_(
            Student.first_name.ilike(pattern, escape="\\"),
            Student.last_name.ilike(pattern, escape="\\"),
            func.concat(Student.first_name, " ", Student.last_name).ilike(
                pattern, escape="\\"
            ),
        )
    )

    # A student with several enrolment rows could repeat; dedupe by id while
    # preserving roll-number order and honouring the cap.
    rows = q.order_by(Student.roll_number).limit(limit * 3).all()
    seen: set[int] = set()
    out: list[tuple[Student, Branch, ClassSection | None]] = []
    for student, branch, cls in rows:
        if student.id in seen:
            continue
        seen.add(student.id)
        out.append((student, branch, cls))
        if len(out) >= limit:
            break
    return out


def create_lookup_token(student: Student) -> str:
    """Signed token proving a successful lookup (10-minute validity)."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": f"lookup:{student.id}",
        "type": "lookup",
        "iat": now,
        "exp": now + timedelta(minutes=LOOKUP_TOKEN_TTL_MINUTES),
    }
    return pyjwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _masked_student(db: Session, student: Student) -> MaskedStudent:
    branch = db.query(Branch).filter(Branch.id == student.branch_id).first()
    cls = (
        db.query(ClassSection)
        .join(Enrollment, Enrollment.class_section_id == ClassSection.id)
        .filter(
            Enrollment.student_id == student.id,
            Enrollment.status == "active",
        )
        .first()
    )
    return MaskedStudent(
        student_id=student.id,
        roll_number=student.roll_number,
        masked_name=_mask(student.full_name),
        branch_code=branch.code if branch else "?",
        class_section=cls.section_name if cls else None,
    )


def verify_lookup_token(token: str) -> int:
    """Validate the lookup token; return student id. Raises 401 on failure."""
    try:
        payload = decode_token(token)
    except pyjwt.PyJWTError:
        raise AppError(401, "LOOKUP_EXPIRED", "Search session expired. Please search again.")
    if payload.get("type") != "lookup":
        raise AppError(401, "LOOKUP_EXPIRED", "Search session expired. Please search again.")
    try:
        return int(str(payload.get("sub", "")).split(":", 1)[1])
    except (ValueError, IndexError):
        raise AppError(401, "LOOKUP_EXPIRED", "Search session expired. Please search again.")


def verify_access_code(db: Session, student_id: int, access_code: str) -> Parent:
    """Match access code against the student's linked parent (Argon2)."""
    links = (
        db.query(StudentParentLink)
        .options(joinedload(StudentParentLink.parent))
        .filter(StudentParentLink.student_id == student_id)
        .all()
    )
    for link in links:
        parent = link.parent
        if (
            parent is not None
            and parent.is_active
            and parent.access_code_hash
            and verify_password(access_code, parent.access_code_hash)
        ):
            return parent
    # Same generic message whether no link or wrong code — no enumeration.
    raise AppError(401, "INVALID_ACCESS_CODE", "Invalid access code for this student.")


def issue_parent_token(parent: Parent) -> tuple[str, int]:
    """Read-only access token for `parent:{id}` (no refresh for parents)."""
    token = create_access_token(f"parent:{parent.id}")
    payload = decode_token(token)
    return token, int(payload["exp"] - payload["iat"])


def list_children(db: Session, parent_id: int) -> list[ParentChildSummary]:
    """Students linked to this parent (current active enrolment)."""
    rows = (
        db.query(Student, Branch, ClassSection)
        .join(StudentParentLink, StudentParentLink.student_id == Student.id)
        .join(Branch, Branch.id == Student.branch_id)
        .outerjoin(
            Enrollment,
            (Enrollment.student_id == Student.id) & (Enrollment.status == "active"),
        )
        .outerjoin(ClassSection, ClassSection.id == Enrollment.class_section_id)
        .filter(StudentParentLink.parent_id == parent_id, Student.is_active.is_(True))
        .all()
    )
    out: list[ParentChildSummary] = []
    for student, branch, cls in rows:
        out.append(
            ParentChildSummary(
                student_id=student.id,
                roll_number=student.roll_number,
                full_name=student.full_name,
                branch_code=branch.code,
                class_section=cls.section_name if cls else None,
            )
        )
    return out


def list_directory(
    db: Session,
    *,
    q: str | None = None,
    branch_id: int | None = None,
    page: int = 1,
    page_size: int = 12,
) -> tuple[list[tuple[Student, Branch, ClassSection | None, AcademicYear | None]], int]:
    """Open parent directory (DEMO ONLY — flag-gated by the router).

    Returns active students with their current enrolment. Name/roll search
    is literal (wildcards escaped) and branch filtering is optional.
    Deliberately excludes every sensitive column: no DOB, contacts, guardian
    or fee data — those stay on the per-student read-only endpoints.
    """
    from sqlalchemy import func, or_

    query = (
        db.query(Student, Branch, ClassSection, AcademicYear)
        .join(Branch, Branch.id == Student.branch_id)
        .outerjoin(
            Enrollment,
            (Enrollment.student_id == Student.id) & (Enrollment.status == "active"),
        )
        .outerjoin(ClassSection, ClassSection.id == Enrollment.class_section_id)
        .outerjoin(AcademicYear, AcademicYear.id == Enrollment.academic_year_id)
        .filter(Student.is_active.is_(True))
        .filter(or_(AcademicYear.id.is_(None), AcademicYear.is_current.is_(True)))
    )
    if branch_id:
        query = query.filter(Student.branch_id == branch_id)
    if q and q.strip():
        pattern = f"%{_escape_like(q.strip())}%"
        query = query.filter(
            or_(
                Student.roll_number.ilike(pattern, escape="\\"),
                Student.first_name.ilike(pattern, escape="\\"),
                Student.last_name.ilike(pattern, escape="\\"),
                func.concat(Student.first_name, " ", Student.last_name).ilike(
                    pattern, escape="\\"
                ),
            )
        )

    total = (
        query.with_entities(func.count(func.distinct(Student.id))).scalar() or 0
    )
    rows = (
        query.with_entities(Student, Branch, ClassSection, AcademicYear)
        .order_by(Student.roll_number)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return rows, int(total)


def demo_overview(db: Session) -> DemoOverview:
    """College-wide aggregates for the public demo overview.

    Computed from live tables only:
    - strength per active branch,
    - attendance counts for the most recent submitted session date,
    - published-result pass rates per year of study and per exam.

    Nothing here invents a figure. Empty datasets return zeros/empty lists so
    the UI can render a proper empty state instead of fake numbers.
    """
    from datetime import datetime as _datetime

    from sqlalchemy import func

    from app.models.attendance import AttendanceRecord, AttendanceSession
    from app.models.exam import ExamResult, Examination

    total_students = (
        db.query(func.count(Student.id)).filter(Student.is_active.is_(True)).scalar() or 0
    )

    branch_rows = (
        db.query(
            Branch.id,
            Branch.code,
            Branch.name,
            func.count(Student.id),
        )
        .outerjoin(
            Student,
            (Student.branch_id == Branch.id) & (Student.is_active.is_(True)),
        )
        .filter(Branch.is_active.is_(True))
        .group_by(Branch.id, Branch.code, Branch.name)
        .order_by(Branch.display_order, Branch.id)
        .all()
    )
    branches = [
        DemoBranchStat(
            branch_id=branch_id,
            code=code,
            name=name,
            students=int(students or 0),
            share_pct=_pct(int(students or 0), total_students),
        )
        for branch_id, code, name, students in branch_rows
    ]

    # ---- Attendance: latest submitted session date --------------------------
    latest = (
        db.query(func.max(AttendanceSession.attendance_date))
        .filter(AttendanceSession.status == "submitted")
        .scalar()
    )
    attendance = DemoAttendanceStat(attendance_date=latest)
    if latest is not None:
        counts = dict(
            db.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
            .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
            .filter(
                AttendanceSession.attendance_date == latest,
                AttendanceSession.status == "submitted",
            )
            .group_by(AttendanceRecord.status)
            .all()
        )
        attendance.present = int(counts.get("present", 0))
        attendance.absent = int(counts.get("absent", 0))
        attendance.late = int(counts.get("late", 0))
        attendance.excused = int(counts.get("excused", 0))
        attendance.on_duty = int(counts.get("on_duty", 0))
        attendance.total = sum(int(v) for v in counts.values())
        attendance.present_pct = _pct(attendance.present, attendance.total)
        attendance.absent_pct = _pct(attendance.absent, attendance.total)
        attendance.late_pct = _pct(attendance.late, attendance.total)

    # ---- Published results: pass rate per year + per exam -------------------
    result_rows = (
        db.query(
            Enrollment.student_id,
            ClassSection.year_of_study,
            ExamResult.marks_obtained,
            ExamResult.is_absent,
            Examination.pass_marks,
            Examination.title,
            Examination.exam_date,
            Examination.published_at,
        )
        .join(Examination, Examination.id == ExamResult.examination_id)
        .join(Enrollment, Enrollment.id == ExamResult.enrollment_id)
        .join(ClassSection, ClassSection.id == Enrollment.class_section_id)
        .filter(Examination.status == "published")
        .all()
    )

    per_student: dict[int, dict] = {}
    per_exam: dict[str, dict] = {}
    for (
        student_id,
        year_of_study,
        marks,
        is_absent,
        pass_marks,
        title,
        exam_date,
        published_at,
    ) in result_rows:
        passed = (not is_absent) and marks is not None and marks >= pass_marks
        record = per_student.setdefault(
            student_id, {"year": year_of_study, "passed": True}
        )
        if not passed:
            record["passed"] = False

        trend = per_exam.setdefault(
            title, {"passed": 0, "total": 0, "sort": exam_date or published_at}
        )
        trend["total"] += 1
        if passed:
            trend["passed"] += 1

    def year_rate(year: int) -> DemoYearPassRate:
        passed = sum(
            1
            for rec in per_student.values()
            if rec["year"] == year and rec["passed"]
        )
        total = sum(1 for rec in per_student.values() if rec["year"] == year)
        return DemoYearPassRate(
            year_of_study=year,
            passed=passed,
            total=total,
            pass_pct=_pct(passed, total),
        )

    ordered = sorted(
        per_exam.items(),
        key=lambda item: (item[1]["sort"] is not None, item[1]["sort"]),
        reverse=True,
    )[:5]
    exam_trend = [
        DemoExamPassRate(label=title, pass_pct=_pct(data["passed"], data["total"]))
        for title, data in reversed(ordered)
    ]

    return DemoOverview(
        total_students=int(total_students),
        branches=branches,
        attendance=attendance,
        first_year_pass=year_rate(1),
        second_year_pass=year_rate(2),
        exam_trend=exam_trend,
        generated_at=_datetime.now(),
    )


def _pct(part: int, whole: int) -> float:
    """Percentage rounded to one decimal; zero when the denominator is 0."""
    return round(part / whole * 100, 1) if whole else 0.0


__all__ = [
    "find_student",
    "search_students_by_name",
    "NAME_SEARCH_LIMIT",
    "create_lookup_token",
    "verify_lookup_token",
    "verify_access_code",
    "issue_parent_token",
    "list_children",
    "list_directory",
    "demo_overview",
    "MaskedStudent",
]
