import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CarFront,
  ChevronDown,
  ChevronRight,
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
      gatepassOverview: "Executive Overview",
      gatepassOverviewHint: "ภาพรวมสำหรับ MD",
      gatepassDaily: "รถเข้า–ออกรายวัน",
      gatepassDailyHint: "การผ่านประตูและปริมาณ Gatepass",
      gatepassRegistry: "ทะเบียนรถหลัก TDK APPROVED",
      gatepassRegistryHint: "สถานะรถหลักและการเปลี่ยนแปลงรายเดือน",
      gatepassCompanies: "Company Summary",
      gatepassCompaniesHint: "รถลงทะเบียนแยกตามบริษัท",
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
      gatepassOverview: "Executive Overview",
      gatepassOverviewHint: "At-a-glance MD dashboard",
      gatepassDaily: "Daily vehicle In-Out",
      gatepassDailyHint: "Gate activity and Gatepass volume",
      gatepassRegistry: "TDK APPROVED master registry",
      gatepassRegistryHint: "Current fleet and monthly changes",
      gatepassCompanies: "Company Summary",
      gatepassCompaniesHint: "Registered fleet by company",
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
      gatepassOverview: "Executive Overview",
      gatepassOverviewHint: "MD 요약 대시보드",
      gatepassDaily: "일일 차량 입출차",
      gatepassDailyHint: "출입 및 Gatepass 현황",
      gatepassRegistry: "TDK APPROVED 차량 원장",
      gatepassRegistryHint: "현재 차량 및 월별 변경",
      gatepassCompanies: "Company Summary",
      gatepassCompaniesHint: "회사별 등록 차량",
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

function SidebarCollapsibleMenu({
  label,
  icon: Icon,
  items,
  active,
  expanded,
  collapsed,
  onToggle,
  onNavigate,
}) {
  return (
    <li>
      <button
        type="button"
        title={collapsed ? label : undefined}
        aria-expanded={expanded}
        onClick={onToggle}
        className={`group relative flex min-h-11 w-full items-center rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-all duration-200 ${collapsed ? "lg:justify-center lg:px-2.5" : ""} ${active ? "border-[#9bbcff] bg-[#eef4ff] text-[#16448d] shadow-sm shadow-blue-100/60" : "border-transparent text-slate-700 hover:bg-[#f4f8ff] hover:text-[#16448d]"}`}
      >
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center ${active ? "text-[#2b59b0]" : "text-slate-500 group-hover:text-[#2b59b0]"}`}>
          <Icon size={17} strokeWidth={2.15} />
        </span>
        <span className={`ml-2.5 min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>{label}</span>
        <span className={collapsed ? "lg:hidden" : ""}>{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
      </button>
      {expanded ? (
        <ul className={`ml-4 mt-1 space-y-1 border-l border-blue-100 pl-3 ${collapsed ? "lg:hidden" : ""}`}>
          {items.map((item) => (
            <li key={item.key}>
              <Link
                to={item.to}
                aria-current={item.active ? "page" : undefined}
                onClick={onNavigate}
                className={`group flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2 transition ${item.active ? "border-blue-200 bg-blue-50 text-blue-900" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-blue-800"}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.active ? "bg-white text-[#2b59b0] shadow-sm" : "bg-slate-100 text-slate-500 group-hover:text-[#2b59b0]"}`}><item.icon size={15} /></span>
                <span className="min-w-0">
                  <strong className="block truncate text-xs font-bold">{item.label}</strong>
                  <small className="mt-0.5 block truncate text-[9px] font-medium text-slate-400">{item.description}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
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
  const gatepassActive = location.pathname.startsWith("/reports/gatepass");
  const [gatepassExpanded, setGatepassExpanded] = useState(gatepassActive);

  useEffect(() => {
    if (gatepassActive) setGatepassExpanded(true);
  }, [gatepassActive]);

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

  const canSeeGatepass = canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.gatepass) || gatepassActive;
  const gatepassItems = useMemo(() => [
    {
      key: "gatepass-overview",
      label: tt("nav.gatepassOverview"),
      description: tt("nav.gatepassOverviewHint"),
      to: "/reports/gatepass/overview",
      icon: LayoutDashboard,
      active: location.pathname === "/reports/gatepass" || location.pathname === "/reports/gatepass/overview",
    },
    {
      key: "gatepass-daily",
      label: tt("nav.gatepassDaily"),
      description: tt("nav.gatepassDailyHint"),
      to: "/reports/gatepass/daily",
      icon: CarFront,
      active: location.pathname === "/reports/gatepass/daily",
    },
    {
      key: "gatepass-registry",
      label: tt("nav.gatepassRegistry"),
      description: tt("nav.gatepassRegistryHint"),
      to: "/reports/gatepass/registry",
      icon: ShieldCheck,
      active: location.pathname === "/reports/gatepass/registry",
    },
    {
      key: "gatepass-companies",
      label: tt("nav.gatepassCompanies"),
      description: tt("nav.gatepassCompaniesHint"),
      to: "/reports/gatepass/company-summary",
      icon: Building2,
      active: location.pathname === "/reports/gatepass/company-summary",
    },
  ], [location.pathname, tt]);

  const reportItems = useMemo(() => [
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
              {canSeeGatepass ? (
                <SidebarCollapsibleMenu
                  label={tt("nav.gatepass")}
                  icon={CarFront}
                  items={gatepassItems}
                  active={gatepassActive}
                  expanded={gatepassExpanded}
                  collapsed={sidebarCollapsed}
                  onToggle={() => {
                    if (sidebarCollapsed) setSidebarCollapsed(false);
                    setGatepassExpanded((value) => !value || sidebarCollapsed);
                  }}
                  onNavigate={() => setSidebarOpen(false)}
                />
              ) : null}
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
