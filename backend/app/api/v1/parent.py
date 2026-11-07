"""Parent & student portal read-only endpoints.

Public read-only endpoints allowing direct dashboard navigation.
All endpoints are strictly GET-only and non-destructive.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.models.content import Announcement
from app.models.user import User
from app.schemas.announcements import AnnouncementOut, AnnouncementPage
from app.schemas.fees import StudentFeesOut
from app.schemas.parent import AttendanceHistoryEntry, ParentChildSummary
from app.schemas.students import (
    AttendanceSummary,
    FeeSummary,
    ResultSummary,
    StudentProfile,
)
from app.services import parent_service as svc

router = APIRouter()


@router.get(
    "/children",
    response_model=list[ParentChildSummary],
    summary="Active students list for direct dashboard navigation",
)
def children(
    db: Session = Depends(get_db),
) -> list[ParentChildSummary]:
    return svc.list_all_students(db)


@router.get(
    "/students/{student_id}/profile",
    response_model=StudentProfile,
    summary="Read-only student profile",
    responses={404: {"description": "Student record not found"}},
)
def student_profile(
    student_id: int,
    db: Session = Depends(get_db),
) -> StudentProfile:
    from app.api.v1.students import _fee_summary, _published_results
    from app.repositories.students import attendance_summary, get_student_profile_parts

    parts = get_student_profile_parts(db, student_id)
    if parts is None:
        raise AppError(404, "NOT_FOUND", "Student record not found.")
    student, branch, cls, year = parts

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
        guardian_name=student.guardian_name,
        is_active=student.is_active,
        attendance=attendance_summary(db, student_id),
        published_results=_published_results(db, student_id),
        fee=_fee_summary(db, student_id),
    )


@router.get(
    "/students/{student_id}/attendance",
    response_model=AttendanceSummary,
    summary="Read-only attendance summary",
)
def student_attendance(
    student_id: int,
    db: Session = Depends(get_db),
) -> AttendanceSummary:
    from app.repositories.students import attendance_summary

    return attendance_summary(db, student_id)


@router.get(
    "/students/{student_id}/attendance/history",
    response_model=list[AttendanceHistoryEntry],
    summary="Read-only attendance history by date",
)
def student_attendance_history(
    student_id: int,
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[AttendanceHistoryEntry]:
    from app.repositories.students import attendance_history

    return attendance_history(db, student_id, limit)


@router.get(
    "/students/{student_id}/results",
    response_model=list[ResultSummary],
    summary="Read-only published examination results",
)
def student_results(
    student_id: int,
    db: Session = Depends(get_db),
) -> list[ResultSummary]:
    from app.api.v1.students import _published_results

    return _published_results(db, student_id)


@router.get(
    "/students/{student_id}/fees",
    response_model=FeeSummary | None,
    summary="Read-only fee summary",
)
def student_fees(
    student_id: int,
    db: Session = Depends(get_db),
) -> FeeSummary | None:
    from app.api.v1.students import _fee_summary

    return _fee_summary(db, student_id)


@router.get(
    "/students/{student_id}/fee-detail",
    response_model=StudentFeesOut,
    summary="Read-only fee obligations and payments breakdown",
)
def student_fee_detail(
    student_id: int,
    db: Session = Depends(get_db),
) -> StudentFeesOut:
    from app.services import fees as fee_service

    return fee_service.student_fees(db, student_id, ctx=None)


@router.get(
    "/announcements",
    response_model=AnnouncementPage,
    summary="Read-only announcements for students and parents",
)
def portal_announcements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    audience: str | None = None,
    db: Session = Depends(get_db),
) -> AnnouncementPage:
    from sqlalchemy import func

    q = db.query(Announcement).filter(Announcement.is_published.is_(True))
    if audience:
        q = q.filter(Announcement.audience.in_([audience, "all"]))
    else:
        q = q.filter(Announcement.audience.in_(["parents", "all"]))

    total = q.with_entities(func.count(Announcement.id)).scalar() or 0
    rows = (
        q.order_by(
            Announcement.published_at.is_(None),
            Announcement.published_at.desc(),
            Announcement.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    creator_ids = {r.created_by for r in rows}
    creators = (
        {u.id: u.full_name for u in db.query(User).filter(User.id.in_(creator_ids))}
        if creator_ids
        else {}
    )
    items = [
        AnnouncementOut(
            id=r.id,
            title=r.title,
            body=r.body,
            audience=r.audience,
            is_published=r.is_published,
            published_at=r.published_at,
            created_by_name=creators.get(r.created_by),
        )
        for r in rows
    ]
    return AnnouncementPage(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
    )


__all__ = ["router"]
