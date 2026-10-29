"""Examination & result tests: scope, validation, publish gating,
unpublished-result visibility rules."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.core.database import SessionLocal
from app.tests.conftest import DEMO_PASSWORD, auth


@pytest.fixture(scope="module")
def seeded(client):
    """Run the idempotent production reference seeder on the test DB.

    Adds CEC + II-year classes + the full per-branch curricula (incl.
    Sanskrit/Physics) and the six per-year demo faculty. Never adds
    students (test_students asserts exact totals).
    """
    from app.seeding.reference import seed_reference

    db = SessionLocal()
    try:
        return seed_reference(db)
    finally:
        db.close()


@pytest.fixture(scope="module")
def mpc2_token(client, seeded) -> str:
    """One login for faculty.mpc2@demo.edu (assigned MPC-II-A, all subjects)."""
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "faculty.mpc2@demo.edu", "password": DEMO_PASSWORD},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _create_exam(client, tokens, *, title: str = "Unit Test A") -> dict:
    r = client.post(
        "/api/v1/examinations",
        json={
            "title": title,
            "class_section_id": 1,
            "subject_id": 1,
            "exam_date": date.today().isoformat(),
            "max_marks": "50.00",
            "pass_marks": "17.00",
        },
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_accounts_cannot_list_examinations(client, tokens):
    r = client.get("/api/v1/examinations", headers=auth(tokens["accounts"]))
    assert r.status_code == 403


def test_create_exam_and_duplicate_rejected(client, tokens):
    exam = _create_exam(client, tokens)
    assert exam["status"] == "draft"
    assert exam["class_label"] == "MPC-I-A"

    r = client.post(
        "/api/v1/examinations",
        json={
            "title": "Unit Test A",
            "class_section_id": 1,
            "subject_id": 1,
            "max_marks": "50.00",
            "pass_marks": "17.00",
        },
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "DUPLICATE_EXAMINATION"


def test_pass_marks_must_not_exceed_max(client, tokens):
    r = client.post(
        "/api/v1/examinations",
        json={
            "title": "Bad Config",
            "class_section_id": 1,
            "subject_id": 1,
            "max_marks": "10.00",
            "pass_marks": "50.00",
        },
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "INVALID_MARKS"


def test_faculty_cannot_create_exam_for_foreign_subject(client, tokens):
    """faculty is not assigned BiPC Botany (subject 3)."""
    r = client.post(
        "/api/v1/examinations",
        json={
            "title": "Foreign Exam",
            "class_section_id": 1,
            "subject_id": 3,
            "max_marks": "50.00",
            "pass_marks": "17.00",
        },
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 403


def test_marks_validation_and_publish_flow(client, tokens):
    exam = _create_exam(client, tokens, title="Unit Test B")
    exam_id = exam["id"]
    detail = client.get(
        f"/api/v1/examinations/{exam_id}", headers=auth(tokens["faculty"])
    ).json()
    assert detail["can_edit"] is True
    roster = detail["roster"]
    assert len(roster) == 4

    # out-of-range marks → 422
    r = client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json={"results": [{"student_id": roster[0]["student_id"],
                           "marks_obtained": "75.00"}]},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "MARKS_OUT_OF_RANGE"

    # student from another class → 422 NOT_ENROLLED
    r = client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json={"results": [{"student_id": 9999, "marks_obtained": "10.00"}]},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "NOT_ENROLLED"

    # partial entry then publish → 409 INCOMPLETE_RESULTS
    client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json={"results": [{"student_id": roster[0]["student_id"],
                           "marks_obtained": "42.50"}]},
        headers=auth(tokens["faculty"]),
    )
    r = client.post(
        f"/api/v1/examinations/{exam_id}/publish", headers=auth(tokens["principal"])
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "INCOMPLETE_RESULTS"

    # faculty CANNOT publish (results:publish not granted to faculty)
    r = client.post(
        f"/api/v1/examinations/{exam_id}/publish", headers=auth(tokens["faculty"])
    )
    assert r.status_code == 403

    # full entry → publish succeeds
    results = [
        {"student_id": s["student_id"],
         "marks_obtained": "30.00" if i % 2 else "12.00"}
        for i, s in enumerate(roster)
    ]
    r = client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json={"results": results},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 200
    assert r.json()["entered"] == 4

    r = client.post(
        f"/api/v1/examinations/{exam_id}/publish", headers=auth(tokens["principal"])
    )
    assert r.status_code == 200
    assert r.json()["status"] == "published"

    # published exams are locked for entry → 409 RESULTS_PUBLISHED
    r = client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json={"results": [{"student_id": roster[0]["student_id"],
                           "marks_obtained": "33.00"}]},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "RESULTS_PUBLISHED"

    # principal reopens (correction path), faculty fixes, principal republishes
    r = client.post(
        f"/api/v1/examinations/{exam_id}/reopen", headers=auth(tokens["principal"])
    )
    assert r.status_code == 200
    assert r.json()["status"] == "draft"
    r = client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json={"results": [{"student_id": roster[0]["student_id"],
                           "marks_obtained": "33.00"}]},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 200
    r = client.post(
        f"/api/v1/examinations/{exam_id}/publish", headers=auth(tokens["principal"])
    )
    assert r.status_code == 200

    # reopen denied for faculty
    r = client.post(
        f"/api/v1/examinations/{exam_id}/reopen", headers=auth(tokens["faculty"])
    )
    assert r.status_code == 403


def test_saving_full_roster_with_blank_rows(client, tokens):
    """Marks-entry UIs submit the WHOLE roster, with null marks for students
    left blank. Blank rows must not 422, must not count as entered, and
    clearing a previously saved mark must remove it from the count."""
    exam = _create_exam(client, tokens, title="Unit Test D")
    exam_id = exam["id"]
    roster = client.get(
        f"/api/v1/examinations/{exam_id}", headers=auth(tokens["faculty"])
    ).json()["roster"]

    payload = {
        "results": [
            {"student_id": roster[0]["student_id"], "marks_obtained": "42",
             "is_absent": False, "remarks": None},
            {"student_id": roster[1]["student_id"], "marks_obtained": "30.00",
             "is_absent": False, "remarks": None},
            {"student_id": roster[2]["student_id"], "marks_obtained": None,
             "is_absent": False, "remarks": None},
            {"student_id": roster[3]["student_id"], "marks_obtained": None,
             "is_absent": False, "remarks": None},
        ]
    }
    r = client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json=payload,
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["saved"] == 2
    assert body["entered"] == 2
    assert body["expected"] == 4

    # clearing a saved mark drops it from the entered count
    payload["results"][0]["marks_obtained"] = None
    r = client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json=payload,
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 200, r.text
    assert r.json()["entered"] == 1

    # absent-with-no-marks still counts as entered
    payload["results"][0]["is_absent"] = True
    r = client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json=payload,
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 200, r.text
    assert r.json()["entered"] == 2


def test_unpublished_results_hidden_from_parent(client, tokens):
    """PRD: unpublished results must NOT be visible through parent APIs."""
    exam = _create_exam(client, tokens, title="Unit Test C")
    exam_id = exam["id"]
    detail = client.get(
        f"/api/v1/examinations/{exam_id}", headers=auth(tokens["faculty"])
    ).json()
    # enter full marks but DO NOT publish
    client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json={"results": [{"student_id": s["student_id"], "marks_obtained": "40.00"}
                          for s in detail["roster"]]},
        headers=auth(tokens["faculty"]),
    )

    # parent session for student MPC26001 (linked)
    lookup = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": 1, "roll_number": "MPC26001"},
    ).json()
    verify = client.post(
        "/api/v1/parent/verify",
        json={"lookup_token": lookup["lookup_token"], "access_code": "CODE-MPC26001"},
    ).json()
    parent_headers = {"Authorization": f"Bearer {verify['access_token']}"}
    student_id = verify["children"][0]["student_id"]

    results = client.get(
        f"/api/v1/parent/students/{student_id}/results", headers=parent_headers
    ).json()
    titles = [r["exam_title"] for r in results]
    assert "Unit Test C" not in titles, "draft exam leaked to parent!"

    # publish → now visible
    client.post(f"/api/v1/examinations/{exam_id}/publish", headers=auth(tokens["principal"]))
    results2 = client.get(
        f"/api/v1/parent/students/{student_id}/results", headers=parent_headers
    ).json()
    assert "Unit Test C" in [r["exam_title"] for r in results2]


def test_faculty_only_sees_assigned_exams(client, tokens):
    _create_exam(client, tokens, title="Scope Probe")
    r = client.get("/api/v1/examinations", headers=auth(tokens["faculty_b"]))
    assert r.status_code == 200
    # BiPC faculty has no exams (none created for BiPC) and must not see MPC ones
    labels = [e["branch_code"] for e in r.json()]
    assert "MPC" not in labels


def test_raced_duplicate_create_returns_409_not_500(client, tokens, monkeypatch):
    """Two identical create requests racing past the pre-check (double-click
    that reached the server twice) → the unique constraint translates to 409,
    never a 500."""
    import app.services.examinations as svc

    exam = _create_exam(client, tokens, title="Race UT")
    # Simulate the race: the duplicate pre-check sees nothing (the competing
    # request hasn't committed yet), but the DB constraint does.
    monkeypatch.setattr(svc, "_find_duplicate", lambda *a, **k: None)

    r = client.post(
        "/api/v1/examinations",
        json={
            "title": "Race UT",
            "class_section_id": 1,
            "subject_id": 1,
            "exam_type": "unit_test",
            "max_marks": "50.00",
            "pass_marks": "17.00",
        },
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 409, r.text
    assert r.json()["error"]["code"] == "DUPLICATE_EXAMINATION"

    # Exactly one row exists (the constraint held; nothing was persisted twice).
    rows = client.get("/api/v1/examinations", headers=auth(tokens["faculty"])).json()
    dupes = [e for e in rows if e["title"] == "Race UT"]
    assert len(dupes) == 1
    assert dupes[0]["id"] == exam["id"]


# ---------------------------------------------------------------------------
# Full-curriculum examination creation (all subjects, both years)
# ---------------------------------------------------------------------------


def test_all_configured_subjects_offered_per_branch(client, tokens, seeded):
    """Dropdown data: every configured subject (incl. Sanskrit/Physics)
    is offered for its branch; cross-branch subjects are not."""
    expected = {
        "MPC": {"M-MAT", "M-PHY", "M-CHM", "M-ENG", "M-SAN"},
        "BiPC": {"B-BOT", "B-ZOO", "B-PHY", "B-CHM", "B-ENG"},
        "CEC": {"C-CIV", "C-ECO", "C-COM", "C-ENG", "C-SAN"},
    }
    branches = client.get("/api/v1/meta/branches").json()
    for b in branches:
        r = client.get(
            "/api/v1/meta/subjects",
            params={"branch_id": b["id"]},
            headers=auth(tokens["principal"]),
        )
        assert r.status_code == 200
        codes = {s["code"] for s in r.json()}
        assert codes == expected[b["code"]], f"{b['code']}: {codes}"


def test_faculty_dropdown_only_offers_assigned_subjects(client, seeded):
    """A faculty member's subject list must never include a subject whose
    examination creation would be rejected (403)."""
    r = client.get(
        "/api/v1/meta/subjects",
        params={"branch_id": seeded["branch_ids"]["BiPC"]},
        headers=auth(
            client.post(
                "/api/v1/auth/login",
                json={"email": "faculty.bipc1@demo.edu", "password": DEMO_PASSWORD},
            ).json()["access_token"]
        ),
    )
    assert r.status_code == 200
    codes = {s["code"] for s in r.json()}
    # bipc1 is assigned the full BiPC curriculum → all five appear.
    assert codes == {"B-BOT", "B-ZOO", "B-PHY", "B-CHM", "B-ENG"}, codes


def test_create_exam_for_every_mpc_subject(client, tokens):
    """Scenario 1: one draft exam per configured MPC subject succeeds."""
    subjects = client.get(
        "/api/v1/meta/subjects", params={"branch_id": 1},
        headers=auth(tokens["faculty"]),
    ).json()
    assert len(subjects) == 5  # incl. M-SAN (Sanskrit)
    for i, s in enumerate(subjects):
        r = client.post(
            "/api/v1/examinations",
            json={
                "title": f"Full Curriculum UT {i + 1}",
                "class_section_id": 1,
                "subject_id": s["id"],
                "exam_type": "unit_test",
                "exam_date": "2025-09-20",
                "max_marks": "100",
                "pass_marks": "35",
            },
            headers=auth(tokens["faculty"]),
        )
        assert r.status_code == 201, f"{s['code']}: {r.text}"
        body = r.json()
        assert body["status"] == "draft"
        assert body["subject_code"] == s["code"]
        assert body["class_label"] == "MPC-I-A"


def test_create_exam_for_second_year_class(client, mpc2_token, seeded):
    """Scenario 2: II-year classes work exactly like I-year classes."""
    mpc2 = seeded["class_ids"]["MPC-II-A"]
    math_id = seeded["subject_ids"]["M-MAT"]
    r = client.post(
        "/api/v1/examinations",
        json={
            "title": "II-year Unit Test",
            "class_section_id": mpc2,
            "subject_id": math_id,
            "exam_type": "unit_test",
            "exam_date": "2025-09-21",
            "max_marks": "80",
            "pass_marks": "28",
        },
        headers=auth(mpc2_token),
    )
    assert r.status_code == 201, r.text
    assert r.json()["class_label"] == "MPC-II-A"
    assert r.json()["max_marks"] == "80.00"


def test_sanskrit_exam_creates_for_mpc_and_cec(client, seeded):
    """Scenario 4: Sanskrit (M-SAN / C-SAN) is creatable where configured."""
    from app.tests.conftest import auth as _auth

    for email, branch, klass in [
        ("faculty.mpc1@demo.edu", "MPC", "MPC-I-A"),
        ("faculty.cec1@demo.edu", "CEC", "CEC-I-A"),
    ]:
        tok = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": DEMO_PASSWORD},
        ).json()["access_token"]
        sanskrit = client.get(
            "/api/v1/meta/subjects",
            params={"branch_id": seeded["branch_ids"][branch]},
            headers=_auth(tok),
        ).json()
        san = next(s for s in sanskrit if s["code"].endswith("-SAN"))
        r = client.post(
            "/api/v1/examinations",
            json={
                "title": f"{klass} Sanskrit UT",
                "class_section_id": seeded["class_ids"][klass],
                "subject_id": san["id"],
                "exam_type": "unit_test",
                "max_marks": "50",
                "pass_marks": "17",
            },
            headers=_auth(tok),
        )
        assert r.status_code == 201, f"{email}: {r.text}"
        assert r.json()["subject_code"] == san["code"]


def test_invalid_class_subject_combinations_rejected(client, tokens, seeded):
    """Scenario 5: unassigned pair → 403; unknown ids → 404/422;
    cross-branch subject → rejected (never created)."""
    # Unassigned (class, subject) pair for this faculty: BiPC Botany (id 3)
    # on MPC-I-A.
    r = client.post(
        "/api/v1/examinations",
        json={"title": "Cross Branch", "class_section_id": 1, "subject_id": 3,
              "max_marks": "50", "pass_marks": "17"},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN"

    # Unknown class id.
    r = client.post(
        "/api/v1/examinations",
        json={"title": "Ghost Class", "class_section_id": 999999,
              "subject_id": 1, "max_marks": "50", "pass_marks": "17"},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 403  # faculty pair gate fires before existence

    # Unknown subject id (faculty path → 403 pair gate; nothing created).
    before = len(client.get("/api/v1/examinations",
                            headers=auth(tokens["faculty"])).json())
    r = client.post(
        "/api/v1/examinations",
        json={"title": "Ghost Subject", "class_section_id": 1,
              "subject_id": 999999, "max_marks": "50", "pass_marks": "17"},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 403
    after = len(client.get("/api/v1/examinations",
                           headers=auth(tokens["faculty"])).json())
    assert after == before  # failed creates never persist anything


def test_unauthorized_faculty_cannot_create_unassigned_subject(client, seeded):
    """Scenario 6: same branch, but not this faculty's assigned subject."""
    tok_b = client.post(
        "/api/v1/auth/login",
        json={"email": "faculty.bipc2@demo.edu", "password": DEMO_PASSWORD},
    ).json()["access_token"]
    # bipc2 is assigned BiPC-II-A subjects; BiPC-I-A is out of scope.
    bipc1 = seeded["class_ids"]["BiPC-I-A"]
    zoo = seeded["subject_ids"]["B-ZOO"]
    r = client.post(
        "/api/v1/examinations",
        json={"title": "Sibling Year Tamper", "class_section_id": bipc1,
              "subject_id": zoo, "max_marks": "50", "pass_marks": "17"},
        headers=auth(tok_b),
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN"


def test_curriculum_validation_for_unrestricted_staff(client, tokens, seeded):
    """Scope-unrestricted results:write holders still cannot pair a subject
    with another stream's class (server-side curriculum check)."""
    from app.core.errors import AppError
    from app.permissions.deps import AuthContext
    from app.services.examinations import ensure_may_manage

    db = SessionLocal()
    try:
        unrestricted = AuthContext(
            user_id=1, email="examcell@test.edu", full_name="Exam Cell",
            roles=frozenset({"staff"}), permissions=frozenset({"results:write"}),
            is_active=True,
        )
        # Valid combination passes.
        ensure_may_manage(
            db, unrestricted,
            seeded["class_ids"]["MPC-I-A"], seeded["subject_ids"]["M-MAT"],
        )
        # BiPC subject on an MPC class → curriculum error.
        with pytest.raises(AppError) as exc:
            ensure_may_manage(
                db, unrestricted,
                seeded["class_ids"]["MPC-I-A"], seeded["subject_ids"]["B-BOT"],
            )
        assert exc.value.status_code == 422
        assert exc.value.code == "SUBJECT_NOT_IN_CURRICULUM"
        # Unknown ids rejected.
        with pytest.raises(AppError) as exc:
            ensure_may_manage(db, unrestricted, 999999, seeded["subject_ids"]["M-MAT"])
        assert exc.value.status_code == 404
        with pytest.raises(AppError) as exc:
            ensure_may_manage(db, unrestricted, seeded["class_ids"]["MPC-I-A"], 999999)
        assert exc.value.status_code == 422
        assert exc.value.code == "INVALID_SUBJECT"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Save results: edit, duplicate-safety, no-publish, atomic failure
# ---------------------------------------------------------------------------


def _mk_exam(client, tokens, *, title: str, subject_id: int = 1,
             class_id: int = 1, max_marks: str = "50") -> dict:
    r = client.post(
        "/api/v1/examinations",
        json={"title": title, "class_section_id": class_id,
              "subject_id": subject_id, "exam_type": "unit_test",
              "max_marks": max_marks, "pass_marks": "17"},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_save_edit_and_duplicate_requests(client, tokens):
    """Scenarios 7, 8, 15: save, edit in place, repeat request = no dupes."""
    exam = _mk_exam(client, tokens, title="Save Edit UT")
    exam_id = exam["id"]
    roster = client.get(
        f"/api/v1/examinations/{exam_id}", headers=auth(tokens["faculty"])
    ).json()["roster"]

    payload = {"results": [
        {"student_id": s["student_id"], "marks_obtained": "33",
         "is_absent": False, "remarks": "good"}
        for s in roster
    ]}
    r = client.put(f"/api/v1/examinations/{exam_id}/results",
                   json=payload, headers=auth(tokens["faculty"]))
    assert r.status_code == 200, r.text
    assert r.json()["entered"] == len(roster)

    # Edit one mark in place — still one row per student.
    payload["results"][0]["marks_obtained"] = "45.5"
    payload["results"][0]["remarks"] = "improved"
    r = client.put(f"/api/v1/examinations/{exam_id}/results",
                   json=payload, headers=auth(tokens["faculty"]))
    assert r.status_code == 200
    assert r.json()["entered"] == len(roster)  # unchanged count

    # Duplicate request (double-click) — idempotent, no extra rows.
    r = client.put(f"/api/v1/examinations/{exam_id}/results",
                   json=payload, headers=auth(tokens["faculty"]))
    assert r.status_code == 200
    assert r.json()["entered"] == len(roster)

    detail = client.get(
        f"/api/v1/examinations/{exam_id}", headers=auth(tokens["faculty"])
    ).json()
    row = next(x for x in detail["roster"]
               if x["student_id"] == payload["results"][0]["student_id"])
    assert row["marks_obtained"] == "45.50"
    assert row["remarks"] == "improved"


def test_marks_validation_negative_and_above_max(client, tokens):
    """Scenarios 9, 10: negative and over-max marks are rejected."""
    exam = _mk_exam(client, tokens, title="Range UT")
    exam_id = exam["id"]
    roster = client.get(
        f"/api/v1/examinations/{exam_id}", headers=auth(tokens["faculty"])
    ).json()["roster"]

    # Negative → 422 (schema-level, ge=0).
    r = client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json={"results": [{"student_id": roster[0]["student_id"],
                           "marks_obtained": "-1"}]},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 422

    # Above max (50) → 422 MARKS_OUT_OF_RANGE.
    r = client.put(
        f"/api/v1/examinations/{exam_id}/results",
        json={"results": [{"student_id": roster[0]["student_id"],
                           "marks_obtained": "50.5"}]},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "MARKS_OUT_OF_RANGE"

    # Nothing was written by the rejected requests.
    detail = client.get(
        f"/api/v1/examinations/{exam_id}", headers=auth(tokens["faculty"])
    ).json()
    assert detail["examination"]["entered"] == 0


def test_absent_handling_and_save_does_not_publish(client, tokens):
    """Scenarios 12, 13: absent rows are stored/masked; save ≠ publish."""
    exam = _mk_exam(client, tokens, title="Absent UT")
    exam_id = exam["id"]
    roster = client.get(
        f"/api/v1/examinations/{exam_id}", headers=auth(tokens["faculty"])
    ).json()["roster"]

    payload = {"results": [
        {"student_id": roster[0]["student_id"], "marks_obtained": None,
         "is_absent": True, "remarks": "medical"},
        {"student_id": roster[1]["student_id"], "marks_obtained": "41",
         "is_absent": False, "remarks": None},
    ]}
    r = client.put(f"/api/v1/examinations/{exam_id}/results",
                   json=payload, headers=auth(tokens["faculty"]))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["saved"] == 2
    assert body["status"] == "draft"  # saving never publishes

    detail = client.get(
        f"/api/v1/examinations/{exam_id}", headers=auth(tokens["faculty"])
    ).json()
    absent_row = next(x for x in detail["roster"]
                      if x["student_id"] == roster[0]["student_id"])
    assert absent_row["is_absent"] is True
    assert absent_row["marks_obtained"] is None  # masked, not 0

    # Exam list still shows draft → hidden from parents.
    listed = client.get("/api/v1/examinations",
                        params={"status": "draft"},
                        headers=auth(tokens["faculty"])).json()
    assert any(e["id"] == exam_id and e["status"] == "draft" for e in listed)


def test_failed_batch_rolls_back_completely(client, tokens):
    """Scenario 16: one bad row fails the whole batch with a clear error
    and leaves previously saved data intact (no partial corruption)."""
    exam = _mk_exam(client, tokens, title="Atomic UT")
    exam_id = exam["id"]
    roster = client.get(
        f"/api/v1/examinations/{exam_id}", headers=auth(tokens["faculty"])
    ).json()["roster"]

    # Save a valid baseline first.
    base = {"results": [
        {"student_id": s["student_id"], "marks_obtained": "20",
         "is_absent": False, "remarks": None}
        for s in roster
    ]}
    r = client.put(f"/api/v1/examinations/{exam_id}/results",
                   json=base, headers=auth(tokens["faculty"]))
    assert r.status_code == 200
    assert r.json()["entered"] == len(roster)

    # Now a batch with ONE bad row (out of range) → whole batch rejected.
    bad = {"results": [
        {"student_id": roster[0]["student_id"], "marks_obtained": "999",
         "is_absent": False, "remarks": None},
        {"student_id": roster[1]["student_id"], "marks_obtained": "10",
         "is_absent": False, "remarks": None},
    ]}
    r = client.put(f"/api/v1/examinations/{exam_id}/results",
                   json=bad, headers=auth(tokens["faculty"]))
    assert r.status_code == 422
    assert "error" in r.json()

    # The earlier valid data survived untouched; the bad batch wrote nothing.
    detail = client.get(
        f"/api/v1/examinations/{exam_id}", headers=auth(tokens["faculty"])
    ).json()
    marks = {x["student_id"]: x["marks_obtained"] for x in detail["roster"]}
    assert marks[roster[0]["student_id"]] == "20.00"
    assert marks[roster[1]["student_id"]] == "20.00"
    assert detail["examination"]["entered"] == len(roster)
