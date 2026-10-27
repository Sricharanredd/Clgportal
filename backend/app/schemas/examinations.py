"""Examination & result-entry schemas."""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ExaminationOut(BaseModel):
    id: int
    title: str
    exam_type: str
    class_section_id: int
    class_label: str
    branch_code: str
    subject_id: int
    subject_code: str
    subject_name: str
    academic_year: str | None = None
    exam_date: date | None = None
    max_marks: Decimal
    pass_marks: Decimal
    status: str
    published_at: datetime | None = None
    entered: int = 0
    expected: int = 0

    model_config = {"from_attributes": True}


class ExaminationCreate(BaseModel):
    """Create a draft examination (faculty: assigned class+subject only)."""

    title: str = Field(min_length=2, max_length=100)
    class_section_id: int
    subject_id: int
    exam_type: str = Field(default="unit_test", max_length=30)
    exam_date: date | None = None
    max_marks: Decimal = Field(gt=0, le=1000)
    pass_marks: Decimal = Field(ge=0, le=1000)


class ResultRow(BaseModel):
    """Entry-sheet row: student identity + current mark."""

    student_id: int
    enrollment_id: int
    roll_number: str
    full_name: str
    marks_obtained: Decimal | None = None
    is_absent: bool = False
    remarks: str | None = None


class ExaminationDetail(BaseModel):
    examination: ExaminationOut
    roster: list[ResultRow] = Field(default_factory=list)
    can_edit: bool = False


class ResultInput(BaseModel):
    student_id: int
    # None = not entered (clients may send the full roster; blank rows are cleared)
    marks_obtained: Decimal | None = Field(default=None, ge=0, le=1000)
    is_absent: bool = False
    remarks: str | None = Field(default=None, max_length=120)


class SaveResultsRequest(BaseModel):
    results: list[ResultInput] = Field(min_length=1, max_length=300)


class SaveResultsResponse(BaseModel):
    saved: int
    status: str
    entered: int
    expected: int
    failed: list[dict] = Field(default_factory=list)


class PublishResponse(BaseModel):
    id: int
    status: str
    published_at: datetime | None = None


__all__ = [
    "ExaminationOut",
    "ExaminationCreate",
    "ExaminationDetail",
    "ResultRow",
    "ResultInput",
    "SaveResultsRequest",
    "SaveResultsResponse",
    "PublishResponse",
]
