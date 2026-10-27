# Intermediate College Management Portal

A full-stack portal for intermediate (+2) colleges: student records, daily
attendance, examinations with publish-gated results, fee collections with an
immutable audit trail, and a self-service read-only parent portal.

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + React Router + Axios + Recharts + React Hook Form + Zod + Lucide
**Backend:** FastAPI + Pydantic + SQLAlchemy 2.x + Alembic + MySQL 8 (PyMySQL) + JWT + Argon2 + pytest
**Design:** Prism Glass — frosted-glass panels over a peach→lavender→periwinkle gradient, plum ink, sage success, accessible focus rings.

---

## Quick start

### Prerequisites

- Python 3.12+, Node 18+, MySQL 8 running on `localhost:3306`

### 1. Database

```sql
CREATE DATABASE cmp_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cmp_app'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON cmp_portal.* TO 'cmp_app'@'localhost';
```

### 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# configure (never commit real values)
Copy-Item .env.example .env   # then edit DB_PASSWORD / JWT_SECRET

# create schema + seed demo data
alembic upgrade head
python -m app.seed            # add --reset to wipe and re-seed

# run
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- API root: `http://127.0.0.1:8000/api/v1`
- OpenAPI docs: `http://127.0.0.1:8000/docs`
- Health: `GET /healthz`

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173  (proxies /api → 127.0.0.1:8000)
```

The Vite dev proxy keeps `/api` same-origin so the HttpOnly refresh cookie works
without CORS complications.

### 4. Tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest      # 56 tests, uses an isolated cmp_portal_test DB
```

Tests recreate `cmp_portal_test` (drop → create → migrate → seed) per run and
raise the login rate limit via env var. They never touch `cmp_portal`.

---

## Demo accounts

Seeded password for every account: **`Demo@1234`**

| Role | Email | Can do |
|---|---|---|
| Principal | `principal@demo.edu` | Read everything scoped, correct attendance, publish/reopen results, view fee audit, manage staff, publish announcements |
| Accounts | `admin@demo.edu` / `accounts@demo.edu` | Fee overview, record payments, reverse with reason, audit trail, students read, announcements |
| Faculty (MPC) | `faculty.mpc@demo.edu` | Own classes: attendance save/submit, exam creation + marks entry, students |
| Faculty (BiPC) | `faculty.bipc@demo.edu` | Same, scoped to BiPC |
| Parent | *(no login)* | `/parent` → branch + roll number (e.g. `MPC25001`) → access code `DEMO-<roll>` |

Parent portal uses a **separate, isolated session**: no staff tokens, no
refresh flow, and 401 simply restarts the lookup.

---

## Project layout

```
backend/
  app/
    main.py               FastAPI app, middleware, error envelope
    core/                 config, database, security (JWT/Argon2), enums + role permission map
    models/               SQLAlchemy 2.x models (26 domain tables)
    schemas/              Pydantic request/response contracts
    api/v1/               routers: auth, meta, students, attendance,
                          examinations, fees, announcements, parent, dashboards
    services/             business logic (attendance, examinations, fees, ...)
    permissions/          AuthContext + dependency gates
    seeding/              demo + reference data seeding
    alembic/              migrations (head: 798735034693)
    tests/                pytest suite (56 tests)
frontend/
  src/
    app/                  App shell, AuthContext, route tree, guards
    layouts/              AppLayout (responsive sidebar/topbar, permission-filtered nav)
    pages/                auth, dashboard, students, attendance, fees,
                          results, announcements, parent
    shared/api/           axios clients (staff `client.ts` + isolated `parentClient.ts`), types
    shared/lib/           formatters (₹, dates)
docs/
  PRD.md                  product requirements as delivered
  ARCHITECTURE.md         system design, auth/RBAC, security posture
  API_SPECIFICATION.md    every endpoint with params, payloads, errors
  DATABASE_SCHEMA.md      all 26 tables with keys and relations
```

---

## Status: implemented vs mocked vs planned

### Implemented and verified (Stages 1–5)

- **Auth:** login/logout/refresh/me. 30-minute JWT access token held in memory
  only; HttpOnly `SameSite=Lax` refresh cookie with server-side rotation
  (single-use refresh tokens, reuse detection). Silent single-flight refresh in
  the axios interceptor. Login rate-limited (5/min dev). Generic 401 for bad
  credentials.
- **RBAC:** permission strings in `ROLE_PERMISSIONS` (single source of truth,
  synced to DB). Server-side enforcement on every route; the UI only hides
  what the server would reject.
- **Students:** paginated listing with search/filters, detail view with
  attendance summary, results, and fee blocks gated by role.
- **Attendance:** class-scoped session list, roster marking (present/absent/late
  + remarks), save draft → submit, submit locks the session, principals with
  `attendance:correct` may edit submitted sessions.
- **Examinations:** scoped exam list, marks entry (whole roster, blank rows are
  "not entered", absent stored as AB), publish/reopen by principal. Unpublished
  results are hidden from parents/students at the API level.
- **Fees:** per-student obligations, Decimal money end-to-end, payment recording
  with a client-held idempotency key (replays return the original receipt),
  reversal appends compensating negative rows with a mandatory reason (≥ 5
  chars), full audit trail with before → after deltas, actor, and reason — all
  in one transaction.
- **Announcements:** audience-scoped list (all / students / parents / staff),
  publish for authorized roles.
- **Parent portal:** branch + roll lookup → access-code verification →
  profile/attendance/results/fees/announcements tabs. Identity masked until
  verified; only *their* children; only published results.
- **Dashboards:** four role-specific views (principal, accounts, faculty,
  admin) with real aggregates and a monthly collections chart.
- **Audit & observability:** structured access logs with request IDs; error
  envelope `{"error": {code, message, details, request_id}}` on every failure;
  `fee_audit_logs` for all money movements; `activity_logs` for auth events.

### Mocked / simulated (by design for this scope)

- **Fee payment gateway:** payments are recorded server-side (cash/UPI/cheque/
  bank/card as *methods*), not routed to a real PSP. The idempotency contract is
  implemented as if a gateway existed.
- **SMS/email delivery:** announcements are stored and displayed in-portal only.
  No outbound channel is wired.
- **Parent access codes:** generated deterministically in dev
  (`DEMO-<roll_number>`); a production build would issue random codes, deliver
  them out-of-band, and expire them.
- **File uploads / photographs:** student records are text-only.
- **Timetable & subjects CRUD:** `timetable_entries` and `subjects` tables
  exist and are seeded; there is no management UI yet (read-only references).

### Planned / not yet built

- Fee receipts as printable PDFs; concession workflows.
- Bulk CSV import for students; report cards as PDF.
- Student self-service login (the `student` role and `*_read_own` permissions
  are already modelled — only the login channel is missing).
- Notification channels (email/SMS) for announcements and fee reminders.
- Production hardening: refresh-token absolute expiry + device tracking UI,
  Prometheus metrics, DB replication, backups runbook.

---

## Security notes

- Secrets live in `.env` (git-ignored). `.env.example` documents the shape.
- Refresh tokens are stored server-side, rotated on every use, and revoked on
  logout; stolen-cookie reuse is detectable.
- Parents/students can never read other students: invisible records return
  **404**, not 403, so IDs can't be probed.
- Money columns are `DECIMAL(10,2)`/`NUMERIC`; no floats anywhere in the path.
- All money mutations are transactional and append-only in `fee_audit_logs`
  (reversal = compensating entries, never destructive UPDATE).
- Unpublished exam results are filtered server-side for parent/student APIs —
  the UI gating is UX only.
