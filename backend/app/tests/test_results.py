"""Examination & result tests: scope, validation, publish gating,
unpublished-result visibility rules."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from app.tests.conftest import auth


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
