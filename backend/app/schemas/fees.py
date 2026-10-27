"""Fee & payment schemas (exact decimal strings for money)."""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import Page


class FeeSummaryOut(BaseModel):
    """Fees section header figures (fees:read)."""

    total_billed: Decimal
    total_collected: Decimal
    total_outstanding: Decimal
    students_with_obligations: int
    fully_cleared: int
    today_collections: Decimal
    generated_at: datetime


class PaymentOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    roll_number: str
    amount: Decimal
    method: str
    status: str
    reference: str | None = None
    receipt_number: str
    reversal_of_payment_id: int | None = None
    recorded_by_name: str | None = None
    paid_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentPage(Page[PaymentOut]):
    pass


class PaymentCreate(BaseModel):
    """Record a payment. `idempotency_key` protects against duplicate
    submission (double-click / network retry) via a DB unique constraint."""

    obligation_id: int
    amount: Decimal = Field(gt=0, le=Decimal("10000000"))
    method: str = Field(default="cash", pattern="^(cash|upi|bank_transfer|cheque|card)$")
    reference: str | None = Field(default=None, max_length=60)
    reason: str | None = Field(default=None, max_length=255)
    idempotency_key: str = Field(min_length=8, max_length=64)


class ObligationOut(BaseModel):
    id: int
    student_id: int
    fee_structure_name: str
    academic_year: str | None = None
    total_amount: Decimal
    paid_amount: Decimal
    pending_amount: Decimal
    status: str
    due_date: date | None = None
    can_record_payment: bool = False


class StudentFeesOut(BaseModel):
    """Fees view for one selected student."""

    student_id: int
    student_name: str
    roll_number: str
    branch_code: str
    obligations: list[ObligationOut] = Field(default_factory=list)
    payments: list[PaymentOut] = Field(default_factory=list)


class AuditLogOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    roll_number: str
    operation: str
    field_name: str | None = None
    previous_value: str | None = None
    new_value: str | None = None
    amount: Decimal | None = None
    reference: str | None = None
    reason: str | None = None
    actor_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditPage(Page[AuditLogOut]):
    pass


class ReverseRequest(BaseModel):
    """Auditable correction: reversal requires a reason."""

    reason: str = Field(min_length=5, max_length=255)


__all__ = [
    "FeeSummaryOut",
    "PaymentOut",
    "PaymentPage",
    "PaymentCreate",
    "ObligationOut",
    "StudentFeesOut",
    "AuditLogOut",
    "AuditPage",
    "ReverseRequest",
]
