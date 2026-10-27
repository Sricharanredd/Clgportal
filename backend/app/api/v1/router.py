"""Versioned API router aggregator (/api/v1).

Each feature area owns a module in `app.api.v1`; this file only mounts
them so route order and prefixes stay visible in one place.
"""
from fastapi import APIRouter

from app.api.v1 import (
    announcements,
    attendance,
    auth,
    dashboard,
    examinations,
    fees,
    meta,
    parent,
    students,
)

api_v1_router = APIRouter()

api_v1_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_v1_router.include_router(meta.router, prefix="/meta", tags=["meta"])
api_v1_router.include_router(students.router, prefix="/students", tags=["students"])
api_v1_router.include_router(parent.router, prefix="/parent", tags=["parent"])
api_v1_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_v1_router.include_router(
    attendance.router, prefix="/attendance", tags=["attendance"]
)
api_v1_router.include_router(
    examinations.router, prefix="/examinations", tags=["examinations"]
)
api_v1_router.include_router(fees.router, prefix="/fees", tags=["fees"])
api_v1_router.include_router(
    announcements.router, prefix="/announcements", tags=["announcements"]
)

__all__ = ["api_v1_router"]
