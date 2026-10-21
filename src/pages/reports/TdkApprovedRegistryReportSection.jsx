import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  CalendarDays,
  CarFront,
  ChevronDown,
  ChevronRight,
  Download,
  FileClock,
  Loader2,
  PencilLine,
  RefreshCw,
  Search,
  ShieldCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { supabase } from "../../lib/supabaseClient";
import {
  fetchTdkApprovedRegistry,
  fetchTdkApprovedRegistryChanges,
  fetchTdkApprovedRegistryImports,
  isTdkApprovedRegistrySchemaError,
} from "../it-dashboard/services/tdkApprovedRegistryService";
import { downloadTdkApprovedMonthlyReport } from "./tdkApprovedRegistryExcelExport";

const COPY = {
  th: {
    heading: "สถานะทะเบียนรถหลัก TDK APPROVED",
    subtitle: "ภาพรวมรถหลักที่ใช้งานอยู่ และจำนวนทะเบียนที่เพิ่ม ถอดออก หรือแก้ไขในแต่ละเดือน",
    month: "เดือนที่ต้องการดู",
    refresh: "รีเฟรช",
    export: "Export รายงานทะเบียน",
    exportHint: "เลือกภาษารายงาน",
    exportThai: "ภาษาไทย (TH)",
    exportKorean: "ภาษาเกาหลี (KO)",
    exportEnglish: "English (EN)",
    active: "รถหลักที่ใช้งานปัจจุบัน",
    added: "เพิ่ม / กลับมาใช้ในเดือนที่เลือก",
    removed: "ถอดออกในเดือนที่เลือก",
    updated: "แก้ไขข้อมูลในเดือนที่เลือก",
    companies: "บริษัทในทะเบียนปัจจุบัน",
    trendTitle: "การเปลี่ยนแปลงทะเบียนย้อนหลัง 6 เดือน",
    trendHint: "นับจากประวัติทะเบียนหลัก ไม่ใช่จำนวนรถที่ผ่านประตู",
    additions: "เพิ่ม / กลับมาใช้",
    removals: "ถอดออก",
    updates: "แก้ไขข้อมูล",
    changesTitle: "ประวัติการเปลี่ยนแปลงเดือนที่เลือก",
    changesCount: "{{count}} รายการ",
    noChanges: "เดือนที่เลือกยังไม่มีการเพิ่ม ถอดออก หรือแก้ไขทะเบียน",
    registryTitle: "ทะเบียนรถหลักที่ใช้งานอยู่",
    registryHint: "ข้อมูลล่าสุดสำหรับผู้บริหาร",
    search: "ค้นหาทะเบียน ชื่อ หรือบริษัท...",
    noRegistry: "ยังไม่มีทะเบียนรถหลักที่ใช้งานอยู่",
    plate: "ทะเบียน",
    person: "ชื่อ / ผู้ติดต่อ",
    company: "บริษัท",
    purpose: "วัตถุประสงค์",
    since: "ใช้งานตั้งแต่",
    changeDate: "วันที่",
    changeAction: "รายการ",
    type: { ADDED: "เพิ่มใหม่", REACTIVATED: "กลับมาใช้", REMOVED: "ถอดออก", UPDATED: "แก้ไขข้อมูล", BASELINE: "ข้อมูลตั้งต้น" },
    loadError: "โหลดรายงานทะเบียนรถหลักไม่สำเร็จ",
    exportSuccess: "สร้างรายงานทะเบียนรถสำเร็จ",
    setup: "กรุณารันไฟล์ SQL Gatepass เวอร์ชันล่าสุดก่อนใช้งานรายงานทะเบียนรถหลัก",
    journeyEyebrow: "เส้นทางทะเบียนหลัก",
    journeyTitle: "จากข้อมูลตั้งต้นถึงรถที่ใช้งานปัจจุบัน",
    baselineStep: "1. ข้อมูลตั้งต้นอย่างเป็นทางการ",
    baselineVehicles: "{{count}} คัน",
    baselineDate: "ตั้งต้นเมื่อ {{date}}",
    additionsStep: "2. เพิ่มหลังวันตั้งต้น",
    additionsVehicles: "+{{count}} คัน",
    additionsHint: "กดเพื่อดูเฉพาะรถที่เพิ่มเข้ามา",
    currentStep: "3. ทะเบียนที่ใช้งานปัจจุบัน",
    currentVehicles: "{{count}} คัน",
    addedListTitle: "รถที่เพิ่มหลังข้อมูลตั้งต้น",
    addedListHint: "เรียงจากรายการที่เพิ่มล่าสุด",
    noAdditions: "ยังไม่มีรถเพิ่มหลังข้อมูลตั้งต้น",
    quickAll: "รถปัจจุบันทั้งหมด",
    quickAdded: "เพิ่มหลังตั้งต้น",
    masterEyebrow: "ทะเบียนรถหลัก",
    trendEyebrow: "ภาพรวมรายเดือน",
    changesEyebrow: "ประวัติย้อนหลัง",
    currentEyebrow: "รายการรถปัจจุบัน",
    summaryTitle: "สรุปทะเบียนรถ",
    clickDetail: "กดเพื่อดูรายละเอียด",
    close: "ปิด",
    detailSearch: "ค้นหาทะเบียน ชื่อ หรือบริษัท...",
    detailCount: "{{count}} รายการ",
    detailDate: "วันที่เกี่ยวข้อง",
    detailStatus: "สถานะ",
    noDetailData: "ไม่มีข้อมูลที่เกี่ยวข้อง",
    baselineListHint: "ทะเบียนจากข้อมูลตั้งต้นอย่างเป็นทางการ",
    activeListHint: "ทะเบียนรถหลักที่ใช้งานอยู่ในปัจจุบัน",
    companyListHint: "บริษัทและทะเบียนรถที่ใช้งานอยู่ในปัจจุบัน",
    companyVehicles: "{{count}} คัน",
  },
  en: {
    heading: "TDK APPROVED Master Vehicle Status",
    subtitle: "Current active fleet and monthly additions, removals, and detail updates.",
    month: "Reporting month",
    refresh: "Refresh",
    export: "Export registry report",
    exportHint: "Choose report language",
    exportThai: "Thai (TH)",
    exportKorean: "Korean (KO)",
    exportEnglish: "English (EN)",
    active: "Current active fleet",
    added: "Added / reactivated this month",
    removed: "Removed this month",
    updated: "Details updated this month",
    companies: "Companies in current registry",
    trendTitle: "Six-month registry changes",
    trendHint: "Based on master-registry history, not gate entry volume.",
    additions: "Added / reactivated",
    removals: "Removed",
    updates: "Details updated",
    changesTitle: "Changes in selected month",
    changesCount: "{{count}} changes",
    noChanges: "No vehicles were added, removed, or updated this month.",
    registryTitle: "Current active master registry",
    registryHint: "Latest executive view",
    search: "Search plate, person, or company...",
    noRegistry: "No active master vehicles yet.",
    plate: "Plate",
    person: "Name / contact",
    company: "Company",
    purpose: "Purpose",
    since: "Active since",
    changeDate: "Date",
    changeAction: "Change",
    type: { ADDED: "Added", REACTIVATED: "Reactivated", REMOVED: "Removed", UPDATED: "Updated", BASELINE: "Baseline" },
    loadError: "Unable to load the master vehicle report",
    exportSuccess: "Registry report created",
    setup: "Run the latest Gatepass SQL file before using the master registry report.",
    journeyEyebrow: "Registry journey",
    journeyTitle: "From the official baseline to the current active fleet",
    baselineStep: "1. Official baseline",
    baselineVehicles: "{{count}} vehicles",
    baselineDate: "Established on {{date}}",
    additionsStep: "2. Added after baseline",
    additionsVehicles: "+{{count}} vehicles",
    additionsHint: "Select to view only later additions",
    currentStep: "3. Current active registry",
    currentVehicles: "{{count}} vehicles",
    addedListTitle: "Vehicles added after baseline",
    addedListHint: "Newest additions first",
    noAdditions: "No vehicles have been added after the baseline.",
    quickAll: "All current vehicles",
    quickAdded: "Added after baseline",
    masterEyebrow: "Master registry",
    trendEyebrow: "Month over month",
    changesEyebrow: "Change log",
    currentEyebrow: "Current master list",
    summaryTitle: "Registry summary",
    clickDetail: "Select to view details",
    close: "Close",
    detailSearch: "Search plate, name, or company...",
    detailCount: "{{count}} records",
    detailDate: "Related date",
    detailStatus: "Status",
    noDetailData: "No related records",
    baselineListHint: "Vehicles in the official baseline",
    activeListHint: "Vehicles currently active in the master registry",
    companyListHint: "Companies and their currently active vehicles",
    companyVehicles: "{{count}} vehicles",
  },
  ko: {
    heading: "TDK APPROVED 차량 원장 현황",
    subtitle: "현재 운행 중인 등록 차량과 월별 추가, 해제 및 정보 변경 내역을 한눈에 확인합니다.",
    month: "조회 월",
    refresh: "새로고침",
    export: "차량 원장 보고서 내보내기",
    exportHint: "보고서 언어 선택",
    exportThai: "태국어 (TH)",
    exportKorean: "한국어 (KO)",
    exportEnglish: "영어 (EN)",
    active: "현재 운행 차량",
    added: "선택 월 추가·재등록",
    removed: "선택 월 등록 해제",
    updated: "선택 월 정보 변경",
    companies: "현재 등록 업체",
    trendTitle: "최근 6개월 차량 원장 변동",
    trendHint: "Gatepass 통과 차량 수가 아닌 차량 원장 변경 이력을 기준으로 집계합니다.",
    additions: "추가·재등록",
    removals: "등록 해제",
    updates: "정보 변경",
    changesTitle: "선택 월 변경 이력",
    changesCount: "{{count}}건",
    noChanges: "선택한 월에는 차량 추가, 등록 해제 또는 정보 변경 내역이 없습니다.",
    registryTitle: "현재 운행 차량 원장",
    registryHint: "경영진용 최신 현황",
    search: "차량 번호, 이름 또는 업체 검색...",
    noRegistry: "현재 운행 중인 등록 차량이 없습니다.",
    plate: "차량 번호",
    person: "이름 / 연락 담당자",
    company: "업체",
    purpose: "방문 목적",
    since: "등록 시작일",
    changeDate: "날짜",
    changeAction: "변경 내용",
    type: { ADDED: "신규 추가", REACTIVATED: "재등록", REMOVED: "등록 해제", UPDATED: "정보 변경", BASELINE: "기준 자료" },
    loadError: "차량 원장 보고서를 불러오지 못했습니다.",
    exportSuccess: "차량 원장 보고서를 생성했습니다.",
    setup: "차량 원장 보고서를 사용하기 전에 최신 Gatepass SQL 파일을 실행해 주세요.",
    journeyEyebrow: "차량 원장 흐름",
    journeyTitle: "공식 기준 자료부터 현재 운행 차량까지",
    baselineStep: "1. 공식 기준 자료",
    baselineVehicles: "{{count}}대",
    baselineDate: "{{date}} 기준",
    additionsStep: "2. 기준일 이후 추가",
    additionsVehicles: "+{{count}}대",
    additionsHint: "클릭하면 이후 추가된 차량만 표시합니다.",
    currentStep: "3. 현재 운행 차량",
    currentVehicles: "{{count}}대",
    addedListTitle: "기준 자료 이후 추가 차량",
    addedListHint: "최근 추가 순으로 표시",
    noAdditions: "기준 자료 이후 추가된 차량이 없습니다.",
    quickAll: "현재 차량 전체",
    quickAdded: "기준일 이후 추가",
    masterEyebrow: "차량 원장",
    trendEyebrow: "월별 변동",
    changesEyebrow: "변경 이력",
    currentEyebrow: "현재 차량 목록",
    summaryTitle: "차량 원장 요약",
    clickDetail: "클릭하여 상세 보기",
    close: "닫기",
    detailSearch: "차량 번호, 이름 또는 업체 검색...",
    detailCount: "{{count}}건",
    detailDate: "관련 날짜",
    detailStatus: "상태",
    noDetailData: "관련 데이터가 없습니다",
    baselineListHint: "공식 기준 자료의 등록 차량",
    activeListHint: "현재 운행 중인 차량 원장",
    companyListHint: "현재 등록 업체 및 운행 차량",
    companyVehicles: "{{count}}대",
  },
};

const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKey = (date) => dateKey(date).slice(0, 7);
const shiftMonth = (month, amount) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthKey(new Date(year, monthNumber - 1 + amount, 1));
};
const monthBounds = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return { from: `${month}-01`, to: `${month}-${pad(new Date(year, monthNumber, 0).getDate())}` };
};
const formatReportDate = (value, formatter) => {
  if (!value) return "-";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "-" : formatter.format(date);
};
const OFFICIAL_BASELINE_DATE = "2026-09-08";
const OFFICIAL_BASELINE_COUNT = 39;

const TYPE_STYLE = {
  ACTIVE: "bg-slate-100 text-slate-700 border-slate-200",
  ADDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REACTIVATED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  REMOVED: "bg-rose-50 text-rose-700 border-rose-200",
  UPDATED: "bg-amber-50 text-amber-800 border-amber-200",
  BASELINE: "bg-blue-50 text-blue-700 border-blue-200",
};

function SummaryCard({ icon: Icon, label, value, hint, tone, onClick, active = false }) {
  const accents = {
    blue: "bg-blue-50 text-[#214f91]",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-slate-100 text-slate-700",
  };
  return <button type="button" onClick={onClick} aria-pressed={active} className={`group flex min-h-[78px] w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-[0_3px_14px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${active ? "border-blue-300 bg-blue-50/50 ring-2 ring-blue-500/20" : ""}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accents[tone] || accents.blue}`}><Icon size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-slate-500" title={label}>{label}</span><span className="mt-0.5 block text-xl font-bold leading-none tracking-tight text-slate-950">{value}</span><span className="mt-1 block truncate text-[9px] text-slate-400" title={hint}>{hint}</span></span><ChevronRight size={14} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" /></button>;
}

function RegistryQuickFilters({ value, onChange, allCount, addedCount, tt }) {
  const filters = [
    { id: "ALL", label: tt("quickAll"), count: allCount },
    { id: "ADDED", label: tt("quickAdded"), count: addedCount },
  ];
  return <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1" role="group" aria-label="Registry quick filters">{filters.map((filter) => <button key={filter.id} type="button" onClick={() => onChange(filter.id)} aria-pressed={value === filter.id} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${value === filter.id ? filter.id === "ADDED" ? "bg-white text-emerald-700 shadow-sm" : "bg-white text-[#173f70] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{filter.label}<span className={`ml-1.5 ${value === filter.id ? "text-inherit" : "text-slate-400"}`}>{filter.count.toLocaleString()}</span></button>)}</div>;
}

export default function TdkApprovedRegistryReportSection() {
  const { language, tt } = useScopedI18n(COPY);
  const realtimeRef = useRef(null);
  const exportMenuRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [registry, setRegistry] = useState([]);
  const [changes, setChanges] = useState([]);
  const [imports, setImports] = useState([]);
  const [search, setSearch] = useState("");
  const [registryFilter, setRegistryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState("");
  const [detailKey, setDetailKey] = useState("");
  const [detailSearch, setDetailSearch] = useState("");

  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(language === "th" ? "th-TH" : language === "ko" ? "ko-KR" : "en-GB", { month: "short", year: "2-digit" }), [language]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(language === "th" ? "th-TH" : language === "ko" ? "ko-KR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }), [language]);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const rangeStart = OFFICIAL_BASELINE_DATE;
      const currentMonth = monthKey(new Date());
      const historyEndMonth = selectedMonth > currentMonth ? selectedMonth : currentMonth;
      const rangeEnd = monthBounds(historyEndMonth).to;
      const [registryRows, changeRows, importRows] = await Promise.all([
        fetchTdkApprovedRegistry({ includeInactive: true }),
        fetchTdkApprovedRegistryChanges({ from: rangeStart, to: rangeEnd }),
        fetchTdkApprovedRegistryImports(200),
      ]);
      setRegistry(registryRows);
      setChanges(changeRows);
      setImports(importRows);
      setSchemaMissing(false);
      setError("");
    } catch (loadError) {
      console.error("Load TDK APPROVED executive report failed", loadError);
      if (isTdkApprovedRegistrySchemaError(loadError)) setSchemaMissing(true);
      else setError(loadError?.message || tt("loadError"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedMonth, tt]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const schedule = () => {
      window.clearTimeout(realtimeRef.current);
      realtimeRef.current = window.setTimeout(() => void loadData({ silent: true }), 700);
    };
    const channel = supabase.channel("tdk-approved-executive-report")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tdk_approved_registry_imports" }, schedule)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tdk_approved_registry_imports" }, schedule)
      .subscribe();
    return () => {
      window.clearTimeout(realtimeRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  useEffect(() => {
    if (!exportMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!exportMenuRef.current?.contains(event.target)) setExportMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setExportMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [exportMenuOpen]);

  useEffect(() => {
    if (!detailKey) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setDetailKey("");
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [detailKey]);

  const activeRegistry = useMemo(() => registry.filter((row) => row.is_active), [registry]);
  const baselineImport = useMemo(() => [...imports]
    .filter((item) => Number(item.baseline_count || 0) > 0)
    .sort((a, b) => `${a.snapshot_date}|${a.imported_at}`.localeCompare(`${b.snapshot_date}|${b.imported_at}`))[0], [imports]);
  const baselineDate = baselineImport?.snapshot_date || OFFICIAL_BASELINE_DATE;
  const baselineCount = Number(baselineImport?.baseline_count || OFFICIAL_BASELINE_COUNT);
  const additionsAfterBaseline = useMemo(() => changes
    .filter((row) => row.change_type === "ADDED" && String(row.change_date || "") > baselineDate)
    .sort((a, b) => `${b.change_date}|${b.created_at || ""}`.localeCompare(`${a.change_date}|${a.created_at || ""}`)), [baselineDate, changes]);
  const addedPlateKeys = useMemo(() => new Set(additionsAfterBaseline.map((row) => row.plate_key).filter(Boolean)), [additionsAfterBaseline]);
  const addedVehicleRows = useMemo(() => {
    const latestByPlate = new Map();
    additionsAfterBaseline.forEach((row) => {
      if (!latestByPlate.has(row.plate_key)) latestByPlate.set(row.plate_key, row);
    });
    return [...latestByPlate.values()];
  }, [additionsAfterBaseline]);
  const selectedChanges = useMemo(() => changes.filter((row) => String(row.change_date || "").startsWith(selectedMonth) && row.change_type !== "BASELINE"), [changes, selectedMonth]);
  const metrics = useMemo(() => ({
    active: activeRegistry.length,
    added: selectedChanges.filter((row) => ["ADDED", "REACTIVATED"].includes(row.change_type)).length,
    removed: selectedChanges.filter((row) => row.change_type === "REMOVED").length,
    updated: selectedChanges.filter((row) => row.change_type === "UPDATED").length,
    companies: new Set(activeRegistry.map((row) => row.company_name).filter(Boolean)).size,
  }), [activeRegistry, selectedChanges]);

  const baselineVehicleRows = useMemo(() => {
    const baselineChanges = changes.filter((row) => row.change_type === "BASELINE");
    if (baselineChanges.length) return baselineChanges;
    return registry
      .filter((row) => String(row.first_seen_date || "") <= baselineDate)
      .slice(0, baselineCount);
  }, [baselineCount, baselineDate, changes, registry]);

  const companyRows = useMemo(() => {
    const grouped = new Map();
    activeRegistry.forEach((row) => {
      const company = String(row.company_name || "").trim();
      if (!company) return;
      const current = grouped.get(company) || { company_name: company, vehicles: [] };
      current.vehicles.push(row);
      grouped.set(company, current);
    });
    return [...grouped.values()]
      .map((item) => ({ ...item, count: item.vehicles.length }))
      .sort((a, b) => b.count - a.count || a.company_name.localeCompare(b.company_name));
  }, [activeRegistry]);

  const detailConfig = useMemo(() => {
    const monthLabel = monthFormatter.format(new Date(`${selectedMonth}-01T00:00:00`));
    const configs = {
      baseline: {
        title: tt("baselineStep"),
        hint: tt("baselineListHint"),
        rows: baselineVehicleRows.map((row) => ({ ...row, _detailType: "BASELINE", _detailDate: row.change_date || row.first_seen_date || baselineDate })),
      },
      afterBaseline: {
        title: tt("additionsStep"),
        hint: tt("additionsHint"),
        rows: addedVehicleRows.map((row) => ({ ...row, _detailType: row.change_type || "ADDED", _detailDate: row.change_date || row.first_seen_date })),
      },
      active: {
        title: tt("active"),
        hint: tt("activeListHint"),
        rows: activeRegistry.map((row) => ({ ...row, _detailType: "ACTIVE", _detailDate: row.first_seen_date || row.updated_at })),
      },
      monthAdded: {
        title: tt("added"),
        hint: monthLabel,
        rows: selectedChanges.filter((row) => ["ADDED", "REACTIVATED"].includes(row.change_type)).map((row) => ({ ...row, _detailType: row.change_type, _detailDate: row.change_date })),
      },
      monthRemoved: {
        title: tt("removed"),
        hint: monthLabel,
        rows: selectedChanges.filter((row) => row.change_type === "REMOVED").map((row) => ({ ...row, _detailType: row.change_type, _detailDate: row.change_date })),
      },
      monthUpdated: {
        title: tt("updated"),
        hint: monthLabel,
        rows: selectedChanges.filter((row) => row.change_type === "UPDATED").map((row) => ({ ...row, _detailType: row.change_type, _detailDate: row.change_date })),
      },
      companies: {
        title: tt("companies"),
        hint: tt("companyListHint"),
        kind: "companies",
        rows: companyRows,
      },
    };
    return configs[detailKey] || null;
  }, [activeRegistry, addedVehicleRows, baselineDate, baselineVehicleRows, companyRows, detailKey, monthFormatter, selectedChanges, selectedMonth, tt]);

  const filteredDetailRows = useMemo(() => {
    if (!detailConfig) return [];
    const needle = detailSearch.trim().toLowerCase();
    if (!needle) return detailConfig.rows;
    return detailConfig.rows.filter((row) => {
      const searchable = detailConfig.kind === "companies"
        ? [row.company_name, ...row.vehicles.map((vehicle) => vehicle.vehicle_plate)]
        : [row.vehicle_plate, row.full_name, row.company_name, row.contact_name, row.purpose, row.remark];
      return searchable.some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [detailConfig, detailSearch]);

  const openDetail = (key) => {
    setDetailSearch("");
    setDetailKey(key);
  };

  const trend = useMemo(() => Array.from({ length: 6 }, (_, index) => shiftMonth(selectedMonth, index - 5)).map((month) => {
    const rows = changes.filter((row) => String(row.change_date || "").startsWith(month));
    const latestImport = imports.filter((item) => String(item.snapshot_date || "").startsWith(month)).sort((a, b) => `${b.snapshot_date}|${b.imported_at}`.localeCompare(`${a.snapshot_date}|${a.imported_at}`))[0];
    return {
      month,
      label: monthFormatter.format(new Date(`${month}-01T00:00:00`)),
      added: rows.filter((row) => ["ADDED", "REACTIVATED"].includes(row.change_type)).length,
      removed: rows.filter((row) => row.change_type === "REMOVED").length,
      updated: rows.filter((row) => row.change_type === "UPDATED").length,
      active: latestImport?.total_count ?? null,
    };
  }), [changes, imports, monthFormatter, selectedMonth]);

  const filteredRegistry = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const scopedRows = registryFilter === "ADDED" ? activeRegistry.filter((row) => addedPlateKeys.has(row.plate_key)) : activeRegistry;
    if (!needle) return scopedRows;
    return scopedRows.filter((row) => [row.vehicle_plate, row.full_name, row.company_name, row.contact_name, row.purpose].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [activeRegistry, addedPlateKeys, registryFilter, search]);

  const handleExport = async (exportLanguage = ["th", "ko", "en"].includes(language) ? language : "en") => {
    setExportMenuOpen(false);
    setExporting(true);
    try {
      await downloadTdkApprovedMonthlyReport({
        language: exportLanguage,
        month: selectedMonth,
        registry: activeRegistry,
        changes: selectedChanges,
        allChanges: changes,
        baselineDate,
        baselineCount,
      });
      toast.success(tt("exportSuccess"));
    } catch (exportError) {
      console.error("Export TDK APPROVED executive report failed", exportError);
      toast.error(exportError?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return <div className="space-y-3">
    <header className="relative rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <div className="h-0.5 rounded-t-xl bg-[#214f91]" />
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#214f91]"><ShieldCheck size={14} />{tt("masterEyebrow")}</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{tt("heading")}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{tt("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label><span className="mb-1 block text-[10px] font-semibold text-slate-500">{tt("month")}</span><input type="month" value={selectedMonth} onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#214f91] focus:ring-2 focus:ring-blue-100" /></label>
          <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />{tt("refresh")}</button>
          <div ref={exportMenuRef} className="relative z-40">
            <button type="button" onClick={() => setExportMenuOpen((current) => !current)} aria-haspopup="menu" aria-expanded={exportMenuOpen} disabled={exporting || !activeRegistry.length} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#173f70] px-3 text-xs font-bold text-white transition hover:bg-[#12345e] disabled:opacity-50">{exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{tt("export")}<ChevronDown size={13} className={`transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} /></button>
            {exportMenuOpen ? <div role="menu" aria-label={tt("exportHint")} className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10">
              <p className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{tt("exportHint")}</p>
              <button type="button" role="menuitem" onClick={() => void handleExport("th")} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100"><span className="flex h-6 w-7 items-center justify-center rounded bg-slate-100 text-[9px] font-black text-[#173f70]">TH</span>{tt("exportThai")}</button>
              <button type="button" role="menuitem" onClick={() => void handleExport("ko")} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100"><span className="flex h-6 w-7 items-center justify-center rounded bg-slate-100 text-[9px] font-black text-[#173f70]">KO</span>{tt("exportKorean")}</button>
              <button type="button" role="menuitem" onClick={() => void handleExport("en")} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100"><span className="flex h-6 w-7 items-center justify-center rounded bg-slate-100 text-[9px] font-black text-[#173f70]">EN</span>{tt("exportEnglish")}</button>
            </div> : null}
          </div>
        </div>
      </div>
    </header>
    {schemaMissing ? <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">{tt("setup")}</section> : null}
    {error ? <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">{error}</section> : null}

    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4" aria-label={tt("summaryTitle")}>
      <SummaryCard icon={CalendarDays} label={tt("baselineStep")} value={tt("baselineVehicles", { count: baselineCount })} hint={tt("baselineDate", { date: dateFormatter.format(new Date(`${baselineDate}T00:00:00`)) })} tone="blue" onClick={() => openDetail("baseline")} active={detailKey === "baseline"} />
      <SummaryCard icon={UserPlus} label={tt("additionsStep")} value={tt("additionsVehicles", { count: addedVehicleRows.length })} hint={tt("additionsHint")} tone="emerald" onClick={() => openDetail("afterBaseline")} active={detailKey === "afterBaseline"} />
      <SummaryCard icon={CarFront} label={tt("active")} value={metrics.active.toLocaleString()} hint={tt("clickDetail")} tone="blue" onClick={() => openDetail("active")} active={detailKey === "active"} />
      <SummaryCard icon={Building2} label={tt("companies")} value={metrics.companies.toLocaleString()} hint={tt("clickDetail")} tone="violet" onClick={() => openDetail("companies")} active={detailKey === "companies"} />
      <SummaryCard icon={UserPlus} label={tt("added")} value={metrics.added.toLocaleString()} hint={tt("clickDetail")} tone="emerald" onClick={() => openDetail("monthAdded")} active={detailKey === "monthAdded"} />
      <SummaryCard icon={UserMinus} label={tt("removed")} value={metrics.removed.toLocaleString()} hint={tt("clickDetail")} tone="rose" onClick={() => openDetail("monthRemoved")} active={detailKey === "monthRemoved"} />
      <SummaryCard icon={PencilLine} label={tt("updated")} value={metrics.updated.toLocaleString()} hint={tt("clickDetail")} tone="amber" onClick={() => openDetail("monthUpdated")} active={detailKey === "monthUpdated"} />
    </section>

    <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">{tt("trendTitle")}</h2><p className="mt-0.5 text-[10px] text-slate-500">{tt("trendHint")}</p></div>
        <div className="h-[240px] p-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 11 }} /><Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} /><Bar dataKey="added" name={tt("additions")} fill="#059669" radius={[3, 3, 0, 0]} /><Bar dataKey="removed" name={tt("removals")} fill="#e11d48" radius={[3, 3, 0, 0]} /><Bar dataKey="updated" name={tt("updates")} fill="#d97706" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </article>

      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-bold text-slate-900">{tt("changesTitle")}</h2><p className="mt-0.5 text-[10px] text-slate-500">{monthFormatter.format(new Date(`${selectedMonth}-01T00:00:00`))}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{tt("changesCount", { count: selectedChanges.length })}</span></div>
        {selectedChanges.length ? <div className="max-h-[240px] overflow-auto"><table className="w-full table-fixed text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="w-[29%] px-3 py-2.5">{tt("changeDate")}</th><th className="w-[23%] px-3 py-2.5">{tt("plate")}</th><th className="w-[28%] px-3 py-2.5">{tt("company")}</th><th className="w-[20%] px-3 py-2.5 text-right">{tt("changeAction")}</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedChanges.map((item) => <tr key={item.id} className="hover:bg-blue-50/40"><td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{dateFormatter.format(new Date(`${item.change_date}T00:00:00`))}</td><td className="truncate px-3 py-2.5 font-bold text-slate-900">{item.vehicle_plate}</td><td className="truncate px-3 py-2.5 text-slate-600" title={item.company_name || item.full_name || "-"}>{item.company_name || item.full_name || "-"}</td><td className="px-3 py-2.5 text-right"><span className={`inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[9px] font-bold ${TYPE_STYLE[item.change_type] || TYPE_STYLE.BASELINE}`}>{tt(`type.${item.change_type}`)}</span></td></tr>)}</tbody></table></div> : <div className="flex min-h-[240px] flex-col items-center justify-center p-4 text-center"><FileClock size={26} className="text-slate-300" /><p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">{tt("noChanges")}</p></div>}
      </article>
    </section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-end lg:justify-between sm:px-5">
        <div><h2 className="text-sm font-bold text-slate-900">{tt("registryTitle")}</h2><p className="mt-0.5 text-[10px] text-slate-500">{tt("registryHint")} · {tt("currentVehicles", { count: activeRegistry.length.toLocaleString() })}</p></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <RegistryQuickFilters value={registryFilter} onChange={(nextFilter) => { setRegistryFilter(nextFilter); setSearch(""); }} allCount={activeRegistry.length} addedCount={activeRegistry.filter((row) => addedPlateKeys.has(row.plate_key)).length} tt={tt} />
          <label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tt("search")} className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-[#214f91] focus:ring-2 focus:ring-blue-100 sm:w-72" /></label>
        </div>
      </div>
      {filteredRegistry.length ? <div className="max-h-[420px] overflow-auto"><table className="min-w-[860px] w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">{tt("plate")}</th><th className="px-4 py-2">{tt("person")}</th><th className="px-4 py-2">{tt("company")}</th><th className="px-4 py-2">{tt("purpose")}</th><th className="px-4 py-2">{tt("since")}</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRegistry.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-4 py-2 font-bold text-slate-950">{row.vehicle_plate}</td><td className="px-4 py-2"><p className="font-semibold text-slate-700">{row.full_name || "-"}</p><p className="mt-0.5 text-[10px] text-slate-400">{row.contact_name || "-"}</p></td><td className="px-4 py-2 text-slate-600">{row.company_name || "-"}</td><td className="max-w-[280px] truncate px-4 py-2 text-slate-600">{row.purpose || row.remark || "-"}</td><td className="whitespace-nowrap px-4 py-2 text-slate-500">{row.first_seen_date ? dateFormatter.format(new Date(`${row.first_seen_date}T00:00:00`)) : "-"}</td></tr>)}</tbody></table></div> : <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center"><CarFront size={26} className="text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-500">{loading ? "Loading..." : registryFilter === "ADDED" ? tt("noAdditions") : tt("noRegistry")}</p></div>}
    </section>

    {detailConfig ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailKey(""); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="registry-detail-title" className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl shadow-slate-950/25">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#214f91]">{tt("summaryTitle")}</p>
            <h3 id="registry-detail-title" className="mt-0.5 truncate text-base font-bold text-slate-950 sm:text-lg">{detailConfig.title}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">{detailConfig.hint}</p>
          </div>
          <button type="button" onClick={() => setDetailKey("")} aria-label={tt("close")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X size={16} /></button>
        </header>
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-xs font-bold text-slate-600">{tt("detailCount", { count: filteredDetailRows.length.toLocaleString() })}</span>
          <label className="relative w-full sm:w-80"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input autoFocus value={detailSearch} onChange={(event) => setDetailSearch(event.target.value)} placeholder={tt("detailSearch")} className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-[#214f91] focus:ring-2 focus:ring-blue-100" /></label>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {filteredDetailRows.length ? detailConfig.kind === "companies" ? <div className="divide-y divide-slate-100">
            {filteredDetailRows.map((row) => <article key={row.company_name} className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:grid-cols-[minmax(180px,0.35fr)_minmax(0,1fr)] sm:px-5">
              <div><p className="font-bold text-slate-900">{row.company_name}</p><p className="mt-0.5 text-[10px] font-semibold text-[#214f91]">{tt("companyVehicles", { count: row.count.toLocaleString() })}</p></div>
              <div className="flex flex-wrap gap-1.5">{row.vehicles.map((vehicle) => <span key={vehicle.id || vehicle.plate_key} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700">{vehicle.vehicle_plate}</span>)}</div>
            </article>)}
          </div> : <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5">{tt("plate")}</th><th className="px-4 py-2.5">{tt("person")}</th><th className="px-4 py-2.5">{tt("company")}</th><th className="px-4 py-2.5">{tt("detailDate")}</th><th className="px-4 py-2.5 text-right">{tt("detailStatus")}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{filteredDetailRows.map((row, index) => <tr key={row.id || `${row.plate_key}-${row._detailType}-${index}`} className="hover:bg-slate-50"><td className="px-4 py-2.5 font-bold text-slate-950">{row.vehicle_plate || "-"}</td><td className="px-4 py-2.5"><p className="font-semibold text-slate-700">{row.full_name || row.contact_name || "-"}</p>{row.full_name && row.contact_name ? <p className="mt-0.5 text-[10px] text-slate-400">{row.contact_name}</p> : null}</td><td className="px-4 py-2.5 text-slate-600">{row.company_name || "-"}</td><td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{formatReportDate(row._detailDate, dateFormatter)}</td><td className="px-4 py-2.5 text-right"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${TYPE_STYLE[row._detailType] || TYPE_STYLE.BASELINE}`}>{row._detailType === "ACTIVE" ? tt("active") : tt(`type.${row._detailType}`)}</span></td></tr>)}</tbody>
          </table> : <div className="flex min-h-56 flex-col items-center justify-center p-6 text-center"><Search size={26} className="text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-500">{tt("noDetailData")}</p></div>}
        </div>
      </section>
    </div> : null}
  </div>;
}
