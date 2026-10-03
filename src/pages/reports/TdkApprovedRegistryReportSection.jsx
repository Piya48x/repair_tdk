import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  CalendarDays,
  CarFront,
  ChevronDown,
  ChevronRight,
  Download,
  FileClock,
  Loader2,
  PencilLine,
  RefreshCw,
  Search,
  ShieldCheck,
  UserMinus,
  UserPlus,
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
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { supabase } from "../../lib/supabaseClient";
import {
  fetchTdkApprovedRegistry,
  fetchTdkApprovedRegistryChanges,
  fetchTdkApprovedRegistryImports,
  isTdkApprovedRegistrySchemaError,
} from "../it-dashboard/services/tdkApprovedRegistryService";
import { downloadTdkApprovedMonthlyReport } from "./tdkApprovedRegistryExcelExport";

const COPY = {
  th: {
    heading: "สถานะทะเบียนรถหลัก TDK APPROVED",
    subtitle: "ภาพรวมรถหลักที่ใช้งานอยู่ และจำนวนทะเบียนที่เพิ่ม ถอดออก หรือแก้ไขในแต่ละเดือน",
    month: "เดือนที่ต้องการดู",
    refresh: "รีเฟรช",
    export: "Export รายงานทะเบียน",
    exportHint: "เลือกภาษารายงาน",
    exportThai: "ภาษาไทย (TH)",
    exportEnglish: "English (EN)",
    active: "รถหลักที่ใช้งานปัจจุบัน",
    added: "เพิ่ม / กลับมาใช้ในเดือนที่เลือก",
    removed: "ถอดออกในเดือนที่เลือก",
    updated: "แก้ไขข้อมูลในเดือนที่เลือก",
    companies: "บริษัทในทะเบียนปัจจุบัน",
    trendTitle: "การเปลี่ยนแปลงทะเบียนย้อนหลัง 6 เดือน",
    trendHint: "นับจากประวัติทะเบียนหลัก ไม่ใช่จำนวนรถที่ผ่านประตู",
    additions: "เพิ่ม / กลับมาใช้",
    removals: "ถอดออก",
    updates: "แก้ไขข้อมูล",
    changesTitle: "ประวัติการเปลี่ยนแปลงเดือนที่เลือก",
    changesCount: "{{count}} รายการ",
    noChanges: "เดือนที่เลือกยังไม่มีการเพิ่ม ถอดออก หรือแก้ไขทะเบียน",
    registryTitle: "ทะเบียนรถหลักที่ใช้งานอยู่",
    registryHint: "ข้อมูลล่าสุดสำหรับผู้บริหาร",
    search: "ค้นหาทะเบียน ชื่อ หรือบริษัท...",
    noRegistry: "ยังไม่มีทะเบียนรถหลักที่ใช้งานอยู่",
    plate: "ทะเบียน",
    person: "ชื่อ / ผู้ติดต่อ",
    company: "บริษัท",
    purpose: "วัตถุประสงค์",
    since: "ใช้งานตั้งแต่",
    changeDate: "วันที่",
    changeAction: "รายการ",
    type: { ADDED: "เพิ่มใหม่", REACTIVATED: "กลับมาใช้", REMOVED: "ถอดออก", UPDATED: "แก้ไขข้อมูล", BASELINE: "ข้อมูลตั้งต้น" },
    loadError: "โหลดรายงานทะเบียนรถหลักไม่สำเร็จ",
    exportSuccess: "สร้างรายงานทะเบียนรถสำเร็จ",
    setup: "กรุณารันไฟล์ SQL Gatepass เวอร์ชันล่าสุดก่อนใช้งานรายงานทะเบียนรถหลัก",
    journeyEyebrow: "เส้นทางทะเบียนหลัก",
    journeyTitle: "จากข้อมูลตั้งต้นถึงรถที่ใช้งานปัจจุบัน",
    baselineStep: "1. ข้อมูลตั้งต้นอย่างเป็นทางการ",
    baselineVehicles: "{{count}} คัน",
    baselineDate: "ตั้งต้นเมื่อ {{date}}",
    additionsStep: "2. เพิ่มหลังวันตั้งต้น",
    additionsVehicles: "+{{count}} คัน",
    additionsHint: "กดเพื่อดูเฉพาะรถที่เพิ่มเข้ามา",
    currentStep: "3. ทะเบียนที่ใช้งานปัจจุบัน",
    currentVehicles: "{{count}} คัน",
    addedListTitle: "รถที่เพิ่มหลังข้อมูลตั้งต้น",
    addedListHint: "เรียงจากรายการที่เพิ่มล่าสุด",
    noAdditions: "ยังไม่มีรถเพิ่มหลังข้อมูลตั้งต้น",
    quickAll: "รถปัจจุบันทั้งหมด",
    quickAdded: "เพิ่มหลังตั้งต้น",
    masterEyebrow: "ทะเบียนรถหลัก",
    trendEyebrow: "ภาพรวมรายเดือน",
    changesEyebrow: "ประวัติย้อนหลัง",
    currentEyebrow: "รายการรถปัจจุบัน",
  },
  en: {
    heading: "TDK APPROVED Master Vehicle Status",
    subtitle: "Current active fleet and monthly additions, removals, and detail updates.",
    month: "Reporting month",
    refresh: "Refresh",
    export: "Export registry report",
    exportHint: "Choose report language",
    exportThai: "Thai (TH)",
    exportEnglish: "English (EN)",
    active: "Current active fleet",
    added: "Added / reactivated this month",
    removed: "Removed this month",
    updated: "Details updated this month",
    companies: "Companies in current registry",
    trendTitle: "Six-month registry changes",
    trendHint: "Based on master-registry history, not gate entry volume.",
    additions: "Added / reactivated",
    removals: "Removed",
    updates: "Details updated",
    changesTitle: "Changes in selected month",
    changesCount: "{{count}} changes",
    noChanges: "No vehicles were added, removed, or updated this month.",
    registryTitle: "Current active master registry",
    registryHint: "Latest executive view",
    search: "Search plate, person, or company...",
    noRegistry: "No active master vehicles yet.",
    plate: "Plate",
    person: "Name / contact",
    company: "Company",
    purpose: "Purpose",
    since: "Active since",
    changeDate: "Date",
    changeAction: "Change",
    type: { ADDED: "Added", REACTIVATED: "Reactivated", REMOVED: "Removed", UPDATED: "Updated", BASELINE: "Baseline" },
    loadError: "Unable to load the master vehicle report",
    exportSuccess: "Registry report created",
    setup: "Run the latest Gatepass SQL file before using the master registry report.",
    journeyEyebrow: "Registry journey",
    journeyTitle: "From the official baseline to the current active fleet",
    baselineStep: "1. Official baseline",
    baselineVehicles: "{{count}} vehicles",
    baselineDate: "Established on {{date}}",
    additionsStep: "2. Added after baseline",
    additionsVehicles: "+{{count}} vehicles",
    additionsHint: "Select to view only later additions",
    currentStep: "3. Current active registry",
    currentVehicles: "{{count}} vehicles",
    addedListTitle: "Vehicles added after baseline",
    addedListHint: "Newest additions first",
    noAdditions: "No vehicles have been added after the baseline.",
    quickAll: "All current vehicles",
    quickAdded: "Added after baseline",
    masterEyebrow: "Master registry",
    trendEyebrow: "Month over month",
    changesEyebrow: "Change log",
    currentEyebrow: "Current master list",
  },
};

const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKey = (date) => dateKey(date).slice(0, 7);
const shiftMonth = (month, amount) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthKey(new Date(year, monthNumber - 1 + amount, 1));
};
const monthBounds = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return { from: `${month}-01`, to: `${month}-${pad(new Date(year, monthNumber, 0).getDate())}` };
};
const OFFICIAL_BASELINE_DATE = "2026-09-08";
const OFFICIAL_BASELINE_COUNT = 39;

const TYPE_STYLE = {
  ADDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REACTIVATED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  REMOVED: "bg-rose-50 text-rose-700 border-rose-200",
  UPDATED: "bg-amber-50 text-amber-800 border-amber-200",
  BASELINE: "bg-blue-50 text-blue-700 border-blue-200",
};

function SummaryCard({ icon: Icon, label, value, tone }) {
  const accents = {
    blue: "bg-blue-50 text-[#214f91]",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-slate-100 text-slate-700",
  };
  return <article className="flex min-h-[94px] items-center justify-between gap-3 bg-white px-4 py-3.5 sm:px-5"><div className="min-w-0"><p className="text-[11px] font-semibold leading-4 text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{Number(value || 0).toLocaleString()}</p></div><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accents[tone] || accents.blue}`}><Icon size={17} /></span></article>;
}

function JourneyStep({ icon: Icon, eyebrow, value, hint, tone = "blue", onClick, selected = false }) {
  const tones = {
    blue: "bg-blue-50 text-[#214f91]",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-800",
  };
  const Element = onClick ? "button" : "div";
  return <Element type={onClick ? "button" : undefined} onClick={onClick} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${onClick ? "hover:bg-slate-50" : ""} ${selected ? "bg-emerald-50/60" : ""}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon size={18} /></span><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{eyebrow}</span><span className="mt-0.5 block text-xl font-bold tracking-tight text-slate-950">{value}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{hint}</span></span></Element>;
}

function RegistryQuickFilters({ value, onChange, allCount, addedCount, tt }) {
  const filters = [
    { id: "ALL", label: tt("quickAll"), count: allCount },
    { id: "ADDED", label: tt("quickAdded"), count: addedCount },
  ];
  return <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1" role="group" aria-label="Registry quick filters">{filters.map((filter) => <button key={filter.id} type="button" onClick={() => onChange(filter.id)} aria-pressed={value === filter.id} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${value === filter.id ? filter.id === "ADDED" ? "bg-white text-emerald-700 shadow-sm" : "bg-white text-[#173f70] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{filter.label}<span className={`ml-1.5 ${value === filter.id ? "text-inherit" : "text-slate-400"}`}>{filter.count.toLocaleString()}</span></button>)}</div>;
}

export default function TdkApprovedRegistryReportSection() {
  const { language, tt } = useScopedI18n(COPY);
  const realtimeRef = useRef(null);
  const exportMenuRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [registry, setRegistry] = useState([]);
  const [changes, setChanges] = useState([]);
  const [imports, setImports] = useState([]);
  const [search, setSearch] = useState("");
  const [registryFilter, setRegistryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState("");

  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(language === "th" ? "th-TH" : language === "ko" ? "ko-KR" : "en-GB", { month: "short", year: "2-digit" }), [language]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(language === "th" ? "th-TH" : language === "ko" ? "ko-KR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }), [language]);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const rangeStart = OFFICIAL_BASELINE_DATE;
      const currentMonth = monthKey(new Date());
      const historyEndMonth = selectedMonth > currentMonth ? selectedMonth : currentMonth;
      const rangeEnd = monthBounds(historyEndMonth).to;
      const [registryRows, changeRows, importRows] = await Promise.all([
        fetchTdkApprovedRegistry({ includeInactive: true }),
        fetchTdkApprovedRegistryChanges({ from: rangeStart, to: rangeEnd }),
        fetchTdkApprovedRegistryImports(200),
      ]);
      setRegistry(registryRows);
      setChanges(changeRows);
      setImports(importRows);
      setSchemaMissing(false);
      setError("");
    } catch (loadError) {
      console.error("Load TDK APPROVED executive report failed", loadError);
      if (isTdkApprovedRegistrySchemaError(loadError)) setSchemaMissing(true);
      else setError(loadError?.message || tt("loadError"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedMonth, tt]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const schedule = () => {
      window.clearTimeout(realtimeRef.current);
      realtimeRef.current = window.setTimeout(() => void loadData({ silent: true }), 700);
    };
    const channel = supabase.channel("tdk-approved-executive-report")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tdk_approved_registry_imports" }, schedule)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tdk_approved_registry_imports" }, schedule)
      .subscribe();
    return () => {
      window.clearTimeout(realtimeRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

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

  const activeRegistry = useMemo(() => registry.filter((row) => row.is_active), [registry]);
  const baselineImport = useMemo(() => [...imports]
    .filter((item) => Number(item.baseline_count || 0) > 0)
    .sort((a, b) => `${a.snapshot_date}|${a.imported_at}`.localeCompare(`${b.snapshot_date}|${b.imported_at}`))[0], [imports]);
  const baselineDate = baselineImport?.snapshot_date || OFFICIAL_BASELINE_DATE;
  const baselineCount = Number(baselineImport?.baseline_count || OFFICIAL_BASELINE_COUNT);
  const additionsAfterBaseline = useMemo(() => changes
    .filter((row) => row.change_type === "ADDED" && String(row.change_date || "") >= baselineDate)
    .sort((a, b) => `${b.change_date}|${b.created_at || ""}`.localeCompare(`${a.change_date}|${a.created_at || ""}`)), [baselineDate, changes]);
  const addedPlateKeys = useMemo(() => new Set(additionsAfterBaseline.map((row) => row.plate_key).filter(Boolean)), [additionsAfterBaseline]);
  const addedVehicleRows = useMemo(() => {
    const latestByPlate = new Map();
    additionsAfterBaseline.forEach((row) => {
      if (!latestByPlate.has(row.plate_key)) latestByPlate.set(row.plate_key, row);
    });
    return [...latestByPlate.values()];
  }, [additionsAfterBaseline]);
  const selectedChanges = useMemo(() => changes.filter((row) => String(row.change_date || "").startsWith(selectedMonth) && row.change_type !== "BASELINE"), [changes, selectedMonth]);
  const metrics = useMemo(() => ({
    active: activeRegistry.length,
    added: selectedChanges.filter((row) => ["ADDED", "REACTIVATED"].includes(row.change_type)).length,
    removed: selectedChanges.filter((row) => row.change_type === "REMOVED").length,
    updated: selectedChanges.filter((row) => row.change_type === "UPDATED").length,
    companies: new Set(activeRegistry.map((row) => row.company_name).filter(Boolean)).size,
  }), [activeRegistry, selectedChanges]);

  const trend = useMemo(() => Array.from({ length: 6 }, (_, index) => shiftMonth(selectedMonth, index - 5)).map((month) => {
    const rows = changes.filter((row) => String(row.change_date || "").startsWith(month));
    const latestImport = imports.filter((item) => String(item.snapshot_date || "").startsWith(month)).sort((a, b) => `${b.snapshot_date}|${b.imported_at}`.localeCompare(`${a.snapshot_date}|${a.imported_at}`))[0];
    return {
      month,
      label: monthFormatter.format(new Date(`${month}-01T00:00:00`)),
      added: rows.filter((row) => ["ADDED", "REACTIVATED"].includes(row.change_type)).length,
      removed: rows.filter((row) => row.change_type === "REMOVED").length,
      updated: rows.filter((row) => row.change_type === "UPDATED").length,
      active: latestImport?.total_count ?? null,
    };
  }), [changes, imports, monthFormatter, selectedMonth]);

  const filteredRegistry = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const scopedRows = registryFilter === "ADDED" ? activeRegistry.filter((row) => addedPlateKeys.has(row.plate_key)) : activeRegistry;
    if (!needle) return scopedRows;
    return scopedRows.filter((row) => [row.vehicle_plate, row.full_name, row.company_name, row.contact_name, row.purpose].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [activeRegistry, addedPlateKeys, registryFilter, search]);

  const handleExport = async (exportLanguage = language === "th" ? "th" : "en") => {
    setExportMenuOpen(false);
    setExporting(true);
    try {
      await downloadTdkApprovedMonthlyReport({
        language: exportLanguage,
        month: selectedMonth,
        registry: activeRegistry,
        changes: selectedChanges,
        allChanges: changes,
        baselineDate,
        baselineCount,
      });
      toast.success(tt("exportSuccess"));
    } catch (exportError) {
      console.error("Export TDK APPROVED executive report failed", exportError);
      toast.error(exportError?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return <div className="space-y-3">
    <header className="rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#214f91]"><ShieldCheck size={14} />{tt("masterEyebrow")}</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{tt("heading")}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{tt("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label><span className="mb-1 block text-[10px] font-semibold text-slate-500">{tt("month")}</span><input type="month" value={selectedMonth} onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#214f91] focus:ring-2 focus:ring-blue-100" /></label>
          <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />{tt("refresh")}</button>
          <div ref={exportMenuRef} className="relative">
            <button type="button" onClick={() => setExportMenuOpen((current) => !current)} aria-haspopup="menu" aria-expanded={exportMenuOpen} disabled={exporting || !activeRegistry.length} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#173f70] px-3 text-xs font-bold text-white transition hover:bg-[#12345e] disabled:opacity-50">{exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{tt("export")}<ChevronDown size={13} className={`transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} /></button>
            {exportMenuOpen ? <div role="menu" aria-label={tt("exportHint")} className="absolute right-0 z-30 mt-1.5 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10">
              <p className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{tt("exportHint")}</p>
              <button type="button" role="menuitem" onClick={() => void handleExport("th")} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100"><span className="flex h-6 w-7 items-center justify-center rounded bg-slate-100 text-[9px] font-black text-[#173f70]">TH</span>{tt("exportThai")}</button>
              <button type="button" role="menuitem" onClick={() => void handleExport("en")} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100"><span className="flex h-6 w-7 items-center justify-center rounded bg-slate-100 text-[9px] font-black text-[#173f70]">EN</span>{tt("exportEnglish")}</button>
            </div> : null}
          </div>
        </div>
      </div>
    </header>

    {schemaMissing ? <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">{tt("setup")}</section> : null}
    {error ? <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">{error}</section> : null}

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Registry KPI">
      <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3 xl:grid-cols-5">
        <SummaryCard icon={CarFront} label={tt("active")} value={metrics.active} tone="blue" />
        <SummaryCard icon={UserPlus} label={tt("added")} value={metrics.added} tone="emerald" />
        <SummaryCard icon={UserMinus} label={tt("removed")} value={metrics.removed} tone="rose" />
        <SummaryCard icon={PencilLine} label={tt("updated")} value={metrics.updated} tone="amber" />
        <SummaryCard icon={Building2} label={tt("companies")} value={metrics.companies} tone="violet" />
      </div>
    </section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#214f91]">{tt("journeyEyebrow")}</p><h3 className="mt-0.5 text-base font-bold text-slate-950">{tt("journeyTitle")}</h3></div>
      </div>
      <div className="grid items-center px-2 py-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:px-4">
        <JourneyStep icon={CalendarDays} eyebrow={tt("baselineStep")} value={tt("baselineVehicles", { count: baselineCount })} hint={tt("baselineDate", { date: dateFormatter.format(new Date(`${baselineDate}T00:00:00`)) })} tone="blue" />
        <ChevronRight size={18} className="mx-auto rotate-90 text-slate-300 lg:rotate-0" />
        <JourneyStep icon={UserPlus} eyebrow={tt("additionsStep")} value={tt("additionsVehicles", { count: addedVehicleRows.length })} hint={tt("additionsHint")} tone="emerald" selected={registryFilter === "ADDED"} onClick={() => { setRegistryFilter("ADDED"); setSearch(""); }} />
        <ChevronRight size={18} className="mx-auto rotate-90 text-slate-300 lg:rotate-0" />
        <JourneyStep icon={CarFront} eyebrow={tt("currentStep")} value={tt("currentVehicles", { count: activeRegistry.length })} hint={`${baselineCount.toLocaleString()} + ${addedVehicleRows.length.toLocaleString()} = ${activeRegistry.length.toLocaleString()}`} tone="slate" />
      </div>
      <div className="border-t border-slate-200 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-xs font-bold text-slate-800">{tt("addedListTitle")}</h4><p className="mt-0.5 text-[10px] text-slate-500">{tt("addedListHint")}</p></div><button type="button" onClick={() => { setRegistryFilter("ADDED"); setSearch(""); }} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-50">{tt("quickAdded")} · {addedVehicleRows.length}</button></div>
        {addedVehicleRows.length ? <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">{addedVehicleRows.map((item) => <div key={`${item.change_type}-${item.plate_key}`} className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5"><span className="text-xs font-bold text-slate-900">{item.vehicle_plate}</span><span className="max-w-32 truncate text-[10px] text-slate-500">{item.company_name || item.full_name || "-"}</span><span className="text-[9px] font-semibold text-emerald-700">{dateFormatter.format(new Date(`${item.change_date}T00:00:00`))}</span></div>)}</div> : <p className="py-3 text-center text-xs text-slate-400">{tt("noAdditions")}</p>}
      </div>
    </section>

    <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#214f91]">{tt("trendEyebrow")}</p><h3 className="mt-0.5 text-base font-bold text-slate-950">{tt("trendTitle")}</h3><p className="mt-0.5 text-[11px] text-slate-500">{tt("trendHint")}</p></div>
        <div className="h-[280px] p-3 sm:p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 11 }} /><Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} /><Bar dataKey="added" name={tt("additions")} fill="#059669" radius={[3, 3, 0, 0]} /><Bar dataKey="removed" name={tt("removals")} fill="#e11d48" radius={[3, 3, 0, 0]} /><Bar dataKey="updated" name={tt("updates")} fill="#d97706" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </article>

      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#214f91]">{tt("changesEyebrow")}</p><h3 className="mt-0.5 text-base font-bold text-slate-950">{tt("changesTitle")}</h3></div><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{tt("changesCount", { count: selectedChanges.length })}</span></div>
        {selectedChanges.length ? <div className="max-h-[280px] overflow-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2.5">{tt("changeDate")}</th><th className="px-3 py-2.5">{tt("plate")}</th><th className="px-3 py-2.5">{tt("company")}</th><th className="px-3 py-2.5 text-right">{tt("changeAction")}</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedChanges.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{dateFormatter.format(new Date(`${item.change_date}T00:00:00`))}</td><td className="px-3 py-2.5 font-bold text-slate-900">{item.vehicle_plate}</td><td className="max-w-[180px] truncate px-3 py-2.5 text-slate-600">{item.company_name || item.full_name || "-"}</td><td className="px-3 py-2.5 text-right"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${TYPE_STYLE[item.change_type] || TYPE_STYLE.BASELINE}`}>{tt(`type.${item.change_type}`)}</span></td></tr>)}</tbody></table></div> : <div className="flex min-h-[280px] flex-col items-center justify-center p-4 text-center"><FileClock size={26} className="text-slate-300" /><p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">{tt("noChanges")}</p></div>}
      </article>
    </section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-end lg:justify-between sm:px-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#214f91]">{tt("currentEyebrow")}</p><h3 className="mt-0.5 text-base font-bold text-slate-950">{tt("registryTitle")}</h3><p className="mt-0.5 text-[11px] text-slate-500">{tt("registryHint")} · {tt("currentVehicles", { count: activeRegistry.length.toLocaleString() })}</p></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <RegistryQuickFilters value={registryFilter} onChange={(nextFilter) => { setRegistryFilter(nextFilter); setSearch(""); }} allCount={activeRegistry.length} addedCount={activeRegistry.filter((row) => addedPlateKeys.has(row.plate_key)).length} tt={tt} />
          <label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tt("search")} className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-[#214f91] focus:ring-2 focus:ring-blue-100 sm:w-72" /></label>
        </div>
      </div>
      {filteredRegistry.length ? <div className="max-h-[520px] overflow-auto"><table className="min-w-[860px] w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5">{tt("plate")}</th><th className="px-4 py-2.5">{tt("person")}</th><th className="px-4 py-2.5">{tt("company")}</th><th className="px-4 py-2.5">{tt("purpose")}</th><th className="px-4 py-2.5">{tt("since")}</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRegistry.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-4 py-2.5 font-bold text-slate-950">{row.vehicle_plate}</td><td className="px-4 py-2.5"><p className="font-semibold text-slate-700">{row.full_name || "-"}</p><p className="mt-0.5 text-[10px] text-slate-400">{row.contact_name || "-"}</p></td><td className="px-4 py-2.5 text-slate-600">{row.company_name || "-"}</td><td className="max-w-[280px] truncate px-4 py-2.5 text-slate-600">{row.purpose || row.remark || "-"}</td><td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{row.first_seen_date ? dateFormatter.format(new Date(`${row.first_seen_date}T00:00:00`)) : "-"}</td></tr>)}</tbody></table></div> : <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center"><CarFront size={26} className="text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-500">{loading ? "Loading..." : registryFilter === "ADDED" ? tt("noAdditions") : tt("noRegistry")}</p></div>}
    </section>
  </div>;
}
