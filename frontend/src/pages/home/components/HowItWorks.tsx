import { steps } from '../content';
import Reveal from '../Reveal';

/**
 * Three-step "How it works" strip: college verifies → staff update records →
 * parents view securely. The connector line is decorative (desktop only).
 */
export default function HowItWorks(): JSX.Element {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="lp-section-kicker">How it works</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-plum sm:text-4xl">
              From verified record to family, in three steps
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <ol className="relative mt-12 grid gap-10 lg:grid-cols-3 lg:gap-8">
            {/* Decorative connector */}
            <span
              aria-hidden="true"
              className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-brand-200 via-brand-400/50 to-accent-500/40 lg:block"
            />

            {steps.map((step) => (
              <li key={step.n} className="relative">
                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-lg font-extrabold text-white shadow-glow-brand">
                  {step.n}
                </span>
                <h3 className="mt-5 text-lg font-bold text-plum">{step.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-plum/70">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
