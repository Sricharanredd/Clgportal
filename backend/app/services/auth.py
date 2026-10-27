"""Authentication business rules: login, refresh rotation, logout.

Security notes:
- Passwords are Argon2id-hashed; comparison never short-circuits on email.
- A generic 401 is returned for unknown email OR wrong password (no
  account enumeration).
- Refresh tokens are stored server-side (jti) so logout/rotation revoke them.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt as pyjwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    needs_rehash,
    verify_password,
)
from app.models.user import RefreshToken, User
from app.permissions.deps import AuthContext, build_auth_context

settings = get_settings()

INVALID_CREDENTIALS = AppError(
    401, "INVALID_CREDENTIALS", "Invalid email or password."
)


def authenticate(db: Session, email: str, password: str) -> User:
    """Verify credentials. Raises 401 with a safe generic message."""
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if user is None or not user.is_active:
        # Spend hash-comparison time even when the user is unknown to make
    # response timing less distinguishable.
        _ = hash_password(password) if user is None else None
        raise INVALID_CREDENTIALS
    if not verify_password(password, user.password_hash):
        raise INVALID_CREDENTIALS
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    return user


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def issue_tokens(db: Session, user: User) -> tuple[str, str, int]:
    """Create access + refresh tokens; persist refresh jti for revocation."""
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    payload = decode_token(refresh)
    db.add(
        RefreshToken(
            user_id=user.id,
            jti=payload["jti"],
            family=payload.get("fam", ""),
            expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
    )
    user.last_login_at = _utcnow()
    db.commit()
    return access, refresh, settings.access_token_expire_minutes * 60


def rotate_refresh_token(db: Session, refresh_token: str) -> tuple[str, str, int]:
    """Validate the refresh cookie, revoke the old token, issue new pair."""
    try:
        payload = decode_token(refresh_token)
    except pyjwt.PyJWTError:
        raise AppError(401, "INVALID_SESSION", "Session is invalid or expired.")

    if payload.get("type") != "refresh":
        raise AppError(401, "INVALID_SESSION", "Session is invalid or expired.")

    record = (
        db.query(RefreshToken)
        .filter(RefreshToken.jti == payload.get("jti"))
        .first()
    )
    if record is None or record.revoked_at is not None:
        # Reuse of a rotated token ⇒ assume theft, revoke the whole family.
        if record is not None:
            _revoke_family(db, record.family)
            db.commit()
        raise AppError(401, "INVALID_SESSION", "Session is no longer valid.")

    if record.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
        raise AppError(401, "SESSION_EXPIRED", "Session has expired.")

    user = db.query(User).filter(User.id == record.user_id).first()
    if user is None or not user.is_active:
        raise AppError(401, "ACCOUNT_DISABLED", "This account is not active.")

    # Rotate: revoke presented token, issue a fresh pair in the same family.
    record.revoked_at = _utcnow()
    access, refresh, expires_in = _issue_for_family(db, user, record.family)
    return access, refresh, expires_in


def _issue_for_family(
    db: Session, user: User, family: str
) -> tuple[str, str, int]:
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id), family=family)
    payload = decode_token(refresh)
    db.add(
        RefreshToken(
            user_id=user.id,
            jti=payload["jti"],
            family=family,
            expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
    )
    db.commit()
    return access, refresh, settings.access_token_expire_minutes * 60


def _revoke_family(db: Session, family: str) -> None:
    db.query(RefreshToken).filter(
        RefreshToken.family == family, RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": _utcnow()}, synchronize_session=False)


def revoke_session(db: Session, refresh_token: str | None) -> None:
    """Logout: revoke the presented refresh token's family (idempotent)."""
    if not refresh_token:
        return
    try:
        payload = decode_token(refresh_token)
    except pyjwt.PyJWTError:
        return
    record = (
        db.query(RefreshToken)
        .filter(RefreshToken.jti == payload.get("jti"))
        .first()
    )
    if record is not None:
        _revoke_family(db, record.family)
    else:
        _revoke_family(db, payload.get("fam", ""))
    db.commit()


def user_context(db: Session, user: User) -> AuthContext:
    """Build the response-facing context for a logged-in user."""
    return build_auth_context(db, user)


__all__ = [
    "authenticate",
    "issue_tokens",
    "rotate_refresh_token",
    "revoke_session",
    "user_context",
    "hash_password",
]
