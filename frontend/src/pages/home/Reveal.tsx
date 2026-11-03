import type { ReactNode } from 'react';
import { useReveal } from './useReveal';

type RevealProps = {
  children: ReactNode;
  /** Stagger delay in ms for children revealed together. */
  delay?: number;
  className?: string;
};

/**
 * Fade-up-on-scroll wrapper. Adds the `.reveal` class (see index.css) and
 * flips it visible via IntersectionObserver. Motion is neutralised by CSS
 * when the user prefers reduced motion.
 */
export default function Reveal({ children, delay = 0, className = '' }: RevealProps): JSX.Element {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
