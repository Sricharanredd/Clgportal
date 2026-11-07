"""Parent & student portal schemas (public, read-only flow)."""
from datetime import date

from pydantic import BaseModel


class AttendanceHistoryEntry(BaseModel):
    """One submitted attendance record for a student (read-only)."""

    attendance_date: date
    subject_code: str | None = None
    subject_name: str | None = None
    status: str  # present | absent | late | excused | on_duty
    remarks: str | None = None


class ParentChildSummary(BaseModel):
    """Student summary shown in the parent/student portal read-only view."""

    student_id: int
    roll_number: str
    full_name: str
    branch_code: str
    class_section: str | None = None
    academic_year: str | None = None

    model_config = {"from_attributes": True}


__all__ = [
    "AttendanceHistoryEntry",
    "ParentChildSummary",
]
