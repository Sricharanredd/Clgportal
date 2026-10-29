"""Pytest fixtures: isolated MySQL test database + seeded reference data.

IMPORTANT: environment variables for the TEST database are set before any
`app.*` import so `get_settings()` caches test configuration.
"""
from __future__ import annotations

import os

# --- configure test environment BEFORE importing the app -------------------
os.environ["APP_ENV"] = "test"
os.environ["DB_NAME"] = os.environ.get("TEST_DB_NAME", "cmp_portal_test")
os.environ["DB_ECHO"] = "false"
# Generous rate limits so repeated logins inside a test run are not throttled;
# test_login_rate_limit temporarily burns its own budget and resets the limiter.
os.environ["LOGIN_RATE_LIMIT"] = "20/minute"
os.environ["LOOKUP_RATE_LIMIT"] = "1000/minute"
# Tests always run with production parent-verification behavior; the demo
# bypass is exercised separately by monkeypatching the settings flag.
os.environ["PARENT_VERIFICATION_ENABLED"] = "true"
# --- THIS LINE MUST STAY ABOVE EVERY app IMPORT -----------------------------

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from urllib.parse import quote_plus  # noqa: E402

settings = get_settings()

# Credentials must be URL-encoded: the dev password contains '@', which would
# otherwise corrupt URL parsing (host would become "33@localhost").
SERVER_URL = (
    f"mysql+pymysql://{quote_plus(settings.db_user)}:{quote_plus(settings.db_password)}"
    f"@{settings.db_host}:{settings.db_port}?charset=utf8mb4"
)
TEST_DB_URL = settings.database_url

server_engine = create_engine(SERVER_URL, pool_pre_ping=True)

DEMO_PASSWORD = "Demo@1234"


def _recreate_database() -> None:
    """Drop & recreate the test schema (dev data is never touched)."""
    with server_engine.begin() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {settings.db_name}"))
        conn.execute(
            text(
                f"CREATE DATABASE {settings.db_name} "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )
        # Best effort: privileges on the test DB are normally persistent.
        try:
            with server_engine.begin() as conn2:
                conn2.execute(
                    text(
                        f"GRANT ALL ON {settings.db_name}.* "
                        f"TO '{settings.db_user}'@'localhost'"
                    )
                )
        except Exception:  # noqa: BLE001 - app user lacks GRANT OPTION; rely on existing grant
            pass


def _migrate() -> None:
    """Apply Alembic migrations to the fresh test schema."""
    from alembic import command
    from alembic.config import Config

    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "..", "alembic.ini"))
    cfg.set_main_option("script_location", "alembic")
    command.upgrade(cfg, "head")


# ---------------------------------------------------------------------------
# Minimal reference dataset used by most tests
# ---------------------------------------------------------------------------
from app.core.enums import ROLE_PERMISSIONS, RoleName  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.academic import (  # noqa: E402
    AcademicYear,
    Branch,
    ClassSection,
    FacultyAssignment,
    Subject,
)
from app.models.fee import FeeStructure, StudentFeeObligation  # noqa: E402
from app.models.student import Parent, Student, StudentParentLink, Enrollment  # noqa: E402
from app.models.user import Role, RolePermission, User, UserRole  # noqa: E402
from app.core.database import Base, SessionLocal  # noqa: E402
from datetime import date  # noqa: E402
from decimal import Decimal  # noqa: E402


def _seed_reference() -> None:
    db = SessionLocal()
    try:
        # roles + permissions
        for role_name in RoleName:
            role = Role(name=role_name.value)
            db.add(role)
            db.flush()
            for perm in ROLE_PERMISSIONS.get(role_name.value, frozenset()):
                db.add(RolePermission(role_id=role.id, permission=perm))

        # branches
        mpc = Branch(code="MPC", name="MPC", display_order=1)
        bipc = Branch(code="BiPC", name="BiPC", display_order=2)
        db.add_all([mpc, bipc])
        db.flush()

        year = AcademicYear(
            name="2025-26",
            start_date=date(2025, 6, 1),
            end_date=date(2026, 4, 30),
            is_current=True,
        )
        db.add(year)
        db.flush()

        mpc1 = ClassSection(
            branch_id=mpc.id, academic_year_id=year.id, section_name="I-A",
            year_of_study=1,
        )
        bipc1 = ClassSection(
            branch_id=bipc.id, academic_year_id=year.id, section_name="I-A",
            year_of_study=1,
        )
        db.add_all([mpc1, bipc1])
        db.flush()

        math = Subject(code="M-MAT", name="Mathematics", branch_id=mpc.id)
        phys = Subject(code="M-PHY", name="Physics", branch_id=mpc.id)
        bot = Subject(code="B-BOT", name="Botany", branch_id=bipc.id)
        # Extra MPC subjects (appended AFTER the ids used by existing tests:
        # M-MAT=1, M-PHY=2, B-BOT=3 stay stable).
        chm = Subject(code="M-CHM", name="Chemistry", branch_id=mpc.id)
        eng = Subject(code="M-ENG", name="English", branch_id=mpc.id)
        san = Subject(code="M-SAN", name="Sanskrit", branch_id=mpc.id)
        db.add_all([math, phys, bot, chm, eng, san])
        db.flush()

        # staff accounts
        def mk_user(email: str, name: str, role: str) -> User:
            u = User(
                email=email, full_name=name,
                password_hash=hash_password(DEMO_PASSWORD), is_active=True,
            )
            db.add(u)
            db.flush()
            db.add(UserRole(user_id=u.id, role_id=_role(db, role)))
            return u

        principal = mk_user("principal@test.edu", "Test Principal", "principal")
        accounts = mk_user("accounts@test.edu", "Test Accounts", "accounts")
        faculty = mk_user("faculty@test.edu", "Test Faculty", "faculty")
        faculty_b = mk_user("facultyb@test.edu", "Test Faculty B", "faculty")
        admin = mk_user("admin@test.edu", "Test Admin", "administrator")

        db.add(
            FacultyAssignment(
                user_id=faculty.id, class_section_id=mpc1.id,
                subject_id=math.id, academic_year_id=year.id,
                assignment_type="class_teacher",
            )
        )
        db.add(
            FacultyAssignment(
                user_id=faculty.id, class_section_id=mpc1.id,
                subject_id=phys.id, academic_year_id=year.id,
                assignment_type="subject_teacher",
            )
        )
        # Full MPC I-year curriculum for `faculty` (Chemistry, English,
        # Sanskrit) so per-subject examination tests can run.
        for sub, a_type in ((chm, "subject_teacher"), (eng, "subject_teacher"),
                            (san, "subject_teacher")):
            db.add(
                FacultyAssignment(
                    user_id=faculty.id, class_section_id=mpc1.id,
                    subject_id=sub.id, academic_year_id=year.id,
                    assignment_type=a_type,
                )
            )
        db.add(
            FacultyAssignment(
                user_id=faculty_b.id, class_section_id=bipc1.id,
                subject_id=bot.id, academic_year_id=year.id,
                assignment_type="class_teacher",
            )
        )

        # students: 4 in MPC I-A, 3 in BiPC I-A
        students: list[Student] = []
        for i in range(1, 5):
            s = Student(
                roll_number=f"MPC26{i:03d}", first_name=f"Stu{i}", last_name="Mpc",
                branch_id=mpc.id, is_active=True,
            )
            db.add(s)
            db.flush()
            db.add(Enrollment(student_id=s.id, class_section_id=mpc1.id,
                              academic_year_id=year.id, status="active"))
            p = Parent(full_name=f"Parent {i}", phone=f"90000000{i}",
                       access_code_hash=hash_password(f"CODE-MPC26{i:03d}"),
                       is_verified=True)
            db.add(p)
            db.flush()
            db.add(StudentParentLink(student_id=s.id, parent_id=p.id,
                                     relationship_type="guardian"))
            students.append(s)
        for i in range(1, 4):
            s = Student(
                roll_number=f"BIP26{i:03d}", first_name=f"Stu{i}", last_name="Bipc",
                branch_id=bipc.id, is_active=True,
            )
            db.add(s)
            db.flush()
            db.add(Enrollment(student_id=s.id, class_section_id=bipc1.id,
                              academic_year_id=year.id, status="active"))
            students.append(s)

        # fee structures + obligations for all students
        fs_mpc = FeeStructure(name="Tuition 25-26", academic_year_id=year.id,
                              branch_id=mpc.id, total_amount=Decimal("10000.00"),
                              is_active=True)
        fs_bipc = FeeStructure(name="Tuition 25-26", academic_year_id=year.id,
                               branch_id=bipc.id, total_amount=Decimal("12000.00"),
                               is_active=True)
        db.add_all([fs_mpc, fs_bipc])
        db.flush()
        for s in students:
            fs = fs_mpc if s.branch_id == mpc.id else fs_bipc
            db.add(StudentFeeObligation(
                student_id=s.id, fee_structure_id=fs.id,
                academic_year_id=year.id, total_amount=fs.total_amount,
                paid_amount=Decimal("0.00"), status="active",
            ))
        db.commit()
    finally:
        db.close()


def _role(db, name: str) -> int:
    return db.query(Role).filter(Role.name == name).first().id


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Fresh schema + reference data, then a TestClient against the app."""
    _recreate_database()
    _migrate()
    _seed_reference()

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def tokens(client: TestClient) -> dict[str, str]:
    """Access tokens for each seeded role (one login each)."""
    out: dict[str, str] = {}
    for key, email in [
        ("principal", "principal@test.edu"),
        ("accounts", "accounts@test.edu"),
        ("faculty", "faculty@test.edu"),
        ("faculty_b", "facultyb@test.edu"),
        ("admin", "admin@test.edu"),
    ]:
        r = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": DEMO_PASSWORD},
        )
        assert r.status_code == 200, f"login failed for {email}: {r.text}"
        out[key] = r.json()["access_token"]
    return out


def auth(token: str) -> dict[str, str]:
    """Helper: Authorization header dict."""
    return {"Authorization": f"Bearer {token}"}
