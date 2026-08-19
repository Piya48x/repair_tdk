import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  PanelTop,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import {
  canAccessRoute,
  REPORT_ROUTE_PERMISSIONS,
  resolveWorkspaceRoute,
} from "../../lib/roleAccess";
import useNotebookApprovalRealtime from "../../hooks/useNotebookApprovalRealtime";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import CentralChatDock from "../CentralChatDock.jsx";
import LanguageSwitcher from "../LanguageSwitcher.jsx";

const REPORTS_TOPBAR_TRANSLATIONS = {
  th: {
    dashboard: "แดชบอร์ดหลัก",
    reportHub: "Reports Hub",
    itManager: "รายงาน IT Manager",
    executive: "Executive Overview",
    notebookApprovals: "อนุมัติยืม Notebook",
    assetsOverview: "Asset Overview",
    signOut: "ออกจากระบบ",
    signingOut: "กำลังออกจากระบบ...",
    signedOut: "ออกจากระบบแล้ว",
    signOutError: "ไม่สามารถออกจากระบบได้",
    backFallback: "ย้อนกลับ",
  },
  en: {
    dashboard: "Main Dashboard",
    reportHub: "Reports Hub",
    itManager: "IT Manager Report",
    executive: "Executive Overview",
    notebookApprovals: "Notebook Approvals",
    assetsOverview: "Assets Overview",
    signOut: "Sign out",
    signingOut: "Signing out...",
    signedOut: "Signed out",
    signOutError: "Unable to sign out",
    backFallback: "Back",
  },
  ko: {
    dashboard: "메인 대시보드",
    reportHub: "리포트 허브",
    itManager: "IT 매니저 리포트",
    executive: "임원 개요",
    notebookApprovals: "노트북 승인",
    assetsOverview: "자산 개요",
    signOut: "로그아웃",
    signingOut: "로그아웃 중...",
    signedOut: "로그아웃되었습니다",
    signOutError: "로그아웃할 수 없습니다",
    backFallback: "뒤로",
  },
};

function getUserInitials(name) {
  const normalized = String(name || "").trim();
  if (!normalized) return "U";
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return normalized.slice(0, 2).toUpperCase();
}

function isRenderableAvatar(src) {
  return /^(blob:|data:|https?:\/\/)/i.test(String(src || "").trim());
}

function NavigationPill({ active, badgeCount = 0, icon: Icon, label, to }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        active
          ? "bg-blue-700 text-white shadow-sm"
          : "text-slate-600 hover:bg-white hover:text-slate-950"
      }`}
    >
      <Icon size={16} aria-hidden="true" />
      <span className="whitespace-nowrap">{label}</span>
      {badgeCount > 0 ? (
        <span
          className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
            active
              ? "bg-white/20 text-white"
              : "bg-rose-500 text-white shadow-[0_10px_20px_-12px_rgba(244,63,94,0.8)]"
          }`}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

export default function ReportsTopbar({
  backTo,
  backLabel,
  showHub = true,
  currentUser: currentUserProp = null,
  notebookApprovalBadgeCount: notebookApprovalBadgeCountProp = null,
  messengerClassName = "bottom-4 left-4 sm:bottom-6 sm:left-6",
  messengerLauncherMode = "pill",
  messengerOpenSignal = 0,
  messengerOpenSignalTarget = "support",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState(currentUserProp);
  const { tt } = useScopedI18n(REPORTS_TOPBAR_TRANSLATIONS);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      const hasResolvedIdentity = Boolean(
        currentUserProp?.id && (currentUserProp?.name || currentUserProp?.role),
      );
      if (hasResolvedIdentity) {
        setCurrentUser(currentUserProp);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !isMounted) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      setCurrentUser({
        id: currentUserProp?.id || session.user.id,
        name:
          currentUserProp?.name ||
          profile?.full_name ||
          profile?.employee_code ||
          session.user.email ||
          "User",
        role: currentUserProp?.role || profile?.role || session.user.user_metadata?.role || "user",
        avatar:
          currentUserProp?.avatar ||
          profile?.avatar_url ||
          profile?.id_card_url ||
          session.user.user_metadata?.avatar_url ||
          "",
      });
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [currentUserProp]);

  const messengerCurrentUser = useMemo(() => currentUser, [currentUser]);
  const currentRole = String(currentUser?.role || "").trim().toLowerCase();
  const homeRoute = resolveWorkspaceRoute(currentRole || "user");
  const showHubPill = showHub;
  const showBackButton = Boolean(backTo && (!showHub || backTo !== "/reports"));
  const showHomeButton = !showBackButton || backTo !== homeRoute;
  const isExecutiveReportSurface = [
    "/reports/executive",
    "/reports/executive/notebook-approvals",
    "/reports/executive/assets-overview",
  ].includes(location.pathname);
  const canSeeNotebookApprovals =
    canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.notebookApprovals) ||
    isExecutiveReportSurface;
  const {
    pendingCount: fetchedNotebookApprovalBadgeCount,
  } = useNotebookApprovalRealtime({
    enabled: notebookApprovalBadgeCountProp == null && canSeeNotebookApprovals,
  });
  const notebookApprovalBadgeCount =
    notebookApprovalBadgeCountProp == null
      ? fetchedNotebookApprovalBadgeCount
      : notebookApprovalBadgeCountProp;

  const navItems = [
    showHubPill
      ? {
          key: "hub",
          to: "/reports",
          label: tt("reportHub"),
          icon: PanelTop,
          visible: true,
        }
      : null,
    {
      key: "it",
      to: "/reports/it",
      label: tt("itManager"),
      icon: BarChart3,
      visible:
        canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.it) ||
        location.pathname === "/reports/it",
    },
    {
      key: "executive",
      to: "/reports/executive",
      label: tt("executive"),
      icon: LayoutDashboard,
      visible:
        canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.executive) ||
        isExecutiveReportSurface,
    },
    {
      key: "notebook-approvals",
      to: "/reports/executive/notebook-approvals",
      label: tt("notebookApprovals"),
      icon: ClipboardCheck,
      badgeCount: notebookApprovalBadgeCount,
      visible:
        canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.notebookApprovals) ||
        isExecutiveReportSurface,
    },
    {
      key: "assets-overview",
      to: "/reports/executive/assets-overview",
      label: tt("assetsOverview"),
      icon: PackageSearch,
      visible:
        canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.executive) ||
        isExecutiveReportSurface,
    },
  ]
    .filter(Boolean)
    .filter((item) => item.visible);

  const isActiveRoute = (route) => {
    if (route === "/reports") return location.pathname === "/reports";
    if (route === "/reports/executive") return location.pathname === "/reports/executive";
    return location.pathname === route || location.pathname.startsWith(`${route}/`);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success(tt("signedOut"));
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error?.message || tt("signOutError"));
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header className="app-safe-top relative z-20 mb-5 rounded-2xl border border-slate-200 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {showBackButton ? (
              <Link
                to={backTo}
                title={backLabel || tt("backFallback")}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <ChevronLeft size={16} aria-hidden="true" />
                <span className="hidden sm:inline">{backLabel || tt("backFallback")}</span>
              </Link>
            ) : null}
            {showHomeButton ? (
              <Link
                to={homeRoute}
                title={tt("dashboard")}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Home size={16} aria-hidden="true" />
                <span className="hidden sm:inline">{tt("dashboard")}</span>
              </Link>
            ) : null}
          </div>

          <div className="relative z-30 flex min-w-0 items-center justify-end gap-2">
            {currentUser?.name ? (
              <div
                className="inline-flex h-10 min-w-0 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-1.5 sm:px-2.5"
                title={currentUser.name}
              >
                {isRenderableAvatar(currentUser?.avatar) ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="h-7 w-7 rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-[#2b59b0] text-[10px] font-black text-white">
                    {getUserInitials(currentUser.name)}
                  </div>
                )}
                <span className="hidden max-w-[150px] truncate text-sm font-semibold text-slate-700 md:block">
                  {currentUser.name}
                </span>
              </div>
            ) : null}

            <LanguageSwitcher mode="nav" />

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title={isLoggingOut ? tt("signingOut") : tt("signOut")}
              aria-label={isLoggingOut ? tt("signingOut") : tt("signOut")}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="hidden lg:inline">{isLoggingOut ? tt("signingOut") : tt("signOut")}</span>
            </button>
          </div>
        </div>

        {navItems.length > 0 ? (
          <div className="rounded-b-2xl border-t border-slate-200 bg-slate-50/80 px-2 py-2 sm:px-3">
            <nav aria-label={tt("reportHub")} className="app-horizontal-scroll items-center gap-1">
              {navItems.map((item) => (
                <NavigationPill
                  key={item.key}
                  active={isActiveRoute(item.to)}
                  badgeCount={item.badgeCount}
                  icon={item.icon}
                  label={item.label}
                  to={item.to}
                />
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      {messengerCurrentUser ? (
        <CentralChatDock
          currentUser={messengerCurrentUser}
          className={messengerClassName}
          launcherMode={messengerLauncherMode}
          openSignal={messengerOpenSignal}
          openSignalTarget={messengerOpenSignalTarget}
        />
      ) : null}
    </>
  );
}
