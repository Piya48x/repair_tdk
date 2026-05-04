import React, { useMemo, useState } from "react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import ITServiceOverviewPanel from "../components/ITServiceOverviewPanel";
import ITWorkReportPanel from "../components/ITWorkReportPanel";

const CLOSED_STATUSES = new Set(["CLOSED", "COMPLETED", "RESOLVED"]);
const SLA_HOURS = {
  critical: 2,
  urgent: 2,
  high: 4,
  normal: 8,
  low: 24,
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

const REPORTS_PAGE_TRANSLATIONS = {
  th: {
    eyebrow: "IT Operations Report",
    title: "รายงานภาพรวม Dashboard IT Usage",
    description: "เรียงการดูงานจากภาพรวมปฏิบัติการไปจนถึงรายงานเชิงลึก แล้วปิดท้ายด้วย KPI summary",
    topHint: "เริ่มจากภาพรวมคิวงานด้านบน ดูรายงานงาน IT ตรงกลาง และตรวจ KPI สรุปที่ด้านล่างสุด",
    summaryTitle: "Executive KPI Summary",
    summaryDescription: "สรุปตัวเลขสำคัญของงานซ่อม คำขอบริการ และ work log ไว้ท้ายหน้าเพื่อเช็กผลงานและ workload ได้เร็วขึ้น",
    sections: {
      overview: "Operational Overview",
      report: "IT Work Report",
      summary: "KPI Summary",
    },
    stats: {
      tickets: "งานซ่อม",
      requests: "คำขอบริการ",
      newToday: "เข้าใหม่วันนี้",
      openQueue: "คิวเปิดอยู่",
      closedToday: "ปิดวันนี้",
      completionRate: "อัตราปิดงาน",
      totalWork: "งานทั้งหมด",
      slaRisk: "เสี่ยง SLA",
      queueHealth: "สุขภาพคิวงาน",
      intakeMix: "สัดส่วนงาน",
      healthCaption: "เห็นภาพคิวงานและความเสี่ยงได้ก่อนลงรายละเอียด",
      kpiTag: "KPI",
      slaOk: "SLA ปกติ",
      noBacklog: "ไม่มีงานค้าง",
      workLogs: "บันทึกงาน IT",
      totalHours: "ชั่วโมงรวม",
      evidenceCoverage: "ความครบหลักฐาน",
      reportHealth: "สุขภาพรายงาน",
      reportScope: "ช่วงรายงาน",
      activeScope: "ขอบเขตงาน",
      loading: "กำลังโหลดข้อมูล",
    },
  },
  en: {
    eyebrow: "IT Operations Report",
    title: "IT Usage Dashboard Overview",
    description: "Move from live operations overview to detailed reporting, then finish with a KPI summary.",
    topHint: "Start with operational activity, review the IT work report in the middle, and finish with KPI summary at the bottom.",
    summaryTitle: "Executive KPI Summary",
    summaryDescription: "Key repair, service-request, and work-log numbers are grouped at the bottom for faster review.",
    sections: {
      overview: "Operational Overview",
      report: "IT Work Report",
      summary: "KPI Summary",
    },
    stats: {
      tickets: "Repair tickets",
      requests: "Requests",
      newToday: "New today",
      openQueue: "Open queue",
      closedToday: "Closed today",
      completionRate: "Completion rate",
      totalWork: "Total work",
      slaRisk: "SLA risk",
      queueHealth: "Queue health",
      intakeMix: "Work mix",
      healthCaption: "See queue pressure and risk before opening detailed reports.",
      kpiTag: "KPI",
      slaOk: "SLA OK",
      noBacklog: "No backlog",
      workLogs: "Work logs",
      totalHours: "Total hours",
      evidenceCoverage: "Evidence coverage",
      reportHealth: "Report health",
      reportScope: "Report scope",
      activeScope: "Active scope",
      loading: "Loading data",
    },
  },
  ko: {
    eyebrow: "IT Operations Report",
    title: "IT 사용 대시보드 개요",
    description: "운영 현황부터 상세 리포트까지 본 뒤, 마지막에 KPI 요약으로 마무리합니다.",
    topHint: "상단에서 운영 현황을 보고, 중간의 IT 작업 리포트를 확인한 뒤, 하단 KPI 요약으로 마무리합니다.",
    summaryTitle: "Executive KPI Summary",
    summaryDescription: "수리, 서비스 요청, IT 작업 기록의 핵심 수치를 하단에 모아 빠르게 검토할 수 있습니다.",
    sections: {
      overview: "Operational Overview",
      report: "IT Work Report",
      summary: "KPI Summary",
    },
    stats: {
      tickets: "수리 작업",
      requests: "서비스 요청",
      newToday: "오늘 신규",
      openQueue: "열린 작업",
      closedToday: "오늘 완료",
      completionRate: "완료율",
      totalWork: "전체 작업",
      slaRisk: "SLA 위험",
      queueHealth: "대기열 상태",
      intakeMix: "작업 비중",
      healthCaption: "상세 리포트 전에 대기열과 위험도를 먼저 확인합니다.",
      kpiTag: "KPI",
      slaOk: "SLA 정상",
      noBacklog: "밀린 작업 없음",
      workLogs: "작업 기록",
      totalHours: "총 시간",
      evidenceCoverage: "증빙 완성도",
      reportHealth: "리포트 상태",
      reportScope: "리포트 범위",
      activeScope: "작업 범위",
      loading: "데이터 불러오는 중",
    },
  },
};

const ReportsPage = ({
  theme,
  uiTheme,
  tickets,
  serviceRequests,
  onCreateTicket,
  onOpenWalkInTicket,
  onPickUpEquipment,
  onOpenRepairFromOverview,
  onNavigatePage,
}) => {
  const { tt } = useScopedI18n(REPORTS_PAGE_TRANSLATIONS);
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
  const dashboardKpis = useMemo(() => {
    const repairTickets = (tickets || []).filter((ticket) => {
      const source = `${ticket?.service_type || ""} ${ticket?.title || ""} ${ticket?.category || ""}`.toLowerCase();
      return String(ticket?.service_type || "").toLowerCase() === "req_repair" || source.includes("repair") || source.includes("ซ่อม");
    });
    const requestRows = (serviceRequests || []).length > 0
      ? serviceRequests
      : (tickets || []).filter((ticket) => {
        const source = `${ticket?.service_type || ""} ${ticket?.title || ""} ${ticket?.category || ""}`.toLowerCase();
        const serviceType = String(ticket?.service_type || "").toLowerCase();
        if (!serviceType || serviceType === "req_repair") return false;
        return serviceType.startsWith("req_") || /เบิก|install|license|vpn|wifi|access|purchase|quotation|borrow/.test(source);
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
      repairTickets,
      requestRows,
      openQueue,
      overdueRepair,
      repairShare,
      requestShare,
      cards: [
        {
          label: tt("stats.newToday"),
          value: repairToday + requestToday,
          caption: `${repairToday.toLocaleString("th-TH")} ${tt("stats.tickets")} / ${requestToday.toLocaleString("th-TH")} ${tt("stats.requests")}`,
          tone: "blue",
        },
        {
          label: tt("stats.openQueue"),
          value: openQueue,
          caption: overdueRepair > 0 ? `${overdueRepair.toLocaleString("th-TH")} ${tt("stats.slaRisk")}` : tt("stats.slaOk"),
          tone: "amber",
        },
        {
          label: tt("stats.closedToday"),
          value: closedToday,
          caption: `${closedTotal.toLocaleString("th-TH")} / ${allRows.length.toLocaleString("th-TH")} ${tt("stats.totalWork")}`,
          tone: "emerald",
        },
        {
          label: tt("stats.completionRate"),
          value: `${completionRate}%`,
          caption: openQueue > 0 ? `${openQueue.toLocaleString("th-TH")} ${tt("stats.openQueue")}` : tt("stats.noBacklog"),
          tone: "violet",
        },
      ],
    };
  }, [serviceRequests, tickets, tt]);

  const toneStyles = {
    blue: {
      value: theme === "dark" ? "text-cyan-100" : "text-[#2b59b0]",
      pill: theme === "dark" ? "bg-cyan-400/10 text-cyan-200" : "bg-cyan-50 text-cyan-700",
      card: theme === "dark" ? "border-cyan-400/15 bg-cyan-400/5" : "border-cyan-100 bg-cyan-50/70",
    },
    amber: {
      value: theme === "dark" ? "text-amber-100" : "text-amber-600",
      pill: theme === "dark" ? "bg-amber-400/10 text-amber-200" : "bg-amber-50 text-amber-700",
      card: theme === "dark" ? "border-amber-400/15 bg-amber-400/5" : "border-amber-100 bg-amber-50/70",
    },
    emerald: {
      value: theme === "dark" ? "text-emerald-100" : "text-emerald-600",
      pill: theme === "dark" ? "bg-emerald-400/10 text-emerald-200" : "bg-emerald-50 text-emerald-700",
      card: theme === "dark" ? "border-emerald-400/15 bg-emerald-400/5" : "border-emerald-100 bg-emerald-50/70",
    },
    violet: {
      value: theme === "dark" ? "text-violet-100" : "text-violet-600",
      pill: theme === "dark" ? "bg-violet-400/10 text-violet-200" : "bg-violet-50 text-violet-700",
      card: theme === "dark" ? "border-violet-400/15 bg-violet-400/5" : "border-violet-100 bg-violet-50/70",
    },
    sky: {
      value: theme === "dark" ? "text-sky-100" : "text-sky-700",
      pill: theme === "dark" ? "bg-sky-400/10 text-sky-200" : "bg-sky-50 text-sky-700",
      card: theme === "dark" ? "border-sky-400/15 bg-sky-400/5" : "border-sky-100 bg-sky-50/70",
    },
    slate: {
      value: theme === "dark" ? "text-slate-100" : "text-slate-800",
      pill: theme === "dark" ? "bg-slate-700/60 text-slate-200" : "bg-slate-100 text-slate-700",
      card: theme === "dark" ? "border-slate-600/40 bg-slate-800/30" : "border-slate-200 bg-slate-50/80",
    },
  };
  const isDarkTheme = theme === "dark";
  const totalWorkCount = dashboardKpis.repairTickets.length + dashboardKpis.requestRows.length;
  const summaryCards = useMemo(() => ([
    ...dashboardKpis.cards,
    {
      label: tt("stats.workLogs"),
      value: workLogKpis.loading ? "-" : workLogKpis.jobCount,
      caption: workLogKpis.loading
        ? tt("stats.loading")
        : `${tt("stats.reportScope")} ${workLogKpis.reportPeriodLabel}`,
      tone: "sky",
    },
    {
      label: tt("stats.totalHours"),
      value: workLogKpis.loading ? "-" : workLogKpis.totalHoursLabel,
      caption: workLogKpis.loading
        ? tt("stats.loading")
        : `${workLogKpis.evidenceCoverage}% ${tt("stats.evidenceCoverage")}`,
      tone: "slate",
    },
  ]), [dashboardKpis.cards, tt, workLogKpis.evidenceCoverage, workLogKpis.jobCount, workLogKpis.loading, workLogKpis.reportPeriodLabel, workLogKpis.totalHoursLabel]);
  const topFlowCards = [
    { step: "01", label: tt("sections.overview") },
    { step: "02", label: tt("sections.report") },
    { step: "03", label: tt("sections.summary") },
  ];
  const introCardClass = isDarkTheme
    ? "rounded-[30px] border border-slate-700 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_35%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(17,24,39,0.96))] shadow-[0_26px_70px_-40px_rgba(15,23,42,0.95)]"
    : "rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_34%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] shadow-[0_26px_70px_-40px_rgba(15,23,42,0.22)]";
  const summaryShellClass = isDarkTheme
    ? "rounded-[32px] border border-slate-700 bg-[radial-gradient(circle_at_top_right,_rgba(43,89,176,0.28),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.16),_transparent_36%),linear-gradient(135deg,_rgba(15,23,42,0.99),_rgba(17,24,39,0.97))] shadow-[0_30px_80px_-44px_rgba(2,6,23,0.95)]"
    : "rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(43,89,176,0.16),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.12),_transparent_38%),linear-gradient(135deg,_rgba(248,250,252,0.98),_rgba(255,255,255,0.98))] shadow-[0_30px_80px_-44px_rgba(15,23,42,0.22)]";
  const glassCardClass = isDarkTheme
    ? "rounded-[24px] border border-slate-700/80 bg-slate-950/35 backdrop-blur"
    : "rounded-[24px] border border-white/80 bg-white/88 shadow-sm backdrop-blur";

  return (
    <div className="space-y-6">
      <section>
        <div className={`${introCardClass} overflow-hidden px-5 py-5 sm:px-6`}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkTheme ? "bg-cyan-400/10 text-cyan-200" : "bg-cyan-50 text-cyan-700"}`}>
                {tt("eyebrow")}
              </span>
              <h3 className={`mt-4 text-2xl font-black ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                {tt("title")}
              </h3>
              <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                {tt("description")}
              </p>
              <p className={`mt-3 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                {tt("topHint")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[520px]">
              {topFlowCards.map((item) => (
                <div
                  key={item.step}
                  className={`${glassCardClass} px-4 py-4`}
                >
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkTheme ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                    {item.step}
                  </span>
                  <p className={`mt-3 text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <ITServiceOverviewPanel
          tickets={tickets}
          serviceRequests={serviceRequests}
          onCreateTicket={onCreateTicket}
          onOpenWalkInTicket={onOpenWalkInTicket}
          onPickUpEquipment={onPickUpEquipment}
          onOpenRepair={onOpenRepairFromOverview}
        />
      </section>

      <section>
        <ITWorkReportPanel
          theme={theme}
          tickets={tickets}
          serviceRequests={serviceRequests}
          onNavigatePage={onNavigatePage}
          onKpiChange={setWorkLogKpis}
        />
      </section>

      <section>
        <div className={`${summaryShellClass} relative overflow-hidden p-5 sm:p-6`}>
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className={`absolute -right-20 top-0 h-48 w-48 rounded-full blur-3xl ${isDarkTheme ? "bg-cyan-500/12" : "bg-cyan-200/60"}`} />
            <div className={`absolute -bottom-16 left-0 h-44 w-44 rounded-full blur-3xl ${isDarkTheme ? "bg-[#2b59b0]/18" : "bg-blue-200/60"}`} />
          </div>

          <div className="relative">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneStyles.blue.pill}`}>
                  {tt("sections.summary")}
                </span>
                <h3 className={`mt-4 text-2xl font-black ${isDarkTheme ? "text-slate-100" : "text-slate-900"}`}>
                  {tt("summaryTitle")}
                </h3>
                <p className={`mt-2 text-sm leading-6 ${isDarkTheme ? "text-slate-300" : "text-slate-600"}`}>
                  {tt("summaryDescription")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDarkTheme ? "bg-slate-800/80 text-slate-200" : "bg-white/90 text-slate-700 shadow-sm"}`}>
                  {tt("stats.totalWork")} {totalWorkCount.toLocaleString("th-TH")}
                </span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneStyles.sky.pill}`}>
                  {tt("stats.workLogs")} {workLogKpis.loading ? "-" : workLogKpis.jobCount.toLocaleString("th-TH")}
                </span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneStyles.slate.pill}`}>
                  {workLogKpis.loading ? tt("stats.loading") : workLogKpis.totalHoursLabel}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {summaryCards.map((item) => (
                  <article
                    key={item.label}
                    className={`rounded-[24px] border px-4 py-4 backdrop-blur ${toneStyles[item.tone].card}`}
                  >
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneStyles[item.tone].pill}`}>
                      {tt("stats.kpiTag")}
                    </span>
                    <p className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                      {item.label}
                    </p>
                    <p className={`mt-2 text-3xl font-black ${toneStyles[item.tone].value}`}>
                      {typeof item.value === "number" ? item.value.toLocaleString("th-TH") : item.value}
                    </p>
                    <p className={`mt-2 text-xs leading-5 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                      {item.caption}
                    </p>
                  </article>
                ))}
              </div>

              <div className="space-y-4">
                <article className={`${glassCardClass} px-4 py-4`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                    {tt("stats.queueHealth")}
                  </p>
                  <h4 className={`mt-2 text-base font-bold ${isDarkTheme ? "text-slate-100" : "text-slate-900"}`}>
                    {tt("stats.healthCaption")}
                  </h4>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isDarkTheme ? "text-slate-300" : "text-slate-600"}`}>{tt("stats.intakeMix")}</span>
                      <span className={`text-sm font-semibold ${isDarkTheme ? "text-slate-100" : "text-slate-900"}`}>
                        {dashboardKpis.repairShare}% / {dashboardKpis.requestShare}%
                      </span>
                    </div>
                    <div className={`h-2 overflow-hidden rounded-full ${isDarkTheme ? "bg-slate-800" : "bg-slate-100"}`}>
                      <div className="h-full rounded-full bg-[#2b59b0]" style={{ width: `${dashboardKpis.repairShare}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`rounded-2xl px-3 py-3 ${isDarkTheme ? "bg-slate-900/70" : "bg-slate-50"}`}>
                        <p className={`text-xs font-semibold ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>{tt("stats.openQueue")}</p>
                        <p className={`mt-1 text-xl font-black ${toneStyles.amber.value}`}>{dashboardKpis.openQueue.toLocaleString("th-TH")}</p>
                      </div>
                      <div className={`rounded-2xl px-3 py-3 ${isDarkTheme ? "bg-slate-900/70" : "bg-slate-50"}`}>
                        <p className={`text-xs font-semibold ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>{tt("stats.slaRisk")}</p>
                        <p className={`mt-1 text-xl font-black ${dashboardKpis.overdueRepair > 0 ? toneStyles.amber.value : toneStyles.emerald.value}`}>
                          {dashboardKpis.overdueRepair > 0 ? dashboardKpis.overdueRepair.toLocaleString("th-TH") : tt("stats.slaOk")}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>

                <article className={`${glassCardClass} px-4 py-4`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                    {tt("stats.reportHealth")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneStyles.sky.pill}`}>
                      {workLogKpis.loading ? tt("stats.loading") : `${tt("stats.reportScope")} ${workLogKpis.reportPeriodLabel}`}
                    </span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneStyles.slate.pill}`}>
                      {workLogKpis.loading ? tt("stats.loading") : `${tt("stats.activeScope")} ${workLogKpis.selectedTypeLabel}`}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className={`rounded-2xl px-3 py-3 ${isDarkTheme ? "bg-slate-900/70" : "bg-slate-50"}`}>
                      <p className={`text-xs font-semibold ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>{tt("stats.workLogs")}</p>
                      <p className={`mt-1 text-xl font-black ${toneStyles.sky.value}`}>
                        {workLogKpis.loading ? "-" : workLogKpis.jobCount.toLocaleString("th-TH")}
                      </p>
                    </div>
                    <div className={`rounded-2xl px-3 py-3 ${isDarkTheme ? "bg-slate-900/70" : "bg-slate-50"}`}>
                      <p className={`text-xs font-semibold ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>{tt("stats.evidenceCoverage")}</p>
                      <p className={`mt-1 text-xl font-black ${toneStyles.slate.value}`}>
                        {workLogKpis.loading ? "-" : `${workLogKpis.evidenceCoverage}%`}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReportsPage;
