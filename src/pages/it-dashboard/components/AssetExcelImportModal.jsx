import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  applyAssetExcelImport,
  isAssetExcelImportSchemaError,
  previewAssetExcelImport,
} from "../services/assetExcelImportService";

const ACTION_META = {
  code_change: { label: "เปลี่ยน Asset Code", className: "border-violet-200 bg-violet-50 text-violet-700" },
  update: { label: "อัปเดตรายการเดิม", className: "border-blue-200 bg-blue-50 text-blue-700" },
  insert: { label: "เพิ่มรายการใหม่", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  conflict: { label: "ต้องตรวจสอบ", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

function ActionChip({ action }) {
  const meta = ACTION_META[action] || ACTION_META.conflict;
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.className}`}>{meta.label}</span>;
}

export default function AssetExcelImportModal({ assets, isDark = false, onImported, onClose }) {
  const [preview, setPreview] = useState(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setReading(true);
    try {
      const nextPreview = await previewAssetExcelImport({ files, existingAssets: assets });
      setPreview(nextPreview);
      if (nextPreview.summary.conflict) {
        toast.error(`พบ ${nextPreview.summary.conflict} รายการที่ต้องตรวจสอบ`);
      } else {
        toast.success(`อ่านไฟล์สำเร็จ ${nextPreview.summary.total} รายการ`);
      }
    } catch (error) {
      console.error("Preview asset Excel import error:", error);
      setPreview(null);
      toast.error(error?.message || "อ่านไฟล์ Excel ไม่สำเร็จ");
    } finally {
      setReading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.summary.conflict > 0) return;
    if (!window.confirm(`ยืนยัน Import ${preview.summary.total} รายการ\nระบบจะไม่ลบ Asset เดิม รูป หรือประวัติ`)) return;

    setImporting(true);
    try {
      const result = await applyAssetExcelImport(preview);
      toast.success(`Import สำเร็จ: เปลี่ยนรหัส ${result.code_changed || 0}, อัปเดต ${result.updated || 0}, เพิ่มใหม่ ${result.inserted || 0}`);
      await onImported?.(result);
      onClose();
    } catch (error) {
      console.error("Apply asset Excel import error:", error);
      if (isAssetExcelImportSchemaError(error)) {
        toast.error("กรุณารัน database/20260826_it_asset_excel_import.sql ก่อนใช้งาน Import");
      } else {
        toast.error(error?.message || "Import ข้อมูลไม่สำเร็จ ระบบยกเลิกทั้งชุดแล้ว");
      }
    } finally {
      setImporting(false);
    }
  };

  const shell = isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900";
  const soft = isDark ? "border-slate-700 bg-slate-950/70" : "border-slate-200 bg-slate-50";
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
      <div className={`flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${shell}`}>
        <header className={`flex items-start justify-between gap-4 border-b px-5 py-4 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><FileSpreadsheet size={22} /></span>
            <div>
              <h2 className="text-lg font-black">Import ทะเบียน Asset จาก Excel</h2>
              <p className={`mt-1 text-sm ${muted}`}>เลือกไฟล์ PC, Notebook และ Monitor พร้อมกันได้ ระบบใช้ AssetCode จริงจากไฟล์เป็นรหัสหลัก</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={importing} className={`rounded-xl p-2 ${muted}`} aria-label="ปิด"><X size={20} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <section className={`rounded-2xl border p-4 ${soft}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-black">ไฟล์ที่รองรับ: .xlsx</p>
                <p className={`mt-1 text-xs ${muted}`}>ถ้า asset_tag เป็น PC-001 / NB-001 / MN-001 ระบบจะดึงรหัสจาก <strong>AssetCode:</strong> ใน notes เช่น CPUTDK0065, NTDK0001, MTDK0001</p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700">
                {reading ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
                {reading ? "กำลังอ่านไฟล์..." : "เลือกไฟล์ Excel"}
                <input type="file" accept=".xlsx" multiple disabled={reading || importing} onChange={handleFiles} className="hidden" />
              </label>
            </div>
          </section>

          {preview ? (
            <>
              <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ["ทั้งหมด", preview.summary.total, "text-slate-700 bg-slate-100"],
                  ["เปลี่ยนรหัส", preview.summary.codeChange, "text-violet-700 bg-violet-50"],
                  ["อัปเดต", preview.summary.update, "text-blue-700 bg-blue-50"],
                  ["เพิ่มใหม่", preview.summary.insert, "text-emerald-700 bg-emerald-50"],
                  ["ต้องตรวจสอบ", preview.summary.conflict, "text-rose-700 bg-rose-50"],
                ].map(([label, value, tone]) => (
                  <div key={label} className={`rounded-2xl border p-4 ${soft}`}>
                    <p className={`text-xs font-bold ${muted}`}>{label}</p>
                    <p className={`mt-2 inline-flex min-w-12 justify-center rounded-xl px-3 py-1 text-xl font-black ${tone}`}>{value}</p>
                  </div>
                ))}
              </section>

              <div className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 text-sm ${preview.summary.conflict ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                {preview.summary.conflict ? <AlertTriangle size={19} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={19} className="mt-0.5 shrink-0" />}
                <div>
                  <p className="font-black">{preview.summary.conflict ? "ยัง Import ไม่ได้จนกว่าจะแก้รายการขัดแย้ง" : "ข้อมูลพร้อม Import แบบปลอดภัย"}</p>
                  <p className="mt-1 text-xs">การเปลี่ยนรหัสจะอัปเดตรายการเดิมด้วย UUID เดิม รูปและประวัติจึงไม่ถูกลบ และถ้าพบข้อผิดพลาดฐานข้อมูลจะย้อนกลับทั้งชุด</p>
                </div>
              </div>

              <section className={`mt-4 overflow-hidden rounded-2xl border ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                <div className="max-h-[410px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className={isDark ? "sticky top-0 bg-slate-800 text-slate-300" : "sticky top-0 bg-slate-100 text-slate-600"}>
                      <tr>
                        <th className="px-4 py-3 font-black">ผลตรวจ</th>
                        <th className="px-4 py-3 font-black">Asset Code เดิม</th>
                        <th className="px-4 py-3 font-black">Asset Code จาก Excel</th>
                        <th className="px-4 py-3 font-black">อุปกรณ์</th>
                        <th className="px-4 py-3 font-black">Serial / สถานที่</th>
                        <th className="px-4 py-3 font-black">แหล่งข้อมูล</th>
                      </tr>
                    </thead>
                    <tbody className={isDark ? "divide-y divide-slate-800" : "divide-y divide-slate-100"}>
                      {preview.rows.map((row) => (
                        <tr key={`${row.source_file}-${row.source_row}`} className={row.import_action === "conflict" ? (isDark ? "bg-rose-950/20" : "bg-rose-50/60") : ""}>
                          <td className="px-4 py-3 align-top"><ActionChip action={row.import_action} />{row.import_error ? <p className="mt-1 max-w-48 text-xs font-semibold text-rose-600">{row.import_error}</p> : null}</td>
                          <td className={`px-4 py-3 align-top font-bold ${muted}`}>{row.previous_asset_tag || row.source_asset_tag || "-"}</td>
                          <td className="px-4 py-3 align-top"><div className="flex items-center gap-2 font-black"><ArrowRight size={14} className="text-slate-400" />{row.asset_tag || "-"}</div></td>
                          <td className="px-4 py-3 align-top"><p className="font-bold">{row.asset_name || "-"}</p><p className={`mt-1 text-xs ${muted}`}>{row.asset_category} • {row.brand || "-"} {row.model || ""}</p></td>
                          <td className="px-4 py-3 align-top"><p className="font-semibold">S/N {row.serial_number || "-"}</p><p className={`mt-1 text-xs ${muted}`}>{row.location || "ไม่ระบุสถานที่"}</p></td>
                          <td className={`px-4 py-3 align-top text-xs ${muted}`}>{row.source_file}<br />แถว {row.source_row}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className={`mt-8 rounded-2xl border border-dashed py-16 text-center ${soft} ${muted}`}>
              <FileSpreadsheet size={36} className="mx-auto opacity-50" />
              <p className="mt-3 font-black">เลือกไฟล์ Import PC, Notebook และ Monitor</p>
              <p className="mt-1 text-xs">ระบบจะแสดงรายการเปลี่ยนรหัส อัปเดต เพิ่มใหม่ และข้อมูลที่ขัดแย้งก่อนบันทึกจริง</p>
            </div>
          )}
        </div>

        <footer className={`flex flex-col-reverse gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${isDark ? "border-slate-700" : "border-slate-200"}`}>
          <p className={`text-xs ${muted}`}>{preview?.fileNames?.length ? `เลือกแล้ว ${preview.fileNames.length} ไฟล์: ${preview.fileNames.join(", ")}` : "ยังไม่ได้เลือกไฟล์"}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPreview(null)} disabled={!preview || importing} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-40 ${soft}`}><RefreshCw size={16} />เลือกใหม่</button>
            <button type="button" onClick={handleImport} disabled={!preview || preview.summary.conflict > 0 || importing} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">{importing ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}{importing ? "กำลัง Import..." : "ยืนยัน Import"}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

