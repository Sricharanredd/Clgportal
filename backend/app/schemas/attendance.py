"""Attendance schemas: sessions, roster marking, submission."""
from datetime import date, datetime

from pydantic import BaseModel, Field


class SessionSummary(BaseModel):
    """Row in the attendance session list."""

    id: int
    class_section_id: int
    class_label: str
    branch_code: str
    subject: str | None = None
    attendance_date: date
    status: str
    present: int = 0
    absent: int = 0
    marked: int = 0
    roster_size: int = 0
    submitted_at: datetime | None = None

    model_config = {"from_attributes": True}


class RosterStudent(BaseModel):
    """One student in a session roster (pre-marked if a record exists)."""

    student_id: int
    roll_number: str
    full_name: str
    status: str | None = None  # None = not yet marked
    remarks: str | None = None


class SessionDetail(BaseModel):
    """Session + full roster for the marking screen."""

    id: int | None = None  # None when no session exists for date+class yet
    class_section_id: int
    class_label: str
    attendance_date: date
    status: str = "not_started"
    subject: str | None = None
    submitted_at: datetime | None = None
    roster: list[RosterStudent] = Field(default_factory=list)
    summary: dict = Field(default_factory=dict)  # present/absent/unmarked counts


class RecordInput(BaseModel):
    """Single student mark. Status must be an approved value."""

    student_id: int
    status: str = Field(pattern="^(present|absent|late|excused|on_duty)$")
    remarks: str | None = Field(default=None, max_length=120)


class SaveRecordsRequest(BaseModel):
    """Bulk save (draft). All roster students should be marked."""

    records: list[RecordInput] = Field(min_length=1, max_length=200)


class SaveRecordsResponse(BaseModel):
    saved: int
    status: str
    marked: int
    roster_size: int


class SubmitResponse(BaseModel):
    id: int
    status: str
    submitted_at: datetime | None = None
    marked: int
    roster_size: int


__all__ = [
    "SessionSummary",
    "SessionDetail",
    "RosterStudent",
    "RecordInput",
    "SaveRecordsRequest",
    "SaveRecordsResponse",
    "SubmitResponse",
]
