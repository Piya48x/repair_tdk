import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  Building2,
  CarFront,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { supabase } from "../../lib/supabaseClient";
import { fetchGatepassVehicleRecords, isGatepassSchemaMissing } from "../../services/gatepassReportService";
import {
  fetchTdkApprovedRegistry,
  fetchTdkApprovedRegistryChanges,
  isTdkApprovedRegistrySchemaError,
} from "../it-dashboard/services/tdkApprovedRegistryService";
import { downloadTdkApprovedMonthlyReport } from "./tdkApprovedRegistryExcelExport";

const COPY = {
  th: {
    eyebrow: "Gatepass Control Center",
    title: "ภาพรวมทั้งหมด",
    subtitle: "สรุปสถานะรถ TDK APPROVED และข้อมูลย่อรถเข้า–ออกล่าสุดในหน้าเดียว",
    month: "เดือนรายงาน",
    refresh: "รีเฟรช",
    export: "Export",
    exportHint: "เลือกภาษารายงาน",
    exportThai: "ภาษาไทย (TH)",
    exportKorean: "ภาษาเกาหลี (KO)",
    exportEnglish: "English (EN)",
    active: "ทะเบียน TDK Approved",
    activeHint: "ทะเบียนที่ใช้งานอยู่",
    entryToday: "รถเข้าวันนี้",
    exitToday: "รถออกวันนี้",
    inside: "รถยังอยู่ภายใน",
    insideHint: "เข้าวันนี้และยังไม่บันทึกเวลาออก",
    added: "เพิ่มเดือนนี้",
    removed: "ถอดออกเดือนนี้",
    companies: "บริษัทที่ลงทะเบียน",
    vehicles: "คัน",
    entries: "เข้า {{count}}",
    exits: "ออก {{count}}",
    trend: "แนวโน้มรถเข้า–ออกย้อนหลัง 7 วัน",
    trendHint: "เปรียบเทียบจำนวนรายการเข้าและออกในแต่ละวัน",
    gatepassTrend: "รถเข้า",
    registryTrend: "รถออก",
    activity: "Gatepass Activity วันนี้",
    unique: "รถไม่ซ้ำ",
    peak: "ช่วงเวลาหนาแน่น",
    noPeak: "ยังไม่มีข้อมูลเวลาเข้า",
    registrySummary: "สถานะ TDK APPROVED",
    registrySummaryHint: "ทะเบียนหลักและสถานะรถที่ผ่านประตูวันนี้",
    approvedToday: "รถอนุมัติที่เข้าวันนี้",
    temporaryToday: "TEMPORARY วันนี้",
    otherToday: "ไม่พบในทะเบียนหลัก",
    latestActivity: "รายการเข้า–ออกล่าสุด",
    latestActivityHint: "5 รายการล่าสุดจากข้อมูลย้อนหลัง 7 วัน",
    noActivity: "ยังไม่มีข้อมูลรถเข้า–ออกในช่วง 7 วันล่าสุด",
    viewAll: "ดูทั้งหมด",
    time: "เวลาเข้า–ออก",
    status: "สถานะ",
    detail: "ผู้ขับขี่ / บริษัท",
    gate: "ประตู",
    approved: "TDK APPROVED",
    temporary: "TEMPORARY",
    unregistered: "ไม่อยู่ในทะเบียนหลัก",
    companyTitle: "Vehicles by Company",
    companyHint: "บริษัทที่มีรถลงทะเบียนมากที่สุด",
    changes: "Monthly Change Log",
    changesHint: "รายการเพิ่ม ถอด และแก้ไขในเดือนที่เลือก",
    noChanges: "เดือนนี้ยังไม่มีการเปลี่ยนแปลงทะเบียน",
    date: "วันที่",
    plate: "ทะเบียน",
    company: "บริษัท",
    action: "การเปลี่ยนแปลง",
    listTitle: "รายการ {{label}}",
    listHint: "กดการ์ดสรุปเพื่อเปลี่ยนกลุ่มรายการทะเบียน",
    clickToView: "กดเพื่อดูรายการ",
    closeList: "ปิดรายการ",
    noKpiRows: "ไม่พบรายการทะเบียนในกลุ่มนี้",
    activeStatus: "ใช้งาน",
    unspecifiedCompany: "ไม่ระบุบริษัท",
    changeAdded: "เพิ่ม",
    changeReactivated: "เปิดใช้งานอีกครั้ง",
    changeRemoved: "ถอดออก",
    changeUpdated: "แก้ไข",
    error: "โหลดข้อมูล Gatepass Overview ไม่สำเร็จ",
    setup: "กรุณารัน SQL Gatepass เวอร์ชันล่าสุดก่อนใช้งานรายงาน",
  },
  en: {
    eyebrow: "Gatepass Control Center",
    title: "All Overview",
    subtitle: "TDK APPROVED status and a concise view of the latest vehicle movements.",
    month: "Reporting month",
    refresh: "Refresh",
    export: "Export",
    exportHint: "Choose report language",
    exportThai: "Thai (TH)",
    exportKorean: "Korean (KO)",
    exportEnglish: "English (EN)",
    active: "TDK Approved registry",
    activeHint: "Active master records",
    entryToday: "Vehicles in today",
    exitToday: "Vehicles out today",
    inside: "Vehicles still inside",
    insideHint: "Entered today with no exit recorded",
    added: "Added this month",
    removed: "Removed this month",
    companies: "Registered companies",
    vehicles: "vehicles",
    entries: "In {{count}}",
    exits: "Out {{count}}",
    trend: "7-day vehicle in–out trend",
    trendHint: "Daily entry and exit records for the latest seven days.",
    gatepassTrend: "Entries",
    registryTrend: "Exits",
    activity: "Gatepass Activity Today",
    unique: "Unique vehicles",
    peak: "Peak entry time",
    noPeak: "No entry-time data",
    registrySummary: "TDK APPROVED status",
    registrySummaryHint: "Master registry and today's gate activity",
    approvedToday: "Approved vehicles today",
    temporaryToday: "TEMPORARY today",
    otherToday: "Not in master registry",
    latestActivity: "Latest vehicle activity",
    latestActivityHint: "The five latest records from the past seven days",
    noActivity: "No vehicle activity recorded in the past seven days",
    viewAll: "View all",
    time: "Entry–exit",
    status: "Status",
    detail: "Driver / company",
    gate: "Gate",
    approved: "TDK APPROVED",
    temporary: "TEMPORARY",
    unregistered: "Not in master registry",
    companyTitle: "Vehicles by Company",
    companyHint: "Companies with the largest registered fleets",
    changes: "Monthly Change Log",
    changesHint: "Adds, removals, and updates in the selected month",
    noChanges: "No registry changes in this month.",
    date: "Date",
    plate: "Plate",
    company: "Company",
    action: "Change",
    listTitle: "{{label}} list",
    listHint: "Select another summary card to change the vehicle list.",
    clickToView: "Click to view records",
    closeList: "Close list",
    noKpiRows: "No vehicle records in this group.",
    activeStatus: "Active",
    unspecifiedCompany: "Unspecified",
    changeAdded: "Added",
    changeReactivated: "Reactivated",
    changeRemoved: "Removed",
    changeUpdated: "Updated",
    error: "Unable to load the Gatepass overview",
    setup: "Run the latest Gatepass SQL before using this report.",
  },
  ko: {
    eyebrow: "Gatepass 관제 센터",
    title: "전체 현황",
    subtitle: "TDK APPROVED 등록 현황과 최신 차량 출입 정보를 한 화면에서 확인합니다.",
    month: "보고 월",
    refresh: "새로고침",
    export: "내보내기",
    exportHint: "보고서 언어 선택",
    exportThai: "태국어 (TH)",
    exportKorean: "한국어 (KO)",
    exportEnglish: "영어 (EN)",
    active: "TDK Approved 등록 차량",
    activeHint: "현재 사용 중인 등록 차량",
    entryToday: "오늘 입차",
    exitToday: "오늘 출차",
    inside: "현재 내부 차량",
    insideHint: "오늘 입차 후 출차 시간이 없는 차량",
    added: "이번 달 추가",
    removed: "이번 달 해제",
    companies: "등록 업체",
    vehicles: "대",
    entries: "입차 {{count}}",
    exits: "출차 {{count}}",
    trend: "최근 7일 차량 출입 추이",
    trendHint: "날짜별 입차 및 출차 건수를 비교합니다.",
    gatepassTrend: "입차",
    registryTrend: "출차",
    activity: "오늘 Gatepass 활동",
    unique: "고유 차량",
    peak: "입차 집중 시간",
    noPeak: "입차 시간 정보 없음",
    registrySummary: "TDK APPROVED 현황",
    registrySummaryHint: "등록 차량과 오늘 출입 상태",
    approvedToday: "오늘 입차한 승인 차량",
    temporaryToday: "오늘 TEMPORARY 차량",
    otherToday: "등록되지 않은 차량",
    latestActivity: "최근 차량 출입 내역",
    latestActivityHint: "최근 7일 중 최신 5건",
    noActivity: "최근 7일간 차량 출입 내역이 없습니다.",
    viewAll: "전체 보기",
    time: "입차–출차 시간",
    status: "상태",
    detail: "운전자 / 업체",
    gate: "게이트",
    approved: "TDK APPROVED",
    temporary: "TEMPORARY",
    unregistered: "등록되지 않음",
    companyTitle: "업체별 등록 차량",
    companyHint: "등록 차량이 많은 업체 순으로 표시합니다.",
    changes: "월간 변경 내역",
    changesHint: "선택한 달의 추가, 해제 및 수정 내역",
    noChanges: "이번 달에는 등록 정보 변경이 없습니다.",
    date: "날짜",
    plate: "차량 번호",
    company: "업체",
    action: "변경 내용",
    listTitle: "{{label}} 목록",
    listHint: "다른 요약 카드를 선택하면 차량 목록이 변경됩니다.",
    clickToView: "목록 보기",
    closeList: "목록 닫기",
    noKpiRows: "이 그룹에 해당하는 차량이 없습니다.",
    activeStatus: "사용 중",
    unspecifiedCompany: "업체 미지정",
    changeAdded: "추가",
    changeReactivated: "재활성화",
    changeRemoved: "해제",
    changeUpdated: "수정",
    error: "Gatepass 전체 현황을 불러오지 못했습니다.",
    setup: "보고서를 사용하기 전에 최신 Gatepass SQL을 실행해 주세요.",
  },
};

const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKey = (date) => dateKey(date).slice(0, 7);
const shiftDay = (date, amount) => {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount);
  return shifted;
};
const monthBounds = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return { from: `${month}-01`, to: `${month}-${pad(new Date(year, monthNumber, 0).getDate())}` };
};
const plateKey = (value) => String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "");
const formatTime = (value) => String(value || "").slice(0, 5) || "-";

const CHANGE_STYLE = {
  ADDED: "bg-emerald-50 text-emerald-700",
  REACTIVATED: "bg-emerald-50 text-emerald-700",
  REMOVED: "bg-rose-50 text-rose-700",
  UPDATED: "bg-amber-50 text-amber-800",
};
const CHANGE_LABEL_KEY = {
  ADDED: "changeAdded",
  REACTIVATED: "changeReactivated",
  REMOVED: "changeRemoved",
  UPDATED: "changeUpdated",
};

function KpiCard({ icon: Icon, label, value, detail, accent = "navy", selected = false, onClick, viewHint }) {
  const accents = {
    navy: "border-blue-200 bg-blue-50/60 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
    rose: "border-rose-200 bg-rose-50/60 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`group flex min-h-[76px] w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${accents[accent]} ${selected ? "ring-2 ring-[#214f91] ring-offset-1 shadow-md" : "shadow-sm"}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/90 shadow-sm"><Icon size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</p>
        <div className="mt-0.5 flex items-end justify-between gap-2">
          <p className="text-[22px] font-bold leading-none tracking-tight text-slate-950">{value}</p>
          <ChevronRight size={13} className={`mb-0.5 shrink-0 transition-transform ${selected ? "rotate-90 text-[#214f91]" : "text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#214f91]"}`} />
        </div>
        <p className="mt-1 truncate text-[9px] text-slate-500" title={`${detail} · ${viewHint}`}>{detail} · {viewHint}</p>
      </div>
    </button>
  );
}

export default function GatepassExecutiveOverviewPage() {
  const { language, tt } = useScopedI18n(COPY);
  const realtimeRef = useRef(null);
  const exportMenuRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [weekRows, setWeekRows] = useState([]);
  const [todayRows, setTodayRows] = useState([]);
  const [registry, setRegistry] = useState([]);
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState("");
  const [selectedKpi, setSelectedKpi] = useState("");

  const locale = language === "th" ? "th-TH" : language === "ko" ? "ko-KR" : "en-GB";
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }), [locale]);
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" }), [locale]);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const currentDate = new Date();
      const today = dateKey(currentDate);
      const weekRange = { from: dateKey(shiftDay(currentDate, -6)), to: today };
      const [weekData, todayData, registryData, changeData] = await Promise.all([
        fetchGatepassVehicleRecords(weekRange),
        fetchGatepassVehicleRecords({ from: today, to: today }),
        fetchTdkApprovedRegistry({ includeInactive: true }),
        fetchTdkApprovedRegistryChanges(monthBounds(selectedMonth)),
      ]);
      setWeekRows(weekData);
      setTodayRows(todayData);
      setRegistry(registryData);
      setChanges(changeData);
      setSchemaMissing(false);
      setError("");
    } catch (loadError) {
      console.error("Load Gatepass executive overview failed", loadError);
      if (isGatepassSchemaMissing(loadError) || isTdkApprovedRegistrySchemaError(loadError)) setSchemaMissing(true);
      else setError(loadError?.message || tt("error"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedMonth, tt]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    if (!exportMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!exportMenuRef.current?.contains(event.target)) setExportMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setExportMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [exportMenuOpen]);

  useEffect(() => {
    const schedule = () => {
      window.clearTimeout(realtimeRef.current);
      realtimeRef.current = window.setTimeout(() => void loadData({ silent: true }), 800);
    };
    const channel = supabase.channel("gatepass-executive-overview-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "gatepass_import_batches" }, schedule)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tdk_approved_registry_imports" }, schedule)
      .subscribe();
    return () => {
      window.clearTimeout(realtimeRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const activeRegistry = useMemo(() => registry.filter((row) => row.is_active), [registry]);
  const selectedChanges = useMemo(() => changes.filter((row) => String(row.change_date || "").startsWith(selectedMonth) && row.change_type !== "BASELINE"), [changes, selectedMonth]);
  const entriesToday = useMemo(() => todayRows.filter((row) => row.entry_time).length, [todayRows]);
  const exitsToday = useMemo(() => todayRows.filter((row) => row.exit_time).length, [todayRows]);
  const insideToday = useMemo(() => todayRows.filter((row) => row.entry_time && !row.exit_time).length, [todayRows]);
  const approvedPlateSet = useMemo(() => new Set(activeRegistry.map((row) => plateKey(row.vehicle_plate)).filter(Boolean)), [activeRegistry]);
  const kpiRows = useMemo(() => ({
    entryToday: todayRows.filter((row) => row.entry_time),
    exitToday: todayRows.filter((row) => row.exit_time),
    inside: todayRows.filter((row) => row.entry_time && !row.exit_time),
    active: activeRegistry,
  }), [activeRegistry, todayRows]);
  const selectedKpiRows = selectedKpi ? kpiRows[selectedKpi] || [] : [];

  const recentActivity = useMemo(() => [...weekRows]
    .sort((left, right) => `${right.visit_date || ""} ${right.entry_time || ""} ${right.id || ""}`.localeCompare(`${left.visit_date || ""} ${left.entry_time || ""} ${left.id || ""}`))
    .slice(0, 4), [weekRows]);

  const unspecifiedCompany = tt("unspecifiedCompany");
  const companies = useMemo(() => {
    const map = new Map();
    activeRegistry.forEach((row) => {
      const name = String(row.company_name || unspecifiedCompany).trim() || unspecifiedCompany;
      map.set(name, (map.get(name) || 0) + 1);
    });
    return [...map.entries()].map(([company, vehicles]) => ({ company, vehicles })).sort((a, b) => b.vehicles - a.vehicles);
  }, [activeRegistry, unspecifiedCompany]);

  const trend = useMemo(() => {
    const currentDate = new Date();
    return Array.from({ length: 7 }, (_, index) => shiftDay(currentDate, index - 6)).map((day) => {
      const key = dateKey(day);
      return {
        date: key,
        label: weekdayFormatter.format(day),
        gatepass: weekRows.filter((row) => row.visit_date === key && row.entry_time).length,
        registry: weekRows.filter((row) => (row.exit_date || row.visit_date) === key && row.exit_time).length,
      };
    });
  }, [weekRows, weekdayFormatter]);

  const metrics = useMemo(() => ({
    active: activeRegistry.length,
    companies: companies.length,
  }), [activeRegistry.length, companies.length]);

  const handleExport = async (exportLanguage) => {
    setExportMenuOpen(false);
    setExporting(true);
    try {
      await downloadTdkApprovedMonthlyReport({ language: exportLanguage, month: selectedMonth, registry: activeRegistry, changes: selectedChanges });
      toast.success(language === "th" ? "สร้างรายงานทะเบียนรถสำเร็จ" : language === "ko" ? "차량 등록 보고서를 생성했습니다." : "Registry report created");
    } catch (exportError) {
      console.error("Export Gatepass overview failed", exportError);
      toast.error(exportError?.message || (language === "ko" ? "내보내기에 실패했습니다." : "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <ReportsTopbar currentUser={null} />
      <main className="space-y-3">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
          <div className="h-0.5 bg-[#214f91]" />
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#214f91]"><ShieldCheck size={13} />{tt("eyebrow")}</div>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{tt("title")}</h1>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{tt("subtitle")}</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label><span className="mb-1 block text-[10px] font-semibold text-slate-500">{tt("month")}</span><input type="month" value={selectedMonth} onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-[#2b59b0]" /></label>
              <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />{tt("refresh")}</button>
              <div ref={exportMenuRef} className="relative z-30">
                <button type="button" onClick={() => setExportMenuOpen((current) => !current)} aria-haspopup="menu" aria-expanded={exportMenuOpen} disabled={exporting || !activeRegistry.length} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#102a56] px-3.5 text-xs font-bold text-white hover:bg-[#183b73] disabled:opacity-50">{exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{tt("export")}<ChevronDown size={13} className={`transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} /></button>
                {exportMenuOpen ? <div role="menu" aria-label={tt("exportHint")} className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10">
                  <p className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{tt("exportHint")}</p>
                  {[["th", "TH", "exportThai"], ["ko", "KO", "exportKorean"], ["en", "EN", "exportEnglish"]].map(([code, badge, labelKey]) => <button key={code} type="button" role="menuitem" onClick={() => void handleExport(code)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100"><span className="flex h-6 w-7 items-center justify-center rounded bg-slate-100 text-[9px] font-black text-[#173f70]">{badge}</span>{tt(labelKey)}</button>)}
                </div> : null}
              </div>
            </div>
          </div>
        </section>

        {schemaMissing ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{tt("setup")}</section> : null}
        {error ? <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</section> : null}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={LogIn} label={tt("entryToday")} value={entriesToday.toLocaleString()} detail={dateFormatter.format(new Date())} accent="emerald" selected={selectedKpi === "entryToday"} onClick={() => setSelectedKpi((current) => current === "entryToday" ? "" : "entryToday")} viewHint={tt("clickToView")} />
          <KpiCard icon={LogOut} label={tt("exitToday")} value={exitsToday.toLocaleString()} detail={dateFormatter.format(new Date())} accent="rose" selected={selectedKpi === "exitToday"} onClick={() => setSelectedKpi((current) => current === "exitToday" ? "" : "exitToday")} viewHint={tt("clickToView")} />
          <KpiCard icon={Clock3} label={tt("inside")} value={insideToday.toLocaleString()} detail={tt("insideHint")} accent="slate" selected={selectedKpi === "inside"} onClick={() => setSelectedKpi((current) => current === "inside" ? "" : "inside")} viewHint={tt("clickToView")} />
          <KpiCard icon={ShieldCheck} label={tt("active")} value={metrics.active.toLocaleString()} detail={tt("activeHint")} accent="navy" selected={selectedKpi === "active"} onClick={() => setSelectedKpi((current) => current === "active" ? "" : "active")} viewHint={tt("clickToView")} />
        </section>

        {selectedKpi ? <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-4 py-3.5 sm:px-5">
            <div><h2 className="text-sm font-bold text-slate-900">{tt("listTitle", { label: tt(selectedKpi) })}</h2><p className="mt-1 text-[11px] text-slate-500">{tt("listHint")}</p></div>
            <div className="flex items-center gap-2"><span className="rounded-full bg-[#214f91] px-2.5 py-1 text-[10px] font-bold text-white">{selectedKpiRows.length.toLocaleString()}</span><button type="button" onClick={() => setSelectedKpi("")} title={tt("closeList")} aria-label={tt("closeList")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X size={14} /></button></div>
          </div>
          {selectedKpiRows.length ? <div className="max-h-[320px] overflow-auto"><table className="min-w-[720px] w-full text-left text-xs"><thead className="sticky top-0 z-[1] bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">{tt("plate")}</th><th className="px-4 py-2">{tt("time")}</th><th className="px-4 py-2">{tt("detail")}</th><th className="px-4 py-2">{tt("status")}</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedKpiRows.map((row, index) => {
            const registryRow = selectedKpi === "active";
            const isApproved = registryRow || approvedPlateSet.has(plateKey(row.vehicle_plate));
            const statusLabel = registryRow ? tt("activeStatus") : isApproved ? tt("approved") : row.pass_type === "TEMPORARY" ? tt("temporary") : tt("unregistered");
            const statusClass = registryRow || isApproved ? "bg-emerald-100 text-emerald-800" : row.pass_type === "TEMPORARY" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700";
            return <tr key={row.id || `${row.vehicle_plate}-${index}`} className="hover:bg-blue-50/40"><td className="px-4 py-2.5"><p className="font-bold text-slate-950">{row.vehicle_plate || "-"}</p><p className="mt-0.5 text-[10px] text-slate-400">{row.province || row.gate_name || "-"}</p></td><td className="whitespace-nowrap px-4 py-2.5"><p className="font-bold"><span className="text-emerald-700">{registryRow ? "-" : formatTime(row.entry_time)}</span>{!registryRow ? <><span className="mx-1.5 text-slate-300">→</span><span className="text-rose-700">{formatTime(row.exit_time)}</span></> : null}</p><p className="mt-0.5 text-[10px] text-slate-400">{registryRow ? row.first_seen_date || "-" : row.visit_date || "-"}</p></td><td className="px-4 py-2.5"><p className="font-semibold text-slate-800">{row.full_name || row.driver_name || "-"}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.company_name || row.purpose || row.contact_person || "-"}</p></td><td className="px-4 py-2.5"><span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-bold ${statusClass}`}>{statusLabel}</span></td></tr>;
          })}</tbody></table></div> : <div className="flex min-h-[150px] items-center justify-center p-6 text-center text-xs text-slate-400">{tt("noKpiRows")}</div>}
        </section> : null}

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">{tt("trend")}</h2><p className="mt-0.5 text-[10px] text-slate-500">{tt("trendHint")}</p></div>
            <div className="h-[220px] p-2.5 sm:p-3"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf4" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", fontSize: 11 }} /><Legend wrapperStyle={{ fontSize: 10 }} /><Line type="monotone" dataKey="gatepass" name={tt("gatepassTrend")} stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="registry" name={tt("registryTrend")} stroke="#e11d48" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>
          </article>

          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h2 className="text-sm font-bold text-slate-900">{tt("latestActivity")}</h2><p className="mt-0.5 text-[10px] text-slate-500">{tt("latestActivityHint")}</p></div><Link to="/reports/gatepass/daily" className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 transition hover:bg-blue-100">{tt("viewAll")}</Link></div>
            {recentActivity.length ? <div className="overflow-x-auto"><table className="w-full table-fixed text-left text-[11px]"><thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="w-[28%] px-3 py-2 font-bold">{tt("time")}</th><th className="w-[43%] px-3 py-2 font-bold">{tt("plate")}</th><th className="w-[29%] px-3 py-2 font-bold">{tt("status")}</th></tr></thead><tbody>{recentActivity.map((row, index) => {
              const isApproved = approvedPlateSet.has(plateKey(row.vehicle_plate));
              const statusLabel = isApproved ? tt("approved") : row.pass_type === "TEMPORARY" ? tt("temporary") : tt("unregistered");
              const statusClass = isApproved ? "bg-emerald-100 text-emerald-800" : row.pass_type === "TEMPORARY" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700";
              return <tr key={row.id || `${row.vehicle_plate}-${index}`} className="border-t border-slate-100 align-top hover:bg-blue-50/50"><td className="px-3 py-2.5"><p className="whitespace-nowrap font-bold"><span className="text-emerald-700">{formatTime(row.entry_time)}</span><span className="mx-1 text-slate-300">→</span><span className="text-rose-700">{formatTime(row.exit_time)}</span></p><p className="mt-0.5 text-[9px] text-slate-400">{dateFormatter.format(new Date(`${row.visit_date}T00:00:00`))} · {row.gate_name || "-"}</p></td><td className="px-3 py-2.5"><p className="font-bold text-slate-950">{row.vehicle_plate || "-"}</p><p className="mt-0.5 truncate text-[9px] text-slate-500">{row.company_name || row.driver_name || row.purpose || "-"}</p></td><td className="px-3 py-2.5"><span className={`inline-flex max-w-full rounded-md px-2 py-1 text-[9px] font-bold leading-3 ${statusClass}`}>{statusLabel}</span></td></tr>;
            })}</tbody></table></div> : <div className="flex min-h-[170px] flex-col items-center justify-center px-5 py-7 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">{loading ? <Loader2 size={19} className="animate-spin" /> : <CarFront size={19} />}</span><p className="mt-2 text-xs font-bold text-slate-600">{tt("noActivity")}</p></div>}
          </article>
        </section>

        <section className="grid gap-3 xl:grid-cols-[0.85fr_1.15fr]">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Building2 size={15} className="text-[#214f91]" />{tt("companyTitle")}</h2><p className="mt-0.5 text-[10px] text-slate-500">{tt("companyHint")}</p></div>
            <div className="h-[220px] p-2.5"><ResponsiveContainer width="100%" height="100%"><BarChart data={companies.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edf1f6" /><XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="company" width={92} tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", fontSize: 11 }} /><Bar dataKey="vehicles" fill="#214f91" radius={[0, 4, 4, 0]} barSize={14} /></BarChart></ResponsiveContainer></div>
          </article>

          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-bold text-slate-900">{tt("changes")}</h2><p className="mt-0.5 text-[10px] text-slate-500">{tt("changesHint")}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{selectedChanges.length}</span></div>
            {selectedChanges.length ? <div className="max-h-[220px] overflow-auto"><table className="min-w-[620px] w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">{tt("date")}</th><th className="px-4 py-2">{tt("plate")}</th><th className="px-4 py-2">{tt("company")}</th><th className="px-4 py-2">{tt("action")}</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedChanges.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{dateFormatter.format(new Date(`${item.change_date}T00:00:00`))}</td><td className="px-4 py-2.5 font-bold text-slate-900">{item.vehicle_plate}</td><td className="px-4 py-2.5 text-slate-600">{item.company_name || "-"}</td><td className="px-4 py-2.5"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${CHANGE_STYLE[item.change_type] || "bg-slate-100 text-slate-600"}`}>{CHANGE_LABEL_KEY[item.change_type] ? tt(CHANGE_LABEL_KEY[item.change_type]) : item.change_type}</span></td></tr>)}</tbody></table></div> : <div className="flex min-h-[160px] items-center justify-center p-5 text-center text-xs text-slate-400">{loading ? <Loader2 className="animate-spin" /> : tt("noChanges")}</div>}
          </article>
        </section>
      </main>
    </>
  );
}
