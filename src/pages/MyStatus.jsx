import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  Laptop,
  Loader2,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Ticket,
} from "lucide-react";
import { useScopedI18n } from "../i18n/useScopedI18n";
import { supabase } from "../lib/supabaseClient";
import {
  isNotebookPermissionDenied,
  isNotebookSchemaError,
  loadMyNotebookBorrowLogs,
  NOTEBOOK_LOG_STATUS,
} from "../services/notebookBorrowService";
import { splitTicketBuckets } from "../lib/serviceRequestUtils";
import { DASHBOARD_THEME_KEY } from "./dashboard/constants";

const MY_STATUS_TRANSLATIONS = {
  th: {
    badge: "My Status",
    title: "สถานะของฉัน",
    subtitle: "Notebook, Ticket และคำขอสิทธิ์ทั้งหมดของคุณในหน้าเดียว",
    loading: "กำลังโหลดสถานะของฉัน...",
    sections: {
      notebook: "Notebook ที่ยืมอยู่",
      tickets: "Ticket ที่เปิดอยู่",
      accessRequests: "คำขอสิทธิ์",
    },
    cards: {
      notebook: "Notebook",
      tickets: "Ticket ที่เปิดอยู่",
      accessRequests: "คำขอสิทธิ์",
    },
    labels: {
      updated: "อัปเดต",
      asset: "Asset",
      reason: "เหตุผล",
      location: "สถานที่",
      borrowedAt: "ยืมเมื่อ",
      unknownUser: "ผู้ใช้",
    },
    empty: {
      notebookTitle: "ตอนนี้ไม่มี notebook ที่ยืมอยู่",
      notebookDescription: "ถ้ามีคำขอรออนุมัติหรือรอยืนยันคืน ระบบจะแสดงไว้ด้านบน",
      ticketsTitle: "ไม่มี Ticket ที่เปิดอยู่",
      ticketsDescription: "ทุก Ticket ของคุณถูกปิดแล้ว",
      accessTitle: "ยังไม่มีคำขอสิทธิ์",
      accessDescription: "ถ้าส่งคำขอไปแล้วจะแสดงที่นี่ทันที",
    },
    summary: {
      notebookIdle: "ไม่มี notebook ที่ยืมอยู่",
    },
    errors: {
      schema: "ยังไม่ได้ติดตั้ง schema notebook borrowing",
      permission: "ไม่มีสิทธิ์ดูสถานะของฉัน หรือ RLS ยังไม่พร้อม",
      generic: "ไม่สามารถโหลดสถานะของคุณได้",
    },
    status: {
      ticket: {
        new: "งานใหม่",
        inProgress: "กำลังซ่อม",
        closed: "สำเร็จ",
      },
      access: {
        pendingApproval: "รออนุมัติ",
        approved: "อนุมัติแล้ว",
        rejected: "ไม่อนุมัติ",
        completed: "ปิดงาน",
      },
      notebook: {
        pending: "รออนุมัติ",
        approved: "กำลังยืม",
        returned: "รอยืนยันคืน",
      },
    },
  },
  en: {
    badge: "My Status",
    title: "My Status",
    subtitle: "View your notebook, tickets, and access requests in one place.",
    loading: "Loading your status...",
    sections: {
      notebook: "Borrowed Notebook",
      tickets: "Open Tickets",
      accessRequests: "Access Requests",
    },
    cards: {
      notebook: "Notebook",
      tickets: "Open Tickets",
      accessRequests: "Access Requests",
    },
    labels: {
      updated: "Updated",
      asset: "Asset",
      reason: "Reason",
      location: "Location",
      borrowedAt: "Borrowed at",
      unknownUser: "User",
    },
    empty: {
      notebookTitle: "No notebook is currently borrowed",
      notebookDescription: "Pending approvals or return confirmations will appear here automatically.",
      ticketsTitle: "No open tickets",
      ticketsDescription: "All of your tickets are already closed.",
      accessTitle: "No access requests yet",
      accessDescription: "Your requests will appear here as soon as they are submitted.",
    },
    summary: {
      notebookIdle: "No borrowed notebook",
    },
    errors: {
      schema: "The notebook borrowing schema is not installed yet.",
      permission: "You do not have permission to view this page, or the RLS policy is not ready.",
      generic: "Unable to load your status.",
    },
    status: {
      ticket: {
        new: "New",
        inProgress: "In Progress",
        closed: "Closed",
      },
      access: {
        pendingApproval: "Pending Approval",
        approved: "Approved",
        rejected: "Rejected",
        completed: "Completed",
      },
      notebook: {
        pending: "Pending Approval",
        approved: "Borrowed",
        returned: "Awaiting Return Confirmation",
      },
    },
  },
  ko: {
    badge: "My Status",
    title: "내 상태",
    subtitle: "노트북, 티켓, 권한 요청 상태를 한 곳에서 확인합니다.",
    loading: "내 상태를 불러오는 중...",
    sections: {
      notebook: "대여 중인 노트북",
      tickets: "열린 티켓",
      accessRequests: "권한 요청",
    },
    cards: {
      notebook: "노트북",
      tickets: "열린 티켓",
      accessRequests: "권한 요청",
    },
    labels: {
      updated: "업데이트",
      asset: "자산",
      reason: "사유",
      location: "위치",
      borrowedAt: "대여 시각",
      unknownUser: "사용자",
    },
    empty: {
      notebookTitle: "현재 대여 중인 노트북이 없습니다",
      notebookDescription: "승인 대기 또는 반납 확인 대기 항목이 있으면 여기에 표시됩니다.",
      ticketsTitle: "열린 티켓이 없습니다",
      ticketsDescription: "모든 티켓이 이미 종료되었습니다.",
      accessTitle: "권한 요청이 아직 없습니다",
      accessDescription: "요청을 제출하면 바로 여기에 표시됩니다.",
    },
    summary: {
      notebookIdle: "대여 중인 노트북 없음",
    },
    errors: {
      schema: "노트북 대여 스키마가 아직 설치되지 않았습니다.",
      permission: "이 페이지를 볼 권한이 없거나 RLS 정책이 아직 준비되지 않았습니다.",
      generic: "상태를 불러올 수 없습니다.",
    },
    status: {
      ticket: {
        new: "신규",
        inProgress: "진행 중",
        closed: "완료",
      },
      access: {
        pendingApproval: "승인 대기",
        approved: "승인됨",
        rejected: "반려됨",
        completed: "완료됨",
      },
      notebook: {
        pending: "승인 대기",
        approved: "대여 중",
        returned: "반납 확인 대기",
      },
    },
  },
};

const LANGUAGE_TO_LOCALE = {
  th: "th-TH",
  en: "en-US",
  ko: "ko-KR",
};

function formatDateTime(value, language) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(LANGUAGE_TO_LOCALE[language] || LANGUAGE_TO_LOCALE.en, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fallbackTicketNo(ticket) {
  return ticket?.ticket_no || `T${String(ticket?.id || "").slice(-6).toUpperCase().padStart(6, "0")}`;
}

function lastUpdateValue(row) {
  return row?.updated_at || row?.closed_at || row?.completed_at || row?.return_confirmed_at || row?.return_time || row?.approved_at || row?.created_at || row?.requested_at || "";
}

function activeNotebookLog(logs) {
  return (
    logs.find((log) => log?.status === NOTEBOOK_LOG_STATUS.APPROVED) ||
    logs.find((log) => log?.status === NOTEBOOK_LOG_STATUS.RETURNED && !log?.return_confirmed_at) ||
    logs.find((log) => log?.status === NOTEBOOK_LOG_STATUS.PENDING) ||
    null
  );
}

export default function MyStatus() {
  const navigate = useNavigate();
  const { language, tt } = useScopedI18n(MY_STATUS_TRANSLATIONS);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_THEME_KEY);
      return saved === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [notebookLogs, setNotebookLogs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);

  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_THEME_KEY, themeMode);
    } catch {
      // Ignore storage failures.
    }
  }, [themeMode]);

  const ticketStatusMeta = useMemo(
    () => ({
      NEW: { label: tt("status.ticket.new"), cls: "border-rose-200 bg-rose-50 text-rose-700" },
      IN_PROGRESS: { label: tt("status.ticket.inProgress"), cls: "border-amber-200 bg-amber-50 text-amber-700" },
      CLOSED: { label: tt("status.ticket.closed"), cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    }),
    [tt],
  );

  const accessStatusMeta = useMemo(
    () => ({
      "Pending Approval": { label: tt("status.access.pendingApproval"), cls: "border-amber-200 bg-amber-50 text-amber-700" },
      Approved: { label: tt("status.access.approved"), cls: "border-blue-200 bg-blue-50 text-blue-700" },
      Rejected: { label: tt("status.access.rejected"), cls: "border-rose-200 bg-rose-50 text-rose-700" },
      Completed: { label: tt("status.access.completed"), cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    }),
    [tt],
  );

  const notebookStatusMeta = useMemo(
    () => ({
      [NOTEBOOK_LOG_STATUS.PENDING]: { label: tt("status.notebook.pending"), cls: "border-amber-200 bg-amber-50 text-amber-700" },
      [NOTEBOOK_LOG_STATUS.APPROVED]: { label: tt("status.notebook.approved"), cls: "border-blue-200 bg-blue-50 text-blue-700" },
      [NOTEBOOK_LOG_STATUS.RETURNED]: { label: tt("status.notebook.returned"), cls: "border-violet-200 bg-violet-50 text-violet-700" },
    }),
    [tt],
  );

  const isDarkTheme = themeMode === "dark";

  const loadStatusData = async (userId) => {
    if (!userId) return;

    const [{ data: notebookData, error: notebookError }, ticketsResult, accessResult] = await Promise.all([
      loadMyNotebookBorrowLogs(),
      supabase
        .from("tickets")
        .select("*")
        .eq("creator_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("access_requests")
        .select("*")
        .eq("requester_user_id", userId)
        .order("updated_at", { ascending: false }),
    ]);

    if (notebookError) throw notebookError;
    if (ticketsResult.error) throw ticketsResult.error;
    if (accessResult.error) throw accessResult.error;

    setNotebookLogs(Array.isArray(notebookData) ? notebookData : []);
    setTickets(splitTicketBuckets(ticketsResult.data || []).repairTickets);
    setAccessRequests(Array.isArray(accessResult.data) ? accessResult.data : []);
  };

  const loadPage = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      setErrorMessage("");
      const {
        data: { session } = {},
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/", { replace: true });
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const nextProfile = profileData || {
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || session.user.email || tt("labels.unknownUser"),
        employee_code: session.user.user_metadata?.employee_code || "",
        email: session.user.email || "",
        role: session.user.user_metadata?.role || "user",
      };

      setProfile(nextProfile);
      await loadStatusData(session.user.id);
    } catch (error) {
      console.error("Load my status error:", error);
      if (isNotebookSchemaError(error)) {
        setErrorMessage(tt("errors.schema"));
      } else if (isNotebookPermissionDenied(error)) {
        setErrorMessage(tt("errors.permission"));
      } else {
        setErrorMessage(tt("errors.generic"));
      }
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const activeNotebook = useMemo(() => activeNotebookLog(notebookLogs), [notebookLogs]);
  const openTickets = useMemo(() => tickets.filter((ticket) => String(ticket?.status || "").toUpperCase() !== "CLOSED"), [tickets]);
  const activeAccessRequests = useMemo(
    () => accessRequests.filter((request) => String(request?.status || "") !== "Completed"),
    [accessRequests],
  );
  const latestTicketUpdate = useMemo(() => tickets[0] || null, [tickets]);
  const latestAccessUpdate = useMemo(() => accessRequests[0] || null, [accessRequests]);
  const latestNotebookUpdate = useMemo(() => notebookLogs[0] || null, [notebookLogs]);

  const notebookSummary = useMemo(() => {
    const latest = activeNotebook || latestNotebookUpdate;
    return {
      count: activeNotebook ? 1 : 0,
      label: activeNotebook ? notebookStatusMeta[activeNotebook.status]?.label || activeNotebook.status : tt("summary.notebookIdle"),
      code: latest?.asset_code || "-",
      model: latest?.model || "-",
      time: formatDateTime(lastUpdateValue(latest), language),
    };
  }, [activeNotebook, language, latestNotebookUpdate, notebookStatusMeta, tt]);

  const ticketSummary = useMemo(
    () => ({
      count: openTickets.length,
      latestAt: formatDateTime(lastUpdateValue(latestTicketUpdate), language),
    }),
    [language, latestTicketUpdate, openTickets.length],
  );

  const accessSummary = useMemo(
    () => ({
      count: activeAccessRequests.length,
      latestAt: formatDateTime(lastUpdateValue(latestAccessUpdate), language),
    }),
    [activeAccessRequests.length, language, latestAccessUpdate],
  );

  const shellClass = isDarkTheme ? "border-slate-700 bg-slate-900/80 text-slate-100" : "border-blue-100 bg-white/95 text-slate-800";
  const mutedClass = isDarkTheme ? "border-slate-700 bg-slate-800/75" : "border-slate-200 bg-slate-50";
  const headingClass = isDarkTheme ? "text-slate-100" : "text-slate-900";
  const bodyClass = isDarkTheme ? "text-slate-300" : "text-slate-600";
  const subtleClass = isDarkTheme ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`min-h-screen overflow-x-clip transition-colors duration-300 ${isDarkTheme ? "bg-[#0b1220] text-slate-100" : "bg-[#f4f7fb] text-slate-800"}`}>
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${isDarkTheme ? "border-slate-700 bg-[#0f172a]/95" : "border-slate-200 bg-white/90"}`}>
        <div className="app-safe-top mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
              aria-label={tt("common.backDashboard")}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="inline-flex items-center gap-1 rounded-full border border-[#2b59b0]/15 bg-[#2b59b0]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#2b59b0]">
                <ShieldCheck size={12} />
                {tt("badge")}
              </p>
              <h1 className={`mt-1 text-xl font-black sm:text-2xl ${headingClass}`}>{tt("title")}</h1>
              <p className={`text-xs sm:text-sm ${bodyClass}`}>{tt("subtitle")}</p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={() => setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
            >
              {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline">{isDarkTheme ? tt("common.lightMode") : tt("common.darkMode")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                loadPage({ silent: true });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2b59b0] to-[#244a95] px-3 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_-18px_rgba(43,89,176,0.7)]"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {tt("common.refresh")}
            </button>
          </div>
        </div>
      </header>

      <main className="app-safe-bottom mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        {loading ? (
          <div className={`flex min-h-[50vh] items-center justify-center rounded-3xl border ${isDarkTheme ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              {tt("loading")}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {errorMessage && (
              <div className={`rounded-3xl border px-4 py-3 text-sm font-medium ${isDarkTheme ? "border-rose-700 bg-rose-900/30 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                {errorMessage}
              </div>
            )}

            <section className={`rounded-3xl border p-4 shadow-sm ${shellClass}`}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  {
                    label: tt("cards.notebook"),
                    value: notebookSummary.count,
                    helper: notebookSummary.label,
                    icon: Laptop,
                    accent: "text-violet-600",
                  },
                  {
                    label: tt("cards.tickets"),
                    value: ticketSummary.count,
                    helper: ticketSummary.latestAt,
                    icon: Ticket,
                    accent: "text-indigo-600",
                  },
                  {
                    label: tt("cards.accessRequests"),
                    value: accessSummary.count,
                    helper: accessSummary.latestAt,
                    icon: FileText,
                    accent: "text-emerald-600",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.label} className={`rounded-3xl border p-4 ${mutedClass}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${subtleClass}`}>{item.label}</p>
                          <p className={`mt-2 text-3xl font-black ${item.accent}`}>{item.value}</p>
                          <p className={`mt-2 text-xs ${bodyClass}`}>{item.helper}</p>
                        </div>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${isDarkTheme ? "border-slate-700 bg-slate-900" : "border-white bg-white"}`}>
                          <Icon size={18} className={item.accent} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <article className={`rounded-3xl border p-4 shadow-sm ${shellClass}`}>
                <div className="flex items-center gap-2">
                  <Laptop size={16} className="text-violet-600" />
                  <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${subtleClass}`}>{tt("sections.notebook")}</h2>
                </div>

                <div className="mt-4">
                  {activeNotebook ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${notebookStatusMeta[activeNotebook.status]?.cls || "border-slate-200 bg-slate-50 text-slate-700"}`}>
                          {notebookStatusMeta[activeNotebook.status]?.label || activeNotebook.status}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                          {tt("labels.updated")} {formatDateTime(lastUpdateValue(activeNotebook), language)}
                        </span>
                      </div>

                      <div className={`rounded-2xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-50 bg-slate-50"}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider ${subtleClass}`}>{tt("labels.asset")}</p>
                        <h3 className={`mt-1 text-xl font-black ${headingClass}`}>{activeNotebook.asset_code || notebookSummary.code}</h3>
                        <p className={`mt-1 text-sm ${bodyClass}`}>{activeNotebook.model || notebookSummary.model}</p>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className={subtleClass}>{tt("labels.reason")}</span>
                            <span className={`text-right font-semibold ${headingClass}`}>{activeNotebook.reason || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className={subtleClass}>{tt("labels.location")}</span>
                            <span className={`text-right font-semibold ${headingClass}`}>{activeNotebook.location || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className={subtleClass}>{tt("labels.borrowedAt")}</span>
                            <span className={`text-right font-semibold ${headingClass}`}>{formatDateTime(activeNotebook.borrow_time || activeNotebook.requested_at, language)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-2xl border border-dashed p-6 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                      <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
                      <p className={`mt-3 text-sm font-semibold ${headingClass}`}>{tt("empty.notebookTitle")}</p>
                      <p className={`mt-1 text-xs ${bodyClass}`}>{tt("empty.notebookDescription")}</p>
                    </div>
                  )}
                </div>
              </article>

              <article className={`rounded-3xl border p-4 shadow-sm ${shellClass}`}>
                <div className="flex items-center gap-2">
                  <Clock3 size={16} className="text-indigo-600" />
                  <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${subtleClass}`}>{tt("sections.tickets")}</h2>
                </div>

                <div className="mt-4 space-y-3">
                  {openTickets.length === 0 ? (
                    <div className={`rounded-2xl border border-dashed p-6 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/50" : "border-slate-50 bg-slate-50"}`}>
                      <p className={`text-sm font-semibold ${headingClass}`}>{tt("empty.ticketsTitle")}</p>
                      <p className={`mt-1 text-xs ${bodyClass}`}>{tt("empty.ticketsDescription")}</p>
                    </div>
                  ) : (
                    openTickets.slice(0, 3).map((ticket) => {
                      const meta = ticketStatusMeta[String(ticket?.status || "").toUpperCase()] || ticketStatusMeta.NEW;
                      return (
                        <div key={ticket.id} className={`rounded-2xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-50 bg-slate-50"}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
                              {fallbackTicketNo(ticket)}
                            </span>
                          </div>
                          <h3 className={`mt-2 text-sm font-black ${headingClass}`}>{ticket.title || "-"}</h3>
                          <p className={`mt-1 text-sm ${bodyClass}`}>{ticket.category || "-"} • {ticket.priority || "-"}</p>
                          <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                            <span className={subtleClass}>{tt("labels.updated")} {formatDateTime(lastUpdateValue(ticket), language)}</span>
                            <span className={`font-semibold ${headingClass}`}>{ticket.location || "-"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>

              <article className={`rounded-3xl border p-4 shadow-sm ${shellClass}`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${subtleClass}`}>{tt("sections.accessRequests")}</h2>
                </div>

                <div className="mt-4 space-y-3">
                  {accessRequests.length === 0 ? (
                    <div className={`rounded-2xl border border-dashed p-6 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/50" : "border-slate-50 bg-slate-50"}`}>
                      <p className={`text-sm font-semibold ${headingClass}`}>{tt("empty.accessTitle")}</p>
                      <p className={`mt-1 text-xs ${bodyClass}`}>{tt("empty.accessDescription")}</p>
                    </div>
                  ) : (
                    accessRequests.slice(0, 3).map((request) => {
                      const meta = accessStatusMeta[request.status] || accessStatusMeta["Pending Approval"];
                      return (
                        <div key={request.id} className={`rounded-2xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-50 bg-slate-50"}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
                              {request.access_type || "-"}
                            </span>
                          </div>
                          <h3 className={`mt-2 text-sm font-black ${headingClass}`}>{request.system_name || "-"}</h3>
                          <p className={`mt-1 text-sm ${bodyClass}`}>{request.reason || "-"}</p>
                          <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                            <span className={subtleClass}>{tt("labels.updated")} {formatDateTime(lastUpdateValue(request), language)}</span>
                            <span className={`font-semibold ${headingClass}`}>{request.approver || "-"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
