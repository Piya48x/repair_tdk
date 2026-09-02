import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Box,
  Building2,
  CheckCircle2,
  ChevronRight,
  Computer,
  HardDrive,
  ImageOff,
  KeyRound,
  Laptop,
  MapPin,
  Monitor,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Wrench,
  X,
  ZoomIn,
} from "lucide-react";
import { useI18n } from "../../i18n/LanguageProvider";
import { getReportLocale } from "./reportLocale";
import ReportPageHero from "./ReportPageHero";

const COPY = {
  th: {
    heroBadge: "Executive Asset Health",
    heroTitle: "ภาพรวมทรัพย์สิน IT",
    heroDescription: "ดูจำนวน สถานะ ความพร้อมใช้งาน และรูปอุปกรณ์ล่าสุดได้ในหน้าเดียว เพื่อช่วยตัดสินใจและติดตามความเสี่ยงได้เร็วขึ้น",
    refresh: "รีเฟรชข้อมูล",
    updated: "อัปเดตล่าสุด",
    healthScore: "ความพร้อมของทรัพย์สินที่ยังใช้งาน",
    healthy: "สถานะโดยรวมอยู่ในเกณฑ์ดี",
    needsAttention: "มี {{count}} รายการที่ควรติดตาม",
    metrics: {
      total: "ทรัพย์สินทั้งหมด",
      totalHint: "รวมอุปกรณ์ทุกสถานะ",
      deployed: "กำลังใช้งาน",
      deployedHint: "มีผู้ใช้งานหรือมอบหมายแล้ว",
      ready: "พร้อมใช้ / สำรอง",
      readyHint: "พร้อมรองรับการใช้งานใหม่",
      attention: "ต้องติดตาม",
      attentionHint: "เสียหรืออยู่ระหว่างซ่อม",
      inactive: "เลิกใช้ / สูญหาย",
      inactiveHint: "ไม่อยู่ในทรัพย์สินใช้งาน",
    },
    status: {
      eyebrow: "Asset Status",
      title: "ภาพรวมสถานะทรัพย์สิน",
      subtitle: "สัดส่วนสถานะของอุปกรณ์ทั้งหมดในทะเบียน",
      deployed: "กำลังใช้งาน",
      ready: "พร้อมใช้ / สำรอง",
      attention: "ต้องติดตาม",
      inactive: "เลิกใช้ / สูญหาย",
      assets: "รายการ",
    },
    category: {
      eyebrow: "Asset Portfolio",
      title: "ทรัพย์สินตามประเภท",
      subtitle: "เลือกประเภทเพื่อดูอุปกรณ์และรูปภาพด้านล่าง",
      all: "ทั้งหมด",
      pc: "คอมพิวเตอร์",
      notebook: "โน้ตบุ๊ก",
      monitor: "จอภาพ",
      printer: "เครื่องพิมพ์",
      other: "อุปกรณ์อื่น",
      ready: "พร้อมใช้งาน",
      risk: "ต้องติดตาม",
    },
    gallery: {
      eyebrow: "Asset Visual Review",
      title: "รูปและรายการอุปกรณ์",
      subtitle: "ตรวจดูอุปกรณ์ล่าสุดพร้อมผู้ใช้งาน สถานที่ และสถานะปัจจุบัน",
      showing: "แสดง {{shown}} จาก {{total}} รายการ",
      noResults: "ไม่พบอุปกรณ์ตามตัวกรองนี้",
      noImage: "ยังไม่มีรูปอุปกรณ์",
      images: "{{count}} รูป",
      photoCoverage: "มีรูปอุปกรณ์ {{withPhoto}} / {{total}} รายการ",
      closeImage: "ปิดรูป",
      viewDetail: "ดูรายละเอียด",
      clear: "ล้างตัวกรอง",
      filter: "ตัวกรอง",
      searchPlaceholder: "ค้นหา Asset Code, ชื่อ, ผู้ใช้ หรือ Serial Number",
      loadMore: "ดูเพิ่มอีก {{count}} รายการ",
      allAssets: "อุปกรณ์ทั้งหมด",
      assetCode: "Asset Code",
      owner: "ผู้ใช้งาน",
      location: "สถานที่",
      department: "แผนก",
      serial: "Serial Number",
      updated: "อัปเดต",
      photoEvidence: "รูปอุปกรณ์",
      openImage: "ขยายรูป",
    },
    licenses: {
      eyebrow: "License Capacity",
      title: "ภาพรวม Software License",
      subtitle: "แยกจากจำนวนอุปกรณ์ เพื่อให้เห็นความพร้อมของสิทธิ์ใช้งานอย่างถูกต้อง",
      records: "รายการ License",
      total: "สิทธิ์ทั้งหมด",
      assigned: "ใช้งานแล้ว",
      available: "คงเหลือ",
      utilization: "อัตราการใช้งาน",
      latest: "License ที่อัปเดตล่าสุด",
      seats: "สิทธิ์",
    },
    statusCodes: {
      in_use: "ใช้งานอยู่",
      assigned: "มอบหมายแล้ว",
      spare: "สำรอง",
      available: "พร้อมใช้งาน",
      broken: "เสีย",
      repair: "กำลังซ่อม",
      retired: "ปลดระวาง",
      lost: "สูญหาย",
    },
  },
  en: {
    heroBadge: "Executive Asset Health",
    heroTitle: "IT Asset Overview",
    heroDescription: "See inventory, readiness, risks, and recent equipment photos in one place for faster executive decisions.",
    refresh: "Refresh data",
    updated: "Last updated",
    healthScore: "Readiness of active assets",
    healthy: "Overall asset health is good",
    needsAttention: "{{count}} assets need attention",
    metrics: {
      total: "Total assets",
      totalHint: "Equipment across every status",
      deployed: "In use",
      deployedHint: "In use or assigned",
      ready: "Ready / spare",
      readyHint: "Available for new demand",
      attention: "Needs attention",
      attentionHint: "Broken or under repair",
      inactive: "Retired / lost",
      inactiveHint: "Outside active inventory",
    },
    status: {
      eyebrow: "Asset Status",
      title: "Asset status overview",
      subtitle: "Current status distribution across the asset registry",
      deployed: "In use",
      ready: "Ready / spare",
      attention: "Needs attention",
      inactive: "Retired / lost",
      assets: "assets",
    },
    category: {
      eyebrow: "Asset Portfolio",
      title: "Assets by category",
      subtitle: "Select a category to review its equipment and photos below",
      all: "All",
      pc: "Computers",
      notebook: "Notebooks",
      monitor: "Monitors",
      printer: "Printers",
      other: "Other assets",
      ready: "Operational",
      risk: "Attention",
    },
    gallery: {
      eyebrow: "Asset Visual Review",
      title: "Equipment photos and details",
      subtitle: "Review recent assets with owner, location, and current status",
      showing: "Showing {{shown}} of {{total}} assets",
      noResults: "No assets match these filters",
      noImage: "No equipment photo yet",
      images: "{{count}} photos",
      photoCoverage: "Equipment photos available for {{withPhoto}} of {{total}} assets",
      closeImage: "Close image",
      viewDetail: "View details",
      clear: "Clear filters",
      filter: "Filter",
      searchPlaceholder: "Search Asset Code, name, owner, or serial number",
      loadMore: "Show {{count}} more assets",
      allAssets: "All assets",
      assetCode: "Asset Code",
      owner: "Owner",
      location: "Location",
      department: "Department",
      serial: "Serial Number",
      updated: "Updated",
      photoEvidence: "Equipment photos",
      openImage: "Enlarge image",
    },
    licenses: {
      eyebrow: "License Capacity",
      title: "Software license overview",
      subtitle: "Shown separately from equipment so available software capacity is easy to understand.",
      records: "License records",
      total: "Total seats",
      assigned: "Assigned",
      available: "Available",
      utilization: "Utilization",
      latest: "Recently updated licenses",
      seats: "seats",
    },
    statusCodes: {
      in_use: "In use",
      assigned: "Assigned",
      spare: "Spare",
      available: "Available",
      broken: "Broken",
      repair: "Under repair",
      retired: "Retired",
      lost: "Lost",
    },
  },
  ko: {
    heroBadge: "Executive Asset Health",
    heroTitle: "IT 자산 현황",
    heroDescription: "자산 수량, 준비 상태, 위험 요소와 최신 장비 사진을 한 화면에서 빠르게 확인합니다.",
    refresh: "새로고침",
    updated: "마지막 업데이트",
    healthScore: "운영 자산 준비율",
    healthy: "전반적인 자산 상태가 양호합니다",
    needsAttention: "{{count}}개 자산 확인 필요",
    metrics: {
      total: "전체 자산",
      totalHint: "모든 상태의 장비",
      deployed: "사용 중",
      deployedHint: "사용 또는 배정된 장비",
      ready: "사용 가능 / 예비",
      readyHint: "신규 수요에 대응 가능",
      attention: "확인 필요",
      attentionHint: "고장 또는 수리 중",
      inactive: "폐기 / 분실",
      inactiveHint: "운영 자산에서 제외",
    },
    status: {
      eyebrow: "Asset Status",
      title: "자산 상태 요약",
      subtitle: "전체 자산 등록부의 현재 상태 비율",
      deployed: "사용 중",
      ready: "사용 가능 / 예비",
      attention: "확인 필요",
      inactive: "폐기 / 분실",
      assets: "개",
    },
    category: {
      eyebrow: "Asset Portfolio",
      title: "유형별 자산",
      subtitle: "유형을 선택하여 아래에서 장비와 사진을 확인하세요",
      all: "전체",
      pc: "컴퓨터",
      notebook: "노트북",
      monitor: "모니터",
      printer: "프린터",
      other: "기타 장비",
      ready: "운영 가능",
      risk: "확인 필요",
    },
    gallery: {
      eyebrow: "Asset Visual Review",
      title: "장비 사진 및 상세 정보",
      subtitle: "최신 장비의 사용자, 위치와 현재 상태를 확인합니다",
      showing: "전체 {{total}}개 중 {{shown}}개 표시",
      noResults: "필터와 일치하는 자산이 없습니다",
      noImage: "등록된 장비 사진이 없습니다",
      images: "사진 {{count}}장",
      photoCoverage: "전체 {{total}}개 중 {{withPhoto}}개 사진 등록",
      closeImage: "사진 닫기",
      viewDetail: "상세 보기",
      clear: "필터 초기화",
      filter: "필터",
      searchPlaceholder: "Asset Code, 장비명, 사용자 또는 Serial Number 검색",
      loadMore: "자산 {{count}}개 더 보기",
      allAssets: "전체 자산",
      assetCode: "Asset Code",
      owner: "사용자",
      location: "위치",
      department: "부서",
      serial: "Serial Number",
      updated: "업데이트",
      photoEvidence: "장비 사진",
      openImage: "사진 확대",
    },
    licenses: {
      eyebrow: "License Capacity",
      title: "소프트웨어 라이선스 현황",
      subtitle: "장비 수량과 분리하여 소프트웨어 사용 가능 수량을 명확하게 표시합니다.",
      records: "라이선스 항목",
      total: "전체 수량",
      assigned: "사용 중",
      available: "사용 가능",
      utilization: "사용률",
      latest: "최근 업데이트 라이선스",
      seats: "개",
    },
    statusCodes: {
      in_use: "사용 중",
      assigned: "배정됨",
      spare: "예비",
      available: "사용 가능",
      broken: "고장",
      repair: "수리 중",
      retired: "폐기",
      lost: "분실",
    },
  },
};

const STATUS_GROUPS = [
  {
    key: "deployed",
    statuses: new Set(["in_use", "assigned"]),
    color: "#2563eb",
    icon: ShieldCheck,
    card: "border-blue-200 bg-blue-50 text-blue-900",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    key: "ready",
    statuses: new Set(["spare", "available"]),
    color: "#10b981",
    icon: PackageCheck,
    card: "border-emerald-200 bg-emerald-50 text-emerald-900",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    key: "attention",
    statuses: new Set(["broken", "repair"]),
    color: "#f59e0b",
    icon: Wrench,
    card: "border-amber-200 bg-amber-50 text-amber-900",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    key: "inactive",
    statuses: new Set(["retired", "lost"]),
    color: "#94a3b8",
    icon: Archive,
    card: "border-slate-200 bg-slate-100 text-slate-800",
    chip: "border-slate-200 bg-slate-100 text-slate-600",
  },
];

const CATEGORY_DEFINITIONS = [
  {
    key: "pc",
    icon: Computer,
    keywords: ["pc", "desktop", "computer", "คอม", "คอมพิวเตอร์", "데스크톱"],
    accent: "text-sky-700 bg-sky-50 border-sky-200",
  },
  {
    key: "notebook",
    icon: Laptop,
    keywords: ["notebook", "laptop", "โน้ตบุ๊ก", "โน๊ตบุ๊ก", "แล็ปท็อป", "노트북"],
    accent: "text-violet-700 bg-violet-50 border-violet-200",
  },
  {
    key: "monitor",
    icon: Monitor,
    keywords: ["monitor", "display", "screen", "จอ", "มอนิเตอร์", "모니터"],
    accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    key: "printer",
    icon: Printer,
    keywords: ["printer", "print", "เครื่องพิมพ์", "พรินเตอร์", "ปริ้นเตอร์", "프린터"],
    accent: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    key: "other",
    icon: HardDrive,
    keywords: [],
    accent: "text-slate-700 bg-slate-50 border-slate-200",
  },
];

const normalizeStatus = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const replaceToken = (text, token, value) => String(text || "").replace(`{{${token}}}`, String(value));

const formatDateTime = (value, locale) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const sortByLatest = (items) => [...(Array.isArray(items) ? items : [])].sort((left, right) => {
  const leftTime = new Date(left?.updated_at || left?.created_at || 0).getTime();
  const rightTime = new Date(right?.updated_at || right?.created_at || 0).getTime();
  return rightTime - leftTime;
});

function getStatusGroup(status) {
  const normalized = normalizeStatus(status);
  return STATUS_GROUPS.find((group) => group.statuses.has(normalized)) || STATUS_GROUPS[2];
}

function getAssetCategory(asset) {
  const haystack = `${asset?.asset_category || ""} ${asset?.asset_name || ""} ${asset?.brand || ""} ${asset?.model || ""}`.toLowerCase();
  const classificationOrder = ["notebook", "monitor", "printer", "pc"];
  return classificationOrder
    .map((key) => CATEGORY_DEFINITIONS.find((category) => category.key === key))
    .find((category) => category?.keywords.some((keyword) => haystack.includes(keyword))) || CATEGORY_DEFINITIONS[CATEGORY_DEFINITIONS.length - 1];
}

function getAttachments(asset) {
  return [...(Array.isArray(asset?.it_asset_attachments) ? asset.it_asset_attachments : [])]
    .filter((item) => item?.file_url)
    .sort((left, right) => new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime());
}

function AssetImage({ asset, className = "", iconSize = 30, emptyLabel = "No photo" }) {
  const attachment = getAttachments(asset)[0];
  const category = getAssetCategory(asset);
  const Icon = category.icon;

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Icon size={iconSize} />
        <span className="px-3 text-center text-[10px] font-bold uppercase tracking-[0.12em]">{emptyLabel}</span>
      </div>
      {attachment ? (
        <img
          src={attachment.file_url}
          alt={attachment.file_name || asset?.asset_name || "IT asset"}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ active, icon: Icon, label, value, hint, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group min-h-[138px] rounded-2xl border p-4 text-left shadow-[0_4px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.10)] ${tone} ${active ? "ring-2 ring-blue-700/20" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
        </div>
        <span className="rounded-xl border border-current/10 bg-white/70 p-2.5"><Icon size={18} /></span>
      </div>
      <p className="mt-2 text-xs leading-5 opacity-70">{hint}</p>
    </button>
  );
}

export default function ExecutiveDashboard({ data, onRefresh, loading }) {
  const { language } = useI18n();
  const copy = COPY[language] || COPY.en;
  const locale = getReportLocale(language);
  const formatCount = (value) => new Intl.NumberFormat(locale).format(Number(value || 0));
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const assets = useMemo(() => sortByLatest(data?.assetRows), [data?.assetRows]);
  const licenses = useMemo(() => sortByLatest(data?.licenseRows), [data?.licenseRows]);

  const statusCounts = useMemo(() => Object.fromEntries(STATUS_GROUPS.map((group) => [
    group.key,
    assets.filter((asset) => getStatusGroup(asset?.status).key === group.key).length,
  ])), [assets]);

  const activeAssetTotal = statusCounts.deployed + statusCounts.ready + statusCounts.attention;
  const operationalTotal = statusCounts.deployed + statusCounts.ready;
  const readinessRate = activeAssetTotal > 0 ? Math.round((operationalTotal / activeAssetTotal) * 100) : 0;

  const categoryMetrics = useMemo(() => CATEGORY_DEFINITIONS.map((category) => {
    const rows = assets.filter((asset) => getAssetCategory(asset).key === category.key);
    const operational = rows.filter((asset) => ["deployed", "ready"].includes(getStatusGroup(asset?.status).key)).length;
    const attention = rows.filter((asset) => getStatusGroup(asset?.status).key === "attention").length;
    return { ...category, total: rows.length, operational, attention };
  }), [assets]);

  const filteredAssets = useMemo(() => assets.filter((asset) => {
    const matchesStatus = statusFilter === "all" || getStatusGroup(asset?.status).key === statusFilter;
    const matchesCategory = categoryFilter === "all" || getAssetCategory(asset).key === categoryFilter;
    const query = searchQuery.trim().toLowerCase();
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
  }), [assets, categoryFilter, searchQuery, statusFilter]);

  const selectedAsset = filteredAssets.find((asset) => asset.id === selectedAssetId) || filteredAssets[0] || null;
  const selectedAttachments = getAttachments(selectedAsset);
  const visibleAssets = filteredAssets.slice(0, visibleCount);
  const photoAssetCount = useMemo(
    () => assets.filter((asset) => getAttachments(asset).length > 0).length,
    [assets],
  );

  const totalLicenseSeats = licenses.reduce((sum, item) => sum + Math.max(toNumber(item?.quantity_total), 0), 0);
  const assignedLicenseSeats = licenses.reduce((sum, item) => {
    const total = Math.max(toNumber(item?.quantity_total), 0);
    return sum + Math.min(Math.max(toNumber(item?.quantity_assigned), 0), total);
  }, 0);
  const availableLicenseSeats = Math.max(totalLicenseSeats - assignedLicenseSeats, 0);
  const licenseUtilization = totalLicenseSeats > 0 ? Math.round((assignedLicenseSeats / totalLicenseSeats) * 100) : 0;

  const statusTotal = Math.max(assets.length, 1);
  let statusOffset = 0;
  const statusSegments = STATUS_GROUPS.map((group) => {
    const start = statusOffset;
    statusOffset += (statusCounts[group.key] / statusTotal) * 100;
    return `${group.color} ${start}% ${statusOffset}%`;
  });

  useEffect(() => {
    if (!previewImage) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setPreviewImage(null);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewImage]);

  useEffect(() => {
    setVisibleCount(12);
  }, [categoryFilter, searchQuery, statusFilter]);

  const clearFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setSearchQuery("");
  };

  const statusLabel = statusFilter === "all" ? copy.gallery.allAssets : copy.status[statusFilter];
  const categoryLabel = categoryFilter === "all" ? copy.category.all : copy.category[categoryFilter];

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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          active={statusFilter === "all"}
          icon={Box}
          label={copy.metrics.total}
          value={formatCount(assets.length)}
          hint={copy.metrics.totalHint}
          tone="border-slate-200 bg-white text-slate-900"
          onClick={clearFilters}
        />
        {STATUS_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <MetricCard
              key={group.key}
              active={statusFilter === group.key}
              icon={Icon}
              label={copy.metrics[group.key]}
              value={formatCount(statusCounts[group.key])}
              hint={copy.metrics[`${group.key}Hint`]}
              tone={group.card}
              onClick={() => setStatusFilter(group.key)}
            />
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_8px_28px_rgba(15,23,42,0.12)] sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              className="relative mx-auto h-44 w-44 shrink-0 rounded-full"
              style={{ background: assets.length ? `conic-gradient(${statusSegments.join(", ")})` : "#334155" }}
            >
              <div className="absolute inset-[15px] flex flex-col items-center justify-center rounded-full bg-slate-950">
                <p className="text-4xl font-black tracking-tight">{readinessRate}%</p>
                <p className="mt-1 max-w-[110px] text-center text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{copy.healthScore}</p>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">{copy.status.eyebrow}</p>
              <h2 className="mt-2 text-xl font-black">{copy.status.title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">{copy.status.subtitle}</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {STATUS_GROUPS.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setStatusFilter(group.key)}
                    aria-pressed={statusFilter === group.key}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition hover:bg-white/[0.09]"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                      {copy.status[group.key]}
                    </span>
                    <span className="mt-1 block text-xl font-black">{formatCount(statusCounts[group.key])}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={`mt-5 flex items-center gap-3 rounded-xl border px-4 py-3 ${statusCounts.attention > 0 ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"}`}>
            {statusCounts.attention > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <p className="text-sm font-bold">{statusCounts.attention > 0 ? replaceToken(copy.needsAttention, "count", formatCount(statusCounts.attention)) : copy.healthy}</p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_5px_22px_rgba(15,23,42,0.04)] sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">{copy.category.eyebrow}</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">{copy.category.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{copy.category.subtitle}</p>
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categoryMetrics.map((category) => {
              const Icon = category.icon;
              const active = categoryFilter === category.key;
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setCategoryFilter(category.key)}
                  aria-pressed={active}
                  className={`rounded-xl border p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${active ? `${category.accent} ring-2 ring-current/10` : "border-slate-200 bg-slate-50/60 text-slate-800"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-lg border border-current/10 bg-white p-2"><Icon size={17} /></span>
                    <span className="text-2xl font-black">{formatCount(category.total)}</span>
                  </div>
                  <p className="mt-3 text-sm font-black">{copy.category[category.key]}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] opacity-70">
                    <span>{copy.category.ready} {formatCount(category.operational)}</span>
                    <span>{copy.category.risk} {formatCount(category.attention)}</span>
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              aria-pressed={categoryFilter === "all"}
              className={`rounded-xl border p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${categoryFilter === "all" ? "border-blue-200 bg-blue-50 text-blue-800 ring-2 ring-blue-700/10" : "border-slate-200 bg-white text-slate-800"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-lg border border-current/10 bg-white p-2"><Box size={17} /></span>
                <span className="text-2xl font-black">{formatCount(assets.length)}</span>
              </div>
              <p className="mt-3 text-sm font-black">{copy.category.all}</p>
              <p className="mt-2 text-[11px] opacity-70">{copy.metrics.totalHint}</p>
            </button>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_5px_22px_rgba(15,23,42,0.04)]">
        <header className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">{copy.gallery.eyebrow}</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">{copy.gallery.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{copy.gallery.subtitle}</p>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-2 lg:w-auto lg:items-end">
            <label className="relative block w-full lg:w-[360px]">
              <span className="sr-only">{copy.gallery.searchPlaceholder}</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={copy.gallery.searchPlaceholder}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                {replaceToken(replaceToken(copy.gallery.photoCoverage, "withPhoto", formatCount(photoAssetCount)), "total", formatCount(assets.length))}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                {copy.gallery.filter}: {statusLabel} · {categoryLabel}
              </span>
              {(statusFilter !== "all" || categoryFilter !== "all" || searchQuery) ? (
                <button type="button" onClick={clearFilters} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100">
                  {copy.gallery.clear}
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">
                {replaceToken(replaceToken(copy.gallery.showing, "shown", Math.min(visibleAssets.length, filteredAssets.length)), "total", formatCount(filteredAssets.length))}
              </p>
            </div>
            {visibleAssets.length ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleAssets.map((asset) => {
                    const group = getStatusGroup(asset?.status);
                    const attachments = getAttachments(asset);
                    const isSelected = selectedAsset?.id === asset.id;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setSelectedAssetId(asset.id)}
                        aria-pressed={isSelected}
                        className={`group overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg ${isSelected ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200"}`}
                      >
                        <div className="relative">
                          <AssetImage asset={asset} className="aspect-[16/10] w-full" emptyLabel={copy.gallery.noImage} />
                          <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-black shadow-sm ${group.chip}`}>{copy.status[group.key]}</span>
                          {attachments.length ? (
                            <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                              {replaceToken(copy.gallery.images, "count", attachments.length)}
                            </span>
                          ) : null}
                        </div>
                        <div className="p-3.5">
                          <p className="truncate text-sm font-black text-slate-900">{asset.asset_name || asset.asset_tag || "-"}</p>
                          <p className="mt-1 truncate text-xs font-semibold text-blue-700">{asset.asset_tag || "-"}</p>
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                            <span className="truncate">{asset.owner_name || asset.department || "-"}</span>
                            <ChevronRight size={14} className="shrink-0 transition group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {visibleAssets.length < filteredAssets.length ? (
                  <div className="mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((count) => count + 12)}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                    >
                      {replaceToken(copy.gallery.loadMore, "count", formatCount(Math.min(12, filteredAssets.length - visibleAssets.length)))}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
                <ImageOff size={34} className="text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">{copy.gallery.noResults}</p>
                <button type="button" onClick={clearFilters} className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white">{copy.gallery.clear}</button>
              </div>
            )}
          </div>

          <aside className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5 xl:border-l xl:border-t-0">
            {selectedAsset ? (
              <div className="xl:sticky xl:top-4">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <AssetImage asset={selectedAsset} className="aspect-[4/3] w-full" iconSize={42} emptyLabel={copy.gallery.noImage} />
                  {selectedAttachments[0] ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImage(selectedAttachments[0])}
                      aria-label={copy.gallery.openImage}
                      className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl bg-slate-950/80 px-3 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-slate-950"
                    >
                      <ZoomIn size={14} /> {copy.gallery.openImage}
                    </button>
                  ) : null}
                </div>

                {selectedAttachments.length > 1 ? (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {selectedAttachments.map((attachment, index) => (
                      <button
                        key={attachment.id || attachment.file_url}
                        type="button"
                        onClick={() => setPreviewImage(attachment)}
                        className="h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
                        aria-label={`${copy.gallery.openImage} ${index + 1}`}
                      >
                        <img src={attachment.file_url} alt={attachment.file_name || "Asset"} className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-slate-950">{selectedAsset.asset_name || "-"}</p>
                    <p className="mt-1 text-sm font-bold text-blue-700">{selectedAsset.asset_tag || "-"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${getStatusGroup(selectedAsset.status).chip}`}>
                    {copy.statusCodes[normalizeStatus(selectedAsset.status)] || selectedAsset.status || "-"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  {[
                    [UserRound, copy.gallery.owner, selectedAsset.owner_name],
                    [MapPin, copy.gallery.location, [selectedAsset.factory || selectedAsset.location, selectedAsset.building, selectedAsset.floor, selectedAsset.room].filter(Boolean).join(" / ")],
                    [Building2, copy.gallery.department, selectedAsset.department],
                    [HardDrive, copy.gallery.serial, selectedAsset.serial_number],
                  ].map(([Icon, label, value]) => (
                    <div key={label} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                      <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                        <p className="mt-0.5 break-words text-sm font-semibold text-slate-700">{value || "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-slate-400">{copy.gallery.updated}: {formatDateTime(selectedAsset.updated_at || selectedAsset.created_at, locale)}</p>
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-slate-400">
                <ImageOff size={34} />
                <p className="mt-3 text-sm font-semibold">{copy.gallery.noResults}</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_5px_22px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-700">{copy.licenses.eyebrow}</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">{copy.licenses.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{copy.licenses.subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [copy.licenses.records, licenses.length, "text-slate-900"],
              [copy.licenses.total, totalLicenseSeats, "text-indigo-700"],
              [copy.licenses.assigned, assignedLicenseSeats, "text-blue-700"],
              [copy.licenses.available, availableLicenseSeats, "text-emerald-700"],
            ].map(([label, value, tone]) => (
              <div key={label} className="min-w-[120px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                <p className={`mt-1 text-2xl font-black ${tone}`}>{formatCount(value)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black text-indigo-900"><KeyRound size={17} />{copy.licenses.utilization}</div>
              <span className="text-2xl font-black text-indigo-900">{licenseUtilization}%</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-500" style={{ width: `${licenseUtilization}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-semibold text-indigo-700">
              <span>{formatCount(assignedLicenseSeats)} {copy.licenses.seats}</span>
              <span>{formatCount(availableLicenseSeats)} {copy.licenses.available}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{copy.licenses.latest}</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {licenses.slice(0, 4).map((license) => {
                const total = Math.max(toNumber(license?.quantity_total), 0);
                const assigned = Math.min(Math.max(toNumber(license?.quantity_assigned), 0), total);
                return (
                  <div key={license.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{license.license_name || "-"}</p>
                      <p className="truncate text-[11px] text-slate-400">{license.vendor || license.license_type || "-"}</p>
                    </div>
                    <span className="shrink-0 text-xs font-black text-slate-700">{formatCount(assigned)}/{formatCount(total)}</span>
                  </div>
                );
              })}
              {!licenses.length ? <p className="text-sm text-slate-400">-</p> : null}
            </div>
          </div>
        </div>
      </section>

      {previewImage ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={copy.gallery.openImage}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewImage(null);
          }}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-2.5 text-white transition hover:bg-white/20"
            aria-label={copy.gallery.closeImage}
          >
            <X size={22} />
          </button>
          <div className="max-h-[90vh] max-w-6xl">
            <img src={previewImage.file_url} alt={previewImage.file_name || "Asset"} className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl" />
            <p className="mt-3 text-center text-sm font-semibold text-white/80">{previewImage.file_name || copy.gallery.photoEvidence}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
