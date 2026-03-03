import React from "react";

const SettingsPage = ({ theme, uiTheme }) => {
  return (
    <>
      <section className="mb-4">
        <h2 className={`text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
          ตั้งค่า
        </h2>
        <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
          หน้านี้เตรียมไว้สำหรับตั้งค่าระบบและการทำงานของช่างเทคนิค
        </p>
      </section>

      <section>
        <div className={`rounded-lg border p-6 ${uiTheme.surfaceCard}`}>
          <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
            ส่วนตั้งค่ายังอยู่ระหว่างพัฒนา แนะนำให้เพิ่มหมวดการตั้งค่าเป็นไฟล์ย่อยภายใต้ `pages/settings/` ได้ทันที
          </p>
        </div>
      </section>
    </>
  );
};

export default SettingsPage;
