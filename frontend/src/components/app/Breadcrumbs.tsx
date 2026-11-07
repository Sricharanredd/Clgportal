/** Breadcrumbs derived from the URL (no per-page wiring required). */
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { PAGE_LABELS } from './navigation';

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`;
    const isId = /^\d+$/.test(segment);
    const label = isId ? 'Profile' : PAGE_LABELS[segment] ?? segment.replace(/-/g, ' ');
    return { path, label, isLast: index === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[13px] sm:flex">
      <Link
        to="/dashboard"
        className="flex items-center gap-1.5 rounded px-1 py-0.5 text-muted transition-colors hover:text-brand-700"
      >
        <Home className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Dashboard home</span>
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-line-strong" aria-hidden />
          {crumb.isLast ? (
            <span aria-current="page" className="truncate font-semibold text-ink">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="truncate rounded px-0.5 text-muted transition-colors hover:text-brand-700"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
