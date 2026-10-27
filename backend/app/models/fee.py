"""Fee domain models: structures, obligations, payments, audit logs.

DECIMAL(12,2) is used for every monetary amount — never floating point.
Payments and audit rows are append-only history; they are never overwritten.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.academic import AcademicYear, Branch, ClassSection
    from app.models.student import Student
    from app.models.user import User


class FeeStructure(Base, TimestampMixin):
    """Fee template for a branch/class in an academic year."""

    __tablename__ = "fee_structures"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    branch_id: Mapped[int] = mapped_column(
        ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    class_section_id: Mapped[int | None] = mapped_column(
        ForeignKey("class_sections.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    academic_year: Mapped[AcademicYear] = relationship()
    branch: Mapped[Branch] = relationship()


class StudentFeeObligation(Base, TimestampMixin):
    """A student's payable fee for one fee structure.

    `paid_amount` is a cached sum maintained inside the same DB transaction
    that inserts the payment; `fee_audit_logs` records every change."""

    __tablename__ = "student_fee_obligations"
    __table_args__ = (
        UniqueConstraint(
            "student_id", "fee_structure_id", name="uq_student_fee_structure"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    fee_structure_id: Mapped[int] = mapped_column(
        ForeignKey("fee_structures.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    due_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )  # active | cleared | waived | overdue

    student: Mapped[Student] = relationship()
    fee_structure: Mapped[FeeStructure] = relationship()

    @property
    def pending_amount(self) -> Decimal:
        return (self.total_amount or Decimal("0")) - (self.paid_amount or Decimal("0"))


class Payment(Base, TimestampMixin):
    """Immutable payment/reversal record.

    `idempotency_key` (client-supplied) makes duplicate submissions safe:
    a repeat POST returns the original payment instead of double-posting."""

    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_payment_idempotency"),
        UniqueConstraint("receipt_number", name="uq_payment_receipt"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    obligation_id: Mapped[int] = mapped_column(
        ForeignKey("student_fee_obligations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(20), nullable=False, default="cash")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="completed", index=True
    )  # completed | reversed
    reference: Mapped[str | None] = mapped_column(String(60), index=True)
    receipt_number: Mapped[str] = mapped_column(String(40), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(64), nullable=False)
    reversal_of_payment_id: Mapped[int | None] = mapped_column(
        ForeignKey("payments.id", ondelete="RESTRICT"), nullable=True
    )
    recorded_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    paid_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)

    obligation: Mapped[StudentFeeObligation] = relationship(
        foreign_keys=[obligation_id]
    )
    student: Mapped[Student] = relationship()
    recorder: Mapped[User] = relationship(foreign_keys=[recorded_by])
    reversal_of: Mapped[Payment | None] = relationship(
        remote_side="Payment.id", foreign_keys=[reversal_of_payment_id]
    )


class FeeAuditLog(Base):
    """Append-only audit trail for every financial operation.

    Never updated or deleted — corrections are new rows."""

    __tablename__ = "fee_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    obligation_id: Mapped[int | None] = mapped_column(
        ForeignKey("student_fee_obligations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    payment_id: Mapped[int | None] = mapped_column(
        ForeignKey("payments.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    operation: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    field_name: Mapped[str | None] = mapped_column(String(40))
    previous_value: Mapped[str | None] = mapped_column(String(255))
    new_value: Mapped[str | None] = mapped_column(String(255))
    amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    reference: Mapped[str | None] = mapped_column(String(60))
    reason: Mapped[str | None] = mapped_column(String(255))
    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, index=True
    )

    obligation: Mapped[StudentFeeObligation | None] = relationship()
    student: Mapped[Student] = relationship()
    payment: Mapped[Payment | None] = relationship()
    actor: Mapped[User] = relationship(foreign_keys=[actor_user_id])
