import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Eye,
  History,
  Image as ImageIcon,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";
import {
  isAssetMoveSchemaError,
  loadAssetMoves,
  normalizeAssetMoveImages,
  normalizeAssetMoveText,
} from "../../../../services/assetMoveService";

const MOVE_TYPE_LABELS = {
  move: "ย้าย",
  swap_user: "สลับผู้ใช้",
  return: "รับคืน",
  send_repair: "ส่งซ่อม",
  retire: "ปลดระวาง",
};

const DEVICE_TYPE_LABELS = {
  pc: "PC",
  notebook: "Notebook",
  monitor: "Monitor",
  printer: "Printer",
  other: "อื่น ๆ",
};

function buildFilters() {
  return { query: "", source: "ALL", status: "ALL", start: "", end: "" };
}

function formatDateTime(value) {
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
}

function getDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function describeLocation(record, prefix) {
  return [
    record?.[`${prefix}_factory`],
    record?.[`${prefix}_building`],
    record?.[`${prefix}_floor`],
    record?.[`${prefix}_department`],
    record?.[`${prefix}_desk`],
  ].map(normalizeAssetMoveText).filter(Boolean).join(" / ") || "-";
}

function getStatusGroup(source, status) {
  if (source === "movement") return status === "cancelled" ? "cancelled" : "open";
  if (status === "completed") return "completed";
  return "open";
}

function getStatusTone(statusGroup, isDark) {
  if (statusGroup === "cancelled") {
    return isDark
      ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
      : "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (statusGroup === "completed") {
    return isDark
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return isDark
    ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function getSourceTone(source, isDark) {
  if (source === "movement") {
    return isDark
      ? "border-violet-400/20 bg-violet-400/10 text-violet-200"
      : "border-violet-200 bg-violet-50 text-violet-700";
  }
  return isDark
    ? "border-blue-400/20 bg-blue-400/10 text-blue-200"
    : "border-blue-200 bg-blue-50 text-blue-700";
}

function buildGeneralHistoryItem(record) {
  const raw = record.raw || {};
  const date = record.startValue || raw.created_at;
  const statusGroup = getStatusGroup("general", raw.work_status);
  return {
    id: `general-${record.id}`,
    source: "general",
    sourceLabel: "งานทั่วไป",
    reference: record.referenceCode || `WORK-${record.id}`,
    title: record.title || "บันทึกงาน IT",
    category: record.typeLabel || "งานทั่วไป",
    date,
    requester: record.requesterName || "-",
    employeeCode: record.requesterEmployeeCode || "",
    operator: record.userName || "-",
    statusGroup,
    statusLabel: record.statusLabel || raw.work_status || "-",
    location: record.location || "-",
    device: record.deviceDetails || "-",
    imageCount: record.images?.length || 0,
    evidenceGroups: [{ title: "ภาพประกอบ", images: record.images || [] }],
    description: record.description || "",
    result: record.resultSummary || "",
    department: record.department || "",
    raw,
    searchable: [
      record.referenceCode,
      record.title,
      record.typeLabel,
      record.description,
      record.resultSummary,
      record.deviceDetails,
      record.location,
      record.department,
      record.requesterName,
      record.requesterEmployeeCode,
      record.userName,
    ].join(" "),
  };
}

function buildMovementHistoryItem(record) {
  const beforeImages = normalizeAssetMoveImages(record.before_images);
  const afterImages = normalizeAssetMoveImages(record.after_images);
  const deviceType = record.device_type === "other"
    ? record.custom_device_type || DEVICE_TYPE_LABELS.other
    : DEVICE_TYPE_LABELS[record.device_type] || record.device_type;
  const oldLocation = describeLocation(record, "old");
  const newLocation = describeLocation(record, "new");
  const statusGroup = getStatusGroup("movement", record.status);
  return {
    id: `movement-${record.id}`,
    source: "movement",
    sourceLabel: "เคลื่อนย้ายอุปกรณ์",
    reference: record.move_id,
    title: `${record.asset_code} · ${deviceType}`,
    category: MOVE_TYPE_LABELS[record.move_type] || record.move_type,
    date: record.performed_at || record.created_at,
    requester: record.requester_name || record.ticket_reference || "-",
    employeeCode: record.requester_employee_code || "",
    operator: record.operator_name || "-",
    statusGroup,
    statusLabel: record.status === "cancelled" ? "ยกเลิก" : "ใช้งาน",
    location: `${oldLocation} → ${newLocation}`,
    device: `${record.asset_code}${record.serial_number ? ` · S/N ${record.serial_number}` : ""}`,
    imageCount: beforeImages.length + afterImages.length,
    evidenceGroups: [
      { title: "รูปก่อนย้าย", images: beforeImages },
      { title: "รูปหลังย้าย", images: afterImages },
    ],
    description: record.notes || "",
    result: record.condition_status === "damaged"
      ? `ชำรุด: ${record.condition_details || "-"}`
      : "สภาพปกติ",
    department: record.new_department || record.old_department || "",
    oldLocation,
    newLocation,
    raw: record,
    searchable: [
      record.move_id,
      record.asset_code,
      record.serial_number,
      record.brand_model,
      record.requester_name,
      record.requester_employee_code,
      record.ticket_reference,
      record.operator_name,
      record.old_user_name,
      record.new_user_name,
      oldLocation,
      newLocation,
      deviceType,
      MOVE_TYPE_LABELS[record.move_type],
      record.notes,
    ].join(" "),
  };
}

export default function UnifiedWorkHistory({
  theme,
  uiTheme,
  generalRecords = [],
  generalLoading = false,
  generalLoadError = "",
}) {
  const [movementRecords, setMovementRecords] = useState([]);
  const [movementLoading, setMovementLoading] = useState(true);
  const [movementLoadError, setMovementLoadError] = useState("");
  const [filters, setFilters] = useState(buildFilters);
  const [detailItem, setDetailItem] = useState(null);
  const deferredQuery = useDeferredValue(filters.query);
  const isDark = theme === "dark";
  const cardClass = `${uiTheme.surfaceCard} rounded-2xl border sm:rounded-3xl`;
  const inputClass = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none sm:rounded-2xl ${isDark ? "[color-scheme:dark]" : "[color-scheme:light]"} ${uiTheme.searchInputMobile}`;
  const softSurface = isDark ? "border-slate-700 bg-[#162136]" : "border-slate-200 bg-slate-50";
  const sectionBorder = isDark ? "border-slate-700" : "border-slate-200";
  const subtleBadge = isDark
    ? "border-slate-600 bg-slate-800 text-slate-300"
    : "border-slate-200 bg-slate-100 text-slate-600";
  const detailButton = isDark
    ? "border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-700"
    : "border-slate-300 bg-white text-slate-700 hover:border-[#2b59b0]/35 hover:bg-slate-50 hover:text-[#2b59b0]";
  const closeButton = isDark
    ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800";

  const loadMovements = async ({ silent = false } = {}) => {
    if (!silent) setMovementLoading(true);
    const { data, error } = await loadAssetMoves();
    if (error) {
      setMovementRecords([]);
      setMovementLoadError(
        isAssetMoveSchemaError(error)
          ? "ยังไม่พบฐานข้อมูลการเคลื่อนย้าย กรุณารัน SQL migration ก่อนใช้งาน"
          : "ไม่สามารถโหลดประวัติการเคลื่อนย้ายได้",
      );
    } else {
      setMovementRecords(Array.isArray(data) ? data : []);
      setMovementLoadError("");
    }
    if (!silent) setMovementLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    void loadMovements();
    const channel = supabase
      .channel("unified_it_work_history_moves")
      .on("postgres_changes", { event: "*", schema: "public", table: "it_asset_moves" }, () => {
        if (mounted) void loadMovements({ silent: true });
      })
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!detailItem) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detailItem]);

  const allItems = useMemo(() => [
    ...generalRecords.map(buildGeneralHistoryItem),
    ...movementRecords.map(buildMovementHistoryItem),
  ].sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime()), [generalRecords, movementRecords]);

  const filteredItems = useMemo(() => {
    const query = normalizeAssetMoveText(deferredQuery).toLowerCase();
    return allItems.filter((item) => {
      const dateKey = getDateKey(item.date);
      const haystack = `${item.searchable} ${item.reference} ${item.statusLabel}`.toLowerCase();
      return (
        (filters.source === "ALL" || item.source === filters.source)
        && (filters.status === "ALL" || item.statusGroup === filters.status)
        && (!filters.start || dateKey >= filters.start)
        && (!filters.end || dateKey <= filters.end)
        && (!query || haystack.includes(query))
      );
    });
  }, [allItems, deferredQuery, filters.end, filters.source, filters.start, filters.status]);

  const counts = useMemo(() => ({
    total: allItems.length,
    general: allItems.filter((item) => item.source === "general").length,
    movement: allItems.filter((item) => item.source === "movement").length,
  }), [allItems]);

  const loading = generalLoading || movementLoading;
  const activeFilterCount = [
    filters.query,
    filters.source !== "ALL",
    filters.status !== "ALL",
    filters.start,
    filters.end,
  ].filter(Boolean).length;

  return (
    <section className="space-y-4">
      <div className={`${cardClass} overflow-hidden`}>
        <div className={`border-b p-5 sm:p-6 ${sectionBorder}`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${subtleBadge}`}>
                <History size={14} /> Unified history
              </div>
              <h2 className={`mt-2 text-xl font-black sm:text-2xl ${uiTheme.textPrimary}`}>ประวัติรวมทุกงาน IT</h2>
              <p className={`mt-1 text-sm ${uiTheme.textSecondary}`}>ค้นหางานทั่วไปและการเคลื่อนย้ายจากช่องเดียว พร้อมกรองประเภท สถานะ และช่วงวันที่</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["ทั้งหมด", counts.total, isDark ? "text-slate-100" : "text-slate-700"],
                ["งานทั่วไป", counts.general, isDark ? "text-blue-200" : "text-[#2b59b0]"],
                ["เคลื่อนย้าย", counts.movement, isDark ? "text-violet-200" : "text-violet-700"],
              ].map(([label, value, tone]) => (
                <div key={label} className={`min-w-20 rounded-2xl border px-3 py-2 text-center ${softSurface}`}>
                  <p className={`text-lg font-black ${tone}`}>{value}</p>
                  <p className={`text-[10px] font-bold ${uiTheme.textSecondary}`}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(280px,1fr)_190px_170px_150px_150px_auto]">
            <label className={`relative flex items-center rounded-xl border sm:rounded-2xl ${uiTheme.searchInputMobile}`}>
              <Search size={16} className="absolute left-3 text-slate-400" />
              <input
                value={filters.query}
                onChange={(event) => setFilters((previous) => ({ ...previous, query: event.target.value }))}
                className="w-full bg-transparent py-2.5 pl-10 pr-3 text-sm outline-none"
                placeholder="ค้นหาเลขอ้างอิง, Move ID, Asset, Serial, ชื่อพนักงาน..."
              />
            </label>
            <select value={filters.source} onChange={(event) => setFilters((previous) => ({ ...previous, source: event.target.value }))} className={inputClass}>
              <option value="ALL">ทุกประเภทบันทึก</option>
              <option value="general">งานทั่วไป</option>
              <option value="movement">เคลื่อนย้ายอุปกรณ์</option>
            </select>
            <select value={filters.status} onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))} className={inputClass}>
              <option value="ALL">ทุกสถานะ</option>
              <option value="open">กำลังดำเนินการ/ใช้งาน</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
            <input type="date" value={filters.start} onChange={(event) => setFilters((previous) => ({ ...previous, start: event.target.value }))} className={inputClass} aria-label="วันที่เริ่มต้น" />
            <input type="date" value={filters.end} onChange={(event) => setFilters((previous) => ({ ...previous, end: event.target.value }))} className={inputClass} aria-label="วันที่สิ้นสุด" />
            <button type="button" onClick={() => setFilters(buildFilters())} disabled={!activeFilterCount} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${uiTheme.clearFilterButton}`}>
              <RefreshCw size={15} /> ล้าง
            </button>
          </div>
        </div>

        {generalLoadError || movementLoadError ? (
          <div className={`border-b px-5 py-3 text-sm font-semibold ${isDark ? "border-amber-500/20 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {[generalLoadError, movementLoadError].filter(Boolean).join(" · ")}
          </div>
        ) : null}

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="mx-auto animate-spin text-[#2b59b0]" />
            <p className={`mt-3 text-sm ${uiTheme.textSecondary}`}>กำลังรวมประวัติ...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <History size={32} className="mx-auto text-slate-400" />
            <p className={`mt-3 font-bold ${uiTheme.textPrimary}`}>{allItems.length ? "ไม่พบรายการที่ตรงกับตัวกรอง" : "ยังไม่มีประวัติงาน"}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className={uiTheme.table.thead}>
                  <tr>
                    <th className="px-5 py-3">ประเภท / เลขอ้างอิง</th>
                    <th className="px-5 py-3">รายการ</th>
                    <th className="px-5 py-3">ผู้แจ้ง</th>
                    <th className="px-5 py-3">ผู้ดำเนินการ</th>
                    <th className="px-5 py-3">วันที่</th>
                    <th className="px-5 py-3">สถานะ</th>
                    <th className="px-5 py-3 text-right">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className={`border-t transition-colors ${sectionBorder} ${uiTheme.table.row} ${item.statusGroup === "cancelled" ? "opacity-70" : ""}`}>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${getSourceTone(item.source, isDark)}`}>
                          {item.source === "general" ? <Wrench size={12} /> : <Truck size={12} />}{item.sourceLabel}
                        </span>
                        <p className={`mt-2 font-black ${uiTheme.textPrimary}`}>{item.reference}</p>
                      </td>
                      <td className="max-w-xs px-5 py-4"><p className={`truncate font-bold ${uiTheme.textPrimary}`}>{item.title}</p><p className={`mt-1 truncate text-xs ${uiTheme.textSecondary}`}>{item.category} · {item.device}</p></td>
                      <td className={`px-5 py-4 ${uiTheme.textSecondary}`}>{item.requester}{item.employeeCode ? <span className="block text-xs">{item.employeeCode}</span> : null}</td>
                      <td className={`px-5 py-4 ${uiTheme.textSecondary}`}>{item.operator}</td>
                      <td className={`whitespace-nowrap px-5 py-4 text-xs ${uiTheme.textSecondary}`}>{formatDateTime(item.date)}</td>
                      <td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusTone(item.statusGroup, isDark)}`}>{item.statusLabel}</span></td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={() => setDetailItem(item)} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${detailButton}`}><Eye size={14} />ดู</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden">
              {filteredItems.map((item) => (
                <button key={item.id} type="button" onClick={() => setDetailItem(item)} className={`block w-full border-t p-4 text-left transition-colors ${sectionBorder} ${uiTheme.table.row}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className={`text-xs font-bold ${item.source === "general" ? isDark ? "text-blue-200" : "text-blue-600" : isDark ? "text-violet-200" : "text-violet-600"}`}>{item.sourceLabel} · {item.reference}</p><p className={`mt-1 truncate font-black ${uiTheme.textPrimary}`}>{item.title}</p></div>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${getStatusTone(item.statusGroup, isDark)}`}>{item.statusLabel}</span>
                  </div>
                  <p className={`mt-2 text-xs ${uiTheme.textSecondary}`}>{item.requester} · {formatDateTime(item.date)}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {detailItem ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setDetailItem(null)} />
          <div className={`relative max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl border p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${isDark ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-4">
              <div><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${getSourceTone(detailItem.source, isDark)}`}>{detailItem.source === "general" ? <Wrench size={13} /> : <Truck size={13} />}{detailItem.sourceLabel}</span><h3 className={`mt-3 text-xl font-black ${uiTheme.textPrimary}`}>{detailItem.reference}</h3><p className={`mt-1 text-sm ${uiTheme.textSecondary}`}>{detailItem.title} · {formatDateTime(detailItem.date)}</p></div>
              <button type="button" onClick={() => setDetailItem(null)} className={`rounded-xl p-2 transition ${closeButton}`} aria-label="ปิดรายละเอียด"><X size={20} /></button>
            </div>

            {detailItem.source === "movement" && detailItem.raw.status === "cancelled" ? (
              <div className={`mt-4 rounded-2xl border p-4 text-sm ${isDark ? "border-rose-500/20 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}><p className="font-black">รายการนี้ถูกยกเลิก</p><p className="mt-1">เหตุผล: {detailItem.raw.cancellation_reason || "-"}</p></div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [UserRound, "ผู้แจ้ง", `${detailItem.requester}${detailItem.employeeCode ? ` (${detailItem.employeeCode})` : ""}`],
                [Wrench, "ผู้ดำเนินการ", detailItem.operator],
                [CalendarDays, "ประเภทงาน", detailItem.category],
                [ImageIcon, "รูปหลักฐาน", `${detailItem.imageCount} รูป`],
              ].map(([Icon, label, value]) => (
                <div key={label} className={`rounded-2xl border p-4 ${softSurface}`}><Icon size={16} className={uiTheme.textMuted} /><p className={`mt-2 text-xs font-bold ${uiTheme.textMuted}`}>{label}</p><p className={`mt-1 text-sm font-bold ${uiTheme.textPrimary}`}>{value || "-"}</p></div>
              ))}
            </div>

            {detailItem.source === "movement" ? (
              <>
                <div className="mt-4 grid gap-4 xl:grid-cols-2"><div className={`rounded-2xl border p-4 ${softSurface}`}><p className={`font-black ${uiTheme.textPrimary}`}>ต้นทาง</p><p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>ผู้ใช้: {detailItem.raw.old_user_name || "-"}</p><p className={`mt-1 text-sm ${uiTheme.textSecondary}`}>{detailItem.oldLocation}</p></div><div className={`rounded-2xl border p-4 ${softSurface}`}><p className={`font-black ${uiTheme.textPrimary}`}>ปลายทาง</p><p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>ผู้ใช้: {detailItem.raw.new_user_name || "-"}</p><p className={`mt-1 text-sm ${uiTheme.textSecondary}`}>{detailItem.newLocation}</p></div></div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className={`rounded-2xl border p-4 ${softSurface}`}><p className={`font-black ${uiTheme.textPrimary}`}>ข้อมูลอุปกรณ์</p><p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>Asset Code: {detailItem.raw.asset_code || "-"}</p><p className={`mt-1 text-sm ${uiTheme.textSecondary}`}>Serial Number: {detailItem.raw.serial_number || "-"}</p><p className={`mt-1 text-sm ${uiTheme.textSecondary}`}>ยี่ห้อ/รุ่น: {detailItem.raw.brand_model || "-"}</p><p className={`mt-1 text-sm ${uiTheme.textSecondary}`}>Ticket: {detailItem.raw.ticket_reference || "-"}</p></div>
                  <div className={`rounded-2xl border p-4 ${softSurface}`}><p className={`font-black ${uiTheme.textPrimary}`}>สภาพและหมายเหตุ</p><p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>{detailItem.result}</p><p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>อุปกรณ์ร่วม: {[...(detailItem.raw.accessories || []), detailItem.raw.accessory_other].filter(Boolean).join(", ") || "ไม่มี"}</p><p className={`mt-2 whitespace-pre-wrap text-sm ${uiTheme.textSecondary}`}>{detailItem.description || "ไม่มีหมายเหตุ"}</p></div>
                </div>
              </>
            ) : (
              <div className="mt-4 grid gap-4 xl:grid-cols-2"><div className={`rounded-2xl border p-4 ${softSurface}`}><p className={`font-black ${uiTheme.textPrimary}`}>รายละเอียดงาน</p><p className={`mt-2 whitespace-pre-wrap text-sm ${uiTheme.textSecondary}`}>{detailItem.description || "-"}</p></div><div className={`rounded-2xl border p-4 ${softSurface}`}><p className={`font-black ${uiTheme.textPrimary}`}>อุปกรณ์ / ผลลัพธ์</p><p className={`mt-2 whitespace-pre-wrap text-sm ${uiTheme.textSecondary}`}>{detailItem.device || "-"}</p><p className={`mt-2 whitespace-pre-wrap text-sm ${uiTheme.textSecondary}`}>{detailItem.result || "-"}</p></div></div>
            )}

            {detailItem.location && detailItem.location !== "-" ? <div className={`mt-4 flex items-start gap-2 rounded-2xl border p-4 text-sm ${softSurface} ${uiTheme.textSecondary}`}><MapPin size={17} className="mt-0.5 shrink-0" />{detailItem.location}</div> : null}

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {detailItem.evidenceGroups.map((group) => (
                <div key={group.title}>
                  <p className={`text-sm font-black ${uiTheme.textPrimary}`}>{group.title}</p>
                  {group.images.length ? <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{group.images.map((image, index) => <button key={`${group.title}-${index}`} type="button" onClick={() => window.open(image.url, "_blank", "noopener,noreferrer")} className={`overflow-hidden rounded-xl border ${sectionBorder}`}><img src={image.url} alt={`${group.title} ${index + 1}`} className="h-32 w-full object-cover" /></button>)}</div> : <div className={`mt-2 rounded-xl border border-dashed p-4 text-sm ${softSurface} ${uiTheme.textSecondary}`}>ไม่มีรูปหลักฐาน</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
