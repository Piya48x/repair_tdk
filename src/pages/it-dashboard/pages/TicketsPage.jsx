import React from "react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import TicketWorkspacePage from "./TicketWorkspacePage";

const TICKETS_PAGE_TRANSLATIONS = {
  th: {
    title: "งานซ่อม",
    subtitle: "จัดการงานซ่อมทั้งหมด",
  },
  en: {
    title: "Repair Tickets",
    subtitle: "Manage all repair jobs.",
  },
  ko: {
    title: "수리 작업",
    subtitle: "모든 수리 작업을 관리합니다.",
  },
};

const TicketsPage = (props) => {
  const { tt } = useScopedI18n(TICKETS_PAGE_TRANSLATIONS);

  return <TicketWorkspacePage title={tt("title")} subtitle={tt("subtitle")} {...props} />;
};

export default TicketsPage;
