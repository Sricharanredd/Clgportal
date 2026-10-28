"""Parent lookup & verification tests (public flow + read-only rules)."""
from __future__ import annotations

import uuid
from datetime import date, timedelta

from app.tests.conftest import auth


def _parent_session(client, roll: str = "MPC26001", code: str | None = None) -> dict:
    """Full lookup→verify flow; returns the session payload."""
    lookup = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": 1, "roll_number": roll},
    ).json()
    verify = client.post(
        "/api/v1/parent/verify",
        json={
            "lookup_token": lookup["lookup_token"],
            "access_code": code if code is not None else f"CODE-{roll}",
        },
    )
    assert verify.status_code == 200, verify.text
    return verify.json()

def test_lookup_returns_masked_identity_only(client):
    r = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": 1, "roll_number": "MPC26001"},
    )
    assert r.status_code == 200
    data = r.json()
    student = data["student"]
    # masking: full name must not be present
    assert "***" in student["masked_name"]
    assert "Stu1" not in student["masked_name"]
    assert data["verification_required"] is True
    assert data["lookup_token"]


def test_lookup_wrong_roll_404(client):
    r = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": 1, "roll_number": "NOPE999"},
    )
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NO_STUDENT"


def test_lookup_wrong_branch_404(client):
    """Roll exists in MPC but branch says BiPC → no match."""
    r = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": 2, "roll_number": "MPC26001"},
    )
    assert r.status_code == 404


def test_verify_wrong_code_401(client):
    lookup = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": 1, "roll_number": "MPC26001"},
    ).json()
    r = client.post(
        "/api/v1/parent/verify",
        json={"lookup_token": lookup["lookup_token"], "access_code": "WRONG-CODE"},
    )
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_ACCESS_CODE"


def test_verify_garbage_token_401(client):
    r = client.post(
        "/api/v1/parent/verify",
        json={"lookup_token": "x" * 30, "access_code": "CODE-MPC26001"},
    )
    assert r.status_code == 401


def test_verified_session_reads_child(client):
    lookup = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": 1, "roll_number": "MPC26001"},
    ).json()
    verify = client.post(
        "/api/v1/parent/verify",
        json={"lookup_token": lookup["lookup_token"],
              "access_code": "CODE-MPC26001"},
    ).json()
    assert verify["parent_name"] == "Parent 1"
    assert len(verify["children"]) == 1
    headers = {"Authorization": f"Bearer {verify['access_token']}"}
    sid = verify["children"][0]["student_id"]

    profile = client.get(
        f"/api/v1/parent/students/{sid}/profile", headers=headers
    )
    assert profile.status_code == 200
    p = profile.json()
    assert p["roll_number"] == "MPC26001"
    assert p["attendance"] is not None
    assert p["fee"] is not None

    # children listing
    kids = client.get("/api/v1/parent/children", headers=headers)
    assert kids.status_code == 200
    assert len(kids.json()) == 1


def test_parent_cannot_read_unlinked_student(client):
    lookup = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": 1, "roll_number": "MPC26001"},
    ).json()
    verify = client.post(
        "/api/v1/parent/verify",
        json={"lookup_token": lookup["lookup_token"],
              "access_code": "CODE-MPC26001"},
    ).json()
    headers = {"Authorization": f"Bearer {verify['access_token']}"}

    # another family's student (MPC26002) → 404, existence not leaked
    other = client.get("/api/v1/students", params={"roll": "MPC26002"},
                       headers=auth(verify["access_token"])).status_code
    assert other == 403  # parents cannot use staff search at all

    r = client.get("/api/v1/parent/students/2/profile", headers=headers)
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


def test_parent_denied_all_staff_endpoints(client):
    lookup = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": 1, "roll_number": "MPC26001"},
    ).json()
    verify = client.post(
        "/api/v1/parent/verify",
        json={"lookup_token": lookup["lookup_token"],
              "access_code": "CODE-MPC26001"},
    ).json()
    h = {"Authorization": f"Bearer {verify['access_token']}"}
    for path in [
        "/api/v1/students",
        "/api/v1/dashboard/principal",
        "/api/v1/dashboard/accounts",
        "/api/v1/attendance/sessions",
        "/api/v1/examinations",
        "/api/v1/fees/summary",
        "/api/v1/fees/payments",
    ]:
        r = client.get(path, headers=h)
        assert r.status_code in (401, 403), f"{path} leaked to parent: {r.status_code}"

    # announcements:read IS part of the parent permission set (by design)
    r = client.get("/api/v1/announcements", headers=h)
    assert r.status_code == 200
    assert "items" in r.json()


def test_parent_lookup_invalid_payload(client):
    r = client.post(
        "/api/v1/parent/lookup", json={"branch_id": 1, "roll_number": "x"}
    )
    assert r.status_code == 422  # min_length=2
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# Access-code policy (production vs explicitly-configured demo mode)
# ---------------------------------------------------------------------------


def test_verify_empty_or_short_code_rejected_in_production(client):
    """Production policy: blank/short codes fail with the same generic 401."""
    lookup = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": 1, "roll_number": "MPC26001"},
    ).json()
    for bad in ["", "abc"]:
        r = client.post(
            "/api/v1/parent/verify",
            json={"lookup_token": lookup["lookup_token"], "access_code": bad},
        )
        assert r.status_code == 401, bad
        assert r.json()["error"]["code"] == "INVALID_CODE"


def test_demo_mode_skips_access_code(client, monkeypatch):
    """Demo policy (PARENT_VERIFICATION_ENABLED=false): no code needed, but
    authorization is unchanged — still limited to linked students."""
    from app.api.v1 import parent as parent_api

    monkeypatch.setattr(parent_api.settings, "parent_verification_enabled", False)

    lookup = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": 1, "roll_number": "MPC26001"},
    ).json()
    assert lookup["verification_required"] is False
    assert "Demo mode" in lookup["hint"]

    verify = client.post(
        "/api/v1/parent/verify",
        json={"lookup_token": lookup["lookup_token"], "access_code": ""},
    )
    assert verify.status_code == 200, verify.text
    session = verify.json()
    h = {"Authorization": f"Bearer {session['access_token']}"}
    sid = session["children"][0]["student_id"]

    # linked child readable
    assert client.get(
        f"/api/v1/parent/students/{sid}/profile", headers=h
    ).status_code == 200
    # unlinked student still 404 — demo mode grants no extra data access
    r = client.get("/api/v1/parent/students/2/profile", headers=h)
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Attendance history (new parent endpoint)
# ---------------------------------------------------------------------------


def _past_weekday(days_ago: int) -> str:
    d = date.today() - timedelta(days=days_ago)
    while d.weekday() == 6:
        d -= timedelta(days=1)
    return d.isoformat()


def test_attendance_history_submitted_only(client, tokens):
    """History shows submitted sessions only; drafts never appear; the rows
    and the summary totals are internally consistent."""
    session = _parent_session(client)
    h = {"Authorization": f"Bearer {session['access_token']}"}
    sid = session["children"][0]["student_id"]

    submitted_day = _past_weekday(35)
    draft_day = _past_weekday(36)

    # Faculty marks + submits a full roster on submitted_day.
    roster = client.get(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": submitted_day},
        headers=auth(tokens["faculty"]),
    ).json()
    records = [
        {"student_id": s["student_id"], "status": "present"}
        for s in roster["roster"]
    ]
    r = client.put(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": submitted_day},
        json={"records": records},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 200
    r = client.post(
        "/api/v1/attendance/submit",
        params={"class_id": 1, "date": submitted_day},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 200

    # A DRAFT session on draft_day (saved, not submitted) must stay invisible.
    r = client.put(
        "/api/v1/attendance/roster",
        params={"class_id": 1, "date": draft_day},
        json={"records": [{"student_id": sid, "status": "absent"}]},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 200

    hist = client.get(
        f"/api/v1/parent/students/{sid}/attendance/history", headers=h
    )
    assert hist.status_code == 200, hist.text
    rows = hist.json()
    dates = [row["attendance_date"] for row in rows]
    assert submitted_day in dates
    assert draft_day not in dates, "draft session leaked into parent history!"

    summary = client.get(
        f"/api/v1/parent/students/{sid}/attendance", headers=h
    ).json()
    # Internally consistent: one submitted record per history row.
    assert len(rows) == summary["total_sessions"]
    assert (
        summary["present"] + summary["absent"] + summary["late"]
        == summary["total_sessions"]
    )
    assert summary["attendance_pct"] == round(
        (summary["present"] + summary["late"]) / summary["total_sessions"] * 100, 1
    )


def test_attendance_history_authorization(client):
    session = _parent_session(client)
    h = {"Authorization": f"Bearer {session['access_token']}"}
    # unlinked student → 404 (existence not leaked)
    r = client.get("/api/v1/parent/students/2/attendance/history", headers=h)
    assert r.status_code == 404
    # staff tokens are not parent sessions
    assert client.get("/api/v1/parent/students/1/attendance/history").status_code == 401


# ---------------------------------------------------------------------------
# Fee payment history reuse (shared fees endpoint, parent scope)
# ---------------------------------------------------------------------------


def test_parent_reads_payment_history_with_receipts(client, tokens):
    import uuid as _uuid

    # Accounts records a payment for MPC26001's obligation.
    r = client.get(
        "/api/v1/students", params={"roll": "MPC26001"},
        headers=auth(tokens["accounts"]),
    )
    sid = r.json()["items"][0]["id"]
    fees = client.get(
        f"/api/v1/fees/students/{sid}", headers=auth(tokens["accounts"])
    ).json()
    ob_id = fees["obligations"][0]["id"]
    r = client.post(
        "/api/v1/fees/payments",
        json={"obligation_id": ob_id, "amount": "750.00", "method": "cash",
              "idempotency_key": str(_uuid.uuid4())},
        headers=auth(tokens["accounts"]),
    )
    assert r.status_code == 201, r.text
    receipt = r.json()["receipt_number"]

    # The linked parent sees the same history read-only.
    session = _parent_session(client)
    h = {"Authorization": f"Bearer {session['access_token']}"}
    r = client.get(f"/api/v1/fees/students/{sid}", headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert any(p["receipt_number"] == receipt for p in data["payments"])
    assert all(o["can_record_payment"] is False for o in data["obligations"])

    # …and remains unable to record payments.
    r = client.post(
        "/api/v1/fees/payments",
        json={"obligation_id": ob_id, "amount": "1.00", "method": "cash",
              "idempotency_key": str(_uuid.uuid4())},
        headers=h,
    )
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Announcements audience filter used by the parent portal tab
# ---------------------------------------------------------------------------


def test_parent_announcements_filtered_by_audience(client, tokens):
    client.post(
        "/api/v1/announcements",
        json={"title": "Staff-only notice", "body": "Internal staff text",
              "audience": "staff"},
        headers=auth(tokens["principal"]),
    )
    client.post(
        "/api/v1/announcements",
        json={"title": "Parents notice", "body": "Parent text",
              "audience": "parents"},
        headers=auth(tokens["principal"]),
    )

    session = _parent_session(client)
    h = {"Authorization": f"Bearer {session['access_token']}"}
    r = client.get(
        "/api/v1/announcements", params={"audience": "parents"}, headers=h
    )
    assert r.status_code == 200
    audiences = {a["audience"] for a in r.json()["items"]}
    assert audiences <= {"parents", "all"}
    titles = {a["title"] for a in r.json()["items"]}
    assert "Parents notice" in titles
    assert "Staff-only notice" not in titles


# ---------------------------------------------------------------------------
# Public name search (/parent/search) — discovery aid, masked + capped
# ---------------------------------------------------------------------------


def test_name_search_returns_masked_candidates(client):
    """Partial, case-insensitive, trimmed; masked name; no student_id/PII."""
    r = client.post(
        "/api/v1/parent/search", json={"name": "  stu1  "}  # trimmed + partial
    )
    assert r.status_code == 200, r.text
    rows = r.json()
    assert rows, "expected at least one Stu1"
    # MPC has Stu1 Mpc and BiPC has Stu1 Bipc → both branches may appear.
    for row in rows:
        assert set(row) == {
            "branch_id",
            "roll_number",
            "masked_name",
            "branch_code",
            "class_section",
        }, f"unexpected keys: {row.keys()}"
        assert "***" in row["masked_name"]
        # No full name or student id leaked.
        assert "Stu" not in row["masked_name"]
    rolls = {row["roll_number"] for row in rows}
    assert "MPC26001" in rolls


def test_name_search_branch_filter_narrows(client):
    r = client.post(
        "/api/v1/parent/search", json={"name": "stu", "branch_id": 1}
    )
    assert r.status_code == 200
    rows = r.json()
    assert rows
    assert all(row["branch_id"] == 1 for row in rows)
    assert all(row["roll_number"].startswith("MPC") for row in rows)


def test_name_search_is_capped(client):
    """Never loads the whole table — result count is hard-capped."""
    r = client.post("/api/v1/parent/search", json={"name": "stu"})
    assert r.status_code == 200
    assert len(r.json()) <= 10


def test_name_search_wildcards_are_escaped(client):
    """'%' / '_' are literal, not LIKE wildcards (no mass match)."""
    # 2 chars so it clears the schema min-length, but after escaping it can
    # only match a literal "%_" name — which does not exist → 404, not all.
    r = client.post("/api/v1/parent/search", json={"name": "%_"})
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NO_STUDENT"


def test_name_search_no_match_404(client):
    r = client.post(
        "/api/v1/parent/search", json={"name": "Zzz Not A Real Name"}
    )
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NO_STUDENT"


def test_name_search_rejects_short_or_blank(client):
    for bad in [{"name": ""}, {"name": "   "}, {"name": "a"}]:
        r = client.post("/api/v1/parent/search", json=bad)
        assert r.status_code == 422, bad
        assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_name_search_grants_no_access_by_itself(client):
    """Discovery only: the result carries no token and no session. A caller
    must still pass /lookup → /verify (access code in production)."""
    r = client.post("/api/v1/parent/search", json={"name": "Stu1", "branch_id": 1})
    assert r.status_code == 200
    row = r.json()[0]
    # The response must NOT contain anything usable as a credential.
    assert "lookup_token" not in row
    assert "access_token" not in row
    # And no parent read endpoint works without a verified session.
    denied = client.get("/api/v1/parent/children")
    assert denied.status_code == 401


def test_name_search_then_lookup_still_requires_code(client, monkeypatch):
    """Selecting a name result routes through /lookup, so production
    verification is enforced even when the entry point was a name search."""
    from app.api.v1 import parent as parent_api

    # Production mode: verification enabled (conftest default).
    assert parent_api.settings.parent_verification_enabled is True

    # Pick the candidate the way the UI does, then run the normal lookup.
    search = client.post(
        "/api/v1/parent/search", json={"name": "Stu1", "branch_id": 1}
    ).json()
    picked = search[0]
    lookup = client.post(
        "/api/v1/parent/lookup",
        json={"branch_id": picked["branch_id"], "roll_number": picked["roll_number"]},
    ).json()
    assert lookup["verification_required"] is True

    # Empty access code → 401 even though we arrived via name search.
    r = client.post(
        "/api/v1/parent/verify",
        json={"lookup_token": lookup["lookup_token"], "access_code": ""},
    )
    assert r.status_code == 401
