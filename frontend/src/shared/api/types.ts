/**
 * Shared API types — mirrors the FastAPI OpenAPI schema (app/schemas/*).
 * String amounts are Decimal-serialized money values (e.g. "2500.00").
 */

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id?: string;
  };
}

// ---------------------------------------------------------------------------
// Generic page envelope (all list endpoints)
// ---------------------------------------------------------------------------
export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface UserOut {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
  branch_scope: number[] | null;
  class_scope: number[] | null;
  subject_scope: number[] | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserOut;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface MeResponse {
  user: UserOut;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------
export interface BranchOut {
  id: number;
  code: string;
  name: string;
}

export interface ClassSectionOut {
  id: number;
  branch_id: number;
  academic_year_id: number;
  section_name: string;
  year_of_study: number;
  branch_code: string | null;
  branch_name: string | null;
}

export interface SubjectOut {
  id: number;
  code: string;
  name: string;
  branch_id: number;
}

export interface AcademicYearOut {
  id: number;
  name: string;
  is_current: boolean;
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------
export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface StudentSummary {
  id: number;
  roll_number: string;
  full_name: string;
  branch_id: number;
  branch_code: string;
  class_section: string | null;
  academic_year: string | null;
  status: string;
}

export interface AttendanceSummary {
  total_sessions: number;
  present: number;
  absent: number;
  late: number;
  attendance_pct: number;
}

export interface ResultSummary {
  exam_title: string;
  subject_code: string;
  subject_name: string;
  max_marks: string;
  marks_obtained: string | null;
  is_absent: boolean;
  status: string;
  published_at: string | null;
}

export interface FeeSummary {
  total_amount: string;
  paid_amount: string;
  pending_amount: string;
  status: string;
  due_date: string | null;
}

export interface StudentProfile {
  id: number;
  roll_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  branch_id: number;
  branch_code: string;
  branch_name: string;
  class_section: string | null;
  year_of_study: number | null;
  academic_year: string | null;
  enrollment_status: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  guardian_name: string | null;
  admission_date: string | null;
  is_active: boolean;
  attendance: AttendanceSummary | null;
  published_results: ResultSummary[];
  fee: FeeSummary | null;
}

export type StudentSearchPage = Page<StudentSummary>;

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------
export interface BranchAttendance {
  branch_code: string;
  branch_name: string;
  sessions: number;
  present: number;
  total_records: number;
  attendance_pct: number;
}

export interface MonthlyCollection {
  month: string; // YYYY-MM
  amount: string;
  count: number;
}

export interface RecentActivity {
  id: number;
  action: string;
  summary: string;
  actor: string | null;
  created_at: string;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  audience: string;
  published_at: string | null;
}

export interface PrincipalDashboard {
  total_students: number;
  total_faculty: number;
  today_attendance_pct: number;
  today_sessions: number;
  fees_collected: string;
  fees_outstanding: string;
  fee_payers: number;
  branch_attendance: BranchAttendance[];
  monthly_collections: MonthlyCollection[];
  recent_activity: RecentActivity[];
  announcements: AnnouncementItem[];
  academic_year: string | null;
  generated_at: string;
}

export interface AccountPaymentRow {
  id: number;
  receipt_number: string;
  amount: string;
  method: string;
  status: string;
  reference: string | null;
  paid_at: string;
  student: string;
  roll_number: string;
}

export interface AccountAuditRow {
  id: number;
  operation: string;
  amount: string | null;
  previous_value: string | null;
  new_value: string | null;
  reference: string | null;
  reason: string | null;
  created_at: string;
  student: string;
  roll_number: string;
}

export interface AccountsDashboard {
  total_collected: string;
  total_outstanding: string;
  today_collections: string;
  today_payment_count: number;
  student_count_with_obligations: number;
  fully_cleared: number;
  recent_payments: AccountPaymentRow[];
  recent_audit: AccountAuditRow[];
  monthly_collections: MonthlyCollection[];
  generated_at: string;
}

export interface FacultyTask {
  class_section_id: number;
  class_label: string;
  subject: string | null;
  status: string;
  date: string | null;
}

export interface PendingResultTask {
  examination_id: number;
  title: string;
  class_label: string;
  subject: string;
  entered: number;
  expected: number;
  status: string;
}

export interface FacultyDashboard {
  assigned_branches: string[];
  assigned_classes: string[];
  assigned_subjects: string[];
  today_sessions: FacultyTask[];
  attendance_completed_today: number;
  attendance_pending_today: number;
  pending_results: PendingResultTask[];
  recent_attendance: RecentActivity[];
  announcements: AnnouncementItem[];
  generated_at: string;
}

export interface AdminBranchSummary {
  branch_code: string;
  branch_name: string;
  students: number;
  classes: number;
}

export interface AdminDashboard {
  total_students: number;
  total_staff: number;
  active_staff: number;
  branch_count: number;
  class_count: number;
  academic_year: string | null;
  branch_summaries: AdminBranchSummary[];
  recent_activity: RecentActivity[];
  announcements: AnnouncementItem[];
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------
export interface RosterStudent {
  student_id: number;
  roll_number: string;
  full_name: string;
  status: AttendanceStatus | null;
  remarks: string | null;
}

export interface SessionSummary {
  id: number | null;
  class_section_id: number;
  class_label: string;
  branch_code: string;
  subject: string | null;
  attendance_date: string;
  status: string;
  present: number;
  absent: number;
  marked: number;
  roster_size: number;
  submitted_at: string | null;
}

export interface SessionDetail {
  id: number | null;
  class_section_id: number;
  class_label: string;
  attendance_date: string;
  status: string;
  subject: string | null;
  submitted_at: string | null;
  roster: RosterStudent[];
  summary: Record<string, number>;
}

export interface RecordInput {
  student_id: number;
  status: AttendanceStatus;
  remarks?: string | null;
}

export interface SaveRecordsRequest {
  records: RecordInput[];
}

export interface SaveRecordsResponse {
  saved: number;
  status: string;
  marked: number;
  roster_size: number;
}

export interface SubmitResponse {
  id: number;
  status: string;
  submitted_at: string | null;
  marked: number;
  roster_size: number;
}

// ---------------------------------------------------------------------------
// Examinations & results
// ---------------------------------------------------------------------------
export interface ExaminationOut {
  id: number;
  title: string;
  exam_type: string;
  class_section_id: number;
  class_label: string;
  branch_code: string;
  subject_id: number;
  subject_code: string;
  subject_name: string;
  academic_year: string | null;
  exam_date: string | null;
  max_marks: string;
  pass_marks: string;
  status: string;
  published_at: string | null;
  entered: number;
  expected: number;
}

export interface ResultRow {
  student_id: number;
  enrollment_id: number;
  roll_number: string;
  full_name: string;
  marks_obtained: string | null;
  is_absent: boolean;
  remarks: string | null;
}

export interface ExaminationDetail {
  examination: ExaminationOut;
  roster: ResultRow[];
  can_edit: boolean;
}

export interface SaveResultsRequest {
  results: Array<{
    student_id: number;
    marks_obtained?: number | string | null;
    is_absent?: boolean;
    remarks?: string | null;
  }>;
}

export interface SaveResultsResponse {
  saved: number;
  status: string;
  entered: number;
  expected: number;
  failed: Array<Record<string, unknown>>;
}

export interface PublishResponse {
  id: number;
  status: string;
  published_at: string | null;
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------
export interface FeeSummaryOut {
  total_billed: string;
  total_collected: string;
  total_outstanding: string;
  students_with_obligations: number;
  fully_cleared: number;
  today_collections: string;
  generated_at: string;
}

export interface ObligationOut {
  id: number;
  student_id: number;
  fee_structure_name: string;
  academic_year: string | null;
  total_amount: string;
  paid_amount: string;
  pending_amount: string;
  status: string;
  due_date: string | null;
  can_record_payment: boolean;
}

export interface PaymentOut {
  id: number;
  student_id: number;
  student_name: string;
  roll_number: string;
  amount: string;
  method: string;
  status: string;
  reference: string | null;
  receipt_number: string;
  reversal_of_payment_id: number | null;
  recorded_by_name: string | null;
  paid_at: string;
  created_at: string;
}

export interface StudentFeesOut {
  student_id: number;
  student_name: string;
  roll_number: string;
  branch_code: string;
  obligations: ObligationOut[];
  payments: PaymentOut[];
}

export interface PaymentCreate {
  obligation_id: number;
  amount: number | string;
  method: string;
  reference?: string | null;
  reason?: string | null;
  idempotency_key: string;
}

export interface AuditLogOut {
  id: number;
  student_id: number;
  student_name: string;
  roll_number: string;
  operation: string;
  field_name: string | null;
  previous_value: string | null;
  new_value: string | null;
  amount: string | null;
  reference: string | null;
  reason: string | null;
  actor_name: string | null;
  created_at: string;
}

export type AuditPage = Page<AuditLogOut>;
export type PaymentPage = Page<PaymentOut>;

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------
export interface AnnouncementCreate {
  title: string;
  body: string;
  audience: string;
}

export interface AnnouncementOut {
  id: number;
  title: string;
  body: string;
  audience: string;
  is_published: boolean;
  published_at: string | null;
  created_by_name: string | null;
}

export type AnnouncementPage = Page<AnnouncementOut>;

// ---------------------------------------------------------------------------
// Parent portal
// ---------------------------------------------------------------------------
export interface ParentLookupRequest {
  branch_id: number;
  roll_number: string;
}

export interface MaskedStudent {
  student_id: number;
  roll_number: string;
  masked_name: string;
  branch_code: string;
  class_section: string | null;
}

export interface ParentLookupResponse {
  lookup_token: string;
  expires_in: number;
  student: MaskedStudent;
  verification_required: boolean;
  hint: string;
}

export interface ParentVerifyRequest {
  lookup_token: string;
  access_code: string;
}

export interface ParentChildSummary {
  student_id: number;
  roll_number: string;
  full_name: string;
  branch_code: string;
  class_section: string | null;
  academic_year: string | null;
}

export interface ParentSessionResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  parent_name: string;
  permissions: string[];
  children: ParentChildSummary[];
}
