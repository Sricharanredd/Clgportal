/**
 * College Management Portal Home Page
 *
 * Premium white / pista green / cream / dark green theme:
 * - Full-width campus photograph as the hero backdrop
 * - Dark-green gradient overlay for natural campus visibility and contrast
 * - College identity on the hero with two primary actions:
 *     1. "Admin — Staff Login" -> /admin/login
 *     2. "Parent — Parent Portal" -> /parent
 * - About, branches, facilities and services sections
 * - Responsive across mobile, tablet and desktop
 */
import { Link } from "react-router-dom";
import { DEMO_OPEN_PARENT } from "@/config/demo";
import {
  GraduationCap,
  ShieldCheck,
  UserRound,
  Building2,
  Calendar,
  Users,
  MapPin,
  BookOpen,
  CalendarCheck2,
  CreditCard,
  Award,
  Bell,
  Microscope,
  Laptop,
  Library,
  Trophy,
  Presentation,
  Bus,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  Clock,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";

export default function HomePage(): JSX.Element {
  const parentTrust = DEMO_OPEN_PARENT
    ? "Demo mode: parent records are read-only"
    : "Parent records are read-only and shown only after college verification.";

  return (
    <div className="lp-canvas min-h-screen font-sans text-ink antialiased">
      {/* TOP HEADER / ANNOUNCEMENT STRIP */}
      <div className="border-b border-brand-700 lp-topbar px-4 py-2 text-xs text-brand-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-brand-200">
              <BadgeCheck className="h-3.5 w-3.5 text-brand-300" />
              <span>
                Affiliated with State Board of Intermediate Education (TSBIE)
              </span>
            </span>
            <span className="hidden sm:inline text-brand-400">|</span>
            <span className="hidden sm:inline">
              College Code: <strong className="text-white">PRSM-104</strong>
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="tel:+914023456789"
              className="flex items-center gap-1 text-brand-100 hover:text-white"
            >
              <Phone className="h-3 w-3 text-brand-300" />
              <span>+91 (040) 2345-6789</span>
            </a>
            <span className="text-brand-400">|</span>
            <a
              href="mailto:info@prismcollege.edu"
              className="flex items-center gap-1 text-brand-100 hover:text-white"
            >
              <Mail className="h-3 w-3 text-brand-300" />
              <span>info@prismcollege.edu</span>
            </a>
          </div>
        </div>
      </div>

      {/* MAIN NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* College Logo & Name */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500 text-white shadow">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <span className="block whitespace-nowrap text-base font-extrabold tracking-tight text-brand-700 sm:text-lg">
                PRISM INTERMEDIATE COLLEGE
              </span>
              <span className="block whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-brand-600">
                Center for Higher Secondary Excellence • Est. 2008
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden items-center gap-5 lg:flex">
            <a
              href="#about"
              className="whitespace-nowrap text-sm font-semibold text-ink-soft transition hover:text-brand-600"
            >
              About College
            </a>
            <a
              href="#branches"
              className="whitespace-nowrap text-sm font-semibold text-ink-soft transition hover:text-brand-600"
            >
              Branches
            </a>
            <a
              href="#facilities"
              className="whitespace-nowrap text-sm font-semibold text-ink-soft transition hover:text-brand-600"
            >
              Campus Facilities
            </a>
            <a
              href="#services"
              className="whitespace-nowrap text-sm font-semibold text-ink-soft transition hover:text-brand-600"
            >
              Services
            </a>
            <a
              href="#contact"
              className="whitespace-nowrap text-sm font-semibold text-ink-soft transition hover:text-brand-600"
            >
              Contact
            </a>
          </nav>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/parent"
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-100 sm:text-sm"
            >
              <UserRound className="h-4 w-4" />
              <span>Parent Portal</span>
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-450 px-4 py-2 text-xs font-bold text-white shadow transition hover:from-brand-600 hover:to-brand-500 sm:text-sm"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION — MAIN FOCUS WITH REALISTIC CAMPUS PHOTOGRAPH */}
      <section className="relative min-h-[580px] w-full overflow-hidden sm:min-h-[640px] lg:min-h-[680px]">
        {/* Full-width Realistic College Campus Image */}
        <img
          src="/campus.jpg"
          alt="Prism Intermediate College Campus Building"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Dark-green overlay: keeps the campus visible while text stays readable */}
        <div className="absolute inset-0 lp-hero-overlay" />

        {/* Hero Content Container */}
        <div className="relative mx-auto flex min-h-[580px] max-w-7xl flex-col justify-center px-4 py-16 sm:min-h-[640px] sm:px-6 lg:min-h-[680px] lg:px-8">
          <div className="max-w-3xl">
            {/* Demo College Crest / Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/40 bg-brand-900/75 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-100 shadow-md backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-brand-300" />
              <span>
                Co-Educational Intermediate (+2) Institution • Hyderabad
              </span>
            </div>

            {/* College Name & Headline */}
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white drop-shadow-md sm:text-5xl lg:text-6xl">
              Prism Intermediate College
            </h1>

            {/* Tagline / Description */}
            <p className="mt-4 max-w-2xl text-base font-normal leading-relaxed text-brand-100 drop-shadow sm:text-lg">
              Welcome to the official campus management portal. Empowering over
              1,200 intermediate students across{" "}
              <strong className="font-semibold text-white">
                MPC, BiPC, and CEC
              </strong>{" "}
              streams with academic rigor, expert faculty guidance, and
              integrated digital services for staff and parents.
            </p>

            {/* Two Prominent Action Buttons on the Hero Image */}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Button 1: Admin — Staff Login */}
              <Link
                to="/admin/login"
                className="group inline-flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-gradient-to-r from-brand-500 to-brand-450 px-7 py-4 text-base font-bold text-white shadow-xl transition-all duration-200 hover:from-brand-600 hover:to-brand-500 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 focus:ring-offset-brand-900 sm:w-auto"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition-transform group-hover:scale-105">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-medium text-brand-100">
                    Authorized Access
                  </span>
                  <span className="block text-sm font-extrabold sm:text-base">
                    Admin — Staff Login
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>

              {/* Button 2: Parent — Parent Portal */}
              <Link
                to="/parent"
                className="group inline-flex items-center justify-center gap-3 rounded-xl border-2 border-white bg-white px-7 py-4 text-base font-bold text-brand-700 shadow-xl transition-all duration-200 hover:bg-brand-50 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-900 sm:w-auto"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700 transition-transform group-hover:scale-105">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-medium text-muted">
                    {DEMO_OPEN_PARENT
                      ? "Parent overview"
                      : "Self-Service Lookup"}
                  </span>
                  <span className="block text-sm font-extrabold text-brand-700 sm:text-base">
                    Parent — Parent Portal
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-brand-600 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Quick Helper Note */}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-brand-100">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-900/70 px-2.5 py-1 backdrop-blur-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-300" />
                <span>Principal &amp; Faculty Login Enabled</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-900/70 px-2.5 py-1 backdrop-blur-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-300" />
                <span>{parentTrust}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Strip at Bottom of Hero */}
        <div className="relative border-t border-white/10 lp-hero-stats backdrop-blur-md">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-brand-700 py-4 text-center sm:grid-cols-4">
            <div className="px-4 py-2">
              <div className="text-2xl font-black text-white sm:text-3xl">
                18+
              </div>
              <div className="text-xs font-medium text-brand-100">
                Years of Academic Excellence
              </div>
            </div>
            <div className="px-4 py-2">
              <div className="text-2xl font-black text-brand-300 sm:text-3xl">
                1,200+
              </div>
              <div className="text-xs font-medium text-brand-100">
                Enrolled Intermediate Students
              </div>
            </div>
            <div className="px-4 py-2">
              <div className="text-2xl font-black text-white sm:text-3xl">
                98.4%
              </div>
              <div className="text-xs font-medium text-brand-100">
                State Board Pass Percentage
              </div>
            </div>
            <div className="px-4 py-2">
              <div className="text-2xl font-black text-brand-300 sm:text-3xl">
                100%
              </div>
              <div className="text-xs font-medium text-brand-100">
                Digital Attendance &amp; Records
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: ABOUT OUR COLLEGE */}
      <section id="about" className="scroll-mt-20 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
              Institutional Overview
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
              About Our College
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-ink-soft">
              Prism Intermediate College is dedicated to providing comprehensive
              higher secondary education, fostering foundational knowledge for
              competitive entrance examinations and professional careers.
            </p>
          </div>

          {/* College Information Cards Grid */}
          <div className="mt-12 grid gap-8 lg:grid-cols-12">
            {/* Left Column: College Profile & Location Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-line bg-gradient-to-br from-accent-50 to-white p-7 shadow-sm lg:col-span-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink">
                      Prism Junior College
                    </h3>
                    <p className="text-xs font-medium text-brand-600">
                      College Code: PRSM-104 • TSBIE Affiliated
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-ink-soft">
                  Established in 2008, Prism Intermediate College operates a
                  peaceful 12-acre campus in Hyderabad. Our institution provides
                  targeted preparation for state board examinations combined
                  with focused mentorship for national entrance tests including
                  JEE, EAMCET, NEET, and CA-Foundation.
                </p>

                {/* Specific Information Points */}
                <div className="mt-6 space-y-3.5">
                  <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-xs">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <div>
                      <span className="block text-xs font-bold text-ink">
                        Campus Location
                      </span>
                      <span className="text-xs text-ink-soft">
                        Knowledge Park, Cyber City Corridor, Hyderabad,
                        Telangana – 500081
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-xs">
                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <div>
                      <span className="block text-xs font-bold text-ink">
                        Established Year
                      </span>
                      <span className="text-xs text-ink-soft">
                        Founded in 2008 • Over 18 consecutive years of academic
                        success
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-xs">
                    <Users className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <div>
                      <span className="block text-xs font-bold text-ink">
                        Student Strength
                      </span>
                      <span className="text-xs text-ink-soft">
                        1,200+ Active Intermediate Students across 1st &amp; 2nd
                        Year Sections
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo Notice */}
              <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4">
                <span className="text-xs font-bold text-brand-700">
                  Campus Portal Access:
                </span>
                <p className="mt-1 text-xs text-brand-700">
                  Staff sign in using assigned college emails. Parents can
                  directly look up student records with branch and roll numbers
                  (e.g.{" "}
                  <span className="font-mono font-semibold">MPC25001</span>).
                </p>
              </div>
            </div>

            {/* Right Column: Available Branches & Academic Streams */}
            <div id="branches" className="space-y-6 lg:col-span-7">
              <div>
                <h3 className="text-xl font-bold text-ink">
                  Available Academic Branches
                </h3>
                <p className="text-xs text-ink-soft">
                  Specialized intermediate programs tailored for engineering,
                  healthcare, and commerce pathways:
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Branch 1: MPC */}
                <div className="rounded-xl border border-line bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-extrabold text-brand-700">
                      BRANCH 1
                    </span>
                    <span className="text-xs font-semibold text-muted">
                      450 Students
                    </span>
                  </div>
                  <h4 className="mt-3 text-lg font-bold text-ink">MPC</h4>
                  <p className="text-xs font-semibold text-brand-600">
                    Mathematics, Physics, Chemistry
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Pre-engineering curriculum focused on calculus, physical
                    sciences, and analytical foundations for IIT-JEE and EAMCET
                    entrance success.
                  </p>
                </div>

                {/* Branch 2: BiPC */}
                <div className="rounded-xl border border-line bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-extrabold text-brand-700">
                      BRANCH 2
                    </span>
                    <span className="text-xs font-semibold text-muted">
                      380 Students
                    </span>
                  </div>
                  <h4 className="mt-3 text-lg font-bold text-ink">
                    BiPC
                  </h4>
                  <p className="text-xs font-semibold text-brand-600">
                    Biology, Physics, Chemistry
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Pre-medical stream covering Botany, Zoology, organic
                    chemistry, and cellular biology for NEET and allied health
                    sciences.
                  </p>
                </div>

                {/* Branch 3: CEC */}
                <div className="rounded-xl border border-line bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-extrabold text-brand-700">
                      BRANCH 3
                    </span>
                    <span className="text-xs font-semibold text-muted">
                      260 Students
                    </span>
                  </div>
                  <h4 className="mt-3 text-lg font-bold text-ink">CEC</h4>
                  <p className="text-xs font-semibold text-brand-600">
                    Civics, Economics, Commerce
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Business and corporate stream emphasizing financial
                    accounting, microeconomics, and Indian polity for
                    CA-Foundation and law careers.
                  </p>
                </div>

                {/* Branch 4: MEC */}
                <div className="rounded-xl border border-line bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-extrabold text-brand-700">
                      BRANCH 4
                    </span>
                    <span className="text-xs font-semibold text-muted">
                      150 Students
                    </span>
                  </div>
                  <h4 className="mt-3 text-lg font-bold text-ink">MEC</h4>
                  <p className="text-xs font-semibold text-brand-600">
                    Mathematics, Economics, Commerce
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Quantitative commerce combining advanced mathematics with
                    financial economics for actuarial and business management
                    paths.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* INFRASTRUCTURE & FACILITIES */}
          <div id="facilities" className="mt-16 scroll-mt-20">
            <div className="border-t border-line pt-12 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                Infrastructure &amp; Student Support
              </span>
              <h3 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
                Campus Facilities
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-xs text-ink-soft sm:text-sm">
                Equipped with modern facilities to support both scientific
                inquiry and overall student well-being:
              </p>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-line bg-gradient-to-br from-brand-50/70 to-white p-5 shadow-xs transition hover:bg-white hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Microscope className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-base font-bold text-ink">
                  Science Laboratories
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                  Fully furnished Physics, Chemistry, Botany, and Zoology
                  practical laboratories compliant with state board standards.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-gradient-to-br from-brand-50/70 to-white p-5 shadow-xs transition hover:bg-white hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Laptop className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-base font-bold text-ink">
                  Computer Center
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                  Air-conditioned computing lab equipped with high-speed
                  internet and practical workstations for computer science
                  courses.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-gradient-to-br from-brand-50/70 to-white p-5 shadow-xs transition hover:bg-white hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Library className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-base font-bold text-ink">
                  Central Digital Library
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                  Over 15,000 reference volumes, competitive examination guides,
                  academic journals, and a quiet reading hall.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-gradient-to-br from-brand-50/70 to-white p-5 shadow-xs transition hover:bg-white hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Trophy className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-base font-bold text-ink">
                  Sports &amp; Athletics
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                  Dedicated playground for basketball, volleyball, cricket nets,
                  and indoor sports facilities promoting physical health.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-gradient-to-br from-brand-50/70 to-white p-5 shadow-xs transition hover:bg-white hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Presentation className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-base font-bold text-ink">
                  Seminar &amp; AV Halls
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                  Multimedia auditoriums used for visiting faculty lectures,
                  competitive coaching seminars, and parent orientations.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-gradient-to-br from-brand-50/70 to-white p-5 shadow-xs transition hover:bg-white hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Bus className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-base font-bold text-ink">
                  Campus Transport Fleet
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                  Reliable college buses operating across 28+ designated routes
                  in the twin cities ensuring safe daily commuting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: OUR COLLEGE SERVICES */}
      <section
        id="services"
        className="scroll-mt-20 border-t border-line bg-gradient-to-b from-brand-50/70 via-white to-accent-50/60 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
              Integrated Management
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
              Our College Services
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-ink-soft">
              Explore the core administrative and academic modules powered by
              the College Management Portal:
            </p>
          </div>

          {/* 7 Services Cards */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Service 1: Academic Management */}
            <div className="flex flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">
                  Academic Management
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  Curriculum planning, subject allocation, section assignments,
                  and faculty timetable scheduling across all academic terms.
                </p>
              </div>
              <div className="mt-4 border-t border-brand-100/70 pt-3 text-[11px] font-semibold text-brand-600">
                Staff &amp; Faculty Managed
              </div>
            </div>

            {/* Service 2: Student Information */}
            <div className="flex flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">
                  Student Information
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  Comprehensive student profiles, admission details, roll
                  numbers, guardian contacts, and academic stream histories.
                </p>
              </div>
              <div className="mt-4 border-t border-brand-100/70 pt-3 text-[11px] font-semibold text-brand-600">
                Role-Gated Directory
              </div>
            </div>

            {/* Service 3: Attendance Management */}
            <div className="flex flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <CalendarCheck2 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">
                  Attendance Management
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  Daily period-wise attendance marking by assigned faculty,
                  shortage computation, and principal correction audit trails.
                </p>
              </div>
              <div className="mt-4 border-t border-brand-100/70 pt-3 text-[11px] font-semibold text-brand-600">
                Live Attendance Logs
              </div>
            </div>

            {/* Service 4: Examination & Results */}
            <div className="flex flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Award className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">
                  Examination &amp; Results
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  Unit tests, quarterly, and pre-final exams with secure marks
                  entry and publish-gated report cards for student view.
                </p>
              </div>
              <div className="mt-4 border-t border-brand-100/70 pt-3 text-[11px] font-semibold text-brand-600">
                Publish-Gated Verification
              </div>
            </div>

            {/* Service 5: Fee Management */}
            <div className="flex flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">
                  Fee Management
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  Counter collections, installment schedules, printable payment
                  receipts, and an immutable append-only financial audit trail.
                </p>
              </div>
              <div className="mt-4 border-t border-brand-100/70 pt-3 text-[11px] font-semibold text-brand-600">
                Accounts Office Module
              </div>
            </div>

            {/* Service 6: Announcements */}
            <div className="flex flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Bell className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">
                  Announcements
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  Official circulars, exam dates, holiday schedules, and event
                  announcements distributed directly to staff and parents.
                </p>
              </div>
              <div className="mt-4 border-t border-brand-100/70 pt-3 text-[11px] font-semibold text-brand-600">
                Campus-Wide Notifications
              </div>
            </div>

            {/* Service 7: Parent Portal */}
            <div className="flex flex-col justify-between rounded-xl border-2 border-brand-400 bg-gradient-to-br from-brand-100/70 to-accent-50 p-6 shadow-sm transition hover:border-brand-500 hover:shadow-md sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <UserRound className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">
                  Parent Portal
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  {DEMO_OPEN_PARENT
                    ? "Demo mode: parent records are read-only. Open any student to view attendance, published results, fees and announcements."
                    : "Zero-password parent portal for real-time monitoring of your ward's attendance records, verified marks sheets, payment receipts, and college announcements."}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-brand-200 pt-3">
                <span className="text-xs font-bold text-brand-700">
                  Self-Service Access
                </span>
                <Link
                  to="/parent"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
                >
                  <span>Open Portal</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        id="contact"
        className="lp-footer border-t border-brand-700 text-brand-100"
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Col 1: College Info */}
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="font-extrabold text-white">PRISM COLLEGE</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-brand-100">
                Prism Intermediate College provides rigorous academic education
                across science and commerce pathways with integrated digital
                governance for staff and parents.
              </p>
              <div className="mt-4 text-xs font-semibold text-brand-300">
                TSBIE Affiliated • Co-Educational
              </div>
            </div>

            {/* Col 2: Campus Address & Contact */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Campus Contact
              </h4>
              <ul className="mt-3 space-y-2.5 text-xs text-brand-100">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                  <span>
                    Plot 42, Knowledge Park, Cyber City Corridor, Hyderabad, TG
                    – 500081
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-brand-300" />
                  <span>+91 (040) 2345-6789</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-brand-300" />
                  <span>admissions@prismcollege.edu</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-brand-300" />
                  <span>Mon – Sat: 8:30 AM – 5:00 PM</span>
                </li>
              </ul>
            </div>

            {/* Col 3: Portal Navigation Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Portal Navigation
              </h4>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <Link
                    to="/admin/login"
                    className="text-brand-100 transition hover:text-white"
                  >
                    Staff &amp; Faculty Login
                  </Link>
                </li>
                <li>
                  <Link
                    to="/parent"
                    className="text-brand-100 transition hover:text-white"
                  >
                    Parent Portal
                  </Link>
                </li>
                <li>
                  <a
                    href="#about"
                    className="text-brand-100 transition hover:text-white"
                  >
                    About Our College
                  </a>
                </li>
                <li>
                  <a
                    href="#branches"
                    className="text-brand-100 transition hover:text-white"
                  >
                    Academic Streams (MPC, BiPC, CEC)
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    className="text-brand-100 transition hover:text-white"
                  >
                    College Services Directory
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Demo Credentials & System Info */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Demo Credentials
              </h4>
              <p className="mt-3 text-xs leading-relaxed text-brand-100">
                The portal operates with synthetic data for verification and
                demonstration.
              </p>
              <div className="mt-3 rounded-lg border border-brand-700 bg-brand-800 p-3 text-xs text-brand-100">
                <div>
                  <span className="font-semibold text-brand-300">
                    Staff Login:
                  </span>{" "}
                  principal@demo.edu
                </div>
                <div className="mt-0.5">
                  <span className="font-semibold text-brand-300">Password:</span>{" "}
                  Demo@1234
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-brand-700">
                  <span className="font-semibold text-brand-300">
                    Parent Roll:
                  </span>{" "}
                  MPC25001
                </div>
              </div>
            </div>
          </div>

          {/* Copyright bar */}
          <div className="mt-10 flex flex-col items-center justify-between border-t border-brand-700 pt-6 text-xs text-brand-400 sm:flex-row">
            <div>
              &copy; {new Date().getFullYear()} Prism Intermediate College. All
              rights reserved.
            </div>
            <div className="mt-2 sm:mt-0">
              College Management Portal • Built with React 18, TypeScript &amp;
              Tailwind CSS
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
