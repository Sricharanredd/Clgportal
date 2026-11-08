/**
 * Public college overview shown on the Student Info landing page.
 *
 * Every figure comes from GET /parent/demo/overview, which aggregates the
 * live database. There is no sample dataset: when a dataset is empty the
 * matching panel renders an explicit empty state instead of invented numbers.
 */
import { useCallback, useEffect, useState } from 'react';
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
import type { DemoOverview } from '@/shared/api/types';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Panel } from '@/components/ui/Panel';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { demoGet } from '@/pages/parent/parentClient';

type Kpi = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  highlight?: boolean;
};

const BRANCH_COLORS = ['#174C32', '#7DA989', '#B7D3BE', '#2E6B4A', '#DCEEDB'];

const BRANCH_ICONS: Record<string, LucideIcon> = {
  MPC: Calculator,
  BIPC: FlaskConical,
  CEC: BriefcaseBusiness,
};

const ABOUT_FACTS = [
  { label: 'Established', value: '2008', hint: '18+ years of service', icon: Building2 },
  { label: 'Campus', value: 'Hyderabad', hint: 'Knowledge Park', icon: MapPin },
  { label: 'Board', value: 'TSBIE', hint: 'Recognized affiliation', icon: BadgeCheck },
  { label: 'Streams', value: 'MPC · BiPC · CEC', hint: '+2 higher secondary', icon: GraduationCap },
];

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid rgba(23,76,50,0.28)',
  fontSize: 12,
};

function StatCard({ label, value, hint, icon: Icon, highlight }: Kpi) {
  return (
    <div
      className={
        highlight
          ? 'rounded-2xl border border-brand-600 bg-gradient-to-br from-brand-600 to-brand-500 p-4 shadow-soft'
          : 'glass-card rounded-2xl p-4'
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-[11px] font-medium uppercase leading-snug tracking-wide ${
            highlight ? 'text-brand-100/85' : 'text-muted'
          }`}
        >
          {label}
        </p>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            highlight ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-600'
          }`}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${highlight ? 'text-white' : 'text-ink'}`}>{value}</p>
      <p className={`mt-1 text-[11px] leading-snug ${highlight ? 'text-brand-100/75' : 'text-muted'}`}>
        {hint}
      </p>
    </div>
  );
}

function AboutPanel() {
  return (
    <Panel title="About Our College">
      <div className="grid gap-5 md:grid-cols-12">
        <div className="md:col-span-7">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-450 text-white">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h3 className="text-base font-bold text-ink">Prism Intermediate College</h3>
              <p className="text-xs text-muted">Affiliated with TSBIE · Knowledge Park, Hyderabad</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Established in 2008, the college is dedicated to excellence in +2 higher secondary
            education. It offers the MPC, BiPC and CEC streams with quality faculty instruction,
            well-maintained science laboratories and transparent academic record-keeping for
            students and guardians.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-5">
          {ABOUT_FACTS.map((fact) => (
            <div key={fact.label} className="rounded-xl border border-line bg-surface-2 p-3">
              <fact.icon className="h-4 w-4 text-brand-500" aria-hidden />
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-muted">
                {fact.label}
              </p>
              <p className="text-sm font-bold text-ink">{fact.value}</p>
              <p className="text-[11px] text-muted">{fact.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export default function CollegeOverview(): JSX.Element {
  const [data, setData] = useState<DemoOverview | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await demoGet<DemoOverview>('/overview'));
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageSkeleton stats={6} panels={2} />;
  if (error) return <ErrorState error={error} onRetry={() => void load()} />;
  if (!data) {
    return (
      <EmptyState
        title="College overview unavailable"
        hint="The overview did not return any data. Please try again later."
      />
    );
  }

  const branches = data.branches.map((branch, index) => ({
    name: branch.code,
    students: branch.students,
    share: `${branch.share_pct}%`,
    color: BRANCH_COLORS[index % BRANCH_COLORS.length],
  }));

  const kpis: Kpi[] = [
    {
      label: 'Total Students',
      value: String(data.total_students),
      hint: 'All streams · active students',
      icon: Users,
      highlight: true,
    },
    ...data.branches.slice(0, 3).map((branch) => ({
      label: `${branch.code} Students`,
      value: String(branch.students),
      hint: `${branch.share_pct}% of total students`,
      icon: BRANCH_ICONS[branch.code.toUpperCase()] ?? Users,
    })),
    {
      label: '1st Year Pass Percentage',
      value: data.first_year_pass.total > 0 ? `${data.first_year_pass.pass_pct}%` : '—',
      hint:
        data.first_year_pass.total > 0
          ? `${data.first_year_pass.passed}/${data.first_year_pass.total} students passed`
          : 'No published results yet',
      icon: TrendingUp,
    },
    {
      label: '2nd Year Pass Percentage',
      value: data.second_year_pass.total > 0 ? `${data.second_year_pass.pass_pct}%` : '—',
      hint:
        data.second_year_pass.total > 0
          ? `${data.second_year_pass.passed}/${data.second_year_pass.total} students passed`
          : 'No published results yet',
      icon: Award,
    },
  ];

  const attendance = [
    { name: 'Present', value: data.attendance.present, pct: `${data.attendance.present_pct}%`, color: '#174C32' },
    { name: 'Absent', value: data.attendance.absent, pct: `${data.attendance.absent_pct}%`, color: '#B02A37' },
    { name: 'Late', value: data.attendance.late, pct: `${data.attendance.late_pct}%`, color: '#7DA989' },
  ];

  const branchAxisMax =
    Math.ceil(Math.max(1, ...branches.map((branch) => branch.students)) / 4) * 4 || 4;
  const branchAxisTicks = Array.from(
    { length: 5 },
    (_, index) => (branchAxisMax / 4) * index,
  );

  return (
    <div className="space-y-6">
      {/* Live-data disclosure */}
      <div className="flex items-start gap-2 rounded-xl border border-line-strong bg-brand-50 px-4 py-2.5 text-xs text-brand-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">Live data.</span> These figures are aggregated from the
          college database. Attendance reflects the latest submitted session and results include
          published examinations only.
        </p>
      </div>

      {/* 1. Student strength and pass percentages */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* 2. Attendance, pass trend and branch distribution */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <Panel
          title="Attendance — Latest Day"
          description={
            data.attendance.attendance_date
              ? `Submitted session on ${data.attendance.attendance_date}`
              : 'No submitted attendance yet'
          }
          className="xl:col-span-4"
        >
          {data.attendance.total === 0 ? (
            <EmptyState
              compact
              title="No attendance data"
              hint="Attendance figures appear after a session is submitted."
            />
          ) : (
            <>
              <div className="relative h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendance}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {attendance.map((item) => (
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
                  <span className="text-xl font-bold text-ink">{data.attendance.present_pct}%</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted">Present</span>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {attendance.map((item) => (
                  <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 text-muted">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                        aria-hidden
                      />
                      {item.name}
                    </span>
                    <span className="font-semibold text-ink">
                      {item.value} <span className="font-normal text-muted">({item.pct})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel title="Published Exam Pass Rate" className="xl:col-span-5">
          {data.exam_trend.length === 0 ? (
            <EmptyState
              compact
              title="No published results"
              hint="Pass rates appear after examination results are published."
            />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.exam_trend}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="passTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#174C32" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#174C32" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,76,50,0.14)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5A6B60' }} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fontSize: 11, fill: '#5A6B60' }}
                    width={40}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Pass rate']}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Area
                    type="monotone"
                    dataKey="pass_pct"
                    stroke="#174C32"
                    strokeWidth={2}
                    fill="url(#passTrendFill)"
                    dot={{ r: 3, fill: '#174C32', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Branch-wise Student Distribution" className="md:col-span-2 xl:col-span-3">
          {branches.length === 0 ? (
            <EmptyState
              compact
              title="No branch data"
              hint="Branches appear once they are configured."
            />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branches} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,76,50,0.14)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5A6B60' }} tickLine={false} />
                  <YAxis
                    domain={[0, branchAxisMax]}
                    ticks={branchAxisTicks}
                    tick={{ fontSize: 11, fill: '#5A6B60' }}
                    width={32}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value)} students`, 'Enrolled']}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar dataKey="students" radius={[6, 6, 0, 0]}>
                    {branches.map((branch) => (
                      <Cell key={branch.name} fill={branch.color} />
                    ))}
                    <LabelList dataKey="students" position="top" fill="#142B1E" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* 3. About the college */}
      <AboutPanel />
    </div>
  );
}
