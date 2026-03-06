import React, { useEffect, useRef, useState } from "react";
import {
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  RefreshCw,
  Menu,
} from "lucide-react";
import { getITDashboardTheme } from "../theme/itDashboardTheme";
import tdkLogo from "../../../assets/4.png";

const ITDashboardHeader = ({
  theme,
  toggleTheme,
  sidebarOpen,
  setSidebarOpen,
  notificationCount,
  setNotificationCount,
  setActiveTab,
  currentUser,
  onLogout,
  syncText,
  syncAgoText,
  isOnline,
}) => {
  const uiTheme = getITDashboardTheme(theme);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const headingTextClass = theme === "dark" ? "text-slate-100" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-500";
  const profileHeadingTextClass = theme === "dark" ? "text-slate-100" : "text-slate-900";
  const profileSecondaryTextClass = theme === "dark" ? "text-slate-300" : "text-slate-600";
  const profileMetaTextClass = theme === "dark" ? "text-slate-500" : "text-slate-400";
  const menuDividerClass = theme === "dark" ? "border-slate-700" : "border-slate-200";
  const menuHoverDangerClass = theme === "dark" ? "hover:bg-red-900/20" : "hover:bg-red-50";

  return (
    <header className={`sticky top-0 z-40 border-b ${uiTheme.headerShell}`}>
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="relative z-20 flex h-16 items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`rounded-lg p-2 transition-colors lg:hidden ${uiTheme.iconButton}`}
              aria-label="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>

            {/* <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2b59b0]/20 bg-white p-1 shadow-sm">
              <img src={tdkLogo} alt="TDK Industrial logo" className="h-full w-full object-contain" />
            </div> */}

            <div className="min-w-0">
              <p className={`truncate text-sm font-bold sm:text-base ${headingTextClass}`}>
                IT Service Hub
              </p>
              <p className={`truncate text-xs ${secondaryTextClass}`}>Technician Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`hidden items-center gap-2 rounded-lg border px-2 py-1 text-[11px] font-semibold md:flex ${uiTheme.statusBadge}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`}
              />
              <RefreshCw size={12} />
              <span>Sync {syncText || "--:--"}</span>
            </div>

            <button
              onClick={() => {
                setActiveTab("INCOMING");
                setNotificationCount(0);
              }}
              className={`relative rounded-lg p-2 transition-colors ${uiTheme.iconButton}`}
              aria-label="Notifications"
            >
              <Bell size={17} />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {notificationCount}
                </span>
              )}
            </button>

            <button
              onClick={toggleTheme}
              className={`rounded-lg p-2 transition-colors ${uiTheme.iconButton}`}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <div className="relative z-[80]" ref={profileRef}>
              <button
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${uiTheme.statusButton}`}
              >
                <img
                  src={
                    currentUser?.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentUser?.name || "User"
                    )}&background=2B59B0&color=fff`
                  }
                  alt={currentUser?.name || "User"}
                  className="h-6 w-6 rounded-md object-cover"
                />
                <span className="hidden max-w-[140px] truncate text-xs font-semibold sm:inline">
                  {currentUser?.name || "IT"}
                </span>
                <ChevronDown size={14} />
              </button>

              {profileMenuOpen && (
                <div
                  className={`absolute right-0 top-full z-[90] mt-2 w-60 rounded-xl border p-2 shadow-lg ${theme === "dark" ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
                    }`}
                >
                  <div className={`border-b px-2 py-2 ${menuDividerClass}`}>
                    <p className={`truncate text-xs font-semibold ${profileHeadingTextClass}`}>
                      {currentUser?.name || "IT"}
                    </p>
                    <p className={`truncate text-[11px] ${profileSecondaryTextClass}`}>
                      {currentUser?.department || "IT Department"}
                    </p>
                    <p className={`text-[11px] ${profileMetaTextClass}`}>
                      {syncAgoText || "กำลังซิงก์"}
                    </p>
                  </div>

                  <button
                    onClick={onLogout}
                    className={`mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-red-600 transition-colors ${menuHoverDangerClass}`}
                  >
                    <LogOut size={14} />
                    ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ITDashboardHeader;
