import React from "react";
import {
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
  Image as ImageIcon,
  LayoutDashboard,
  ListChecks,
} from "lucide-react";
import { PERIOD_OPTIONS, formatDurationLabel, formatHoursLabel } from "./shared";

export default function EvidenceDashboardSection({
  theme,
  uiTheme,
  cardClass,
  subCardClass,
  softTextClass,
  dashboardRef,
  reportRef,
  summaryCards,
  dailySummaries,
  reportPeriod,
  setReportPeriod,
  reportRows,
  reportKpis,
  onGoDashboard,
  onGoList,
  onGoReport,
  onExportExcel,
  onExportPng,
}) {
  return (
    <section ref={dashboardRef} className="space-y-6">
      <div className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${theme === "dark" ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200" : "border-cyan-200 bg-cyan-50 text-cyan-700"}`}>
              <LayoutDashboard size={14} />
              Dashboard งาน IT
            </div>
            <h2 className={`mt-3 text-2xl font-black ${uiTheme.textPrimary}`}>สรุปรายวัน รายงาน และ KPI สำหรับผู้บริหาร</h2>
            <p className={`mt-2 text-sm leading-6 ${uiTheme.textSecondary}`}>รวมจำนวนงาน ชั่วโมงทำงาน และเวลาที่ใช้ในแต่ละงาน พร้อม export เป็น Excel และ PNG</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onGoDashboard} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${theme === "dark" ? "bg-[#162136] text-slate-200 hover:bg-[#1e2b44]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}><LayoutDashboard size={16} />Dashboard</button>
            <button type="button" onClick={onGoList} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${theme === "dark" ? "bg-[#162136] text-slate-200 hover:bg-[#1e2b44]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}><ListChecks size={16} />รายการงาน</button>
            <button type="button" onClick={onGoReport} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${theme === "dark" ? "bg-[#162136] text-slate-200 hover:bg-[#1e2b44]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}><BarChart3 size={16} />รายงาน</button>
            <button type="button" onClick={onExportExcel} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${theme === "dark" ? "bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}><FileSpreadsheet size={16} />Export Excel</button>
            <button type="button" onClick={onExportPng} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${theme === "dark" ? "bg-violet-500/10 text-violet-200 hover:bg-violet-500/20" : "bg-violet-50 text-violet-700 hover:bg-violet-100"}`}><ImageIcon size={16} />Export PNG</button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`${subCardClass} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${softTextClass}`}>{item.label}</p>
                    <p className={`mt-2 text-2xl font-black ${uiTheme.textPrimary}`}>{item.value}</p>
                    <p className={`mt-1 text-xs ${softTextClass}`}>{item.helper}</p>
                  </div>
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${theme === "dark" ? "bg-[#0f172a] text-cyan-300" : "bg-white text-[#2b59b0]"}`}><Icon size={20} /></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className={`text-lg font-black ${uiTheme.textPrimary}`}>สรุปรายวัน</h3>
            <p className={`mt-1 text-sm ${softTextClass}`}>สรุปจำนวนงาน ชั่วโมงรวมต่อวัน และเวลาที่ใช้ในแต่ละงาน</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme === "dark" ? "border-slate-600 bg-[#162136] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}><CalendarDays size={14} />ย้อนหลัง {dailySummaries.length} วัน</span>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {dailySummaries.map((day) => (
            <div key={day.dateKey} className={`${subCardClass} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-black ${uiTheme.textPrimary}`}>{day.label}</p>
                  <p className={`mt-1 text-xs ${softTextClass}`}>{day.count} งาน • รวม {formatHoursLabel(day.totalMinutes)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${theme === "dark" ? "bg-[#0f172a] text-cyan-300" : "bg-white text-[#2b59b0]"}`}>{formatDurationLabel(day.totalMinutes)}</span>
              </div>
              <div className="mt-3 space-y-2">
                {day.items.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${theme === "dark" ? "bg-[#0f172a]" : "bg-white"}`}>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${uiTheme.textPrimary}`}>{item.title}</p>
                      <p className={`truncate text-xs ${softTextClass}`}>{item.typeLabel} • {item.userName || "-"}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-bold ${theme === "dark" ? "text-cyan-300" : "text-[#2b59b0]"}`}>{item.durationLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div ref={reportRef} className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className={`text-lg font-black ${uiTheme.textPrimary}`}>รายงานภาพรวม</h3>
            <p className={`mt-1 text-sm ${softTextClass}`}>สรุปข้อมูลตาม วัน / สัปดาห์ / เดือน / ปี พร้อม KPI</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => setReportPeriod(option.value)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${reportPeriod === option.value ? "bg-[#2b59b0] text-white" : theme === "dark" ? "bg-[#162136] text-slate-200 hover:bg-[#1e2b44]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{option.label}</button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className={`${subCardClass} p-4`}><p className={`text-xs font-semibold uppercase tracking-[0.16em] ${softTextClass}`}>จำนวนงาน</p><p className={`mt-2 text-2xl font-black ${uiTheme.textPrimary}`}>{reportKpis.jobCount}</p></div>
          <div className={`${subCardClass} p-4`}><p className={`text-xs font-semibold uppercase tracking-[0.16em] ${softTextClass}`}>ชั่วโมงรวม</p><p className={`mt-2 text-2xl font-black ${uiTheme.textPrimary}`}>{formatHoursLabel(reportKpis.totalMinutes)}</p></div>
          <div className={`${subCardClass} p-4`}><p className={`text-xs font-semibold uppercase tracking-[0.16em] ${softTextClass}`}>เฉลี่ยต่องาน</p><p className={`mt-2 text-2xl font-black ${uiTheme.textPrimary}`}>{formatHoursLabel(reportKpis.averageMinutes)}</p></div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className={softTextClass}>
                <th className="px-3 py-3 text-left font-bold">ช่วงเวลา</th>
                <th className="px-3 py-3 text-left font-bold">จำนวนงาน</th>
                <th className="px-3 py-3 text-left font-bold">ชั่วโมงรวม</th>
                <th className="px-3 py-3 text-left font-bold">เฉลี่ยต่องาน</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => (
                <tr key={row.key} className={`border-t ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
                  <td className={`px-3 py-3 font-semibold ${uiTheme.textPrimary}`}>{row.label}</td>
                  <td className={`px-3 py-3 ${uiTheme.textSecondary}`}>{row.count}</td>
                  <td className={`px-3 py-3 ${uiTheme.textSecondary}`}>{formatHoursLabel(row.totalMinutes)}</td>
                  <td className={`px-3 py-3 ${uiTheme.textSecondary}`}>{formatHoursLabel(row.averageMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
