import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Computer,
  KeyRound,
  Laptop,
  Monitor,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const DETAIL_FILTER_LABELS = {
  all: "ทั้งหมด",
  pc: "PC",
  notebook: "Notebook",
  monitor: "Monitor",
  printer: "Printer",
  licenses: "Licenses",
  overview_total: "จำนวน Stock รวม",
  overview_usable: "ใช้งานได้",
  overview_broken: "เสีย / ใช้ไม่ได้",
};

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

const EXECUTIVE_MENU_CARDS = [
  { key: "pc", label: "PC", subtitle: "Desktop Fleet", icon: Computer, accent: "from-sky-500 to-cyan-500", soft: "border-sky-200 bg-sky-50 text-sky-700", chart: "#0ea5e9" },
  { key: "notebook", label: "Notebook", subtitle: "Portable Fleet", icon: Laptop, accent: "from-violet-500 to-fuchsia-500", soft: "border-violet-200 bg-violet-50 text-violet-700", chart: "#8b5cf6" },
  { key: "monitor", label: "Monitor", subtitle: "Display Estate", icon: Monitor, accent: "from-emerald-500 to-teal-500", soft: "border-emerald-200 bg-emerald-50 text-emerald-700", chart: "#10b981" },
  { key: "printer", label: "Printer", subtitle: "Print Capacity", icon: Printer, accent: "from-amber-500 to-orange-500", soft: "border-amber-200 bg-amber-50 text-amber-700", chart: "#f59e0b" },
  { key: "licenses", label: "Licenses", subtitle: "Software Entitlement", icon: KeyRound, accent: "from-indigo-500 to-blue-500", soft: "border-indigo-200 bg-indigo-50 text-indigo-700", chart: "#2563eb" },
];

const EXECUTIVE_DETAIL_FILTER_LABELS = {
  all: "All",
  pc: "PC",
  notebook: "Notebook",
  monitor: "Monitor",
  printer: "Printer",
  licenses: "Licenses",
  overview_total: "Total Stock",
  overview_usable: "Ready for Use",
  overview_broken: "Broken / Unavailable",
};

const EXECUTIVE_ASSET_STATUS_LABELS = {
  in_use: "In Use",
  assigned: "Assigned",
  spare: "Spare",
  available: "Available",
  broken: "Broken",
  repair: "Under Repair",
  retired: "Retired",
  lost: "Lost",
};

const EXECUTIVE_LICENSE_STATUS_LABELS = {
  active: "Active",
  pending_renewal: "Renewal Due",
  inactive: "Inactive",
  expired: "Expired",
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
  return EXECUTIVE_ASSET_STATUS_LABELS[key] || normalizeText(status) || "-";
}

function formatLicenseStatus(status) {
  const key = normalizeStatusKey(status);
  return EXECUTIVE_LICENSE_STATUS_LABELS[key] || normalizeText(status) || "-";
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

function resolveAssetCategoryKey(asset) {
  const direct = normalizeKeywordSource(asset?.asset_category);
  if (["pc", "notebook", "monitor", "printer"].includes(direct)) return direct;

  const combined = normalizeKeywordSource(
    `${asset?.asset_category || ""} ${asset?.asset_name || ""} ${asset?.model || ""}`,
  );
  if (CORE_MENU_FALLBACK_KEYWORDS.pc.some((keyword) => combined.includes(keyword))) return "pc";
  if (CORE_MENU_FALLBACK_KEYWORDS.notebook.some((keyword) => combined.includes(keyword))) return "notebook";
  if (CORE_MENU_FALLBACK_KEYWORDS.monitor.some((keyword) => combined.includes(keyword))) return "monitor";
  if (CORE_MENU_FALLBACK_KEYWORDS.printer.some((keyword) => combined.includes(keyword))) return "printer";
  return "";
}

function isUsableAssetStatus(status) {
  return ["in_use", "assigned", "spare", "available"].includes(normalizeAssetStatusKey(status));
}

function isBrokenAssetStatus(status) {
  return ["broken", "repair", "retired", "lost"].includes(normalizeAssetStatusKey(status));
}

function isUsableLicenseStatus(status) {
  return ["active", "pending_renewal"].includes(normalizeStatusKey(status));
}

function isBrokenLicenseStatus(status) {
  return ["inactive", "expired"].includes(normalizeStatusKey(status));
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

function ExecutiveChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur">
      {label ? <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p> : null}
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.dataKey}`} className="flex items-center justify-between gap-4 text-xs">
            <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-black text-slate-900">{NUMBER_FORMATTER.format(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExecutiveSignalCard({ eyebrow, title, value, detail, tone = "slate", icon: Icon }) {
  const toneMap = {
    slate: "border-slate-200 bg-white text-slate-900",
    indigo: "border-slate-200 bg-white text-slate-900",
    emerald: "border-slate-200 bg-white text-slate-900",
    amber: "border-slate-200 bg-white text-slate-900",
    rose: "border-slate-200 bg-white text-slate-900",
  };
  const accentMap = {
    slate: "bg-slate-400",
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };

  return (
    <article className={`rounded-[1.35rem] border p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ${toneMap[tone] || toneMap.slate}`}>
      <div className={`mb-3 h-1.5 w-14 rounded-full ${accentMap[tone] || accentMap.slate}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
          <h3 className="mt-2 text-sm font-bold text-slate-700">{title}</h3>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-500 shadow-sm">
          <Icon size={18} />
        </div>
      </div>
    </article>
  );
}

function MainMetricCard({ label, subtitle, value, icon: Icon, accent, soft, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-[1.5rem] border bg-white p-5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] ${
        active ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{NUMBER_FORMATTER.format(value)}</p>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-2xl border p-3 shadow-sm transition group-hover:scale-105 ${soft}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Detail</span>
        <ArrowUpRight size={15} className="text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </button>
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
  const [activeDetailFilter, setActiveDetailFilter] = useState("all");
  const [isAssetDetailModalOpen, setAssetDetailModalOpen] = useState(false);
  const [isLicenseDetailModalOpen, setLicenseDetailModalOpen] = useState(false);

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
  const categoryMixTotal = Math.max(
    menuCount.pc + menuCount.notebook + menuCount.monitor + menuCount.printer + menuCount.licenses,
    1,
  );
  const categoryMixItems = [
    { key: "pc", label: "PC", value: menuCount.pc, color: "from-sky-500 to-cyan-500" },
    { key: "notebook", label: "Notebook", value: menuCount.notebook, color: "from-violet-500 to-fuchsia-500" },
    { key: "monitor", label: "Monitor", value: menuCount.monitor, color: "from-emerald-500 to-teal-500" },
    { key: "printer", label: "Printer", value: menuCount.printer, color: "from-amber-500 to-orange-500" },
    { key: "licenses", label: "Licenses", value: menuCount.licenses, color: "from-indigo-500 to-blue-500" },
  ].map((item) => ({
    ...item,
    percent: Math.round((item.value / categoryMixTotal) * 100),
  }));
  const operationsPulseSeries = [
    { label: "PC", value: stockByCategory.pc.usable },
    { label: "Notebook", value: stockByCategory.notebook.usable },
    { label: "Monitor", value: stockByCategory.monitor.usable },
    { label: "Printer", value: stockByCategory.printer.usable },
    { label: "Licenses", value: stockByCategory.licenses.usable },
  ];
  const operationsPulseWidth = 300;
  const operationsPulseHeight = 110;
  const operationsPulsePadding = 10;
  const operationsPulseMax = Math.max(...operationsPulseSeries.map((item) => item.value), 1);
  const operationsPulsePoints = operationsPulseSeries.map((item, index) => {
    const x =
      operationsPulseSeries.length > 1
        ? (index / (operationsPulseSeries.length - 1)) * operationsPulseWidth
        : operationsPulseWidth / 2;
    const ratio = item.value / operationsPulseMax;
    const y = operationsPulseHeight - operationsPulsePadding - ratio * (operationsPulseHeight - operationsPulsePadding * 2);
    return { ...item, x, y };
  });
  const operationsPulseLine = operationsPulsePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const operationsPulseArea = `0,${operationsPulseHeight} ${operationsPulseLine} ${operationsPulseWidth},${operationsPulseHeight}`;
  const categoryPortfolioData = EXECUTIVE_MENU_CARDS.map((item) => ({
    name: item.label,
    value: menuCount[item.key],
    usable: stockByCategory[item.key].usable,
    broken: stockByCategory[item.key].broken,
    color: item.chart,
  })).filter((item) => item.value > 0);
  const operationalReadinessData = EXECUTIVE_MENU_CARDS.map((item) => {
    const stock = stockByCategory[item.key];
    const total = Math.max(stock.total, 1);
    return {
      name: item.label,
      readiness: Math.round((stock.usable / total) * 100),
      riskUnits: stock.broken,
      usableUnits: stock.usable,
      color: item.chart,
    };
  }).filter((item) => item.usableUnits > 0 || item.riskUnits > 0);
  const dominantCategory = [...categoryMixItems].sort((left, right) => right.value - left.value)[0] || null;
  const weakestCategory = [...operationalReadinessData].sort((left, right) => left.readiness - right.readiness)[0] || null;
  const licenseAttentionCount = licenseRows.filter((row) => ["pending_renewal", "expired"].includes(normalizeStatusKey(row.status))).length;
  const executiveSignals = [
    {
      eyebrow: "Enterprise Base",
      title: "Total Managed Stock",
      value: NUMBER_FORMATTER.format(overview.total),
      detail: `${NUMBER_FORMATTER.format(overview.usable)} ready for use across all tracked categories`,
      tone: "indigo",
      icon: BarChart3,
    },
    {
      eyebrow: "Operational Readiness",
      title: "Availability Rate",
      value: `${availabilityRate}%`,
      detail: weakestCategory ? `Lowest readiness is ${weakestCategory.name} at ${weakestCategory.readiness}%` : "No weak category detected",
      tone: "emerald",
      icon: ShieldCheck,
    },
    {
      eyebrow: "Attention Queue",
      title: "Risk / Renewal Items",
      value: NUMBER_FORMATTER.format(overview.broken + licenseAttentionCount),
      detail: `${NUMBER_FORMATTER.format(overview.broken)} broken assets and ${NUMBER_FORMATTER.format(licenseAttentionCount)} licenses requiring attention`,
      tone: overview.broken + licenseAttentionCount > 0 ? "amber" : "slate",
      icon: AlertTriangle,
    },
  ];

  const selectedAssetIdSet = new Set(selectedAssetIds);
  const selectedLicenseIdSet = new Set(selectedLicenseIds);
  const selectedAssets = assetRows.filter((row) => selectedAssetIdSet.has(row.id));
  const selectedLicenses = licenseRows.filter((row) => selectedLicenseIdSet.has(row.id));
  const allAssetsSelected = assetRows.length > 0 && selectedAssetIds.length === assetRows.length;
  const allLicensesSelected = licenseRows.length > 0 && selectedLicenseIds.length === licenseRows.length;

  useEffect(() => {
    if (selectedAssets.length > 0) {
      setAssetDetailModalOpen(true);
      return;
    }
    setAssetDetailModalOpen(false);
  }, [selectedAssets.length]);

  useEffect(() => {
    if (selectedLicenses.length > 0) {
      setLicenseDetailModalOpen(true);
      return;
    }
    setLicenseDetailModalOpen(false);
  }, [selectedLicenses.length]);

  const applyDetailFilter = (filterKey) => {
    const nextFilter = activeDetailFilter === filterKey ? "all" : filterKey;
    setActiveDetailFilter(nextFilter);

    if (nextFilter === "all") {
      setSelectedAssetIds([]);
      setSelectedLicenseIds([]);
      return;
    }

    if (["pc", "notebook", "monitor", "printer"].includes(nextFilter)) {
      setSelectedAssetIds(
        assetRows
          .filter((row) => resolveAssetCategoryKey(row) === nextFilter)
          .map((row) => row.id)
          .filter(Boolean),
      );
      setSelectedLicenseIds([]);
      return;
    }

    if (nextFilter === "licenses") {
      setSelectedAssetIds([]);
      setSelectedLicenseIds(licenseRows.map((row) => row.id).filter(Boolean));
      return;
    }

    if (nextFilter === "overview_total") {
      setSelectedAssetIds(assetRows.map((row) => row.id).filter(Boolean));
      setSelectedLicenseIds(licenseRows.map((row) => row.id).filter(Boolean));
      return;
    }

    if (nextFilter === "overview_usable") {
      setSelectedAssetIds(
        assetRows
          .filter((row) => isUsableAssetStatus(row.status))
          .map((row) => row.id)
          .filter(Boolean),
      );
      setSelectedLicenseIds(
        licenseRows
          .filter((row) => isUsableLicenseStatus(row.status))
          .map((row) => row.id)
          .filter(Boolean),
      );
      return;
    }

    if (nextFilter === "overview_broken") {
      setSelectedAssetIds(
        assetRows
          .filter((row) => isBrokenAssetStatus(row.status))
          .map((row) => row.id)
          .filter(Boolean),
      );
      setSelectedLicenseIds(
        licenseRows
          .filter((row) => isBrokenLicenseStatus(row.status))
          .map((row) => row.id)
          .filter(Boolean),
      );
    }
  };

  return (
    <div className="space-y-5">
      <section id="overview-executive-hero" className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:p-7">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-700">
                <Sparkles size={12} />
                Executive View
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">
                <TrendingUp size={12} />
                Live Operational Dashboard
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-[2.4rem]">
              Operational Dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              A clean executive summary of stock readiness, operational exposure, and IT capacity across the core device portfolio.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                <Activity size={13} className="text-indigo-600" />
                Updated: {generatedAt}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                <ShieldCheck size={13} className="text-emerald-600" />
                Availability {availabilityRate}%
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                <AlertTriangle size={13} className="text-amber-600" />
                Risk Queue {NUMBER_FORMATTER.format(overview.broken + licenseAttentionCount)}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              {executiveSignals.map((signal) => (
                <ExecutiveSignalCard key={signal.title} {...signal} />
              ))}
            </div>
          </div>

          <aside className="rounded-[1.7rem] border border-slate-200 bg-slate-50/80 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Readiness Snapshot</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">Current Operating Posture</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Immediate summary of usable capacity and the category with the highest exposure.
                </p>
              </div>
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
              <div className="mx-auto">
                <div
                  className="relative h-32 w-32 rounded-full"
                  style={{
                    background: `conic-gradient(#10b981 0 ${availabilityRate}%, #f59e0b ${availabilityRate}% ${Math.min(
                      availabilityRate + brokenRate,
                      100,
                    )}%, #e2e8f0 ${Math.min(availabilityRate + brokenRate, 100)}% 100%)`,
                  }}
                >
                  <div className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-white ring-1 ring-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ready</span>
                    <span className="mt-1 text-3xl font-black text-slate-950">{availabilityRate}%</span>
                    <span className="mt-1 text-[11px] text-slate-400">portfolio</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Largest Portfolio Weight</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-slate-950">{dominantCategory?.name || "No data"}</p>
                      <p className="text-sm text-slate-500">
                        {dominantCategory ? `${NUMBER_FORMATTER.format(dominantCategory.value)} units in the largest category mix` : "Awaiting data"}
                      </p>
                    </div>
                    <ArrowUpRight size={18} className="text-slate-400" />
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Weakest Readiness</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{weakestCategory ? `${weakestCategory.name} ${weakestCategory.readiness}%` : "No risk signal"}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {weakestCategory ? `${NUMBER_FORMATTER.format(weakestCategory.riskUnits)} units currently under pressure in this category` : "Every tracked category is healthy"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ready Units</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{NUMBER_FORMATTER.format(overview.usable)}</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Renewal Queue</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{NUMBER_FORMATTER.format(licenseAttentionCount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section id="categories-executive" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {EXECUTIVE_MENU_CARDS.map((item) => (
          <MainMetricCard
            key={item.key}
            label={item.label}
            subtitle={item.subtitle}
            value={menuCount[item.key]}
            icon={item.icon}
            accent={item.accent}
            soft={item.soft}
            active={activeDetailFilter === item.key}
            onClick={() => applyDetailFilter(item.key)}
          />
        ))}
      </section>

      <section id="health-executive" className="hidden grid grid-cols-1 gap-4 xl:grid-cols-3">
        <button
          type="button"
          onClick={() => applyDetailFilter("overview_total")}
          className={`rounded-[1.9rem] border bg-white p-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)] ${
            activeDetailFilter === "overview_total" ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><BarChart3 size={16} className="text-indigo-600" />Total Stock</div>
          <p className="mt-3 text-4xl font-black text-slate-950">{NUMBER_FORMATTER.format(overview.total)}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">Full asset and entitlement estate under executive monitoring.</p>
        </button>
        <button
          type="button"
          onClick={() => applyDetailFilter("overview_usable")}
          className={`rounded-[1.9rem] border bg-[linear-gradient(135deg,_#ecfdf5_0%,_#ffffff_100%)] p-5 text-left shadow-[0_12px_30px_rgba(16,185,129,0.10)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(16,185,129,0.18)] ${
            activeDetailFilter === "overview_usable" ? "border-emerald-700 ring-2 ring-emerald-700/15" : "border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 size={16} />Ready for Use</div>
          <p className="mt-3 text-4xl font-black text-emerald-950">{NUMBER_FORMATTER.format(overview.usable)}</p>
          <p className="mt-2 text-sm leading-6 text-emerald-700">Healthy operating base with {availabilityRate}% portfolio readiness.</p>
        </button>
        <button
          type="button"
          onClick={() => applyDetailFilter("overview_broken")}
          className={`rounded-[1.9rem] border bg-[linear-gradient(135deg,_#fff7ed_0%,_#ffffff_100%)] p-5 text-left shadow-[0_12px_30px_rgba(245,158,11,0.10)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(245,158,11,0.18)] ${
            activeDetailFilter === "overview_broken" ? "border-amber-500 ring-2 ring-amber-500/15" : "border-amber-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle size={16} />Risk Exposure</div>
          <p className="mt-3 text-4xl font-black text-amber-950">{NUMBER_FORMATTER.format(overview.broken + licenseAttentionCount)}</p>
          <p className="mt-2 text-sm leading-6 text-amber-700">
            {NUMBER_FORMATTER.format(overview.broken)} broken assets and {NUMBER_FORMATTER.format(licenseAttentionCount)} renewal items requiring action.
          </p>
        </button>
      </section>

      <section id="visualizations-executive" className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Portfolio Composition</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Asset Portfolio Balance</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Relative weight of each operational category. This shows where the enterprise is most invested and where capacity concentration exists.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Total Units</p>
              <p className="text-lg font-black text-slate-950">{NUMBER_FORMATTER.format(categoryMixTotal)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
            <div className="h-[280px] rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryPortfolioData} layout="vertical" margin={{ top: 12, right: 12, left: 6, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={76} tick={{ fontSize: 11, fill: "#475569", fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ExecutiveChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="value" name="Total Units" radius={[0, 10, 10, 0]}>
                    {categoryPortfolioData.map((entry) => (
                      <Cell key={`portfolio-${entry.name}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {categoryMixItems.slice(0, 4).map((item) => (
                <div key={item.key} className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-900">{item.label}</p>
                    <span className="text-xs font-black text-slate-500">{item.percent}%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{NUMBER_FORMATTER.format(item.value)} units in current portfolio</p>
                  <div className="mt-3 h-2.5 rounded-full bg-white">
                    <div className={`h-2.5 rounded-full bg-gradient-to-r ${item.color}`} style={{ width: `${Math.max(item.percent, 4)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Operational Readiness</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Usable vs Risk Units</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Category-level operating capacity versus units already impacted by failure, repair, retirement, or expiration risk.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Risk Rate</p>
              <p className="text-lg font-black text-slate-950">{brokenRate}%</p>
            </div>
          </div>

          <div className="mt-5 h-[240px] rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPortfolioData} margin={{ top: 12, right: 12, left: -12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569", fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ExecutiveChartTooltip />} />
                <Bar dataKey="usable" name="Usable Units" stackId="readiness" fill="#0f766e" radius={[10, 10, 0, 0]} />
                <Bar dataKey="broken" name="Risk Units" stackId="readiness" fill="#f59e0b" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Dominant Portfolio</p>
              <p className="mt-2 text-base font-black text-slate-950">{dominantCategory?.name || "No data"}</p>
              <p className="mt-1 text-sm text-slate-500">
                {dominantCategory ? `${NUMBER_FORMATTER.format(dominantCategory.value)} units and ${dominantCategory.percent}% of total estate` : "Awaiting portfolio data"}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Most Exposed Category</p>
              <p className="mt-2 text-base font-black text-slate-950">{weakestCategory?.name || "No risk"}</p>
              <p className="mt-1 text-sm text-slate-500">
                {weakestCategory ? `${weakestCategory.readiness}% readiness with ${NUMBER_FORMATTER.format(weakestCategory.riskUnits)} units under pressure` : "No category is showing elevated risk"}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section id="overview" className="hidden rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">Executive IT Stock Snapshot</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">Stock Overview</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">PC, Notebook, Monitor, Printer และ Licenses แบบรวมในหน้าเดียว</p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              รีเฟรช
            </button>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">อัปเดตล่าสุด: {generatedAt}</div>
          </div>
        </div>
      </section>

      <section id="categories" className="hidden grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {EXECUTIVE_MENU_CARDS.map((item) => (
          <MainMetricCard
            key={item.key}
            label={item.label}
            subtitle={item.subtitle}
            value={menuCount[item.key]}
            icon={item.icon}
            accent={item.accent}
            soft={item.soft}
            active={activeDetailFilter === item.key}
            onClick={() => applyDetailFilter(item.key)}
          />
        ))}
      </section>

      <section id="health" className="hidden grid grid-cols-1 gap-4 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => applyDetailFilter("overview_total")}
          className={`rounded-3xl border bg-white p-5 text-left shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)] ${
            activeDetailFilter === "overview_total" ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Activity size={16} className="text-indigo-600" />จำนวน Stock รวม</div>
          <p className="mt-2 text-4xl font-black text-slate-900">{NUMBER_FORMATTER.format(overview.total)}</p>
          <p className="mt-1 text-sm text-slate-500">รวมทั้งหมดทุกหมวดในโรงงาน</p>
        </button>
        <button
          type="button"
          onClick={() => applyDetailFilter("overview_usable")}
          className={`rounded-3xl border bg-emerald-50 p-5 text-left shadow-[0_8px_22px_rgba(16,185,129,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(16,185,129,0.2)] ${
            activeDetailFilter === "overview_usable" ? "border-emerald-700 ring-2 ring-emerald-700/15" : "border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 size={16} />ใช้งานได้</div>
          <p className="mt-2 text-4xl font-black text-emerald-900">{NUMBER_FORMATTER.format(overview.usable)}</p>
          <p className="mt-1 text-sm text-emerald-700">พร้อมใช้งาน {availabilityRate}%</p>
        </button>
        <button
          type="button"
          onClick={() => applyDetailFilter("overview_broken")}
          className={`rounded-3xl border bg-rose-50 p-5 text-left shadow-[0_8px_22px_rgba(244,63,94,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(244,63,94,0.2)] ${
            activeDetailFilter === "overview_broken" ? "border-rose-700 ring-2 ring-rose-700/15" : "border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-800"><AlertTriangle size={16} />เสีย / ใช้ไม่ได้</div>
          <p className="mt-2 text-4xl font-black text-rose-900">{NUMBER_FORMATTER.format(overview.broken)}</p>
          <p className="mt-1 text-sm text-rose-700">คิดเป็น {brokenRate}% ของ stock ทั้งหมด</p>
        </button>
      </section>

      <section id="visualizations" className="hidden grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Dashboard Visualizations</p>
              <h2 className="mt-2 text-lg font-black text-slate-900">Category Mix</h2>
              <p className="mt-1 text-sm text-slate-500">สัดส่วนของ stock แต่ละหมวด เปรียบเทียบจากยอดรวมทั้งหมด</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Total Units</p>
              <p className="text-lg font-black text-slate-900">{NUMBER_FORMATTER.format(categoryMixTotal)}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {categoryMixItems.map((item) => (
              <div key={item.key}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <p className="font-semibold text-slate-700">{item.label}</p>
                  <p className="font-semibold text-slate-500">{NUMBER_FORMATTER.format(item.value)} • {item.percent}%</p>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className={`h-2.5 rounded-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                    style={{ width: `${Math.max(item.percent, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Operations Pulse</p>
          <h2 className="mt-2 text-lg font-black text-slate-900">Operational Split</h2>
          <p className="mt-1 text-sm text-slate-500">มุมมองพร้อมใช้งานเทียบกับความเสี่ยง เพื่อใช้ตัดสินใจเร็วขึ้น</p>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
            <div className="flex items-center gap-4">
              <div
                className="relative h-28 w-28 rounded-full"
                style={{
                  background: `conic-gradient(#10b981 0 ${availabilityRate}%, #f43f5e ${availabilityRate}% ${Math.min(
                    availabilityRate + brokenRate,
                    100,
                  )}%, #e2e8f0 ${Math.min(availabilityRate + brokenRate, 100)}% 100%)`,
                }}
              >
                <div className="absolute inset-[10px] flex items-center justify-center rounded-full bg-white">
                  <span className="text-lg font-black text-slate-900">{availabilityRate}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-semibold text-emerald-700">Usable</p>
                  <p className="text-base font-black text-emerald-900">{NUMBER_FORMATTER.format(overview.usable)} units</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                  <p className="text-xs font-semibold text-rose-700">Broken / Unusable</p>
                  <p className="text-base font-black text-rose-900">{NUMBER_FORMATTER.format(overview.broken)} units</p>
                </div>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Usable Trend by Category</p>
                <p className="text-xs font-semibold text-slate-500">Max {NUMBER_FORMATTER.format(operationsPulseMax)}</p>
              </div>
              <svg
                viewBox={`0 0 ${operationsPulseWidth} ${operationsPulseHeight}`}
                className="h-28 w-full"
                preserveAspectRatio="none"
                role="img"
                aria-label="Operations pulse area chart"
              >
                <defs>
                  <linearGradient id="operationsPulseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <polygon points={operationsPulseArea} fill="url(#operationsPulseFill)" />
                <polyline points={operationsPulseLine} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                {operationsPulsePoints.map((point) => (
                  <circle key={point.label} cx={point.x} cy={point.y} r="3.2" fill="#0369a1" />
                ))}
              </svg>
              <div className="mt-2 grid grid-cols-5 gap-1 text-[10px] font-semibold text-slate-500">
                {operationsPulseSeries.map((item) => (
                  <p key={item.label} className="truncate text-center">{item.label}</p>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          Detail Filter: {EXECUTIVE_DETAIL_FILTER_LABELS[activeDetailFilter] || EXECUTIVE_DETAIL_FILTER_LABELS.all}
        </span>
        <button
          type="button"
          onClick={() => {
            setActiveDetailFilter("all");
            setSelectedAssetIds([]);
            setSelectedLicenseIds([]);
          }}
          disabled={activeDetailFilter === "all"}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          ล้างตัวกรอง
        </button>
      </section>

      <section id="matrix" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
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

      <section id="assets">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">รายการอุปกรณ์ที่อัปเดตล่าสุด</h2>
              <p className="mt-1 text-xs text-slate-500">ติ๊ก checkbox เพื่อแสดงรายละเอียดทันที (ดูอย่างเดียว)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAssetDetailModalOpen(true)}
                disabled={selectedAssets.length === 0}
                className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ดูรายละเอียดที่เลือก ({NUMBER_FORMATTER.format(selectedAssets.length)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAssetIds([]);
                  setActiveDetailFilter("all");
                }}
                disabled={selectedAssetIds.length === 0}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ล้างที่เลือก
              </button>
            </div>
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
      </section>

      {isAssetDetailModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-6"
          onClick={() => setAssetDetailModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-base font-black text-slate-900 sm:text-lg">
                  รายละเอียดอุปกรณ์ที่เลือก ({NUMBER_FORMATTER.format(selectedAssets.length)})
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">ดูได้อย่างเดียว ไม่มีปุ่มแก้ไข</p>
              </div>
              <button
                type="button"
                onClick={() => setAssetDetailModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                ปิด
              </button>
            </div>

            <div className="max-h-[78vh] overflow-auto p-4 sm:p-5">
              {selectedAssets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  ยังไม่มีรายการที่เลือก
                </div>
              ) : (
                <div className="space-y-3">
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
            </div>
          </div>
        </div>
      ) : null}

      <section id="licenses" className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">รายการไลเซนส์ที่อัปเดตล่าสุด</h2>
              <p className="mt-1 text-xs text-slate-500">ติ๊ก checkbox เพื่อแสดงรายละเอียดทันที (ดูอย่างเดียว)</p>
            </div>
            <button
              type="button"
              onClick={() => setLicenseDetailModalOpen(true)}
              disabled={selectedLicenses.length === 0}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              View Selected ({NUMBER_FORMATTER.format(selectedLicenses.length)})
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedLicenseIds([]);
                setActiveDetailFilter("all");
              }}
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

      {isLicenseDetailModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-6"
          onClick={() => setLicenseDetailModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-base font-black text-slate-900 sm:text-lg">
                  License Details ({NUMBER_FORMATTER.format(selectedLicenses.length)})
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">Read-only view</p>
              </div>
              <button
                type="button"
                onClick={() => setLicenseDetailModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="max-h-[78vh] overflow-auto p-4 sm:p-5">
              {selectedLicenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No selected license
                </div>
              ) : (
                <div className="space-y-3">
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
                        <p><span className="font-semibold text-slate-500">Vendor:</span> {normalizeText(item.vendor) || "-"}</p>
                        <p><span className="font-semibold text-slate-500">Type:</span> {normalizeText(item.license_type) || "-"}</p>
                        <p><span className="font-semibold text-slate-500">Total:</span> {NUMBER_FORMATTER.format(Math.max(toNumber(item.quantity_total), 0))}</p>
                        <p><span className="font-semibold text-slate-500">Assigned:</span> {NUMBER_FORMATTER.format(Math.min(Math.max(toNumber(item.quantity_assigned), 0), Math.max(toNumber(item.quantity_total), 0)))}</p>
                        <p><span className="font-semibold text-slate-500">Available:</span> {NUMBER_FORMATTER.format(getAvailableSeats(item))}</p>
                        <p><span className="font-semibold text-slate-500">Expiry:</span> {formatDate(item.expiry_date)}</p>
                        <p><span className="font-semibold text-slate-500">Renewal:</span> {formatDate(item.renewal_date)}</p>
                        <p><span className="font-semibold text-slate-500">Updated:</span> {formatDateTime(item.updated_at || item.created_at)}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        <span className="font-semibold text-slate-500">Notes:</span> {normalizeText(item.notes) || "-"}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
