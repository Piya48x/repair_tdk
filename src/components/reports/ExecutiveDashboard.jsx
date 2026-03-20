import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Computer,
  KeyRound,
  Laptop,
  Monitor,
  Printer,
  RefreshCw,
} from "lucide-react";

const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});
const DATE_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
});

const CORE_MENU_FALLBACK_KEYWORDS = {
  pc: ["pc", "desktop", "computer", "workstation", "all in one", "aoi", "คอม", "คอมพิวเตอร์", "เดสก์ท็อป", "เดสกทอป", "พีซี"],
  notebook: ["notebook", "laptop", "macbook", "โน้ตบุ๊ก", "โน๊ตบุ๊ก", "โน้ตบุ๊ค", "โน๊ตบุ๊ค", "แล็ปท็อป", "แลปทอป"],
  monitor: ["monitor", "display", "screen", "จอ", "จอมอนิเตอร์", "มอนิเตอร์", "moniter"],
  printer: ["printer", "print", "เครื่องพิมพ์", "พรินเตอร์", "ปริ้นเตอร์", "ปริ้น"],
};

const MENU_CARDS = [
  { key: "pc", label: "PC", subtitle: "เดสก์ท็อป", icon: Computer, accent: "from-sky-500 to-cyan-500", soft: "border-sky-200 bg-sky-50 text-sky-700" },
  { key: "notebook", label: "Notebook", subtitle: "โน้ตบุ๊ก", icon: Laptop, accent: "from-violet-500 to-fuchsia-500", soft: "border-violet-200 bg-violet-50 text-violet-700" },
  { key: "monitor", label: "Monitor", subtitle: "จอภาพ", icon: Monitor, accent: "from-emerald-500 to-teal-500", soft: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { key: "printer", label: "Printer", subtitle: "เครื่องพิมพ์", icon: Printer, accent: "from-amber-500 to-orange-500", soft: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "licenses", label: "Licenses", subtitle: "ไลเซนส์", icon: KeyRound, accent: "from-indigo-500 to-blue-500", soft: "border-indigo-200 bg-indigo-50 text-indigo-700" },
];

const ASSET_STATUS_LABELS = {
  in_use: "ใช้งานอยู่",
  assigned: "มอบหมายแล้ว",
  spare: "สำรอง",
  available: "พร้อมใช้งาน",
  broken: "เสีย",
  repair: "ซ่อม",
  retired: "ปลดระวาง",
  lost: "สูญหาย",
};

const LICENSE_STATUS_LABELS = {
  active: "ใช้งานอยู่",
  pending_renewal: "ใกล้ต่ออายุ",
  inactive: "ไม่ใช้งาน",
  expired: "หมดอายุ",
};

function normalizeText(value) {
  return String(value || "").trim();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_TIME_FORMATTER.format(date);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_FORMATTER.format(date);
}

function normalizeStatusKey(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "_");
}

function normalizeAssetStatusKey(value) {
  const normalized = normalizeStatusKey(value);
  if (!normalized) return "";

  if (
    [
      "broken",
      "damage",
      "damaged",
      "defect",
      "faulty",
      "เสีย",
      "เสียหาย",
      "พัง",
      "ชำรุด",
      "ใช้งานไม่ได้",
      "ใช้ไม่ได้",
    ].includes(normalized)
  ) {
    return "broken";
  }
  if (["repair", "maintenance", "fixing", "ซ่อม", "กำลังซ่อม", "ส่งซ่อม"].includes(normalized)) return "repair";
  if (["retired", "decommissioned", "disposed", "ปลดระวาง", "ตัดจำหน่าย", "จำหน่าย"].includes(normalized)) return "retired";
  if (["lost", "missing", "สูญหาย", "หาย"].includes(normalized)) return "lost";
  if (["assigned", "มอบหมาย", "มอบหมายแล้ว"].includes(normalized)) return "assigned";
  if (["spare", "สำรอง"].includes(normalized)) return "spare";
  if (["available", "stock", "ready", "ว่าง", "พร้อมใช้", "พร้อมใช้งาน"].includes(normalized)) return "available";
  if (["active", "inuse", "in_use", "ใช้งาน", "ใช้งานอยู่", "ใช้งานได้"].includes(normalized)) return "in_use";

  return normalized;
}

function formatAssetStatus(status) {
  const key = normalizeAssetStatusKey(status);
  return ASSET_STATUS_LABELS[key] || normalizeText(status) || "-";
}

function formatLicenseStatus(status) {
  const key = normalizeStatusKey(status);
  return LICENSE_STATUS_LABELS[key] || normalizeText(status) || "-";
}

function getAssetStatusChipClass(status) {
  const key = normalizeAssetStatusKey(status);
  if (["in_use", "assigned", "available", "spare"].includes(key)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (key === "repair") return "border-amber-200 bg-amber-50 text-amber-700";
  if (["broken", "retired", "lost"].includes(key)) return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getLicenseStatusChipClass(status) {
  const key = normalizeStatusKey(status);
  if (["active", "pending_renewal"].includes(key)) return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (["inactive", "expired"].includes(key)) return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function normalizeKeywordSource(value) {
  return String(value || "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function fallbackCountFromByCategory(list, key) {
  const keywords = CORE_MENU_FALLBACK_KEYWORDS[key] || [];
  return (Array.isArray(list) ? list : []).reduce((sum, item) => {
    const label = normalizeKeywordSource(item?.label);
    if (!label) return sum;
    if (keywords.some((keyword) => label.includes(keyword))) return sum + toNumber(item?.value);
    return sum;
  }, 0);
}

function resolveMetricValue(primaryValue, fallbackValue = 0) {
  const primary = Number(primaryValue);
  if (Number.isFinite(primary)) return primary;
  const fallback = Number(fallbackValue);
  return Number.isFinite(fallback) ? fallback : 0;
}

function normalizeStockEntry(value, totalFallback = 0) {
  const total = Math.max(resolveMetricValue(value?.total, totalFallback), 0);
  const usableBase = resolveMetricValue(value?.usable, total);
  const brokenBase = resolveMetricValue(value?.broken, Math.max(total - usableBase, 0));
  const usable = Math.max(Math.min(usableBase, total), 0);
  const broken = Math.max(Math.min(brokenBase, total), 0);
  return { total, usable, broken: Math.max(broken, Math.max(total - usable, 0)) };
}

function getSortTimestamp(item) {
  const candidate = item?.updated_at || item?.created_at || item?.purchase_date || item?.expiry_date;
  if (!candidate) return 0;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getTime();
}

function sortByLatest(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => getSortTimestamp(right) - getSortTimestamp(left));
}

function toggleSelection(prev, id, checked) {
  if (!id) return prev;
  if (checked) return prev.includes(id) ? prev : [...prev, id];
  return prev.filter((currentId) => currentId !== id);
}

function getAvailableSeats(item) {
  const total = Math.max(toNumber(item?.quantity_total), 0);
  const assigned = Math.min(Math.max(toNumber(item?.quantity_assigned), 0), total);
  return Math.max(total - assigned, 0);
}

function MainMetricCard({ label, subtitle, value, icon: Icon, accent, soft }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{NUMBER_FORMATTER.format(value)}</p>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${soft}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className={`mt-4 h-1.5 rounded-full bg-gradient-to-r ${accent}`} />
    </article>
  );
}

function StockRow({ label, stock }) {
  const total = Math.max(toNumber(stock?.total), 0);
  const usable = Math.max(toNumber(stock?.usable), 0);
  const broken = Math.max(toNumber(stock?.broken), 0);
  const availability = total > 0 ? Math.round((usable / total) * 100) : 0;
  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="px-3 py-3 font-semibold text-slate-800">{label}</td>
      <td className="px-3 py-3 text-right font-black text-slate-900">{NUMBER_FORMATTER.format(total)}</td>
      <td className="px-3 py-3 text-right font-semibold text-emerald-700">{NUMBER_FORMATTER.format(usable)}</td>
      <td className="px-3 py-3 text-right font-semibold text-rose-700">{NUMBER_FORMATTER.format(broken)}</td>
      <td className="px-3 py-3 text-right font-semibold text-slate-700">{availability}%</td>
    </tr>
  );
}

export default function ExecutiveDashboard({ data, onRefresh, loading }) {
  const generatedAt = formatDateTime(data?.generatedAt);
  const assetSummary = data?.assetSummary || {};
  const licenseSummary = data?.licenseSummary || {};
  const coreMenuSummary = data?.coreMenuSummary || {};
  const categoryFallbackSource = assetSummary.byCategory || [];
  const stockSource = coreMenuSummary?.stock || {};

  const assetRows = sortByLatest(data?.assetRows);
  const licenseRows = sortByLatest(data?.licenseRows);
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [selectedLicenseIds, setSelectedLicenseIds] = useState([]);

  useEffect(() => {
    const nextRows = Array.isArray(data?.assetRows) ? data.assetRows : [];
    const idSet = new Set(nextRows.map((row) => row.id).filter(Boolean));
    setSelectedAssetIds((prev) => prev.filter((id) => idSet.has(id)));
  }, [data?.assetRows]);

  useEffect(() => {
    const nextRows = Array.isArray(data?.licenseRows) ? data.licenseRows : [];
    const idSet = new Set(nextRows.map((row) => row.id).filter(Boolean));
    setSelectedLicenseIds((prev) => prev.filter((id) => idSet.has(id)));
  }, [data?.licenseRows]);

  const menuCount = {
    pc: resolveMetricValue(coreMenuSummary.pc, fallbackCountFromByCategory(categoryFallbackSource, "pc")),
    notebook: resolveMetricValue(coreMenuSummary.notebook, fallbackCountFromByCategory(categoryFallbackSource, "notebook")),
    monitor: resolveMetricValue(coreMenuSummary.monitor, fallbackCountFromByCategory(categoryFallbackSource, "monitor")),
    printer: resolveMetricValue(coreMenuSummary.printer, fallbackCountFromByCategory(categoryFallbackSource, "printer")),
    licenses: resolveMetricValue(coreMenuSummary.licenses, licenseSummary.totalSeats || licenseSummary.totalLicenses),
  };

  const stockByCategory = {
    pc: normalizeStockEntry(stockSource.pc, menuCount.pc),
    notebook: normalizeStockEntry(stockSource.notebook, menuCount.notebook),
    monitor: normalizeStockEntry(stockSource.monitor, menuCount.monitor),
    printer: normalizeStockEntry(stockSource.printer, menuCount.printer),
    licenses: normalizeStockEntry(stockSource.licenses, menuCount.licenses),
  };

  const overview = normalizeStockEntry(
    stockSource.all,
    stockByCategory.pc.total + stockByCategory.notebook.total + stockByCategory.monitor.total + stockByCategory.printer.total + stockByCategory.licenses.total,
  );
  const availabilityRate = overview.total > 0 ? Math.round((overview.usable / overview.total) * 100) : 0;
  const brokenRate = overview.total > 0 ? Math.round((overview.broken / overview.total) * 100) : 0;

  const selectedAssetIdSet = new Set(selectedAssetIds);
  const selectedLicenseIdSet = new Set(selectedLicenseIds);
  const selectedAssets = assetRows.filter((row) => selectedAssetIdSet.has(row.id));
  const selectedLicenses = licenseRows.filter((row) => selectedLicenseIdSet.has(row.id));
  const allAssetsSelected = assetRows.length > 0 && selectedAssetIds.length === assetRows.length;
  const allLicensesSelected = licenseRows.length > 0 && selectedLicenseIds.length === licenseRows.length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="absolute -left-14 -top-14 h-40 w-40 rounded-full bg-sky-100 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-40 w-40 rounded-full bg-indigo-100 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">Executive IT Stock Snapshot</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">PC | Notebook | Monitor | Printer | Licenses</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">stock แบบเรียลไทม์: ทั้งหมดเท่าไร ใช้งานได้เท่าไร และเสีย/ใช้ไม่ได้เท่าไร</p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              รีเฟรช
            </button>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">อัปเดตล่าสุด: {generatedAt}</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {MENU_CARDS.map((item) => (
          <MainMetricCard key={item.key} label={item.label} subtitle={item.subtitle} value={menuCount[item.key]} icon={item.icon} accent={item.accent} soft={item.soft} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Activity size={16} className="text-indigo-600" />จำนวน Stock รวม</div>
          <p className="mt-2 text-4xl font-black text-slate-900">{NUMBER_FORMATTER.format(overview.total)}</p>
          <p className="mt-1 text-sm text-slate-500">รวมทั้งหมดทุกหมวดในโรงงาน</p>
        </article>
        <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-[0_8px_22px_rgba(16,185,129,0.12)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 size={16} />ใช้งานได้</div>
          <p className="mt-2 text-4xl font-black text-emerald-900">{NUMBER_FORMATTER.format(overview.usable)}</p>
          <p className="mt-1 text-sm text-emerald-700">พร้อมใช้งาน {availabilityRate}%</p>
        </article>
        <article className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-[0_8px_22px_rgba(244,63,94,0.12)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-800"><AlertTriangle size={16} />เสีย / ใช้ไม่ได้</div>
          <p className="mt-2 text-4xl font-black text-rose-900">{NUMBER_FORMATTER.format(overview.broken)}</p>
          <p className="mt-1 text-sm text-rose-700">คิดเป็น {brokenRate}% ของ stock ทั้งหมด</p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
        <h2 className="text-lg font-black text-slate-900">IT Stock Matrix (Real-time)</h2>
        <p className="mt-1 text-sm text-slate-500">ตารางนี้อัปเดตจากข้อมูลที่ IT บันทึกในหน้า assets-management</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
                <th className="px-3 py-2">หมวดหมู่</th>
                <th className="px-3 py-2 text-right">ทั้งหมด</th>
                <th className="px-3 py-2 text-right">ใช้งานได้</th>
                <th className="px-3 py-2 text-right">เสีย</th>
                <th className="px-3 py-2 text-right">ความพร้อมใช้งาน</th>
              </tr>
            </thead>
            <tbody>
              <StockRow label="PC" stock={stockByCategory.pc} />
              <StockRow label="Notebook" stock={stockByCategory.notebook} />
              <StockRow label="Monitor" stock={stockByCategory.monitor} />
              <StockRow label="Printer" stock={stockByCategory.printer} />
              <StockRow label="Licenses" stock={stockByCategory.licenses} />
              <StockRow label="รวมทุกหมวด" stock={overview} />
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">รายการอุปกรณ์ที่อัปเดตล่าสุด</h2>
              <p className="mt-1 text-xs text-slate-500">ติ๊ก checkbox เพื่อแสดงรายละเอียดทันที (ดูอย่างเดียว)</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAssetIds([])}
              disabled={selectedAssetIds.length === 0}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ล้างที่เลือก
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200">
            <div className="max-h-[430px] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-400">
                    <th className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allAssetsSelected}
                        onChange={(event) => setSelectedAssetIds(event.target.checked ? assetRows.map((row) => row.id).filter(Boolean) : [])}
                        className="h-4 w-4 rounded border-slate-300"
                        aria-label="เลือกอุปกรณ์ทั้งหมด"
                      />
                    </th>
                    <th className="px-3 py-2">รหัส</th>
                    <th className="px-3 py-2">อุปกรณ์</th>
                    <th className="px-3 py-2">สถานะ</th>
                    <th className="px-3 py-2">อัปเดต</th>
                  </tr>
                </thead>
                <tbody>
                  {assetRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                        ยังไม่มีข้อมูลอุปกรณ์
                      </td>
                    </tr>
                  ) : (
                    assetRows.map((item) => {
                      const checked = selectedAssetIdSet.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedAssetIds((prev) => toggleSelection(prev, item.id, !checked))}
                          className={`cursor-pointer border-b border-slate-100 align-top transition ${
                            checked ? "bg-sky-50/80" : "hover:bg-slate-50/70"
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => setSelectedAssetIds((prev) => toggleSelection(prev, item.id, event.target.checked))}
                              className="h-4 w-4 rounded border-slate-300"
                              aria-label={`เลือกอุปกรณ์ ${item.asset_tag || item.asset_name || ""}`}
                            />
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{normalizeText(item.asset_tag) || "-"}</td>
                          <td className="px-3 py-2.5 text-slate-700">
                            <div>{normalizeText(item.asset_name) || "-"}</div>
                            <div className="text-xs text-slate-500">{normalizeText(item.asset_category) || "-"}</div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getAssetStatusChipClass(
                                item.status,
                              )}`}
                            >
                              {formatAssetStatus(item.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{formatDateTime(item.updated_at || item.created_at)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
          <h2 className="text-lg font-black text-slate-900">
            รายละเอียดอุปกรณ์ที่เลือก ({NUMBER_FORMATTER.format(selectedAssets.length)})
          </h2>
          <p className="mt-1 text-xs text-slate-500">ดูได้อย่างเดียว ไม่มีปุ่มแก้ไข</p>

          {selectedAssets.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              ติ๊กจากรายการทางซ้ายเพื่อดูรายละเอียดทั้งหมด
            </div>
          ) : (
            <div className="mt-4 max-h-[430px] space-y-3 overflow-auto pr-1">
              {selectedAssets.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-black text-slate-900">{normalizeText(item.asset_name) || "-"}</h3>
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getAssetStatusChipClass(
                        item.status,
                      )}`}
                    >
                      {formatAssetStatus(item.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <p><span className="font-semibold text-slate-500">รหัสทรัพย์สิน:</span> {normalizeText(item.asset_tag) || "-"}</p>
                    <p><span className="font-semibold text-slate-500">หมวดหมู่:</span> {normalizeText(item.asset_category) || "-"}</p>
                    <p><span className="font-semibold text-slate-500">ยี่ห้อ:</span> {normalizeText(item.brand) || "-"}</p>
                    <p><span className="font-semibold text-slate-500">รุ่น:</span> {normalizeText(item.model) || "-"}</p>
                    <p><span className="font-semibold text-slate-500">เลขซีเรียล:</span> {normalizeText(item.serial_number) || "-"}</p>
                    <p><span className="font-semibold text-slate-500">ผู้ใช้งาน:</span> {normalizeText(item.owner_name) || "-"}</p>
                    <p><span className="font-semibold text-slate-500">ตำแหน่งที่ตั้ง:</span> {normalizeText(item.location) || "-"}</p>
                    <p><span className="font-semibold text-slate-500">วันที่ซื้อ:</span> {formatDate(item.purchase_date)}</p>
                    <p><span className="font-semibold text-slate-500">วันหมดประกัน:</span> {formatDate(item.warranty_end_date)}</p>
                    <p><span className="font-semibold text-slate-500">อัปเดตล่าสุด:</span> {formatDateTime(item.updated_at || item.created_at)}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-semibold text-slate-500">หมายเหตุ:</span> {normalizeText(item.notes) || "-"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">รายการไลเซนส์ที่อัปเดตล่าสุด</h2>
              <p className="mt-1 text-xs text-slate-500">ติ๊ก checkbox เพื่อแสดงรายละเอียดทันที (ดูอย่างเดียว)</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLicenseIds([])}
              disabled={selectedLicenseIds.length === 0}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ล้างที่เลือก
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200">
            <div className="max-h-[430px] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-400">
                    <th className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allLicensesSelected}
                        onChange={(event) => setSelectedLicenseIds(event.target.checked ? licenseRows.map((row) => row.id).filter(Boolean) : [])}
                        className="h-4 w-4 rounded border-slate-300"
                        aria-label="เลือกไลเซนส์ทั้งหมด"
                      />
                    </th>
                    <th className="px-3 py-2">ไลเซนส์</th>
                    <th className="px-3 py-2">สถานะ</th>
                    <th className="px-3 py-2 text-right">ทั้งหมด</th>
                    <th className="px-3 py-2 text-right">ใช้งาน</th>
                    <th className="px-3 py-2 text-right">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody>
                  {licenseRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                        ยังไม่มีข้อมูลไลเซนส์
                      </td>
                    </tr>
                  ) : (
                    licenseRows.map((item) => {
                      const checked = selectedLicenseIdSet.has(item.id);
                      const totalSeats = Math.max(toNumber(item.quantity_total), 0);
                      const assignedSeats = Math.min(Math.max(toNumber(item.quantity_assigned), 0), totalSeats);
                      const availableSeats = Math.max(totalSeats - assignedSeats, 0);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedLicenseIds((prev) => toggleSelection(prev, item.id, !checked))}
                          className={`cursor-pointer border-b border-slate-100 align-top transition ${
                            checked ? "bg-indigo-50/80" : "hover:bg-slate-50/70"
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => setSelectedLicenseIds((prev) => toggleSelection(prev, item.id, event.target.checked))}
                              className="h-4 w-4 rounded border-slate-300"
                              aria-label={`เลือกไลเซนส์ ${item.license_name || ""}`}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            <div className="font-semibold text-slate-800">{normalizeText(item.license_name) || "-"}</div>
                            <div className="text-xs text-slate-500">{normalizeText(item.vendor) || "-"}</div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getLicenseStatusChipClass(
                                item.status,
                              )}`}
                            >
                              {formatLicenseStatus(item.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{NUMBER_FORMATTER.format(totalSeats)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700">{NUMBER_FORMATTER.format(assignedSeats)}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-700">{NUMBER_FORMATTER.format(availableSeats)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
          <h2 className="text-lg font-black text-slate-900">
            รายละเอียดไลเซนส์ที่เลือก ({NUMBER_FORMATTER.format(selectedLicenses.length)})
          </h2>
          <p className="mt-1 text-xs text-slate-500">ดูได้อย่างเดียว ไม่มีปุ่มแก้ไข</p>

          {selectedLicenses.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              ติ๊กจากรายการทางซ้ายเพื่อดูรายละเอียดทั้งหมด
            </div>
          ) : (
            <div className="mt-4 max-h-[430px] space-y-3 overflow-auto pr-1">
              {selectedLicenses.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-black text-slate-900">{normalizeText(item.license_name) || "-"}</h3>
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getLicenseStatusChipClass(
                        item.status,
                      )}`}
                    >
                      {formatLicenseStatus(item.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <p><span className="font-semibold text-slate-500">ผู้ให้บริการ:</span> {normalizeText(item.vendor) || "-"}</p>
                    <p><span className="font-semibold text-slate-500">ประเภทไลเซนส์:</span> {normalizeText(item.license_type) || "-"}</p>
                    <p><span className="font-semibold text-slate-500">ทั้งหมด:</span> {NUMBER_FORMATTER.format(Math.max(toNumber(item.quantity_total), 0))}</p>
                    <p><span className="font-semibold text-slate-500">ใช้งานแล้ว:</span> {NUMBER_FORMATTER.format(Math.min(Math.max(toNumber(item.quantity_assigned), 0), Math.max(toNumber(item.quantity_total), 0)))}</p>
                    <p><span className="font-semibold text-slate-500">คงเหลือ:</span> {NUMBER_FORMATTER.format(getAvailableSeats(item))}</p>
                    <p><span className="font-semibold text-slate-500">วันหมดอายุ:</span> {formatDate(item.expiry_date)}</p>
                    <p><span className="font-semibold text-slate-500">วันต่ออายุ:</span> {formatDate(item.renewal_date)}</p>
                    <p><span className="font-semibold text-slate-500">อัปเดตล่าสุด:</span> {formatDateTime(item.updated_at || item.created_at)}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-semibold text-slate-500">หมายเหตุ:</span> {normalizeText(item.notes) || "-"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
