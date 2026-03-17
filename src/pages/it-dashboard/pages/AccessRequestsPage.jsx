import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCheck,
  CheckCircle2,
  Clock3,
  KeyRound,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

const STATUS_VALUES = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

const STATUS_BADGE_CLASS = {
  [STATUS_VALUES.PENDING]: "border-amber-200 bg-amber-50 text-amber-700",
  [STATUS_VALUES.APPROVED]: "border-blue-200 bg-blue-50 text-blue-700",
  [STATUS_VALUES.REJECTED]: "border-rose-200 bg-rose-50 text-rose-700",
  [STATUS_VALUES.COMPLETED]: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const AccessRequestsPage = ({ theme, uiTheme, currentUser }) => {
  const channelRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const loadRequests = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const { data, error } = await supabase
        .from("access_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;

      setRequests(data || []);
      setErrorMessage("");
    } catch (error) {
      console.error("Load access requests for admin error:", error);
      setErrorMessage("ไม่สามารถโหลดข้อมูลคำขอสิทธิ์ระบบได้");
      setRequests([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel("admin-access-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "access_requests",
        },
        () => {
          loadRequests({ silent: true });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [loadRequests]);

  const summary = useMemo(() => {
    const count = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };

    requests.forEach((item) => {
      if (item.status === STATUS_VALUES.PENDING) count.pending += 1;
      if (item.status === STATUS_VALUES.APPROVED) count.approved += 1;
      if (item.status === STATUS_VALUES.REJECTED) count.rejected += 1;
      if (item.status === STATUS_VALUES.COMPLETED) count.completed += 1;
    });

    return count;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const keyword = normalize(searchQuery);

    return requests.filter((item) => {
      const statusMatched = statusFilter === "ALL" ? true : item.status === statusFilter;
      if (!statusMatched) return false;
      if (!keyword) return true;

      const source = [
        item.requester_name,
        item.department,
        item.system_name,
        item.reason,
        item.approver,
      ]
        .map((value) => normalize(value))
        .join(" ");

      return source.includes(keyword);
    });
  }, [requests, searchQuery, statusFilter]);

  const handleStatusUpdate = async (requestId, nextStatus) => {
    if (!requestId) return;

    try {
      setUpdatingId(requestId);

      const payload = {
        status: nextStatus,
        processed_by: currentUser?.id || null,
        processed_by_name: currentUser?.name || "IT Admin",
        processed_at: new Date().toISOString(),
      };

      if (nextStatus === STATUS_VALUES.COMPLETED) {
        payload.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("access_requests")
        .update(payload)
        .eq("id", requestId);

      if (error) throw error;

      await loadRequests({ silent: true });
    } catch (error) {
      console.error("Update access request status from admin error:", error);
      setErrorMessage("อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <>
      <section className="mb-4">
        <h2 className={`text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
          จัดการคำขอสิทธิ์ระบบ
        </h2>
        <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
          อนุมัติ ปฏิเสธ และปิดงานคำขอสิทธิ์ระบบจากพนักงานในหน้าเดียว
        </p>
      </section>

      <section className="mb-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
            <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Pending Approval</p>
            <p className="mt-1.5 text-2xl font-black text-amber-500">{summary.pending}</p>
          </article>
          <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
            <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Approved</p>
            <p className="mt-1.5 text-2xl font-black text-blue-500">{summary.approved}</p>
          </article>
          <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
            <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Rejected</p>
            <p className="mt-1.5 text-2xl font-black text-rose-500">{summary.rejected}</p>
          </article>
          <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
            <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Completed</p>
            <p className="mt-1.5 text-2xl font-black text-emerald-500">{summary.completed}</p>
          </article>
        </div>
      </section>

      <section className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ค้นหาจากชื่อผู้ขอ, ระบบ, เหตุผล"
              className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm ${uiTheme.searchInputMobile}`}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value={STATUS_VALUES.PENDING}>Pending Approval</option>
              <option value={STATUS_VALUES.APPROVED}>Approved</option>
              <option value={STATUS_VALUES.REJECTED}>Rejected</option>
              <option value={STATUS_VALUES.COMPLETED}>Completed</option>
            </select>

            <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${uiTheme.statusBadge}`}>
              <KeyRound size={12} />
              {filteredRequests.length.toLocaleString("th-TH")} รายการ
            </span>
          </div>
        </div>

        {errorMessage && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
            {errorMessage}
          </p>
        )}

        <div className="mt-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-[#2b59b0]" />
            </div>
          )}

          {!loading && filteredRequests.length === 0 && (
            <div className={`rounded-xl border border-dashed p-8 text-center ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-sm font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-600"}`}>
                ไม่มีคำขอสิทธิ์ระบบในขณะนี้
              </p>
            </div>
          )}

          {!loading && filteredRequests.map((item) => {
            const badgeClass = STATUS_BADGE_CLASS[item.status] || STATUS_BADGE_CLASS[STATUS_VALUES.PENDING];
            const isUpdating = updatingId === item.id;

            return (
              <article
                key={item.id}
                className={`rounded-xl border p-4 ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}>
                        {item.status || STATUS_VALUES.PENDING}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-600 bg-[#162136] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        <ShieldCheck size={11} />
                        {item.access_type || "Read"}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-600 bg-[#162136] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        <Clock3 size={11} />
                        {formatDateTime(item.created_at)}
                      </span>
                    </div>

                    <p className={`mt-2 text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                      {item.system_name || "ไม่ระบุระบบ"}
                    </p>
                    <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                      {item.reason || "-"}
                    </p>

                    <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      <span className={`rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"}`}>
                        ผู้ขอ: {item.requester_name || "-"}
                      </span>
                      <span className={`rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"}`}>
                        แผนก: {item.department || "ไม่ระบุ"}
                      </span>
                      <span className={`rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"}`}>
                        ผู้อนุมัติ: {item.approver || "-"}
                      </span>
                      {item.processed_by_name && (
                        <span className={`rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"}`}>
                          ล่าสุดโดย: {item.processed_by_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {item.status === STATUS_VALUES.PENDING && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleStatusUpdate(item.id, STATUS_VALUES.APPROVED)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                        >
                          <CheckCircle2 size={13} />
                          อนุมัติ
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleStatusUpdate(item.id, STATUS_VALUES.REJECTED)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                        >
                          <XCircle size={13} />
                          ปฏิเสธ
                        </button>
                      </>
                    )}

                    {item.status === STATUS_VALUES.APPROVED && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleStatusUpdate(item.id, STATUS_VALUES.COMPLETED)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        <CheckCheck size={13} />
                        Completed
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default AccessRequestsPage;
