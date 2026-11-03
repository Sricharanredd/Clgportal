import { Check, CircleCheck } from 'lucide-react';
import { heroPreview } from '../content';

const RING_RADIUS = 15.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 97.39

/**
 * Hero product preview — a CSS/SVG mock of the staff dashboard:
 * attendance ring, latest results card and fee-status chip, on a gently
 * tilted, floating glass card. Fully decorative (aria-hidden) because the
 * same facts are stated in the page copy.
 */
export default function DashboardMockup(): JSX.Element {
  const { attendance, results, fee, title, floatChip } = heroPreview;
  const dash = (attendance.percent / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
      {/* Glow behind the card */}
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand-400/30 via-lavender/40 to-accent-100/70 blur-2xl" />

      <div className="lp-float relative">
        <div className="rotate-1 sm:rotate-2">
          <div className="glass-card rounded-2xl p-4 shadow-lift sm:p-5">
            {/* Window chrome */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent-500/70" />
                  <span className="h-2 w-2 rounded-full bg-brand-400/70" />
                  <span className="h-2 w-2 rounded-full bg-success/60" />
                </span>
                <span className="ml-1 text-xs font-semibold text-plum/80">{title}</span>
              </div>
              <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                Live
              </span>
            </div>

            {/* Widgets */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* Attendance ring */}
              <div className="surface rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r={RING_RADIUS}
                      fill="none"
                      stroke="rgb(var(--brand-100))"
                      strokeWidth="4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r={RING_RADIUS}
                      fill="none"
                      stroke="rgb(var(--brand-500))"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${dash} ${RING_CIRCUMFERENCE}`}
                    />
                  </svg>
                  <div>
                    <p className="text-2xl font-extrabold leading-none text-plum">
                      {attendance.percent}%
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-plum/70">
                      {attendance.label}
                    </p>
                    <p className="text-[10px] text-plum/60">{attendance.detail}</p>
                  </div>
                </div>
              </div>

              {/* Fee status */}
              <div className="surface flex flex-col justify-between gap-3 rounded-xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-plum/60">
                  {fee.label}
                </p>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                  <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                  {fee.value}
                </span>
                <span className="text-[10px] text-plum/60">Receipts · Term 2</span>
              </div>

              {/* Results */}
              <div className="surface rounded-xl p-4 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-plum/60">
                    {results.label}
                  </p>
                  <span className="text-[10px] font-medium text-brand-600">II-A</span>
                </div>
                <ul className="mt-2.5 space-y-2">
                  {results.rows.map((row) => (
                    <li key={row.subject} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-plum/80">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
                          <Check className="h-2.5 w-2.5" aria-hidden />
                        </span>
                        <span className="truncate">{row.subject}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-bold tabular-nums text-plum">{row.mark}</span>
                        <span className="w-7 rounded-md bg-brand-500/10 px-1.5 py-0.5 text-center text-[10px] font-bold text-brand-600">
                          {row.grade}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating confirmation chip */}
      <div className="absolute -bottom-5 left-2 flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3.5 py-2 shadow-lift backdrop-blur sm:left-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 text-success">
          <CircleCheck className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="text-xs font-semibold text-plum">{floatChip}</span>
      </div>
    </div>
  );
}
