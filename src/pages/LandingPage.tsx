import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckSquare,
  Mail,
  MessageCircle,
  Sparkles,
  Timer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import testimonialImage from "../assets/images/stitch/landing-testimonial.jpg";

const integrations = [
  {
    name: "Gmail",
    description:
      "Prioritize urgent threads and stakeholder blockers automatically.",
    icon: Mail,
    accent: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    name: "Slack",
    description:
      "Promote high-impact messages while suppressing low-signal chatter.",
    icon: MessageCircle,
    accent: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    name: "Jira",
    description: "Pull unresolved issues and rank by urgency and impact.",
    icon: CheckSquare,
    accent: "text-slate-700",
    iconBg: "bg-slate-100",
  },
  {
    name: "Calendar",
    description:
      "Blend meetings with work items so your schedule matches priorities.",
    icon: CalendarDays,
    accent: "text-blue-600",
    iconBg: "bg-blue-50",
  },
];

const benefits = [
  {
    title: "Save Time",
    description:
      "Eliminate manual sorting. FocusFlow saves teams hours each week on triage.",
    icon: Timer,
    accent: "text-blue-600",
  },
  {
    title: "Prioritize Work",
    description:
      "Identify deep-work tasks instantly so you stay in flow longer.",
    icon: Sparkles,
    accent: "text-emerald-600",
  },
  {
    title: "Never Miss Deadlines",
    description: "Smart alerts highlight blockers before they become delays.",
    icon: Bell,
    accent: "text-rose-500",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/40 to-slate-50 text-slate-900">
      <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-900/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-xl font-semibold tracking-tight">FocusFlow</div>
          <div className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
            <span className="border-b border-white/60 pb-1">Product</span>
            <span className="text-slate-300">Integrations</span>
            <span className="text-slate-300">Benefits</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              onClick={() => {
                window.location.href = "/auth/mock";
              }}
            >
              ⚡ Dev Demo Login
            </button>
            <button
              className="text-sm font-semibold text-slate-200"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              onClick={() => navigate("/signup")}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden px-6 pb-24 pt-20">
          <div className="mx-auto max-w-6xl text-center">
            <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              <Sparkles className="h-4 w-4" />
              Next generation productivity
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Stop triaging chaos.
              <span className="block text-blue-600">
                Start executing what matters.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              FocusFlow turns scattered signals into a ranked action queue.
              Built for precision, designed for momentum.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
                onClick={() => navigate("/signup")}
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:from-emerald-500 hover:to-teal-500"
                onClick={() => {
                  window.location.href = "/auth/mock";
                }}
              >
                ⚡ Dev Demo (Skip OAuth)
              </button>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10">
              <h2 className="text-2xl font-semibold text-slate-900">
                Centralized Command
              </h2>
              <p className="mt-2 max-w-2xl text-slate-600">
                Deep integrations that synchronize your workflow across every
                major platform.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {integrations.map((item) => (
                <div
                  key={item.name}
                  className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${item.iconBg}`}
                  >
                    <item.icon className={`h-6 w-6 ${item.accent}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {item.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 md:grid-cols-3">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-xl border border-slate-100 bg-white p-6 text-center shadow-sm"
                >
                  <benefit.icon
                    className={`mx-auto h-10 w-10 ${benefit.accent}`}
                  />
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="mx-auto max-w-5xl rounded-3xl bg-slate-900 p-10 text-white shadow-lg">
            <div className="flex flex-col gap-8 md:flex-row md:items-center">
              <div className="flex-1">
                <div className="mb-6 flex items-center gap-1 text-amber-300">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Sparkles key={index} className="h-4 w-4" />
                  ))}
                </div>
                <p className="text-xl font-semibold leading-relaxed">
                  “FocusFlow completely changed how our engineering team
                  operates. We spend less time figuring out what to do, and more
                  time shipping.”
                </p>
                <div className="mt-6">
                  <p className="text-base font-semibold">Jane Doe</p>
                  <p className="text-sm text-slate-300">Lead Developer</p>
                </div>
              </div>
              <div className="flex justify-center md:justify-end">
                <img
                  src={testimonialImage}
                  alt="Lead developer portrait"
                  className="h-24 w-24 rounded-full border-2 border-blue-500 object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/60 bg-white/80">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-slate-500">
          © 2026 FocusFlow Inc.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
