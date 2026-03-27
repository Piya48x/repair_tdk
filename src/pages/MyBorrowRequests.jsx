import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Loader2,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { supabase } from "../lib/supabaseClient";
import { useScopedI18n } from "../i18n/useScopedI18n";
import { DASHBOARD_THEME_KEY } from "./dashboard/constants";
import { isPickUpEquipmentRequest, normalizeServiceType } from "../lib/serviceRequestUtils";

const REQUEST_LABELS = {
  req_new_device: { th: "เบิกอุปกรณ์ใหม่", en: "New equipment", ko: "신규 장비" },
  req_replacement: { th: "ขอเปลี่ยนเครื่องทดแทน", en: "Replacement request", ko: "교체 요청" },
  req_peripherals: { th: "อุปกรณ์ต่อพ่วง", en: "Peripheral request", ko: "주변기기 요청" },
  req_laptop_gps: { th: "ขอยืมโน้ตบุ๊ก GPS", en: "GPS laptop borrowing", ko: "GPS 노트북 대여" },
  req_install_sw: { th: "ติดตั้งโปรแกรมใหม่", en: "Software installation", ko: "소프트웨어 설치" },
  req_license: { th: "ขอ License / ต่ออายุ", en: "License request", ko: "라이선스 요청" },
  req_os_issue: { th: "ปัญหา Windows / OS", en: "Windows / OS issue", ko: "Windows / OS 문제" },
  req_wifi_guest: { th: "ขอรหัส WiFi", en: "WiFi request", ko: "WiFi 요청" },
  req_vpn: { th: "ขอใช้งาน VPN", en: "VPN request", ko: "VPN 요청" },
  req_folder_access: { th: "ขอสิทธิ์ Folder / Server", en: "Folder / Server access", ko: "폴더 / 서버 권한" },
  req_domain: { th: "Reset Password / Domain", en: "Domain request", ko: "도메인 요청" },
  req_cctv_install: { th: "ติดตั้งกล้องวงจรปิด", en: "CCTV installation", ko: "CCTV 설치" },
  req_cctv_view: { th: "ขอดูย้อนหลัง CCTV", en: "CCTV playback", ko: "CCTV 조회" },
  req_access_card: { th: "บัตรผ่านเข้า-ออก", en: "Access card request", ko: "출입카드 요청" },
  req_purchase: { th: "ขอจัดซื้ออุปกรณ์ไอที", en: "IT purchase request", ko: "IT 구매 요청" },
  req_quotation: { th: "ขอใบเสนอราคา", en: "Quotation request", ko: "견적 요청" },
  req_consult: { th: "ปรึกษาปัญหาไอที", en: "IT consultation", ko: "IT 상담" },
  req_relocate: { th: "ย้ายจุดทำงาน", en: "Relocation request", ko: "자리 이동 요청" },
};

const BORROW_REQUEST_TRANSLATIONS = {
  th: {
    badge: "Borrow Request Center",
    title: "การเบิกของคุณ",
    subtitle: "รวมประวัติคำขอเบิกอุปกรณ์และคำขอบริการจากหน้า Pick-up Equipment แยกจากงานแจ้งซ่อมโดยตรง",
    backDashboard: "กลับ Dashboard",
    openPickup: "เปิดหน้าเบิกอุปกรณ์",
    refresh: "รีเฟรช",
    export: "Export Excel",
    exportDisabled: "ไม่มีข้อมูลสำหรับ export",
    searchPlaceholder: "ค้นหาเลขคำขอ หัวข้อ ประเภท สถานที่ หรือรายละเอียด...",
    filterDay: "รายวัน",
    filterMonth: "รายเดือน",
    filterYear: "รายปี",
    total: "ทั้งหมด",
    open: "ยังไม่ปิด",
    closed: "ปิดแล้ว",
    createdAt: "วันที่สร้างคำขอ",
    requestWindow: "ช่วงวันที่ยืม",
    noWindow: "ไม่มีช่วงยืม",
    noDataTitle: "ยังไม่มีรายการเบิกอุปกรณ์",
    noDataBody: "เมื่อส่งคำขอจากหน้า Pick-up Equipment รายการจะมาแสดงที่นี่ทันที และสามารถ export เป็น Excel ได้",
    tableRequestNo: "เลขคำขอ",
    tableType: "ประเภท",
    tableSubject: "หัวข้อ",
    tableStatus: "สถานะ",
    tablePriority: "Priority",
    tableCreated: "วันที่สร้าง",
    tableWindow: "ช่วงยืม",
    tableLocation: "สถานที่",
    tableDepartment: "แผนก",
    tableDetails: "รายละเอียด",
    statusNew: "รอดำเนินการ",
    statusProgress: "กำลังจัดการ",
    statusClosed: "ปิดคำขอแล้ว",
    requestedBy: "ผู้ขอ",
    exportFilePrefix: "borrow-requests",
  },
  en: {
    badge: "Borrow Request Center",
    title: "Your Equipment Requests",
    subtitle: "A dedicated history of Pick-up Equipment requests, separated from repair tickets.",
    backDashboard: "Back to Dashboard",
    openPickup: "Open Pick-up Equipment",
    refresh: "Refresh",
    export: "Export Excel",
    exportDisabled: "No data to export",
    searchPlaceholder: "Search request no, subject, type, location, or details...",
    filterDay: "Day",
    filterMonth: "Month",
    filterYear: "Year",
    total: "Total",
    open: "Open",
    closed: "Closed",
    createdAt: "Requested at",
    requestWindow: "Borrow window",
    noWindow: "No borrow window",
    noDataTitle: "No equipment requests yet",
    noDataBody: "Requests submitted from Pick-up Equipment will appear here and can be exported to Excel.",
    tableRequestNo: "Request No.",
    tableType: "Type",
    tableSubject: "Subject",
    tableStatus: "Status",
    tablePriority: "Priority",
    tableCreated: "Requested at",
    tableWindow: "Borrow window",
    tableLocation: "Location",
    tableDepartment: "Department",
    tableDetails: "Details",
    statusNew: "Pending",
    statusProgress: "In progress",
    statusClosed: "Closed",
    requestedBy: "Requester",
    exportFilePrefix: "borrow-requests",
  },
  ko: {
    badge: "Borrow Request Center",
    title: "내 장비 요청",
    subtitle: "Pick-up Equipment 요청 이력을 수리 티켓과 분리해서 확인할 수 있습니다.",
    backDashboard: "대시보드로 돌아가기",
    openPickup: "Pick-up Equipment 열기",
    refresh: "새로고침",
    export: "Excel 내보내기",
    exportDisabled: "내보낼 데이터가 없습니다",
    searchPlaceholder: "요청 번호, 제목, 유형, 위치 또는 상세 내용을 검색하세요...",
    filterDay: "일별",
    filterMonth: "월별",
    filterYear: "연별",
    total: "전체",
    open: "진행 중",
    closed: "종료",
    createdAt: "요청 일시",
    requestWindow: "대여 기간",
    noWindow: "대여 기간 없음",
    noDataTitle: "아직 장비 요청이 없습니다",
    noDataBody: "Pick-up Equipment에서 보낸 요청은 여기에 표시되며 Excel로 내보낼 수 있습니다.",
    tableRequestNo: "요청 번호",
    tableType: "유형",
    tableSubject: "제목",
    tableStatus: "상태",
    tablePriority: "우선순위",
    tableCreated: "요청 일시",
    tableWindow: "대여 기간",
    tableLocation: "위치",
    tableDepartment: "부서",
    tableDetails: "상세",
    statusNew: "대기 중",
    statusProgress: "처리 중",
    statusClosed: "종료됨",
    requestedBy: "요청자",
    exportFilePrefix: "borrow-requests",
  },
};

function getLocale(language) {
  if (language === "th") return "th-TH";
  if (language === "ko") return "ko-KR";
  return "en-US";
}

function formatDateTime(value, language) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(getLocale(language), {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value, language) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(getLocale(language), {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function toRequestNo(request) {
  return request?.ticket_no || `REQ-${String(request?.id || "").slice(-6).toUpperCase().padStart(6, "0")}`;
}

function toDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toMonthKey(value) {
  const key = toDateKey(value);
  return key ? key.slice(0, 7) : "";
}

function toYearKey(value) {
  const key = toDateKey(value);
  return key ? key.slice(0, 4) : "";
}

function getRequestTypeLabel(request, language) {
  const serviceType = normalizeServiceType(request?.service_type);
  return (
    REQUEST_LABELS[serviceType]?.[language] ||
    normalizeText(request?.title) ||
    normalizeText(request?.category) ||
    normalizeText(request?.service_type) ||
    "-"
  );
}

function getStatusLabel(status, tt) {
  const value = String(status || "").toUpperCase();
  if (value === "CLOSED") return tt("statusClosed");
  if (value === "IN_PROGRESS") return tt("statusProgress");
  return tt("statusNew");
}

function getBorrowWindow(request, language, tt) {
  if (!request?.borrow_start_date && !request?.borrow_end_date) return tt("noWindow");
  return `${formatDateOnly(request?.borrow_start_date, language)} - ${formatDateOnly(request?.borrow_end_date, language)}`;
}

export default function MyBorrowRequests() {
  const navigate = useNavigate();
  const { language, tt } = useScopedI18n(BORROW_REQUEST_TRANSLATIONS);
  const [themeMode] = useState(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_THEME_KEY);
      return saved === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodMode, setPeriodMode] = useState("month");
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const channelRef = useRef(null);

  const isDarkTheme = themeMode === "dark";
  const shellClass = isDarkTheme ? "border-slate-700 bg-slate-900/85 text-slate-100" : "border-slate-200 bg-white/95 text-slate-800";
  const panelClass = isDarkTheme ? "border-slate-700 bg-slate-800/80" : "border-slate-200 bg-slate-50/85";
  const mutedTextClass = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const bodyTextClass = isDarkTheme ? "text-slate-300" : "text-slate-600";
  const titleTextClass = isDarkTheme ? "text-slate-100" : "text-slate-900";
  const controlClass = isDarkTheme
    ? "w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
    : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500";

  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_THEME_KEY, themeMode);
    } catch {
      // Ignore storage failures.
    }
  }, [themeMode]);

  const loadRequests = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/", { replace: true });
        return;
      }

      setProfile({
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || session.user.email || tt("requestedBy"),
        employee_code: session.user.user_metadata?.employee_code || session.user.user_metadata?.employee_id || "",
        email: session.user.email || "",
      });

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("creator_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests((data || []).filter((row) => isPickUpEquipmentRequest(row)));
    } catch (error) {
      console.error("Load borrow requests error:", error);
      setRequests([]);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [navigate, tt]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    let active = true;

    const subscribe = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active || !session?.user) return;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = supabase
        .channel(`borrow-requests-${session.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tickets",
            filter: `creator_id=eq.${session.user.id}`,
          },
          (payload) => {
            const affectedId = payload.new?.id || payload.old?.id;
            const nextRow = payload.new || payload.old;
            const shouldKeep = payload.eventType !== "DELETE" && isPickUpEquipmentRequest(nextRow);

            setRequests((current) => {
              const remaining = current.filter((row) => row.id !== affectedId);
              if (!shouldKeep || payload.eventType === "DELETE") return remaining;
              return [payload.new, ...remaining].sort(
                (left, right) => new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime(),
              );
            });
          },
        )
        .subscribe();
    };

    void subscribe();

    return () => {
      active = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const availableYears = useMemo(() => {
    const yearSet = new Set([String(new Date().getFullYear())]);
    requests.forEach((request) => {
      const yearKey = toYearKey(request.created_at);
      if (yearKey) yearSet.add(yearKey);
    });
    return [...yearSet].sort((left, right) => Number(right) - Number(left));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return requests.filter((request) => {
      const dayKey = toDateKey(request.created_at);
      const monthKey = toMonthKey(request.created_at);
      const yearKey = toYearKey(request.created_at);

      if (periodMode === "day" && selectedDay && dayKey !== selectedDay) return false;
      if (periodMode === "month" && selectedMonth && monthKey !== selectedMonth) return false;
      if (periodMode === "year" && selectedYear && yearKey !== selectedYear) return false;

      if (!query) return true;

      const haystack = [
        toRequestNo(request),
        getRequestTypeLabel(request, language),
        request.title,
        request.description,
        request.category,
        request.location,
        request.department,
        request.reporter_dept,
        request.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [language, periodMode, requests, searchQuery, selectedDay, selectedMonth, selectedYear]);

  const summary = useMemo(
    () => ({
      total: filteredRequests.length,
      open: filteredRequests.filter((request) => String(request?.status || "").toUpperCase() !== "CLOSED").length,
      closed: filteredRequests.filter((request) => String(request?.status || "").toUpperCase() === "CLOSED").length,
    }),
    [filteredRequests],
  );

  const handleExport = async () => {
    if (filteredRequests.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Pick-up Equipment";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Borrow Requests", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = [
      { header: tt("tableRequestNo"), key: "requestNo", width: 16 },
      { header: tt("tableType"), key: "type", width: 24 },
      { header: tt("tableSubject"), key: "subject", width: 28 },
      { header: tt("tableStatus"), key: "status", width: 16 },
      { header: tt("tablePriority"), key: "priority", width: 12 },
      { header: tt("tableCreated"), key: "createdAt", width: 20 },
      { header: tt("tableWindow"), key: "window", width: 26 },
      { header: tt("tableDepartment"), key: "department", width: 18 },
      { header: tt("tableLocation"), key: "location", width: 18 },
      { header: tt("requestedBy"), key: "requester", width: 20 },
      { header: tt("tableDetails"), key: "details", width: 44 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0F766E" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "0B5E57" } },
        left: { style: "thin", color: { argb: "0B5E57" } },
        bottom: { style: "thin", color: { argb: "0B5E57" } },
        right: { style: "thin", color: { argb: "0B5E57" } },
      };
    });

    filteredRequests.forEach((request, index) => {
      const row = worksheet.addRow({
        requestNo: toRequestNo(request),
        type: getRequestTypeLabel(request, language),
        subject: request.title || "-",
        status: getStatusLabel(request.status, tt),
        priority: String(request.priority || "-").toUpperCase(),
        createdAt: formatDateTime(request.created_at, language),
        window: getBorrowWindow(request, language, tt),
        department: request.reporter_dept || request.department || "-",
        location: request.location || "-",
        requester: request.reporter_name || profile?.full_name || "-",
        details: request.description || request.purpose_of_use || "-",
      });

      row.height = 40;
      row.eachCell((cell) => {
        cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "D1D5DB" } },
          left: { style: "thin", color: { argb: "D1D5DB" } },
          bottom: { style: "thin", color: { argb: "D1D5DB" } },
          right: { style: "thin", color: { argb: "D1D5DB" } },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: index % 2 === 0 ? "FFFFFF" : "F8FAFC" },
        };
      });
    });

    const stamp = periodMode === "day" ? selectedDay : periodMode === "month" ? selectedMonth : selectedYear;
    const fileName = `${tt("exportFilePrefix")}-${periodMode}-${stamp || "all"}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkTheme ? "bg-[#0b1220] text-slate-100" : "bg-[#f4f7fb] text-slate-800"}`}>
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${isDarkTheme ? "border-slate-700 bg-[#0f172a]/95" : "border-slate-200 bg-white/90"}`}>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${shellClass}`}
              aria-label={tt("backDashboard")}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${isDarkTheme ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                <Package size={14} />
                {tt("badge")}
              </p>
              <h1 className={`mt-2 text-2xl font-black ${titleTextClass}`}>{tt("title")}</h1>
              <p className={`mt-1 text-sm ${bodyTextClass}`}>{tt("subtitle")}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/pick-up-equipment")}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold ${shellClass}`}
            >
              <Package size={16} />
              {tt("openPickup")}
            </button>
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                void loadRequests({ silent: true });
              }}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold ${shellClass}`}
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {tt("refresh")}
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={filteredRequests.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              title={filteredRequests.length === 0 ? tt("exportDisabled") : tt("export")}
            >
              <Download size={16} />
              {tt("export")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-3">
          <article className={`rounded-3xl border p-5 shadow-sm ${shellClass}`}>
            <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${mutedTextClass}`}>{tt("total")}</p>
            <p className={`mt-2 text-3xl font-black ${titleTextClass}`}>{summary.total}</p>
          </article>
          <article className={`rounded-3xl border p-5 shadow-sm ${shellClass}`}>
            <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${mutedTextClass}`}>{tt("open")}</p>
            <p className={`mt-2 text-3xl font-black ${titleTextClass}`}>{summary.open}</p>
          </article>
          <article className={`rounded-3xl border p-5 shadow-sm ${shellClass}`}>
            <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${mutedTextClass}`}>{tt("closed")}</p>
            <p className={`mt-2 text-3xl font-black ${titleTextClass}`}>{summary.closed}</p>
          </article>
        </div>

        <section className={`mt-4 rounded-3xl border p-4 shadow-sm ${shellClass}`}>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div className="relative">
              <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${mutedTextClass}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={tt("searchPlaceholder")}
                className={`pl-11 ${controlClass}`}
              />
            </div>

            <div className={`flex gap-2 rounded-2xl border p-1.5 ${shellClass}`}>
              {[
                { id: "day", label: tt("filterDay") },
                { id: "month", label: tt("filterMonth") },
                { id: "year", label: tt("filterYear") },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPeriodMode(mode.id)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    periodMode === mode.id
                      ? "bg-emerald-600 text-white"
                      : isDarkTheme
                        ? "text-slate-300 hover:bg-slate-800"
                        : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {periodMode === "day" ? (
              <input type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className={controlClass} />
            ) : periodMode === "month" ? (
              <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className={controlClass} />
            ) : (
              <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className={controlClass}>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}
          </div>
        </section>

        <section className={`mt-4 rounded-3xl border p-4 shadow-sm ${shellClass}`}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-12 text-center">
              <p className={`text-base font-bold ${titleTextClass}`}>{tt("noDataTitle")}</p>
              <p className={`mt-2 text-sm ${bodyTextClass}`}>{tt("noDataBody")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className={`text-left text-xs uppercase ${mutedTextClass}`}>
                    <th className="px-3 py-3 font-black">{tt("tableRequestNo")}</th>
                    <th className="px-3 py-3 font-black">{tt("tableType")}</th>
                    <th className="px-3 py-3 font-black">{tt("tableSubject")}</th>
                    <th className="px-3 py-3 font-black">{tt("tableStatus")}</th>
                    <th className="px-3 py-3 font-black">{tt("tableCreated")}</th>
                    <th className="px-3 py-3 font-black">{tt("tableWindow")}</th>
                    <th className="px-3 py-3 font-black">{tt("tableDepartment")}</th>
                    <th className="px-3 py-3 font-black">{tt("tableLocation")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request, index) => {
                    const status = String(request?.status || "").toUpperCase();
                    const statusClass =
                      status === "CLOSED"
                        ? (isDarkTheme ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700")
                        : status === "IN_PROGRESS"
                          ? (isDarkTheme ? "border-amber-700/40 bg-amber-900/20 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-700")
                          : (isDarkTheme ? "border-blue-700/40 bg-blue-900/20 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-700");

                    return (
                      <tr key={request.id} className={index > 0 ? (isDarkTheme ? "border-t border-slate-800" : "border-t border-slate-200") : ""}>
                        <td className={`px-3 py-3 font-semibold ${titleTextClass}`}>{toRequestNo(request)}</td>
                        <td className={`px-3 py-3 ${bodyTextClass}`}>{getRequestTypeLabel(request, language)}</td>
                        <td className="px-3 py-3">
                          <div className="min-w-[220px]">
                            <p className={`font-semibold ${titleTextClass}`}>{request.title || "-"}</p>
                            <p className={`mt-1 text-xs ${mutedTextClass}`}>{request.description || request.purpose_of_use || "-"}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass}`}>
                            {getStatusLabel(request.status, tt)}
                          </span>
                        </td>
                        <td className={`px-3 py-3 ${bodyTextClass}`}>{formatDateTime(request.created_at, language)}</td>
                        <td className={`px-3 py-3 ${bodyTextClass}`}>{getBorrowWindow(request, language, tt)}</td>
                        <td className={`px-3 py-3 ${bodyTextClass}`}>{request.reporter_dept || request.department || "-"}</td>
                        <td className={`px-3 py-3 ${bodyTextClass}`}>{request.location || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
