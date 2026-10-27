"""Rate limiting for sensitive endpoints (login, public lookup).

slowapi wraps `limits`; keys are per-client-IP. Configure rates via env
(`LOGIN_RATE_LIMIT`, `LOOKUP_RATE_LIMIT`).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

settings = get_settings()

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri="memory://",
)

__all__ = ["limiter"]
