import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  XCircle,
  Clock3,
  CheckCheck,
  Search,
  Plus,
  X,
  User,
  Building2,
  Monitor,
  Sparkles,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const STATUS_VALUES = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

const STATUS_META = {
  [STATUS_VALUES.PENDING]: {
    label: "Pending Approval",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  [STATUS_VALUES.APPROVED]: {
    label: "Approved",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  [STATUS_VALUES.REJECTED]: {
    label: "Rejected",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
  [STATUS_VALUES.COMPLETED]: {
    label: "Completed",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

const ACCESS_TYPE_OPTIONS = ["Read", "Write", "Admin"];

const URGENCY_OPTIONS = [
  { value: "low", label: "ต่ำ" },
  { value: "normal", label: "ปกติ" },
  { value: "high", label: "สูง" },
  { value: "urgent", label: "ด่วน" },
];

const APPROVER_OPTIONS = [
  { value: "Manager", label: "Manager" },
  { value: "IT Admin", label: "IT Admin" },
];

const createDefaultForm = (profile = null, fallbackName = "") => ({
  requesterName: profile?.full_name || fallbackName,
  department: profile?.department || "",
  systemName: "",
  accessType: "Read",
  reason: "",
  urgency: "normal",
  approver: "Manager",
});

const isManagementRole = (role) => role === "it_support" || role === "admin";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const AccessRequest = () => {
  const navigate = useNavigate();
  const channelRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [profile, setProfile] = useState(null);
  const [sessionName, setSessionName] = useState("");
  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState(createDefaultForm());

  const loadRequests = useCallback(async (targetUserId, role, { silent = false } = {}) => {
    if (!targetUserId) return;
    if (!silent) setLoading(true);

    try {
      let query = supabase
        .from("access_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);

      if (!isManagementRole(role)) {
        query = query.eq("requester_user_id", targetUserId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRequests(data || []);
      setLoadError("");
    } catch (error) {
      console.error("Load access requests error:", error);
      setLoadError("ไม่สามารถโหลดคำขอสิทธิ์ระบบได้");
      setRequests([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const setupRealtime = useCallback(
    (targetUserId, role) => {
      if (!targetUserId) return;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = supabase
        .channel(`access-request-page-${targetUserId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "access_requests",
          },
          (payload) => {
            if (!isManagementRole(role)) {
              const nextRequester = payload.new?.requester_user_id;
              const prevRequester = payload.old?.requester_user_id;
              if (nextRequester !== targetUserId && prevRequester !== targetUserId) return;
            }

            loadRequests(targetUserId, role, { silent: true });
          }
        )
        .subscribe();
    },
    [loadRequests]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          navigate("/", { replace: true });
          return;
        }

        const fallbackName =
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "ผู้ใช้งาน";

        if (!mounted) return;

        setUserId(session.user.id);
        setSessionName(fallbackName);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, department, role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!mounted) return;

        const resolvedRole = profileData?.role || "user";
        setProfile(profileData || null);
        setUserRole(resolvedRole);
        setFormData(createDefaultForm(profileData, fallbackName));

        await loadRequests(session.user.id, resolvedRole);
        setupRealtime(session.user.id, resolvedRole);
      } catch (error) {
        console.error("Access request init error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [loadRequests, navigate, setupRealtime]);

  const canManage = isManagementRole(userRole);

  const summary = useMemo(() => {
    const count = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };

    requests.forEach((item) => {
      const status = item?.status;
      if (status === STATUS_VALUES.PENDING) count.pending += 1;
      if (status === STATUS_VALUES.APPROVED) count.approved += 1;
      if (status === STATUS_VALUES.REJECTED) count.rejected += 1;
      if (status === STATUS_VALUES.COMPLETED) count.completed += 1;
    });

    return {
      ...count,
      total: count.pending + count.approved + count.rejected + count.completed,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const keyword = normalize(searchQuery);

    return requests.filter((item) => {
      const statusMatched = statusFilter === "ALL" ? true : item.status === statusFilter;
      if (!statusMatched) return false;
      if (!keyword) return true;

      const haystack = [
        item.system_name,
        item.reason,
        item.department,
        item.requester_name,
        item.approver,
      ]
        .map((entry) => normalize(entry))
        .join(" ");

      return haystack.includes(keyword);
    });
  }, [requests, searchQuery, statusFilter]);

  const openDrawer = () => {
    setFormError("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setFormError("");
  };

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userId || saving) return;

    if (!formData.systemName.trim() || !formData.reason.trim()) {
      setFormError("กรุณากรอกระบบที่ต้องการเข้าถึงและเหตุผลในการขอสิทธิ์");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        requester_user_id: userId,
        requester_name: formData.requesterName.trim() || profile?.full_name || sessionName || "ผู้ใช้งาน",
        department: formData.department.trim() || profile?.department || null,
        system_name: formData.systemName.trim(),
        access_type: formData.accessType,
        reason: formData.reason.trim(),
        urgency: formData.urgency,
        approver: formData.approver,
        status: STATUS_VALUES.PENDING,
      };

      const { error } = await supabase.from("access_requests").insert(payload);
      if (error) throw error;

      setFormData(createDefaultForm(profile, sessionName));
      closeDrawer();
      await loadRequests(userId, userRole, { silent: true });
    } catch (error) {
      console.error("Create access request error:", error);
      setFormError("ไม่สามารถบันทึกคำขอสิทธิ์ได้ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async (requestId, nextStatus) => {
    if (!canManage || !requestId) return;

    const nextPayload = {
      status: nextStatus,
      processed_by: userId,
      processed_by_name: profile?.full_name || sessionName || "IT Admin",
      processed_at: new Date().toISOString(),
    };

    if (nextStatus === STATUS_VALUES.COMPLETED) {
      nextPayload.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("access_requests")
      .update(nextPayload)
      .eq("id", requestId);

    if (error) {
      console.error("Update access request status error:", error);
      setLoadError("อัปเดตสถานะคำขอสิทธิ์ไม่สำเร็จ");
      return;
    }

    await loadRequests(userId, userRole, { silent: true });
  };

  return (
    <div className="app-theme app-page-bg min-h-screen text-slate-800">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="app-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="app-btn-secondary mt-0.5 inline-flex items-center gap-2"
              >
                <ArrowLeft size={15} />
                กลับ Dashboard
              </button>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-1 text-[11px] font-bold text-[var(--brand-primary)]">
                  <KeyRound size={13} />
                  Access Request
                </div>
                <h1 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">ขอสิทธิ์ระบบ</h1>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  ส่งคำขอเข้าถึงระบบผ่าน workflow และติดตามสถานะอนุมัติแบบเรียลไทม์
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openDrawer}
              className="app-btn-primary inline-flex items-center gap-2"
            >
              <Plus size={15} />
              สร้างคำขอสิทธิ์
            </button>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article className="app-surface p-4">
            <p className="text-xs font-semibold text-slate-500">Pending Approval</p>
            <p className="mt-2 text-3xl font-black text-amber-600">{summary.pending}</p>
          </article>
          <article className="app-surface p-4">
            <p className="text-xs font-semibold text-slate-500">Approved</p>
            <p className="mt-2 text-3xl font-black text-blue-600">{summary.approved}</p>
          </article>
          <article className="app-surface p-4">
            <p className="text-xs font-semibold text-slate-500">Rejected</p>
            <p className="mt-2 text-3xl font-black text-rose-600">{summary.rejected}</p>
          </article>
          <article className="app-surface p-4">
            <p className="text-xs font-semibold text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{summary.completed}</p>
          </article>
        </section>

        <section className="app-surface mt-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">
                {canManage ? "รายการคำขอสิทธิ์ทั้งหมด" : "รายการคำขอสิทธิ์ของฉัน"}
              </h2>
              <p className="text-xs text-slate-500">ทั้งหมด {filteredRequests.length.toLocaleString("th-TH")} รายการ</p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(240px,1fr)_180px]">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="ค้นหาระบบ, ผู้ขอ, เหตุผล"
                  className="app-input pl-9"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="app-input"
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value={STATUS_VALUES.PENDING}>Pending Approval</option>
                <option value={STATUS_VALUES.APPROVED}>Approved</option>
                <option value={STATUS_VALUES.REJECTED}>Rejected</option>
                <option value={STATUS_VALUES.COMPLETED}>Completed</option>
              </select>
            </div>
          </div>

          {loadError && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
              {loadError}
            </p>
          )}

          <div className="mt-4 space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-border)] border-t-[var(--brand-primary)]" />
              </div>
            )}

            {!loading && filteredRequests.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-soft)] p-8 text-center">
                <p className="text-sm font-semibold text-slate-600">ยังไม่มีคำขอสิทธิ์ที่ตรงเงื่อนไข</p>
              </div>
            )}

            {!loading && filteredRequests.map((item) => {
              const status = STATUS_META[item.status] || STATUS_META[STATUS_VALUES.PENDING];

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[var(--brand-border)]"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          <Monitor size={12} />
                          {item.system_name || "-"}
                        </span>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.badgeClass}`}>
                          {status.label}
                        </span>
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {item.access_type || "Read"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-semibold text-slate-800">{item.reason || "-"}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          <User size={12} />
                          {item.requester_name || "ไม่ระบุผู้ขอ"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          <Building2 size={12} />
                          {item.department || "ไม่ระบุแผนก"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          <ShieldCheck size={12} />
                          ผู้อนุมัติ: {item.approver || "-"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          <Clock3 size={12} />
                          {formatDateTime(item.created_at)}
                        </span>
                        {item.processed_by_name && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                            <Sparkles size={12} />
                            โดย {item.processed_by_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                        {item.status === STATUS_VALUES.PENDING && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleChangeStatus(item.id, STATUS_VALUES.APPROVED)}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              <CheckCircle2 size={13} />
                              อนุมัติ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChangeStatus(item.id, STATUS_VALUES.REJECTED)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              <XCircle size={13} />
                              ปฏิเสธ
                            </button>
                          </>
                        )}

                        {item.status === STATUS_VALUES.APPROVED && (
                          <button
                            type="button"
                            onClick={() => handleChangeStatus(item.id, STATUS_VALUES.COMPLETED)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <CheckCheck size={13} />
                            Completed
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            onClick={closeDrawer}
            aria-hidden="true"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-[480px] border-l border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">สร้างคำขอสิทธิ์ระบบ</h3>
                <p className="mt-1 text-xs text-slate-500">กรอกข้อมูลให้ครบเพื่อเข้าสู่กระบวนการอนุมัติ</p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="app-icon-btn"
                aria-label="ปิดแบบฟอร์ม"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">ชื่อผู้ขอ</label>
                <input
                  value={formData.requesterName}
                  readOnly
                  className="app-input bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">แผนก</label>
                <input
                  value={formData.department}
                  onChange={(event) => updateFormField("department", event.target.value)}
                  className="app-input"
                  placeholder="เช่น IT, HR, Finance"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">ระบบที่ต้องการเข้าถึง</label>
                <input
                  value={formData.systemName}
                  onChange={(event) => updateFormField("systemName", event.target.value)}
                  className="app-input"
                  placeholder="เช่น ERP, Shared Folder, Email Group"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">ประเภทสิทธิ์</label>
                  <select
                    value={formData.accessType}
                    onChange={(event) => updateFormField("accessType", event.target.value)}
                    className="app-input"
                  >
                    {ACCESS_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">ระดับความเร่งด่วน</label>
                  <select
                    value={formData.urgency}
                    onChange={(event) => updateFormField("urgency", event.target.value)}
                    className="app-input"
                  >
                    {URGENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">ผู้อนุมัติ</label>
                <select
                  value={formData.approver}
                  onChange={(event) => updateFormField("approver", event.target.value)}
                  className="app-input"
                >
                  {APPROVER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">เหตุผลในการขอสิทธิ์</label>
                <textarea
                  value={formData.reason}
                  onChange={(event) => updateFormField("reason", event.target.value)}
                  rows={4}
                  className="app-input resize-none"
                  placeholder="ระบุเหตุผลเพื่อใช้ประกอบการอนุมัติ"
                />
              </div>

              {formError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="app-btn-secondary"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="app-btn-primary disabled:opacity-60"
                >
                  {saving ? "กำลังบันทึก..." : "ส่งคำขอ"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
};

export default AccessRequest;
