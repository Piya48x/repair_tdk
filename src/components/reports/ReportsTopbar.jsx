import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BriefcaseBusiness, ChevronLeft, ExternalLink, LogOut, Menu, Wrench } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import LanguageSwitcher from "../LanguageSwitcher.jsx";
import { useReportsLayout } from "./ReportsLayoutContext";

const COPY = {
  th: {
    reports: "Management Reports",
    repairRequest: "แจ้งซ่อม",
    groupware: "Groupware",
    eBusinessPlus: "E-Business Plus",
    openMenu: "เปิดเมนูด้านข้าง",
    back: "ย้อนกลับ",
    signOut: "ออกจากระบบ",
    signingOut: "กำลังออกจากระบบ...",
    signedOut: "ออกจากระบบแล้ว",
    signOutError: "ไม่สามารถออกจากระบบได้",
    pages: {
      hub: "งาน IT ทั้งหมด",
      gatepass: "Gatepass Report",
      executive: "Executive IT Command Center",
      assets: "สถานะและความพร้อมของทรัพย์สิน",
      notebook: "อนุมัติยืม Notebook",
      it: "รายงานการปฏิบัติงาน IT",
    },
  },
  en: {
    reports: "Management Reports",
    repairRequest: "Repair Request",
    groupware: "Groupware",
    eBusinessPlus: "E-Business Plus",
    openMenu: "Open sidebar",
    back: "Back",
    signOut: "Sign out",
    signingOut: "Signing out...",
    signedOut: "Signed out",
    signOutError: "Unable to sign out",
    pages: {
      hub: "All IT Work",
      gatepass: "Gatepass Report",
      executive: "Executive IT Command Center",
      assets: "Asset Status & Readiness",
      notebook: "Notebook Approvals",
      it: "IT Operations Report",
    },
  },
  ko: {
    reports: "Management Reports",
    repairRequest: "수리 요청",
    groupware: "Groupware",
    eBusinessPlus: "E-Business Plus",
    openMenu: "사이드바 열기",
    back: "뒤로",
    signOut: "로그아웃",
    signingOut: "로그아웃 중...",
    signedOut: "로그아웃되었습니다",
    signOutError: "로그아웃할 수 없습니다",
    pages: {
      hub: "전체 IT 업무",
      gatepass: "Gatepass Report",
      executive: "Executive IT Command Center",
      assets: "자산 상태 및 준비도",
      notebook: "노트북 승인",
      it: "IT 운영 보고서",
    },
  },
};

function isRenderableAvatar(value) {
  return /^(blob:|data:|https?:\/\/)/i.test(String(value || "").trim());
}

function buildAvatarFallback(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || "U"))}&background=2b59b0&color=fff&size=96`;
}

export default function ReportsTopbar({
  backTo,
  backLabel,
  showHub = true,
  currentUser: currentUserProp = null,
  messengerOpenSignal = 0,
  messengerOpenSignalTarget = "support",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasSidebar, openSidebar, requestChatOpen, reportIdentity, setReportIdentity } = useReportsLayout();
  const { tt } = useScopedI18n(COPY);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState(currentUserProp || reportIdentity);

  useEffect(() => {
    let mounted = true;
    const loadCurrentUser = async () => {
      if (currentUserProp?.id && currentUserProp?.role && currentUserProp.role !== "user") {
        setCurrentUser(currentUserProp);
        return;
      }
      if (reportIdentity?.id) {
        setCurrentUser(reportIdentity);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !mounted) return;
      const profileResponse = await supabase
        .from("profiles")
        .select("full_name, employee_code, role, avatar_url, id_card_url")
        .eq("id", session.user.id)
        .maybeSingle();
      // Role is required for report navigation. Retry with the guaranteed
      // column set if this environment does not have an optional avatar field.
      let profile = profileResponse.data;
      if (profileResponse.error) {
        const { data: roleProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        profile = roleProfile;
      }
      if (!mounted) return;
      setCurrentUser({
        id: currentUserProp?.id || session.user.id,
        name: currentUserProp?.name || profile?.full_name || profile?.employee_code || session.user.email || "User",
        role: currentUserProp?.role || profile?.role || session.user.user_metadata?.role || "user",
        avatar: currentUserProp?.avatar || profile?.avatar_url || profile?.id_card_url || session.user.user_metadata?.avatar_url || "",
      });
    };
    void loadCurrentUser();
    return () => { mounted = false; };
  }, [currentUserProp, reportIdentity]);

  useEffect(() => {
    if (currentUser?.id && !reportIdentity?.id) setReportIdentity(currentUser);
  }, [currentUser, reportIdentity?.id, setReportIdentity]);

  const pageTitle = useMemo(() => {
    if (location.pathname === "/reports/gatepass") return tt("pages.gatepass");
    if (location.pathname === "/reports/executive/assets-overview") return tt("pages.assets");
    if (location.pathname === "/reports/executive/notebook-approvals") return tt("pages.notebook");
    if (location.pathname === "/reports/executive") return tt("pages.executive");
    if (location.pathname === "/reports/it") return tt("pages.it");
    return tt("pages.hub");
  }, [location.pathname, tt]);

  const showBackButton = Boolean(backTo && (!showHub || backTo !== "/reports"));

  useEffect(() => {
    if (messengerOpenSignal > 0) requestChatOpen(messengerOpenSignalTarget);
  }, [messengerOpenSignal, messengerOpenSignalTarget, requestChatOpen]);

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
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 px-3 py-3 sm:flex-nowrap sm:gap-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {hasSidebar ? (
              <button
                type="button"
                onClick={openSidebar}
                aria-label={tt("openMenu")}
                title={tt("openMenu")}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 lg:hidden"
              >
                <Menu size={18} />
              </button>
            ) : null}
            {showBackButton ? (
              <Link
                to={backTo}
                title={backLabel || tt("back")}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">{backLabel || tt("back")}</span>
              </Link>
            ) : null}
            <div className="min-w-0 pl-1">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">{tt("reports")}</p>
              <p className="truncate text-sm font-bold text-slate-800 sm:text-base">{pageTitle}</p>
            </div>
          </div>

          <div className="relative z-30 flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto">
            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                to="/dashboard"
                title={tt("repairRequest")}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-2.5 text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 sm:px-3"
              >
                <Wrench size={16} />
                <span className="hidden xl:inline">{tt("repairRequest")}</span>
              </Link>
              <a
                href="http://gw2.e-dk.co.kr/LoginInfo/"
                target="_blank"
                rel="noopener noreferrer"
                title={tt("groupware")}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:px-3"
              >
                <BriefcaseBusiness size={16} />
                <span className="hidden 2xl:inline">{tt("groupware")}</span>
                <ExternalLink size={12} className="hidden 2xl:block" />
              </a>
              <a
                href="http://hr.tdk.co.th/TDK/Login.aspx"
                target="_blank"
                rel="noopener noreferrer"
                title={tt("eBusinessPlus")}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:px-3"
              >
                <ExternalLink size={16} />
                <span className="hidden 2xl:inline">{tt("eBusinessPlus")}</span>
              </a>
            </div>
            {currentUser?.name ? (
              <div className="inline-flex h-10 min-w-0 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-1.5 sm:px-2.5" title={currentUser.name}>
                {isRenderableAvatar(currentUser?.avatar) ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    onError={(event) => { event.currentTarget.src = buildAvatarFallback(currentUser.name); }}
                    className="h-7 w-7 rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <img src={buildAvatarFallback(currentUser.name)} alt={currentUser.name} className="h-7 w-7 rounded-lg border border-slate-200 object-cover" />
                )}
                <span className="hidden max-w-[150px] truncate text-sm font-semibold text-slate-700 md:block">{currentUser.name}</span>
              </div>
            ) : null}
            <LanguageSwitcher mode="nav" />
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title={isLoggingOut ? tt("signingOut") : tt("signOut")}
              aria-label={isLoggingOut ? tt("signingOut") : tt("signOut")}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={16} />
              <span className="hidden xl:inline">{isLoggingOut ? tt("signingOut") : tt("signOut")}</span>
            </button>
          </div>
        </div>
      </header>

    </>
  );
}
