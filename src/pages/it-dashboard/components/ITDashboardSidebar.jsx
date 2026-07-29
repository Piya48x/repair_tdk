import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Camera,
  ChevronDown,
  ClipboardCheck,
  HardDrive,
  History,
  KeyRound,
  Laptop,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Settings,
  Ticket,
  X as XIcon,
} from "lucide-react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import { DASHBOARD_PAGE_IDS } from "../constants/dashboardPages";
import tdkLogo from "../../../assets/2.png";

const SIDEBAR_TRANSLATIONS = {
  th: {
    companyName: "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด",
    workspace: "IT Service Center",
    sectionMain: "Workspace",
    sectionManage: "Management",
    expandSidebar: "ขยายเมนูด้านข้าง",
    collapseSidebar: "ย่อเมนูด้านข้าง",
    closeSidebar: "ปิดเมนูด้านข้าง",
    online: "Online",
    account: "Signed in",
    nav: {
      tickets: "งานซ่อม",
      serviceRequests: "คำขอเบิกของ",
      accessRequests: "ขอสิทธิ์ระบบ",
      notebookBorrow: "ยืม-คืนโน้ตบุ๊ก",
      workLogs: "บันทึกงาน IT",
      stockManagement: "จัดการ stock IT",
      stockWalkIn: "บันทึกการเบิกแบบ walk-in",
      stockReceive: "รับเข้า stock จากจัดซื้อ",
      stockHistory: "ประวัติการเบิกจาก stock",
      active: "กำลังดำเนินการ",
      history: "ประวัติ",
      executiveAssets: "จัดการอุปกรณ์",
      assetQrCenter: "สร้างและสแกน Asset QR",
      assetStockAudit: "ตรวจ Stock PC / Monitor",
      calendar: "ปฏิทิน",
      reports: "รายงาน",
      settings: "ตั้งค่า",
    },
  },
  en: {
    companyName: "TDK Industrial Co., Ltd.",
    workspace: "IT Service Center",
    sectionMain: "Workspace",
    sectionManage: "Management",
    expandSidebar: "Expand sidebar",
    collapseSidebar: "Collapse sidebar",
    closeSidebar: "Close sidebar",
    online: "Online",
    account: "Signed in",
    nav: {
      tickets: "Repair tickets",
      serviceRequests: "Service requests",
      accessRequests: "Access requests",
      notebookBorrow: "Notebook lending",
      workLogs: "IT work logs",
      stockManagement: "IT stock management",
      stockWalkIn: "Walk-in issue record",
      stockReceive: "Receive stock from purchase",
      stockHistory: "Stock issue history",
      active: "In progress",
      history: "History",
      executiveAssets: "Assets management",
      assetQrCenter: "Create & scan Asset QR",
      assetStockAudit: "PC / Monitor stock audit",
      calendar: "Calendar",
      reports: "Reports",
      settings: "Settings",
    },
  },
  ko: {
    companyName: "TDK Industrial Co., Ltd.",
    workspace: "IT Service Center",
    sectionMain: "Workspace",
    sectionManage: "Management",
    expandSidebar: "사이드바 펼치기",
    collapseSidebar: "사이드바 접기",
    closeSidebar: "사이드바 닫기",
    online: "온라인",
    account: "로그인됨",
    nav: {
      tickets: "수리 작업",
      serviceRequests: "서비스 요청",
      accessRequests: "권한 요청",
      notebookBorrow: "노트북 대여/반납",
      workLogs: "IT 작업 기록",
      stockManagement: "IT 재고 관리",
      stockWalkIn: "워크인 출고 기록",
      stockReceive: "구매 입고 등록",
      stockHistory: "재고 출고 이력",
      active: "진행 중",
      history: "이력",
      executiveAssets: "자산 관리",
      assetQrCenter: "Asset QR 생성 및 스캔",
      assetStockAudit: "PC / Monitor 재고 실사",
      calendar: "캘린더",
      reports: "보고서",
      settings: "설정",
    },
  },
};

const STOCK_SECTION_PAGE_IDS = [
  DASHBOARD_PAGE_IDS.STOCK_MANAGEMENT,
  DASHBOARD_PAGE_IDS.STOCK_WALK_IN,
  DASHBOARD_PAGE_IDS.STOCK_RECEIVE,
  DASHBOARD_PAGE_IDS.STOCK_HISTORY,
];

function NotificationBadge({ count, tone = "rose" }) {
  if (!count) return null;

  const toneClass = tone === "amber" ? "bg-amber-500" : tone === "violet" ? "bg-violet-500" : "bg-rose-500";

  return (
    <span className={`absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-full ${toneClass} px-1 py-0.5 text-[9px] font-black leading-none text-white shadow-sm ring-2 ring-white dark:ring-[#0f172a]`}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

function SidebarSection({ label, collapsed, children }) {
  return (
    <div className="space-y-1">
      {!collapsed ? (
        <p className="px-3 pt-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
      ) : null}
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function NavButton({
  item,
  active,
  collapsed,
  isDarkTheme = false,
  expandable = false,
  expanded = false,
  onClick,
  badge,
  badgeTone,
}) {
  const Icon = item.icon;
  const activeClass = active
    ? isDarkTheme
      ? "border-[#5f86d8]/45 bg-[#162136] text-[#dbe7ff]"
      : "border-[#9bbcff] bg-[#eef4ff] text-[#16448d]"
    : isDarkTheme
      ? "border-transparent text-slate-300 hover:bg-[#162136] hover:text-slate-100"
      : "border-transparent text-slate-700 hover:bg-[#f4f8ff] hover:text-[#16448d]";
  const iconClass = active
    ? isDarkTheme ? "text-[#9bbcff]" : "text-[#2b59b0]"
    : isDarkTheme ? "text-slate-400 group-hover:text-[#9bbcff]" : "text-slate-500 group-hover:text-[#2b59b0]";

  return (
    <button
      type="button"
      title={collapsed ? item.label : undefined}
      onClick={onClick}
      aria-expanded={expandable ? expanded : undefined}
      className={`group relative flex w-full items-center rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-all duration-200 ${collapsed ? "lg:justify-center lg:px-2.5" : ""} ${activeClass}`}
    >
      <span className={`relative inline-flex h-7 w-7 shrink-0 items-center justify-center transition-colors ${iconClass}`}>
        <Icon size={17} strokeWidth={2.25} />
        <NotificationBadge count={badge} tone={badgeTone} />
      </span>
      {!collapsed ? <span className="ml-2.5 min-w-0 flex-1 truncate">{item.label}</span> : null}
      {!collapsed && expandable ? (
        <ChevronDown
          size={15}
          className={`ml-2 shrink-0 text-slate-400 transition-transform duration-300 ${expanded ? "rotate-180 text-[#2b59b0]" : ""}`}
        />
      ) : null}
    </button>
  );
}

function SubMenu({ open, items, isActive, onSelect, isDarkTheme = false }) {
  return (
    <div className={`overflow-hidden pl-5 transition-all duration-300 ease-out ${open ? "mt-1 max-h-52 opacity-100" : "max-h-0 opacity-0"}`}>
      <ul className={`space-y-1 border-l pl-2.5 ${isDarkTheme ? "border-slate-700" : "border-[#d8e4f8]"}`}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm font-semibold transition-all duration-200 ${active ? isDarkTheme ? "bg-[#2b59b0] text-white" : "bg-[#2b59b0] text-white" : isDarkTheme ? "text-slate-400 hover:bg-[#162136] hover:text-[#9bbcff]" : "text-slate-600 hover:bg-[#f4f8ff] hover:text-[#2b59b0]"}`}
              >
                <Icon size={14} strokeWidth={2.25} className={active ? "text-white" : isDarkTheme ? "text-slate-500 group-hover:text-[#9bbcff]" : "text-slate-400 group-hover:text-[#2b59b0]"} />
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const ITDashboardSidebar = ({
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  theme = "light",
  currentPage,
  onNavigatePage,
  stockManagementSection = "issue",
  onNavigateStockSection,
  onOpenExecutiveAssets,
  notificationCount = 0,
  serviceRequestNotificationCount = 0,
  notebookNotificationCount = 0,
}) => {
  const { tt } = useScopedI18n(SIDEBAR_TRANSLATIONS);
  const isDarkTheme = theme === "dark";
  const sidebarShellClass = isDarkTheme
    ? "border-slate-800 bg-[#0f172a] text-slate-200 shadow-[18px_0_45px_rgba(2,6,23,0.5)] ring-slate-800/80"
    : "border-slate-200 bg-white text-slate-700 shadow-[18px_0_45px_rgba(15,23,42,0.13)] ring-slate-200/60";
  const headerClass = isDarkTheme ? "border-slate-800" : "border-slate-100";
  const logoClass = isDarkTheme
    ? "border-[#5f86d8]/25 bg-white p-1.5 shadow-sm shadow-slate-950/40 ring-4 ring-[#2b59b0]/15"
    : "border-[#2b59b0]/15 bg-white p-1.5 shadow-sm shadow-slate-200/70 ring-4 ring-[#2b59b0]/5";
  const titleClass = isDarkTheme ? "text-slate-100" : "text-slate-950";
  const subtitleClass = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const collapseButtonClass = isDarkTheme
    ? "border-slate-700 bg-[#111827] text-slate-300 shadow-sm hover:border-[#5f86d8]/50 hover:bg-[#162136] hover:text-[#dbe7ff]"
    : "border-slate-200 bg-white text-slate-500 shadow-sm hover:border-[#2b59b0]/30 hover:bg-[#eff4ff] hover:text-[#2b59b0]";
  const mobileCloseButtonClass = isDarkTheme
    ? "text-slate-400 hover:bg-[#162136] hover:text-slate-100"
    : "text-slate-400 hover:bg-slate-100 hover:text-slate-900";
  const navScrollbarClass = isDarkTheme
    ? "[scrollbar-width:thin] [scrollbar-color:#475569_transparent]"
    : "[scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]";
  const [repairMenuExpanded, setRepairMenuExpanded] = useState(
    currentPage === DASHBOARD_PAGE_IDS.ACTIVE || currentPage === DASHBOARD_PAGE_IDS.HISTORY,
  );
  const [stockMenuExpanded, setStockMenuExpanded] = useState(
    STOCK_SECTION_PAGE_IDS.includes(currentPage),
  );

  const repairSubItems = useMemo(() => [
    { id: DASHBOARD_PAGE_IDS.ACTIVE, label: tt("nav.active"), icon: Activity },
    { id: DASHBOARD_PAGE_IDS.HISTORY, label: tt("nav.history"), icon: History },
  ], [tt]);

  const stockSubItems = useMemo(() => [
    { id: "issue", pageId: DASHBOARD_PAGE_IDS.STOCK_WALK_IN, label: tt("nav.stockWalkIn"), icon: Activity },
    { id: "receive", pageId: DASHBOARD_PAGE_IDS.STOCK_RECEIVE, label: tt("nav.stockReceive"), icon: Package },
    { id: "history", pageId: DASHBOARD_PAGE_IDS.STOCK_HISTORY, label: tt("nav.stockHistory"), icon: History },
  ], [tt]);

  const primaryItems = useMemo(() => [
    { id: DASHBOARD_PAGE_IDS.TICKETS, label: tt("nav.tickets"), icon: Ticket, group: "repair", badge: notificationCount, badgeTone: "rose" },
    { id: DASHBOARD_PAGE_IDS.SERVICE_REQUESTS, label: tt("nav.serviceRequests"), icon: Package, badge: serviceRequestNotificationCount, badgeTone: "violet" },
    { id: DASHBOARD_PAGE_IDS.STOCK_MANAGEMENT, label: tt("nav.stockManagement"), icon: Package, group: "stock" },
    { id: DASHBOARD_PAGE_IDS.ACCESS_REQUESTS, label: tt("nav.accessRequests"), icon: KeyRound },
    { id: DASHBOARD_PAGE_IDS.NOTEBOOK_BORROW, label: tt("nav.notebookBorrow"), icon: Laptop, badge: notebookNotificationCount, badgeTone: "amber" },
    { id: DASHBOARD_PAGE_IDS.IT_WORK_LOGS, label: tt("nav.workLogs"), icon: Camera },
  ], [notebookNotificationCount, notificationCount, serviceRequestNotificationCount, tt]);

  const managementItems = useMemo(() => [
    { id: "EXECUTIVE_ASSETS", label: tt("nav.executiveAssets"), icon: HardDrive },
    { id: DASHBOARD_PAGE_IDS.ASSET_QR_CENTER, label: tt("nav.assetQrCenter"), icon: QrCode },
    { id: DASHBOARD_PAGE_IDS.ASSET_STOCK_AUDIT, label: tt("nav.assetStockAudit"), icon: ClipboardCheck },
    { id: DASHBOARD_PAGE_IDS.CALENDAR, label: tt("nav.calendar"), icon: CalendarDays },
    { id: DASHBOARD_PAGE_IDS.REPORTS, label: tt("nav.reports"), icon: BarChart3 },
    { id: DASHBOARD_PAGE_IDS.SETTINGS, label: tt("nav.settings"), icon: Settings },
  ], [tt]);

  useEffect(() => {
    if (currentPage === DASHBOARD_PAGE_IDS.ACTIVE || currentPage === DASHBOARD_PAGE_IDS.HISTORY) {
      setRepairMenuExpanded(true);
    }
    if (STOCK_SECTION_PAGE_IDS.includes(currentPage)) {
      setStockMenuExpanded(true);
    }
  }, [currentPage]);

  const isRepairActive = currentPage === DASHBOARD_PAGE_IDS.TICKETS ||
    currentPage === DASHBOARD_PAGE_IDS.ACTIVE ||
    currentPage === DASHBOARD_PAGE_IDS.HISTORY;
  const isStockActive = STOCK_SECTION_PAGE_IDS.includes(currentPage);

  const navigate = (pageId) => {
    if (pageId === "EXECUTIVE_ASSETS") {
      onOpenExecutiveAssets?.();
    } else {
      onNavigatePage?.(pageId);
    }
    setSidebarOpen(false);
  };

  const navigateStock = (sectionId = "issue", pageId) => {
    const targetPageId = pageId || stockSubItems.find((item) => item.id === sectionId)?.pageId || DASHBOARD_PAGE_IDS.STOCK_WALK_IN;
    if (onNavigateStockSection) {
      onNavigateStockSection(sectionId, targetPageId);
    } else {
      onNavigatePage?.(targetPageId);
    }
    setSidebarOpen(false);
  };

  const isItemActive = (item) => {
    if (item.group === "repair") return isRepairActive;
    if (item.group === "stock") return isStockActive;
    return currentPage === item.id;
  };

  const renderNavItem = (item) => {
    if (item.group === "repair" && !sidebarCollapsed) {
      return (
        <li key={item.id}>
          <NavButton
            item={item}
            active={isRepairActive}
            isDarkTheme={isDarkTheme}
            expandable
            expanded={repairMenuExpanded}
            badge={item.badge}
            badgeTone={item.badgeTone}
            onClick={() => {
              setRepairMenuExpanded((previous) => !previous);
              if (!isRepairActive) onNavigatePage?.(DASHBOARD_PAGE_IDS.TICKETS);
            }}
          />
          <SubMenu
            open={repairMenuExpanded}
            items={repairSubItems}
            isDarkTheme={isDarkTheme}
            isActive={(subItem) => currentPage === subItem.id}
            onSelect={(subItem) => navigate(subItem.id)}
          />
        </li>
      );
    }

    if (item.group === "stock" && !sidebarCollapsed) {
      return (
        <li key={item.id}>
          <NavButton
            item={item}
            active={isStockActive}
            isDarkTheme={isDarkTheme}
            expandable
            expanded={stockMenuExpanded}
            onClick={() => {
              setStockMenuExpanded((previous) => !previous);
              if (!isStockActive) navigateStock(stockManagementSection || "issue");
            }}
          />
          <SubMenu
            open={stockMenuExpanded}
            items={stockSubItems}
            isDarkTheme={isDarkTheme}
            isActive={(subItem) => currentPage === subItem.pageId || (currentPage === DASHBOARD_PAGE_IDS.STOCK_MANAGEMENT && stockManagementSection === subItem.id)}
            onSelect={(subItem) => navigateStock(subItem.id, subItem.pageId)}
          />
        </li>
      );
    }

    return (
      <li key={item.id}>
        <NavButton
          item={item}
          active={isItemActive(item)}
          collapsed={sidebarCollapsed}
          isDarkTheme={isDarkTheme}
          badge={item.badge}
          badgeTone={item.badgeTone}
          onClick={() => {
            if (item.group === "stock") {
              navigateStock(stockManagementSection || "issue");
              return;
            }
            navigate(item.id);
          }}
        />
      </li>
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label={tt("closeSidebar")}
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r ring-1 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${sidebarShellClass} ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "lg:w-20" : "lg:w-72"} lg:translate-x-0`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className={`relative shrink-0 border-b px-3 py-3 ${headerClass}`}>
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? "lg:justify-center" : "justify-between"}`}>
              <div className={`flex min-w-0 items-center gap-3 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${logoClass}`}>
                  <img src={tdkLogo} alt="TDK Industrial logo" className="h-full w-full object-contain" />
                </div>
                {!sidebarCollapsed ? (
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-black uppercase tracking-tight ${titleClass}`}>TDK Industrial</p>
                    <p className={`truncate text-[10px] font-semibold ${subtitleClass}`}>{tt("companyName")}</p>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((previous) => !previous)}
                  className={`hidden items-center justify-center rounded-xl border p-2 transition lg:inline-flex ${collapseButtonClass} ${sidebarCollapsed ? "absolute -right-3 top-5 z-10" : ""}`}
                  aria-label={sidebarCollapsed ? tt("expandSidebar") : tt("collapseSidebar")}
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className={`rounded-xl p-2 transition lg:hidden ${mobileCloseButtonClass}`}
                  aria-label={tt("closeSidebar")}
                >
                  <XIcon size={17} />
                </button>
              </div>
            </div>
          </header>

          <nav className={`min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-2.5 ${navScrollbarClass}`}>
            <SidebarSection label={tt("sectionMain")} collapsed={sidebarCollapsed}>
              {primaryItems.map(renderNavItem)}
            </SidebarSection>
            <SidebarSection label={tt("sectionManage")} collapsed={sidebarCollapsed}>
              {managementItems.map(renderNavItem)}
            </SidebarSection>
          </nav>

        </div>
      </aside>
    </>
  );
};

export default ITDashboardSidebar;
