"""Open parent portal (DEMO MODE) — flag gating and read-only guarantees.

The `/parent/demo/*` surface only exists for client demos. These tests pin the
two safety properties that make it acceptable:

1. With `demo_open_parent=false` every route 404s (production default).
2. Every route is a GET. There is no way to mutate fees, attendance or marks
   through the open portal, and staff-only fields (payment recorder, internal
   announcement author) are never serialized.
"""
from __future__ import annotations

from app.core.config import get_settings


def _flag(monkeypatch, value: bool) -> None:
    monkeypatch.setattr(get_settings(), "demo_open_parent", value)


def test_demo_routes_hidden_when_flag_off(client, monkeypatch):
    _flag(monkeypatch, False)
    for path in (
        "/api/v1/parent/demo/students",
        "/api/v1/parent/demo/students/1",
        "/api/v1/parent/demo/students/1/fees",
        "/api/v1/parent/demo/announcements",
    ):
        r = client.get(path)
        assert r.status_code == 404, path
        assert r.json()["error"]["code"] == "NOT_FOUND"


def test_demo_directory_lists_all_students(client, monkeypatch):
    _flag(monkeypatch, True)
    r = client.get(
        "/api/v1/parent/demo/students", params={"page_size": 50}
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total"] == 7  # 4 MPC + 3 BiPC in the shared fixture
    assert data["pages"] == 1
    assert len(data["items"]) == 7

    item = data["items"][0]
    # Minimal directory payload: no DOB, contacts, guardian or fee data.
    assert set(item) == {
        "student_id",
        "roll_number",
        "full_name",
        "branch_id",
        "branch_code",
        "branch_name",
        "class_section",
        "academic_year",
        "status",
    }
    assert item["class_section"] == "I-A"
    assert item["academic_year"] == "2025-26"


def test_demo_directory_search_and_branch_filter(client, monkeypatch):
    _flag(monkeypatch, True)

    by_roll = client.get(
        "/api/v1/parent/demo/students", params={"q": "MPC26001"}
    ).json()
    assert by_roll["total"] == 1
    assert by_roll["items"][0]["roll_number"] == "MPC26001"

    by_name = client.get(
        "/api/v1/parent/demo/students", params={"q": "Stu2"}
    ).json()
    assert by_name["total"] >= 2

    bipc = client.get(
        "/api/v1/parent/demo/students", params={"branch_id": 2, "page_size": 50}
    ).json()
    assert bipc["total"] == 3
    assert all(i["branch_code"] == "BiPC" for i in bipc["items"])

    # LIKE wildcards are escaped: "%" is a literal, not "match everything".
    wildcard = client.get(
        "/api/v1/parent/demo/students", params={"q": "%"}
    ).json()
    assert wildcard["total"] == 0


def test_demo_directory_paginates(client, monkeypatch):
    _flag(monkeypatch, True)
    first = client.get(
        "/api/v1/parent/demo/students", params={"page": 1, "page_size": 3}
    ).json()
    second = client.get(
        "/api/v1/parent/demo/students", params={"page": 2, "page_size": 3}
    ).json()
    assert first["total"] == 7
    assert first["pages"] == 3
    assert len(first["items"]) == 3
    assert len(second["items"]) == 3
    # Page 3 holds the remaining student.
    third = client.get(
        "/api/v1/parent/demo/students", params={"page": 3, "page_size": 3}
    ).json()
    assert len(third["items"]) == 1


def test_demo_profile_is_read_only(client, monkeypatch):
    _flag(monkeypatch, True)
    directory = client.get(
        "/api/v1/parent/demo/students", params={"q": "MPC26001"}
    ).json()
    sid = directory["items"][0]["student_id"]

    profile = client.get(f"/api/v1/parent/demo/students/{sid}")
    assert profile.status_code == 200, profile.text
    body = profile.json()
    assert body["roll_number"] == "MPC26001"
    assert body["attendance"] is not None
    assert body["fee"] is not None

    assert client.get(
        f"/api/v1/parent/demo/students/{sid}/attendance"
    ).status_code == 200
    assert client.get(
        f"/api/v1/parent/demo/students/{sid}/attendance/history"
    ).status_code == 200
    assert client.get(
        f"/api/v1/parent/demo/students/{sid}/results"
    ).status_code == 200

    fees = client.get(f"/api/v1/parent/demo/students/{sid}/fees")
    assert fees.status_code == 200, fees.text
    payload = fees.json()
    assert payload["obligations"]
    assert all(o["can_record_payment"] is False for o in payload["obligations"])
    # Payment history is readable but the recording staff member is stripped.
    assert all(p["recorded_by_name"] is None for p in payload["payments"])


def test_demo_missing_student_returns_404(client, monkeypatch):
    _flag(monkeypatch, True)
    assert client.get("/api/v1/parent/demo/students/999999").status_code == 404
    assert (
        client.get("/api/v1/parent/demo/students/999999/fees").status_code == 404
    )


def test_demo_has_no_write_routes(client, monkeypatch):
    _flag(monkeypatch, True)
    sid = client.get(
        "/api/v1/parent/demo/students", params={"page_size": 1}
    ).json()["items"][0]["student_id"]

    # There is no POST/PUT/PATCH/DELETE handler on the open surface at all.
    for method, path in (
        ("post", "/api/v1/parent/demo/students"),
        ("post", f"/api/v1/parent/demo/students/{sid}/fees"),
        ("put", f"/api/v1/parent/demo/students/{sid}"),
        ("delete", f"/api/v1/parent/demo/students/{sid}"),
    ):
        r = getattr(client, method)(path)
        assert r.status_code == 405, (method, path, r.status_code)


def test_demo_announcements_are_parent_audience_only(client, monkeypatch):
    _flag(monkeypatch, True)
    r = client.get("/api/v1/parent/demo/announcements")
    assert r.status_code == 200, r.text
    data = r.json()
    assert all(a["audience"] in {"parents", "all"} for a in data["items"])
    # Author identity is staff-only information.
    assert all(a["created_by_name"] is None for a in data["items"])
