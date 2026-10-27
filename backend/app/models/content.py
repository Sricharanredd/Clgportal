"""Content & operational models: announcements, timetable, activity log."""
from __future__ import annotations

from datetime import datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.academic import ClassSection, Subject
    from app.models.user import User


class Announcement(Base, TimestampMixin):
    """College announcements, optionally scoped to a branch/audience."""

    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    body: Mapped[str] = mapped_column(String(2000), nullable=False)
    audience: Mapped[str] = mapped_column(
        String(20), nullable=False, default="all", index=True
    )  # all | staff | faculty | parents | students
    branch_id: Mapped[int | None] = mapped_column(
        ForeignKey("branches.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    is_published: Mapped[bool] = mapped_column(default=True, nullable=False, index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    creator: Mapped[User] = relationship(foreign_keys=[created_by])


class TimetableEntry(Base, TimestampMixin):
    """Weekly timetable slot for a class (optional scope feature)."""

    __tablename__ = "timetable_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    class_section_id: Mapped[int] = mapped_column(
        ForeignKey("class_sections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=True
    )
    faculty_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon..6=Sun
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    room: Mapped[str | None] = mapped_column(String(30))

    class_section: Mapped[ClassSection] = relationship()
    subject: Mapped[Subject | None] = relationship()
    faculty: Mapped[User | None] = relationship(foreign_keys=[faculty_user_id])


class ActivityLog(Base):
    """General audit trail for recent-activity widgets (non-financial)."""

    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(40))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    summary: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, index=True
    )

    actor: Mapped[User | None] = relationship(foreign_keys=[actor_user_id])
