import React from "react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import TicketWorkspacePage from "./TicketWorkspacePage";

const DASHBOARD_PAGE_TRANSLATIONS = {
  th: {
    title: "ภาพรวมงานช่างเทคนิค",
    subtitle: "ติดตามภาระงานและประสิทธิภาพในหน้าจอเดียว",
  },
  en: {
    title: "Technician Overview",
    subtitle: "Track workload and performance from a single screen.",
  },
  ko: {
    title: "기술팀 개요",
    subtitle: "하나의 화면에서 업무량과 성과를 추적합니다.",
  },
};

const DashboardPage = (props) => {
  const { tt } = useScopedI18n(DASHBOARD_PAGE_TRANSLATIONS);

  return <TicketWorkspacePage title={tt("title")} subtitle={tt("subtitle")} {...props} />;
};

export default DashboardPage;
