import React from "react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import TicketWorkspacePage from "./TicketWorkspacePage";

const ACTIVE_PAGE_TRANSLATIONS = {
  th: {
    title: "กำลังดำเนินการ",
    subtitle: "ติดตามงานที่รับผิดชอบ",
  },
  en: {
    title: "In Progress",
    subtitle: "Track assigned work.",
  },
  ko: {
    title: "진행 중",
    subtitle: "담당 작업을 확인합니다.",
  },
};

const ActivePage = (props) => {
  const { tt } = useScopedI18n(ACTIVE_PAGE_TRANSLATIONS);

  return <TicketWorkspacePage title={tt("title")} subtitle={tt("subtitle")} {...props} />;
};

export default ActivePage;
