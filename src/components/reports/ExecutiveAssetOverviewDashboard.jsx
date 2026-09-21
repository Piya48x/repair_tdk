import React, { useMemo, useState } from "react";
import {
  Archive,
  Box,
  Clock3,
  Computer,
  HardDrive,
  KeyRound,
  Laptop,
  MapPin,
  Monitor,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import ReportMetricCard from "./ReportMetricCard";
import ReportPageHero from "./ReportPageHero";
import ReportSectionCard from "./ReportSectionCard";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { getReportLocale } from "./reportLocale";

const TRANSLATIONS = {
  th: {
    heroBadge: "Asset Governance",
    heroTitle: "สถานะและความพร้อมของทรัพย์สิน",
    heroDescription: "ติดตามจำนวน สถานะ ความพร้อม ความเสี่ยง และ License ของทรัพย์สิน IT โดยไม่ปะปนกับงานซ่อมหรือคำขอบริการ",
    refresh: "รีเฟรชข้อมูล",
    updated: "อัปเดตล่าสุด",
    readiness: "ความพร้อมรวม",
    metrics: {
      total: "ทรัพย์สินทั้งหมด",
      totalHint: "อุปกรณ์ทุกสถานะในทะเบียน",
      active: "กำลังใช้งาน",
      activeHint: "มีผู้ใช้งานหรือมอบหมายแล้ว",
      ready: "พร้อมใช้ / สำรอง",
      readyHint: "พร้อมรองรับความต้องการใหม่",
      attention: "เสีย / กำลังซ่อม",
      attentionHint: "อุปกรณ์ที่ต้องเร่งติดตาม",
    },
    sections: {
      inventoryEyebrow: "Equipment Dashboard",
      statusTitle: "สัดส่วนสถานะทรัพย์สิน",
      statusSubtitle: "เห็นความพร้อมและรายการที่ออกจากการใช้งานได้ในมุมเดียว",
      categoryTitle: "ทรัพย์สินตามประเภท",
      categorySubtitle: "ใช้วางแผนจำนวนอุปกรณ์และการจัดซื้อทดแทน",
      inventoryTitle: "อุปกรณ์ทั้งหมด",
      inventorySubtitle: "แสดงอุปกรณ์ทุกชิ้นเป็น Block พร้อมรูปจริงหรือไอคอนตามประเภท",
      licenseTitle: "ความพร้อมของ Software License",
      licenseSubtitle: "จำนวนสิทธิ์ การใช้งานคงเหลือ และรายการใกล้หมดอายุ",
    },
    status: {
      deployed: "กำลังใช้งาน",
      ready: "พร้อมใช้ / สำรอง",
      attention: "เสีย / กำลังซ่อม",
      inactive: "เลิกใช้ / สูญหาย",
      other: "สถานะอื่น",
    },
    asset: {
      code: "Asset Code",
      owner: "ผู้ใช้งาน",
      location: "สถานที่",
      category: "ประเภท",
      noOwner: "ยังไม่มอบหมาย",
      noLocation: "ไม่ระบุสถานที่",
      noCategory: "ไม่ระบุประเภท",
      noPhoto: "ยังไม่มีรูปอุปกรณ์",
      empty: "ยังไม่มีข้อมูลทรัพย์สิน",
      noResults: "ไม่พบอุปกรณ์ตามตัวกรอง",
      searchPlaceholder: "ค้นหา Asset Code, ชื่ออุปกรณ์, Serial Number หรือผู้ใช้งาน",
      allStatuses: "ทุกสถานะ",
      allCategories: "ทุกประเภท",
      clearFilters: "ล้างตัวกรอง",
      showing: "แสดง {{shown}} จาก {{total}} รายการ",
      photos: "{{count}} รูป",
      photoCoverage: "มีรูป {{withPhoto}} / {{total}} รายการ",
      records: "รายการ",
      agingRisk: "ทรัพย์สินอายุเกิน 3 ปี",
      agingHint: "ควรตรวจสภาพและวางแผนทดแทน",
    },
    license: {
      records: "รายการ License",
      totalSeats: "สิทธิ์ทั้งหมด",
      usedSeats: "ใช้งานแล้ว",
      availableSeats: "คงเหลือ",
      utilization: "อัตราการใช้งาน",
      expiring30: "หมดอายุภายใน 30 วัน",
      expiring90: "หมดอายุภายใน 90 วัน",
      latest: "License ที่อัปเดตล่าสุด",
      seats: "สิทธิ์",
      empty: "ยังไม่มีข้อมูล License",
    },
  },
  en: {
    heroBadge: "Asset Governance",
    heroTitle: "Asset Status & Readiness",
    heroDescription: "Track IT asset volume, condition, readiness, risk, and software licenses without mixing in repair tickets or service requests.",
    refresh: "Refresh data",
    updated: "Last updated",
    readiness: "Overall readiness",
    metrics: {
      total: "Total assets",
      totalHint: "Equipment across every registry status",
      active: "In use",
      activeHint: "Assigned or currently deployed",
      ready: "Ready / spare",
      readyHint: "Available for new demand",
      attention: "Broken / repairing",
      attentionHint: "Equipment requiring follow-up",
    },
    sections: {
      inventoryEyebrow: "Equipment Dashboard",
      statusTitle: "Asset status distribution",
      statusSubtitle: "See operational readiness and inactive inventory in one view.",
      categoryTitle: "Assets by category",
      categorySubtitle: "Use the portfolio mix for capacity and replacement planning.",
      inventoryTitle: "All equipment",
      inventorySubtitle: "Every device is shown as a visual block using its photo or category icon.",
      licenseTitle: "Software license readiness",
      licenseSubtitle: "Track seats, remaining capacity, and upcoming expirations.",
    },
    status: {
      deployed: "In use",
      ready: "Ready / spare",
      attention: "Broken / repairing",
      inactive: "Retired / lost",
      other: "Other status",
    },
    asset: {
      code: "Asset Code",
      owner: "Owner",
      location: "Location",
      category: "Category",
      noOwner: "Unassigned",
      noLocation: "No location",
      noCategory: "Uncategorized",
      noPhoto: "No equipment photo",
      empty: "No asset data yet",
      noResults: "No equipment matches these filters",
      searchPlaceholder: "Search Asset Code, equipment, serial number, or owner",
      allStatuses: "All statuses",
      allCategories: "All categories",
      clearFilters: "Clear filters",
      showing: "Showing {{shown}} of {{total}} assets",
      photos: "{{count}} photos",
      photoCoverage: "Photos for {{withPhoto}} of {{total}} assets",
      records: "assets",
      agingRisk: "Assets older than 3 years",
      agingHint: "Review condition and replacement plans",
    },
    license: {
      records: "License records",
      totalSeats: "Total seats",
      usedSeats: "Assigned",
      availableSeats: "Available",
      utilization: "Utilization",
      expiring30: "Expiring within 30 days",
      expiring90: "Expiring within 90 days",
      latest: "Recently updated licenses",
      seats: "seats",
      empty: "No license data yet",
    },
  },
  ko: {
    heroBadge: "Asset Governance",
    heroTitle: "자산 상태 및 준비도",
    heroDescription: "수리 티켓이나 서비스 요청과 혼합하지 않고 IT 자산 수량, 상태, 준비도, 위험 및 라이선스를 확인합니다.",
    refresh: "새로고침",
    updated: "마지막 업데이트",
    readiness: "전체 준비도",
    metrics: {
      total: "전체 자산",
      totalHint: "자산 등록부의 모든 장비",
      active: "사용 중",
      activeHint: "배정 또는 사용 중인 장비",
      ready: "사용 가능 / 예비",
      readyHint: "신규 수요에 대응 가능",
      attention: "고장 / 수리 중",
      attentionHint: "후속 조치가 필요한 장비",
    },
    sections: {
      inventoryEyebrow: "Equipment Dashboard",
      statusTitle: "자산 상태 분포",
      statusSubtitle: "운영 준비도와 비활성 자산을 한 화면에서 확인합니다.",
      categoryTitle: "유형별 자산",
      categorySubtitle: "용량 및 교체 계획에 활용합니다.",
      inventoryTitle: "전체 장비",
      inventorySubtitle: "모든 장비를 실제 사진 또는 유형별 아이콘이 포함된 블록으로 표시합니다.",
      licenseTitle: "소프트웨어 라이선스 준비도",
      licenseSubtitle: "수량, 잔여 용량 및 만료 예정 항목을 확인합니다.",
    },
    status: {
      deployed: "사용 중",
      ready: "사용 가능 / 예비",
      attention: "고장 / 수리 중",
      inactive: "폐기 / 분실",
      other: "기타 상태",
    },
    asset: {
      code: "Asset Code",
      owner: "사용자",
      location: "위치",
      category: "유형",
      noOwner: "미배정",
      noLocation: "위치 미지정",
      noCategory: "유형 미지정",
      noPhoto: "장비 사진 없음",
      empty: "자산 데이터가 없습니다",
      noResults: "필터와 일치하는 장비가 없습니다",
      searchPlaceholder: "Asset Code, 장비명, Serial Number 또는 사용자 검색",
      allStatuses: "모든 상태",
      allCategories: "모든 유형",
      clearFilters: "필터 초기화",
      showing: "전체 {{total}}개 중 {{shown}}개 표시",
      photos: "사진 {{count}}장",
      photoCoverage: "전체 {{total}}개 중 {{withPhoto}}개 사진 등록",
      records: "개",
      agingRisk: "3년 초과 자산",
      agingHint: "상태 및 교체 계획 검토 필요",
    },
    license: {
      records: "라이선스 항목",
      totalSeats: "전체 수량",
      usedSeats: "사용 중",
      availableSeats: "사용 가능",
      utilization: "사용률",
      expiring30: "30일 이내 만료",
      expiring90: "90일 이내 만료",
      latest: "최근 업데이트 라이선스",
      seats: "개",
      empty: "라이선스 데이터가 없습니다",
    },
  },
};

const STATUS_GROUPS = [
  { key: "deployed", statuses: new Set(["in_use", "assigned", "active"]), color: "#2563eb", tone: "border-blue-200 bg-blue-50 text-blue-700" },
  { key: "ready", statuses: new Set(["spare", "available", "stock", "ready"]), color: "#10b981", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { key: "attention", statuses: new Set(["broken", "repair", "damaged", "maintenance"]), color: "#f59e0b", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "inactive", statuses: new Set(["retired", "lost", "disposed", "decommissioned"]), color: "#94a3b8", tone: "border-slate-200 bg-slate-100 text-slate-600" },
  { key: "other", statuses: new Set(), color: "#a855f7", tone: "border-violet-200 bg-violet-50 text-violet-700" },
];

const normalizeStatus = (value) => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const DEVICE_TYPES = [
  { key: "notebook", icon: Laptop, keywords: ["notebook", "laptop", "macbook", "โน้ตบุ๊ก", "โน๊ตบุ๊ก", "노트북"] },
  { key: "monitor", icon: Monitor, keywords: ["monitor", "display", "screen", "จอ", "มอนิเตอร์", "모니터"] },
  { key: "printer", icon: Printer, keywords: ["printer", "print", "เครื่องพิมพ์", "พรินเตอร์", "프린터"] },
  { key: "server", icon: Server, keywords: ["server", "nas", "storage", "เซิร์ฟเวอร์", "서버"] },
  { key: "computer", icon: Computer, keywords: ["computer", "desktop", "workstation", "pc", "คอม", "데스크톱"] },
  { key: "other", icon: HardDrive, keywords: [] },
];

function statusGroup(status) {
  const normalized = normalizeStatus(status);
  return STATUS_GROUPS.find((group) => group.statuses.has(normalized)) || STATUS_GROUPS[STATUS_GROUPS.length - 1];
}

function deviceType(asset) {
  const searchable = `${asset?.asset_category || ""} ${asset?.asset_name || ""} ${asset?.brand || ""} ${asset?.model || ""}`.toLowerCase();
  return DEVICE_TYPES.find((type) => type.key !== "other" && type.keywords.some((keyword) => searchable.includes(keyword)))
    || DEVICE_TYPES[DEVICE_TYPES.length - 1];
}

function assetAttachments(asset) {
  return [...(Array.isArray(asset?.it_asset_attachments) ? asset.it_asset_attachments : [])]
    .filter((item) => item?.file_url)
    .sort((left, right) => new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime());
}

function AssetVisual({ asset, emptyLabel }) {
  const attachments = assetAttachments(asset);
  const TypeIcon = deviceType(asset).icon;
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
        <span className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm"><TypeIcon size={34} strokeWidth={1.7} /></span>
        <span className="text-[10px] font-black uppercase tracking-[0.12em]">{emptyLabel}</span>
      </div>
      {attachments[0] ? (
        <img
          src={attachments[0].file_url}
          alt={attachments[0].file_name || asset?.asset_name || asset?.asset_tag || "IT asset"}
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
      ) : null}
      {attachments.length > 1 ? (
        <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
          +{attachments.length - 1}
        </span>
      ) : null}
    </div>
  );
}

function formatDate(value, locale) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

export default function ExecutiveAssetOverviewDashboard({ data, onRefresh, loading }) {
  const { language, tt } = useScopedI18n(TRANSLATIONS);
  const locale = getReportLocale(language);
  const formatter = new Intl.NumberFormat(locale);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const assetSummary = data?.assetSummary || {};
  const licenseSummary = data?.licenseSummary || {};
  const assetRows = Array.isArray(data?.assetRows) ? data.assetRows : [];
  const licenseRows = Array.isArray(data?.licenseRows) ? data.licenseRows : [];

  const categoryOptions = useMemo(() => [...new Set(assetRows
    .map((asset) => String(asset?.asset_category || "").trim())
    .filter(Boolean))].sort((left, right) => left.localeCompare(right, locale)), [assetRows, locale]);
  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return assetRows.filter((asset) => {
      const matchesStatus = statusFilter === "all" || statusGroup(asset?.status).key === statusFilter;
      const matchesCategory = categoryFilter === "all" || String(asset?.asset_category || "").trim() === categoryFilter;
      const matchesQuery = !query || [
        asset?.asset_tag,
        asset?.asset_name,
        asset?.asset_category,
        asset?.brand,
        asset?.model,
        asset?.serial_number,
        asset?.owner_name,
        asset?.department,
        asset?.location,
        asset?.factory,
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesStatus && matchesCategory && matchesQuery;
    });
  }, [assetRows, categoryFilter, searchQuery, statusFilter]);
  const filtersActive = Boolean(searchQuery || statusFilter !== "all" || categoryFilter !== "all");
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  const statusCounts = Object.fromEntries(STATUS_GROUPS.map((group) => [group.key, 0]));
  assetRows.forEach((asset) => {
    statusCounts[statusGroup(asset?.status).key] += 1;
  });
  const statusRows = STATUS_GROUPS.map((group) => ({ ...group, value: statusCounts[group.key] }));
  const operationalAssets = statusCounts.deployed + statusCounts.ready;
  const readinessRate = assetRows.length > 0 ? Math.round((operationalAssets / assetRows.length) * 100) : 0;
  const photoAssetCount = assetRows.filter((asset) => assetAttachments(asset).length > 0).length;
  const categoryRows = Array.isArray(assetSummary.byCategory) ? assetSummary.byCategory : [];
  const statusTotal = Math.max(assetRows.length, 1);
  let statusOffset = 0;
  const statusGradient = statusRows.map((group) => {
    const start = statusOffset;
    statusOffset += (group.value / statusTotal) * 100;
    return `${group.color} ${start}% ${statusOffset}%`;
  }).join(", ");
  const licenseUtilization = toNumber(licenseSummary.totalSeats) > 0
    ? Math.round((toNumber(licenseSummary.usedSeats) / toNumber(licenseSummary.totalSeats)) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <ReportPageHero
        eyebrow={tt("heroBadge")}
        title={tt("heroTitle")}
        description={tt("heroDescription")}
        status={`${tt("updated")}: ${new Date(data?.generatedAt || Date.now()).toLocaleString(locale)}`}
        action={(
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {tt("refresh")}
          </button>
        )}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetricCard title={tt("metrics.total")} value={formatter.format(assetRows.length)} hint={tt("metrics.totalHint")} icon={Box} tone="indigo" />
        <ReportMetricCard title={tt("metrics.active")} value={formatter.format(statusCounts.deployed)} hint={tt("metrics.activeHint")} icon={ShieldCheck} tone="emerald" />
        <ReportMetricCard title={tt("metrics.ready")} value={formatter.format(statusCounts.ready)} hint={tt("metrics.readyHint")} icon={PackageCheck} tone="cyan" />
        <ReportMetricCard title={tt("metrics.attention")} value={formatter.format(statusCounts.attention)} hint={tt("metrics.attentionHint")} icon={Wrench} tone={statusCounts.attention > 0 ? "amber" : "slate"} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
        <header className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">{tt("sections.inventoryEyebrow")}</p>
            <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{tt("sections.inventoryTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{tt("sections.inventorySubtitle")}</p>
          </div>
          <span className="inline-flex self-start items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 sm:self-auto">
            <HardDrive size={14} />
            {tt("asset.photoCoverage", { withPhoto: formatter.format(photoAssetCount), total: formatter.format(assetRows.length) })}
          </span>
        </header>

        <div className="border-b border-slate-200 bg-slate-50/70 p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(300px,1fr)_190px_210px_auto]">
            <label className="relative block md:col-span-2 xl:col-span-1">
              <span className="sr-only">{tt("asset.searchPlaceholder")}</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={tt("asset.searchPlaceholder")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label>
              <span className="sr-only">{tt("asset.allStatuses")}</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="all">{tt("asset.allStatuses")}</option>
                {STATUS_GROUPS.map((group) => <option key={group.key} value={group.key}>{tt(`status.${group.key}`)}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">{tt("asset.allCategories")}</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="all">{tt("asset.allCategories")}</option>
                {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            {filtersActive ? (
              <button type="button" onClick={clearFilters} className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 transition hover:bg-blue-100">
                {tt("asset.clearFilters")}
              </button>
            ) : <span className="hidden xl:block" />}
          </div>
        </div>

        <div className="xl:grid xl:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50/60 p-4 sm:p-5 xl:border-b-0 xl:border-r">
            <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg">
              <div className="flex items-center gap-4 xl:flex-col">
                <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: assetRows.length ? `conic-gradient(${statusGradient})` : "#334155" }}>
                  <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-slate-950">
                    <span className="text-2xl font-black">{formatter.format(readinessRate)}%</span>
                    <span className="mt-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{tt("readiness")}</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 xl:text-center">
                  <p className="text-sm font-black">{tt("sections.statusTitle")}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{tt("sections.statusSubtitle")}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-1">
              {statusRows.filter((group) => group.value > 0).map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setStatusFilter((current) => current === group.key ? "all" : group.key)}
                  aria-pressed={statusFilter === group.key}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${statusFilter === group.key ? group.tone : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"}`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-black">{tt(`status.${group.key}`)}</span>
                  <span className="text-sm font-black">{formatter.format(group.value)}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{tt("sections.categoryTitle")}</p>
              <div className="mt-3 flex flex-wrap gap-2 xl:flex-col">
                {categoryRows.slice(0, 6).map((category) => (
                  <button
                    key={category.label}
                    type="button"
                    onClick={() => setCategoryFilter((current) => current === category.label ? "all" : category.label)}
                    aria-pressed={categoryFilter === category.label}
                    className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition ${categoryFilter === category.label ? "border-blue-200 bg-blue-50 font-black text-blue-700" : "border-transparent bg-white text-slate-600 hover:border-slate-200"}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{category.label || tt("asset.noCategory")}</span>
                    <span className="font-black">{formatter.format(toNumber(category.value))}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={`mt-5 flex items-center gap-3 rounded-xl border px-3 py-3 ${toNumber(assetSummary.riskyAssets) > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              <Clock3 size={17} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black">{tt("asset.agingRisk")}</p>
                <p className="mt-0.5 truncate text-[10px] opacity-70">{tt("asset.agingHint")}</p>
              </div>
              <span className="text-xl font-black">{formatter.format(toNumber(assetSummary.riskyAssets))}</span>
            </div>
          </aside>

          <main className="min-w-0 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-500">{tt("asset.showing", { shown: formatter.format(filteredAssets.length), total: formatter.format(assetRows.length) })}</p>
              {filtersActive ? (
                <button type="button" onClick={clearFilters} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 transition hover:bg-blue-100">{tt("asset.clearFilters")}</button>
              ) : null}
            </div>

            {filteredAssets.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {filteredAssets.map((asset) => {
                  const group = statusGroup(asset?.status);
                  const TypeIcon = deviceType(asset).icon;
                  const attachments = assetAttachments(asset);
                  return (
                    <article key={asset.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(15,23,42,0.10)]">
                      <div className="relative">
                        <AssetVisual asset={asset} emptyLabel={tt("asset.noPhoto")} />
                        <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-black shadow-sm ${group.tone}`}>{tt(`status.${group.key}`)}</span>
                        {attachments.length ? (
                          <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">{tt("asset.photos", { count: formatter.format(attachments.length) })}</span>
                        ) : null}
                      </div>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500"><TypeIcon size={15} /></span>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-black text-slate-950">{asset.asset_name || asset.asset_tag || "-"}</h3>
                            <p className="mt-1 truncate text-xs font-bold text-blue-700">{asset.asset_tag || "-"}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                          <p className="flex min-w-0 items-center gap-2"><UserRound size={12} className="shrink-0" /><span className="truncate">{asset.owner_name || asset.department || tt("asset.noOwner")}</span></p>
                          <p className="flex min-w-0 items-center gap-2"><MapPin size={12} className="shrink-0" /><span className="truncate">{asset.location || asset.factory || tt("asset.noLocation")}</span></p>
                          <p className="flex min-w-0 items-center gap-2"><Archive size={12} className="shrink-0" /><span className="truncate">{asset.asset_category || tt("asset.noCategory")}</span></p>
                        </div>
                        <p className="mt-3 text-[10px] font-semibold text-slate-400">{formatDate(asset.updated_at || asset.created_at, locale)}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
                <HardDrive size={36} className="text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-600">{filtersActive ? tt("asset.noResults") : tt("asset.empty")}</p>
                {filtersActive ? (
                  <button type="button" onClick={clearFilters} className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-xs font-black text-white">{tt("asset.clearFilters")}</button>
                ) : null}
              </div>
            )}
          </main>
        </div>
      </section>

      <ReportSectionCard title={tt("sections.licenseTitle")} subtitle={tt("sections.licenseSubtitle")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            [tt("license.records"), licenseSummary.totalLicenses, "text-slate-950"],
            [tt("license.totalSeats"), licenseSummary.totalSeats, "text-indigo-700"],
            [tt("license.usedSeats"), licenseSummary.usedSeats, "text-blue-700"],
            [tt("license.availableSeats"), licenseSummary.availableSeats, "text-emerald-700"],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3.5">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p>
              <p className={`mt-1 text-2xl font-black ${tone}`}>{formatter.format(toNumber(value))}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-black text-indigo-900"><KeyRound size={17} />{tt("license.utilization")}</span>
              <span className="text-2xl font-black text-indigo-900">{formatter.format(licenseUtilization)}%</span>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.min(licenseUtilization, 100)}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-amber-200 bg-white/80 p-3">
                <p className="text-[10px] font-bold text-slate-500">{tt("license.expiring30")}</p>
                <p className="mt-1 text-xl font-black text-amber-700">{formatter.format(toNumber(licenseSummary.expiring30))}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <p className="text-[10px] font-bold text-slate-500">{tt("license.expiring90")}</p>
                <p className="mt-1 text-xl font-black text-slate-700">{formatter.format(toNumber(licenseSummary.expiring90))}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{tt("license.latest")}</p>
            {licenseRows.length ? (
              <div className="mt-3 space-y-2">
                {licenseRows.slice(0, 5).map((license) => (
                  <div key={license.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-indigo-600"><KeyRound size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{license.license_name || "-"}</p>
                      <p className="truncate text-[11px] text-slate-400">{license.vendor || license.license_type || "-"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-black text-slate-700">{formatter.format(toNumber(license.quantity_assigned))}/{formatter.format(toNumber(license.quantity_total))}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{tt("license.seats")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="py-12 text-center text-sm font-semibold text-slate-400">{tt("license.empty")}</p>}
          </div>
        </div>
      </ReportSectionCard>
    </div>
  );
}
