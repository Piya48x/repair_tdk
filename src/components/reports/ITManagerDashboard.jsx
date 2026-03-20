import React from "react";
import {
  AlertTriangle,
  RefreshCw,
  Ticket,
  Wrench,
  Zap,
  BadgeCheck,
} from "lucide-react";
import ReportMetricCard from "./ReportMetricCard";
import ReportSectionCard from "./ReportSectionCard";
import BenchmarkInsightsPanel from "./BenchmarkInsightsPanel";
import { buildReportBenchmark } from "../../services/reportBenchmarkService";

function ProgressRow({ label, value, total, tone = "indigo", subtitle }) {
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
        <span className="font-black text-slate-900">{value.toLocaleString("th-TH")}</span>
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
  const queue = data?.queue || {};
  const workload = data?.workload || [];
  const agingBuckets = data?.agingBuckets || [];
  const slaSummary = data?.slaSummary || {};
  const trend = data?.trend || [];
  const topDepartments = data?.topDepartments || [];
  const walkInRatio = Number(data?.walkInRatio || 0);
  const totalTickets = Number(data?.totalTickets || 0);
  const analysis = buildReportBenchmark(data, "it_manager");

  const maxWorkload = Math.max(...workload.map((item) => item.total || 0), 1);
  const maxTrend = Math.max(...trend.map((item) => item.value || 0), 1);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-2xl">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              <Wrench size={14} />
              IT Manager Benchmark Overview
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              Operational readiness against international service standards
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              One page for queue health, benchmark gap, process readiness, and practical adoption priorities for the IT operation team.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetricCard
          title="queue_total"
          value={Number(queue.total || 0).toLocaleString("th-TH")}
          hint="งานที่ยังไม่ปิด"
          icon={Ticket}
          tone="indigo"
        />
        <ReportMetricCard
          title="new"
          value={Number(queue.newTickets || 0).toLocaleString("th-TH")}
          hint="งานเข้าใหม่"
          icon={Zap}
          tone="amber"
        />
        <ReportMetricCard
          title="in_progress"
          value={Number(queue.inProgressTickets || 0).toLocaleString("th-TH")}
          hint="กำลังดำเนินการ"
          icon={Wrench}
          tone="emerald"
        />
        <ReportMetricCard
          title="overdue"
          value={Number(queue.overdueTickets || 0).toLocaleString("th-TH")}
          hint="งานเกิน SLA"
          icon={AlertTriangle}
          tone="rose"
        />
      </section>

      <BenchmarkInsightsPanel
        analysis={analysis}
        title="IT Operations Benchmark Summary / Study Visit Translation"
      />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportSectionCard
          title="Technician Workload"
          subtitle="จำนวนงานค้างต่อช่าง พร้อมสถานะงานที่เสี่ยง"
        >
          <div className="space-y-3">
            {workload.length ? (
              workload.map((item) => (
                <ProgressRow
                  key={item.label}
                  label={item.label}
                  subtitle={item.overdue > 0 ? `${item.overdue} overdue` : "on track"}
                  value={item.total}
                  total={maxWorkload}
                  tone={item.overdue > 0 ? "rose" : "indigo"}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No active assignment data.
              </div>
            )}
          </div>
        </ReportSectionCard>

        <ReportSectionCard
          title="SLA Summary"
          subtitle="ภาพรวมความเสี่ยงของงานค้าง"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat label="Breach" value={Number(slaSummary.breach || 0).toLocaleString("th-TH")} tone="rose" />
            <MiniStat label="Warning" value={Number(slaSummary.warning || 0).toLocaleString("th-TH")} tone="amber" />
            <MiniStat label="On Track" value={Number(slaSummary.onTrack || 0).toLocaleString("th-TH")} tone="emerald" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {agingBuckets.map((bucket) => (
              <div key={bucket.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{bucket.label}</p>
                  <span className="text-xs font-medium text-slate-500">{bucket.count} items</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{bucket.count}</div>
                <p className="mt-1 text-xs text-slate-500">Aging bucket</p>
              </div>
            ))}
          </div>
        </ReportSectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportSectionCard
          title="Walk-in Ratio"
          subtitle="งานที่เข้ามานอกระบบเทียบกับงานทั้งหมด"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Walk-in share</p>
              <p className="mt-3 text-4xl font-black text-indigo-700">{walkInRatio}%</p>
              <p className="mt-2 text-sm text-slate-500">
                {Number(data?.walkInCount || 0)} / {totalTickets} tickets
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Interpretation</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                High walk-in ratio usually means shadow work is still present. Use this card to track behavior change over time.
              </p>
            </div>
          </div>
        </ReportSectionCard>

        <ReportSectionCard
          title="Tickets Trend"
          subtitle="6-month request volume"
        >
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
                  <p className="text-sm font-black text-slate-900">{item.value}</p>
                </div>
              );
            })}
          </div>
        </ReportSectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportSectionCard
          title="Top Departments"
          subtitle="แผนกที่แจ้งงานเข้ามามากที่สุด"
        >
          <div className="space-y-3">
            {topDepartments.length ? (
              topDepartments.map((item, index) => (
                <ProgressRow
                  key={`${item.label}-${index}`}
                  label={item.label}
                  value={item.value}
                  total={topDepartments[0]?.value || 1}
                  tone={index === 0 ? "indigo" : index === 1 ? "amber" : "slate"}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No department data available.
              </div>
            )}
          </div>
        </ReportSectionCard>

        <ReportSectionCard
          title="Queue Status"
          subtitle="New / In Progress / Overdue"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat label="New" value={Number(queue.newTickets || 0).toLocaleString("th-TH")} tone="amber" />
            <MiniStat label="In Progress" value={Number(queue.inProgressTickets || 0).toLocaleString("th-TH")} tone="emerald" />
            <MiniStat label="Overdue" value={Number(queue.overdueTickets || 0).toLocaleString("th-TH")} tone="rose" />
          </div>
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BadgeCheck size={16} className="text-emerald-600" />
              Snapshot
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This dashboard is optimized for operational follow-up and prioritization instead of executive reporting.
            </p>
          </div>
        </ReportSectionCard>
      </section>
    </div>
  );
}
