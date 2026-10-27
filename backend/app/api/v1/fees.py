"""Fees endpoints: summary, student fee view, payment recording,
reversal, payment history and audit trail."""
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.permissions.deps import AuthContext, require_any, require_permission
from app.schemas.common import Page
from app.schemas.fees import (
    AuditLogOut,
    AuditPage,
    FeeSummaryOut,
    PaymentCreate,
    PaymentOut,
    ReverseRequest,
    StudentFeesOut,
)
from app.services import fees as fee_service

router = APIRouter()


@router.get(
    "/summary",
    response_model=FeeSummaryOut,
    summary="Collection / outstanding figures (fees:read)",
)
def fees_summary(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("fees:read")),
) -> FeeSummaryOut:
    return fee_service.summary(db)


@router.get(
    "/students/{student_id}",
    response_model=StudentFeesOut,
    summary="Obligations + payment history for one student",
    responses={404: {"description": "Not visible to this account"}},
)
def student_fees(
    student_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_any("fees:read", "fees:read_own")),
) -> StudentFeesOut:
    return fee_service.student_fees(db, student_id, ctx)


@router.get(
    "/payments",
    response_model=Page[PaymentOut],
    summary="Paginated payment history (branch/roll filters)",
)
def payments(
    branch_id: int | None = None,
    roll: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("payments:read")),
) -> Page[PaymentOut]:
    items, total = fee_service.list_payments(
        db, branch_id=branch_id, roll=roll, page=page, page_size=page_size, ctx=ctx
    )
    return Page[PaymentOut](
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        pages=(total + page_size - 1) // page_size,
    )


@router.post(
    "/payments",
    response_model=PaymentOut,
    status_code=201,
    summary="Record a payment (idempotent, audited)",
    responses={
        200: {"description": "Duplicate submit — original payment returned"},
        403: {"description": "Requires payments:write (accounts staff)"},
        422: {"description": "Overpayment or invalid obligation"},
    },
)
def create_payment(
    body: PaymentCreate,
    response: Response,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("payments:write")),
) -> PaymentOut:
    payment, created = fee_service.record_payment(db, body, ctx)
    # Idempotent replay ⇒ 200 + original receipt (no double-posting).
    response.status_code = 201 if created else 200
    return payment


@router.post(
    "/payments/{payment_id}/reverse",
    response_model=PaymentOut,
    summary="Reverse a payment (append-only, reason required)",
    responses={
        403: {"description": "Requires payments:write"},
        409: {"description": "Already reversed / balance conflict"},
    },
)
def reverse_payment(
    payment_id: int,
    body: ReverseRequest,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("payments:write")),
) -> PaymentOut:
    return fee_service.reverse_payment(db, payment_id, body.reason, ctx)


@router.get(
    "/audit",
    response_model=AuditPage,
    summary="Fee audit history (append-only, paginated)",
)
def audit(
    student_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("fees:audit:read")),
) -> AuditPage:
    items, total = fee_service.list_audit(
        db, student_id=student_id, page=page, page_size=page_size, ctx=ctx
    )
    return AuditPage(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        pages=(total + page_size - 1) // page_size,
    )


__all__ = ["router"]
