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
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { getReportLocale } from "./reportLocale";

const BENCHMARK_INSIGHTS_TRANSLATIONS = {
  th: {
    subtitle:
      "สรุป benchmark เทียบมาตรฐานสากลในหน้าเดียว ทั้ง highlight, gap analysis, comparison, readiness และ expected impact",
    tone: {
      strong: "พร้อม",
      watch: "เฝ้าดู",
      critical: "เร่งด่วน",
    },
    chart: {
      gapTitle: "Gap Analysis / Benchmark Gap",
      gapSubtitle: "เทียบความสามารถปัจจุบันกับแนวปฏิบัติที่ดีกว่าในมุมมอง interactive",
      radar: "Radar",
      bar: "Bar",
      current: "ปัจจุบัน",
      target: "เป้าหมาย",
    },
    action: {
      title: "Action Plan Scorecard",
      subtitle: "ความพร้อมในการปรับใช้แนวทางใหม่ แยกตาม workstream",
      target: "เป้าหมาย",
    },
    strategic: {
      title: "Strategic Comparison",
      subtitle: "เทียบมาตรฐานภายในปัจจุบันกับ benchmark ที่ต้องการไปให้ถึง",
      headers: {
        area: "หัวข้อ",
        current: "ปัจจุบัน",
        benchmark: "มาตรฐานอ้างอิง",
        gap: "ช่องว่าง",
        priority: "ลำดับความสำคัญ",
      },
    },
    impact: {
      title: "Expected ROI / Impact",
      subtitle: "ผลเชิงตัวเลขที่คาดว่าจะดีขึ้น หากปรับใช้แนวทางที่แนะนำ",
      current: "ปัจจุบัน",
      target: "เป้าหมาย",
      gain: "ผลต่างที่คาดหวัง",
    },
    summary: {
      title: "Executive Summary",
      subtitle: "สรุปสิ่งที่ควรนำมาปรับใช้, อุปสรรค, และ KPI ที่ต้องติดตาม",
      headers: {
        theme: "ประเด็น",
        emulate: "แนวทางที่ควรนำมาใช้",
        challenge: "ความท้าทาย",
        kpi: "KPI สำเร็จ",
      },
    },
  },
  en: {
    subtitle:
      "International-standard benchmarking summary in one page: key highlights, gap analysis, comparison, action readiness, and expected impact.",
    tone: {
      strong: "Strong",
      watch: "Watch",
      critical: "Critical",
    },
    chart: {
      gapTitle: "Gap Analysis / Benchmark Gap",
      gapSubtitle:
        "Interactive view comparing current capability against stronger operating practice.",
      radar: "Radar",
      bar: "Bar",
      current: "Current",
      target: "Target",
    },
    action: {
      title: "Action Plan Scorecard",
      subtitle: "Readiness to adopt better practice, grouped by workstream.",
      target: "Target",
    },
    strategic: {
      title: "Strategic Comparison",
      subtitle: "Current internal standard versus the benchmark we want to reach.",
      headers: {
        area: "Area",
        current: "Current",
        benchmark: "Benchmark",
        gap: "Gap",
        priority: "Priority",
      },
    },
    impact: {
      title: "Expected ROI / Impact",
      subtitle: "Estimated numeric improvement if the recommended practices are adopted.",
      current: "Current",
      target: "Target",
      gain: "Expected gain",
    },
    summary: {
      title: "Executive Summary",
      subtitle: "Summary of what to emulate, adoption challenges, and KPI to track.",
      headers: {
        theme: "Theme",
        emulate: "What to emulate",
        challenge: "Adoption challenge",
        kpi: "Success KPI",
      },
    },
  },
  ko: {
    subtitle:
      "핵심 하이라이트, gap analysis, 비교, 실행 준비도, expected impact를 한 페이지로 정리한 국제 기준 benchmark 요약입니다.",
    tone: {
      strong: "양호",
      watch: "주의",
      critical: "긴급",
    },
    chart: {
      gapTitle: "Gap Analysis / Benchmark Gap",
      gapSubtitle: "현재 역량과 더 나은 운영 기준을 interactive하게 비교합니다.",
      radar: "레이더",
      bar: "막대",
      current: "현재",
      target: "목표",
    },
    action: {
      title: "Action Plan Scorecard",
      subtitle: "개선안 도입 준비도를 workstream별로 정리합니다.",
      target: "목표",
    },
    strategic: {
      title: "Strategic Comparison",
      subtitle: "현재 내부 기준과 도달하려는 benchmark를 비교합니다.",
      headers: {
        area: "영역",
        current: "현재",
        benchmark: "Benchmark",
        gap: "격차",
        priority: "우선순위",
      },
    },
    impact: {
      title: "Expected ROI / Impact",
      subtitle: "권장 방식을 적용했을 때 기대되는 수치 개선 효과입니다.",
      current: "현재",
      target: "목표",
      gain: "예상 개선폭",
    },
    summary: {
      title: "Executive Summary",
      subtitle: "도입할 요소, 주요 과제, 추적 KPI를 요약합니다.",
      headers: {
        theme: "주제",
        emulate: "도입할 요소",
        challenge: "도입 과제",
        kpi: "성공 KPI",
      },
    },
  },
};

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

function priorityTone(priority) {
  if (priority === "High") return "bg-rose-50 text-rose-700 border-rose-200";
  if (priority === "Medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function SectionCard({ title, subtitle, icon: Icon, children, action }) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Icon size={16} className="text-indigo-600" />
            {title}
          </div>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function HighlightCard({ item, toneLabel }) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            {item.title}
          </p>
          <h3 className="mt-2 text-base font-black tracking-tight text-slate-900">
            {item.heading}
          </h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(item.tone)}`}>
          {toneLabel}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
    </article>
  );
}

export default function BenchmarkInsightsPanel({
  analysis,
  title = "Benchmark Overview",
}) {
  const { language, tt } = useScopedI18n(BENCHMARK_INSIGHTS_TRANSLATIONS);
  const [chartMode, setChartMode] = useState("radar");
  const gapAnalysis = analysis?.gapAnalysis || [];
  const highlights = analysis?.highlights || [];
  const strategicComparison = analysis?.strategicComparison || [];
  const actionPlan = analysis?.actionPlan || [];
  const expectedImpact = analysis?.expectedImpact || [];
  const executiveSummary = analysis?.executiveSummary || [];
  const numberFormatter = new Intl.NumberFormat(getReportLocale(language));

  const toneLabel = (tone) => {
    if (tone === "rose") return tt("tone.critical");
    if (tone === "amber") return tt("tone.watch");
    return tt("tone.strong");
  };

  return (
    <div className="space-y-6">
      <SectionCard title={title} subtitle={tt("subtitle")} icon={TrendingUp}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {highlights.map((item) => (
            <HighlightCard
              key={item.title}
              item={item}
              toneLabel={toneLabel(item.tone)}
            />
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title={tt("chart.gapTitle")}
          subtitle={tt("chart.gapSubtitle")}
          icon={Radar}
          action={
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setChartMode("radar")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  chartMode === "radar" ? "bg-slate-900 text-white" : "text-slate-600"
                }`}
              >
                {tt("chart.radar")}
              </button>
              <button
                type="button"
                onClick={() => setChartMode("bar")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  chartMode === "bar" ? "bg-slate-900 text-white" : "text-slate-600"
                }`}
              >
                {tt("chart.bar")}
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
                    name={tt("chart.current")}
                    dataKey="current"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.35}
                    strokeWidth={2}
                  />
                  <RadarSeries
                    name={tt("chart.target")}
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
                  <Bar dataKey="current" name={tt("chart.current")} fill="#2563eb" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="target" name={tt("chart.target")} fill="#334155" radius={[8, 8, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title={tt("action.title")}
          subtitle={tt("action.subtitle")}
          icon={Target}
        >
          <div className="space-y-4">
            {actionPlan.map((item) => (
              <div key={item.topic} className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.topic}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {item.owner} · {item.nextStep}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black tracking-tight text-slate-900">
                      {item.readiness}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {tt("action.target")} {item.target}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-700 to-slate-500"
                    style={{ width: `${item.readiness}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title={tt("strategic.title")}
          subtitle={tt("strategic.subtitle")}
          icon={Table2}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  <th className="pb-3 pr-4">{tt("strategic.headers.area")}</th>
                  <th className="pb-3 pr-4">{tt("strategic.headers.current")}</th>
                  <th className="pb-3 pr-4">{tt("strategic.headers.benchmark")}</th>
                  <th className="pb-3 pr-4">{tt("strategic.headers.gap")}</th>
                  <th className="pb-3">{tt("strategic.headers.priority")}</th>
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
          title={tt("impact.title")}
          subtitle={tt("impact.subtitle")}
          icon={BarChart3}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {expectedImpact.map((item) => (
              <div key={item.label} className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  {item.label}
                </p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">{tt("impact.current")}</p>
                    <p className="text-2xl font-black text-slate-900">
                      {numberFormatter.format(item.current)}{" "}
                      <span className="text-sm font-semibold text-slate-400">{item.unit}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-500">{tt("impact.target")}</p>
                    <p className="text-2xl font-black text-blue-700">
                      {numberFormatter.format(item.target)}{" "}
                      <span className="text-sm font-semibold text-slate-400">{item.unit}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <CheckCircle2 size={14} />
                  {tt("impact.gain")} {numberFormatter.format(item.delta)} {item.unit}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title={tt("summary.title")}
        subtitle={tt("summary.subtitle")}
        icon={Table2}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                <th className="pb-3 pr-4">{tt("summary.headers.theme")}</th>
                <th className="pb-3 pr-4">{tt("summary.headers.emulate")}</th>
                <th className="pb-3 pr-4">{tt("summary.headers.challenge")}</th>
                <th className="pb-3">{tt("summary.headers.kpi")}</th>
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
