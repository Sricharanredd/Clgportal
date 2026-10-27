# Product Requirements Document (PRD)

**Intermediate College Management Portal** — as delivered in Stages 1–5.

## 1. Problem

Intermediate (+2) colleges run admissions, daily attendance, internal
examinations, and fee collection on paper or spreadsheets. Records are
inconsistent, fee reconciliation is error-prone, results leak before
publication, and parents have no controlled view of their child's progress.
This portal replaces that with a single role-aware system backed by a real
relational database.

## 2. Users & roles

| Role | Auth | Primary jobs |
|---|---|---|
| **Principal** | Email + password | Oversight of everything in their branch scope; correct attendance; publish/reopen results; review fee audit; manage staff; publish announcements |
| **Accounts** | Email + password | Fee overview, record payments, reverse payments with reason, audit trail, student lookup |
| **Faculty** | Email + password | Mark + submit attendance for assigned classes; create exams and enter marks for assigned subjects |
| **Admin** | Email + password | Staff and reference-data administration; read dashboards |
| **Parent** | No account — roll number + access code | Read-only view of *their own children*: profile, attendance, published results, fee status, announcements |
| **Student** *(modelled, channel pending)* | — | Same read-only `*_read_own` scope as parent |

Faculty, accounts, and principal are staff users with JWT sessions. Parents are
a **non-user context**: a short-lived token minted only after roll-number
lookup + access-code verification, scoped to linked children.

## 3. Functional requirements

### FR-1 Authentication & sessions
- FR-1.1 Email + password login; wrong credentials return a **generic 401**
  (no account enumeration).
- FR-1.2 Access token: 30-minute JWT, held **in memory only** (never
  localStorage).
- FR-1.3 Refresh token: HttpOnly, `SameSite=Lax` cookie; single-use with
  server-side rotation and reuse detection; silent single-flight refresh in the
  HTTP client.
- FR-1.4 Logout revokes the refresh token server-side.
- FR-1.5 Login rate limiting (5/min per identity+IP in dev).

### FR-2 Authorization (RBAC + record scope)
- FR-2.1 Every route declares required permissions; enforcement is
  **server-side only** — the UI hiding nav items is convenience, not security.
- FR-2.2 Record-level scope: faculty see only assigned classes/subjects;
  accounts/principal see branch-scoped data.
- FR-2.3 A record outside a caller's scope returns **404**, never 403, for
  parent/student contexts (no ID probing).
- FR-2.4 Principal deliberately cannot enter marks or record payments — those
  are faculty/accounts duties; principal corrects/publishes instead.

### FR-3 Students
- FR-3.1 Paginated listing with search by roll/name and branch filter.
- FR-3.2 Detail view: profile, class enrolment, attendance summary, results
  (gated), fees (gated).
- FR-3.3 Parents see masked identity until access-code verification succeeds.

### FR-4 Attendance
- FR-4.1 Faculty pick one of their assigned classes + a date → roster with
  present/absent/late per student + remarks.
- FR-4.2 Save as draft (repeatable), then submit. Submission locks the session
  (`409 INCOMPLETE` if any student is unmarked; empty rosters rejected).
- FR-4.3 Principal (with `attendance:correct`) may edit submitted sessions;
  every correction is audited.
- FR-4.4 Parents/students read attendance as totals + per-session history for
  their own children only.

### FR-5 Examinations & results
- FR-5.1 Faculty create exams for assigned class+subject (title, type, max and
  pass marks; pass ≤ max enforced).
- FR-5.2 Marks entry submits the **whole roster**; blank rows mean "not
  entered" (and clear previously saved marks). Absent students are flagged
  `is_absent` and render as AB.
- FR-5.3 Publish is a distinct step by the principal; incomplete exams cannot
  be published (`409 INCOMPLETE_RESULTS`).
- FR-5.4 Published results are locked; principal can reopen for correction,
  then republish.
- FR-5.5 **Unpublished results must never appear in parent/student APIs** —
  enforced in queries, verified by tests.

### FR-6 Fees
- FR-6.1 Fee structures per branch produce per-student obligations
  (billed vs paid vs pending).
- FR-6.2 Record payment: obligation, amount, method (cash/UPI/bank transfer/
  cheque/card), optional reference/reason.
- FR-6.3 **Idempotency:** the client generates a key per attempt; a replayed
  key returns the original receipt (200) instead of double-charging.
- FR-6.4 Reversal: accounts-only, requires a reason ≥ 5 characters, appends
  compensating negative rows in the same transaction — original rows are never
  mutated or deleted.
- FR-6.5 Audit trail: every money movement stores before → after balance,
  delta, actor, reason, timestamp. Readable by accounts + principal.
- FR-6.6 All money is `DECIMAL` end-to-end; floats are forbidden.
- FR-6.7 Parents see only their children's fee status (billed/paid/pending +
  payment history), never the college-wide ledger.

### FR-7 Announcements
- FR-7.1 Audience-scoped notices (all / students / parents / staff / faculty).
- FR-7.2 Authorized roles publish; everyone else reads.

### FR-8 Dashboards
- FR-8.1 Four role-specific views (principal, accounts, faculty, admin) with
  real aggregates from the database — enrollment by branch, attendance today,
  collections vs outstanding, monthly collection chart, exams pending publish.

## 4. Non-functional requirements

| # | Requirement | How it's met |
|---|---|---|
| NFR-1 | Security | Argon2 password hashing; JWT + rotating HttpOnly refresh; server-side authz; generic 401; 404-for-invisible; rate limiting |
| NFR-2 | Data integrity | Alembic migrations; FK constraints; unique idempotency key; transactional money writes |
| NFR-3 | Auditability | Append-only `fee_audit_logs` + `activity_logs`; request IDs in every error and access log |
| NFR-4 | Correctness | 56-test pytest suite against an isolated DB covering auth, RBAC, scope, validation, publish gating, idempotency, reversal |
| NFR-5 | Accessibility | Semantic landmarks, labelled controls, visible focus rings, `role=radiogroup` attendance controls, aria-live notices |
| NFR-6 | Responsive UI | Prism Glass design system; sidebar collapses to a top bar under `md` |
| NFR-7 | Performance | Paginated list endpoints; indexed FK/date columns; single round-trip dashboards |
| NFR-8 | Operability | `/healthz`, structured JSON-ish access logs, OpenAPI at `/docs`, seed CLI |

## 5. Out of scope (this delivery)

Real payment-gateway integration, SMS/email delivery, PDF receipts/report
cards, CSV bulk import, timetable management UI, student self-service login
channel, multi-tenant colleges.

## 6. Acceptance criteria (verified)

1. All 56 backend tests pass against a freshly migrated + seeded test DB.
2. Principal, accounts, and faculty logins each see only their permitted nav
   and data; server rejects out-of-scope calls with 403/404 as specified.
3. Attendance: save draft → submit locks the session; unmarked submit → 409.
4. Results: faculty enter marks for a whole roster including blanks; principal
   publishes; parent sees **only** published exams.
5. Fees: payment recorded with idempotency key; replay returns same receipt;
   reversal with reason restores balance and appears in audit with deltas.
6. Parent: branch+roll lookup → access code → tabs show only their children,
   masked until verified.
