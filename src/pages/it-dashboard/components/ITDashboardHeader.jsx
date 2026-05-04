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
import { useI18n } from "../../../i18n/LanguageProvider";
import LanguageSwitcher from "../../../components/LanguageSwitcher.jsx";

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
  const { t } = useI18n();
  const uiTheme = getITDashboardTheme(theme);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const mobileProfileRef = useRef(null);
  const desktopProfileRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      const target = event.target;

      if (mobileProfileRef.current?.contains(target) || desktopProfileRef.current?.contains(target)) {
        return;
      }

      setProfileMenuOpen(false);
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
  const compactSurfaceClass = theme === "dark"
    ? "border-slate-700 bg-slate-900/90 shadow-sm shadow-slate-950/25"
    : "border-slate-200 bg-white/95 shadow-sm shadow-slate-200/80";
  const switcherRailClass = theme === "dark"
    ? "border-slate-700 bg-slate-900/85 shadow-sm shadow-slate-950/20"
    : "border-slate-200 bg-white/90 shadow-sm shadow-slate-200/70";
  const currentUserName = currentUser?.name || "IT";
  const currentUserAvatar =
    currentUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=2B59B0&color=fff`;
  const notificationBadge = notificationCount > 99 ? "99+" : notificationCount;
  const syncStatusText = syncAgoText || `${t("common.syncing")}...`;

  const handleNotificationClick = () => {
    setActiveTab("INCOMING");
    setNotificationCount(0);
  };

  const handleProfileMenuToggle = () => {
    setProfileMenuOpen((previous) => !previous);
  };

  const handleLogoutClick = () => {
    setProfileMenuOpen(false);
    onLogout();
  };

  const renderProfileMenu = () => (
    <div
      className={`absolute right-0 top-full z-[90] mt-2 w-[min(16rem,calc(100vw-1.5rem))] rounded-xl border p-2 shadow-lg sm:w-60 ${theme === "dark" ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}
    >
      <div className={`border-b px-2 py-2 ${menuDividerClass}`}>
        <p className={`truncate text-xs font-semibold ${profileHeadingTextClass}`}>
          {currentUserName}
        </p>
        <p className={`truncate text-[11px] ${profileSecondaryTextClass}`}>
          {currentUser?.department || t("common.itDepartment")}
        </p>
        <p className={`text-[11px] ${profileMetaTextClass}`}>
          {syncStatusText}
        </p>
      </div>

      <button
        onClick={handleLogoutClick}
        className={`mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-red-600 transition-colors ${menuHoverDangerClass}`}
      >
        <LogOut size={14} />
        {t("common.signOut")}
      </button>
    </div>
  );

  return (
    <header className={`sticky top-0 z-40 border-b ${uiTheme.headerShell}`}>
      <div className="app-safe-top mx-auto max-w-[1440px] px-3 sm:px-6">
        <div className="relative z-20 sm:hidden">
          <div className="flex items-center gap-2 py-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-colors ${compactSurfaceClass} ${uiTheme.iconButton}`}
              aria-label={t("common.toggleSidebar")}
            >
              <Menu size={17} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <p className={`min-w-0 flex-1 truncate text-[14px] font-black leading-none ${headingTextClass}`}>
                  {t("itDashboard.title")}
                </p>
                <span
                  className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${isOnline ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" : "bg-slate-400"}`}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <button
                onClick={handleNotificationClick}
                className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-colors ${compactSurfaceClass} ${uiTheme.iconButton}`}
                aria-label={t("common.notifications")}
              >
                <Bell size={16} />
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {notificationBadge}
                  </span>
                )}
              </button>

              <div className={`flex shrink-0 items-center gap-0.5 rounded-[1.15rem] border p-0.5 ${switcherRailClass}`}>
                <button
                  onClick={toggleTheme}
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${uiTheme.iconButton}`}
                  aria-label={t("common.toggleTheme")}
                >
                  {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <LanguageSwitcher mode="nav" isDarkTheme={theme === "dark"} className="shrink-0" />
              </div>

              <div className="relative z-[80] shrink-0" ref={mobileProfileRef}>
                <button
                  onClick={handleProfileMenuToggle}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border p-0.5 transition-colors ${compactSurfaceClass} ${uiTheme.iconButton}`}
                  aria-label={currentUserName}
                >
                  <img
                    src={currentUserAvatar}
                    alt={currentUserName}
                    className="h-8 w-8 rounded-xl object-cover"
                  />
                </button>

                {profileMenuOpen && (
                  <div className="sm:hidden">
                    {renderProfileMenu()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-20 hidden min-h-16 items-center justify-between gap-3 py-3 sm:flex">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`rounded-lg p-2 transition-colors lg:hidden ${uiTheme.iconButton}`}
              aria-label={t("common.toggleSidebar")}
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0">
              <p className={`truncate text-sm font-bold sm:text-base ${headingTextClass}`}>
                {t("itDashboard.title")}
              </p>
              <p className={`truncate text-xs ${secondaryTextClass}`}>
                {t("itDashboard.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`hidden items-center gap-2 rounded-lg border px-2 py-1 text-[11px] font-semibold lg:flex ${uiTheme.statusBadge}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`}
              />
              <RefreshCw size={12} />
              <span>{t("common.syncing")} {syncText || "--:--"}</span>
            </div>

            <button
              onClick={handleNotificationClick}
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl p-2 transition-colors ${uiTheme.iconButton}`}
              aria-label={t("common.notifications")}
            >
              <Bell size={17} />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {notificationBadge}
                </span>
              )}
            </button>

            <div className={`flex min-w-0 items-center justify-center gap-0.5 rounded-2xl border p-0.5 sm:gap-1 sm:p-1 ${switcherRailClass}`}>
              <button
                onClick={toggleTheme}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors sm:h-10 sm:w-10 ${uiTheme.iconButton}`}
                aria-label={t("common.toggleTheme")}
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <LanguageSwitcher mode="nav" isDarkTheme={theme === "dark"} />
            </div>

            <div className="relative z-[80] shrink-0" ref={desktopProfileRef}>
              <button
                onClick={handleProfileMenuToggle}
                className={`flex h-10 max-w-[9.75rem] items-center gap-1.5 rounded-xl border px-1.5 py-1.5 text-sm sm:max-w-none sm:gap-2 sm:rounded-lg sm:px-2 ${uiTheme.statusButton}`}
              >
                <img
                  src={currentUserAvatar}
                  alt={currentUserName}
                  className="h-7 w-7 rounded-lg object-cover sm:h-6 sm:w-6 sm:rounded-md"
                />
                <span className="hidden max-w-[140px] truncate text-xs font-semibold md:inline">
                  {currentUserName}
                </span>
                <ChevronDown size={14} className="hidden sm:block" />
              </button>

              {profileMenuOpen && (
                <div className="hidden sm:block">
                  {renderProfileMenu()}
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
