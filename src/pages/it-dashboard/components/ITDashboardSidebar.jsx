import React from "react";
import {
  Package,
  Ticket,
  Activity,
  History,
  CalendarDays,
  Camera,
  KeyRound,
  Laptop,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X as XIcon,
} from "lucide-react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import { getITDashboardTheme } from "../theme/itDashboardTheme";
import tdkLogo from "../../../assets/2.png";

const SIDEBAR_TRANSLATIONS = {
  th: {
    companyName: "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด",
    expandSidebar: "ขยายเมนูด้านข้าง",
    collapseSidebar: "ย่อเมนูด้านข้าง",
    closeSidebar: "ปิดเมนูด้านข้าง",
    nav: {
      dashboard: "แดชบอร์ด",
      tickets: "งานซ่อม",
      accessRequests: "ขอสิทธิ์ระบบ",
      notebookBorrow: "ยืม-คืนโน้ตบุ๊ก",
      workLogs: "บันทึกงาน IT",
      active: "กำลังดำเนินการ",
      history: "ประวัติ",
      calendar: "ปฏิทิน",
      reports: "รายงาน",
      settings: "ตั้งค่า",
    },
  },
  en: {
    companyName: "TDK Industrial Co., Ltd.",
    expandSidebar: "Expand sidebar",
    collapseSidebar: "Collapse sidebar",
    closeSidebar: "Close sidebar",
    nav: {
      dashboard: "Dashboard",
      tickets: "Repair tickets",
      accessRequests: "Access requests",
      notebookBorrow: "Notebook lending",
      workLogs: "IT work logs",
      active: "In progress",
      history: "History",
      calendar: "Calendar",
      reports: "Reports",
      settings: "Settings",
    },
  },
  ko: {
    companyName: "TDK Industrial Co., Ltd.",
    expandSidebar: "사이드바 펼치기",
    collapseSidebar: "사이드바 접기",
    closeSidebar: "사이드바 닫기",
    nav: {
      dashboard: "대시보드",
      tickets: "수리 작업",
      accessRequests: "권한 요청",
      notebookBorrow: "노트북 대여/반납",
      workLogs: "IT 작업 기록",
      active: "진행 중",
      history: "이력",
      calendar: "캘린더",
      reports: "보고서",
      settings: "설정",
    },
  },
};

const ITDashboardSidebar = ({
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  theme,
  currentPage,
  onNavigatePage,
  notificationCount = 0,
  serviceRequestNotificationCount = 0,
  notebookNotificationCount = 0,
}) => {
  const { tt } = useScopedI18n(SIDEBAR_TRANSLATIONS);
  const uiTheme = getITDashboardTheme(theme);

  const navItems = [
    { id: "TICKETS", label: tt("nav.tickets"), icon: Ticket },
    { id: "SERVICE_REQUESTS", label: "คำขอเบิกของ", icon: Package },
    { id: "ACCESS_REQUESTS", label: tt("nav.accessRequests"), icon: KeyRound },
    { id: "NOTEBOOK_BORROW", label: tt("nav.notebookBorrow"), icon: Laptop },
    { id: "IT_WORK_LOGS", label: tt("nav.workLogs"), icon: Camera },
    { id: "ACTIVE", label: tt("nav.active"), icon: Activity },
    { id: "HISTORY", label: tt("nav.history"), icon: History },
    { id: "CALENDAR", label: tt("nav.calendar"), icon: CalendarDays },
    { id: "REPORTS", label: tt("nav.reports"), icon: BarChart3 },
    { id: "SETTINGS", label: tt("nav.settings"), icon: Settings },
  ];

  const resolveActive = (itemId) => itemId === currentPage;

  const onNavigate = (itemId) => {
    onNavigatePage?.(itemId);
    setSidebarOpen(false);
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-200 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } ${sidebarCollapsed ? "lg:w-20" : "lg:w-72"} w-72 lg:translate-x-0 ${uiTheme.sidebarShell}`}
    >
      <div className="flex h-full flex-col">
        <div className={`border-b px-3 py-3 ${uiTheme.sidebarSectionBorder}`}>
          <div className="flex items-center justify-between gap-2">
            <div
              className={`flex items-center gap-2 ${sidebarCollapsed ? "lg:justify-center lg:w-full" : ""}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2b59b0]/20 bg-white p-1 shadow-sm">
                <img src={tdkLogo} alt="TDK Industrial logo" className="h-full w-full object-contain" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className={`truncate text-sm font-black ${uiTheme.sidebarHeading}`}>TDK INDUSTRIAL</p>
                  <p className={`truncate text-[11px] ${uiTheme.sidebarVersion}`}>{tt("companyName")}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className={`hidden lg:inline-flex rounded-lg p-2 transition-colors ${uiTheme.sidebarCloseButton}`}
                aria-label={sidebarCollapsed ? tt("expandSidebar") : tt("collapseSidebar")}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className={`lg:hidden rounded-lg p-2 transition-colors ${uiTheme.sidebarCloseButton}`}
                aria-label={tt("closeSidebar")}
              >
                <XIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = resolveActive(item.id);
              const showTicketBadge = item.id === "TICKETS" && notificationCount > 0;
              const showServiceRequestBadge = item.id === "SERVICE_REQUESTS" && serviceRequestNotificationCount > 0;
              const showNotebookBadge = item.id === "NOTEBOOK_BORROW" && notebookNotificationCount > 0;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`group flex w-full items-center rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200 ${
                      sidebarCollapsed ? "lg:justify-center lg:px-2" : ""
                    } ${
                      isActive
                        ? uiTheme.sidebarNavActive
                        : `border-transparent ${uiTheme.sidebarNavIdle}`
                    } hover:-translate-y-[1px]`}
                  >
                    <span className="relative shrink-0">
                      <Icon size={18} />
                      {showTicketBadge && (
                        <span className="absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 py-0.5 text-[9px] font-black leading-none text-white shadow">
                          {notificationCount > 9 ? "9+" : notificationCount}
                        </span>
                      )}
                      {showServiceRequestBadge && (
                        <span className="absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 py-0.5 text-[9px] font-black leading-none text-white shadow">
                          {serviceRequestNotificationCount > 9 ? "9+" : serviceRequestNotificationCount}
                        </span>
                      )}
                      {showNotebookBadge && (
                        <span className="absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 py-0.5 text-[9px] font-black leading-none text-white shadow">
                          {notebookNotificationCount > 9 ? "9+" : notebookNotificationCount}
                        </span>
                      )}
                    </span>
                    {!sidebarCollapsed && <span className="ml-3 truncate">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default ITDashboardSidebar;
