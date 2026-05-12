import React, { useMemo, useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { normalizeServiceType } from "../../../lib/serviceRequestUtils";
import DashboardSummaryGrid from "../components/DashboardSummaryGrid";
import WalkInStockIssueModal from "../components/WalkInStockIssueModal";

const SERVICE_REQUEST_LABELS = {
  req_new_device: "เบิกอุปกรณ์ใหม่",
  req_replacement: "ขอเปลี่ยนอุปกรณ์ทดแทน",
  req_peripherals: "อุปกรณ์ต่อพ่วง",
  req_laptop_gps: "ยืมโน้ตบุ๊ก GPS",
  req_install_sw: "ติดตั้งโปรแกรม",
  req_license: "ขอ License / ต่ออายุ",
  req_os_issue: "ปัญหา Windows / OS",
  req_wifi_guest: "ขอรหัส WiFi",
  req_vpn: "ขอใช้งาน VPN",
  req_folder_access: "ขอสิทธิ์ Folder / Server",
  req_domain: "Reset Password / Domain",
  req_cctv_install: "ติดตั้ง CCTV",
  req_cctv_view: "ขอดูย้อนหลัง CCTV",
  req_access_card: "บัตรผ่านเข้า-ออก",
  req_purchase: "ขอจัดซื้ออุปกรณ์ IT",
  req_quotation: "ขอใบเสนอราคา",
  req_consult: "ขอคำปรึกษา IT",
  req_relocate: "ย้ายจุดทำงาน",
};

const STATUS_META = {
  NEW: {
    label: "รอดำเนินการ",
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
  IN_PROGRESS: {
    label: "กำลังดำเนินการ",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  CLOSED: {
    label: "ปิดคำขอแล้ว",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

function normalizeText(value) {
  return String(value || "").trim();
}

function formatDateTime(value) {
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
}

function formatDateOnly(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getRequestTypeLabel(request) {
  const serviceType = normalizeServiceType(request?.service_type);
  return (
    SERVICE_REQUEST_LABELS[serviceType] ||
    normalizeText(request?.title) ||
    normalizeText(request?.category) ||
    normalizeText(request?.service_type) ||
    "คำขอบริการ"
  );
}

function getRequestNo(request) {
  return request?.ticket_no || `REQ-${String(request?.id || "").slice(-6).toUpperCase()}`;
}

function getBorrowWindow(request) {
  if (!request?.borrow_start_date && !request?.borrow_end_date) return "ไม่มีช่วงเวลายืม";
  return `${formatDateOnly(request?.borrow_start_date)} - ${formatDateOnly(request?.borrow_end_date)}`;
}

export default function ServiceRequestsPage({
  theme,
  uiTheme,
  serviceRequests = [],
  currentUser,
  onRefreshData,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isWalkInIssueOpen, setIsWalkInIssueOpen] = useState(false);

  const summary = useMemo(() => ({
    total: serviceRequests.length,
    pending: serviceRequests.filter((item) => String(item?.status || "").toUpperCase() === "NEW").length,
    inProgress: serviceRequests.filter((item) => String(item?.status || "").toUpperCase() === "IN_PROGRESS").length,
    closed: serviceRequests.filter((item) => String(item?.status || "").toUpperCase() === "CLOSED").length,
  }), [serviceRequests]);
  const summaryCards = useMemo(() => ([
    { key: "total", title: "ทั้งหมด", value: summary.total, valueClass: "text-violet-500" },
    { key: "pending", title: "รอดำเนินการ", value: summary.pending, valueClass: "text-blue-500" },
    { key: "inProgress", title: "กำลังดำเนินการ", value: summary.inProgress, valueClass: "text-amber-500" },
    { key: "closed", title: "ปิดคำขอแล้ว", value: summary.closed, valueClass: "text-emerald-500" },
  ]), [summary]);

  const filteredRequests = useMemo(() => {
    const keyword = normalizeText(searchQuery).toLowerCase();

    return [...serviceRequests]
      .filter((item) => {
        const normalizedStatus = String(item?.status || "").toUpperCase();
        if (statusFilter !== "ALL" && normalizedStatus !== statusFilter) return false;
        if (!keyword) return true;

        const source = [
          getRequestNo(item),
          getRequestTypeLabel(item),
          item.title,
          item.description,
          item.purpose_of_use,
          item.reporter_name,
          item.reporter_dept,
          item.department,
          item.location,
          item.assigned_name,
        ]
          .map((value) => normalizeText(value).toLowerCase())
          .join(" ");

        return source.includes(keyword);
      })
      .sort((left, right) => {
        const leftTime = new Date(left?.created_at || 0).getTime();
        const rightTime = new Date(right?.created_at || 0).getTime();
        return rightTime - leftTime;
      });
  }, [searchQuery, serviceRequests, statusFilter]);

  const handleRefresh = async () => {
    if (!onRefreshData) return;
    try {
      setRefreshing(true);
      setErrorMessage("");
      await onRefreshData();
    } catch (error) {
      console.error("Refresh service requests error:", error);
      setErrorMessage("ไม่สามารถรีเฟรชรายการคำขอเบิกได้");
    } finally {
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (request, nextStatus) => {
    if (!request?.id) return;

    try {
      setUpdatingId(String(request.id));
      setErrorMessage("");

      const now = new Date().toISOString();
      const payload = {
        status: nextStatus,
        updated_at: now,
      };

      if (nextStatus === "IN_PROGRESS") {
        payload.assigned_to = currentUser?.id || null;
        payload.assigned_name = currentUser?.name || "IT Admin";
        payload.assigned_employee_id = currentUser?.employeeId || "";
        payload.started_at = request?.started_at || now;
      }

      if (nextStatus === "CLOSED") {
        payload.assigned_to = request?.assigned_to || currentUser?.id || null;
        payload.assigned_name = request?.assigned_name || currentUser?.name || "IT Admin";
        payload.assigned_employee_id = request?.assigned_employee_id || currentUser?.employeeId || "";
        payload.closed_at = now;
        payload.closed_by = currentUser?.id || null;
        payload.closed_by_name = currentUser?.name || "IT Admin";
      }

      const { error } = await supabase
        .from("tickets")
        .update(payload)
        .eq("id", request.id);

      if (error) throw error;

      await onRefreshData?.();
    } catch (error) {
      console.error("Update service request status error:", error);
      setErrorMessage("อัปเดตสถานะคำขอไม่สำเร็จ");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <>
      <section className="mb-4">
        <h2 className={`text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
          รายการคำขอเบิกจากผู้ใช้
        </h2>
        <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
          แยกคำขอเบิกอุปกรณ์และคำขอบริการจากหน้าแจ้งซ่อม เพื่อให้ทีม IT จัดคิวและติดตามสถานะได้ชัดเจน
        </p>
      </section>

      <DashboardSummaryGrid items={summaryCards} theme={theme} uiTheme={uiTheme} />

      <section className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ค้นหาจากเลขคำขอ, ผู้ขอ, แผนก, รายละเอียด, สถานที่"
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
              <option value="NEW">รอดำเนินการ</option>
              <option value="IN_PROGRESS">กำลังดำเนินการ</option>
              <option value="CLOSED">ปิดคำขอแล้ว</option>
            </select>

            <button
              type="button"
              onClick={() => setIsWalkInIssueOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2b59b0] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244a95]"
            >
              <Package size={14} />
              เบิกของ Walk-in
            </button>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${uiTheme.statusButton}`}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              รีเฟรช
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {refreshing && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin text-violet-500" />
            </div>
          )}

          {!refreshing && filteredRequests.length === 0 && (
            <div className={`rounded-xl border border-dashed p-8 text-center ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-sm font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                ไม่พบคำขอเบิกในเงื่อนไขที่เลือก
              </p>
            </div>
          )}

          {!refreshing && filteredRequests.map((request) => {
            const status = String(request?.status || "").toUpperCase();
            const statusMeta = STATUS_META[status] || STATUS_META.NEW;
            const isUpdating = updatingId === String(request.id);

            return (
              <article
                key={request.id}
                className={`rounded-2xl border p-4 ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-600 bg-[#162136] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        <Package size={11} />
                        {getRequestNo(request)}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-600 bg-[#162136] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        <Clock3 size={11} />
                        {formatDateTime(request.created_at)}
                      </span>
                    </div>

                    <p className={`mt-2 text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                      {getRequestTypeLabel(request)}
                    </p>
                    <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                      {request.title || request.description || request.purpose_of_use || "-"}
                    </p>

                    <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"}`}>
                        <UserRound size={12} />
                        {request.reporter_name || "-"}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"}`}>
                        <Briefcase size={12} />
                        {request.reporter_dept || request.department || "ไม่ระบุแผนก"}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"}`}>
                        <MapPin size={12} />
                        {request.location || "-"}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"}`}>
                        <Clock3 size={12} />
                        {getBorrowWindow(request)}
                      </span>
                      {request.assigned_name && (
                        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"}`}>
                          <CheckCircle2 size={12} />
                          ผู้ดูแล: {request.assigned_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {status === "NEW" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => void handleStatusUpdate(request, "IN_PROGRESS")}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 disabled:opacity-60"
                      >
                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Clock3 size={14} />}
                        รับคำขอ
                      </button>
                    )}

                    {status !== "CLOSED" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => void handleStatusUpdate(request, "CLOSED")}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        ปิดคำขอ
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <WalkInStockIssueModal
        isOpen={isWalkInIssueOpen}
        onClose={() => setIsWalkInIssueOpen(false)}
        onIssued={() => setIsWalkInIssueOpen(false)}
        currentUser={currentUser}
        theme={theme}
      />
    </>
  );
}
