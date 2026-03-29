import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import CentralChatDock from "../../components/CentralChatDock.jsx";
import useNotebookApprovalRealtime from "../../hooks/useNotebookApprovalRealtime";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { supabase } from "../../lib/supabaseClient";
import NotebookBorrowRequestsPage from "../it-dashboard/pages/NotebookBorrowRequestsPage";
import { getITDashboardTheme } from "../it-dashboard/theme/itDashboardTheme";

const EXECUTIVE_NOTEBOOK_APPROVALS_TRANSLATIONS = {
  th: {
    backLabel: "กลับ Reports Hub",
  },
  en: {
    backLabel: "Back to Reports Hub",
  },
  ko: {
    backLabel: "리포트 허브로",
  },
};

const LIGHT_THEME = getITDashboardTheme("light");

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

  useNotebookApprovalRealtime({
    enabled: Boolean(currentUser?.id),
    onNewPendingRequest: () => {
      setChatOpenSignal((value) => value + 1);
    },
  });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_48%,_#f8fafc_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4">
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            {tt("backLabel")}
          </Link>
        </div>

        <NotebookBorrowRequestsPage
          theme="light"
          uiTheme={LIGHT_THEME}
          currentUser={currentUser}
          embedded
        />
      </div>

      {currentUser ? (
        <CentralChatDock
          currentUser={currentUser}
          openSignal={chatOpenSignal}
          openSignalTarget="list"
          className="bottom-4 left-4 sm:bottom-6 sm:left-6"
        />
      ) : null}
    </div>
  );
}
