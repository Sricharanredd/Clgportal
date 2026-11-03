import { features } from '../content';
import Reveal from '../Reveal';

/** Icon-chip tints cycle through these so the grid feels varied but coherent. */
const chipTints = [
  'bg-brand-500/10 text-brand-600',
  'bg-accent-500/10 text-accent-700',
  'bg-brand-400/20 text-brand-600',
  'bg-success/10 text-success',
  'bg-lavender/70 text-brand-600',
  'bg-peach/60 text-accent-700',
] as const;

/**
 * Six-card feature grid: Attendance, Examinations and Results, Fees,
 * Parent Visibility, Role-based Access and Reports.
 */
export default function Features(): JSX.Element {
  return (
    <section id="features" className="scroll-mt-24 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="lp-section-kicker">Features</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-plum sm:text-4xl">
              Everything the front office and the classroom need
            </h2>
            <p className="mt-4 text-base leading-relaxed text-plum/70">
              Six modules that cover the working day of an intermediate college — no spreadsheets
              to chase, no register left behind.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={(index % 3) * 80}>
                <article className="glass-card h-full rounded-2xl p-6 transition-all duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lift">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${chipTints[index % chipTints.length]}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-plum">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-plum/70">
                    {feature.description}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
