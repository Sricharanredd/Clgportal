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
        ("M-SAN", "Sanskrit"),
    ],
    "BiPC": [
        ("B-BOT", "Botany"),
        ("B-ZOO", "Zoology"),
        ("B-PHY", "Physics"),
        ("B-CHM", "Chemistry"),
        ("B-ENG", "English"),
    ],
    "CEC": [
        ("C-CIV", "Civics"),
        ("C-ECO", "Economics"),
        ("C-COM", "Commerce"),
        ("C-ENG", "English"),
        ("C-SAN", "Sanskrit"),
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
    #   Every faculty is assigned ALL subjects taught in their class so
    #   examination creation/results work for the full curriculum, not just
    #   two subjects.
    assignments: list[tuple[str, str, str, str]] = []
    for code in branch_ids:
        all_subjects = [s_code for s_code, _ in SUBJECTS[code]]
        # legacy whole-branch faculty (both years) — if such an account exists
        legacy_email = f"faculty.{code.lower()}@demo.edu"
        if legacy_email in user_ids:
            for section_name, _yos in SECTIONS:
                class_key = f"{code}-{section_name}"
                for i, s_code in enumerate(all_subjects):
                    assignments.append(
                        (legacy_email, class_key, s_code,
                         "class_teacher" if i == 0 else "subject_teacher")
                    )
        # per-year faculty (one class each) — all subjects of that class
        for section_name, _yos in SECTIONS:
            per_year_email = f"faculty.{code.lower()}{1 if section_name.startswith('I-') else 2}@demo.edu"
            if per_year_email not in user_ids:
                continue
            class_key = f"{code}-{section_name}"
            for i, s_code in enumerate(all_subjects):
                assignments.append(
                    (per_year_email, class_key, s_code,
                     "class_teacher" if i == 0 else "subject_teacher")
                )
    # de-duplicate (legacy and per-year loops can overlap on the same rows)
    seen_assignments: set[tuple[str, str, str]] = set()
    unique_assignments: list[tuple[str, str, str, str]] = []
    for email, class_key, s_code, a_type in assignments:
        key = (email, class_key, s_code)
        if key not in seen_assignments:
            seen_assignments.add(key)
            unique_assignments.append((email, class_key, s_code, a_type))
    assignments = unique_assignments
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
