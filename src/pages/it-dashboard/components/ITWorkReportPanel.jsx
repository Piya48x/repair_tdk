import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Clock3,
  FileSpreadsheet,
  Image as ImageIcon,
  LayoutDashboard,
  ListChecks,
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
    .slice(0, 7);
}

const cardClass = "rounded-3xl border border-slate-200 bg-white shadow-sm";
const subCardClass = "rounded-2xl border border-slate-200 bg-slate-50";

export default function ITWorkReportPanel({
  theme,
  uiTheme,
  tickets,
  onNavigatePage,
}) {
  const panelRef = useRef(null);
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

  const softTextClass = theme === "dark" ? "text-slate-400" : "text-slate-500";
  const inputClass = `w-full rounded-2xl border px-4 py-3 text-sm ${uiTheme.searchInputMobile}`;

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
            ? "ยังไม่พบโครงสร้างฐานข้อมูลสำหรับรายงานบันทึกงาน IT กรุณารัน SQL migration ก่อนใช้งาน"
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
        raw: record,
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
        endLabel: formatDateTime(record.end_time),
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
      ...(tickets || []).map((item) => normalizeServiceText(item?.department)),
    ].filter(Boolean))].sort((left, right) => left.localeCompare(right, "th")),
    [recordViews, tickets],
  );

  const filteredRecords = useMemo(() => {
    return recordViews.filter((record) => (
      (filters.type === "ALL" || record.typeValue === filters.type) &&
      (filters.user === "ALL" || record.userName === filters.user) &&
      (filters.department === "ALL" || record.department === filters.department)
    ));
  }, [filters.department, filters.type, filters.user, recordViews]);

  const filteredTickets = useMemo(() => {
    return (tickets || []).filter((ticket) => {
      if (classifyTicketKind(ticket) !== "repair") return false;
      if (filters.department === "ALL") return true;
      return normalizeServiceText(ticket?.department) === filters.department;
    });
  }, [filters.department, tickets]);

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

  const summaryCards = useMemo(() => ([
    {
      label: "แจ้งซ่อมทั้งหมด",
      value: filteredTickets.length.toLocaleString("th-TH"),
      helper: "นับจากรายการแจ้งซ่อมในระบบ",
      icon: AlertTriangle,
      iconWrapClass: "bg-rose-50 text-rose-700",
      valueClass: "text-rose-600",
    },
    {
      label: "บันทึกงาน IT",
      value: reportKpis.jobCount.toLocaleString("th-TH"),
      helper: "ตามตัวกรองรายงาน",
      icon: Wrench,
      iconWrapClass: "bg-[#2b59b0]/10 text-[#2b59b0]",
      valueClass: "text-[#2b59b0]",
    },
    {
      label: "ชั่วโมงรวม",
      value: formatHoursLabel(reportKpis.totalMinutes),
      helper: "รวมเวลาทำงานทั้งหมด",
      icon: Clock3,
      iconWrapClass: "bg-amber-50 text-amber-700",
      valueClass: "text-amber-600",
    },
    {
      label: "เฉลี่ยต่องาน",
      value: formatHoursLabel(reportKpis.averageMinutes),
      helper: "ชั่วโมงเฉลี่ยต่อรายการ",
      icon: UserRound,
      iconWrapClass: "bg-emerald-50 text-emerald-700",
      valueClass: "text-emerald-600",
    },
  ]), [filteredTickets.length, reportKpis.averageMinutes, reportKpis.jobCount, reportKpis.totalMinutes]);

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

  const issueStats = useMemo(() => {
    const issueMap = new Map();

    filteredTickets.forEach((ticket) => {
      const label = getTicketIssueLabel(ticket);
      issueMap.set(label, (issueMap.get(label) || 0) + 1);
    });

    return buildRankedItems([...issueMap.entries()], filteredTickets.length);
  }, [filteredTickets]);

  const workTypeStats = useMemo(() => {
    const typeMap = new Map();

    filteredRecords.forEach((record) => {
      typeMap.set(record.typeLabel, (typeMap.get(record.typeLabel) || 0) + 1);
    });

    return buildRankedItems([...typeMap.entries()], filteredRecords.length);
  }, [filteredRecords]);

  const latestWorkLogs = useMemo(() => {
    return [...filteredRecords]
      .sort((left, right) => {
        const leftDate = toSafeDate(left.startValue)?.getTime() || 0;
        const rightDate = toSafeDate(right.startValue)?.getTime() || 0;
        return rightDate - leftDate;
      })
      .slice(0, 6);
  }, [filteredRecords]);

  const handleExportExcel = () => {
    if (filteredRecords.length === 0 && filteredTickets.length === 0) {
      toast.error("ไม่มีข้อมูลสำหรับ export");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const summaryRows = [
      ["รายงานภาพรวม Dashboard IT Usage"],
      ["สร้างเมื่อ", new Date().toLocaleString("th-TH")],
      ["แผนก", filters.department === "ALL" ? "ทั้งหมด" : filters.department],
      ["ผู้ใช้", filters.user === "ALL" ? "ทั้งหมด" : filters.user],
      ["ประเภทงาน", filters.type === "ALL" ? "ทั้งหมด" : getTypeMeta(filters.type).label],
      ["แจ้งซ่อมทั้งหมด", filteredTickets.length],
      ["จำนวนงาน IT", reportKpis.jobCount],
      ["ชั่วโมงรวม", formatHoursLabel(reportKpis.totalMinutes)],
      ["ชั่วโมงเฉลี่ยต่องาน", formatHoursLabel(reportKpis.averageMinutes)],
      ["งานที่มีภาพหลักฐาน", reportKpis.evidenceJobs],
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(summaryRows),
      "Summary",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(reportRows.map((row) => ({
        period: row.label,
        jobs: row.count,
        total_hours: (row.totalMinutes / 60).toFixed(2),
        average_hours: (row.averageMinutes / 60).toFixed(2),
      }))),
      "Period Report",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(dailySummaries.map((day) => ({
        date: day.label,
        jobs: day.count,
        total_hours: (day.totalMinutes / 60).toFixed(2),
        tasks: day.items.map((item) => `${item.title} (${item.durationLabel})`).join(" | "),
      }))),
      "Daily Summary",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(issueStats.map((item) => ({
        issue: item.label,
        tickets: item.count,
        share_percent: item.percent.toFixed(1),
      }))),
      "Top Issues",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(workTypeStats.map((item) => ({
        work_type: item.label,
        jobs: item.count,
        share_percent: item.percent.toFixed(1),
      }))),
      "Work Types",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(filteredRecords.map((record) => ({
        title: record.title,
        type: record.typeLabel,
        department: record.department,
        user: record.userName,
        requester: record.requesterName,
        location: record.location,
        start_time: record.startLabel,
        end_time: record.endLabel,
        duration: record.durationLabel,
        reference_code: record.referenceCode,
        description: record.description,
        evidence_count: record.imageCount,
        evidence_urls: record.images.map((image) => image.url).join("\n"),
      }))),
      "Work Logs",
    );

    XLSX.writeFile(workbook, `it-usage-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Export Excel สำเร็จ");
  };

  const handleExportPng = async () => {
    if (!panelRef.current) return;

    const canvas = await html2canvas(panelRef.current, {
      backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc",
      scale: 2,
      useCORS: true,
    });

    const link = document.createElement("a");
    link.download = `it-usage-dashboard-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Export Dashboard PNG สำเร็จ");
  };

  return (
    <section ref={panelRef} className="space-y-6">
      <article className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
              <BarChart3 size={14} />
              Dashboard IT Usage
            </div>
            <h3 className="mt-3 text-2xl font-black text-slate-900">รายงานภาพรวมงาน IT และการแจ้งซ่อม</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              รวมข้อมูลแจ้งซ่อม บันทึกงาน ชั่วโมงทำงาน ปัญหาที่พบบ่อย และประเภทงานที่ทำบ่อย
              เพื่อใช้สรุปรายงานสำหรับหัวหน้างานและผู้บริหาร
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigatePage?.(DASHBOARD_PAGE_IDS.DASHBOARD)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigatePage?.(DASHBOARD_PAGE_IDS.IT_WORK_LOGS)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              <ListChecks size={16} />
              บันทึกงาน
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <FileSpreadsheet size={16} />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => void handleExportPng()}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              <ImageIcon size={16} />
              Export PNG
            </button>
          </div>
        </div>

        {loadError && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              schemaMissing
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {loadError}
          </div>
        )}

        <div className="mt-5 grid gap-3 xl:grid-cols-[220px_220px_220px_minmax(0,1fr)]">
          <select
            value={filters.type}
            onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
            className={inputClass}
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
            className={inputClass}
          >
            <option value="ALL">ทุกผู้ใช้</option>
            {userOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={filters.department}
            onChange={(event) => setFilters((prev) => ({ ...prev, department: event.target.value }))}
            className={inputClass}
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
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  reportPeriod === option.value
                    ? "bg-[#2b59b0] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </article>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className={`${cardClass} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-600">{item.label}</p>
                  <p className={`mt-2 text-3xl font-black ${item.valueClass}`}>{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
                </div>
                <div className={`rounded-2xl p-3 ${item.iconWrapClass}`}>
                  <Icon size={20} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <article className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h4 className="text-lg font-black text-slate-900">สรุปรายวัน</h4>
                <p className={`mt-1 text-sm ${softTextClass}`}>
                  แสดงจำนวนงานต่อวัน ชั่วโมงรวม และเวลาที่ใช้ในแต่ละงาน
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <Clock3 size={14} />
                ย้อนหลัง {dailySummaries.length} วัน
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#2b59b0]/20 border-t-[#2b59b0]" />
              </div>
            ) : dailySummaries.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                ยังไม่มีข้อมูลสรุปรายวันในเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {dailySummaries.map((day) => (
                  <div key={day.dateKey} className={`${subCardClass} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{day.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {day.count} งาน • รวม {formatHoursLabel(day.totalMinutes)}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2b59b0]">
                        {formatDurationLabel(day.totalMinutes)}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {day.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                            <p className="truncate text-xs text-slate-500">
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

          <article className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h4 className="text-lg font-black text-slate-900">รายงานตามช่วงเวลา</h4>
                <p className={`mt-1 text-sm ${softTextClass}`}>
                  สรุปตามวัน สัปดาห์ เดือน หรือปี พร้อม KPI สำหรับผู้บริหาร
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={`${subCardClass} px-4 py-3`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>จำนวนงาน</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{reportKpis.jobCount.toLocaleString("th-TH")}</p>
                </div>
                <div className={`${subCardClass} px-4 py-3`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ชั่วโมงรวม</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{formatHoursLabel(reportKpis.totalMinutes)}</p>
                </div>
                <div className={`${subCardClass} px-4 py-3`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>เฉลี่ยต่องาน</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{formatHoursLabel(reportKpis.averageMinutes)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-3 font-bold">ช่วงเวลา</th>
                    <th className="px-3 py-3 font-bold">จำนวนงาน</th>
                    <th className="px-3 py-3 font-bold">ชั่วโมงรวม</th>
                    <th className="px-3 py-3 font-bold">เฉลี่ยต่องาน</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                        ยังไม่มีข้อมูลรายงานในเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    reportRows.map((row) => (
                      <tr key={row.key} className="border-t border-slate-200">
                        <td className="px-3 py-3 font-semibold text-slate-900">{row.label}</td>
                        <td className="px-3 py-3 text-slate-600">{row.count.toLocaleString("th-TH")}</td>
                        <td className="px-3 py-3 text-slate-600">{formatHoursLabel(row.totalMinutes)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatHoursLabel(row.averageMinutes)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
        <aside className="space-y-6">
          <article className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-slate-900">ปัญหาที่พบบ่อย</h4>
                <p className={`mt-1 text-sm ${softTextClass}`}>ดูว่าผู้ใช้แจ้งซ่อมเรื่องไหนบ่อยที่สุด</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                <AlertTriangle size={14} />
                {filteredTickets.length.toLocaleString("th-TH")} ครั้ง
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {issueStats.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  ยังไม่มีข้อมูลแจ้งซ่อมสำหรับสรุปปัญหา
                </div>
              ) : (
                issueStats.map((item) => (
                  <div key={item.label} className={`${subCardClass} p-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{item.label}</p>
                      <span className="shrink-0 text-sm font-bold text-rose-600">{item.count.toLocaleString("th-TH")}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{ width: `${Math.max(item.percent, 8)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{formatPercent(item.percent)} ของรายการแจ้งซ่อม</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-slate-900">ประเภทงาน IT ที่ทำบ่อย</h4>
                <p className={`mt-1 text-sm ${softTextClass}`}>สรุปจากบันทึกงานจริงของทีม IT</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                <Wrench size={14} />
                {filteredRecords.length.toLocaleString("th-TH")} งาน
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {workTypeStats.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  ยังไม่มีข้อมูลบันทึกงานสำหรับสรุปประเภทงาน
                </div>
              ) : (
                workTypeStats.map((item) => (
                  <div key={item.label} className={`${subCardClass} p-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{item.label}</p>
                      <span className="shrink-0 text-sm font-bold text-[#2b59b0]">{item.count.toLocaleString("th-TH")}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-[#2b59b0]"
                        style={{ width: `${Math.max(item.percent, 8)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{formatPercent(item.percent)} ของงานทั้งหมด</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-slate-900">งานล่าสุด</h4>
                <p className={`mt-1 text-sm ${softTextClass}`}>ดูงานที่เพิ่งบันทึกพร้อมเวลาและแผนก</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <Building2 size={14} />
                หลักฐาน {reportKpis.evidenceJobs.toLocaleString("th-TH")} งาน
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {latestWorkLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  ยังไม่มีรายการงานล่าสุด
                </div>
              ) : (
                latestWorkLogs.map((record) => (
                  <div key={record.id} className={`${subCardClass} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{record.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {record.typeLabel} • {record.department || "-"} • {record.userName || "-"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-[#2b59b0]">{record.durationLabel}</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{record.startLabel}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
