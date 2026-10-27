"""Parent lookup & verification tests (public flow + read-only rules)."""
from __future__ import annotations

from app.tests.conftest import auth


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
