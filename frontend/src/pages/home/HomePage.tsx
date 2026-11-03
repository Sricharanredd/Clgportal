/**
 * Public landing page for Prism College.
 *
 * UI only: no API calls, no auth logic, no route changes. The two actions
 * keep pointing at the existing routes — /admin/login (staff) and /parent.
 * All copy, stats and links live in ./content.ts; brand colours live in
 * src/index.css ("BRAND TOKENS").
 */
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Stats from './components/Stats';
import AudienceCards from './components/AudienceCards';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import TrustNote from './components/TrustNote';
import Footer from './components/Footer';

export default function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-porcelain text-plum">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <AudienceCards />
        <Features />
        <HowItWorks />
        <TrustNote />
      </main>
      <Footer />
    </div>
  );
}
