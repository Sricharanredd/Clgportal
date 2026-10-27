"""Role-specific dashboard endpoints. Metrics come from the service layer."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.permissions.deps import AuthContext, get_current_user
from app.schemas.dashboard import (
    AccountsDashboard,
    AdminDashboard,
    FacultyDashboard,
    PrincipalDashboard,
)
from app.services.dashboard import (
    accounts_dashboard,
    admin_dashboard,
    faculty_dashboard,
    principal_dashboard,
)

router = APIRouter()


@router.get(
    "/principal",
    response_model=PrincipalDashboard,
    summary="College-wide overview (principal role)",
    responses={403: {"description": "Requires dashboard:principal"}},
)
def principal(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> PrincipalDashboard:
    if "dashboard:principal" not in ctx.permissions:
        raise AppError(403, "FORBIDDEN", "Principal dashboard access required.")
    return principal_dashboard(db, ctx)


@router.get(
    "/accounts",
    response_model=AccountsDashboard,
    summary="Fee collection overview (accounts role)",
    responses={403: {"description": "Requires dashboard:accounts"}},
)
def accounts(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> AccountsDashboard:
    if "dashboard:accounts" not in ctx.permissions:
        raise AppError(403, "FORBIDDEN", "Accounts dashboard access required.")
    return accounts_dashboard(db, ctx)


@router.get(
    "/faculty",
    response_model=FacultyDashboard,
    summary="Assigned classes/tasks overview (faculty role)",
    responses={403: {"description": "Requires dashboard:faculty"}},
)
def faculty(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> FacultyDashboard:
    if "dashboard:faculty" not in ctx.permissions:
        raise AppError(403, "FORBIDDEN", "Faculty dashboard access required.")
    return faculty_dashboard(db, ctx)


@router.get(
    "/admin",
    response_model=AdminDashboard,
    summary="Records & configuration overview (administrator role)",
    responses={403: {"description": "Requires dashboard:admin"}},
)
def admin(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_user),
) -> AdminDashboard:
    if "dashboard:admin" not in ctx.permissions:
        raise AppError(403, "FORBIDDEN", "Administrator dashboard access required.")
    return admin_dashboard(db, ctx)


__all__ = ["router"]
