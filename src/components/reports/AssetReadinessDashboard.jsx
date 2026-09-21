import React, { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Archive,
  Box,
  CheckCircle2,
  Clock3,
  Database,
  HardDrive,
  Image,
  Laptop,
  LayoutGrid,
  List,
  MapPin,
  Monitor,
  PackageCheck,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { getReportLocale } from "./reportLocale";

const TRANSLATIONS = {
  th: {
    eyebrow: "Asset Readiness",
    title: "สถานะและความพร้อมของทรัพย์สิน",
    description: "ภาพรวมทะเบียนทรัพย์สิน IT สำหรับตรวจสอบจำนวน การใช้งาน และอุปกรณ์ที่ต้องติดตามในหน้าเดียว",
    live: "ข้อมูลปัจจุบัน",
    refresh: "รีเฟรช",
    updated: "อัปเดตล่าสุด",
    readiness: "ความพร้อมรวม",
    operational: "พร้อมใช้งาน",
    ofAssets: "จากทรัพย์สินทั้งหมด",
    metrics: {
      total: "ทรัพย์สินทั้งหมด",
      totalHint: "ทุกรายการในทะเบียน",
      deployed: "กำลังใช้งาน",
      deployedHint: "มอบหมายและใช้งานอยู่",
      ready: "พร้อมใช้ / สำรอง",
      readyHint: "พร้อมรองรับการใช้งาน",
      attention: "ต้องติดตาม",
      attentionHint: "เสียหรืออยู่ระหว่างซ่อม",
    },
    overview: {
      title: "ภาพรวมความพร้อม",
      subtitle: "กดสถานะเพื่อกรองรายการทรัพย์สินด้านล่าง",
      distribution: "สัดส่วนตามสถานะ",
      category: "ทรัพย์สินตามประเภท",
      categoryHint: "เปรียบเทียบจำนวนอุปกรณ์ในแต่ละกลุ่ม",
      aging: "อายุเกิน 3 ปี",
      agingHint: "ควรตรวจสภาพและวางแผนทดแทน",
      evidence: "มีรูปอุปกรณ์",
      evidenceHint: "ความครบถ้วนของหลักฐาน",
      inactive: "เลิกใช้ / สูญหาย",
      inactiveHint: "รายการที่ไม่พร้อมนำกลับมาใช้",
    },
    status: {
      deployed: "กำลังใช้งาน",
      ready: "พร้อมใช้ / สำรอง",
      attention: "เสีย / กำลังซ่อม",
      inactive: "เลิกใช้ / สูญหาย",
      other: "สถานะอื่น",
    },
    statusValues: {
      in_use: "กำลังใช้งาน",
      assigned: "มอบหมายแล้ว",
      active: "ใช้งานอยู่",
      spare: "เครื่องสำรอง",
      available: "พร้อมใช้งาน",
      stock: "อยู่ในคลัง",
      ready: "พร้อมใช้งาน",
      broken: "เสีย",
      repair: "กำลังซ่อม",
      damaged: "ชำรุด",
      maintenance: "บำรุงรักษา",
      retired: "ปลดระวาง",
      lost: "สูญหาย",
      disposed: "จำหน่ายแล้ว",
      decommissioned: "เลิกใช้งาน",
    },
    registry: {
      eyebrow: "Asset Registry",
      title: "รายการทรัพย์สิน",
      subtitle: "ค้นหาและตรวจสอบสถานะล่าสุดจากทะเบียนกลาง",
      search: "ค้นหา Asset Code, ชื่ออุปกรณ์, Serial Number หรือผู้ใช้งาน",
      allStatuses: "ทุกสถานะ",
      allCategories: "ทุกประเภท",
      reset: "ล้างตัวกรอง",
      visible: "แสดง {{shown}} จาก {{total}} รายการ",
      noResults: "ไม่พบทรัพย์สินตามตัวกรอง",
      noData: "ยังไม่มีข้อมูลทรัพย์สิน",
      code: "Asset Code",
      asset: "ทรัพย์สิน",
      category: "ประเภท",
      status: "สถานะ",
      owner: "ผู้ใช้งาน / สถานที่",
      updated: "อัปเดต",
      noOwner: "ยังไม่มอบหมาย",
      noLocation: "ไม่ระบุสถานที่",
      noCategory: "ไม่ระบุประเภท",
      noPhoto: "ไม่มีรูป",
      galleryView: "มุมมองรูปภาพ",
      tableView: "มุมมองตาราง",
      photos: "{{count}} รูป",
    },
  },
  en: {
    eyebrow: "Asset Readiness",
    title: "Asset Status & Readiness",
    description: "A focused view of IT inventory, deployment readiness, and equipment requiring attention.",
    live: "Live data",
    refresh: "Refresh",
    updated: "Last updated",
    readiness: "Overall readiness",
    operational: "operational",
    ofAssets: "of all registered assets",
    metrics: {
      total: "Total assets",
      totalHint: "Every registry record",
      deployed: "In use",
      deployedHint: "Assigned and deployed",
      ready: "Ready / spare",
      readyHint: "Available for demand",
      attention: "Needs attention",
      attentionHint: "Broken or under repair",
    },
    overview: {
      title: "Readiness overview",
      subtitle: "Select a status to filter the asset registry below.",
      distribution: "Status distribution",
      category: "Assets by category",
      categoryHint: "Compare inventory volume across equipment groups.",
      aging: "Over 3 years old",
      agingHint: "Review condition and replacement plans",
      evidence: "Assets with photos",
      evidenceHint: "Evidence coverage",
      inactive: "Retired / lost",
      inactiveHint: "Assets unavailable for redeployment",
    },
    status: {
      deployed: "In use",
      ready: "Ready / spare",
      attention: "Broken / repairing",
      inactive: "Retired / lost",
      other: "Other status",
    },
    statusValues: {
      in_use: "In use",
      assigned: "Assigned",
      active: "Active",
      spare: "Spare",
      available: "Available",
      stock: "In stock",
      ready: "Ready",
      broken: "Broken",
      repair: "Under repair",
      damaged: "Damaged",
      maintenance: "Maintenance",
      retired: "Retired",
      lost: "Lost",
      disposed: "Disposed",
      decommissioned: "Decommissioned",
    },
    registry: {
      eyebrow: "Asset Registry",
      title: "Asset inventory",
      subtitle: "Search and review current status from the central registry.",
      search: "Search Asset Code, equipment, serial number, or owner",
      allStatuses: "All statuses",
      allCategories: "All categories",
      reset: "Reset filters",
      visible: "Showing {{shown}} of {{total}} assets",
      noResults: "No assets match these filters",
      noData: "No asset data yet",
      code: "Asset Code",
      asset: "Asset",
      category: "Category",
      status: "Status",
      owner: "Owner / location",
      updated: "Updated",
      noOwner: "Unassigned",
      noLocation: "No location",
      noCategory: "Uncategorized",
      noPhoto: "No photo",
      galleryView: "Photo view",
      tableView: "Table view",
      photos: "{{count}} photos",
    },
  },
  ko: {
    eyebrow: "Asset Readiness",
    title: "자산 상태 및 준비도",
    description: "IT 자산 수량, 배포 준비도, 확인이 필요한 장비를 한 화면에서 확인합니다.",
    live: "실시간 데이터",
    refresh: "새로고침",
    updated: "최근 업데이트",
    readiness: "전체 준비도",
    operational: "사용 가능",
    ofAssets: "전체 등록 자산 기준",
    metrics: {
      total: "전체 자산",
      totalHint: "등록된 모든 자산",
      deployed: "사용 중",
      deployedHint: "배정 및 사용 중",
      ready: "사용 가능 / 예비",
      readyHint: "새 수요에 배포 가능",
      attention: "확인 필요",
      attentionHint: "고장 또는 수리 중",
    },
    overview: {
      title: "준비도 개요",
      subtitle: "상태를 선택하면 아래 자산 목록이 필터링됩니다.",
      distribution: "상태별 분포",
      category: "유형별 자산",
      categoryHint: "장비 그룹별 보유 수량을 비교합니다.",
      aging: "3년 초과",
      agingHint: "상태 및 교체 계획 검토 필요",
      evidence: "사진 등록 자산",
      evidenceHint: "증빙 등록률",
      inactive: "폐기 / 분실",
      inactiveHint: "재배포할 수 없는 자산",
    },
    status: {
      deployed: "사용 중",
      ready: "사용 가능 / 예비",
      attention: "고장 / 수리 중",
      inactive: "폐기 / 분실",
      other: "기타 상태",
    },
    statusValues: {
      in_use: "사용 중",
      assigned: "배정됨",
      active: "활성",
      spare: "예비",
      available: "사용 가능",
      stock: "재고",
      ready: "준비됨",
      broken: "고장",
      repair: "수리 중",
      damaged: "손상",
      maintenance: "유지보수",
      retired: "폐기",
      lost: "분실",
      disposed: "처분됨",
      decommissioned: "사용 중지",
    },
    registry: {
      eyebrow: "Asset Registry",
      title: "자산 목록",
      subtitle: "중앙 등록부에서 현재 상태를 검색하고 확인합니다.",
      search: "Asset Code, 장비명, 일련번호 또는 사용자 검색",
      allStatuses: "모든 상태",
      allCategories: "모든 유형",
      reset: "필터 초기화",
      visible: "전체 {{total}}개 중 {{shown}}개 표시",
      noResults: "필터와 일치하는 자산이 없습니다",
      noData: "자산 데이터가 없습니다",
      code: "Asset Code",
      asset: "자산",
      category: "유형",
      status: "상태",
      owner: "사용자 / 위치",
      updated: "업데이트",
      noOwner: "미배정",
      noLocation: "위치 없음",
      noCategory: "유형 없음",
      noPhoto: "사진 없음",
      galleryView: "사진 보기",
      tableView: "표 보기",
      photos: "사진 {{count}}장",
    },
  },
};

const STATUS_GROUPS = [
  {
    key: "deployed",
    statuses: new Set(["in_use", "assigned", "active"]),
    color: "#2563eb",
    colorEnd: "#60a5fa",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    panel: "border-blue-200 bg-blue-50/70",
    icon: ShieldCheck,
  },
  {
    key: "ready",
    statuses: new Set(["spare", "available", "stock", "ready"]),
    color: "#10b981",
    colorEnd: "#2dd4bf",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    panel: "border-emerald-200 bg-emerald-50/70",
    icon: PackageCheck,
  },
  {
    key: "attention",
    statuses: new Set(["broken", "repair", "damaged", "maintenance"]),
    color: "#f59e0b",
    colorEnd: "#fb923c",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    panel: "border-amber-200 bg-amber-50/70",
    icon: Wrench,
  },
  {
    key: "inactive",
    statuses: new Set(["retired", "lost", "disposed", "decommissioned"]),
    color: "#f43f5e",
    colorEnd: "#fb7185",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    panel: "border-rose-200 bg-rose-50/70",
    icon: Archive,
  },
  {
    key: "other",
    statuses: new Set(),
    color: "#8b5cf6",
    colorEnd: "#c084fc",
    chip: "border-violet-200 bg-violet-50 text-violet-700",
    panel: "border-violet-200 bg-violet-50/70",
    icon: Box,
  },
];

const CATEGORY_COLORS = [
  ["#2563eb", "#38bdf8"],
  ["#7c3aed", "#a78bfa"],
  ["#0f766e", "#2dd4bf"],
  ["#ea580c", "#fb923c"],
  ["#db2777", "#f472b6"],
  ["#475569", "#94a3b8"],
];

const DEVICE_TYPES = [
  { icon: Laptop, keywords: ["notebook", "laptop", "macbook", "โน้ตบุ๊ก", "노트북"] },
  { icon: Monitor, keywords: ["monitor", "display", "screen", "จอ", "มอนิเตอร์", "모니터"] },
  { icon: Printer, keywords: ["printer", "print", "เครื่องพิมพ์", "พรินเตอร์", "프린터"] },
  { icon: Server, keywords: ["server", "nas", "storage", "เซิร์ฟเวอร์", "서버"] },
  { icon: Monitor, keywords: ["computer", "desktop", "workstation", "pc", "คอม", "데스크톱"] },
];

const normalizeStatus = (value) => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
const numberValue = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function getStatusGroup(status) {
  const normalized = normalizeStatus(status);
  return STATUS_GROUPS.find((group) => group.statuses.has(normalized)) || STATUS_GROUPS[STATUS_GROUPS.length - 1];
}

function getDeviceIcon(asset) {
  const searchable = [
    asset?.asset_category,
    asset?.asset_name,
    asset?.brand,
    asset?.model,
  ].filter(Boolean).join(" ").toLowerCase();
  return DEVICE_TYPES.find((type) => type.keywords.some((keyword) => searchable.includes(keyword)))?.icon || HardDrive;
}

function getAttachments(asset) {
  return (Array.isArray(asset?.it_asset_attachments) ? asset.it_asset_attachments : [])
    .filter((item) => item?.file_url)
    .sort((left, right) => new Date(right?.created_at || 0) - new Date(left?.created_at || 0));
}

function getLocation(asset, fallback) {
  if (String(asset?.location || "").trim()) return asset.location;
  const parts = [asset?.factory, asset?.building, asset?.floor, asset?.room]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(" / ") : fallback;
}

function getAssetName(asset) {
  return asset?.asset_name || asset?.asset_tag || "-";
}

function formatDate(value, locale) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function AssetThumb({ asset, noPhoto }) {
  const attachment = getAttachments(asset)[0];
  const DeviceIcon = getDeviceIcon(asset);

  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-slate-100 text-[#2b59b0]">
      <DeviceIcon size={18} />
      {attachment ? (
        <img
          src={attachment.file_url}
          alt={attachment.file_name || getAssetName(asset)}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
      ) : <span className="sr-only">{noPhoto}</span>}
    </span>
  );
}

function AssetPreview({ asset, noPhoto, photoLabel }) {
  const attachments = getAttachments(asset);
  const DeviceIcon = getDeviceIcon(asset);

  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-cyan-100">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white bg-white/80 text-[#2b59b0] shadow-sm">
          <DeviceIcon size={26} strokeWidth={1.8} />
        </span>
        <span className="text-[9px] font-black uppercase tracking-[0.12em]">{noPhoto}</span>
      </div>
      {attachments[0] ? (
        <img
          src={attachments[0].file_url}
          alt={attachments[0].file_name || getAssetName(asset)}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
      ) : null}
      {attachments.length ? (
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-slate-950/75 px-2.5 py-1 text-[9px] font-bold text-white shadow-sm backdrop-blur">
          <Image size={10} />
          {photoLabel(attachments.length)}
        </span>
      ) : null}
    </div>
  );
}

function MetricButton({ icon: Icon, label, value, helper, tone, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "group cursor-pointer rounded-2xl border bg-white p-4 text-left shadow-[0_8px_24px_-20px_rgba(15,23,42,0.7)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-22px_rgba(37,99,235,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:p-5",
        active ? tone.panel : "border-slate-200 hover:border-blue-200",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-600 sm:text-sm">{label}</p>
          <p className="mt-1.5 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-xs">{helper}</p>
        </div>
        <span className={clsx("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", tone.chip)}>
          <Icon size={18} />
        </span>
      </div>
    </button>
  );
}

function ChartTooltip({ active, payload, formatter }) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const item = point.payload || {};

  return (
    <div className="min-w-[132px] rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_14px_35px_-14px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || point.color }} />
        <p className="text-[11px] font-bold text-slate-600">{item.label || point.name || "-"}</p>
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-4">
        <strong className="text-xl font-black tracking-tight text-slate-950">{formatter.format(numberValue(point.value))}</strong>
        {Number.isFinite(item.percentage) ? <span className="pb-0.5 text-[10px] font-bold text-slate-400">{item.percentage}%</span> : null}
      </div>
    </div>
  );
}

export default function AssetReadinessDashboard({ data, onRefresh, loading }) {
  const { language, tt } = useScopedI18n(TRANSLATIONS);
  const locale = getReportLocale(language);
  const formatter = new Intl.NumberFormat(locale);
  const assets = Array.isArray(data?.assetRows) ? data.assetRows : [];
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("gallery");
  const registryRef = useRef(null);

  const statusRows = useMemo(() => {
    const counts = Object.fromEntries(STATUS_GROUPS.map((group) => [group.key, 0]));
    assets.forEach((asset) => {
      counts[getStatusGroup(asset?.status).key] += 1;
    });
    return STATUS_GROUPS.map((group) => ({ ...group, value: counts[group.key] }));
  }, [assets]);

  const statusCounts = Object.fromEntries(statusRows.map((group) => [group.key, group.value]));
  const operationalCount = numberValue(statusCounts.deployed) + numberValue(statusCounts.ready);
  const readinessRate = assets.length ? Math.round((operationalCount / assets.length) * 100) : 0;
  const photoCount = assets.filter((asset) => getAttachments(asset).length > 0).length;
  const riskyCount = numberValue(data?.assetSummary?.riskyAssets);

  const categories = useMemo(() => {
    const counts = new Map();
    assets.forEach((asset) => {
      const label = String(asset?.asset_category || "").trim();
      if (label) counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, locale));
  }, [assets, locale]);

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return assets.filter((asset) => {
      const category = String(asset?.asset_category || "").trim();
      const matchesStatus = statusFilter === "all" || getStatusGroup(asset?.status).key === statusFilter;
      const matchesCategory = categoryFilter === "all" || category === categoryFilter;
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
  }, [assets, categoryFilter, searchQuery, statusFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };
  const filtersActive = Boolean(searchQuery || statusFilter !== "all" || categoryFilter !== "all");
  const statusChartRows = statusRows
    .filter((group) => group.value > 0)
    .map((group) => ({
      ...group,
      label: tt("status." + group.key),
      percentage: assets.length ? Math.round((group.value / assets.length) * 100) : 0,
    }));
  const categoryChartRows = categories.slice(0, 6).map((category, index) => ({
    ...category,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length][0],
    colorEnd: CATEGORY_COLORS[index % CATEGORY_COLORS.length][1],
  }));

  const formatStatus = (status) => {
    const normalized = normalizeStatus(status);
    const translated = tt("statusValues." + normalized);
    return translated === "statusValues." + normalized ? (status || tt("status.other")) : translated;
  };

  const selectStatus = (key) => {
    setStatusFilter((current) => current === key ? "all" : key);
  };

  const showMetricAssets = (key) => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter(key);
    setViewMode("gallery");
    window.requestAnimationFrame(() => {
      registryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white shadow-[0_18px_50px_-40px_rgba(30,64,175,0.7)]">
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-0 h-40 w-40 rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="relative flex flex-col gap-4 bg-gradient-to-br from-white via-blue-50/40 to-cyan-50/60 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2b59b0] to-[#173b80] text-white shadow-[0_14px_30px_-16px_rgba(43,89,176,0.95)]">
              <HardDrive size={22} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
            </span>
            <div className="min-w-0 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2b59b0]">{tt("eyebrow")}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {tt("live")}
                </span>
              </div>
              <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{tt("title")}</h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 sm:text-sm">{tt("description")}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <p className="hidden text-right text-[10px] leading-4 text-slate-500 sm:block">
              <span className="block font-bold text-slate-700">{tt("updated")}</span>
              {new Date(data?.generatedAt || Date.now()).toLocaleString(locale)}
            </p>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2b59b0] px-4 text-xs font-bold text-white shadow-[0_10px_24px_-15px_rgba(43,89,176,0.9)] transition hover:-translate-y-0.5 hover:bg-[#244a95] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {tt("refresh")}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricButton
          icon={Database}
          label={tt("metrics.total")}
          value={formatter.format(assets.length)}
          helper={tt("metrics.totalHint")}
          tone={STATUS_GROUPS[0]}
          active={statusFilter === "all"}
          onClick={() => showMetricAssets("all")}
        />
        <MetricButton
          icon={ShieldCheck}
          label={tt("metrics.deployed")}
          value={formatter.format(statusCounts.deployed)}
          helper={tt("metrics.deployedHint")}
          tone={STATUS_GROUPS[0]}
          active={statusFilter === "deployed"}
          onClick={() => showMetricAssets("deployed")}
        />
        <MetricButton
          icon={PackageCheck}
          label={tt("metrics.ready")}
          value={formatter.format(statusCounts.ready)}
          helper={tt("metrics.readyHint")}
          tone={STATUS_GROUPS[1]}
          active={statusFilter === "ready"}
          onClick={() => showMetricAssets("ready")}
        />
        <MetricButton
          icon={statusCounts.attention ? AlertTriangle : CheckCircle2}
          label={tt("metrics.attention")}
          value={formatter.format(statusCounts.attention)}
          helper={tt("metrics.attentionHint")}
          tone={STATUS_GROUPS[2]}
          active={statusFilter === "attention"}
          onClick={() => showMetricAssets("attention")}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(370px,0.92fr)_minmax(0,1.08fr)]">
        <article className="relative overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_18px_45px_-36px_rgba(37,99,235,0.55)]">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" />
          <div className="pointer-events-none absolute -left-16 top-20 h-40 w-40 rounded-full bg-blue-100/55 blur-3xl" />
          <header className="relative border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-black text-slate-950">{tt("overview.title")}</h2>
            <p className="mt-1 text-xs text-slate-500">{tt("overview.subtitle")}</p>
          </header>
          <div className="relative p-5">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-stretch">
              <div className="relative h-[250px] w-full max-w-[270px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {STATUS_GROUPS.map((group) => (
                        <linearGradient key={group.key} id={"asset-status-" + group.key} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={group.color} />
                          <stop offset="100%" stopColor={group.colorEnd} />
                        </linearGradient>
                      ))}
                      <filter id="asset-pie-shadow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#0f172a" floodOpacity="0.12" />
                      </filter>
                    </defs>
                    <Pie
                      data={statusChartRows}
                      cx="50%"
                      cy="50%"
                      innerRadius={67}
                      outerRadius={99}
                      paddingAngle={3}
                      cornerRadius={9}
                      dataKey="value"
                      nameKey="label"
                      stroke="#ffffff"
                      strokeWidth={3}
                      animationDuration={750}
                      style={{ filter: "url(#asset-pie-shadow)" }}
                    >
                      {statusChartRows.map((group) => (
                        <Cell
                          key={group.key}
                          fill={"url(#asset-status-" + group.key + ")"}
                          opacity={statusFilter === "all" || statusFilter === group.key ? 1 : 0.3}
                          cursor="pointer"
                          onClick={() => selectStatus(group.key)}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={formatter} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black tracking-tight text-slate-950">{formatter.format(readinessRate)}%</span>
                  <span className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{tt("readiness")}</span>
                </div>
              </div>

              <div className="w-full min-w-0 py-1">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{tt("overview.distribution")}</p>
                <div className="mt-2 space-y-1.5">
                  {statusRows.map((group) => {
                    const percentage = assets.length ? Math.round((group.value / assets.length) * 100) : 0;
                    return (
                      <button
                        key={group.key}
                        type="button"
                        onClick={() => selectStatus(group.key)}
                        aria-pressed={statusFilter === group.key}
                        className={clsx(
                          "group w-full rounded-xl border px-3 py-2 text-left transition",
                          statusFilter === group.key ? group.panel : "border-transparent hover:border-slate-200 hover:bg-slate-50/80",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: group.color }} />
                          <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-600">{tt("status." + group.key)}</span>
                          <strong className="text-xs text-slate-900">{formatter.format(group.value)}</strong>
                          <span className="w-7 text-right text-[9px] font-bold text-slate-400">{percentage}%</span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: percentage + "%", background: "linear-gradient(90deg, " + group.color + ", " + group.colorEnd + ")" }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-black text-emerald-800">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 shadow-sm"><CheckCircle2 size={15} /></span>
                  {tt("operational")}
                </span>
                <strong className="text-lg text-emerald-800">{formatter.format(operationalCount)} / {formatter.format(assets.length)}</strong>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white shadow-inner">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700" style={{ width: readinessRate + "%" }} />
              </div>
              <p className="mt-2 text-[10px] text-emerald-700/80">{tt("ofAssets")}</p>
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_18px_45px_-36px_rgba(124,58,237,0.45)]">
          <div className="h-1 bg-gradient-to-r from-violet-600 via-fuchsia-400 to-orange-400" />
          <div className="pointer-events-none absolute -right-14 top-14 h-44 w-44 rounded-full bg-violet-100/55 blur-3xl" />
          <header className="relative flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-50 text-violet-700 shadow-sm"><LayoutGrid size={17} /></span>
            <div>
              <h2 className="text-base font-black text-slate-950">{tt("overview.category")}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{tt("overview.categoryHint")}</p>
            </div>
          </header>
          <div className="relative p-5">
            {categoryChartRows.length ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartRows} layout="vertical" margin={{ top: 8, right: 34, bottom: 6, left: 8 }}>
                    <defs>
                      {categoryChartRows.map((category, index) => (
                        <linearGradient key={category.label} id={"asset-category-" + index} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={category.color} />
                          <stop offset="100%" stopColor={category.colorEnd} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 4" />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      width={96}
                      tick={{ fill: "#475569", fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip cursor={{ fill: "#eff6ff", radius: 10 }} content={<ChartTooltip formatter={formatter} />} />
                    <Bar dataKey="value" barSize={18} radius={[0, 9, 9, 0]} background={{ fill: "#f1f5f9", radius: 9 }} animationDuration={750}>
                      {categoryChartRows.map((category, index) => (
                        <Cell
                          key={category.label}
                          fill={"url(#asset-category-" + index + ")"}
                          opacity={categoryFilter === "all" || categoryFilter === category.label ? 1 : 0.28}
                          cursor="pointer"
                          onClick={() => setCategoryFilter((current) => current === category.label ? "all" : category.label)}
                        />
                      ))}
                      <LabelList dataKey="value" position="right" formatter={(value) => formatter.format(value)} style={{ fill: "#334155", fontSize: 10, fontWeight: 800 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="py-24 text-center text-sm text-slate-400">{tt("registry.noData")}</p>}

            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { icon: Clock3, label: tt("overview.aging"), helper: tt("overview.agingHint"), value: riskyCount, className: "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700" },
                { icon: Image, label: tt("overview.evidence"), helper: tt("overview.evidenceHint"), value: photoCount, className: "border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 text-sky-700" },
                { icon: Archive, label: tt("overview.inactive"), helper: tt("overview.inactiveHint"), value: statusCounts.inactive, className: "border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-700" },
              ].map((item) => {
                const SignalIcon = item.icon;
                return (
                  <div key={item.label} className={clsx("min-w-0 rounded-xl border p-3 shadow-[0_8px_20px_-18px_currentColor]", item.className)} title={item.helper}>
                    <SignalIcon size={14} />
                    <p className="mt-2 truncate text-[10px] font-bold">{item.label}</p>
                    <p className="mt-0.5 text-xl font-black">{formatter.format(item.value)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </article>
      </section>

      <section ref={registryRef} className="scroll-mt-4 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_16px_42px_-36px_rgba(15,23,42,0.75)]">
        <header className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-white to-blue-50/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#2b59b0]">{tt("registry.eyebrow")}</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{tt("registry.title")}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{tt("registry.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
              <Database size={12} />
              {tt("registry.visible", { shown: formatter.format(filteredAssets.length), total: formatter.format(assets.length) })}
            </span>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("gallery")}
                title={tt("registry.galleryView")}
                aria-label={tt("registry.galleryView")}
                aria-pressed={viewMode === "gallery"}
                className={clsx(
                  "inline-flex h-7 w-8 items-center justify-center rounded-lg transition",
                  viewMode === "gallery" ? "bg-[#2b59b0] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100",
                )}
              >
                <LayoutGrid size={13} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title={tt("registry.tableView")}
                aria-label={tt("registry.tableView")}
                aria-pressed={viewMode === "table"}
                className={clsx(
                  "inline-flex h-7 w-8 items-center justify-center rounded-lg transition",
                  viewMode === "table" ? "bg-[#2b59b0] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100",
                )}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-slate-50/70 p-3 sm:p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 md:grid-cols-[minmax(280px,1fr)_180px_190px_40px]">
            <label className="relative col-span-2 md:col-span-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={tt("registry.search")}
                aria-label={tt("registry.search")}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label={tt("registry.allStatuses")}
              className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">{tt("registry.allStatuses")}</option>
              {STATUS_GROUPS.map((group) => <option key={group.key} value={group.key}>{tt("status." + group.key)}</option>)}
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label={tt("registry.allCategories")}
              className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">{tt("registry.allCategories")}</option>
              {categories.map((category) => <option key={category.label} value={category.label}>{category.label}</option>)}
            </select>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!filtersActive}
              title={tt("registry.reset")}
              aria-label={tt("registry.reset")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {filteredAssets.length ? (
          viewMode === "gallery" ? (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredAssets.map((asset) => {
                const group = getStatusGroup(asset?.status);
                return (
                  <article
                    key={"gallery-" + asset.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_22px_-18px_rgba(15,23,42,0.65)] transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_20px_38px_-22px_rgba(37,99,235,0.38)]"
                  >
                    <div className="relative">
                      <AssetPreview
                        asset={asset}
                        noPhoto={tt("registry.noPhoto")}
                        photoLabel={(count) => tt("registry.photos", { count: formatter.format(count) })}
                      />
                      <span className={clsx("absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[9px] font-black shadow-sm backdrop-blur", group.chip)}>
                        {formatStatus(asset.status)}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-slate-950" title={getAssetName(asset)}>{getAssetName(asset)}</h3>
                          <p className="mt-1 truncate font-mono text-[11px] font-bold text-[#2b59b0]">{asset.asset_tag || "-"}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-600">
                          {asset.asset_category || tt("registry.noCategory")}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-[10px] text-slate-500" title={[asset.brand, asset.model, asset.serial_number].filter(Boolean).join(" • ")}>
                        {[asset.brand, asset.model, asset.serial_number].filter(Boolean).join(" • ") || "-"}
                      </p>
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
                        <p className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><UserRound size={12} /></span>
                          <span className="truncate">{asset.owner_name || tt("registry.noOwner")}</span>
                        </p>
                        <p className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><MapPin size={12} /></span>
                          <span className="truncate">{getLocation(asset, tt("registry.noLocation"))}</span>
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[9px] font-semibold text-slate-400">
                        <span>{tt("registry.updated")}</span>
                        <span>{formatDate(asset.updated_at || asset.created_at, locale)}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
          <>
            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredAssets.map((asset) => {
                const group = getStatusGroup(asset?.status);
                return (
                  <article key={asset.id} className="p-3.5 transition hover:bg-blue-50/40">
                    <div className="flex items-start gap-3">
                      <AssetThumb asset={asset} noPhoto={tt("registry.noPhoto")} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-black text-slate-900">{getAssetName(asset)}</h3>
                            <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-[#2b59b0]">{asset.asset_tag || "-"}</p>
                          </div>
                          <span className={clsx("shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold", group.chip)}>{formatStatus(asset.status)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-600">{asset.asset_category || tt("registry.noCategory")}</span>
                          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[9px] text-slate-500"><UserRound size={10} /><span className="truncate">{asset.owner_name || tt("registry.noOwner")}</span></span>
                        </div>
                        <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500"><MapPin size={11} className="shrink-0" /><span className="truncate">{getLocation(asset, tt("registry.noLocation"))}</span></p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden max-h-[620px] overflow-auto lg:block">
              <table className="w-full min-w-[900px] table-fixed text-left text-xs">
                <colgroup>
                  <col className="w-[128px]" />
                  <col className="w-[250px]" />
                  <col className="w-[120px]" />
                  <col className="w-[130px]" />
                  <col />
                  <col className="w-[118px]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.06em] text-slate-500">
                    <th className="px-4 py-3">{tt("registry.code")}</th>
                    <th className="px-4 py-3">{tt("registry.asset")}</th>
                    <th className="px-4 py-3">{tt("registry.category")}</th>
                    <th className="px-4 py-3">{tt("registry.status")}</th>
                    <th className="px-4 py-3">{tt("registry.owner")}</th>
                    <th className="px-4 py-3">{tt("registry.updated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset) => {
                    const group = getStatusGroup(asset?.status);
                    return (
                      <tr key={asset.id} className="border-b border-slate-100 align-middle transition hover:bg-blue-50/45">
                        <td className="truncate px-4 py-3 font-mono text-[11px] font-bold text-[#2b59b0]" title={asset.asset_tag || "-"}>{asset.asset_tag || "-"}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <AssetThumb asset={asset} noPhoto={tt("registry.noPhoto")} />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-900" title={getAssetName(asset)}>{getAssetName(asset)}</p>
                              <p className="mt-0.5 truncate text-[10px] text-slate-500" title={[asset.brand, asset.model, asset.serial_number].filter(Boolean).join(" • ")}>
                                {[asset.brand, asset.model, asset.serial_number].filter(Boolean).join(" • ") || "-"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="inline-flex max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">{asset.asset_category || tt("registry.noCategory")}</span></td>
                        <td className="px-4 py-3"><span className={clsx("inline-flex rounded-full border px-2 py-1 text-[10px] font-bold", group.chip)}>{formatStatus(asset.status)}</span></td>
                        <td className="px-4 py-3">
                          <p className="truncate font-semibold text-slate-700" title={asset.owner_name || tt("registry.noOwner")}>{asset.owner_name || tt("registry.noOwner")}</p>
                          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-slate-500"><MapPin size={10} className="shrink-0" /><span className="truncate">{getLocation(asset, tt("registry.noLocation"))}</span></p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[10px] font-semibold text-slate-500">{formatDate(asset.updated_at || asset.created_at, locale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
          )
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><HardDrive size={25} /></span>
            <p className="mt-3 text-sm font-bold text-slate-600">{filtersActive ? tt("registry.noResults") : tt("registry.noData")}</p>
            {filtersActive ? (
              <button type="button" onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"><RotateCcw size={13} />{tt("registry.reset")}</button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
