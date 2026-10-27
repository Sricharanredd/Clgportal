# Architecture

## 1. System overview

```
┌──────────────────────────────┐        ┌─────────────────────────────────┐
│  React SPA (Vite dev :5173)  │  /api  │  FastAPI (:8000)                │
│  staff client  ─────────────┼──proxy─▶  routers → services → models    │
│  parent client (isolated)    │        │  AuthContext / permission gates │
└──────────────────────────────┘        └───────────────┬─────────────────┘
        ▲  HttpOnly refresh cookie                      │ SQLAlchemy 2.x
        │  (same-origin via Vite proxy)                 ▼
                                          MySQL 8  (cmp_portal / cmp_portal_test)
```

Two independently runnable apps. The frontend never talks to MySQL; the
backend never trusts the frontend for authorization.

## 2. Backend

### 2.1 Layering

| Layer | Location | Responsibility |
|---|---|---|
| Routers | `app/api/v1/*` | HTTP shape: status codes, query/path params, response models, permission dependencies |
| Services | `app/services/*` | Business rules: session states, publish gating, money transactions, audit writes |
| Models | `app/models/*` | SQLAlchemy 2.x `Mapped` columns, FKs, constraints |
| Schemas | `app/schemas/*` | Pydantic contracts (request validation + response serialization, Decimal-as-string money) |
| Permissions | `app/permissions/*` | `AuthContext`, `get_current_user`, `require_permission`, role map import |
| Core | `app/core/*` | Settings (pydantic-settings), engine/session, security (JWT, Argon2), enums incl. `ROLE_PERMISSIONS` |

Routers stay thin — a route authorizes, delegates to a service, and shapes the
response. Services raise `AppError(status, code, message)`; a global handler
renders the error envelope.

### 2.2 Request pipeline

1. Middleware assigns/propagates a **request ID** and logs
   `method path → status (ms) rid=...`.
2. Route dependency `get_current_user` validates the bearer JWT → `AuthContext`
   (user id, role, permission set, branch scope).
3. Permission gate (`require_permission("results:publish")` etc.) or
   record-scope check inside the service.
4. Service executes business logic in a transaction; audit rows are written in
   the *same* transaction as the mutation they describe.
5. Response model serializes; money is emitted as strings (`"36000.00"`).

### 2.3 Error envelope

Every non-2xx response:

```json
{"error": {"code": "RESULTS_PUBLISHED", "message": "…", "details": [], "request_id": "e2e5ba53dc14"}}
```

`details` carries field-level validation messages (e.g.
`results.5.marks_obtained`). Clients key UI messaging off `code`.

## 3. Authentication & session design

```
POST /auth/login ──▶ access token (JWT, 30 min, in-memory client-side)
                  └─▶ Set-Cookie refresh_token (HttpOnly, SameSite=Lax, 7 d)

GET  /anything ── 401 ─▶ POST /auth/refresh (cookie) ─▶ new access token
                                   │ single-use: row rotated, old token revoked
                                   └ reuse of an old token ⇒ revoke family

POST /auth/logout ─▶ revoke refresh row + clear cookie
```

- **Access token** carries only identity claims; permissions are resolved from
  the DB (`user_roles` → `role_permissions`) on each request so a role change
  takes effect immediately.
- **Refresh tokens** are opaque, stored in `refresh_tokens`, hashed, rotated on
  every use. Logout/rotation is transactional.
- The SPA keeps the access token in a React context (memory). Reload → silent
  refresh via cookie → `/auth/me`. Two axios instances:
  - `client.ts` (staff): interceptors for single-flight refresh;
  - `parentClient.ts`: **no** refresh, no shared state — a parent 401 just
    restarts the lookup flow.

## 4. Authorization model

`ROLE_PERMISSIONS` in `app/core/enums.py` is the single source of truth,
synced into `role_permissions` at seed time.

| Permission family | Principal | Accounts | Faculty | Parent/Student |
|---|---|---|---|---|
| `students:read` (+scoped) | ✔ branch | ✔ branch | ✔ own classes | `read_own` |
| `attendance:read/write` | read | — | own classes | `read_own` |
| `attendance:correct` | ✔ | — | — | — |
| `examinations:read/write` | read | — | own subjects | — |
| `results:publish` | ✔ | — | — | — |
| `results:read` | ✔ branch | — | own | `read_own` (published only) |
| `fees:read`, `payments:read` | ✔ | ✔ | — | `read_own` |
| `payments:write`, `fees:audit` | — | ✔ | — | — |
| `announcements:read` | ✔ | ✔ | ✔ | ✔ |
| `announcements:write` | ✔ | — | — | — |
| `staff:*` | ✔ | — | — | — |

Two scopes compose: **role permission** (can this role do X?) then **record
scope** (may this caller touch *this* row?). Record scope is enforced in
services via the caller's branch/class assignments. For parent/student
contexts, an out-of-scope record is a **404**, preventing ID probing.

## 5. Data design (summary — full detail in DATABASE_SCHEMA.md)

- Academic core: `branches`, `academic_years`, `class_sections`, `subjects`,
  `enrollments`, `faculty_assignments`.
- Identity: `users`, `roles`, `user_roles`, `role_permissions`,
  `refresh_tokens`, `parents`, `student_parent_links`, `faculty_profiles`.
- Operations: `attendance_sessions` + `attendance_records`,
  `examinations` + `exam_results`.
- Money: `fee_structures` → `student_fee_obligations` → `payments` (append-only)
  + `fee_audit_logs` (append-only).
- Comms: `announcements`. Logs: `activity_logs`. Ref: `timetable_entries`.

Key invariants:

- `payments.idempotency_key` UNIQUE — replay-safe recording.
- Reversal = new negative `payments` rows + audit; nothing is UPDATEd or
  DELETEd in the money path.
- `exam_results` rows exist only for entered (or absent) students — "entered"
  counts are honest.
- Money columns are `NUMERIC/DECIMAL`; Python uses `decimal.Decimal` only.

## 6. State machines

**Attendance session:** `draft → submitted` (submit requires every roster
student marked). Submitted sessions are read-only except for
`attendance:correct` (principal), which flips them back for editing and
re-submitting; edits are audited.

**Examination:** `draft → published ⇄ (reopen) draft`. Publish requires full
mark coverage; published exams reject entry (409) until the principal reopens.

**Payment:** `completed → reversed` (append-only compensating rows; status is
derived, not destructive).

## 7. Frontend

### 7.1 Structure

```
src/app        App shell, AuthContext, route tree with RequireAuth/RequirePermission
src/layouts    AppLayout — permission-filtered sidebar (collapses < md), topbar, sign-out
src/pages      auth | dashboard (4 role views + MonthlyChart) | students |
               attendance | fees | results | announcements | parent
src/shared/api axios clients + full response typings
src/shared/lib ₹ / date formatters
```

### 7.2 Data flow

- Route guard mounts → page fetches via typed client → loading/error/empty
  states are explicit components (`States.tsx`).
- Permission-filtered nav is UX only; a hand-typed URL still hits server 403,
  rendered as a friendly "not permitted" panel.
- Forms use React Hook Form + Zod mirrors of the server constraints.
- The attendance page keeps roster state locally and PUTs the **whole roster**
  (blank = not entered); the fees page generates one idempotency key per
  payment attempt and holds it until success so retries can't double-charge.

### 7.3 Design system (Prism Glass)

- Background gradient: peach `#F9DCCB` → lavender `#DCCFF5` → periwinkle
  `#AAA0E8`; porcelain `#F9F7FC` surfaces at ~70 % opacity with backdrop blur.
- Ink `#302744`, muted `#81788F`, violet `#7960AD` accents, rose `#C58DB8`
  destructive, sage `#5D9C7D` success.
- Focus-visible rings on every interactive element; AA contrast on text;
  responsive down to 360 px.

## 8. Testing strategy

- `conftest.py` drops/creates `cmp_portal_test`, runs migrations, seeds
  reference + demo data, and raises the login rate limit via env before app
  import.
- TestClient (in-process, no network) against the test DB; fixtures mint one
  token per role.
- Coverage targets: auth (incl. refresh rotation + logout), permission matrix,
  record scope, attendance state machine, exam publish gating + parent
  visibility, payment idempotency + reversal + audit, validation failures.
- Frontend: `tsc --noEmit` + `vite build` as the gate (no browser test
  runner in this delivery).

## 9. Operations

- `/healthz` liveness with a DB connectivity check (`{"status": "ok|degraded", "db": "ok|error"}`), structured access logs with request IDs.
- Alembic for all schema change; seed CLI idempotent-ish (safe to re-run
  reference data).
- Dev: uvicorn `--reload` + Vite proxy. Prod notes: serve the built SPA from a
  static host with the same-origin `/api` reverse proxy, terminate TLS, set
  `JWT_SECRET`/`DATABASE_URL` via env, `SAMESITE=lax` cookies over HTTPS.
