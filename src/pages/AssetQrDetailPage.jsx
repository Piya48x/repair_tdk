import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  Factory,
  FileImage,
  HardDrive,
  MapPin,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  UserRound,
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
  return new Intl.DateTimeFormat("th-TH", withTime ? { dateStyle: "long", timeStyle: "short" } : { dateStyle: "long" }).format(date);
};

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-400"><Icon size={16} /><span className="text-xs font-bold uppercase tracking-wider">{label}</span></div>
      <p className="mt-2 break-words text-sm font-black text-slate-900">{value || "-"}</p>
    </div>
  );
}

export default function AssetQrDetailPage() {
  const { assetTag = "" } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  const ownerName = owner?.full_name || asset?.owner_name || "ไม่ระบุผู้รับผิดชอบ";
  const ownerAvatar = owner?.avatar_url || owner?.id_card_url || "";
  const statusClass = STATUS_CLASSES[asset?.status] || "border-slate-300 bg-slate-100 text-slate-700";

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><RefreshCw className="mr-3 animate-spin text-blue-600" /><span className="font-bold text-slate-600">กำลังเปิดข้อมูล Asset...</span></div>;
  }

  if (error || !asset) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5"><div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl"><PackageSearch size={42} className="mx-auto text-rose-500" /><h1 className="mt-4 text-xl font-black text-slate-950">ไม่พบข้อมูลอุปกรณ์</h1><p className="mt-2 text-sm text-slate-500">{error}</p><button type="button" onClick={() => navigate(-1)} className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">ย้อนกลับ</button></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3"><img src={tdkLogo} alt="TDK" className="h-10 w-10 rounded-xl border border-slate-200 bg-white object-contain p-1" /><div><p className="text-sm font-black uppercase tracking-tight text-slate-950">TDK Industrial</p><p className="text-xs font-semibold text-slate-500">Asset QR Information</p></div></div>
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600"><ArrowLeft size={16} />ย้อนกลับ</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass}`}>{STATUS_LABELS[asset.status] || asset.status || "-"}</span><span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">{asset.asset_category || "IT Asset"}</span></div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{asset.asset_tag}</h1>
              <p className="mt-2 text-lg font-bold text-slate-600">{asset.asset_name}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-400">Brand</p><p className="mt-1 font-black text-slate-900">{asset.brand || "-"}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-400">Model</p><p className="mt-1 font-black text-slate-900">{asset.model || "-"}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-400">Serial Number</p><p className="mt-1 break-all font-black text-slate-900">{asset.serial_number || "-"}</p></div></div>
            </div>

            <div className="border-t border-slate-200 bg-gradient-to-br from-blue-50 to-violet-50 p-5 sm:p-7 lg:border-l lg:border-t-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">ผู้รับผิดชอบ / ผู้ใช้งาน</p>
              <div className="mt-4 flex items-center gap-4">{ownerAvatar ? <img src={ownerAvatar} alt={ownerName} className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-md" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-slate-200 text-slate-500 shadow-md"><UserRound size={34} /></div>}<div className="min-w-0"><p className="truncate text-lg font-black text-slate-950">{ownerName}</p><p className="mt-1 text-sm font-semibold text-slate-600">{owner?.employee_code || asset.owner_employee_code || "-"}</p><p className="text-sm text-slate-500">{asset.department || owner?.department || "ไม่ระบุแผนก"}</p></div></div>
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/80 p-4"><div className="flex items-start gap-3"><CalendarCheck className="mt-0.5 shrink-0 text-emerald-600" size={21} /><div><p className="text-xs font-bold text-emerald-700">วันที่ตรวจพบล่าสุด</p><p className="mt-1 font-black text-slate-900">{asset.last_verified_at ? formatDate(asset.last_verified_at, true) : "ยังไม่เคยตรวจใน Stock Audit"}</p></div></div></div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem icon={Factory} label="โรงงาน" value={asset.factory} />
          <DetailItem icon={Building2} label="อาคาร / ชั้น / ห้อง" value={[asset.building, asset.floor, asset.room].filter(Boolean).join(" / ")} />
          <DetailItem icon={MapPin} label="ตำแหน่งรวม" value={asset.location} />
          <DetailItem icon={UserRound} label="แผนก" value={asset.department || owner?.department} />
          <DetailItem icon={ShoppingCart} label="วันที่ซื้อ" value={formatDate(asset.purchase_date)} />
          <DetailItem icon={ShoppingCart} label="เลข PO" value={asset.po_number} />
          <DetailItem icon={ShieldCheck} label="สถานะ" value={STATUS_LABELS[asset.status] || asset.status} />
          <DetailItem icon={HardDrive} label="อัปเดตข้อมูลล่าสุด" value={formatDate(asset.updated_at, true)} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><FileImage size={21} /></span><div><h2 className="font-black text-slate-950">รูปอุปกรณ์และหลักฐาน</h2><p className="text-xs text-slate-500">ทั้งหมด {attachments.length} รูป</p></div></div>
          {attachments.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{attachments.map((attachment) => <a key={attachment.id} href={attachment.file_url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><img src={attachment.file_url} alt={attachment.file_name || "Asset evidence"} className="aspect-[4/3] w-full object-cover transition group-hover:scale-105" /><p className="truncate px-3 py-2 text-xs font-semibold text-slate-600">{attachment.file_name || "รูปหลักฐาน"}</p></a>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-slate-400"><FileImage className="mx-auto" /><p className="mt-2 text-sm font-bold">ยังไม่มีรูปอุปกรณ์</p></div>}
        </section>

        {asset.notes ? <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-black text-slate-950">หมายเหตุ</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{asset.notes}</p></section> : null}
      </main>
    </div>
  );
}
