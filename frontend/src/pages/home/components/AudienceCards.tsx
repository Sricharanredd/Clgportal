import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { audiences } from '../content';
import Reveal from '../Reveal';

/** Accent styling for the two audience cards, keyed by `accent` in content.ts. */
const accents = {
  brand: {
    chip: 'bg-brand-500/10 text-brand-600',
    bullet: 'bg-brand-500/10 text-brand-600',
    cta: 'lp-btn-brand',
    glow: 'hover:shadow-glow-brand hover:border-brand-400/50',
  },
  accent: {
    chip: 'bg-accent-500/10 text-accent-700',
    bullet: 'bg-accent-500/10 text-accent-700',
    cta: 'lp-btn-accent',
    glow: 'hover:shadow-glow-accent hover:border-accent-500/50',
  },
} as const;

/**
 * Two audience cards — Staff and Parent. Each card is a single link to its
 * portal, with its own accent colour, icon, bullets and full-width CTA.
 */
export default function AudienceCards(): JSX.Element {
  return (
    <section id="about" className="scroll-mt-24 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="lp-section-kicker">About the portal</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-plum sm:text-4xl">
              Built for both sides of the school day
            </h2>
            <p className="mt-4 text-base leading-relaxed text-plum/70">
              One login for the people who run the college, one lookup for the families who rely
              on it — both backed by the same verified records.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {audiences.map((audience, index) => {
            const accent = accents[audience.accent];
            const Icon = audience.icon;

            return (
              <Reveal key={audience.id} delay={index * 90}>
                <Link
                  to={audience.to}
                  className={`glass-card group flex h-full flex-col rounded-2xl p-6 transition-all duration-200 motion-safe:hover:-translate-y-1 sm:p-8 ${accent.glow}`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.chip}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>

                  <h3 className="mt-5 text-xl font-bold text-plum">{audience.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-plum/70">
                    {audience.description}
                  </p>

                  <ul className="mt-5 flex-1 space-y-3">
                    {audience.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5 text-sm text-plum/80">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${accent.bullet}`}
                        >
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                        {bullet}
                      </li>
                    ))}
                  </ul>

                  {/* Full-width card CTA (span keeps it valid inside the anchor) */}
                  <span className={`lp-btn lp-btn-block lp-btn-lg mt-7 ${accent.cta}`}>
                    {audience.cta}
                    <ArrowRight
                      className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
