import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
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
    assetsManagement: "จัดการสินทรัพย์",
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
    assetsManagement: "Assets Management",
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
    assetsManagement: "자산 관리",
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
      className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <Icon size={16} />
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
  const showHubPill = showHub && backTo !== "/reports";
  const canSeeNotebookApprovals =
    canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.notebookApprovals) ||
    location.pathname === "/reports/executive/notebook-approvals";
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
        location.pathname === "/reports/executive",
    },
    {
      key: "notebook-approvals",
      to: "/reports/executive/notebook-approvals",
      label: tt("notebookApprovals"),
      icon: ClipboardCheck,
      badgeCount: notebookApprovalBadgeCount,
      visible:
        canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.notebookApprovals) ||
        location.pathname === "/reports/executive/notebook-approvals",
    },
    {
      key: "assets-overview",
      to: "/reports/executive/assets-overview",
      label: tt("assetsOverview"),
      icon: PackageSearch,
      visible:
        canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.executive) ||
        location.pathname === "/reports/executive/assets-overview",
    },
    {
      key: "assets-management",
      to: "/reports/executive/assets-management",
      label: tt("assetsManagement"),
      icon: ClipboardList,
      visible:
        ["it_support", "it_manager", "admin"].includes(currentRole) ||
        location.pathname === "/reports/executive/assets-management",
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
      <div className="app-safe-top relative z-20 mb-5 overflow-visible rounded-[2rem] border border-slate-200/80 bg-white/90 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {backTo ? (
              <Link
                to={backTo}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
                {backLabel || tt("backFallback")}
              </Link>
            ) : null}
            <Link
              to={homeRoute}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Home size={16} />
              {tt("dashboard")}
            </Link>
          </div>

          <div className="relative z-30 flex w-full flex-wrap items-center justify-between gap-2 sm:justify-end lg:w-auto">
            {currentUser?.name ? (
              <div
                className="inline-flex min-w-0 flex-1 max-w-[220px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 sm:flex-none"
                title={currentUser.name}
              >
                {isRenderableAvatar(currentUser?.avatar) ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-[#2b59b0] text-xs font-black text-white">
                    {getUserInitials(currentUser.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {currentUser.name}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <LanguageSwitcher mode="nav" />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label={isLoggingOut ? tt("signingOut") : tt("signOut")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{isLoggingOut ? tt("signingOut") : tt("signOut")}</span>
            </button>
          </div>
        </div>

        <div className="mt-3 border-t border-slate-200/80 pt-3">
          <nav className="app-horizontal-scroll items-center gap-2">
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
      </div>

      {messengerCurrentUser ? (
        <CentralChatDock
          currentUser={messengerCurrentUser}
          className={messengerClassName}
          launcherMode={messengerLauncherMode}
        />
      ) : null}
    </>
  );
}
