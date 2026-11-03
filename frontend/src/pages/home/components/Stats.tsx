import { stats } from '../content';
import { useCountUp } from '../useCountUp';
import { useReveal } from '../useReveal';

type Stat = (typeof stats)[number];

function StatItem({ stat, active }: { stat: Stat; active: boolean }): JSX.Element {
  const value = useCountUp(stat.value, active);

  return (
    <div className="text-center">
      <p className="text-3xl font-extrabold tabular-nums tracking-tight text-plum sm:text-4xl">
        {value.toLocaleString('en-US')}
        <span className="text-brand-500">{stat.suffix}</span>
      </p>
      <p className="mt-1.5 text-xs font-medium leading-snug text-plum/70 sm:text-sm">
        {stat.label}
      </p>
    </div>
  );
}

/**
 * Stats strip: four demo figures that count up once, when scrolled into view.
 */
export default function Stats(): JSX.Element {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section aria-label="Prism College at a glance" className="relative z-10 pb-4">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          ref={ref}
          className={`reveal ${visible ? 'is-visible' : ''} glass-card rounded-2xl px-4 py-8 sm:px-8 sm:py-9`}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={[
                  'lg:pl-6',
                  index % 2 === 1 ? 'border-l border-violet/10 pl-4' : '',
                  index === 2 ? 'lg:border-l lg:border-violet/10' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <StatItem stat={stat} active={visible} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
