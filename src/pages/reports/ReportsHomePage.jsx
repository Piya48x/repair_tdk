import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  ListTodo,
  Package,
  RefreshCw,
  TicketCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import ReportsPageShell from "../../components/reports/ReportsPageShell";
import useNotebookApprovalRealtime from "../../hooks/useNotebookApprovalRealtime";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import {
  canAccessRoute,
  REPORT_ROUTE_PERMISSIONS,
  resolveWorkspaceRoute,
} from "../../lib/roleAccess";
import { supabase } from "../../lib/supabaseClient";
import { fetchExecutiveAssetOverviewData } from "../../services/reportService";

const REPORTS_HOME_TRANSLATIONS = {
  th: {
    page: {
      eyebrow: "Executive IT Operations",
      title: "ภาพรวมผลการดำเนินงานฝ่าย IT",
      description: "สรุปปริมาณงาน ผลงานที่ดำเนินการแล้ว และงานที่ทีมกำลังรับผิดชอบ จากข้อมูลในระบบปัจจุบัน",
      periodLabel: "ช่วงข้อมูล",
      refresh: "อัปเดตข้อมูล",
      updated: "ข้อมูลล่าสุด",
      loading: "กำลังรวบรวมข้อมูล...",
      unavailable: "ไม่สามารถโหลดข้อมูลภาพรวมได้ในขณะนี้ กรุณาลองอัปเดตอีกครั้ง",
    },
    periods: {
      d30: "30 วันล่าสุด",
      d90: "90 วันล่าสุด",
      d180: "6 เดือนล่าสุด",
      d365: "12 เดือนล่าสุด",
    },
    metrics: {
      received: "งานที่รับเข้า",
      receivedHint: "รายการใหม่ในช่วงที่เลือก",
      completed: "งานที่ดำเนินการเสร็จ",
      completedHint: "ปิดงานแล้วในช่วงที่เลือก",
      inProgress: "กำลังดำเนินการ",
      inProgressHint: "งานที่ทีม IT กำลังรับผิดชอบ",
      waiting: "งานใหม่รอรับ",
      waitingHint: "รายการที่รอเริ่มดำเนินการ",
    },
    performance: {
      eyebrow: "IT Work Performance",
      title: "งานรับเข้าและผลงานที่ปิดแล้ว",
      subtitle: "เปรียบเทียบจำนวนงานที่เข้ามากับงานที่ทีม IT ดำเนินการเสร็จในแต่ละเดือน",
      received: "รับงาน",
      completed: "ปิดงาน",
      completionRate: "อัตราปิดงาน",
      completedThisPeriod: "ปิดแล้ว",
      fromReceived: "จากงานที่รับเข้าในช่วงนี้",
    },
    deeper: {
      eyebrow: "Work Analysis",
      title: "IT ทำงานอะไรไปบ้าง",
      subtitle: "ดูสัดส่วนสถานะและประเภทงานที่เกิดขึ้นจริงจาก Ticket ในระบบ",
      statusTitle: "สถานะงานในช่วงที่เลือก",
      categoryTitle: "ประเภทงานที่ได้รับมากที่สุด",
      total: "งานทั้งหมด",
      noData: "ยังไม่มีข้อมูลในช่วงเวลานี้",
      closed: "ปิดงานแล้ว",
      progress: "กำลังดำเนินการ",
      new: "งานใหม่",
      other: "สถานะอื่น",
    },
    activity: {
      eyebrow: "Current Operations",
      title: "งานที่กำลังทำและผลงานล่าสุด",
      subtitle: "ติดตามสิ่งที่ทีม IT กำลังรับผิดชอบ พร้อมดูรายการที่ดำเนินการเสร็จล่าสุด",
      activeTitle: "กำลังดำเนินการ",
      activeHint: "งานที่ทีม IT กำลังรับผิดชอบอยู่",
      completedTitle: "ผลงานที่ปิดล่าสุด",
      completedHint: "รายการที่ดำเนินการเสร็จและบันทึกในระบบ",
      emptyActive: "ไม่มีงานที่อยู่ระหว่างดำเนินการ",
      emptyCompleted: "ยังไม่มีรายการปิดงานในช่วงนี้",
      unassigned: "ยังไม่ระบุผู้รับผิดชอบ",
      unknownDepartment: "ไม่ระบุแผนก",
      viewAll: "ดูงานทั้งหมด",
    },
    quick: {
      eyebrow: "Quick Access",
      title: "รายงานและพื้นที่จัดการ",
      subtitle: "เข้าถึงรายละเอียดที่เกี่ยวข้องได้โดยตรง",
    },
    operations: {
      title: "รายงานผู้บริหาร",
      description: "ดูรายละเอียดปริมาณงาน แนวโน้ม และข้อมูลประกอบการบริหาร",
      cta: "เปิดรายงาน",
      label: "Executive",
    },
    notebook: {
      title: "รายการอนุมัติ Notebook",
      description: "ตรวจคำขอยืม การคืน และหลักฐานที่รอการพิจารณา",
      cta: "เปิดรายการ",
      label: "Approvals",
    },
    asset: {
      title: "ภาพรวมสินทรัพย์ IT",
      description: "ดู Asset, License, Access Request และสถานะทรัพย์สิน",
      cta: "เปิดภาพรวม",
      label: "Assets",
    },
    manager: {
      title: "รายงานการปฏิบัติงาน IT",
      description: "ติดตามงานคงค้าง งานที่กำลังดำเนินการ และภาระงานของทีม",
      cta: "เปิดรายงาน",
      label: "Operations",
    },
    workspace: {
      title: "พื้นที่ทำงานหลัก",
      description: "กลับไปจัดการ Ticket และดำเนินงานประจำวัน",
      cta: "เปิด Workspace",
      label: "Workspace",
    },
  },
  en: {
    page: {
      eyebrow: "Executive IT Operations",
      title: "IT Performance Overview",
      description: "A concise view of service volume, completed work, and the responsibilities currently being handled by the IT team.",
      periodLabel: "Reporting period",
      refresh: "Refresh data",
      updated: "Last updated",
      loading: "Compiling report...",
      unavailable: "The overview is temporarily unavailable. Please refresh and try again.",
    },
    periods: {
      d30: "Last 30 days",
      d90: "Last 90 days",
      d180: "Last 6 months",
      d365: "Last 12 months",
    },
    metrics: {
      received: "Work received",
      receivedHint: "New items within the selected period",
      completed: "Work completed",
      completedHint: "Items closed within the selected period",
      inProgress: "In progress",
      inProgressHint: "Work currently owned by the IT team",
      waiting: "New work waiting",
      waitingHint: "Items waiting to be started",
    },
    performance: {
      eyebrow: "IT Work Performance",
      title: "Received and completed work",
      subtitle: "Monthly comparison of incoming work and work completed by the IT team.",
      received: "Received",
      completed: "Completed",
      completionRate: "Completion rate",
      completedThisPeriod: "Completed",
      fromReceived: "of work received in this period",
    },
    deeper: {
      eyebrow: "Work Analysis",
      title: "What IT has been working on",
      subtitle: "Status and service type distribution based on actual tickets.",
      statusTitle: "Work status in the selected period",
      categoryTitle: "Most requested service types",
      total: "Total work",
      noData: "No data for this period",
      closed: "Completed",
      progress: "In progress",
      new: "New",
      other: "Other",
    },
    activity: {
      eyebrow: "Current Operations",
      title: "Current and recently completed work",
      subtitle: "See what the IT team is handling now and the work most recently completed.",
      activeTitle: "In progress",
      activeHint: "Work currently being handled by IT",
      completedTitle: "Recently completed",
      completedHint: "Latest items completed and recorded in the system",
      emptyActive: "No work is currently in progress",
      emptyCompleted: "No completed work in this period",
      unassigned: "Unassigned",
      unknownDepartment: "No department",
      viewAll: "View all work",
    },
    quick: {
      eyebrow: "Quick Access",
      title: "Reports and management areas",
      subtitle: "Open related details directly.",
    },
    operations: {
      title: "Executive report",
      description: "Review work volume, trends, and management information.",
      cta: "Open report",
      label: "Executive",
    },
    notebook: {
      title: "Notebook approvals",
      description: "Review borrowing, returns, and supporting evidence.",
      cta: "Open list",
      label: "Approvals",
    },
    asset: {
      title: "IT asset overview",
      description: "Review assets, licenses, access requests, and inventory.",
      cta: "Open overview",
      label: "Assets",
    },
    manager: {
      title: "IT operations report",
      description: "Monitor backlog, active work, and team workload.",
      cta: "Open report",
      label: "Operations",
    },
    workspace: {
      title: "Main workspace",
      description: "Return to ticket management and daily operations.",
      cta: "Open workspace",
      label: "Workspace",
    },
  },
  ko: {
    page: {
      eyebrow: "Executive IT Operations",
      title: "IT 운영 실적 개요",
      description: "서비스 업무량, 완료 업무 및 IT 팀이 현재 담당하는 업무를 한눈에 확인합니다.",
      periodLabel: "조회 기간",
      refresh: "데이터 새로고침",
      updated: "마지막 업데이트",
      loading: "보고서를 불러오는 중...",
      unavailable: "현재 개요를 불러올 수 없습니다. 다시 시도해 주세요.",
    },
    periods: {
      d30: "최근 30일",
      d90: "최근 90일",
      d180: "최근 6개월",
      d365: "최근 12개월",
    },
    metrics: {
      received: "접수 업무",
      receivedHint: "선택한 기간의 신규 업무",
      completed: "완료 업무",
      completedHint: "선택한 기간에 종료된 업무",
      inProgress: "진행 중",
      inProgressHint: "IT 팀이 현재 담당하는 업무",
      waiting: "대기 중 신규 업무",
      waitingHint: "착수를 기다리는 업무",
    },
    performance: {
      eyebrow: "IT Work Performance",
      title: "접수 및 완료 업무",
      subtitle: "월별 접수 업무와 IT 팀의 완료 업무를 비교합니다.",
      received: "접수",
      completed: "완료",
      completionRate: "완료율",
      completedThisPeriod: "완료",
      fromReceived: "선택 기간 접수 업무 기준",
    },
    deeper: {
      eyebrow: "Work Analysis",
      title: "IT 업무 분석",
      subtitle: "실제 티켓을 기준으로 상태와 업무 유형을 확인합니다.",
      statusTitle: "선택 기간 업무 상태",
      categoryTitle: "주요 요청 유형",
      total: "전체 업무",
      noData: "선택 기간에 데이터가 없습니다",
      closed: "완료",
      progress: "진행 중",
      new: "신규",
      other: "기타",
    },
    activity: {
      eyebrow: "Current Operations",
      title: "진행 중 및 최근 완료 업무",
      subtitle: "IT 팀의 현재 담당 업무와 최근 완료 실적을 확인합니다.",
      activeTitle: "진행 중",
      activeHint: "IT 팀이 현재 처리 중인 업무",
      completedTitle: "최근 완료",
      completedHint: "시스템에 기록된 최근 완료 업무",
      emptyActive: "현재 진행 중인 업무가 없습니다",
      emptyCompleted: "선택 기간에 완료 업무가 없습니다",
      unassigned: "담당자 미지정",
      unknownDepartment: "부서 미지정",
      viewAll: "전체 업무 보기",
    },
    quick: {
      eyebrow: "Quick Access",
      title: "보고서 및 관리 영역",
      subtitle: "관련 상세 화면으로 바로 이동합니다.",
    },
    operations: {
      title: "경영진 보고서",
      description: "업무량, 추세 및 경영 정보를 확인합니다.",
      cta: "보고서 열기",
      label: "Executive",
    },
    notebook: {
      title: "노트북 승인",
      description: "대여, 반납 및 증빙을 검토합니다.",
      cta: "목록 열기",
      label: "Approvals",
    },
    asset: {
      title: "IT 자산 개요",
      description: "자산, 라이선스, 접근 요청 및 재고를 확인합니다.",
      cta: "개요 열기",
      label: "Assets",
    },
    manager: {
      title: "IT 운영 보고서",
      description: "대기 업무, 진행 업무 및 팀 업무량을 확인합니다.",
      cta: "보고서 열기",
      label: "Operations",
    },
    workspace: {
      title: "메인 작업 공간",
      description: "티켓 관리 및 일상 업무로 이동합니다.",
      cta: "작업 공간 열기",
      label: "Workspace",
    },
  },
};

const PERIOD_OPTIONS = [
  { value: "30", days: 30, months: 3, labelKey: "periods.d30" },
  { value: "90", days: 90, months: 3, labelKey: "periods.d90" },
  { value: "180", days: 180, months: 6, labelKey: "periods.d180" },
  { value: "365", days: 365, months: 12, labelKey: "periods.d365" },
];

const STATUS_COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#94a3b8"];

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function isClosedStatus(value) {
  return ["CLOSED", "COMPLETED", "RESOLVED"].includes(normalizeStatus(value));
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTicketDate(ticket, mode = "created") {
  if (mode === "closed") {
    return parseDate(ticket?.closed_at || ticket?.updated_at);
  }
  return parseDate(ticket?.created_at);
}

function groupTicketCategories(tickets) {
  const counts = new Map();
  tickets.forEach((ticket) => {
    const label = String(
      ticket?.service_type || ticket?.category || ticket?.title || "ไม่ระบุ",
    ).trim();
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}

function MetricCard({ icon: Icon, label, value, hint, tone = "blue", loading }) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-600 sm:text-sm">{label}</p>
          {loading ? (
            <div className="mt-3 h-9 w-20 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-[34px]">{value}</p>
          )}
          <p className="mt-1 text-[11px] leading-5 text-slate-500">{hint}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tones[tone] || tones.blue}`}>
          <Icon size={19} strokeWidth={2} />
        </span>
      </div>
    </article>
  );
}

function PanelHeading({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p>
        <h2 className="mt-1 text-base font-bold text-slate-950 sm:text-lg">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function PerformanceChart({ data, copy, formatter }) {
  const chartData = Array.isArray(data) ? data : [];

  return (
    <div className="h-[285px] w-full px-2 pb-2 pt-4 sm:h-[320px] sm:px-5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
              fontSize: 12,
            }}
            formatter={(value, name) => [
              formatter.format(Number(value || 0)),
              name === "value" ? copy.received : copy.completed,
            ]}
          />
          <Bar dataKey="value" name="value" fill="#94a3b8" radius={[5, 5, 0, 0]} maxBarSize={34} />
          <Bar dataKey="closed" name="closed" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatusDonut({ data, total, copy, formatter }) {
  return (
    <div className="grid gap-4 p-5 sm:grid-cols-[180px_1fr] sm:items-center sm:p-6">
      <div className="relative mx-auto h-[174px] w-[174px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((item, index) => (
                <Cell key={item.key} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatter.format(Number(value || 0))}
              contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-slate-950">{formatter.format(total)}</p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{copy.total}</p>
        </div>
      </div>
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.key} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: STATUS_COLORS[index] }} />
                <span className="truncate text-xs font-medium text-slate-600">{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{percentage}%</span>
                <span className="w-7 text-right text-sm font-bold text-slate-900">{formatter.format(item.value)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryBars({ data, formatter, emptyLabel }) {
  const maximum = Math.max(...data.map((item) => item.value), 1);

  if (!data.length) {
    return <div className="flex min-h-[244px] items-center justify-center p-6 text-sm text-slate-400">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-4 p-5 sm:p-6">
      {data.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <p className="truncate text-xs font-medium text-slate-700" title={item.label}>{item.label}</p>
            <p className="shrink-0 text-xs font-bold text-slate-900">{formatter.format(item.value)}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-500"
              style={{ width: `${Math.max((item.value / maximum) * 100, 5)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status, copy }) {
  const normalized = normalizeStatus(status);
  if (isClosedStatus(normalized)) {
    return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{copy.closed}</span>;
  }
  if (normalized === "IN_PROGRESS") {
    return <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{copy.progress}</span>;
  }
  return <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">{copy.new}</span>;
}

function WorkList({ rows, emptyLabel, copy, dateFormatter, mode }) {
  if (!rows.length) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <CheckCircle2 size={22} />
        </span>
        <p className="mt-3 text-sm font-medium text-slate-500">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {rows.map((ticket) => {
        const date = getTicketDate(ticket, mode === "completed" ? "closed" : "created");
        return (
          <article key={ticket.id} className="px-5 py-4 transition hover:bg-slate-50/80 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                  {ticket.title || ticket.category || ticket.service_type || `Ticket ${String(ticket.id || "").slice(0, 8)}`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><UserRound size={12} />{ticket.assigned_name || copy.unassigned}</span>
                  <span>{ticket.department || copy.unknownDepartment}</span>
                  <span>{date ? dateFormatter.format(date) : "-"}</span>
                </div>
              </div>
              <StatusBadge status={ticket.status} copy={copy} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function QuickLinkCard({ icon: Icon, label, title, description, cta, to, badgeCount = 0 }) {
  return (
    <Link
      to={to}
      className="group flex min-h-[158px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(37,99,235,0.09)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
          <Icon size={19} />
        </span>
        <div className="flex items-center gap-2">
          {badgeCount > 0 ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{badgeCount > 99 ? "99+" : badgeCount}</span> : null}
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</span>
        </div>
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{description}</p>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-bold text-blue-700">
        {cta}<ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default function ReportsHomePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("180");
  const { language, tt } = useScopedI18n(REPORTS_HOME_TRANSLATIONS);

  useEffect(() => {
    let mounted = true;
    const loadIdentity = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !mounted) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        if (!mounted) return;
        setCurrentUser({
          id: session.user.id,
          name: profile?.full_name || profile?.employee_code || session.user.email || "User",
          role: profile?.role || session.user.user_metadata?.role || "user",
          avatar: profile?.avatar_url || profile?.id_card_url || session.user.user_metadata?.avatar_url || "",
        });
      } finally {
        if (mounted) setIdentityReady(true);
      }
    };
    void loadIdentity();
    return () => {
      mounted = false;
    };
  }, []);

  const currentRole = String(currentUser?.role || "").trim().toLowerCase();
  const canSeeOperations = ["admin", "executive", "it_manager"].includes(currentRole);
  const canSeeNotebookApprovals = canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.notebookApprovals);
  const workspaceRoute = resolveWorkspaceRoute(currentRole || "user");
  const { pendingCount: notebookApprovalBadgeCount } = useNotebookApprovalRealtime({
    enabled: identityReady && canSeeNotebookApprovals,
  });

  const loadOverview = useCallback(async () => {
    if (!canSeeOperations) return;
    setLoading(true);
    setError("");
    try {
      setOverviewData(await fetchExecutiveAssetOverviewData());
    } catch (loadError) {
      console.error("Unable to load executive IT overview", loadError);
      setError(loadError?.message || "Unable to load report");
    } finally {
      setLoading(false);
    }
  }, [canSeeOperations]);

  useEffect(() => {
    if (identityReady && canSeeOperations) {
      void loadOverview();
    }
  }, [canSeeOperations, identityReady, loadOverview]);

  const formatter = useMemo(() => new Intl.NumberFormat(language === "ko" ? "ko-KR" : language === "en" ? "en-US" : "th-TH"), [language]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : language === "en" ? "en-GB" : "th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    [language],
  );
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : language === "en" ? "en-GB" : "th-TH", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    [language],
  );

  const selectedPeriod = PERIOD_OPTIONS.find((item) => item.value === period) || PERIOD_OPTIONS[2];
  const allTickets = useMemo(() => overviewData?.ticketRows || [], [overviewData]);
  const periodTickets = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - selectedPeriod.days);
    return allTickets.filter((ticket) => {
      const created = getTicketDate(ticket);
      return created && created >= cutoff;
    });
  }, [allTickets, selectedPeriod.days]);

  const completedInPeriod = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - selectedPeriod.days);
    return allTickets.filter((ticket) => {
      if (!isClosedStatus(ticket.status)) return false;
      const closed = getTicketDate(ticket, "closed");
      return closed && closed >= cutoff;
    });
  }, [allTickets, selectedPeriod.days]);

  const activeTickets = useMemo(
    () => allTickets
      .filter((ticket) => normalizeStatus(ticket.status) === "IN_PROGRESS")
      .sort((left, right) => (getTicketDate(right)?.getTime() || 0) - (getTicketDate(left)?.getTime() || 0)),
    [allTickets],
  );
  const waitingTickets = useMemo(
    () => allTickets.filter((ticket) => normalizeStatus(ticket.status) === "NEW"),
    [allTickets],
  );
  const recentlyCompleted = useMemo(
    () => [...completedInPeriod]
      .sort((left, right) => (getTicketDate(right, "closed")?.getTime() || 0) - (getTicketDate(left, "closed")?.getTime() || 0))
      .slice(0, 5),
    [completedInPeriod],
  );

  const completedFromReceived = periodTickets.filter((ticket) => isClosedStatus(ticket.status)).length;
  const completionRate = periodTickets.length > 0 ? Math.round((completedFromReceived / periodTickets.length) * 100) : 0;
  const statusData = [
    { key: "closed", label: tt("deeper.closed"), value: completedFromReceived },
    { key: "progress", label: tt("deeper.progress"), value: periodTickets.filter((ticket) => normalizeStatus(ticket.status) === "IN_PROGRESS").length },
    { key: "new", label: tt("deeper.new"), value: periodTickets.filter((ticket) => normalizeStatus(ticket.status) === "NEW").length },
    {
      key: "other",
      label: tt("deeper.other"),
      value: periodTickets.filter((ticket) => {
        const status = normalizeStatus(ticket.status);
        return !isClosedStatus(status) && !["IN_PROGRESS", "NEW"].includes(status);
      }).length,
    },
  ];
  const categoryData = useMemo(() => groupTicketCategories(periodTickets), [periodTickets]);
  const trendData = useMemo(
    () => (overviewData?.trend || []).slice(-selectedPeriod.months),
    [overviewData, selectedPeriod.months],
  );
  const updatedAt = overviewData?.generatedAt ? parseDate(overviewData.generatedAt) : null;

  const quickLinks = useMemo(() => [
    {
      key: "operations",
      icon: LayoutDashboard,
      label: tt("operations.label"),
      title: tt("operations.title"),
      description: tt("operations.description"),
      cta: tt("operations.cta"),
      to: "/reports/executive",
      roles: REPORT_ROUTE_PERMISSIONS.executive,
    },
    {
      key: "notebook",
      icon: ClipboardCheck,
      label: tt("notebook.label"),
      title: tt("notebook.title"),
      description: tt("notebook.description"),
      cta: tt("notebook.cta"),
      to: "/reports/executive/notebook-approvals",
      roles: REPORT_ROUTE_PERMISSIONS.notebookApprovals,
      badgeCount: notebookApprovalBadgeCount,
    },
    {
      key: "assets",
      icon: Package,
      label: tt("asset.label"),
      title: tt("asset.title"),
      description: tt("asset.description"),
      cta: tt("asset.cta"),
      to: "/reports/executive/assets-overview",
      roles: REPORT_ROUTE_PERMISSIONS.executive,
    },
    {
      key: "manager",
      icon: BarChart3,
      label: tt("manager.label"),
      title: tt("manager.title"),
      description: tt("manager.description"),
      cta: tt("manager.cta"),
      to: "/reports/it",
      roles: REPORT_ROUTE_PERMISSIONS.it,
    },
    {
      key: "workspace",
      icon: Wrench,
      label: tt("workspace.label"),
      title: tt("workspace.title"),
      description: tt("workspace.description"),
      cta: tt("workspace.cta"),
      to: workspaceRoute,
      roles: null,
    },
  ], [notebookApprovalBadgeCount, tt, workspaceRoute]);

  const visibleQuickLinks = quickLinks.filter(
    (item) => !item.roles || (currentRole && canAccessRoute(currentRole, item.roles)),
  );

  return (
    <ReportsPageShell>
      <ReportsTopbar
        currentUser={currentUser}
        notebookApprovalBadgeCount={canSeeNotebookApprovals ? notebookApprovalBadgeCount : 0}
      />

      <main className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_24px_rgba(15,23,42,0.05)]">
            <div className="h-1 bg-blue-700" />
            <div className="flex flex-col gap-5 px-5 py-5 sm:px-7 sm:py-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">{tt("page.eyebrow")}</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{tt("page.title")}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{tt("page.description")}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{tt("page.periodLabel")}</span>
                  <span className="relative block">
                    <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={period}
                      onChange={(event) => setPeriod(event.target.value)}
                      className="h-10 min-w-[180px] rounded-xl border border-slate-300 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {PERIOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{tt(option.labelKey)}</option>
                      ))}
                    </select>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => void loadOverview()}
                  disabled={loading || !canSeeOperations}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-xs font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                  {tt("page.refresh")}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[11px] text-slate-500 sm:px-7">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {loading && !overviewData
                ? tt("page.loading")
                : `${tt("page.updated")}: ${updatedAt ? dateTimeFormatter.format(updatedAt) : "-"}`}
            </div>
          </section>

          {error ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {tt("page.unavailable")}
            </div>
          ) : null}

          {canSeeOperations ? (
            <>
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  icon={ListTodo}
                  label={tt("metrics.received")}
                  value={formatter.format(periodTickets.length)}
                  hint={tt("metrics.receivedHint")}
                  tone="blue"
                  loading={loading && !overviewData}
                />
                <MetricCard
                  icon={TicketCheck}
                  label={tt("metrics.completed")}
                  value={formatter.format(completedInPeriod.length)}
                  hint={tt("metrics.completedHint")}
                  tone="green"
                  loading={loading && !overviewData}
                />
                <MetricCard
                  icon={Clock3}
                  label={tt("metrics.inProgress")}
                  value={formatter.format(activeTickets.length)}
                  hint={tt("metrics.inProgressHint")}
                  tone="amber"
                  loading={loading && !overviewData}
                />
                <MetricCard
                  icon={ClipboardCheck}
                  label={tt("metrics.waiting")}
                  value={formatter.format(waitingTickets.length)}
                  hint={tt("metrics.waitingHint")}
                  tone="slate"
                  loading={loading && !overviewData}
                />
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_22px_rgba(15,23,42,0.04)]">
                <PanelHeading
                  eyebrow={tt("performance.eyebrow")}
                  title={tt("performance.title")}
                  subtitle={tt("performance.subtitle")}
                  action={(
                    <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
                      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-slate-400" />{tt("performance.received")}</span>
                      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-blue-700" />{tt("performance.completed")}</span>
                    </div>
                  )}
                />
                <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
                  <PerformanceChart
                    data={trendData}
                    copy={{
                      received: tt("performance.received"),
                      completed: tt("performance.completed"),
                    }}
                    formatter={formatter}
                  />
                  <aside className="border-t border-slate-200 bg-slate-50/60 p-5 lg:border-l lg:border-t-0 lg:p-6">
                    <p className="text-xs font-semibold text-slate-600">{tt("performance.completionRate")}</p>
                    <p className="mt-3 text-4xl font-bold tracking-tight text-slate-950">{completionRate}%</p>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.min(completionRate, 100)}%` }} />
                    </div>
                    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] font-medium text-slate-500">{tt("performance.completedThisPeriod")}</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-700">{formatter.format(completedFromReceived)}</p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">{tt("performance.fromReceived")}</p>
                    </div>
                  </aside>
                </div>
              </section>

              <section>
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">{tt("deeper.eyebrow")}</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">{tt("deeper.title")}</h2>
                  <p className="mt-1 text-xs text-slate-500">{tt("deeper.subtitle")}</p>
                </div>
                <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                  <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_22px_rgba(15,23,42,0.04)]">
                    <PanelHeading eyebrow={tt("deeper.eyebrow")} title={tt("deeper.statusTitle")} />
                    <StatusDonut
                      data={statusData}
                      total={periodTickets.length}
                      copy={{ total: tt("deeper.total") }}
                      formatter={formatter}
                    />
                  </article>
                  <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_22px_rgba(15,23,42,0.04)]">
                    <PanelHeading eyebrow={tt("deeper.eyebrow")} title={tt("deeper.categoryTitle")} />
                    <CategoryBars data={categoryData} formatter={formatter} emptyLabel={tt("deeper.noData")} />
                  </article>
                </div>
              </section>

              <section>
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">{tt("activity.eyebrow")}</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">{tt("activity.title")}</h2>
                  <p className="mt-1 text-xs text-slate-500">{tt("activity.subtitle")}</p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_22px_rgba(15,23,42,0.04)]">
                    <PanelHeading
                      eyebrow={tt("activity.eyebrow")}
                      title={`${tt("activity.activeTitle")} (${formatter.format(activeTickets.length)})`}
                      subtitle={tt("activity.activeHint")}
                    />
                    <WorkList
                      rows={activeTickets.slice(0, 5)}
                      emptyLabel={tt("activity.emptyActive")}
                      copy={{
                        closed: tt("deeper.closed"),
                        progress: tt("deeper.progress"),
                        new: tt("deeper.new"),
                        unassigned: tt("activity.unassigned"),
                        unknownDepartment: tt("activity.unknownDepartment"),
                      }}
                      dateFormatter={dateFormatter}
                      mode="active"
                    />
                    <Link to={workspaceRoute} className="flex items-center justify-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50">
                      {tt("activity.viewAll")}<ArrowRight size={13} />
                    </Link>
                  </article>
                  <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_22px_rgba(15,23,42,0.04)]">
                    <PanelHeading
                      eyebrow={tt("activity.eyebrow")}
                      title={tt("activity.completedTitle")}
                      subtitle={tt("activity.completedHint")}
                    />
                    <WorkList
                      rows={recentlyCompleted}
                      emptyLabel={tt("activity.emptyCompleted")}
                      copy={{
                        closed: tt("deeper.closed"),
                        progress: tt("deeper.progress"),
                        new: tt("deeper.new"),
                        unassigned: tt("activity.unassigned"),
                        unknownDepartment: tt("activity.unknownDepartment"),
                      }}
                      dateFormatter={dateFormatter}
                      mode="completed"
                    />
                    <Link to={workspaceRoute} className="flex items-center justify-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50">
                      {tt("activity.viewAll")}<ArrowRight size={13} />
                    </Link>
                  </article>
                </div>
              </section>
            </>
          ) : null}

          <section>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">{tt("quick.eyebrow")}</p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">{tt("quick.title")}</h2>
              </div>
              <p className="text-xs text-slate-500">{tt("quick.subtitle")}</p>
            </div>
            {identityReady ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {visibleQuickLinks.map((item) => <QuickLinkCard key={item.key} {...item} />)}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-[158px] animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
              </div>
            )}
          </section>

          <footer className="flex items-center justify-center gap-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            <BarChart3 size={13} />TDK IT Operations Reporting
          </footer>
      </main>
    </ReportsPageShell>
  );
}
