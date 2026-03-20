import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutDashboard, Shield, Users } from "lucide-react";
import ReportsTopbar from "../../components/reports/ReportsTopbar";

function ReportTile({ title, description, to, icon: Icon, tone = "indigo", subtitle }) {
  const toneClass =
    tone === "emerald"
      ? "from-emerald-500 to-teal-500"
      : tone === "amber"
        ? "from-amber-500 to-orange-500"
        : "from-indigo-500 to-cyan-500";

  return (
    <Link
      to={to}
      className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className={`inline-flex rounded-2xl bg-gradient-to-br p-3 text-white ${toneClass}`}>
        <Icon size={20} />
      </div>
      <h2 className="mt-5 text-xl font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {subtitle ? <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{subtitle}</p> : null}
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        Open report
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function ReportsHomePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <ReportsTopbar />
        <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              <Shield size={14} />
              Reports Hub / Benchmark Center
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              International-standard reporting in one place
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Compare current operations against best practice, review executive-ready summaries, and move from raw metrics to clear adoption priorities.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ReportTile
            title="IT Manager Dashboard"
            description="Operational benchmark view with gap analysis, readiness scorecard, queue health, and adoption priorities."
            subtitle="Role: it_manager / admin"
            to="/reports/it"
            icon={Users}
            tone="indigo"
          />
          <ReportTile
            title="Executive Dashboard"
            description="Executive one-page brief with key highlights, strategic comparison, gap analysis, and expected ROI."
            subtitle="Role: executive / admin"
            to="/reports/executive"
            icon={LayoutDashboard}
            tone="emerald"
          />
        </section>
      </div>
    </div>
  );
}
