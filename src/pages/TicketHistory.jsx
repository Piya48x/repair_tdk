import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Download,
  RefreshCw,
  Calendar,
  Eye,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Laptop,
  FileText,
  Hash,
  TrendingUp,
  Filter,
  ExternalLink,
  Sparkles,
  CircleSlash,
  Hammer,
  UserRound,
} from "lucide-react";
import Swal from "sweetalert2";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useI18n } from "../i18n/LanguageProvider";
import {
  formatNotebookDuration,
  formatNotebookTime,
  isNotebookPermissionDenied,
  isNotebookSchemaError,
  loadMyNotebookBorrowLogs,
  NOTEBOOK_LOG_STATUS,
} from "../services/notebookBorrowService";

const BRAND_PRIMARY = "#2b59b0";

const NOTEBOOK_LOG_META = {
  pending: {
    label: "รออนุมัติ",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "กำลังยืม",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  returned: {
    label: "รอยืนยันคืน",
    cls: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "ทุกสถานะ" },
  { value: "PENDING", label: "รอดำเนินการ" },
  { value: "NEW", label: "งานใหม่" },
  { value: "IN_PROGRESS", label: "กำลังซ่อม" },
  { value: "CLOSED", label: "สำเร็จ" },
];

const PRIORITY_OPTIONS = [
  { value: "ALL", label: "ทุกความเร่งด่วน" },
  { value: "urgent", label: "ด่วน" },
  { value: "high", label: "สูง" },
  { value: "normal", label: "ปกติ" },
  { value: "low", label: "ต่ำ" },
];

const statusConfig = {
  NEW: {
    label: "รอดำเนินการ",
    chipClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "กำลังซ่อม",
    chipClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
    icon: Hammer,
  },
  CLOSED: {
    label: "สำเร็จ",
    chipClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
    icon: CheckCircle2,
  },
  default: {
    label: "ไม่ระบุ",
    chipClass: "bg-slate-50 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
    icon: AlertCircle,
  },
};

const priorityConfig = {
  urgent: {
    label: "ด่วน",
    chipClass: "bg-gradient-to-r from-rose-500 to-pink-600 text-white",
  },
  high: {
    label: "สูง",
    chipClass: "bg-gradient-to-r from-amber-500 to-orange-600 text-white",
  },
  normal: {
    label: "ปกติ",
    chipClass: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white",
  },
  low: {
    label: "ต่ำ",
    chipClass: "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
  },
  default: {
    label: "ไม่ระบุ",
    chipClass: "bg-slate-500 text-white",
  },
};

const fallbackTicketNo = (ticket) =>
  `T${String(ticket?.id || "").slice(-6).toUpperCase().padStart(6, "0")}`;

const toDisplayDate = (dateString) => {
  if (!dateString) return "ไม่ระบุ";
  try {
    return format(new Date(dateString), "dd MMM yyyy", { locale: th });
  } catch {
    return "ไม่ระบุ";
  }
};

const toDisplayDateTime = (dateString) => {
  if (!dateString) return "ไม่ระบุ";
  try {
    return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: th });
  } catch {
    return "ไม่ระบุ";
  }
};

const toTimeAgo = (dateString) => {
  if (!dateString) return "";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: th });
  } catch {
    return "";
  }
};

const getTicketImageUrls = (ticket) => {
  const attachmentUrls = Array.isArray(ticket?.attachments)
    ? ticket.attachments.filter((url) => typeof url === "string" && url.trim())
    : [];

  const merged = [...attachmentUrls];
  if (ticket?.image_url && typeof ticket.image_url === "string") {
    merged.push(ticket.image_url);
  }

  return [...new Set(merged)];
};

const getImageExtension = (url, mimeType = "") => {
  const mime = mimeType.toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("webp")) return "jpeg";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpeg";

  const lower = String(url || "").toLowerCase();
  if (lower.includes(".png")) return "png";
  if (lower.includes(".gif")) return "gif";
  if (lower.includes(".webp")) return "jpeg";
  return "jpeg";
};

const fetchImageAsBase64 = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`โหลดรูปไม่สำเร็จ: ${response.status}`);

  const blob = await response.blob();
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return {
    base64: String(base64),
    extension: getImageExtension(url, blob.type),
  };
};

export default function TicketHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const initialFilter = location.state?.initialFilter || "ALL";
  const initialTickets = Array.isArray(location.state?.tickets) ? location.state.tickets : [];

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [notebookLogs, setNotebookLogs] = useState([]);
  const [notebookLoading, setNotebookLoading] = useState(true);
  const [notebookError, setNotebookError] = useState("");

  useEffect(() => {
    if (initialFilter) setStatusFilter(initialFilter);

    if (initialTickets.length > 0) {
      setTickets(initialTickets);
      setLoading(false);
      fetchNotebookLogs();
      return;
    }

    const load = async () => {
      await fetchTickets();
      await fetchNotebookLogs();
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTicket) return;

    const handleEsc = (event) => {
      if (event.key === "Escape") setSelectedTicket(null);
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [selectedTicket]);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("creator_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถโหลดประวัติการแจ้งซ่อมได้",
        confirmButtonColor: BRAND_PRIMARY,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotebookLogs = useCallback(async () => {
    try {
      setNotebookLoading(true);
      const { data, error } = await loadMyNotebookBorrowLogs();
      if (error) throw error;

      setNotebookLogs(Array.isArray(data) ? data : []);
      setNotebookError("");
    } catch (error) {
      console.error("Error fetching notebook logs:", error);
      if (isNotebookSchemaError(error)) {
        setNotebookError("ยังไม่ได้ติดตั้ง schema notebook borrowing");
      } else if (isNotebookPermissionDenied(error)) {
        setNotebookError("ไม่มีสิทธิ์ดูประวัติ notebook ของคุณ");
      } else {
        setNotebookError("ไม่สามารถโหลดประวัติยืม-คืน notebook ได้");
      }
      setNotebookLogs([]);
    } finally {
      setNotebookLoading(false);
    }
  }, []);

  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter((t) => t.status !== "CLOSED").length;
    const closed = tickets.filter((t) => t.status === "CLOSED").length;

    let totalHours = 0;
    let counted = 0;

    tickets.forEach((ticket) => {
      if (ticket.closed_at && ticket.created_at) {
        const created = new Date(ticket.created_at);
        const closedAt = new Date(ticket.closed_at);
        const hours = (closedAt - created) / (1000 * 60 * 60);
        if (hours > 0) {
          totalHours += hours;
          counted += 1;
        }
      }
    });

    return {
      total,
      pending,
      closed,
      avgResponse: counted > 0 ? `${Math.round(totalHours / counted)} ชม.` : "0 ชม.",
    };
  }, [tickets]);

  const categories = useMemo(() => {
    const unique = [...new Set(tickets.map((t) => t.category).filter(Boolean))];
    return ["ALL", ...unique];
  }, [tickets]);

  const notebookStats = useMemo(() => {
    const statsCount = {
      total: notebookLogs.length,
      pending: 0,
      approved: 0,
      returned: 0,
      active: 0,
    };

    notebookLogs.forEach((log) => {
      if (log.status === NOTEBOOK_LOG_STATUS.PENDING) statsCount.pending += 1;
      if (log.status === NOTEBOOK_LOG_STATUS.APPROVED) statsCount.approved += 1;
      if (log.status === NOTEBOOK_LOG_STATUS.RETURNED) statsCount.returned += 1;
      if (log.status === NOTEBOOK_LOG_STATUS.APPROVED || (log.status === NOTEBOOK_LOG_STATUS.RETURNED && !log.return_confirmed_at)) {
        statsCount.active += 1;
      }
    });

    return statsCount;
  }, [notebookLogs]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matched =
          (ticket.title || "").toLowerCase().includes(query) ||
          (ticket.ticket_no || "").toLowerCase().includes(query) ||
          (ticket.description || "").toLowerCase().includes(query) ||
          (ticket.category || "").toLowerCase().includes(query);
        if (!matched) return false;
      }

      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && ticket.status === "CLOSED") return false;
        if (statusFilter === "CLOSED" && ticket.status !== "CLOSED") return false;
        if (!["PENDING", "CLOSED"].includes(statusFilter) && ticket.status !== statusFilter) return false;
      }

      if (priorityFilter !== "ALL" && ticket.priority !== priorityFilter) return false;
      if (categoryFilter !== "ALL" && ticket.category !== categoryFilter) return false;

      return true;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const hasActiveFilters =
    !!searchQuery.trim() || statusFilter !== "ALL" || priorityFilter !== "ALL" || categoryFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryFilter("ALL");
  };

  const handleExport = async () => {
    if (filteredTickets.length === 0) {
      Swal.fire({
        icon: "info",
        title: "ไม่มีข้อมูลให้ส่งออก",
        text: "กรุณาปรับตัวกรองหรือลองอีกครั้ง",
        confirmButtonColor: BRAND_PRIMARY,
      });
      return;
    }

    const result = await Swal.fire({
      title: "ส่งออกข้อมูล",
      text: "ต้องการส่งออกเป็นไฟล์ Excel (.xlsx) พร้อมรูปประกอบหรือไม่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ส่งออก Excel",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: BRAND_PRIMARY,
      cancelButtonColor: "#6b7280",
    });
    if (!result.isConfirmed) return;

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IT Service Desk";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Ticket History", {
        views: [{ state: "frozen", ySplit: 1 }],
      });

      worksheet.columns = [
        { header: "เลขที่", key: "ticketNo", width: 16 },
        { header: "หัวข้อ", key: "title", width: 36 },
        { header: "สถานะ", key: "status", width: 16 },
        { header: "หมวดหมู่", key: "category", width: 18 },
        { header: "ความเร่งด่วน", key: "priority", width: 14 },
        { header: "วันที่แจ้ง", key: "createdAt", width: 18 },
        { header: "วันที่ปิด", key: "closedAt", width: 18 },
        { header: "รูปภาพ", key: "image", width: 14 },
        { header: "ลิงก์รูปภาพ", key: "imageLinks", width: 48 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FF1E3A8A" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E7FF" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      for (const ticket of filteredTickets) {
        const status = statusConfig[ticket.status] || statusConfig.default;
        const priority = priorityConfig[ticket.priority] || priorityConfig.default;
        const imageUrls = getTicketImageUrls(ticket);

        const row = worksheet.addRow({
          ticketNo: ticket.ticket_no || fallbackTicketNo(ticket),
          title: ticket.title || "-",
          status: status.label,
          category: ticket.category || "-",
          priority: priority.label,
          createdAt: toDisplayDateTime(ticket.created_at),
          closedAt: ticket.closed_at ? toDisplayDateTime(ticket.closed_at) : "ยังไม่ปิด",
          image: imageUrls.length > 0 ? "แนบรูปแล้ว" : "-",
          imageLinks: imageUrls.length > 0 ? imageUrls.join("\n") : "-",
        });

        row.alignment = { vertical: "middle" };
        row.getCell("B").alignment = { wrapText: true, vertical: "middle" };
        row.getCell("I").alignment = { wrapText: true, vertical: "middle" };

        if (imageUrls.length > 0) {
          const primaryImageUrl = imageUrls[0];
          try {
            const { base64, extension } = await fetchImageAsBase64(primaryImageUrl);
            const imageId = workbook.addImage({ base64, extension });
            row.height = 68;
            worksheet.addImage(imageId, {
              tl: { col: 7.2, row: row.number - 0.85 },
              ext: { width: 84, height: 84 },
              editAs: "oneCell",
            });
          } catch (imageError) {
            console.warn("Cannot embed image:", primaryImageUrl, imageError);
          }
        }
      }

      worksheet.autoFilter = {
        from: "A1",
        to: "I1",
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `ticket-history-${format(new Date(), "yyyy-MM-dd")}.xlsx`);

      Swal.fire({
        icon: "success",
        title: "ส่งออกสำเร็จ",
        text: "ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว (ระบบจะแนบรูปแรกของแต่ละ Ticket)",
        confirmButtonColor: BRAND_PRIMARY,
      });
    } catch (error) {
      console.error("Export excel error:", error);
      Swal.fire({
        icon: "error",
        title: "ส่งออกไม่สำเร็จ",
        text: "ไม่สามารถสร้างไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: BRAND_PRIMARY,
      });
    }
  };

  if (loading) {
    return (
      <div className="app-theme app-page-bg min-h-screen flex items-center justify-center px-4  selection:bg-blue-100 antialiased">
        <div className="app-surface text-center p-8">
          <div className="mx-auto h-14 w-14 rounded-2xl border-4 border-[var(--brand-border)] border-t-[var(--brand-primary)] animate-spin" />
          <p className="mt-4 text-sm font-semibold text-slate-600">{t("ticketHistory.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-theme app-page-bg min-h-screen text-slate-800  selection:bg-blue-100 antialiased">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="app-btn-secondary p-2.5"
              aria-label={t("common.backDashboard")}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
                <Sparkles size={12} />
                {t("ticketHistory.badge")}
              </p>
              <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{t("ticketHistory.title")}</h1>
              <p className="text-xs text-slate-500 sm:text-sm">{t("ticketHistory.totalItems", { count: tickets.length })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={fetchTickets}
              className="app-btn-secondary inline-flex items-center gap-2"
              title={t("ticketHistory.refresh")}
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">{t("ticketHistory.refresh")}</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="app-btn-primary inline-flex items-center gap-2"
            >
              <Download size={16} />
              <span>{t("ticketHistory.exportExcel")}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("ticketHistory.all")}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800">{stats.total}</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-soft)]">
                <FileText size={18} className="text-[var(--brand-primary)]" />
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("ticketHistory.pending")}</p>
                <p className="mt-1 text-2xl font-semibold text-amber-600">{stats.pending}</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Clock size={18} className="text-amber-600" />
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("ticketHistory.success")}</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-600">{stats.closed}</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("ticketHistory.averageTime")}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800">{stats.avgResponse}</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <TrendingUp size={18} className="text-blue-600" />
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="relative w-full xl:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขที่แจ้งซ่อม, หัวข้อ, หมวดหมู่, รายละเอียด..."
                className="app-input py-2.5 pl-11 pr-4"
              />
            </div>

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 xl:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="app-input"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="app-input"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="app-input"
              >
                <option value="ALL">ทุกหมวดหมู่</option>
                {categories
                  .filter((c) => c !== "ALL")
                  .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                <Filter size={12} />
                แสดง {filteredTickets.length} จาก {tickets.length} รายการ
              </span>
              {hasActiveFilters && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-soft)] px-2.5 py-1 font-semibold text-[var(--brand-primary)]">
                  มีตัวกรองที่ใช้งาน
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              >
                <CircleSlash size={13} />
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-12 gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 md:grid">
            <div className="col-span-4">หัวข้อ</div>
            <div className="col-span-2">สถานะ</div>
            <div className="col-span-2">ความเร่งด่วน</div>
            <div className="col-span-2">วันที่แจ้ง</div>
            <div className="col-span-2 text-right">จัดการ</div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <Search size={30} className="text-slate-300" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-700">ไม่พบรายการ</h3>
              <p className="mt-1 text-sm text-slate-500">
                {hasActiveFilters ? "ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา" : "คุณยังไม่มีประวัติการแจ้งซ่อม"}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="app-btn-primary mt-6 inline-flex items-center gap-2"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTickets.map((ticket) => {
                const status = statusConfig[ticket.status] || statusConfig.default;
                const priority = priorityConfig[ticket.priority] || priorityConfig.default;
                const StatusIcon = status.icon;

                return (
                  <article
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="cursor-pointer px-4 py-4 transition hover:bg-slate-50 sm:px-6"
                  >
                    <div className="md:hidden">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                            <Hash size={12} />
                            {ticket.ticket_no || fallbackTicketNo(ticket)}
                          </p>
                          <h3 className="mt-1 text-sm font-bold text-slate-800 line-clamp-2">{ticket.title || "ไม่ระบุหัวข้อ"}</h3>
                        </div>
                        <ChevronRight size={18} className="text-slate-300" />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.chipClass}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${priority.chipClass}`}>{priority.label}</span>
                        <span className="text-[11px] text-slate-500">{ticket.category || "ไม่ระบุหมวดหมู่"}</span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                        <Calendar size={12} />
                        <span>{toDisplayDate(ticket.created_at)}</span>
                        <span>•</span>
                        <span>{toTimeAgo(ticket.created_at)}</span>
                      </div>
                    </div>

                    <div className="hidden items-center gap-3 md:grid md:grid-cols-12">
                      <div className="col-span-4 min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-800">{ticket.title || "ไม่ระบุหัวข้อ"}</h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Hash size={11} />
                            {ticket.ticket_no || fallbackTicketNo(ticket)}
                          </span>
                          <span>•</span>
                          <span className="truncate">{ticket.category || "ไม่ระบุหมวดหมู่"}</span>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.chipClass}`}>
                          <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                          {status.label}
                        </span>
                      </div>

                      <div className="col-span-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${priority.chipClass}`}>{priority.label}</span>
                      </div>

                      <div className="col-span-2 text-sm text-slate-600">
                        <p>{toDisplayDate(ticket.created_at)}</p>
                        <p className="text-xs text-slate-400">{toTimeAgo(ticket.created_at)}</p>
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-primary)]"
                          aria-label="ดูรายละเอียด"
                        >
                          <Eye size={16} />
                        </button>
                        <ChevronRight size={17} className="text-slate-300" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
                <Sparkles size={12} />
                Notebook Center
              </p>
              <h2 className="mt-2 text-lg font-black text-slate-900 sm:text-xl">ประวัติยืม-คืนโน้ตบุ๊ก</h2>
              <p className="mt-1 text-sm text-slate-500">
                บันทึกการยืม วันที่คืน ระยะเวลา เหตุผล และสถานที่ใช้งาน
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-auto">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ทั้งหมด</p>
                <p className="mt-1 text-lg font-black text-slate-800">{notebookStats.total}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">รออนุมัติ</p>
                <p className="mt-1 text-lg font-black text-amber-600">{notebookStats.pending}</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">กำลังยืม</p>
                <p className="mt-1 text-lg font-black text-blue-600">{notebookStats.active}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">คืนแล้ว</p>
                <p className="mt-1 text-lg font-black text-emerald-600">{notebookStats.returned}</p>
              </div>
            </div>
          </div>

          {notebookError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {notebookError}
            </div>
          )}

          {notebookLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <RefreshCw size={16} className="animate-spin" />
                กำลังโหลดประวัติ notebook...
              </div>
            </div>
          ) : notebookLogs.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white">
                <AlertCircle size={22} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-700">ยังไม่มีประวัติยืม-คืน notebook</p>
              <p className="mt-1 text-xs text-slate-500">เมื่อมีการยืมหรือคืน notebook รายการจะมาแสดงในส่วนนี้</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {notebookLogs.slice(0, 12).map((log) => {
                const meta = NOTEBOOK_LOG_META[log.status] || NOTEBOOK_LOG_META.pending;
                const durationText = log.return_time
                  ? formatNotebookDuration(log.borrow_time, log.return_time)
                  : log.borrow_time
                    ? formatNotebookDuration(log.borrow_time, new Date().toISOString())
                    : "-";

                return (
                  <article key={log.log_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-2.5 py-1 text-[11px] font-semibold text-[#2b59b0]">
                            <Laptop size={12} />
                            {log.asset_code || "-"}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>
                            <Clock size={12} />
                            {meta.label}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            ยืม {log.borrow_count || 0} ครั้ง
                          </span>
                        </div>

                        <h3 className="mt-2 text-base font-bold text-slate-900">{log.model || "-"}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {log.approved_by_name || log.confirmed_by_name || "-"} • {log.notebook_status || "-"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          ยืม {formatNotebookTime(log.borrow_time || log.requested_at)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          คืน {formatNotebookTime(log.return_time)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          ใช้ไป {durationText}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr,0.8fr]">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">เหตุผล / สถานที่</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{log.reason || "-"}</p>
                        <p className="mt-2 text-sm text-slate-600">ใช้ที่: {log.location || "-"}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">รูปประกอบ</p>
                        {log.image_url ? (
                          <button
                            type="button"
                            onClick={() => window.open(log.image_url, "_blank", "noopener,noreferrer")}
                            className="mt-3 block overflow-hidden rounded-xl border border-slate-200 bg-white"
                            title="เปิดรูปประกอบ"
                          >
                            <img src={log.image_url} alt={log.asset_code || "notebook-proof"} className="h-36 w-full object-cover" />
                          </button>
                        ) : (
                          <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                            ไม่มีรูปประกอบ
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                        <UserRound size={12} />
                        ผู้ยืม: {log.user_name || "-"}
                      </span>
                      {log.return_confirmed_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                          <CheckCircle2 size={12} />
                          ยืนยันคืนแล้ว {formatNotebookTime(log.return_confirmed_at)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                          <Clock size={12} />
                          รอยืนยันจาก IT
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-primary)]">
                      {selectedTicket.ticket_no || fallbackTicketNo(selectedTicket)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${(statusConfig[selectedTicket.status] || statusConfig.default).chipClass}`}
                    >
                      {(statusConfig[selectedTicket.status] || statusConfig.default).label}
                    </span>
                  </div>
                  <h2 className="truncate text-lg font-black text-slate-900 sm:text-2xl">{selectedTicket.title || "ไม่ระบุหัวข้อ"}</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                  aria-label="ปิดหน้าต่างรายละเอียด"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="space-y-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">รายละเอียดปัญหา</p>
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                        {selectedTicket.description || "ไม่ระบุรายละเอียด"}
                      </p>
                    </div>
                  </div>

                  {(selectedTicket.attachments || selectedTicket.image_url) && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">หลักฐานที่แนบมา</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {Array.isArray(selectedTicket.attachments) && selectedTicket.attachments.length > 0
                          ? selectedTicket.attachments.map((url, index) => (
                              <button
                                key={`${url}-${index}`}
                                type="button"
                                onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                title="เปิดรูปแนบ"
                              >
                                <img
                                  src={url}
                                  alt={`หลักฐานแนบ ${index + 1}`}
                                  className="h-24 w-24 object-cover transition hover:scale-105"
                                />
                              </button>
                            ))
                          : selectedTicket.image_url && (
                              <button
                                type="button"
                                onClick={() => window.open(selectedTicket.image_url, "_blank", "noopener,noreferrer")}
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                title="เปิดรูปแนบ"
                              >
                                <img
                                  src={selectedTicket.image_url}
                                  alt="หลักฐานแนบ"
                                  className="h-24 w-24 object-cover transition hover:scale-105"
                                />
                              </button>
                            )}
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-soft)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-primary)]">ข้อมูลการซ่อม</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-semibold text-white">
                        {selectedTicket.assigned_name?.charAt(0) || "T"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{selectedTicket.assigned_name || "รอการมอบหมาย"}</p>
                        <p className="text-xs text-slate-500">ผู้รับผิดชอบ</p>
                      </div>
                    </div>

                    {selectedTicket.solution_note && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
                        <p className="text-xs font-bold text-emerald-700">สรุปการซ่อม</p>
                        <p className="mt-1 text-sm text-slate-700">{selectedTicket.solution_note}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">หมวดหมู่</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{selectedTicket.category || "ไม่ระบุ"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">สถานที่</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{selectedTicket.location || "ไม่ระบุ"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">วันที่แจ้ง</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{toDisplayDateTime(selectedTicket.created_at)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">วันที่ปิด</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {selectedTicket.closed_at ? toDisplayDateTime(selectedTicket.closed_at) : "ยังไม่ปิด"}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <X size={16} />
                  ปิด
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/create-ticket")}
                  className="app-btn-primary inline-flex flex-1 items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
                  สร้างใบแจ้งซ่อมใหม่
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


