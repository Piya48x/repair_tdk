import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import { supabase } from "../../../lib/supabaseClient";
import { fetchGatepassVehicleRecords, isGatepassSchemaMissing } from "../../../services/gatepassReportService";
import {
  applyGatepassExcelImport,
  downloadGatepassImportTemplate,
  fetchGatepassImportBatches,
  isGatepassImportSchemaError,
  previewGatepassExcelImport,
} from "../services/gatepassImportService";
import TdkApprovedRegistryPanel from "./TdkApprovedRegistryPanel";

const COPY = {
  th: {
    eyebrow: "Security Operations",
    title: "จัดการ Gatepass In-Out",
    subtitle: "นำเข้ารายงานรถเข้า-ออกประจำวันจาก Excel ตรวจสอบข้อมูลก่อนบันทึก และส่งข้อมูลไปยังรายงานผู้บริหารโดยอัตโนมัติ",
    openReport: "เปิดรายงานสำหรับ MD",
    template: "ดาวน์โหลดไฟล์ต้นแบบ",
    refresh: "รีเฟรชข้อมูล",
    stats: { today: "รถเข้าวันนี้", month: "รายการเดือนนี้", approved: "TDK APPROVED", temporary: "TEMPORARY", unspecified: "ไม่ระบุประเภท" },
    upload: {
      title: "นำเข้าไฟล์รายงานประจำวัน",
      hint: "ไฟล์รถผ่านประตูต้องมีวันที่ หากเลือกไฟล์ Master TDK APPROVED ระบบจะย้ายไปหน้าทะเบียนหลักให้อัตโนมัติ",
      action: "เลือกไฟล์ Excel",
      reading: "กำลังตรวจสอบไฟล์...",
      drop: "เลือกไฟล์รายงาน Gatepass จากเครื่อง",
    },
    preview: {
      title: "ตรวจสอบก่อนนำเข้า",
      total: "ทั้งหมด",
      ready: "พร้อมนำเข้า",
      invalid: "ต้องแก้ไข",
      approved: "Approved",
      temporary: "Temporary",
      unspecified: "ไม่ระบุประเภท",
      validTitle: "ข้อมูลผ่านการตรวจสอบและพร้อมบันทึก",
      invalidTitle: "ยังไม่สามารถนำเข้าได้ กรุณาแก้แถวที่แจ้งเตือนในไฟล์ต้นทาง",
      import: "ยืนยัน Import",
      importing: "กำลังบันทึก...",
      clear: "เลือกไฟล์ใหม่",
      showing: "แสดงตัวอย่าง {{shown}} รายการแรกจาก {{total}} รายการ (ระบบจะ Import ครบทั้งหมด)",
    },
    table: { row: "แถว", date: "วันที่ / เวลา", vehicle: "รถ", type: "ประเภท", contact: "คนขับ / บริษัท", status: "ผลตรวจ" },
    recent: { title: "รายการ Gatepass ล่าสุด", subtitle: "ข้อมูลที่บันทึกแล้วและพร้อมแสดงในรายงาน MD", empty: "ยังไม่มีข้อมูล Gatepass" },
    history: { title: "ประวัติ Import", empty: "ยังไม่มีประวัติการนำเข้า", records: "{{count}} รายการ", added: "เพิ่ม {{count}}", updated: "อัปเดต {{count}}" },
    setup: { title: "ต้องติดตั้งฐานข้อมูล Gatepass ก่อน", hint: "รัน database/20260911_gatepass_vehicle_reports.sql ใน Supabase SQL Editor แล้วกดรีเฟรช" },
    sections: { daily: "รายงานรถเข้า-ออกประจำวัน", registry: "ทะเบียนรถ TDK APPROVED" },
  },
  en: {
    eyebrow: "Security Operations",
    title: "Gatepass In-Out Management",
    subtitle: "Import the daily vehicle access report from Excel, validate every row before saving, and publish it automatically to the executive report.",
    openReport: "Open MD report",
    template: "Download template",
    refresh: "Refresh data",
    stats: { today: "Vehicles today", month: "Records this month", approved: "TDK APPROVED", temporary: "TEMPORARY", unspecified: "Unspecified" },
    upload: { title: "Import daily report", hint: "Daily gate files require a date. TDK APPROVED master files are routed to the master registry automatically.", action: "Choose Excel file", reading: "Validating file...", drop: "Select a Gatepass report from this device" },
    preview: { title: "Review before import", total: "Total", ready: "Ready", invalid: "Needs correction", approved: "Approved", temporary: "Temporary", unspecified: "Unspecified", validTitle: "All records passed validation and are ready to import", invalidTitle: "Import is blocked until the flagged source rows are corrected", import: "Confirm import", importing: "Importing...", clear: "Choose another file", showing: "Showing the first {{shown}} of {{total}} records (all records will be imported)" },
    table: { row: "Row", date: "Date / time", vehicle: "Vehicle", type: "Type", contact: "Driver / company", status: "Validation" },
    recent: { title: "Latest Gatepass records", subtitle: "Saved records available in the MD report", empty: "No Gatepass records yet" },
    history: { title: "Import history", empty: "No import history yet", records: "{{count}} records", added: "{{count}} added", updated: "{{count}} updated" },
    setup: { title: "Gatepass database setup is required", hint: "Run database/20260911_gatepass_vehicle_reports.sql in Supabase SQL Editor, then refresh." },
    sections: { daily: "Daily In-Out Reports", registry: "TDK APPROVED Registry" },
  },
};

const pad = (value) => String(value).padStart(2, "0");
const localDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatTime = (value) => String(value || "").slice(0, 5) || "-";

function SummaryCard({ icon: Icon, label, value, tone, dark }) {
  const tones = {
    blue: dark ? "border-blue-400/25 bg-blue-500/10 text-blue-300" : "border-blue-200 bg-blue-50 text-blue-700",
    emerald: dark ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: dark ? "border-amber-400/25 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700",
    violet: dark ? "border-violet-400/25 bg-violet-500/10 text-violet-300" : "border-violet-200 bg-violet-50 text-violet-700",
    slate: dark ? "border-slate-500/40 bg-slate-500/10 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
          <p className={`mt-2 text-2xl font-black ${dark ? "text-slate-100" : "text-slate-950"}`}>{Number(value || 0).toLocaleString()}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon size={20} /></span>
      </div>
    </article>
  );
}

export default function GatepassManagementPage({ theme = "light" }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const realtimeRefreshRef = useRef(null);
  const { language, tt } = useScopedI18n(COPY);
  const dark = theme === "dark";
  const [records, setRecords] = useState([]);
  const [latestRecords, setLatestRecords] = useState([]);
  const [batches, setBatches] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("daily");
  const [pendingRegistryFile, setPendingRegistryFile] = useState(null);

  const locale = language === "th" ? "th-TH" : language === "ko" ? "ko-KR" : "en-GB";
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }), [locale]);
  const dateTimeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }), [locale]);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const monthStart = `${localDateKey(new Date()).slice(0, 7)}-01`;
      const [recordRows, latestRows, importRows] = await Promise.all([
        fetchGatepassVehicleRecords({ from: monthStart }),
        fetchGatepassVehicleRecords({ limit: 15 }),
        fetchGatepassImportBatches(12),
      ]);
      setRecords(recordRows);
      setLatestRecords(latestRows);
      setBatches(importRows);
      setSchemaMissing(false);
      setError("");
    } catch (loadError) {
      console.error("Load Gatepass management data failed", loadError);
      if (isGatepassSchemaMissing(loadError) || isGatepassImportSchemaError(loadError)) setSchemaMissing(true);
      else setError(loadError?.message || "Unable to load Gatepass data");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const scheduleRefresh = () => {
      window.clearTimeout(realtimeRefreshRef.current);
      realtimeRefreshRef.current = window.setTimeout(() => void loadData({ silent: true }), 800);
    };
    const channel = supabase
      .channel("gatepass-management-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "gatepass_vehicle_records" }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "gatepass_import_batches" }, scheduleRefresh)
      .subscribe();
    return () => {
      window.clearTimeout(realtimeRefreshRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const metrics = useMemo(() => {
    const now = new Date();
    const today = localDateKey(now);
    const month = today.slice(0, 7);
    const todayRows = records.filter((row) => row.visit_date === today);
    const monthRows = records.filter((row) => String(row.visit_date || "").startsWith(month));
    return {
      today: new Set(todayRows.map((row) => `${row.vehicle_plate}|${row.province || ""}`)).size,
      month: monthRows.length,
      approved: monthRows.filter((row) => row.pass_type === "TDK_APPROVED").length,
      temporary: monthRows.filter((row) => row.pass_type === "TEMPORARY").length,
      unspecified: monthRows.filter((row) => row.pass_type === "UNSPECIFIED").length,
    };
  }, [records]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true);
    try {
      const nextPreview = await previewGatepassExcelImport(file);
      const registryPlateRows = nextPreview.rows.filter((row) => row.vehicle_plate);
      const looksLikeMasterRegistry = registryPlateRows.length > 0
        && nextPreview.rows.every((row) => !row.visit_date)
        && registryPlateRows.every((row) => row.pass_type === "TDK_APPROVED");
      if (looksLikeMasterRegistry) {
        setPreview(null);
        setPendingRegistryFile(file);
        setActiveSection("registry");
        toast.success("ตรวจพบไฟล์ทะเบียนหลัก TDK APPROVED ระบบย้ายไปหน้าจัดการทะเบียนให้อัตโนมัติ");
        return;
      }
      setPreview(nextPreview);
      if (nextPreview.summary.invalid) toast.error(`พบ ${nextPreview.summary.invalid} แถวที่ต้องแก้ไข`);
      else toast.success(`ตรวจสอบแล้ว ${nextPreview.summary.ready} รายการ พร้อมนำเข้า`);
    } catch (previewError) {
      console.error("Gatepass preview failed", previewError);
      setPreview(null);
      toast.error(previewError?.message || "อ่านไฟล์ Excel ไม่สำเร็จ");
    } finally {
      setReading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.summary.invalid > 0) return;
    if (!window.confirm(`ยืนยันนำเข้า ${preview.summary.ready.toLocaleString("th-TH")} รายการจาก ${preview.fileName}\nรายการที่มีเลข Gatepass เดิมจะถูกอัปเดตแทนการสร้างซ้ำ`)) return;
    setImporting(true);
    try {
      const result = await applyGatepassExcelImport(preview);
      toast.success(`Import สำเร็จ: เพิ่ม ${result.inserted || 0}, อัปเดต ${result.updated || 0}`);
      setPreview(null);
      await loadData({ silent: true });
    } catch (importError) {
      console.error("Gatepass import failed", importError);
      if (isGatepassImportSchemaError(importError)) {
        setSchemaMissing(true);
        toast.error("กรุณารันไฟล์ SQL Gatepass เวอร์ชันล่าสุดก่อนใช้งาน Import");
      } else {
        toast.error(importError?.message || "Import ไม่สำเร็จ ระบบไม่ได้บันทึกข้อมูลบางส่วน");
      }
    } finally {
      setImporting(false);
    }
  };

  const shell = dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white";
  const soft = dark ? "border-slate-700 bg-slate-950/45" : "border-slate-200 bg-slate-50/80";
  const title = dark ? "text-slate-100" : "text-slate-950";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  return (
    <div className="space-y-5">
      <section className={`overflow-hidden rounded-2xl border shadow-sm ${shell}`}>
        <div className="h-1 bg-gradient-to-r from-[#183f88] via-[#2b59b0] to-cyan-500" />
        <div className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#2b59b0]"><ShieldCheck size={14} />{tt("eyebrow")}</p>
            <h1 className={`mt-2 text-2xl font-black tracking-tight sm:text-3xl ${title}`}>{tt("title")}</h1>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${muted}`}>{tt("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSection === "daily" ? <button type="button" onClick={() => downloadGatepassImportTemplate()} className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-bold transition ${soft}`}><Download size={15} />{tt("template")}</button> : null}
            <button type="button" onClick={() => navigate("/reports/gatepass/daily")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2b59b0] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#244a95]"><ArrowUpRight size={15} />{tt("openReport")}</button>
          </div>
        </div>
      </section>

      <section className={`flex flex-col gap-2 rounded-2xl border p-2 shadow-sm sm:flex-row ${shell}`}>
        <button
          type="button"
          onClick={() => setActiveSection("daily")}
          className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${activeSection === "daily" ? "bg-[#2b59b0] text-white shadow-sm" : `${muted} hover:bg-slate-100 dark:hover:bg-slate-800`}`}
        >
          <CarFront size={18} />{tt("sections.daily")}
        </button>
        <button
          type="button"
          onClick={() => navigate("/admin-dashboard/gatepass-registry")}
          className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${activeSection === "registry" ? "bg-emerald-600 text-white shadow-sm" : `${muted} hover:bg-slate-100 dark:hover:bg-slate-800`}`}
        >
          <ShieldCheck size={18} />{tt("sections.registry")}
        </button>
      </section>

      {activeSection === "registry" ? <TdkApprovedRegistryPanel theme={theme} pendingFile={pendingRegistryFile} onPendingFileConsumed={() => setPendingRegistryFile(null)} /> : <>

      {schemaMissing ? <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0" size={19} /><div><p className="font-black">{tt("setup.title")}</p><p className="mt-1 text-sm text-amber-700">{tt("setup.hint")}</p></div></div></section> : null}
      {error ? <section className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</section> : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <SummaryCard dark={dark} icon={CarFront} label={tt("stats.today")} value={metrics.today} tone="blue" />
        <SummaryCard dark={dark} icon={CalendarDays} label={tt("stats.month")} value={metrics.month} tone="violet" />
        <SummaryCard dark={dark} icon={ShieldCheck} label={tt("stats.approved")} value={metrics.approved} tone="emerald" />
        <SummaryCard dark={dark} icon={Clock3} label={tt("stats.temporary")} value={metrics.temporary} tone="amber" />
        <SummaryCard dark={dark} icon={AlertTriangle} label={tt("stats.unspecified")} value={metrics.unspecified} tone="slate" />
      </section>

      <section className={`rounded-2xl border shadow-sm ${shell}`}>
        <div className="flex flex-col gap-4 border-b border-inherit p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={`flex items-center gap-2 text-lg font-black ${title}`}><FileSpreadsheet size={20} className="text-emerald-600" />{tt("upload.title")}</h2>
            <p className={`mt-1 text-xs leading-5 ${muted}`}>{tt("upload.hint")}</p>
          </div>
          <button type="button" onClick={() => void loadData()} disabled={loading} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold ${soft}`}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{tt("refresh")}</button>
        </div>

        <div className="p-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={reading || importing}
            className={`flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${dark ? "border-slate-600 bg-slate-950/40 hover:border-blue-400 hover:bg-blue-500/5" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/60"}`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">{reading ? <Loader2 size={25} className="animate-spin" /> : <UploadCloud size={25} />}</span>
            <p className={`mt-4 font-black ${title}`}>{reading ? tt("upload.reading") : tt("upload.action")}</p>
            <p className={`mt-1 text-xs ${muted}`}>{tt("upload.drop")}</p>
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
        </div>

        {preview ? (
          <div className="border-t border-inherit p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className={`font-black ${title}`}>{tt("preview.title")}</h3><p className={`mt-1 text-xs ${muted}`}>{preview.fileName} · {preview.sheetName} · {preview.summary.dateFrom}{preview.summary.dateTo !== preview.summary.dateFrom ? ` – ${preview.summary.dateTo}` : ""}</p></div>
              <button type="button" onClick={() => setPreview(null)} disabled={importing} className={`rounded-xl border px-3 py-2 text-xs font-bold ${soft}`}>{tt("preview.clear")}</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
              {[
                ["total", preview.summary.total, "slate"], ["ready", preview.summary.ready, "emerald"], ["invalid", preview.summary.invalid, "rose"],
                ["approved", preview.summary.approved, "blue"], ["temporary", preview.summary.temporary, "amber"], ["unspecified", preview.summary.unspecified, "slate"],
              ].map(([key, value, tone]) => <div key={key} className={`rounded-xl border p-3 ${soft}`}><p className={`text-[10px] font-bold ${muted}`}>{tt(`preview.${key}`)}</p><p className={`mt-1 text-xl font-black ${tone === "rose" ? "text-rose-600" : tone === "emerald" ? "text-emerald-600" : title}`}>{value}</p></div>)}
            </div>

            <div className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm ${preview.summary.invalid ? "border-rose-300 bg-rose-50 text-rose-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}>
              {preview.summary.invalid ? <AlertTriangle size={19} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={19} className="mt-0.5 shrink-0" />}
              <p className="font-bold">{tt(preview.summary.invalid ? "preview.invalidTitle" : "preview.validTitle")}</p>
            </div>

            <div className={`mt-4 max-h-[430px] overflow-auto rounded-xl border ${dark ? "border-slate-700" : "border-slate-200"}`}>
              <table className="min-w-[980px] w-full text-left text-xs">
                <thead className={`sticky top-0 z-10 ${dark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}><tr>{["row", "date", "vehicle", "type", "contact", "status"].map((key) => <th key={key} className="px-4 py-3 font-black">{tt(`table.${key}`)}</th>)}</tr></thead>
                <tbody className={dark ? "divide-y divide-slate-800" : "divide-y divide-slate-100"}>
                  {preview.rows.slice(0, 300).map((row) => <tr key={`${row.source_sheet}-${row.source_row}`} className={row.import_errors.length ? (dark ? "bg-rose-950/20" : "bg-rose-50/70") : ""}><td className={`px-4 py-3 align-top font-mono ${muted}`}>{row.source_sheet}<br />#{row.source_row}</td><td className="px-4 py-3 align-top"><p className={`font-bold ${title}`}>{row.visit_date || "-"}</p><p className={`mt-1 ${muted}`}>{formatTime(row.entry_time)} – {row.exit_date && row.exit_date !== row.visit_date ? `${row.exit_date} ` : ""}{formatTime(row.exit_time)}</p></td><td className="px-4 py-3 align-top"><p className={`font-black ${title}`}>{row.vehicle_plate || "-"}</p><p className={`mt-1 ${muted}`}>{row.province || row.vehicle_type || "-"}</p></td><td className="px-4 py-3 align-top"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${row.pass_type === "TEMPORARY" ? "bg-amber-100 text-amber-800" : row.pass_type === "UNSPECIFIED" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>{row.pass_type || "-"}</span><p className={`mt-2 font-mono text-[10px] ${muted}`}>{row.source_group_name || row.gatepass_number || "No group"}</p></td><td className="px-4 py-3 align-top"><p className={`font-semibold ${title}`}>{row.driver_name || "-"}</p><p className={`mt-1 ${muted}`}>{row.company_name || "-"}</p></td><td className="px-4 py-3 align-top">{row.import_errors.length ? <div className="max-w-xs space-y-1 text-rose-600">{row.import_errors.map((message) => <p key={message} className="font-semibold">• {message}</p>)}</div> : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-700"><CheckCircle2 size={12} />พร้อม</span>}</td></tr>)}
                </tbody>
              </table>
            </div>
            {preview.rows.length > 300 ? <p className={`mt-2 text-right text-[11px] ${muted}`}>{tt("preview.showing", { shown: 300, total: preview.rows.length.toLocaleString() })}</p> : null}

            <div className="mt-4 flex justify-end"><button type="button" onClick={handleImport} disabled={preview.summary.invalid > 0 || importing} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">{importing ? <Loader2 size={17} className="animate-spin" /> : <UploadCloud size={17} />}{importing ? tt("preview.importing") : tt("preview.import")}</button></div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <article className={`overflow-hidden rounded-2xl border shadow-sm ${shell}`}>
          <div className="border-b border-inherit p-5"><h2 className={`font-black ${title}`}>{tt("recent.title")}</h2><p className={`mt-1 text-xs ${muted}`}>{tt("recent.subtitle")}</p></div>
          {latestRecords.length ? <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-xs"><thead className={dark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500"}><tr><th className="px-4 py-3">วันที่</th><th className="px-4 py-3">ทะเบียนรถ</th><th className="px-4 py-3">ประเภท</th><th className="px-4 py-3">เวลาเข้า–ออก</th><th className="px-4 py-3">บริษัท / วัตถุประสงค์</th></tr></thead><tbody className={dark ? "divide-y divide-slate-800" : "divide-y divide-slate-100"}>{latestRecords.map((row) => <tr key={row.id}><td className={`whitespace-nowrap px-4 py-3 ${title}`}>{dateFormatter.format(new Date(`${row.visit_date}T00:00:00`))}</td><td className="px-4 py-3"><p className={`font-black ${title}`}>{row.vehicle_plate}</p><p className={`mt-0.5 text-[10px] ${muted}`}>{row.province || row.gatepass_number || "-"}</p></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.pass_type === "TEMPORARY" ? "bg-amber-100 text-amber-800" : row.pass_type === "UNSPECIFIED" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>{row.pass_type}</span></td><td className={`whitespace-nowrap px-4 py-3 ${muted}`}>{formatTime(row.entry_time)} – {row.exit_date && row.exit_date !== row.visit_date ? `${row.exit_date} ` : ""}{formatTime(row.exit_time)}</td><td className="px-4 py-3"><p className={`max-w-[260px] truncate font-semibold ${title}`}>{row.company_name || row.driver_name || "-"}</p><p className={`mt-0.5 max-w-[260px] truncate text-[10px] ${muted}`}>{row.purpose || row.contact_person || "-"}</p></td></tr>)}</tbody></table></div> : <div className={`p-12 text-center text-sm ${muted}`}>{loading ? <Loader2 className="mx-auto animate-spin" /> : tt("recent.empty")}</div>}
        </article>

        <article className={`rounded-2xl border p-5 shadow-sm ${shell}`}>
          <h2 className={`flex items-center gap-2 font-black ${title}`}><History size={18} className="text-[#2b59b0]" />{tt("history.title")}</h2>
          <div className="mt-4 space-y-3">
            {batches.length ? batches.map((batch) => <div key={batch.id} className={`rounded-xl border p-3 ${soft}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className={`truncate text-xs font-bold ${title}`}>{batch.source_file || "Gatepass import"}</p><p className={`mt-1 text-[10px] ${muted}`}>{dateTimeFormatter.format(new Date(batch.imported_at))}</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-700">COMPLETED</span></div><p className={`mt-3 text-[11px] ${muted}`}>{tt("history.records", { count: batch.record_count })} · {tt("history.added", { count: batch.inserted_count })} · {tt("history.updated", { count: batch.updated_count })}</p><p className={`mt-1 text-[10px] ${muted}`}>{batch.date_from || "-"}{batch.date_to && batch.date_to !== batch.date_from ? ` – ${batch.date_to}` : ""}</p></div>) : <p className={`py-10 text-center text-xs ${muted}`}>{tt("history.empty")}</p>}
          </div>
        </article>
      </section>
      </>}
    </div>
  );
}
