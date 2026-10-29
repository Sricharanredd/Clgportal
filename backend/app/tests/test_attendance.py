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


# --- direct submission (no draft required) -----------------------------------
# Fixed past weekdays no other test writes sessions on:
#   test_attendance  → today-30, 2025-10-01 (no write)
#   test_parent      → today-35 / today-36
#   test_faculty_scope → 2025-09-15
DIRECT_DAY = "2025-09-08"
VALIDATION_DAY = "2025-09-09"


def _records_for(detail: dict) -> list[dict]:
    return [
        {"student_id": s["student_id"], "status": "absent" if i % 3 == 0 else "present"}
        for i, s in enumerate(detail["roster"])
    ]


def _submit(client, token: str, class_id: int, day: str, records: list[dict]):
    return client.post(
        "/api/v1/attendance/submit",
        params={"class_id": class_id, "date": day},
        json={"records": records},
        headers=auth(token),
    )


def test_direct_submit_without_draft_saves_and_submits(client, tokens):
    """Submit carries the marks itself: no prior Save draft is required."""
    detail = _roster(client, tokens["faculty"], 1, DIRECT_DAY)
    assert detail["status"] == "not_started"

    records = _records_for(detail)
    r = _submit(client, tokens["faculty"], 1, DIRECT_DAY, records)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "submitted"
    assert body["roster_size"] == len(records)
    assert body["marked"] == len(records)
    assert body["submitted_at"] is not None

    # Refresh loads the saved attendance from the backend.
    detail = _roster(client, tokens["faculty"], 1, DIRECT_DAY)
    assert detail["status"] == "submitted"
    assert detail["summary"]["marked"] == len(records)
    saved = {
        s["student_id"]: s["status"] for s in detail["roster"] if s["status"] is not None
    }
    assert saved == {rec["student_id"]: rec["status"] for rec in records}

    # Duplicate submission for the same class + date is rejected.
    r = _submit(client, tokens["faculty"], 1, DIRECT_DAY, records)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "ALREADY_SUBMITTED"


def test_direct_submit_incomplete_rejected_and_persists_nothing(client, tokens):
    """A payload missing one student is rejected with no partial write."""
    detail = _roster(client, tokens["faculty_b"], 2, DIRECT_DAY)
    assert detail["status"] == "not_started"

    records = _records_for(detail)[:-1]  # drop the last student → incomplete
    r = _submit(client, tokens["faculty_b"], 2, DIRECT_DAY, records)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "INCOMPLETE"

    # Nothing was written: no session, no marks.
    detail = _roster(client, tokens["faculty_b"], 2, DIRECT_DAY)
    assert detail["status"] == "not_started"
    assert detail["summary"]["marked"] == 0


def test_direct_submit_payload_validation_writes_nothing(client, tokens):
    """Bad payloads are rejected during validation — before any DB write."""
    detail = _roster(client, tokens["faculty"], 1, VALIDATION_DAY)
    assert detail["status"] == "not_started"
    records = _records_for(detail)

    # unknown student → 422 NOT_ENROLLED
    r = _submit(
        client, tokens["faculty"], 1, VALIDATION_DAY,
        records + [{"student_id": 99999, "status": "present"}],
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "NOT_ENROLLED"

    # duplicate ids in one payload → 409 DUPLICATE_RECORD
    r = _submit(client, tokens["faculty"], 1, VALIDATION_DAY, records + [records[0]])
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "DUPLICATE_RECORD"

    # invalid status → 422 VALIDATION_ERROR (schema-level)
    r = client.post(
        "/api/v1/attendance/submit",
        params={"class_id": 1, "date": VALIDATION_DAY},
        json={"records": [{"student_id": records[0]["student_id"], "status": "maybe"}]},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"

    # still not started — failed validation never writes
    detail = _roster(client, tokens["faculty"], 1, VALIDATION_DAY)
    assert detail["status"] == "not_started"
    assert detail["summary"]["marked"] == 0
