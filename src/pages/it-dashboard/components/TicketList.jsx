import React from "react";
import {
  Search,
  LayoutGrid,
  List,
  DownloadCloud,
  Eye,
  Trash2,
  User,
  Navigation,
  Camera,
  CheckCircle,
  Clock3,
  Building2,
  MapPin,
} from "lucide-react";

import {
  getStatusText,
  getPriorityText,
  getDeviceIcon,
  calculateDuration,
  handleExportExcelWithImages,
  formatTicketId,
} from "../utils/ticketUtils";
import { getITDashboardTheme } from "../theme/itDashboardTheme";

const PRIORITY_STYLES = {
  urgent: {
    dot: "bg-rose-500",
    light: "border-rose-200 bg-rose-50 text-rose-700",
    dark: "border-rose-500/30 bg-rose-900/20 text-rose-300",
  },
  normal: {
    dot: "bg-amber-500",
    light: "border-amber-200 bg-amber-50 text-amber-700",
    dark: "border-amber-500/30 bg-amber-900/20 text-amber-300",
  },
  low: {
    dot: "bg-emerald-500",
    light: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dark: "border-emerald-500/30 bg-emerald-900/20 text-emerald-300",
  },
  default: {
    dot: "bg-slate-400",
    light: "border-slate-200 bg-slate-50 text-slate-700",
    dark: "border-slate-600 bg-slate-800 text-slate-300",
  },
};

const STATUS_STYLES = {
  NEW: {
    light: "border-red-200 bg-red-50 text-red-600",
    dark: "border-red-500/30 bg-red-900/20 text-red-300",
  },
  IN_PROGRESS: {
    light: "border-amber-200 bg-amber-50 text-amber-600",
    dark: "border-amber-500/30 bg-amber-900/20 text-amber-300",
  },
  CLOSED: {
    light: "border-emerald-200 bg-emerald-50 text-emerald-600",
    dark: "border-emerald-500/30 bg-emerald-900/20 text-emerald-300",
  },
  default: {
    light: "border-slate-200 bg-slate-50 text-slate-600",
    dark: "border-slate-600 bg-slate-800 text-slate-300",
  },
};

const TicketList = ({
  loading,
  tickets,
  filteredTickets,
  theme,
  isMobile,
  activeTab,
  searchQuery,
  setSearchQuery,
  dateRange,
  setDateRange,
  viewMode,
  setViewMode,
  historyTickets,
  currentUser,
  handleAcceptJob,
  handleCloseJob,
  handleDeleteTicket,
  handleViewDetails,
  handleOpenNavigation,
}) => {
  const uiTheme = getITDashboardTheme(theme);
  const isDark = theme === "dark";

  const listWrapClass = isDark
    ? "bg-slate-900 border-slate-800"
    : "bg-white border-slate-200";

  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = "text-slate-400";
  const softSurface = isDark
    ? "border-slate-700 bg-slate-800/70"
    : "border-slate-200 bg-slate-50";

  const chipClass = isDark
    ? "border-slate-600 bg-slate-800 text-slate-300"
    : "border-slate-200 bg-white text-slate-700";

  const skeletonBlockClass = isDark ? "bg-slate-700" : "bg-slate-200";
  const emptyIconClass = isDark
    ? "bg-slate-800 text-slate-400"
    : "bg-slate-100 text-slate-500";
  const neutralButtonClass = isDark
    ? "border-slate-600 text-slate-300 hover:bg-slate-800"
    : "border-slate-300 text-slate-700 hover:bg-slate-100";
  const blueIconButtonClass = isDark
    ? "text-blue-400 hover:bg-blue-900/20"
    : "text-blue-600 hover:bg-blue-50";
  const roseIconButtonClass = isDark
    ? "text-rose-400 hover:bg-rose-900/20"
    : "text-rose-600 hover:bg-rose-50";
  const roseOutlineButtonClass = isDark
    ? "border-rose-500/40 text-rose-400 hover:bg-rose-900/20"
    : "border-rose-200 text-rose-600 hover:bg-rose-50";

  const getPriorityBadgeClass = (priority) => {
    const meta = PRIORITY_STYLES[priority] || PRIORITY_STYLES.default;
    return isDark ? meta.dark : meta.light;
  };

  const getStatusBadgeClass = (status) => {
    const meta = STATUS_STYLES[status] || STATUS_STYLES.default;
    return isDark ? meta.dark : meta.light;
  };

  const renderSkeleton = () => {
    const count = isMobile ? 3 : 6;

    return (
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
          className={`animate-pulse rounded-2xl p-4 ${listWrapClass}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className={`h-5 w-24 rounded ${skeletonBlockClass}`} />
              <div className={`h-4 w-16 rounded ${skeletonBlockClass}`} />
            </div>
            <div className={`mb-2 h-5 w-4/5 rounded ${skeletonBlockClass}`} />
            <div className={`mb-4 h-4 w-1/3 rounded ${skeletonBlockClass}`} />
            <div className={`mb-3 h-16 w-full rounded ${skeletonBlockClass}`} />
            <div className={`mb-3 h-10 w-full rounded ${skeletonBlockClass}`} />
            <div className={`mt-4 h-9 w-full rounded ${skeletonBlockClass}`} />
          </div>
        ))}
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className={`rounded-2xl p-10 text-center ${listWrapClass}`}>
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${emptyIconClass}`}>
        <Search size={24} />
      </div>
      <p className={`text-base font-semibold ${textPrimary}`}>ไม่พบรายการงาน</p>
      <p className={`mt-1 text-sm ${textSecondary}`}>
        ลองปรับคำค้นหา หรือล้างเงื่อนไขตัวกรอง
      </p>
      {(searchQuery || (dateRange.start && dateRange.end)) && (
        <button
          onClick={() => {
            setSearchQuery("");
            setDateRange({ start: "", end: "" });
          }}
          className={`mt-5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${neutralButtonClass}`}
        >
          ล้างการค้นหา
        </button>
      )}
    </div>
  );

  const renderHistoryTable = () => (
    <div className={`overflow-x-auto rounded-2xl ${listWrapClass}`}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr
            className={isDark ? "bg-slate-900 text-slate-400" : "bg-slate-50 text-slate-500"}
          >
            <th className="px-4 py-3 text-xs font-semibold uppercase">งานซ่อม</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase">ผู้แจ้ง / สถานที่</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase">สถานะ</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase">ปิดงาน</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase text-center">จัดการ</th>
          </tr>
        </thead>

        <tbody className={isDark ? "divide-y divide-slate-800" : "divide-y divide-slate-200"}>
          {filteredTickets.map((ticket) => {
            const priorityMeta =
              PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.default;
            const statusClass = getStatusBadgeClass(ticket.status);
            return (
              <tr
                key={ticket.id}
                className={isDark ? "hover:bg-slate-800/60" : "hover:bg-slate-50"}
              >
                <td className="px-4 py-3">
                  <p className={`font-semibold ${textPrimary}`}>{ticket.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className={`font-mono ${textSecondary}`}>
                      {formatTicketId(ticket.id)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-semibold ${getPriorityBadgeClass(ticket.priority)}`}
                    >
                      {getPriorityText(ticket.priority)}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 text-sm">
                  <p className={textPrimary}>{ticket.reporter_name || "-"}</p>
                  <p className={textSecondary}>
                    {ticket.location || "-"} | {ticket.category || "-"}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
                  >
                    {getStatusText(ticket.status)}
                  </span>
                </td>

                <td className="px-4 py-3 text-sm">
                  <p className={textPrimary}>
                    {ticket.closed_at
                      ? new Date(ticket.closed_at).toLocaleDateString("th-TH")
                      : "-"}
                  </p>
                  <p className={textSecondary}>
                    {ticket.closed_at
                      ? calculateDuration(ticket.started_at, ticket.closed_at)
                      : "-"}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleViewDetails(ticket)}
                      className={`rounded-lg p-2 transition-colors ${blueIconButtonClass}`}
                      title="ดูรายละเอียด"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTicket(ticket)}
                      className={`rounded-lg p-2 transition-colors ${roseIconButtonClass}`}
                      title="ลบประวัติ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderCardActions = (ticket) => {
    if (ticket.status === "NEW") {
      return (
        <button
          onClick={() => handleAcceptJob(ticket.id)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2b59b0] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#244a95]"
        >
          <CheckCircle size={16} />
          รับงานนี้
        </button>
      );
    }

    if (ticket.status === "IN_PROGRESS" && ticket.assigned_to === currentUser?.id) {
      return (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleOpenNavigation(ticket.location)}
            className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${neutralButtonClass}`}
            disabled={!ticket.location}
          >
            <Navigation size={15} />
            นำทาง
          </button>
          <button
            onClick={() => handleCloseJob(ticket)}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Camera size={15} />
            ปิดงาน
          </button>
        </div>
      );
    }

    if (ticket.status === "CLOSED") {
      return (
        <div className="space-y-2">
          <div className={`text-xs ${textSecondary}`}>
            ระยะเวลาซ่อม:{" "}
            <span className={`font-semibold ${textPrimary}`}>
              {calculateDuration(ticket.started_at, ticket.closed_at)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleViewDetails(ticket)}
              className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${neutralButtonClass}`}
            >
              <Eye size={15} />
              รายละเอียด
            </button>
            <button
              onClick={() => handleDeleteTicket(ticket)}
              className={`inline-flex items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${roseOutlineButtonClass}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={() => handleViewDetails(ticket)}
        className={`inline-flex w-full items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${neutralButtonClass}`}
      >
        <Eye size={15} />
        ดูรายละเอียด
      </button>
    );
  };

  const renderCardGrid = () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {filteredTickets.map((ticket) => {
        const priorityMeta = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.default;
        const statusClass = getStatusBadgeClass(ticket.status);
        const reporterInitial = (ticket.reporter_name || "U").charAt(0).toUpperCase();

        return (
          <article
            key={ticket.id}
            className={`flex h-full flex-col rounded-2xl p-5 shadow-sm transition hover:shadow-md ${listWrapClass}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${priorityMeta.dot}`} />
                <span
                  className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getPriorityBadgeClass(ticket.priority)}`}
                >
                  {getPriorityText(ticket.priority)}
                </span>
              </div>
              <div className="text-right text-[11px]">
                <p className={textSecondary}>
                  {new Date(ticket.created_at).toLocaleDateString("th-TH")}
                </p>
                <p className={textMuted}>
                  {new Date(ticket.created_at).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <h3 className={`line-clamp-2 text-base font-semibold ${textPrimary}`}>
              {ticket.title}
            </h3>
            <p className={`mt-1 text-xs font-mono ${textSecondary}`}>
              {formatTicketId(ticket.id)}
            </p>

            <div className={`mt-3 rounded-xl p-3 ${softSurface}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {reporterInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${textMuted}`}>
                    ผู้แจ้ง
                  </p>
                  <p className={`truncate text-sm font-semibold ${textPrimary}`}>
                    {ticket.reporter_name || "ไม่ระบุผู้แจ้ง"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${chipClass}`}
                    >
                      <User size={12} />
                      {ticket.reporter_emp_id || "ไม่ระบุรหัส"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${chipClass}`}
                    >
                      <Building2 size={12} />
                      {ticket.reporter_dept || "ไม่ระบุแผนก"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className={`rounded-xl p-3 ${softSurface}`}>
                <p className={`mb-1 text-[11px] font-semibold ${textMuted}`}>สถานที่</p>
                <p className={`flex items-center gap-1.5 text-xs font-medium ${textPrimary}`}>
                  <MapPin size={13} className="text-blue-500" />
                  <span className="truncate">{ticket.location || "ไม่ระบุ"}</span>
                </p>
              </div>
              <div className={`rounded-xl p-3 ${softSurface}`}>
                <p className={`mb-1 text-[11px] font-semibold ${textMuted}`}>หมวดหมู่</p>
                <p className={`flex items-center gap-1.5 text-xs font-medium ${textPrimary}`}>
                  {getDeviceIcon(ticket.category || ticket.device_type)}
                  <span className="truncate">{ticket.category || "ไม่ระบุ"}</span>
                </p>
              </div>
            </div>

            {ticket.description && (
              <p className={`mt-3 line-clamp-2 text-xs leading-relaxed ${textSecondary}`}>
                {ticket.description}
              </p>
            )}

            {(ticket.assigned_name || ticket.assigned_employee_id) && (
              <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${softSurface}`}>
                <User size={13} className={textMuted} />
                <span className={textSecondary}>
                  {ticket.assigned_name || "-"}
                  {ticket.assigned_employee_id ? ` (${ticket.assigned_employee_id})` : ""}
                </span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span
                className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
              >
                {getStatusText(ticket.status)}
              </span>
              <div className={`inline-flex items-center gap-1 text-xs ${textMuted}`}>
                <Clock3 size={13} />
                {ticket.updated_at
                  ? new Date(ticket.updated_at).toLocaleDateString("th-TH")
                  : new Date(ticket.created_at).toLocaleDateString("th-TH")}
              </div>
            </div>

            <div className="mt-4 pt-3">
              {renderCardActions(ticket)}
            </div>
          </article>
        );
      })}
    </div>
  );

  if (loading && tickets.length === 0) {
    return <div className="w-full pb-12">{renderSkeleton()}</div>;
  }

  if (filteredTickets.length === 0) {
    return <div className="w-full pb-12">{renderEmptyState()}</div>;
  }

  return (
    <div className={`w-full px-0 py-2 ${isMobile ? "pb-28" : "pb-12"}`}>
      {activeTab === "HISTORY" && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={`inline-flex w-fit items-center gap-1 rounded-lg border p-1 ${uiTheme.historySwitchWrap}`}
          >
            <button
              onClick={() => setViewMode("card")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "card" ? uiTheme.historySwitchActive : uiTheme.historySwitchIdle
              }`}
            >
              <LayoutGrid size={14} />
              การ์ด
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "table" ? uiTheme.historySwitchActive : uiTheme.historySwitchIdle
              }`}
            >
              <List size={14} />
              ตาราง
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`hidden rounded-md border px-3 py-1.5 text-xs font-semibold sm:block ${softSurface} ${textSecondary}`}
            >
              ทั้งหมด {historyTickets.length} รายการ
            </div>
            <button
              onClick={() =>
                handleExportExcelWithImages(filteredTickets, theme, currentUser, dateRange)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <DownloadCloud size={14} />
              ส่งออก Excel
            </button>
          </div>
        </div>
      )}

      {activeTab === "HISTORY" && viewMode === "table"
        ? renderHistoryTable()
        : renderCardGrid()}
    </div>
  );
};

export default TicketList;
