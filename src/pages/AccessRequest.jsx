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
import { useScopedI18n } from "../i18n/useScopedI18n";

const ACCESS_REQUEST_TRANSLATIONS = {
  th: {
    back: "กลับ Dashboard",
    badge: "คำขอสิทธิ์ระบบ",
    title: "Access Request / คำขอสิทธิ์ระบบ",
    subtitle: "ส่งคำขอสิทธิ์การเข้าถึงระบบ และติดตามสถานะในหน้าเดียว",
    create: "สร้างคำขอสิทธิ์",
    pendingApproval: "รออนุมัติ",
    approved: "อนุมัติแล้ว",
    rejected: "ไม่อนุมัติ",
    completed: "เสร็จสิ้น",
    allRequests: "รายการคำขอสิทธิ์ทั้งหมด",
    myRequests: "รายการคำขอสิทธิ์ของฉัน",
    totalCount: "ทั้งหมด {{count}} รายการ",
    searchPlaceholder: "ค้นหาระบบ, ผู้ขอ, เหตุผล",
    allStatus: "ทุกสถานะ",
    emptyState: "ยังไม่มีคำขอสิทธิ์ที่ตรงเงื่อนไข",
    loadError: "ไม่สามารถโหลดคำขอสิทธิ์ระบบได้",
    updateError: "อัปเดตสถานะคำขอสิทธิ์ไม่สำเร็จ",
    unknownUser: "ผู้ใช้งาน",
    unknownRequester: "ไม่ระบุผู้ขอ",
    unknownDepartment: "ไม่ระบุแผนก",
    approverLabel: "ผู้อนุมัติ:",
    processedBy: "โดย",
    approve: "อนุมัติ",
    reject: "ปฏิเสธ",
    markCompleted: "เสร็จสิ้น",
    drawerTitle: "สร้างคำขอสิทธิ์ระบบ",
    drawerSubtitle: "กรอกข้อมูลให้ครบเพื่อเข้าสู่กระบวนการอนุมัติ",
    closeForm: "ปิดแบบฟอร์ม",
    requesterName: "ชื่อผู้ขอ",
    department: "แผนก",
    departmentPlaceholder: "เช่น IT, HR, Finance",
    systemName: "ระบบที่ต้องการเข้าถึง",
    systemNamePlaceholder: "เช่น ERP, Shared Folder, Email Group",
    accessType: "ประเภทสิทธิ์",
    urgency: "ระดับความเร่งด่วน",
    urgencyLow: "ต่ำ",
    urgencyNormal: "ปกติ",
    urgencyHigh: "สูง",
    urgencyUrgent: "ด่วน",
    approver: "ผู้อนุมัติ",
    reason: "เหตุผลในการขอสิทธิ์",
    reasonPlaceholder: "ระบุเหตุผลเพื่อใช้ประกอบการอนุมัติ",
    validationError: "กรุณากรอกระบบที่ต้องการเข้าถึงและเหตุผลในการขอสิทธิ์",
    saveError: "ไม่สามารถบันทึกคำขอสิทธิ์ได้ กรุณาลองใหม่",
    saving: "กำลังบันทึก...",
    submit: "ส่งคำขอ",
    cancel: "ยกเลิก",
  },
  en: {
    back: "Back to Dashboard",
    badge: "System Access Requests",
    title: "Access Request",
    subtitle: "Submit system access requests and track their status in one place.",
    create: "Create request",
    pendingApproval: "Pending Approval",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed",
    allRequests: "All access requests",
    myRequests: "My access requests",
    totalCount: "Total {{count}} items",
    searchPlaceholder: "Search system, requester, reason",
    allStatus: "All statuses",
    emptyState: "No requests match the current filter",
    loadError: "Unable to load system access requests",
    updateError: "Failed to update the access request status",
    unknownUser: "User",
    unknownRequester: "Unknown requester",
    unknownDepartment: "Unknown department",
    approverLabel: "Approver:",
    processedBy: "By",
    approve: "Approve",
    reject: "Reject",
    markCompleted: "Mark completed",
    drawerTitle: "Create system access request",
    drawerSubtitle: "Fill in all required details to start the approval process.",
    closeForm: "Close form",
    requesterName: "Requester name",
    department: "Department",
    departmentPlaceholder: "E.g. IT, HR, Finance",
    systemName: "System to access",
    systemNamePlaceholder: "E.g. ERP, Shared Folder, Email Group",
    accessType: "Access type",
    urgency: "Urgency level",
    urgencyLow: "Low",
    urgencyNormal: "Normal",
    urgencyHigh: "High",
    urgencyUrgent: "Urgent",
    approver: "Approver",
    reason: "Reason for request",
    reasonPlaceholder: "Provide a reason to support the approval decision",
    validationError: "Please enter the target system and the reason for access.",
    saveError: "Unable to save the access request. Please try again.",
    saving: "Saving...",
    submit: "Submit request",
    cancel: "Cancel",
  },
  ko: {
    back: "대시보드로 돌아가기",
    badge: "시스템 권한 요청",
    title: "Access Request / 권한 요청",
    subtitle: "시스템 접근 권한을 요청하고 한 페이지에서 상태를 추적합니다.",
    create: "요청 생성",
    pendingApproval: "승인 대기",
    approved: "승인됨",
    rejected: "반려됨",
    completed: "완료됨",
    allRequests: "전체 권한 요청 목록",
    myRequests: "내 권한 요청 목록",
    totalCount: "총 {{count}}건",
    searchPlaceholder: "시스템, 요청자, 사유 검색",
    allStatus: "전체 상태",
    emptyState: "현재 조건에 맞는 요청이 없습니다",
    loadError: "권한 요청 목록을 불러올 수 없습니다",
    updateError: "권한 요청 상태 업데이트에 실패했습니다",
    unknownUser: "사용자",
    unknownRequester: "요청자 미상",
    unknownDepartment: "부서 미상",
    approverLabel: "승인자:",
    processedBy: "처리자",
    approve: "승인",
    reject: "반려",
    markCompleted: "완료 처리",
    drawerTitle: "시스템 권한 요청 생성",
    drawerSubtitle: "승인 프로세스를 시작하려면 모든 항목을 입력하세요.",
    closeForm: "양식 닫기",
    requesterName: "요청자 이름",
    department: "부서",
    departmentPlaceholder: "예: IT, HR, Finance",
    systemName: "접근할 시스템",
    systemNamePlaceholder: "예: ERP, Shared Folder, Email Group",
    accessType: "권한 유형",
    urgency: "긴급도",
    urgencyLow: "낮음",
    urgencyNormal: "보통",
    urgencyHigh: "높음",
    urgencyUrgent: "긴급",
    approver: "승인자",
    reason: "요청 사유",
    reasonPlaceholder: "승인 결정에 참고할 사유를 입력하세요",
    validationError: "접근할 시스템과 요청 사유를 입력해 주세요.",
    saveError: "권한 요청을 저장할 수 없습니다. 다시 시도해 주세요.",
    saving: "저장 중...",
    submit: "요청 제출",
    cancel: "취소",
  },
};

const STATUS_VALUES = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

const ACCESS_TYPE_OPTIONS = ["Read", "Write", "Admin"];

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

const formatDateTime = (value, language = "th") => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const locales = { th: "th-TH", en: "en-US", ko: "ko-KR" };
  return date.toLocaleString(locales[language] || "en-US", {
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
  const { language, tt } = useScopedI18n(ACCESS_REQUEST_TRANSLATIONS);
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

  const statusMeta = useMemo(
    () => ({
      [STATUS_VALUES.PENDING]: {
        label: tt("pendingApproval"),
        badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      },
      [STATUS_VALUES.APPROVED]: {
        label: tt("approved"),
        badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
      },
      [STATUS_VALUES.REJECTED]: {
        label: tt("rejected"),
        badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
      },
      [STATUS_VALUES.COMPLETED]: {
        label: tt("completed"),
        badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      },
    }),
    [tt],
  );

  const urgencyOptions = useMemo(
    () => [
      { value: "low", label: tt("urgencyLow") },
      { value: "normal", label: tt("urgencyNormal") },
      { value: "high", label: tt("urgencyHigh") },
      { value: "urgent", label: tt("urgencyUrgent") },
    ],
    [tt],
  );

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
      setLoadError(tt("loadError"));
      setRequests([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tt]);

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
          tt("unknownUser");

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
  }, [loadRequests, navigate, setupRealtime, tt]);

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
      setFormError(tt("validationError"));
      return;
    }

    try {
      setSaving(true);

      const payload = {
        requester_user_id: userId,
        requester_name: formData.requesterName.trim() || profile?.full_name || sessionName || tt("unknownUser"),
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
      setFormError(tt("saveError"));
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
      setLoadError(tt("updateError"));
      return;
    }

    await loadRequests(userId, userRole, { silent: true });
  };

  return (
    <div className="app-theme app-page-bg min-h-screen text-slate-800">
      <div className="app-safe-top app-safe-bottom mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="app-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="app-btn-secondary mt-0.5 inline-flex items-center gap-2"
              >
                <ArrowLeft size={15} />
                {tt("back")}
              </button>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-1 text-[11px] font-bold text-[var(--brand-primary)]">
                  <KeyRound size={13} />
                  {tt("badge")}
                </div>
                <h1 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">{tt("title")}</h1>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  {tt("subtitle")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openDrawer}
              className="app-btn-primary inline-flex items-center gap-2"
            >
              <Plus size={15} />
              {tt("create")}
            </button>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3 max-[399px]:grid-cols-1 lg:grid-cols-4">
          <article className="app-surface p-4">
            <p className="text-xs font-semibold text-slate-500">{tt("pendingApproval")}</p>
            <p className="mt-2 text-3xl font-black text-amber-600">{summary.pending}</p>
          </article>
          <article className="app-surface p-4">
            <p className="text-xs font-semibold text-slate-500">{tt("approved")}</p>
            <p className="mt-2 text-3xl font-black text-blue-600">{summary.approved}</p>
          </article>
          <article className="app-surface p-4">
            <p className="text-xs font-semibold text-slate-500">{tt("rejected")}</p>
            <p className="mt-2 text-3xl font-black text-rose-600">{summary.rejected}</p>
          </article>
          <article className="app-surface p-4">
            <p className="text-xs font-semibold text-slate-500">{tt("completed")}</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{summary.completed}</p>
          </article>
        </section>

        <section className="app-surface mt-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">
                {canManage ? tt("allRequests") : tt("myRequests")}
              </h2>
              <p className="text-xs text-slate-500">{tt("totalCount", { count: filteredRequests.length.toLocaleString() })}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(240px,1fr)_180px]">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={tt("searchPlaceholder")}
                  className="app-input pl-9"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="app-input"
              >
                <option value="ALL">{tt("allStatus")}</option>
                <option value={STATUS_VALUES.PENDING}>{tt("pendingApproval")}</option>
                <option value={STATUS_VALUES.APPROVED}>{tt("approved")}</option>
                <option value={STATUS_VALUES.REJECTED}>{tt("rejected")}</option>
                <option value={STATUS_VALUES.COMPLETED}>{tt("completed")}</option>
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
                <p className="text-sm font-semibold text-slate-600">{tt("emptyState")}</p>
              </div>
            )}

            {!loading && filteredRequests.map((item) => {
              const status = statusMeta[item.status] || statusMeta[STATUS_VALUES.PENDING];

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
                          {item.requester_name || tt("unknownRequester")}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          <Building2 size={12} />
                          {item.department || tt("unknownDepartment")}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          <ShieldCheck size={12} />
                          {tt("approverLabel")} {item.approver || "-"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          <Clock3 size={12} />
                          {formatDateTime(item.created_at, language)}
                        </span>
                        {item.processed_by_name && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                            <Sparkles size={12} />
                            {tt("processedBy")} {item.processed_by_name}
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
                              {tt("approve")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChangeStatus(item.id, STATUS_VALUES.REJECTED)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              <XCircle size={13} />
                              {tt("reject")}
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
                            {tt("markCompleted")}
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
                <h3 className="text-lg font-black text-slate-900">{tt("drawerTitle")}</h3>
                <p className="mt-1 text-xs text-slate-500">{tt("drawerSubtitle")}</p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="app-icon-btn"
                aria-label={tt("closeForm")}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">{tt("requesterName")}</label>
                <input
                  value={formData.requesterName}
                  readOnly
                  className="app-input bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">{tt("department")}</label>
                <input
                  value={formData.department}
                  onChange={(event) => updateFormField("department", event.target.value)}
                  className="app-input"
                  placeholder={tt("departmentPlaceholder")}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">{tt("systemName")}</label>
                <input
                  value={formData.systemName}
                  onChange={(event) => updateFormField("systemName", event.target.value)}
                  className="app-input"
                  placeholder={tt("systemNamePlaceholder")}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">{tt("accessType")}</label>
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
                  <label className="mb-1 block text-xs font-bold text-slate-500">{tt("urgency")}</label>
                  <select
                    value={formData.urgency}
                    onChange={(event) => updateFormField("urgency", event.target.value)}
                    className="app-input"
                  >
                    {urgencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">{tt("approver")}</label>
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
                <label className="mb-1 block text-xs font-bold text-slate-500">{tt("reason")}</label>
                <textarea
                  value={formData.reason}
                  onChange={(event) => updateFormField("reason", event.target.value)}
                  rows={4}
                  className="app-input resize-none"
                  placeholder={tt("reasonPlaceholder")}
                />
              </div>

              {formError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-2 pt-1 min-[420px]:grid-cols-2">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="app-btn-secondary"
                >
                  {tt("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="app-btn-primary disabled:opacity-60"
                >
                  {saving ? tt("saving") : tt("submit")}
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
