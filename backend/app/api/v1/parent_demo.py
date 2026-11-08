"""Open parent portal (DEMO MODE) — read-only, flag-gated.

`DEMO_OPEN_PARENT=true` lets a visitor browse every student's record without
logging in, which is what the client demo needs. Everything here is:

- **GET only** — there is no write route in this module, so the open mode can
  never record a payment, edit a mark or change attendance.
- **Flag-gated** — when `demo_open_parent` is false every route returns 404
  (not 403), so a production deployment does not even advertise the surface.
- **Minimal** — the directory exposes only name/roll/branch/class. Contact
  details, guardian, attendance, published results and fee rows are served
  per student, and drafts are never included.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import AppError
from app.models.content import Announcement
from app.repositories.students import (
    attendance_history,
    attendance_summary,
    get_student_profile_parts,
)
from app.schemas.announcements import AnnouncementOut, AnnouncementPage
from app.schemas.fees import StudentFeesOut
from app.schemas.parent import (
    AttendanceHistoryEntry,
    DemoOverview,
    ParentDirectoryItem,
    ParentDirectoryPage,
)
from app.schemas.students import AttendanceSummary, ResultSummary, StudentProfile
from app.services import fees as fee_service
from app.services import parent_service as svc

router = APIRouter()


def _require_demo() -> None:
    """404 when the demo flag is off — never reveal that the routes exist."""
    if not get_settings().demo_open_parent:
        raise AppError(404, "NOT_FOUND", "Not found.")


def _require_student(db: Session, student_id: int):
    parts = get_student_profile_parts(db, student_id)
    if parts is None:
        raise AppError(404, "NOT_FOUND", "Student record not found.")
    return parts


@router.get(
    "/overview",
    response_model=DemoOverview,
    summary="[demo] College-wide overview (real aggregates, no sample data)",
)
def overview(db: Session = Depends(get_db)) -> DemoOverview:
    _require_demo()
    return svc.demo_overview(db)


@router.get(
    "/lookup",
    response_model=ParentDirectoryItem,
    summary="[demo] Exact branch + roll-number lookup",
    responses={404: {"description": "No matching active student"}},
)
def lookup(
    branch_id: int = Query(ge=1),
    roll_number: str = Query(min_length=2, max_length=30),
    db: Session = Depends(get_db),
) -> ParentDirectoryItem:
    _require_demo()
    student = svc.find_student(db, branch_id, roll_number)
    if student is None:
        # Demo seed convention: BiPC rolls are stored as BIP25001 while the
        # college prints BIPC25001. Accept the friendlier spelling too.
        compact = roll_number.strip().upper().replace(" ", "")
        if compact.startswith("BIPC"):
            student = svc.find_student(db, branch_id, f"BIP{compact[4:]}")
    if student is None:
        raise AppError(
            404,
            "NO_STUDENT",
            "No student found for this roll number in the selected branch.",
        )

    student, branch, cls, year = _require_student(db, student.id)
    return ParentDirectoryItem(
        student_id=student.id,
        roll_number=student.roll_number,
        full_name=student.full_name,
        branch_id=branch.id,
        branch_code=branch.code,
        branch_name=branch.name,
        class_section=cls.section_name if cls else None,
        academic_year=year.name if year else None,
        status="active" if student.is_active else "inactive",
    )


@router.get(
    "/students",
    response_model=ParentDirectoryPage,
    summary="[demo] Browse every student (read-only directory)",
)
def directory(
    q: str | None = Query(default=None, max_length=100),
    branch_id: int | None = Query(default=None, ge=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=60),
    db: Session = Depends(get_db),
) -> ParentDirectoryPage:
    _require_demo()
    rows, total = svc.list_directory(
        db, q=q, branch_id=branch_id, page=page, page_size=page_size
    )
    items = [
        ParentDirectoryItem(
            student_id=student.id,
            roll_number=student.roll_number,
            full_name=student.full_name,
            branch_id=branch.id,
            branch_code=branch.code,
            branch_name=branch.name,
            class_section=cls.section_name if cls else None,
            academic_year=year.name if year else None,
            status="active" if student.is_active else "inactive",
        )
        for student, branch, cls, year in rows
    ]
    return ParentDirectoryPage(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        pages=(total + page_size - 1) // page_size,
    )


@router.get(
    "/students/{student_id}",
    response_model=StudentProfile,
    summary="[demo] Read-only student profile (overview)",
)
def student_profile(
    student_id: int,
    db: Session = Depends(get_db),
) -> StudentProfile:
    _require_demo()
    student, branch, cls, year = _require_student(db, student_id)

    # Imported here to avoid a module-level api→api import cycle.
    from app.api.v1.students import _fee_summary, _published_results

    return StudentProfile(
        id=student.id,
        roll_number=student.roll_number,
        first_name=student.first_name,
        last_name=student.last_name,
        full_name=student.full_name,
        branch_id=branch.id,
        branch_code=branch.code,
        branch_name=branch.name,
        class_section=cls.section_name if cls else None,
        year_of_study=cls.year_of_study if cls else None,
        academic_year=year.name if year else None,
        date_of_birth=student.date_of_birth,
        gender=student.gender,
        phone=student.phone,
        email=student.email,
        address=student.address,
        guardian_name=student.guardian_name,
        admission_date=student.admission_date,
        is_active=student.is_active,
        attendance=attendance_summary(db, student_id),
        published_results=_published_results(db, student_id),
        fee=_fee_summary(db, student_id),
    )


@router.get(
    "/students/{student_id}/attendance",
    response_model=AttendanceSummary,
    summary="[demo] Read-only attendance summary",
)
def student_attendance(
    student_id: int,
    db: Session = Depends(get_db),
) -> AttendanceSummary:
    _require_demo()
    _require_student(db, student_id)
    return AttendanceSummary(**attendance_summary(db, student_id))


@router.get(
    "/students/{student_id}/attendance/history",
    response_model=list[AttendanceHistoryEntry],
    summary="[demo] Read-only attendance history (submitted sessions)",
)
def student_attendance_history(
    student_id: int,
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[AttendanceHistoryEntry]:
    _require_demo()
    _require_student(db, student_id)
    return [
        AttendanceHistoryEntry(**row)
        for row in attendance_history(db, student_id, limit)
    ]


@router.get(
    "/students/{student_id}/results",
    response_model=list[ResultSummary],
    summary="[demo] Read-only PUBLISHED results (drafts excluded)",
)
def student_results(
    student_id: int,
    db: Session = Depends(get_db),
) -> list[ResultSummary]:
    _require_demo()
    _require_student(db, student_id)
    from app.api.v1.students import _published_results

    return _published_results(db, student_id)


@router.get(
    "/students/{student_id}/fees",
    response_model=StudentFeesOut,
    summary="[demo] Read-only fee detail (obligations + payment history)",
)
def student_fees(
    student_id: int,
    db: Session = Depends(get_db),
) -> StudentFeesOut:
    _require_demo()
    _require_student(db, student_id)
    return fee_service.public_student_fees(db, student_id)


@router.get(
    "/announcements",
    response_model=AnnouncementPage,
    summary="[demo] Published announcements for parents / everyone",
)
def announcements(
    page: int = Query(1, ge=1),
    page_size: int = Query(6, ge=1, le=50),
    db: Session = Depends(get_db),
) -> AnnouncementPage:
    _require_demo()
    query = db.query(Announcement).filter(
        Announcement.is_published.is_(True),
        Announcement.audience.in_(["parents", "all"]),
    )
    total = query.with_entities(func.count(Announcement.id)).scalar() or 0
    rows = (
        query.order_by(
            Announcement.published_at.is_(None),
            Announcement.published_at.desc(),
            Announcement.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return AnnouncementPage(
        items=[
            AnnouncementOut(
                id=row.id,
                title=row.title,
                body=row.body,
                audience=row.audience,
                is_published=row.is_published,
                published_at=row.published_at,
                # Author is staff-only information — never exposed here.
                created_by_name=None,
            )
            for row in rows
        ],
        page=page,
        page_size=page_size,
        total=total,
        pages=(total + page_size - 1) // page_size,
    )


__all__ = ["router"]
