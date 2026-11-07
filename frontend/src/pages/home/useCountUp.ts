import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './useReveal';

/**
 * Count-up animation for the stats strip. Starts when `active` becomes true
 * (i.e. the stat scrolled into view), runs once, and jumps straight to the
 * final value when the user prefers reduced motion.
 */
export function useCountUp(target: number, active: boolean, duration = 1500): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) return;

    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    };
  }, [active, target, duration]);

  return value;
}
