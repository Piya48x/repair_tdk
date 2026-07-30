import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Factory,
  FileImage,
  HardDrive,
  MapPin,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { fetchAssetQrDetail } from "./it-dashboard/services/assetQrService";
import tdkLogo from "../assets/2.png";

const STATUS_LABELS = {
  in_use: "ใช้งาน",
  assigned: "มอบหมายแล้ว",
  spare: "สำรอง",
  available: "พร้อมใช้งาน",
  repair: "อยู่ระหว่างซ่อม",
  broken: "ชำรุด",
  lost: "สูญหาย",
  retired: "จำหน่าย/ปลดระวาง",
};

const STATUS_CLASSES = {
  in_use: "border-emerald-200 bg-emerald-50 text-emerald-700",
  assigned: "border-blue-200 bg-blue-50 text-blue-700",
  spare: "border-violet-200 bg-violet-50 text-violet-700",
  available: "border-cyan-200 bg-cyan-50 text-cyan-700",
  repair: "border-amber-200 bg-amber-50 text-amber-800",
  broken: "border-rose-200 bg-rose-50 text-rose-700",
  lost: "border-rose-200 bg-rose-50 text-rose-700",
  retired: "border-slate-300 bg-slate-100 text-slate-700",
};

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(
    "th-TH",
    withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" },
  ).format(date);
};

function AssetMetric({ label, value, wide = false }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 sm:px-4 sm:py-3 ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-900" title={value || "-"}>
        {value || "-"}
      </p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
        <Icon size={17} strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-bold text-slate-900">{value || "-"}</p>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, eyebrow, title, children }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon size={20} />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">{eyebrow}</p>
          <h2 className="mt-0.5 font-black text-slate-950">{title}</h2>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="animate-pulse rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex gap-4">
            <div className="h-24 w-24 shrink-0 rounded-2xl bg-slate-200 sm:h-40 sm:w-40" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-5 w-24 rounded-full bg-slate-100" />
              <div className="h-8 w-40 rounded bg-slate-200" />
              <div className="h-4 max-w-sm rounded bg-slate-100" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center text-sm font-bold text-slate-500">
          <RefreshCw size={16} className="mr-2 animate-spin text-blue-600" />
          กำลังเปิดข้อมูล Asset...
        </div>
      </div>
    </div>
  );
}

function ImagePreviewModal({ preview, canNavigate, onPrevious, onNext, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (canNavigate && event.key === "ArrowLeft") onPrevious();
      if (canNavigate && event.key === "ArrowRight") onNext();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canNavigate, onClose, onNext, onPrevious]);

  if (!preview?.url) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-label={preview.title || "ดูรูปภาพ"}>
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="ปิดรูปภาพ" />
      <div className="relative z-10 flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-white/15 bg-slate-950 shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3 text-white sm:px-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Image Preview</p>
            <p className="mt-0.5 truncate text-sm font-bold text-slate-100">{preview.title || "รูปภาพ"}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20" aria-label="ปิด">
            <X size={20} />
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/40 p-2 sm:p-4">
          <img src={preview.url} alt={preview.title || "รูปภาพ"} className="max-h-[calc(100vh-120px)] max-w-full object-contain" />
          {canNavigate ? (
            <>
              <button type="button" onClick={onPrevious} className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/65 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/90 sm:left-4" aria-label="รูปก่อนหน้า">
                <ChevronLeft size={24} />
              </button>
              <button type="button" onClick={onNext} className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/65 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/90 sm:right-4" aria-label="รูปถัดไป">
                <ChevronRight size={24} />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AssetQrDetailPage() {
  const { assetTag = "" } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchAssetQrDetail(decodeURIComponent(assetTag));
        if (!active) return;
        if (!data) setError("ไม่พบ Asset Tag นี้ในทะเบียน");
        setAsset(data);
      } catch (loadError) {
        console.error("Load QR asset detail error:", loadError);
        if (active) setError(loadError?.message || "โหลดข้อมูล Asset ไม่สำเร็จ");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [assetTag]);

  const attachments = useMemo(
    () => (Array.isArray(asset?.it_asset_attachments) ? asset.it_asset_attachments : []).filter((item) => item?.file_url),
    [asset],
  );
  const owner = asset?.owner_profile || null;
  const ownerName = owner?.full_name || asset?.owner_name || "ยังไม่ระบุผู้รับผิดชอบ";
  const ownerAvatar = owner?.avatar_url || owner?.id_card_url || "";
  const primaryImage = attachments[0]?.file_url || "";
  const statusClass = STATUS_CLASSES[asset?.status] || "border-slate-300 bg-slate-100 text-slate-700";
  const locationDetail = [asset?.building, asset?.floor, asset?.room].filter(Boolean).join(" / ");

  const openAttachmentPreview = (index) => {
    const attachment = attachments[index];
    if (!attachment?.file_url) return;
    setImagePreview({
      url: attachment.file_url,
      title: attachment.file_name || `รูปหลักฐาน ${index + 1}`,
      attachmentIndex: index,
    });
  };

  const openSinglePreview = (url, title) => {
    if (!url) return;
    setImagePreview({ url, title, attachmentIndex: null });
  };

  const moveAttachmentPreview = (offset) => {
    setImagePreview((current) => {
      if (!attachments.length || !Number.isInteger(current?.attachmentIndex)) return current;
      const nextIndex = (current.attachmentIndex + offset + attachments.length) % attachments.length;
      const nextAttachment = attachments[nextIndex];
      return {
        url: nextAttachment.file_url,
        title: nextAttachment.file_name || `รูปหลักฐาน ${nextIndex + 1}`,
        attachmentIndex: nextIndex,
      };
    });
  };

  if (loading) return <LoadingState />;

  if (error || !asset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#eff6ff_0,#f8fafc_45%)] p-4">
        <div className="w-full max-w-md rounded-[28px] border border-rose-200 bg-white p-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-9">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500"><PackageSearch size={34} /></span>
          <h1 className="mt-5 text-xl font-black text-slate-950">ไม่พบข้อมูลอุปกรณ์</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
          <button type="button" onClick={() => navigate(-1)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
            <ArrowLeft size={16} />ย้อนกลับ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f1f5f9_48%,#f8fafc_100%)] pb-8 sm:pb-12">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={tdkLogo} alt="TDK" className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1 sm:h-10 sm:w-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-tight text-slate-950">TDK Industrial</p>
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-xs">Asset Digital Profile</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-700 sm:px-3">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">ย้อนกลับ</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-6 sm:py-6">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)] sm:hidden">
          <div className="flex h-44 items-center justify-center overflow-hidden border-b border-slate-200 bg-slate-100">
            {primaryImage ? (
              <button type="button" onClick={() => openAttachmentPreview(0)} className="block h-full w-full cursor-zoom-in" aria-label="เปิดรูปอุปกรณ์ขนาดเต็ม">
                <img src={primaryImage} alt={asset.asset_name || asset.asset_tag} className="h-full w-full bg-white object-contain" />
              </button>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-violet-50 text-slate-300">
                <HardDrive size={48} />
                <p className="mt-2 text-xs font-bold text-slate-400">ยังไม่มีรูปอุปกรณ์</p>
              </div>
            )}
          </div>

          <div className="px-4 pb-4 pt-4">
            <div className="flex items-start gap-3 text-left">
              {ownerAvatar ? (
                <button type="button" onClick={() => openSinglePreview(ownerAvatar, `รูปพนักงาน ${ownerName}`)} className="shrink-0 cursor-zoom-in rounded-full" aria-label="ดูรูปพนักงาน">
                  <img src={ownerAvatar} alt={ownerName} className="h-16 w-16 rounded-full border-2 border-white bg-white object-cover shadow-[0_8px_24px_rgba(15,23,42,0.18)] ring-1 ring-slate-200" />
                </button>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-400 shadow-[0_8px_24px_rgba(15,23,42,0.18)] ring-1 ring-slate-200">
                  <UserRound size={27} />
                </div>
              )}
              <div className="min-w-0 flex-1 pt-1">
                <p className="truncate text-base font-black text-slate-950">{ownerName}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-500">{owner?.employee_code || asset.owner_employee_code || "ไม่มีรหัสพนักงาน"}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{asset.department || owner?.department || "ไม่ระบุแผนก"}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass}`}>
                {STATUS_LABELS[asset.status] || asset.status || "-"}
              </span>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">
                {asset.asset_category || "IT Asset"}
              </span>
            </div>

            <div className="mt-3 rounded-[20px] bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-left text-white shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">Asset Tag</p>
                  <h1 className="mt-1 break-words text-2xl font-black tracking-tight">{asset.asset_tag}</h1>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-300">{asset.asset_name}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-200 ring-1 ring-white/10">
                  <HardDrive size={20} />
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-left">
              <AssetMetric label="Brand" value={asset.brand} />
              <AssetMetric label="Model" value={asset.model} />
              <div className="col-span-2"><AssetMetric label="Serial Number" value={asset.serial_number} /></div>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm"><CalendarCheck size={18} /></span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">ตรวจพบล่าสุด</p>
                <p className="mt-0.5 text-xs font-black leading-5 text-slate-900">{asset.last_verified_at ? formatDate(asset.last_verified_at, true) : "ยังไม่เคยตรวจใน Stock Audit"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:block">
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" />
          <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
            <div className="p-4 sm:p-6 lg:p-7">
              <div className="flex items-start gap-3.5 sm:gap-5">
                <button
                  type="button"
                  onClick={() => openAttachmentPreview(0)}
                  disabled={!primaryImage}
                  className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm sm:h-40 sm:w-44 lg:h-44 lg:w-52"
                  aria-label={primaryImage ? "เปิดรูปอุปกรณ์ขนาดเต็ม" : "ยังไม่มีรูปอุปกรณ์"}
                >
                  {primaryImage ? (
                    <img src={primaryImage} alt={asset.asset_name || asset.asset_tag} className="h-full w-full object-cover" />
                  ) : (
                    <HardDrive size={36} className="text-slate-300 sm:h-12 sm:w-12" />
                  )}
                </button>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black sm:text-xs ${statusClass}`}>
                      {STATUS_LABELS[asset.status] || asset.status || "-"}
                    </span>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700 sm:text-xs">
                      {asset.asset_category || "IT Asset"}
                    </span>
                  </div>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Asset Tag</p>
                  <h1 className="mt-0.5 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">{asset.asset_tag}</h1>
                  <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-slate-600 sm:text-lg">{asset.asset_name}</p>
                  <p className="mt-2 hidden text-xs font-semibold text-slate-400 sm:block">อัปเดตล่าสุด {formatDate(asset.updated_at, true)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-3">
                <AssetMetric label="Brand" value={asset.brand} />
                <AssetMetric label="Model" value={asset.model} />
                <AssetMetric label="Serial Number" value={asset.serial_number} wide />
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-[linear-gradient(145deg,#eff6ff_0%,#f5f3ff_100%)] p-4 sm:p-6 lg:border-l lg:border-t-0 lg:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">ผู้รับผิดชอบ / ผู้ใช้งาน</p>
              <div className="mt-3 flex items-center gap-3">
                {ownerAvatar ? (
                  <button type="button" onClick={() => openSinglePreview(ownerAvatar, `รูปพนักงาน ${ownerName}`)} className="shrink-0 cursor-zoom-in rounded-2xl" aria-label="ดูรูปพนักงาน">
                    <img src={ownerAvatar} alt={ownerName} className="h-14 w-14 rounded-2xl border-2 border-white object-cover shadow-md sm:h-16 sm:w-16" />
                  </button>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white bg-slate-200 text-slate-500 shadow-md sm:h-16 sm:w-16">
                    <UserRound size={26} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-slate-950 sm:text-lg">{ownerName}</p>
                  <p className="mt-0.5 truncate text-xs font-bold text-slate-600">{owner?.employee_code || asset.owner_employee_code || "ไม่มีรหัสพนักงาน"}</p>
                  <p className="truncate text-xs text-slate-500">{asset.department || owner?.department || "ไม่ระบุแผนก"}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-white/85 p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CalendarCheck size={18} /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">ตรวจพบล่าสุด</p>
                    <p className="mt-1 text-sm font-black leading-5 text-slate-900">{asset.last_verified_at ? formatDate(asset.last_verified_at, true) : "ยังไม่เคยตรวจใน Stock Audit"}</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <SectionCard icon={MapPin} eyebrow="Location" title="ตำแหน่งติดตั้ง">
            <InfoRow icon={Factory} label="โรงงาน" value={asset.factory} />
            <InfoRow icon={Building2} label="อาคาร / ชั้น / ห้อง" value={locationDetail} />
            <div className="sm:col-span-2"><InfoRow icon={MapPin} label="ตำแหน่งรวม" value={asset.location} /></div>
          </SectionCard>

          <SectionCard icon={ShoppingCart} eyebrow="Lifecycle" title="การจัดซื้อและสถานะ">
            <InfoRow icon={ShoppingCart} label="วันที่ซื้อ" value={formatDate(asset.purchase_date)} />
            <InfoRow icon={ShoppingCart} label="เลข PO" value={asset.po_number} />
            <InfoRow icon={ShieldCheck} label="สถานะปัจจุบัน" value={STATUS_LABELS[asset.status] || asset.status} />
            <InfoRow icon={HardDrive} label="อัปเดตล่าสุด" value={formatDate(asset.updated_at, true)} />
          </SectionCard>
        </div>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><FileImage size={20} /></span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-500">Evidence</p>
                <h2 className="font-black text-slate-950">รูปอุปกรณ์และหลักฐาน</h2>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">{attachments.length} รูป</span>
          </div>

          {attachments.length ? (
            <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
              {attachments.map((attachment, index) => (
                <button
                  type="button"
                  key={attachment.id}
                  onClick={() => openAttachmentPreview(index)}
                  className="group w-40 shrink-0 snap-start cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left transition hover:-translate-y-0.5 hover:shadow-lg sm:w-auto"
                  aria-label={`ดู${attachment.file_name || `รูปหลักฐาน ${index + 1}`}`}
                >
                  <div className="relative">
                    <img src={attachment.file_url} alt={attachment.file_name || "Asset evidence"} className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105" />
                    {index === 0 ? <span className="absolute left-2 top-2 rounded-full bg-slate-950/75 px-2 py-0.5 text-[9px] font-black text-white backdrop-blur">รูปหลัก</span> : null}
                  </div>
                  <p className="truncate px-3 py-2 text-[11px] font-bold text-slate-600">{attachment.file_name || "รูปหลักฐาน"}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-slate-400">
              <FileImage className="shrink-0" />
              <div><p className="text-sm font-bold">ยังไม่มีรูปอุปกรณ์</p><p className="mt-0.5 text-xs">เพิ่มรูปได้จากหน้า Asset QR Center</p></div>
            </div>
          )}
        </section>

        {asset.notes ? (
          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:p-5">
            <h2 className="font-black text-slate-950">หมายเหตุ</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{asset.notes}</p>
          </section>
        ) : null}

        <p className="px-2 pt-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Asset information from TDK IT Service Center
        </p>
      </main>

      {imagePreview ? (
        <ImagePreviewModal
          preview={imagePreview}
          canNavigate={attachments.length > 1 && Number.isInteger(imagePreview.attachmentIndex)}
          onPrevious={() => moveAttachmentPreview(-1)}
          onNext={() => moveAttachmentPreview(1)}
          onClose={() => setImagePreview(null)}
        />
      ) : null}
    </div>
  );
}
