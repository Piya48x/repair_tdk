import React from "react";
import {
  Search,
  LayoutGrid,
  List,
  DownloadCloud,
  Eye,
  MessageSquare,
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

const TEXT = {
  noItems: "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e07\u0e32\u0e19",
  noItemsHint:
    "\u0e25\u0e2d\u0e07\u0e1b\u0e23\u0e31\u0e1a\u0e04\u0e33\u0e04\u0e49\u0e19\u0e2b\u0e32 \u0e2b\u0e23\u0e37\u0e2d\u0e25\u0e49\u0e32\u0e07\u0e40\u0e07\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e02\u0e15\u0e31\u0e27\u0e01\u0e23\u0e2d\u0e07",
  clearSearch: "\u0e25\u0e49\u0e32\u0e07\u0e01\u0e32\u0e23\u0e04\u0e49\u0e19\u0e2b\u0e32",
  acceptJob: "\u0e23\u0e31\u0e1a\u0e07\u0e32\u0e19",
  acceptThisJob: "\u0e23\u0e31\u0e1a\u0e07\u0e32\u0e19\u0e19\u0e35\u0e49",
  viewDetail: "\u0e14\u0e39\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14",
  caseChat: "\u0e41\u0e0a\u0e17\u0e40\u0e04\u0e2a",
  navigate: "\u0e19\u0e33\u0e17\u0e32\u0e07",
  closeJob: "\u0e1b\u0e34\u0e14\u0e07\u0e32\u0e19",
  deleteHistory: "\u0e25\u0e1a\u0e1b\u0e23\u0e30\u0e27\u0e31\u0e15\u0e34",
  repairDuration: "\u0e23\u0e30\u0e22\u0e30\u0e40\u0e27\u0e25\u0e32\u0e0b\u0e48\u0e2d\u0e21:",
  detail: "\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14",
  reporter: "\u0e1c\u0e39\u0e49\u0e41\u0e08\u0e49\u0e07",
  reporterFallback: "\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38\u0e1c\u0e39\u0e49\u0e41\u0e08\u0e49\u0e07",
  employeeCodeFallback: "\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38\u0e23\u0e2b\u0e31\u0e2a",
  deptFallback: "\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38\u0e41\u0e1c\u0e19\u0e01",
  location: "\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48",
  category: "\u0e2b\u0e21\u0e27\u0e14\u0e2b\u0e21\u0e39\u0e48",
  notSpecified: "\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38",
  card: "\u0e01\u0e32\u0e23\u0e4c\u0e14",
  table: "\u0e15\u0e32\u0e23\u0e32\u0e07",
  showing: "\u0e41\u0e2a\u0e14\u0e07",
  from: "\u0e08\u0e32\u0e01",
  items: "\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23",
  exportExcel: "\u0e2a\u0e48\u0e07\u0e2d\u0e2d\u0e01 Excel",
  tableRepair: "\u0e07\u0e32\u0e19\u0e0b\u0e48\u0e2d\u0e21",
  tableReporterLocation:
    "\u0e1c\u0e39\u0e49\u0e41\u0e08\u0e49\u0e07 / \u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48",
  tableStatus: "\u0e2a\u0e16\u0e32\u0e19\u0e30",
  tableAssignee: "\u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a\u0e1c\u0e34\u0e14\u0e0a\u0e2d\u0e1a",
  tableClosedAt: "\u0e1b\u0e34\u0e14\u0e07\u0e32\u0e19",
  tableUpdatedAt: "\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14",
  tableAction: "\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23",
};

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

const TAB_COPY = {
  INCOMING: {
    label: "\u0e07\u0e32\u0e19\u0e0b\u0e48\u0e2d\u0e21",
    helper: "\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e43\u0e2b\u0e21\u0e48",
  },
  ACTIVE: {
    label: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23",
    helper: "\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e01\u0e33\u0e25\u0e31\u0e07\u0e23\u0e31\u0e1a\u0e1c\u0e34\u0e14\u0e0a\u0e2d\u0e1a",
  },
  HISTORY: {
    label: "\u0e1b\u0e23\u0e30\u0e27\u0e31\u0e15\u0e34",
    helper: "\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e1b\u0e34\u0e14\u0e07\u0e32\u0e19\u0e41\u0e25\u0e49\u0e27",
  },
};

function buildAvatarFallback(name, color = "2b59b0") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || "U"))}&background=${color}&color=fff&size=96`;
}

function deriveEmployeeCodeFromEmail(email) {
  const localPart = String(email || "").trim().split("@")[0] || "";
  const match = localPart.match(/\d{3,}/);
  return match ? match[0] : "";
}

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
    ? "text-[#8eb0f6] hover:bg-[#2b59b0]/20"
    : "text-[#2b59b0] hover:bg-[#2b59b0]/10";
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

  const resolveReporterDept = (ticket) =>
    ticket?.reporter_dept || ticket?.department || TEXT.deptFallback;

  const resolveReporterEmpId = (ticket) =>
    ticket?.reporter_emp_id ||
    deriveEmployeeCodeFromEmail(ticket?.reporter_email) ||
    TEXT.employeeCodeFallback;

  const resolveReporterAvatar = (ticket) =>
    ticket?.reporter_avatar_url || buildAvatarFallback(ticket?.reporter_name || "U", "2b59b0");

  const resolveAssigneeAvatar = (ticket) =>
    ticket?.assigned_avatar_url ||
    (ticket?.assigned_name ? buildAvatarFallback(ticket.assigned_name, "059669") : "");

  const isWalkInTicket = (ticket) =>
    String(ticket?.channel || ticket?.service_type || "").toLowerCase() === "walk-in";

  const isHistoryTab = activeTab === "HISTORY";
  const activeTabMeta = TAB_COPY[activeTab] || TAB_COPY.INCOMING;
  const tabTotalCount =
    activeTab === "INCOMING"
      ? tickets.filter((ticket) => ticket.status === "NEW").length
      : activeTab === "ACTIVE"
        ? tickets.filter(
          (ticket) =>
            ticket.status === "IN_PROGRESS" && ticket.assigned_to === currentUser?.id,
        ).length
        : isHistoryTab
          ? historyTickets.length
          : tickets.length;

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
    <div className={`rounded-2xl px-4 py-8 text-center sm:p-10 ${listWrapClass}`}>
      <div
        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full sm:h-14 sm:w-14 ${emptyIconClass}`}
      >
        <Search size={22} />
      </div>
      <p className={`text-base font-semibold ${textPrimary}`}>{TEXT.noItems}</p>
      <p className={`mx-auto mt-1 max-w-md text-sm ${textSecondary}`}>{TEXT.noItemsHint}</p>
      {(searchQuery || (dateRange.start && dateRange.end)) && (
        <button
          onClick={() => {
            setSearchQuery("");
            setDateRange({ start: "", end: "" });
          }}
          className={`mt-5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${neutralButtonClass}`}
        >
          {TEXT.clearSearch}
        </button>
      )}
    </div>
  );

  const renderTableActions = (ticket) => {
    if (ticket.status === "NEW") {
      return (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleViewDetails(ticket)}
            className={`rounded-lg p-2 transition-colors ${blueIconButtonClass}`}
            title={TEXT.caseChat}
          >
            <MessageSquare size={15} />
          </button>
          <button
            onClick={() => handleAcceptJob(ticket.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#2b59b0] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#244a95]"
          >
            <CheckCircle size={13} />
            {TEXT.acceptJob}
          </button>
          <button
            onClick={() => handleViewDetails(ticket)}
            className={`rounded-lg p-2 transition-colors ${blueIconButtonClass}`}
            title={TEXT.viewDetail}
          >
            <Eye size={15} />
          </button>
        </div>
      );
    }

    if (ticket.status === "IN_PROGRESS" && ticket.assigned_to === currentUser?.id) {
      return (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleViewDetails(ticket)}
            className={`rounded-lg p-2 transition-colors ${blueIconButtonClass}`}
            title={TEXT.caseChat}
          >
            <MessageSquare size={15} />
          </button>
          <button
            onClick={() => handleOpenNavigation(ticket.location)}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${neutralButtonClass}`}
            disabled={!ticket.location}
          >
            <Navigation size={13} />
            {TEXT.navigate}
          </button>
          <button
            onClick={() => handleCloseJob(ticket)}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Camera size={13} />
            {TEXT.closeJob}
          </button>
        </div>
      );
    }

    if (ticket.status === "CLOSED") {
      return (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleViewDetails(ticket)}
            className={`rounded-lg p-2 transition-colors ${blueIconButtonClass}`}
            title={TEXT.caseChat}
          >
            <MessageSquare size={15} />
          </button>
          <button
            onClick={() => handleViewDetails(ticket)}
            className={`rounded-lg p-2 transition-colors ${blueIconButtonClass}`}
            title={TEXT.viewDetail}
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleDeleteTicket(ticket)}
            className={`rounded-lg p-2 transition-colors ${roseIconButtonClass}`}
            title={TEXT.deleteHistory}
          >
            <Trash2 size={15} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => handleViewDetails(ticket)}
          className={`rounded-lg p-2 transition-colors ${blueIconButtonClass}`}
          title={TEXT.caseChat}
        >
          <MessageSquare size={15} />
        </button>
        <button
          onClick={() => handleViewDetails(ticket)}
          className={`rounded-lg p-2 transition-colors ${blueIconButtonClass}`}
          title={TEXT.viewDetail}
        >
          <Eye size={15} />
        </button>
      </div>
    );
  };

  const renderTicketTable = () => (
    <div className={`overflow-x-auto rounded-2xl border shadow-sm ${listWrapClass}`}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr
            className={isDark ? "bg-slate-900 text-slate-400" : "bg-slate-50 text-slate-500"}
          >
            <th className="px-4 py-3 text-xs font-semibold uppercase">{TEXT.tableRepair}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase">{TEXT.tableReporterLocation}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase">{TEXT.tableStatus}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase">{TEXT.tableAssignee}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase">
              {isHistoryTab ? TEXT.tableClosedAt : TEXT.tableUpdatedAt}
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase text-right">{TEXT.tableAction}</th>
          </tr>
        </thead>

        <tbody className={isDark ? "divide-y divide-slate-800" : "divide-y divide-slate-200"}>
          {filteredTickets.map((ticket) => {
            const statusClass = getStatusBadgeClass(ticket.status);
            const referenceDate = isHistoryTab
              ? ticket.closed_at
              : ticket.updated_at || ticket.created_at;
            const durationLabel = ticket.started_at && referenceDate
              ? calculateDuration(ticket.started_at, referenceDate)
              : "-";

            return (
              <tr
                key={ticket.id}
                className={isDark ? "hover:bg-slate-800/60" : "hover:bg-slate-50"}
              >
                <td className="px-4 py-3 align-top">
                  <p className={`max-w-[280px] font-semibold ${textPrimary}`}>{ticket.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className={`font-mono ${textSecondary}`}>{formatTicketId(ticket.id)}</span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-semibold ${getPriorityBadgeClass(ticket.priority)}`}
                    >
                      {getPriorityText(ticket.priority)}
                    </span>
                    {isWalkInTicket(ticket) && (
                      <span className="inline-flex items-center rounded-md border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-2 py-0.5 font-semibold text-[#2b59b0]">
                        Walk-in
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 align-top text-sm">
                  <div className="flex items-start gap-2">
                    <img
                      src={resolveReporterAvatar(ticket)}
                      onError={(event) => {
                        event.currentTarget.src = buildAvatarFallback(ticket.reporter_name || "U", "2b59b0");
                      }}
                      alt={ticket.reporter_name || TEXT.reporterFallback}
                      className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-[#2b59b0]/20 bg-white object-cover"
                    />
                    <div className="min-w-0">
                      <p className={`truncate ${textPrimary}`}>{ticket.reporter_name || "-"}</p>
                      <p className={`truncate text-xs ${textMuted}`}>
                        {resolveReporterEmpId(ticket)} • {resolveReporterDept(ticket)}
                      </p>
                      <p className={textSecondary}>
                        {ticket.location || "-"} | {ticket.category || "-"}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 align-top">
                  <span
                    className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
                  >
                    {getStatusText(ticket.status)}
                  </span>
                </td>

                <td className="px-4 py-3 align-top text-sm">
                  <div className="flex items-start gap-2">
                    {resolveAssigneeAvatar(ticket) ? (
                      <img
                        src={resolveAssigneeAvatar(ticket)}
                        onError={(event) => {
                          event.currentTarget.src = buildAvatarFallback(ticket.assigned_name || "IT", "059669");
                        }}
                        alt={ticket.assigned_name || "Technician"}
                        className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-emerald-200 bg-white object-cover"
                      />
                    ) : (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                        IT
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`truncate ${textPrimary}`}>{ticket.assigned_name || "-"}</p>
                      <p className={textSecondary}>{ticket.assigned_employee_id || ticket.assigned_to || "-"}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 align-top text-sm">
                  <p className={textPrimary}>
                    {referenceDate ? new Date(referenceDate).toLocaleDateString("th-TH") : "-"}
                  </p>
                  <p className={textSecondary}>
                    {isHistoryTab
                      ? durationLabel
                      : referenceDate
                        ? new Date(referenceDate).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                        : "-"}
                  </p>
                </td>

                <td className="px-4 py-3 align-top">{renderTableActions(ticket)}</td>
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
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleViewDetails(ticket)}
            className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${neutralButtonClass}`}
          >
            <MessageSquare size={15} />
            {TEXT.caseChat}
          </button>
          <button
            onClick={() => handleAcceptJob(ticket.id)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2b59b0] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#244a95]"
          >
            <CheckCircle size={16} />
            {TEXT.acceptThisJob}
          </button>
        </div>
      );
    }

    if (ticket.status === "IN_PROGRESS" && ticket.assigned_to === currentUser?.id) {
      return (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleViewDetails(ticket)}
            className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${neutralButtonClass}`}
          >
            <MessageSquare size={15} />
            {TEXT.caseChat}
          </button>
          <button
            onClick={() => handleOpenNavigation(ticket.location)}
            className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${neutralButtonClass}`}
            disabled={!ticket.location}
          >
            <Navigation size={15} />
            {TEXT.navigate}
          </button>
          <button
            onClick={() => handleCloseJob(ticket)}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Camera size={15} />
            {TEXT.closeJob}
          </button>
        </div>
      );
    }

    if (ticket.status === "CLOSED") {
      return (
        <div className="space-y-2">
          <div className={`text-xs ${textSecondary}`}>
            {TEXT.repairDuration}{" "}
            <span className={`font-semibold ${textPrimary}`}>
              {calculateDuration(ticket.started_at, ticket.closed_at)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleViewDetails(ticket)}
              className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${neutralButtonClass}`}
            >
              <MessageSquare size={15} />
              {TEXT.caseChat}
            </button>
            <button
              onClick={() => handleDeleteTicket(ticket)}
              className={`inline-flex items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${roseOutlineButtonClass}`}
              title={TEXT.deleteHistory}
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
        {TEXT.viewDetail}
      </button>
    );
  };

  const renderCardGrid = () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {filteredTickets.map((ticket) => {
        const priorityMeta = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.default;
        const statusClass = getStatusBadgeClass(ticket.status);

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
                  {isWalkInTicket(ticket) && (
                    <span className="inline-flex rounded-md border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2b59b0]">
                      Walk-in
                    </span>
                  )}
                </div>
              <div className="text-right text-[11px]">
                <p className={textSecondary}>{new Date(ticket.created_at).toLocaleDateString("th-TH")}</p>
                <p className={textMuted}>
                  {new Date(ticket.created_at).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <h3 className={`line-clamp-2 text-base font-semibold ${textPrimary}`}>{ticket.title}</h3>
            <p className={`mt-1 text-xs font-mono ${textSecondary}`}>{formatTicketId(ticket.id)}</p>

            <div className={`mt-3 rounded-xl p-3 ${softSurface}`}>
              <div className="flex items-start gap-3">
                <img
                  src={resolveReporterAvatar(ticket)}
                  onError={(event) => {
                    event.currentTarget.src = buildAvatarFallback(ticket.reporter_name || "U", "2b59b0");
                  }}
                  alt={ticket.reporter_name || TEXT.reporterFallback}
                  className="h-9 w-9 shrink-0 rounded-full border border-[#2b59b0]/20 bg-white object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${textMuted}`}>
                    {TEXT.reporter}
                  </p>
                  <p className={`truncate text-sm font-semibold ${textPrimary}`}>
                    {ticket.reporter_name || TEXT.reporterFallback}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${chipClass}`}>
                      <User size={12} />
                      {resolveReporterEmpId(ticket)}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${chipClass}`}>
                      <Building2 size={12} />
                      {resolveReporterDept(ticket)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className={`rounded-xl p-3 ${softSurface}`}>
                <p className={`mb-1 text-[11px] font-semibold ${textMuted}`}>{TEXT.location}</p>
                <p className={`flex items-center gap-1.5 text-xs font-medium ${textPrimary}`}>
                  <MapPin size={13} className="text-[#2b59b0]" />
                  <span className="truncate">{ticket.location || TEXT.notSpecified}</span>
                </p>
              </div>
              <div className={`rounded-xl p-3 ${softSurface}`}>
                <p className={`mb-1 text-[11px] font-semibold ${textMuted}`}>{TEXT.category}</p>
                <p className={`flex items-center gap-1.5 text-xs font-medium ${textPrimary}`}>
                  {getDeviceIcon(ticket.category || ticket.device_type)}
                  <span className="truncate">{ticket.category || TEXT.notSpecified}</span>
                </p>
              </div>
            </div>

            {ticket.description && (
              <p className={`mt-3 line-clamp-2 text-xs leading-relaxed ${textSecondary}`}>{ticket.description}</p>
            )}

            {(ticket.assigned_name || ticket.assigned_employee_id) && (
              <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${softSurface}`}>
                {resolveAssigneeAvatar(ticket) ? (
                  <img
                    src={resolveAssigneeAvatar(ticket)}
                    onError={(event) => {
                      event.currentTarget.src = buildAvatarFallback(ticket.assigned_name || "IT", "059669");
                    }}
                    alt={ticket.assigned_name || "Technician"}
                    className="h-5 w-5 shrink-0 rounded-full border border-emerald-200 bg-white object-cover"
                  />
                ) : (
                  <User size={13} className={textMuted} />
                )}
                <span className={textSecondary}>
                  {ticket.assigned_name || "-"}
                  {ticket.assigned_employee_id ? ` (${ticket.assigned_employee_id})` : ""}
                </span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                {getStatusText(ticket.status)}
              </span>
              <div className={`inline-flex items-center gap-1 text-xs ${textMuted}`}>
                <Clock3 size={13} />
                {ticket.updated_at
                  ? new Date(ticket.updated_at).toLocaleDateString("th-TH")
                  : new Date(ticket.created_at).toLocaleDateString("th-TH")}
              </div>
            </div>

            <div className="mt-4 pt-3">{renderCardActions(ticket)}</div>
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
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
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
              {TEXT.card}
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "table" ? uiTheme.historySwitchActive : uiTheme.historySwitchIdle
              }`}
            >
              <List size={14} />
              {TEXT.table}
            </button>
          </div>
          <div
            className={`hidden rounded-md border px-3 py-1.5 text-xs font-semibold md:block ${softSurface} ${textSecondary}`}
          >
            {activeTabMeta.label} | {activeTabMeta.helper}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${softSurface} ${textSecondary}`}
          >
            {TEXT.showing} {filteredTickets.length.toLocaleString("th-TH")} {TEXT.from}{" "}
            {tabTotalCount.toLocaleString("th-TH")} {TEXT.items}
          </div>
          {isHistoryTab && (
            <button
              onClick={() =>
                handleExportExcelWithImages(filteredTickets, theme, currentUser, dateRange)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <DownloadCloud size={14} />
              {TEXT.exportExcel}
            </button>
          )}
        </div>
      </div>

      {viewMode === "table" ? renderTicketTable() : renderCardGrid()}
    </div>
  );
};

export default TicketList;
