import React from "react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import TicketWorkspacePage from "./TicketWorkspacePage";

const HISTORY_PAGE_TRANSLATIONS = {
  th: {
    title: "ประวัติ",
    subtitle: "ตรวจสอบงานที่ปิดแล้วและข้อมูลย้อนหลัง",
  },
  en: {
    title: "History",
    subtitle: "Review completed work and historical records.",
  },
  ko: {
    title: "이력",
    subtitle: "완료된 작업과 과거 기록을 확인합니다.",
  },
};

const HistoryPage = (props) => {
  const { tt } = useScopedI18n(HISTORY_PAGE_TRANSLATIONS);

  return <TicketWorkspacePage title={tt("title")} subtitle={tt("subtitle")} {...props} />;
};

export default HistoryPage;
