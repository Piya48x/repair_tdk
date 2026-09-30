import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import { supabase } from "../../../lib/supabaseClient";
import { downloadTdkApprovedMonthlyReport } from "../../reports/tdkApprovedRegistryExcelExport";
import {
  addTdkApprovedRegistryVehicle,
  applyTdkApprovedRegistryImport,
  fetchTdkApprovedRegistry,
  fetchTdkApprovedRegistryChanges,
  fetchTdkApprovedRegistryImports,
  isTdkApprovedRegistrySchemaError,
  previewTdkApprovedRegistryImport,
  reactivateTdkApprovedRegistryVehicle,
  removeTdkApprovedRegistryVehicle,
  resetTdkApprovedRegistry,
  updateTdkApprovedRegistryVehicle,
} from "../services/tdkApprovedRegistryService";
import TdkApprovedRegistryFormModal from "./TdkApprovedRegistryFormModal";

const COPY = {
  th: {
    eyebrow: "TDK APPROVED MASTER REGISTRY",
    title: "จัดการทะเบียนรถ TDK APPROVED",
    subtitle: "เพิ่ม แก้ไข ถอดออก หรือเปิดใช้งานทะเบียนรถได้ทันที และยังอัปโหลด Master list เพื่อเทียบการเปลี่ยนแปลงทั้งชุดได้",
    reportMonth: "เดือนรายงาน MD",
    exportTh: "Export ภาษาไทย",
    exportEn: "Export English",
    refresh: "รีเฟรช",
    stats: { active: "ทะเบียนใช้งานปัจจุบัน", added: "เพิ่มเดือนนี้", removed: "ถอดออกเดือนนี้", companies: "บริษัทปัจจุบัน" },
    upload: { title: "อัปเดต Master list", hint: "รองรับไฟล์รูปแบบ Car List ที่มี Fullname, GroupName และ Licenseplate", date: "วันที่มีผล", choose: "เลือกไฟล์ทะเบียน", reading: "กำลังตรวจไฟล์...", reset: "ล้าง Master เดิม" },
    preview: { title: "ผลเปรียบเทียบก่อนอัปเดต", total: "ทะเบียนไม่ซ้ำ", baseline: "ข้อมูลตั้งต้น", added: "เพิ่มใหม่", reactivated: "กลับมาใช้งาน", removed: "ถอดออก", updated: "แก้ไขข้อมูล", unchanged: "ไม่เปลี่ยน", invalid: "ต้องแก้ไข", baselineHint: "นี่เป็นการนำเข้าครั้งแรก ระบบจะบันทึกเป็นข้อมูลตั้งต้นและยังไม่นับเป็นรถเพิ่ม", readyHint: "ระบบคำนวณผลต่างจาก Master list ปัจจุบันแล้ว", duplicates: "รวมทะเบียนซ้ำ {{count}} แถวให้เหลือทะเบียนละ 1 คันแล้ว", confirm: "ยืนยันอัปเดตทะเบียน", updating: "กำลังอัปเดต...", clear: "เลือกไฟล์ใหม่" },
    registry: { title: "ทะเบียน TDK APPROVED ปัจจุบัน", search: "ค้นหาทะเบียน ชื่อ หรือบริษัท...", active: "ใช้งาน", removed: "ถอดออก", empty: "ยังไม่มีข้อมูลทะเบียน", add: "เพิ่มทะเบียนรถ", actions: "จัดการ", edit: "แก้ไข", remove: "ถอดออก", reactivate: "เปิดใช้งานอีกครั้ง" },
    history: { title: "ประวัติการอัปเดต", empty: "ยังไม่มีประวัติ", total: "{{count}} ทะเบียน", changes: "+{{added}} / -{{removed}} / แก้ไข {{updated}}" },
    setup: { title: "ต้องอัปเดตฐานข้อมูลก่อน", hint: "รัน database/20260911_gatepass_vehicle_reports.sql เวอร์ชันล่าสุดใน Supabase SQL Editor" },
  },
  en: {
    eyebrow: "TDK APPROVED MASTER REGISTRY",
    title: "TDK APPROVED Vehicle Registry",
    subtitle: "Add, edit, remove, or reactivate vehicles directly, or upload the latest master list to compare the complete snapshot.",
    reportMonth: "MD report month",
    exportTh: "Export Thai",
    exportEn: "Export English",
    refresh: "Refresh",
    stats: { active: "Current active vehicles", added: "Added this month", removed: "Removed this month", companies: "Current companies" },
    upload: { title: "Update master list", hint: "Supports the Car List format with Fullname, GroupName, and Licenseplate columns.", date: "Effective date", choose: "Choose registry file", reading: "Checking file...", reset: "Clear old master" },
    preview: { title: "Comparison before update", total: "Unique plates", baseline: "Baseline", added: "Added", reactivated: "Reactivated", removed: "Removed", updated: "Details updated", unchanged: "Unchanged", invalid: "Needs correction", baselineHint: "This is the first import. Records will be saved as the baseline and will not be counted as additions.", readyHint: "The system calculated all changes against the current master registry.", duplicates: "Merged {{count}} duplicate source rows into one vehicle per plate.", confirm: "Confirm registry update", updating: "Updating...", clear: "Choose another file" },
    registry: { title: "Current TDK APPROVED registry", search: "Search plate, name, or company...", active: "Active", removed: "Removed", empty: "No registry data yet", add: "Add vehicle", actions: "Actions", edit: "Edit", remove: "Remove", reactivate: "Reactivate" },
    history: { title: "Update history", empty: "No update history yet", total: "{{count}} vehicles", changes: "+{{added}} / -{{removed}} / updated {{updated}}" },
    setup: { title: "Database update required", hint: "Run the latest database/20260911_gatepass_vehicle_reports.sql in the Supabase SQL Editor." },
  },
};

const pad = (value) => String(value).padStart(2, "0");
const localDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthBounds = (month) => {
  const normalizedMonth = /^\d{4}-\d{2}$/.test(String(month || "")) ? month : localDateKey(new Date()).slice(0, 7);
  const [year, monthNumber] = normalizedMonth.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return { from: `${normalizedMonth}-01`, to: `${normalizedMonth}-${pad(lastDay)}` };
};

const STATUS_STYLES = {
  BASELINE: "bg-blue-100 text-blue-700",
  ADDED: "bg-emerald-100 text-emerald-700",
  REACTIVATED: "bg-cyan-100 text-cyan-700",
  REMOVED: "bg-rose-100 text-rose-700",
  UPDATED: "bg-amber-100 text-amber-800",
  UNCHANGED: "bg-slate-100 text-slate-600",
};

function StatCard({ icon: Icon, label, value, tone, dark }) {
  const iconTone = {
    blue: dark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-700",
    green: dark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700",
    rose: dark ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-700",
    violet: dark ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-700",
  }[tone];
  return <article className={`rounded-2xl border p-4 shadow-sm ${dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between gap-3"><div><p className={`text-xs font-semibold ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</p><p className={`mt-2 text-2xl font-black ${dark ? "text-white" : "text-slate-950"}`}>{Number(value || 0).toLocaleString()}</p></div><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconTone}`}><Icon size={20} /></span></div></article>;
}

export default function TdkApprovedRegistryPanel({ theme = "light", pendingFile = null, onPendingFileConsumed }) {
  const { language, tt } = useScopedI18n(COPY);
  const dark = theme === "dark";
  const fileInputRef = useRef(null);
  const realtimeRefreshRef = useRef(null);
  const pendingFileTokenRef = useRef("");
  const today = useMemo(() => new Date(), []);
  const [snapshotDate, setSnapshotDate] = useState(localDateKey(today));
  const [reportMonth, setReportMonth] = useState(localDateKey(today).slice(0, 7));
  const [registry, setRegistry] = useState([]);
  const [changes, setChanges] = useState([]);
  const [imports, setImports] = useState([]);
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState("");
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState("");
  const [formRecord, setFormRecord] = useState(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const bounds = monthBounds(reportMonth);
      const [registryRows, changeRows, importRows] = await Promise.all([
        fetchTdkApprovedRegistry({ includeInactive: true }),
        fetchTdkApprovedRegistryChanges(bounds),
        fetchTdkApprovedRegistryImports(12),
      ]);
      setRegistry(registryRows);
      setChanges(changeRows);
      setImports(importRows);
      setSchemaMissing(false);
      setError("");
    } catch (loadError) {
      console.error("Load TDK APPROVED registry failed", loadError);
      if (isTdkApprovedRegistrySchemaError(loadError)) setSchemaMissing(true);
      else setError(loadError?.message || "Unable to load TDK APPROVED registry");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [reportMonth]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const scheduleRefresh = () => {
      window.clearTimeout(realtimeRefreshRef.current);
      realtimeRefreshRef.current = window.setTimeout(() => void loadData({ silent: true }), 800);
    };
    const channel = supabase
      .channel("tdk-approved-registry-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tdk_approved_registry_imports" }, scheduleRefresh)
      .subscribe();
    return () => {
      window.clearTimeout(realtimeRefreshRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const activeRegistry = useMemo(() => registry.filter((row) => row.is_active), [registry]);
  const metrics = useMemo(() => ({
    active: activeRegistry.length,
    added: changes.filter((row) => ["ADDED", "REACTIVATED"].includes(row.change_type)).length,
    removed: changes.filter((row) => row.change_type === "REMOVED").length,
    companies: new Set(activeRegistry.map((row) => row.company_name).filter(Boolean)).size,
  }), [activeRegistry, changes]);

  const filteredRegistry = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return registry;
    return registry.filter((row) => [row.vehicle_plate, row.full_name, row.company_name, row.contact_name, row.purpose]
      .some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [registry, search]);

  const processRegistryFile = useCallback(async (file) => {
    if (!file) return;
    setReading(true);
    try {
      const nextPreview = await previewTdkApprovedRegistryImport(file, registry);
      setPreview(nextPreview);
      if (nextPreview.summary.invalid) toast.error(`พบ ${nextPreview.summary.invalid} รายการที่ต้องแก้ไข`);
      else if (nextPreview.summary.duplicatesIgnored) toast.success(`ตรวจสอบแล้ว ${nextPreview.summary.ready.toLocaleString()} ทะเบียน · รวมรายการซ้ำ ${nextPreview.summary.duplicatesIgnored.toLocaleString()} แถวแล้ว`);
      else toast.success(`ตรวจสอบแล้ว ${nextPreview.summary.ready.toLocaleString()} ทะเบียน พร้อมอัปเดต`);
    } catch (previewError) {
      console.error("TDK APPROVED registry preview failed", previewError);
      setPreview(null);
      toast.error(previewError?.message || "อ่านไฟล์ทะเบียนไม่สำเร็จ");
    } finally {
      setReading(false);
    }
  }, [registry]);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    void processRegistryFile(file);
  };

  useEffect(() => {
    if (!pendingFile) {
      pendingFileTokenRef.current = "";
      return;
    }
    if (loading) return;
    const token = `${pendingFile.name}|${pendingFile.size}|${pendingFile.lastModified}`;
    if (pendingFileTokenRef.current === token) return;
    pendingFileTokenRef.current = token;
    void processRegistryFile(pendingFile).finally(() => onPendingFileConsumed?.());
  }, [loading, onPendingFileConsumed, pendingFile, processRegistryFile]);

  const handleUpdate = async () => {
    if (!preview || preview.summary.invalid) return;
    const additions = preview.summary.added + preview.summary.reactivated;
    if (!window.confirm(`ยืนยันอัปเดต Master list ${preview.summary.ready.toLocaleString("th-TH")} ทะเบียน\nเพิ่ม/กลับมาใช้งาน ${additions} · ถอดออก ${preview.summary.removed} · แก้ไข ${preview.summary.updated}`)) return;
    setUpdating(true);
    try {
      const result = await applyTdkApprovedRegistryImport(preview, snapshotDate);
      toast.success(`อัปเดตสำเร็จ: ปัจจุบัน ${result.total || 0} · เพิ่ม ${Number(result.added || 0) + Number(result.reactivated || 0)} · ถอดออก ${result.removed || 0}`);
      setPreview(null);
      await loadData({ silent: true });
    } catch (updateError) {
      console.error("TDK APPROVED registry update failed", updateError);
      if (isTdkApprovedRegistrySchemaError(updateError)) setSchemaMissing(true);
      toast.error(updateError?.message || "อัปเดตทะเบียนไม่สำเร็จ");
    } finally {
      setUpdating(false);
    }
  };

  const handleResetRegistry = async () => {
    if (!window.confirm("ยืนยันล้างข้อมูลทะเบียน TDK APPROVED เดิมทั้งหมดและประวัติการนำเข้า? การล้างนี้ไม่แตะข้อมูล Gatepass รายวัน และไม่สามารถย้อนกลับได้")) return;
    setResetting(true);
    try {
      const result = await resetTdkApprovedRegistry();
      setPreview(null);
      toast.success(`ล้างทะเบียนเดิมแล้ว ${Number(result.deleted_registry || 0).toLocaleString()} รายการ`);
      await loadData({ silent: true });
    } catch (resetError) {
      console.error("Reset TDK APPROVED registry failed", resetError);
      if (isTdkApprovedRegistrySchemaError(resetError)) setSchemaMissing(true);
      toast.error(resetError?.message || "ล้างทะเบียน TDK APPROVED ไม่สำเร็จ");
    } finally {
      setResetting(false);
    }
  };

  const handleExport = async (exportLanguage) => {
    setExporting(exportLanguage);
    try {
      const bounds = monthBounds(reportMonth);
      const [currentRows, monthChanges] = await Promise.all([
        fetchTdkApprovedRegistry({ includeInactive: false }),
        fetchTdkApprovedRegistryChanges(bounds),
      ]);
      await downloadTdkApprovedMonthlyReport({ language: exportLanguage, month: bounds.from.slice(0, 7), registry: currentRows, changes: monthChanges });
      toast.success(exportLanguage === "th" ? "สร้างรายงานภาษาไทยสำเร็จ" : "English report created");
    } catch (exportError) {
      console.error("Export TDK APPROVED monthly report failed", exportError);
      toast.error("สร้างรายงาน Excel ไม่สำเร็จ");
    } finally {
      setExporting("");
    }
  };

  const openAddForm = () => {
    setFormRecord(undefined);
    setFormOpen(true);
  };

  const openEditForm = (record) => {
    setFormRecord(record);
    setFormOpen(true);
  };

  const handleSaveRecord = async (payload, effectiveDate) => {
    setSavingRecord(true);
    try {
      const result = formRecord
        ? await updateTdkApprovedRegistryVehicle(formRecord.id, payload, effectiveDate)
        : await addTdkApprovedRegistryVehicle(payload, effectiveDate);
      toast.success(formRecord ? "แก้ไขทะเบียนรถสำเร็จ" : `เพิ่มทะเบียนรถสำเร็จ · รถที่ใช้งาน ${Number(result.active_total || 0).toLocaleString()} คัน`);
      setFormOpen(false);
      setFormRecord(undefined);
      await loadData({ silent: true });
    } catch (saveError) {
      console.error("Save TDK APPROVED registry record failed", saveError);
      if (isTdkApprovedRegistrySchemaError(saveError)) setSchemaMissing(true);
      toast.error(saveError?.message || "บันทึกทะเบียนรถไม่สำเร็จ");
    } finally {
      setSavingRecord(false);
    }
  };

  const handleRemoveRecord = async (record) => {
    if (!window.confirm(`ยืนยันถอดทะเบียน ${record.vehicle_plate} ออกจาก TDK APPROVED\nรายการจะถูกเก็บในประวัติรายเดือนและสามารถเปิดใช้งานอีกครั้งได้`)) return;
    setSavingRecord(true);
    try {
      await removeTdkApprovedRegistryVehicle(record.id, snapshotDate);
      toast.success(`ถอดทะเบียน ${record.vehicle_plate} แล้ว`);
      await loadData({ silent: true });
    } catch (removeError) {
      console.error("Remove TDK APPROVED registry record failed", removeError);
      toast.error(removeError?.message || "ถอดทะเบียนรถไม่สำเร็จ");
    } finally {
      setSavingRecord(false);
    }
  };

  const handleReactivateRecord = async (record) => {
    if (!window.confirm(`เปิดใช้งานทะเบียน ${record.vehicle_plate} อีกครั้ง ตั้งแต่วันที่ ${snapshotDate}?`)) return;
    setSavingRecord(true);
    try {
      await reactivateTdkApprovedRegistryVehicle(record.id, snapshotDate);
      toast.success(`เปิดใช้งานทะเบียน ${record.vehicle_plate} แล้ว`);
      await loadData({ silent: true });
    } catch (reactivateError) {
      console.error("Reactivate TDK APPROVED registry record failed", reactivateError);
      toast.error(reactivateError?.message || "เปิดใช้งานทะเบียนรถไม่สำเร็จ");
    } finally {
      setSavingRecord(false);
    }
  };

  const shell = dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white";
  const soft = dark ? "border-slate-700 bg-slate-950/45" : "border-slate-200 bg-slate-50/80";
  const title = dark ? "text-slate-100" : "text-slate-950";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  return <div className="space-y-5">
    <section className={`rounded-2xl border p-5 shadow-sm ${shell}`}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-[#2b59b0]"><ShieldCheck size={14} />{tt("eyebrow")}</p><h2 className={`mt-2 text-2xl font-black ${title}`}>{tt("title")}</h2><p className={`mt-2 max-w-3xl text-sm leading-6 ${muted}`}>{tt("subtitle")}</p></div><div className="flex flex-wrap items-end gap-2"><button type="button" onClick={openAddForm} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700"><Plus size={16} />{tt("registry.add")}</button><label><span className={`mb-1 block text-[10px] font-bold ${muted}`}>{tt("reportMonth")}</span><input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} className={`h-10 rounded-xl border px-3 text-xs font-bold ${soft}`} /></label><button type="button" onClick={() => void handleExport("th")} disabled={Boolean(exporting) || !activeRegistry.length} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#173b80] px-4 text-xs font-black text-white disabled:opacity-40">{exporting === "th" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{tt("exportTh")}</button><button type="button" onClick={() => void handleExport("en")} disabled={Boolean(exporting) || !activeRegistry.length} className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-black disabled:opacity-40 ${soft}`}>{exporting === "en" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{tt("exportEn")}</button></div></div>
    </section>

    {schemaMissing ? <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900"><div className="flex items-start gap-3"><AlertTriangle size={19} className="mt-0.5 shrink-0" /><div><p className="font-black">{tt("setup.title")}</p><p className="mt-1 text-sm text-amber-700">{tt("setup.hint")}</p></div></div></section> : null}
    {error ? <section className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</section> : null}

    <section className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${dark ? "border-rose-900/60 bg-rose-950/20" : "border-rose-200 bg-rose-50/70"}`}>
      <div>
        <p className={`text-sm font-black ${dark ? "text-rose-200" : "text-rose-900"}`}>ล้างข้อมูลทะเบียนเดิมก่อนตั้งต้นใหม่</p>
        <p className={`mt-1 text-xs ${dark ? "text-rose-300/80" : "text-rose-700"}`}>ลบเฉพาะ Master TDK APPROVED และประวัติการนำเข้า ไม่ลบข้อมูล Gatepass รายวัน</p>
      </div>
      <button type="button" onClick={() => void handleResetRegistry()} disabled={loading || reading || updating || resetting} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-xs font-black text-rose-700 shadow-sm disabled:opacity-40"><Trash2 size={15} />{resetting ? "กำลังล้าง..." : "ล้าง Master เดิม"}</button>
    </section>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard dark={dark} icon={ShieldCheck} label={tt("stats.active")} value={metrics.active} tone="blue" /><StatCard dark={dark} icon={UserPlus} label={tt("stats.added")} value={metrics.added} tone="green" /><StatCard dark={dark} icon={UserMinus} label={tt("stats.removed")} value={metrics.removed} tone="rose" /><StatCard dark={dark} icon={Building2} label={tt("stats.companies")} value={metrics.companies} tone="violet" /></section>

    <section className={`rounded-2xl border shadow-sm ${shell}`}><div className="flex flex-col gap-4 border-b border-inherit p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className={`flex items-center gap-2 text-lg font-black ${title}`}><FileSpreadsheet size={20} className="text-emerald-600" />{tt("upload.title")}</h3><p className={`mt-1 text-xs ${muted}`}>{tt("upload.hint")}</p></div><div className="flex items-end gap-2"><label><span className={`mb-1 block text-[10px] font-bold ${muted}`}>{tt("upload.date")}</span><span className="relative block"><CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="date" value={snapshotDate} onChange={(event) => setSnapshotDate(event.target.value)} className={`h-10 rounded-xl border pl-9 pr-3 text-xs font-bold ${soft}`} /></span></label><button type="button" onClick={() => void loadData()} disabled={loading} className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${soft}`}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{tt("refresh")}</button></div></div><div className="p-5"><button type="button" onClick={() => fileInputRef.current?.click()} disabled={reading || updating} className={`flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${dark ? "border-slate-600 bg-slate-950/40 hover:border-blue-400" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"}`}><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">{reading ? <Loader2 size={23} className="animate-spin" /> : <UploadCloud size={23} />}</span><p className={`mt-3 font-black ${title}`}>{reading ? tt("upload.reading") : tt("upload.choose")}</p></button><input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" /></div>

      {preview ? <div className="border-t border-inherit p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className={`font-black ${title}`}>{tt("preview.title")}</h3><p className={`mt-1 text-xs ${muted}`}>{preview.fileName} · {preview.sheetName}</p></div><button type="button" onClick={() => setPreview(null)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${soft}`}>{tt("preview.clear")}</button></div><div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-8">{["total", "baseline", "added", "reactivated", "removed", "updated", "unchanged", "invalid"].map((key) => <div key={key} className={`rounded-xl border p-3 ${soft}`}><p className={`text-[10px] font-bold ${muted}`}>{tt(`preview.${key}`)}</p><p className={`mt-1 text-xl font-black ${key === "invalid" && preview.summary[key] ? "text-rose-600" : title}`}>{preview.summary[key]}</p></div>)}</div><div className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm ${preview.summary.invalid ? "border-rose-300 bg-rose-50 text-rose-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}>{preview.summary.invalid ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}<div><p className="font-bold">{tt(preview.summary.isBaseline ? "preview.baselineHint" : "preview.readyHint")}</p>{preview.summary.duplicatesIgnored ? <p className="mt-1 text-xs font-semibold opacity-80">{tt("preview.duplicates", { count: preview.summary.duplicatesIgnored })}</p> : null}</div></div><div className={`mt-4 max-h-[380px] overflow-auto rounded-xl border ${dark ? "border-slate-700" : "border-slate-200"}`}><table className="min-w-[900px] w-full text-left text-xs"><thead className={dark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}><tr><th className="px-4 py-3">Sheet / Row</th><th className="px-4 py-3">License plate</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Purpose</th><th className="px-4 py-3">Result</th></tr></thead><tbody className={dark ? "divide-y divide-slate-800" : "divide-y divide-slate-100"}>{[...preview.rows, ...preview.removals].slice(0, 250).map((row) => <tr key={`${row.change_status}-${row.plate_key}-${row.source_row || "old"}`}><td className={`px-4 py-3 font-mono text-[10px] ${muted}`}>{row.source_sheet || "Registry"}<br />#{row.source_row || "-"}</td><td className={`px-4 py-3 font-black ${title}`}>{row.vehicle_plate}</td><td className={`px-4 py-3 ${title}`}>{row.full_name || "-"}</td><td className={`px-4 py-3 ${muted}`}>{row.company_name || "-"}</td><td className={`max-w-[240px] truncate px-4 py-3 ${muted}`}>{row.purpose || "-"}</td><td className="px-4 py-3">{row.import_errors?.length ? <span className="font-bold text-rose-600">{row.import_errors.join(", ")}</span> : <span className={`rounded-full px-2 py-1 text-[10px] font-black ${STATUS_STYLES[row.change_status] || STATUS_STYLES.UNCHANGED}`}>{row.change_status}</span>}</td></tr>)}</tbody></table></div><div className="mt-4 flex justify-end"><button type="button" onClick={handleUpdate} disabled={preview.summary.invalid > 0 || updating || !snapshotDate} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white disabled:opacity-40">{updating ? <Loader2 size={17} className="animate-spin" /> : <UploadCloud size={17} />}{updating ? tt("preview.updating") : tt("preview.confirm")}</button></div></div> : null}
    </section>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]"><article className={`overflow-hidden rounded-2xl border shadow-sm ${shell}`}><div className="flex flex-col gap-3 border-b border-inherit p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><h3 className={`font-black ${title}`}>{tt("registry.title")}</h3><button type="button" onClick={openAddForm} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-black text-white"><Plus size={14} />{tt("registry.add")}</button></div><label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tt("registry.search")} className={`h-9 w-full rounded-xl border pl-9 pr-3 text-xs sm:w-72 ${soft}`} /></label></div>{filteredRegistry.length ? <div className="max-h-[560px] overflow-auto"><table className="min-w-[1050px] w-full text-left text-xs"><thead className={`sticky top-0 z-[1] ${dark ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-500"}`}><tr><th className="px-4 py-3">ทะเบียน</th><th className="px-4 py-3">ชื่อ</th><th className="px-4 py-3">บริษัท</th><th className="px-4 py-3">วัตถุประสงค์ / ผู้ติดต่อ</th><th className="px-4 py-3">วันที่</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3 text-right">{tt("registry.actions")}</th></tr></thead><tbody className={dark ? "divide-y divide-slate-800" : "divide-y divide-slate-100"}>{filteredRegistry.map((row) => <tr key={row.id} className={!row.is_active ? (dark ? "bg-rose-950/10" : "bg-rose-50/40") : ""}><td className={`px-4 py-3 font-black ${title}`}>{row.vehicle_plate}</td><td className={`px-4 py-3 ${title}`}>{row.full_name || "-"}</td><td className={`px-4 py-3 ${muted}`}>{row.company_name || "-"}</td><td className="px-4 py-3"><p className={title}>{row.purpose || "-"}</p><p className={`mt-1 text-[10px] ${muted}`}>{row.contact_name || "-"}</p></td><td className={`whitespace-nowrap px-4 py-3 ${muted}`}>{row.first_seen_date} → {row.is_active ? row.last_seen_date : row.removed_date}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{tt(row.is_active ? "registry.active" : "registry.removed")}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1.5"><button type="button" onClick={() => openEditForm(row)} disabled={savingRecord} title={tt("registry.edit")} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 ${soft}`}><Pencil size={14} /></button>{row.is_active ? <button type="button" onClick={() => void handleRemoveRecord(row)} disabled={savingRecord} title={tt("registry.remove")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:opacity-40"><Trash2 size={14} /></button> : <button type="button" onClick={() => void handleReactivateRecord(row)} disabled={savingRecord} title={tt("registry.reactivate")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"><RotateCcw size={14} /></button>}</div></td></tr>)}</tbody></table></div> : <p className={`p-12 text-center text-sm ${muted}`}>{loading ? <Loader2 className="mx-auto animate-spin" /> : tt("registry.empty")}</p>}</article><article className={`rounded-2xl border p-5 shadow-sm ${shell}`}><h3 className={`flex items-center gap-2 font-black ${title}`}><History size={18} className="text-[#2b59b0]" />{tt("history.title")}</h3><div className="mt-4 space-y-3">{imports.length ? imports.map((item) => <div key={item.id} className={`rounded-xl border p-3 ${soft}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className={`truncate text-xs font-bold ${title}`}>{item.source_file || "Registry update"}</p><p className={`mt-1 text-[10px] ${muted}`}>{item.snapshot_date}</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-700">COMPLETED</span></div><p className={`mt-3 text-[11px] ${muted}`}>{tt("history.total", { count: item.total_count })}</p><p className={`mt-1 text-[10px] ${muted}`}>{tt("history.changes", { added: Number(item.added_count || 0) + Number(item.reactivated_count || 0), removed: item.removed_count || 0, updated: item.updated_count || 0 })}</p></div>) : <p className={`py-10 text-center text-xs ${muted}`}>{tt("history.empty")}</p>}</div></article></section>

    {formOpen ? <TdkApprovedRegistryFormModal record={formRecord} effectiveDate={snapshotDate} language={language} theme={theme} saving={savingRecord} onClose={() => { if (!savingRecord) { setFormOpen(false); setFormRecord(undefined); } }} onSubmit={handleSaveRecord} /> : null}
  </div>;
}
