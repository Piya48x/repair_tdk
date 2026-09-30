import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  CarFront,
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
    active: "รถหลักที่ใช้งานปัจจุบัน",
    added: "เพิ่ม / กลับมาใช้เดือนนี้",
    removed: "ถอดออกเดือนนี้",
    updated: "แก้ไขข้อมูลเดือนนี้",
    companies: "บริษัทในทะเบียนปัจจุบัน",
    trendTitle: "การเปลี่ยนแปลงทะเบียนย้อนหลัง 6 เดือน",
    trendHint: "นับจากประวัติทะเบียนหลัก ไม่ใช่จำนวนรถที่ผ่านประตู",
    additions: "เพิ่ม / กลับมาใช้",
    removals: "ถอดออก",
    updates: "แก้ไขข้อมูล",
    changesTitle: "รายละเอียดการเปลี่ยนแปลงเดือนนี้",
    changesCount: "{{count}} รายการ",
    noChanges: "เดือนนี้ยังไม่มีการเพิ่ม ถอดออก หรือแก้ไขทะเบียน",
    registryTitle: "ทะเบียนรถหลักที่ใช้งานอยู่",
    registryHint: "ข้อมูลล่าสุดสำหรับผู้บริหาร",
    search: "ค้นหาทะเบียน ชื่อ หรือบริษัท...",
    noRegistry: "ยังไม่มีทะเบียนรถหลักที่ใช้งานอยู่",
    plate: "ทะเบียน",
    person: "ชื่อ / ผู้ติดต่อ",
    company: "บริษัท",
    purpose: "วัตถุประสงค์",
    since: "ใช้งานตั้งแต่",
    type: { ADDED: "เพิ่มใหม่", REACTIVATED: "กลับมาใช้", REMOVED: "ถอดออก", UPDATED: "แก้ไขข้อมูล", BASELINE: "ข้อมูลตั้งต้น" },
    loadError: "โหลดรายงานทะเบียนรถหลักไม่สำเร็จ",
    exportSuccess: "สร้างรายงานทะเบียนรถสำเร็จ",
    setup: "กรุณารันไฟล์ SQL Gatepass เวอร์ชันล่าสุดก่อนใช้งานรายงานทะเบียนรถหลัก",
  },
  en: {
    heading: "TDK APPROVED Master Vehicle Status",
    subtitle: "Current active fleet and monthly additions, removals, and detail updates.",
    month: "Reporting month",
    refresh: "Refresh",
    export: "Export registry report",
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

const TYPE_STYLE = {
  ADDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REACTIVATED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  REMOVED: "bg-rose-50 text-rose-700 border-rose-200",
  UPDATED: "bg-amber-50 text-amber-800 border-amber-200",
  BASELINE: "bg-blue-50 text-blue-700 border-blue-200",
};

function SummaryCard({ icon: Icon, label, value, tone }) {
  const accents = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    violet: "bg-violet-600",
  };
  return <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4"><span className={`absolute inset-y-0 left-0 w-1 ${accents[tone] || accents.blue}`} /><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold leading-5 text-slate-500">{label}</p><p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{Number(value || 0).toLocaleString()}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon size={18} /></span></div></article>;
}

export default function TdkApprovedRegistryReportSection() {
  const { language, tt } = useScopedI18n(COPY);
  const realtimeRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [registry, setRegistry] = useState([]);
  const [changes, setChanges] = useState([]);
  const [imports, setImports] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState("");

  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(language === "th" ? "th-TH" : language === "ko" ? "ko-KR" : "en-GB", { month: "short", year: "2-digit" }), [language]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(language === "th" ? "th-TH" : language === "ko" ? "ko-KR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }), [language]);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const rangeStart = monthBounds(shiftMonth(selectedMonth, -5)).from;
      const rangeEnd = monthBounds(selectedMonth).to;
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

  const activeRegistry = useMemo(() => registry.filter((row) => row.is_active), [registry]);
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
    if (!needle) return activeRegistry;
    return activeRegistry.filter((row) => [row.vehicle_plate, row.full_name, row.company_name, row.contact_name, row.purpose].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [activeRegistry, search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadTdkApprovedMonthlyReport({ language: language === "th" ? "th" : "en", month: selectedMonth, registry: activeRegistry, changes: selectedChanges });
      toast.success(tt("exportSuccess"));
    } catch (exportError) {
      console.error("Export TDK APPROVED executive report failed", exportError);
      toast.error(exportError?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return <div className="space-y-4">
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700"><ShieldCheck size={14} />Master Registry</p>
          <h2 className="mt-1.5 text-xl font-bold text-slate-950 sm:text-2xl">{tt("heading")}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 sm:text-sm">{tt("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label><span className="mb-1 block text-[10px] font-semibold text-slate-600">{tt("month")}</span><input type="month" value={selectedMonth} onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
          <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />{tt("refresh")}</button>
          <button type="button" onClick={() => void handleExport()} disabled={exporting || !activeRegistry.length} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-50">{exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{tt("export")}</button>
        </div>
      </div>
    </section>

    {schemaMissing ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{tt("setup")}</section> : null}
    {error ? <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</section> : null}

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      <SummaryCard icon={CarFront} label={tt("active")} value={metrics.active} tone="blue" />
      <SummaryCard icon={UserPlus} label={tt("added")} value={metrics.added} tone="emerald" />
      <SummaryCard icon={UserMinus} label={tt("removed")} value={metrics.removed} tone="rose" />
      <SummaryCard icon={PencilLine} label={tt("updated")} value={metrics.updated} tone="amber" />
      <SummaryCard icon={Building2} label={tt("companies")} value={metrics.companies} tone="violet" />
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3.5 sm:px-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Month over month</p><h3 className="mt-1 text-base font-bold text-slate-950 sm:text-lg">{tt("trendTitle")}</h3><p className="mt-1 text-xs text-slate-500">{tt("trendHint")}</p></div><div className="h-[310px] p-3 sm:p-5"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} /><Bar dataKey="added" name={tt("additions")} fill="#059669" radius={[4, 4, 0, 0]} /><Bar dataKey="removed" name={tt("removals")} fill="#e11d48" radius={[4, 4, 0, 0]} /><Bar dataKey="updated" name={tt("updates")} fill="#d97706" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></article>

      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Change log</p><h3 className="mt-1 text-base font-bold text-slate-950 sm:text-lg">{tt("changesTitle")}</h3></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">{tt("changesCount", { count: selectedChanges.length })}</span></div>
        {selectedChanges.length ? <div className="max-h-[310px] overflow-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">{tt("changeDate")}</th><th className="px-4 py-3">{tt("plate")}</th><th className="px-4 py-3">{tt("company")}</th><th className="px-4 py-3 text-right">{tt("changeAction")}</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedChanges.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateFormatter.format(new Date(`${item.change_date}T00:00:00`))}</td><td className="px-4 py-3 font-bold text-slate-900">{item.vehicle_plate}</td><td className="max-w-[180px] truncate px-4 py-3 text-slate-600">{item.company_name || item.full_name || "-"}</td><td className="px-4 py-3 text-right"><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${TYPE_STYLE[item.change_type] || TYPE_STYLE.BASELINE}`}>{tt(`type.${item.change_type}`)}</span></td></tr>)}</tbody></table></div> : <div className="flex min-h-48 flex-col items-center justify-center p-4 text-center"><FileClock size={28} className="text-slate-300" /><p className="mt-3 max-w-xs text-xs leading-5 text-slate-400">{tt("noChanges")}</p></div>}
      </article>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_22px_rgba(15,23,42,0.04)]"><div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Current master list</p><h3 className="mt-1 text-lg font-bold text-slate-950">{tt("registryTitle")}</h3><p className="mt-1 text-xs text-slate-500">{tt("registryHint")} · {activeRegistry.length.toLocaleString()} vehicles</p></div><label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tt("search")} className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-80" /></label></div>{filteredRegistry.length ? <div className="max-h-[540px] overflow-auto"><table className="min-w-[900px] w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">{tt("plate")}</th><th className="px-4 py-3">{tt("person")}</th><th className="px-4 py-3">{tt("company")}</th><th className="px-4 py-3">{tt("purpose")}</th><th className="px-4 py-3">{tt("since")}</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRegistry.map((row) => <tr key={row.id} className="hover:bg-blue-50/40"><td className="px-4 py-3 font-bold text-slate-950">{row.vehicle_plate}</td><td className="px-4 py-3"><p className="font-semibold text-slate-700">{row.full_name || "-"}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.contact_name || "-"}</p></td><td className="px-4 py-3 text-slate-600">{row.company_name || "-"}</td><td className="max-w-[280px] truncate px-4 py-3 text-slate-600">{row.purpose || row.remark || "-"}</td><td className="whitespace-nowrap px-4 py-3 text-slate-500">{row.first_seen_date ? dateFormatter.format(new Date(`${row.first_seen_date}T00:00:00`)) : "-"}</td></tr>)}</tbody></table></div> : <div className="flex min-h-44 flex-col items-center justify-center p-8 text-center"><CarFront size={28} className="text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-500">{loading ? "Loading..." : tt("noRegistry")}</p></div>}</section>
  </div>;
}
