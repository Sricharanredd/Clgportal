"""Reference-data endpoints: branches, academic years, classes, subjects.

These power dropdowns/lookup UIs. All are safe to expose to any
authenticated staff member; no personal data is returned.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.academic import AcademicYear, Branch, ClassSection, Subject
from app.models.user import User
from app.permissions.deps import AuthContext, get_current_user
from app.schemas.meta import AcademicYearOut, BranchOut, ClassSectionOut, SubjectOut

router = APIRouter()


@router.get("/branches", response_model=list[BranchOut], summary="List branches (public)")
def list_branches(
    db: Session = Depends(get_db),
) -> list[BranchOut]:
    """Public: branch codes/names are non-sensitive reference data.

    The parent portal needs this list BEFORE any login (roll-number lookup).
    """
    rows = db.query(Branch).filter(Branch.is_active.is_(True)).order_by(Branch.display_order, Branch.id).all()
    return [BranchOut.model_validate(r) for r in rows]


@router.get(
    "/academic-years", response_model=list[AcademicYearOut], summary="List academic years"
)
def list_academic_years(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> list[AcademicYearOut]:
    rows = (
        db.query(AcademicYear)
        .filter(AcademicYear.is_active.is_(True))
        .order_by(AcademicYear.start_date.desc())
        .all()
    )
    return [AcademicYearOut.model_validate(r) for r in rows]


@router.get(
    "/classes", response_model=list[ClassSectionOut], summary="List class sections"
)
def list_classes(
    academic_year_id: int | None = None,
    branch_id: int | None = None,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> list[ClassSectionOut]:
    """Class sections for dropdowns.

    Faculty are SCOPED server-side to their assigned classes/branches
    (same authority as /attendance/sessions): the dropdown can never offer
    a class the caller could not act on anyway (writes are re-checked).
    """
    q = (
        db.query(ClassSection, Branch)
        .join(Branch, Branch.id == ClassSection.branch_id)
        .filter(ClassSection.is_active.is_(True))
    )
    if academic_year_id:
        q = q.filter(ClassSection.academic_year_id == academic_year_id)
    if branch_id:
        q = q.filter(ClassSection.branch_id == branch_id)

    # --- record-level scope (faculty: assigned classes/branches only) ---
    if ctx.class_scope is not None:
        if not ctx.class_scope:
            return []
        q = q.filter(ClassSection.id.in_(list(ctx.class_scope)))
    if ctx.branch_scope is not None:
        if not ctx.branch_scope:
            return []
        q = q.filter(ClassSection.branch_id.in_(list(ctx.branch_scope)))

    rows = q.order_by(
        ClassSection.branch_id, ClassSection.year_of_study, ClassSection.section_name
    ).all()
    out: list[ClassSectionOut] = []
    for cls, branch in rows:
        item = ClassSectionOut.model_validate(cls)
        item.branch_code = branch.code
        item.branch_name = branch.name
        out.append(item)
    return out


@router.get("/subjects", response_model=list[SubjectOut], summary="List subjects")
def list_subjects(
    branch_id: int | None = None,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> list[SubjectOut]:
    """Subjects for dropdowns. Faculty only see subjects of their assigned
    branches AND subjects they are actually assigned to teach (examination
    creation checks the (class, subject) pair server-side, so the dropdown
    must not offer subjects that would be rejected)."""
    q = db.query(Subject).filter(Subject.is_active.is_(True))
    if branch_id:
        q = q.filter(Subject.branch_id == branch_id)
    if ctx.branch_scope is not None:
        if not ctx.branch_scope:
            return []
        q = q.filter(Subject.branch_id.in_(list(ctx.branch_scope)))
    if ctx.subject_scope is not None:
        if not ctx.subject_scope:
            return []
        q = q.filter(Subject.id.in_(list(ctx.subject_scope)))
    rows = q.order_by(Subject.code).all()
    return [SubjectOut.model_validate(r) for r in rows]
