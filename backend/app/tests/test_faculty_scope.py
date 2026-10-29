"""Faculty access scoping: branch + year enforced server-side.

Validates the production reference seeder (`app.seeding.reference`) creates
the per-branch-per-year demo faculty accounts with exactly one assigned
class each, and that FastAPI — not React — enforces the scope on every
relevant surface:

- /meta/classes + /meta/subjects   (dropdowns only offer assigned data)
- /attendance/roster GET/PUT       (403 for any other class, incl. other
                                    year of the SAME branch — URL/body tampering)
- /attendance/sessions             (scope-filtered list)
- /examinations create + list      (class AND subject must be assigned)
- /students search                 (assigned classes/branches only)

Existing tests run against the shared session-scoped test database, so this
module only ever ADDS reference rows (branches/classes/subjects/staff) via
the idempotent production seeder — it never adds students (test_students
asserts exact totals) and uses a date no other test writes sessions on.
"""
from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.core.database import SessionLocal
from app.models.academic import ClassSection, FacultyAssignment
from app.models.student import Enrollment
from app.models.user import User
from app.tests.conftest import DEMO_PASSWORD, auth

# A fixed past weekday no other test writes attendance sessions on
# (test_attendance uses today-30).
SESSION_DAY = "2025-09-15"

PER_YEAR_FACULTY = {
    "faculty.mpc1@demo.edu": "MPC-I-A",
    "faculty.mpc2@demo.edu": "MPC-II-A",
    "faculty.bipc1@demo.edu": "BiPC-I-A",
    "faculty.bipc2@demo.edu": "BiPC-II-A",
    "faculty.cec1@demo.edu": "CEC-I-A",
    "faculty.cec2@demo.edu": "CEC-II-A",
}


@pytest.fixture(scope="module")
def seeded(client):
    """Run the production reference seeder (idempotent) on the test DB.

    Adds CEC + II-year classes + the six per-year faculty accounts and
    their assignments; reuses everything that already exists.
    """
    from app.seeding.reference import seed_reference

    db = SessionLocal()
    try:
        return seed_reference(db)
    finally:
        db.close()


@pytest.fixture(scope="module")
def scope_tokens(client, seeded) -> dict[str, str]:
    """One login per per-year demo faculty (they must authenticate)."""
    out: dict[str, str] = {}
    for email in PER_YEAR_FACULTY:
        r = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": DEMO_PASSWORD},
        )
        assert r.status_code == 200, f"login failed for {email}: {r.text}"
        out[email] = r.json()["access_token"]
    return out


def _h(email: str, scope_tokens: dict[str, str]) -> dict[str, str]:
    return auth(scope_tokens[email])


def _enrolled_student_id(class_id: int) -> int:
    db = SessionLocal()
    try:
        row = (
            db.query(Enrollment.student_id)
            .filter(
                Enrollment.class_section_id == class_id,
                Enrollment.status == "active",
            )
            .first()
        )
        assert row is not None, f"fixture students missing for class {class_id}"
        return int(row[0])
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Seed: accounts, assignments, idempotency
# ---------------------------------------------------------------------------


def test_seed_creates_six_per_year_faculty(seeded):
    """All six demo faculty accounts exist (active) after seeding."""
    db = SessionLocal()
    try:
        for email in PER_YEAR_FACULTY:
            assert email in seeded["user_ids"], f"{email} missing from seed"
            u = db.query(User).filter(User.email == email).first()
            assert u is not None and u.is_active
            assert "faculty" in u.role_names
            # Never plaintext.
            assert u.password_hash != DEMO_PASSWORD
            assert u.password_hash.startswith("$argon2")
    finally:
        db.close()


def test_seed_assigns_each_faculty_to_exactly_their_branch_and_year(seeded):
    """faculty.mpc1 → MPC 1st year only; faculty.cec2 → CEC 2nd year only..."""
    id_to_label = {v: k for k, v in seeded["class_ids"].items()}
    db = SessionLocal()
    try:
        for email, expected_label in PER_YEAR_FACULTY.items():
            uid = seeded["user_ids"][email]
            rows = (
                db.query(FacultyAssignment)
                .filter(FacultyAssignment.user_id == uid)
                .all()
            )
            assert rows, f"{email} has no assignments"
            labels = {id_to_label[a.class_section_id] for a in rows}
            assert labels == {expected_label}, f"{email}: {labels}"
            # Every assignment is for the current seeded year.
            assert all(
                a.academic_year_id == seeded["academic_year_id"] for a in rows
            )
    finally:
        db.close()


def test_seed_is_idempotent_no_duplicates(seeded, client):
    """Repeated seed runs never duplicate accounts or assignments."""

    def counts() -> tuple[int, int]:
        db = SessionLocal()
        try:
            users = db.query(User).count()
            assigns = db.query(FacultyAssignment).count()
            return users, assigns
        finally:
            db.close()

    from app.seeding.reference import seed_reference

    before = counts()
    db = SessionLocal()
    try:
        seed_reference(db)  # run again — must be a no-op row-wise
    finally:
        db.close()
    assert counts() == before


# ---------------------------------------------------------------------------
# /meta dropdowns are scoped server-side
# ---------------------------------------------------------------------------


def test_meta_classes_scoped_to_assigned_branch_and_year(
    client, seeded, scope_tokens
):
    for email, expected_label in PER_YEAR_FACULTY.items():
        rows = client.get("/api/v1/meta/classes", headers=_h(email, scope_tokens))
        assert rows.status_code == 200, rows.text
        got = {
            f"{r['branch_code']}-{r['section_name']}" for r in rows.json()
        }
        assert got == {expected_label}, f"{email} sees {got}"


def test_meta_classes_principal_sees_all_branches_including_cec(
    client, seeded, tokens
):
    r = client.get("/api/v1/meta/classes", headers=auth(tokens["principal"]))
    assert r.status_code == 200
    labels = {f"{x['branch_code']}-{x['section_name']}" for x in r.json()}
    assert {
        "MPC-I-A", "MPC-II-A", "BiPC-I-A", "BiPC-II-A", "CEC-I-A", "CEC-II-A",
    } <= labels
    cec = [x for x in r.json() if x["branch_code"] == "CEC"]
    assert cec and all(x["branch_code"] and x["branch_name"] for x in cec)


def test_legacy_faculty_keeps_both_years_of_own_branch(client, seeded, tokens):
    """faculty.mpc@demo.edu (whole-branch) still spans MPC I + II."""
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "faculty.mpc@demo.edu", "password": DEMO_PASSWORD},
    )
    assert r.status_code == 200, r.text
    h = auth(r.json()["access_token"])
    rows = client.get("/api/v1/meta/classes", headers=h).json()
    got = {f"{x['branch_code']}-{x['section_name']}" for x in rows}
    assert got == {"MPC-I-A", "MPC-II-A"}


def test_meta_subjects_scoped_to_assigned_branch(client, seeded, scope_tokens):
    r = client.get(
        "/api/v1/meta/subjects", headers=_h("faculty.cec1@demo.edu", scope_tokens)
    )
    assert r.status_code == 200
    codes = {s["code"] for s in r.json()}
    assert codes and all(c.startswith("C-") for c in codes), codes


# ---------------------------------------------------------------------------
# Attendance: 403 on any class outside the assignment (URL tampering)
# ---------------------------------------------------------------------------


def test_faculty_roster_ok_for_own_class(client, seeded, scope_tokens):
    r = client.get(
        "/api/v1/attendance/roster",
        params={"class_id": seeded["class_ids"]["CEC-I-A"], "date": SESSION_DAY},
        headers=_h("faculty.cec1@demo.edu", scope_tokens),
    )
    assert r.status_code == 200, r.text


@pytest.mark.parametrize(
    "viewer,foreign",
    [
        # other YEAR of the SAME branch
        ("faculty.cec1@demo.edu", "CEC-II-A"),
        ("faculty.cec2@demo.edu", "CEC-I-A"),
        ("faculty.mpc1@demo.edu", "MPC-II-A"),
        ("faculty.mpc2@demo.edu", "MPC-I-A"),
        # other BRANCH entirely
        ("faculty.bipc1@demo.edu", "MPC-I-A"),
        ("faculty.cec1@demo.edu", "BiPC-I-A"),
    ],
)
def test_faculty_cannot_open_foreign_class_roster(
    client, seeded, scope_tokens, viewer, foreign
):
    r = client.get(
        "/api/v1/attendance/roster",
        params={"class_id": seeded["class_ids"][foreign], "date": SESSION_DAY},
        headers=_h(viewer, scope_tokens),
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.parametrize(
    "viewer,foreign",
    [
        ("faculty.mpc2@demo.edu", "MPC-I-A"),   # tampered query param
        ("faculty.cec1@demo.edu", "CEC-II-A"),  # tampered query param
    ],
)
def test_faculty_cannot_save_foreign_class(
    client, seeded, scope_tokens, viewer, foreign
):
    r = client.put(
        "/api/v1/attendance/roster",
        params={"class_id": seeded["class_ids"][foreign], "date": SESSION_DAY},
        json={
            "records": [
                {"student_id": 999999, "status": "present"}  # rejected by scope gate
            ]
        },
        headers=_h(viewer, scope_tokens),
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN"


def test_faculty_cannot_submit_foreign_class(client, seeded, scope_tokens):
    r = client.post(
        "/api/v1/attendance/submit",
        params={
            "class_id": seeded["class_ids"]["CEC-II-A"],
            "date": SESSION_DAY,
        },
        headers=_h("faculty.cec1@demo.edu", scope_tokens),  # owner is cec2
    )
    assert r.status_code == 403

    # Same rejection when the payload rides along: the scope gate runs
    # BEFORE any validation or write, so a body cannot bypass assignment.
    r = client.post(
        "/api/v1/attendance/submit",
        params={
            "class_id": seeded["class_ids"]["CEC-II-A"],
            "date": SESSION_DAY,
        },
        json={"records": [{"student_id": 999999, "status": "present"}]},
        headers=_h("faculty.cec1@demo.edu", scope_tokens),
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN"


def test_attendance_sessions_list_scoped(client, seeded, tokens, scope_tokens):
    """Each faculty's session list contains only their own class."""
    principal = auth(tokens["principal"])
    # Principal seeds one draft session each for MPC-I-A and BiPC-I-A
    # (principal holds attendance:correct, which bypasses assignments).
    for label in ("MPC-I-A", "BiPC-I-A"):
        sid = _enrolled_student_id(seeded["class_ids"][label])
        r = client.put(
            "/api/v1/attendance/roster",
            params={"class_id": seeded["class_ids"][label], "date": SESSION_DAY},
            json={"records": [{"student_id": sid, "status": "present"}]},
            headers=principal,
        )
        assert r.status_code == 200, r.text

    r = client.get(
        "/api/v1/attendance/sessions",
        headers=_h("faculty.mpc1@demo.edu", scope_tokens),
    )
    assert r.status_code == 200
    assert r.json() and all(
        s["class_section_id"] == seeded["class_ids"]["MPC-I-A"] for s in r.json()
    )

    r = client.get(
        "/api/v1/attendance/sessions",
        headers=_h("faculty.bipc1@demo.edu", scope_tokens),
    )
    assert r.status_code == 200
    assert r.json() and all(
        s["class_section_id"] == seeded["class_ids"]["BiPC-I-A"] for s in r.json()
    )


# ---------------------------------------------------------------------------
# Results: class AND subject scope enforced on create; list scoped
# ---------------------------------------------------------------------------


def test_exam_create_and_list_scoped(client, seeded, scope_tokens, tokens):
    mpc2 = seeded["class_ids"]["MPC-II-A"]
    mmat = seeded["subject_ids"]["M-MAT"]
    title = "Scope UT (mpc2)"

    # Out-of-scope create via tampered body → 403.
    r = client.post(
        "/api/v1/examinations",
        json={
            "title": "Should fail",
            "class_section_id": mpc2,
            "subject_id": mmat,
            "exam_type": "unit_test",
            "max_marks": "100",
            "pass_marks": "35",
        },
        headers=_h("faculty.mpc1@demo.edu", scope_tokens),  # assigned MPC-I-A
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN"

    # In-scope create by the assigned faculty → 201.
    r = client.post(
        "/api/v1/examinations",
        json={
            "title": title,
            "class_section_id": mpc2,
            "subject_id": mmat,
            "exam_type": "unit_test",
            "max_marks": "100",
            "pass_marks": "35",
        },
        headers=_h("faculty.mpc2@demo.edu", scope_tokens),
    )
    assert r.status_code == 201, r.text
    exam_id = r.json()["id"]

    # List scoping: sibling year must not see it; owner + principal must.
    r = client.get(
        "/api/v1/examinations", headers=_h("faculty.mpc1@demo.edu", scope_tokens)
    )
    assert all(e["id"] != exam_id for e in r.json())
    r = client.get(
        "/api/v1/examinations", headers=_h("faculty.mpc2@demo.edu", scope_tokens)
    )
    assert any(e["id"] == exam_id for e in r.json())
    r = client.get("/api/v1/examinations", headers=auth(tokens["principal"]))
    assert any(e["id"] == exam_id for e in r.json())

    # Detail sheet is also hidden from the out-of-scope sibling.
    r = client.get(
        f"/api/v1/examinations/{exam_id}",
        headers=_h("faculty.mpc1@demo.edu", scope_tokens),
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Students: search scoped to assigned classes/branches
# ---------------------------------------------------------------------------


def test_student_search_scoped(client, seeded, scope_tokens):
    h = _h("faculty.cec1@demo.edu", scope_tokens)
    r = client.get("/api/v1/students", headers=h)
    assert r.status_code == 200
    assert r.json()["total"] == 0  # no CEC students in fixture

    h = _h("faculty.mpc1@demo.edu", scope_tokens)
    r = client.get("/api/v1/students", headers=h)
    data = r.json()
    assert data["total"] == 4  # only MPC I-A students
    assert all(i["branch_code"] == "MPC" for i in data["items"])

    # Tampered branch filter outside the scope yields nothing, not everything.
    bipc_id = seeded["branch_ids"]["BiPC"]
    r = client.get("/api/v1/students", params={"branch_id": bipc_id}, headers=h)
    assert r.json()["total"] == 0
