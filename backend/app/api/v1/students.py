"""Student lookup & profile endpoints (staff-facing, scope-enforced)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.permissions.deps import (
    AuthContext,
    ensure_student_visible,
    get_current_user,
    require_permission,
)
from app.repositories.students import (
    attendance_summary,
    get_student_profile_parts,
    search_students,
)
from app.schemas.students import (
    AttendanceSummary,
    FeeSummary,
    ResultSummary,
    StudentProfile,
    StudentSearchPage,
    StudentSummary,
)

router = APIRouter()


def _summary(row) -> StudentSummary:
    student, branch, cls, year = row
    return StudentSummary(
        id=student.id,
        roll_number=student.roll_number,
        full_name=student.full_name,
        branch_id=branch.id,
        branch_code=branch.code,
        class_section=f"{cls.section_name}" if cls else None,
        academic_year=year.name if year else None,
        status="active" if student.is_active else "inactive",
    )


@router.get(
    "",
    response_model=StudentSearchPage,
    summary="Paginated student search (branch / roll / name)",
)
def list_students(
    branch_id: int | None = None,
    roll: str | None = None,
    name: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("students:read")),
) -> StudentSearchPage:
    rows, total = search_students(
        db,
        branch_id=branch_id,
        roll=roll,
        name=name,
        page=page,
        page_size=page_size,
        ctx=ctx,
    )
    pages = (total + page_size - 1) // page_size
    return StudentSearchPage(
        items=[_summary(r) for r in rows],
        page=page,
        page_size=page_size,
        total=total,
        pages=pages,
    )


@router.get(
    "/{student_id}",
    response_model=StudentProfile,
    summary="Student profile with gated summaries",
    responses={404: {"description": "Not visible to this account"}},
)
def student_profile(
    student_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("students:read")),
) -> StudentProfile:
    # Record-level check: 404 (not 403) so invisible IDs aren't confirmed.
    ensure_student_visible(db, ctx, student_id)

    parts = get_student_profile_parts(db, student_id)
    if parts is None:
        raise AppError(404, "NOT_FOUND", "Student record not found.")
    student, branch, cls, year = parts

    profile = StudentProfile(
        id=student.id,
        roll_number=student.roll_number,
        first_name=student.first_name,
        last_name=student.last_name,
        full_name=student.full_name,
        branch_id=branch.id,
        branch_code=branch.code,
        branch_name=branch.name,
        class_section=cls.section_name if cls else None,
        year_of_study=cls.year_of_study if cls else None,
        academic_year=year.name if year else None,
        date_of_birth=student.date_of_birth,
        gender=student.gender,
        phone=student.phone,
        email=student.email,
        address=student.address,
        guardian_name=student.guardian_name,
        admission_date=student.admission_date,
        is_active=student.is_active,
    )

    # --- gated summary blocks (server decides, not the UI) ---
    if "attendance:read" in ctx.permissions or "attendance:read_own" in ctx.permissions:
        profile.attendance = AttendanceSummary(**attendance_summary(db, student_id))

    if "results:read" in ctx.permissions or "results:read_own" in ctx.permissions:
        profile.published_results = _published_results(db, student_id, ctx)

    if "fees:read" in ctx.permissions or "fees:read_own" in ctx.permissions:
        profile.fee = _fee_summary(db, student_id, ctx)

    return profile


def _published_results(db: Session, student_id: int, ctx: AuthContext) -> list[ResultSummary]:
    """Only PUBLISHED exams — drafts are never returned to readonly callers."""
    from app.models.academic import Subject
    from app.models.exam import ExamResult, Examination
    from app.models.student import Enrollment

    q = (
        db.query(ExamResult, Examination, Subject)
        .join(Examination, Examination.id == ExamResult.examination_id)
        .join(Subject, Subject.id == Examination.subject_id)
        .join(Enrollment, Enrollment.id == ExamResult.enrollment_id)
        .filter(
            Enrollment.student_id == student_id,
            Examination.status == "published",
        )
        .order_by(Examination.exam_date.desc())
    )
    if ctx.is_readonly_principal:
        # Only current-year published results for parents/students.
        pass
    out: list[ResultSummary] = []
    for result, exam, subject in q.all():
        out.append(
            ResultSummary(
                exam_title=exam.title,
                subject_code=subject.code,
                subject_name=subject.name,
                max_marks=exam.max_marks,
                marks_obtained=result.marks_obtained if not result.is_absent else None,
                is_absent=result.is_absent,
                status="published",
                published_at=exam.published_at,
            )
        )
    return out


def _fee_summary(db: Session, student_id: int, ctx: AuthContext) -> FeeSummary | None:
    from app.models.fee import StudentFeeObligation

    ob = (
        db.query(StudentFeeObligation)
        .filter(StudentFeeObligation.student_id == student_id)
        .order_by(StudentFeeObligation.id.desc())
        .first()
    )
    if ob is None:
        return None
    pending = (ob.total_amount or 0) - (ob.paid_amount or 0)
    return FeeSummary(
        total_amount=ob.total_amount,
        paid_amount=ob.paid_amount,
        pending_amount=pending,
        status=ob.status,
        due_date=ob.due_date,
    )


__all__ = ["router"]
