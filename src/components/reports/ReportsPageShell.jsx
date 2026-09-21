import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReportsSidebar from "./ReportsSidebar";
import { ReportsLayoutContext } from "./ReportsLayoutContext";
import { supabase } from "../../lib/supabaseClient";
import { fetchProfilesWithCompatibility } from "../../lib/profileSchemaCompat";

const REPORTS_SIDEBAR_COLLAPSED_KEY = "reports-sidebar-collapsed-v1";

export default function ReportsPageShell({ children, className = "" }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(REPORTS_SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const [chatRequest, setChatRequest] = useState({ signal: 0, target: "support" });
  const [reportIdentity, setReportIdentity] = useState(null);

  useEffect(() => {
    window.localStorage.setItem(REPORTS_SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    let mounted = true;

    const loadReportIdentity = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !mounted) return;

      const { data: profiles } = await fetchProfilesWithCompatibility(supabase, {
        ids: [session.user.id],
        columns: ["full_name", "employee_code", "role", "avatar_url", "id_card_url"],
      });
      const profile = profiles[0] || null;

      if (!mounted) return;
      setReportIdentity({
        id: session.user.id,
        name: profile?.full_name || profile?.employee_code || session.user.user_metadata?.full_name || session.user.email || "User",
        role: profile?.role || session.user.user_metadata?.role || "user",
        avatar: profile?.avatar_url || profile?.id_card_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || "",
      });
    };

    void loadReportIdentity();
    return () => { mounted = false; };
  }, []);

  const requestChatOpen = useCallback((target = "support") => {
    setChatRequest((current) => ({ signal: current.signal + 1, target }));
  }, []);

  const layoutValue = useMemo(() => ({
    hasSidebar: true,
    openSidebar: () => setSidebarOpen(true),
    sidebarCollapsed,
    chatOpenSignal: chatRequest.signal,
    chatOpenSignalTarget: chatRequest.target,
    requestChatOpen,
    reportIdentity,
    setReportIdentity,
  }), [chatRequest, reportIdentity, requestChatOpen, sidebarCollapsed]);

  return (
    <div className={`app-theme min-h-screen overflow-x-clip bg-[#f4f7fb] text-slate-900 ${className}`}>
      <ReportsLayoutContext.Provider value={layoutValue}>
        <ReportsSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
        <div className={`${sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"} min-w-0 transition-[margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}>
          <div className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
            <div className="mx-auto max-w-[1480px]">{children}</div>
          </div>
        </div>
      </ReportsLayoutContext.Provider>
    </div>
  );
}
