import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, CarFront, Loader2, Save, X } from "lucide-react";

const EMPTY_FORM = {
  vehicle_plate: "",
  full_name: "",
  company_name: "",
  contact_name: "",
  purpose: "",
  remark: "",
  mapping_status: "",
  source_created_by: "",
};

const TEXT = {
  th: {
    addTitle: "เพิ่มทะเบียนรถ TDK APPROVED",
    editTitle: "แก้ไขทะเบียนรถ",
    hint: "ข้อมูลที่บันทึกจะอัปเดตทะเบียนหลักและสรุปการเปลี่ยนแปลงรายเดือนของ MD ทันที",
    effectiveDate: "วันที่มีผล",
    effectiveDateMin: "ต้องไม่ก่อนวันที่อัปเดตล่าสุด: {{date}}",
    plate: "ทะเบียนรถ",
    name: "ชื่อผู้ใช้งาน / ผู้ขับขี่",
    company: "บริษัท",
    contact: "ผู้ติดต่อ",
    purpose: "วัตถุประสงค์",
    status: "สถานะ Mapping (ไม่บังคับ)",
    statusHint: "ใช้ระบุผลการจับคู่ทะเบียนกับระบบอื่น เช่น Matched หรือ Pending หากไม่ได้ใช้งานให้เว้นว่าง",
    source: "ผู้บันทึกจากต้นทาง",
    remark: "หมายเหตุ",
    cancel: "ยกเลิก",
    add: "เพิ่มทะเบียน",
    save: "บันทึกการแก้ไข",
    required: "กรุณาระบุทะเบียนรถ",
  },
  en: {
    addTitle: "Add TDK APPROVED vehicle",
    editTitle: "Edit vehicle registry",
    hint: "Saving updates the master registry and the MD monthly change report immediately.",
    effectiveDate: "Effective date",
    effectiveDateMin: "Must be on or after the latest update: {{date}}",
    plate: "License plate",
    name: "User / driver name",
    company: "Company",
    contact: "Contact",
    purpose: "Purpose",
    status: "Mapping status (optional)",
    statusHint: "Tracks matching with another system, such as Matched or Pending. Leave blank when not used.",
    source: "Source creator",
    remark: "Remark",
    cancel: "Cancel",
    add: "Add vehicle",
    save: "Save changes",
    required: "License plate is required",
  },
};

export default function TdkApprovedRegistryFormModal({
  record,
  effectiveDate,
  minimumEffectiveDate = "",
  language = "th",
  theme = "light",
  saving = false,
  onClose,
  onSubmit,
}) {
  const copy = TEXT[language] || TEXT.en;
  const dark = theme === "dark";
  const initial = useMemo(() => ({
    ...EMPTY_FORM,
    ...Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, record?.[key] || ""])),
  }), [record]);
  const [form, setForm] = useState(initial);
  const [date, setDate] = useState(effectiveDate);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const submit = (event) => {
    event.preventDefault();
    if (!form.vehicle_plate.trim()) {
      setValidationError(copy.required);
      return;
    }
    setValidationError("");
    onSubmit(
      Object.fromEntries(Object.entries(form).map(([key, value]) => [key, String(value || "").trim() || null])),
      date,
    );
  };

  const shell = dark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-950";
  const input = dark
    ? "border-slate-600 bg-slate-950 text-slate-100 placeholder:text-slate-600"
    : "border-slate-300 bg-white text-slate-800 placeholder:text-slate-400";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  const field = (key, label, placeholder = "", description = "") => (
    <label className={key === "remark" ? "sm:col-span-2" : ""}>
      <span className={`mb-1.5 block text-xs font-bold ${muted}`}>{label}{key === "vehicle_plate" ? " *" : ""}</span>
      {key === "remark" ? (
        <textarea value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} rows={3} placeholder={placeholder} className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${input}`} />
      ) : (
        <input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} className={`h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${input}`} />
      )}
      {description ? <span className={`mt-1.5 block text-[11px] leading-4 ${muted}`}>{description}</span> : null}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="registry-form-title">
      <form onSubmit={submit} className={`max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border shadow-2xl ${shell}`}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-inherit bg-inherit px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><CarFront size={21} /></span>
            <div>
              <h2 id="registry-form-title" className="text-lg font-black">{record ? copy.editTitle : copy.addTitle}</h2>
              <p className={`mt-1 text-xs leading-5 ${muted}`}>{copy.hint}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${input}`} aria-label={copy.cancel}><X size={17} /></button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <label className="block max-w-xs">
            <span className={`mb-1.5 block text-xs font-bold ${muted}`}>{copy.effectiveDate}</span>
            <span className="relative block"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="date" required min={minimumEffectiveDate || undefined} value={date} onChange={(event) => setDate(event.target.value)} className={`h-11 w-full rounded-xl border pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${input}`} /></span>
            {minimumEffectiveDate ? <span className={`mt-1.5 block text-[11px] ${muted}`}>{copy.effectiveDateMin.replace("{{date}}", minimumEffectiveDate)}</span> : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {field("vehicle_plate", copy.plate, "1กข 1234")}
            {field("full_name", copy.name)}
            {field("company_name", copy.company)}
            {field("contact_name", copy.contact)}
            {field("purpose", copy.purpose)}
            {field("mapping_status", copy.status, "Matched / Pending", copy.statusHint)}
            {field("source_created_by", copy.source)}
            {field("remark", copy.remark)}
          </div>

          {validationError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{validationError}</p> : null}
        </div>

        <div className={`sticky bottom-0 flex justify-end gap-2 border-t border-inherit px-5 py-4 sm:px-6 ${dark ? "bg-slate-900" : "bg-slate-50"}`}>
          <button type="button" onClick={onClose} disabled={saving} className={`h-10 rounded-xl border px-4 text-sm font-bold ${input}`}>{copy.cancel}</button>
          <button type="submit" disabled={saving || !date} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{record ? copy.save : copy.add}</button>
        </div>
      </form>
    </div>
  );
}
