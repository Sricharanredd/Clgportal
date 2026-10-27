"""Attendance business rules.

Validations enforced here (PRD §9):
- Only faculty ASSIGNED to the class may create/mark/submit its sessions.
- Only actively ENROLLED students can be marked; unknown ids are rejected.
- Submitted sessions are immutable without `attendance:correct`.
- Duplicate (session, student) rows are prevented by a DB unique constraint
  and by upsert-style save logic.
- Future dates are rejected.
"""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.academic import Branch, ClassSection, FacultyAssignment, Subject
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.student import Enrollment, Student
from app.permissions.deps import AuthContext
from app.schemas.attendance import (
    RosterStudent,
    SaveRecordsResponse,
    SessionDetail,
    SessionSummary,
    SubmitResponse,
)

APPROVED_STATUSES = frozenset({"present", "absent", "late", "excused", "on_duty"})


def _class_label(db: Session, class_id: int) -> tuple[str, str]:
    """(label like 'MPC-I-A', branch_code); raises 404 when unknown."""
    row = (
        db.query(ClassSection, Branch)
        .join(Branch, Branch.id == ClassSection.branch_id)
        .filter(ClassSection.id == class_id)
        .first()
    )
    if not row:
        raise AppError(404, "NOT_FOUND", "Class not found.")
    return f"{row[1].code}-{row[0].section_name}", row[1].code


def ensure_faculty_may_manage(db: Session, ctx: AuthContext, class_id: int) -> None:
    """Record-level rule: caller must have an assignment to this class.

    Staff with `attendance:correct` (principal/admin corrections) bypass
    the assignment requirement but still only touch assigned/any classes
    as their permission set allows."""
    if "attendance:correct" in ctx.permissions:
        return
    if ctx.class_scope is None:
        raise AppError(403, "FORBIDDEN", "You are not assigned to this class.")
    if class_id not in ctx.class_scope:
        raise AppError(403, "FORBIDDEN", "You are not assigned to this class.")


def _roster(db: Session, class_id: int) -> list[Student]:
    return (
        db.query(Student)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .filter(
            Enrollment.class_section_id == class_id,
            Enrollment.status == "active",
            Student.is_active.is_(True),
        )
        .order_by(Student.roll_number)
        .all()
    )


def _session_for(db: Session, class_id: int, day: date) -> AttendanceSession | None:
    return (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.class_section_id == class_id,
            AttendanceSession.attendance_date == day,
        )
        .first()
    )


def list_sessions(
    db: Session,
    *,
    day: date | None,
    branch_id: int | None,
    class_id: int | None,
    ctx: AuthContext,
) -> list[SessionSummary]:
    """Scope-filtered session list with per-session counts."""
    q = (
        db.query(AttendanceSession, ClassSection, Branch)
        .join(ClassSection, ClassSection.id == AttendanceSession.class_section_id)
        .join(Branch, Branch.id == ClassSection.branch_id)
    )
    if day:
        q = q.filter(AttendanceSession.attendance_date == day)
    if branch_id:
        q = q.filter(ClassSection.branch_id == branch_id)
    if class_id:
        q = q.filter(AttendanceSession.class_section_id == class_id)
    if ctx.class_scope is not None:
        if not ctx.class_scope:
            return []
        q = q.filter(AttendanceSession.class_section_id.in_(list(ctx.class_scope)))
    if ctx.branch_scope is not None:
        q = q.filter(ClassSection.branch_id.in_(list(ctx.branch_scope)))

    rows = q.order_by(AttendanceSession.attendance_date.desc(), ClassSection.id).all()

    out: list[SessionSummary] = []
    for session, cls, branch in rows:
        counts = _counts(db, session.id)
        label, _ = _class_label(db, session.class_section_id)
        out.append(
            SessionSummary(
                id=session.id,
                class_section_id=session.class_section_id,
                class_label=label,
                branch_code=branch.code,
                subject=None,
                attendance_date=session.attendance_date,
                status=session.status,
                present=counts["present"],
                absent=counts["absent"],
                marked=counts["marked"],
                roster_size=counts["roster"],
                submitted_at=session.submitted_at,
            )
        )
    return out


def _counts(db: Session, session_id: int) -> dict:
    by_status = dict(
        db.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
        .filter(AttendanceRecord.session_id == session_id)
        .group_by(AttendanceRecord.status)
        .all()
    )
    marked = sum(by_status.values())
    return {
        "present": by_status.get("present", 0) + by_status.get("late", 0),
        "absent": by_status.get("absent", 0),
        "marked": int(marked),
        "roster": 0,  # filled by caller when needed
        "breakdown": by_status,
    }


def get_session_detail(
    db: Session, class_id: int, day: date, ctx: AuthContext
) -> SessionDetail:
    """Roster + existing marks for a class on a date (creates nothing)."""
    ensure_faculty_may_manage(db, ctx, class_id)
    if day > date.today():
        raise AppError(400, "FUTURE_DATE", "Attendance cannot be marked for a future date.")

    label, _ = _class_label(db, class_id)
    roster_students = _roster(db, class_id)
    session = _session_for(db, class_id, day)

    records: dict[int, AttendanceRecord] = {}
    if session:
        for r in db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session.id):
            records[r.student_id] = r

    roster = [
        RosterStudent(
            student_id=s.id,
            roll_number=s.roll_number,
            full_name=s.full_name,
            status=records[s.id].status if s.id in records else None,
            remarks=records[s.id].remarks if s.id in records else None,
        )
        for s in roster_students
    ]
    marked = sum(1 for r in roster if r.status is not None)
    present = sum(1 for r in roster if r.status in ("present", "late"))
    absent = sum(1 for r in roster if r.status == "absent")

    return SessionDetail(
        id=session.id if session else None,
        class_section_id=class_id,
        class_label=label,
        attendance_date=day,
        status=session.status if session else "not_started",
        submitted_at=session.submitted_at if session else None,
        roster=roster,
        summary={
            "roster_size": len(roster),
            "marked": marked,
            "unmarked": len(roster) - marked,
            "present": present,
            "absent": absent,
        },
    )


def _get_or_create_session(
    db: Session, class_id: int, day: date, ctx: AuthContext
) -> AttendanceSession:
    session = _session_for(db, class_id, day)
    if session is not None:
        if session.status == "submitted" and "attendance:correct" not in ctx.permissions:
            raise AppError(
                409,
                "SESSION_SUBMITTED",
                "Attendance is already submitted. Corrections require authorization.",
            )
        return session
    session = AttendanceSession(
        class_section_id=class_id,
        attendance_date=day,
        status="draft",
        created_by=ctx.user_id,
    )
    db.add(session)
    db.flush()
    return session


def save_records(
    db: Session,
    *,
    class_id: int,
    day: date,
    records: list[dict],
    ctx: AuthContext,
) -> SaveRecordsResponse:
    """Upsert marks into a draft session (validated against the roster)."""
    ensure_faculty_may_manage(db, ctx, class_id)
    if day > date.today():
        raise AppError(400, "FUTURE_DATE", "Attendance cannot be marked for a future date.")

    roster_ids = {s.id for s in _roster(db, class_id)}
    seen: set[int] = set()
    for rec in records:
        sid = rec["student_id"]
        if rec["status"] not in APPROVED_STATUSES:
            raise AppError(400, "INVALID_STATUS", f"Unsupported attendance status: {rec['status']}")
        if sid not in roster_ids:
            # enrolment rule: unknown / not-in-class students are rejected
            raise AppError(
                422,
                "NOT_ENROLLED",
                f"Student {sid} is not enrolled in this class.",
            )
        if sid in seen:
            raise AppError(409, "DUPLICATE_RECORD", f"Duplicate entry for student {sid}.")
        seen.add(sid)

    session = _get_or_create_session(db, class_id, day, ctx)

    existing = {
        r.student_id: r
        for r in db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session.id)
    }
    saved = 0
    for rec in records:
        row = existing.get(rec["student_id"])
        if row is None:
            db.add(
                AttendanceRecord(
                    session_id=session.id,
                    student_id=rec["student_id"],
                    status=rec["status"],
                    marked_by=ctx.user_id,
                    remarks=rec.get("remarks"),
                )
            )
            saved += 1
        else:
            if (
                session.status == "submitted"
                and "attendance:correct" not in ctx.permissions
            ):
                raise AppError(
                    409,
                    "SESSION_SUBMITTED",
                    "Attendance is already submitted.",
                )
            row.status = rec["status"]
            row.marked_by = ctx.user_id
            row.remarks = rec.get("remarks")
            saved += 1
    db.commit()

    roster_size = len(roster_ids)
    marked = (
        db.query(func.count(AttendanceRecord.id))
        .filter(AttendanceRecord.session_id == session.id)
        .scalar()
        or 0
    )
    return SaveRecordsResponse(
        saved=saved,
        status=session.status,
        marked=int(marked),
        roster_size=roster_size,
    )


def submit_session(
    db: Session, *, class_id: int, day: date, ctx: AuthContext
) -> SubmitResponse:
    """Finalize: every roster student must be marked first."""
    ensure_faculty_may_manage(db, ctx, class_id)
    session = _session_for(db, class_id, day)
    roster_size = len(_roster(db, class_id))
    if roster_size == 0:
        raise AppError(422, "EMPTY_ROSTER", "This class has no enrolled students.")
    if session is None:
        # Nothing saved yet ⇒ nothing marked: submitting is incomplete, not missing.
        raise AppError(
            409,
            "INCOMPLETE",
            f"Mark all students before submitting (0/{roster_size} marked).",
        )
    if session.status == "submitted":
        raise AppError(409, "ALREADY_SUBMITTED", "Attendance is already submitted.")

    marked = (
        db.query(func.count(AttendanceRecord.id))
        .filter(AttendanceRecord.session_id == session.id)
        .scalar()
        or 0
    )
    if int(marked) < roster_size:
        raise AppError(
            409,
            "INCOMPLETE",
            f"Mark all students before submitting ({marked}/{roster_size} marked).",
        )

    session.status = "submitted"
    session.submitted_by = ctx.user_id
    session.submitted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return SubmitResponse(
        id=session.id,
        status=session.status,
        submitted_at=session.submitted_at,
        marked=int(marked),
        roster_size=roster_size,
    )


__all__ = [
    "list_sessions",
    "get_session_detail",
    "save_records",
    "submit_session",
    "ensure_faculty_may_manage",
    "APPROVED_STATUSES",
]
