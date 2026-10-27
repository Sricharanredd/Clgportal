"""Announcement schemas."""
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import Page


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    body: str = Field(min_length=3, max_length=2000)
    audience: str = Field(default="all", max_length=20)


class AnnouncementOut(BaseModel):
    id: int
    title: str
    body: str
    audience: str
    is_published: bool = True
    published_at: datetime | None = None
    created_by_name: str | None = None

    model_config = {"from_attributes": True}


class AnnouncementPage(Page[AnnouncementOut]):
    pass


__all__ = ["AnnouncementCreate", "AnnouncementOut", "AnnouncementPage"]
