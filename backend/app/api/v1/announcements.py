"""Announcements: read (staff) and create/update (authorized)."""
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.models.content import Announcement
from app.models.user import User
from app.permissions.deps import AuthContext, require_permission
from app.schemas.announcements import AnnouncementCreate, AnnouncementOut, AnnouncementPage

router = APIRouter()


@router.get("", response_model=AnnouncementPage, summary="Paginated announcements")
def list_announcements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    audience: str | None = None,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("announcements:read")),
) -> AnnouncementPage:
    from sqlalchemy import func

    q = db.query(Announcement).filter(Announcement.is_published.is_(True))
    if audience:
        q = q.filter(Announcement.audience.in_([audience, "all"]))
    # staff always sees staff-relevant + general
    total = q.with_entities(func.count(Announcement.id)).scalar() or 0
    rows = (
        q.order_by(
            Announcement.published_at.is_(None),
            Announcement.published_at.desc(),
            Announcement.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    creator_ids = {r.created_by for r in rows}
    creators = {
        u.id: u.full_name for u in db.query(User).filter(User.id.in_(creator_ids))
    } if creator_ids else {}
    items = [
        AnnouncementOut(
            id=r.id,
            title=r.title,
            body=r.body,
            audience=r.audience,
            is_published=r.is_published,
            published_at=r.published_at,
            created_by_name=creators.get(r.created_by),
        )
        for r in rows
    ]
    return AnnouncementPage(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        pages=(total + page_size - 1) // page_size,
    )


@router.post(
    "",
    response_model=AnnouncementOut,
    status_code=201,
    summary="Publish an announcement (announcements:write)",
    responses={403: {"description": "Requires announcements:write"}},
)
def create_announcement(
    body: AnnouncementCreate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("announcements:write")),
) -> AnnouncementOut:
    if body.audience not in {"all", "staff", "faculty", "parents", "students"}:
        raise AppError(422, "INVALID_AUDIENCE", "Unsupported audience.")
    row = Announcement(
        title=body.title,
        body=body.body,
        audience=body.audience,
        is_published=True,
        published_at=datetime.now(),
        created_by=ctx.user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return AnnouncementOut(
        id=row.id,
        title=row.title,
        body=row.body,
        audience=row.audience,
        is_published=row.is_published,
        published_at=row.published_at,
        created_by_name=ctx.full_name,
    )


__all__ = ["router"]
