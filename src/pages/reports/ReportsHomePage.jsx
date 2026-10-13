import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  Image as ImageIcon,
  ListTodo,
  RefreshCw,
  TicketCheck,
  UserRound,
  Wrench,
  X,
  ZoomIn,
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
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { resolveWorkspaceRoute } from "../../lib/roleAccess";
import { supabase } from "../../lib/supabaseClient";
import { getTicketAttachmentEntries, getTicketDisplayNote, isImageAttachmentUrl } from "../../lib/ticketAttachmentMetadata";
import { fetchExecutiveAssetOverviewData } from "../../services/reportService";

const REPORTS_HOME_TRANSLATIONS = {
  th: {
    page: {
      eyebrow: "IT Operations Hub",
      title: "งาน IT ทั้งหมด",
      description: "ศูนย์รวมงานซ่อม งานบริการ งานที่กำลังดำเนินการ และทางเข้าสู่รายงานเฉพาะด้านของฝ่าย IT",
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
    metricDetails: {
      action: "คลิกเพื่อดูรายละเอียด",
      close: "ปิดรายละเอียด",
      total: "รายการทั้งหมด",
      receivedTitle: "รายละเอียดงานที่รับเข้า",
      completedTitle: "รายละเอียดงานที่ดำเนินการเสร็จ",
      inProgressTitle: "รายละเอียดงานที่กำลังดำเนินการ",
      waitingTitle: "รายละเอียดงานใหม่รอรับ",
      receivedEmpty: "ไม่มีงานที่รับเข้าในช่วงเวลานี้",
      completedEmpty: "ไม่มีงานที่ดำเนินการเสร็จในช่วงเวลานี้",
      inProgressEmpty: "ไม่มีงานที่กำลังดำเนินการ",
      waitingEmpty: "ไม่มีงานใหม่รอรับ",
      previous: "ก่อนหน้า",
      next: "ถัดไป",
      page: "หน้า",
      photos: "รูปหลักฐาน",
      noPhotos: "ไม่มีรูปแนบ",
      openPhoto: "กดเพื่อดูรูปขนาดใหญ่",
      closePhoto: "ปิดรูป",
      ticketNumber: "เลขที่งาน",
      problemDetails: "เรื่องที่แจ้ง",
      noDescription: "ไม่มีรายละเอียดเพิ่มเติม",
      resolutionDetails: "สิ่งที่ดำเนินการ",
      noResolution: "ยังไม่มีบันทึก",
      reporter: "ผู้แจ้ง",
      technician: "ผู้ดำเนินการ",
      unassigned: "ยังไม่ได้มอบหมาย",
      employeeId: "รหัสพนักงาน",
      department: "แผนก",
      location: "สถานที่",
      phone: "โทรศัพท์",
      email: "อีเมล",
      category: "หมวดหมู่",
      serviceType: "ประเภทบริการ",
      channel: "ช่องทางแจ้ง",
      priority: "ความสำคัญ",
      assetCode: "รหัสทรัพย์สิน",
      timeline: "วันและเวลา",
      reportedAt: "รับแจ้ง",
      startedAt: "เริ่มดำเนินการ",
      updatedAt: "อัปเดตล่าสุด",
      closedAt: "ปิดงาน",
      notStarted: "ยังไม่เริ่ม",
      notClosed: "ยังไม่ปิดงาน",
      notProvided: "ไม่ระบุ",
      beforePhoto: "ก่อนดำเนินการ",
      afterPhoto: "หลังดำเนินการ",
      showDetails: "กดเพื่อดูรายละเอียด",
      hideDetails: "ซ่อนรายละเอียด",
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
      title: "Executive IT Command Center",
      description: "ภาพรวมระดับบริหารของงานซ่อม SLA ทรัพย์สิน License และประเด็นที่ต้องตัดสินใจ",
      cta: "เปิด Command Center",
      label: "Command Center",
    },
    notebook: {
      title: "รายการอนุมัติ Notebook",
      description: "ตรวจคำขอยืม การคืน และหลักฐานที่รอการพิจารณา",
      cta: "เปิดรายการ",
      label: "Approvals",
    },
    asset: {
      title: "สถานะและความพร้อมของทรัพย์สิน",
      description: "ดูจำนวน สถานะ ความพร้อม ความเสี่ยง และ License ของทรัพย์สิน IT",
      cta: "เปิดข้อมูลทรัพย์สิน",
      label: "Assets",
    },
    gatepass: {
      title: "Gatepass Vehicle Report",
      description: "สรุปรถ TDK APPROVED และ TEMPORARY พร้อมเทียบรายวัน รายเดือน และผลต่างรถเพิ่ม-ลด",
      cta: "เปิดรายงาน Gatepass",
      label: "Gatepass",
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
      eyebrow: "IT Operations Hub",
      title: "All IT Work",
      description: "A single hub for repairs, service work, active operations, and focused IT management reports.",
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
    metricDetails: {
      action: "Click to view details",
      close: "Close details",
      total: "Total items",
      receivedTitle: "Work received details",
      completedTitle: "Completed work details",
      inProgressTitle: "Work in progress details",
      waitingTitle: "New work waiting details",
      receivedEmpty: "No work was received in this period",
      completedEmpty: "No work was completed in this period",
      inProgressEmpty: "No work is currently in progress",
      waitingEmpty: "No new work is waiting",
      previous: "Previous",
      next: "Next",
      page: "Page",
      photos: "Evidence photos",
      noPhotos: "No photos attached",
      openPhoto: "Click to enlarge",
      closePhoto: "Close image",
      ticketNumber: "Ticket number",
      problemDetails: "Reported issue",
      noDescription: "No additional details",
      resolutionDetails: "Work performed",
      noResolution: "No work note yet",
      reporter: "Reporter",
      technician: "Handled by",
      unassigned: "Not assigned",
      employeeId: "Employee ID",
      department: "Department",
      location: "Location",
      phone: "Phone",
      email: "Email",
      category: "Category",
      serviceType: "Service type",
      channel: "Request channel",
      priority: "Priority",
      assetCode: "Asset code",
      timeline: "Date and time",
      reportedAt: "Reported",
      startedAt: "Started",
      updatedAt: "Last updated",
      closedAt: "Closed",
      notStarted: "Not started",
      notClosed: "Not closed",
      notProvided: "Not provided",
      beforePhoto: "Before work",
      afterPhoto: "After work",
      showDetails: "Click to view details",
      hideDetails: "Hide details",
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
      title: "Executive IT Command Center",
      description: "A leadership view of repairs, SLA, assets, licenses, and decisions requiring attention.",
      cta: "Open Command Center",
      label: "Command Center",
    },
    notebook: {
      title: "Notebook approvals",
      description: "Review borrowing, returns, and supporting evidence.",
      cta: "Open list",
      label: "Approvals",
    },
    asset: {
      title: "Asset Status & Readiness",
      description: "Review IT asset volume, condition, readiness, risk, and software licenses.",
      cta: "Open assets",
      label: "Assets",
    },
    gatepass: {
      title: "Gatepass Vehicle Report",
      description: "Compare TDK APPROVED and TEMPORARY vehicles by day or month, including added and reduced vehicles.",
      cta: "Open Gatepass report",
      label: "Gatepass",
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
      eyebrow: "IT Operations Hub",
      title: "전체 IT 업무",
      description: "수리, 서비스 업무, 진행 중인 운영 및 IT 관리 보고서를 한곳에서 확인합니다.",
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
    metricDetails: {
      action: "클릭하여 상세 보기",
      close: "상세 닫기",
      total: "전체 항목",
      receivedTitle: "접수 업무 상세",
      completedTitle: "완료 업무 상세",
      inProgressTitle: "진행 중 업무 상세",
      waitingTitle: "대기 중 신규 업무 상세",
      receivedEmpty: "선택 기간에 접수된 업무가 없습니다",
      completedEmpty: "선택 기간에 완료된 업무가 없습니다",
      inProgressEmpty: "현재 진행 중인 업무가 없습니다",
      waitingEmpty: "대기 중인 신규 업무가 없습니다",
      previous: "이전",
      next: "다음",
      page: "페이지",
      photos: "증빙 사진",
      noPhotos: "첨부된 사진 없음",
      openPhoto: "클릭하여 크게 보기",
      closePhoto: "사진 닫기",
      ticketNumber: "업무 번호",
      problemDetails: "요청 내용",
      noDescription: "추가 설명이 없습니다",
      resolutionDetails: "처리 내용",
      noResolution: "처리 기록 없음",
      reporter: "신청자",
      technician: "처리 담당자",
      unassigned: "담당자 미배정",
      employeeId: "사번",
      department: "부서",
      location: "위치",
      phone: "전화",
      email: "이메일",
      category: "카테고리",
      serviceType: "서비스 유형",
      channel: "접수 채널",
      priority: "우선순위",
      assetCode: "자산 코드",
      timeline: "날짜 및 시간",
      reportedAt: "접수",
      startedAt: "처리 시작",
      updatedAt: "최근 수정",
      closedAt: "업무 종료",
      notStarted: "시작 전",
      notClosed: "미종료",
      notProvided: "미지정",
      beforePhoto: "처리 전",
      afterPhoto: "처리 후",
      showDetails: "클릭하여 상세 보기",
      hideDetails: "상세 닫기",
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
      title: "Executive IT Command Center",
      description: "수리, SLA, 자산, 라이선스 및 주요 의사결정 항목을 한눈에 확인합니다.",
      cta: "Command Center 열기",
      label: "Command Center",
    },
    notebook: {
      title: "노트북 승인",
      description: "대여, 반납 및 증빙을 검토합니다.",
      cta: "목록 열기",
      label: "Approvals",
    },
    asset: {
      title: "자산 상태 및 준비도",
      description: "IT 자산 수량, 상태, 준비도, 위험 및 소프트웨어 라이선스를 확인합니다.",
      cta: "자산 보기",
      label: "Assets",
    },
    gatepass: {
      title: "Gatepass Vehicle Report",
      description: "TDK APPROVED 및 TEMPORARY 차량을 일별·월별로 비교하고 증감을 확인합니다.",
      cta: "Gatepass 보고서 열기",
      label: "Gatepass",
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
const METRIC_DETAIL_PAGE_SIZE = 10;

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

function MetricCard({ icon: Icon, label, value, hint, tone = "blue", loading, active = false, actionLabel, onClick }) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-100 text-slate-700",
  };
  const activeTones = {
    blue: "border-blue-500 ring-blue-100",
    green: "border-emerald-500 ring-emerald-100",
    amber: "border-amber-500 ring-amber-100",
    slate: "border-slate-500 ring-slate-200",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`group w-full rounded-xl border bg-white p-3 text-left shadow-[0_3px_14px_rgba(15,23,42,0.04)] outline-none transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_22px_rgba(15,23,42,0.08)] focus-visible:ring-2 sm:p-3.5 ${active ? `${activeTones[tone] || activeTones.blue} ring-2` : "border-slate-200 focus-visible:ring-blue-200"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-600 sm:text-sm">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-16 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">{value}</p>
          )}
          <p className="mt-0.5 truncate text-[10px] leading-4 text-slate-500" title={hint}>{hint}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tones[tone] || tones.blue}`}>
          <Icon size={17} strokeWidth={2} />
        </span>
      </div>
      <span className={`mt-2 flex items-center justify-between border-t pt-2 text-[10px] font-bold ${active ? "border-current/10 text-slate-800" : "border-slate-100 text-slate-500 group-hover:text-blue-700"}`}>
        {actionLabel}
        <ChevronDown size={15} className={`transition-transform ${active ? "rotate-180" : ""}`} />
      </span>
    </button>
  );
}

function PanelHeading({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p>
        <h2 className="mt-0.5 text-sm font-bold text-slate-950 sm:text-base">{title}</h2>
        {subtitle ? <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function PerformanceChart({ data, copy, formatter }) {
  const chartData = Array.isArray(data) ? data : [];

  return (
    <div className="h-[205px] w-full px-2 pb-2 pt-3 sm:h-[225px] sm:px-4">
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
    <div className="grid gap-3 p-4 sm:grid-cols-[130px_1fr] sm:items-center">
      <div className="relative mx-auto h-[126px] w-[126px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={41}
              outerRadius={57}
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
          <p className="text-xl font-bold text-slate-950">{formatter.format(total)}</p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{copy.total}</p>
        </div>
      </div>
      <div className="space-y-2">
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
    return <div className="flex min-h-[190px] items-center justify-center p-4 text-sm text-slate-400">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-2.5 p-4">
      {data.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          <div className="mb-1 flex items-center justify-between gap-4">
            <p className="truncate text-xs font-medium text-slate-700" title={item.label}>{item.label}</p>
            <p className="shrink-0 text-xs font-bold text-slate-900">{formatter.format(item.value)}</p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
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
    return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{copy.closed}</span>;
  }
  if (normalized === "IN_PROGRESS") {
    return <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{copy.progress}</span>;
  }
  return <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{copy.new}</span>;
}

function WorkList({ rows, emptyLabel, copy, dateFormatter, mode }) {
  if (!rows.length) {
    return (
      <div className="flex min-h-[150px] flex-col items-center justify-center px-5 py-7 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <CheckCircle2 size={19} />
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
          <article key={ticket.id} className="px-4 py-3 transition hover:bg-slate-50/80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                  {ticket.title || ticket.category || ticket.service_type || `Ticket ${String(ticket.id || "").slice(0, 8)}`}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
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

function MetricDetailPanel({ detail, page, onPageChange, onClose, formatter, dateTimeFormatter, copy }) {
  const [previewImage, setPreviewImage] = useState(null);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const totalPages = Math.max(Math.ceil(detail.rows.length / METRIC_DETAIL_PAGE_SIZE), 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * METRIC_DETAIL_PAGE_SIZE;
  const visibleRows = detail.rows.slice(startIndex, startIndex + METRIC_DETAIL_PAGE_SIZE);
  const previewEntry = previewImage?.entries?.[previewImage.index] || null;

  useEffect(() => {
    setExpandedTicketId(null);
  }, [safePage, detail.mode]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (previewImage) setPreviewImage(null);
        else onClose();
        return;
      }
      if (!previewImage || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      setPreviewImage((current) => {
        if (!current?.entries?.length) return current;
        const offset = event.key === "ArrowRight" ? 1 : -1;
        return { ...current, index: (current.index + offset + current.entries.length) % current.entries.length };
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, previewImage]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={detail.title}
    >
      <section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-2xl">
        <div className="h-1 shrink-0 bg-blue-700" />
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">{copy.total}</p>
            <h2 className="mt-1 truncate text-base font-bold text-slate-950 sm:text-xl">
              {detail.title} <span className="text-blue-700">({formatter.format(detail.rows.length)})</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
            aria-label={copy.close}
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70">
          {visibleRows.length ? (
            <div className="p-3 sm:p-5">
              <div className="hidden grid-cols-[150px_170px_170px_minmax(260px,1fr)_80px_32px] gap-3 rounded-t-xl border border-b-0 border-slate-200 bg-slate-100 px-4 py-3 text-xs font-bold text-slate-600 lg:grid">
                <span>{copy.timeline}</span>
                <span>{copy.reporter}</span>
                <span>{copy.technician}</span>
                <span>{copy.resolutionDetails}</span>
                <span className="text-center">{copy.photos}</span>
                <span />
              </div>
              <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white lg:rounded-t-none">
              {visibleRows.map((ticket) => {
                const imageEntries = getTicketAttachmentEntries(ticket)
                  .filter((entry) => isImageAttachmentUrl(entry.url));
                const resolutionNote = getTicketDisplayNote(ticket);
                const ticketNumber = ticket.ticket_no || `T${String(ticket.id || "").slice(-8).toUpperCase() || "-"}`;
                const reporterName = ticket.reporter_name || copy.notProvided;
                const reporterDepartment = ticket.reporter_dept || ticket.department || copy.workList.unknownDepartment;
                const technicianName = ticket.assigned_name || copy.unassigned;
                const formatDateTime = (value, fallback) => {
                  const parsed = parseDate(value);
                  return parsed ? dateTimeFormatter.format(parsed) : fallback;
                };
                const timeline = [
                  { label: copy.reportedAt, value: formatDateTime(ticket.created_at, copy.notProvided), active: Boolean(ticket.created_at) },
                  { label: copy.startedAt, value: formatDateTime(ticket.started_at, copy.notStarted), active: Boolean(ticket.started_at) },
                  { label: copy.closedAt, value: formatDateTime(ticket.closed_at, copy.notClosed), active: Boolean(ticket.closed_at), closed: Boolean(ticket.closed_at) },
                ];
                const rowId = String(ticket.id || ticketNumber);
                const isExpanded = expandedTicketId === rowId;
                return (
                  <article key={rowId} className={isExpanded ? "bg-blue-50/30" : "bg-white"}>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      title={isExpanded ? copy.hideDetails : copy.showDetails}
                      onClick={() => setExpandedTicketId((current) => current === rowId ? null : rowId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setExpandedTicketId((current) => current === rowId ? null : rowId);
                        }
                      }}
                      className="grid cursor-pointer gap-3 px-4 py-4 outline-none transition hover:bg-blue-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 lg:grid-cols-[150px_170px_170px_minmax(260px,1fr)_80px_32px] lg:items-center"
                    >
                      <div>
                        <p className="mb-1 text-xs font-bold text-slate-500 lg:hidden">{copy.timeline}</p>
                        <p className="text-sm font-bold text-slate-900">{formatDateTime(ticket.created_at, copy.notProvided)}</p>
                        <div className="mt-2"><StatusBadge status={ticket.status} copy={copy.workList} /></div>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 flex items-center gap-1 text-xs font-bold text-blue-700 lg:hidden"><UserRound size={13} />{copy.reporter}</p>
                        <p className="truncate text-base font-bold text-slate-900">{reporterName}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{reporterDepartment}</p>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 flex items-center gap-1 text-xs font-bold text-emerald-700 lg:hidden"><Wrench size={13} />{copy.technician}</p>
                        <p className="truncate text-base font-bold text-slate-900">{technicianName}</p>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-xs font-bold text-slate-500 lg:hidden">{copy.resolutionDetails}</p>
                        <p className="truncate text-sm font-bold text-slate-900">{ticket.title || ticket.category || ticket.service_type || ticketNumber}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{resolutionNote || ticket.description || copy.noDescription}</p>
                      </div>

                      <div className="flex items-center lg:justify-center">
                        <p className="mr-3 text-xs font-bold text-slate-500 lg:hidden">{copy.photos}</p>
                        {imageEntries.length ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPreviewImage({ entries: imageEntries, index: 0, ticketTitle: ticket.title });
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                            className="group relative h-14 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white"
                            title={copy.openPhoto}
                          >
                            <img src={imageEntries[0].url} alt={ticket.title || copy.photos} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                            {imageEntries.length > 1 ? <span className="absolute bottom-0 right-0 rounded-tl-md bg-slate-950/75 px-1.5 py-0.5 text-[10px] font-bold text-white">+{imageEntries.length - 1}</span> : null}
                          </button>
                        ) : <ImageIcon size={22} className="text-slate-300" />}
                      </div>

                      <ChevronDown size={20} className={`justify-self-end text-slate-400 transition-transform lg:justify-self-center ${isExpanded ? "rotate-180 text-blue-700" : ""}`} />
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-blue-100 bg-slate-50 px-4 py-4 sm:px-5">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <section>
                            <p className="flex items-center gap-2 text-sm font-bold text-slate-700"><FileText size={16} className="text-blue-700" />{copy.problemDetails}</p>
                            <p className="mt-2 whitespace-pre-line rounded-lg bg-white p-3 text-base leading-6 text-slate-800 ring-1 ring-slate-200">{ticket.description || copy.noDescription}</p>
                          </section>
                          <section>
                            <p className="flex items-center gap-2 text-sm font-bold text-emerald-700"><Wrench size={16} />{copy.resolutionDetails}</p>
                            <p className={`mt-2 whitespace-pre-line rounded-lg bg-white p-3 text-base leading-6 ring-1 ${resolutionNote ? "text-slate-800 ring-emerald-200" : "text-slate-400 ring-slate-200"}`}>{resolutionNote || copy.noResolution}</p>
                          </section>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          {timeline.map((item) => (
                            <div key={item.label} className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200">
                              <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                              <p className={`mt-1 text-sm font-bold ${item.closed ? "text-emerald-700" : item.active ? "text-slate-900" : "text-slate-400"}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>

                        {imageEntries.length ? (
                          <section className="mt-4">
                            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><ImageIcon size={16} className="text-blue-700" />{copy.photos}</p>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                              {imageEntries.map((entry, imageIndex) => (
                                <button key={`${entry.url}-${imageIndex}`} type="button" onClick={() => setPreviewImage({ entries: imageEntries, index: imageIndex, ticketTitle: ticket.title })} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white" title={copy.openPhoto}>
                                  <img src={entry.url} alt={entry.name || ticket.title || copy.photos} className="h-20 w-full object-cover transition group-hover:scale-105" loading="lazy" />
                                  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/40 group-hover:opacity-100"><ZoomIn size={18} /></span>
                                </button>
                              ))}
                            </div>
                          </section>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><CheckCircle2 size={22} /></span>
              <p className="mt-3 text-sm font-medium text-slate-500">{detail.emptyLabel}</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-center text-[11px] font-semibold text-slate-500 sm:text-left">
            {copy.page} {formatter.format(safePage)} / {formatter.format(totalPages)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage <= 1} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronLeft size={15} />{copy.previous}
            </button>
            <button type="button" onClick={() => onPageChange(safePage + 1)} disabled={safePage >= totalPages} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
              {copy.next}<ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {previewEntry ? (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-slate-950/90 p-4" onClick={() => setPreviewImage(null)}>
          <button type="button" onClick={() => setPreviewImage(null)} className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label={copy.closePhoto}>
            <X size={22} />
          </button>
          {previewImage.entries.length > 1 ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); setPreviewImage((current) => ({ ...current, index: (current.index - 1 + current.entries.length) % current.entries.length })); }} className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6" aria-label={copy.previous}>
              <ChevronLeft size={26} />
            </button>
          ) : null}
          <div className="max-h-[90vh] max-w-[80vw]" onClick={(event) => event.stopPropagation()}>
            <img src={previewEntry.url} alt={previewEntry.name || previewImage.ticketTitle || copy.photos} className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl" />
            <p className="mt-3 text-center text-xs font-semibold text-white/80">
              {previewEntry.name || previewImage.ticketTitle || copy.photos}
              {previewImage.entries.length > 1 ? ` · ${previewImage.index + 1}/${previewImage.entries.length}` : ""}
            </p>
          </div>
          {previewImage.entries.length > 1 ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); setPreviewImage((current) => ({ ...current, index: (current.index + 1) % current.entries.length })); }} className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6" aria-label={copy.next}>
              <ChevronRight size={26} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ReportsHomePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("180");
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [metricDetailPage, setMetricDetailPage] = useState(1);
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
  const workspaceRoute = resolveWorkspaceRoute(currentRole || "user");

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
      year: "numeric",
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
  const receivedDetails = useMemo(
    () => [...periodTickets]
      .sort((left, right) => (getTicketDate(right)?.getTime() || 0) - (getTicketDate(left)?.getTime() || 0)),
    [periodTickets],
  );
  const completedDetails = useMemo(
    () => [...completedInPeriod]
      .sort((left, right) => (getTicketDate(right, "closed")?.getTime() || 0) - (getTicketDate(left, "closed")?.getTime() || 0)),
    [completedInPeriod],
  );
  const waitingDetails = useMemo(
    () => [...waitingTickets]
      .sort((left, right) => (getTicketDate(right)?.getTime() || 0) - (getTicketDate(left)?.getTime() || 0)),
    [waitingTickets],
  );

  useEffect(() => {
    setMetricDetailPage(1);
  }, [selectedMetric, period]);

  const metricDetails = {
    received: {
      title: tt("metricDetails.receivedTitle"),
      emptyLabel: tt("metricDetails.receivedEmpty"),
      rows: receivedDetails,
      mode: "received",
    },
    completed: {
      title: tt("metricDetails.completedTitle"),
      emptyLabel: tt("metricDetails.completedEmpty"),
      rows: completedDetails,
      mode: "completed",
    },
    inProgress: {
      title: tt("metricDetails.inProgressTitle"),
      emptyLabel: tt("metricDetails.inProgressEmpty"),
      rows: activeTickets,
      mode: "active",
    },
    waiting: {
      title: tt("metricDetails.waitingTitle"),
      emptyLabel: tt("metricDetails.waitingEmpty"),
      rows: waitingDetails,
      mode: "waiting",
    },
  };
  const selectedMetricDetail = selectedMetric ? metricDetails[selectedMetric] : null;

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

  return (
    <>
      <ReportsTopbar
        currentUser={currentUser}
      />

      <main className="space-y-3">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
            <div className="h-0.5 bg-blue-700" />
            <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">{tt("page.eyebrow")}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{tt("page.title")}</h1>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {loading && !overviewData
                      ? tt("page.loading")
                      : `${tt("page.updated")}: ${updatedAt ? dateTimeFormatter.format(updatedAt) : "-"}`}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 max-w-2xl text-xs leading-5 text-slate-500">{tt("page.description")}</p>
              </div>
              <div className="flex items-end gap-2">
                <label className="block min-w-0 flex-1 sm:flex-none">
                  <span className="mb-1 block text-[10px] font-semibold text-slate-600">{tt("page.periodLabel")}</span>
                  <span className="relative block">
                    <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={period}
                      onChange={(event) => setPeriod(event.target.value)}
                      className="h-9 w-full min-w-[160px] rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                  {tt("page.refresh")}
                </button>
              </div>
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
                  active={selectedMetric === "received"}
                  actionLabel={tt("metricDetails.action")}
                  onClick={() => setSelectedMetric((current) => current === "received" ? null : "received")}
                />
                <MetricCard
                  icon={TicketCheck}
                  label={tt("metrics.completed")}
                  value={formatter.format(completedInPeriod.length)}
                  hint={tt("metrics.completedHint")}
                  tone="green"
                  loading={loading && !overviewData}
                  active={selectedMetric === "completed"}
                  actionLabel={tt("metricDetails.action")}
                  onClick={() => setSelectedMetric((current) => current === "completed" ? null : "completed")}
                />
                <MetricCard
                  icon={Clock3}
                  label={tt("metrics.inProgress")}
                  value={formatter.format(activeTickets.length)}
                  hint={tt("metrics.inProgressHint")}
                  tone="amber"
                  loading={loading && !overviewData}
                  active={selectedMetric === "inProgress"}
                  actionLabel={tt("metricDetails.action")}
                  onClick={() => setSelectedMetric((current) => current === "inProgress" ? null : "inProgress")}
                />
                <MetricCard
                  icon={ClipboardCheck}
                  label={tt("metrics.waiting")}
                  value={formatter.format(waitingTickets.length)}
                  hint={tt("metrics.waitingHint")}
                  tone="slate"
                  loading={loading && !overviewData}
                  active={selectedMetric === "waiting"}
                  actionLabel={tt("metricDetails.action")}
                  onClick={() => setSelectedMetric((current) => current === "waiting" ? null : "waiting")}
                />
              </section>

              {selectedMetricDetail ? (
                <MetricDetailPanel
                  detail={selectedMetricDetail}
                  page={metricDetailPage}
                  onPageChange={setMetricDetailPage}
                  onClose={() => setSelectedMetric(null)}
                  formatter={formatter}
                  dateTimeFormatter={dateTimeFormatter}
                  copy={{
                    close: tt("metricDetails.close"),
                    total: tt("metricDetails.total"),
                    previous: tt("metricDetails.previous"),
                    next: tt("metricDetails.next"),
                    page: tt("metricDetails.page"),
                    photos: tt("metricDetails.photos"),
                    noPhotos: tt("metricDetails.noPhotos"),
                    openPhoto: tt("metricDetails.openPhoto"),
                    closePhoto: tt("metricDetails.closePhoto"),
                    ticketNumber: tt("metricDetails.ticketNumber"),
                    problemDetails: tt("metricDetails.problemDetails"),
                    noDescription: tt("metricDetails.noDescription"),
                    resolutionDetails: tt("metricDetails.resolutionDetails"),
                    noResolution: tt("metricDetails.noResolution"),
                    reporter: tt("metricDetails.reporter"),
                    technician: tt("metricDetails.technician"),
                    unassigned: tt("metricDetails.unassigned"),
                    employeeId: tt("metricDetails.employeeId"),
                    department: tt("metricDetails.department"),
                    location: tt("metricDetails.location"),
                    phone: tt("metricDetails.phone"),
                    email: tt("metricDetails.email"),
                    category: tt("metricDetails.category"),
                    serviceType: tt("metricDetails.serviceType"),
                    channel: tt("metricDetails.channel"),
                    priority: tt("metricDetails.priority"),
                    assetCode: tt("metricDetails.assetCode"),
                    timeline: tt("metricDetails.timeline"),
                    reportedAt: tt("metricDetails.reportedAt"),
                    startedAt: tt("metricDetails.startedAt"),
                    updatedAt: tt("metricDetails.updatedAt"),
                    closedAt: tt("metricDetails.closedAt"),
                    notStarted: tt("metricDetails.notStarted"),
                    notClosed: tt("metricDetails.notClosed"),
                    notProvided: tt("metricDetails.notProvided"),
                    beforePhoto: tt("metricDetails.beforePhoto"),
                    afterPhoto: tt("metricDetails.afterPhoto"),
                    showDetails: tt("metricDetails.showDetails"),
                    hideDetails: tt("metricDetails.hideDetails"),
                    workList: {
                      closed: tt("deeper.closed"),
                      progress: tt("deeper.progress"),
                      new: tt("deeper.new"),
                      unassigned: tt("activity.unassigned"),
                      unknownDepartment: tt("activity.unknownDepartment"),
                    },
                  }}
                />
              ) : null}

              <section className="grid gap-3 xl:grid-cols-[1.45fr_0.8fr_0.9fr]">
                <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
                  <PanelHeading
                    eyebrow={tt("performance.eyebrow")}
                    title={tt("performance.title")}
                    subtitle={tt("performance.subtitle")}
                    action={(
                      <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-slate-400" />{tt("performance.received")}</span>
                        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-blue-700" />{tt("performance.completed")}</span>
                      </div>
                    )}
                  />
                  <div className="grid lg:grid-cols-[minmax(0,1fr)_190px]">
                    <PerformanceChart
                      data={trendData}
                      copy={{
                        received: tt("performance.received"),
                        completed: tt("performance.completed"),
                      }}
                      formatter={formatter}
                    />
                    <aside className="border-t border-slate-200 bg-slate-50/60 p-4 lg:border-l lg:border-t-0">
                      <p className="text-[11px] font-semibold text-slate-600">{tt("performance.completionRate")}</p>
                      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{completionRate}%</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.min(completionRate, 100)}%` }} />
                      </div>
                      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-medium text-slate-500">{tt("performance.completedThisPeriod")}</p>
                        <p className="mt-0.5 text-xl font-bold text-emerald-700">{formatter.format(completedFromReceived)}</p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-slate-500">{tt("performance.fromReceived")}</p>
                      </div>
                    </aside>
                  </div>
                </article>

                <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
                  <PanelHeading eyebrow={tt("deeper.eyebrow")} title={tt("deeper.statusTitle")} />
                  <StatusDonut
                    data={statusData}
                    total={periodTickets.length}
                    copy={{ total: tt("deeper.total") }}
                    formatter={formatter}
                  />
                </article>

                <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
                  <PanelHeading eyebrow={tt("deeper.eyebrow")} title={tt("deeper.categoryTitle")} />
                  <CategoryBars data={categoryData} formatter={formatter} emptyLabel={tt("deeper.noData")} />
                </article>
              </section>

              <section className="grid gap-3 xl:grid-cols-2">
                  <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
                    <PanelHeading
                      eyebrow={tt("activity.eyebrow")}
                      title={`${tt("activity.activeTitle")} (${formatter.format(activeTickets.length)})`}
                      subtitle={tt("activity.activeHint")}
                    />
                    <WorkList
                      rows={activeTickets.slice(0, 3)}
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
                    <Link to={workspaceRoute} className="flex items-center justify-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50">
                      {tt("activity.viewAll")}<ArrowRight size={13} />
                    </Link>
                  </article>
                  <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
                    <PanelHeading
                      eyebrow={tt("activity.eyebrow")}
                      title={tt("activity.completedTitle")}
                      subtitle={tt("activity.completedHint")}
                    />
                    <WorkList
                      rows={recentlyCompleted.slice(0, 3)}
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
                    <Link to={workspaceRoute} className="flex items-center justify-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50">
                      {tt("activity.viewAll")}<ArrowRight size={13} />
                    </Link>
                  </article>
              </section>
            </>
          ) : null}

          <footer className="flex items-center justify-center gap-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            <BarChart3 size={13} />TDK IT Operations Reporting
          </footer>
      </main>
    </>
  );
}
