import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Laptop,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../../lib/supabaseClient";
import {
  approveNotebookBorrow,
  confirmNotebookReturn,
  formatNotebookDuration,
  formatNotebookTime,
  isNotebookPermissionDenied,
  isNotebookSchemaError,
  loadNotebookRequestQueue,
  NOTEBOOK_LOG_STATUS,
  normalizeText,
} from "../../../services/notebookBorrowService";

const LOG_STATUS_META = {
  [NOTEBOOK_LOG_STATUS.PENDING]: {
    label: "รออนุมัติ",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  [NOTEBOOK_LOG_STATUS.APPROVED]: {
    label: "กำลังใช้งาน",
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
  [NOTEBOOK_LOG_STATUS.RETURNED]: {
    label: "รอยืนยันคืน",
    cls: "border-violet-200 bg-violet-50 text-violet-700",
  },
};

const NOTEBOOK_STATUS_META = {
  available: {
    label: "พร้อมใช้",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  borrowed: {
    label: "ถูกยืม",
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
  repair: {
    label: "ซ่อม",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const formatDuration = (startValue, endValue) => {
  if (!startValue) return "-";
  const end = endValue ? new Date(endValue) : new Date();
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  return formatNotebookDuration(start, end);
};

const NotebookBorrowRequestsPage = ({ theme, uiTheme, currentUser }) => {
  const channelRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const loadQueue = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await loadNotebookRequestQueue();
      if (error) throw error;
      setQueue(Array.isArray(data) ? data : []);
      setErrorMessage("");
    } catch (error) {
      console.error("Load notebook queue error:", error);
      if (isNotebookSchemaError(error)) {
        setErrorMessage("ยังไม่ได้ติดตั้ง schema notebook borrowing");
      } else if (isNotebookPermissionDenied(error)) {
        setErrorMessage("สิทธิ์ไม่พอหรือ role ยังไม่ผ่าน notebook RLS (ต้องเป็น it_support/admin/it_manager และรัน SQL ล่าสุด)");
      } else {
        setErrorMessage("ไม่สามารถโหลดรายการยืม-คืนโน้ตบุ๊กได้");
      }
      setQueue([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel("admin-notebook-borrow-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "borrow_logs" }, () => {
        loadQueue({ silent: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notebooks" }, () => {
        loadQueue({ silent: true });
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [loadQueue]);

  const summary = useMemo(() => {
    const count = {
      total: queue.length,
      pending: 0,
      approved: 0,
      returned: 0,
      active: 0,
    };

    queue.forEach((item) => {
      if (item.status === NOTEBOOK_LOG_STATUS.PENDING) count.pending += 1;
      if (item.status === NOTEBOOK_LOG_STATUS.APPROVED) count.approved += 1;
      if (item.status === NOTEBOOK_LOG_STATUS.RETURNED) count.returned += 1;
      if (item.status === NOTEBOOK_LOG_STATUS.APPROVED || (item.status === NOTEBOOK_LOG_STATUS.RETURNED && !item.return_confirmed_at)) {
        count.active += 1;
      }
    });

    return count;
  }, [queue]);

  const filteredQueue = useMemo(() => {
    const keyword = normalizeText(searchQuery).toLowerCase();

    return queue.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!keyword) return true;

      const source = [
        item.asset_code,
        item.model,
        item.user_name,
        item.user_role,
        item.reason,
        item.location,
        item.status,
        item.notebook_status,
      ]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");

      return source.includes(keyword);
    });
  }, [queue, searchQuery, statusFilter]);

  const handleApprove = useCallback(
    async (logId) => {
      if (!logId) return;
      setUpdatingId(String(logId));
      try {
        const { error } = await approveNotebookBorrow(Number(logId));
        if (error) throw error;
        toast.success("อนุมัติการยืมเรียบร้อยแล้ว");
        await loadQueue({ silent: true });
      } catch (error) {
        console.error("Approve notebook borrow error:", error);
        if (isNotebookSchemaError(error)) toast.error("ยังไม่ได้ติดตั้ง schema notebook borrowing");
        else if (isNotebookPermissionDenied(error)) toast.error("ไม่มีสิทธิ์อนุมัติรายการนี้");
        else toast.error(error?.message || "อนุมัติไม่สำเร็จ");
      } finally {
        setUpdatingId("");
      }
    },
    [loadQueue],
  );

  const handleConfirmReturn = useCallback(
    async (logId) => {
      if (!logId) return;
      setUpdatingId(String(logId));
      try {
        const { error } = await confirmNotebookReturn(Number(logId));
        if (error) throw error;
        toast.success("ยืนยันการคืน notebook แล้ว");
        await loadQueue({ silent: true });
      } catch (error) {
        console.error("Confirm notebook return error:", error);
        if (isNotebookSchemaError(error)) toast.error("ยังไม่ได้ติดตั้ง schema notebook borrowing");
        else if (isNotebookPermissionDenied(error)) toast.error("ไม่มีสิทธิ์ยืนยันคืนรายการนี้");
        else toast.error(error?.message || "ยืนยันคืนไม่สำเร็จ");
      } finally {
        setUpdatingId("");
      }
    },
    [loadQueue],
  );

  return (
    <>
      <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className={`text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
            อนุมัติยืม-คืนโน้ตบุ๊ก
          </h2>
          <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
            แยกจากระบบแจ้งซ่อม ใช้ตรวจสอบคำขอยืมและการคืน notebook แบบศูนย์กลาง
          </p>
        </div>

        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${uiTheme.statusBadge}`}>
          <Laptop size={14} />
          {currentUser?.name || "IT Desk"}
        </div>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ทั้งหมด</p>
          <p className="mt-1.5 text-2xl font-black text-[#2b59b0]">{summary.total}</p>
        </article>
        <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>รออนุมัติ</p>
          <p className="mt-1.5 text-2xl font-black text-amber-500">{summary.pending}</p>
        </article>
        <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>กำลังยืม</p>
          <p className="mt-1.5 text-2xl font-black text-blue-500">{summary.active}</p>
        </article>
        <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>คืนแล้ว</p>
          <p className="mt-1.5 text-2xl font-black text-emerald-500">{summary.returned}</p>
        </article>
      </section>

      <section className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ค้นหาจาก asset code, model, ผู้ยืม, เหตุผล, สถานที่"
              className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm ${uiTheme.searchInputMobile}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value={NOTEBOOK_LOG_STATUS.PENDING}>รออนุมัติ</option>
              <option value={NOTEBOOK_LOG_STATUS.APPROVED}>กำลังยืม</option>
              <option value={NOTEBOOK_LOG_STATUS.RETURNED}>รอยืนยันคืน</option>
            </select>

            <button
              type="button"
              onClick={() => loadQueue()}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${uiTheme.statusButton}`}
            >
              <RefreshCw size={14} />
              รีเฟรช
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              กำลังโหลดรายการ notebook...
            </div>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className={`mt-4 rounded-xl border border-dashed p-8 text-center ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-slate-50"}`}>
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${theme === "dark" ? "bg-slate-800" : "bg-white"}`}>
              <AlertCircle size={22} className="text-slate-300" />
            </div>
            <p className={`text-sm font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>ไม่พบรายการยืม-คืนโน้ตบุ๊ก</p>
            <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ปรับตัวกรองหรือรีเฟรชข้อมูลเพื่อดูรายการล่าสุด</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredQueue.map((row) => {
              const logMeta = LOG_STATUS_META[row.status] || LOG_STATUS_META[NOTEBOOK_LOG_STATUS.PENDING];
              const notebookMeta = NOTEBOOK_STATUS_META[row.notebook_status] || NOTEBOOK_STATUS_META.available;
              const canApprove = row.status === NOTEBOOK_LOG_STATUS.PENDING;
              const canConfirm = row.status === NOTEBOOK_LOG_STATUS.RETURNED && !row.return_confirmed_at;
              const durationText = formatDuration(row.borrow_time, row.return_time);

              return (
                <article
                  key={row.log_id}
                  className={`rounded-2xl border p-4 ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${notebookMeta.cls}`}>
                          <Laptop size={12} />
                          {row.asset_code || "-"}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${logMeta.cls}`}>
                          <ShieldCheck size={12} />
                          {logMeta.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                          {row.borrow_count || 0} ครั้ง
                        </span>
                      </div>

                      <h3 className={`mt-3 text-base font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                        {row.model || "-"}
                      </h3>
                      <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                        {row.user_name || "-"} {row.user_role ? `• ${row.user_role}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {row.notebook_status || "-"}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {formatNotebookTime(row.requested_at)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-slate-50"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ยืมเมื่อ</p>
                      <p className={`mt-1 text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{formatNotebookTime(row.borrow_time || row.requested_at)}</p>
                    </div>
                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-slate-50"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>คืนเมื่อ</p>
                      <p className={`mt-1 text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{formatNotebookTime(row.return_time)}</p>
                    </div>
                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-slate-50"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ระยะเวลา</p>
                      <p className={`mt-1 text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{durationText}</p>
                    </div>
                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-slate-50"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>คนอนุมัติ</p>
                      <p className={`mt-1 text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{row.approved_by_name || row.confirmed_by_name || "-"}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr,0.8fr]">
                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-50 bg-slate-50"}`}>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-[#2b59b0]" />
                        <p className={`text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>เหตุผล / สถานที่</p>
                      </div>
                      <p className={`mt-2 whitespace-pre-line text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                        {row.reason || "-"}
                      </p>
                      <p className={`mt-2 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                        ใช้ที่: {row.location || "-"}
                      </p>
                    </div>

                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-50 bg-slate-50"}`}>
                      <div className="flex items-center gap-2">
                        <ImageIcon size={14} className="text-[#2b59b0]" />
                        <p className={`text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>รูปประกอบ</p>
                      </div>
                      {row.image_url ? (
                        <button
                          type="button"
                          onClick={() => window.open(row.image_url, "_blank", "noopener,noreferrer")}
                          className="mt-3 block overflow-hidden rounded-xl border border-slate-200 bg-white"
                          title="เปิดรูปประกอบ"
                        >
                          <img src={row.image_url} alt={row.asset_code || "notebook-proof"} className="h-36 w-full object-cover" />
                        </button>
                      ) : (
                        <div className={`mt-3 rounded-xl border border-dashed p-5 text-center ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                          ไม่มีรูปประกอบ
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    {canApprove && (
                      <button
                        type="button"
                        onClick={() => handleApprove(row.log_id)}
                        disabled={updatingId === String(row.log_id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {updatingId === String(row.log_id) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        อนุมัติ
                      </button>
                    )}

                    {canConfirm && (
                      <button
                        type="button"
                        onClick={() => handleConfirmReturn(row.log_id)}
                        disabled={updatingId === String(row.log_id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                      >
                        {updatingId === String(row.log_id) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        ยืนยันคืน
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
};

export default NotebookBorrowRequestsPage;
