/**
 * Public home page — choose Admin (staff login) or Parent (record lookup).
 * No authentication required; pure navigation landing in the Prism Glass style.
 */
import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, UserRound } from 'lucide-react';

export default function HomePage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-rose text-white shadow-lg">
            <GraduationCap className="h-8 w-8" aria-hidden />
          </span>
          <h1 className="text-3xl font-bold text-plum">Prism College</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Intermediate college management portal. Staff manage academics, attendance,
            examinations and fees; parents can view their child's records.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            to="/admin/login"
            className="glass-card group flex flex-col items-center gap-3 rounded-2xl p-8 text-center transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet/20 to-periwinkle/30 text-violet">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-lg font-bold text-plum">Admin</span>
            <span className="text-sm text-muted">
              Sign in for principal, administrator, accounts and faculty staff access.
            </span>
            <span className="mt-1 text-sm font-semibold text-violet group-hover:underline">
              Open staff login →
            </span>
          </Link>

          <Link
            to="/parent"
            className="glass-card group flex flex-col items-center gap-3 rounded-2xl p-8 text-center transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose/20 to-peach/40 text-rose">
              <UserRound className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-lg font-bold text-plum">Parent</span>
            <span className="text-sm text-muted">
              Look up your child's attendance, published results and fee status.
            </span>
            <span className="mt-1 text-sm font-semibold text-violet group-hover:underline">
              Open parent portal →
            </span>
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Parent records are read-only and shown only after college verification.
        </p>
      </div>
    </div>
  );
}
