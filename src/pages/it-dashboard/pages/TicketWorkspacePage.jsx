import React from "react";
import { Search, Filter, Plus, ChevronDown, X } from "lucide-react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import TicketList from "../components/TicketList";

const TICKET_WORKSPACE_TRANSLATIONS = {
  th: {
    quickFilters: {
      all: "ทั้งหมด",
      urgent: "งานด่วน",
      mine: "งานของฉัน",
      today: "วันนี้",
      hardware: "ฮาร์ดแวร์",
      system: "ระบบ",
    },
    sortOptions: {
      latest: "เรียง: ล่าสุด",
      oldest: "เรียง: เก่าสุด",
      priority: "เรียง: ความสำคัญ",
      status: "เรียง: สถานะ",
      updated: "เรียง: อัปเดตล่าสุด",
    },
    searchPlaceholder: "ค้นหาเลข Ticket, ผู้แจ้ง, สถานที่...",
    clearSearch: "ล้างคำค้นหา",
    filters: "ตัวกรอง",
    createTicket: "สร้างงานใหม่",
    walkIn: "บันทึกงาน (Walk-in)",
    foundCount: "พบ {{count}} รายการ",
  },
  en: {
    quickFilters: {
      all: "All",
      urgent: "Urgent",
      mine: "My tickets",
      today: "Today",
      hardware: "Hardware",
      system: "System",
    },
    sortOptions: {
      latest: "Sort: Latest",
      oldest: "Sort: Oldest",
      priority: "Sort: Priority",
      status: "Sort: Status",
      updated: "Sort: Recently updated",
    },
    searchPlaceholder: "Search ticket number, requester, location...",
    clearSearch: "Clear search",
    filters: "Filters",
    createTicket: "Create ticket",
    walkIn: "Log walk-in ticket",
    foundCount: "{{count}} items found",
  },
  ko: {
    quickFilters: {
      all: "전체",
      urgent: "긴급 작업",
      mine: "내 작업",
      today: "오늘",
      hardware: "하드웨어",
      system: "시스템",
    },
    sortOptions: {
      latest: "정렬: 최신순",
      oldest: "정렬: 오래된순",
      priority: "정렬: 우선순위",
      status: "정렬: 상태",
      updated: "정렬: 최근 업데이트",
    },
    searchPlaceholder: "티켓 번호, 요청자, 위치 검색...",
    clearSearch: "검색 지우기",
    filters: "필터",
    createTicket: "새 작업 생성",
    walkIn: "워크인 작업 등록",
    foundCount: "{{count}}개 항목",
  },
};

const LOCALE_BY_LANGUAGE = {
  th: "th-TH",
  en: "en-US",
  ko: "ko-KR",
};

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
  onOpenWalkInTicket,
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
  handleOpenCaseChat,
  handleUpdateRepairStatus,
  handleCloseJob,
  handleDeleteTicket,
  handleViewDetails,
  handleOpenNavigation,
}) => {
  const { language, tt } = useScopedI18n(TICKET_WORKSPACE_TRANSLATIONS);

  const quickFilters = [
    { id: "ALL", label: tt("quickFilters.all") },
    { id: "URGENT", label: tt("quickFilters.urgent") },
    { id: "MINE", label: tt("quickFilters.mine") },
    { id: "TODAY", label: tt("quickFilters.today") },
    { id: "HARDWARE", label: tt("quickFilters.hardware") },
    { id: "SYSTEM", label: tt("quickFilters.system") },
  ];

  const sortOptions = [
    { id: "latest", label: tt("sortOptions.latest") },
    { id: "oldest", label: tt("sortOptions.oldest") },
    { id: "priority", label: tt("sortOptions.priority") },
    { id: "status", label: tt("sortOptions.status") },
    { id: "updated", label: tt("sortOptions.updated") },
  ];

  const locale = LOCALE_BY_LANGUAGE[language] || LOCALE_BY_LANGUAGE.en;

  if (isMobile) {
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

        <section className="mb-4">
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((stat) => (
              <article key={stat.key} className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
                <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{stat.title}</p>
                <p className={`mt-1.5 text-2xl font-black ${stat.valueClass}`}>{stat.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`mb-4 rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={tt("searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                className={`w-full rounded-lg border py-2.5 pl-9 pr-9 text-sm ${uiTheme.searchInputMobile}`}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchQueryChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-red-600"
                  aria-label={tt("clearSearch")}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <select
                  value={activeTab}
                  onChange={(event) => onTabChange(event.target.value)}
                  className={`w-full appearance-none rounded-lg border py-2.5 pl-3 pr-8 text-sm ${uiTheme.searchInputMobile}`}
                >
                  {tabItems.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${uiTheme.statusBadge}`}>
                {sortedTickets.length.toLocaleString(locale)} รายการ
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(event) => onSortByChange(event.target.value)}
                  className={`w-full appearance-none rounded-lg border py-2.5 pl-3 pr-8 text-sm ${uiTheme.searchInputMobile}`}
                >
                  {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              <button
                onClick={onOpenDateFilter}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                  activeFilterCount > 0 ? uiTheme.quickRangeBtnActive : uiTheme.dateFilterButtonIdle
                }`}
              >
                <Filter size={14} />
                {tt("filters")} {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onCreateTicket}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#2b59b0] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#244a95]"
              >
                <Plus size={14} />
                {tt("createTicket")}
              </button>

              <button
                onClick={onOpenWalkInTicket}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-3 py-2.5 text-sm font-semibold text-[#2b59b0] transition hover:bg-[#2b59b0]/15"
              >
                <Plus size={14} />
                {tt("walkIn")}
              </button>
            </div>

            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="flex w-max min-w-full items-center gap-2">
                {quickFilters.map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => onQuickFilterChange(chip.id)}
                    className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      quickFilter === chip.id ? uiTheme.quickRangeBtnActive : uiTheme.quickRangeBtn
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
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
            handleOpenCaseChat={handleOpenCaseChat}
            handleUpdateRepairStatus={handleUpdateRepairStatus}
            handleCloseJob={handleCloseJob}
            handleDeleteTicket={handleDeleteTicket}
            handleViewDetails={handleViewDetails}
            handleOpenNavigation={handleOpenNavigation}
          />
        </section>
      </>
    );
  }

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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2 transition ${
                  activeTab === tab.id ? uiTheme.tabActive : uiTheme.tabInactive
                }`}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <tab.icon size={16} />
                  <span className="truncate text-xs font-semibold sm:text-sm">{tab.label}</span>
                </span>
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
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_130px_180px_auto]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={tt("searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                className={`w-full rounded-lg border py-2.5 pl-9 pr-9 text-sm ${uiTheme.searchInputMobile}`}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchQueryChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-red-600"
                  aria-label={tt("clearSearch")}
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
              {tt("filters")} {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(event) => onSortByChange(event.target.value)}
                className={`w-full appearance-none rounded-lg border py-2.5 pl-3 pr-8 text-sm font-semibold ${uiTheme.searchInputMobile}`}
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:min-w-[340px]">
              <button
                onClick={onCreateTicket}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#2b59b0] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#244a95]"
              >
                <Plus size={14} />
                {tt("createTicket")}
              </button>

              <button
                onClick={onOpenWalkInTicket}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-3 py-2.5 text-sm font-semibold text-[#2b59b0] transition hover:bg-[#2b59b0]/15"
              >
                <Plus size={14} />
                {tt("walkIn")}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="flex w-max min-w-full items-center gap-2">
                {quickFilters.map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => onQuickFilterChange(chip.id)}
                    className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      quickFilter === chip.id ? uiTheme.quickRangeBtnActive : uiTheme.quickRangeBtn
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2 dark:border-slate-700/70">
              <span className={`text-xs sm:text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                {tt("foundCount", { count: sortedTickets.length.toLocaleString(locale) })}
              </span>
            </div>
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
          handleOpenCaseChat={handleOpenCaseChat}
          handleUpdateRepairStatus={handleUpdateRepairStatus}
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
