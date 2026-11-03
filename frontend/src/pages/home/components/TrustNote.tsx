import { ShieldCheck } from 'lucide-react';
import { trust } from '../content';
import Reveal from '../Reveal';

/**
 * Trust & security note: parent records are read-only and only shown after
 * the college verifies them.
 */
export default function TrustNote(): JSX.Element {
  return (
    <section aria-label="Trust and security" className="pb-16 sm:pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="glass-card flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-r from-brand-500/5 via-white/70 to-accent-500/5 px-6 py-8 text-center sm:flex-row sm:gap-5 sm:px-8 sm:text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                Safe by design
              </p>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-plum/80 sm:text-base">
                {trust.text}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
