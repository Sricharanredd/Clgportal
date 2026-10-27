"""Auth endpoints: login, refresh (cookie), logout, current user."""
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.permissions.deps import AuthContext, get_current_user
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MeResponse,
    TokenResponse,
    UserOut,
)
from app.services import auth as auth_service

settings = get_settings()

router = APIRouter()

REFRESH_COOKIE = "cmp_refresh"


def _refresh_cookie(response: Response, token: str) -> None:
    """Set the refresh cookie with hardened attributes.

    HttpOnly  – JS cannot read it (XSS mitigation)
    SameSite=Lax – CSRF mitigation for cross-site POSTs
    Secure    – HTTPS only (enabled in production)
    Path      – only sent to auth routes
    """
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )


def _user_out(ctx: AuthContext) -> UserOut:
    return UserOut(
        id=ctx.user_id,
        email=ctx.email,
        full_name=ctx.full_name,
        roles=sorted(ctx.roles),
        permissions=sorted(ctx.permissions),
        branch_scope=sorted(ctx.branch_scope) if ctx.branch_scope is not None else None,
        class_scope=sorted(ctx.class_scope) if ctx.class_scope is not None else None,
        subject_scope=sorted(ctx.subject_scope) if ctx.subject_scope is not None else None,
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Authenticate a staff account",
    responses={
        401: {"description": "Invalid email or password"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit(settings.login_rate_limit)
def login(
    request: Request,
    body: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    user = auth_service.authenticate(db, body.email, body.password)
    ctx = auth_service.user_context(db, user)
    access, refresh, expires_in = auth_service.issue_tokens(db, user)
    _refresh_cookie(response, refresh)
    return LoginResponse(access_token=access, expires_in=expires_in, user=_user_out(ctx))


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Exchange the refresh cookie for a new access token",
    responses={401: {"description": "Missing/invalid session"}},
)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise AppError(401, "NO_SESSION", "No active session.")
    access, new_refresh, expires_in = auth_service.rotate_refresh_token(db, token)
    _refresh_cookie(response, new_refresh)
    return TokenResponse(access_token=access, expires_in=expires_in)


@router.post("/logout", status_code=200, summary="Revoke the current session")
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> dict:
    auth_service.revoke_session(db, request.cookies.get(REFRESH_COOKIE))
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")
    return {"message": "Signed out."}


@router.get("/me", response_model=MeResponse, summary="Current user & permissions")
def me(ctx: AuthContext = Depends(get_current_user)) -> MeResponse:
    return MeResponse(user=_user_out(ctx))
