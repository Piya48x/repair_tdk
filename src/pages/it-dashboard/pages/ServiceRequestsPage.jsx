import React, { useMemo, useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import {
  getServiceRequestDisplayDescription,
  getStockRequestMetadata,
  normalizeServiceType,
} from "../../../lib/serviceRequestUtils";
import DashboardSummaryGrid from "../components/DashboardSummaryGrid";
import WalkInStockIssueModal from "../components/WalkInStockIssueModal";

const SERVICE_REQUEST_LABELS = {
  req_stock_item: "เบิกของจาก Stock IT",
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
    label: "รอ IT อนุมัติ",
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
  IN_PROGRESS: {
    label: "อนุมัติแล้ว / รอจ่าย",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  CLOSED: {
    label: "จ่ายแล้ว / ปิดคำขอ",
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

function formatQuantity(value) {
  return new Intl.NumberFormat("th-TH").format(Number(value || 0));
}

function buildAvatarFallback(name, color = "2b59b0") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || "U"))}&background=${color}&color=fff&size=96`;
}

function deriveEmployeeCodeFromEmail(email) {
  const localPart = String(email || "").trim().split("@")[0] || "";
  const match = localPart.match(/\d{3,}/);
  return match ? match[0] : "";
}

function isImageAttachmentUrl(url) {
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif)(?:[?#].*)?$/i.test(String(url || ""));
}

function getAttachmentName(url) {
  try {
    const pathname = new URL(String(url || "")).pathname;
    return decodeURIComponent(pathname.split("/").pop() || "attachment");
  } catch {
    const cleanUrl = String(url || "").split("?")[0];
    return decodeURIComponent(cleanUrl.split("/").pop() || "attachment");
  }
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

function getRequesterEmpId(request) {
  return normalizeText(request?.reporter_emp_id) || deriveEmployeeCodeFromEmail(request?.reporter_email) || "-";
}

function getRequesterAvatar(request) {
  return normalizeText(request?.reporter_avatar_url) || buildAvatarFallback(request?.reporter_name || "U", "2b59b0");
}

function getRequestAttachmentUrls(request) {
  const stockRequest = getStockRequestMetadata(request);
  const urls = [
    ...(Array.isArray(request?.attachment_urls) ? request.attachment_urls : []),
    ...(Array.isArray(request?.attachments) ? request.attachments : []),
    request?.image_url,
    stockRequest?.image_url,
  ]
    .map((item) => normalizeText(typeof item === "string" ? item : item?.url || item?.file_url))
    .filter(Boolean);

  return [...new Set(urls)];
}

function getRequestDetailText(request) {
  return getServiceRequestDisplayDescription(request) || normalizeText(request?.purpose_of_use) || "-";
}

function ServiceRequestDetailModal({ request, theme, onClose }) {
  if (!request) return null;

  const status = String(request?.status || "").toUpperCase();
  const statusMeta = STATUS_META[status] || STATUS_META.NEW;
  const requesterName = request?.reporter_name || "-";
  const requesterEmpId = getRequesterEmpId(request);
  const requesterDept = request?.reporter_dept || request?.department || "-";
  const requesterAvatar = getRequesterAvatar(request);
  const stockRequest = getStockRequestMetadata(request);
  const attachmentUrls = getRequestAttachmentUrls(request);
  const detailText = getRequestDetailText(request);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border shadow-2xl ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"
          }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.cls}`}>
                  {statusMeta.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${theme === "dark"
                    ? "border-slate-600 bg-slate-800 text-slate-200"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                >
                  <Package size={12} />
                  {getRequestNo(request)}
                </span>
              </div>
              <h3 className={`text-xl font-black sm:text-2xl ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                {getRequestTypeLabel(request)}
              </h3>
              <p className={`mt-2 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                {request.title || "-"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${theme === "dark"
                ? "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              aria-label="close details"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.92fr)]">
            <div className="space-y-4">
              <section
                className={`rounded-2xl border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-slate-50"
                  }`}
              >
                <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  รายละเอียดคำขอ
                </p>
                <p className={`mt-3 whitespace-pre-line text-sm leading-6 ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                  {detailText}
                </p>
              </section>

              {stockRequest && (
                <section
                  className={`rounded-2xl border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"
                    }`}
                >
                  <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    ข้อมูลรายการที่ขอเบิก
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className={`rounded-xl border px-3 py-3 ${theme === "dark" ? "border-slate-700 bg-slate-950/60 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                      <p className="text-xs font-semibold text-slate-500">รายการ</p>
                      <p className="mt-1 text-sm font-bold">{stockRequest.item_name || "-"}</p>
                    </div>
                    <div className={`rounded-xl border px-3 py-3 ${theme === "dark" ? "border-slate-700 bg-slate-950/60 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                      <p className="text-xs font-semibold text-slate-500">รหัส stock</p>
                      <p className="mt-1 text-sm font-bold">{stockRequest.stock_code || "-"}</p>
                    </div>
                    <div className={`rounded-xl border px-3 py-3 ${theme === "dark" ? "border-slate-700 bg-slate-950/60 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                      <p className="text-xs font-semibold text-slate-500">จำนวนที่ขอ</p>
                      <p className="mt-1 text-sm font-bold">
                        {formatQuantity(stockRequest.quantity)} {stockRequest.unit || "ชิ้น"}
                      </p>
                    </div>
                    <div className={`rounded-xl border px-3 py-3 ${theme === "dark" ? "border-slate-700 bg-slate-950/60 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                      <p className="text-xs font-semibold text-slate-500">คงเหลือตอนส่งคำขอ</p>
                      <p className="mt-1 text-sm font-bold">
                        {formatQuantity(stockRequest.available_at_request)} {stockRequest.unit || "ชิ้น"}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {attachmentUrls.length > 0 && (
                <section>
                  <p className={`mb-3 text-[11px] font-bold uppercase tracking-[0.18em] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    หลักฐานแนบ
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {attachmentUrls.map((url, index) => (
                      <button
                        key={`${url}-${index}`}
                        type="button"
                        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                        className={`overflow-hidden rounded-2xl border text-left ${theme === "dark" ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"
                          }`}
                      >
                        {isImageAttachmentUrl(url) ? (
                          <img src={url} alt={`attachment-${index + 1}`} className="h-44 w-full object-cover" />
                        ) : (
                          <div className={`flex h-44 items-center gap-3 px-4 ${theme === "dark" ? "bg-slate-950/60 text-slate-200" : "bg-slate-50 text-slate-700"}`}>
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                              <FileText size={24} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">File</p>
                              <p className="mt-2 line-clamp-2 text-sm font-semibold">{getAttachmentName(url)}</p>
                            </div>
                          </div>
                        )}
                        <div className={`flex items-center justify-between border-t px-3 py-2 text-xs font-semibold ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-100 text-slate-600"}`}>
                          <span>{isImageAttachmentUrl(url) ? `หลักฐาน ${index + 1}` : getAttachmentName(url)}</span>
                          <span className="inline-flex items-center gap-1 text-[#2b59b0]">
                            <Eye size={12} />
                            เปิด
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-4">
              <section
                className={`rounded-2xl border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"
                  }`}
              >
                <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  ผู้ขอเบิก
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={requesterAvatar}
                    alt={requesterName}
                    onError={(event) => {
                      event.currentTarget.src = buildAvatarFallback(requesterName, "2b59b0");
                    }}
                    className="h-14 w-14 rounded-full border border-slate-200 bg-white object-cover"
                  />
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
                      {requesterName}
                    </p>
                    <p className={`truncate text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                      {requesterEmpId}
                    </p>
                    <p className={`truncate text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      {requesterDept}
                    </p>
                  </div>
                </div>
              </section>

              <section
                className={`rounded-2xl border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"
                  }`}
              >
                <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  ข้อมูลคำขอ
                </p>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>วันที่ส่งคำขอ</span>
                    <span className={`text-right font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
                      {formatDateTime(request.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>ช่วงวันที่ขอใช้</span>
                    <span className={`text-right font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
                      {getBorrowWindow(request)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>สถานที่</span>
                    <span className={`text-right font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
                      {request.location || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>ผู้ดูแล</span>
                    <span className={`text-right font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
                      {request.assigned_name || "-"}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [selectedRequestDetail, setSelectedRequestDetail] = useState(null);

  const summary = useMemo(
    () => ({
      total: serviceRequests.length,
      pending: serviceRequests.filter((item) => String(item?.status || "").toUpperCase() === "NEW").length,
      inProgress: serviceRequests.filter((item) => String(item?.status || "").toUpperCase() === "IN_PROGRESS").length,
      closed: serviceRequests.filter((item) => String(item?.status || "").toUpperCase() === "CLOSED").length,
    }),
    [serviceRequests],
  );

  const summaryCards = useMemo(
    () => [
      { key: "total", title: "ทั้งหมด", value: summary.total, valueClass: "text-violet-500" },
      { key: "pending", title: "รอดำเนินการ", value: summary.pending, valueClass: "text-blue-500" },
      { key: "inProgress", title: "กำลังดำเนินการ", value: summary.inProgress, valueClass: "text-amber-500" },
      { key: "closed", title: "ปิดคำขอแล้ว", value: summary.closed, valueClass: "text-emerald-500" },
    ],
    [summary],
  );

  const filteredRequests = useMemo(() => {
    const keyword = normalizeText(searchQuery).toLowerCase();

    return [...serviceRequests]
      .filter((item) => {
        const normalizedStatus = String(item?.status || "").toUpperCase();
        const stockRequest = getStockRequestMetadata(item);
        if (statusFilter !== "ALL" && normalizedStatus !== statusFilter) return false;
        if (!keyword) return true;

        const source = [
          getRequestNo(item),
          getRequestTypeLabel(item),
          item.title,
          item.description,
          item.purpose_of_use,
          item.reporter_name,
          item.reporter_emp_id,
          item.reporter_dept,
          item.department,
          item.location,
          item.assigned_name,
          stockRequest?.stock_code,
          stockRequest?.item_name,
          stockRequest?.reference_item_code,
          stockRequest?.item_category,
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

      const { error } = await supabase.from("tickets").update(payload).eq("id", request.id);
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
              placeholder="ค้นหาจากเลขคำขอ, ผู้ขอ, รหัสพนักงาน, แผนก, รายละเอียด, สถานที่"
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
            <div
              className={`rounded-xl border border-dashed p-8 text-center ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-slate-50"
                }`}
            >
              <p className={`text-sm font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                ไม่พบคำขอเบิกในเงื่อนไขที่เลือก
              </p>
            </div>
          )}

          {!refreshing &&
            filteredRequests.map((request) => {
              const status = String(request?.status || "").toUpperCase();
              const statusMeta = STATUS_META[status] || STATUS_META.NEW;
              const isUpdating = updatingId === String(request.id);
              const stockRequest = getStockRequestMetadata(request);
              const requesterName = request.reporter_name || "-";
              const requesterEmpId = getRequesterEmpId(request);
              const requesterDept = request.reporter_dept || request.department || "ไม่ระบุแผนก";
              const requesterAvatar = getRequesterAvatar(request);
              const detailText = getRequestDetailText(request);
              const attachmentUrls = getRequestAttachmentUrls(request);
              const imageAttachments = attachmentUrls.filter(isImageAttachmentUrl);
              const primaryImage = imageAttachments[0] || "";

              return (
                <article
                  key={request.id}
                  className={`rounded-2xl border p-4 ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.cls}`}>
                          {statusMeta.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-600 bg-[#162136] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                        >
                          <Package size={11} />
                          {getRequestNo(request)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-600 bg-[#162136] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                        >
                          <Clock3 size={11} />
                          {formatDateTime(request.created_at)}
                        </span>
                      </div>

                      <p className={`mt-2 text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                        {getRequestTypeLabel(request)}
                      </p>
                      <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                        {request.title || "-"}
                      </p>
                      <p className={`mt-2 line-clamp-2 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                        {detailText}
                      </p>

                      <div
                        className={`mt-4 rounded-2xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-slate-50"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={requesterAvatar}
                            alt={requesterName}
                            onError={(event) => {
                              event.currentTarget.src = buildAvatarFallback(requesterName, "2b59b0");
                            }}
                            className="h-12 w-12 shrink-0 rounded-full border border-slate-200 bg-white object-cover"
                          />
                          <div className="min-w-0">
                            <p className={`truncate text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
                              {requesterName}
                            </p>
                            <p className={`truncate text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                              {requesterEmpId}
                            </p>
                            <p className={`truncate text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                              {requesterDept}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"
                            }`}
                        >
                          <Briefcase size={12} />
                          {requesterDept}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"
                            }`}
                        >
                          <MapPin size={12} />
                          {request.location || "-"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"
                            }`}
                        >
                          <Clock3 size={12} />
                          {getBorrowWindow(request)}
                        </span>
                        {stockRequest?.stock_code && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"
                              }`}
                          >
                            <Package size={12} />
                            {stockRequest.stock_code}
                            {stockRequest.quantity ? ` x ${formatQuantity(stockRequest.quantity)}` : ""}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"
                            }`}
                        >
                          <ImageIcon size={12} />
                          หลักฐาน {attachmentUrls.length}
                        </span>
                        {request.assigned_name && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${theme === "dark" ? "border-slate-600 bg-[#162136]" : "border-slate-200 bg-slate-50"
                              }`}
                          >
                            <CheckCircle2 size={12} />
                            ผู้ดูแล: {request.assigned_name}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRequestDetail(request)}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${theme === "dark"
                            ? "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                          <Eye size={14} />
                          ดูรายละเอียด
                        </button>

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

                    <div
                      className={`overflow-hidden rounded-2xl border ${theme === "dark" ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-slate-50"
                        }`}
                    >
                      {primaryImage ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRequestDetail(request)}
                          className="block h-full w-full text-left"
                        >
                          <img src={primaryImage} alt="request evidence" className="h-48 w-full object-cover xl:h-full" />
                          <div
                            className={`flex items-center justify-between border-t px-3 py-2 text-xs font-semibold ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"
                              }`}
                          >
                            <span>หลักฐานแนบ {imageAttachments.length}</span>
                            <span className="inline-flex items-center gap-1 text-[#2b59b0]">
                              <Eye size={12} />
                              ดูรายละเอียด
                            </span>
                          </div>
                        </button>
                      ) : (
                        <div className="flex h-full min-h-[180px] flex-col items-center justify-center px-4 py-6 text-center">
                          <ImageIcon size={28} className={theme === "dark" ? "text-slate-500" : "text-slate-400"} />
                          <p className={`mt-3 text-sm font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                            ยังไม่มีรูปหลักฐาน
                          </p>
                          <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                            กดดูรายละเอียดเพื่อดูข้อมูลคำขอทั้งหมด
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </section>

      <ServiceRequestDetailModal
        request={selectedRequestDetail}
        theme={theme}
        onClose={() => setSelectedRequestDetail(null)}
      />

      <WalkInStockIssueModal
        isOpen={isWalkInIssueOpen}
        onClose={() => setIsWalkInIssueOpen(false)}
        onIssued={() => {
          setIsWalkInIssueOpen(false);
          void onRefreshData?.();
        }}
        currentUser={currentUser}
        theme={theme}
      />
    </>
  );
}
