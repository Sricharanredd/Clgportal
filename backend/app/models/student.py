"""Student, enrolment and parent models."""
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftActiveMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.academic import AcademicYear, Branch, ClassSection


class Student(Base, TimestampMixin, SoftActiveMixin):
    """Permanent student profile (independent of academic-year enrolment).

    Roll numbers are unique within a branch."""

    __tablename__ = "students"
    __table_args__ = (
        UniqueConstraint("roll_number", "branch_id", name="uq_student_roll_branch"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    roll_number: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(60), nullable=False)
    last_name: Mapped[str] = mapped_column(String(60), nullable=False)
    branch_id: Mapped[int] = mapped_column(
        ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(10))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(120))
    address: Mapped[str | None] = mapped_column(String(255))
    guardian_name: Mapped[str | None] = mapped_column(String(120))
    admission_date: Mapped[date | None] = mapped_column(Date)

    branch: Mapped["Branch"] = relationship()  # noqa: F821
    enrollments: Mapped[list[Enrollment]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class Enrollment(Base, TimestampMixin):
    """A student's enrolment in a class for a specific academic year."""

    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint(
            "student_id", "academic_year_id", name="uq_enrollment_student_year"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_section_id: Mapped[int] = mapped_column(
        ForeignKey("class_sections.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", index=True)
    enrolled_on: Mapped[date | None] = mapped_column(Date)

    student: Mapped[Student] = relationship(back_populates="enrollments")
    class_section: Mapped["ClassSection"] = relationship()  # noqa: F821
    academic_year: Mapped["AcademicYear"] = relationship()  # noqa: F821


class Parent(Base, TimestampMixin, SoftActiveMixin):
    """Parent/guardian identity. Access codes are hashed like passwords."""

    __tablename__ = "parents"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), index=True)
    email: Mapped[str | None] = mapped_column(String(120))
    access_code_hash: Mapped[str | None] = mapped_column(String(255))
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)


class StudentParentLink(Base):
    """Verified relationship between a student and a parent."""

    __tablename__ = "student_parent_links"
    __table_args__ = (
        UniqueConstraint("student_id", "parent_id", name="uq_student_parent"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_id: Mapped[int] = mapped_column(
        ForeignKey("parents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relationship_type: Mapped[str] = mapped_column(
        "relationship", String(30), nullable=False, default="guardian"
    )

    student: Mapped[Student] = relationship()
    parent: Mapped[Parent] = relationship()
