import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CarFront,
  Clock3,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
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
  fetchTdkApprovedRegistryImports,
  isTdkApprovedRegistrySchemaError,
} from "../it-dashboard/services/tdkApprovedRegistryService";
import { downloadTdkApprovedMonthlyReport } from "./tdkApprovedRegistryExcelExport";
import GatepassExecutiveTabs from "./GatepassExecutiveTabs";

const COPY = {
  th: {
    title: "Gatepass Vehicle Overview",
    subtitle: "ภาพรวมรถเข้า–ออกและทะเบียนรถหลักสำหรับผู้บริหาร",
    month: "เดือนรายงาน",
    refresh: "รีเฟรช",
    export: "Export",
    active: "TDK APPROVED ปัจจุบัน",
    today: "เข้า / ออกวันนี้",
    added: "เพิ่มเดือนนี้",
    removed: "ถอดออกเดือนนี้",
    companies: "บริษัทที่ลงทะเบียน",
    vehicles: "คัน",
    entries: "เข้า {{count}}",
    exits: "ออก {{count}}",
    trend: "แนวโน้มรถย้อนหลัง 12 เดือน",
    trendHint: "เปรียบเทียบรถผ่านประตูแบบไม่ซ้ำกับจำนวนทะเบียนหลักจากประวัติเดิม",
    gatepassTrend: "รถผ่านประตูไม่ซ้ำ",
    registryTrend: "ทะเบียนหลัก",
    activity: "Gatepass Activity วันนี้",
    unique: "รถไม่ซ้ำ",
    peak: "ช่วงเวลาหนาแน่น",
    noPeak: "ยังไม่มีข้อมูลเวลาเข้า",
    companyTitle: "Vehicles by Company",
    companyHint: "บริษัทที่มีรถลงทะเบียนมากที่สุด",
    changes: "Monthly Change Log",
    changesHint: "รายการเพิ่ม ถอด และแก้ไขในเดือนที่เลือก",
    noChanges: "เดือนนี้ยังไม่มีการเปลี่ยนแปลงทะเบียน",
    date: "วันที่",
    plate: "ทะเบียน",
    company: "บริษัท",
    action: "การเปลี่ยนแปลง",
    error: "โหลดข้อมูล Gatepass Overview ไม่สำเร็จ",
    setup: "กรุณารัน SQL Gatepass เวอร์ชันล่าสุดก่อนใช้งานรายงาน",
  },
  en: {
    title: "Gatepass Vehicle Overview",
    subtitle: "Executive summary of daily access and the approved master fleet.",
    month: "Reporting month",
    refresh: "Refresh",
    export: "Export",
    active: "Current TDK APPROVED",
    today: "Entries / exits today",
    added: "Added this month",
    removed: "Removed this month",
    companies: "Registered companies",
    vehicles: "vehicles",
    entries: "In {{count}}",
    exits: "Out {{count}}",
    trend: "12-month vehicle trend",
    trendHint: "Unique gate activity compared with the master-registry history.",
    gatepassTrend: "Unique gate vehicles",
    registryTrend: "Master registry",
    activity: "Gatepass Activity Today",
    unique: "Unique vehicles",
    peak: "Peak entry time",
    noPeak: "No entry-time data",
    companyTitle: "Vehicles by Company",
    companyHint: "Companies with the largest registered fleets",
    changes: "Monthly Change Log",
    changesHint: "Adds, removals, and updates in the selected month",
    noChanges: "No registry changes in this month.",
    date: "Date",
    plate: "Plate",
    company: "Company",
    action: "Change",
    error: "Unable to load the Gatepass overview",
    setup: "Run the latest Gatepass SQL before using this report.",
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
const plateKey = (value) => String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "");

const CHANGE_STYLE = {
  ADDED: "bg-emerald-50 text-emerald-700",
  REACTIVATED: "bg-emerald-50 text-emerald-700",
  REMOVED: "bg-rose-50 text-rose-700",
  UPDATED: "bg-amber-50 text-amber-800",
};

function KpiCard({ icon: Icon, label, value, detail, accent = "navy" }) {
  const accents = {
    navy: "bg-[#102a56]",
    emerald: "bg-emerald-600",
    rose: "bg-rose-500",
    slate: "bg-slate-400",
  };
  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${accents[accent]}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">{value}</p>
          <p className="mt-1 truncate text-[10px] text-slate-400">{detail}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon size={17} /></span>
      </div>
    </article>
  );
}

export default function GatepassExecutiveOverviewPage() {
  const { language, tt } = useScopedI18n(COPY);
  const realtimeRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [gateRows, setGateRows] = useState([]);
  const [todayRows, setTodayRows] = useState([]);
  const [registry, setRegistry] = useState([]);
  const [changes, setChanges] = useState([]);
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState("");

  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-GB", { month: "short", year: "2-digit" }), [language]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-GB", { day: "2-digit", month: "short" }), [language]);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const range = { from: monthBounds(shiftMonth(selectedMonth, -11)).from, to: monthBounds(selectedMonth).to };
      const today = dateKey(new Date());
      const [gateData, todayData, registryData, changeData, importData] = await Promise.all([
        fetchGatepassVehicleRecords(range),
        fetchGatepassVehicleRecords({ from: today, to: today }),
        fetchTdkApprovedRegistry({ includeInactive: true }),
        fetchTdkApprovedRegistryChanges(range),
        fetchTdkApprovedRegistryImports(300),
      ]);
      setGateRows(gateData);
      setTodayRows(todayData);
      setRegistry(registryData);
      setChanges(changeData);
      setImports(importData);
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
  const uniqueToday = useMemo(() => new Set(todayRows.map((row) => plateKey(row.vehicle_plate)).filter(Boolean)).size, [todayRows]);

  const peakHour = useMemo(() => {
    const counts = new Map();
    todayRows.forEach((row) => {
      const hour = String(row.entry_time || "").slice(0, 2);
      if (/^\d{2}$/.test(hour)) counts.set(hour, (counts.get(hour) || 0) + 1);
    });
    const peak = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!peak) return null;
    return `${peak[0]}:00–${pad((Number(peak[0]) + 1) % 24)}:00`;
  }, [todayRows]);

  const companies = useMemo(() => {
    const map = new Map();
    activeRegistry.forEach((row) => {
      const name = String(row.company_name || "Unspecified").trim() || "Unspecified";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return [...map.entries()].map(([company, vehicles]) => ({ company, vehicles })).sort((a, b) => b.vehicles - a.vehicles);
  }, [activeRegistry]);

  const trend = useMemo(() => Array.from({ length: 12 }, (_, index) => shiftMonth(selectedMonth, index - 11)).map((month) => {
    const monthRows = gateRows.filter((row) => String(row.visit_date || "").startsWith(month));
    const latestImport = imports
      .filter((item) => String(item.snapshot_date || "").startsWith(month))
      .sort((a, b) => `${b.snapshot_date}|${b.imported_at}`.localeCompare(`${a.snapshot_date}|${a.imported_at}`))[0];
    return {
      month,
      label: monthFormatter.format(new Date(`${month}-01T00:00:00`)),
      gatepass: new Set(monthRows.map((row) => plateKey(row.vehicle_plate)).filter(Boolean)).size,
      registry: latestImport?.total_count ?? null,
    };
  }), [gateRows, imports, monthFormatter, selectedMonth]);

  const metrics = useMemo(() => ({
    active: activeRegistry.length,
    added: selectedChanges.filter((row) => ["ADDED", "REACTIVATED"].includes(row.change_type)).length,
    removed: selectedChanges.filter((row) => row.change_type === "REMOVED").length,
    companies: companies.length,
  }), [activeRegistry.length, companies.length, selectedChanges]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadTdkApprovedMonthlyReport({ language: language === "th" ? "th" : "en", month: selectedMonth, registry: activeRegistry, changes: selectedChanges });
      toast.success(language === "th" ? "สร้างรายงานทะเบียนรถสำเร็จ" : "Registry report created");
    } catch (exportError) {
      console.error("Export Gatepass overview failed", exportError);
      toast.error(exportError?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <ReportsTopbar currentUser={null} />
      <GatepassExecutiveTabs />
      <main className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#214f91]"><ShieldCheck size={13} />Executive dashboard</div>
              <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{tt("title")}</h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">{tt("subtitle")}</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label><span className="mb-1 block text-[10px] font-semibold text-slate-500">{tt("month")}</span><input type="month" value={selectedMonth} onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-[#2b59b0]" /></label>
              <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />{tt("refresh")}</button>
              <button type="button" onClick={() => void handleExport()} disabled={exporting || !activeRegistry.length} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#102a56] px-3.5 text-xs font-bold text-white hover:bg-[#183b73] disabled:opacity-50">{exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{tt("export")}</button>
            </div>
          </div>
        </section>

        {schemaMissing ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{tt("setup")}</section> : null}
        {error ? <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</section> : null}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KpiCard icon={ShieldCheck} label={tt("active")} value={metrics.active.toLocaleString()} detail={tt("vehicles")} accent="navy" />
          <KpiCard icon={CarFront} label={tt("today")} value={`${entriesToday} / ${exitsToday}`} detail={`${tt("entries", { count: entriesToday })} · ${tt("exits", { count: exitsToday })}`} accent="navy" />
          <KpiCard icon={ArrowUpRight} label={tt("added")} value={`+${metrics.added}`} detail={selectedMonth} accent="emerald" />
          <KpiCard icon={ArrowDownRight} label={tt("removed")} value={`-${metrics.removed}`} detail={selectedMonth} accent="rose" />
          <KpiCard icon={Building2} label={tt("companies")} value={metrics.companies.toLocaleString()} detail={tt("vehicles")} accent="slate" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.45fr)]">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5"><h2 className="text-sm font-bold text-slate-900">{tt("trend")}</h2><p className="mt-1 text-[11px] text-slate-500">{tt("trendHint")}</p></div>
            <div className="h-[300px] p-3 sm:p-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf4" /><XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} interval={1} /><YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", fontSize: 11 }} /><Legend wrapperStyle={{ fontSize: 10 }} /><Line type="monotone" dataKey="gatepass" name={tt("gatepassTrend")} stroke="#214f91" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} /><Line type="monotone" dataKey="registry" name={tt("registryTrend")} stroke="#059669" strokeWidth={2.5} connectNulls dot={{ r: 2 }} activeDot={{ r: 4 }} /></LineChart></ResponsiveContainer></div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">{tt("activity")}</h2><p className="mt-1 text-[11px] text-slate-500">{dateFormatter.format(new Date())}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[#214f91]"><CarFront size={17} /></span></div>
            <div className="mt-5 divide-y divide-slate-100">
              <div className="flex items-end justify-between gap-3 py-3"><span className="text-xs text-slate-500">{tt("entries", { count: "" }).replace(/\s*$/, "")}</span><strong className="text-2xl text-slate-950">{entriesToday}</strong></div>
              <div className="flex items-end justify-between gap-3 py-3"><span className="text-xs text-slate-500">{tt("exits", { count: "" }).replace(/\s*$/, "")}</span><strong className="text-2xl text-slate-950">{exitsToday}</strong></div>
              <div className="flex items-end justify-between gap-3 py-3"><span className="text-xs text-slate-500">{tt("unique")}</span><strong className="text-2xl text-slate-950">{uniqueToday}</strong></div>
              <div className="flex items-center justify-between gap-3 pt-4"><span className="inline-flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} />{tt("peak")}</span><strong className="text-sm text-[#102a56]">{peakHour || tt("noPeak")}</strong></div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.45fr)_minmax(0,1.55fr)]">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3.5"><h2 className="text-sm font-bold text-slate-900">{tt("companyTitle")}</h2><p className="mt-1 text-[11px] text-slate-500">{tt("companyHint")}</p></div>
            <div className="h-[300px] p-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={companies.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edf1f6" /><XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="company" width={92} tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", fontSize: 11 }} /><Bar dataKey="vehicles" fill="#214f91" radius={[0, 4, 4, 0]} barSize={16} /></BarChart></ResponsiveContainer></div>
          </article>

          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5"><div><h2 className="text-sm font-bold text-slate-900">{tt("changes")}</h2><p className="mt-1 text-[11px] text-slate-500">{tt("changesHint")}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{selectedChanges.length}</span></div>
            {selectedChanges.length ? <div className="max-h-[300px] overflow-auto"><table className="min-w-[620px] w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5">{tt("date")}</th><th className="px-4 py-2.5">{tt("plate")}</th><th className="px-4 py-2.5">{tt("company")}</th><th className="px-4 py-2.5">{tt("action")}</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedChanges.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateFormatter.format(new Date(`${item.change_date}T00:00:00`))}</td><td className="px-4 py-3 font-bold text-slate-900">{item.vehicle_plate}</td><td className="px-4 py-3 text-slate-600">{item.company_name || "-"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${CHANGE_STYLE[item.change_type] || "bg-slate-100 text-slate-600"}`}>{item.change_type}</span></td></tr>)}</tbody></table></div> : <div className="flex min-h-[180px] items-center justify-center p-6 text-center text-xs text-slate-400">{loading ? <Loader2 className="animate-spin" /> : tt("noChanges")}</div>}
          </article>
        </section>
      </main>
    </>
  );
}
