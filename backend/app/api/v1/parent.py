"""Parent endpoints: public lookup → verification → read-only views.

Parents can NEVER mutate data: every route here is GET-only and
record-level restricted to `student_parent_links`.
"""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.permissions.deps import AuthContext, ensure_student_visible, get_current_user
from app.schemas.parent import (
    AttendanceHistoryEntry,
    ParentChildSummary,
    ParentLookupRequest,
    ParentLookupResponse,
    ParentSearchMatch,
    ParentSearchRequest,
    ParentSessionResponse,
    ParentVerifyRequest,
)
from app.schemas.students import (
    AttendanceSummary,
    FeeSummary,
    ResultSummary,
    StudentProfile,
)
from app.services import parent_service as svc

settings = get_settings()

router = APIRouter()


@router.post(
    "/lookup",
    response_model=ParentLookupResponse,
    summary="[public] Branch + roll-number search (masked result)",
    responses={404: {"description": "No matching student"}},
)
@limiter.limit(settings.lookup_rate_limit)
def lookup(
    request: Request,
    body: ParentLookupRequest,
    db: Session = Depends(get_db),
) -> ParentLookupResponse:
    student = svc.find_student(db, body.branch_id, body.roll_number)
    if student is None:
        raise AppError(
            404,
            "NO_STUDENT",
            "No student found for this roll number in the selected branch.",
        )
    return ParentLookupResponse(
        lookup_token=svc.create_lookup_token(student),
        expires_in=600,
        student=svc._masked_student(db, student),
        verification_required=settings.parent_verification_enabled,
        hint=(
            "Enter the access code issued by the college to view records."
            if settings.parent_verification_enabled
            else "Demo mode: no access code is required."
        ),
    )


@router.post(
    "/search",
    response_model=list[ParentSearchMatch],
    summary="[public] Partial-name search → masked candidates (discovery only)",
    responses={404: {"description": "No matching student"}},
)
@limiter.limit(settings.lookup_rate_limit)
def search(
    request: Request,
    body: ParentSearchRequest,
    db: Session = Depends(get_db),
) -> list[ParentSearchMatch]:
    """Find candidate students by (partial) name to help a guardian pick.

    Security: this is a *discovery* aid only. It returns masked names plus
    roll/branch/class so duplicates can be told apart, and issues NO
    lookup token and NO confidential fields. The caller must still select a
    result and pass the normal `/lookup` → `/verify` flow, so production
    access-code verification is unchanged.
    """
    rows = svc.search_students_by_name(
        db, name=body.name, branch_id=body.branch_id, limit=svc.NAME_SEARCH_LIMIT
    )
    if not rows:
        raise AppError(
            404,
            "NO_STUDENT",
            "No student found matching that name in the selected branch.",
        )
    return [
        ParentSearchMatch(
            branch_id=branch.id,
            roll_number=student.roll_number,
            masked_name=svc._mask(student.full_name),
            branch_code=branch.code,
            class_section=cls.section_name if cls else None,
        )
        for student, branch, cls in rows
    ]


@router.post(
    "/verify",
    response_model=ParentSessionResponse,
    summary="[public] Verify access code → read-only session",
    responses={401: {"description": "Invalid access code or expired search"}},
)
@limiter.limit(settings.lookup_rate_limit)
def verify(
    request: Request,
    body: ParentVerifyRequest,
    db: Session = Depends(get_db),
) -> ParentSessionResponse:
    student_id = svc.verify_lookup_token(body.lookup_token)

    if not settings.parent_verification_enabled:
        # DEMO ONLY: verification disabled via env (synthetic data only).
        from app.models.student import Parent, StudentParentLink

        link = (
            db.query(StudentParentLink)
            .filter(StudentParentLink.student_id == student_id)
            .first()
        )
        if link is None:
            raise AppError(404, "NO_STUDENT", "No verified guardian for this student.")
        parent = db.query(Parent).filter(Parent.id == link.parent_id).first()
        if parent is None or not parent.is_active:
            raise AppError(404, "NO_STUDENT", "No verified guardian for this student.")
    else:
        # Production: same generic 401 for missing/short/wrong codes — no
        # probing signal, no bypass. Length is checked here (not in the
        # schema) so the demo branch above can run with an empty code.
        if len(body.access_code.strip()) < 4:
            raise AppError(401, "INVALID_CODE", "Invalid access code.")
        parent = svc.verify_access_code(db, student_id, body.access_code)

    token, expires_in = svc.issue_parent_token(parent)
    children = svc.list_children(db, parent.id)
    return ParentSessionResponse(
        access_token=token,
        expires_in=expires_in,
        parent_name=parent.full_name,
        permissions=sorted(
            {
                "profile:read_own",
                "attendance:read_own",
                "results:read_own",
                "fees:read_own",
                "announcements:read",
            }
        ),
        children=children,
    )


@router.get(
    "/children",
    response_model=list[ParentChildSummary],
    summary="Linked children for this verified session",
)
def children(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> list[ParentChildSummary]:
    if not ctx.is_readonly_principal:
        raise AppError(403, "FORBIDDEN", "Parent session required.")
    if ctx.parent_id is None:
        raise AppError(403, "FORBIDDEN", "Parent session required.")
    return svc.list_children(db, ctx.parent_id)


# ---------------------------------------------------------------------------
# Read-only child views (profile / attendance / results / fees)
# ---------------------------------------------------------------------------


@router.get(
    "/students/{student_id}/profile",
    response_model=StudentProfile,
    summary="Read-only child profile",
    responses={404: {"description": "Not linked to this parent"}},
)
def child_profile(
    student_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> StudentProfile:
    _require_parent(ctx)
    ensure_student_visible(db, ctx, student_id)

    from app.api.v1.students import _fee_summary, _published_results
    from app.repositories.students import get_student_profile_parts

    parts = get_student_profile_parts(db, student_id)
    if parts is None:
        raise AppError(404, "NOT_FOUND", "Student record not found.")
    student, branch, cls, year = parts

    from app.repositories.students import attendance_summary

    return StudentProfile(
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
        guardian_name=student.guardian_name,
        is_active=student.is_active,
        attendance=attendance_summary(db, student_id),
        published_results=_published_results(db, student_id, ctx),
        fee=_fee_summary(db, student_id, ctx),
    )


@router.get(
    "/students/{student_id}/attendance",
    response_model=AttendanceSummary,
    summary="Read-only attendance summary",
)
def child_attendance(
    student_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> AttendanceSummary:
    _require_parent(ctx)
    ensure_student_visible(db, ctx, student_id)
    from app.repositories.students import attendance_summary

    return attendance_summary(db, student_id)


@router.get(
    "/students/{student_id}/attendance/history",
    response_model=list[AttendanceHistoryEntry],
    summary="Read-only attendance history by date (submitted sessions only)",
)
def child_attendance_history(
    student_id: int,
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> list[AttendanceHistoryEntry]:
    _require_parent(ctx)
    ensure_student_visible(db, ctx, student_id)
    from app.repositories.students import attendance_history

    return attendance_history(db, student_id, limit)


@router.get(
    "/students/{student_id}/results",
    response_model=list[ResultSummary],
    summary="Read-only PUBLISHED results (drafts excluded)",
)
def child_results(
    student_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> list[ResultSummary]:
    _require_parent(ctx)
    ensure_student_visible(db, ctx, student_id)
    from app.api.v1.students import _published_results

    return _published_results(db, student_id, ctx)


@router.get(
    "/students/{student_id}/fees",
    response_model=FeeSummary | None,
    summary="Read-only fee summary + payment count",
)
def child_fees(
    student_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> FeeSummary | None:
    _require_parent(ctx)
    ensure_student_visible(db, ctx, student_id)
    from app.api.v1.students import _fee_summary

    return _fee_summary(db, student_id, ctx)


def _require_parent(ctx: AuthContext) -> None:
    if not ctx.is_readonly_principal or "parent" not in ctx.roles:
        raise AppError(403, "FORBIDDEN", "Parent session required.")


__all__ = ["router"]
