import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
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
  resolveHomeRoute,
} from "../../lib/roleAccess";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import CentralChatDock from "../CentralChatDock.jsx";
import LanguageSwitcher from "../LanguageSwitcher.jsx";

const REPORTS_TOPBAR_TRANSLATIONS = {
  th: {
    badge: "Report Navigation",
    subtitle: "สลับมุมมองรายงาน, เปลี่ยนภาษา, และกลับหน้าใช้งานหลักได้จากแถบเดียว",
    dashboard: "แดชบอร์ดหลัก",
    reportHub: "Reports Hub",
    itManager: "รายงาน IT Manager",
    executive: "ภาพรวมผู้บริหาร",
    assetsOverview: "Asset Overview",
    assetsManagement: "จัดการสินทรัพย์",
    signOut: "ออกจากระบบ",
    signingOut: "กำลังออกจากระบบ...",
    signedOut: "ออกจากระบบแล้ว",
    signOutError: "ไม่สามารถออกจากระบบได้",
    roleLabel: "บทบาท",
    backFallback: "ย้อนกลับ",
    role: {
      admin: "Admin",
      executive: "Executive",
      it_manager: "IT Manager",
      it_support: "IT Support",
      auditor: "Auditor",
      user: "User",
    },
  },
  en: {
    badge: "Report Navigation",
    subtitle: "Switch reports, change language, and return to the main workspace from one place.",
    dashboard: "Main Dashboard",
    reportHub: "Reports Hub",
    itManager: "IT Manager Report",
    executive: "Executive Overview",
    assetsOverview: "Assets Overview",
    assetsManagement: "Assets Management",
    signOut: "Sign out",
    signingOut: "Signing out...",
    signedOut: "Signed out",
    signOutError: "Unable to sign out",
    roleLabel: "Role",
    backFallback: "Back",
    role: {
      admin: "Admin",
      executive: "Executive",
      it_manager: "IT Manager",
      it_support: "IT Support",
      auditor: "Auditor",
      user: "User",
    },
  },
  ko: {
    badge: "리포트 내비게이션",
    subtitle: "하나의 바에서 보고서 전환, 언어 변경, 메인 화면 복귀를 처리합니다.",
    dashboard: "메인 대시보드",
    reportHub: "리포트 허브",
    itManager: "IT 매니저 리포트",
    executive: "임원 개요",
    assetsOverview: "자산 개요",
    assetsManagement: "자산 관리",
    signOut: "로그아웃",
    signingOut: "로그아웃 중...",
    signedOut: "로그아웃되었습니다",
    signOutError: "로그아웃할 수 없습니다",
    roleLabel: "권한",
    backFallback: "뒤로",
    role: {
      admin: "관리자",
      executive: "임원",
      it_manager: "IT 매니저",
      it_support: "IT 지원",
      auditor: "감사",
      user: "사용자",
    },
  },
};

function NavigationPill({ active, icon: Icon, label, to }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <Icon size={16} />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}

export default function ReportsTopbar({
  backTo,
  backLabel,
  showHub = true,
  currentUser: currentUserProp = null,
  messengerClassName = "bottom-4 right-4 sm:bottom-6 sm:right-6",
  messengerLauncherMode = "icon",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState(currentUserProp);
  const { tt } = useScopedI18n(REPORTS_TOPBAR_TRANSLATIONS);

  useEffect(() => {
    if (currentUserProp) {
      setCurrentUser(currentUserProp);
      return;
    }

    let isMounted = true;

    const loadCurrentUser = async () => {
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
        id: session.user.id,
        name: profile?.full_name || profile?.employee_code || session.user.email || "User",
        role: profile?.role || session.user.user_metadata?.role || "user",
        avatar: profile?.avatar_url || profile?.id_card_url || session.user.user_metadata?.avatar_url || "",
      });
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [currentUserProp]);

  const messengerCurrentUser = useMemo(() => currentUser, [currentUser]);
  const currentRole = String(currentUser?.role || "").trim().toLowerCase();
  const homeRoute = resolveHomeRoute(currentRole || "user");
  const roleLabel = tt(`role.${currentRole || "user"}`);

  const navItems = [
    showHub
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
  ].filter(Boolean).filter((item) => item.visible);

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
      <div className="relative z-20 mb-5 overflow-visible rounded-[2rem] border border-slate-200 bg-white/95 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur sm:p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
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

            <div className="mt-3 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {tt("badge")}
              </p>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                {tt("subtitle")}
              </p>
            </div>
          </div>

          <div className="relative z-30 flex flex-wrap items-center gap-2 xl:max-w-[46rem] xl:justify-end">
            {currentRole ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                <span className="text-slate-400">{tt("roleLabel")}</span>
                <span className="rounded-full bg-white px-2 py-1 text-slate-700">
                  {roleLabel}
                </span>
              </div>
            ) : null}

            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <LanguageSwitcher mode="nav" />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={16} />
              {isLoggingOut ? tt("signingOut") : tt("signOut")}
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex min-w-max items-center gap-2">
            {navItems.map((item) => (
              <NavigationPill
                key={item.key}
                active={isActiveRoute(item.to)}
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
