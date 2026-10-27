"""Attendance models: sessions and per-student records."""
from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.academic import ClassSection, Subject
    from app.models.student import Student
    from app.models.user import User


class AttendanceSession(Base, TimestampMixin):
    """One class's attendance for a date (created/drafted then submitted).

    `record_key` is a natural duplicate guard: class + date + subject."""

    __tablename__ = "attendance_sessions"
    __table_args__ = (
        UniqueConstraint(
            "class_section_id", "attendance_date", "subject_id", name="uq_session_natural"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    class_section_id: Mapped[int] = mapped_column(
        ForeignKey("class_sections.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", index=True
    )  # draft | submitted
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    submitted_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(String(255))

    class_section: Mapped["ClassSection"] = relationship()  # noqa: F821
    subject: Mapped["Subject"] = relationship()  # noqa: F821
    creator: Mapped[User] = relationship(foreign_keys=[created_by])
    submitter: Mapped[User | None] = relationship(foreign_keys=[submitted_by])
    records: Mapped[list[AttendanceRecord]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class AttendanceRecord(Base, TimestampMixin):
    """A single student's attendance entry for a session (immutable once
    the session is submitted; corrections create an audited update)."""

    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # present|absent|late|excused|on_duty
    marked_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    remarks: Mapped[str | None] = mapped_column(String(120))

    session: Mapped[AttendanceSession] = relationship(back_populates="records")
    student: Mapped[Student] = relationship()
    marker: Mapped[User | None] = relationship(foreign_keys=[marked_by])
