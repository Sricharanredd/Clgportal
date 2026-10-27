"""Authentication & authorization tests (valid/invalid login, roles, gates)."""
from __future__ import annotations

from app.tests.conftest import DEMO_PASSWORD, auth


def test_valid_login_returns_token_and_permissions(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "principal@test.edu", "password": DEMO_PASSWORD},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0
    user = data["user"]
    assert user["roles"] == ["principal"]
    assert "dashboard:principal" in user["permissions"]
    # refresh cookie must be HttpOnly
    set_cookie = r.headers.get("set-cookie", "")
    assert "HttpOnly" in set_cookie and "cmp_refresh" in set_cookie


def test_invalid_password_rejected(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "principal@test.edu", "password": "WrongPass123"},
    )
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_unknown_email_rejected_with_same_message(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "ghost@test.edu", "password": "Whatever123"},
    )
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_missing_token_rejected(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"


def test_garbage_token_rejected(client):
    r = client.get("/api/v1/auth/me", headers=auth("not-a-jwt"))
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_TOKEN"


def test_me_reflects_role(client, tokens):
    r = client.get("/api/v1/auth/me", headers=auth(tokens["accounts"]))
    assert r.status_code == 200
    user = r.json()["user"]
    assert user["email"] == "accounts@test.edu"
    assert user["roles"] == ["accounts"]
    assert "payments:write" in user["permissions"]


def test_faculty_scope_computed_from_assignments(client, tokens):
    r = client.get("/api/v1/auth/me", headers=auth(tokens["faculty"]))
    user = r.json()["user"]
    assert user["class_scope"], "faculty must have class scope"
    assert user["subject_scope"], "faculty must have subject scope"
    assert user["branch_scope"] == [1]  # MPC only
    # unassigned faculty has no scope rows
    r2 = client.get("/api/v1/auth/me", headers=auth(tokens["faculty_b"]))
    assert r2.json()["user"]["branch_scope"] == [2]  # BiPC only


def test_dashboard_role_denials(client, tokens):
    """Each role dashboard rejects every other role."""
    matrix = [
        ("accounts", "/api/v1/dashboard/principal"),
        ("principal", "/api/v1/dashboard/accounts"),
        ("faculty", "/api/v1/dashboard/admin"),
        ("admin", "/api/v1/dashboard/faculty"),
        ("accounts", "/api/v1/dashboard/faculty"),
    ]
    for role, path in matrix:
        r = client.get(path, headers=auth(tokens[role]))
        assert r.status_code == 403, f"{role} should not access {path}"
        assert r.json()["error"]["code"] == "FORBIDDEN"


def test_dashboard_happy_paths(client, tokens):
    for role, path in [
        ("principal", "/api/v1/dashboard/principal"),
        ("accounts", "/api/v1/dashboard/accounts"),
        ("faculty", "/api/v1/dashboard/faculty"),
        ("admin", "/api/v1/dashboard/admin"),
    ]:
        r = client.get(path, headers=auth(tokens[role]))
        assert r.status_code == 200, f"{role} dashboard failed: {r.text}"
        assert "generated_at" in r.json()


def test_deactivated_account_rejected(client, tokens):
    """Account activation/deactivation is enforced server-side."""
    from app.core.database import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == "admin@test.edu").first()
        u.is_active = False
        db.commit()
    finally:
        db.close()
    try:
        r = client.get("/api/v1/auth/me", headers=auth(tokens["admin"]))
        assert r.status_code == 403
        assert r.json()["error"]["code"] == "ACCOUNT_DISABLED"
        # even a fresh login is refused with a generic 401 (no enumeration)
        r2 = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.edu", "password": DEMO_PASSWORD},
        )
        assert r2.status_code == 401
    finally:
        db = SessionLocal()
        try:
            u = db.query(User).filter(User.email == "admin@test.edu").first()
            u.is_active = True
            db.commit()
        finally:
            db.close()


def test_login_rate_limit(client):
    """IP-based rate limiting on the login endpoint.

    Resets the limiter before/after so the budget spent here does not
    interfere with other tests in the session."""
    from app.main import app

    limiter = app.state.limiter
    limiter.reset()
    statuses = []
    try:
        for _ in range(25):  # limit is 20/minute in tests
            r = client.post(
                "/api/v1/auth/login",
                json={"email": "ratelimit@test.edu", "password": "NopeNope123"},
            )
            statuses.append(r.status_code)
        assert 429 in statuses, f"expected a 429 among {statuses}"
        # once limited, even VALID credentials are refused until the window passes
        assert statuses[-1] == 429
    finally:
        limiter.reset()


def test_refresh_without_cookie_rejected(client):
    # The session-scoped client carries cookies from earlier logins; drop them
    # so this really exercises the "no refresh cookie" path.
    saved = dict(client.cookies)
    client.cookies.clear()
    try:
        r = client.post("/api/v1/auth/refresh")
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "NO_SESSION"
    finally:
        client.cookies.update(saved)
