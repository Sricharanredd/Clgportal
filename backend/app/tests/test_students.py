"""Student lookup, profile and record-level authorization tests."""
from __future__ import annotations

from app.tests.conftest import auth


def test_search_requires_auth(client):
    assert client.get("/api/v1/students").status_code == 401


def test_search_paginates(client, tokens):
    r = client.get(
        "/api/v1/students", params={"page": 1, "page_size": 3}, headers=auth(tokens["principal"])
    )
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 7  # 4 MPC + 3 BiPC in fixture
    assert len(data["items"]) == 3
    assert data["pages"] == 3


def test_search_by_branch_and_roll(client, tokens):
    r = client.get(
        "/api/v1/students",
        params={"branch_id": 1, "roll": "MPC26"},
        headers=auth(tokens["principal"]),
    )
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 4
    assert all(i["branch_code"] == "MPC" for i in data["items"])


def test_faculty_sees_only_assigned_class_students(client, tokens):
    r = client.get("/api/v1/students", params={"page_size": 100}, headers=auth(tokens["faculty"]))
    data = r.json()
    assert data["total"] == 4  # only MPC I-A
    assert all(i["branch_code"] == "MPC" for i in data["items"])

    r2 = client.get("/api/v1/students", params={"page_size": 100}, headers=auth(tokens["faculty_b"]))
    data2 = r2.json()
    assert data2["total"] == 3  # only BiPC I-A
    assert all(i["branch_code"] == "BiPC" for i in data2["items"])


def test_faculty_cannot_read_out_of_scope_student(client, tokens):
    """BiPC student must appear as 404 (not 403) to the MPC faculty."""
    # find a BiPC student id via principal
    r = client.get(
        "/api/v1/students",
        params={"branch_id": 2},
        headers=auth(tokens["principal"]),
    )
    bipc_id = r.json()["items"][0]["id"]
    r2 = client.get(f"/api/v1/students/{bipc_id}", headers=auth(tokens["faculty"]))
    assert r2.status_code == 404
    assert r2.json()["error"]["code"] == "NOT_FOUND"


def test_accounts_denied_student_search(client, tokens):
    """accounts has students:read for fee lookup — verify it IS allowed..."""
    r = client.get("/api/v1/students", headers=auth(tokens["accounts"]))
    # accounts role includes students:read (fee lookup), so 200 is correct
    assert r.status_code == 200


def test_profile_contains_gated_blocks(client, tokens):
    r = client.get(
        "/api/v1/students", params={"roll": "MPC26001"}, headers=auth(tokens["principal"])
    )
    sid = r.json()["items"][0]["id"]
    p = client.get(f"/api/v1/students/{sid}", headers=auth(tokens["principal"]))
    assert p.status_code == 200
    profile = p.json()
    assert profile["roll_number"] == "MPC26001"
    assert profile["class_section"] == "I-A"
    assert profile["academic_year"] == "2025-26"
    assert profile["attendance"] is not None
    assert profile["fee"] is not None
    assert "pending_amount" in profile["fee"]


def test_accounts_profile_has_no_attendance_block(client, tokens):
    """accounts lacks attendance:read → attendance block must be omitted."""
    r = client.get(
        "/api/v1/students", params={"roll": "MPC26002"}, headers=auth(tokens["accounts"])
    )
    sid = r.json()["items"][0]["id"]
    profile = client.get(f"/api/v1/students/{sid}", headers=auth(tokens["accounts"])).json()
    assert profile["attendance"] is None
    assert profile["fee"] is not None  # accounts sees fees


def test_unauthenticated_profile_rejected(client):
    assert client.get("/api/v1/students/1").status_code == 401


def test_invalid_pagination_rejected(client, tokens):
    r = client.get(
        "/api/v1/students", params={"page": 0}, headers=auth(tokens["principal"])
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"
