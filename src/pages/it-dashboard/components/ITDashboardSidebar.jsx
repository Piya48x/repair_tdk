import React from "react";
import {
  LayoutDashboard,
  Ticket,
  Activity,
  History,
  CalendarDays,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X as XIcon,
} from "lucide-react";
import { getITDashboardTheme } from "../theme/itDashboardTheme";
import tdkLogo from "../../../assets/2.png";

const ITDashboardSidebar = ({
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  theme,
  currentPage,
  onNavigatePage,
}) => {
  const uiTheme = getITDashboardTheme(theme);

  const navItems = [
    { id: "DASHBOARD", label: "แดชบอร์ด", icon: LayoutDashboard },
    { id: "TICKETS", label: "งานซ่อม", icon: Ticket },
    { id: "ACTIVE", label: "กำลังดำเนินการ", icon: Activity },
    { id: "HISTORY", label: "ประวัติ", icon: History },
    { id: "CALENDAR", label: "ปฏิทิน", icon: CalendarDays },
    { id: "REPORTS", label: "รายงาน", icon: BarChart3 },
    { id: "SETTINGS", label: "ตั้งค่า", icon: Settings },
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
                  <p className={`truncate text-[11px] ${uiTheme.sidebarVersion}`}>
                    บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className={`hidden lg:inline-flex rounded-lg p-2 transition-colors ${uiTheme.sidebarCloseButton}`}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className={`lg:hidden rounded-lg p-2 transition-colors ${uiTheme.sidebarCloseButton}`}
                aria-label="Close sidebar"
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
                    <Icon size={18} className="shrink-0" />
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
