import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { supabase } from "../../lib/supabaseClient";
import {
  fetchGatepassVehicleRecords,
  isGatepassSchemaMissing,
} from "../../services/gatepassReportService";
import { downloadGatepassReport } from "./gatepassExcelExport";
import TdkApprovedRegistryReportSection from "./TdkApprovedRegistryReportSection";
import GatepassExecutiveTabs from "./GatepassExecutiveTabs";

const COPY = {
  th: {
    page: {
      eyebrow: "Security & Administration",
      title: "Gatepass Vehicle Report",
      subtitle: "รายงานผู้บริหารที่แยกชัดเจนระหว่างรถเข้า-ออกประจำวัน และสถานะทะเบียนรถหลัก TDK APPROVED รายเดือน",
      live: "ข้อมูลจาก Gatepass Registry",
      refreshed: "อัปเดตล่าสุด",
      refresh: "รีเฟรช",
      export: "Export Excel",
      exporting: "กำลังสร้างรายงาน...",
    },
    sections: { daily: "รถเข้า–ออกรายวัน", dailyHint: "การผ่านประตูและปริมาณ Gatepass", registry: "ทะเบียนรถหลัก TDK APPROVED", registryHint: "รถปัจจุบันและการเปลี่ยนแปลงรายเดือน" },
    filters: {
      view: "มุมมองรายงาน",
      month: "เดือนต่อเดือน",
      day: "วันต่อวัน",
      period: "ช่วงข้อมูล",
      type: "ประเภท Gatepass",
      all: "ทั้งหมด",
      search: "ค้นหารถหรือข้อมูลที่เกี่ยวข้อง",
      searchPlaceholder: "ทะเบียนรถ, บริษัท, คนขับ, เลข Gatepass...",
    },
    metrics: {
      vehicles: "รถไม่ซ้ำในช่วงนี้",
      compared: "ช่วงก่อน {{count}} คัน",
      change: "เพิ่ม / ลด",
      changeHint: "เทียบกับ {{period}}",
      approved: "TDK APPROVED",
      approvedHint: "รถที่ได้รับอนุมัติ",
      temporary: "TEMPORARY",
      temporaryHint: "รถผ่านเข้าแบบชั่วคราว",
      unspecified: "ไม่ระบุประเภท",
      unspecifiedHint: "ไฟล์ต้นทางไม่ได้ระบุ GroupName",
      noChange: "ไม่เปลี่ยนแปลง",
    },
    chart: {
      eyebrow: "Volume Trend",
      titleMonth: "แนวโน้มรถรายวันในเดือนที่เลือก",
      titleDay: "แนวโน้มรถย้อนหลัง 14 วัน",
      subtitle: "นับจำนวนรถไม่ซ้ำในแต่ละช่วง แยกตามประเภท Gatepass",
      unique: "รถไม่ซ้ำ",
      approved: "TDK APPROVED",
      temporary: "TEMPORARY",
      unspecified: "UNSPECIFIED",
    },
    compare: {
      eyebrow: "Period Comparison",
      title: "เปรียบเทียบกับช่วงก่อน",
      current: "ช่วงปัจจุบัน",
      previous: "ช่วงก่อน",
      totalRecords: "รายการ Gatepass",
      uniqueVehicles: "รถไม่ซ้ำ",
      added: "รถเพิ่ม",
      reduced: "รถลด",
      addedHint: "พบในช่วงนี้ แต่ไม่พบในช่วงก่อน",
      reducedHint: "พบในช่วงก่อน แต่ไม่พบในช่วงนี้",
      noVehicles: "ไม่มีรายการเปลี่ยนแปลง",
    },
    table: {
      eyebrow: "Gatepass Register",
      title: "รายละเอียดรถในช่วงที่เลือก",
      records: "{{count}} รายการ",
      date: "วันที่",
      plate: "ทะเบียนรถ",
      type: "ประเภท",
      gatepass: "เลข Gatepass",
      time: "เวลาเข้า–ออก",
      driver: "ผู้ขับขี่ / บริษัท",
      purpose: "วัตถุประสงค์ / ผู้ติดต่อ",
      noDataTitle: "ยังไม่มีข้อมูลรถในช่วงนี้",
      noDataHint: "นำเข้ารายงานประจำวันจากเมนู จัดการ Gatepass In-Out ใน Admin Dashboard แล้วรายงานและกราฟจะอัปเดตอัตโนมัติ",
      notSpecified: "ไม่ระบุ",
    },
    setup: {
      title: "ต้องติดตั้งฐานข้อมูล Gatepass ก่อน",
      hint: "รันไฟล์ database/20260911_gatepass_vehicle_reports.sql ใน Supabase SQL Editor แล้วกดรีเฟรช",
    },
    toast: {
      loadError: "โหลดข้อมูล Gatepass ไม่สำเร็จ",
      noExportData: "ยังไม่มีข้อมูลสำหรับส่งออก",
      exportSuccess: "สร้างรายงาน Excel สำเร็จ",
      exportError: "สร้างรายงาน Excel ไม่สำเร็จ",
    },
  },
  en: {
    page: {
      eyebrow: "Security & Administration",
      title: "Gatepass Vehicle Report",
      subtitle: "Executive reporting clearly separated between daily gate activity and monthly TDK APPROVED master-registry status.",
      live: "Gatepass Registry data",
      refreshed: "Last updated",
      refresh: "Refresh",
      export: "Export Excel",
      exporting: "Building report...",
    },
    sections: { daily: "Daily In-Out Activity", dailyHint: "Gate activity and access volume", registry: "TDK APPROVED Master Registry", registryHint: "Current fleet and monthly changes" },
    filters: {
      view: "Report view",
      month: "Month over month",
      day: "Day over day",
      period: "Reporting period",
      type: "Gatepass type",
      all: "All types",
      search: "Search vehicle details",
      searchPlaceholder: "Plate, company, driver, gatepass no...",
    },
    metrics: {
      vehicles: "Unique vehicles",
      compared: "Prior period {{count}} vehicles",
      change: "Net change",
      changeHint: "Compared with {{period}}",
      approved: "TDK APPROVED",
      approvedHint: "Approved vehicles",
      temporary: "TEMPORARY",
      temporaryHint: "Temporary vehicle access",
      unspecified: "Unspecified",
      unspecifiedHint: "No GroupName in the source file",
      noChange: "No change",
    },
    chart: {
      eyebrow: "Volume Trend",
      titleMonth: "Daily vehicle trend for selected month",
      titleDay: "Vehicle trend for the last 14 days",
      subtitle: "Unique vehicle count in each period, split by gatepass type.",
      unique: "Unique vehicles",
      approved: "TDK APPROVED",
      temporary: "TEMPORARY",
      unspecified: "UNSPECIFIED",
    },
    compare: {
      eyebrow: "Period Comparison",
      title: "Comparison with prior period",
      current: "Current period",
      previous: "Prior period",
      totalRecords: "Gatepass records",
      uniqueVehicles: "Unique vehicles",
      added: "Added vehicles",
      reduced: "Reduced vehicles",
      addedHint: "Present now but absent in the prior period",
      reducedHint: "Present in the prior period but absent now",
      noVehicles: "No vehicle changes",
    },
    table: {
      eyebrow: "Gatepass Register",
      title: "Vehicle details for selected period",
      records: "{{count}} records",
      date: "Date",
      plate: "Vehicle plate",
      type: "Type",
      gatepass: "Gatepass no.",
      time: "Entry–exit",
      driver: "Driver / company",
      purpose: "Purpose / contact",
      noDataTitle: "No vehicle data for this period",
      noDataHint: "Import the daily report from Gatepass In-Out Management in the Admin Dashboard. This report updates automatically.",
      notSpecified: "Not specified",
    },
    setup: {
      title: "Gatepass database setup is required",
      hint: "Run database/20260911_gatepass_vehicle_reports.sql in the Supabase SQL Editor, then refresh.",
    },
    toast: {
      loadError: "Unable to load Gatepass data",
      noExportData: "There is no data to export",
      exportSuccess: "Excel report created",
      exportError: "Unable to create the Excel report",
    },
  },
  ko: {
    page: {
      eyebrow: "Security & Administration",
      title: "Gatepass Vehicle Report",
      subtitle: "일일 출입 활동과 TDK APPROVED 차량 원장의 월별 현황을 구분한 경영진 보고서입니다.",
      live: "Gatepass Registry 데이터",
      refreshed: "최근 업데이트",
      refresh: "새로고침",
      export: "Excel 내보내기",
      exporting: "보고서 생성 중...",
    },
    sections: { daily: "일일 입출차", dailyHint: "Gatepass 활동 및 출입량", registry: "TDK APPROVED 차량 원장", registryHint: "현재 차량 및 월별 변경" },
    filters: { view: "보고서 보기", month: "월간 비교", day: "일간 비교", period: "보고 기간", type: "Gatepass 유형", all: "전체", search: "차량 검색", searchPlaceholder: "차량번호, 회사, 운전자, Gatepass 번호..." },
    metrics: { vehicles: "고유 차량", compared: "이전 기간 {{count}}대", change: "증감", changeHint: "{{period}} 대비", approved: "TDK APPROVED", approvedHint: "승인 차량", temporary: "TEMPORARY", temporaryHint: "임시 출입 차량", unspecified: "미지정", unspecifiedHint: "원본 파일에 GroupName 없음", noChange: "변동 없음" },
    chart: { eyebrow: "Volume Trend", titleMonth: "선택 월의 일별 차량 추이", titleDay: "최근 14일 차량 추이", subtitle: "기간별 고유 차량을 Gatepass 유형으로 구분합니다.", unique: "고유 차량", approved: "TDK APPROVED", temporary: "TEMPORARY", unspecified: "UNSPECIFIED" },
    compare: { eyebrow: "Period Comparison", title: "이전 기간 비교", current: "현재 기간", previous: "이전 기간", totalRecords: "Gatepass 기록", uniqueVehicles: "고유 차량", added: "증가 차량", reduced: "감소 차량", addedHint: "현재 기간에 새로 확인된 차량", reducedHint: "이전 기간에만 확인된 차량", noVehicles: "변경 차량 없음" },
    table: { eyebrow: "Gatepass Register", title: "선택 기간 차량 상세", records: "{{count}}건", date: "날짜", plate: "차량번호", type: "유형", gatepass: "Gatepass 번호", time: "입차–출차", driver: "운전자 / 회사", purpose: "목적 / 담당자", noDataTitle: "이 기간의 차량 데이터가 없습니다", noDataHint: "Admin Dashboard의 Gatepass In-Out 관리 메뉴에서 일일 보고서를 가져오면 자동으로 업데이트됩니다.", notSpecified: "미지정" },
    setup: { title: "Gatepass 데이터베이스 설정이 필요합니다", hint: "Supabase SQL Editor에서 database/20260911_gatepass_vehicle_reports.sql을 실행한 뒤 새로고침하세요." },
    toast: { loadError: "Gatepass 데이터를 불러올 수 없습니다", noExportData: "내보낼 데이터가 없습니다", exportSuccess: "Excel 보고서를 생성했습니다", exportError: "Excel 보고서를 생성할 수 없습니다" },
  },
};

const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKey = (date) => dateKey(date).slice(0, 7);
const parseDateKey = (value) => {
  const [year, month, day = 1] = String(value || "").split("-").map(Number);
  return new Date(year, Math.max(0, month - 1), day);
};
const shiftDays = (value, amount) => {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
};
const shiftMonths = (value, amount) => {
  const date = parseDateKey(`${String(value).slice(0, 7)}-01`);
  date.setMonth(date.getMonth() + amount);
  return monthKey(date);
};
const endOfMonthKey = (value) => {
  const date = parseDateKey(`${String(value).slice(0, 7)}-01`);
  date.setMonth(date.getMonth() + 1, 0);
  return dateKey(date);
};
const vehicleKey = (row) => `${String(row.vehicle_plate || "").trim().toUpperCase()}|${String(row.province || "").trim().toUpperCase()}`;

function uniqueVehicleMap(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = vehicleKey(row);
    if (key !== "|") map.set(key, row);
  });
  return map;
}

function filterRows(rows, type, search) {
  const needle = String(search || "").trim().toLowerCase();
  return rows.filter((row) => {
    if (type !== "ALL" && row.pass_type !== type) return false;
    if (!needle) return true;
    return [row.vehicle_plate, row.province, row.driver_name, row.company_name, row.gatepass_number, row.contact_person, row.department, row.purpose, row.telephone_number, row.source_group_name]
      .some((value) => String(value || "").toLowerCase().includes(needle));
  });
}

function formatTime(value) {
  return String(value || "").slice(0, 5) || "-";
}

function MetricCard({ icon: Icon, label, value, hint, tone = "blue", change = 0 }) {
  const tones = {
    blue: "bg-[#102a56]",
    green: "bg-emerald-600",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    slate: "bg-slate-400",
  };
  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${tones[tone]}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon size={17} /></div>
        {change !== 0 ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${change > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {change > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{change > 0 ? "+" : ""}{change}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{hint}</p>
    </article>
  );
}

export default function GatepassReportPage({ dailyOnly = false, embedded = false } = {}) {
  const { tt, language } = useScopedI18n(COPY);
  const realtimeRefreshRef = useRef(null);
  const today = useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(monthKey(today));
  const [selectedDate, setSelectedDate] = useState(dateKey(today));
  const [passType, setPassType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [preparedBy, setPreparedBy] = useState("TDK");
  const [reportSection, setReportSection] = useState("daily");

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(language === "th" ? "th-TH" : language === "ko" ? "ko-KR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }), [language]);
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(language === "th" ? "th-TH" : language === "ko" ? "ko-KR" : "en-GB", { month: "long", year: "numeric" }), [language]);
  const dateTimeFormatter = useMemo(() => new Intl.DateTimeFormat(language === "th" ? "th-TH" : language === "ko" ? "ko-KR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }), [language]);
  const formatPeriod = useCallback((value, mode = viewMode) => mode === "month" ? monthFormatter.format(parseDateKey(`${String(value).slice(0, 7)}-01`)) : dateFormatter.format(parseDateKey(value)), [dateFormatter, monthFormatter, viewMode]);

  const range = useMemo(() => {
    if (viewMode === "month") return { from: `${shiftMonths(selectedMonth, -1)}-01`, to: endOfMonthKey(selectedMonth) };
    return { from: shiftDays(selectedDate, -13), to: selectedDate };
  }, [selectedDate, selectedMonth, viewMode]);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      setSchemaMissing(false);
      const [records, sessionResult] = await Promise.all([
        fetchGatepassVehicleRecords(range),
        supabase.auth.getSession(),
      ]);
      setRows(records);
      setUpdatedAt(new Date());
      const session = sessionResult?.data?.session;
      if (session?.user?.id) {
        const { data: profile } = await supabase.from("profiles").select("full_name, employee_code").eq("id", session.user.id).maybeSingle();
        setPreparedBy(profile?.full_name || profile?.employee_code || session.user.email || "TDK");
      }
    } catch (err) {
      if (isGatepassSchemaMissing(err)) setSchemaMissing(true);
      else {
        setError(err?.message || tt("toast.loadError"));
        if (!silent) toast.error(tt("toast.loadError"));
      }
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [range, tt]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const scheduleRefresh = () => {
      window.clearTimeout(realtimeRefreshRef.current);
      realtimeRefreshRef.current = window.setTimeout(() => void loadData({ silent: true }), 800);
    };
    const channel = supabase
      .channel("gatepass-report-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "gatepass_vehicle_records" }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "gatepass_import_batches" }, scheduleRefresh)
      .subscribe();
    return () => {
      window.clearTimeout(realtimeRefreshRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const report = useMemo(() => {
    const currentPeriodKey = viewMode === "month" ? selectedMonth : selectedDate;
    const previousPeriodKey = viewMode === "month" ? shiftMonths(selectedMonth, -1) : shiftDays(selectedDate, -1);
    const matchesPeriod = (row, key) => viewMode === "month" ? String(row.visit_date || "").startsWith(key) : row.visit_date === key;
    const currentRows = filterRows(rows.filter((row) => matchesPeriod(row, currentPeriodKey)), passType, search);
    const previousRows = filterRows(rows.filter((row) => matchesPeriod(row, previousPeriodKey)), passType, search);
    const currentMap = uniqueVehicleMap(currentRows);
    const previousMap = uniqueVehicleMap(previousRows);
    const approvedRows = currentRows.filter((row) => row.pass_type === "TDK_APPROVED");
    const temporaryRows = currentRows.filter((row) => row.pass_type === "TEMPORARY");
    const unspecifiedRows = currentRows.filter((row) => row.pass_type === "UNSPECIFIED");
    const added = [...currentMap.entries()].filter(([key]) => !previousMap.has(key)).map(([, row]) => ({ plate: [row.vehicle_plate, row.province].filter(Boolean).join(" "), passType: row.pass_type }));
    const reduced = [...previousMap.entries()].filter(([key]) => !currentMap.has(key)).map(([, row]) => ({ plate: [row.vehicle_plate, row.province].filter(Boolean).join(" "), passType: row.pass_type }));
    const trendKeys = [];
    if (viewMode === "month") {
      const end = Number(endOfMonthKey(selectedMonth).slice(-2));
      for (let day = 1; day <= end; day += 1) trendKeys.push(`${selectedMonth}-${pad(day)}`);
    } else {
      for (let offset = -13; offset <= 0; offset += 1) trendKeys.push(shiftDays(selectedDate, offset));
    }
    const trend = trendKeys.map((key) => {
      const dayRows = filterRows(rows.filter((row) => row.visit_date === key), passType, search);
      return {
        key,
        label: dateFormatter.format(parseDateKey(key)).replace(/\s\d{4}$/, ""),
        unique: uniqueVehicleMap(dayRows).size,
        approved: uniqueVehicleMap(dayRows.filter((row) => row.pass_type === "TDK_APPROVED")).size,
        temporary: uniqueVehicleMap(dayRows.filter((row) => row.pass_type === "TEMPORARY")).size,
        unspecified: uniqueVehicleMap(dayRows.filter((row) => row.pass_type === "UNSPECIFIED")).size,
        total: dayRows.length,
      };
    });
    const currentVehicles = currentMap.size;
    const previousVehicles = previousMap.size;
    return {
      currentRows,
      previousRows,
      currentVehicles,
      previousVehicles,
      difference: currentVehicles - previousVehicles,
      approved: uniqueVehicleMap(approvedRows).size,
      temporary: uniqueVehicleMap(temporaryRows).size,
      unspecified: uniqueVehicleMap(unspecifiedRows).size,
      added,
      reduced,
      trend,
      currentPeriodKey,
      previousPeriodKey,
    };
  }, [dateFormatter, passType, rows, search, selectedDate, selectedMonth, viewMode]);

  const periodLabel = formatPeriod(report.currentPeriodKey);
  const compareLabel = formatPeriod(report.previousPeriodKey);
  const handleExport = async () => {
    if (!report.currentRows.length) {
      toast.error(tt("toast.noExportData"));
      return;
    }
    try {
      setExporting(true);
      await downloadGatepassReport({
        language,
        rows: report.currentRows,
        summary: { currentVehicles: report.currentVehicles, previousVehicles: report.previousVehicles, difference: report.difference, totalRecords: report.currentRows.length },
        typeSummary: [
          { label: "TDK APPROVED", current: report.approved, previous: uniqueVehicleMap(report.previousRows.filter((row) => row.pass_type === "TDK_APPROVED")).size },
          { label: "TEMPORARY", current: report.temporary, previous: uniqueVehicleMap(report.previousRows.filter((row) => row.pass_type === "TEMPORARY")).size },
          { label: "UNSPECIFIED", current: report.unspecified, previous: uniqueVehicleMap(report.previousRows.filter((row) => row.pass_type === "UNSPECIFIED")).size },
        ],
        trend: report.trend,
        changes: { added: report.added, reduced: report.reduced },
        context: { periodLabel, compareLabel, periodKey: report.currentPeriodKey, preparedBy },
      });
      toast.success(tt("toast.exportSuccess"));
    } catch (err) {
      console.error("Gatepass Excel export failed", err);
      toast.error(tt("toast.exportError"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {!embedded ? <ReportsTopbar currentUser={null} /> : null}
      {!embedded ? <GatepassExecutiveTabs /> : null}
      <main className="space-y-4">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700"><ShieldCheck size={14} />{tt("page.eyebrow")}</div>
              <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{dailyOnly ? tt("sections.daily") : tt("page.title")}</h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">{dailyOnly ? tt("sections.dailyHint") : tt("page.subtitle")}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-500" />{tt("page.live")}</span>
                <span>{tt("page.refreshed")}: {updatedAt ? dateTimeFormatter.format(updatedAt) : "-"}</span>
                {reportSection === "daily" ? <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{report.currentRows.length} {tt("compare.totalRecords")}</span> : <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">TDK APPROVED MASTER</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {reportSection === "daily" ? <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />{tt("page.refresh")}</button> : null}
              {reportSection === "daily" ? <button type="button" onClick={() => void handleExport()} disabled={exporting || loading || !report.currentRows.length} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#102a56] px-3.5 text-xs font-bold text-white transition hover:bg-[#183b73] disabled:cursor-not-allowed disabled:opacity-50"><Download size={14} />{exporting ? tt("page.exporting") : tt("page.export")}</button> : null}
            </div>
          </div>
          {reportSection === "daily" ? <div className="grid gap-3 border-t border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2 xl:grid-cols-[auto_180px_180px_minmax(220px,1fr)] sm:px-5">
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{tt("filters.view")}</span>
              <div className="inline-flex h-10 rounded-xl border border-slate-300 bg-white p-1">
                {["month", "day"].map((mode) => <button key={mode} type="button" onClick={() => setViewMode(mode)} className={`rounded-lg px-3 text-xs font-bold transition ${viewMode === mode ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>{tt(`filters.${mode}`)}</button>)}
              </div>
            </div>
            <label><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{tt("filters.period")}</span><span className="relative block"><CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type={viewMode === "month" ? "month" : "date"} value={viewMode === "month" ? selectedMonth : selectedDate} onChange={(event) => { if (!event.target.value) return; if (viewMode === "month") setSelectedMonth(event.target.value); else setSelectedDate(event.target.value); }} className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></span></label>
            <label><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{tt("filters.type")}</span><select value={passType} onChange={(event) => setPassType(event.target.value)} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="ALL">{tt("filters.all")}</option><option value="TDK_APPROVED">TDK APPROVED</option><option value="TEMPORARY">TEMPORARY</option><option value="UNSPECIFIED">{tt("metrics.unspecified")}</option></select></label>
            <label><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{tt("filters.search")}</span><span className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tt("filters.searchPlaceholder")} className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></span></label>
          </div> : null}
        </section>

        {!dailyOnly ? <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_5px_22px_rgba(15,23,42,0.04)] md:grid-cols-2">
          <button type="button" onClick={() => setReportSection("daily")} className={`flex min-h-16 items-center gap-3 rounded-xl px-4 text-left transition ${reportSection === "daily" ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${reportSection === "daily" ? "bg-white/15" : "bg-blue-50 text-blue-700"}`}><CarFront size={20} /></span><span><strong className="block text-sm font-bold">{tt("sections.daily")}</strong><small className={`mt-0.5 block text-[11px] ${reportSection === "daily" ? "text-blue-100" : "text-slate-400"}`}>{tt("sections.dailyHint")}</small></span></button>
          <button type="button" onClick={() => setReportSection("registry")} className={`flex min-h-16 items-center gap-3 rounded-xl px-4 text-left transition ${reportSection === "registry" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${reportSection === "registry" ? "bg-white/15" : "bg-emerald-50 text-emerald-700"}`}><ShieldCheck size={20} /></span><span><strong className="block text-sm font-bold">{tt("sections.registry")}</strong><small className={`mt-0.5 block text-[11px] ${reportSection === "registry" ? "text-emerald-100" : "text-slate-400"}`}>{tt("sections.registryHint")}</small></span></button>
        </section> : null}

        {!dailyOnly && reportSection === "registry" ? <TdkApprovedRegistryReportSection /> : <>
        {schemaMissing ? <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"><p className="font-bold text-amber-900">{tt("setup.title")}</p><p className="mt-1 text-sm text-amber-700">{tt("setup.hint")}</p></section> : null}
        {error ? <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-800">{error}</section> : null}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <MetricCard icon={CarFront} label={tt("metrics.vehicles")} value={report.currentVehicles} hint={tt("metrics.compared", { count: report.previousVehicles })} tone="blue" />
          <MetricCard icon={report.difference < 0 ? ArrowDownRight : ArrowUpRight} label={tt("metrics.change")} value={`${report.difference > 0 ? "+" : ""}${report.difference}`} hint={tt("metrics.changeHint", { period: compareLabel })} tone={report.difference < 0 ? "rose" : report.difference > 0 ? "green" : "slate"} />
          <MetricCard icon={ShieldCheck} label={tt("metrics.approved")} value={report.approved} hint={tt("metrics.approvedHint")} tone="green" />
          <MetricCard icon={FileSpreadsheet} label={tt("metrics.temporary")} value={report.temporary} hint={tt("metrics.temporaryHint")} tone="amber" />
          <MetricCard icon={AlertTriangle} label={tt("metrics.unspecified")} value={report.unspecified} hint={tt("metrics.unspecifiedHint")} tone="slate" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">{tt("chart.eyebrow")}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{tt(viewMode === "month" ? "chart.titleMonth" : "chart.titleDay")}</h2><p className="mt-1 text-xs text-slate-500">{tt("chart.subtitle")}</p></div>
            <div className="h-[320px] p-3 sm:p-5">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={report.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={viewMode === "month" ? 2 : 0} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} /><Bar dataKey="approved" name={tt("chart.approved")} stackId="vehicles" fill="#2b59b0" radius={[4, 4, 0, 0]} /><Bar dataKey="temporary" name={tt("chart.temporary")} stackId="vehicles" fill="#d97706" radius={[4, 4, 0, 0]} /><Bar dataKey="unspecified" name={tt("chart.unspecified")} stackId="vehicles" fill="#94a3b8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
            </div>
          </article>
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">{tt("compare.eyebrow")}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{tt("compare.title")}</h2></div>
            <div className="space-y-4 p-5">
              {[{ label: periodLabel, tone: "bg-blue-700", rows: report.currentRows, vehicles: report.currentVehicles }, { label: compareLabel, tone: "bg-slate-400", rows: report.previousRows, vehicles: report.previousVehicles }].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-slate-700">{item.label}</p><span className={`h-2.5 w-2.5 rounded-full ${item.tone}`} /></div><div className="mt-3 grid grid-cols-2 gap-3"><div><p className="text-[10px] text-slate-500">{tt("compare.uniqueVehicles")}</p><p className="mt-1 text-2xl font-bold text-slate-950">{item.vehicles}</p></div><div><p className="text-[10px] text-slate-500">{tt("compare.totalRecords")}</p><p className="mt-1 text-2xl font-bold text-slate-950">{item.rows.length}</p></div></div></div>)}
              <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-[10px] font-semibold text-emerald-700">{tt("compare.added")}</p><p className="mt-1 text-2xl font-bold text-emerald-800">+{report.added.length}</p></div><div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="text-[10px] font-semibold text-rose-700">{tt("compare.reduced")}</p><p className="mt-1 text-2xl font-bold text-rose-800">-{report.reduced.length}</p></div></div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {[{ title: tt("compare.added"), hint: tt("compare.addedHint"), rows: report.added, tone: "emerald" }, { title: tt("compare.reduced"), hint: tt("compare.reducedHint"), rows: report.reduced, tone: "rose" }].map((group) => <article key={group.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_5px_22px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{group.title}</h3><p className="mt-1 text-xs text-slate-500">{group.hint}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${group.tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{group.rows.length}</span></div><div className="mt-4 flex max-h-32 flex-wrap gap-2 overflow-y-auto">{group.rows.length ? group.rows.map((item) => <span key={`${group.title}-${item.plate}`} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700">{item.plate}<small className="ml-2 text-[9px] text-slate-400">{item.passType}</small></span>) : <p className="text-xs text-slate-400">{tt("compare.noVehicles")}</p>}</div></article>)}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-end justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">{tt("table.eyebrow")}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{tt("table.title")}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">{tt("table.records", { count: report.currentRows.length })}</span></div>
          {report.currentRows.length ? <div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{["date", "plate", "type", "gatepass", "time", "driver", "purpose"].map((key) => <th key={key} className="border-b border-slate-200 px-4 py-3 font-bold">{tt(`table.${key}`)}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.currentRows.map((row) => <tr key={row.id} className="transition hover:bg-blue-50/40"><td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{dateFormatter.format(parseDateKey(row.visit_date))}</td><td className="px-4 py-3"><p className="font-bold text-slate-950">{row.vehicle_plate}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.province || row.vehicle_type || "-"}</p></td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${row.pass_type === "TEMPORARY" ? "bg-amber-50 text-amber-700" : row.pass_type === "UNSPECIFIED" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{row.pass_type}</span><p className="mt-1 text-[9px] text-slate-400">{row.source_group_name || "-"}</p></td><td className="px-4 py-3 font-mono text-[11px] text-slate-600">{row.gatepass_number || "-"}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatTime(row.entry_time)} – {row.exit_date && row.exit_date !== row.visit_date ? `${row.exit_date} ` : ""}{formatTime(row.exit_time)}</td><td className="px-4 py-3"><p className="font-semibold text-slate-700">{row.driver_name || tt("table.notSpecified")}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.company_name || "-"}</p></td><td className="px-4 py-3"><p className="max-w-[260px] truncate font-semibold text-slate-700">{row.purpose || tt("table.notSpecified")}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.contact_person || row.telephone_number || row.department || "-"}</p></td></tr>)}</tbody></table></div> : <div className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><CarFront size={23} /></div><p className="mt-3 font-bold text-slate-700">{tt("table.noDataTitle")}</p><p className="mt-1 max-w-lg text-xs leading-5 text-slate-500">{tt("table.noDataHint")}</p></div>}
        </section>
        </>}
      </main>
    </>
  );
}
