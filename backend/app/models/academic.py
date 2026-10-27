"""Academic structure: branches, academic years, classes/sections, subjects,
faculty profiles and faculty assignments."""
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftActiveMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Branch(Base, TimestampMixin, SoftActiveMixin):
    """College branch (MPC, BiPC, CEC, ...). Configurable — not hard-coded."""

    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_order: Mapped[int] = mapped_column(default=0, nullable=False)


class AcademicYear(Base, TimestampMixin, SoftActiveMixin):
    """Academic year, e.g. 2025-26. Enrolments reference a year."""

    __tablename__ = "academic_years"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(default=False, nullable=False)


class Subject(Base, TimestampMixin, SoftActiveMixin):
    """Subject offered under a branch (configurable assignments)."""

    __tablename__ = "subjects"
    __table_args__ = (UniqueConstraint("code", name="uq_subject_code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    branch_id: Mapped[int] = mapped_column(
        ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    branch: Mapped[Branch] = relationship()


class ClassSection(Base, TimestampMixin, SoftActiveMixin):
    """A class/section within a branch for an academic year (e.g. MPC I-A)."""

    __tablename__ = "class_sections"
    __table_args__ = (
        UniqueConstraint(
            "branch_id", "academic_year_id", "section_name", name="uq_class_section"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    branch_id: Mapped[int] = mapped_column(
        ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    section_name: Mapped[str] = mapped_column(String(30), nullable=False)  # e.g. "I-A"
    year_of_study: Mapped[int] = mapped_column(default=1, nullable=False)  # 1 or 2

    branch: Mapped[Branch] = relationship()
    academic_year: Mapped[AcademicYear] = relationship()


class FacultyProfile(Base, TimestampMixin):
    """Profile attached to a staff user who teaches."""

    __tablename__ = "faculty_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    employee_code: Mapped[str | None] = mapped_column(String(30), unique=True)
    qualification: Mapped[str | None] = mapped_column(String(120))
    designation: Mapped[str | None] = mapped_column(String(80))

    user: Mapped[User] = relationship(back_populates="faculty_profile")


class FacultyAssignment(Base, TimestampMixin):
    """Which classes/subjects a faculty user is assigned to.

    This table — not the frontend branch menu — is the authority for scope."""

    __tablename__ = "faculty_assignments"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "class_section_id",
            "subject_id",
            "academic_year_id",
            name="uq_faculty_assignment",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_section_id: Mapped[int] = mapped_column(
        ForeignKey("class_sections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    assignment_type: Mapped[str] = mapped_column(String(20), nullable=False, default="subject_teacher")

    user: Mapped[User] = relationship()
    class_section: Mapped[ClassSection] = relationship()
    subject: Mapped[Subject] = relationship()
    academic_year: Mapped[AcademicYear] = relationship()
