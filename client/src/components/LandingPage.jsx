'use client';
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";

import {
  Zap,
  Brain,
  MessageSquare,
  ListChecks,
  Search,
  Globe,
  ArrowRight,
  LogOut,
  ShieldCheck,
  FileWarning,
  Building2,
} from "lucide-react";

const stats = [
  { value: "150,000+", label: "Regulated Entities" },
  { value: "5 Min", label: "Detection Time" },
  { value: "90%+", label: "Extraction Accuracy" },
];

const steps = [
  { num: 1, title: "Detect", desc: "Monitor RBI sources in real-time" },
  { num: 2, title: "Parse", desc: "AI reads and structures the circular" },
  { num: 3, title: "Extract", desc: "Identify obligations and deadlines" },
  { num: 4, title: "Assign", desc: "Route tasks to the right teams" },
  { num: 5, title: "Track", desc: "Monitor compliance to completion" },
];

const features = [
  {
    icon: Zap,
    title: "Live Detection",
    desc: "Real-time monitoring of RBI circulars, master directions, and notifications as they are published.",
  },
  {
    icon: Brain,
    title: "AI Extraction",
    desc: "Automatically extract obligations, deadlines, and compliance requirements from complex regulatory text.",
  },
  {
    icon: MessageSquare,
    title: "Compliance Chat",
    desc: "Ask questions about any regulation and get instant, cited answers from your compliance knowledge base.",
  },
  {
    icon: ListChecks,
    title: "Task Automation",
    desc: "Auto-generate compliance tasks, assign to departments, and track completion with smart deadlines.",
  },
  {
    icon: Search,
    title: "Gap Analysis",
    desc: "Identify compliance gaps across your organization with AI-powered assessment and recommendations.",
  },
  {
    icon: Globe,
    title: "Multi-Regulator",
    desc: "Expand beyond RBI to SEBI, IRDAI, and other regulators with the same intelligence engine.",
  },
];

const painPoints = [
  {
    icon: FileWarning,
    title: "Circulars are unstructured",
    desc: "Teams spend hours interpreting PDFs and deciding what is mandatory versus informational.",
  },
  {
    icon: Building2,
    title: "Ownership is fragmented",
    desc: "Compliance, operations, treasury, IT, and legal all need to act, but accountability is often unclear.",
  },
  {
    icon: ShieldCheck,
    title: "Audit readiness is reactive",
    desc: "Evidence collection starts late and manual trackers make it hard to prove closure confidence.",
  },
];

const coverage = [
  "RBI circulars and notifications",
  "Master directions and updates",
  "Internal SOP and policy mappings",
  "Task-level ownership and due dates",
  "Closure notes with evidence trails",
  "Leadership compliance dashboard views",
];

const useCases = [
  {
    title: "Compliance Teams",
    desc: "Convert every circular into obligations, due dates, and assignees without manual spreadsheet work.",
  },
  {
    title: "Business and Ops Teams",
    desc: "Receive only the tasks relevant to your function with context, source links, and completion criteria.",
  },
  {
    title: "Leadership",
    desc: "Track compliance posture across entities, spot bottlenecks early, and review closure confidence quickly.",
  },
];

export default function LandingPage() {
  const { user, logout } = useAuth();
  const displayName = user?.username || user?.name || user?.email || "User";
  const displayEmail = user?.email || "";
  const userInitial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="relative min-h-screen bg-pampas">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/backgroundImg.png')",
          backgroundSize: "contain",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-pampas/80" />
      <div className="relative z-10">
      <header className="fixed inset-x-0 top-0 z-50 bg-pampas/90 border-b border-border-subtle backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo14.png" alt="RegIntel logo" width={28} height={28} className="rounded-sm" />
            <span className="text-lg font-semibold text-foreground tracking-tight">RegIntel</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-cloudy hover:text-foreground transition-colors duration-150">Features</a>
            <a href="#how-it-works" className="text-sm text-cloudy hover:text-foreground transition-colors duration-150">How It Works</a>
            <a href="#use-cases" className="text-sm text-cloudy hover:text-foreground transition-colors duration-150">Use Cases</a>
            <a href="#pricing" className="text-sm text-cloudy hover:text-foreground transition-colors duration-150">Pricing</a>
            <Link href="/dashboard" className="text-sm text-cloudy hover:text-foreground transition-colors duration-150">Dashboard</Link>
          </nav>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/chat"
                className="flex items-center gap-2 rounded-full border border-border-subtle bg-background px-2.5 py-1.5 hover:border-crail/50 transition-colors duration-150"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-crail text-xs font-semibold text-white">
                  {userInitial}
                </span>
                <span className="hidden sm:block max-w-[180px] truncate text-xs text-foreground">
                  {displayEmail || displayName}
                </span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-background px-3 py-2 text-sm font-medium text-foreground hover:border-crail/50 transition-colors duration-150"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="border border-border-subtle bg-white text-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-pampas transition-colors duration-150"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-crail text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-[#A8502F] transition-colors duration-150"
              >
                Get Early Access
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="pt-16">
        <section className="py-32 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block border border-cloudy text-cloudy text-xs px-3 py-1 rounded-full mb-6">
              RBI Compliance Intelligence
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-tight mb-6">
              Stay Ahead of
              <br />
              Every RBI Circular.
            </h1>
            <p className="text-base text-cloudy max-w-2xl mx-auto mb-10">
              RegIntel continuously monitors regulatory updates, understands impact on your organization, and turns circulars into owned, trackable action plans.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup"
                className="flex items-center gap-2 bg-crail text-white text-sm font-medium px-6 py-3 rounded-md hover:bg-[#A8502F] transition-colors duration-150"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/chat"
                className="bg-white border border-border-subtle text-foreground text-sm font-medium px-6 py-3 rounded-md hover:bg-pampas transition-colors duration-150"
              >
                Try Compliance Chat
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 px-6">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-y-6 divide-x divide-cloudy/40">
            {stats.map((stat) => (
              <div key={stat.label} className="px-8 text-center">
                <p className="text-xl font-semibold text-crail">{stat.value}</p>
                <p className="text-xs text-cloudy mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-background py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-medium tracking-widest text-cloudy uppercase mb-4 text-center">
              Why Teams Struggle Today
            </p>
            <h2 className="text-2xl font-semibold text-foreground text-center mb-12 tracking-tight">
              Compliance breaks when interpretation and execution are disconnected
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {painPoints.map((item) => (
                <div key={item.title} className="bg-pampas border border-border-subtle rounded-xl p-6">
                  <item.icon className="h-5 w-5 text-crail mb-4" />
                  <p className="text-sm font-semibold text-foreground mb-2">{item.title}</p>
                  <p className="text-sm text-cloudy leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-background py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-medium tracking-widest text-cloudy uppercase mb-4 text-center">
              How It Works
            </p>
            <h2 className="text-2xl font-semibold text-foreground text-center mb-16 tracking-tight">
              From Detection to Compliance in Minutes
            </h2>
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="hidden md:block absolute top-5 left-[10%] right-[10%] border-t border-dashed border-cloudy" />
              {steps.map((step) => (
                <div key={step.num} className="flex flex-col items-center text-center relative z-10">
                  <div className="h-10 w-10 rounded-full border-2 border-crail text-crail flex items-center justify-center text-sm font-semibold bg-background mb-3">
                    {step.num}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="text-xs text-cloudy mt-1 max-w-[120px]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-pampas py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-medium tracking-widest text-cloudy uppercase mb-4 text-center">
              Features
            </p>
            <h2 className="text-2xl font-semibold text-foreground text-center mb-12 tracking-tight">
              Everything You Need for Regulatory Compliance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((item) => (
                <div key={item.title} className="bg-background border border-border-subtle rounded-xl p-6">
                  <item.icon className="h-5 w-5 text-crail mb-4" />
                  <p className="text-sm font-semibold text-foreground mb-2">{item.title}</p>
                  <p className="text-sm text-cloudy leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="use-cases" className="bg-background py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-medium tracking-widest text-cloudy uppercase mb-4 text-center">
              Use Cases
            </p>
            <h2 className="text-2xl font-semibold text-foreground text-center mb-12 tracking-tight">
              One platform for every stakeholder in the compliance workflow
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {useCases.map((item) => (
                <div key={item.title} className="rounded-xl border border-border-subtle bg-pampas p-6">
                  <p className="text-sm font-semibold text-foreground mb-2">{item.title}</p>
                  <p className="text-sm text-cloudy leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-pampas py-20 px-6">
          <div className="max-w-5xl mx-auto rounded-2xl border border-border-subtle bg-background p-8 md:p-10">
            <p className="text-xs font-medium tracking-widest text-cloudy uppercase mb-4">
              Coverage
            </p>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-8">
              Built for day-to-day RBI compliance operations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {coverage.map((item) => (
                <div key={item} className="rounded-lg border border-border-subtle bg-pampas px-4 py-3 text-sm text-foreground">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-background py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-medium tracking-widest text-cloudy uppercase mb-4">
              Pricing
            </p>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-5">
              Early access for regulated institutions
            </h2>
            <p className="text-sm text-cloudy max-w-xl mx-auto mb-8">
              We are onboarding pilot partners and design collaborators. Share your compliance workflow and we will tailor setup, integrations, and rollout support.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="bg-crail text-white text-sm font-medium px-6 py-3 rounded-md hover:bg-[#A8502F] transition-colors duration-150"
              >
                Join Early Access
              </Link>
              <Link
                href="/chat"
                className="bg-white border border-border-subtle text-foreground text-sm font-medium px-6 py-3 rounded-md hover:bg-pampas transition-colors duration-150"
              >
                Explore Product Chat
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-pampas border-t border-border-subtle py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo14.png" alt="RegIntel logo" width={22} height={22} className="rounded-sm" />
            <span className="text-sm font-semibold text-foreground">RegIntel</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-cloudy hover:text-foreground transition-colors duration-150">Privacy</a>
            <a href="#" className="text-xs text-cloudy hover:text-foreground transition-colors duration-150">Terms</a>
            <a href="#" className="text-xs text-cloudy hover:text-foreground transition-colors duration-150">Contact</a>
          </div>
          <p className="text-xs text-cloudy">(c) 2026 RegIntel AI. All rights reserved.</p>
        </div>
      </footer>
      </div>
    </div>
  );
}
