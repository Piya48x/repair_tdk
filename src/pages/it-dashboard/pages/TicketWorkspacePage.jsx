import React from "react";
import { Search, Filter, Plus, ChevronDown, X } from "lucide-react";
import TicketList from "../components/TicketList";

const QUICK_FILTERS = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "URGENT", label: "งานด่วน" },
  { id: "MINE", label: "งานของฉัน" },
  { id: "TODAY", label: "วันนี้" },
  { id: "HARDWARE", label: "ฮาร์ดแวร์" },
  { id: "SYSTEM", label: "ระบบ" },
];

const SORT_OPTIONS = [
  { id: "latest", label: "เรียง: ล่าสุด" },
  { id: "oldest", label: "เรียง: เก่าสุด" },
  { id: "priority", label: "เรียง: ความสำคัญ" },
  { id: "status", label: "เรียง: สถานะ" },
  { id: "updated", label: "เรียง: อัปเดตล่าสุด" },
];

const TicketWorkspacePage = ({
  title,
  subtitle,
  theme,
  uiTheme,
  statCards,
  tabItems,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchQueryChange,
  activeFilterCount,
  onOpenDateFilter,
  sortBy,
  onSortByChange,
  onCreateTicket,
  quickFilter,
  onQuickFilterChange,
  sortedTickets,
  tickets,
  loading,
  isMobile,
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
  return (
    <>
      <section className="mb-4">
        <h2 className={`text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
          {title}
        </h2>
        <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
          {subtitle}
        </p>
      </section>

      <section className="mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => (
            <div key={stat.key} className={`min-h-[152px] rounded-lg border p-5 shadow-none ${uiTheme.surfaceCard}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>{stat.title}</p>
                  <p className={`mt-2 text-4xl font-bold ${stat.valueClass}`}>{stat.value}</p>
                  <p className={`mt-1 text-xs ${theme === "dark" ? "text-[#94a3b8]" : "text-slate-500"}`}>{stat.trend}</p>
                </div>
                <div className={`rounded-md p-3 ${stat.iconWrapClass}`}>
                  <stat.icon size={22} className={stat.iconClass} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <div className={`rounded-lg p-2 ${uiTheme.surfaceCard}`}>
          <div className="grid grid-cols-3 gap-2">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-lg py-2 transition ${
                  activeTab === tab.id ? uiTheme.tabActive : uiTheme.tabInactive
                }`}
              >
                <tab.icon size={16} />
                <span className="hidden text-sm font-semibold md:inline">{tab.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs ${
                    activeTab === tab.id ? uiTheme.tabBadgeActive : uiTheme.badgeMuted
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className={`rounded-lg p-4 ${uiTheme.surfaceCard}`}>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_120px_170px_150px]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาเลข Ticket, ผู้แจ้ง, สถานที่..."
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                className={`w-full rounded-lg border py-2.5 pl-9 pr-9 text-sm ${uiTheme.searchInputMobile}`}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchQueryChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-red-600"
                  aria-label="ล้างคำค้นหา"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={onOpenDateFilter}
              className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                activeFilterCount > 0 ? uiTheme.quickRangeBtnActive : uiTheme.dateFilterButtonIdle
              }`}
            >
              <Filter size={14} />
              ตัวกรอง {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(event) => onSortByChange(event.target.value)}
                className={`w-full appearance-none rounded-lg border py-2.5 pl-3 pr-8 text-sm font-semibold ${uiTheme.searchInputMobile}`}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              onClick={onCreateTicket}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#2b59b0] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#244a95]"
            >
              <Plus size={14} />
              สร้างงานใหม่
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {QUICK_FILTERS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => onQuickFilterChange(chip.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  quickFilter === chip.id ? uiTheme.quickRangeBtnActive : uiTheme.quickRangeBtn
                }`}
              >
                {chip.label}
              </button>
            ))}

            <span className={`ml-auto text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
              พบ {sortedTickets.length.toLocaleString("th-TH")} รายการ
            </span>
          </div>
        </div>
      </section>

      <section>
        <TicketList
          loading={loading}
          tickets={tickets}
          filteredTickets={sortedTickets}
          theme={theme}
          isMobile={isMobile}
          activeTab={activeTab}
          searchQuery={searchQuery}
          setSearchQuery={onSearchQueryChange}
          dateRange={dateRange}
          setDateRange={setDateRange}
          viewMode={viewMode}
          setViewMode={setViewMode}
          historyTickets={historyTickets}
          currentUser={currentUser}
          handleAcceptJob={handleAcceptJob}
          handleCloseJob={handleCloseJob}
          handleDeleteTicket={handleDeleteTicket}
          handleViewDetails={handleViewDetails}
          handleOpenNavigation={handleOpenNavigation}
        />
      </section>
    </>
  );
};

export default TicketWorkspacePage;
