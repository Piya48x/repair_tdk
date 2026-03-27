import React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  RefreshCw,
  Ticket,
  Wrench,
  Zap,
} from "lucide-react";
import ReportMetricCard from "./ReportMetricCard";
import ReportSectionCard from "./ReportSectionCard";
import BenchmarkInsightsPanel from "./BenchmarkInsightsPanel";
import { buildReportBenchmark } from "../../services/reportBenchmarkService";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { getReportLocale } from "./reportLocale";

const IT_MANAGER_DASHBOARD_TRANSLATIONS = {
  th: {
    heroBadge: "IT Manager Benchmark Overview",
    heroTitle: "มุมมองความพร้อมของทีมปฏิบัติการ IT เทียบมาตรฐานที่ควรไปให้ถึง",
    heroDescription:
      "สรุป queue health, benchmark gap, process readiness และลำดับการปรับปรุงที่นำไปใช้ได้จริงในหน้าเดียว",
    benchmarkTitle: "IT Operations Benchmark Summary",
    metrics: {
      queueTotal: "งานค้างทั้งหมด",
      queueTotalHint: "งานที่ยังไม่ปิด",
      new: "งานเข้าใหม่",
      newHint: "งานใหม่ล่าสุด",
      inProgress: "กำลังดำเนินการ",
      inProgressHint: "งานที่มีผู้รับผิดชอบแล้ว",
      overdue: "งานเกิน SLA",
      overdueHint: "งานที่ต้องเร่งติดตาม",
    },
    workload: {
      title: "Technician Workload",
      subtitle: "จำนวนงานค้างต่อช่าง พร้อมสถานะงานที่เสี่ยง",
      overdue: "{{count}} งานเสี่ยง",
      onTrack: "อยู่ในเกณฑ์ปกติ",
      empty: "ยังไม่มีข้อมูลการมอบหมายงานที่เปิดอยู่",
    },
    sla: {
      title: "SLA Summary",
      subtitle: "ภาพรวมความเสี่ยงของงานค้าง",
      breach: "Breach",
      warning: "Warning",
      onTrack: "On Track",
      items: "{{count}} รายการ",
      agingBucket: "ช่วงอายุงาน",
    },
    walkIn: {
      title: "Walk-in Ratio",
      subtitle: "สัดส่วนงานนอกระบบเทียบกับ ticket ทั้งหมด",
      share: "สัดส่วน Walk-in",
      interpretation: "คำอธิบาย",
      description:
        "ถ้า walk-in สูงต่อเนื่อง แปลว่ายังมี shadow work อยู่ในทีม ใช้การ์ดนี้ติดตามการเปลี่ยนพฤติกรรมได้",
    },
    trend: {
      title: "Tickets Trend",
      subtitle: "ปริมาณคำขอ 6 เดือนล่าสุด",
    },
    departments: {
      title: "Top Departments",
      subtitle: "แผนกที่ส่งงานเข้ามามากที่สุด",
      empty: "ยังไม่มีข้อมูลแผนก",
    },
    queueStatus: {
      title: "Queue Status",
      subtitle: "New / In Progress / Overdue",
      snapshot: "Operational Snapshot",
      description:
        "แดชบอร์ดนี้ออกแบบมาเพื่อการติดตามงานและจัดลำดับความสำคัญ มากกว่าการสรุประดับผู้บริหาร",
    },
    refresh: "รีเฟรช",
  },
  en: {
    heroBadge: "IT Manager Benchmark Overview",
    heroTitle: "Operational readiness for the IT team against the standard we want to reach",
    heroDescription:
      "One view for queue health, benchmark gap, process readiness, and practical improvement priorities.",
    benchmarkTitle: "IT Operations Benchmark Summary",
    metrics: {
      queueTotal: "Open Queue",
      queueTotalHint: "Tickets not closed yet",
      new: "New Tickets",
      newHint: "Recently arrived work",
      inProgress: "In Progress",
      inProgressHint: "Tickets already assigned",
      overdue: "Overdue",
      overdueHint: "Work requiring escalation",
    },
    workload: {
      title: "Technician Workload",
      subtitle: "Open workload per technician with risk visibility",
      overdue: "{{count}} at risk",
      onTrack: "On track",
      empty: "No active assignment data yet.",
    },
    sla: {
      title: "SLA Summary",
      subtitle: "Risk overview of the active queue",
      breach: "Breach",
      warning: "Warning",
      onTrack: "On Track",
      items: "{{count}} items",
      agingBucket: "Aging bucket",
    },
    walkIn: {
      title: "Walk-in Ratio",
      subtitle: "Off-system work compared with the total ticket flow",
      share: "Walk-in share",
      interpretation: "Interpretation",
      description:
        "A persistently high walk-in ratio usually means shadow work is still present. Use this card to track behavior change over time.",
    },
    trend: {
      title: "Tickets Trend",
      subtitle: "Request volume across the last 6 months",
    },
    departments: {
      title: "Top Departments",
      subtitle: "Departments generating the most requests",
      empty: "No department data available.",
    },
    queueStatus: {
      title: "Queue Status",
      subtitle: "New / In Progress / Overdue",
      snapshot: "Operational Snapshot",
      description:
        "This dashboard is optimized for operational follow-up and prioritization rather than executive storytelling.",
    },
    refresh: "Refresh",
  },
  ko: {
    heroBadge: "IT 매니저 벤치마크 개요",
    heroTitle: "목표 기준과 비교한 IT 운영팀의 준비도",
    heroDescription:
      "queue health, benchmark gap, process readiness, 개선 우선순위를 한 화면에서 확인합니다.",
    benchmarkTitle: "IT 운영 Benchmark Summary",
    metrics: {
      queueTotal: "열린 작업",
      queueTotalHint: "아직 닫히지 않은 티켓",
      new: "신규 티켓",
      newHint: "최근 유입된 작업",
      inProgress: "진행 중",
      inProgressHint: "담당자가 배정된 작업",
      overdue: "SLA 초과",
      overdueHint: "즉시 추적이 필요한 작업",
    },
    workload: {
      title: "기술자 업무량",
      subtitle: "기술자별 열린 작업과 위험 상태를 함께 봅니다",
      overdue: "위험 {{count}}건",
      onTrack: "정상 범위",
      empty: "활성 배정 데이터가 없습니다.",
    },
    sla: {
      title: "SLA 요약",
      subtitle: "열린 작업의 위험 수준 요약",
      breach: "Breach",
      warning: "Warning",
      onTrack: "On Track",
      items: "{{count}}건",
      agingBucket: "경과 구간",
    },
    walkIn: {
      title: "Walk-in 비율",
      subtitle: "비공식 유입 작업이 전체 ticket 흐름에서 차지하는 비중",
      share: "Walk-in 비중",
      interpretation: "해석",
      description:
        "Walk-in 비율이 계속 높으면 shadow work가 남아 있다는 의미일 가능성이 큽니다. 이 카드로 행동 변화를 추적할 수 있습니다.",
    },
    trend: {
      title: "티켓 추세",
      subtitle: "최근 6개월 요청량",
    },
    departments: {
      title: "상위 부서",
      subtitle: "가장 많은 요청을 보내는 부서",
      empty: "부서 데이터가 없습니다.",
    },
    queueStatus: {
      title: "Queue 상태",
      subtitle: "New / In Progress / Overdue",
      snapshot: "운영 스냅샷",
      description:
        "이 대시보드는 임원용 요약보다 운영 추적과 우선순위 결정에 맞춰져 있습니다.",
    },
    refresh: "새로고침",
  },
};

function ProgressRow({ label, value, total, tone = "indigo", subtitle, valueLabel }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const barClass =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : tone === "rose"
          ? "bg-rose-500"
          : "bg-indigo-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div>
          <span className="font-semibold text-slate-700">{label}</span>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <span className="font-black text-slate-900">{valueLabel}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, hint, tone = "slate" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {hint ? <p className="mt-1 text-xs font-medium opacity-80">{hint}</p> : null}
    </div>
  );
}

export default function ITManagerDashboard({ data, onRefresh, loading }) {
  const { language, tt } = useScopedI18n(IT_MANAGER_DASHBOARD_TRANSLATIONS);
  const queue = data?.queue || {};
  const workload = data?.workload || [];
  const agingBuckets = data?.agingBuckets || [];
  const slaSummary = data?.slaSummary || {};
  const trend = data?.trend || [];
  const topDepartments = data?.topDepartments || [];
  const walkInRatio = Number(data?.walkInRatio || 0);
  const totalTickets = Number(data?.totalTickets || 0);
  const analysis = buildReportBenchmark(data, "it_manager");
  const numberFormatter = new Intl.NumberFormat(getReportLocale(language));

  const maxWorkload = Math.max(...workload.map((item) => item.total || 0), 1);
  const maxTrend = Math.max(...trend.map((item) => item.value || 0), 1);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-2xl">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              <Wrench size={14} />
              {tt("heroBadge")}
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              {tt("heroTitle")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              {tt("heroDescription")}
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {tt("refresh")}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetricCard
          title={tt("metrics.queueTotal")}
          value={numberFormatter.format(Number(queue.total || 0))}
          hint={tt("metrics.queueTotalHint")}
          icon={Ticket}
          tone="indigo"
        />
        <ReportMetricCard
          title={tt("metrics.new")}
          value={numberFormatter.format(Number(queue.newTickets || 0))}
          hint={tt("metrics.newHint")}
          icon={Zap}
          tone="amber"
        />
        <ReportMetricCard
          title={tt("metrics.inProgress")}
          value={numberFormatter.format(Number(queue.inProgressTickets || 0))}
          hint={tt("metrics.inProgressHint")}
          icon={Wrench}
          tone="emerald"
        />
        <ReportMetricCard
          title={tt("metrics.overdue")}
          value={numberFormatter.format(Number(queue.overdueTickets || 0))}
          hint={tt("metrics.overdueHint")}
          icon={AlertTriangle}
          tone="rose"
        />
      </section>

      <BenchmarkInsightsPanel analysis={analysis} title={tt("benchmarkTitle")} />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportSectionCard title={tt("workload.title")} subtitle={tt("workload.subtitle")}>
          <div className="space-y-3">
            {workload.length ? (
              workload.map((item) => (
                <ProgressRow
                  key={item.label}
                  label={item.label}
                  subtitle={
                    item.overdue > 0
                      ? tt("workload.overdue", { count: numberFormatter.format(item.overdue) })
                      : tt("workload.onTrack")
                  }
                  value={item.total}
                  total={maxWorkload}
                  tone={item.overdue > 0 ? "rose" : "indigo"}
                  valueLabel={numberFormatter.format(item.total)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                {tt("workload.empty")}
              </div>
            )}
          </div>
        </ReportSectionCard>

        <ReportSectionCard title={tt("sla.title")} subtitle={tt("sla.subtitle")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat label={tt("sla.breach")} value={numberFormatter.format(Number(slaSummary.breach || 0))} tone="rose" />
            <MiniStat label={tt("sla.warning")} value={numberFormatter.format(Number(slaSummary.warning || 0))} tone="amber" />
            <MiniStat label={tt("sla.onTrack")} value={numberFormatter.format(Number(slaSummary.onTrack || 0))} tone="emerald" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {agingBuckets.map((bucket) => (
              <div key={bucket.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{bucket.label}</p>
                  <span className="text-xs font-medium text-slate-500">
                    {tt("sla.items", { count: numberFormatter.format(bucket.count) })}
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  {numberFormatter.format(bucket.count)}
                </div>
                <p className="mt-1 text-xs text-slate-500">{tt("sla.agingBucket")}</p>
              </div>
            ))}
          </div>
        </ReportSectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportSectionCard title={tt("walkIn.title")} subtitle={tt("walkIn.subtitle")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{tt("walkIn.share")}</p>
              <p className="mt-3 text-4xl font-black text-indigo-700">{walkInRatio}%</p>
              <p className="mt-2 text-sm text-slate-500">
                {numberFormatter.format(Number(data?.walkInCount || 0))} / {numberFormatter.format(totalTickets)} tickets
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{tt("walkIn.interpretation")}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{tt("walkIn.description")}</p>
            </div>
          </div>
        </ReportSectionCard>

        <ReportSectionCard title={tt("trend.title")} subtitle={tt("trend.subtitle")}>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {trend.map((item) => {
              const height = Math.max(16, Math.round(((item.value || 0) / maxTrend) * 120));
              return (
                <div key={item.key} className="flex flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end justify-center rounded-2xl bg-slate-50 p-2">
                    <div
                      className="w-full rounded-xl bg-gradient-to-t from-indigo-500 to-cyan-400"
                      style={{ height }}
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
                  <p className="text-sm font-black text-slate-900">
                    {numberFormatter.format(item.value)}
                  </p>
                </div>
              );
            })}
          </div>
        </ReportSectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportSectionCard title={tt("departments.title")} subtitle={tt("departments.subtitle")}>
          <div className="space-y-3">
            {topDepartments.length ? (
              topDepartments.map((item, index) => (
                <ProgressRow
                  key={`${item.label}-${index}`}
                  label={item.label}
                  value={item.value}
                  total={topDepartments[0]?.value || 1}
                  tone={index === 0 ? "indigo" : index === 1 ? "amber" : "slate"}
                  valueLabel={numberFormatter.format(item.value)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                {tt("departments.empty")}
              </div>
            )}
          </div>
        </ReportSectionCard>

        <ReportSectionCard title={tt("queueStatus.title")} subtitle={tt("queueStatus.subtitle")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat label={tt("metrics.new")} value={numberFormatter.format(Number(queue.newTickets || 0))} tone="amber" />
            <MiniStat label={tt("metrics.inProgress")} value={numberFormatter.format(Number(queue.inProgressTickets || 0))} tone="emerald" />
            <MiniStat label={tt("metrics.overdue")} value={numberFormatter.format(Number(queue.overdueTickets || 0))} tone="rose" />
          </div>
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BadgeCheck size={16} className="text-emerald-600" />
              {tt("queueStatus.snapshot")}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {tt("queueStatus.description")}
            </p>
          </div>
        </ReportSectionCard>
      </section>
    </div>
  );
}
