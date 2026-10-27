"""ORM model registry. Importing this package registers every table on
Base.metadata (used by Alembic autogenerate and tests)."""
from app.models.academic import (
    AcademicYear,
    Branch,
    ClassSection,
    FacultyAssignment,
    FacultyProfile,
    Subject,
)
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.content import ActivityLog, Announcement, TimetableEntry
from app.models.exam import ExamResult, Examination
from app.models.fee import FeeAuditLog, FeeStructure, Payment, StudentFeeObligation
from app.models.student import Enrollment, Parent, Student, StudentParentLink
from app.models.user import RefreshToken, Role, RolePermission, User, UserRole

__all__ = [
    "AcademicYear",
    "ActivityLog",
    "Announcement",
    "AttendanceRecord",
    "AttendanceSession",
    "Branch",
    "ClassSection",
    "Enrollment",
    "ExamResult",
    "Examination",
    "FacultyAssignment",
    "FacultyProfile",
    "FeeAuditLog",
    "FeeStructure",
    "Parent",
    "Payment",
    "RefreshToken",
    "Role",
    "RolePermission",
    "Student",
    "StudentFeeObligation",
    "StudentParentLink",
    "Subject",
    "TimetableEntry",
    "User",
    "UserRole",
]
