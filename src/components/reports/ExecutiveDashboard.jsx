import React, { useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Computer, KeyRound, Laptop, Monitor, Printer, RefreshCw } from "lucide-react";
import { useI18n } from "../../i18n/LanguageProvider";
import { getReportLocale } from "./reportLocale";
import ReportPageHero from "./ReportPageHero";

const COPY = {
  th: { heroBadge: "Executive IT Stock Snapshot", heroTitle: "Stock Overview", heroDescription: "รวม stock และ license เพื่อให้ผู้บริหารดูสถานะใช้งานจริงได้ในหน้าเดียว", refresh: "รีเฟรช", updated: "อัปเดตล่าสุด", filters: { active: "ตัวกรองรายละเอียด", all: "ทั้งหมด", total: "จำนวน stock รวม", usable: "ใช้งานได้", broken: "เสีย / ใช้งานไม่ได้", clear: "ล้างตัวกรอง" }, overview: { totalTitle: "จำนวน stock รวม", totalHint: "รวมทุกหมวดที่ติดตามอยู่", usableTitle: "ใช้งานได้", usableHint: "พร้อมใช้งาน {{percent}}%", brokenTitle: "เสีย / ใช้งานไม่ได้", brokenHint: "คิดเป็น {{percent}}% ของ stock ทั้งหมด" }, viz: { badge: "Dashboard Visualizations", mixTitle: "Category Mix", mixHint: "สัดส่วนของ stock แต่ละหมวดเทียบกับยอดรวมทั้งหมด", totalUnits: "Total Units", pulseTitle: "Operational Split", pulseHint: "ดูความพร้อมใช้งานเทียบกับความเสี่ยงเพื่อช่วยตัดสินใจเร็วขึ้น", usable: "Usable", unusable: "Broken / Unusable", units: "units", trend: "Usable Trend by Category", max: "Max" }, matrix: { title: "IT Stock Matrix (Real-time)", hint: "ข้อมูลอัปเดตจาก assets management", headers: ["หมวดหมู่", "ทั้งหมด", "ใช้งานได้", "เสีย", "ความพร้อมใช้งาน"], total: "รวมทุกหมวด" }, assets: { title: "รายการอุปกรณ์ที่อัปเดตล่าสุด", hint: "ติ๊ก checkbox เพื่อเปิดรายละเอียดแบบ read-only" }, licenses: { title: "รายการไลเซนส์ที่อัปเดตล่าสุด", hint: "ติ๊ก checkbox เพื่อเปิดรายละเอียดแบบ read-only" } },
  en: { heroBadge: "Executive IT Stock Snapshot", heroTitle: "Stock Overview", heroDescription: "A fast-read view of live stock and license availability for executive follow-up", refresh: "Refresh", updated: "Last updated", filters: { active: "Detail filter", all: "All", total: "Total stock", usable: "Usable", broken: "Broken / Unusable", clear: "Clear filter" }, overview: { totalTitle: "Total stock", totalHint: "Combined across all tracked categories", usableTitle: "Usable", usableHint: "{{percent}}% ready for use", brokenTitle: "Broken / Unusable", brokenHint: "{{percent}}% of the total stock" }, viz: { badge: "Dashboard Visualizations", mixTitle: "Category Mix", mixHint: "Stock share by category compared with the total inventory", totalUnits: "Total Units", pulseTitle: "Operational Split", pulseHint: "Compare readiness and risk to help leadership decide faster", usable: "Usable", unusable: "Broken / Unusable", units: "units", trend: "Usable Trend by Category", max: "Max" }, matrix: { title: "IT Stock Matrix (Real-time)", hint: "Updated from assets management", headers: ["Category", "Total", "Usable", "Broken", "Readiness"], total: "All categories" }, assets: { title: "Recently updated assets", hint: "Tick checkboxes to open read-only details" }, licenses: { title: "Recently updated licenses", hint: "Tick checkboxes to open read-only details" } },
  ko: { heroBadge: "Executive IT Stock Snapshot", heroTitle: "Stock Overview", heroDescription: "임원이 실제 사용 가능 재고와 라이선스 상태를 빠르게 읽을 수 있는 화면입니다", refresh: "새로고침", updated: "마지막 업데이트", filters: { active: "상세 필터", all: "전체", total: "총 재고", usable: "사용 가능", broken: "고장 / 사용 불가", clear: "필터 해제" }, overview: { totalTitle: "총 재고", totalHint: "추적 중인 모든 카테고리 합계", usableTitle: "사용 가능", usableHint: "{{percent}}% 사용 가능", brokenTitle: "고장 / 사용 불가", brokenHint: "전체 재고의 {{percent}}%" }, viz: { badge: "Dashboard Visualizations", mixTitle: "Category Mix", mixHint: "전체 대비 카테고리별 재고 비중", totalUnits: "Total Units", pulseTitle: "Operational Split", pulseHint: "사용 가능 상태와 위험도를 함께 보며 더 빠르게 판단합니다", usable: "Usable", unusable: "Broken / Unusable", units: "units", trend: "Usable Trend by Category", max: "Max" }, matrix: { title: "IT Stock Matrix (Real-time)", hint: "assets management 기준 최신 데이터", headers: ["카테고리", "전체", "사용 가능", "고장", "준비 상태"], total: "전체 카테고리" }, assets: { title: "최근 업데이트된 자산", hint: "체크박스를 선택하면 read-only 상세가 열립니다" }, licenses: { title: "최근 업데이트된 라이선스", hint: "체크박스를 선택하면 read-only 상세가 열립니다" } },
};

const MENU_CARDS = [
  { key: "pc", label: "PC", icon: Computer, accent: "from-sky-500 to-cyan-500", soft: "border-sky-200 bg-sky-50 text-sky-700" },
  { key: "notebook", label: "Notebook", icon: Laptop, accent: "from-violet-500 to-fuchsia-500", soft: "border-violet-200 bg-violet-50 text-violet-700" },
  { key: "monitor", label: "Monitor", icon: Monitor, accent: "from-emerald-500 to-teal-500", soft: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { key: "printer", label: "Printer", icon: Printer, accent: "from-amber-500 to-orange-500", soft: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "licenses", label: "Licenses", icon: KeyRound, accent: "from-indigo-500 to-blue-500", soft: "border-indigo-200 bg-indigo-50 text-indigo-700" },
];

const KEYWORDS = { pc: ["pc", "desktop", "computer", "คอม", "คอมพิวเตอร์", "เดสก์ท็อป"], notebook: ["notebook", "laptop", "โน้ตบุ๊ก", "โน๊ตบุ๊ก", "แล็ปท็อป"], monitor: ["monitor", "display", "screen", "จอ", "มอนิเตอร์"], printer: ["printer", "print", "เครื่องพิมพ์", "พรินเตอร์", "ปริ้นเตอร์"] };

const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const resolveMetric = (primary, fallback = 0) => (Number.isFinite(Number(primary)) ? Number(primary) : Number(fallback) || 0);
const formatDateTime = (value, locale) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
};
const normalizeStock = (value, totalFallback = 0) => {
  const total = Math.max(resolveMetric(value?.total, totalFallback), 0);
  const usable = Math.max(Math.min(resolveMetric(value?.usable, total), total), 0);
  const broken = Math.max(Math.min(resolveMetric(value?.broken, Math.max(total - usable, 0)), total), 0);
  return { total, usable, broken: Math.max(broken, Math.max(total - usable, 0)) };
};
const fallbackCount = (list, key) => (Array.isArray(list) ? list : []).reduce((sum, item) => KEYWORDS[key].some((keyword) => String(item?.label || "").toLowerCase().includes(keyword)) ? sum + toNumber(item?.value) : sum, 0);
const sortByLatest = (items) => [...(Array.isArray(items) ? items : [])].sort((left, right) => new Date(right?.updated_at || right?.created_at || 0).getTime() - new Date(left?.updated_at || left?.created_at || 0).getTime());

export default function ExecutiveDashboard({ data, onRefresh, loading }) {
  const { language } = useI18n();
  const copy = COPY[language] || COPY.en;
  const locale = getReportLocale(language);
  const formatCount = (value) => new Intl.NumberFormat(locale).format(Number(value || 0));
  const assetHeaders = copy?.assets?.headers || ["Tag", "Asset", "Status", "Updated"];
  const licenseHeaders =
    copy?.licenses?.headers || ["License", "Status", "Total", "Assigned", "Available"];
  const [activeDetailFilter, setActiveDetailFilter] = useState("all");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedLicenseId, setSelectedLicenseId] = useState("");

  const assetSummary = data?.assetSummary || {};
  const licenseSummary = data?.licenseSummary || {};
  const assetRows = sortByLatest(data?.assetRows);
  const licenseRows = sortByLatest(data?.licenseRows);
  const coreMenuSummary = data?.coreMenuSummary || {};
  const stockSource = coreMenuSummary.stock || {};
  const menuCount = {
    pc: resolveMetric(coreMenuSummary.pc, fallbackCount(assetSummary.byCategory, "pc")),
    notebook: resolveMetric(coreMenuSummary.notebook, fallbackCount(assetSummary.byCategory, "notebook")),
    monitor: resolveMetric(coreMenuSummary.monitor, fallbackCount(assetSummary.byCategory, "monitor")),
    printer: resolveMetric(coreMenuSummary.printer, fallbackCount(assetSummary.byCategory, "printer")),
    licenses: resolveMetric(coreMenuSummary.licenses, licenseSummary.totalSeats || licenseSummary.totalLicenses),
  };
  const stockByCategory = {
    pc: normalizeStock(stockSource.pc, menuCount.pc),
    notebook: normalizeStock(stockSource.notebook, menuCount.notebook),
    monitor: normalizeStock(stockSource.monitor, menuCount.monitor),
    printer: normalizeStock(stockSource.printer, menuCount.printer),
    licenses: normalizeStock(stockSource.licenses, menuCount.licenses),
  };
  const overview = normalizeStock(stockSource.all, Object.values(stockByCategory).reduce((sum, item) => sum + item.total, 0));
  const availabilityRate = overview.total > 0 ? Math.round((overview.usable / overview.total) * 100) : 0;
  const brokenRate = overview.total > 0 ? Math.round((overview.broken / overview.total) * 100) : 0;
  const categoryMixTotal = Math.max(Object.values(menuCount).reduce((sum, value) => sum + value, 0), 1);
  const pulseSeries = [
    { label: "PC", value: stockByCategory.pc.usable },
    { label: "Notebook", value: stockByCategory.notebook.usable },
    { label: "Monitor", value: stockByCategory.monitor.usable },
    { label: "Printer", value: stockByCategory.printer.usable },
    { label: "Licenses", value: stockByCategory.licenses.usable },
  ];
  const pulseMax = Math.max(...pulseSeries.map((item) => item.value), 1);
  const pulsePoints = pulseSeries.map((item, index) => ({ ...item, x: pulseSeries.length > 1 ? (index / (pulseSeries.length - 1)) * 300 : 150, y: 110 - 10 - (item.value / pulseMax) * 90 }));
  const detailLabels = { all: copy.filters.all, pc: "PC", notebook: "Notebook", monitor: "Monitor", printer: "Printer", licenses: "Licenses", overview_total: copy.filters.total, overview_usable: copy.filters.usable, overview_broken: copy.filters.broken };
  const isUsableAsset = (status) => ["in_use", "assigned", "spare", "available"].includes(String(status || "").toLowerCase().replace(/\s+/g, "_"));
  const isBrokenAsset = (status) => ["broken", "repair", "retired", "lost"].includes(String(status || "").toLowerCase().replace(/\s+/g, "_"));
  const isUsableLicense = (status) => ["active", "pending_renewal"].includes(String(status || "").toLowerCase().replace(/\s+/g, "_"));
  const isBrokenLicense = (status) => ["inactive", "expired"].includes(String(status || "").toLowerCase().replace(/\s+/g, "_"));
  const filteredAssetRows = assetRows.filter((item) => {
    if (["all", "licenses"].includes(activeDetailFilter)) return activeDetailFilter !== "licenses";
    if (["pc", "notebook", "monitor", "printer"].includes(activeDetailFilter)) return KEYWORDS[activeDetailFilter].some((keyword) => `${item?.asset_category || ""} ${item?.asset_name || ""} ${item?.model || ""}`.toLowerCase().includes(keyword));
    if (activeDetailFilter === "overview_total") return true;
    if (activeDetailFilter === "overview_usable") return isUsableAsset(item?.status);
    if (activeDetailFilter === "overview_broken") return isBrokenAsset(item?.status);
    return true;
  });
  const filteredLicenseRows = licenseRows.filter((item) => {
    if (activeDetailFilter === "all" || activeDetailFilter === "overview_total" || activeDetailFilter === "licenses") return true;
    if (["pc", "notebook", "monitor", "printer"].includes(activeDetailFilter)) return false;
    if (activeDetailFilter === "overview_usable") return isUsableLicense(item?.status);
    if (activeDetailFilter === "overview_broken") return isBrokenLicense(item?.status);
    return true;
  });
  const selectedAsset = filteredAssetRows.find((item) => item.id === selectedAssetId) || filteredAssetRows[0] || null;
  const selectedLicense = filteredLicenseRows.find((item) => item.id === selectedLicenseId) || filteredLicenseRows[0] || null;

  return (
    <div className="space-y-5">
      <ReportPageHero
        eyebrow={copy.heroBadge}
        title={copy.heroTitle}
        description={copy.heroDescription}
        status={`${copy.updated}: ${formatDateTime(data?.generatedAt, locale)}`}
        action={(
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {copy.refresh}
          </button>
        )}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {MENU_CARDS.map((item) => <button key={item.key} type="button" onClick={() => setActiveDetailFilter(item.key)} className={`w-full rounded-2xl border bg-white p-5 text-left shadow-[0_4px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)] ${activeDetailFilter === item.key ? "border-blue-700 ring-2 ring-blue-100" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{item.label}</p><p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{formatCount(menuCount[item.key])}</p></div><div className={`rounded-2xl border p-3 ${item.soft}`}><item.icon size={18} /></div></div><div className={`mt-4 h-1.5 rounded-full bg-gradient-to-r ${item.accent}`} /></button>)}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <button type="button" onClick={() => setActiveDetailFilter("overview_total")} className={`rounded-2xl border bg-white p-5 text-left shadow-[0_5px_22px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)] ${activeDetailFilter === "overview_total" ? "border-blue-700 ring-2 ring-blue-100" : "border-slate-200"}`}><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Activity size={16} className="text-indigo-600" />{copy.overview.totalTitle}</div><p className="mt-2 text-4xl font-black text-slate-900">{formatCount(overview.total)}</p><p className="mt-1 text-sm text-slate-500">{copy.overview.totalHint}</p></button>
        <button type="button" onClick={() => setActiveDetailFilter("overview_usable")} className={`rounded-2xl border bg-emerald-50 p-5 text-left shadow-[0_8px_22px_rgba(16,185,129,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(16,185,129,0.2)] ${activeDetailFilter === "overview_usable" ? "border-emerald-700 ring-2 ring-emerald-700/15" : "border-emerald-200"}`}><div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 size={16} />{copy.overview.usableTitle}</div><p className="mt-2 text-4xl font-black text-emerald-900">{formatCount(overview.usable)}</p><p className="mt-1 text-sm text-emerald-700">{copy.overview.usableHint.replace("{{percent}}", String(availabilityRate))}</p></button>
        <button type="button" onClick={() => setActiveDetailFilter("overview_broken")} className={`rounded-2xl border bg-rose-50 p-5 text-left shadow-[0_8px_22px_rgba(244,63,94,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(244,63,94,0.2)] ${activeDetailFilter === "overview_broken" ? "border-rose-700 ring-2 ring-rose-700/15" : "border-rose-200"}`}><div className="flex items-center gap-2 text-sm font-semibold text-rose-800"><AlertTriangle size={16} />{copy.overview.brokenTitle}</div><p className="mt-2 text-4xl font-black text-rose-900">{formatCount(overview.broken)}</p><p className="mt-1 text-sm text-rose-700">{copy.overview.brokenHint.replace("{{percent}}", String(brokenRate))}</p></button>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_5px_22px_rgba(15,23,42,0.04)]"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{copy.viz.badge}</p><h2 className="mt-2 text-lg font-black text-slate-900">{copy.viz.mixTitle}</h2><p className="mt-1 text-sm text-slate-500">{copy.viz.mixHint}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{copy.viz.totalUnits}</p><p className="text-lg font-black text-slate-900">{formatCount(categoryMixTotal)}</p></div></div><div className="mt-4 space-y-3">{MENU_CARDS.map((item) => { const percent = Math.round((menuCount[item.key] / categoryMixTotal) * 100); return <div key={item.key}><div className="mb-1.5 flex items-center justify-between text-sm"><p className="font-semibold text-slate-700">{item.label}</p><p className="font-semibold text-slate-500">{formatCount(menuCount[item.key])} • {percent}%</p></div><div className="h-2.5 rounded-full bg-slate-100"><div className={`h-2.5 rounded-full bg-gradient-to-r ${item.accent}`} style={{ width: `${Math.max(percent, 2)}%` }} /></div></div>; })}</div></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_5px_22px_rgba(15,23,42,0.04)]"><p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Operations Pulse</p><h2 className="mt-2 text-lg font-black text-slate-900">{copy.viz.pulseTitle}</h2><p className="mt-1 text-sm text-slate-500">{copy.viz.pulseHint}</p><div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center"><div className="flex items-center gap-4"><div className="relative h-28 w-28 rounded-full" style={{ background: `conic-gradient(#10b981 0 ${availabilityRate}%, #f43f5e ${availabilityRate}% ${Math.min(availabilityRate + brokenRate, 100)}%, #e2e8f0 ${Math.min(availabilityRate + brokenRate, 100)}% 100%)` }}><div className="absolute inset-[10px] flex items-center justify-center rounded-full bg-white"><span className="text-lg font-black text-slate-900">{availabilityRate}%</span></div></div><div className="space-y-2"><div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"><p className="text-xs font-semibold text-emerald-700">{copy.viz.usable}</p><p className="text-base font-black text-emerald-900">{formatCount(overview.usable)} {copy.viz.units}</p></div><div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2"><p className="text-xs font-semibold text-rose-700">{copy.viz.unusable}</p><p className="text-base font-black text-rose-900">{formatCount(overview.broken)} {copy.viz.units}</p></div></div></div><div className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-slate-600">{copy.viz.trend}</p><p className="text-xs font-semibold text-slate-500">{copy.viz.max} {formatCount(pulseMax)}</p></div><svg viewBox="0 0 300 110" className="h-28 w-full" preserveAspectRatio="none"><defs><linearGradient id="operationsPulseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" /><stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" /></linearGradient></defs><polygon points={`0,110 ${pulsePoints.map((point) => `${point.x},${point.y}`).join(" ")} 300,110`} fill="url(#operationsPulseFill)" /><polyline points={pulsePoints.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />{pulsePoints.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="3.2" fill="#0369a1" />)}</svg><div className="mt-2 grid grid-cols-5 gap-1 text-[10px] font-semibold text-slate-500">{pulseSeries.map((item) => <p key={item.label} className="truncate text-center">{item.label}</p>)}</div></div></div></article>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3"><span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{copy.filters.active}: {detailLabels[activeDetailFilter]}</span><button type="button" onClick={() => setActiveDetailFilter("all")} disabled={activeDetailFilter === "all"} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">{copy.filters.clear}</button></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_5px_22px_rgba(15,23,42,0.04)]"><h2 className="text-lg font-black text-slate-900">{copy.matrix.title}</h2><p className="mt-1 text-sm text-slate-500">{copy.matrix.hint}</p><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">{copy.matrix.headers.map((label, index) => <th key={label} className={`px-3 py-2 ${index > 0 ? "text-right" : ""}`}>{label}</th>)}</tr></thead><tbody>{[["PC", stockByCategory.pc], ["Notebook", stockByCategory.notebook], ["Monitor", stockByCategory.monitor], ["Printer", stockByCategory.printer], ["Licenses", stockByCategory.licenses], [copy.matrix.total, overview]].map(([label, stock]) => { const availability = stock.total > 0 ? Math.round((stock.usable / stock.total) * 100) : 0; return <tr key={label} className="border-b border-slate-100 last:border-b-0"><td className="px-3 py-3 font-semibold text-slate-800">{label}</td><td className="px-3 py-3 text-right font-black text-slate-900">{formatCount(stock.total)}</td><td className="px-3 py-3 text-right font-semibold text-emerald-700">{formatCount(stock.usable)}</td><td className="px-3 py-3 text-right font-semibold text-rose-700">{formatCount(stock.broken)}</td><td className="px-3 py-3 text-right font-semibold text-slate-700">{availability}%</td></tr>; })}</tbody></table></div></section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_5px_22px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-black text-slate-900">{copy.assets.title}</h2>
          <p className="mt-1 text-xs text-slate-500">{copy.assets.hint}</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-[360px] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-400">
                    {assetHeaders.map((label) => <th key={label} className="px-3 py-2">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredAssetRows.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">{copy.assets.hint}</td></tr>
                  ) : (
                    filteredAssetRows.slice(0, 18).map((item) => (
                      <tr key={item.id} onClick={() => setSelectedAssetId(item.id)} className={`cursor-pointer border-b border-slate-100 transition ${selectedAsset?.id === item.id ? "bg-sky-50" : "hover:bg-slate-50"}`}>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{item.asset_tag || "-"}</td>
                        <td className="px-3 py-2.5 text-slate-700"><div>{item.asset_name || "-"}</div><div className="text-xs text-slate-500">{item.asset_category || "-"}</div></td>
                        <td className="px-3 py-2.5 text-slate-600">{item.status || "-"}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">{formatDateTime(item.updated_at || item.created_at, locale)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            {selectedAsset ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-black text-slate-900">{selectedAsset.asset_name || "-"}</h3>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{selectedAsset.status || "-"}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <p><span className="font-semibold text-slate-500">Tag:</span> {selectedAsset.asset_tag || "-"}</p>
                  <p><span className="font-semibold text-slate-500">Category:</span> {selectedAsset.asset_category || "-"}</p>
                  <p><span className="font-semibold text-slate-500">Brand:</span> {selectedAsset.brand || "-"}</p>
                  <p><span className="font-semibold text-slate-500">Model:</span> {selectedAsset.model || "-"}</p>
                  <p><span className="font-semibold text-slate-500">Owner:</span> {selectedAsset.owner_name || "-"}</p>
                  <p><span className="font-semibold text-slate-500">Location:</span> {selectedAsset.location || "-"}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">{copy.assets.hint}</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_5px_22px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-black text-slate-900">{copy.licenses.title}</h2>
          <p className="mt-1 text-xs text-slate-500">{copy.licenses.hint}</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-[360px] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-400">
                    {licenseHeaders.map((label) => <th key={label} className={`px-3 py-2 ${label === licenseHeaders[0] ? "" : "text-right"}`}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredLicenseRows.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">{copy.licenses.hint}</td></tr>
                  ) : (
                    filteredLicenseRows.slice(0, 18).map((item) => {
                      const total = Math.max(toNumber(item.quantity_total), 0);
                      const assigned = Math.min(Math.max(toNumber(item.quantity_assigned), 0), total);
                      const available = Math.max(total - assigned, 0);
                      return (
                        <tr key={item.id} onClick={() => setSelectedLicenseId(item.id)} className={`cursor-pointer border-b border-slate-100 transition ${selectedLicense?.id === item.id ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
                          <td className="px-3 py-2.5 text-slate-700"><div className="font-semibold text-slate-800">{item.license_name || "-"}</div><div className="text-xs text-slate-500">{item.vendor || "-"}</div></td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{item.status || "-"}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700">{formatCount(total)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700">{formatCount(assigned)}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-700">{formatCount(available)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            {selectedLicense ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-black text-slate-900">{selectedLicense.license_name || "-"}</h3>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{selectedLicense.status || "-"}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <p><span className="font-semibold text-slate-500">Vendor:</span> {selectedLicense.vendor || "-"}</p>
                  <p><span className="font-semibold text-slate-500">Type:</span> {selectedLicense.license_type || "-"}</p>
                  <p><span className="font-semibold text-slate-500">Total:</span> {formatCount(selectedLicense.quantity_total)}</p>
                  <p><span className="font-semibold text-slate-500">Assigned:</span> {formatCount(selectedLicense.quantity_assigned)}</p>
                  <p><span className="font-semibold text-slate-500">Expiry:</span> {formatDateTime(selectedLicense.expiry_date, locale)}</p>
                  <p><span className="font-semibold text-slate-500">Renewal:</span> {formatDateTime(selectedLicense.renewal_date, locale)}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">{copy.licenses.hint}</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
