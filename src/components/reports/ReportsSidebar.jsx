import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  CarFront,
  ClipboardCheck,
  Gauge,
  HardDrive,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  X,
} from "lucide-react";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import CentralChatDock from "../CentralChatDock.jsx";
import {
  canAccessRoute,
  REPORT_ROUTE_PERMISSIONS,
} from "../../lib/roleAccess";
import { supabase } from "../../lib/supabaseClient";
import tdkLogo from "../../assets/2.png";
import { useReportsLayout } from "./ReportsLayoutContext";

const COPY = {
  th: {
    companyName: "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด",
    workspace: "Management Reports",
    sectionWorkspace: "Workspace",
    sectionReports: "Reports",
    expand: "ขยายเมนูด้านข้าง",
    collapse: "ย่อเมนูด้านข้าง",
    close: "ปิดเมนูด้านข้าง",
    nav: {
      workspace: "หน้าหลักของฉัน",
      reportHub: "งาน IT ทั้งหมด",
      gatepass: "Gatepass Report",
      assetOverview: "สถานะทรัพย์สิน",
      executive: "Executive Command Center",
      itManager: "รายงานการปฏิบัติงาน IT",
      notebook: "อนุมัติยืม Notebook",
    },
  },
  en: {
    companyName: "TDK Industrial Co., Ltd.",
    workspace: "Management Reports",
    sectionWorkspace: "Workspace",
    sectionReports: "Reports",
    expand: "Expand sidebar",
    collapse: "Collapse sidebar",
    close: "Close sidebar",
    nav: {
      workspace: "My workspace",
      reportHub: "All IT Work",
      gatepass: "Gatepass Report",
      assetOverview: "Asset Status & Readiness",
      executive: "Executive Command Center",
      itManager: "IT Operations Report",
      notebook: "Notebook Approvals",
    },
  },
  ko: {
    companyName: "TDK Industrial Co., Ltd.",
    workspace: "Management Reports",
    sectionWorkspace: "Workspace",
    sectionReports: "Reports",
    expand: "사이드바 펼치기",
    collapse: "사이드바 접기",
    close: "사이드바 닫기",
    nav: {
      workspace: "내 작업 공간",
      reportHub: "전체 IT 업무",
      gatepass: "Gatepass Report",
      assetOverview: "자산 상태 및 준비도",
      executive: "Executive Command Center",
      itManager: "IT 운영 보고서",
      notebook: "노트북 승인",
    },
  },
};

function SidebarSection({ label, collapsed, children }) {
  return (
    <section className="space-y-1">
      <p className={`px-3 pt-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 ${collapsed ? "lg:hidden" : ""}`}>
        {label}
      </p>
      <ul className="space-y-1">{children}</ul>
    </section>
  );
}

function SidebarLink({ item, active, collapsed, onNavigate }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        to={item.to}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={`group relative flex min-h-11 w-full items-center rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-200 ${collapsed ? "lg:justify-center lg:px-2.5" : ""} ${active ? "border-[#9bbcff] bg-[#eef4ff] text-[#16448d] shadow-sm shadow-blue-100/60" : "border-transparent text-slate-700 hover:bg-[#f4f8ff] hover:text-[#16448d]"}`}
      >
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center ${active ? "text-[#2b59b0]" : "text-slate-500 group-hover:text-[#2b59b0]"}`}>
          <Icon size={17} strokeWidth={2.15} />
        </span>
        <span className={`ml-2.5 min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>{item.label}</span>
        {active ? <span className={`h-1.5 w-1.5 shrink-0 rounded-full bg-[#2b59b0] ${collapsed ? "lg:hidden" : ""}`} /> : null}
      </Link>
    </li>
  );
}

export default function ReportsSidebar({
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
}) {
  const location = useLocation();
  const { tt } = useScopedI18n(COPY);
  const { chatOpenSignal, chatOpenSignalTarget, reportIdentity } = useReportsLayout();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !mounted) return;
      const profileResponse = await supabase
        .from("profiles")
        .select("full_name, employee_code, role, avatar_url, id_card_url")
        .eq("id", session.user.id)
        .maybeSingle();
      // The sidebar must still receive the role even when an optional profile
      // image column has not been deployed in an older database.
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
        id: session.user.id,
        name: profile?.full_name || profile?.employee_code || session.user.email || "User",
        role: profile?.role || session.user.user_metadata?.role || "user",
        avatar: profile?.avatar_url || profile?.id_card_url || session.user.user_metadata?.avatar_url || "",
      });
    };
    void loadUser();
    return () => { mounted = false; };
  }, []);

  const activeUser = reportIdentity?.id ? reportIdentity : currentUser;
  const currentRole = String(activeUser?.role || "").trim().toLowerCase();
  const workspaceItems = useMemo(() => [
    { key: "hub", label: tt("nav.reportHub"), to: "/reports", icon: Gauge, visible: canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.index) || location.pathname === "/reports" },
  ].filter((item) => item.visible), [currentRole, location.pathname, tt]);

  const reportItems = useMemo(() => [
    { key: "gatepass", label: tt("nav.gatepass"), to: "/reports/gatepass", icon: CarFront, visible: canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.gatepass) || location.pathname === "/reports/gatepass" },
    { key: "assets", label: tt("nav.assetOverview"), to: "/reports/executive/assets-overview", icon: HardDrive, visible: canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.executive) || location.pathname === "/reports/executive/assets-overview" },
    { key: "executive", label: tt("nav.executive"), to: "/reports/executive", icon: LayoutDashboard, visible: canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.executive) || location.pathname === "/reports/executive" },
    { key: "it", label: tt("nav.itManager"), to: "/reports/it", icon: BarChart3, visible: canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.it) || location.pathname === "/reports/it" },
    { key: "notebook", label: tt("nav.notebook"), to: "/reports/executive/notebook-approvals", icon: ClipboardCheck, visible: canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.notebookApprovals) || location.pathname === "/reports/executive/notebook-approvals" },
  ].filter((item) => item.visible), [currentRole, location.pathname, tt]);

  const isActive = (item) => {
    if (item.to === "/reports") return location.pathname === "/reports";
    if (item.to === "/reports/executive") return location.pathname === "/reports/executive";
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  return (
    <>
      <button
        type="button"
        aria-label={tt("close")}
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-200 bg-white text-slate-700 shadow-[18px_0_45px_rgba(15,23,42,0.13)] ring-1 ring-slate-200/60 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "lg:w-20" : "lg:w-72"} lg:translate-x-0`}>
        <div className="flex h-full min-h-0 flex-col">
          <header className="relative shrink-0 border-b border-slate-100 px-3 py-3">
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? "lg:justify-center" : "justify-between"}`}>
              <div className={`flex min-w-0 items-center gap-3 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#2b59b0]/15 bg-white p-1.5 shadow-sm shadow-slate-200/70 ring-4 ring-[#2b59b0]/5">
                  <img src={tdkLogo} alt="TDK Industrial logo" className="h-full w-full object-contain" />
                </div>
                <div className={`min-w-0 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                  <p className="truncate text-sm font-black uppercase tracking-tight text-slate-950">TDK Industrial</p>
                  <p className="truncate text-[10px] font-semibold text-slate-500">{tt("companyName")}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((value) => !value)}
                  className={`hidden items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-[#2b59b0]/30 hover:bg-[#eff4ff] hover:text-[#2b59b0] lg:inline-flex ${sidebarCollapsed ? "absolute -right-3 top-5 z-10" : ""}`}
                  aria-label={sidebarCollapsed ? tt("expand") : tt("collapse")}
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
                </button>
                <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden" aria-label={tt("close")}>
                  <X size={17} />
                </button>
              </div>
            </div>
          </header>

          <div className={`border-b border-slate-100 px-4 py-3 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#2b59b0]">
              <ShieldCheck size={13} />{tt("workspace")}
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-2.5 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
            <SidebarSection label={tt("sectionWorkspace")} collapsed={sidebarCollapsed}>
              {workspaceItems.map((item) => <SidebarLink key={item.key} item={item} active={isActive(item)} collapsed={sidebarCollapsed} onNavigate={() => setSidebarOpen(false)} />)}
            </SidebarSection>
            <SidebarSection label={tt("sectionReports")} collapsed={sidebarCollapsed}>
              {reportItems.map((item) => <SidebarLink key={item.key} item={item} active={isActive(item)} collapsed={sidebarCollapsed} onNavigate={() => setSidebarOpen(false)} />)}
            </SidebarSection>
          </nav>

          <footer className={`shrink-0 border-t border-slate-100 p-3 ${sidebarCollapsed ? "lg:px-2" : ""}`}>
            <CentralChatDock
              currentUser={activeUser}
              openSignal={chatOpenSignal}
              openSignalTarget={chatOpenSignalTarget}
              embeddedLauncher
              launcherMode={sidebarCollapsed ? "icon" : "sidebar"}
              className={`bottom-4 left-4 sm:left-6 ${sidebarCollapsed ? "lg:left-24" : "lg:left-[19rem]"}`}
            />
          </footer>
        </div>
      </aside>
    </>
  );
}
