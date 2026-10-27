"""Attendance endpoints: list, roster, save (draft), submit."""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.permissions.deps import (
    AuthContext,
    get_current_user,
    require_any,
    require_permission,
)
from app.schemas.attendance import (
    SaveRecordsRequest,
    SaveRecordsResponse,
    SessionDetail,
    SessionSummary,
    SubmitResponse,
)
from app.services.attendance import (
    get_session_detail,
    list_sessions,
    save_records,
    submit_session,
)

router = APIRouter()


@router.get(
    "/sessions",
    response_model=list[SessionSummary],
    summary="Attendance sessions (date/branch/class filters, scope-applied)",
)
def sessions(
    date: date | None = None,
    branch_id: int | None = None,
    class_id: int | None = None,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("attendance:read")),
) -> list[SessionSummary]:
    return list_sessions(
        db, day=date, branch_id=branch_id, class_id=class_id, ctx=ctx
    )


@router.get(
    "/roster",
    response_model=SessionDetail,
    summary="Class roster + existing marks for a date",
)
def roster(
    class_id: int,
    date: date,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("attendance:read")),
) -> SessionDetail:
    return get_session_detail(db, class_id, date, ctx)


@router.put(
    "/roster",
    response_model=SaveRecordsResponse,
    summary="Save attendance marks (draft)",
    responses={
        403: {"description": "Not assigned to this class"},
        409: {"description": "Submitted / duplicate"},
        422: {"description": "Student not enrolled in class"},
    },
)
def save(
    body: SaveRecordsRequest,
    class_id: int,
    date: date,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_any("attendance:write", "attendance:correct")),
) -> SaveRecordsResponse:
    result = save_records(
        db,
        class_id=class_id,
        day=date,
        records=[r.model_dump() for r in body.records],
        ctx=ctx,
    )
    _log_activity(db, ctx, class_id, date, "attendance_saved")
    return result


@router.post(
    "/submit",
    response_model=SubmitResponse,
    summary="Submit attendance (final, immutable without correction rights)",
    responses={409: {"description": "Incomplete or already submitted"}},
)
def submit(
    class_id: int,
    date: date,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("attendance:write")),
) -> SubmitResponse:
    result = submit_session(db, class_id=class_id, day=date, ctx=ctx)
    _log_activity(db, ctx, class_id, date, "attendance_submitted")
    return result


def _log_activity(db: Session, ctx: AuthContext, class_id: int, day: date, action: str) -> None:
    """General activity feed entry (non-financial actions)."""
    from app.models.content import ActivityLog

    db.add(
        ActivityLog(
            actor_user_id=ctx.user_id,
            action=action,
            entity_type="AttendanceSession",
            entity_id=class_id,
            summary=f"{action.replace('_', ' ').title()} for class #{class_id} on {day}",
        )
    )
    db.commit()


__all__ = ["router"]
