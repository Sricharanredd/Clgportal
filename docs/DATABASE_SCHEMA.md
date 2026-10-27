# Database Schema

MySQL 8 · InnoDB · `utf8mb4_unicode_ci` · managed by Alembic
(HEAD: `798735034693`). **26 domain tables** (+ `alembic_version` bookkeeping).

Conventions: every table has `id INT AUTO_INCREMENT PK`, `created_at` /
`updated_at` (app-managed), and `is_active` where soft-disable applies. Money
is `DECIMAL(12,2)` (obligations/payments/audit) or `DECIMAL(6,2)` (marks) —
never FLOAT. Timestamps are server-local `DATETIME`; the API serializes ISO-8601.

## Entity overview

```
branches ─┬─< class_sections >─ academic_years ─< enrollments >─ students ─┬─< attendance_records >─ attendance_sessions
          │                    │                                          ├─< exam_results >─ examinations >─ subjects
          ├─< subjects ────────┤                                          ├─< payments >─ student_fee_obligations >─ fee_structures
          │                    └─< faculty_assignments >─ users            └─< student_parent_links >─ parents
          └─< announcements

users >─ user_roles >─ roles >─ role_permissions        users >─ refresh_tokens
users >─ faculty_profiles                                users >─ activity_logs
                                                       fee_audit_logs >─ payments / obligations / students
```

---

## 1. Academic core

### `branches` (3 seeded: MPC, BiPC, CEC)
| Column | Type | Notes |
|---|---|---|
| code | varchar(20) **UNIQUE** | `MPC`, `BiPC`, `CEC` |
| name | varchar(100) | "Mathematics, Physics, Chemistry" |
| display_order | int | ordering for dropdowns |

### `academic_years`
| Column | Type | Notes |
|---|---|---|
| name | varchar(20) **UNIQUE** | `2025-26` |
| start_date / end_date | date | |
| is_current | bool | **exactly one current year** drives defaults |

### `class_sections`
`(branch_id, academic_year_id, section_name)` **UNIQUE** — e.g. `MPC-I-A`.
`year_of_study` ∈ {1, 2}. FKs: branch, academic year (RESTRICT).

### `subjects`
`code` **UNIQUE** (`M-MAT`, `B-BOT`, …), `name`, `branch_id`. Subjects belong
to one branch; faculty assignments bind user+class+subject.

### `enrollments`
Links a student to a class for a year.
`(student_id, academic_year_id)` **UNIQUE** — one active enrolment per year.
`status` ∈ `active | transferred | completed`. Rosters (attendance, results)
are derived from `status='active'` enrollments.

### `faculty_assignments`
`(user_id, class_section_id, subject_id, academic_year_id)` **UNIQUE**.
`assignment_type` ∈ `class_teacher | subject_teacher`. This table **is** the
record-scope boundary for faculty: sessions, exams, and rosters are filtered
through it.

## 2. Identity & access

### `users`
Staff accounts: `email` **UNIQUE**, `full_name`, `password_hash` (Argon2),
`phone`, `last_login_at`, `is_active`.

### `roles` · `user_roles` · `role_permissions`
`roles.name` UNIQUE (`principal`, `accounts`, `faculty`, `admin`, `student`).
`user_roles` is M:N (`(user_id, role_id)` UNIQUE). `role_permissions` stores
permission strings (`(role_id, permission)` UNIQUE) — seeded from
`ROLE_PERMISSIONS` in `app/core/enums.py`, the source of truth.

### `refresh_tokens`
Server-side session state for the HttpOnly refresh cookie:
| Column | Notes |
|---|---|
| jti | **UNIQUE** token id (the cookie value references it) |
| family | groups tokens from one login — **reuse of a rotated token revokes the family** |
| expires_at | absolute expiry |
| revoked_at | set on rotation/logout |

### `parents` · `student_parent_links`
Parents are **not** `users`. `parents.access_code_hash` (Argon2) backs the
portal verification; `is_verified` tracks first successful verification.
`student_parent_links (student_id, parent_id)` UNIQUE + `relationship`
(`father | mother | guardian`) — the join that scopes every parent API.

### `faculty_profiles`
1:1 with `users` (UNIQUE `user_id`): `employee_code` (UNIQUE), `qualification`,
`designation`.

## 3. Students

### `students`
`(roll_number, branch_id)` **UNIQUE** — roll numbers are unique per branch
(`MPC25001`). Name split into `first_name`/`last_name`; demographics
(`date_of_birth`, `gender`), contact (`phone`, `email`, `address`),
`guardian_name`, `admission_date`, `is_active`. Parent-facing reads mask the
name to initials until access-code verification.

## 4. Attendance

### `attendance_sessions`
One per class + date (+ optional subject).
`(class_section_id, attendance_date, subject_id)` **UNIQUE** — prevents
double sessions. `status` ∈ `draft | submitted`; `submitted_by` / `submitted_at`
record the lock event; `notes` for corrections.

### `attendance_records`
`(session_id, student_id)` **UNIQUE**. `status` ∈ `present | absent | late`,
`marked_by` (audit), `remarks` (≤ 120). FK to session/student CASCADE —
deleting a session removes its marks.

## 5. Examinations

### `examinations`
`(class_section_id, subject_id, title)` **UNIQUE** — no duplicate exams.
`exam_type` (`unit_test | mid_term | final | …`), `max_marks` /
`pass_marks` `DECIMAL(6,2)` (service enforces pass ≤ max), `status` ∈
`draft | published`, `published_at` / `published_by` capture the
publish gate. **Parent/student APIs filter on `status='published'` in SQL.**

### `exam_results`
`(examination_id, enrollment_id)` **UNIQUE**. `marks_obtained DECIMAL(6,2)`
NOT NULL (absent rows store 0; reads mask to null), `is_absent` flag,
`remarks`, `entered_by` / `updated_by`. **A row exists only if the student was
entered or flagged absent** — blank roster rows are deleted, so "entered"
counts stay honest. FK CASCADE from exam/enrollment.

## 6. Fees (append-only money path)

### `fee_structures`
Fee heads per year + branch (+ optional class): `name` ("Annual Tuition Fee
2025-26"), `total_amount DECIMAL(12,2)`, `is_active`.

### `student_fee_obligations`
Per student per fee head. `(student_id, fee_structure_id)` **UNIQUE**.
`total_amount`, `paid_amount` (both DECIMAL(12,2)), `due_date`, `status` ∈
`pending | partial | cleared`. `paid_amount` is updated **only inside the
payment transaction**, and every change writes a `fee_audit_logs` row with
before → after values.

### `payments`
**Append-only ledger.**
| Column | Notes |
|---|---|
| amount | `DECIMAL(12,2)`; reversals store negative amounts |
| method | `cash | upi | bank_transfer | cheque | card` |
| status | `completed | reversed` (derived; originals never mutated) |
| receipt_number | **UNIQUE** (`RCP-…`) |
| idempotency_key | **UNIQUE** — replay protection: a retried request returns the original receipt |
| reversal_of_payment_id | self-FK links a compensating entry to its original |

### `fee_audit_logs`
**Append-only**, written in the same transaction as the money movement:
`operation` (`payment recorded | reversal recorded`), `field_name`
(`paid_amount`), `previous_value` → `new_value`, `amount` (signed delta),
`reference`, `reason`, `actor_user_id`, FKs to obligation/payment/student.
This is the source for the Fees → Audit trail UI.

## 7. Communications & logs

### `announcements`
`title` (≤150), `body` (≤2000), `audience` ∈ `all | students | parents |
staff`, optional `branch_id` scoping, `is_published` + `published_at`,
`created_by`.

### `activity_logs`
Auth and general audit: `actor_user_id` (SET NULL on user delete), `action`
(`login | logout | refresh | …`), `entity_type` / `entity_id`, `summary`.

## 8. Reference (seeded, no management UI yet)

### `timetable_entries`
`class_section_id`, optional `subject_id` / `faculty_user_id` (SET NULL),
`day_of_week`, `period_number`, `start_time` / `end_time`, `room`.

---

## Indexing & integrity notes

- All FK columns are indexed (explicitly or via composite uniques).
- Uniques encode the business rules: one enrolment per year, one session per
  class+date, one result per exam+enrolment, one payment per idempotency key,
  one receipt number.
- `RESTRICT` FKs protect master data (you can't delete a branch with
  students); `CASCADE` is used only where child rows are meaningless without
  the parent (records → session, links → student/parent, tokens → user).
- Money tables forbid UPDATE/DELETE of ledger rows by convention: reversals
  append, and the audit log is the historical record.
