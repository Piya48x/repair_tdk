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
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { getReportLocale } from "./reportLocale";

const EXECUTIVE_ASSET_OVERVIEW_TRANSLATIONS = {
  th: {
    heroBadge: "Asset & Operations Overview",
    heroTitle: "ภาพรวมงาน IT สำหรับผู้บริหารแบบอ่านเร็ว",
    heroDescription:
      "รวมงานซ่อม, เบิกของ, access request, สถานะทรัพย์สิน และสัญญาณหลักที่ผู้บริหารควรเห็นในหน้าเดียว",
    benchmarkTitle: "Benchmark Summary / Executive Readiness",
    metrics: {
      tickets: "Tickets",
      ticketsHint: "งานทั้งหมดในระบบ",
      openIssues: "Open Issues",
      openIssuesHint: "งานที่ยังไม่ปิด",
      overdue: "Overdue",
      overdueHint: "เกิน SLA",
      assets: "Assets",
      assetsHint: "อุปกรณ์ทั้งหมด",
      accessRequests: "Access Requests",
      accessRequestsHint: "คำขอสิทธิ์ระบบ",
    },
    requestMix: {
      title: "Request Mix",
      subtitle: "ภาพรวมประเภทงานที่ทีม IT รับผิดชอบ",
      totalCases: "รวม {{count}} cases",
      repair: "แจ้งซ่อม / Service Desk",
      procurement: "ขออุปกรณ์ / Procurement",
      access: "ขอสิทธิ์ระบบ / Access",
      other: "งาน IT อื่น ๆ",
      pending: "คำขอสิทธิ์รออนุมัติ",
      approved: "อนุมัติแล้ว",
      completed: "ปิดงานแล้ว",
    },
    signals: {
      title: "Operational Signals",
      subtitle: "สัญญาณหลักที่ผู้บริหารควรดูทันที",
      availability: "Availability",
      availabilityHint: "อุปกรณ์ที่พร้อมใช้งาน",
      licenses: "Licenses",
      licensesHint: "รายการ license ที่ต้องติดตาม",
      trend: "Trend",
    },
    topService: {
      title: "Top Service Areas",
      subtitle: "ประเภทงานที่พบมากสุดในระบบ",
      helper: "Top request category",
      records: "records",
      empty: "ยังไม่มีข้อมูลประเภทงาน",
    },
    latest: {
      title: "Latest Activity",
      subtitle: "รายการล่าสุดที่เกิดขึ้นในระบบ",
      empty: "ยังไม่มี activity ล่าสุด",
      asset: "Asset",
      license: "License",
      access: "Access",
      unknownAsset: "ไม่ระบุอุปกรณ์",
      unknownLocation: "ไม่ระบุสถานที่",
      unknownLicense: "ไม่ระบุ license",
      unknownRequester: "ไม่ระบุผู้ขอ",
      unknownDepartment: "ไม่ระบุแผนก",
      accessFallback: "Access Request",
      seatsInUse: "ใช้งาน {{used}}/{{total}}",
    },
    assetHealth: {
      title: "Asset Health",
      subtitle: "ภาพรวมทรัพย์สินและสถานะ stock",
      active: "พร้อมใช้งาน",
      risk: "ต้องทบทวน",
      headers: {
        category: "Category",
        total: "Total",
        usable: "Usable",
        broken: "Broken",
      },
    },
    licenseHealth: {
      title: "License Health",
      subtitle: "ภาพรวมการใช้งานและการต่ออายุ",
      seatsUsed: "Seats ใช้งาน",
      expiring: "ใกล้หมดอายุ 30 วัน",
      descriptionTitle: "คำอธิบาย",
      description:
        "รายงานนี้ออกแบบให้เป็นภาพรวมสำหรับผู้บริหาร เพื่อดูทั้งงานซ่อม, เบิกของ, คำขอสิทธิ์ และสัญญาณด้านทรัพย์สินในหน้าเดียว",
    },
    refresh: "รีเฟรช",
  },
  en: {
    heroBadge: "Asset & Operations Overview",
    heroTitle: "Fast-reading IT operations overview for executives",
    heroDescription:
      "Pull repairs, procurement, access requests, asset status, and leadership signals into one page.",
    benchmarkTitle: "Benchmark Summary / Executive Readiness",
    metrics: {
      tickets: "Tickets",
      ticketsHint: "All service records",
      openIssues: "Open Issues",
      openIssuesHint: "Work not yet closed",
      overdue: "Overdue",
      overdueHint: "Beyond SLA",
      assets: "Assets",
      assetsHint: "Tracked devices",
      accessRequests: "Access Requests",
      accessRequestsHint: "System access requests",
    },
    requestMix: {
      title: "Request Mix",
      subtitle: "High-level split of the work handled by IT",
      totalCases: "{{count}} total cases",
      repair: "Repair / Service Desk",
      procurement: "Procurement",
      access: "Access Requests",
      other: "Other IT work",
      pending: "Pending access approval",
      approved: "Approved",
      completed: "Completed",
    },
    signals: {
      title: "Operational Signals",
      subtitle: "Key indicators executives should check first",
      availability: "Availability",
      availabilityHint: "Assets ready for use",
      licenses: "Licenses",
      licensesHint: "Tracked license records",
      trend: "Trend",
    },
    topService: {
      title: "Top Service Areas",
      subtitle: "Most common request categories in the system",
      helper: "Top request category",
      records: "records",
      empty: "No request category data yet.",
    },
    latest: {
      title: "Latest Activity",
      subtitle: "Latest changes happening across the system",
      empty: "No recent activity yet.",
      asset: "Asset",
      license: "License",
      access: "Access",
      unknownAsset: "Unspecified asset",
      unknownLocation: "Unknown location",
      unknownLicense: "Unspecified license",
      unknownRequester: "Unknown requester",
      unknownDepartment: "Unknown department",
      accessFallback: "Access Request",
      seatsInUse: "{{used}}/{{total}} seats in use",
    },
    assetHealth: {
      title: "Asset Health",
      subtitle: "Asset stock view and serviceability summary",
      active: "Ready for use",
      risk: "Needs review",
      headers: {
        category: "Category",
        total: "Total",
        usable: "Usable",
        broken: "Broken",
      },
    },
    licenseHealth: {
      title: "License Health",
      subtitle: "Usage and renewal overview",
      seatsUsed: "Seats Used",
      expiring: "Expiring within 30 days",
      descriptionTitle: "Context",
      description:
        "This report is designed as an executive summary spanning repairs, procurement, access requests, and asset signals in one place.",
    },
    refresh: "Refresh",
  },
  ko: {
    heroBadge: "자산 및 운영 개요",
    heroTitle: "임원을 위한 빠른 읽기형 IT 운영 개요",
    heroDescription:
      "수리, 조달, 접근 요청, 자산 상태, 핵심 운영 신호를 한 페이지에 모았습니다.",
    benchmarkTitle: "Benchmark Summary / Executive Readiness",
    metrics: {
      tickets: "Tickets",
      ticketsHint: "전체 서비스 기록",
      openIssues: "Open Issues",
      openIssuesHint: "아직 닫히지 않은 작업",
      overdue: "Overdue",
      overdueHint: "SLA 초과",
      assets: "Assets",
      assetsHint: "관리 중인 장비",
      accessRequests: "Access Requests",
      accessRequestsHint: "시스템 접근 요청",
    },
    requestMix: {
      title: "Request Mix",
      subtitle: "IT가 처리하는 업무 유형의 큰 흐름",
      totalCases: "총 {{count}}건",
      repair: "수리 / Service Desk",
      procurement: "조달 요청",
      access: "접근 요청",
      other: "기타 IT 업무",
      pending: "승인 대기 접근 요청",
      approved: "승인 완료",
      completed: "완료",
    },
    signals: {
      title: "Operational Signals",
      subtitle: "임원이 먼저 확인해야 할 핵심 지표",
      availability: "Availability",
      availabilityHint: "사용 가능한 자산",
      licenses: "Licenses",
      licensesHint: "추적 중인 라이선스",
      trend: "Trend",
    },
    topService: {
      title: "주요 서비스 영역",
      subtitle: "시스템에서 가장 많이 발생한 요청 유형",
      helper: "주요 요청 카테고리",
      records: "건",
      empty: "요청 유형 데이터가 없습니다.",
    },
    latest: {
      title: "최근 활동",
      subtitle: "시스템 전반의 최신 변경 사항",
      empty: "최근 활동이 없습니다.",
      asset: "Asset",
      license: "License",
      access: "Access",
      unknownAsset: "자산 정보 없음",
      unknownLocation: "위치 정보 없음",
      unknownLicense: "라이선스 정보 없음",
      unknownRequester: "요청자 정보 없음",
      unknownDepartment: "부서 정보 없음",
      accessFallback: "Access Request",
      seatsInUse: "{{used}}/{{total}}석 사용 중",
    },
    assetHealth: {
      title: "자산 상태",
      subtitle: "자산 재고와 사용 가능 상태 요약",
      active: "사용 가능",
      risk: "검토 필요",
      headers: {
        category: "Category",
        total: "Total",
        usable: "Usable",
        broken: "Broken",
      },
    },
    licenseHealth: {
      title: "라이선스 상태",
      subtitle: "사용 현황과 갱신 요약",
      seatsUsed: "사용 좌석",
      expiring: "30일 이내 만료",
      descriptionTitle: "설명",
      description:
        "이 보고서는 수리, 조달, 접근 요청, 자산 신호를 함께 보는 임원용 요약 화면입니다.",
    },
    refresh: "새로고침",
  },
};

function statusTone(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("pending") || text.includes("new")) return "amber";
  if (text.includes("approved") || text.includes("completed")) return "emerald";
  if (text.includes("rejected") || text.includes("overdue")) return "rose";
  return "indigo";
}

function WorkstreamBar({ label, value, total, tone = "indigo", valueLabel }) {
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
        <span className="font-black text-slate-900">{valueLabel}</span>
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
  const { language, tt } = useScopedI18n(EXECUTIVE_ASSET_OVERVIEW_TRANSLATIONS);
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
  const locale = getReportLocale(language);
  const numberFormatter = new Intl.NumberFormat(locale);

  const totalCases = Number(kpi.totalTickets || 0) + Number(accessRequestSummary.total || 0);
  const combinedActivity = [
    ...assetRows.slice(0, 4).map((item) => ({
      kind: "asset",
      kindLabel: tt("latest.asset"),
      title: item.asset_name || item.asset_tag || tt("latest.unknownAsset"),
      detail: `${item.asset_category || "-"} • ${item.location || tt("latest.unknownLocation")}`,
      statusLabel: item.status || "-",
      dateLabel: new Date(item.updated_at || item.created_at || Date.now()).toLocaleDateString(locale),
      timestamp: new Date(item.updated_at || item.created_at || Date.now()).getTime(),
      status: item.status,
    })),
    ...licenseRows.slice(0, 4).map((item) => ({
      kind: "license",
      kindLabel: tt("latest.license"),
      title: item.license_name || tt("latest.unknownLicense"),
      detail: `${item.vendor || "-"} • ${tt("latest.seatsInUse", {
        used: numberFormatter.format(item.quantity_assigned || 0),
        total: numberFormatter.format(item.quantity_total || 0),
      })}`,
      statusLabel: item.status || "-",
      dateLabel: new Date(item.updated_at || item.created_at || Date.now()).toLocaleDateString(locale),
      timestamp: new Date(item.updated_at || item.created_at || Date.now()).getTime(),
      status: item.status,
    })),
    ...accessRequestRows.slice(0, 6).map((item) => ({
      kind: "access",
      kindLabel: tt("latest.access"),
      title: item.system_name || tt("latest.accessFallback"),
      detail: `${item.requester_name || tt("latest.unknownRequester")} • ${item.department || tt("latest.unknownDepartment")}`,
      statusLabel: item.status || "-",
      dateLabel: new Date(item.created_at || Date.now()).toLocaleDateString(locale),
      timestamp: new Date(item.created_at || Date.now()).getTime(),
      status: item.status,
    })),
  ]
    .filter((item) => Number.isFinite(item.timestamp))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 8);

  const requestMix = [
    { label: tt("requestMix.repair"), value: topIssues[0]?.value || 0, tone: "rose" },
    { label: tt("requestMix.procurement"), value: topIssues[1]?.value || 0, tone: "amber" },
    { label: tt("requestMix.access"), value: accessRequestSummary.total || 0, tone: "indigo" },
    {
      label: tt("requestMix.other"),
      value: Math.max(Number(kpi.totalTickets || 0) - (topIssues[0]?.value || 0) - (topIssues[1]?.value || 0), 0),
      tone: "emerald",
    },
  ];

  const requestMixTotal = Math.max(requestMix.reduce((sum, item) => sum + item.value, 0), 1);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-2xl">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              <ShieldAlert size={14} />
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ReportMetricCard title={tt("metrics.tickets")} value={numberFormatter.format(Number(kpi.totalTickets || 0))} hint={tt("metrics.ticketsHint")} icon={Ticket} tone="indigo" />
        <ReportMetricCard title={tt("metrics.openIssues")} value={numberFormatter.format(Number(kpi.openTickets || 0))} hint={tt("metrics.openIssuesHint")} icon={Wrench} tone="amber" />
        <ReportMetricCard title={tt("metrics.overdue")} value={numberFormatter.format(Number(kpi.overdueTickets || 0))} hint={tt("metrics.overdueHint")} icon={Clock3} tone="rose" />
        <ReportMetricCard title={tt("metrics.assets")} value={numberFormatter.format(Number(assetSummary.totalAssets || 0))} hint={tt("metrics.assetsHint")} icon={Package} tone="emerald" />
        <ReportMetricCard title={tt("metrics.accessRequests")} value={numberFormatter.format(Number(accessRequestSummary.total || 0))} hint={tt("metrics.accessRequestsHint")} icon={KeyRound} tone="cyan" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ReportSectionCard
          title={tt("requestMix.title")}
          subtitle={tt("requestMix.subtitle")}
          actions={
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {tt("requestMix.totalCases", { count: numberFormatter.format(totalCases) })}
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
                valueLabel={numberFormatter.format(item.value)}
              />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">{tt("requestMix.pending")}</p>
              <p className="mt-2 text-2xl font-black text-amber-700">{numberFormatter.format(accessRequestSummary.pending || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">{tt("requestMix.approved")}</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">{numberFormatter.format(accessRequestSummary.approved || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">{tt("requestMix.completed")}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{numberFormatter.format(accessRequestSummary.completed || 0)}</p>
            </div>
          </div>
        </ReportSectionCard>

        <ReportSectionCard title={tt("signals.title")} subtitle={tt("signals.subtitle")}>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{tt("signals.availability")}</p>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {assetSummary.totalAssets > 0 ? Math.round((assetSummary.activeAssets / assetSummary.totalAssets) * 100) : 0}%
              </p>
              <p className="mt-1 text-sm text-slate-500">{tt("signals.availabilityHint")}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{tt("signals.licenses")}</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{numberFormatter.format(Number(licenseSummary.totalLicenses || 0))}</p>
              <p className="mt-1 text-sm text-slate-500">{tt("signals.licensesHint")}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{tt("signals.trend")}</p>
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
        <ReportSectionCard title={tt("topService.title")} subtitle={tt("topService.subtitle")}>
          <div className="space-y-3">
            {topIssues.length ? (
              topIssues.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{tt("topService.helper")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-900">{numberFormatter.format(item.value)}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{tt("topService.records")}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                {tt("topService.empty")}
              </div>
            )}
          </div>
        </ReportSectionCard>

        <ReportSectionCard title={tt("latest.title")} subtitle={tt("latest.subtitle")}>
          <div className="space-y-3">
            {combinedActivity.length ? (
              combinedActivity.map((item) => (
                <ActivityRow key={`${item.kind}-${item.title}-${item.timestamp}`} item={item} />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                {tt("latest.empty")}
              </div>
            )}
          </div>
        </ReportSectionCard>
      </section>

      <BenchmarkInsightsPanel analysis={benchmark} title={tt("benchmarkTitle")} />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportSectionCard title={tt("assetHealth.title")} subtitle={tt("assetHealth.subtitle")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">{tt("assetHealth.active")}</p>
              <p className="mt-2 text-3xl font-black text-emerald-700">{numberFormatter.format(Number(assetSummary.activeAssets || 0))}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">{tt("assetHealth.risk")}</p>
              <p className="mt-2 text-3xl font-black text-rose-700">{numberFormatter.format(Number(assetSummary.riskyAssets || 0))}</p>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-3 py-2">{tt("assetHealth.headers.category")}</th>
                  <th className="px-3 py-2 text-right">{tt("assetHealth.headers.total")}</th>
                  <th className="px-3 py-2 text-right">{tt("assetHealth.headers.usable")}</th>
                  <th className="px-3 py-2 text-right">{tt("assetHealth.headers.broken")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data?.coreMenuSummary?.stock || {})
                  .filter(([key]) => key !== "all")
                  .map(([key, value]) => (
                    <tr key={key} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold text-slate-700">{key.toUpperCase()}</td>
                      <td className="px-3 py-2 text-right">{numberFormatter.format(value?.total || 0)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{numberFormatter.format(value?.usable || 0)}</td>
                      <td className="px-3 py-2 text-right text-rose-700">{numberFormatter.format(value?.broken || 0)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </ReportSectionCard>

        <ReportSectionCard title={tt("licenseHealth.title")} subtitle={tt("licenseHealth.subtitle")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">{tt("licenseHealth.seatsUsed")}</p>
              <p className="mt-2 text-3xl font-black text-indigo-700">{numberFormatter.format(Number(licenseSummary.usedSeats || 0))}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">{tt("licenseHealth.expiring")}</p>
              <p className="mt-2 text-3xl font-black text-amber-700">{numberFormatter.format(Number(licenseSummary.expiring30 || 0))}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">{tt("licenseHealth.descriptionTitle")}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{tt("licenseHealth.description")}</p>
          </div>
        </ReportSectionCard>
      </section>
    </div>
  );
}
