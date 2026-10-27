"""Examination and result models (draft → published workflow)."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.academic import ClassSection, Subject
    from app.models.student import Enrollment
    from app.models.user import User


class Examination(Base, TimestampMixin):
    """An exam instance for a class + subject (e.g. "Unit Test 1").

    `status` gates visibility: only `published` rows are exposed to
    student/parent APIs."""

    __tablename__ = "examinations"
    __table_args__ = (
        UniqueConstraint(
            "class_section_id", "subject_id", "title", name="uq_exam_class_subject_title"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    exam_type: Mapped[str] = mapped_column(String(30), nullable=False, default="unit_test")
    class_section_id: Mapped[int] = mapped_column(
        ForeignKey("class_sections.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    exam_date: Mapped[date | None] = mapped_column(Date)
    max_marks: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    pass_marks: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", index=True
    )  # draft | published
    published_at: Mapped[datetime | None] = mapped_column(DateTime)
    published_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    class_section: Mapped[ClassSection] = relationship()
    subject: Mapped[Subject] = relationship()
    creator: Mapped[User] = relationship(foreign_keys=[created_by])
    publisher: Mapped[User | None] = relationship(foreign_keys=[published_by])
    results: Mapped[list[ExamResult]] = relationship(
        back_populates="examination", cascade="all, delete-orphan"
    )


class ExamResult(Base, TimestampMixin):
    """Marks for one enrolment in one examination.

    Unique on (examination_id, enrollment_id) — one mark row per student
    per exam, updated in place with `updated_by` accountability."""

    __tablename__ = "exam_results"
    __table_args__ = (
        UniqueConstraint("examination_id", "enrollment_id", name="uq_exam_enrollment"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    examination_id: Mapped[int] = mapped_column(
        ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrollment_id: Mapped[int] = mapped_column(
        ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    marks_obtained: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    is_absent: Mapped[bool] = mapped_column(default=False, nullable=False)
    remarks: Mapped[str | None] = mapped_column(String(120))
    entered_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    updated_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )

    examination: Mapped[Examination] = relationship(back_populates="results")
    enrollment: Mapped["Enrollment"] = relationship()
    enterer: Mapped[User | None] = relationship(foreign_keys=[entered_by])
    updater: Mapped[User | None] = relationship(foreign_keys=[updated_by])
