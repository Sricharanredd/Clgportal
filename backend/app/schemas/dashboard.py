"""Dashboard response schemas — one model per role dashboard."""
import datetime as dt
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BranchAttendance(BaseModel):
    branch_code: str
    branch_name: str
    sessions: int = 0
    present: int = 0
    total_records: int = 0
    attendance_pct: float = 0.0


class MonthlyCollection(BaseModel):
    month: str  # YYYY-MM
    amount: Decimal = Decimal("0.00")
    count: int = 0


class RecentActivity(BaseModel):
    id: int
    action: str
    summary: str
    actor: str | None = None
    created_at: datetime


class AnnouncementItem(BaseModel):
    id: int
    title: str
    body: str
    audience: str
    published_at: datetime | None = None


class PrincipalDashboard(BaseModel):
    total_students: int
    total_faculty: int
    today_attendance_pct: float
    today_sessions: int
    fees_collected: Decimal
    fees_outstanding: Decimal
    fee_payers: int
    branch_attendance: list[BranchAttendance] = Field(default_factory=list)
    monthly_collections: list[MonthlyCollection] = Field(default_factory=list)
    recent_activity: list[RecentActivity] = Field(default_factory=list)
    announcements: list[AnnouncementItem] = Field(default_factory=list)
    academic_year: str | None = None
    generated_at: datetime


class AccountsDashboard(BaseModel):
    total_collected: Decimal
    total_outstanding: Decimal
    today_collections: Decimal
    today_payment_count: int
    student_count_with_obligations: int
    fully_cleared: int
    recent_payments: list[dict] = Field(default_factory=list)  # PaymentRow DTOs
    recent_audit: list[dict] = Field(default_factory=list)
    monthly_collections: list[MonthlyCollection] = Field(default_factory=list)
    generated_at: datetime


class FacultyTask(BaseModel):
    class_section_id: int
    class_label: str
    subject: str | None = None
    status: str
    date: dt.date | None = None  # dt.* avoids the field-name shadowing 'date'


class PendingResultTask(BaseModel):
    examination_id: int
    title: str
    class_label: str
    subject: str
    entered: int = 0
    expected: int = 0
    status: str


class FacultyDashboard(BaseModel):
    assigned_branches: list[str] = Field(default_factory=list)
    assigned_classes: list[str] = Field(default_factory=list)
    assigned_subjects: list[str] = Field(default_factory=list)
    today_sessions: list[FacultyTask] = Field(default_factory=list)
    attendance_completed_today: int = 0
    attendance_pending_today: int = 0
    pending_results: list[PendingResultTask] = Field(default_factory=list)
    recent_attendance: list[RecentActivity] = Field(default_factory=list)
    announcements: list[AnnouncementItem] = Field(default_factory=list)
    generated_at: datetime


class AdminDashboard(BaseModel):
    total_students: int
    total_staff: int
    active_staff: int
    branch_count: int
    class_count: int
    academic_year: str | None = None
    branch_summaries: list[dict] = Field(default_factory=list)
    recent_activity: list[RecentActivity] = Field(default_factory=list)
    announcements: list[AnnouncementItem] = Field(default_factory=list)
    generated_at: datetime


__all__ = [
    "PrincipalDashboard",
    "AccountsDashboard",
    "FacultyDashboard",
    "AdminDashboard",
    "BranchAttendance",
    "MonthlyCollection",
    "RecentActivity",
    "AnnouncementItem",
    "FacultyTask",
    "PendingResultTask",
]
