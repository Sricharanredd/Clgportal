# API Specification

Base URL: `/api/v1` · Interactive docs: `GET /docs` (OpenAPI 3, generated from
code — this document is the human-readable contract).

## Conventions

**Auth.** Staff endpoints require `Authorization: Bearer <access_token>`
(30-min JWT). Parent endpoints use the parent access token minted by
`POST /parent/verify` (no cookie refresh — re-verify instead). Refresh itself
uses the HttpOnly `refresh_token` cookie, not a header.

**Money.** All amounts are Decimal serialized as strings: `"36000.00"`. Never
parse to float.

**Pagination.** `?page=1&page_size=20` (page_size capped server-side). List
responses:

```json
{"items": [...], "page": 1, "page_size": 20, "total": 62, "pages": 4}
```

**Errors.** Every non-2xx body:

```json
{"error": {"code": "MARKS_OUT_OF_RANGE", "message": "…", "details": [{"field": "…", "message": "…"}], "request_id": "bc46338ece93"}}
```

Common codes: `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404),
`VALIDATION_ERROR` (422), `RATE_LIMITED` (429), plus domain codes noted per
endpoint.

**Visibility rule.** For parent/student contexts, records outside the caller's
scope return **404** (not 403) to prevent ID probing.

---

## Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/healthz` | public | Liveness + DB connectivity. `200 {"status": "ok", "db": "ok"}` (or `degraded`/`error`); root-level, not under `/api/v1` |

## Meta (reference data)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/meta/branches` | **public** | `[{id, code, name}]` active branches — needed pre-login for parent lookup |
| GET | `/meta/academic-years` | staff | Academic years, newest first |
| GET | `/meta/classes` | staff | Class sections with branch labels |
| GET | `/meta/subjects` | staff | Subjects with codes |

## Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | Rate-limited (5/min dev) |
| POST | `/auth/refresh` | cookie | Rotates the refresh token |
| POST | `/auth/logout` | cookie/bearer | Revokes refresh token, clears cookie |
| GET | `/auth/me` | bearer | Current user + role + permissions |

**POST /auth/login**

```jsonc
// request
{"email": "accounts@demo.edu", "password": "Demo@1234"}
// 200
{"access_token": "…", "token_type": "bearer", "expires_in": 1800,
 "user": {"id": 4, "full_name": "Sushma Reddy", "email": "…", "role": "accounts", "permissions": ["fees:read", "..."]}}
// also sets: Set-Cookie refresh_token=…; HttpOnly; SameSite=Lax
```

Bad credentials → **401** with generic message (no enumeration). Exceeding the
rate limit → **429 RATE_LIMITED**.

**POST /auth/refresh** → new access token + rotated cookie. Reusing a spent
token revokes the family and returns 401.

**GET /auth/me** → the `user` object above (200), 401 if the token is
expired/invalid.

## Dashboards

Role-specific; each returns its own aggregate shape. Calling another role's
dashboard → 403.

| Method | Path | Permission | Highlights |
|---|---|---|---|
| GET | `/dashboard/principal` | `dashboard:principal` | Enrollment by branch, attendance today, fee totals, exams pending publish |
| GET | `/dashboard/accounts` | `dashboard:accounts` | Billed/collected/outstanding, today's collections, monthly series (chart), recent payments |
| GET | `/dashboard/faculty` | `dashboard:faculty` | Assigned classes, sessions this month, exams pending entry |
| GET | `/dashboard/admin` | `dashboard:admin` | User/staff counts, reference-data health |

## Students

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/students` | `students:read` | Paginated. Query: `branch_id`, `roll`, `name`, `page`, `page_size`. Faculty scope: own classes |
| GET | `/students/{id}` | `students:read` | Profile + class + attendance summary; results/fees blocks present but role-gated fields omitted |

Out-of-scope student id → 404.

## Attendance

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/attendance/sessions` | `attendance:read` | Scoped session list (faculty: own classes; principal: branch) |
| GET | `/attendance/roster` | `attendance:read` | Query `class_id` + `date` → session state + roster with current marks |
| PUT | `/attendance/roster` | `attendance:write` | Query `class_id` + `date`; body `{"records": [{student_id, status, remarks?}]}` — saves/updates a **draft** |
| POST | `/attendance/submit` | `attendance:write` | Query `class_id` + `date`; locks the session |

`status` ∈ `present | absent | late`.

Errors: `409 INCOMPLETE` (unmarked students — checked before missing-session),
`409 ALREADY_SUBMITTED` (submitted sessions are read-only; principals with
`attendance:correct` may edit), `422` validation, `404` (class not in scope).

## Examinations & results

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/examinations` | `examinations:read` | Query `branch_id`, `class_id`, `subject_id`, `status`. Faculty: assigned only |
| POST | `/examinations` | `examinations:write` | Create draft exam (faculty, own class+subject) |
| GET | `/examinations/{id}` | `examinations:read` | Exam + full roster (`can_edit` flag) |
| PUT | `/examinations/{id}/results` | `examinations:write` | Save marks for the roster |
| POST | `/examinations/{id}/publish` | `results:publish` (principal) | draft/entered → published |
| POST | `/examinations/{id}/reopen` | `results:publish` (principal) | published → draft for corrections |

**POST /examinations** (faculty)

```jsonc
{"title": "Unit Test 2", "class_section_id": 25, "subject_id": 49,
 "exam_type": "unit_test", "exam_date": "2026-11-05",
 "max_marks": "50.00", "pass_marks": "17.00"}
// 201 → exam object (status "draft")
```

Errors: `409 DUPLICATE_EXAMINATION` (same title+class+subject),
`422 INVALID_MARKS` (pass > max or out of range), `403` (foreign subject/class).

**PUT /examinations/{id}/results** — submit the whole roster; blanks are legal:

```jsonc
{"results": [
  {"student_id": 125, "marks_obtained": "42",    "is_absent": false, "remarks": null},
  {"student_id": 126, "marks_obtained": "30.00", "is_absent": false, "remarks": null},
  {"student_id": 127, "marks_obtained": null,    "is_absent": false, "remarks": null}  // blank = not entered / clears prior mark
]}
// 200
{"saved": 2, "status": "draft", "entered": 8, "expected": 12, "failed": []}
```

Semantics: `marks_obtained: null` + `is_absent: false` → the student is
*not entered* (any stored row is removed). `is_absent: true` → row stored as
absent (renders AB; stored marks masked to null in reads).

Errors: `422 MARKS_OUT_OF_RANGE` (0 ≤ marks ≤ max_marks, absent exempt),
`422 NOT_ENROLLED`, `409 DUPLICATE_RESULT`, `409 RESULTS_PUBLISHED`.

**POST …/publish** → `{"id": 98, "status": "published", "published_at": …}`.
Errors: `409 INCOMPLETE_RESULTS` (not every roster student entered/absent),
`409 ALREADY_PUBLISHED`. Faculty → 403.

**POST …/reopen** → back to `draft`. Faculty → 403.

## Fees

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/fees/summary` | `fees:read` | College/branch totals: billed, collected, outstanding, fully-cleared count |
| GET | `/fees/students/{id}` | `fees:read` | Per-student obligations (billed/paid/pending per head) |
| GET | `/fees/payments` | `payments:read` | Paginated ledger. Query `branch_id`, `roll`, `page`, `page_size` |
| POST | `/fees/payments` | `payments:write` (accounts) | Record a payment |
| POST | `/fees/payments/{id}/reverse` | `payments:write` | Reverse with reason |
| GET | `/fees/audit` | `fees:audit` | Paginated audit trail with before → after deltas |

**POST /fees/payments**

```jsonc
{"obligation_id": 67, "amount": "100.00", "method": "upi",
 "reference": "SMOKE-TXN-002", "reason": "Installment 2",
 "idempotency_key": "c0a8…" }   // client-generated, unique per attempt
// 201 → {"receipt_no": "RCP-000159", "status": "completed", "amount": "100.00", …}
```

`method` ∈ `cash | upi | bank_transfer | cheque | card`. `amount` > 0,
≤ 1,00,00,000. **Replay of the same `idempotency_key` returns 200 with the
original receipt** — no second charge.

Errors: `409 ALREADY_REVERSED`, `409 OBLIGATION_SETTLED`, `404` (obligation not
found / not in scope), `422` validation.

**POST /fees/payments/{id}/reverse**

```jsonc
{"reason": "Smoke test reversal"}   // required, ≥ 5 chars
// 200 → reversed payment + compensating entries
```

Appends negative `payments` rows and a `fee_audit_logs` entry in the same
transaction; the original row is untouched. Reversing a reversed payment →
`409 ALREADY_REVERSED`.

**GET /fees/audit** items:

```json
{"id": 812, "action": "reversal recorded", "student_name": "Varun Iyer",
 "roll_number": "MPC25003", "field": "paid_amount: 10900.00 → 10800.00",
 "delta": "-100.00", "reason": "Smoke test reversal",
 "actor": "Sushma Reddy", "created_at": "2026-10-28T01:31:00Z"}
```

## Announcements

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/announcements` | `announcements:read` (all roles incl. parent) | Paginated; `audience` filter |
| POST | `/announcements` | `announcements:write` (principal) | `{"title", "body", "audience?"}` — audience ∈ `all | students | parents | staff | faculty` |

## Parent portal (non-user context)

Flow: lookup → verify → scoped reads.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/parent/lookup` | public | `{branch_id, roll_number}` → masked student + `lookup_token` |
| POST | `/parent/verify` | public | `{lookup_token, access_code}` → parent `access_token` + children list |
| GET | `/parent/children` | parent token | Linked children (masked identity) |
| GET | `/parent/students/{id}/profile` | parent token | Full profile **of own child only** |
| GET | `/parent/students/{id}/attendance` | parent token | Summary + per-session history |
| GET | `/parent/students/{id}/results` | parent token | **Published exams only** |
| GET | `/parent/students/{id}/fees` | parent token | Obligations + payment history |

```jsonc
// POST /parent/lookup → 200
{"lookup_token": "…", "student": {"roll_number": "MPC25001", "initials": "I*** S***", "class_label": "I-A", "branch_code": "MPC"}}
// wrong code → 401 (generic); unknown roll → 404-style empty result; token is short-lived & single-use
```

Security properties: identity stays masked until verification; the parent
token only authorizes rows joined through `student_parent_links`; another
family's student id → **404**; unpublished exam results are excluded in SQL,
not in the client.

---

## Status code summary

| Code | Meaning |
|---|---|
| 200/201 | Success / created |
| 401 | Unauthenticated (bad creds, expired/rotated token, bad access code) |
| 403 | Authenticated but role lacks the permission |
| 404 | Not found **or** outside the caller's record scope |
| 409 | State conflict (duplicate, already submitted/published/reversed, incomplete) |
| 422 | Validation (field errors in `details`) |
| 429 | Rate limited |
