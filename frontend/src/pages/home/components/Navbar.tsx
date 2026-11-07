import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { college, nav, routes } from '../content';
import Logo from './Logo';

/**
 * Sticky top navigation: logo + college name, anchor links, and the two
 * portal actions. Picks up a blurred backdrop once the page is scrolled,
 * and collapses into a hamburger menu below the md breakpoint.
 */
export default function Navbar(): JSX.Element {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu when the viewport grows back to desktop width.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, []);

  const elevated = scrolled || menuOpen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
        elevated
          ? 'border-b border-violet/10 bg-white/80 shadow-soft backdrop-blur-lg'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        {/* Brand */}
        <a
          href="#home"
          className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2"
        >
          <Logo className="h-8 w-8" />
          <span className="text-[15px] font-bold tracking-tight text-plum sm:text-base">
            {college.name}
          </span>
        </a>

        {/* Anchor links (desktop) */}
        <div className="hidden items-center gap-1 md:flex">
          {nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-plum/70 transition-colors duration-150 hover:bg-brand-500/5 hover:text-plum"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Actions (desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          <Link to={routes.staffLogin} className="lp-btn lp-btn-outline">
            {nav.staffLabel}
          </Link>
          <Link to={routes.parentPortal} className="lp-btn lp-btn-brand">
            {nav.parentLabel}
          </Link>
        </div>

        {/* Hamburger (mobile) */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="lp-icon-btn md:hidden"
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Menu className="h-5 w-5" aria-hidden />
          )}
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-violet/10 bg-white/95 px-4 pb-5 pt-3 backdrop-blur-lg md:hidden"
        >
          <div className="flex flex-col gap-1">
            {nav.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-plum/80 transition-colors duration-150 hover:bg-brand-500/5 hover:text-plum"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-violet/10 pt-3">
            <Link
              to={routes.staffLogin}
              onClick={() => setMenuOpen(false)}
              className="lp-btn lp-btn-block lp-btn-outline"
            >
              {nav.staffLabel}
            </Link>
            <Link
              to={routes.parentPortal}
              onClick={() => setMenuOpen(false)}
              className="lp-btn lp-btn-block lp-btn-brand"
            >
              {nav.parentLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
