/**
 * Parent portal landing page — /parent (demo mode only).
 *
 * This is the first screen a visitor sees after clicking "Parent Portal" on
 * the home page. It introduces the portal and links into the student
 * directory (/parent/students); it never lists or opens a record directly,
 * so the intended flow stays Home → Overview → Directory → Student.
 *
 * Every number here comes from the read-only demo API — nothing is mocked.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Building2,
  ChevronRight,
  Eye,
  GraduationCap,
  Users,
} from 'lucide-react';
import { get } from '@/shared/api/client';
import type {
  AnnouncementPage,
  BranchOut,
  ParentDirectoryPage,
} from '@/shared/api/types';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader';
import { Skeleton, SkeletonStatGrid } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { DEMO_OPEN_PARENT } from '@/config/demo';
import { demoGet } from './parentClient';
import ParentShell from './ParentShell';

interface OverviewData {
  totalStudents: number;
  branches: BranchOut[];
  totalAnnouncements: number;
}

export default function ParentOverviewPage(): JSX.Element {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    // Students are the essential payload; branches and notices degrade to
    // empty instead of blanking the whole landing page.
    Promise.all([
      demoGet<ParentDirectoryPage>('/students', { page: 1, page_size: 1 }),
      get<BranchOut[]>('/meta/branches').catch(() => [] as BranchOut[]),
      demoGet<AnnouncementPage>('/announcements', { page: 1, page_size: 1 }).catch(
        () => null,
      ),
    ])
      .then(([directory, branches, announcements]) => {
        if (!alive) return;
        setData({
          totalStudents: directory.total,
          branches,
          totalAnnouncements: announcements?.total ?? 0,
        });
      })
      .catch((err) => {
        if (alive) setError(err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [attempt]);

  return (
    <ParentShell>
      <PageHeader
        eyebrow="Parent Portal"
        title="Parent overview"
        description="Read-only access to a student's attendance, published results and fee status. Start in the student directory, then open the record you need."
        actions={
          <Link to="/parent/students" className={buttonClass({ size: 'md' })}>
            Browse student directory
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
        meta={
          DEMO_OPEN_PARENT ? (
            <Badge tone="warning">Demo mode — records are read-only</Badge>
          ) : null
        }
      />

      <div className="mt-6 space-y-6">
        {error ? (
          <ErrorState
            error={error}
            onRetry={reload}
            title="Could not load the parent portal"
          />
        ) : loading || !data ? (
          <div className="space-y-6" role="status" aria-live="polite">
            <span className="sr-only">Loading parent portal…</span>
            <SkeletonStatGrid count={4} />
            <Skeleton className="h-40 w-full rounded-panel" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard
                label="Students"
                value={data.totalStudents}
                hint="Active records in the directory"
                icon={<Users className="h-4 w-4" />}
                tone="brand"
                to="/parent/students"
              />
              <StatCard
                label="Branches"
                value={data.branches.length}
                hint={
                  data.branches.length > 0
                    ? data.branches.map((b) => b.code).join(' · ')
                    : 'No branches configured'
                }
                icon={<Building2 className="h-4 w-4" />}
                tone="accent"
              />
              <StatCard
                label="Notices"
                value={data.totalAnnouncements}
                hint="Published for parents"
                icon={<Bell className="h-4 w-4" />}
                tone="success"
              />
              <StatCard
                label="Access"
                value="Read-only"
                hint="No edits, payments or waivers"
                icon={<Eye className="h-4 w-4" />}
                tone="neutral"
              />
            </div>

            <section aria-label="Browse by branch">
              <SectionTitle
                title="Browse by branch"
                description="Open the directory already filtered to a stream."
                actions={
                  <Link
                    to="/parent/students"
                    className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    All students
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                }
              />
              <h2 id="browse-by-branch" className="sr-only">
                Browse by branch
              </h2>
              {data.branches.length === 0 ? (
                <EmptyState
                  icon={<Building2 className="h-5 w-5" aria-hidden />}
                  title="No branches configured"
                  description="The directory still lists every student. Open it to search by name or roll number."
                  action={
                    <Link to="/parent/students" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                      Open student directory
                    </Link>
                  }
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-3">
                  {data.branches.map((branch) => (
                    <li key={branch.id}>
                      <Link
                        to={`/parent/students?branch_id=${branch.id}`}
                        className="card group flex h-full items-center gap-3 p-4 transition-[border-color,box-shadow] hover:border-brand-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-600">
                          <GraduationCap className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-ink">{branch.code}</span>
                          <span className="block truncate text-[12.5px] text-muted">
                            {branch.name}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Card>
              <CardHeader
                title="How the parent portal works"
                description="Three steps, no login in demo mode."
              />
              <CardBody>
                <ol className="grid gap-4 sm:grid-cols-3">
                  <Step
                    step={1}
                    title="Find the student"
                    body="Search the directory by name or roll number, or filter by branch."
                  />
                  <Step
                    step={2}
                    title="Open the record"
                    body="Each row opens that student's overview with their current enrolment."
                  />
                  <Step
                    step={3}
                    title="Review the details"
                    body="Switch between Attendance, Results, Fees and Announcements — all read-only."
                  />
                </ol>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </ParentShell>
  );
}

function Step({
  step,
  title,
  body,
}: {
  step: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[12.5px] font-bold text-brand-700"
        aria-hidden
      >
        {step}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{body}</p>
      </div>
    </li>
  );
}
