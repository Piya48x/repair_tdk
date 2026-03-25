import React from "react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";

const SETTINGS_PAGE_TRANSLATIONS = {
  th: {
    title: "ตั้งค่า",
    subtitle: "หน้านี้เตรียมไว้สำหรับตั้งค่าระบบและการทำงานของช่างเทคนิค",
    body: "ส่วนตั้งค่ายังอยู่ระหว่างพัฒนา แนะนำให้เพิ่มหมวดการตั้งค่าเป็นไฟล์ย่อยภายใต้ `pages/settings/` ได้ทันที",
  },
  en: {
    title: "Settings",
    subtitle: "This page is prepared for technician workflow and system settings.",
    body: "The settings area is still under development. You can split future sections into files under `pages/settings/` immediately.",
  },
  ko: {
    title: "설정",
    subtitle: "이 페이지는 기술자 업무 흐름과 시스템 설정을 위한 공간입니다.",
    body: "설정 영역은 아직 개발 중입니다. 이후 설정 섹션은 `pages/settings/` 아래 개별 파일로 바로 분리할 수 있습니다.",
  },
};

const SettingsPage = ({ theme, uiTheme }) => {
  const { tt } = useScopedI18n(SETTINGS_PAGE_TRANSLATIONS);

  return (
    <>
      <section className="mb-4">
        <h2 className={`text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
          {tt("title")}
        </h2>
        <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
          {tt("subtitle")}
        </p>
      </section>

      <section>
        <div className={`rounded-lg border p-6 ${uiTheme.surfaceCard}`}>
          <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{tt("body")}</p>
        </div>
      </section>
    </>
  );
};

export default SettingsPage;
