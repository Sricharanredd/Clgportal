"""Attendance workflow tests: assignment, enrolment, submission, roles."""
from __future__ import annotations

from datetime import date, timedelta

from app.tests.conftest import auth


def _past_weekday() -> str:
    d = date.today() - timedelta(days=30)
    while d.weekday() == 6:
        d -= timedelta(days=1)
    return d.isoformat()


def _roster(client, token: str, class_id: int, day: str) -> dict:
    r = client.get(
        "/api/v1/attendance/roster",
        params={"class_id": class_id, "date": day},
        headers=auth(token),
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_roster_requires_permission(client, tokens):
    r = client.get(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": "2025-10-01"},
        headers=auth(tokens["accounts"]),
    )
    assert r.status_code == 403  # accounts has no attendance:read


def test_faculty_cannot_open_foreign_class(client, tokens):
    day = _past_weekday()
    # faculty is assigned class 1 (MPC I-A); class 2 (BiPC I-A) → 403
    r = client.get(
        "/api/v1/attendance/roster",
        params={"class_id": 2, "date": day},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN"


def test_future_date_rejected(client, tokens):
    future = (date.today() + timedelta(days=3)).isoformat()
    r = client.get(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": future},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "FUTURE_DATE"


def test_full_save_and_submit_flow(client, tokens):
    day = _past_weekday()
    detail = _roster(client, tokens["faculty"], 1, day)
    assert detail["summary"]["roster_size"] == 4
    assert detail["status"] == "not_started"

    # submit before marking → 409 INCOMPLETE
    r = client.post(
        "/api/v1/attendance/submit",
        params={"class_id": 1, "date": day},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "INCOMPLETE"

    # unknown student → 422 NOT_ENROLLED
    r = client.put(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": day},
        json={"records": [{"student_id": 9999, "status": "present"}]},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "NOT_ENROLLED"

    # invalid status → 422 validation error
    r = client.put(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": day},
        json={"records": [{"student_id": detail["roster"][0]["student_id"],
                           "status": "maybe"}]},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"

    # mark all, then submit
    records = [
        {"student_id": s["student_id"], "status": "present" if i % 3 else "absent"}
        for i, s in enumerate(detail["roster"])
    ]
    r = client.put(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": day},
        json={"records": records},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 200
    assert r.json()["marked"] == 4

    r = client.post(
        "/api/v1/attendance/submit",
        params={"class_id": 1, "date": day},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "submitted"

    # resubmit → 409
    r = client.post(
        "/api/v1/attendance/submit",
        params={"class_id": 1, "date": day},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "ALREADY_SUBMITTED"

    # faculty cannot modify submitted session → 409 SESSION_SUBMITTED
    r = client.put(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": day},
        json={"records": [{"student_id": records[0]["student_id"], "status": "late"}]},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "SESSION_SUBMITTED"

    # principal with attendance:correct may correct it
    r = client.put(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": day},
        json={"records": [{"student_id": records[0]["student_id"], "status": "late"}]},
        headers=auth(tokens["principal"]),
    )
    assert r.status_code == 200

    # duplicate ids in one request → 409 DUPLICATE_RECORD
    r = client.put(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": day},
        json={"records": [
            {"student_id": records[0]["student_id"], "status": "present"},
            {"student_id": records[0]["student_id"], "status": "absent"},
        ]},
        headers=auth(tokens["principal"]),
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "DUPLICATE_RECORD"


def test_accounts_cannot_mark_attendance(client, tokens):
    day = _past_weekday()
    r = client.put(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": day},
        json={"records": [{"student_id": 1, "status": "present"}]},
        headers=auth(tokens["accounts"]),
    )
    assert r.status_code == 403


def test_session_list_scope(client, tokens):
    r = client.get("/api/v1/attendance/sessions", headers=auth(tokens["faculty_b"]))
    assert r.status_code == 200
    # BiPC faculty only sees BiPC sessions
    assert all(s["branch_code"] == "BiPC" for s in r.json())
