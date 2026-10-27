"""Shared enumerations used across models, schemas and permissions.

String values are persisted to MySQL (VARCHAR columns) so enum renaming
stays migration-driven instead of relying on MySQL ENUM internals.
"""
import enum


class RoleName(str, enum.Enum):
    PRINCIPAL = "principal"
    ADMINISTRATOR = "administrator"
    ACCOUNTS = "accounts"
    FACULTY = "faculty"
    PARENT = "parent"
    STUDENT = "student"


class Permission(str, enum.Enum):
    # Dashboards
    DASHBOARD_PRINCIPAL = "dashboard:principal"
    DASHBOARD_ADMIN = "dashboard:admin"
    DASHBOARD_ACCOUNTS = "dashboard:accounts"
    DASHBOARD_FACULTY = "dashboard:faculty"
    # Students
    STUDENTS_READ = "students:read"
    STUDENTS_WRITE = "students:write"
    # Attendance
    ATTENDANCE_READ = "attendance:read"
    ATTENDANCE_WRITE = "attendance:write"
    ATTENDANCE_CORRECT = "attendance:correct"
    # Results
    RESULTS_READ = "results:read"
    RESULTS_WRITE = "results:write"
    RESULTS_PUBLISH = "results:publish"
    # Fees
    FEES_READ = "fees:read"
    PAYMENTS_READ = "payments:read"
    PAYMENTS_WRITE = "payments:write"
    FEES_AUDIT_READ = "fees:audit:read"
    # Administration
    STAFF_READ = "staff:read"
    STAFF_WRITE = "staff:write"
    CONFIG_WRITE = "config:write"
    # Content
    ANNOUNCEMENTS_READ = "announcements:read"
    ANNOUNCEMENTS_WRITE = "announcements:write"
    # Parent/student read-only views
    PROFILE_READ_OWN = "profile:read_own"
    ATTENDANCE_READ_OWN = "attendance:read_own"
    RESULTS_READ_OWN = "results:read_own"
    FEES_READ_OWN = "fees:read_own"


# Permission vocabulary exported to the frontend nav (API returns effective set).
ALL_PERMISSIONS: frozenset[str] = frozenset(p.value for p in Permission)

# Default permission grants per staff role (configured in DB, seeded here).
ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    # NOTE: principal gets CORRECTION/PUBLICATION rights only — not routine
    # entry (`attendance:write` / `results:write` stay with faculty), per
    # PRD §3.1: management access must not automatically grant the ability
    # to alter every record.
    RoleName.PRINCIPAL.value: frozenset(
        {
            Permission.DASHBOARD_PRINCIPAL.value,
            Permission.STUDENTS_READ.value,
            Permission.ATTENDANCE_READ.value,
            Permission.ATTENDANCE_CORRECT.value,
            Permission.RESULTS_READ.value,
            Permission.RESULTS_PUBLISH.value,
            Permission.FEES_READ.value,
            Permission.PAYMENTS_READ.value,
            Permission.FEES_AUDIT_READ.value,
            Permission.STAFF_READ.value,
            Permission.ANNOUNCEMENTS_READ.value,
            Permission.ANNOUNCEMENTS_WRITE.value,
        }
    ),
    RoleName.ADMINISTRATOR.value: frozenset(
        {
            Permission.DASHBOARD_ADMIN.value,
            Permission.STUDENTS_READ.value,
            Permission.STUDENTS_WRITE.value,
            Permission.STAFF_READ.value,
            Permission.STAFF_WRITE.value,
            Permission.CONFIG_WRITE.value,
            Permission.ANNOUNCEMENTS_READ.value,
            Permission.ANNOUNCEMENTS_WRITE.value,
            Permission.ATTENDANCE_READ.value,
            Permission.RESULTS_READ.value,
        }
    ),
    RoleName.ACCOUNTS.value: frozenset(
        {
            Permission.DASHBOARD_ACCOUNTS.value,
            Permission.STUDENTS_READ.value,
            Permission.FEES_READ.value,
            Permission.PAYMENTS_READ.value,
            Permission.PAYMENTS_WRITE.value,
            Permission.FEES_AUDIT_READ.value,
            Permission.ANNOUNCEMENTS_READ.value,
        }
    ),
    RoleName.FACULTY.value: frozenset(
        {
            Permission.DASHBOARD_FACULTY.value,
            Permission.STUDENTS_READ.value,
            Permission.ATTENDANCE_READ.value,
            Permission.ATTENDANCE_WRITE.value,
            Permission.RESULTS_READ.value,
            Permission.RESULTS_WRITE.value,
            Permission.ANNOUNCEMENTS_READ.value,
        }
    ),
    # Read-only principals (parent verification / student session).
    RoleName.PARENT.value: frozenset(
        {
            Permission.PROFILE_READ_OWN.value,
            Permission.ATTENDANCE_READ_OWN.value,
            Permission.RESULTS_READ_OWN.value,
            Permission.FEES_READ_OWN.value,
            Permission.ANNOUNCEMENTS_READ.value,
        }
    ),
    RoleName.STUDENT.value: frozenset(
        {
            Permission.PROFILE_READ_OWN.value,
            Permission.ATTENDANCE_READ_OWN.value,
            Permission.RESULTS_READ_OWN.value,
            Permission.FEES_READ_OWN.value,
            Permission.ANNOUNCEMENTS_READ.value,
        }
    ),
}


class AssignmentType(str, enum.Enum):
    CLASS_TEACHER = "class_teacher"
    SUBJECT_TEACHER = "subject_teacher"


class EnrollmentStatus(str, enum.Enum):
    ACTIVE = "active"
    PROMOTED = "promoted"
    LEFT = "left"
    SUSPENDED = "suspended"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"
    ON_DUTY = "on_duty"


class SessionStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"


class ResultStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CHEQUE = "cheque"
    CARD = "card"


class PaymentStatus(str, enum.Enum):
    COMPLETED = "completed"
    REVERSED = "reversed"


class FeeOperation(str, enum.Enum):
    PAYMENT_RECORDED = "payment_recorded"
    REVERSAL_RECORDED = "reversal_recorded"
    ADJUSTMENT_RECORDED = "adjustment_recorded"
    OBLIGATION_UPDATED = "obligation_updated"


class AnnouncementAudience(str, enum.Enum):
    ALL = "all"
    STAFF = "staff"
    FACULTY = "faculty"
    PARENTS = "parents"
    STUDENTS = "students"


__all__ = [n for n in dir() if not n.startswith("_")]
