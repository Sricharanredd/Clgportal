"""Examination business rules (PRD §10).

- Faculty may create/enter results ONLY for their assigned class+subject.
- Marks are validated against the exam's configured maximum.
- Draft → published is a one-way gate for entry: published exams must be
  reopened (results:publish) before marks can change.
- Unpublished exams are never returned by student/parent APIs.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.academic import Branch, ClassSection, Subject
from app.models.exam import ExamResult, Examination
from app.models.student import Enrollment, Student
from app.permissions.deps import AuthContext
from app.schemas.examinations import (
    ExaminationDetail,
    ExaminationOut,
    PublishResponse,
    ResultRow,
    SaveResultsResponse,
)


def _class_label(db: Session, class_id: int) -> tuple[str, str]:
    row = (
        db.query(ClassSection, Branch)
        .join(Branch, Branch.id == ClassSection.branch_id)
        .filter(ClassSection.id == class_id)
        .first()
    )
    if not row:
        raise AppError(404, "NOT_FOUND", "Class not found.")
    return f"{row[1].code}-{row[0].section_name}", row[1].code


def ensure_may_manage(
    db: Session, ctx: AuthContext, class_id: int, subject_id: int
) -> None:
    """Result ENTRY gate: `results:write` + assignment scope.

    - Faculty (scoped): exam class AND subject must both be assigned.
    - Scope-unrestricted holders of results:write (e.g. exam-cell staff)
      may manage any class.
    - `results:publish` deliberately does NOT grant entry rights (PRD §3.1):
      the principal authorizes publication/correction, faculty perform entry."""
    if "results:write" not in ctx.permissions:
        raise AppError(
            403, "FORBIDDEN", "You do not have permission to enter results."
        )
    if ctx.class_scope is None:
        return  # scope-unrestricted staff account with results:write
    if class_id not in ctx.class_scope or subject_id not in ctx.subject_scope:
        raise AppError(403, "FORBIDDEN", "You are not assigned to this class/subject.")


def _exam_out(db: Session, exam: Examination) -> ExaminationOut:
    label, branch_code = _class_label(db, exam.class_section_id)
    expected = (
        db.query(func.count(Enrollment.id))
        .filter(
            Enrollment.class_section_id == exam.class_section_id,
            Enrollment.status == "active",
        )
        .scalar()
        or 0
    )
    entered = (
        db.query(func.count(ExamResult.id))
        .filter(ExamResult.examination_id == exam.id)
        .scalar()
        or 0
    )
    return ExaminationOut(
        id=exam.id,
        title=exam.title,
        exam_type=exam.exam_type,
        class_section_id=exam.class_section_id,
        class_label=label,
        branch_code=branch_code,
        subject_id=exam.subject_id,
        subject_code=exam.subject.code if exam.subject else "",
        subject_name=exam.subject.name if exam.subject else "",
        exam_date=exam.exam_date,
        max_marks=exam.max_marks,
        pass_marks=exam.pass_marks,
        status=exam.status,
        published_at=exam.published_at,
        entered=int(entered),
        expected=int(expected),
    )


def list_examinations(
    db: Session,
    *,
    branch_id: int | None,
    class_id: int | None,
    subject_id: int | None,
    status: str | None,
    ctx: AuthContext,
) -> list[ExaminationOut]:
    q = (
        db.query(Examination)
        .join(ClassSection, ClassSection.id == Examination.class_section_id)
        .join(Branch, Branch.id == ClassSection.branch_id)
    )
    if branch_id:
        q = q.filter(ClassSection.branch_id == branch_id)
    if class_id:
        q = q.filter(Examination.class_section_id == class_id)
    if subject_id:
        q = q.filter(Examination.subject_id == subject_id)
    if status:
        q = q.filter(Examination.status == status)

    # faculty scope: assigned class ∩ assigned subject
    if ctx.class_scope is not None:
        if not ctx.class_scope:
            return []
        q = q.filter(Examination.class_section_id.in_(list(ctx.class_scope)))
    if ctx.subject_scope is not None:
        if not ctx.subject_scope:
            return []
        q = q.filter(Examination.subject_id.in_(list(ctx.subject_scope)))

    rows = (
        q.order_by(
            Examination.status, Examination.exam_date.is_(None), Examination.exam_date.desc()
        )
        .all()
    )
    return [_exam_out(db, e) for e in rows]


def get_detail(db: Session, exam_id: int, ctx: AuthContext) -> ExaminationDetail:
    exam = (
        db.query(Examination)
        .filter(Examination.id == exam_id)
        .first()
    )
    if exam is None:
        raise AppError(404, "NOT_FOUND", "Examination not found.")

    # scope visibility (faculty only sees assigned exams; unrestricted staff see all)
    if ctx.class_scope is not None:
        if exam.class_section_id not in ctx.class_scope:
            raise AppError(404, "NOT_FOUND", "Examination not found.")
    if ctx.subject_scope is not None and exam.subject_id not in ctx.subject_scope:
        raise AppError(404, "NOT_FOUND", "Examination not found.")

    roster_rows = (
        db.query(Student, Enrollment, ExamResult)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .outerjoin(
            ExamResult,
            (ExamResult.enrollment_id == Enrollment.id)
            & (ExamResult.examination_id == exam.id),
        )
        .filter(
            Enrollment.class_section_id == exam.class_section_id,
            Enrollment.status == "active",
            Student.is_active.is_(True),
        )
        .order_by(Student.roll_number)
        .all()
    )
    roster = [
        ResultRow(
            student_id=s.id,
            enrollment_id=e.id,
            roll_number=s.roll_number,
            full_name=s.full_name,
            marks_obtained=(
                r.marks_obtained if r and not r.is_absent else None
            ),
            is_absent=r.is_absent if r else False,
            remarks=r.remarks if r else None,
        )
        for s, e, r in roster_rows
    ]
    can_edit = exam.status == "draft" and _can_enter(db, ctx, exam)
    return ExaminationDetail(
        examination=_exam_out(db, exam),
        roster=roster,
        can_edit=can_edit,
    )


def _can_enter(db: Session, ctx: AuthContext, exam: Examination) -> bool:
    if "results:write" not in ctx.permissions:
        return False
    if ctx.class_scope is None:
        return True
    return (
        exam.class_section_id in ctx.class_scope
        and exam.subject_id in (ctx.subject_scope or frozenset())
    )


def create_examination(db: Session, body: dict, ctx: AuthContext) -> ExaminationOut:
    ensure_may_manage(db, ctx, body["class_section_id"], body["subject_id"])

    if body["pass_marks"] > body["max_marks"]:
        raise AppError(
            422, "INVALID_MARKS", "Pass marks cannot exceed maximum marks."
        )
    exists = (
        db.query(Examination)
        .filter(
            Examination.class_section_id == body["class_section_id"],
            Examination.subject_id == body["subject_id"],
            Examination.title == body["title"],
        )
        .first()
    )
    if exists is not None:
        raise AppError(
            409,
            "DUPLICATE_EXAMINATION",
            "An examination with this title already exists for this class/subject.",
        )
    year_id = _current_year_id(db)
    exam = Examination(
        title=body["title"],
        exam_type=body.get("exam_type") or "unit_test",
        class_section_id=body["class_section_id"],
        subject_id=body["subject_id"],
        academic_year_id=year_id,
        exam_date=body.get("exam_date"),
        max_marks=body["max_marks"],
        pass_marks=body["pass_marks"],
        status="draft",
        created_by=ctx.user_id,
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return _exam_out(db, exam)


def _current_year_id(db: Session) -> int:
    from app.models.academic import AcademicYear

    year = db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first()
    if year is None:
        raise AppError(409, "NO_ACADEMIC_YEAR", "No current academic year configured.")
    return year.id


def save_results(
    db: Session, exam_id: int, results: list[dict], ctx: AuthContext
) -> SaveResultsResponse:
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if exam is None:
        raise AppError(404, "NOT_FOUND", "Examination not found.")
    ensure_may_manage(db, ctx, exam.class_section_id, exam.subject_id)

    if exam.status == "published":
        raise AppError(
            409,
            "RESULTS_PUBLISHED",
            "Published results are locked. Reopen the examination to correct marks.",
        )

    # roster: enrollment_id per student for THIS class
    roster = {
        e.student_id: e.id
        for e in db.query(Enrollment).filter(
            Enrollment.class_section_id == exam.class_section_id,
            Enrollment.status == "active",
        )
    }
    existing = {
        r.enrollment_id: r
        for r in db.query(ExamResult).filter(ExamResult.examination_id == exam.id)
    }

    saved = 0
    seen: set[int] = set()
    for item in results:
        sid = item["student_id"]
        if sid in seen:
            raise AppError(409, "DUPLICATE_RESULT", f"Duplicate entry for student {sid}.")
        seen.add(sid)
        if sid not in roster:
            raise AppError(
                422, "NOT_ENROLLED", f"Student {sid} is not enrolled in this class."
            )
        raw_marks = item.get("marks_obtained")
        marks = Decimal(str(raw_marks)) if raw_marks is not None else None
        is_absent = bool(item.get("is_absent"))
        if (
            marks is not None
            and not is_absent
            and (marks < 0 or marks > exam.max_marks)
        ):
            raise AppError(
                422,
                "MARKS_OUT_OF_RANGE",
                f"Marks must be between 0 and {exam.max_marks} "
                f"(student {sid}: {marks}).",
            )
        enrollment_id = roster[sid]
        row = existing.get(enrollment_id)
        if marks is None and not is_absent:
            # Blank row = not entered; drop any stale row so counts stay honest.
            if row is not None:
                db.delete(row)
            continue
        if marks is None and is_absent:
            # Column is NOT NULL; absent rows store 0 (read APIs mask it).
            marks = Decimal("0")
        if row is None:
            db.add(
                ExamResult(
                    examination_id=exam.id,
                    enrollment_id=enrollment_id,
                    marks_obtained=marks,
                    is_absent=is_absent,
                    remarks=item.get("remarks"),
                    entered_by=ctx.user_id,
                    updated_by=ctx.user_id,
                )
            )
        else:
            row.marks_obtained = marks
            row.is_absent = is_absent
            row.remarks = item.get("remarks")
            row.updated_by = ctx.user_id
        saved += 1
    db.commit()

    entered = (
        db.query(func.count(ExamResult.id))
        .filter(ExamResult.examination_id == exam.id)
        .scalar()
        or 0
    )
    expected = len(roster)
    return SaveResultsResponse(
        saved=saved,
        status=exam.status,
        entered=int(entered),
        expected=expected,
    )


def publish_results(db: Session, exam_id: int, ctx: AuthContext) -> PublishResponse:
    """results:publish gate — makes results visible to student/parent APIs."""
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if exam is None:
        raise AppError(404, "NOT_FOUND", "Examination not found.")
    if exam.status == "published":
        raise AppError(409, "ALREADY_PUBLISHED", "Results are already published.")

    expected = (
        db.query(func.count(Enrollment.id))
        .filter(
            Enrollment.class_section_id == exam.class_section_id,
            Enrollment.status == "active",
        )
        .scalar()
        or 0
    )
    entered = (
        db.query(func.count(ExamResult.id))
        .filter(ExamResult.examination_id == exam.id)
        .scalar()
        or 0
    )
    if int(entered) < int(expected):
        raise AppError(
            409,
            "INCOMPLETE_RESULTS",
            f"Enter marks for all students before publishing ({entered}/{expected}).",
        )

    exam.status = "published"
    exam.published_at = datetime.now()
    exam.published_by = ctx.user_id
    db.commit()
    return PublishResponse(
        id=exam.id, status=exam.status, published_at=exam.published_at
    )


def reopen_examination(db: Session, exam_id: int, ctx: AuthContext) -> PublishResponse:
    """Authorized correction path: published → draft (results:publish)."""
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if exam is None:
        raise AppError(404, "NOT_FOUND", "Examination not found.")
    if exam.status != "published":
        raise AppError(409, "NOT_PUBLISHED", "Examination is not published.")
    exam.status = "draft"
    exam.published_at = None
    exam.published_by = None
    db.commit()
    return PublishResponse(id=exam.id, status=exam.status, published_at=None)


__all__ = [
    "list_examinations",
    "get_detail",
    "create_examination",
    "save_results",
    "publish_results",
    "reopen_examination",
    "ensure_may_manage",
]
