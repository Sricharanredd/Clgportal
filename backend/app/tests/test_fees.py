"""Fee workflow tests: recording, idempotency, overpayment, reversal,
audit history and role restrictions."""
from __future__ import annotations

import uuid

from app.tests.conftest import auth


def _student_id(client, token: str, roll: str) -> int:
    r = client.get(
        "/api/v1/students", params={"roll": roll}, headers=auth(token)
    )
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert items, f"no student {roll}"
    return items[0]["id"]


def _obligation(client, token: str, roll: str) -> dict:
    sid = _student_id(client, token, roll)
    r = client.get(f"/api/v1/fees/students/{sid}", headers=auth(token))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["obligations"], "missing obligation"
    return data


def test_fee_summary_roles(client, tokens):
    r = client.get("/api/v1/fees/summary", headers=auth(tokens["accounts"]))
    assert r.status_code == 200
    s = r.json()
    assert s["total_billed"] == "76000.00"  # 4*10000 + 3*12000
    assert s["total_outstanding"] == "76000.00"  # nothing paid in fixture

    # faculty has no fees:read
    assert client.get(
        "/api/v1/fees/summary", headers=auth(tokens["faculty"])
    ).status_code == 403
    # principal does (read-only overview)
    assert client.get(
        "/api/v1/fees/summary", headers=auth(tokens["principal"])
    ).status_code == 200


def test_student_fee_view(client, tokens):
    data = _obligation(client, tokens["accounts"], "MPC26001")
    ob = data["obligations"][0]
    assert ob["total_amount"] == "10000.00"
    assert ob["paid_amount"] == "0.00"
    assert ob["pending_amount"] == "10000.00"
    assert ob["can_record_payment"] is True
    assert data["payments"] == []


def test_record_payment_and_audit(client, tokens):
    data = _obligation(client, tokens["accounts"], "MPC26001")
    ob_id = data["obligations"][0]["id"]

    r = client.post(
        "/api/v1/fees/payments",
        json={
            "obligation_id": ob_id,
            "amount": "2500.00",
            "method": "upi",
            "reference": "UPI-TEST-1",
            "reason": "First installment",
            "idempotency_key": str(uuid.uuid4()),
        },
        headers=auth(tokens["accounts"]),
    )
    assert r.status_code == 201, r.text
    payment = r.json()
    assert payment["amount"] == "2500.00"
    assert payment["receipt_number"].startswith("RCP-")
    assert payment["status"] == "completed"

    # obligation updated
    data2 = _obligation(client, tokens["accounts"], "MPC26001")
    ob2 = next(o for o in data2["obligations"] if o["id"] == ob_id)
    assert ob2["paid_amount"] == "2500.00"
    assert ob2["pending_amount"] == "7500.00"

    # audit row written in the same transaction
    audit = client.get(
        "/api/v1/fees/audit",
        params={"student_id": _student_id(client, tokens["accounts"], "MPC26001")},
        headers=auth(tokens["accounts"]),
    ).json()
    rows = [a for a in audit["items"] if a["operation"] == "payment_recorded"]
    assert rows, "audit log missing payment_recorded row"
    assert rows[0]["previous_value"] == "0.00"
    assert rows[0]["new_value"] == "2500.00"
    assert rows[0]["amount"] == "2500.00"
    assert rows[0]["actor_name"] == "Test Accounts"


def test_duplicate_submission_is_idempotent(client, tokens):
    """Same idempotency_key twice ⇒ one payment, original receipt returned."""
    data = _obligation(client, tokens["accounts"], "MPC26002")
    ob_id = data["obligations"][0]["id"]
    key = str(uuid.uuid4())
    body = {
        "obligation_id": ob_id,
        "amount": "1000.00",
        "method": "cash",
        "idempotency_key": key,
    }
    first = client.post("/api/v1/fees/payments", json=body, headers=auth(tokens["accounts"]))
    assert first.status_code == 201
    second = client.post("/api/v1/fees/payments", json=body, headers=auth(tokens["accounts"]))
    assert second.status_code == 200  # replay, not a new row
    assert second.json()["receipt_number"] == first.json()["receipt_number"]

    # paid amount must NOT be double-counted
    data2 = _obligation(client, tokens["accounts"], "MPC26002")
    ob2 = next(o for o in data2["obligations"] if o["id"] == ob_id)
    assert ob2["paid_amount"] == "1000.00"


def test_overpayment_rejected(client, tokens):
    data = _obligation(client, tokens["accounts"], "MPC26003")
    ob_id = data["obligations"][0]["id"]
    r = client.post(
        "/api/v1/fees/payments",
        json={"obligation_id": ob_id, "amount": "999999.00",
              "method": "cash", "idempotency_key": str(uuid.uuid4())},
        headers=auth(tokens["accounts"]),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "OVERPAYMENT"


def test_non_positive_amount_rejected(client, tokens):
    data = _obligation(client, tokens["accounts"], "MPC26003")
    r = client.post(
        "/api/v1/fees/payments",
        json={"obligation_id": data["obligations"][0]["id"], "amount": "-5.00",
              "method": "cash", "idempotency_key": str(uuid.uuid4())},
        headers=auth(tokens["accounts"]),
    )
    assert r.status_code == 422  # pydantic gt=0


def test_faculty_cannot_record_payment(client, tokens):
    data = _obligation(client, tokens["accounts"], "MPC26004")
    r = client.post(
        "/api/v1/fees/payments",
        json={"obligation_id": data["obligations"][0]["id"], "amount": "100.00",
              "method": "cash", "idempotency_key": str(uuid.uuid4())},
        headers=auth(tokens["faculty"]),
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN"


def test_faculty_cannot_read_audit(client, tokens):
    r = client.get("/api/v1/fees/audit", headers=auth(tokens["faculty"]))
    assert r.status_code == 403


def test_reversal_appends_and_audits(client, tokens):
    """Corrections never overwrite: negative row + status flip + audit."""
    data = _obligation(client, tokens["accounts"], "MPC26001")
    ob_id = data["obligations"][0]["id"]
    created = client.post(
        "/api/v1/fees/payments",
        json={"obligation_id": ob_id, "amount": "500.00", "method": "cash",
              "idempotency_key": str(uuid.uuid4())},
        headers=auth(tokens["accounts"]),
    )
    assert created.status_code == 201
    pid = created.json()["id"]

    # reason shorter than 5 chars → 422 (schema validation)
    r = client.post(
        f"/api/v1/fees/payments/{pid}/reverse",
        json={"reason": "ab"},
        headers=auth(tokens["accounts"]),
    )
    assert r.status_code == 422

    r = client.post(
        f"/api/v1/fees/payments/{pid}/reverse",
        json={"reason": "Wrong amount entered by operator"},
        headers=auth(tokens["accounts"]),
    )
    assert r.status_code == 200, r.text
    rev = r.json()
    assert rev["amount"] == "-500.00"
    assert rev["reversal_of_payment_id"] == pid
    assert rev["receipt_number"].startswith("REV-")

    # original marked reversed (history preserved, not deleted)
    data2 = _obligation(client, tokens["accounts"], "MPC26001")
    original = next(p for p in data2["payments"] if p["id"] == pid)
    assert original["status"] == "reversed"

    # balance unchanged by the add-then-reverse pair
    # (baseline 2500 from test_record_payment_and_audit + 500 − 500 = 2500)
    ob2 = next(o for o in data2["obligations"] if o["id"] == ob_id)
    assert ob2["paid_amount"] == "2500.00"

    # audit row for reversal with reason
    audit = client.get(
        "/api/v1/fees/audit",
        params={"student_id": _student_id(client, tokens["accounts"], "MPC26001")},
        headers=auth(tokens["accounts"]),
    ).json()
    revs = [a for a in audit["items"] if a["operation"] == "reversal_recorded"]
    assert revs and "Wrong amount" in (revs[0]["reason"] or "")

    # double reversal → 409
    r = client.post(
        f"/api/v1/fees/payments/{pid}/reverse",
        json={"reason": "trying again please"},
        headers=auth(tokens["accounts"]),
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "ALREADY_REVERSED"

    # reversal cannot be reversed
    r = client.post(
        f"/api/v1/fees/payments/{rev['id']}/reverse",
        json={"reason": "reverse the reversal"},
        headers=auth(tokens["accounts"]),
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "IS_REVERSAL"


def test_payment_history_pagination(client, tokens):
    r = client.get(
        "/api/v1/fees/payments",
        params={"page": 1, "page_size": 2},
        headers=auth(tokens["accounts"]),
    )
    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) <= 2
    assert data["page"] == 1
    assert data["total"] >= 2


def test_parent_cannot_record_payment(client, tokens):
    """Read-only principals have no payment endpoints available."""
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
    sid = verify["children"][0]["student_id"]
    # parent CAN view own fee summary (fees:read_own)
    assert client.get(f"/api/v1/fees/students/{sid}", headers=headers).status_code == 200
    # but cannot record payments (no payments:write)
    r = client.post(
        "/api/v1/fees/payments",
        json={"obligation_id": 1, "amount": "10.00", "method": "cash",
              "idempotency_key": str(uuid.uuid4())},
        headers=headers,
    )
    assert r.status_code == 403
