import React from "react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import TicketWorkspacePage from "./TicketWorkspacePage";

const ACTIVE_PAGE_TRANSLATIONS = {
  th: {
    title: "กำลังดำเนินการ",
    subtitle: "ติดตามงานที่รับผิดชอบและกำลังซ่อมอยู่",
  },
  en: {
    title: "In Progress",
    subtitle: "Track assigned work and tickets currently being repaired.",
  },
  ko: {
    title: "진행 중",
    subtitle: "담당 중이거나 현재 수리 중인 작업을 추적합니다.",
  },
};

const ActivePage = (props) => {
  const { tt } = useScopedI18n(ACTIVE_PAGE_TRANSLATIONS);

  return <TicketWorkspacePage title={tt("title")} subtitle={tt("subtitle")} {...props} />;
};

export default ActivePage;
