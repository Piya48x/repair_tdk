import React from "react";
import { useScopedI18n } from "../i18n/useScopedI18n";

const AUDIT_VIEW_TRANSLATIONS = {
  th: {
    title: "Audit & Logs View",
    description: "ส่วนนี้สำหรับตรวจสอบประวัติการทำงานย้อนหลังทั้งหมด",
  },
  en: {
    title: "Audit & Logs View",
    description: "This section is for reviewing the full activity and audit history.",
  },
  ko: {
    title: "Audit & Logs View",
    description: "이 영역에서는 전체 작업 이력과 감사 로그를 확인할 수 있습니다.",
  },
};

export default function AuditView() {
  const { tt } = useScopedI18n(AUDIT_VIEW_TRANSLATIONS);

  return (
    <div className="app-theme min-h-screen bg-slate-50 p-8 text-slate-700">
      <h1 className="text-2xl font-bold">{tt("title")}</h1>
      <p>{tt("description")}</p>
    </div>
  );
}
