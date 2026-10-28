"""Parent lookup/verification schemas (public, read-only flow)."""
from datetime import date

from pydantic import BaseModel, Field, field_validator


class ParentLookupRequest(BaseModel):
    """Public branch + roll-number search (no staff login)."""

    branch_id: int = Field(ge=1)
    roll_number: str = Field(min_length=2, max_length=30)


class ParentSearchRequest(BaseModel):
    """Public name search (discovery only — grants NO access by itself).

    After the parent picks a candidate, the client still runs the normal
    `/lookup` (branch + roll) → `/verify` flow, so production access-code
    verification is never bypassed by searching by name.
    """

    name: str = Field(min_length=1, max_length=100)
    branch_id: int | None = Field(default=None, ge=1)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Enter at least 2 characters.")
        return value


class ParentSearchMatch(BaseModel):
    """Minimal fields to disambiguate name-search candidates.

    Deliberately excludes `student_id` and all PII (DOB, gender, contacts):
    knowing a name must not leak a record, only help a guardian pick theirs.
    """

    branch_id: int
    roll_number: str
    masked_name: str  # e.g. "A*** S***"
    branch_code: str
    class_section: str | None = None


class MaskedStudent(BaseModel):
    """Minimal masked identity — shown BEFORE verification."""

    student_id: int
    roll_number: str
    masked_name: str  # e.g. "A*** S***"
    branch_code: str
    class_section: str | None = None


class ParentLookupResponse(BaseModel):
    """Lookup result + signed token for the verification step."""

    lookup_token: str
    expires_in: int
    student: MaskedStudent
    verification_required: bool = True
    hint: str = "Enter the access code issued by the college to view records."


class ParentVerifyRequest(BaseModel):
    """Exchange lookup token + access code for a read-only session.

    `access_code` may be empty ONLY when parent verification is disabled
    (demo mode, `PARENT_VERIFICATION_ENABLED=false`). The minimum length is
    enforced inside the verify endpoint so the schema itself never blocks
    the configured demo policy, while production still rejects short/empty
    codes with the same generic 401 as a wrong code.
    """

    lookup_token: str = Field(min_length=20)
    access_code: str = Field(default="", max_length=64)


class AttendanceHistoryEntry(BaseModel):
    """One submitted attendance record for a linked child (read-only)."""

    attendance_date: date
    subject_code: str | None = None
    subject_name: str | None = None
    status: str  # present | absent | late | excused | on_duty
    remarks: str | None = None


class ParentChildSummary(BaseModel):
    """Linked child shown in the parent's read-only view."""

    student_id: int
    roll_number: str
    full_name: str
    branch_code: str
    class_section: str | None = None
    academic_year: str | None = None

    model_config = {"from_attributes": True}


class ParentSessionResponse(BaseModel):
    """Verified parent session (read-only access token)."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    parent_name: str
    permissions: list[str]
    children: list[ParentChildSummary]


__all__ = [
    "ParentLookupRequest",
    "ParentLookupResponse",
    "ParentSearchRequest",
    "ParentSearchMatch",
    "ParentVerifyRequest",
    "ParentSessionResponse",
    "MaskedStudent",
    "ParentChildSummary",
]
