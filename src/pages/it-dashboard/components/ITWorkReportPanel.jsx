import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Clock3,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  Package,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import {
  isITWorkRecordSchemaError,
  loadITWorkRecords,
  normalizeEvidenceImages,
  normalizeText as normalizeServiceText,
} from "../../../services/itWorkRecordService";
import { DASHBOARD_PAGE_IDS } from "../constants/dashboardPages";
import { exportITOperationsReportWorkbook } from "../utils/exportITOperationsReport";
import {
  PERIOD_OPTIONS,
  TYPE_OPTIONS,
  calculateDurationMinutes,
  formatDateOnly,
  formatDateTime,
  formatDurationLabel,
  formatHoursLabel,
  getLocalDateKey,
  getPeriodKey,
  getPeriodLabel,
  getTypeMeta,
  normalizeText,
} from "../pages/it-work-evidence/shared";

const CHART_COLORS = ["#2b59b0", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];
const SERVICE_REQUEST_LABELS = {
  req_new_device: "เบิกอุปกรณ์ใหม่",
  req_replacement: "ขอเปลี่ยนเครื่องทดแทน",
  req_peripherals: "อุปกรณ์ต่อพ่วง",
  req_laptop_gps: "ขอยืมโน้ตบุ๊ก GPS",
  req_install_sw: "ติดตั้งโปรแกรมใหม่",
  req_license: "ขอ License / ต่ออายุ",
  req_os_issue: "ปัญหา Windows / OS",
  req_wifi_guest: "ขอรหัส WiFi",
  req_vpn: "ขอใช้งาน VPN",
  req_folder_access: "ขอสิทธิ์ Folder / Server",
  req_domain: "Reset Password / Domain",
  req_cctv_install: "ติดตั้งกล้องวงจรปิด",
  req_cctv_view: "ขอดูย้อนหลัง CCTV",
  req_access_card: "บัตรผ่านเข้า-ออก",
  req_purchase: "ขอจัดซื้ออุปกรณ์ไอที",
  req_quotation: "ขอใบเสนอราคา",
  req_consult: "ปรึกษาปัญหาไอที",
  req_relocate: "ย้ายจุดทำงาน",
};

function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function toSafeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTicketIssueLabel(ticket) {
  return (
    normalizeServiceText(ticket?.category) ||
    normalizeServiceText(ticket?.service_type) ||
    normalizeServiceText(ticket?.title) ||
    "ไม่ระบุ"
  );
}

function classifyTicketKind(ticket) {
  const source = `${ticket?.service_type || ""} ${ticket?.title || ""} ${ticket?.category || ""}`.toLowerCase();
  if (source.includes("repair") || source.includes("ซ่อม")) return "repair";
  if (
    source.includes("req_") ||
    source.includes("เบิก") ||
    source.includes("install") ||
    source.includes("license") ||
    source.includes("purchase")
  ) {
    return "asset";
  }
  return "repair";
}

function normalizeTicketKey(value) {
  return normalizeServiceText(value).toLowerCase();
}

function getTicketDepartment(ticket) {
  return (
    normalizeServiceText(ticket?.reporter_dept) ||
    normalizeServiceText(ticket?.department) ||
    "-"
  );
}

function isRepairTicket(ticket) {
  const serviceType = normalizeTicketKey(ticket?.service_type);
  const source = `${ticket?.service_type || ""} ${ticket?.title || ""} ${ticket?.category || ""}`.toLowerCase();
  return serviceType === "req_repair" || source.includes("repair") || source.includes("ซ่อม");
}

function isServiceRequestTicket(ticket) {
  const serviceType = normalizeTicketKey(ticket?.service_type);
  if (!serviceType || serviceType === "req_repair") return false;
  if (serviceType.startsWith("req_")) return true;

  const source = `${ticket?.service_type || ""} ${ticket?.title || ""} ${ticket?.category || ""}`.toLowerCase();
  return (
    source.includes("เบิก") ||
    source.includes("จัดซื้อ") ||
    source.includes("quotation") ||
    source.includes("purchase") ||
    source.includes("borrow") ||
    source.includes("replacement") ||
    source.includes("install") ||
    source.includes("license") ||
    source.includes("wifi") ||
    source.includes("vpn") ||
    source.includes("access")
  );
}

function getServiceRequestLabel(ticket) {
  const serviceType = normalizeTicketKey(ticket?.service_type);
  return (
    SERVICE_REQUEST_LABELS[serviceType] ||
    normalizeServiceText(ticket?.title) ||
    normalizeServiceText(ticket?.category) ||
    normalizeServiceText(ticket?.service_type) ||
    "คำขอบริการ"
  );
}

function getTicketSortTime(ticket) {
  return (
    toSafeDate(ticket?.created_at)?.getTime() ||
    toSafeDate(ticket?.updated_at)?.getTime() ||
    toSafeDate(ticket?.started_at)?.getTime() ||
    0
  );
}

function buildRankedItems(entries, total) {
  return entries
    .map(([label, count]) => ({
      label,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "th"))
    .slice(0, 5);
}

function buildDailySummaries(records) {
  const summaryMap = new Map();

  records.forEach((record) => {
    const key = record.dateKey || "unknown";
    const current = summaryMap.get(key) || {
      dateKey: key,
      label: key ? formatDateOnly(`${key}T00:00:00`) : "-",
      count: 0,
      totalMinutes: 0,
      items: [],
    };

    current.count += 1;
    current.totalMinutes += record.durationMinutes;
    current.items.push({
      id: record.id,
      title: record.title,
      typeLabel: record.typeLabel,
      userName: record.userName,
      durationLabel: record.durationLabel,
    });

    summaryMap.set(key, current);
  });

  return [...summaryMap.values()]
    .sort((left, right) => String(right.dateKey).localeCompare(String(left.dateKey)))
    .slice(0, 6);
}

export default function ITWorkReportPanel({
  theme,
  tickets,
  serviceRequests = [],
  onNavigatePage,
}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("month");
  const [filters, setFilters] = useState({
    type: "ALL",
    user: "ALL",
    department: "ALL",
  });

  const isDarkTheme = theme === "dark";
  const cardClass = isDarkTheme
    ? "rounded-[28px] border border-slate-700 bg-slate-900/90 shadow-[0_24px_60px_-36px_rgba(2,6,23,0.9)]"
    : "rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.22)]";
  const subCardClass = isDarkTheme
    ? "rounded-3xl border border-slate-800 bg-[#111c30]"
    : "rounded-3xl border border-slate-200 bg-slate-50/90";
  const mutedTextClass = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const titleTextClass = isDarkTheme ? "text-slate-100" : "text-slate-900";
  const bodyTextClass = isDarkTheme ? "text-slate-300" : "text-slate-600";
  const selectClass = isDarkTheme
    ? "w-full rounded-2xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#2b59b0]"
    : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#2b59b0]";
  const ghostButtonClass = isDarkTheme
    ? "inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#162136] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-[#1e2b44]"
    : "inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
  const chartTooltipStyle = {
    backgroundColor: isDarkTheme ? "#0f172a" : "#ffffff",
    border: `1px solid ${isDarkTheme ? "#334155" : "#e2e8f0"}`,
    borderRadius: 16,
    boxShadow: isDarkTheme
      ? "0 16px 32px -20px rgba(15, 23, 42, 0.9)"
      : "0 16px 32px -20px rgba(15, 23, 42, 0.18)",
  };

  useEffect(() => {
    let mounted = true;
    let channel = null;

    const loadRecords = async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);

      const { data, error } = await loadITWorkRecords();
      if (!mounted) return;

      if (error) {
        const missing = isITWorkRecordSchemaError(error);
        setSchemaMissing(missing);
        setLoadError(
          missing
            ? "ยังไม่พบโครงสร้างข้อมูลสำหรับรายงานบันทึกงาน IT กรุณารัน SQL migration ก่อนใช้งาน"
            : "ไม่สามารถโหลดข้อมูลบันทึกงาน IT สำหรับรายงานได้",
        );
        setRecords([]);
      } else {
        setRecords(Array.isArray(data) ? data : []);
        setSchemaMissing(false);
        setLoadError("");
      }

      if (!silent) setLoading(false);
    };

    const init = async () => {
      await loadRecords();
      if (!mounted) return;

      channel = supabase
        .channel("it_work_records_report_realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "it_work_records" }, () => {
          if (mounted) void loadRecords({ silent: true });
        })
        .subscribe();
    };

    void init();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const recordViews = useMemo(() => {
    return records.map((record) => {
      const startValue = record.start_time || record.performed_at || record.created_at || "";
      const activeEnd =
        record.end_time ||
        (record.work_status === "in_progress" ? new Date().toISOString() : startValue);
      const calculatedDuration = calculateDurationMinutes(startValue, activeEnd);
      const durationMinutes = Math.max(Number(record.duration_minutes || 0), calculatedDuration);
      const typeMeta = getTypeMeta(record.job_type);
      const images = normalizeEvidenceImages(record.evidence_images);

      return {
        id: record.id,
        title: normalizeText(record.title) || "-",
        description: normalizeText(record.description),
        userName: normalizeText(record.created_by_name),
        department: normalizeText(record.department),
        location: normalizeText(record.location),
        referenceCode: normalizeText(record.reference_code),
        requesterName: normalizeText(record.requester_name),
        startValue,
        endValue: record.end_time || "",
        startLabel: formatDateTime(startValue),
        durationMinutes,
        durationLabel: formatDurationLabel(durationMinutes),
        typeLabel: typeMeta.label,
        typeValue: record.job_type,
        imageCount: images.length,
        images,
        dateKey: getLocalDateKey(startValue),
      };
    });
  }, [records]);

  const userOptions = useMemo(
    () => [...new Set(recordViews.map((item) => item.userName).filter(Boolean))].sort((left, right) => left.localeCompare(right, "th")),
    [recordViews],
  );

  const departmentOptions = useMemo(
    () => [...new Set([
      ...recordViews.map((item) => item.department),
      ...(tickets || []).map((item) => getTicketDepartment(item)),
      ...(serviceRequests || []).map((item) => getTicketDepartment(item)),
    ].filter(Boolean))].sort((left, right) => left.localeCompare(right, "th")),
    [recordViews, serviceRequests, tickets],
  );

  const filteredRecords = useMemo(() => {
    return recordViews.filter((record) => (
      (filters.type === "ALL" || record.typeValue === filters.type) &&
      (filters.user === "ALL" || record.userName === filters.user) &&
      (filters.department === "ALL" || record.department === filters.department)
    ));
  }, [filters.department, filters.type, filters.user, recordViews]);

  const repairTickets = useMemo(() => {
    return (tickets || []).filter((ticket) => {
      if (!isRepairTicket(ticket)) return false;
      if (filters.department === "ALL") return true;
      return getTicketDepartment(ticket) === filters.department;
    });
  }, [filters.department, tickets]);

  const serviceRequestTickets = useMemo(() => {
    const fallbackRequests = (tickets || []).filter((ticket) => isServiceRequestTicket(ticket));
    const source = (serviceRequests || []).length > 0 ? serviceRequests : fallbackRequests;
    return source.filter((ticket) => {
      if (!isServiceRequestTicket(ticket)) return false;
      if (filters.department === "ALL") return true;
      return getTicketDepartment(ticket) === filters.department;
    });
  }, [filters.department, serviceRequests, tickets]);

  const totalMinutes = useMemo(
    () => filteredRecords.reduce((sum, record) => sum + record.durationMinutes, 0),
    [filteredRecords],
  );

  const reportKpis = useMemo(() => ({
    jobCount: filteredRecords.length,
    totalMinutes,
    averageMinutes: filteredRecords.length > 0 ? totalMinutes / filteredRecords.length : 0,
    evidenceJobs: filteredRecords.filter((record) => record.imageCount > 0).length,
  }), [filteredRecords, totalMinutes]);

  const evidenceCoverage = reportKpis.jobCount > 0
    ? Math.round((reportKpis.evidenceJobs / reportKpis.jobCount) * 100)
    : 0;

  const dailySummaries = useMemo(() => buildDailySummaries(filteredRecords), [filteredRecords]);

  const reportRows = useMemo(() => {
    const grouped = new Map();

    filteredRecords.forEach((record) => {
      const key = getPeriodKey(record.startValue, reportPeriod);
      const current = grouped.get(key) || {
        key,
        label: getPeriodLabel(key, reportPeriod),
        count: 0,
        totalMinutes: 0,
      };

      current.count += 1;
      current.totalMinutes += record.durationMinutes;
      grouped.set(key, current);
    });

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        averageMinutes: item.count > 0 ? item.totalMinutes / item.count : 0,
      }))
      .sort((left, right) => String(right.key).localeCompare(String(left.key)));
  }, [filteredRecords, reportPeriod]);

  const periodChartRows = useMemo(
    () =>
      reportRows
        .slice(0, 6)
        .reverse()
        .map((row) => ({
          ...row,
          totalHours: Number((row.totalMinutes / 60).toFixed(1)),
        })),
    [reportRows],
  );

  const issueStats = useMemo(() => {
    const issueMap = new Map();

    repairTickets.forEach((ticket) => {
      const label = getTicketIssueLabel(ticket);
      issueMap.set(label, (issueMap.get(label) || 0) + 1);
    });

    return buildRankedItems([...issueMap.entries()], repairTickets.length);
  }, [repairTickets]);

  const serviceRequestStats = useMemo(() => {
    const requestMap = new Map();

    serviceRequestTickets.forEach((ticket) => {
      const label = getServiceRequestLabel(ticket);
      requestMap.set(label, (requestMap.get(label) || 0) + 1);
    });

    return buildRankedItems([...requestMap.entries()], serviceRequestTickets.length);
  }, [serviceRequestTickets]);

  const workTypeStats = useMemo(() => {
    const typeMap = new Map();

    filteredRecords.forEach((record) => {
      typeMap.set(record.typeLabel, (typeMap.get(record.typeLabel) || 0) + 1);
    });

    return buildRankedItems([...typeMap.entries()], filteredRecords.length);
  }, [filteredRecords]);

  const workTypeChartData = useMemo(
    () => workTypeStats.map((item, index) => ({ ...item, fill: CHART_COLORS[index % CHART_COLORS.length] })),
    [workTypeStats],
  );

  const latestWorkLogs = useMemo(() => {
    return [...filteredRecords]
      .sort((left, right) => {
        const leftDate = toSafeDate(left.startValue)?.getTime() || 0;
        const rightDate = toSafeDate(right.startValue)?.getTime() || 0;
        return rightDate - leftDate;
      })
      .slice(0, 5);
  }, [filteredRecords]);

  const latestServiceRequests = useMemo(() => {
    return [...serviceRequestTickets]
      .sort((left, right) => getTicketSortTime(right) - getTicketSortTime(left))
      .slice(0, 5);
  }, [serviceRequestTickets]);

  const summaryCards = useMemo(() => ([
    {
      label: "งานแจ้งซ่อมทั้งหมด",
      value: repairTickets.length.toLocaleString("th-TH"),
      helper: "นับจาก repair ticket ภายใต้ตัวกรองปัจจุบัน",
      icon: AlertTriangle,
      accent: "from-rose-500 to-orange-400",
      iconWrapClass: isDarkTheme ? "bg-rose-500/10 text-rose-300" : "bg-rose-50 text-rose-600",
      valueClass: isDarkTheme ? "text-rose-200" : "text-rose-600",
    },
    {
      label: "คำขอบริการ / เบิกของ",
      value: serviceRequestTickets.length.toLocaleString("th-TH"),
      helper: "แยกจากงานแจ้งซ่อมเพื่อให้ทีม IT เห็นคำขอใหม่ชัดเจน",
      icon: Package,
      accent: "from-violet-500 to-fuchsia-500",
      iconWrapClass: isDarkTheme ? "bg-violet-500/10 text-violet-200" : "bg-violet-50 text-violet-600",
      valueClass: isDarkTheme ? "text-violet-100" : "text-violet-600",
    },
    {
      label: "บันทึกงาน IT",
      value: reportKpis.jobCount.toLocaleString("th-TH"),
      helper: "จำนวน work logs ที่ใช้สรุปรายงาน",
      icon: Wrench,
      accent: "from-[#2b59b0] to-cyan-500",
      iconWrapClass: isDarkTheme ? "bg-[#2b59b0]/15 text-cyan-200" : "bg-[#2b59b0]/10 text-[#2b59b0]",
      valueClass: isDarkTheme ? "text-cyan-100" : "text-[#2b59b0]",
    },
    {
      label: "ชั่วโมงรวม",
      value: formatHoursLabel(reportKpis.totalMinutes),
      helper: "เวลาทำงานสะสมทั้งหมดของทีม",
      icon: Clock3,
      accent: "from-amber-500 to-yellow-400",
      iconWrapClass: isDarkTheme ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-600",
      valueClass: isDarkTheme ? "text-amber-100" : "text-amber-600",
    },
    {
      label: "เฉลี่ยต่องาน",
      value: formatHoursLabel(reportKpis.averageMinutes),
      helper: "ใช้ประเมิน workload และเวลาจริงต่องาน",
      icon: UserRound,
      accent: "from-emerald-500 to-teal-400",
      iconWrapClass: isDarkTheme ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-600",
      valueClass: isDarkTheme ? "text-emerald-100" : "text-emerald-600",
    },
  ]), [isDarkTheme, repairTickets.length, reportKpis.averageMinutes, reportKpis.jobCount, reportKpis.totalMinutes, serviceRequestTickets.length]);

  const selectedTypeLabel = filters.type === "ALL" ? "ทุกประเภทงาน" : getTypeMeta(filters.type).label;
  const reportPeriodLabel = PERIOD_OPTIONS.find((option) => option.value === reportPeriod)?.label || reportPeriod;
  const activeFilterSummary = [
    filters.department === "ALL" ? "ทุกแผนก" : filters.department,
    filters.user === "ALL" ? "ทุกผู้ปฏิบัติงาน" : filters.user,
    selectedTypeLabel,
  ];

  const handleExportExcel = async () => {
    if (filteredRecords.length === 0 && repairTickets.length === 0 && serviceRequestTickets.length === 0) {
      toast.error("ไม่พบข้อมูลสำหรับ export");
      return;
    }

    const toastId = toast.loading("กำลังสร้างรายงาน Excel พร้อมรูปภาพ...");

    try {
      const fileName = await exportITOperationsReportWorkbook({
        filters,
        filteredRecords,
        repairTickets,
        serviceRequestTickets,
        reportKpis,
        reportRows,
        issueStats,
        serviceRequestStats,
        workTypeStats,
        latestWorkLogs,
        latestServiceRequests,
        dailySummaries,
        selectedTypeLabel,
        reportPeriodLabel,
      });

      toast.success(`Export Excel สำเร็จ: ${fileName}`, { id: toastId });
    } catch (error) {
      console.error("Report export failed", error);
      toast.error(error?.message || "ไม่สามารถ export รายงานได้", { id: toastId });
    }
  };

  const emptyState = (message) => (
    <div className={`rounded-3xl border border-dashed px-4 py-10 text-center text-sm ${isDarkTheme ? "border-slate-700 bg-[#0f172a] text-slate-400" : "border-slate-300 bg-slate-50 text-slate-500"}`}>
      {message}
    </div>
  );

  return (
    <section className="space-y-6">
      <article className={`${cardClass} overflow-hidden`}>
        <div className={`relative overflow-hidden px-5 py-6 sm:px-6 lg:px-7 ${isDarkTheme ? "bg-[radial-gradient(circle_at_top_left,_rgba(43,89,176,0.35),_transparent_48%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(17,24,39,0.95))]" : "bg-[radial-gradient(circle_at_top_left,_rgba(43,89,176,0.18),_transparent_42%),linear-gradient(135deg,_rgba(248,250,252,0.98),_rgba(255,255,255,0.96))]"}`}>
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${isDarkTheme ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200" : "border-cyan-200 bg-cyan-50 text-cyan-700"}`}>
                <Sparkles size={14} />
                Operational Report
              </span>
              <h3 className={`mt-4 text-2xl font-black sm:text-3xl ${titleTextClass}`}>
                รายงานภาพรวมงาน IT และการแจ้งซ่อม
              </h3>
              <p className={`mt-3 max-w-3xl text-sm leading-7 ${bodyTextClass}`}>
                รวมข้อมูล repair ticket, บันทึกงาน IT, ชั่วโมงทำงาน และหลักฐานรูปภาพไว้ในหน้าเดียว
                เพื่อใช้ติดตามผลและ export เป็น Excel ที่อ่านต่อได้ทันที
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {activeFilterSummary.map((label) => (
                  <span
                    key={label}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isDarkTheme ? "bg-slate-800/80 text-slate-200" : "bg-white text-slate-600 shadow-sm"}`}
                  >
                    {label}
                  </span>
                ))}
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isDarkTheme ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-700"}`}>
                  หลักฐานรูปภาพ {evidenceCoverage}%
                </span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isDarkTheme ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700"}`}>
                  สรุปตาม {reportPeriodLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
              <button
                type="button"
                onClick={() => onNavigatePage?.(DASHBOARD_PAGE_IDS.DASHBOARD)}
                className={ghostButtonClass}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => onNavigatePage?.(DASHBOARD_PAGE_IDS.IT_WORK_LOGS)}
                className={ghostButtonClass}
              >
                <ListChecks size={16} />
                บันทึกงาน IT
              </button>
              <button
                type="button"
                onClick={() => void handleExportExcel()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2b59b0] to-[#244a95] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_34px_-20px_rgba(43,89,176,0.8)] transition hover:translate-y-[-1px]"
              >
                <FileSpreadsheet size={16} />
                Export Excel พร้อมรูปภาพ
              </button>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className={`mx-5 mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold sm:mx-6 lg:mx-7 ${schemaMissing ? "border-amber-200 bg-amber-50 text-amber-800" : isDarkTheme ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {loadError}
          </div>
        ) : null}

        <div className={`border-t px-5 py-5 sm:px-6 lg:px-7 ${isDarkTheme ? "border-slate-800 bg-slate-950/50" : "border-slate-200 bg-slate-50/70"}`}>
          <div className="grid gap-3 xl:grid-cols-[220px_220px_220px_minmax(0,1fr)]">
            <select
              value={filters.type}
              onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
              className={selectClass}
            >
              <option value="ALL">ทุกประเภทงาน</option>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filters.user}
              onChange={(event) => setFilters((prev) => ({ ...prev, user: event.target.value }))}
              className={selectClass}
            >
              <option value="ALL">ทุกผู้ปฏิบัติงาน</option>
              {userOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <select
              value={filters.department}
              onChange={(event) => setFilters((prev) => ({ ...prev, department: event.target.value }))}
              className={selectClass}
            >
              <option value="ALL">ทุกแผนก</option>
              {departmentOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReportPeriod(option.value)}
                  className={`rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    reportPeriod === option.value
                      ? "bg-[#2b59b0] text-white"
                      : isDarkTheme
                        ? "bg-[#162136] text-slate-200 hover:bg-[#1e2b44]"
                        : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className={`${cardClass} overflow-hidden p-5`}>
              <div className={`mb-4 h-1.5 rounded-full bg-gradient-to-r ${item.accent}`} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold ${bodyTextClass}`}>{item.label}</p>
                  <p className={`mt-3 text-3xl font-black ${item.valueClass}`}>{item.value}</p>
                  <p className={`mt-2 text-xs leading-5 ${mutedTextClass}`}>{item.helper}</p>
                </div>
                <div className={`rounded-2xl p-3 ${item.iconWrapClass}`}>
                  <Icon size={20} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.95fr)]">
        <article className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>Trend overview</p>
              <h4 className={`mt-2 text-xl font-black ${titleTextClass}`}>ภาพรวมปริมาณงานตามช่วงเวลา</h4>
              <p className={`mt-2 text-sm ${bodyTextClass}`}>
                ดูจำนวนงานและชั่วโมงรวมตามช่วงเวลาเพื่อมองเห็น workload ของทีมในแต่ละรอบ
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className={`${subCardClass} px-4 py-3`}>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>จำนวนงาน</p>
                <p className={`mt-2 text-2xl font-black ${titleTextClass}`}>{reportKpis.jobCount.toLocaleString("th-TH")}</p>
              </div>
              <div className={`${subCardClass} px-4 py-3`}>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>ชั่วโมงรวม</p>
                <p className={`mt-2 text-2xl font-black ${titleTextClass}`}>{formatHoursLabel(reportKpis.totalMinutes)}</p>
              </div>
              <div className={`${subCardClass} px-4 py-3`}>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>มีหลักฐาน</p>
                <p className={`mt-2 text-2xl font-black ${titleTextClass}`}>{reportKpis.evidenceJobs.toLocaleString("th-TH")}</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#2b59b0]/20 border-t-[#2b59b0]" />
            </div>
          ) : periodChartRows.length === 0 ? (
            <div className="mt-5">{emptyState("ยังไม่มีข้อมูลรายงานตามช่วงเวลาภายใต้ตัวกรองที่เลือก")}</div>
          ) : (
            <>
              <div className="mt-5 h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={periodChartRows} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="report-period-gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#2b59b0" stopOpacity={0.42} />
                        <stop offset="100%" stopColor="#2b59b0" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={isDarkTheme ? "#23314a" : "#e2e8f0"} strokeDasharray="4 4" />
                    <XAxis dataKey="label" tick={{ fill: isDarkTheme ? "#94a3b8" : "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: isDarkTheme ? "#94a3b8" : "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value} งาน`, "จำนวนงาน"]} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#2b59b0"
                      strokeWidth={3}
                      fill="url(#report-period-gradient)"
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className={`text-left text-xs uppercase ${mutedTextClass}`}>
                      <th className="px-3 py-3 font-bold">ช่วงเวลา</th>
                      <th className="px-3 py-3 font-bold">จำนวนงาน</th>
                      <th className="px-3 py-3 font-bold">ชั่วโมงรวม</th>
                      <th className="px-3 py-3 font-bold">เฉลี่ยต่องาน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row, index) => (
                      <tr key={row.key} className={`${index > 0 ? isDarkTheme ? "border-t border-slate-800" : "border-t border-slate-200" : ""}`}>
                        <td className={`px-3 py-3 font-semibold ${titleTextClass}`}>{row.label}</td>
                        <td className={`px-3 py-3 ${bodyTextClass}`}>{row.count.toLocaleString("th-TH")}</td>
                        <td className={`px-3 py-3 ${bodyTextClass}`}>{formatHoursLabel(row.totalMinutes)}</td>
                        <td className={`px-3 py-3 ${bodyTextClass}`}>{formatHoursLabel(row.averageMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </article>

        <div className="space-y-6">
          <article className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>Workload mix</p>
                <h4 className={`mt-2 text-lg font-black ${titleTextClass}`}>ประเภทงาน IT ที่ทำบ่อย</h4>
                <p className={`mt-1 text-sm ${bodyTextClass}`}>ช่วยมองว่าเวลาของทีมถูกใช้ไปกับงานประเภทใดมากที่สุด</p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isDarkTheme ? "bg-cyan-500/10 text-cyan-200" : "bg-cyan-50 text-cyan-700"}`}>
                <Wrench size={14} />
                {filteredRecords.length.toLocaleString("th-TH")} jobs
              </span>
            </div>

            {workTypeChartData.length === 0 ? (
              <div className="mt-4">{emptyState("ยังไม่มีข้อมูลบันทึกงานสำหรับสรุปประเภทงาน")}</div>
            ) : (
              <>
                <div className="mt-4 h-[220px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workTypeChartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke={isDarkTheme ? "#23314a" : "#e2e8f0"} strokeDasharray="4 4" />
                      <XAxis dataKey="label" tick={{ fill: isDarkTheme ? "#94a3b8" : "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: isDarkTheme ? "#94a3b8" : "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value} งาน`, "จำนวนงาน"]} />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                        {workTypeChartData.map((item) => (
                          <Cell key={item.label} fill={item.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-3">
                  {workTypeStats.map((item, index) => (
                    <div key={item.label} className={`${subCardClass} p-4`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className={`min-w-0 truncate text-sm font-semibold ${titleTextClass}`}>{item.label}</p>
                        <span className="shrink-0 text-sm font-bold text-[#2b59b0]">{item.count.toLocaleString("th-TH")}</span>
                      </div>
                      <div className={`mt-3 h-2 rounded-full ${isDarkTheme ? "bg-slate-800" : "bg-white"}`}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(item.percent, 8)}%`,
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                      <p className={`mt-2 text-xs ${mutedTextClass}`}>{formatPercent(item.percent)} ของงานทั้งหมด</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>

          <article className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>Repair insight</p>
                <h4 className={`mt-2 text-lg font-black ${titleTextClass}`}>ปัญหาที่พบจากการแจ้งซ่อม</h4>
                <p className={`mt-1 text-sm ${bodyTextClass}`}>ดูเรื่องที่ถูกแจ้งเข้ามาบ่อยเพื่อวางแผนลดปัญหาซ้ำ</p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isDarkTheme ? "bg-rose-500/10 text-rose-200" : "bg-rose-50 text-rose-700"}`}>
                <AlertTriangle size={14} />
                {repairTickets.length.toLocaleString("th-TH")} tickets
              </span>
            </div>

            {issueStats.length === 0 ? (
              <div className="mt-4">{emptyState("ยังไม่มีข้อมูลการแจ้งซ่อมสำหรับสรุปปัญหา")}</div>
            ) : (
              <div className="mt-4 space-y-3">
                {issueStats.map((item, index) => (
                  <div key={item.label} className={`${subCardClass} p-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={`min-w-0 truncate text-sm font-semibold ${titleTextClass}`}>{item.label}</p>
                      <span className="shrink-0 text-sm font-bold text-rose-500">{item.count.toLocaleString("th-TH")}</span>
                    </div>
                    <div className={`mt-3 h-2 rounded-full ${isDarkTheme ? "bg-slate-800" : "bg-white"}`}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(item.percent, 8)}%`,
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                    </div>
                    <p className={`mt-2 text-xs ${mutedTextClass}`}>{formatPercent(item.percent)} ของรายการแจ้งซ่อม</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.95fr)]">
        <article className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>Daily snapshot</p>
              <h4 className={`mt-2 text-lg font-black ${titleTextClass}`}>สรุปรายวันล่าสุด</h4>
              <p className={`mt-1 text-sm ${bodyTextClass}`}>รวมจำนวนงานและชั่วโมงรวมในแต่ละวันเพื่อเห็นจังหวะการทำงานจริง</p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isDarkTheme ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
              <Clock3 size={14} />
              ย้อนหลัง {dailySummaries.length} วัน
            </span>
          </div>

          {loading ? (
            <div className="py-14 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#2b59b0]/20 border-t-[#2b59b0]" />
            </div>
          ) : dailySummaries.length === 0 ? (
            <div className="mt-4">{emptyState("ยังไม่มีข้อมูลสรุปรายวันภายใต้เงื่อนไขที่เลือก")}</div>
          ) : (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {dailySummaries.map((day) => (
                <div key={day.dateKey} className={`${subCardClass} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-black ${titleTextClass}`}>{day.label}</p>
                      <p className={`mt-1 text-xs ${mutedTextClass}`}>
                        {day.count} งาน • รวม {formatHoursLabel(day.totalMinutes)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${isDarkTheme ? "bg-[#0f172a] text-cyan-200" : "bg-white text-[#2b59b0]"}`}>
                      {formatDurationLabel(day.totalMinutes)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {day.items.slice(0, 3).map((item) => (
                      <div key={item.id} className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2 ${isDarkTheme ? "bg-[#0f172a]" : "bg-white"}`}>
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${titleTextClass}`}>{item.title}</p>
                          <p className={`truncate text-xs ${mutedTextClass}`}>
                            {item.typeLabel} • {item.userName || "-"}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-[#2b59b0]">{item.durationLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <aside className="space-y-6">
          <article className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>Latest records</p>
                <h4 className={`mt-2 text-lg font-black ${titleTextClass}`}>งานล่าสุดของทีม IT</h4>
                <p className={`mt-1 text-sm ${bodyTextClass}`}>รายการที่เพิ่งบันทึก พร้อมเวลา แผนก และจำนวนรูปหลักฐาน</p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isDarkTheme ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                <Building2 size={14} />
                หลักฐาน {reportKpis.evidenceJobs.toLocaleString("th-TH")} งาน
              </span>
            </div>

            {latestWorkLogs.length === 0 ? (
              <div className="mt-4">{emptyState("ยังไม่มีรายการงานล่าสุด")}</div>
            ) : (
              <div className="mt-4 space-y-3">
                {latestWorkLogs.map((record) => (
                  <div key={record.id} className={`${subCardClass} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${titleTextClass}`}>{record.title}</p>
                        <p className={`mt-1 truncate text-xs ${mutedTextClass}`}>
                          {record.typeLabel} • {record.department || "-"} • {record.userName || "-"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-[#2b59b0]">{record.durationLabel}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkTheme ? "bg-[#0f172a] text-slate-300" : "bg-white text-slate-600"}`}>
                        {record.startLabel}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${record.imageCount > 0 ? isDarkTheme ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-700" : isDarkTheme ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                        รูปหลักฐาน {record.imageCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>Service requests</p>
                <h4 className={`mt-2 text-lg font-black ${titleTextClass}`}>คำขอเบิกของและคำขอบริการ</h4>
                <p className={`mt-1 text-sm ${bodyTextClass}`}>แยกคำขอจากหน้า Pick-up Equipment ออกจากงานแจ้งซ่อม เพื่อให้ทีม IT วางแผนคิวและเตรียมอุปกรณ์ได้เร็วขึ้น</p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isDarkTheme ? "bg-violet-500/10 text-violet-200" : "bg-violet-50 text-violet-700"}`}>
                <Package size={14} />
                {serviceRequestTickets.length.toLocaleString("th-TH")} requests
              </span>
            </div>

            {serviceRequestStats.length === 0 ? (
              <div className="mt-4">{emptyState("ยังไม่มีข้อมูลคำขอบริการหรือการเบิกของภายใต้ตัวกรองที่เลือก")}</div>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  {serviceRequestStats.map((item, index) => (
                    <div key={item.label} className={`${subCardClass} p-4`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className={`min-w-0 truncate text-sm font-semibold ${titleTextClass}`}>{item.label}</p>
                        <span className="shrink-0 text-sm font-bold text-violet-500">{item.count.toLocaleString("th-TH")}</span>
                      </div>
                      <div className={`mt-3 h-2 rounded-full ${isDarkTheme ? "bg-slate-800" : "bg-white"}`}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(item.percent, 8)}%`,
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                      <p className={`mt-2 text-xs ${mutedTextClass}`}>{formatPercent(item.percent)} ของคำขอบริการทั้งหมด</p>
                    </div>
                  ))}
                </div>

                {latestServiceRequests[0] ? (
                  <div className={`${subCardClass} mt-4 p-4`}>
                    <p className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedTextClass}`}>Latest request</p>
                    <p className={`mt-2 text-sm font-semibold ${titleTextClass}`}>{getServiceRequestLabel(latestServiceRequests[0])}</p>
                    <p className={`mt-1 text-xs ${mutedTextClass}`}>
                      {getTicketDepartment(latestServiceRequests[0])} • {formatDateTime(latestServiceRequests[0]?.created_at || latestServiceRequests[0]?.updated_at)}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </article>

          <article className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-start gap-3">
              <div className={`rounded-2xl p-3 ${isDarkTheme ? "bg-[#2b59b0]/15 text-cyan-200" : "bg-[#2b59b0]/10 text-[#2b59b0]"}`}>
                <BarChart3 size={20} />
              </div>
              <div>
                <h4 className={`text-lg font-black ${titleTextClass}`}>ไฟล์ Export ใหม่</h4>
                <p className={`mt-1 text-sm ${bodyTextClass}`}>
                  ได้ workbook เดียวที่มี summary, ตาราง work logs, repair tickets และรูปภาพหลักฐานในไฟล์เดียว
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {[
                "สรุป KPI พร้อมโทนสีอ่านง่ายสำหรับประชุม",
                "มีกราฟสรุปในหน้า Executive Summary",
                "แนบรูปหลักฐานจาก work logs และ ticket repair",
                "เหมาะสำหรับแชร์ต่อผู้บริหารและตรวจสอบย้อนหลัง",
              ].map((item) => (
                <div
                  key={item}
                  className={`rounded-2xl border px-4 py-3 text-sm ${isDarkTheme ? "border-slate-800 bg-[#111c30] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
