import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Boxes,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Trash2,
  FileImage,
  Filter,
  Laptop,
  MapPin,
  Monitor,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import QRCode from "qrcode";
import Webcam from "react-webcam";
import toast from "react-hot-toast";
import { extractAssetTagFromQr } from "../components/AssetViewScannerModal";
import {
  addUnregisteredAuditItem,
  createAssetAuditSession,
  deleteAssetAuditSession,
  fetchAssetAuditItems,
  fetchAssetAuditSessions,
  fetchAuditableAssets,
  isAssetAuditSchemaError,
  reviewAssetAuditItem,
  saveAssetAuditResult,
  updateAssetAuditSessionStatus,
  uploadAssetAuditEvidence,
} from "../services/assetAuditService";
import { buildAssetQrUrl } from "../services/assetQrService";

const RESULT_OPTIONS = [
  { value: "verified", label: "พบและข้อมูลถูกต้อง", shortLabel: "ถูกต้อง" },
  { value: "mismatch", label: "พบแต่ข้อมูลไม่ตรง", shortLabel: "ข้อมูลไม่ตรง" },
  { value: "damaged", label: "พบแต่ชำรุด", shortLabel: "ชำรุด" },
  { value: "not_found", label: "ไม่พบทรัพย์สิน", shortLabel: "ไม่พบ" },
];

const RESULT_META = {
  pending: { label: "ยังไม่ได้ตรวจ", className: "border-slate-300 bg-slate-100 text-slate-700", icon: Clock3 },
  verified: { label: "ข้อมูลถูกต้อง", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  mismatch: { label: "ข้อมูลไม่ตรง", className: "border-amber-200 bg-amber-50 text-amber-800", icon: AlertCircle },
  damaged: { label: "ชำรุด", className: "border-rose-200 bg-rose-50 text-rose-700", icon: AlertCircle },
  not_found: { label: "ไม่พบ", className: "border-rose-200 bg-rose-50 text-rose-700", icon: XCircle },
  unregistered: { label: "นอกทะเบียน", className: "border-violet-200 bg-violet-50 text-violet-700", icon: Plus },
};

const SESSION_META = {
  draft: { label: "แบบร่าง", className: "border-slate-300 bg-slate-100 text-slate-700" },
  in_progress: { label: "กำลังตรวจ", className: "border-blue-200 bg-blue-50 text-blue-700" },
  completed: { label: "ปิดรอบแล้ว", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  cancelled: { label: "ยกเลิก", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

const REVIEW_META = {
  pending: { label: "รออนุมัติ", className: "border-amber-200 bg-amber-50 text-amber-800" },
  approved: { label: "อนุมัติแล้ว", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rejected: { label: "ไม่อนุมัติ", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

const cleanText = (value) => String(value ?? "").trim();

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const normalizeScannedTag = (value) => extractAssetTagFromQr(value)
  .replace(/^https?:\/\/[^/]+\/assets\//i, "")
  .trim();

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

async function printQrLabels(items, title = "IT Asset Labels") {
  const printableItems = (Array.isArray(items) ? items : []).filter((item) => item?.asset_tag_snapshot);
  if (!printableItems.length) {
    toast.error("ไม่มี Asset Code สำหรับพิมพ์");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Pop-up");
    return;
  }
  printWindow.opener = null;

  printWindow.document.write("<p style='font-family:sans-serif;padding:24px'>กำลังเตรียม QR Label...</p>");

  try {
    const labels = await Promise.all(printableItems.map(async (item) => ({
      item,
      dataUrl: await QRCode.toDataURL(buildAssetQrUrl(item.asset_tag_snapshot), {
        width: 240,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#0f172a", light: "#ffffff" },
      }),
    })));

    const labelHtml = labels.map(({ item, dataUrl }) => `
      <article class="label">
        <img src="${dataUrl}" alt="${escapeHtml(item.asset_tag_snapshot)}" />
        <div class="text">
          <strong>${escapeHtml(item.asset_tag_snapshot)}</strong>
          <span>${escapeHtml(item.asset_name_snapshot || "IT Asset")}</span>
          <small>${escapeHtml(item.asset_category_snapshot || "")} ${item.serial_number_snapshot ? `• S/N ${escapeHtml(item.serial_number_snapshot)}` : ""}</small>
        </div>
      </article>
    `).join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; }
        .sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
        .label { min-height: 35mm; border: 1px dashed #94a3b8; border-radius: 3mm; padding: 3mm; display: flex; align-items: center; gap: 3mm; break-inside: avoid; }
        .label img { width: 27mm; height: 27mm; object-fit: contain; }
        .text { min-width: 0; display: flex; flex-direction: column; gap: 1.5mm; }
        .text strong { font-size: 12pt; overflow-wrap: anywhere; }
        .text span { font-size: 8.5pt; line-height: 1.25; }
        .text small { font-size: 7pt; color: #475569; line-height: 1.25; }
        @media print { .label { border-style: solid; border-color: #cbd5e1; } }
      </style></head><body><main class="sheet">${labelHtml}</main></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 350);
  } catch (error) {
    printWindow.close();
    console.error("Print QR labels error:", error);
    toast.error("สร้าง QR Label ไม่สำเร็จ");
  }
}

function Modal({ title, subtitle, onClose, children, maxWidth = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm">
      <div className={`max-h-[92vh] w-full ${maxWidth} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="ปิด">
            <X size={20} />
          </button>
        </header>
        <div className="max-h-[calc(92vh-82px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function StatusChip({ status, type = "result" }) {
  const source = type === "session" ? SESSION_META : type === "review" ? REVIEW_META : RESULT_META;
  const meta = source[status] || { label: status || "-", className: "border-slate-300 bg-slate-100 text-slate-700" };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>
      {Icon ? <Icon size={13} /> : null}
      {meta.label}
    </span>
  );
}

function CameraScanner({ onDetected, onClose }) {
  const webcamRef = useRef(null);
  const detectedRef = useRef(false);
  const [supported, setSupported] = useState(true);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    if (!("BarcodeDetector" in window)) {
      setSupported(false);
      return undefined;
    }

    let active = true;
    let timer;
    const detector = new window.BarcodeDetector({
      formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8"],
    });

    const detect = async () => {
      if (!active || detectedRef.current) return;
      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2) return;
      try {
        const codes = await detector.detect(video);
        const value = codes?.[0]?.rawValue;
        if (value) {
          detectedRef.current = true;
          onDetected(value);
        }
      } catch (error) {
        console.warn("Barcode detection error:", error);
      }
    };

    timer = window.setInterval(detect, 500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [onDetected]);

  return (
    <Modal title="สแกน QR / Barcode" subtitle="เล็งกล้องไปที่ Label ของอุปกรณ์" onClose={onClose} maxWidth="max-w-lg">
      <div className="p-5">
        {supported ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: { ideal: "environment" } }}
              onUserMediaError={(error) => setCameraError(error?.message || "ไม่สามารถเปิดกล้องได้")}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0" />
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            เบราว์เซอร์นี้ยังไม่รองรับการอ่าน Barcode จากกล้อง กรุณาใช้ Chrome/Edge รุ่นล่าสุด หรือใช้ช่องกรอก Asset Code และเครื่องสแกน USB
          </div>
        )}
        {cameraError ? <p className="mt-3 text-sm font-semibold text-rose-600">{cameraError}</p> : null}
        <p className="mt-4 text-center text-xs text-slate-500">ระบบรองรับ QR Code, Code 128, Code 39 และ EAN</p>
      </div>
    </Modal>
  );
}

function CreateAuditModal({ assets, categories, locations, currentUser, onCreated, onClose }) {
  const currentYear = new Date().getFullYear();
  const suggestedCategories = categories.filter((value) => /(pc|desktop|computer|monitor|notebook|laptop|คอม|จอ)/i.test(value));
  const [form, setForm] = useState({
    name: `Stock Audit ${currentYear}`,
    auditYear: currentYear,
    scopeLocation: "",
    assetCategories: suggestedCategories.length ? suggestedCategories : categories,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const scopedAssets = useMemo(() => assets.filter((asset) => {
    const matchesLocation = !form.scopeLocation || cleanText(asset.location) === form.scopeLocation;
    const assetCategory = cleanText(asset.asset_category) || "ไม่ระบุประเภท";
    const matchesCategory = !form.assetCategories.length || form.assetCategories.includes(assetCategory);
    return matchesLocation && matchesCategory;
  }), [assets, form.assetCategories, form.scopeLocation]);

  const toggleCategory = (category) => {
    setForm((previous) => ({
      ...previous,
      assetCategories: previous.assetCategories.includes(category)
        ? previous.assetCategories.filter((value) => value !== category)
        : [...previous.assetCategories, category],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!cleanText(form.name)) return toast.error("กรุณาระบุชื่อรอบตรวจ");
    if (!scopedAssets.length) return toast.error("ไม่พบทรัพย์สินในขอบเขตที่เลือก");
    setSaving(true);
    try {
      const session = await createAssetAuditSession({ ...form, assets: scopedAssets, currentUser });
      toast.success(`สร้างรอบตรวจ ${scopedAssets.length} รายการแล้ว`);
      onCreated(session);
    } catch (error) {
      console.error("Create audit session error:", error);
      toast.error(error?.message || "สร้างรอบตรวจไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="สร้างรอบ Stock Audit" subtitle="ระบบจะเก็บ Snapshot ของทะเบียนปัจจุบันไว้เป็นหลักฐานของปีนี้" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-bold text-slate-700">
            <span>ชื่อรอบตรวจ</span>
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="space-y-1.5 text-sm font-bold text-slate-700">
            <span>ปีที่ตรวจ</span>
            <input type="number" min="2000" max="2200" value={form.auditYear} onChange={(event) => setForm((prev) => ({ ...prev, auditYear: Number(event.target.value) }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm font-bold text-slate-700">
          <span>สถานที่ / โรงงาน</span>
          <select value={form.scopeLocation} onChange={(event) => setForm((prev) => ({ ...prev, scopeLocation: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">ทุกสถานที่</option>
            {locations.map((location) => <option key={location} value={location}>{location}</option>)}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-bold text-slate-700">ประเภทอุปกรณ์</legend>
          <p className="mt-1 text-xs text-slate-500">ค่าเริ่มต้นเลือก PC, Notebook และ Monitor ที่พบในทะเบียน</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => {
              const checked = form.assetCategories.includes(category);
              return (
                <button key={category} type="button" onClick={() => toggleCategory(category)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition ${checked ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>{checked ? <Check size={11} /> : null}</span>
                  {category || "ไม่ระบุประเภท"}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block space-y-1.5 text-sm font-bold text-slate-700">
          <span>หมายเหตุ</span>
          <textarea rows="3" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="เช่น ตรวจโรงงาน 1 ระหว่างวันที่..." className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>

        <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">รายการตั้งต้น</p>
            <p className="mt-1 text-sm text-blue-900">พบทรัพย์สินตามขอบเขตที่เลือก</p>
          </div>
          <strong className="text-2xl font-black text-blue-700">{scopedAssets.length}</strong>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
          <button type="submit" disabled={saving || !scopedAssets.length} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
            สร้างรอบตรวจ
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AuditResultModal({ item, session, currentUser, readOnly, onSaved, onClose }) {
  const initialStatus = item.result_status === "pending" ? "verified" : item.result_status;
  const [form, setForm] = useState({
    resultStatus: initialStatus,
    foundLocation: item.found_location ?? item.location_snapshot ?? "",
    foundOwnerName: item.found_owner_name ?? item.owner_name_snapshot ?? "",
    foundSerialNumber: item.found_serial_number ?? item.serial_number_snapshot ?? "",
    conditionNotes: item.condition_notes ?? "",
  });
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const attachments = Array.isArray(item.it_asset_audit_attachments) ? item.it_asset_audit_attachments : [];

  const proposedChanges = useMemo(() => {
    if (!["mismatch", "damaged"].includes(form.resultStatus)) return {};
    const changes = {};
    if (cleanText(form.foundLocation) !== cleanText(item.location_snapshot)) changes.location = cleanText(form.foundLocation);
    if (cleanText(form.foundOwnerName) !== cleanText(item.owner_name_snapshot)) changes.owner_name = cleanText(form.foundOwnerName);
    if (cleanText(form.foundSerialNumber) !== cleanText(item.serial_number_snapshot)) changes.serial_number = cleanText(form.foundSerialNumber);
    if (form.resultStatus === "damaged") changes.status = "broken";
    return changes;
  }, [form, item]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (readOnly) return;
    if (form.resultStatus === "mismatch" && !Object.keys(proposedChanges).length) {
      return toast.error("กรุณาแก้ข้อมูลที่พบ หรือเลือกผลตรวจว่าข้อมูลถูกต้อง");
    }
    setSaving(true);
    try {
      await saveAssetAuditResult({
        itemId: item.id,
        ...form,
        proposedChanges,
        currentUser,
      });
      if (files.length) {
        await uploadAssetAuditEvidence({
          itemId: item.id,
          sessionId: session.id,
          files,
          currentUser,
        });
      }
      toast.success("บันทึกผลตรวจแล้ว");
      onSaved();
    } catch (error) {
      console.error("Save asset audit result error:", error);
      toast.error(error?.message || "บันทึกผลตรวจไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={item.asset_tag_snapshot} subtitle={`${item.asset_name_snapshot} • ${item.asset_category_snapshot || "ไม่ระบุประเภท"}`} onClose={onClose} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <div><p className="text-xs font-bold text-slate-400">สถานที่ตามทะเบียน</p><p className="mt-1 text-sm font-bold text-slate-800">{item.location_snapshot || "-"}</p></div>
          <div><p className="text-xs font-bold text-slate-400">ผู้ใช้งานตามทะเบียน</p><p className="mt-1 text-sm font-bold text-slate-800">{item.owner_name_snapshot || "-"}</p></div>
          <div><p className="text-xs font-bold text-slate-400">Serial Number</p><p className="mt-1 text-sm font-bold text-slate-800">{item.serial_number_snapshot || "-"}</p></div>
        </section>

        <fieldset disabled={readOnly || saving}>
          <legend className="text-sm font-black text-slate-800">ผลการตรวจ</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {RESULT_OPTIONS.map((option) => (
              <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold transition ${form.resultStatus === option.value ? "border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-100" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                <input type="radio" name="resultStatus" value={option.value} checked={form.resultStatus === option.value} onChange={(event) => setForm((prev) => ({ ...prev, resultStatus: event.target.value }))} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        {form.resultStatus !== "not_found" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-bold text-slate-700">
              <span>สถานที่ที่พบ</span>
              <input disabled={readOnly || saving} value={form.foundLocation} onChange={(event) => setForm((prev) => ({ ...prev, foundLocation: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
            </label>
            <label className="space-y-1.5 text-sm font-bold text-slate-700">
              <span>ผู้ใช้งานที่พบ</span>
              <input disabled={readOnly || saving} value={form.foundOwnerName} onChange={(event) => setForm((prev) => ({ ...prev, foundOwnerName: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
            </label>
            <label className="space-y-1.5 text-sm font-bold text-slate-700 sm:col-span-2">
              <span>Serial Number ที่พบ</span>
              <input disabled={readOnly || saving} value={form.foundSerialNumber} onChange={(event) => setForm((prev) => ({ ...prev, foundSerialNumber: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
            </label>
          </div>
        ) : null}

        <label className="block space-y-1.5 text-sm font-bold text-slate-700">
          <span>หมายเหตุ / สภาพอุปกรณ์</span>
          <textarea disabled={readOnly || saving} rows="3" value={form.conditionNotes} onChange={(event) => setForm((prev) => ({ ...prev, conditionNotes: event.target.value }))} className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
        </label>

        {Object.keys(proposedChanges).length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-900">ข้อมูลที่เสนอให้แก้ในทะเบียนหลัก</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {Object.entries(proposedChanges).map(([key, value]) => <li key={key}>• {key}: <strong>{value || "-"}</strong></li>)}
            </ul>
            <p className="mt-2 text-xs text-amber-700">ข้อมูลจะยังไม่เปลี่ยนจนกว่า Admin หรือ IT Manager อนุมัติ</p>
          </div>
        ) : null}

        <section>
          <p className="text-sm font-black text-slate-800">รูปหลักฐาน</p>
          {attachments.length ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {attachments.map((attachment) => (
                <a key={attachment.id} href={attachment.file_url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img src={attachment.file_url} alt={attachment.file_name || "หลักฐาน"} className="aspect-square w-full object-cover" />
                </a>
              ))}
            </div>
          ) : null}
          {!readOnly ? (
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700">
              <FileImage size={18} />
              {files.length ? `เลือกรูปแล้ว ${files.length} รูป` : "เพิ่มรูปจากกล้องหรือเครื่อง"}
              <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
            </label>
          ) : null}
        </section>

        <div className="flex justify-between gap-3 border-t border-slate-200 pt-4">
          <button type="button" onClick={() => void printQrLabels([item], item.asset_tag_snapshot)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"><Printer size={16} />พิมพ์ Label</button>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">ปิด</button>
            {!readOnly ? (
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                บันทึกผลตรวจ
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function UnregisteredAssetModal({ tag, session, currentUser, onSaved, onClose }) {
  const [form, setForm] = useState({ asset_tag: tag, asset_name: "", asset_category: "", serial_number: "", location: "", owner_name: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!cleanText(form.asset_tag) || !cleanText(form.asset_name)) return toast.error("กรุณาระบุ Asset Code และชื่ออุปกรณ์");
    setSaving(true);
    try {
      await addUnregisteredAuditItem({ sessionId: session.id, asset: form, currentUser });
      toast.success("บันทึกทรัพย์สินนอกทะเบียนแล้ว");
      onSaved();
    } catch (error) {
      console.error("Add unregistered asset error:", error);
      toast.error(error?.code === "23505" ? "Asset Code นี้มีอยู่ในรอบตรวจแล้ว" : error?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="พบอุปกรณ์นอกทะเบียน" subtitle="เก็บรายการไว้ตรวจสอบก่อนเพิ่มเข้าสู่ Asset Master" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4 p-5 sm:grid-cols-2">
        {[
          ["asset_tag", "Asset Code *"],
          ["asset_name", "ชื่ออุปกรณ์ *"],
          ["asset_category", "ประเภทอุปกรณ์"],
          ["serial_number", "Serial Number"],
          ["location", "สถานที่ที่พบ"],
          ["owner_name", "ผู้ใช้งานที่พบ"],
        ].map(([key, label]) => (
          <label key={key} className="space-y-1.5 text-sm font-bold text-slate-700">
            <span>{label}</span>
            <input value={form[key]} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
        ))}
        <label className="space-y-1.5 text-sm font-bold text-slate-700 sm:col-span-2">
          <span>หมายเหตุ</span>
          <textarea rows="3" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 sm:col-span-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600">ยกเลิก</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">{saving ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}บันทึกรายการ</button>
        </div>
      </form>
    </Modal>
  );
}

function SummaryCard({ label, value, hint, icon: Icon, tone = "blue", theme }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };
  const darkClass = "border-slate-700 bg-slate-900/70 text-slate-100";
  return (
    <div className={`rounded-2xl border p-4 ${theme === "dark" ? darkClass : tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className={`text-xs font-bold ${theme === "dark" ? "text-slate-400" : "opacity-75"}`}>{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>
        <span className={`rounded-xl p-2 ${theme === "dark" ? "bg-slate-800 text-blue-300" : "bg-white/80"}`}><Icon size={19} /></span>
      </div>
      <p className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "opacity-75"}`}>{hint}</p>
    </div>
  );
}

export default function AssetStockAuditPage({ theme = "light", currentUser }) {
  const isDark = theme === "dark";
  const [sessions, setSessions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [unregisteredTag, setUnregisteredTag] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [savingSession, setSavingSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);

  const role = cleanText(currentUser?.role).toLowerCase();
  const canManage = ["it_support", "admin", "it_manager"].includes(role);
  const canReview = ["admin", "it_manager"].includes(role);

  const loadBootstrap = async ({ preserveSelection = true } = {}) => {
    setLoading(true);
    try {
      const [sessionRows, assetRows] = await Promise.all([
        fetchAssetAuditSessions(),
        fetchAuditableAssets(),
      ]);
      setSchemaReady(true);
      setSessions(sessionRows);
      setAssets(assetRows);
      setSelectedSessionId((previous) => {
        if (preserveSelection && sessionRows.some((session) => session.id === previous)) return previous;
        return sessionRows[0]?.id || "";
      });
    } catch (error) {
      console.error("Load asset audit page error:", error);
      if (isAssetAuditSchemaError(error)) setSchemaReady(false);
      else toast.error(error?.message || "โหลดข้อมูล Stock Audit ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (sessionId = selectedSessionId) => {
    if (!sessionId || !schemaReady) {
      setItems([]);
      return;
    }
    setItemsLoading(true);
    try {
      setItems(await fetchAssetAuditItems(sessionId));
    } catch (error) {
      console.error("Load audit items error:", error);
      if (isAssetAuditSchemaError(error)) setSchemaReady(false);
      else toast.error(error?.message || "โหลดรายการตรวจไม่สำเร็จ");
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    void loadBootstrap({ preserveSelection: false });
  }, []);

  useEffect(() => {
    void loadItems(selectedSessionId);
  }, [selectedSessionId, schemaReady]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [selectedSessionId, sessions],
  );

  const categories = useMemo(() => [...new Set(assets.map((item) => cleanText(item.asset_category) || "ไม่ระบุประเภท"))].sort((a, b) => a.localeCompare(b, "th")), [assets]);
  const locations = useMemo(() => [...new Set(assets.map((item) => cleanText(item.location)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th")), [assets]);

  const summary = useMemo(() => items.reduce((acc, item) => {
    acc.total += 1;
    if (item.result_status === "pending") acc.pending += 1;
    else acc.checked += 1;
    if (item.result_status === "verified") acc.verified += 1;
    if (["mismatch", "damaged", "not_found", "unregistered"].includes(item.result_status)) acc.exceptions += 1;
    if (item.review_status === "pending") acc.reviewPending += 1;
    return acc;
  }, { total: 0, pending: 0, checked: 0, verified: 0, exceptions: 0, reviewPending: 0 }), [items]);

  const progress = summary.total ? Math.round((summary.checked / summary.total) * 100) : 0;

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesStatus = resultFilter === "all"
      || (resultFilter === "exceptions" && ["mismatch", "damaged", "not_found", "unregistered"].includes(item.result_status))
      || item.result_status === resultFilter;
    const query = cleanText(searchQuery).toLowerCase();
    const matchesQuery = !query || [
      item.asset_tag_snapshot,
      item.asset_name_snapshot,
      item.asset_category_snapshot,
      item.serial_number_snapshot,
      item.location_snapshot,
      item.owner_name_snapshot,
      item.found_location,
      item.found_owner_name,
    ].some((value) => cleanText(value).toLowerCase().includes(query));
    return matchesStatus && matchesQuery;
  }), [items, resultFilter, searchQuery]);

  const handleSessionCreated = async (session) => {
    setShowCreate(false);
    await loadBootstrap({ preserveSelection: false });
    setSelectedSessionId(session.id);
  };

  const handleItemSaved = async () => {
    setActiveItem(null);
    setUnregisteredTag("");
    await loadItems();
  };

  const handleScan = (rawValue) => {
    const tag = normalizeScannedTag(rawValue);
    setShowCamera(false);
    setScanValue("");
    if (!tag) return toast.error("ไม่พบข้อมูลใน QR / Barcode");
    const match = items.find((item) => cleanText(item.asset_tag_snapshot).toLowerCase() === tag.toLowerCase());
    if (match) {
      setActiveItem(match);
      toast.success(`พบ ${match.asset_tag_snapshot}`);
      return;
    }
    if (selectedSession?.status === "completed") {
      toast.error("ไม่พบ Asset Code นี้ในรอบตรวจ");
      return;
    }
    setUnregisteredTag(tag);
  };

  const handleScanSubmit = (event) => {
    event.preventDefault();
    handleScan(scanValue);
  };

  const handleReview = async (item, approved) => {
    const hasProposedChanges = Object.keys(item.proposed_changes || {}).length > 0;
    const action = approved
      ? hasProposedChanges ? "อนุมัติและอัปเดตทะเบียนหลัก" : "ยืนยันผลตรวจรายการนี้"
      : "ไม่อนุมัติรายการนี้";
    if (!window.confirm(`${action}\n${item.asset_tag_snapshot} - ${item.asset_name_snapshot}`)) return;
    const notes = window.prompt("หมายเหตุการตรวจทาน (เว้นว่างได้)", "");
    if (notes === null) return;
    try {
      await reviewAssetAuditItem({
        itemId: item.id,
        approved,
        reviewerName: currentUser?.name || currentUser?.full_name,
        notes,
      });
      toast.success(approved ? "อนุมัติรายการแล้ว" : "บันทึกการไม่อนุมัติแล้ว");
      await loadItems();
    } catch (error) {
      console.error("Review audit item error:", error);
      toast.error(error?.message || "ตรวจทานรายการไม่สำเร็จ");
    }
  };

  const handleSessionStatus = async (status) => {
    if (!selectedSession) return;
    if (status === "completed" && summary.pending > 0) return toast.error(`ยังมี ${summary.pending} รายการที่ไม่ได้ตรวจ`);
    const message = status === "completed" ? "ยืนยันปิดรอบตรวจนี้หรือไม่?" : "เปิดรอบตรวจนี้อีกครั้งหรือไม่?";
    if (!window.confirm(message)) return;
    setSavingSession(true);
    try {
      const updated = await updateAssetAuditSessionStatus(selectedSession.id, status);
      setSessions((previous) => previous.map((session) => session.id === updated.id ? updated : session));
      toast.success(status === "completed" ? "ปิดรอบตรวจแล้ว" : "เปิดรอบตรวจอีกครั้งแล้ว");
    } catch (error) {
      console.error("Update audit session error:", error);
      toast.error(error?.message || "อัปเดตรอบตรวจไม่สำเร็จ");
    } finally {
      setSavingSession(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession || deletingSession) return;
    const confirmation = window.prompt(
      `ต้องการลบรอบ "${selectedSession.name}" ใช่หรือไม่?\n\nการลบจะลบรายการตรวจและรูปหลักฐานของรอบนี้ทั้งหมด\nพิมพ์รหัส ${selectedSession.audit_code} เพื่อยืนยัน`,
      "",
    );
    if (confirmation === null) return;
    if (cleanText(confirmation) !== cleanText(selectedSession.audit_code)) {
      toast.error("รหัสยืนยันไม่ตรง จึงยังไม่ได้ลบรอบตรวจ");
      return;
    }

    setDeletingSession(true);
    try {
      const result = await deleteAssetAuditSession(selectedSession.id);
      setItems([]);
      setSelectedSessionId("");
      await loadBootstrap({ preserveSelection: false });
      if (result.cleanupError) {
        toast.success("ลบรอบตรวจแล้ว แต่มีไฟล์หลักฐานบางส่วนที่ล้างไม่สำเร็จ");
      } else {
        toast.success("ลบรอบตรวจเรียบร้อยแล้ว");
      }
    } catch (error) {
      console.error("Delete audit session error:", error);
      toast.error(error?.message || "ลบรอบตรวจไม่สำเร็จ");
    } finally {
      setDeletingSession(false);
    }
  };

  const shellClass = isDark ? "border-slate-700 bg-slate-900/70 text-slate-100" : "border-slate-200 bg-white text-slate-900";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const inputClass = isDark
    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500"
    : "border-slate-300 bg-white text-slate-800 placeholder:text-slate-400";

  if (loading) {
    return <div className={`flex min-h-[420px] items-center justify-center rounded-2xl border ${shellClass}`}><RefreshCw className="mr-3 animate-spin text-blue-500" /><span className="font-bold">กำลังโหลด Stock Audit...</span></div>;
  }

  return (
    <div className="space-y-5">
      <section className={`overflow-hidden rounded-2xl border ${shellClass}`}>
        <div className="relative overflow-hidden px-5 py-5 sm:px-6">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className={`rounded-2xl p-3 ${isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-700"}`}><ClipboardCheck size={28} /></span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">Annual Asset Verification</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Stock Audit PC & Monitor</h1>
                <p className={`mt-2 max-w-3xl text-sm ${mutedClass}`}>ใช้ทะเบียน IT Assets เป็นข้อมูลตั้งต้น สแกน QR เพื่อตรวจของจริง และเก็บ Snapshot ของแต่ละปีโดยไม่สร้าง Asset ซ้ำ</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void loadBootstrap()} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold ${isDark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-300 bg-white text-slate-600"}`}><RefreshCw size={16} />รีเฟรช</button>
              {canManage ? <button type="button" onClick={() => setShowCreate(true)} disabled={!schemaReady} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"><Plus size={17} />สร้างรอบตรวจ</button> : null}
            </div>
          </div>
        </div>
      </section>

      {!schemaReady ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
          <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 shrink-0" /><div><h2 className="font-black">ยังไม่ได้เปิดใช้งานฐานข้อมูล Stock Audit</h2><p className="mt-1 text-sm">ให้รันไฟล์ <code className="rounded bg-amber-100 px-1.5 py-0.5 font-bold">database/20260721_it_asset_stock_audit.sql</code> ใน Supabase SQL Editor แล้วกดรีเฟรช</p></div></div>
        </section>
      ) : null}

      {schemaReady && sessions.length ? (
        <section className={`rounded-2xl border p-4 ${shellClass}`}>
          <div className="mb-3 flex items-center justify-between"><div><h2 className="font-black">รอบตรวจทั้งหมด</h2><p className={`mt-1 text-xs ${mutedClass}`}>เลือกรอบเพื่อตรวจต่อหรือดูประวัติย้อนหลัง</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{sessions.length} รอบ</span></div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {sessions.map((session) => {
              const active = session.id === selectedSessionId;
              return (
                <button key={session.id} type="button" onClick={() => setSelectedSessionId(session.id)} className={`min-w-[240px] rounded-xl border p-4 text-left transition ${active ? isDark ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20" : "border-blue-400 bg-blue-50 ring-2 ring-blue-100" : isDark ? "border-slate-700 bg-slate-950 hover:border-slate-600" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <div className="flex items-start justify-between gap-2"><p className="truncate font-black">{session.name}</p><ChevronRight size={17} className={active ? "text-blue-500" : mutedClass} /></div>
                  <p className={`mt-1 text-xs ${mutedClass}`}>{session.audit_code}</p>
                  <div className="mt-3 flex items-center justify-between"><StatusChip type="session" status={session.status} /><span className={`text-xs ${mutedClass}`}>{session.scope_location || "ทุกสถานที่"}</span></div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {schemaReady && !sessions.length ? (
        <section className={`rounded-2xl border px-5 py-14 text-center ${shellClass}`}>
          <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${isDark ? "bg-slate-800 text-blue-300" : "bg-blue-50 text-blue-600"}`}><Boxes size={30} /></span>
          <h2 className="mt-4 text-xl font-black">ยังไม่มีรอบ Stock Audit</h2>
          <p className={`mx-auto mt-2 max-w-lg text-sm ${mutedClass}`}>สร้างรอบแรกเพื่อดึง PC และ Monitor จากทะเบียน IT Assets มาเป็นรายการตั้งต้น</p>
          {canManage ? <button type="button" onClick={() => setShowCreate(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />สร้างรอบแรก</button> : null}
        </section>
      ) : null}

      {selectedSession ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard theme={theme} label="ความคืบหน้า" value={`${progress}%`} hint={`${summary.checked} จาก ${summary.total} รายการ`} icon={ClipboardCheck} tone="blue" />
            <SummaryCard theme={theme} label="ข้อมูลถูกต้อง" value={summary.verified} hint="พบและตรงกับทะเบียน" icon={CheckCircle2} tone="emerald" />
            <SummaryCard theme={theme} label="รายการผิดปกติ" value={summary.exceptions} hint="ข้อมูลไม่ตรง ชำรุด ไม่พบ หรือนอกทะเบียน" icon={AlertCircle} tone="rose" />
            <SummaryCard theme={theme} label="รอตรวจทาน" value={summary.reviewPending} hint="รอ Admin / IT Manager อนุมัติ" icon={ShieldCheck} tone="amber" />
          </section>

          <section className={`rounded-2xl border p-4 sm:p-5 ${shellClass}`}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{selectedSession.name}</h2><StatusChip type="session" status={selectedSession.status} /></div>
                <p className={`mt-1 text-xs ${mutedClass}`}>{selectedSession.scope_location || "ทุกสถานที่"} • เริ่ม {formatDateTime(selectedSession.started_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void printQrLabels(items, selectedSession.name)} disabled={!items.length} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold ${isDark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-300 bg-white text-slate-600"}`}><Printer size={16} />พิมพ์ QR ทั้งรอบ</button>
                {canManage && selectedSession.status !== "completed" ? <button type="button" onClick={() => void handleSessionStatus("completed")} disabled={savingSession || summary.pending > 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={16} />ปิดรอบตรวจ</button> : null}
                {canManage && selectedSession.status === "completed" ? <button type="button" onClick={() => void handleSessionStatus("in_progress")} disabled={savingSession} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-800"><RefreshCw size={16} />เปิดรอบอีกครั้ง</button> : null}
                {canManage ? <button type="button" onClick={() => void handleDeleteSession()} disabled={deletingSession} className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50">{deletingSession ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}ลบรอบตรวจ</button> : null}
              </div>
            </div>
            <div className={`mt-4 h-2 overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"}`}><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all" style={{ width: `${progress}%` }} /></div>
          </section>

          {selectedSession.status !== "completed" && canManage ? (
            <section className={`rounded-2xl border p-4 sm:p-5 ${shellClass}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex items-center gap-3 lg:w-64"><span className={`rounded-xl p-2.5 ${isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-700"}`}><QrCode size={22} /></span><div><h3 className="font-black">สแกน Asset</h3><p className={`text-xs ${mutedClass}`}>รองรับกล้องและ USB Scanner</p></div></div>
                <form onSubmit={handleScanSubmit} className="flex min-w-0 flex-1 gap-2">
                  <input autoComplete="off" value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="สแกนหรือพิมพ์ Asset Code เช่น CPUTDK0065" className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${inputClass}`} />
                  <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">ค้นหา</button>
                </form>
                <button type="button" onClick={() => setShowCamera(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"><Camera size={17} />เปิดกล้อง</button>
              </div>
            </section>
          ) : null}

          <section className={`overflow-hidden rounded-2xl border ${shellClass}`}>
            <div className={`border-b p-4 sm:p-5 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div><h2 className="font-black">รายการตรวจ <span className="text-blue-500">{filteredItems.length}</span></h2><p className={`mt-1 text-xs ${mutedClass}`}>ค้นหาด้วย Asset Code, Serial Number, ผู้ใช้งาน หรือสถานที่</p></div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative min-w-[260px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ค้นหารายการ..." className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 ${inputClass}`} /></label>
                  <label className="relative"><Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)} className={`w-full appearance-none rounded-xl border py-2.5 pl-9 pr-8 text-sm font-bold outline-none focus:border-blue-500 ${inputClass}`}><option value="all">ทุกสถานะ</option><option value="pending">ยังไม่ได้ตรวจ</option><option value="verified">ข้อมูลถูกต้อง</option><option value="exceptions">รายการผิดปกติ</option><option value="mismatch">ข้อมูลไม่ตรง</option><option value="damaged">ชำรุด</option><option value="not_found">ไม่พบ</option><option value="unregistered">นอกทะเบียน</option></select></label>
                </div>
              </div>
            </div>

            {itemsLoading ? <div className={`flex items-center justify-center px-5 py-14 ${mutedClass}`}><RefreshCw size={18} className="mr-2 animate-spin" />กำลังโหลดรายการ...</div> : filteredItems.length ? (
              <div className={`divide-y ${isDark ? "divide-slate-700" : "divide-slate-100"}`}>
                {filteredItems.map((item) => (
                  <article key={item.id} className={`grid gap-4 p-4 transition sm:p-5 lg:grid-cols-[minmax(260px,1.2fr)_minmax(240px,1fr)_180px_auto] lg:items-center ${isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}`}>
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isDark ? "bg-slate-800 text-blue-300" : "bg-blue-50 text-blue-600"}`}>{/monitor|จอ/i.test(item.asset_category_snapshot || "") ? <Monitor size={21} /> : <Laptop size={21} />}</span>
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{item.asset_tag_snapshot}</p>{item.review_status !== "not_required" ? <StatusChip type="review" status={item.review_status} /> : null}</div><p className={`mt-1 truncate text-sm font-semibold ${mutedClass}`}>{item.asset_name_snapshot}</p><p className={`mt-1 text-xs ${mutedClass}`}>{item.asset_category_snapshot || "ไม่ระบุประเภท"} • S/N {item.serial_number_snapshot || "-"}</p></div>
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1">
                      <div className="flex items-center gap-2"><MapPin size={15} className="shrink-0 text-slate-400" /><span className="truncate">{item.location_snapshot || "ไม่ระบุสถานที่"}</span></div>
                      <div className="flex items-center gap-2"><UserRound size={15} className="shrink-0 text-slate-400" /><span className="truncate">{item.owner_name_snapshot || "ไม่ระบุผู้ใช้งาน"}</span></div>
                    </div>
                    <div><StatusChip status={item.result_status} />{item.audited_at ? <p className={`mt-1.5 text-xs ${mutedClass}`}>{item.audited_by_name || "-"} • {formatDateTime(item.audited_at)}</p> : null}</div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {canReview && item.review_status === "pending" ? <><button type="button" onClick={() => void handleReview(item, false)} className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-700" title="ไม่อนุมัติ"><X size={15} /></button><button type="button" onClick={() => void handleReview(item, true)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-700" title="อนุมัติ"><Check size={15} /></button></> : null}
                      <button type="button" onClick={() => void printQrLabels([item], item.asset_tag_snapshot)} className={`rounded-lg border p-2 ${isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`} title="พิมพ์ QR"><QrCode size={16} /></button>
                      <button type="button" onClick={() => setActiveItem(item)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">{selectedSession.status === "completed" ? "ดูรายละเอียด" : item.result_status === "pending" ? "ตรวจรายการ" : "แก้ผลตรวจ"}<ChevronRight size={14} /></button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className={`px-5 py-14 text-center ${mutedClass}`}><Search className="mx-auto mb-3 opacity-50" /><p className="font-bold">ไม่พบรายการตามตัวกรอง</p></div>}
          </section>
        </>
      ) : null}

      {showCreate ? <CreateAuditModal assets={assets} categories={categories} locations={locations} currentUser={currentUser} onCreated={handleSessionCreated} onClose={() => setShowCreate(false)} /> : null}
      {showCamera ? <CameraScanner onDetected={handleScan} onClose={() => setShowCamera(false)} /> : null}
      {activeItem && selectedSession ? <AuditResultModal item={activeItem} session={selectedSession} currentUser={currentUser} readOnly={!canManage || selectedSession.status === "completed"} onSaved={handleItemSaved} onClose={() => setActiveItem(null)} /> : null}
      {unregisteredTag && selectedSession ? <UnregisteredAssetModal tag={unregisteredTag} session={selectedSession} currentUser={currentUser} onSaved={handleItemSaved} onClose={() => setUnregisteredTag("")} /> : null}
    </div>
  );
}
