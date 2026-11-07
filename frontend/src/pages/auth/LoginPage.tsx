/**
 * Staff login — split layout: brand story on the left, form on the right.
 *
 * Auth behaviour is unchanged: POST /auth/login via useAuth().login, a generic
 * failure message (no credential probing), and a redirect to the originally
 * requested route (or the role's home) on success. Opening /admin/login always
 * renders the form so a fresh credential can be submitted.
 */
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { useDefaultHome } from '@/app/guards';
import { ApiError } from '@/shared/api/client';
import { BRAND, DEMO_PASSWORD } from '@/config/brand';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';

const schema = z.object({
  email: z.string().min(3, 'Required').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

const STAFF_ACCOUNTS = [
  { label: 'Principal', email: 'principal@demo.edu', blurb: 'Whole-college overview' },
  { label: 'Administrator', email: 'admin@demo.edu', blurb: 'People & setup' },
  { label: 'Accounts', email: 'accounts@demo.edu', blurb: 'Fees & receipts' },
];

const FACULTY_ACCOUNTS = [
  { label: 'MPC I Year', email: 'faculty.mpc1@demo.edu', blurb: 'MPC-I-A' },
  { label: 'MPC II Year', email: 'faculty.mpc2@demo.edu', blurb: 'MPC-II-A' },
  { label: 'BiPC I Year', email: 'faculty.bipc1@demo.edu', blurb: 'BiPC-I-A' },
  { label: 'BiPC II Year', email: 'faculty.bipc2@demo.edu', blurb: 'BiPC-II-A' },
  { label: 'CEC I Year', email: 'faculty.cec1@demo.edu', blurb: 'CEC-I-A' },
  { label: 'CEC II Year', email: 'faculty.cec2@demo.edu', blurb: 'CEC-II-A' },
];

const HIGHLIGHTS = [
  {
    icon: CalendarCheck2,
    title: 'Attendance in one tap',
    body: 'Mark a full class, save a draft, and submit with a live counter.',
  },
  {
    icon: BadgeCheck,
    title: 'Results parents trust',
    body: 'Marks stay hidden until you publish — then every reader sees the same record.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-aware by default',
    body: 'Faculty only see their classes; leadership sees the whole college.',
  },
];

export default function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const defaultHome = useDefaultHome();

  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [demoTab, setDemoTab] = useState<'staff' | 'faculty'>('staff');
  const [filledEmail, setFilledEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);
  const submitRef = useRef<HTMLButtonElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? defaultHome, { replace: true });
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.status !== 401 ? err.message : 'Invalid email or password.',
      );
    }
  };

  const useAccount = (email: string) => {
    setValue('email', email, { shouldValidate: true, shouldDirty: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true, shouldDirty: true });
    setServerError(null);
    setFilledEmail(email);
    submitRef.current?.focus();
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_PASSWORD);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const accounts = demoTab === 'staff' ? STAFF_ACCOUNTS : FACULTY_ACCOUNTS;

  return (
<<<<<<< HEAD
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-forest to-leaf text-white shadow-lg">
            <GraduationCap className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold text-plum">Prism College Portal</h1>
          <p className="mt-1 text-sm text-muted">Intermediate College Management Portal</p>
=======
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand panel (desktop) ─────────────────────────────────────── */}
      <aside className="relative hidden overflow-hidden bg-brand-700 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(60% 50% at 15% 5%, rgba(255,255,255,0.20), transparent 70%), radial-gradient(55% 45% at 95% 90%, rgba(230,138,90,0.35), transparent 70%)',
          }}
        />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3 rounded-control">
            <span className="flex h-11 w-11 items-center justify-center rounded-panel bg-white/15 ring-1 ring-white/25">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </span>
            <span>
              <span className="block text-[17px] font-extrabold leading-tight tracking-tight">
                {BRAND.collegeName}
              </span>
              <span className="block text-[12px] font-medium text-white/70">{BRAND.tagline}</span>
            </span>
          </Link>

          <div className="mt-14 max-w-md">
            <span className="inline-flex items-center gap-2 rounded-pill bg-white/12 px-3 py-1 text-[12px] font-semibold text-white/90 ring-1 ring-white/20">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Staff workspace
            </span>
            <h1 className="mt-5 text-[34px] font-extrabold leading-[1.15] tracking-tight xl:text-[40px]">
              Run the college day with clarity.
            </h1>
            <p className="mt-4 text-[14.5px] leading-7 text-white/80">
              Attendance, examinations, results and fees in one calm workspace — built so every
              number can be traced back to the person who recorded it.
            </p>
          </div>
>>>>>>> origin/main
        </div>

        <div className="relative mt-12 space-y-4">
          {HIGHLIGHTS.map((item) => (
            <div key={item.title} className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-panel bg-white/12 ring-1 ring-white/15">
                <item.icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div>
                <p className="text-[13.5px] font-bold text-white">{item.title}</p>
                <p className="mt-0.5 max-w-sm text-[12.5px] leading-6 text-white/70">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-12 flex items-center gap-3 border-t border-white/15 pt-5 text-[12px] text-white/60">
          <Users className="h-4 w-4" aria-hidden />
          <span>Demo environment · sample data only</span>
        </div>
      </aside>

      {/* ── Form panel ────────────────────────────────────────────────── */}
      <main className="flex min-h-screen flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-control text-[13px] font-semibold text-ink-soft transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to home
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
            Secure sign-in
          </span>
        </div>

        {/* Mobile brand strip */}
        <div className="mt-8 flex items-center gap-3 lg:hidden">
          <span className="flex h-10 w-10 items-center justify-center rounded-panel bg-brand-500 text-white">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[15px] font-extrabold leading-tight text-ink">{BRAND.collegeName}</p>
            <p className="text-[11.5px] text-muted">{BRAND.tagline}</p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[27rem] flex-1 flex-col justify-center py-8">
          <div className="animate-fade-up">
            <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">
              Welcome back
            </h2>
            <p className="mt-1.5 text-[13.5px] text-muted">
              Sign in to your staff workspace to continue.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              {serverError ? (
                <div
                  className="flex items-start gap-2.5 rounded-panel border border-danger/25 bg-danger-bg px-3.5 py-3"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                  <div>
                    <p className="text-[13px] font-bold text-danger">Sign-in failed</p>
                    <p className="mt-0.5 text-[12.5px] leading-5 text-ink-soft">{serverError}</p>
                  </div>
                </div>
              ) : null}

              <Field label="Email address" htmlFor="email" error={errors.email?.message} required>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@demo.edu"
                  invalid={Boolean(errors.email)}
                  leading={<Mail className="h-4 w-4" aria-hidden />}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  {...register('email')}
                />
              </Field>

              <Field
                label="Password"
                htmlFor="password"
                error={errors.password?.message}
                required
                action={
                  <span className="text-[11.5px] font-medium text-muted">Demo: {DEMO_PASSWORD}</span>
                }
              >
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  invalid={Boolean(errors.password)}
                  leading={<LockKeyhole className="h-4 w-4" aria-hidden />}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  }
                  {...register('password')}
                />
              </Field>

              <Button
                ref={submitRef}
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
                icon={
                  isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  )
                }
              >
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            {/* ── Quick demo login ─────────────────────────────────────── */}
            <section className="mt-7 rounded-card border border-line bg-surface p-4 shadow-card" aria-labelledby="demo-heading">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 id="demo-heading" className="text-[13.5px] font-bold text-ink">
                    Quick demo login
                  </h3>
                  <p className="text-[12px] text-muted">One click fills the form — no typing needed.</p>
                </div>
                <Tabs
                  label="Demo account type"
                  variant="pill"
                  value={demoTab}
                  onChange={(id) => setDemoTab(id as 'staff' | 'faculty')}
                  tabs={[
                    { id: 'staff', label: 'Staff' },
                    { id: 'faculty', label: 'Faculty' },
                  ]}
                />
              </div>

              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {accounts.map((account) => {
                  const selected = filledEmail === account.email;
                  return (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => useAccount(account.email)}
                      className={`flex items-center gap-2.5 rounded-panel border px-2.5 py-2 text-left transition-colors duration-150 ${
                        selected
                          ? 'border-brand-200 bg-brand-50'
                          : 'border-line bg-surface hover:border-brand-200 hover:bg-surface-2'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                          selected ? 'bg-brand-500 text-white' : 'bg-surface-2 text-brand-600'
                        }`}
                      >
                        {selected ? (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <Users className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-bold text-ink">
                          {account.label}
                        </span>
                        <span className="block truncate text-[11px] text-muted">{account.blurb}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-panel bg-surface-2 px-3 py-2">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="font-semibold text-ink-soft">Password</span>
                  <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] text-brand-700 ring-1 ring-line">
                    {DEMO_PASSWORD}
                  </code>
                  <span className="text-muted">for every demo account</span>
                </div>
                <button
                  type="button"
                  onClick={() => void copyPassword()}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="sr-only" aria-live="polite">
                {copied ? 'Demo password copied to clipboard.' : ''}
              </p>
            </section>

            <p className="mt-6 text-center text-[12.5px] text-muted">
              Parents can{' '}
              <Link to="/parent" className="font-semibold text-brand-700 hover:underline">
                view their child&apos;s records
              </Link>{' '}
              without signing in.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
