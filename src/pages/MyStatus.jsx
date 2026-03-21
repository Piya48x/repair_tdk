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
  Sun,
  Ticket,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  formatNotebookDuration,
  formatNotebookTime,
  isNotebookPermissionDenied,
  isNotebookSchemaError,
  loadMyNotebookBorrowLogs,
  NOTEBOOK_LOG_STATUS,
} from "../services/notebookBorrowService";
import { DASHBOARD_THEME_KEY } from "./dashboard/constants";

const TICKET_STATUS_META = {
  NEW: { label: "งานใหม่", cls: "border-rose-200 bg-rose-50 text-rose-700" },
  IN_PROGRESS: { label: "กำลังซ่อม", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  CLOSED: { label: "สำเร็จ", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

const ACCESS_STATUS_META = {
  "Pending Approval": { label: "รออนุมัติ", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  Approved: { label: "อนุมัติแล้ว", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  Rejected: { label: "ไม่อนุมัติ", cls: "border-rose-200 bg-rose-50 text-rose-700" },
  Completed: { label: "ปิดงาน", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

const NOTEBOOK_STATUS_META = {
  [NOTEBOOK_LOG_STATUS.PENDING]: { label: "รออนุมัติ", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  [NOTEBOOK_LOG_STATUS.APPROVED]: { label: "กำลังยืม", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  [NOTEBOOK_LOG_STATUS.RETURNED]: { label: "รอยืนยันคืน", cls: "border-violet-200 bg-violet-50 text-violet-700" },
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
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

  const isDarkTheme = themeMode === "dark";
  const currentUserId = String(profile?.id || "");
  const currentUserName = profile?.full_name || profile?.employee_code || profile?.email || "User";

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
    setTickets(Array.isArray(ticketsResult.data) ? ticketsResult.data : []);
    setAccessRequests(Array.isArray(accessResult.data) ? accessResult.data : []);
  };

  const loadPage = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      setErrorMessage("");
      const { data: { session } = {} } = await supabase.auth.getSession();
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
        full_name: session.user.user_metadata?.full_name || session.user.email || "User",
        employee_code: session.user.user_metadata?.employee_code || "",
        email: session.user.email || "",
        role: session.user.user_metadata?.role || "user",
      };

      setProfile(nextProfile);
      await loadStatusData(session.user.id);
    } catch (error) {
      console.error("Load my status error:", error);
      if (isNotebookSchemaError(error)) {
        setErrorMessage("ยังไม่ได้ติดตั้ง schema notebook borrowing");
      } else if (isNotebookPermissionDenied(error)) {
        setErrorMessage("ไม่มีสิทธิ์ดูสถานะของฉัน หรือ RLS ยังไม่พร้อม");
      } else {
        setErrorMessage("ไม่สามารถโหลดสถานะของคุณได้");
      }
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeNotebook = useMemo(() => activeNotebookLog(notebookLogs), [notebookLogs]);
  const openTickets = useMemo(() => tickets.filter((ticket) => String(ticket?.status || "").toUpperCase() !== "CLOSED"), [tickets]);
  const activeAccessRequests = useMemo(() => accessRequests.filter((request) => String(request?.status || "") !== "Completed"), [accessRequests]);
  const latestTicketUpdate = useMemo(() => tickets[0] || null, [tickets]);
  const latestAccessUpdate = useMemo(() => accessRequests[0] || null, [accessRequests]);
  const latestNotebookUpdate = useMemo(() => notebookLogs[0] || null, [notebookLogs]);

  const notebookSummary = useMemo(() => {
    const latest = activeNotebook || latestNotebookUpdate;
    return {
      count: activeNotebook ? 1 : 0,
      label: activeNotebook ? NOTEBOOK_STATUS_META[activeNotebook.status]?.label || activeNotebook.status : "ไม่มี notebook ที่ยืมอยู่",
      code: latest?.asset_code || "-",
      model: latest?.model || "-",
      time: formatDateTime(lastUpdateValue(latest)),
    };
  }, [activeNotebook, latestNotebookUpdate]);

  const ticketSummary = useMemo(() => ({
    count: openTickets.length,
    latestAt: formatDateTime(lastUpdateValue(latestTicketUpdate)),
  }), [latestTicketUpdate, openTickets.length]);

  const accessSummary = useMemo(() => ({
    count: activeAccessRequests.length,
    latestAt: formatDateTime(lastUpdateValue(latestAccessUpdate)),
  }), [activeAccessRequests.length, latestAccessUpdate]);

  const shellClass = isDarkTheme ? "border-slate-700 bg-slate-900/80 text-slate-100" : "border-blue-100 bg-white/95 text-slate-800";
  const mutedClass = isDarkTheme ? "border-slate-700 bg-slate-800/75" : "border-slate-200 bg-slate-50";
  const headingClass = isDarkTheme ? "text-slate-100" : "text-slate-900";
  const bodyClass = isDarkTheme ? "text-slate-300" : "text-slate-600";
  const subtleClass = isDarkTheme ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkTheme ? "bg-[#0b1220] text-slate-100" : "bg-[#f4f7fb] text-slate-800"}`}>
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${isDarkTheme ? "border-slate-700 bg-[#0f172a]/95" : "border-slate-200 bg-white/90"}`}>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
              aria-label="กลับไป Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="inline-flex items-center gap-1 rounded-full border border-[#2b59b0]/15 bg-[#2b59b0]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#2b59b0]">
                <ShieldCheck size={12} />
                My Status
              </p>
              <h1 className={`mt-1 text-xl font-black sm:text-2xl ${headingClass}`}>สถานะของฉัน</h1>
              <p className={`text-xs sm:text-sm ${bodyClass}`}>Notebook, Ticket และคำขอสิทธิ์ทั้งหมดของคุณในหน้าเดียว</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
            >
              {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline">{isDarkTheme ? "โหมดสว่าง" : "โหมดมืด"}</span>
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
              รีเฟรช
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        {loading ? (
          <div className={`flex min-h-[50vh] items-center justify-center rounded-3xl border ${isDarkTheme ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              กำลังโหลดสถานะของฉัน...
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
                    label: "Notebook",
                    value: notebookSummary.count,
                    helper: notebookSummary.label,
                    icon: Laptop,
                    accent: "text-violet-600",
                  },
                  {
                    label: "Ticket ที่เปิดอยู่",
                    value: ticketSummary.count,
                    helper: ticketSummary.latestAt,
                    icon: Ticket,
                    accent: "text-indigo-600",
                  },
                  {
                    label: "คำขอสิทธิ์",
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
                  <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${subtleClass}`}>Notebook ที่ยืมอยู่</h2>
                </div>

                <div className="mt-4">
                  {activeNotebook ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${NOTEBOOK_STATUS_META[activeNotebook.status]?.cls || "border-slate-200 bg-slate-50 text-slate-700"}`}>
                          {NOTEBOOK_STATUS_META[activeNotebook.status]?.label || activeNotebook.status}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                          อัปเดต {formatDateTime(lastUpdateValue(activeNotebook))}
                        </span>
                      </div>

                      <div className={`rounded-2xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-50 bg-slate-50"}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider ${subtleClass}`}>Asset</p>
                        <h3 className={`mt-1 text-xl font-black ${headingClass}`}>{activeNotebook.asset_code || "-"}</h3>
                        <p className={`mt-1 text-sm ${bodyClass}`}>{activeNotebook.model || "-"}</p>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className={subtleClass}>เหตุผล</span>
                            <span className={`text-right font-semibold ${headingClass}`}>{activeNotebook.reason || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className={subtleClass}>สถานที่</span>
                            <span className={`text-right font-semibold ${headingClass}`}>{activeNotebook.location || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className={subtleClass}>ยืมเมื่อ</span>
                            <span className={`text-right font-semibold ${headingClass}`}>{formatNotebookTime(activeNotebook.borrow_time || activeNotebook.requested_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-2xl border border-dashed p-6 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                      <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
                      <p className={`mt-3 text-sm font-semibold ${headingClass}`}>ตอนนี้ไม่มี notebook ที่ยืมอยู่</p>
                      <p className={`mt-1 text-xs ${bodyClass}`}>ถ้ามีคำขอรออนุมัติหรือรอยืนยันคืน ระบบจะแสดงไว้ด้านบน</p>
                    </div>
                  )}
                </div>
              </article>

              <article className={`rounded-3xl border p-4 shadow-sm ${shellClass}`}>
                <div className="flex items-center gap-2">
                  <Clock3 size={16} className="text-indigo-600" />
                  <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${subtleClass}`}>Ticket ที่เปิดอยู่</h2>
                </div>

                <div className="mt-4 space-y-3">
                  {openTickets.length === 0 ? (
                    <div className={`rounded-2xl border border-dashed p-6 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/50" : "border-slate-50 bg-slate-50"}`}>
                      <p className={`text-sm font-semibold ${headingClass}`}>ไม่มี Ticket ที่เปิดอยู่</p>
                      <p className={`mt-1 text-xs ${bodyClass}`}>ทุก Ticket ของคุณถูกปิดแล้ว</p>
                    </div>
                  ) : (
                    openTickets.slice(0, 3).map((ticket) => {
                      const meta = TICKET_STATUS_META[String(ticket?.status || "").toUpperCase()] || TICKET_STATUS_META.NEW;
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
                            <span className={subtleClass}>อัปเดต {formatDateTime(lastUpdateValue(ticket))}</span>
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
                  <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${subtleClass}`}>คำขอสิทธิ์</h2>
                </div>

                <div className="mt-4 space-y-3">
                  {accessRequests.length === 0 ? (
                    <div className={`rounded-2xl border border-dashed p-6 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/50" : "border-slate-50 bg-slate-50"}`}>
                      <p className={`text-sm font-semibold ${headingClass}`}>ยังไม่มีคำขอสิทธิ์</p>
                      <p className={`mt-1 text-xs ${bodyClass}`}>ถ้าส่งคำขอไปแล้วจะแสดงที่นี่ทันที</p>
                    </div>
                  ) : (
                    accessRequests.slice(0, 3).map((request) => {
                      const meta = ACCESS_STATUS_META[request.status] || ACCESS_STATUS_META["Pending Approval"];
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
                            <span className={subtleClass}>อัปเดต {formatDateTime(lastUpdateValue(request))}</span>
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
