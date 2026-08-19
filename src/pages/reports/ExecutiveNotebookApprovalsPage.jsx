import React, { useEffect, useState } from "react";
import ReportPageHero from "../../components/reports/ReportPageHero";
import ReportsPageShell from "../../components/reports/ReportsPageShell";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import useNotebookApprovalRealtime from "../../hooks/useNotebookApprovalRealtime";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { supabase } from "../../lib/supabaseClient";
import NotebookBorrowRequestsPage from "../it-dashboard/pages/NotebookBorrowRequestsPage";
import { getITDashboardTheme } from "../it-dashboard/theme/itDashboardTheme";

const LIGHT_THEME = getITDashboardTheme("light");

const EXECUTIVE_NOTEBOOK_APPROVALS_TRANSLATIONS = {
  th: {
    eyebrow: "Executive Workflow",
    title: "อนุมัติยืม Notebook",
    description: "ตรวจคำขอยืม การคืน และหลักฐานที่รอการพิจารณาจากหน้ากลางเดียว",
    pending: "รายการรออนุมัติ",
  },
  en: {
    eyebrow: "Executive Workflow",
    title: "Notebook Approvals",
    description: "Review borrowing requests, returns, and supporting evidence from one consistent workspace.",
    pending: "Pending approvals",
  },
  ko: {
    eyebrow: "Executive Workflow",
    title: "노트북 승인",
    description: "대여 요청, 반납 및 검토 대기 증빙을 하나의 일관된 화면에서 확인합니다.",
    pending: "승인 대기",
  },
};

export default function ExecutiveNotebookApprovalsPage() {
  const { tt } = useScopedI18n(EXECUTIVE_NOTEBOOK_APPROVALS_TRANSLATIONS);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatOpenSignal, setChatOpenSignal] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !isMounted) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileError) {
        console.warn("Load executive notebook approval profile error:", profileError);
      }

      setCurrentUser({
        id: session.user.id,
        name:
          profile?.full_name ||
          profile?.employee_code ||
          session.user.email ||
          "Executive",
        role: profile?.role || session.user.user_metadata?.role || "executive",
        avatar:
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
  }, []);

  const { pendingCount: notebookApprovalBadgeCount } = useNotebookApprovalRealtime({
    enabled: Boolean(currentUser?.id),
    onNewPendingRequest: () => {
      setChatOpenSignal((value) => value + 1);
    },
  });

  return (
    <ReportsPageShell>
      <ReportsTopbar
        currentUser={currentUser}
        notebookApprovalBadgeCount={notebookApprovalBadgeCount}
        messengerOpenSignal={chatOpenSignal}
        messengerOpenSignalTarget="list"
      />
      <main className="space-y-5">
        <ReportPageHero
          eyebrow={tt("eyebrow")}
          title={tt("title")}
          description={tt("description")}
          status={`${tt("pending")}: ${notebookApprovalBadgeCount.toLocaleString()}`}
        />
        <NotebookBorrowRequestsPage
          theme="light"
          uiTheme={LIGHT_THEME}
          currentUser={currentUser}
          embedded
        />
      </main>
    </ReportsPageShell>
  );
}
