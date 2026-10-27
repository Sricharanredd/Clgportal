"""Student queries (read-side repository).

All list queries are paginated and filter server-side; faculty callers
are restricted to their assigned classes by joining enrolments.
"""
from __future__ import annotations

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.academic import AcademicYear, Branch, ClassSection
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.student import Enrollment, Student

from app.permissions.deps import AuthContext


def search_students(
    db: Session,
    *,
    branch_id: int | None,
    roll: str | None,
    name: str | None,
    page: int,
    page_size: int,
    ctx: AuthContext,
    current_year_only: bool = True,
) -> tuple[list[tuple[Student, Branch, ClassSection | None, AcademicYear | None]], int]:
    """Paginated search. Returns (rows, total). Applies faculty scope."""
    q = (
        db.query(Student, Branch, ClassSection, AcademicYear)
        .join(Branch, Branch.id == Student.branch_id)
        .outerjoin(
            Enrollment,
            (Enrollment.student_id == Student.id) & (Enrollment.status == "active"),
        )
        .outerjoin(ClassSection, ClassSection.id == Enrollment.class_section_id)
        .outerjoin(AcademicYear, AcademicYear.id == Enrollment.academic_year_id)
        .filter(Student.is_active.is_(True))
    )
    if current_year_only:
        q = q.filter(or_(AcademicYear.id.is_(None), AcademicYear.is_current.is_(True)))

    # --- server-side filters ---
    if branch_id:
        q = q.filter(Student.branch_id == branch_id)
    if roll:
        q = q.filter(Student.roll_number.ilike(f"%{roll.strip()}%"))
    if name:
        pattern = f"%{name.strip()}%"
        q = q.filter(
            or_(
                Student.first_name.ilike(pattern),
                Student.last_name.ilike(pattern),
                func.concat(Student.first_name, " ", Student.last_name).ilike(pattern),
            )
        )

    # --- record-level scope (faculty: assigned classes/branches only) ---
    if ctx.class_scope is not None:
        if not ctx.class_scope:
            return [], 0
        q = q.filter(Enrollment.class_section_id.in_(list(ctx.class_scope)))
    if ctx.branch_scope is not None:
        if not ctx.branch_scope:
            return [], 0
        q = q.filter(Student.branch_id.in_(list(ctx.branch_scope)))
        if branch_id and branch_id not in ctx.branch_scope:
            return [], 0

    total = q.with_entities(func.count(func.distinct(Student.id))).scalar() or 0
    rows = (
        q.with_entities(Student, Branch, ClassSection, AcademicYear)
        .order_by(Student.roll_number)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return rows, int(total)


def get_student_profile_parts(
    db: Session, student_id: int
) -> tuple[Student, Branch, ClassSection | None, AcademicYear | None] | None:
    """Single student with active enrolment + branch."""
    row = (
        db.query(Student, Branch, ClassSection, AcademicYear)
        .join(Branch, Branch.id == Student.branch_id)
        .outerjoin(
            Enrollment,
            (Enrollment.student_id == Student.id) & (Enrollment.status == "active"),
        )
        .outerjoin(ClassSection, ClassSection.id == Enrollment.class_section_id)
        .outerjoin(AcademicYear, AcademicYear.id == Enrollment.academic_year_id)
        .filter(Student.id == student_id, Student.is_active.is_(True))
        .first()
    )
    return row


def attendance_summary(db: Session, student_id: int) -> dict:
    """Attendance totals across submitted sessions only."""
    total = (
        db.query(func.count(AttendanceRecord.id))
        .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
        .filter(
            AttendanceRecord.student_id == student_id,
            AttendanceSession.status == "submitted",
        )
        .scalar()
        or 0
    )
    by_status: dict[str, int] = dict(
        db.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
        .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
        .filter(
            AttendanceRecord.student_id == student_id,
            AttendanceSession.status == "submitted",
        )
        .group_by(AttendanceRecord.status)
        .all()
    )
    present = by_status.get("present", 0) + by_status.get("late", 0)
    pct = round((present / total * 100), 1) if total else 0.0
    return {
        "total_sessions": total,
        "present": by_status.get("present", 0),
        "absent": by_status.get("absent", 0),
        "late": by_status.get("late", 0),
        "attendance_pct": pct,
    }


__all__ = ["search_students", "get_student_profile_parts", "attendance_summary"]
