import React, { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Gauge,
  LayoutDashboard,
  ListChecks,
  ShieldAlert,
} from "lucide-react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import ITServiceOverviewPanel from "../components/ITServiceOverviewPanel";
import ITWorkReportPanel from "../components/ITWorkReportPanel";
import { DASHBOARD_PAGE_IDS } from "../constants/dashboardPages";
import { isPickUpEquipmentRequest, isRepairTicketRecord } from "../../../lib/serviceRequestUtils";

const CLOSED_STATUSES = new Set(["CLOSED", "COMPLETED", "RESOLVED"]);
const SLA_HOURS = {
  critical: 2,
  urgent: 2,
  high: 4,
  normal: 8,
  low: 24,
};

const REPORT_VIEWS = {
  USAGE: "usage",
  OVERVIEW: "overview",
  SUMMARY: "summary",
};

const REPORTS_PAGE_TRANSLATIONS = {
  th: {
    eyebrow: "IT Operations Report",
    title: "รายงานภาพรวม Dashboard IT Usage",
    description: "จัดหน้าใหม่ให้เริ่มจากตัวเลขสำคัญ เลือกมุมมองที่ต้องดู แล้วค่อยลงรายละเอียดรายงาน ไม่ปนคิวงานกับ KPI ไว้ก้อนเดียว",
    updatedLabel: "ข้อมูลจาก dashboard ปัจจุบัน",
    quickActions: {
      dashboard: "กลับ Dashboard",
      workLogs: "ไปบันทึกงาน IT",
    },
    views: {
      usage: "IT Usage Report",
      usageHint: "รายงาน work log, ชั่วโมงทำงาน, export และ insight หลัก",
      overview: "Queue Overview",
      overviewHint: "สถานะคิวงานซ่อม คำขอ และรายการล่าสุด",
      summary: "KPI Summary",
      summaryHint: "สรุปภาพรวมสำหรับตรวจสุขภาพงาน IT อย่างเร็ว",
    },
    sections: {
      usageTitle: "รายงานการใช้งานทีม IT",
      usageDescription: "ใช้มุมมองนี้เป็นหน้า report หลัก ดูปริมาณงาน ชั่วโมง หลักฐาน และ export Excel",
      overviewTitle: "ภาพรวมคิวงานปฏิบัติการ",
      overviewDescription: "แยกคิวงานออกจาก report หลัก เพื่อให้เห็นงานที่ต้องจัดการโดยไม่รบกวนการอ่านรายงาน",
      summaryTitle: "KPI Summary",
      summaryDescription: "รวมตัวเลขสำคัญและสัญญาณเสี่ยงสำหรับตรวจความพร้อมของทีม",
      operationalMix: "สัดส่วนงาน",
      queueHealth: "สุขภาพคิวงาน",
      reportReadiness: "ความพร้อมของรายงาน",
      signalTitle: "สัญญาณที่ควรดูต่อ",
    },
    stats: {
      totalWork: "งานทั้งหมด",
      repairTickets: "งานซ่อม",
      serviceRequests: "คำขอบริการ",
      newToday: "เข้าใหม่วันนี้",
      openQueue: "คิวเปิดอยู่",
      closedToday: "ปิดวันนี้",
      completionRate: "อัตราปิดงาน",
      slaRisk: "เสี่ยง SLA",
      slaOk: "SLA ปกติ",
      noBacklog: "ไม่มีงานค้าง",
      workLogs: "บันทึกงาน IT",
      totalHours: "ชั่วโมงรวม",
      evidenceCoverage: "ความครบหลักฐาน",
      reportScope: "ช่วงรายงาน",
      activeScope: "ขอบเขตงาน",
      loading: "กำลังโหลด",
      queuePressure: "แรงกดดันคิว",
      repairShare: "งานซ่อม",
      requestShare: "คำขอ",
    },
  },
  en: {
    eyebrow: "IT Operations Report",
    title: "IT Usage Dashboard Overview",
    description: "The page is reorganized around key numbers, focused views, and detailed reporting so queue work, report data, and KPI summary no longer compete in one long stack.",
    updatedLabel: "Using current dashboard data",
    quickActions: {
      dashboard: "Back to Dashboard",
      workLogs: "Open IT work logs",
    },
    views: {
      usage: "IT Usage Report",
      usageHint: "Work logs, hours, export, and core operational insights",
      overview: "Queue Overview",
      overviewHint: "Repair queue, service requests, and latest operational items",
      summary: "KPI Summary",
      summaryHint: "Fast health review for IT operations",
    },
    sections: {
      usageTitle: "IT team usage report",
      usageDescription: "Use this as the primary report view for workload, hours, evidence coverage, and Excel export.",
      overviewTitle: "Operational queue overview",
      overviewDescription: "Queue work is separated from the main report so urgent items stay visible without cluttering report reading.",
      summaryTitle: "KPI Summary",
      summaryDescription: "Key counts and risk signals grouped for quick IT health review.",
      operationalMix: "Operational mix",
      queueHealth: "Queue health",
      reportReadiness: "Report readiness",
      signalTitle: "Signals to review next",
    },
    stats: {
      totalWork: "Total work",
      repairTickets: "Repair tickets",
      serviceRequests: "Service requests",
      newToday: "New today",
      openQueue: "Open queue",
      closedToday: "Closed today",
      completionRate: "Completion rate",
      slaRisk: "SLA risk",
      slaOk: "SLA OK",
      noBacklog: "No backlog",
      workLogs: "IT work logs",
      totalHours: "Total hours",
      evidenceCoverage: "Evidence coverage",
      reportScope: "Report scope",
      activeScope: "Active scope",
      loading: "Loading",
      queuePressure: "Queue pressure",
      repairShare: "Repairs",
      requestShare: "Requests",
    },
  },
  ko: {
    eyebrow: "IT Operations Report",
    title: "IT 사용 현황 대시보드",
    description: "핵심 숫자, 집중 보기, 상세 리포트를 분리해 작업 대기열과 KPI가 한 화면에 뒤섞이지 않도록 정리했습니다.",
    updatedLabel: "현재 대시보드 데이터 기준",
    quickActions: {
      dashboard: "대시보드로 돌아가기",
      workLogs: "IT 작업 기록 열기",
    },
    views: {
      usage: "IT Usage Report",
      usageHint: "작업 기록, 투입 시간, 내보내기, 주요 운영 인사이트",
      overview: "Queue Overview",
      overviewHint: "수리 대기열, 서비스 요청, 최신 운영 항목",
      summary: "KPI Summary",
      summaryHint: "IT 운영 상태를 빠르게 점검하는 요약",
    },
    sections: {
      usageTitle: "IT 팀 사용 현황 리포트",
      usageDescription: "업무량, 투입 시간, 증빙 완성도, Excel 내보내기를 확인하는 기본 리포트 화면입니다.",
      overviewTitle: "운영 대기열 개요",
      overviewDescription: "긴급 작업을 리포트와 분리해 리포트 읽기 흐름을 방해하지 않도록 했습니다.",
      summaryTitle: "KPI Summary",
      summaryDescription: "IT 운영 상태를 빠르게 검토할 수 있도록 핵심 수치와 위험 신호를 모았습니다.",
      operationalMix: "업무 비중",
      queueHealth: "대기열 상태",
      reportReadiness: "리포트 준비도",
      signalTitle: "다음 확인 신호",
    },
    stats: {
      totalWork: "전체 작업",
      repairTickets: "수리 작업",
      serviceRequests: "서비스 요청",
      newToday: "오늘 신규",
      openQueue: "열린 작업",
      closedToday: "오늘 완료",
      completionRate: "완료율",
      slaRisk: "SLA 위험",
      slaOk: "SLA 정상",
      noBacklog: "대기 작업 없음",
      workLogs: "IT 작업 기록",
      totalHours: "총 시간",
      evidenceCoverage: "증빙 완성도",
      reportScope: "리포트 범위",
      activeScope: "작업 범위",
      loading: "로딩 중",
      queuePressure: "대기열 압력",
      repairShare: "수리",
      requestShare: "요청",
    },
  },
};

const toSafeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatLocalDateKey = (value) => {
  const date = value instanceof Date ? value : toSafeDate(value);
  if (!date) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const isClosedStatus = (status) => CLOSED_STATUSES.has(String(status || "").toUpperCase());
const getSlaHours = (priority) => SLA_HOURS[String(priority || "normal").toLowerCase()] || SLA_HOURS.normal;

const getNumberLocale = (language) => {
  if (language === "ko") return "ko-KR";
  if (language === "en") return "en-US";
  return "th-TH";
};

const SectionIntro = ({ eyebrow, title, description, isDarkTheme }) => (
  <div className="flex flex-col gap-2">
    <span className={`text-xs font-bold uppercase tracking-[0.18em] ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
      {eyebrow}
    </span>
    <div>
      <h3 className={`text-xl font-black ${isDarkTheme ? "text-slate-100" : "text-slate-900"}`}>
        {title}
      </h3>
      <p className={`mt-1 max-w-3xl text-sm leading-6 ${isDarkTheme ? "text-slate-300" : "text-slate-600"}`}>
        {description}
      </p>
    </div>
  </div>
);

const ReportsPage = ({
  theme,
  tickets,
  serviceRequests,
  onCreateTicket,
  onOpenWalkInTicket,
  onPickUpEquipment,
  onOpenRepairFromOverview,
  onNavigatePage,
}) => {
  const { language, tt } = useScopedI18n(REPORTS_PAGE_TRANSLATIONS);
  const [activeView, setActiveView] = useState(REPORT_VIEWS.USAGE);
  const [workLogKpis, setWorkLogKpis] = useState({
    jobCount: 0,
    totalMinutes: 0,
    totalHoursLabel: "0h",
    evidenceJobs: 0,
    evidenceCoverage: 0,
    reportPeriodLabel: "-",
    selectedTypeLabel: "-",
    filters: {
      type: "ALL",
      user: "ALL",
      department: "ALL",
    },
    loading: true,
    hasError: false,
  });

  const isDarkTheme = theme === "dark";
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(getNumberLocale(language)),
    [language],
  );

  const dashboardKpis = useMemo(() => {
    const repairTickets = (tickets || []).filter((ticket) => {
      return isRepairTicketRecord(ticket);
    });
    const requestRows = (serviceRequests || []).length > 0
      ? serviceRequests
      : (tickets || []).filter((ticket) => {
        return isPickUpEquipmentRequest(ticket);
      });
    const allRows = [...repairTickets, ...requestRows];
    const todayKey = formatLocalDateKey(new Date());
    const repairToday = repairTickets.filter((ticket) => formatLocalDateKey(ticket?.created_at) === todayKey).length;
    const requestToday = requestRows.filter((ticket) => formatLocalDateKey(ticket?.created_at) === todayKey).length;
    const closedToday = allRows.filter(
      (ticket) => isClosedStatus(ticket?.status) && formatLocalDateKey(ticket?.closed_at) === todayKey,
    ).length;
    const openQueue = allRows.filter((ticket) => !isClosedStatus(ticket?.status)).length;
    const closedTotal = allRows.filter((ticket) => isClosedStatus(ticket?.status)).length;
    const completionRate = allRows.length > 0 ? Math.round((closedTotal / allRows.length) * 100) : 0;
    const overdueRepair = repairTickets.filter((ticket) => {
      if (isClosedStatus(ticket?.status)) return false;
      const createdAt = toSafeDate(ticket?.created_at);
      if (!createdAt) return false;
      const diffHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      return diffHours > getSlaHours(ticket?.priority);
    }).length;
    const repairShare = allRows.length > 0 ? Math.round((repairTickets.length / allRows.length) * 100) : 0;
    const requestShare = allRows.length > 0 ? 100 - repairShare : 0;

    return {
      allRows,
      repairTickets,
      requestRows,
      repairToday,
      requestToday,
      openQueue,
      closedToday,
      closedTotal,
      completionRate,
      overdueRepair,
      repairShare,
      requestShare,
    };
  }, [serviceRequests, tickets]);

  const toneStyles = {
    blue: {
      icon: isDarkTheme ? "bg-[#2b59b0]/20 text-cyan-200" : "bg-[#2b59b0]/10 text-[#2b59b0]",
      card: isDarkTheme ? "border-[#2b59b0]/25 bg-[#2b59b0]/10" : "border-[#2b59b0]/15 bg-[#2b59b0]/5",
      value: isDarkTheme ? "text-cyan-100" : "text-[#2b59b0]",
    },
    amber: {
      icon: isDarkTheme ? "bg-amber-400/10 text-amber-200" : "bg-amber-50 text-amber-700",
      card: isDarkTheme ? "border-amber-400/20 bg-amber-400/10" : "border-amber-100 bg-amber-50/70",
      value: isDarkTheme ? "text-amber-100" : "text-amber-600",
    },
    emerald: {
      icon: isDarkTheme ? "bg-emerald-400/10 text-emerald-200" : "bg-emerald-50 text-emerald-700",
      card: isDarkTheme ? "border-emerald-400/20 bg-emerald-400/10" : "border-emerald-100 bg-emerald-50/70",
      value: isDarkTheme ? "text-emerald-100" : "text-emerald-600",
    },
    rose: {
      icon: isDarkTheme ? "bg-rose-400/10 text-rose-200" : "bg-rose-50 text-rose-700",
      card: isDarkTheme ? "border-rose-400/20 bg-rose-400/10" : "border-rose-100 bg-rose-50/70",
      value: isDarkTheme ? "text-rose-100" : "text-rose-600",
    },
    slate: {
      icon: isDarkTheme ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700",
      card: isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white",
      value: isDarkTheme ? "text-slate-100" : "text-slate-900",
    },
  };

  const headlineCards = useMemo(() => ([
    {
      label: tt("stats.newToday"),
      value: dashboardKpis.repairToday + dashboardKpis.requestToday,
      helper: `${numberFormatter.format(dashboardKpis.repairToday)} ${tt("stats.repairTickets")} / ${numberFormatter.format(dashboardKpis.requestToday)} ${tt("stats.serviceRequests")}`,
      tone: "blue",
      icon: Activity,
    },
    {
      label: tt("stats.openQueue"),
      value: dashboardKpis.openQueue,
      helper: dashboardKpis.overdueRepair > 0
        ? `${numberFormatter.format(dashboardKpis.overdueRepair)} ${tt("stats.slaRisk")}`
        : tt("stats.slaOk"),
      tone: dashboardKpis.overdueRepair > 0 ? "rose" : "amber",
      icon: ShieldAlert,
    },
    {
      label: tt("stats.closedToday"),
      value: dashboardKpis.closedToday,
      helper: `${numberFormatter.format(dashboardKpis.closedTotal)} / ${numberFormatter.format(dashboardKpis.allRows.length)} ${tt("stats.totalWork")}`,
      tone: "emerald",
      icon: CheckCircle2,
    },
    {
      label: tt("stats.completionRate"),
      value: `${dashboardKpis.completionRate}%`,
      helper: dashboardKpis.openQueue > 0
        ? `${numberFormatter.format(dashboardKpis.openQueue)} ${tt("stats.openQueue")}`
        : tt("stats.noBacklog"),
      tone: "slate",
      icon: Gauge,
    },
    {
      label: tt("stats.workLogs"),
      value: workLogKpis.loading ? "-" : numberFormatter.format(workLogKpis.jobCount),
      helper: workLogKpis.loading ? tt("stats.loading") : `${tt("stats.reportScope")} ${workLogKpis.reportPeriodLabel}`,
      tone: "blue",
      icon: ClipboardList,
    },
    {
      label: tt("stats.totalHours"),
      value: workLogKpis.loading ? "-" : workLogKpis.totalHoursLabel,
      helper: workLogKpis.loading ? tt("stats.loading") : `${workLogKpis.evidenceCoverage}% ${tt("stats.evidenceCoverage")}`,
      tone: "slate",
      icon: Clock3,
    },
  ]), [dashboardKpis, numberFormatter, tt, workLogKpis]);

  const viewOptions = [
    {
      id: REPORT_VIEWS.USAGE,
      icon: BarChart3,
      title: tt("views.usage"),
      hint: tt("views.usageHint"),
    },
    {
      id: REPORT_VIEWS.OVERVIEW,
      icon: LayoutDashboard,
      title: tt("views.overview"),
      hint: tt("views.overviewHint"),
    },
    {
      id: REPORT_VIEWS.SUMMARY,
      icon: FileText,
      title: tt("views.summary"),
      hint: tt("views.summaryHint"),
    },
  ];

  const shellClass = isDarkTheme
    ? "rounded-[28px] border border-slate-700 bg-[#0f172a] shadow-[0_24px_60px_-42px_rgba(2,6,23,0.95)]"
    : "rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.24)]";
  const mutedTextClass = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const titleTextClass = isDarkTheme ? "text-slate-100" : "text-slate-900";
  const bodyTextClass = isDarkTheme ? "text-slate-300" : "text-slate-600";
  const chipClass = isDarkTheme
    ? "border-slate-700 bg-slate-900/80 text-slate-200"
    : "border-slate-200 bg-slate-50 text-slate-700";

  const summarySignals = [
    {
      label: tt("stats.queuePressure"),
      value: numberFormatter.format(dashboardKpis.openQueue),
      helper: dashboardKpis.overdueRepair > 0 ? `${numberFormatter.format(dashboardKpis.overdueRepair)} ${tt("stats.slaRisk")}` : tt("stats.slaOk"),
      tone: dashboardKpis.overdueRepair > 0 ? "rose" : "amber",
    },
    {
      label: tt("stats.activeScope"),
      value: workLogKpis.loading ? "-" : workLogKpis.selectedTypeLabel,
      helper: workLogKpis.loading ? tt("stats.loading") : `${tt("stats.reportScope")} ${workLogKpis.reportPeriodLabel}`,
      tone: "slate",
    },
    {
      label: tt("stats.evidenceCoverage"),
      value: workLogKpis.loading ? "-" : `${workLogKpis.evidenceCoverage}%`,
      helper: `${numberFormatter.format(workLogKpis.evidenceJobs || 0)} / ${numberFormatter.format(workLogKpis.jobCount || 0)} ${tt("stats.workLogs")}`,
      tone: "emerald",
    },
  ];

  return (
    <div className="space-y-5">
      <section className={`${shellClass} overflow-hidden`}>
        <div className={`border-b px-5 py-5 sm:px-6 ${isDarkTheme ? "border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(43,89,176,0.18),_transparent_36%)]" : "border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(43,89,176,0.10),_transparent_34%)]"}`}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${isDarkTheme ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200" : "border-cyan-200 bg-cyan-50 text-cyan-700"}`}>
                <BarChart3 size={14} />
                {tt("eyebrow")}
              </span>
              <h2 className={`mt-4 text-2xl font-black sm:text-3xl ${titleTextClass}`}>
                {tt("title")}
              </h2>
              <p className={`mt-2 max-w-3xl text-sm leading-6 ${bodyTextClass}`}>
                {tt("description")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${chipClass}`}>
                  {tt("updatedLabel")}
                </span>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${chipClass}`}>
                  {tt("stats.totalWork")} {numberFormatter.format(dashboardKpis.allRows.length)}
                </span>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${chipClass}`}>
                  {tt("stats.repairShare")} {dashboardKpis.repairShare}% / {tt("stats.requestShare")} {dashboardKpis.requestShare}%
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
              <button
                type="button"
                onClick={() => onNavigatePage?.(DASHBOARD_PAGE_IDS.DASHBOARD)}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                <LayoutDashboard size={16} />
                {tt("quickActions.dashboard")}
              </button>
              <button
                type="button"
                onClick={() => onNavigatePage?.(DASHBOARD_PAGE_IDS.IT_WORK_LOGS)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2b59b0] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_34px_-22px_rgba(43,89,176,0.85)] transition hover:bg-[#244a95]"
              >
                <ListChecks size={16} />
                {tt("quickActions.workLogs")}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {headlineCards.map((item) => {
            const Icon = item.icon;
            const tone = toneStyles[item.tone] || toneStyles.slate;

            return (
              <article key={item.label} className={`rounded-3xl border p-4 ${tone.card}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-[0.14em] ${mutedTextClass}`}>
                      {item.label}
                    </p>
                    <p className={`mt-2 truncate text-2xl font-black ${tone.value}`}>
                      {item.value}
                    </p>
                    <p className={`mt-1 line-clamp-2 text-xs leading-5 ${mutedTextClass}`}>
                      {item.helper}
                    </p>
                  </div>
                  <div className={`shrink-0 rounded-2xl p-3 ${tone.icon}`}>
                    <Icon size={18} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={`grid gap-2 rounded-[28px] border p-2 lg:grid-cols-3 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white/85 shadow-sm"}`}>
        {viewOptions.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.id;

          return (
            <button
              key={view.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveView(view.id)}
              className={`flex items-start gap-3 rounded-3xl px-4 py-3 text-left transition ${
                isActive
                  ? "bg-[#2b59b0] text-white shadow-[0_18px_34px_-24px_rgba(43,89,176,0.95)]"
                  : isDarkTheme
                    ? "text-slate-300 hover:bg-slate-800"
                    : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className={`mt-0.5 rounded-2xl p-2 ${isActive ? "bg-white/15 text-white" : isDarkTheme ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                <Icon size={18} />
              </span>
              <span>
                <span className="block text-sm font-black">{view.title}</span>
                <span className={`mt-1 block text-xs leading-5 ${isActive ? "text-blue-50" : mutedTextClass}`}>
                  {view.hint}
                </span>
              </span>
            </button>
          );
        })}
      </section>

      {activeView === REPORT_VIEWS.USAGE ? (
        <section>
          <ITWorkReportPanel
            theme={theme}
            tickets={tickets}
            serviceRequests={serviceRequests}
            onNavigatePage={onNavigatePage}
            onKpiChange={setWorkLogKpis}
          />
        </section>
      ) : null}

      {activeView === REPORT_VIEWS.OVERVIEW ? (
        <section>
          <ITServiceOverviewPanel
            theme={theme}
            tickets={tickets}
            serviceRequests={serviceRequests}
            onCreateTicket={onCreateTicket}
            onOpenWalkInTicket={onOpenWalkInTicket}
            onPickUpEquipment={onPickUpEquipment}
            onOpenRepair={onOpenRepairFromOverview}
          />
        </section>
      ) : null}

      {activeView === REPORT_VIEWS.SUMMARY ? (
        <section className="space-y-4">
          <SectionIntro
            eyebrow={tt("views.summary")}
            title={tt("sections.summaryTitle")}
            description={tt("sections.summaryDescription")}
            isDarkTheme={isDarkTheme}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_380px]">
            <article className={`${shellClass} p-5 sm:p-6`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>
                    {tt("sections.operationalMix")}
                  </p>
                  <h4 className={`mt-2 text-lg font-black ${titleTextClass}`}>
                    {tt("stats.repairShare")} {dashboardKpis.repairShare}% / {tt("stats.requestShare")} {dashboardKpis.requestShare}%
                  </h4>
                </div>
                <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${chipClass}`}>
                  {tt("stats.totalWork")} {numberFormatter.format(dashboardKpis.allRows.length)}
                </span>
              </div>

              <div className={`mt-5 h-3 overflow-hidden rounded-full ${isDarkTheme ? "bg-slate-800" : "bg-slate-100"}`}>
                <div
                  className="h-full rounded-full bg-[#2b59b0]"
                  style={{ width: `${dashboardKpis.repairShare}%` }}
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {headlineCards.map((item) => {
                  const Icon = item.icon;
                  const tone = toneStyles[item.tone] || toneStyles.slate;

                  return (
                    <div key={item.label} className={`rounded-3xl border p-4 ${tone.card}`}>
                      <div className={`mb-3 inline-flex rounded-2xl p-2 ${tone.icon}`}>
                        <Icon size={18} />
                      </div>
                      <p className={`text-xs font-bold uppercase tracking-[0.14em] ${mutedTextClass}`}>
                        {item.label}
                      </p>
                      <p className={`mt-2 text-2xl font-black ${tone.value}`}>
                        {item.value}
                      </p>
                      <p className={`mt-1 text-xs leading-5 ${mutedTextClass}`}>
                        {item.helper}
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>

            <aside className="space-y-5">
              <article className={`${shellClass} p-5`}>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>
                  {tt("sections.queueHealth")}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={`rounded-3xl border p-4 ${toneStyles.amber.card}`}>
                    <p className={`text-xs font-semibold ${mutedTextClass}`}>{tt("stats.openQueue")}</p>
                    <p className={`mt-2 text-2xl font-black ${toneStyles.amber.value}`}>
                      {numberFormatter.format(dashboardKpis.openQueue)}
                    </p>
                  </div>
                  <div className={`rounded-3xl border p-4 ${dashboardKpis.overdueRepair > 0 ? toneStyles.rose.card : toneStyles.emerald.card}`}>
                    <p className={`text-xs font-semibold ${mutedTextClass}`}>{tt("stats.slaRisk")}</p>
                    <p className={`mt-2 text-2xl font-black ${dashboardKpis.overdueRepair > 0 ? toneStyles.rose.value : toneStyles.emerald.value}`}>
                      {dashboardKpis.overdueRepair > 0 ? numberFormatter.format(dashboardKpis.overdueRepair) : tt("stats.slaOk")}
                    </p>
                  </div>
                </div>
              </article>

              <article className={`${shellClass} p-5`}>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>
                  {tt("sections.reportReadiness")}
                </p>
                <div className="mt-4 space-y-3">
                  {summarySignals.map((item) => {
                    const tone = toneStyles[item.tone] || toneStyles.slate;

                    return (
                      <div key={item.label} className={`rounded-3xl border p-4 ${tone.card}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold ${mutedTextClass}`}>{item.label}</p>
                            <p className={`mt-1 truncate text-lg font-black ${tone.value}`}>{item.value}</p>
                            <p className={`mt-1 text-xs leading-5 ${mutedTextClass}`}>{item.helper}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </aside>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default ReportsPage;
