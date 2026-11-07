/**
 * Visitor / parent overview shown on the existing dashboard route when the
 * caller has no staff role. Every figure is derived from the shared sample
 * dataset so the dashboard, student search and all Student Info tabs agree.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Calculator,
  FlaskConical,
  GraduationCap,
  Info,
  MapPin,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { EXAM_TITLE, getSampleDashboardStats } from '@/shared/data/sampleData';

type Kpi = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  highlight?: boolean;
};

const STATS = getSampleDashboardStats();

const BRANCH_COLORS = ['#2F6B3C', '#5B9A63', '#A9CDAF'];

const BRANCHES = STATS.branches.map((branch, index) => ({
  name: branch.code,
  students: branch.students,
  share: `${branch.share}%`,
  color: BRANCH_COLORS[index % BRANCH_COLORS.length],
}));

const KPIS: Kpi[] = [
  {
    label: 'Total Students',
    value: String(STATS.totalStudents),
    hint: 'All streams · current sample strength',
    icon: Users,
    highlight: true,
  },
  {
    label: 'MPC Students',
    value: String(BRANCHES[0].students),
    hint: `${BRANCHES[0].share} of total students`,
    icon: Calculator,
  },
  {
    label: 'BiPC Students',
    value: String(BRANCHES[1].students),
    hint: `${BRANCHES[1].share} of total students`,
    icon: FlaskConical,
  },
  {
    label: 'CEC Students',
    value: String(BRANCHES[2].students),
    hint: `${BRANCHES[2].share} of total students`,
    icon: BriefcaseBusiness,
  },
  {
    label: '1st Year Pass Percentage',
    value: `${STATS.firstYearPassPct}%`,
    hint: `${EXAM_TITLE} · published results`,
    icon: TrendingUp,
  },
  {
    label: '2nd Year Pass Percentage',
    value: `${STATS.secondYearPassPct}%`,
    hint: `${EXAM_TITLE} · published results`,
    icon: Award,
  },
];

const ATTENDANCE = [
  { name: 'Present', value: STATS.attendance.present, pct: `${STATS.attendance.presentPct}%`, color: '#2F6B3C' },
  { name: 'Absent', value: STATS.attendance.absent, pct: `${STATS.attendance.absentPct}%`, color: '#A8463F' },
  { name: 'Late', value: STATS.attendance.late, pct: `${STATS.attendance.latePct}%`, color: '#A9CDAF' },
];

const PASS_TREND = STATS.passTrend;

const BRANCH_AXIS_MAX = Math.ceil(Math.max(...BRANCHES.map((branch) => branch.students)) / 4) * 4;
const BRANCH_AXIS_TICKS = Array.from(
  { length: 5 },
  (_, index) => (BRANCH_AXIS_MAX / 4) * index,
);

const ABOUT_FACTS = [
  { label: 'Established', value: '2008', hint: '18+ years of service', icon: Building2 },
  { label: 'Campus', value: 'Hyderabad', hint: 'Knowledge Park', icon: MapPin },
  { label: 'Board', value: 'TSBIE', hint: 'Recognized affiliation', icon: BadgeCheck },
  { label: 'Streams', value: 'MPC · BiPC · CEC', hint: '+2 higher secondary', icon: GraduationCap },
];

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid rgba(47,107,60,0.25)',
  fontSize: 12,
};

function StatCard({ label, value, hint, icon: Icon, highlight }: Kpi) {
  return (
    <div
      className={
        highlight
          ? 'rounded-2xl border border-forest-dark bg-gradient-to-br from-forest-dark to-forest p-4 shadow-soft'
          : 'glass-card rounded-2xl p-4'
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-[11px] font-medium uppercase leading-snug tracking-wide ${
            highlight ? 'text-mint/85' : 'text-muted'
          }`}
        >
          {label}
        </p>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            highlight ? 'bg-white/15 text-white' : 'bg-mist text-forest'
          }`}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${highlight ? 'text-white' : 'text-forest-dark'}`}>{value}</p>
      <p className={`mt-1 text-[11px] leading-snug ${highlight ? 'text-mint/75' : 'text-muted'}`}>{hint}</p>
    </div>
  );
}

export default function CollegeOverview(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Demo-data disclosure */}
      <div className="flex items-start gap-2 rounded-xl border border-leaf/30 bg-mist/80 px-4 py-2.5 text-xs text-forest">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">Sample dataset.</span> These figures are generated from the same
          25 fictional students shown on the Student Info page, so attendance, results and fees always
          agree across the portal.
        </p>
      </div>

      {/* 1. Student strength and pass percentages */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* 2. Attendance, trend and branch distribution */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <Panel title="Attendance — Latest Day" className="xl:col-span-4">
          <div className="relative h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ATTENDANCE}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={2}
                  stroke="none"
                >
                  {ATTENDANCE.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${Number(value)} students`, 'Attendance']}
                  contentStyle={TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-forest-dark">{STATS.attendance.presentPct}%</span>
              <span className="text-[10px] uppercase tracking-wide text-muted">Present</span>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {ATTENDANCE.map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 text-muted">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  {item.name}
                </span>
                <span className="font-semibold text-plum">
                  {item.value} <span className="font-normal text-muted">({item.pct})</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Pass Percentage Trend (Last 5 Years)" className="xl:col-span-5">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PASS_TREND} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="passTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2F6B3C" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2F6B3C" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(47,107,60,0.15)" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#5B6E60' }} tickLine={false} />
                <YAxis
                  domain={[70, 100]}
                  ticks={[70, 80, 90, 100]}
                  tick={{ fontSize: 11, fill: '#5B6E60' }}
                  width={40}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Pass percentage']}
                  labelFormatter={(label) => `Year ${label}`}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Area
                  type="monotone"
                  dataKey="pass"
                  stroke="#2F6B3C"
                  strokeWidth={2}
                  fill="url(#passTrendFill)"
                  dot={{ r: 3, fill: '#2F6B3C', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Branch-wise Student Distribution" className="md:col-span-2 xl:col-span-3">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BRANCHES} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(47,107,60,0.15)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5B6E60' }} tickLine={false} />
                <YAxis
                  domain={[0, BRANCH_AXIS_MAX]}
                  ticks={BRANCH_AXIS_TICKS}
                  tick={{ fontSize: 11, fill: '#5B6E60' }}
                  width={32}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value)} students`, 'Enrolled']}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar dataKey="students" radius={[6, 6, 0, 0]}>
                  {BRANCHES.map((branch) => (
                    <Cell key={branch.name} fill={branch.color} />
                  ))}
                  <LabelList dataKey="students" position="top" fill="#1E3A26" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* 3. About the college */}
      <Panel title="About Our College">
        <div className="grid gap-5 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-forest to-leaf text-white">
                <GraduationCap className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-bold text-forest-dark">Sri Venkateswara Junior College</h3>
                <p className="text-xs text-muted">Affiliated with TSBIE · Knowledge Park, Hyderabad</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Established in 2008, the college is dedicated to excellence in +2 higher secondary education.
              It offers the MPC, BiPC and CEC streams with quality faculty instruction, well-maintained
              science laboratories and transparent academic record-keeping for students and guardians.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:col-span-5">
            {ABOUT_FACTS.map((fact) => (
              <div key={fact.label} className="rounded-xl border border-mint/70 bg-mist/50 p-3">
                <fact.icon className="h-4 w-4 text-leaf" aria-hidden />
                <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-muted">
                  {fact.label}
                </p>
                <p className="text-sm font-bold text-forest-dark">{fact.value}</p>
                <p className="text-[11px] text-muted">{fact.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
