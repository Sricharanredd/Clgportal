"""Parent lookup/verification schemas (public, read-only flow)."""
from pydantic import BaseModel, Field


class ParentLookupRequest(BaseModel):
    """Public branch + roll-number search (no staff login)."""

    branch_id: int = Field(ge=1)
    roll_number: str = Field(min_length=2, max_length=30)


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
    """Exchange lookup token + access code for a read-only session."""

    lookup_token: str = Field(min_length=20)
    access_code: str = Field(min_length=4, max_length=64)


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
    "ParentVerifyRequest",
    "ParentSessionResponse",
    "MaskedStudent",
    "ParentChildSummary",
]
