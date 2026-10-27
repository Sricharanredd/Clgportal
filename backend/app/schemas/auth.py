"""Auth request/response schemas (explicit API contracts)."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Staff credential login. No role field — roles come from the DB."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    """Authenticated user profile returned to the frontend.

    `permissions` drives UI affordances ONLY — the backend re-checks all
    of them server-side on every request."""

    id: int
    email: str
    full_name: str
    roles: list[str]
    permissions: list[str]
    branch_scope: list[int] | None = None
    class_scope: list[int] | None = None
    subject_scope: list[int] | None = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    """Access token (bearer, memory-stored) + profile.

    The refresh token is delivered as an HttpOnly cookie, not in this body."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expiry
    user: UserOut


class TokenResponse(BaseModel):
    """Refresh response: only a new access token."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class MeResponse(BaseModel):
    """GET /auth/me payload (same shape as LoginResponse.user)."""

    user: UserOut
