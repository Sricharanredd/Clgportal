"""Step 3 of seeding: fee structures, obligations, payments, fee audit
logs, announcements and activity entries (all synthetic)."""
from __future__ import annotations

import logging
import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.content import ActivityLog, Announcement
from app.models.fee import FeeAuditLog, FeeStructure, Payment, StudentFeeObligation
from app.models.student import Student
from app.models.user import User

logger = logging.getLogger("cmp.seed")

rng = random.Random(777)

# branch code → (fee structure name, total amount)
FEE_PLANS: dict[str, tuple[str, Decimal]] = {
    "MPC": ("Annual Tuition Fee 2025-26", Decimal("36000.00")),
    "BiPC": ("Annual Tuition Fee 2025-26", Decimal("38000.00")),
    "CEC": ("Annual Tuition Fee 2025-26", Decimal("30000.00")),
}

PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "cheque", "card"]

ANNOUNCEMENTS = [
    (
        "Internal Examinations — Schedule Released",
        "Unit Test 2 timetable will be published on the notice board. "
        "Students must carry their college ID cards to the examination hall.",
        "all",
    ),
    (
        "Fee Deadline Reminder",
        "Second installment of tuition fees is due by the 15th of this month. "
        "Please contact the accounts office for receipts and concessions.",
        "all",
    ),
    (
        "Faculty Meeting — Saturday 10 AM",
        "All teaching staff are requested to attend the academic review meeting "
        "in the conference room on Saturday at 10:00 AM.",
        "faculty",
    ),
    (
        "Parent–Teacher Interaction",
        "Parent–teacher interaction slots for MPC I-A are open. Parents may book "
        "a slot through the class teacher.",
        "parents",
    ),
]


def seed_finance(db: Session, ref: dict, students: list[dict]) -> None:
    """Fee structures → obligations → part payments → audit trail."""
    if db.query(FeeStructure).count() > 0:
        logger.info("Fee data already present — skipping")
        return

    year_id: int = ref["academic_year_id"]
    branch_ids: dict[str, int] = ref["branch_ids"]
    branch_name = {v: k for k, v in branch_ids.items()}

    # --- fee structures per branch ---
    structure_ids: dict[int, tuple[int, Decimal]] = {}  # branch_id -> (structure_id, total)
    for code, (name, total) in FEE_PLANS.items():
        fs = FeeStructure(
            name=name,
            academic_year_id=year_id,
            branch_id=branch_ids[code],
            total_amount=total,
            description="Tuition + examination fee for the academic year",
            is_active=True,
        )
        db.add(fs)
        db.flush()
        structure_ids[branch_ids[code]] = (fs.id, total)

    accounts_user = db.query(User).filter_by(email="accounts@demo.edu").first().id

    payments = 0
    audit_rows = 0
    receipt_seq = 1000
    now = datetime.now()
    for s in students:
        struct_id, total = structure_ids[s["branch_id"]]
        # deterministic payment profile:
        #   ~35% fully paid (1 receipt), ~45% two installments, ~20% first installment
        profile = rng.random()
        if profile < 0.35:
            plan = [total]
        elif profile < 0.80:
            plan = [total * Decimal("0.40"), total * Decimal("0.10")]
        else:
            plan = [total * Decimal("0.30")]

        obligation = StudentFeeObligation(
            student_id=s["id"],
            fee_structure_id=struct_id,
            academic_year_id=year_id,
            total_amount=total,
            paid_amount=Decimal("0.00"),
            due_date=date(2026, 1, 15),
            status="active",
        )
        db.add(obligation)
        db.flush()

        paid = Decimal("0.00")
        base_days = rng.randint(25, 90)  # first installment date (days ago)
        for i, amount in enumerate(plan):
            receipt_seq += 1
            # later installments are more recent than earlier ones
            days_ago = max(2, base_days - i * 20)
            paid_at = now - timedelta(days=days_ago, hours=rng.randint(0, 8))
            method = PAYMENT_METHODS[rng.randint(0, len(PAYMENT_METHODS) - 1)]
            payment = Payment(
                obligation_id=obligation.id,
                student_id=s["id"],
                amount=amount,
                method=method,
                status="completed",
                reference=f"REF-{receipt_seq}" if method != "cash" else None,
                receipt_number=f"RCP-{receipt_seq}",
                idempotency_key=f"seed-{s['roll']}-{i}",
                recorded_by=accounts_user,
                paid_at=paid_at,
            )
            db.add(payment)
            db.flush()
            paid += amount
            payments += 1
            db.add(
                FeeAuditLog(
                    obligation_id=obligation.id,
                    student_id=s["id"],
                    payment_id=payment.id,
                    operation="payment_recorded",
                    field_name="paid_amount",
                    previous_value=str(paid - amount),
                    new_value=str(paid),
                    amount=amount,
                    reference=payment.receipt_number,
                    reason="Tuition fee installment",
                    actor_user_id=accounts_user,
                    created_at=paid_at,
                )
            )
            audit_rows += 1

        obligation.paid_amount = paid
        obligation.status = "cleared" if paid >= total else "active"

    db.flush()
    db.commit()
    logger.info("Seeded fee obligations=%d payments=%d audit=%d", len(students), payments, audit_rows)


def seed_content(db: Session, ref: dict) -> None:
    """Announcements + activity-log entries for dashboards."""
    if db.query(Announcement).count() > 0:
        logger.info("Announcements already present — skipping")
        return

    creator = db.query(User).filter_by(email="principal@demo.edu").first().id
    admin = db.query(User).filter_by(email="admin@demo.edu").first().id
    accounts = db.query(User).filter_by(email="accounts@demo.edu").first().id

    now = datetime.now()
    for i, (title, body, audience) in enumerate(ANNOUNCEMENTS):
        db.add(
            Announcement(
                title=title,
                body=body,
                audience=audience,
                is_published=True,
                published_at=now - timedelta(hours=6 * (i + 1)),
                created_by=creator,
            )
        )

    activities = [
        (accounts, "payment_recorded", "Payment", "Fee installment recorded for MPC batch"),
        (creator, "result_published", "Examination", "Unit Test 1 results published"),
        (admin, "student_admitted", "Student", "New student admission recorded"),
        (accounts, "payment_recorded", "Payment", "Fee installment recorded for BiPC batch"),
        (creator, "announcement_created", "Announcement", "Internal exam schedule announced"),
        (admin, "staff_account_created", "User", "Faculty account provisioned"),
    ]
    for i, (actor, action, entity, summary) in enumerate(activities):
        db.add(
            ActivityLog(
                actor_user_id=actor,
                action=action,
                entity_type=entity,
                entity_id=None,
                summary=summary,
                created_at=now - timedelta(hours=3 * (i + 1)),
            )
        )
    db.commit()
    logger.info("Seeded %d announcements, %d activity entries", len(ANNOUNCEMENTS), len(activities))


__all__ = ["seed_finance", "seed_content", "FEE_PLANS", "ANNOUNCEMENTS"]
