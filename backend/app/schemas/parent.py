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


<<<<<<< HEAD
=======
class ParentSessionResponse(BaseModel):
    """Verified parent session (read-only access token)."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    parent_name: str
    permissions: list[str]
    children: list[ParentChildSummary]


# ---------------------------------------------------------------------------
# Demo (open) browsing — flag-gated, read-only
# ---------------------------------------------------------------------------


class ParentDirectoryItem(BaseModel):
    """One student row in the open parent directory (demo mode only).

    Contains only what a directory needs to identify a record: name, roll,
    branch and class. No contact details, DOB, guardian or fee data.
    """

    student_id: int
    roll_number: str
    full_name: str
    branch_id: int
    branch_code: str
    branch_name: str
    class_section: str | None = None
    academic_year: str | None = None
    status: str = "active"


class ParentDirectoryPage(BaseModel):
    """Paginated directory response for the open parent portal."""

    items: list[ParentDirectoryItem]
    page: int
    page_size: int
    total: int
    pages: int


>>>>>>> origin/main
__all__ = [
    "AttendanceHistoryEntry",
    "ParentChildSummary",
    "ParentDirectoryItem",
    "ParentDirectoryPage",
]
