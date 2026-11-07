/**
 * Refined College Management Portal Home Page
 *
 * Corporate Blue & White Theme:
 * - Prominent center hero showcase featuring the authentic college building photograph
 *   ("Sri Venkateswara Junior College") without any red markings or distortion.
 * - Compact, elegant, equally-sized Admin & Parent buttons centered directly below the photo.
 * - Minimized "About Our College" section with essential facts (Name, Location, Est. Year,
 *   Total Students, and Available Branches).
 * - Minimized "College Services" section with compact cards, small consistent icons, and concise summaries.
 * - Professional corporate typography, clean borders, subtle shadows, and full responsiveness.
 * - Frontend only; all existing routes and authentication flows are preserved.
 */
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  UserRound,
  Building2,
  Users,
  MapPin,
  BookOpen,
  CalendarCheck2,
  Award,
  CreditCard,
  Bell,
  BadgeCheck,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-transparent font-sans text-plum antialiased">
      {/* 1. TOP NOTICE / CONTACT STRIP */}
      <div className="border-b border-forest-dark bg-forest-dark px-4 py-2 text-xs text-mint/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-mint" />
            <span className="font-medium text-white/90">
              Sri Venkateswara Junior College • Affiliated with State Board of Intermediate Education (TSBIE)
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-mint/70">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-mint" /> +91 (040) 2345-6789
            </span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden items-center gap-1 sm:flex">
              <Mail className="h-3 w-3 text-mint" /> admissions@svjc.edu
            </span>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-mint/70 bg-white/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo & College Brand */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-dark text-white shadow-sm">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-forest-dark sm:text-lg">
                SRI VENKATESWARA JUNIOR COLLEGE
              </span>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-leaf">
                Intermediate (+2) Education • Est. 2008
              </span>
            </div>
          </Link>

          {/* Quick Nav Anchors */}
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#about" className="text-xs font-semibold uppercase tracking-wider text-muted transition hover:text-leaf">
              About
            </a>
            <a href="#branches" className="text-xs font-semibold uppercase tracking-wider text-muted transition hover:text-leaf">
              Branches
            </a>
            <a href="#services" className="text-xs font-semibold uppercase tracking-wider text-muted transition hover:text-leaf">
              Services
            </a>
            <a href="#contact" className="text-xs font-semibold uppercase tracking-wider text-muted transition hover:text-leaf">
              Contact
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-mint bg-white px-3 py-1.5 text-xs font-semibold text-forest shadow-2xs transition hover:border-leaf hover:text-leaf"
            >
              <UserRound className="h-3.5 w-3.5 text-leaf" />
              <span>Parent/Student</span>
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-forest-dark"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION — CENTRAL COLLEGE BUILDING IMAGE & COMPACT BUTTONS */}
      <section className="border-b border-mint/70 bg-white py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Centered Heading */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-mint bg-mist px-3 py-1 text-xs font-semibold text-forest">
              <CheckCircle2 className="h-3.5 w-3.5 text-leaf" />
              <span>Official College Management &amp; Parent Information Portal</span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-forest-dark sm:text-3xl lg:text-4xl">
              Sri Venkateswara Junior College
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
              Providing disciplined academic guidance across <strong className="text-forest-dark">MPC, BiPC, and CEC</strong> streams.
              Access live attendance, examination results, fee updates, and institutional notifications.
            </p>
          </div>

          {/* Prominent Centerpiece: Exact College Building Image */}
          <div className="mx-auto mt-7 max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-mint/70 bg-mist/60 p-2 shadow-md sm:p-3">
              <div className="relative aspect-[479/240] w-full overflow-hidden rounded-xl bg-mint/60">
                <img
                  src="/college_building.jpg"
                  alt="Sri Venkateswara Junior College Main Campus Building"
                  className="h-full w-full object-cover object-center"
                />
              </div>
            </div>
          </div>

          {/* Compact, Elegant, Equally-Sized Admin & Parent Buttons Centered Below Image */}
          <div className="mx-auto mt-6 flex max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
            {/* Button 1: Admin — Staff Login */}
            <Link
              to="/admin/login"
              className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-forest-dark focus:outline-none focus:ring-2 focus:ring-leaf focus:ring-offset-2"
            >
              <ShieldCheck className="h-4 w-4 text-mint" />
              <span>Staff</span>
              <ArrowRight className="h-4 w-4 text-mint/80" />
            </Link>

            {/* Button 2: Parent — Parent Portal */}
            <Link
              to="/dashboard"
              className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-xl border border-forest bg-white px-5 py-3 text-sm font-bold text-forest-dark shadow-sm transition hover:bg-mist focus:outline-none focus:ring-2 focus:ring-leaf focus:ring-offset-2"
            >
              <UserRound className="h-4 w-4 text-leaf" />
              <span>Parent/Student</span>
              <ArrowRight className="h-4 w-4 text-leaf" />
            </Link>
          </div>

          {/* Micro Helper Note */}
          <p className="mt-3 text-center text-xs text-muted">
            Staff access via authorized college credentials. Parent/Student portal opens the college dashboard directly.
          </p>
        </div>
      </section>

      {/* 4. MINIMIZED "ABOUT OUR COLLEGE" SECTION */}
      <section id="about" className="scroll-mt-16 bg-mist/60 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-leaf">About Our College</span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-forest-dark">
              Essential College Information
            </h2>
          </div>

          {/* Essential Info Highlights Strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-mint/70 bg-white p-4 text-center shadow-xs">
              <Building2 className="mx-auto h-5 w-5 text-leaf" />
              <div className="mt-2 text-xl font-extrabold text-forest-dark">Est. 2008</div>
              <div className="text-xs text-muted">18+ Years of Service</div>
            </div>
            <div className="rounded-xl border border-mint/70 bg-white p-4 text-center shadow-xs">
              <Users className="mx-auto h-5 w-5 text-leaf" />
              <div className="mt-2 text-xl font-extrabold text-forest-dark">25</div>
              <div className="text-xs text-muted">Sample Students</div>
            </div>
            <div className="rounded-xl border border-mint/70 bg-white p-4 text-center shadow-xs">
              <MapPin className="mx-auto h-5 w-5 text-leaf" />
              <div className="mt-2 text-xl font-extrabold text-forest-dark">Hyderabad</div>
              <div className="text-xs text-muted">Telangana Campus</div>
            </div>
            <div className="rounded-xl border border-mint/70 bg-white p-4 text-center shadow-xs">
              <BadgeCheck className="mx-auto h-5 w-5 text-leaf" />
              <div className="mt-2 text-xl font-extrabold text-forest-dark">TSBIE</div>
              <div className="text-xs text-muted">Recognized Board</div>
            </div>
          </div>

          {/* Concise Details & Available Branches */}
          <div id="branches" className="mt-6 grid gap-6 md:grid-cols-12">
            {/* Short College Summary */}
            <div className="rounded-xl border border-mint/70 bg-white p-5 shadow-xs md:col-span-5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-forest-dark">
                Institutional Profile
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Sri Venkateswara Junior College is dedicated to excellence in +2 higher secondary education.
                Located in Knowledge Park, Hyderabad, the institution provides quality faculty instruction,
                well-maintained science labs, and transparent record-keeping for students and guardians.
              </p>
              <div className="mt-4 border-t border-mint/50 pt-3 text-xs text-muted">
                <span className="font-semibold text-forest">Location:</span> Knowledge Park, Cyber City Corridor, Hyderabad – 500081
              </div>
            </div>

            {/* Available Branches */}
            <div className="rounded-xl border border-mint/70 bg-white p-5 shadow-xs md:col-span-7">
              <h3 className="text-sm font-bold uppercase tracking-wide text-forest-dark">
                Available Branches (+2 Streams)
              </h3>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                <div className="rounded-lg border border-mint/50 bg-mist/60 p-3">
                  <div className="text-xs font-bold text-forest">MPC</div>
                  <div className="text-[11px] font-medium text-forest">Maths, Physics, Chem</div>
                  <div className="mt-1 text-[10px] text-muted">Pre-Engineering &amp; JEE</div>
                </div>
                <div className="rounded-lg border border-mint/50 bg-mist/60 p-3">
                  <div className="text-xs font-bold text-forest">BiPC</div>
                  <div className="text-[11px] font-medium text-forest">Biology, Physics, Chem</div>
                  <div className="mt-1 text-[10px] text-muted">Pre-Medical &amp; NEET</div>
                </div>
                <div className="rounded-lg border border-mint/50 bg-mist/60 p-3">
                  <div className="text-xs font-bold text-forest">CEC</div>
                  <div className="text-[11px] font-medium text-forest">Civics, Econ, Commerce</div>
                  <div className="mt-1 text-[10px] text-muted">Commerce &amp; CA Found.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MINIMIZED "COLLEGE SERVICES" SECTION */}
      <section id="services" className="scroll-mt-16 border-t border-mint/70 bg-white py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-leaf">Portal Modules</span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-forest-dark">
              Essential College Services
            </h2>
            <p className="mx-auto mt-1 max-w-xl text-xs text-muted">
              Core academic and administrative features accessible through the portal:
            </p>
          </div>

          {/* Compact Services Grid */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Service 1 */}
            <div className="rounded-xl border border-mint/70 bg-mist/40 p-4 transition hover:bg-white hover:shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/60 text-forest">
                <BookOpen className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-forest-dark">Academic Management</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Syllabus progress, section allocation, and curriculum scheduling.
              </p>
            </div>

            {/* Service 2 */}
            <div className="rounded-xl border border-mint/70 bg-mist/40 p-4 transition hover:bg-white hover:shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/60 text-forest">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-forest-dark">Student Information</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Student directory, roll numbers, guardian contacts, and profiles.
              </p>
            </div>

            {/* Service 3 */}
            <div className="rounded-xl border border-mint/70 bg-mist/40 p-4 transition hover:bg-white hover:shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/60 text-forest">
                <CalendarCheck2 className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-forest-dark">Attendance System</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Period-wise attendance marking and percentage tracking.
              </p>
            </div>

            {/* Service 4 */}
            <div className="rounded-xl border border-mint/70 bg-mist/40 p-4 transition hover:bg-white hover:shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/60 text-forest">
                <Award className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-forest-dark">Exams &amp; Results</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Marks entry, grade computation, and publish-gated report cards.
              </p>
            </div>

            {/* Service 5 */}
            <div className="rounded-xl border border-mint/70 bg-mist/40 p-4 transition hover:bg-white hover:shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/60 text-forest">
                <CreditCard className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-forest-dark">Fee Management</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Payment receipt generation and financial audit trail logs.
              </p>
            </div>

            {/* Service 6 */}
            <div className="rounded-xl border border-mint/70 bg-mist/40 p-4 transition hover:bg-white hover:shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/60 text-forest">
                <Bell className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-forest-dark">Announcements</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Official circulars, exam notices, and college holiday schedules.
              </p>
            </div>

            {/* Service 7: Parent Portal */}
            <div className="rounded-xl border border-mint bg-mist/70 p-4 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest text-white">
                  <UserRound className="h-4 w-4" />
                </div>
                <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-forest hover:underline">
                  <span>Open Portal</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <h3 className="mt-3 text-sm font-bold text-forest-dark">Parent Self-Service Portal</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Direct dashboard access for parents and students to inspect attendance, results, fee status, and college announcements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CLEAN FOOTER */}
      <footer id="contact" className="border-t border-forest-dark bg-forest-dark py-10 text-xs text-mint/70">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="font-bold text-white">SRI VENKATESWARA JUNIOR COLLEGE</span>
              <p className="mt-2 leading-relaxed text-mint/70">
                Higher Secondary (+2) Institution recognized by the Telangana State Board of Intermediate Education.
              </p>
            </div>
            <div>
              <span className="font-bold text-white">Campus Address</span>
              <div className="mt-2 space-y-1 text-mint/70">
                <div>Plot 42, Knowledge Park</div>
                <div>Cyber City Corridor, Hyderabad – 500081</div>
                <div>Ph: +91 (040) 2345-6789</div>
              </div>
            </div>
            <div>
              <span className="font-bold text-white">Portal Navigation</span>
              <ul className="mt-2 space-y-1">
                <li><Link to="/admin/login" className="hover:text-white">Staff Login</Link></li>
                <li><Link to="/dashboard" className="hover:text-white">Parent Portal</Link></li>
                <li><a href="#about" className="hover:text-white">About College</a></li>
                <li><a href="#services" className="hover:text-white">Services</a></li>
              </ul>
            </div>
            <div>
              <span className="font-bold text-white">Demo Credentials</span>
              <div className="mt-2 space-y-1 text-mint/70">
                <div><span className="text-mint">Staff:</span> principal@demo.edu</div>
                <div><span className="text-mint">Password:</span> Demo@1234</div>
                <div><span className="text-mint">Parent Roll:</span> MPC25001</div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-forest/60 pt-4 text-center text-mint/60">
            &copy; {new Date().getFullYear()} Sri Venkateswara Junior College. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
