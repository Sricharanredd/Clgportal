"""Student list/profile schemas (read contracts for staff + read-only)."""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import Page


class StudentSummary(BaseModel):
    """Row in a paginated student search result."""

    id: int
    roll_number: str
    full_name: str
    branch_id: int
    branch_code: str
    class_section: str | None = None
    academic_year: str | None = None
    status: str = "active"

    model_config = {"from_attributes": True}


class StudentSearchPage(Page[StudentSummary]):
    """Paginated student search response."""


class AttendanceSummary(BaseModel):
    """Read-only attendance totals for a student profile."""

    total_sessions: int = 0
    present: int = 0
    absent: int = 0
    late: int = 0
    attendance_pct: float = 0.0


class ResultSummary(BaseModel):
    """One published exam result line (read-only)."""

    exam_title: str
    subject_code: str
    subject_name: str
    max_marks: Decimal
    marks_obtained: Decimal | None = None
    is_absent: bool = False
    status: str = "published"
    published_at: datetime | None = None


class FeeSummary(BaseModel):
    """Obligation totals (only when caller has fees:read)."""

    total_amount: Decimal
    paid_amount: Decimal
    pending_amount: Decimal
    status: str
    due_date: date | None = None


class StudentProfile(BaseModel):
    """Full profile returned after selecting a student.

    Optional blocks are omitted (null) when the caller lacks the matching
    permission — the backend decides, never the frontend."""

    id: int
    roll_number: str
    first_name: str
    last_name: str
    full_name: str
    branch_id: int
    branch_code: str
    branch_name: str
    class_section: str | None = None
    year_of_study: int | None = None
    academic_year: str | None = None
    enrollment_status: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    guardian_name: str | None = None
    admission_date: date | None = None
    is_active: bool = True

    attendance: AttendanceSummary | None = None
    published_results: list[ResultSummary] = Field(default_factory=list)
    fee: FeeSummary | None = None


__all__ = [
    "StudentSummary",
    "StudentSearchPage",
    "StudentProfile",
    "AttendanceSummary",
    "ResultSummary",
    "FeeSummary",
]
