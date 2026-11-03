import { useEffect, useRef, useState } from 'react';

/** True when the user asked the OS/browser to reduce motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Fade-up-on-scroll hook: returns a ref and a `visible` flag that flips to
 * true the first time the element enters the viewport (IntersectionObserver).
 * With prefers-reduced-motion (or no IntersectionObserver) it shows at once.
 */
export function useReveal<T extends HTMLElement>(threshold = 0.15): {
  ref: React.RefObject<T>;
  visible: boolean;
} {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold, rootMargin: '0px 0px -48px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}
