"""Parent & student portal read-only service.

Provides student records and details for direct dashboard navigation.
All operations are strictly read-only.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.academic import AcademicYear, Branch, ClassSection
from app.models.student import Enrollment, Student
from app.schemas.parent import ParentChildSummary


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


__all__ = [
    "list_all_students",
]
