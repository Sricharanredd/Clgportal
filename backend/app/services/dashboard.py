"""Dashboard metrics — all figures computed here, never in the frontend.

Consistency rules:
- Attendance = submitted sessions within the current academic year.
- Fees = student_fee_obligations joined to the current academic year.
- Faculty metrics are filtered by the caller's assignment scope.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.academic import AcademicYear, Branch, ClassSection, FacultyAssignment, Subject
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.content import ActivityLog, Announcement
from app.models.fee import FeeAuditLog, Payment, StudentFeeObligation
from app.models.student import Enrollment, Student
from app.models.user import User, UserRole
from app.permissions.deps import AuthContext
from app.schemas.dashboard import (
    AccountsDashboard,
    AdminDashboard,
    AnnouncementItem,
    BranchAttendance,
    FacultyDashboard,
    FacultyTask,
    MonthlyCollection,
    PendingResultTask,
    PrincipalDashboard,
    RecentActivity,
)


def _current_year(db: Session) -> AcademicYear | None:
    return (
        db.query(AcademicYear)
        .filter(AcademicYear.is_current.is_(True), AcademicYear.is_active.is_(True))
        .first()
    )


def _announcements(db: Session, audience: str | None = None, limit: int = 4) -> list[AnnouncementItem]:
    q = (
        db.query(Announcement)
        .filter(Announcement.is_published.is_(True))
        # MySQL has no NULLS LAST: sort nulls explicitly, then newest first
        .order_by(
            Announcement.published_at.is_(None),
            Announcement.published_at.desc(),
            Announcement.id.desc(),
        )
    )
    if audience:
        q = q.filter(or_(Announcement.audience == audience, Announcement.audience == "all"))
    return [
        AnnouncementItem(
            id=a.id,
            title=a.title,
            body=a.body,
            audience=a.audience,
            published_at=a.published_at,
        )
        for a in q.limit(limit).all()
    ]


def _recent_activity(db: Session, limit: int = 6) -> list[RecentActivity]:
    rows = (
        db.query(ActivityLog, User)
        .outerjoin(User, User.id == ActivityLog.actor_user_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        RecentActivity(
            id=log.id,
            action=log.action,
            summary=log.summary,
            actor=user.full_name if user else None,
            created_at=log.created_at,
        )
        for log, user in rows
    ]


def _fee_totals(db: Session, year_id: int | None) -> tuple[Decimal, Decimal, int, int]:
    """(collected, outstanding, payers, fully_cleared) for the year."""
    q = db.query(
        func.coalesce(func.sum(StudentFeeObligation.total_amount), 0),
        func.coalesce(func.sum(StudentFeeObligation.paid_amount), 0),
        func.count(StudentFeeObligation.id),
    )
    cleared_q = db.query(func.count(StudentFeeObligation.id))
    if year_id:
        q = q.filter(StudentFeeObligation.academic_year_id == year_id)
        cleared_q = cleared_q.filter(StudentFeeObligation.academic_year_id == year_id)
    total, paid, count = q.one()
    total, paid = Decimal(str(total)), Decimal(str(paid))
    cleared = cleared_q.filter(StudentFeeObligation.status == "cleared").scalar() or 0
    return total, paid, int(count), int(cleared)


def _monthly_collections(db: Session, months: int = 6) -> list[MonthlyCollection]:
    """Payment totals per month for the chart (recent N months)."""
    start = (date.today().replace(day=1) - timedelta(days=1)).replace(day=1)
    cursor = start
    month_keys: list[str] = []
    for _ in range(months):
        month_keys.append(cursor.strftime("%Y-%m"))
        cursor = (cursor.replace(day=1) - timedelta(days=1)).replace(day=1)
    month_keys.reverse()
    first = datetime.strptime(f"{month_keys[0]}-01", "%Y-%m-%d")

    rows = (
        db.query(
            func.date_format(Payment.paid_at, "%Y-%m"),
            func.coalesce(func.sum(Payment.amount), 0),
            func.count(Payment.id),
        )
        .filter(Payment.paid_at >= first, Payment.status == "completed")
        .group_by(func.date_format(Payment.paid_at, "%Y-%m"))
        .all()
    )
    lookup = {m: (Decimal(str(a)), int(c)) for m, a, c in rows}
    return [
        MonthlyCollection(
            month=k,
            amount=lookup.get(k, (Decimal("0.00"), 0))[0],
            count=lookup.get(k, (Decimal("0.00"), 0))[1],
        )
        for k in month_keys
    ]


def _today_attendance(db: Session) -> tuple[float, int, list[BranchAttendance]]:
    """(overall_pct, sessions_today, per_branch breakdown) — submitted+draft."""
    today = date.today()
    per_branch: dict[str, BranchAttendance] = {}

    rows = (
        db.query(
            Branch.code,
            Branch.name,
            func.count(func.distinct(AttendanceSession.id)),
            func.count(AttendanceRecord.id),
            case_present(),
        )
        .select_from(AttendanceSession)
        .join(ClassSection, ClassSection.id == AttendanceSession.class_section_id)
        .join(Branch, Branch.id == ClassSection.branch_id)
        .outerjoin(
            AttendanceRecord, AttendanceRecord.session_id == AttendanceSession.id
        )
        .filter(AttendanceSession.attendance_date == today)
        .group_by(Branch.code, Branch.name)
        .all()
    )
    total_records = 0
    total_present = 0
    for code, name, sessions, records, present in rows:
        present = int(present or 0)
        records = int(records or 0)
        total_records += records
        total_present += present
        per_branch[code] = BranchAttendance(
            branch_code=code,
            branch_name=name,
            sessions=int(sessions),
            present=present,
            total_records=records,
            attendance_pct=round(present / records * 100, 1) if records else 0.0,
        )
    pct = round(total_present / total_records * 100, 1) if total_records else 0.0
    session_count = sum(b.sessions for b in per_branch.values())
    return pct, session_count, list(per_branch.values())


def case_present():
    """SQL SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END)."""
    from sqlalchemy import case

    return func.coalesce(
        func.sum(case((AttendanceRecord.status.in_(["present", "late"]), 1), else_=0)),
        0,
    )


def principal_dashboard(db: Session, ctx: AuthContext) -> PrincipalDashboard:
    year = _current_year(db)
    year_id = year.id if year else None

    total_students = (
        db.query(func.count(Student.id)).filter(Student.is_active.is_(True)).scalar() or 0
    )
    total_faculty = _count_role_users(db, "faculty")

    pct, sessions, branch_rows = _today_attendance(db)
    total_fee, paid_fee, payers, _cleared = _fee_totals(db, year_id)

    return PrincipalDashboard(
        total_students=int(total_students),
        total_faculty=int(total_faculty),
        today_attendance_pct=pct,
        today_sessions=sessions,
        fees_collected=paid_fee,
        fees_outstanding=total_fee - paid_fee,
        fee_payers=payers,
        branch_attendance=branch_rows,
        monthly_collections=_monthly_collections(db),
        recent_activity=_recent_activity(db),
        announcements=_announcements(db),
        academic_year=year.name if year else None,
        generated_at=datetime.now(),
    )


def _count_role_users(db: Session, role_name: str) -> int:
    """Distinct active users holding a role."""
    from app.models.user import Role

    return int(
        db.query(func.count(func.distinct(UserRole.user_id)))
        .join(Role, Role.id == UserRole.role_id)
        .join(User, User.id == UserRole.user_id)
        .filter(Role.name == role_name, User.is_active.is_(True))
        .scalar()
        or 0
    )


def accounts_dashboard(db: Session, ctx: AuthContext) -> AccountsDashboard:
    year = _current_year(db)
    year_id = year.id if year else None
    total_fee, paid_fee, payers, cleared = _fee_totals(db, year_id)

    today = date.today()
    today_agg = db.query(
        func.coalesce(func.sum(Payment.amount), 0), func.count(Payment.id)
    ).filter(
        func.date(Payment.paid_at) == today, Payment.status == "completed"
    ).one()

    # Recent payments with student names (nearly opaque table data)
    pay_rows = (
        db.query(Payment, Student)
        .join(Student, Student.id == Payment.student_id)
        .order_by(Payment.paid_at.desc())
        .limit(8)
        .all()
    )
    recent_payments = [
        {
            "id": p.id,
            "receipt_number": p.receipt_number,
            "amount": str(p.amount),
            "method": p.method,
            "status": p.status,
            "reference": p.reference,
            "paid_at": p.paid_at.isoformat(),
            "student": s.full_name,
            "roll_number": s.roll_number,
        }
        for p, s in pay_rows
    ]

    audit_rows = (
        db.query(FeeAuditLog, Student)
        .join(Student, Student.id == FeeAuditLog.student_id)
        .order_by(FeeAuditLog.created_at.desc())
        .limit(6)
        .all()
    )
    recent_audit = [
        {
            "id": a.id,
            "operation": a.operation,
            "amount": str(a.amount) if a.amount is not None else None,
            "previous_value": a.previous_value,
            "new_value": a.new_value,
            "reference": a.reference,
            "reason": a.reason,
            "created_at": a.created_at.isoformat(),
            "student": s.full_name,
            "roll_number": s.roll_number,
        }
        for a, s in audit_rows
    ]

    return AccountsDashboard(
        total_collected=paid_fee,
        total_outstanding=total_fee - paid_fee,
        today_collections=Decimal(str(today_agg[0])),
        today_payment_count=int(today_agg[1]),
        student_count_with_obligations=payers,
        fully_cleared=cleared,
        recent_payments=recent_payments,
        recent_audit=recent_audit,
        monthly_collections=_monthly_collections(db),
        generated_at=datetime.now(),
    )


def faculty_dashboard(db: Session, ctx: AuthContext) -> FacultyDashboard:
    """Only the caller's assigned classes/subjects appear here."""
    today = date.today()

    assignments = (
        db.query(FacultyAssignment, ClassSection, Subject, Branch)
        .join(ClassSection, ClassSection.id == FacultyAssignment.class_section_id)
        .join(Subject, Subject.id == FacultyAssignment.subject_id)
        .join(Branch, Branch.id == ClassSection.branch_id)
        .filter(FacultyAssignment.user_id == ctx.user_id)
        .all()
    )
    branches = sorted({b.code for _, _, _, b in assignments})
    classes = sorted(
        {f"{b.code}-{c.section_name}" for _, c, _, b in assignments}
    )
    subjects = sorted({f"{s.code} {s.name}" for _, _, s, _ in assignments})

    # --- today's attendance tasks for assigned classes ---
    class_ids = [c.id for _, c, _, _ in assignments]
    tasks: list[FacultyTask] = []
    completed = 0
    pending = 0
    if class_ids:
        sessions_today = (
            db.query(AttendanceSession)
            .filter(
                AttendanceSession.class_section_id.in_(class_ids),
                AttendanceSession.attendance_date == today,
            )
            .all()
        )
        seen: set[int] = set()
        for s in sessions_today:
            seen.add(s.class_section_id)
            label = _class_label(db, s.class_section_id)
            if s.status == "submitted":
                completed += 1
            else:
                pending += 1
            tasks.append(
                FacultyTask(
                    class_section_id=s.class_section_id,
                    class_label=label,
                    status=s.status,
                    date=s.attendance_date,
                )
            )
        for cid in class_ids:
            if cid not in seen:
                pending += 1
                tasks.append(
                    FacultyTask(
                        class_section_id=cid,
                        class_label=_class_label(db, cid),
                        status="not_started",
                        date=today,
                    )
                )

    pending_results = _pending_result_tasks(db, ctx, class_ids)

    # recent attendance activity for assigned classes
    recent: list[RecentActivity] = []
    if class_ids:
        rows = (
            db.query(AttendanceSession, User)
            .join(User, User.id == AttendanceSession.created_by)
            .filter(AttendanceSession.class_section_id.in_(class_ids))
            .order_by(AttendanceSession.updated_at.desc())
            .limit(5)
            .all()
        )
        recent = [
            RecentActivity(
                id=s.id,
                action="attendance_" + s.status,
                summary=f"Attendance {s.status} for "
                f"{_class_label(db, s.class_section_id)} on {s.attendance_date}",
                actor=u.full_name if u else None,
                created_at=s.updated_at,
            )
            for s, u in rows
        ]

    return FacultyDashboard(
        assigned_branches=branches,
        assigned_classes=classes,
        assigned_subjects=subjects,
        today_sessions=tasks,
        attendance_completed_today=completed,
        attendance_pending_today=pending,
        pending_results=pending_results,
        recent_attendance=recent,
        announcements=_announcements(db, audience="faculty"),
        generated_at=datetime.now(),
    )


def _class_label(db: Session, class_id: int) -> str:
    row = (
        db.query(ClassSection, Branch)
        .join(Branch, Branch.id == ClassSection.branch_id)
        .filter(ClassSection.id == class_id)
        .first()
    )
    if not row:
        return f"class#{class_id}"
    return f"{row[1].code}-{row[0].section_name}"


def _pending_result_tasks(
    db: Session, ctx: AuthContext, class_ids: list[int]
) -> list[PendingResultTask]:
    """Draft exams in assigned classes with incomplete/pending entries."""
    from app.models.exam import ExamResult, Examination

    if not class_ids:
        return []
    subject_ids = (
        db.query(FacultyAssignment.subject_id)
        .filter(
            FacultyAssignment.user_id == ctx.user_id,
            FacultyAssignment.class_section_id.in_(class_ids),
        )
        .distinct()
        .all()
    )
    subject_set = [r[0] for r in subject_ids]
    if not subject_set:
        return []

    exams = (
        db.query(Examination)
        .filter(
            Examination.class_section_id.in_(class_ids),
            Examination.subject_id.in_(subject_set),
            Examination.status == "draft",
        )
        .order_by(
            Examination.exam_date.is_(None), Examination.exam_date.desc()
        )
        .all()
    )
    out: list[PendingResultTask] = []
    for exam in exams:
        expected = (
            db.query(func.count(Enrollment.id))
            .filter(
                Enrollment.class_section_id == exam.class_section_id,
                Enrollment.status == "active",
            )
            .scalar()
            or 0
        )
        entered = (
            db.query(func.count(ExamResult.id))
            .filter(ExamResult.examination_id == exam.id)
            .scalar()
            or 0
        )
        out.append(
            PendingResultTask(
                examination_id=exam.id,
                title=exam.title,
                class_label=_class_label(db, exam.class_section_id),
                subject=exam.subject.name if exam.subject else "",
                entered=int(entered),
                expected=int(expected),
                status="pending" if entered < expected else "complete",
            )
        )
    return out


def admin_dashboard(db: Session, ctx: AuthContext) -> AdminDashboard:
    year = _current_year(db)
    total_students = (
        db.query(func.count(Student.id)).filter(Student.is_active.is_(True)).scalar() or 0
    )
    branches = db.query(Branch).filter(Branch.is_active.is_(True)).order_by(Branch.display_order).all()
    staff_total = (
        db.query(func.count(func.distinct(UserRole.user_id)))
        .select_from(UserRole)
        .join(User, User.id == UserRole.user_id)
        .scalar()
        or 0
    )
    staff_active = (
        db.query(func.count(func.distinct(UserRole.user_id)))
        .select_from(UserRole)
        .join(User, User.id == UserRole.user_id)
        .filter(User.is_active.is_(True))
        .scalar()
        or 0
    )
    class_count = (
        db.query(func.count(ClassSection.id)).filter(ClassSection.is_active.is_(True)).scalar() or 0
    )

    summaries = []
    for b in branches:
        s_count = (
            db.query(func.count(Student.id))
            .filter(Student.branch_id == b.id, Student.is_active.is_(True))
            .scalar()
            or 0
        )
        c_count = (
            db.query(func.count(ClassSection.id))
            .filter(ClassSection.branch_id == b.id, ClassSection.is_active.is_(True))
            .scalar()
            or 0
        )
        summaries.append(
            {"branch_code": b.code, "branch_name": b.name, "students": int(s_count), "classes": int(c_count)}
        )

    return AdminDashboard(
        total_students=int(total_students),
        total_staff=int(staff_total),
        active_staff=int(staff_active),
        branch_count=len(branches),
        class_count=int(class_count),
        academic_year=year.name if year else None,
        branch_summaries=summaries,
        recent_activity=_recent_activity(db),
        announcements=_announcements(db),
        generated_at=datetime.now(),
    )


__all__ = [
    "principal_dashboard",
    "accounts_dashboard",
    "faculty_dashboard",
    "admin_dashboard",
]
