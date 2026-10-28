/**
 * Login page — email + password against POST /api/v1/auth/login.
 * Shows a generic failure message (no credential probing) per security spec.
 *
 * This page ALWAYS renders the form. It never silently redirects an already
 * authenticated visitor to a dashboard: opening /admin/login (e.g. via the
 * home page's Admin card) must show the login form, and a valid submitted
 * credential is what establishes the session. After success the user is sent
 * to the route they originally requested, else to their role's landing page.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, LogIn } from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { useDefaultHome } from '@/app/guards';
import { ApiError } from '@/shared/api/client';

const schema = z.object({
  email: z.string().min(3, 'Required').email('Enter a valid email'),
  password: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

const STAFF_ACCOUNTS = [
  { label: 'Principal', email: 'principal@demo.edu' },
  { label: 'Administrator', email: 'admin@demo.edu' },
  { label: 'Accounts', email: 'accounts@demo.edu' },
];

const FACULTY_ACCOUNTS = [
  { label: 'Faculty · MPC I Yr', email: 'faculty.mpc1@demo.edu' },
  { label: 'Faculty · MPC II Yr', email: 'faculty.mpc2@demo.edu' },
  { label: 'Faculty · BiPC I Yr', email: 'faculty.bipc1@demo.edu' },
  { label: 'Faculty · BiPC II Yr', email: 'faculty.bipc2@demo.edu' },
  { label: 'Faculty · CEC I Yr', email: 'faculty.cec1@demo.edu' },
  { label: 'Faculty · CEC II Yr', email: 'faculty.cec2@demo.edu' },
];

export default function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const defaultHome = useDefaultHome();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      // Establishes a NEW session (server rotates the refresh cookie).
      await login(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? defaultHome, { replace: true });
    } catch (err) {
      // Deliberately generic: never reveal whether the account exists.
      setServerError(
        err instanceof ApiError && err.status !== 401
          ? err.message
          : 'Invalid email or password.',
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-rose text-white shadow-lg">
            <GraduationCap className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold text-plum">Prism College Portal</h1>
          <p className="mt-1 text-sm text-muted">Intermediate College Management Portal</p>
        </div>

        <form
          className="glass-card space-y-4 rounded-2xl p-6"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          {serverError ? (
            <div
              className="rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-plum"
              role="alert"
            >
              {serverError}
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-plum">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="surface w-full rounded-xl px-3 py-2.5 text-sm text-plum placeholder:text-muted focus:border-violet"
              placeholder="you@demo.edu"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-rose">{errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-plum">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="surface w-full rounded-xl px-3 py-2.5 text-sm text-plum placeholder:text-muted focus:border-violet"
              placeholder="••••••••"
              {...register('password')}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-rose">{errors.password.message}</p>
            ) : null}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            <LogIn className="h-4 w-4" />
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="pt-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Demo accounts (password: Demo@1234)
            </p>
            <div className="space-y-2">
              <div>
                <p className="mb-1 text-[11px] text-muted">Staff</p>
                <div className="flex flex-wrap gap-2">
                  {STAFF_ACCOUNTS.map((acct) => (
                    <button
                      key={acct.email}
                      type="button"
                      className="rounded-full border border-periwinkle/50 bg-white/70 px-3 py-1 text-xs font-medium text-violet hover:bg-white"
                      onClick={() => {
                        setValue('email', acct.email, { shouldValidate: true });
                        setValue('password', 'Demo@1234', { shouldValidate: true });
                      }}
                    >
                      {acct.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-muted">Faculty (branch · year)</p>
                <div className="flex flex-wrap gap-2">
                  {FACULTY_ACCOUNTS.map((acct) => (
                    <button
                      key={acct.email}
                      type="button"
                      className="rounded-full border border-periwinkle/50 bg-white/70 px-3 py-1 text-xs font-medium text-violet hover:bg-white"
                      onClick={() => {
                        setValue('email', acct.email, { shouldValidate: true });
                        setValue('password', 'Demo@1234', { shouldValidate: true });
                      }}
                    >
                      {acct.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="font-medium text-violet hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
