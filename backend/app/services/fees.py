"""Fee business rules (PRD §8).

Financial integrity guarantees:
- Every mutation happens inside ONE database transaction; the audit row is
  written in the same transaction as the payment/balance change.
- `idempotency_key` has a UNIQUE index — a duplicate submit returns the
  original payment instead of double-posting.
- Amounts are Decimal(12,2); overpayment beyond pending is rejected.
- Reversals never delete/overwrite rows: they append a negative payment
  linked to the original, flip its status, and log the reason.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.academic import AcademicYear, Branch
from app.models.fee import FeeAuditLog, FeeStructure, Payment, StudentFeeObligation
from app.models.student import Student
from app.models.user import User
from app.permissions.deps import AuthContext, can_view_student
from app.schemas.fees import (
    AuditLogOut,
    AuditPage,
    FeeSummaryOut,
    ObligationOut,
    PaymentCreate,
    PaymentOut,
    StudentFeesOut,
)


def summary(db: Session) -> FeeSummaryOut:
    """Fees section header figures for the current academic year."""
    year_id = _current_year_id(db)
    q = db.query(
        func.coalesce(func.sum(StudentFeeObligation.total_amount), 0),
        func.coalesce(func.sum(StudentFeeObligation.paid_amount), 0),
        func.count(StudentFeeObligation.id),
    )
    if year_id:
        q = q.filter(StudentFeeObligation.academic_year_id == year_id)
    total, paid, count = q.one()
    cleared = (
        db.query(func.count(StudentFeeObligation.id))
        .filter(StudentFeeObligation.status == "cleared")
        .filter(
            StudentFeeObligation.academic_year_id == year_id if year_id else True
        )
        .scalar()
        or 0
    )
    today = date.today()
    today_agg = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        func.date(Payment.paid_at) == today, Payment.status == "completed"
    ).one()
    total, paid = Decimal(str(total)), Decimal(str(paid))
    return FeeSummaryOut(
        total_billed=total,
        total_collected=paid,
        total_outstanding=total - paid,
        students_with_obligations=int(count),
        fully_cleared=int(cleared),
        today_collections=Decimal(str(today_agg[0])),
        generated_at=datetime.now(),
    )


def _current_year_id(db: Session) -> int | None:
    year = db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first()
    return year.id if year else None


def _payment_out(p: Payment, student: Student, recorder: User | None) -> PaymentOut:
    return PaymentOut(
        id=p.id,
        student_id=p.student_id,
        student_name=student.full_name,
        roll_number=student.roll_number,
        amount=p.amount,
        method=p.method,
        status=p.status,
        reference=p.reference,
        receipt_number=p.receipt_number,
        reversal_of_payment_id=p.reversal_of_payment_id,
        recorded_by_name=recorder.full_name if recorder else None,
        paid_at=p.paid_at,
        created_at=p.created_at,
    )


def student_fees(db: Session, student_id: int, ctx: AuthContext) -> StudentFeesOut:
    """Obligations + payment history for one student (scope-checked)."""
    if not can_view_student(db, ctx, student_id):
        raise AppError(404, "NOT_FOUND", "Student record not found.")
    student = db.query(Student).filter(Student.id == student_id).first()
    if student is None:
        raise AppError(404, "NOT_FOUND", "Student record not found.")
    branch = db.query(Branch).filter(Branch.id == student.branch_id).first()

    obs = (
        db.query(StudentFeeObligation, FeeStructure)
        .join(FeeStructure, FeeStructure.id == StudentFeeObligation.fee_structure_id)
        .filter(StudentFeeObligation.student_id == student_id)
        .all()
    )
    can_pay = "payments:write" in ctx.permissions
    obligations = [
        ObligationOut(
            id=o.id,
            student_id=o.student_id,
            fee_structure_name=fs.name,
            academic_year=None,
            total_amount=o.total_amount,
            paid_amount=o.paid_amount,
            pending_amount=(o.total_amount - o.paid_amount),
            status=o.status,
            due_date=o.due_date,
            can_record_payment=can_pay,
        )
        for o, fs in obs
    ]

    pay_rows = (
        db.query(Payment, User)
        .outerjoin(User, User.id == Payment.recorded_by)
        .filter(Payment.student_id == student_id)
        .order_by(Payment.paid_at.desc(), Payment.id.desc())
        .all()
    )
    payments = [_payment_out(p, student, u) for p, u in pay_rows]
    return StudentFeesOut(
        student_id=student.id,
        student_name=student.full_name,
        roll_number=student.roll_number,
        branch_code=branch.code if branch else "?",
        obligations=obligations,
        payments=payments,
    )


def list_payments(
    db: Session,
    *,
    branch_id: int | None,
    roll: str | None,
    page: int,
    page_size: int,
    ctx: AuthContext,
) -> tuple[list[PaymentOut], int]:
    """Paginated payment list (accounts/principal audit view)."""
    q = (
        db.query(Payment, Student, User)
        .join(Student, Student.id == Payment.student_id)
        .outerjoin(User, User.id == Payment.recorded_by)
    )
    if branch_id:
        q = q.filter(Student.branch_id == branch_id)
    if roll:
        q = q.filter(Student.roll_number.ilike(f"%{roll.strip()}%"))
    if ctx.branch_scope is not None:
        q = q.filter(Student.branch_id.in_(list(ctx.branch_scope)))

    total = q.with_entities(func.count(Payment.id)).scalar() or 0
    rows = (
        q.order_by(Payment.paid_at.desc(), Payment.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_payment_out(p, s, u) for p, s, u in rows], int(total)


def record_payment(db: Session, body: PaymentCreate, ctx: AuthContext) -> tuple[PaymentOut, bool]:
    """Create a payment atomically with its audit entry.

    Returns (payment, created). `created=False` means the idempotency key
    matched an earlier submission — the original payment is returned."""
    # Idempotent replay: same key ⇒ same original receipt (HTTP 200).
    existing = (
        db.query(Payment).filter(Payment.idempotency_key == body.idempotency_key).first()
    )
    if existing is not None:
        return _load_payment(db, existing), False

    obligation = (
        db.query(StudentFeeObligation)
        .filter(StudentFeeObligation.id == body.obligation_id)
        .first()
    )
    if obligation is None:
        raise AppError(404, "NOT_FOUND", "Fee obligation not found.")
    if not can_view_student(db, ctx, obligation.student_id):
        raise AppError(404, "NOT_FOUND", "Fee obligation not found.")

    pending = obligation.total_amount - obligation.paid_amount
    if body.amount > pending:
        raise AppError(
            422,
            "OVERPAYMENT",
            f"Amount exceeds pending balance of {pending}.",
        )

    student = db.query(Student).filter(Student.id == obligation.student_id).first()
    previous_paid = obligation.paid_amount

    # --- single transaction: payment + balance update + audit row ---
    try:
        payment = Payment(
            obligation_id=obligation.id,
            student_id=obligation.student_id,
            amount=body.amount,
            method=body.method,
            status="completed",
            reference=body.reference,
            receipt_number="PENDING",  # replaced after flush (id-based)
            idempotency_key=body.idempotency_key,
            recorded_by=ctx.user_id,
            paid_at=datetime.now(),
        )
        db.add(payment)
        db.flush()  # assigns payment.id; raises IntegrityError on dupe key
        payment.receipt_number = f"RCP-{payment.id:06d}"

        new_paid = previous_paid + body.amount
        obligation.paid_amount = new_paid
        obligation.status = (
            "cleared" if new_paid >= obligation.total_amount else obligation.status
        )

        db.add(
            FeeAuditLog(
                obligation_id=obligation.id,
                student_id=obligation.student_id,
                payment_id=payment.id,
                operation="payment_recorded",
                field_name="paid_amount",
                previous_value=str(previous_paid),
                new_value=str(new_paid),
                amount=body.amount,
                reference=payment.receipt_number,
                reason=body.reason or "Fee payment",
                actor_user_id=ctx.user_id,
            )
        )
        _log_activity(db, ctx, "payment_recorded",
                      f"{body.amount} recorded for {student.full_name} "
                      f"({student.roll_number})")
        db.commit()
    except IntegrityError:
        db.rollback()
        # concurrent duplicate submit won the race → return original
        winner = (
            db.query(Payment)
            .filter(Payment.idempotency_key == body.idempotency_key)
            .first()
        )
        if winner is not None:
            return _load_payment(db, winner), False
        raise AppError(409, "CONFLICT", "Payment could not be recorded.")

    db.refresh(payment)
    return _load_payment(db, payment), True


def _load_payment(db: Session, payment: Payment) -> PaymentOut:
    student = db.query(Student).filter(Student.id == payment.student_id).first()
    recorder = db.query(User).filter(User.id == payment.recorded_by).first()
    return _payment_out(payment, student, recorder)


def reverse_payment(db: Session, payment_id: int, reason: str, ctx: AuthContext) -> PaymentOut:
    """Append-only correction: negative payment + status flip + audit."""
    original = db.query(Payment).filter(Payment.id == payment_id).first()
    if original is None:
        raise AppError(404, "NOT_FOUND", "Payment not found.")
    if original.status == "reversed":
        raise AppError(409, "ALREADY_REVERSED", "This payment is already reversed.")
    if original.reversal_of_payment_id is not None:
        raise AppError(409, "IS_REVERSAL", "A reversal entry cannot be reversed again.")

    obligation = (
        db.query(StudentFeeObligation)
        .filter(StudentFeeObligation.id == original.obligation_id)
        .first()
    )
    if obligation is None:
        raise AppError(404, "NOT_FOUND", "Fee obligation not found.")

    try:
        reversal = Payment(
            obligation_id=original.obligation_id,
            student_id=original.student_id,
            amount=-original.amount,
            method=original.method,
            status="completed",
            reference=original.reference,
            receipt_number="PENDING",
            idempotency_key=f"rev-{ctx.user_id}-{original.id}-{int(datetime.now().timestamp())}",
            reversal_of_payment_id=original.id,
            recorded_by=ctx.user_id,
            paid_at=datetime.now(),
        )
        db.add(reversal)
        db.flush()
        reversal.receipt_number = f"REV-{reversal.id:06d}"

        original.status = "reversed"

        previous_paid = obligation.paid_amount
        new_paid = previous_paid - original.amount
        if new_paid < 0:
            raise AppError(
                409,
                "BALANCE_CONFLICT",
                "Reversal would make the paid amount negative.",
            )
        obligation.paid_amount = new_paid
        if new_paid < obligation.total_amount and obligation.status == "cleared":
            obligation.status = "active"

        db.add(
            FeeAuditLog(
                obligation_id=obligation.id,
                student_id=original.student_id,
                payment_id=reversal.id,
                operation="reversal_recorded",
                field_name="paid_amount",
                previous_value=str(previous_paid),
                new_value=str(new_paid),
                amount=-original.amount,
                reference=reversal.receipt_number,
                reason=reason,
                actor_user_id=ctx.user_id,
            )
        )
        student = db.query(Student).filter(Student.id == original.student_id).first()
        _log_activity(
            db, ctx, "payment_reversed",
            f"{original.receipt_number} reversed for {student.roll_number}: {reason}",
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError(409, "CONFLICT", "Reversal could not be recorded.")

    db.refresh(reversal)
    return _load_payment(db, reversal)


def list_audit(
    db: Session,
    *,
    student_id: int | None,
    page: int,
    page_size: int,
    ctx: AuthContext,
) -> tuple[list[AuditLogOut], int]:
    """Paginated fee audit history (append-only)."""
    q = (
        db.query(FeeAuditLog, Student, User)
        .join(Student, Student.id == FeeAuditLog.student_id)
        .outerjoin(User, User.id == FeeAuditLog.actor_user_id)
    )
    if student_id:
        q = q.filter(FeeAuditLog.student_id == student_id)
    if ctx.branch_scope is not None:
        q = q.filter(Student.branch_id.in_(list(ctx.branch_scope)))

    total = q.with_entities(func.count(FeeAuditLog.id)).scalar() or 0
    rows = (
        q.order_by(FeeAuditLog.created_at.desc(), FeeAuditLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        AuditLogOut(
            id=a.id,
            student_id=a.student_id,
            student_name=s.full_name,
            roll_number=s.roll_number,
            operation=a.operation,
            field_name=a.field_name,
            previous_value=a.previous_value,
            new_value=a.new_value,
            amount=a.amount,
            reference=a.reference,
            reason=a.reason,
            actor_name=u.full_name if u else None,
            created_at=a.created_at,
        )
        for a, s, u in rows
    ]
    return items, int(total)


def _log_activity(db: Session, ctx: AuthContext, action: str, summary_text: str) -> None:
    from app.models.content import ActivityLog

    db.add(
        ActivityLog(
            actor_user_id=ctx.user_id,
            action=action,
            entity_type="Payment",
            summary=summary_text,
        )
    )


__all__ = [
    "summary",
    "student_fees",
    "list_payments",
    "record_payment",
    "reverse_payment",
    "list_audit",
]
