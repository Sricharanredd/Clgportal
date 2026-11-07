"""Parent & student portal read-only service.

Provides student records and details for direct dashboard navigation.
All operations are strictly read-only.
"""

from __future__ import annotations

from sqlalchemy.orm import Session


from app.models.academic import AcademicYear, Branch, ClassSection
from app.models.student import Enrollment, Student
from app.schemas.parent import ParentChildSummary

import jwt as pyjwt
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import create_access_token, decode_token, verify_password
from app.models.academic import AcademicYear, Branch, ClassSection
from app.models.student import Enrollment, Parent, Student, StudentParentLink
from app.schemas.parent import MaskedStudent, ParentChildSummary

settings = get_settings()

LOOKUP_TOKEN_TTL_MINUTES = 10


def list_all_students(db: Session, limit: int = 100) -> list[ParentChildSummary]:
    """Retrieve active students for direct parent/student portal navigation."""
    rows = (
        db.query(Student, Branch, ClassSection, AcademicYear)
        .join(Branch, Branch.id == Student.branch_id)
        .outerjoin(
            Enrollment,
            (Enrollment.student_id == Student.id) & (Enrollment.status == "active"),
        )
        .outerjoin(ClassSection, ClassSection.id == Enrollment.class_section_id)
        .outerjoin(AcademicYear, AcademicYear.id == Enrollment.academic_year_id)
        .filter(Student.is_active.is_(True))
        .order_by(Student.roll_number)
        .limit(limit)
        .all()
    )
    out: list[ParentChildSummary] = []
    for student, branch, cls, yr in rows:
        out.append(
            ParentChildSummary(
                student_id=student.id,
                roll_number=student.roll_number,
                full_name=student.full_name,
                branch_code=branch.code if branch else "GEN",
                class_section=cls.section_name if cls else None,
                academic_year=yr.name if yr else None,
            )
        )
    return out


def list_directory(
    db: Session,
    *,
    q: str | None = None,
    branch_id: int | None = None,
    page: int = 1,
    page_size: int = 12,
) -> tuple[list[tuple[Student, Branch, ClassSection | None, AcademicYear | None]], int]:
    """Open parent directory (DEMO ONLY — flag-gated by the router).

    Returns active students with their current enrolment. Name/roll search
    is literal (wildcards escaped) and branch filtering is optional.
    Deliberately excludes every sensitive column: no DOB, contacts, guardian
    or fee data — those stay on the per-student read-only endpoints.
    """
    from sqlalchemy import func, or_

    query = (
        db.query(Student, Branch, ClassSection, AcademicYear)
        .join(Branch, Branch.id == Student.branch_id)
        .outerjoin(
            Enrollment,
            (Enrollment.student_id == Student.id) & (Enrollment.status == "active"),
        )
        .outerjoin(ClassSection, ClassSection.id == Enrollment.class_section_id)
        .outerjoin(AcademicYear, AcademicYear.id == Enrollment.academic_year_id)
        .filter(Student.is_active.is_(True))
        .filter(or_(AcademicYear.id.is_(None), AcademicYear.is_current.is_(True)))
    )
    if branch_id:
        query = query.filter(Student.branch_id == branch_id)
    if q and q.strip():
        pattern = f"%{_escape_like(q.strip())}%"
        query = query.filter(
            or_(
                Student.roll_number.ilike(pattern, escape="\\"),
                Student.first_name.ilike(pattern, escape="\\"),
                Student.last_name.ilike(pattern, escape="\\"),
                func.concat(Student.first_name, " ", Student.last_name).ilike(
                    pattern, escape="\\"
                ),
            )
        )

    total = query.with_entities(func.count(func.distinct(Student.id))).scalar() or 0
    rows = (
        query.with_entities(Student, Branch, ClassSection, AcademicYear)
        .order_by(Student.roll_number)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return rows, int(total)


__all__ = [
    "list_all_students",
    "find_student",
    "search_students_by_name",
    "NAME_SEARCH_LIMIT",
    "create_lookup_token",
    "verify_lookup_token",
    "verify_access_code",
    "issue_parent_token",
    "list_children",
    "list_directory",
    "MaskedStudent",
]
