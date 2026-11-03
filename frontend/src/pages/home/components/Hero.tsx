import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Sparkles } from 'lucide-react';
import { hero, routes } from '../content';
import DashboardMockup from './DashboardMockup';

/**
 * Hero: bold headline, subheading, two CTAs and the floating dashboard
 * preview. Decorative grid + colour blobs sit behind the content.
 */
export default function Hero(): JSX.Element {
  return (
    <section id="home" className="relative scroll-mt-24 overflow-hidden pb-14 pt-28 sm:pb-20 sm:pt-36">
      {/* Decorative background: blueprint grid + soft colour blobs */}
      <div aria-hidden="true" className="lp-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl sm:h-96 sm:w-96"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-40 h-64 w-64 rounded-full bg-accent-500/20 blur-3xl sm:h-80 sm:w-80"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          {/* Copy */}
          <div>
            <span className="lp-eyebrow">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {hero.eyebrow}
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-plum sm:text-5xl lg:text-6xl">
              {hero.headlineLead}
              <span className="bg-gradient-to-r from-brand-500 via-brand-400 to-accent-600 bg-clip-text text-transparent">
                {hero.headlineAccent}
              </span>
              {hero.headlineTail}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-plum/70 sm:text-lg">
              {hero.subheading}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to={routes.staffLogin} className="lp-btn lp-btn-lg lp-btn-brand">
                {hero.staffCta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to={routes.parentPortal} className="lp-btn lp-btn-lg lp-btn-outline">
                {hero.parentCta}
              </Link>
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm text-plum/70">
              <BadgeCheck className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              {hero.reassurance}
            </p>
          </div>

          {/* Product preview */}
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
