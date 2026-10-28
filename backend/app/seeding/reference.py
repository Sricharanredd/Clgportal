"""Step 1 of seeding: roles, permissions, branches, years, classes,
subjects, staff accounts and faculty assignments.

All people/data here are SYNTHETIC demo records.
"""
from __future__ import annotations

import logging
from datetime import date

from sqlalchemy.orm import Session

from app.core.enums import ROLE_PERMISSIONS, RoleName
from app.core.security import hash_password
from app.models.academic import (
    AcademicYear,
    Branch,
    ClassSection,
    FacultyAssignment,
    FacultyProfile,
    Subject,
)
from app.models.user import Role, RolePermission, User, UserRole

logger = logging.getLogger("cmp.seed")

# Demo credentials — documented in README; NOT for production use.
DEMO_PASSWORD = "Demo@1234"

BRANCHES = [
    ("MPC", "Mathematics, Physics, Chemistry", 1),
    ("BiPC", "Biology, Physics, Chemistry", 2),
    ("CEC", "Civics, Economics, Commerce", 3),
]

SUBJECTS: dict[str, list[tuple[str, str]]] = {
    "MPC": [
        ("M-MAT", "Mathematics"),
        ("M-PHY", "Physics"),
        ("M-CHM", "Chemistry"),
        ("M-ENG", "English"),
    ],
    "BiPC": [
        ("B-BOT", "Botany"),
        ("B-ZOO", "Zoology"),
        ("B-CHM", "Chemistry"),
        ("B-ENG", "English"),
    ],
    "CEC": [
        ("C-ECO", "Economics"),
        ("C-CIV", "Civics"),
        ("C-COM", "Commerce"),
        ("C-ENG", "English"),
    ],
}

# (email, full name, role, designation)
STAFF_ACCOUNTS = [
    ("principal@demo.edu", "Dr. Anitha Rao", RoleName.PRINCIPAL.value, "Principal"),
    ("admin@demo.edu", "Ravi Kumar", RoleName.ADMINISTRATOR.value, "Administrative Officer"),
    ("accounts@demo.edu", "Sushma Reddy", RoleName.ACCOUNTS.value, "Accounts Manager"),
    # Legacy whole-branch faculty demo accounts (kept for compatibility).
    ("faculty.mpc@demo.edu", "Vikram Shah", RoleName.FACULTY.value, "Assistant Professor"),
    ("faculty.bipc@demo.edu", "Meena Iyer", RoleName.FACULTY.value, "Assistant Professor"),
    # Per-branch-per-year faculty demo accounts (each scoped by assignment).
    ("faculty.mpc1@demo.edu", "Arun Kumar", RoleName.FACULTY.value, "Assistant Professor — MPC I Year"),
    ("faculty.mpc2@demo.edu", "Deepa Menon", RoleName.FACULTY.value, "Assistant Professor — MPC II Year"),
    ("faculty.bipc1@demo.edu", "Sanjay Rao", RoleName.FACULTY.value, "Assistant Professor — BiPC I Year"),
    ("faculty.bipc2@demo.edu", "Lakshmi Nair", RoleName.FACULTY.value, "Assistant Professor — BiPC II Year"),
    ("faculty.cec1@demo.edu", "Prakash Iyer", RoleName.FACULTY.value, "Assistant Professor — CEC I Year"),
    ("faculty.cec2@demo.edu", "Shalini Gupta", RoleName.FACULTY.value, "Assistant Professor — CEC II Year"),
]

# Sections per branch: (section_name, year_of_study)
SECTIONS = [("I-A", 1), ("II-A", 2)]


def seed_reference(db: Session) -> dict:
    """Create reference + staff data. Returns ids for later seed steps."""
    # --- roles + role permissions (DB-configurable RBAC) ---
    role_ids: dict[str, int] = {}
    for role_name in RoleName:
        role = db.query(Role).filter(Role.name == role_name.value).first()
        if role is None:
            role = Role(name=role_name.value, description=None)
            db.add(role)
            db.flush()
        role_ids[role_name.value] = role.id
        granted = ROLE_PERMISSIONS.get(role_name.value, frozenset())
        existing = {
            rp.permission
            for rp in db.query(RolePermission).filter(RolePermission.role_id == role.id)
        }
        for perm in granted - existing:
            db.add(RolePermission(role_id=role.id, permission=perm))

    # --- branches ---
    branch_ids: dict[str, int] = {}
    for code, name, order in BRANCHES:
        b = db.query(Branch).filter(Branch.code == code).first()
        if b is None:
            b = Branch(code=code, name=name, display_order=order)
            db.add(b)
            db.flush()
        branch_ids[code] = b.id

    # --- academic year (current) ---
    year = db.query(AcademicYear).filter(AcademicYear.name == "2025-26").first()
    if year is None:
        year = AcademicYear(
            name="2025-26",
            start_date=date(2025, 6, 1),
            end_date=date(2026, 4, 30),
            is_current=True,
        )
        db.add(year)
        db.flush()

    # --- class sections per branch ---
    class_ids: dict[str, int] = {}
    for code in branch_ids:
        for section_name, yos in SECTIONS:
            cs = (
                db.query(ClassSection)
                .filter(
                    ClassSection.branch_id == branch_ids[code],
                    ClassSection.academic_year_id == year.id,
                    ClassSection.section_name == section_name,
                )
                .first()
            )
            if cs is None:
                cs = ClassSection(
                    branch_id=branch_ids[code],
                    academic_year_id=year.id,
                    section_name=section_name,
                    year_of_study=yos,
                )
                db.add(cs)
                db.flush()
            class_ids[f"{code}-{section_name}"] = cs.id

    # --- subjects per branch ---
    subject_ids: dict[str, int] = {}
    for code, items in SUBJECTS.items():
        for s_code, s_name in items:
            s = db.query(Subject).filter(Subject.code == s_code).first()
            if s is None:
                s = Subject(code=s_code, name=s_name, branch_id=branch_ids[code])
                db.add(s)
                db.flush()
            subject_ids[s_code] = s.id

    # --- staff accounts (individual accounts for accountability) ---
    user_ids: dict[str, int] = {}
    for email, full_name, role_name, designation in STAFF_ACCOUNTS:
        u = db.query(User).filter(User.email == email).first()
        if u is None:
            u = User(
                email=email,
                full_name=full_name,
                password_hash=hash_password(DEMO_PASSWORD),
                is_active=True,
            )
            db.add(u)
            db.flush()
        user_ids[email] = u.id
        if not any(ur.role_id == role_ids[role_name] for ur in u.roles):
            db.add(UserRole(user_id=u.id, role_id=role_ids[role_name]))
        if role_name == RoleName.FACULTY.value:
            fp = db.query(FacultyProfile).filter(FacultyProfile.user_id == u.id).first()
            if fp is None:
                db.add(
                    FacultyProfile(
                        user_id=u.id,
                        employee_code=f"EMP-{u.id:04d}",
                        designation=designation,
                        qualification="M.Sc., M.Ed.",
                    )
                )
    db.flush()

    # --- faculty assignments ---
    #   Legacy faculty span both years of their branch; the per-year demo
    #   faculty are scoped to exactly ONE class (branch + year), which is
    #   what AuthContext.class_scope/branch_scope is built from.
    #   `subject_id` must also be assigned: results entry checks BOTH the
    #   class and the subject (services.examinations.ensure_may_manage).
    assignments = [
        # legacy whole-branch faculty (unchanged)
        ("faculty.mpc@demo.edu", "MPC-I-A", "M-MAT", "class_teacher"),
        ("faculty.mpc@demo.edu", "MPC-II-A", "M-MAT", "subject_teacher"),
        ("faculty.mpc@demo.edu", "MPC-II-A", "M-PHY", "subject_teacher"),
        ("faculty.mpc@demo.edu", "MPC-I-A", "M-PHY", "subject_teacher"),
        ("faculty.bipc@demo.edu", "BiPC-I-A", "B-BOT", "class_teacher"),
        ("faculty.bipc@demo.edu", "BiPC-I-A", "B-ZOO", "subject_teacher"),
        ("faculty.bipc@demo.edu", "BiPC-II-A", "B-BOT", "subject_teacher"),
        ("faculty.bipc@demo.edu", "BiPC-II-A", "B-ZOO", "subject_teacher"),
        # per-year faculty: MPC
        ("faculty.mpc1@demo.edu", "MPC-I-A", "M-MAT", "class_teacher"),
        ("faculty.mpc1@demo.edu", "MPC-I-A", "M-PHY", "subject_teacher"),
        ("faculty.mpc2@demo.edu", "MPC-II-A", "M-MAT", "class_teacher"),
        ("faculty.mpc2@demo.edu", "MPC-II-A", "M-PHY", "subject_teacher"),
        # per-year faculty: BiPC
        ("faculty.bipc1@demo.edu", "BiPC-I-A", "B-BOT", "class_teacher"),
        ("faculty.bipc1@demo.edu", "BiPC-I-A", "B-ZOO", "subject_teacher"),
        ("faculty.bipc2@demo.edu", "BiPC-II-A", "B-BOT", "class_teacher"),
        ("faculty.bipc2@demo.edu", "BiPC-II-A", "B-ZOO", "subject_teacher"),
        # per-year faculty: CEC
        ("faculty.cec1@demo.edu", "CEC-I-A", "C-ECO", "class_teacher"),
        ("faculty.cec1@demo.edu", "CEC-I-A", "C-CIV", "subject_teacher"),
        ("faculty.cec2@demo.edu", "CEC-II-A", "C-ECO", "class_teacher"),
        ("faculty.cec2@demo.edu", "CEC-II-A", "C-COM", "subject_teacher"),
    ]
    for email, class_key, subject_code, a_type in assignments:
        exists = (
            db.query(FacultyAssignment)
            .filter(
                FacultyAssignment.user_id == user_ids[email],
                FacultyAssignment.class_section_id == class_ids[class_key],
                FacultyAssignment.subject_id == subject_ids[subject_code],
            )
            .first()
        )
        if exists is None:
            db.add(
                FacultyAssignment(
                    user_id=user_ids[email],
                    class_section_id=class_ids[class_key],
                    subject_id=subject_ids[subject_code],
                    academic_year_id=year.id,
                    assignment_type=a_type,
                )
            )
    db.flush()
    db.commit()

    logger.info(
        "Reference data seeded: %d branches, %d classes, %d subjects, %d staff",
        len(branch_ids),
        len(class_ids),
        len(subject_ids),
        len(user_ids),
    )
    return {
        "branch_ids": branch_ids,
        "class_ids": class_ids,
        "subject_ids": subject_ids,
        "user_ids": user_ids,
        "academic_year_id": year.id,
        "role_ids": role_ids,
    }


__all__ = ["seed_reference", "DEMO_PASSWORD", "BRANCHES", "SUBJECTS", "STAFF_ACCOUNTS"]
