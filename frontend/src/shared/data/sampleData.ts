/**
 * Frontend-only demo dataset.
 *
 * 25 fictional students across the MPC, BiPC and CEC streams. Every public
 * demo surface (dashboard, student search, overview, attendance, results and
 * fees) reads from this one module, so the numbers always agree with each
 * other.
 *
 * The records are synthetic and live entirely in the browser: nothing here
 * touches the API, the database or any real student information.
 */
import type {
  AttendanceHistoryEntry,
  AttendanceSummary,
  FeeSummary,
  ParentChildSummary,
  ResultSummary,
  StudentFeesOut,
  StudentProfile,
} from '@/shared/api/types';

export const ACADEMIC_YEAR = '2025-26';
export const EXAM_TITLE = 'Unit Test 1';
export const EXAM_DATE = '2025-09-15';
export const PUBLISHED_AT = '2025-09-20T10:00:00';
export const FEE_DUE_DATE = '2026-01-15';
export const MAX_MARKS = 50;
export const PASS_MARKS = 17;

const SCHOOL_DAYS = 10;
const ATTENDANCE_SALT = 4;

/* -------------------------------------------------------------------------- */
/* Reference data                                                              */
/* -------------------------------------------------------------------------- */

export interface SampleBranch {
  id: number;
  code: string;
  name: string;
}

export const SAMPLE_BRANCHES: SampleBranch[] = [
  { id: 1, code: 'MPC', name: 'Mathematics, Physics, Chemistry' },
  { id: 2, code: 'BiPC', name: 'Biology, Physics, Chemistry' },
  { id: 3, code: 'CEC', name: 'Civics, Economics, Commerce' },
];

interface Subject {
  code: string;
  name: string;
}

const SUBJECTS: Record<string, Subject[]> = {
  MPC: [
    { code: 'M-MAT', name: 'Mathematics' },
    { code: 'M-PHY', name: 'Physics' },
    { code: 'M-CHM', name: 'Chemistry' },
    { code: 'M-ENG', name: 'English' },
    { code: 'M-SAN', name: 'Sanskrit' },
  ],
  BiPC: [
    { code: 'B-BOT', name: 'Botany' },
    { code: 'B-ZOO', name: 'Zoology' },
    { code: 'B-PHY', name: 'Physics' },
    { code: 'B-CHM', name: 'Chemistry' },
    { code: 'B-ENG', name: 'English' },
  ],
  CEC: [
    { code: 'C-CIV', name: 'Civics' },
    { code: 'C-ECO', name: 'Economics' },
    { code: 'C-COM', name: 'Commerce' },
    { code: 'C-ENG', name: 'English' },
    { code: 'C-SAN', name: 'Sanskrit' },
  ],
};

const FEE_PLANS: Record<string, { name: string; total: number }> = {
  MPC: { name: 'Annual Tuition Fee 2025-26', total: 36000 },
  BiPC: { name: 'Annual Tuition Fee 2025-26', total: 38000 },
  CEC: { name: 'Annual Tuition Fee 2025-26', total: 30000 },
};

const PAYMENT_METHODS = ['upi', 'cash', 'bank_transfer', 'cheque', 'card'] as const;

/* -------------------------------------------------------------------------- */
/* Student seeds (personal + guardian + academic details)                      */
/* -------------------------------------------------------------------------- */

interface StudentSeed {
  id: number;
  roll: string;
  first: string;
  last: string;
  branch: string;
  year: 1 | 2;
  gender: 'male' | 'female';
  dob: string;
  guardian: string;
  guardianRelation: string;
  guardianPhone: string;
  phone: string;
  email: string;
  address: string;
  admissionDate: string;
}

const STUDENT_SEEDS: StudentSeed[] = [
  // MPC — 10 students
  {
    id: 1, roll: 'MPC25001', first: 'Aarav', last: 'Sharma', branch: 'MPC', year: 1,
    gender: 'male', dob: '2008-04-12', guardian: 'Rajesh Sharma', guardianRelation: 'Father',
    guardianPhone: '+91 98490 11001', phone: '+91 90000 20001',
    email: 'aarav.sharma@student.demo.edu', address: '12-3-45, Knowledge Park, Hyderabad',
    admissionDate: '2025-06-10',
  },
  {
    id: 2, roll: 'MPC25002', first: 'Vivaan', last: 'Reddy', branch: 'MPC', year: 1,
    gender: 'male', dob: '2008-08-03', guardian: 'Suresh Reddy', guardianRelation: 'Father',
    guardianPhone: '+91 98490 11002', phone: '+91 90000 20002',
    email: 'vivaan.reddy@student.demo.edu', address: '8-2-120, Green Colony, Hyderabad',
    admissionDate: '2025-06-11',
  },
  {
    id: 3, roll: 'MPC25003', first: 'Ananya', last: 'Iyer', branch: 'MPC', year: 1,
    gender: 'female', dob: '2008-01-27', guardian: 'Meera Iyer', guardianRelation: 'Mother',
    guardianPhone: '+91 98490 11003', phone: '+91 90000 20003',
    email: 'ananya.iyer@student.demo.edu', address: '21-7-88, Lake View, Hyderabad',
    admissionDate: '2025-06-12',
  },
  {
    id: 4, roll: 'MPC25004', first: 'Aditya', last: 'Nair', branch: 'MPC', year: 1,
    gender: 'male', dob: '2008-11-09', guardian: 'Gopal Nair', guardianRelation: 'Father',
    guardianPhone: '+91 98490 11004', phone: '+91 90000 20004',
    email: 'aditya.nair@student.demo.edu', address: '4-5-67, MG Road, Hyderabad',
    admissionDate: '2025-06-12',
  },
  {
    id: 5, roll: 'MPC25005', first: 'Diya', last: 'Patel', branch: 'MPC', year: 1,
    gender: 'female', dob: '2008-06-18', guardian: 'Nilesh Patel', guardianRelation: 'Father',
    guardianPhone: '+91 98490 11005', phone: '+91 90000 20005',
    email: 'diya.patel@student.demo.edu', address: '33-1-9, Rose Villa, Hyderabad',
    admissionDate: '2025-06-13',
  },
  {
    id: 6, roll: 'MPC25006', first: 'Arjun', last: 'Rao', branch: 'MPC', year: 2,
    gender: 'male', dob: '2007-03-22', guardian: 'Venkat Rao', guardianRelation: 'Father',
    guardianPhone: '+91 98490 11006', phone: '+91 90000 20006',
    email: 'arjun.rao@student.demo.edu', address: '6-9-101, Gandhi Colony, Hyderabad',
    admissionDate: '2024-06-10',
  },
  {
    id: 7, roll: 'MPC25007', first: 'Kavya', last: 'Menon', branch: 'MPC', year: 2,
    gender: 'female', dob: '2007-09-14', guardian: 'Anil Menon', guardianRelation: 'Father',
    guardianPhone: '+91 98490 11007', phone: '+91 90000 20007',
    email: 'kavya.menon@student.demo.edu', address: '15-4-32, Nehru Nagar, Hyderabad',
    admissionDate: '2024-06-11',
  },
  {
    id: 8, roll: 'MPC25008', first: 'Rohan', last: 'Verma', branch: 'MPC', year: 2,
    gender: 'male', dob: '2007-12-01', guardian: 'Sanjay Verma', guardianRelation: 'Father',
    guardianPhone: '+91 98490 11008', phone: '+91 90000 20008',
    email: 'rohan.verma@student.demo.edu', address: '9-8-77, Knowledge Park, Hyderabad',
    admissionDate: '2024-06-12',
  },
  {
    id: 9, roll: 'MPC25009', first: 'Sneha', last: 'Kulkarni', branch: 'MPC', year: 2,
    gender: 'female', dob: '2007-07-07', guardian: 'Prakash Kulkarni', guardianRelation: 'Father',
    guardianPhone: '+91 98490 11009', phone: '+91 90000 20009',
    email: 'sneha.kulkarni@student.demo.edu', address: '18-2-55, Lake View, Hyderabad',
    admissionDate: '2024-06-12',
  },
  {
    id: 10, roll: 'MPC25010', first: 'Nikhil', last: 'Choudhary', branch: 'MPC', year: 2,
    gender: 'male', dob: '2007-05-19', guardian: 'Mahesh Choudhary', guardianRelation: 'Father',
    guardianPhone: '+91 98490 11010', phone: '+91 90000 20010',
    email: 'nikhil.choudhary@student.demo.edu', address: '2-6-14, MG Road, Hyderabad',
    admissionDate: '2024-06-13',
  },

  // BiPC — 9 students
  {
    id: 11, roll: 'BIP25001', first: 'Ishaan', last: 'Gowda', branch: 'BiPC', year: 1,
    gender: 'male', dob: '2008-02-11', guardian: 'Ramesh Gowda', guardianRelation: 'Father',
    guardianPhone: '+91 98490 12001', phone: '+91 90000 20011',
    email: 'ishaan.gowda@student.demo.edu', address: '27-3-6, Green Colony, Hyderabad',
    admissionDate: '2025-06-10',
  },
  {
    id: 12, roll: 'BIP25002', first: 'Ira', last: 'Pillai', branch: 'BiPC', year: 1,
    gender: 'female', dob: '2008-10-05', guardian: 'Sreeja Pillai', guardianRelation: 'Mother',
    guardianPhone: '+91 98490 12002', phone: '+91 90000 20012',
    email: 'ira.pillai@student.demo.edu', address: '11-9-40, Rose Villa, Hyderabad',
    admissionDate: '2025-06-11',
  },
  {
    id: 13, roll: 'BIP25003', first: 'Sai', last: 'Teja', branch: 'BiPC', year: 1,
    gender: 'male', dob: '2008-07-16', guardian: 'Naveen Teja', guardianRelation: 'Father',
    guardianPhone: '+91 98490 12003', phone: '+91 90000 20013',
    email: 'sai.teja@student.demo.edu', address: '5-1-23, Nehru Nagar, Hyderabad',
    admissionDate: '2025-06-11',
  },
  {
    id: 14, roll: 'BIP25004', first: 'Tanvi', last: 'Shetty', branch: 'BiPC', year: 1,
    gender: 'female', dob: '2008-03-30', guardian: 'Rakesh Shetty', guardianRelation: 'Father',
    guardianPhone: '+91 98490 12004', phone: '+91 90000 20014',
    email: 'tanvi.shetty@student.demo.edu', address: '19-5-88, Lake View, Hyderabad',
    admissionDate: '2025-06-12',
  },
  {
    id: 15, roll: 'BIP25005', first: 'Zoya', last: 'Khan', branch: 'BiPC', year: 1,
    gender: 'female', dob: '2008-12-24', guardian: 'Imran Khan', guardianRelation: 'Father',
    guardianPhone: '+91 98490 12005', phone: '+91 90000 20015',
    email: 'zoya.khan@student.demo.edu', address: '7-7-19, Gandhi Colony, Hyderabad',
    admissionDate: '2025-06-12',
  },
  {
    id: 16, roll: 'BIP25006', first: 'Harsha', last: 'Vardhan', branch: 'BiPC', year: 2,
    gender: 'male', dob: '2007-01-15', guardian: 'Srinivas Vardhan', guardianRelation: 'Father',
    guardianPhone: '+91 98490 12006', phone: '+91 90000 20016',
    email: 'harsha.vardhan@student.demo.edu', address: '23-8-90, Knowledge Park, Hyderabad',
    admissionDate: '2024-06-10',
  },
  {
    id: 17, roll: 'BIP25007', first: 'Pooja', last: 'Das', branch: 'BiPC', year: 2,
    gender: 'female', dob: '2007-04-08', guardian: 'Subir Das', guardianRelation: 'Father',
    guardianPhone: '+91 98490 12007', phone: '+91 90000 20017',
    email: 'pooja.das@student.demo.edu', address: '14-2-61, MG Road, Hyderabad',
    admissionDate: '2024-06-11',
  },
  {
    id: 18, roll: 'BIP25008', first: 'Varun', last: 'Bose', branch: 'BiPC', year: 2,
    gender: 'male', dob: '2007-08-21', guardian: 'Amit Bose', guardianRelation: 'Father',
    guardianPhone: '+91 98490 12008', phone: '+91 90000 20018',
    email: 'varun.bose@student.demo.edu', address: '3-4-37, Rose Villa, Hyderabad',
    admissionDate: '2024-06-12',
  },
  {
    id: 19, roll: 'BIP25009', first: 'Lakshmi', last: 'Gupta', branch: 'BiPC', year: 2,
    gender: 'female', dob: '2007-10-12', guardian: 'Rakesh Gupta', guardianRelation: 'Father',
    guardianPhone: '+91 98490 12009', phone: '+91 90000 20019',
    email: 'lakshmi.gupta@student.demo.edu', address: '30-6-72, Green Colony, Hyderabad',
    admissionDate: '2024-06-13',
  },

  // CEC — 6 students
  {
    id: 20, roll: 'CEC25001', first: 'Praneeth', last: 'Joshi', branch: 'CEC', year: 1,
    gender: 'male', dob: '2008-05-06', guardian: 'Girish Joshi', guardianRelation: 'Father',
    guardianPhone: '+91 98490 13001', phone: '+91 90000 20020',
    email: 'praneeth.joshi@student.demo.edu', address: '16-1-48, Lake View, Hyderabad',
    admissionDate: '2025-06-10',
  },
  {
    id: 21, roll: 'CEC25002', first: 'Riya', last: 'Mehta', branch: 'CEC', year: 1,
    gender: 'female', dob: '2008-09-19', guardian: 'Hitesh Mehta', guardianRelation: 'Father',
    guardianPhone: '+91 98490 13002', phone: '+91 90000 20021',
    email: 'riya.mehta@student.demo.edu', address: '8-8-12, Nehru Nagar, Hyderabad',
    admissionDate: '2025-06-11',
  },
  {
    id: 22, roll: 'CEC25003', first: 'Sandeep', last: 'Kumar', branch: 'CEC', year: 1,
    gender: 'male', dob: '2008-02-28', guardian: 'Ravi Kumar', guardianRelation: 'Father',
    guardianPhone: '+91 98490 13003', phone: '+91 90000 20022',
    email: 'sandeep.kumar@student.demo.edu', address: '22-4-83, Gandhi Colony, Hyderabad',
    admissionDate: '2025-06-12',
  },
  {
    id: 23, roll: 'CEC25004', first: 'Divya', last: 'Agarwal', branch: 'CEC', year: 2,
    gender: 'female', dob: '2007-06-17', guardian: 'Sunil Agarwal', guardianRelation: 'Father',
    guardianPhone: '+91 98490 13004', phone: '+91 90000 20023',
    email: 'divya.agarwal@student.demo.edu', address: '10-5-29, Knowledge Park, Hyderabad',
    admissionDate: '2024-06-10',
  },
  {
    id: 24, roll: 'CEC25005', first: 'Mohan', last: 'Chandra', branch: 'CEC', year: 2,
    gender: 'male', dob: '2007-11-23', guardian: 'Vijay Chandra', guardianRelation: 'Father',
    guardianPhone: '+91 98490 13005', phone: '+91 90000 20024',
    email: 'mohan.chandra@student.demo.edu', address: '26-7-56, MG Road, Hyderabad',
    admissionDate: '2024-06-11',
  },
  {
    id: 25, roll: 'CEC25006', first: 'Swathi', last: 'Kaur', branch: 'CEC', year: 2,
    gender: 'female', dob: '2007-03-03', guardian: 'Harpreet Kaur', guardianRelation: 'Mother',
    guardianPhone: '+91 98490 13006', phone: '+91 90000 20025',
    email: 'swathi.kaur@student.demo.edu', address: '6-3-91, Rose Villa, Hyderabad',
    admissionDate: '2024-06-12',
  },
];

/* -------------------------------------------------------------------------- */
/* Deterministic helpers                                                       */
/* -------------------------------------------------------------------------- */

function hash(...parts: number[]): number {
  let value = 2166136261;
  for (const part of parts) {
    value ^= part;
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Stable pseudo-random number in [0, 1) — no Math.random, so data never shifts. */
function random01(...parts: number[]): number {
  let t = (hash(...parts) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Most recent `count` college days (Mon-Sat), oldest first. */
function schoolDaysEnding(end: Date, count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(end);
  cursor.setHours(12, 0, 0, 0);
  while (dates.length < count) {
    if (cursor.getDay() !== 0) dates.unshift(toISODate(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

// Fixed dates inside the 2025-26 academic year keep the demo stable: refresh
// the page tomorrow and the same attendance rows still line up with the
// published results and fee records.
const ATTENDANCE_DATES = schoolDaysEnding(new Date(2025, 8, 27), SCHOOL_DAYS);

function money(value: number): string {
  return value.toFixed(2);
}

/* -------------------------------------------------------------------------- */
/* Record builders                                                             */
/* -------------------------------------------------------------------------- */

function buildAttendance(studentId: number, subjects: Subject[]): AttendanceHistoryEntry[] {
  return ATTENDANCE_DATES.map((date, dayIndex) => {
    const roll = random01(studentId, dayIndex, ATTENDANCE_SALT);
    const status = roll < 0.07 ? 'absent' : roll < 0.13 ? 'late' : 'present';
    const subject = subjects[(studentId + dayIndex) % subjects.length];
    const remarkRoll = random01(studentId, dayIndex, 91);

    return {
      attendance_date: date,
      subject_code: subject.code,
      subject_name: subject.name,
      status,
      remarks:
        status === 'absent'
          ? remarkRoll < 0.5
            ? 'Medical leave'
            : 'Family function'
          : status === 'late'
            ? 'Reported late'
            : null,
    };
  }).reverse();
}

function summariseAttendance(history: AttendanceHistoryEntry[]): AttendanceSummary {
  const total = history.length;
  const present = history.filter((row) => row.status === 'present').length;
  const late = history.filter((row) => row.status === 'late').length;
  const absent = history.filter((row) => row.status === 'absent').length;
  return {
    total_sessions: total,
    present,
    absent,
    late,
    attendance_pct: total ? Math.round(((present + late) / total) * 1000) / 10 : 0,
  };
}

/** A few lower-ability students so pass percentages are not a flat 100%. */
const WEAK_STUDENT_IDS = new Set([15, 17, 21]);

function buildResults(studentId: number, subjects: Subject[]): ResultSummary[] {
  const weak = WEAK_STUDENT_IDS.has(studentId);
  const ability =
    (weak ? 18 : 22) + Math.floor(random01(studentId, 101) * (weak ? 8 : 22));

  return subjects.map((subject, index) => {
    const delta = Math.round((random01(studentId, index, 202) - 0.5) * 20);
    const marks = Math.max(8, Math.min(MAX_MARKS, ability + delta));

    return {
      exam_title: EXAM_TITLE,
      subject_code: subject.code,
      subject_name: subject.name,
      max_marks: money(MAX_MARKS),
      marks_obtained: money(marks),
      is_absent: false,
      status: 'published',
      published_at: PUBLISHED_AT,
    };
  });
}

function buildFeeDetail(seed: StudentSeed, fullName: string): StudentFeesOut {
  const plan = FEE_PLANS[seed.branch];
  const profile = random01(seed.id, 404);
  const shares = profile < 0.35 ? [1] : profile < 0.8 ? [0.4, 0.1] : [0.3];

  let paid = 0;
  const payments = shares.map((share, index) => {
    const amount = Math.round(plan.total * share);
    paid += amount;
    const method = PAYMENT_METHODS[(seed.id + index) % PAYMENT_METHODS.length];
    const day = String(5 + ((seed.id * 3 + index * 11) % 20)).padStart(2, '0');
    const month = index === 0 ? '07' : '09';
    const paidAt = `2025-${month}-${day}T10:${String(10 + index * 5).padStart(2, '0')}:00`;

    return {
      id: seed.id * 10 + index + 1,
      student_id: seed.id,
      student_name: fullName,
      roll_number: seed.roll,
      amount: money(amount),
      method,
      status: 'completed',
      reference: method === 'cash' ? null : `REF-${1000 + seed.id * 10 + index}`,
      receipt_number: `RCP-2025-${String(seed.id * 10 + index + 1).padStart(4, '0')}`,
      reversal_of_payment_id: null,
      recorded_by_name: 'Sushma Reddy',
      paid_at: paidAt,
      created_at: paidAt,
    };
  });

  const pending = plan.total - paid;

  return {
    student_id: seed.id,
    student_name: fullName,
    roll_number: seed.roll,
    branch_code: seed.branch,
    obligations: [
      {
        id: 1000 + seed.id,
        student_id: seed.id,
        fee_structure_name: plan.name,
        academic_year: ACADEMIC_YEAR,
        total_amount: money(plan.total),
        paid_amount: money(paid),
        pending_amount: money(pending),
        status: pending <= 0 ? 'cleared' : 'active',
        due_date: FEE_DUE_DATE,
        can_record_payment: false,
      },
    ],
    payments,
  };
}

export interface SampleStudent extends StudentProfile {
  /** Every sample student has attendance and fee records, so narrow the base type. */
  attendance: AttendanceSummary;
  fee: FeeSummary;
  guardian_relation: string;
  guardian_phone: string;
  attendance_history: AttendanceHistoryEntry[];
  results: ResultSummary[];
  fee_detail: StudentFeesOut;
}

function buildStudent(seed: StudentSeed): SampleStudent {
  const branch = SAMPLE_BRANCHES.find((item) => item.code === seed.branch);
  if (!branch) throw new Error(`Unknown branch ${seed.branch}`);

  const subjects = SUBJECTS[seed.branch];
  const fullName = `${seed.first} ${seed.last}`;
  const attendanceHistory = buildAttendance(seed.id, subjects);
  const results = buildResults(seed.id, subjects);
  const feeDetail = buildFeeDetail(seed, fullName);
  const obligation = feeDetail.obligations[0];

  return {
    id: seed.id,
    roll_number: seed.roll,
    first_name: seed.first,
    last_name: seed.last,
    full_name: fullName,
    branch_id: branch.id,
    branch_code: branch.code,
    branch_name: branch.name,
    class_section: seed.year === 1 ? 'I-A' : 'II-A',
    year_of_study: seed.year,
    academic_year: ACADEMIC_YEAR,
    enrollment_status: 'active',
    date_of_birth: seed.dob,
    gender: seed.gender,
    phone: seed.phone,
    email: seed.email,
    address: seed.address,
    guardian_name: seed.guardian,
    guardian_relation: seed.guardianRelation,
    guardian_phone: seed.guardianPhone,
    admission_date: seed.admissionDate,
    is_active: true,
    attendance: summariseAttendance(attendanceHistory),
    published_results: results,
    fee: {
      total_amount: obligation.total_amount,
      paid_amount: obligation.paid_amount,
      pending_amount: obligation.pending_amount,
      status: obligation.status,
      due_date: obligation.due_date,
    } satisfies FeeSummary,
    attendance_history: attendanceHistory,
    results,
    fee_detail: feeDetail,
  };
}

export const SAMPLE_STUDENTS: SampleStudent[] = STUDENT_SEEDS.map(buildStudent);

const STUDENTS_BY_ID = new Map(SAMPLE_STUDENTS.map((student) => [student.id, student]));

/* -------------------------------------------------------------------------- */
/* Public selectors                                                            */
/* -------------------------------------------------------------------------- */

function normalise(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

/** Accept both the seed convention (BIP25001) and the friendlier BIPC25001. */
function canonicalRoll(value: string): string {
  const compact = normalise(value);
  return compact.startsWith('BIPC') ? `BIP${compact.slice(4)}` : compact;
}

function toChild(student: SampleStudent): ParentChildSummary {
  return {
    student_id: student.id,
    roll_number: student.roll_number,
    full_name: student.full_name,
    branch_code: student.branch_code,
    class_section: student.class_section,
    academic_year: student.academic_year,
  };
}

export function listSampleChildren(): ParentChildSummary[] {
  return SAMPLE_STUDENTS.map(toChild);
}

export function findSampleStudent(
  branchCode: string,
  rollNumber: string,
): ParentChildSummary | null {
  const branch = normalise(branchCode);
  const roll = canonicalRoll(rollNumber);
  const student = SAMPLE_STUDENTS.find(
    (item) => item.branch_code.toUpperCase() === branch && item.roll_number === roll,
  );
  return student ? toChild(student) : null;
}

export function getSampleStudent(studentId: number): SampleStudent | null {
  return STUDENTS_BY_ID.get(studentId) ?? null;
}

export function getSampleProfile(studentId: number): StudentProfile | null {
  return getSampleStudent(studentId);
}

export function getSampleAttendanceSummary(studentId: number): AttendanceSummary | null {
  return getSampleStudent(studentId)?.attendance ?? null;
}

export function getSampleAttendanceHistory(studentId: number): AttendanceHistoryEntry[] {
  return getSampleStudent(studentId)?.attendance_history ?? [];
}

export function getSampleResults(studentId: number): ResultSummary[] {
  return getSampleStudent(studentId)?.results ?? [];
}

export function getSampleFeeSummary(studentId: number): FeeSummary | null {
  return getSampleStudent(studentId)?.fee ?? null;
}

export function getSampleFeeDetail(studentId: number): StudentFeesOut | null {
  return getSampleStudent(studentId)?.fee_detail ?? null;
}

/* -------------------------------------------------------------------------- */
/* Dashboard aggregates                                                        */
/* -------------------------------------------------------------------------- */

export interface SampleDashboardStats {
  totalStudents: number;
  branches: Array<{ code: string; name: string; students: number; share: string }>;
  attendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
    presentPct: string;
    absentPct: string;
    latePct: string;
  };
  firstYearPassPct: string;
  secondYearPassPct: string;
  overallPassPct: number;
  passTrend: Array<{ year: string; pass: number }>;
  fees: {
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    cleared: number;
    partial: number;
  };
}

function studentPassed(student: StudentProfile): boolean {
  if (student.published_results.length === 0) return false;
  return student.published_results.every(
    (row) => !row.is_absent && Number(row.marks_obtained ?? 0) >= PASS_MARKS,
  );
}

function percent(part: number, whole: number): string {
  if (whole === 0) return '0.0';
  return ((part / whole) * 100).toFixed(1);
}

export function getSampleDashboardStats(): SampleDashboardStats {
  const total = SAMPLE_STUDENTS.length;

  const branches = SAMPLE_BRANCHES.map((branch) => {
    const students = SAMPLE_STUDENTS.filter((item) => item.branch_code === branch.code).length;
    return {
      code: branch.code,
      name: branch.code,
      students,
      share: percent(students, total),
    };
  });

  // "Today" = the most recent school day in the generated attendance history.
  const latestStatuses = SAMPLE_STUDENTS.map((student) => student.attendance_history[0]?.status);
  const present = latestStatuses.filter((status) => status === 'present').length;
  const absent = latestStatuses.filter((status) => status === 'absent').length;
  const late = latestStatuses.filter((status) => status === 'late').length;

  const firstYear = SAMPLE_STUDENTS.filter((student) => student.year_of_study === 1);
  const secondYear = SAMPLE_STUDENTS.filter((student) => student.year_of_study === 2);
  const firstYearPassed = firstYear.filter(studentPassed).length;
  const secondYearPassed = secondYear.filter(studentPassed).length;
  const overallPassed = SAMPLE_STUDENTS.filter(studentPassed).length;
  const overallPassPct = Math.round((overallPassed / total) * 1000) / 10;

  const fees = SAMPLE_STUDENTS.reduce(
    (acc, student) => {
      acc.totalBilled += Number(student.fee.total_amount);
      acc.totalCollected += Number(student.fee.paid_amount);
      acc.totalOutstanding += Number(student.fee.pending_amount);
      if (student.fee.status === 'cleared') acc.cleared += 1;
      else acc.partial += 1;
      return acc;
    },
    { totalBilled: 0, totalCollected: 0, totalOutstanding: 0, cleared: 0, partial: 0 },
  );

  return {
    totalStudents: total,
    branches,
    attendance: {
      present,
      absent,
      late,
      total,
      presentPct: percent(present, total),
      absentPct: percent(absent, total),
      latePct: percent(late, total),
    },
    firstYearPassPct: percent(firstYearPassed, firstYear.length),
    secondYearPassPct: percent(secondYearPassed, secondYear.length),
    overallPassPct,
    passTrend: [
      { year: '2021', pass: 84.2 },
      { year: '2022', pass: 86.5 },
      { year: '2023', pass: 89.1 },
      { year: '2024', pass: 90.8 },
      { year: '2025', pass: overallPassPct },
    ],
    fees,
  };
}
