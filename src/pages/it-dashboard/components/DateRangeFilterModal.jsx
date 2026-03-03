import React from "react";
import { Calendar as CalendarIcon, CheckCircle, X } from "lucide-react";
import { getITDashboardTheme } from "../theme/itDashboardTheme";

const PRESETS = [
  { label: "วันนี้", days: 0 },
  { label: "7 วัน", days: 7 },
  { label: "30 วัน", days: 30 },
];

const DateRangeFilterModal = ({
  isOpen,
  theme,
  dateRange,
  setDateRange,
  onClose,
}) => {
  if (!isOpen) return null;
  const uiTheme = getITDashboardTheme(theme);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-[420px] animate-modal-enter">
        <div
          className={`
            rounded-2xl shadow-2xl border overflow-hidden
            ${uiTheme.modalShell}
          `}
        >
          <div
            className={`
              px-6 py-4 border-b relative overflow-hidden
              ${uiTheme.modalHeader}
            `}
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${uiTheme.modalHeaderIconWrap}`}
                >
                  <CalendarIcon
                    className={`w-5 h-5 ${
                      theme === "dark" ? "text-blue-400" : "text-blue-600"
                    }`}
                  />
                </div>
                <div>
                  <h3
                    className={`text-lg font-bold ${uiTheme.modalTitle}`}
                  >
                    เลือกช่วงเวลา
                  </h3>
                  <p
                    className={`text-xs ${uiTheme.modalSubtitle} mt-0.5`}
                  >
                    กรองข้อมูลตามวันที่ที่ต้องการ
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`
                  p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95
                  ${uiTheme.modalCloseButton}
                `}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${uiTheme.modalDot}`}
                  ></div>
                  <label
                    className={`text-sm font-semibold ${uiTheme.modalLabel}`}
                  >
                    วันที่เริ่มต้น
                  </label>
                </div>
                <div className="relative group">
                  <input
                    type="date"
                    value={dateRange.start || ""}
                    onChange={(e) =>
                      setDateRange({
                        ...dateRange,
                        start: e.target.value,
                      })
                    }
                    className={`
                      w-full pl-12 pr-4 py-3.5 rounded-xl border text-sm
                      transition-all duration-200 outline-none
                      ${uiTheme.modalInput}
                    `}
                    placeholder="เลือกวันที่เริ่มต้น"
                  />
                  <div
                    className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg ${uiTheme.modalInputIconWrap}`}
                  >
                    <CalendarIcon
                      className={`w-4 h-4 ${
                        theme === "dark" ? "text-blue-400" : "text-blue-600"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${uiTheme.modalDot}`}
                  ></div>
                  <label
                    className={`text-sm font-semibold ${uiTheme.modalLabel}`}
                  >
                    วันที่สิ้นสุด
                  </label>
                </div>
                <div className="relative group">
                  <input
                    type="date"
                    value={dateRange.end || ""}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, end: e.target.value })
                    }
                    className={`
                      w-full pl-12 pr-4 py-3.5 rounded-xl border text-sm
                      transition-all duration-200 outline-none
                      ${uiTheme.modalInput}
                    `}
                    placeholder="เลือกวันที่สิ้นสุด"
                  />
                  <div
                    className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg ${uiTheme.modalInputIconWrap}`}
                  >
                    <CalendarIcon
                      className={`w-4 h-4 ${
                        theme === "dark" ? "text-blue-400" : "text-blue-600"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label
                className={`text-xs font-semibold uppercase tracking-wider ${uiTheme.modalPresetLabel}`}
              >
                ช่วงเวลาสำเร็จรูป
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(end.getDate() - preset.days);
                      setDateRange({
                        start: start.toISOString().split("T")[0],
                        end: end.toISOString().split("T")[0],
                      });
                    }}
                    className={`
                      py-2.5 px-3 rounded-xl text-xs font-medium border transition-all duration-200
                      hover:scale-[1.02] active:scale-95
                      ${uiTheme.modalPreset}
                    `}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`pt-4 border-t ${uiTheme.modalFooterBorder}`}>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDateRange({ start: "", end: "" });
                    onClose();
                  }}
                  className={`
                    flex-1 py-3.5 rounded-xl font-semibold text-sm border
                    transition-all duration-200 hover:scale-[1.02] active:scale-95
                    ${uiTheme.modalSecondaryButton}
                  `}
                >
                  ล้างค่า
                </button>
                <button
                  onClick={onClose}
                  className={`
                    flex-1 py-3.5 rounded-xl font-semibold text-sm border
                    bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                    hover:from-blue-700 hover:to-indigo-700
                    transition-all duration-200 hover:scale-[1.02] active:scale-95
                    shadow-lg shadow-blue-500/20 border-blue-500/30
                  `}
                >
                  ใช้ตัวกรอง
                </button>
              </div>

              {dateRange.start && dateRange.end && (
                <div
                  className={`mt-4 p-3 rounded-xl border ${uiTheme.modalRangeNotice}`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      className={`w-4 h-4 ${uiTheme.modalRangeIcon}`}
                    />
                    <span
                      className={`text-xs font-medium ${uiTheme.modalRangeText}`}
                    >
                      เลือกแล้ว:{" "}
                      {new Date(dateRange.start).toLocaleDateString("th-TH")} -{" "}
                      {new Date(dateRange.end).toLocaleDateString("th-TH")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeFilterModal;



