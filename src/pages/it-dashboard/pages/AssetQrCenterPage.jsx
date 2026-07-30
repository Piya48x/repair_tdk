import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit3,
  ExternalLink,
  Factory,
  FileImage,
  Laptop,
  ListFilter,
  MapPin,
  Monitor,
  PackagePlus,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  UserRound,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import toast from "react-hot-toast";
import AssetViewScannerModal, { extractAssetTagFromQr } from "../components/AssetViewScannerModal";
import { DASHBOARD_PAGE_IDS } from "../constants/dashboardPages";
import {
  buildAssetQrUrl,
  fetchAssetQrDirectory,
  fetchAssetQrProfiles,
  generateSuggestedAssetTag,
  isAssetQrSchemaError,
  markAssetQrGenerated,
  saveAssetQrRecord,
} from "../services/assetQrService";

const ASSET_CATEGORIES = ["PC", "Notebook", "Monitor", "Printer", "Server", "Network", "Other"];

const STATUS_OPTIONS = [
  { value: "in_use", label: "ใช้งาน" },
  { value: "assigned", label: "มอบหมายแล้ว" },
  { value: "spare", label: "สำรอง" },
  { value: "available", label: "พร้อมใช้งาน" },
  { value: "repair", label: "อยู่ระหว่างซ่อม" },
  { value: "broken", label: "ชำรุด" },
  { value: "lost", label: "สูญหาย" },
  { value: "retired", label: "จำหน่าย/ปลดระวาง" },
];

const STATUS_META = {
  in_use: { label: "ใช้งาน", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  assigned: { label: "มอบหมายแล้ว", className: "border-blue-200 bg-blue-50 text-blue-700" },
  spare: { label: "สำรอง", className: "border-violet-200 bg-violet-50 text-violet-700" },
  available: { label: "พร้อมใช้งาน", className: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  repair: { label: "อยู่ระหว่างซ่อม", className: "border-amber-200 bg-amber-50 text-amber-800" },
  broken: { label: "ชำรุด", className: "border-rose-200 bg-rose-50 text-rose-700" },
  lost: { label: "สูญหาย", className: "border-rose-200 bg-rose-50 text-rose-700" },
  retired: { label: "จำหน่าย/ปลดระวาง", className: "border-slate-300 bg-slate-100 text-slate-700" },
};

const EMPTY_FORM = {
  asset_tag: "",
  asset_name: "",
  asset_category: "PC",
  brand: "",
  model: "",
  serial_number: "",
  factory: "",
  building: "",
  floor: "",
  room: "",
  department: "",
  owner_profile_id: "",
  owner_employee_code: "",
  owner_name: "",
  purchase_date: "",
  po_number: "",
  status: "in_use",
  notes: "",
  last_verified_at: "",
};

const cleanText = (value) => String(value ?? "").trim();
const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const formatDateTime = (value) => {
  if (!value) return "ยังไม่เคยตรวจ";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const getProfileName = (profile) => profile?.full_name || profile?.employee_code || profile?.email || "ไม่ระบุชื่อ";
const getProfileAvatar = (profile) => profile?.avatar_url || profile?.id_card_url || "";

function StatusChip({ status }) {
  const meta = STATUS_META[status] || { label: status || "-", className: "border-slate-300 bg-slate-100 text-slate-700" };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>;
}

function Modal({ title, subtitle, onClose, children, maxWidth = "max-w-5xl" }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm">
      <div className={`max-h-[94vh] w-full ${maxWidth} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div><h2 className="text-lg font-black text-slate-950">{title}</h2>{subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}</div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="ปิด"><X size={20} /></button>
        </header>
        <div className="max-h-[calc(94vh-82px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function AssetQrFormModal({ assets, profiles, asset, currentUser, onSaved, onClose }) {
  const [form, setForm] = useState(() => asset ? {
    ...EMPTY_FORM,
    ...asset,
    owner_profile_id: asset.owner_profile_id || "",
    purchase_date: asset.purchase_date || "",
    last_verified_at: toDateTimeLocal(asset.last_verified_at),
  } : {
    ...EMPTY_FORM,
    asset_tag: generateSuggestedAssetTag("PC", assets),
  });
  const [files, setFiles] = useState([]);
  const [filePreview, setFilePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileDropdownField, setProfileDropdownField] = useState("");

  const ownerProfile = useMemo(
    () => profiles.find((profile) => String(profile.id) === String(form.owner_profile_id)) || null,
    [form.owner_profile_id, profiles],
  );
  const existingImage = Array.isArray(asset?.it_asset_attachments)
    ? asset.it_asset_attachments.find((attachment) => attachment?.file_url)?.file_url
    : "";

  const filteredProfiles = useMemo(() => {
    if (!profileDropdownField) return [];
    const query = cleanText(
      profileDropdownField === "employee_code" ? form.owner_employee_code : form.owner_name,
    ).toLowerCase();
    const matches = profiles.filter((profile) => {
      if (!query) return true;
      return [
        getProfileName(profile),
        profile.employee_code,
        profile.department,
        profile.email,
      ].some((value) => cleanText(value).toLowerCase().includes(query));
    });
    if (profileDropdownField === "employee_code" && query) {
      matches.sort((a, b) => {
        const aCode = cleanText(a.employee_code).toLowerCase();
        const bCode = cleanText(b.employee_code).toLowerCase();
        return Number(bCode.startsWith(query)) - Number(aCode.startsWith(query));
      });
    }
    return matches.slice(0, 8);
  }, [form.owner_employee_code, form.owner_name, profileDropdownField, profiles]);

  useEffect(() => {
    if (!ownerProfile) return;
    setForm((previous) => ({
      ...previous,
      owner_name: previous.owner_name || getProfileName(ownerProfile),
      owner_employee_code: previous.owner_employee_code || ownerProfile.employee_code || "",
      department: previous.department || ownerProfile.department || "",
    }));
  }, [ownerProfile]);

  useEffect(() => () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  const updateField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const handleCategoryChange = (category) => {
    setForm((previous) => ({
      ...previous,
      asset_category: category,
      asset_tag: asset ? previous.asset_tag : generateSuggestedAssetTag(category, assets),
    }));
  };

  const handleOwnerSelect = (profile) => {
    setForm((previous) => ({
      ...previous,
      owner_profile_id: profile?.id || "",
      owner_name: profile ? getProfileName(profile) : "",
      owner_employee_code: profile?.employee_code || "",
      department: profile?.department || "",
    }));
    setProfileDropdownField("");
  };

  const handleProfileInput = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field === "employee_code" ? "owner_employee_code" : "owner_name"]: value,
      owner_profile_id: "",
    }));
    setProfileDropdownField(field);
  };

  const handleProfileKeyDown = (event) => {
    if (event.key === "Escape") setProfileDropdownField("");
    if (event.key === "Enter" && filteredProfiles[0]) {
      event.preventDefault();
      handleOwnerSelect(filteredProfiles[0]);
    }
  };

  const renderProfileSuggestions = (field) => {
    if (profileDropdownField !== field) return null;
    return (
      <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
        {filteredProfiles.length ? filteredProfiles.map((profile) => {
          const avatar = getProfileAvatar(profile);
          return (
            <button
              key={profile.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleOwnerSelect(profile)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-blue-50"
            >
              {avatar ? <img src={avatar} alt={getProfileName(profile)} className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><UserRound size={18} /></span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-900">{getProfileName(profile)}</span>
                <span className="block truncate text-xs text-slate-500">{profile.employee_code || "ไม่มีรหัสพนักงาน"}{profile.department ? ` • ${profile.department}` : ""}</span>
              </span>
              <span className="text-[10px] font-bold text-blue-600">เลือก</span>
            </button>
          );
        }) : <p className="px-3 py-4 text-center text-xs font-semibold text-slate-500">ไม่พบพนักงานที่ตรงกับคำค้น</p>}
      </div>
    );
  };

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFiles(selected);
    setFilePreview(selected[0] ? URL.createObjectURL(selected[0]) : "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await saveAssetQrRecord({ form, files, editingAsset: asset, currentUser });
      toast.success(asset ? "อัปเดตข้อมูล Asset แล้ว QR เดิมยังใช้ได้" : "สร้าง Asset และ QR Code แล้ว");
      onSaved(saved);
    } catch (error) {
      console.error("Save Asset QR record error:", error);
      if (error?.code === "23505") toast.error("Asset Tag นี้มีอยู่แล้ว กรุณาเปลี่ยนรหัส");
      else toast.error(error?.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";
  const labelClass = "space-y-1.5 text-sm font-bold text-slate-700";

  return (
    <Modal title={asset ? `แก้ไข ${asset.asset_tag}` : "สร้าง Asset QR Code แบบ Manual"} subtitle="QR จะอ้างอิง Asset Tag ข้อมูลที่แก้ในอนาคตจะแสดงผ่าน QR เดิมทันที" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center gap-2"><PackagePlus size={18} className="text-blue-600" /><h3 className="font-black text-slate-900">ข้อมูลอุปกรณ์</h3></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className={labelClass}><span>ประเภทอุปกรณ์ *</span><select value={form.asset_category} onChange={(event) => handleCategoryChange(event.target.value)} className={inputClass}>{ASSET_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className={labelClass}><span>Asset Tag *</span><div className="flex gap-2"><input disabled={Boolean(asset)} value={form.asset_tag} onChange={(event) => updateField("asset_tag", event.target.value.toUpperCase())} className={inputClass} /><button type="button" disabled={Boolean(asset)} onClick={() => updateField("asset_tag", generateSuggestedAssetTag(form.asset_category, assets))} className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 disabled:opacity-40">สร้างรหัส</button></div></label>
              <label className={labelClass}><span>ชื่ออุปกรณ์ *</span><input value={form.asset_name} onChange={(event) => updateField("asset_name", event.target.value)} placeholder="เช่น PC ฝ่ายบัญชี 01" className={inputClass} /></label>
              <label className={labelClass}><span>Brand</span><input value={form.brand} onChange={(event) => updateField("brand", event.target.value)} className={inputClass} /></label>
              <label className={labelClass}><span>Model</span><input value={form.model} onChange={(event) => updateField("model", event.target.value)} className={inputClass} /></label>
              <label className={labelClass}><span>Serial Number</span><input value={form.serial_number} onChange={(event) => updateField("serial_number", event.target.value)} className={inputClass} /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center gap-2"><MapPin size={18} className="text-blue-600" /><h3 className="font-black text-slate-900">ตำแหน่งติดตั้ง</h3></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className={labelClass}><span>โรงงาน</span><input value={form.factory} onChange={(event) => updateField("factory", event.target.value)} className={inputClass} /></label>
              <label className={labelClass}><span>อาคาร</span><input value={form.building} onChange={(event) => updateField("building", event.target.value)} className={inputClass} /></label>
              <label className={labelClass}><span>ชั้น</span><input value={form.floor} onChange={(event) => updateField("floor", event.target.value)} className={inputClass} /></label>
              <label className={labelClass}><span>ห้อง</span><input value={form.room} onChange={(event) => updateField("room", event.target.value)} className={inputClass} /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center gap-2"><UserRound size={18} className="text-blue-600" /><h3 className="font-black text-slate-900">ผู้รับผิดชอบและการจัดซื้อ</h3></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className={`relative ${labelClass}`}><span>ชื่อพนักงาน / ผู้ใช้งาน</span><input autoComplete="off" value={form.owner_name} onFocus={() => setProfileDropdownField("name")} onBlur={() => window.setTimeout(() => setProfileDropdownField(""), 150)} onKeyDown={handleProfileKeyDown} onChange={(event) => handleProfileInput("name", event.target.value)} placeholder="พิมพ์ชื่อเพื่อค้นหาจากระบบ" className={inputClass} />{renderProfileSuggestions("name")}</label>
              <label className={`relative ${labelClass}`}><span>รหัสพนักงาน</span><input autoComplete="off" value={form.owner_employee_code} onFocus={() => setProfileDropdownField("employee_code")} onBlur={() => window.setTimeout(() => setProfileDropdownField(""), 150)} onKeyDown={handleProfileKeyDown} onChange={(event) => handleProfileInput("employee_code", event.target.value.toUpperCase())} placeholder="พิมพ์รหัสเพื่อค้นหาพนักงาน" className={inputClass} />{renderProfileSuggestions("employee_code")}</label>
              <label className={labelClass}><span>แผนก</span><input value={form.department} onChange={(event) => updateField("department", event.target.value)} className={inputClass} /></label>
              {ownerProfile ? <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 sm:col-span-2 lg:col-span-3"><div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><CheckCircle2 size={17} />ผูกกับบัญชี {getProfileName(ownerProfile)} แล้ว</div><button type="button" onClick={() => handleOwnerSelect(null)} className="text-xs font-bold text-rose-600 hover:underline">ยกเลิกการผูก</button></div> : <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-3">เลือกจาก Auto-complete เพื่อผูกรูปโปรไฟล์ ชื่อ รหัสพนักงาน และแผนกเข้ากับ Asset</p>}
              <label className={labelClass}><span>วันที่ซื้อ</span><input type="date" value={form.purchase_date} onChange={(event) => updateField("purchase_date", event.target.value)} className={inputClass} /></label>
              <label className={labelClass}><span>เลข PO</span><input value={form.po_number} onChange={(event) => updateField("po_number", event.target.value)} className={inputClass} /></label>
              <label className={labelClass}><span>สถานะ</span><select value={form.status} onChange={(event) => updateField("status", event.target.value)} className={inputClass}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className={`${labelClass} lg:col-span-2`}><span>วันที่ตรวจพบล่าสุด</span><input type="datetime-local" value={form.last_verified_at} onChange={(event) => updateField("last_verified_at", event.target.value)} className={inputClass} /><small className="font-normal text-slate-500">ระบบ Stock Audit จะอัปเดตค่านี้ให้อัตโนมัติเมื่อสแกนพบ</small></label>
            </div>
          </section>

          <label className={`block ${labelClass}`}><span>หมายเหตุ</span><textarea rows="3" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} className={`${inputClass} resize-none`} /></label>
        </div>

        <aside className="space-y-4">
          <div className="sticky top-0 space-y-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="aspect-[4/3] bg-slate-100">
                {filePreview || existingImage ? <img src={filePreview || existingImage} alt="อุปกรณ์" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-slate-400"><FileImage size={34} /><span className="mt-2 text-xs font-bold">ยังไม่มีรูปอุปกรณ์</span></div>}
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"><Camera size={17} />{files.length ? `เลือกรูปแล้ว ${files.length} รูป` : "ถ่าย/เลือกรูปอุปกรณ์"}<input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFiles} /></label>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">ผู้ใช้งานที่ผูก</p>
              <div className="mt-3 flex items-center gap-3">
                {getProfileAvatar(ownerProfile) ? <img src={getProfileAvatar(ownerProfile)} alt={getProfileName(ownerProfile)} className="h-12 w-12 rounded-xl border border-slate-200 object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><UserRound size={22} /></div>}
                <div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{form.owner_name || "ยังไม่ระบุ"}</p><p className="truncate text-xs font-semibold text-slate-600">{form.owner_employee_code || "ไม่มีรหัสพนักงาน"}</p><p className="truncate text-xs text-slate-500">{form.department || "ไม่ระบุแผนก"}</p></div>
              </div>
            </section>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><div className="flex gap-2"><QrCode size={18} className="shrink-0" /><p><strong>QR ใช้ Asset Tag เป็นตัวอ้างอิง</strong><br />ห้ามเปลี่ยน Asset Tag หลังติด Label แต่แก้ข้อมูลอื่นได้ตลอด</p></div></div>
          </div>
        </aside>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 lg:col-span-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600">ยกเลิก</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? <RefreshCw size={17} className="animate-spin" /> : <QrCode size={17} />}{asset ? "บันทึกการแก้ไข" : "บันทึกและสร้าง QR"}</button>
        </div>
      </form>
    </Modal>
  );
}

function QrOutputModal({ asset, onClose }) {
  const [dataUrl, setDataUrl] = useState("");
  const qrUrl = buildAssetQrUrl(asset.asset_tag);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrUrl, { width: 480, margin: 2, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } })
      .then((value) => { if (active) setDataUrl(value); })
      .catch((error) => { console.error(error); toast.error("สร้าง QR ไม่สำเร็จ"); });
    return () => { active = false; };
  }, [qrUrl]);

  const downloadQr = () => {
    if (!dataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `${asset.asset_tag}_QR.png`;
    anchor.click();
  };

  const printQr = () => {
    if (!dataUrl) return;
    const popup = window.open("", "_blank");
    if (!popup) return toast.error("กรุณาอนุญาต Pop-up เพื่อพิมพ์ Label");
    popup.opener = null;
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(asset.asset_tag)}</title><style>@page{size:80mm 50mm;margin:3mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}.label{width:74mm;height:44mm;border:1px solid #cbd5e1;border-radius:3mm;padding:3mm;display:flex;align-items:center;gap:3mm}.label img{width:34mm;height:34mm}.text{min-width:0}.tag{font-size:15pt;font-weight:800}.name{margin-top:2mm;font-size:9pt}.meta{margin-top:1.5mm;font-size:7pt;color:#475569}</style></head><body><div class="label"><img src="${dataUrl}"><div class="text"><div class="tag">${escapeHtml(asset.asset_tag)}</div><div class="name">${escapeHtml(asset.asset_name)}</div><div class="meta">${escapeHtml(asset.asset_category || "IT Asset")}<br>${escapeHtml(asset.brand || "")} ${escapeHtml(asset.model || "")}<br>S/N ${escapeHtml(asset.serial_number || "-")}</div></div></div></body></html>`);
    popup.document.close();
    window.setTimeout(() => popup.print(), 300);
  };

  return (
    <Modal title="QR Code พร้อมใช้งาน" subtitle="สแกนด้วยมือถือเพื่อเปิดข้อมูล Asset ล่าสุด" onClose={onClose} maxWidth="max-w-lg">
      <div className="p-5 text-center">
        <div className="mx-auto flex min-h-[280px] max-w-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{dataUrl ? <img src={dataUrl} alt={`QR ${asset.asset_tag}`} className="w-full" /> : <RefreshCw className="animate-spin text-blue-600" />}</div>
        <h3 className="mt-4 text-2xl font-black text-slate-950">{asset.asset_tag}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-600">{asset.asset_name}</p>
        <p className="mx-auto mt-3 max-w-sm break-all rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{qrUrl}</p>
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={downloadQr} disabled={!dataUrl} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700"><Download size={17} />ดาวน์โหลด PNG</button><button type="button" onClick={printQr} disabled={!dataUrl} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"><Printer size={17} />พิมพ์ Label</button></div>
      </div>
    </Modal>
  );
}

export default function AssetQrCenterPage({ theme = "light", currentUser, onNavigatePage }) {
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const [assets, setAssets] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [qrFilter, setQrFilter] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [editingAsset, setEditingAsset] = useState(undefined);
  const [qrAsset, setQrAsset] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetRows, profileRows] = await Promise.all([fetchAssetQrDirectory(), fetchAssetQrProfiles()]);
      setAssets(assetRows);
      setProfiles(profileRows);
      setSchemaReady(true);
    } catch (error) {
      console.error("Load Asset QR Center error:", error);
      if (isAssetQrSchemaError(error)) setSchemaReady(false);
      else toast.error(error?.message || "โหลดข้อมูล Asset QR ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const filterOptions = useMemo(() => {
    const uniqueSorted = (values) => [...new Set(values.map(cleanText).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, "th", { sensitivity: "base" }));

    return {
      categories: uniqueSorted(assets.map((asset) => asset.asset_category)),
      locations: uniqueSorted(assets.map((asset) => asset.factory || asset.location)),
    };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const query = cleanText(search).toLowerCase();
    return assets.filter((asset) => {
      const matchesSearch = !query || [
        asset.asset_tag,
        asset.asset_name,
        asset.asset_category,
        asset.brand,
        asset.model,
        asset.serial_number,
        asset.factory,
        asset.location,
        asset.building,
        asset.floor,
        asset.room,
        asset.department,
        asset.owner_name,
        asset.owner_employee_code,
        asset.po_number,
        asset.notes,
        STATUS_META[asset.status]?.label,
      ].some((value) => cleanText(value).toLowerCase().includes(query));
      const matchesCategory = !categoryFilter || cleanText(asset.asset_category) === categoryFilter;
      const matchesStatus = !statusFilter || cleanText(asset.status) === statusFilter;
      const matchesLocation = !locationFilter || cleanText(asset.factory || asset.location) === locationFilter;
      const matchesQr = !qrFilter
        || (qrFilter === "created" && Boolean(asset.qr_created_at))
        || (qrFilter === "not_created" && !asset.qr_created_at);

      return matchesSearch && matchesCategory && matchesStatus && matchesLocation && matchesQr;
    });
  }, [assets, categoryFilter, locationFilter, qrFilter, search, statusFilter]);

  const hasActiveFilters = Boolean(search || categoryFilter || statusFilter || locationFilter || qrFilter);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStatusFilter("");
    setLocationFilter("");
    setQrFilter("");
  };

  const summary = useMemo(() => ({
    total: assets.length,
    withQr: assets.filter((asset) => asset.qr_created_at).length,
    verified: assets.filter((asset) => asset.last_verified_at).length,
    withOwner: assets.filter((asset) => asset.owner_profile_id || asset.owner_name).length,
  }), [assets]);

  const openAssetDetail = (rawValue) => {
    const tag = extractAssetTagFromQr(rawValue);
    setShowScanner(false);
    setScanValue("");
    if (!tag) return toast.error("ไม่พบ Asset Tag ใน QR Code");
    const match = assets.find((asset) => cleanText(asset.asset_tag).toLowerCase() === cleanText(tag).toLowerCase());
    if (!match) return toast.error(`ไม่พบ ${tag} ในทะเบียน Asset`);
    navigate(`/asset-qr/${encodeURIComponent(match.asset_tag)}`);
  };

  const handleScanSubmit = (event) => {
    event.preventDefault();
    openAssetDetail(scanValue);
  };

  const handleSaved = async (savedAsset) => {
    setEditingAsset(undefined);
    await loadData();
    setQrAsset(savedAsset);
  };

  const handleOpenQr = async (asset) => {
    try {
      const markedAsset = await markAssetQrGenerated(asset);
      setAssets((previous) => previous.map((item) => item.id === markedAsset.id ? markedAsset : item));
      setQrAsset(markedAsset);
    } catch (error) {
      console.error("Mark QR generated error:", error);
      toast.error(error?.message || "เตรียม QR Code ไม่สำเร็จ");
    }
  };

  const shell = isDark ? "border-slate-700 bg-slate-900/70 text-slate-100" : "border-slate-200 bg-white text-slate-900";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const input = isDark ? "border-slate-700 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-800";

  return (
    <div className="space-y-5">
      <section className={`overflow-hidden rounded-2xl border ${shell}`}>
        <div className="relative px-5 py-6 sm:px-6">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4"><span className={`rounded-2xl p-3 ${isDark ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-700"}`}><QrCode size={29} /></span><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Asset Identity & Lookup</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Asset QR Center</h1><p className={`mt-2 max-w-3xl text-sm ${muted}`}>สร้าง Asset และ QR แบบ Manual, พิมพ์ Label และสแกนเพื่อดูข้อมูลอุปกรณ์ล่าสุด โดยไม่บันทึกเป็นการตรวจ Stock ประจำปี</p></div></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void loadData()} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold ${input}`}><RefreshCw size={16} />รีเฟรช</button><button type="button" onClick={() => setEditingAsset(null)} disabled={!schemaReady} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"><Plus size={17} />สร้าง QR ใหม่</button></div>
          </div>
        </div>
      </section>

      {!schemaReady ? <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 shrink-0" /><div><h2 className="font-black">ยังไม่ได้เปิดใช้ฐานข้อมูล Asset QR Center</h2><p className="mt-1 text-sm">รันไฟล์ <code className="rounded bg-amber-100 px-1.5 py-0.5 font-bold">database/20260729_it_asset_qr_center.sql</code> ใน Supabase SQL Editor แล้วกดรีเฟรช</p></div></div></section> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Asset ทั้งหมด", summary.total, Laptop, "text-blue-600 bg-blue-50"],
          ["สร้าง QR แล้ว", summary.withQr, QrCode, "text-violet-600 bg-violet-50"],
          ["มีผู้รับผิดชอบ", summary.withOwner, UserRound, "text-cyan-600 bg-cyan-50"],
          ["มีประวัติตรวจพบ", summary.verified, CalendarCheck, "text-emerald-600 bg-emerald-50"],
        ].map(([label, value, Icon, tone]) => <div key={label} className={`rounded-2xl border p-4 ${shell}`}><div className="flex items-center justify-between"><div><p className={`text-xs font-bold ${muted}`}>{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div><span className={`rounded-xl p-2.5 ${tone}`}><Icon size={20} /></span></div></div>)}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`rounded-2xl border p-5 ${shell}`}><div className="flex items-start gap-3"><span className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><ScanLine size={22} /></span><div><p className="text-xs font-black uppercase tracking-wider text-violet-500">Scan Mode 1</p><h2 className="mt-1 font-black">สแกนเพื่อดูข้อมูลอุปกรณ์</h2><p className={`mt-1 text-xs ${muted}`}>เปิดข้อมูล รูปอุปกรณ์ รูปผู้ใช้งาน ตำแหน่ง และวันที่ตรวจล่าสุด โดยไม่เปลี่ยนผล Audit</p></div></div><form onSubmit={handleScanSubmit} className="mt-4 flex gap-2"><input value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="สแกนหรือกรอก Asset Tag" className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-500 ${input}`} /><button type="submit" className="rounded-xl bg-violet-600 px-4 text-sm font-bold text-white">เปิดข้อมูล</button><button type="button" onClick={() => setShowScanner(true)} className="rounded-xl border border-violet-300 bg-violet-50 px-3 text-violet-700" title="เปิดกล้อง"><Camera size={18} /></button></form></div>
        <div className={`rounded-2xl border p-5 ${shell}`}><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><ClipboardCheck size={22} /></span><div><p className="text-xs font-black uppercase tracking-wider text-blue-500">Scan Mode 2</p><h2 className="mt-1 font-black">สแกนเพื่อตรวจ Stock ประจำปี</h2><p className={`mt-1 text-xs ${muted}`}>ใช้โหมดนี้เมื่อต้องบันทึกผลตรวจ ถูกต้อง ข้อมูลไม่ตรง ชำรุด หรือไม่พบในรอบ Audit</p></div></div><button type="button" onClick={() => onNavigatePage?.(DASHBOARD_PAGE_IDS.ASSET_STOCK_AUDIT)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"><ClipboardCheck size={17} />ไปหน้า Stock Audit PC & Monitor</button></div>
      </section>

      <section className={`overflow-hidden rounded-2xl border ${shell}`}>
        <header className={`border-b p-4 sm:p-5 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="font-black">ทะเบียน Asset และ QR</h2>
              <p className={`mt-1 text-xs ${muted}`}>ค้นหาด้วย Asset Tag, Serial, ชื่อพนักงาน หรือกรองรายการตามข้อมูลที่ต้องการ</p>
            </div>
            <label className="relative w-full xl:max-w-md">
              <span className="sr-only">ค้นหาทะเบียน Asset</span>
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหา Asset Tag, S/N, ชื่อ/รหัสพนักงาน..."
                className={`w-full rounded-xl border py-2.5 pl-9 pr-9 text-sm outline-none focus:border-violet-500 ${input}`}
              />
              {search ? (
                <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="ล้างคำค้นหา">
                  <X size={15} />
                </button>
              ) : null}
            </label>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(150px,1fr)_minmax(170px,1fr)_minmax(180px,1.2fr)_minmax(160px,1fr)_auto]">
            <label>
              <span className="sr-only">กรองประเภทอุปกรณ์</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-500 ${input}`}>
                <option value="">ทุกประเภทอุปกรณ์</option>
                {filterOptions.categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">กรองสถานะอุปกรณ์</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-500 ${input}`}>
                <option value="">ทุกสถานะอุปกรณ์</option>
                {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">กรองโรงงานหรือสถานที่</span>
              <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-500 ${input}`}>
                <option value="">ทุกโรงงาน/สถานที่</option>
                {filterOptions.locations.map((location) => <option key={location} value={location}>{location}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">กรองสถานะ QR</span>
              <select value={qrFilter} onChange={(event) => setQrFilter(event.target.value)} className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-500 ${input}`}>
                <option value="">QR ทั้งหมด</option>
                <option value="created">สร้าง QR แล้ว</option>
                <option value="not_created">ยังไม่ได้สร้าง QR</option>
              </select>
            </label>
            <button type="button" onClick={clearFilters} disabled={!hasActiveFilters} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${input}`}>
              <ListFilter size={16} />
              ล้างตัวกรอง
            </button>
          </div>

          <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 text-xs ${muted}`}>
            <p>แสดง <strong className={isDark ? "text-white" : "text-slate-900"}>{filteredAssets.length}</strong> จาก {assets.length} รายการ</p>
            {hasActiveFilters ? <p className="font-semibold text-violet-600">กำลังใช้ตัวกรอง</p> : <p>QR เดิมยังใช้ต่อได้เมื่อแก้ไขข้อมูล Asset</p>}
          </div>
        </header>
        {loading ? <div className={`flex items-center justify-center py-16 ${muted}`}><RefreshCw className="mr-2 animate-spin" />กำลังโหลดข้อมูล...</div> : filteredAssets.length ? <div className={`divide-y ${isDark ? "divide-slate-700" : "divide-slate-100"}`}>{filteredAssets.map((asset) => {
          const image = Array.isArray(asset.it_asset_attachments) ? asset.it_asset_attachments.find((attachment) => attachment?.file_url) : null;
          return <article key={asset.id} className={`grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(280px,1.2fr)_minmax(220px,1fr)_190px_auto] lg:items-center ${isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}`}>
            <div className="flex min-w-0 items-start gap-3">{image ? <img src={image.file_url} alt={asset.asset_name} className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover" /> : <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${isDark ? "bg-slate-800 text-violet-300" : "bg-violet-50 text-violet-600"}`}>{/monitor/i.test(asset.asset_category || "") ? <Monitor size={24} /> : <Laptop size={24} />}</span>}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{asset.asset_tag}</p><StatusChip status={asset.status} /></div><p className={`mt-1 truncate text-sm font-bold ${muted}`}>{asset.asset_name}</p><p className={`mt-1 text-xs ${muted}`}>{asset.brand || "-"} {asset.model || ""} • S/N {asset.serial_number || "-"}</p></div></div>
            <div className="space-y-1.5 text-sm"><p className="flex items-center gap-2"><Factory size={15} className="text-slate-400" /><span className="truncate">{asset.factory || asset.location || "ไม่ระบุสถานที่"}</span></p><p className="flex items-center gap-2"><Building2 size={15} className="text-slate-400" /><span className="truncate">{[asset.building, asset.floor, asset.room].filter(Boolean).join(" / ") || "-"}</span></p><p className="flex items-center gap-2"><UserRound size={15} className="text-slate-400" /><span className="truncate">{asset.owner_name || "ไม่ระบุผู้ใช้"}</span></p></div>
            <div><p className={`text-xs font-bold ${muted}`}>ตรวจพบล่าสุด</p><p className="mt-1 text-sm font-bold">{formatDateTime(asset.last_verified_at)}</p><p className={`mt-1 text-xs ${muted}`}>{asset.owner_employee_code ? `${asset.owner_employee_code} • ` : ""}{asset.department || "ไม่ระบุแผนก"}</p></div>
            <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => navigate(`/asset-qr/${encodeURIComponent(asset.asset_tag)}`)} className={`rounded-lg border p-2 ${isDark ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`} title="เปิดข้อมูล"><ExternalLink size={16} /></button><button type="button" onClick={() => setEditingAsset(asset)} className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700" title="แก้ไข"><Edit3 size={16} /></button><button type="button" onClick={() => void handleOpenQr(asset)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white"><QrCode size={15} />สร้าง/พิมพ์ QR</button></div>
          </article>;
        })}</div> : <div className={`py-16 text-center ${muted}`}><Search className="mx-auto mb-3 opacity-50" /><p className="font-bold">ไม่พบรายการ Asset</p></div>}
      </section>

      {editingAsset !== undefined ? <AssetQrFormModal assets={assets} profiles={profiles} asset={editingAsset} currentUser={currentUser} onSaved={handleSaved} onClose={() => setEditingAsset(undefined)} /> : null}
      {qrAsset ? <QrOutputModal asset={qrAsset} onClose={() => setQrAsset(null)} /> : null}
      {showScanner ? <AssetViewScannerModal onDetected={openAssetDetail} onClose={() => setShowScanner(false)} /> : null}
    </div>
  );
}
