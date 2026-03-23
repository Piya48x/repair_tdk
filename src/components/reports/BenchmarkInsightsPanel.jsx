import React, { useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Radar,
  Table2,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar as RadarSeries,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");

function toneClasses(tone = "indigo") {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50/80 text-emerald-700";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50/80 text-amber-700";
  }
  if (tone === "rose") {
    return "border-rose-200 bg-rose-50/80 text-rose-700";
  }
  return "border-indigo-200 bg-indigo-50/80 text-indigo-700";
}

function SectionCard({ title, subtitle, icon: Icon, children, action }) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Icon size={16} className="text-indigo-600" />
            {title}
          </div>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function HighlightCard({ item }) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{item.title}</p>
          <h3 className="mt-2 text-base font-black tracking-tight text-slate-900">{item.heading}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(item.tone)}`}>
          {item.tone === "rose" ? "Critical" : item.tone === "amber" ? "Watch" : "Strong"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
    </article>
  );
}

function priorityTone(priority) {
  if (priority === "High") return "bg-rose-50 text-rose-700 border-rose-200";
  if (priority === "Medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default function BenchmarkInsightsPanel({ analysis, title = "Benchmark Overview" }) {
  const [chartMode, setChartMode] = useState("radar");
  const gapAnalysis = analysis?.gapAnalysis || [];
  const highlights = analysis?.highlights || [];
  const strategicComparison = analysis?.strategicComparison || [];
  const actionPlan = analysis?.actionPlan || [];
  const expectedImpact = analysis?.expectedImpact || [];
  const executiveSummary = analysis?.executiveSummary || [];

  return (
    <div className="space-y-6">
      <SectionCard
        title={title}
        subtitle="International-standard benchmarking summary in one page: key highlights, gap analysis, comparison, action readiness, and expected impact."
        icon={TrendingUp}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {highlights.map((item) => (
            <HighlightCard key={item.title} item={item} />
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Gap Analysis / Benchmark Gap"
          subtitle="Interactive view comparing our current capability against international best practice."
          icon={Radar}
          action={
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setChartMode("radar")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${chartMode === "radar" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                Radar
              </button>
              <button
                type="button"
                onClick={() => setChartMode("bar")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${chartMode === "bar" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                Bar
              </button>
            </div>
          }
        >
          <div className="h-[360px] min-w-0 rounded-[1.5rem] border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              {chartMode === "radar" ? (
                <RadarChart data={gapAnalysis}>
                  <PolarGrid stroke="#cbd5e1" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: "#475569" }} />
                  <RadarSeries
                    name="Current"
                    dataKey="current"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.35}
                    strokeWidth={2}
                  />
                  <RadarSeries
                    name="Best Practice"
                    dataKey="target"
                    stroke="#0f172a"
                    fill="#0f172a"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                  <Tooltip />
                </RadarChart>
              ) : (
                <BarChart data={gapAnalysis} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="dimension" tick={{ fontSize: 11, fill: "#475569" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
                  <Tooltip />
                  <Bar dataKey="current" name="Current" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="target" name="Best Practice" fill="#334155" radius={[8, 8, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Action Plan Scorecard"
          subtitle="Readiness to adopt best practice, grouped by workstream."
          icon={Target}
        >
          <div className="space-y-4">
            {actionPlan.map((item) => (
              <div key={item.topic} className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.topic}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.owner} · {item.nextStep}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black tracking-tight text-slate-900">{item.readiness}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">target {item.target}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-slate-500" style={{ width: `${item.readiness}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Strategic Comparison"
          subtitle="Current internal standard versus observed international benchmark."
          icon={Table2}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  <th className="pb-3 pr-4">Area</th>
                  <th className="pb-3 pr-4">Current</th>
                  <th className="pb-3 pr-4">International Standard</th>
                  <th className="pb-3 pr-4">Gap</th>
                  <th className="pb-3">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {strategicComparison.map((row) => (
                  <tr key={row.area} className="align-top">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{row.area}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.current}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.benchmark}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.gap}</td>
                    <td className="py-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityTone(row.priority)}`}>
                        {row.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Expected ROI / Impact"
          subtitle="Estimated numeric improvement if the recommended practices are adopted."
          icon={BarChart3}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {expectedImpact.map((item) => (
              <div key={item.label} className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Current</p>
                    <p className="text-2xl font-black text-slate-900">
                      {NUMBER_FORMATTER.format(item.current)} <span className="text-sm font-semibold text-slate-400">{item.unit}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-500">Target</p>
                    <p className="text-2xl font-black text-blue-700">
                      {NUMBER_FORMATTER.format(item.target)} <span className="text-sm font-semibold text-slate-400">{item.unit}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <CheckCircle2 size={14} />
                  Expected gain {NUMBER_FORMATTER.format(item.delta)} {item.unit}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Executive Summary"
        subtitle="Summary table showing what to emulate, key adoption challenges, and KPI to measure success."
        icon={Table2}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                <th className="pb-3 pr-4">Theme</th>
                <th className="pb-3 pr-4">What to emulate</th>
                <th className="pb-3 pr-4">Adoption challenge</th>
                <th className="pb-3">Success KPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {executiveSummary.map((row) => (
                <tr key={row.theme} className="align-top">
                  <td className="py-3 pr-4 font-semibold text-slate-900">{row.theme}</td>
                  <td className="py-3 pr-4 text-slate-600">{row.emulate}</td>
                  <td className="py-3 pr-4 text-slate-600">{row.challenge}</td>
                  <td className="py-3 text-slate-600">{row.kpi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
