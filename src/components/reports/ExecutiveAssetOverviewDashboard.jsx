import React from "react";
import {
  Clock3,
  KeyRound,
  Package,
  RefreshCw,
  ShieldAlert,
  Ticket,
  Wrench,
} from "lucide-react";
import ReportMetricCard from "./ReportMetricCard";
import ReportSectionCard from "./ReportSectionCard";
import BenchmarkInsightsPanel from "./BenchmarkInsightsPanel";
import { buildReportBenchmark } from "../../services/reportBenchmarkService";

const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");

function statusTone(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("pending") || text.includes("new")) return "amber";
  if (text.includes("approved") || text.includes("completed")) return "emerald";
  if (text.includes("rejected") || text.includes("overdue")) return "rose";
  return "indigo";
}

function WorkstreamBar({ label, value, total, tone = "indigo" }) {
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
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-900">{NUMBER_FORMATTER.format(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function ActivityRow({ item }) {
  const tone =
    item.kind === "access"
      ? "cyan"
      : item.kind === "asset"
        ? "emerald"
        : item.kind === "license"
          ? "indigo"
          : statusTone(item.status);

  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : tone === "cyan"
            ? "border-cyan-200 bg-cyan-50 text-cyan-700"
            : "border-indigo-200 bg-indigo-50 text-indigo-700";

  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClass}`}>
              {item.kindLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              <Clock3 size={12} />
              {item.dateLabel}
            </span>
          </div>
          <h4 className="mt-2 text-sm font-black text-slate-900">{item.title}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          {item.statusLabel}
        </span>
      </div>
    </article>
  );
}

export default function ExecutiveAssetOverviewDashboard({ data, onRefresh, loading }) {
  const benchmark = buildReportBenchmark(data, "executive");
  const kpi = data?.kpi || {};
  const assetSummary = data?.assetSummary || {};
  const licenseSummary = data?.licenseSummary || {};
  const accessRequestSummary = data?.accessRequestSummary || {};
  const topIssues = data?.topIssues || [];
  const trend = data?.trend || [];
  const assetRows = Array.isArray(data?.assetRows) ? data.assetRows : [];
  const licenseRows = Array.isArray(data?.licenseRows) ? data.licenseRows : [];
  const accessRequestRows = Array.isArray(data?.accessRequestRows) ? data.accessRequestRows : [];

  const totalCases = Number(kpi.totalTickets || 0) + Number(accessRequestSummary.total || 0);
  const combinedActivity = [
    ...assetRows.slice(0, 4).map((item) => ({
      kind: "asset",
      kindLabel: "Asset",
      title: item.asset_name || item.asset_tag || "ไม่ระบุอุปกรณ์",
      detail: `${item.asset_category || "-"} • ${item.location || "ไม่ระบุสถานที่"}`,
      statusLabel: item.status || "-",
      dateLabel: new Date(item.updated_at || item.created_at || Date.now()).toLocaleDateString("th-TH"),
      timestamp: new Date(item.updated_at || item.created_at || Date.now()).getTime(),
      status: item.status,
    })),
    ...licenseRows.slice(0, 4).map((item) => ({
      kind: "license",
      kindLabel: "License",
      title: item.license_name || "ไม่ระบุไลเซนส์",
      detail: `${item.vendor || "-"} • ใช้งาน ${item.quantity_assigned || 0}/${item.quantity_total || 0}`,
      statusLabel: item.status || "-",
      dateLabel: new Date(item.updated_at || item.created_at || Date.now()).toLocaleDateString("th-TH"),
      timestamp: new Date(item.updated_at || item.created_at || Date.now()).getTime(),
      status: item.status,
    })),
    ...accessRequestRows.slice(0, 6).map((item) => ({
      kind: "access",
      kindLabel: "Access",
      title: item.system_name || "Access Request",
      detail: `${item.requester_name || "ไม่ระบุผู้ขอ"} • ${item.department || "ไม่ระบุแผนก"}`,
      statusLabel: item.status || "-",
      dateLabel: new Date(item.created_at || Date.now()).toLocaleDateString("th-TH"),
      timestamp: new Date(item.created_at || Date.now()).getTime(),
      status: item.status,
    })),
  ]
    .filter((item) => Number.isFinite(item.timestamp))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 8);

  const requestMix = [
    { label: "แจ้งซ่อม / Service Desk", value: topIssues[0]?.value || 0, tone: "rose" },
    { label: "ขออุปกรณ์ / Procurement", value: topIssues[1]?.value || 0, tone: "amber" },
    { label: "ขอสิทธิ์ระบบ / Access", value: accessRequestSummary.total || 0, tone: "indigo" },
    { label: "งาน IT อื่น ๆ", value: Math.max(Number(kpi.totalTickets || 0) - (topIssues[0]?.value || 0) - (topIssues[1]?.value || 0), 0), tone: "emerald" },
  ];

  const requestMixTotal = Math.max(requestMix.reduce((sum, item) => sum + item.value, 0), 1);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-2xl">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              <ShieldAlert size={14} />
              Asset & Operations Overview
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              ภาพรวมงาน IT สำหรับผู้บริหารแบบอ่านเร็ว
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              รวมงานซ่อม เบิกของ ร้องขอสิทธิ์ สถานะอุปกรณ์ และสัญญาณสำคัญของระบบไว้ในหน้าเดียว
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ReportMetricCard title="Tickets" value={NUMBER_FORMATTER.format(Number(kpi.totalTickets || 0))} hint="งานทั้งหมดในระบบ" icon={Ticket} tone="indigo" />
        <ReportMetricCard title="Open Issues" value={NUMBER_FORMATTER.format(Number(kpi.openTickets || 0))} hint="งานที่ยังไม่ปิด" icon={Wrench} tone="amber" />
        <ReportMetricCard title="Overdue" value={NUMBER_FORMATTER.format(Number(kpi.overdueTickets || 0))} hint="เกิน SLA" icon={Clock3} tone="rose" />
        <ReportMetricCard title="Assets" value={NUMBER_FORMATTER.format(Number(assetSummary.totalAssets || 0))} hint="อุปกรณ์ทั้งหมด" icon={Package} tone="emerald" />
        <ReportMetricCard title="Access Requests" value={NUMBER_FORMATTER.format(Number(accessRequestSummary.total || 0))} hint="คำขอสิทธิ์ระบบ" icon={KeyRound} tone="cyan" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ReportSectionCard
          title="Request Mix"
          subtitle="ภาพรวมประเภทงานที่ IT รับผิดชอบ"
          actions={
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              รวม {NUMBER_FORMATTER.format(totalCases)} cases
            </span>
          }
        >
          <div className="space-y-4">
            {requestMix.map((item) => (
              <WorkstreamBar
                key={item.label}
                label={item.label}
                value={item.value}
                total={requestMixTotal}
                tone={item.tone}
              />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">คำขอสิทธิ์รออนุมัติ</p>
              <p className="mt-2 text-2xl font-black text-amber-700">{NUMBER_FORMATTER.format(accessRequestSummary.pending || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">อนุมัติแล้ว</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">{NUMBER_FORMATTER.format(accessRequestSummary.approved || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">ปิดงานแล้ว</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{NUMBER_FORMATTER.format(accessRequestSummary.completed || 0)}</p>
            </div>
          </div>
        </ReportSectionCard>

        <ReportSectionCard title="Operational Signals" subtitle="สัญญาณหลักที่ผู้บริหารควรดูทันที">
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Availability</p>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {assetSummary.totalAssets > 0 ? Math.round((assetSummary.activeAssets / assetSummary.totalAssets) * 100) : 0}%
              </p>
              <p className="mt-1 text-sm text-slate-500">อุปกรณ์ที่พร้อมใช้งาน</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Licenses</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{NUMBER_FORMATTER.format(Number(licenseSummary.totalLicenses || 0))}</p>
              <p className="mt-1 text-sm text-slate-500">รายการไลเซนส์ที่ติดตาม</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Trend</p>
              <div className="mt-3 flex items-end gap-2">
                {trend.slice(-6).map((item) => (
                  <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-24 w-full items-end rounded-2xl bg-white p-2">
                      <div
                        className="w-full rounded-xl bg-gradient-to-t from-indigo-500 to-cyan-400"
                        style={{ height: `${Math.max(18, Math.round(((item.value || 0) / Math.max(...trend.map((row) => row.value || 0), 1)) * 72))}px` }}
                      />
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ReportSectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportSectionCard title="Top Service Areas" subtitle="ประเภทงานที่พบมากสุดในระบบ">
          <div className="space-y-3">
            {topIssues.length ? (
              topIssues.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">Top request category</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-900">{NUMBER_FORMATTER.format(item.value)}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">records</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                ยังไม่มีข้อมูลประเภทงาน
              </div>
            )}
          </div>
        </ReportSectionCard>

        <ReportSectionCard title="Latest Activity" subtitle="รายการล่าสุดที่เกิดขึ้นในระบบ">
          <div className="space-y-3">
            {combinedActivity.length ? (
              combinedActivity.map((item) => <ActivityRow key={`${item.kind}-${item.title}-${item.timestamp}`} item={item} />)
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                ยังไม่มี activity ล่าสุด
              </div>
            )}
          </div>
        </ReportSectionCard>
      </section>

      <BenchmarkInsightsPanel analysis={benchmark} title="Benchmark Summary / Executive Readiness" />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportSectionCard title="Asset Health" subtitle="ภาพรวมทรัพย์สินและสถานะ stock">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">พร้อมใช้งาน</p>
              <p className="mt-2 text-3xl font-black text-emerald-700">{NUMBER_FORMATTER.format(Number(assetSummary.activeAssets || 0))}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">ต้องทบทวน</p>
              <p className="mt-2 text-3xl font-black text-rose-700">{NUMBER_FORMATTER.format(Number(assetSummary.riskyAssets || 0))}</p>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Usable</th>
                  <th className="px-3 py-2 text-right">Broken</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data?.coreMenuSummary?.stock || {}).filter(([key]) => key !== "all").map(([key, value]) => (
                  <tr key={key} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-700">{key.toUpperCase()}</td>
                    <td className="px-3 py-2 text-right">{NUMBER_FORMATTER.format(value?.total || 0)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{NUMBER_FORMATTER.format(value?.usable || 0)}</td>
                    <td className="px-3 py-2 text-right text-rose-700">{NUMBER_FORMATTER.format(value?.broken || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSectionCard>

        <ReportSectionCard title="License Health" subtitle="ภาพรวมการใช้งานและการต่ออายุ">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">Seats ใช้งาน</p>
              <p className="mt-2 text-3xl font-black text-indigo-700">{NUMBER_FORMATTER.format(Number(licenseSummary.usedSeats || 0))}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">ใกล้หมดอายุ 30 วัน</p>
              <p className="mt-2 text-3xl font-black text-amber-700">{NUMBER_FORMATTER.format(Number(licenseSummary.expiring30 || 0))}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">คำอธิบาย</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              รายงานนี้ตั้งใจให้เป็นภาพรวมสำหรับผู้บริหาร ดูทั้งงานซ่อม เบิกของ ร้องขอ และสัญญาณทรัพย์สินในหน้าเดียว
            </p>
          </div>
        </ReportSectionCard>
      </section>
    </div>
  );
}
