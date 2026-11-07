/**
 * Compact parent-portal chrome used by the open (demo) directory and
 * student pages. Logo + title stay on the left; actions never wrap.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Home, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { DEMO_OPEN_PARENT } from '@/config/demo';

export default function ParentShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            aria-label="Prism College home"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            <span className="truncate text-sm font-bold text-ink">Parent Portal</span>
            {DEMO_OPEN_PARENT ? (
              <Badge tone="warning" className="hidden sm:inline-flex">
                Demo mode
              </Badge>
            ) : null}
          </Link>

          <nav className="flex shrink-0 items-center gap-1" aria-label="Parent portal">
            {DEMO_OPEN_PARENT ? (
              <span className="mr-1 sm:hidden">
                <Badge tone="warning">Demo</Badge>
              </span>
            ) : null}
            <Link
              to="/parent/students"
              className={buttonClass({ variant: 'ghost', size: 'sm' })}
              aria-label="All students"
              title="All students"
            >
              <Users className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">All students</span>
            </Link>
            <Link
              to="/"
              className={buttonClass({ variant: 'ghost', size: 'sm' })}
              aria-label="Home"
              title="Home"
            >
              <Home className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
