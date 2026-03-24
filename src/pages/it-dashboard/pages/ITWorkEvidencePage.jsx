import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  CalendarDays,
  Camera,
  FileText,
  Image as ImageIcon,
  MapPin,
  Monitor,
  Printer,
  Search,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import {
  createITWorkRecord,
  deleteITWorkRecord,
  isITWorkRecordSchemaError,
  loadITWorkRecords,
  normalizeEvidenceImages,
  normalizeText,
  removeITWorkEvidenceFiles,
  uploadITWorkEvidenceFiles,
} from "../../../services/itWorkRecordService";

const MAX_FILES = 8;
const TYPE_OPTIONS = [
  { value: "camera_install", label: "ติดตั้งกล้อง", icon: Camera },
  { value: "pc_install", label: "ติดตั้ง PC", icon: Monitor },
  { value: "notebook_install", label: "ติดตั้ง Notebook", icon: Monitor },
  { value: "printer_install", label: "ติดตั้ง Printer", icon: Printer },
  { value: "maintenance", label: "บำรุงรักษา / ปรับปรุง", icon: Wrench },
  { value: "repair", label: "ซ่อม / แก้ไข", icon: Wrench },
  { value: "other", label: "งาน IT อื่น ๆ", icon: FileText },
];
const STATUS_OPTIONS = [
  { value: "pending", label: "รอดำเนินการ" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
];

const toDateTimeLocalValue = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTypeMeta = (type) => TYPE_OPTIONS.find((item) => item.value === type) || TYPE_OPTIONS[TYPE_OPTIONS.length - 1];
const getStatusLabel = (status) => STATUS_OPTIONS.find((item) => item.value === status)?.label || "เสร็จสิ้น";
const buildForm = (department = "") => ({
  title: "",
  job_type: TYPE_OPTIONS[0].value,
  work_status: "completed",
  performed_at: toDateTimeLocalValue(),
  location: "",
  reference_code: "",
  requester_name: "",
  department,
  device_details: "",
  description: "",
  result_summary: "",
});

export default function ITWorkEvidencePage({ theme, uiTheme, currentUser }) {
  const fileInputRef = useRef(null);
  const previewsRef = useRef([]);
  const [records, setRecords] = useState([]);
  const [formData, setFormData] = useState(buildForm());
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loadError, setLoadError] = useState("");
  const [schemaMissing, setSchemaMissing] = useState(false);

  const cardClass = `${uiTheme.surfaceCard} rounded-3xl border`;
  const subCardClass = theme === "dark" ? "rounded-2xl border border-slate-700 bg-[#162136]" : "rounded-2xl border border-slate-200 bg-slate-50";
  const inputClass = `w-full rounded-2xl border px-4 py-3 text-sm ${uiTheme.searchInputMobile}`;
  const softTextClass = theme === "dark" ? "text-slate-400" : "text-slate-500";

  const loadRecords = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const { data, error } = await loadITWorkRecords();
    if (error) {
      console.error("Load IT work records error:", error);
      const missing = isITWorkRecordSchemaError(error);
      setSchemaMissing(missing);
      setLoadError(missing ? "ยังไม่พบตารางหรือ bucket สำหรับบันทึกงาน IT กรุณารัน SQL migration ก่อนใช้งาน" : "ไม่สามารถโหลดบันทึกงาน IT ได้");
      setRecords([]);
    } else {
      setRecords(Array.isArray(data) ? data : []);
      setLoadError("");
      setSchemaMissing(false);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    previewsRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((entry) => entry?.previewUrl && URL.revokeObjectURL(entry.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.department) return;
    setFormData((prev) => (normalizeText(prev.department) ? prev : { ...prev, department: currentUser.department }));
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;
    let channel = null;
    const init = async () => {
      await loadRecords();
      if (!mounted) return;
      channel = supabase
        .channel("it_work_records_realtime")
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

  const resetForm = () => {
    setFormData(buildForm(currentUser?.department || ""));
    setSelectedFiles((prev) => {
      prev.forEach((entry) => entry?.previewUrl && URL.revokeObjectURL(entry.previewUrl));
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (event) => {
    const rawFiles = Array.from(event.target.files || []);
    const incoming = rawFiles.filter((file) => String(file.type || "").startsWith("image/"));
    const slots = MAX_FILES - selectedFiles.length;
    if (incoming.length !== rawFiles.length) {
      toast.error("ระบบรองรับเฉพาะไฟล์รูปภาพ");
    }
    if (slots <= 0) {
      toast.error(`อัปโหลดได้สูงสุด ${MAX_FILES} รูป`);
      event.target.value = "";
      return;
    }
    const nextEntries = incoming.slice(0, slots).map((file, index) => ({
      id: `${file.name}_${file.lastModified}_${selectedFiles.length + index}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    if (incoming.length > slots) toast.error(`เลือกได้ไม่เกิน ${MAX_FILES} รูป`);
    setSelectedFiles((prev) => [...prev, ...nextEntries]);
    event.target.value = "";
  };

  const removeSelectedFile = (fileId) => {
    setSelectedFiles((prev) => {
      const removed = prev.find((item) => item.id === fileId);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((item) => item.id !== fileId);
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!currentUser?.id) return toast.error("กำลังโหลดข้อมูลผู้ใช้งาน");
    if (!normalizeText(formData.title) || !normalizeText(formData.description)) return toast.error("กรุณากรอกหัวข้อและรายละเอียดงาน");

    setSaving(true);
    let uploadedImages = [];
    try {
      uploadedImages = await uploadITWorkEvidenceFiles(selectedFiles.map((entry) => entry.file), currentUser.id);
      const { error } = await createITWorkRecord({
        title: normalizeText(formData.title),
        job_type: normalizeText(formData.job_type) || "other",
        work_status: normalizeText(formData.work_status) || "completed",
        performed_at: formData.performed_at ? new Date(formData.performed_at).toISOString() : new Date().toISOString(),
        location: normalizeText(formData.location),
        reference_code: normalizeText(formData.reference_code),
        requester_name: normalizeText(formData.requester_name),
        department: normalizeText(formData.department),
        device_details: normalizeText(formData.device_details),
        description: normalizeText(formData.description),
        result_summary: normalizeText(formData.result_summary),
        evidence_images: uploadedImages,
        created_by: currentUser.id,
        created_by_name: normalizeText(currentUser.name) || normalizeText(currentUser.email) || "IT Support",
      });
      if (error) throw error;
      toast.success("บันทึกงาน IT สำเร็จ");
      resetForm();
      await loadRecords({ silent: true });
    } catch (error) {
      console.error("Save IT work record error:", error);
      if (uploadedImages.length > 0) await removeITWorkEvidenceFiles(uploadedImages);
      if (isITWorkRecordSchemaError(error)) {
        setSchemaMissing(true);
        setLoadError("ยังไม่พบตารางหรือ bucket สำหรับบันทึกงาน IT กรุณารัน SQL migration ก่อนใช้งาน");
      }
      toast.error(error?.message || "ไม่สามารถบันทึกงาน IT ได้");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!record?.id || deletingId) return;
    if (!window.confirm("ต้องการลบบันทึกงาน IT รายการนี้ใช่หรือไม่?")) return;
    setDeletingId(record.id);
    try {
      const { error } = await deleteITWorkRecord(record.id);
      if (error) throw error;
      setRecords((prev) => prev.filter((item) => item.id !== record.id));
      await removeITWorkEvidenceFiles(record.evidence_images);
      toast.success("ลบบันทึกงานเรียบร้อย");
    } catch (error) {
      console.error("Delete IT work record error:", error);
      toast.error(error?.message || "ไม่สามารถลบบันทึกงานได้");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRecords = records.filter((record) => {
    const searchValue = normalizeText(searchQuery).toLowerCase();
    const haystack = [record.title, record.location, record.reference_code, record.requester_name, record.department, record.device_details, record.description, record.result_summary, record.created_by_name]
      .map((value) => normalizeText(value).toLowerCase())
      .join(" ");
    return (typeFilter === "ALL" || record.job_type === typeFilter) &&
      (statusFilter === "ALL" || record.work_status === statusFilter) &&
      (!searchValue || haystack.includes(searchValue));
  });

  const summaryCards = [
    { label: "บันทึกทั้งหมด", value: records.length, helper: "รายการสะสม", icon: FileText },
    { label: "มีภาพหลักฐาน", value: records.filter((item) => normalizeEvidenceImages(item.evidence_images).length > 0).length, helper: "รายการที่แนบรูป", icon: ImageIcon },
    { label: "เสร็จสิ้นแล้ว", value: records.filter((item) => item.work_status === "completed").length, helper: "completed", icon: Wrench },
    {
      label: "เดือนนี้",
      value: records.filter((item) => {
        const date = new Date(item.performed_at || item.created_at);
        const now = new Date();
        return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length,
      helper: "ตามวันปฏิบัติงาน",
      icon: CalendarDays,
    },
  ];

  return (
    <div className="space-y-6">
      <section className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${theme === "dark" ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200" : "border-cyan-200 bg-cyan-50 text-cyan-700"}`}>
              <Camera size={14} />
              IT Work Evidence
            </div>
            <h2 className={`mt-3 text-2xl font-black ${uiTheme.textPrimary}`}>บันทึกงานติดตั้ง ปรับปรุง และแก้ไข พร้อมภาพหลักฐาน</h2>
            <p className={`mt-2 text-sm leading-6 ${uiTheme.textSecondary}`}>ใช้เก็บหลักฐานงาน IT เช่น ติดตั้งกล้อง ติดตั้ง PC / Notebook เครื่องพิมพ์ งานซ่อมบำรุง และงานปรับปรุงหน้างาน</p>
          </div>
          <div className={`${subCardClass} px-4 py-3 text-sm`}>
            <p className="font-semibold">ผู้บันทึกปัจจุบัน</p>
            <p className={`mt-1 text-base font-black ${uiTheme.textPrimary}`}>{currentUser?.name || "กำลังโหลดข้อมูลผู้ใช้งาน"}</p>
            <p className={`mt-1 text-xs ${softTextClass}`}>{currentUser?.department || "IT Department"}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`${subCardClass} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${softTextClass}`}>{item.label}</p>
                    <p className={`mt-2 text-2xl font-black ${uiTheme.textPrimary}`}>{item.value}</p>
                    <p className={`mt-1 text-xs ${softTextClass}`}>{item.helper}</p>
                  </div>
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${theme === "dark" ? "bg-[#0f172a] text-cyan-300" : "bg-white text-[#2b59b0]"}`}>
                    <Icon size={20} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {loadError && <section className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${schemaMissing ? (theme === "dark" ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800") : (theme === "dark" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700")}`}>{loadError}</section>}

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className={`text-lg font-black ${uiTheme.textPrimary}`}>สร้างบันทึกงานใหม่</h3>
              <p className={`mt-1 text-sm ${softTextClass}`}>แนบภาพประกอบเพื่อใช้เป็นหลักฐานงาน IT</p>
            </div>
            <button type="button" onClick={resetForm} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${theme === "dark" ? "border-slate-600 bg-[#162136] text-slate-200 hover:bg-[#1e2b44]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>ล้างฟอร์ม</button>
          </div>
          <form className="mt-5 space-y-4" onSubmit={handleSave}>
            <input value={formData.title} onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))} className={inputClass} placeholder="หัวข้องาน เช่น ติดตั้งกล้องคลังสินค้า" maxLength={180} />
            <div className="grid gap-4 sm:grid-cols-2">
              <select value={formData.job_type} onChange={(event) => setFormData((prev) => ({ ...prev, job_type: event.target.value }))} className={inputClass}>{TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <select value={formData.work_status} onChange={(event) => setFormData((prev) => ({ ...prev, work_status: event.target.value }))} className={inputClass}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input type="datetime-local" value={formData.performed_at} onChange={(event) => setFormData((prev) => ({ ...prev, performed_at: event.target.value }))} className={inputClass} />
              <input value={formData.reference_code} onChange={(event) => setFormData((prev) => ({ ...prev, reference_code: event.target.value }))} className={inputClass} placeholder="เลขอ้างอิง / Ticket / Asset" maxLength={80} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input value={formData.location} onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))} className={inputClass} placeholder="สถานที่" maxLength={120} />
              <input value={formData.department} onChange={(event) => setFormData((prev) => ({ ...prev, department: event.target.value }))} className={inputClass} placeholder="แผนก" maxLength={100} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input value={formData.requester_name} onChange={(event) => setFormData((prev) => ({ ...prev, requester_name: event.target.value }))} className={inputClass} placeholder="ผู้แจ้ง / ผู้ประสานงาน" maxLength={120} />
              <input value={formData.device_details} onChange={(event) => setFormData((prev) => ({ ...prev, device_details: event.target.value }))} className={inputClass} placeholder="อุปกรณ์ / รายการที่ทำ" maxLength={180} />
            </div>
            <textarea rows={4} value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} className={inputClass} placeholder="รายละเอียดงานที่ติดตั้ง ปรับปรุง หรือซ่อมแก้ไข" />
            <textarea rows={3} value={formData.result_summary} onChange={(event) => setFormData((prev) => ({ ...prev, result_summary: event.target.value }))} className={inputClass} placeholder="ผลลัพธ์ / หมายเหตุเพิ่มเติม" />
            <div className={`${subCardClass} p-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`text-sm font-bold ${uiTheme.textPrimary}`}>ภาพประกอบหลักฐาน</p>
                  <p className={`mt-1 text-xs ${softTextClass}`}>แนบได้สูงสุด {MAX_FILES} รูป</p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${theme === "dark" ? "bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20" : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"}`}><Upload size={16} />เพิ่มรูป</button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              {selectedFiles.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedFiles.map((entry) => (
                    <div key={entry.id} className={`overflow-hidden rounded-2xl border ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}>
                      <img src={entry.previewUrl} alt={entry.file?.name || "evidence-preview"} className="h-28 w-full object-cover" />
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <p className={`min-w-0 truncate text-xs font-semibold ${uiTheme.textSecondary}`}>{entry.file?.name}</p>
                        <button type="button" onClick={() => removeSelectedFile(entry.id)} className={theme === "dark" ? "rounded-lg p-1 text-rose-300 hover:bg-rose-500/10" : "rounded-lg p-1 text-rose-600 hover:bg-rose-50"} aria-label="ลบรูปที่เลือก"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className={`mt-4 rounded-2xl border border-dashed px-4 py-6 text-center ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-300 text-slate-500"}`}><ImageIcon size={20} className="mx-auto mb-2" /><p className="text-sm font-semibold">ยังไม่ได้เลือกรูปประกอบ</p></div>}
            </div>
            <button type="submit" disabled={saving || !currentUser?.id || schemaMissing} className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white ${saving || !currentUser?.id || schemaMissing ? "cursor-not-allowed bg-slate-400" : "bg-[#2b59b0] hover:bg-[#244a95]"}`}><Camera size={16} />{saving ? "กำลังบันทึก..." : "บันทึกงาน IT"}</button>
          </form>
        </aside>

        <section className="space-y-4">
          <div className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className={`text-lg font-black ${uiTheme.textPrimary}`}>รายการบันทึกย้อนหลัง</h3>
                <p className={`mt-1 text-sm ${softTextClass}`}>ค้นหางานติดตั้ง ซ่อม และปรับปรุงที่เคยบันทึกไว้</p>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme === "dark" ? "border-slate-600 bg-[#162136] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>พบ {filteredRecords.length} รายการ</div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <label className={`group flex items-center gap-2 rounded-2xl border px-4 py-3 ${uiTheme.searchInputMobile}`}><Search size={16} className={uiTheme.searchIcon} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="ค้นหาจากหัวข้อ สถานที่ อุปกรณ์ หรือเลขอ้างอิง" /></label>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={inputClass}><option value="ALL">ทุกประเภทงาน</option>{TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}><option value="ALL">ทุกสถานะ</option>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </div>
          </div>

          {loading ? (
            <div className={`${cardClass} p-10 text-center`}><div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#2b59b0]/20 border-t-[#2b59b0]" /><p className={`mt-4 text-sm font-semibold ${uiTheme.textSecondary}`}>กำลังโหลดบันทึกงาน IT...</p></div>
          ) : filteredRecords.length === 0 ? (
            <div className={`${cardClass} border-dashed p-10 text-center`}><Camera size={24} className={`mx-auto ${softTextClass}`} /><p className={`mt-4 text-base font-black ${uiTheme.textPrimary}`}>ยังไม่มีบันทึกงานที่ตรงกับเงื่อนไข</p></div>
          ) : filteredRecords.map((record) => {
            const typeMeta = getTypeMeta(record.job_type);
            const TypeIcon = typeMeta.icon;
            const images = normalizeEvidenceImages(record.evidence_images);
            return (
              <article key={record.id} className={`${cardClass} p-5 sm:p-6`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${theme === "dark" ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-200" : "border-cyan-200 bg-cyan-50 text-cyan-700"}`}><TypeIcon size={13} />{typeMeta.label}</span>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${record.work_status === "completed" ? (theme === "dark" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700") : record.work_status === "in_progress" ? (theme === "dark" ? "border-amber-500/20 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-700") : (theme === "dark" ? "border-slate-600 bg-slate-700/30 text-slate-200" : "border-slate-200 bg-slate-100 text-slate-700")}`}>{getStatusLabel(record.work_status)}</span>
                    </div>
                    <h4 className={`mt-3 text-xl font-black ${uiTheme.textPrimary}`}>{record.title}</h4>
                    <div className={`mt-3 flex flex-wrap items-center gap-3 text-sm ${uiTheme.textSecondary}`}>
                      <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />{formatDateTime(record.performed_at || record.created_at)}</span>
                      {normalizeText(record.location) && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{record.location}</span>}
                      {normalizeText(record.reference_code) && <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${theme === "dark" ? "border-slate-600 bg-[#162136] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{record.reference_code}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => handleDelete(record)} disabled={deletingId === record.id} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${theme === "dark" ? "border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"} ${deletingId === record.id ? "cursor-not-allowed opacity-70" : ""}`}><Trash2 size={15} />{deletingId === record.id ? "กำลังลบ..." : "ลบรายการ"}</button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={`${subCardClass} p-4`}><p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ผู้บันทึก</p><p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>{record.created_by_name || "-"}</p></div>
                  <div className={`${subCardClass} p-4`}><p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ผู้แจ้ง / ผู้ประสาน</p><p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>{record.requester_name || "-"}</p></div>
                  <div className={`${subCardClass} p-4`}><p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>แผนก</p><p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>{record.department || "-"}</p></div>
                  <div className={`${subCardClass} p-4`}><p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ภาพหลักฐาน</p><p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>{images.length} รูป</p></div>
                </div>
                <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <div className={`${subCardClass} p-4`}><p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>รายละเอียดงาน</p><p className={`mt-2 whitespace-pre-line text-sm leading-6 ${uiTheme.textSecondary}`}>{record.description || "-"}</p></div>
                  <div className="space-y-4">
                    <div className={`${subCardClass} p-4`}><p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>อุปกรณ์ / รายการที่ทำ</p><p className={`mt-2 whitespace-pre-line text-sm leading-6 ${uiTheme.textSecondary}`}>{record.device_details || "-"}</p></div>
                    <div className={`${subCardClass} p-4`}><p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ผลลัพธ์ / หมายเหตุ</p><p className={`mt-2 whitespace-pre-line text-sm leading-6 ${uiTheme.textSecondary}`}>{record.result_summary || "-"}</p></div>
                  </div>
                </div>
                <div className="mt-5">
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ภาพประกอบ</p>
                  {images.length > 0 ? <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{images.map((image, index) => <button key={`${image.url}_${index}`} type="button" onClick={() => window.open(image.url, "_blank", "noopener,noreferrer")} className={`overflow-hidden rounded-2xl border text-left transition hover:-translate-y-[1px] ${theme === "dark" ? "border-slate-700 bg-[#162136]" : "border-slate-200 bg-slate-50"}`}><img src={image.url} alt={image.name || `it-evidence-${index + 1}`} className="h-32 w-full object-cover" /><div className="px-3 py-2"><p className={`truncate text-xs font-semibold ${uiTheme.textSecondary}`}>{image.name || `หลักฐาน ${index + 1}`}</p></div></button>)}</div> : <div className={`mt-3 rounded-2xl border border-dashed px-4 py-5 text-sm ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-300 text-slate-500"}`}>รายการนี้ยังไม่มีภาพประกอบ</div>}
                </div>
              </article>
            );
          })}
        </section>
      </section>
    </div>
  );
}
