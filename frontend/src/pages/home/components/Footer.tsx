import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { college, footer } from '../content';
import Logo from './Logo';

/**
 * Site footer: brand blurb, contact details, quick links and copyright.
 * Doubles as the Contact anchor target for the navbar.
 */
export default function Footer(): JSX.Element {
  return (
    <footer id="contact" className="scroll-mt-24 border-t border-violet/10 bg-white/70 backdrop-blur">
      <h2 className="sr-only">Site information</h2>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="text-base font-bold tracking-tight text-plum">{college.name}</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-plum/70">{footer.blurb}</p>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-plum">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-plum/70">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              <span>{college.address}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              <a
                href={`tel:${college.phone.replace(/\s+/g, '')}`}
                className="transition-colors duration-150 hover:text-brand-600"
              >
                {college.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              <a
                href={`mailto:${college.email}`}
                className="transition-colors duration-150 hover:text-brand-600"
              >
                {college.email}
              </a>
            </li>
          </ul>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-plum">Quick links</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {footer.quickLinks.map((link) => (
              <li key={link.label}>
                {'to' in link ? (
                  <Link
                    to={link.to}
                    className="font-medium text-plum/70 transition-colors duration-150 hover:text-brand-600"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    className="font-medium text-plum/70 transition-colors duration-150 hover:text-brand-600"
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-violet/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-plum/70 sm:px-6">
          {footer.copyright}
        </p>
      </div>
    </footer>
  );
}
