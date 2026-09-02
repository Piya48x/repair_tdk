import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
// ^^^ à¸•à¹‰à¸­à¸‡à¸¡à¸µ useRef à¸­à¸¢à¸¹à¹ˆà¸•à¸£à¸‡à¸™à¸µà¹‰à¸”à¹‰à¸§à¸¢
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/LanguageProvider";
import {
  LogOut, Wrench, Package, Laptop, ChevronRight,
  ChevronDown, ChevronUp,
  User, Briefcase, Building2, ExternalLink, Clock, CheckCircle2,
  AlertCircle, Plus, Search, RefreshCw,
  BarChart3, Calendar, Hash, Shield,
  Timer, ShieldCheck, Mail, Phone, MapPin, Settings,
  SlidersHorizontal, BookmarkPlus, Trash2, Moon, Sun, MessageSquare, FileText, DoorOpen, KeyRound, X, Menu, ScanLine
} from "lucide-react";
import Swal from "sweetalert2";
import { format, formatDistanceToNow } from "date-fns";
import { DATE_FNS_LOCALES } from "../i18n/config";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DASHBOARD_THEME_KEY,
  SMART_FILTER_PRESET_KEY,
  getFilterOptions as getLocalizedFilterOptions,
  getPriorityConfig as getLocalizedPriorityConfig,
  getPriorityFilterOptions as getLocalizedPriorityFilterOptions,
  getRoleBasedViews as getLocalizedRoleBasedViews,
  getRoleLabels as getLocalizedRoleLabels,
  getSlaFilterOptions as getLocalizedSlaFilterOptions,
  getStatusConfig as getLocalizedStatusConfig,
  getSlaState,
  resolveCategoryIcon,
} from "./dashboard/constants";
import TicketDetailModal from "./dashboard/components/TicketDetailModal";
import ProfileImageModal from "./dashboard/components/ProfileImageModal";
import LogoutConfirmModal from "./dashboard/components/LogoutConfirmModal";
import DashboardGlobalStyles from "./dashboard/components/DashboardGlobalStyles";
import SupportSection from "./dashboard/components/SupportSection";
import AssetViewScannerModal, { extractAssetTagFromQr } from "./it-dashboard/components/AssetViewScannerModal";
import CentralChatDock from "../components/CentralChatDock";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import { loadMyNotebookBorrowLogs, NOTEBOOK_LOG_STATUS } from "../services/notebookBorrowService";
import { isPickUpEquipmentRequest, splitTicketBuckets } from "../lib/serviceRequestUtils";
import { getTicketDisplayNote } from "../lib/ticketAttachmentMetadata";
import {
  getTicketStatusDetailMeta,
  getTicketStatusLabel,
} from "../lib/ticketRepairStatus";
import tdkLogo from "../../src/assets/2.png";

const MEETING_ROOMS = ["Room A", "Room B", "Room C", "Room D"];
const MEETING_DAY_START_MINUTES = 8 * 60;
const MEETING_DAY_END_MINUTES = 18 * 60;
const ACCESS_REQUEST_STATUS = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

const NAV_MORE_LINKS = [
  {
    id: "groupware-tdk",
    label: "Groupware TDK",
    description: "ไปยังระบบ Groupware",
    href: "http://gw2.e-dk.co.kr/LoginInfo/",
  },
  {
    id: "e-business-plus",
    label: "E-Business Plus",
    description: "ไปยังระบบ E-Business Plus",
    href: "http://hr.tdk.co.th/TDK/Login.aspx",
  },
  {
    id: "other-placeholder",
    label: "อื่นๆ",
    description: "ใส่อื่นๆไว้ก่อน",
    href: "",
  },
];

const DASHBOARD_TRANSLATIONS = {
  th: {
    statusBar: {
      skipToContent: "ข้ามไปยังเนื้อหาหลัก",
      systemReady: "ระบบพร้อมใช้งาน",
      dataSource: "แหล่งข้อมูล: Supabase Realtime",
      loading: "กำลังโหลด...",
      role: "บทบาท",
      refreshData: "รีเฟรชข้อมูล",
      auditLog: "Audit Log",
    },
    nav: {
      meetingRoomStatus: "สถานะห้องประชุม",
      recentActivity: "กิจกรรมล่าสุด",
      borrowRequests: "รายการเบิกของ",
      moreMenu: "เมนูอื่นๆ",
      statusOverview: "ภาพรวมสถานะ",
      newTicket: "แจ้งซ่อมใหม่",
      notSpecified: "ไม่ระบุ",
      notSpecifiedDepartment: "ไม่ระบุแผนก",
    },
    quickActions: {
      active: "เปิดใช้งาน",
      startChat: "เริ่มแชท",
      scanAsset: {
        label: "สแกน QR อุปกรณ์",
        description: "ดูข้อมูลอุปกรณ์และแจ้งซ่อมพร้อมผูก Asset Code อัตโนมัติ",
        cta: "เริ่มสแกน",
      },
      createTicket: {
        label: "แจ้งซ่อม IT",
        description: "รายงานปัญหาและติดตามผลตาม SLA",
        cta: "ดำเนินการทันที",
      },
      pickup: {
        label: "เบิกอุปกรณ์",
        description: "ขออุปกรณ์หรือวัสดุสิ้นเปลืองผ่าน workflow",
        cta: "ตรวจสอบสต็อก",
      },
      myBorrowRequests: {
        label: "การเบิกของคุณ",
        description: "ดูสถานะและประวัติการเบิกของแยกจากงานแจ้งซ่อม",
        cta: "เปิดรายการเบิก",
      },
      notebook: {
        label: "การยืมคืน notebook",
        description: "เปิดหน้า Notebook Center สำหรับยืม-คืน notebook",
        cta: "เปิดหน้า Notebook",
      },
      workNotes: {
        label: "โน้ตงาน / Work Notes",
        description: "บันทึกงาน วางแผนงาน และตั้งเตือนความจำส่วนตัว",
        cta: "เปิดหน้าโน้ต",
      },
      meetingRoom: {
        label: "จองห้องประชุม",
        description: "จองห้องประชุมและจัดตารางเวลาการใช้งาน",
        cta: "เปิดหน้าจอง",
      },
      history: {
        label: "ประวัติ Ticket",
        description: "ค้นหาและติดตาม Ticket ที่เคยแจ้งทั้งหมด",
        cta: "เปิดรายการ",
      },
      chatIt: {
        label: "แชท IT / แจ้งปัญหาด่วน",
        description: "คุยกับทีม IT แบบ realtime",
        cta: "เริ่มแชท",
      },
      myStatus: {
        label: "สถานะของฉัน / ดู notebook, ticket และคำขอ",
        description: "สรุปสถานะทั้งหมดในหน้าเดียว",
        cta: "เปิดสถานะ",
      },
      accessRequest: {
        label: "ขอสิทธิ์ระบบ",
        description: "ส่งคำขอสิทธิ์ ERP, Shared Folder, Email Group หรือ Software",
        cta: "เปิดฟอร์มคำขอ",
      },
      adminDashboard: {
        label: "แดชบอร์ดช่างเทคนิค",
        description: "จัดคิวงาน, SLA และการมอบหมายระดับ IT",
        cta: "เข้าสู่โหมดช่าง",
      },
      auditView: {
        label: "มุมมองตรวจสอบ",
        description: "ตรวจสอบ Log และรายงานเพื่อการกำกับดูแล",
        cta: "เปิดมุมมองตรวจสอบ",
      },
    },
    activity: {
      allCategories: "ทุกหมวดหมู่",
      searchByHint: "ค้นหาได้จาก: เลขงาน, หัวข้อ, รายละเอียด, หมวดหมู่, สถานที่, สถานะ, ความเร่งด่วน",
      selectSavedView: "เลือกมุมมองที่บันทึกไว้",
      applyView: "ใช้มุมมอง",
      saveView: "บันทึกมุมมอง",
      clearFilters: "ล้างตัวกรอง",
      tapCard: "แตะการ์ดเพื่อเปิดรายละเอียดทันที",
      selectTicket: "เลือก Ticket เพื่อดูสรุปด้านล่าง หรือเปิดรายละเอียดเต็มได้ทันที",
      viewAllHistory: "ดูประวัติทั้งหมด ({{count}} รายการ)",
      fullDetails: "เปิดรายละเอียดเต็ม",
      noSelectedTicket: "ยังไม่มีรายการที่เลือก",
      selectTicketAbove: "เลือก Ticket จากรายการด้านบนเพื่อดูรายละเอียด",
      noTicketsFound: "ไม่พบรายการแจ้งซ่อม",
      noTicketsForCurrentSmartFilter: "ไม่พบรายการที่ตรงกับ Smart Filter ปัจจุบัน",
      startFirstTicket: "เริ่มต้นใช้งานระบบโดยการแจ้งซ่อมครั้งแรกของคุณ",
      noTitle: "ไม่มีหัวข้อ",
      noCategory: "ไม่ระบุหมวดหมู่",
      noDescription: "ไม่มีรายละเอียด",
      timeline: "ไทม์ไลน์กิจกรรม",
    },
    navMore: {
      "groupware-tdk": "Groupware TDK",
      "e-business-plus": "E-Business Plus",
      "other-placeholder": "อื่นๆ",
    },
  },
  en: {
    statusBar: {
      skipToContent: "Skip to main content",
      systemReady: "System ready",
      dataSource: "Data source: Supabase Realtime",
      loading: "Loading...",
      role: "Role",
      refreshData: "Refresh data",
      auditLog: "Audit Log",
    },
    nav: {
      meetingRoomStatus: "Meeting Room Status",
      recentActivity: "Recent Activity",
      borrowRequests: "Borrow Requests",
      moreMenu: "More Menu",
      statusOverview: "Status overview",
      newTicket: "New Ticket",
      notSpecified: "Not specified",
      notSpecifiedDepartment: "No department",
    },
    quickActions: {
      active: "Open",
      startChat: "Start chat",
      scanAsset: {
        label: "Scan Asset QR",
        description: "View the asset and create a repair ticket with its Asset Code linked automatically",
        cta: "Scan now",
      },
      createTicket: {
        label: "Report IT Issue",
        description: "Report a problem and track progress by SLA",
        cta: "Take action",
      },
      pickup: {
        label: "Equipment Request",
        description: "Request equipment or consumables through a workflow",
        cta: "Check stock",
      },
      myBorrowRequests: {
        label: "Your Requests",
        description: "Track equipment requests separately from repair tickets",
        cta: "Open request list",
      },
      notebook: {
        label: "Notebook Borrowing",
        description: "Open Notebook Center for borrow and return flows",
        cta: "Open Notebook page",
      },
      workNotes: {
        label: "Work Notes",
        description: "Track work, plans, and personal reminders",
        cta: "Open notes",
      },
      meetingRoom: {
        label: "Meeting Room Booking",
        description: "Book meeting rooms and manage schedules",
        cta: "Open booking",
      },
      history: {
        label: "Ticket History",
        description: "Search and track all tickets you created",
        cta: "Open list",
      },
      chatIt: {
        label: "IT Chat / Urgent Support",
        description: "Talk to the IT team in real time",
        cta: "Start chat",
      },
      myStatus: {
        label: "My Status",
        description: "See notebook, ticket, and request status in one place",
        cta: "Open status",
      },
      accessRequest: {
        label: "Access Request",
        description: "Submit ERP, shared folder, email group, or software access requests",
        cta: "Open request form",
      },
      adminDashboard: {
        label: "Technician Dashboard",
        description: "Manage queue, SLA, and IT assignment flow",
        cta: "Open technician mode",
      },
      auditView: {
        label: "Audit View",
        description: "Review logs and reports for governance",
        cta: "Open audit view",
      },
    },
    activity: {
      allCategories: "All categories",
      searchByHint: "Search by ticket no, title, description, category, location, status, or priority",
      selectSavedView: "Select a saved view",
      applyView: "Apply view",
      saveView: "Save view",
      clearFilters: "Clear filters",
      tapCard: "Tap a card to open details immediately",
      selectTicket: "Select a ticket to see the summary below or open full details immediately",
      viewAllHistory: "View all history ({{count}} items)",
      fullDetails: "Open full details",
      noSelectedTicket: "No ticket selected",
      selectTicketAbove: "Select a ticket from the list above to view details",
      noTicketsFound: "No tickets found",
      noTicketsForCurrentSmartFilter: "No items match the current smart filter",
      startFirstTicket: "Start by creating your first ticket",
      noTitle: "Untitled",
      noCategory: "Uncategorized",
      noDescription: "No description",
      timeline: "Activity Timeline",
    },
    navMore: {
      "groupware-tdk": "Groupware TDK",
      "e-business-plus": "E-Business Plus",
      "other-placeholder": "Others",
    },
  },
  ko: {
    statusBar: {
      skipToContent: "본문으로 바로가기",
      systemReady: "시스템 정상",
      dataSource: "데이터 소스: Supabase Realtime",
      loading: "불러오는 중...",
      role: "역할",
      refreshData: "데이터 새로고침",
      auditLog: "감사 로그",
    },
    nav: {
      meetingRoomStatus: "회의실 현황",
      recentActivity: "최근 활동",
      borrowRequests: "장비 요청 목록",
      moreMenu: "추가 메뉴",
      statusOverview: "상태 개요",
      newTicket: "새 티켓",
      notSpecified: "미지정",
      notSpecifiedDepartment: "부서 미지정",
    },
    quickActions: {
      active: "열기",
      startChat: "채팅 시작",
      scanAsset: {
        label: "자산 QR 스캔",
        description: "자산 정보를 확인하고 Asset Code가 자동 연결된 수리 티켓을 생성합니다",
        cta: "스캔 시작",
      },
      createTicket: {
        label: "IT 문제 접수",
        description: "문제를 접수하고 SLA 기준으로 진행 상태를 추적합니다",
        cta: "바로 진행",
      },
      pickup: {
        label: "장비 요청",
        description: "워크플로우로 장비나 소모품을 요청합니다",
        cta: "재고 확인",
      },
      myBorrowRequests: {
        label: "내 장비 요청",
        description: "수리 티켓과 분리된 장비 요청 현황을 확인합니다",
        cta: "요청 목록 열기",
      },
      notebook: {
        label: "노트북 대여/반납",
        description: "Notebook Center에서 대여와 반납을 처리합니다",
        cta: "노트북 페이지 열기",
      },
      workNotes: {
        label: "업무 노트",
        description: "업무, 계획, 개인 리마인더를 관리합니다",
        cta: "노트 열기",
      },
      meetingRoom: {
        label: "회의실 예약",
        description: "회의실을 예약하고 사용 일정을 관리합니다",
        cta: "예약 열기",
      },
      history: {
        label: "티켓 이력",
        description: "등록한 모든 티켓을 검색하고 추적합니다",
        cta: "목록 열기",
      },
      chatIt: {
        label: "IT 채팅 / 긴급 지원",
        description: "IT 팀과 실시간으로 대화합니다",
        cta: "채팅 시작",
      },
      myStatus: {
        label: "내 상태",
        description: "노트북, 티켓, 요청 상태를 한 곳에서 봅니다",
        cta: "상태 열기",
      },
      accessRequest: {
        label: "권한 요청",
        description: "ERP, 공유 폴더, 메일 그룹, 소프트웨어 권한을 요청합니다",
        cta: "요청 폼 열기",
      },
      adminDashboard: {
        label: "기술자 대시보드",
        description: "작업 대기열, SLA, IT 배정 흐름을 관리합니다",
        cta: "기술자 모드 열기",
      },
      auditView: {
        label: "감사 보기",
        description: "거버넌스를 위한 로그와 보고서를 검토합니다",
        cta: "감사 화면 열기",
      },
    },
    activity: {
      allCategories: "전체 카테고리",
      searchByHint: "티켓 번호, 제목, 설명, 카테고리, 위치, 상태, 우선순위로 검색할 수 있습니다",
      selectSavedView: "저장된 보기 선택",
      applyView: "보기 적용",
      saveView: "보기 저장",
      clearFilters: "필터 초기화",
      tapCard: "카드를 탭하면 바로 상세를 엽니다",
      selectTicket: "티켓을 선택하면 아래 요약을 보거나 전체 상세를 바로 열 수 있습니다",
      viewAllHistory: "전체 이력 보기 ({{count}}건)",
      fullDetails: "전체 상세 열기",
      noSelectedTicket: "선택된 티켓이 없습니다",
      selectTicketAbove: "위 목록에서 티켓을 선택해 상세를 확인하세요",
      noTicketsFound: "티켓을 찾을 수 없습니다",
      noTicketsForCurrentSmartFilter: "현재 스마트 필터와 일치하는 항목이 없습니다",
      startFirstTicket: "첫 티켓을 등록해서 시작하세요",
      noTitle: "제목 없음",
      noCategory: "카테고리 없음",
      noDescription: "설명 없음",
      timeline: "활동 타임라인",
    },
    navMore: {
      "groupware-tdk": "Groupware TDK",
      "e-business-plus": "E-Business Plus",
      "other-placeholder": "기타",
    },
  },
};

const DASHBOARD_RUNTIME_TEXT = {
  th: {
    ticketStatusLabels: {
      NEW: "รอดำเนินการ",
      IN_PROGRESS: "กำลังซ่อม",
      CLOSED: "สำเร็จ",
    },
    notifications: {
      assignedTitle: "IT รับเคสแล้ว",
      assignedMessage: "{{ticketNo}} มอบหมายให้ {{assignee}}",
      startedTitle: "IT เริ่มดำเนินการแล้ว",
      startedMessage: "{{ticketNo}} อยู่ระหว่างซ่อม{{assigneeText}}",
      startedBy: " โดย {{assignee}}",
      closedTitle: "งานเสร็จเรียบร้อยแล้ว",
      closedMessageWithNote: "{{ticketNo}} ปิดงานแล้ว: {{note}}",
      closedMessage: "{{ticketNo}} ปิดงานเรียบร้อยแล้ว",
      updatedTitle: "Ticket อัปเดตสถานะ",
      updatedMessage: "{{ticketNo}} เปลี่ยนเป็น {{status}}",
    },
    common: {
      loading: "กำลังโหลด...",
      recently: "ไม่นานมานี้",
      notSpecified: "ไม่ระบุ",
      noEmail: "ไม่ระบุอีเมล",
      noPhone: "ไม่ระบุเบอร์โทรศัพท์",
      noLocation: "ไม่ระบุสถานที่",
      noName: "ไม่พบชื่อ",
      employee: "พนักงาน",
      bookingTitle: "มีการจอง",
      noBookedBy: "ไม่ระบุผู้จอง",
      noSystem: "ไม่ระบุระบบ",
      noDescription: "ไม่มีรายละเอียด",
      noNextBooking: "ไม่มีคิวถัดไป",
      noMeetingToday: "วันนี้ห้องประชุมว่าง",
      partialLoadError: "มีปัญหาในการโหลดข้อมูลบางส่วน",
      retryLoad: "ลองโหลดอีกครั้ง",
      comparePrevious7Days: "เทียบ 7 วันก่อน",
      currentStatus: "สถานะปัจจุบัน",
      sync: "ซิงก์",
      fullView: "ดูภาพเต็ม",
      items: "รายการ",
      amount: "จำนวน",
      loadingDashboard: "กำลังเตรียมข้อมูล Dashboard...",
      quickActionsTitle: "ทางลัดด่วน",
      quickActionsSubtitle: "ทางลัดหลักของระบบสำหรับงานที่ใช้บ่อยที่สุด",
      role: "บทบาท",
      active: "เปิดใช้งาน",
      moreMenu: "แสดงเมนูเพิ่มเติม",
      profileShow: "แสดงรายละเอียดโปรไฟล์",
      profileHide: "ซ่อนรายละเอียดโปรไฟล์",
      department: "แผนก",
      position: "ตำแหน่ง",
      close: "ปิด",
      profileInfo: "ข้อมูลที่ใช้ตอนสมัครสมาชิกพนักงาน",
      companyName: "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด",
      companyLogoAlt: "โลโก้ TDK Industrial",
      profileAlt: "โปรไฟล์",
      userFallback: "ผู้ใช้",
      live: "เรียลไทม์",
      closeNotification: "ปิดการแจ้งเตือน",
    },
    timeline: {
      createdLabel: "สร้างใบแจ้งซ่อม",
      createdDetail: "ระบบรับเรื่องเรียบร้อยและเริ่มนับ SLA",
      progressLabel: "อยู่ระหว่างดำเนินการ",
      assignedDetail: "ผู้รับผิดชอบ: {{name}}",
      waitingDetail: "กำลังรอช่างเข้าดำเนินการ",
      closedLabel: "ปิดงานสำเร็จ",
      closedDetail: "งานนี้ถูกปิดเรียบร้อยแล้ว",
      monitoringLabel: "ติดตาม SLA",
      statusDetail: "สถานะปัจจุบัน: {{status}}",
    },
    metrics: {
      statusNewLabel: "รอดำเนินการ",
      pendingShare: "{{percent}}% ของงานค้าง",
      statusProgressLabel: "กำลังซ่อม",
      statusClosedLabel: "ปิดงานแล้ว",
      totalLabel: "งานที่แจ้งทั้งหมด",
      totalShare: "{{percent}}% ของงานทั้งหมด",
      realtimeStatus: "อัปเดตสถานะล่าสุดแบบเรียลไทม์",
      open7dLabel: "งานเปิดใหม่ (7 วัน)",
      riskLabel: "งานเสี่ยง SLA",
      overdueLabel: "งานเกิน SLA",
      closed7dLabel: "งานปิดแล้ว (7 วัน)",
    },
    profile: {
      employeeId: "รหัสพนักงาน",
      email: "อีเมล",
      phone: "โทรศัพท์",
      location: "สถานที่",
    },
    errors: {
      meetingRoomLoad: "ไม่สามารถโหลดสถานะห้องประชุมได้",
      accessRequestLoad: "ไม่สามารถโหลดสถานะคำขอสิทธิ์ระบบได้",
      dashboardLoad: "ไม่สามารถโหลดข้อมูล Dashboard ได้ กรุณาลองใหม่อีกครั้ง",
    },
    preset: {
      title: "บันทึกมุมมองตัวกรอง",
      inputLabel: "ชื่อมุมมอง",
      inputPlaceholder: "เช่น งานด่วนของฉัน",
      confirm: "บันทึก",
      cancel: "ยกเลิก",
      validation: "กรุณาระบุชื่อมุมมอง",
    },
    sla: {
      overdue: "เลยกำหนด {{hours}} ชม.",
      atRisk: "เสี่ยงหลุดใน {{hours}} ชม.",
      remaining: "เหลือ {{hours}} ชม.",
    },
    kpiDetail: {
      statusNewTitle: "รอดำเนินการ",
      statusNewDescription: "Ticket ที่สร้างแล้วและยังรอเริ่มดำเนินการ",
      statusProgressTitle: "กำลังซ่อม",
      statusProgressDescription: "Ticket ที่ทีมกำลังดำเนินการอยู่ในตอนนี้",
      statusClosedTitle: "ปิดงานแล้ว",
      statusClosedDescription: "Ticket ที่ปิดเรียบร้อยแล้วทั้งหมด",
      statusTotalTitle: "งานที่แจ้งทั้งหมด",
      statusTotalDescription: "Ticket ทั้งหมดที่อยู่ในระบบ ณ ตอนนี้",
      openTitle: "งานเปิดใหม่ 7 วันล่าสุด",
      openDescription: "งานที่เปิดเข้ามาในรอบ 7 วันและยังไม่ปิด",
      riskTitle: "งานเสี่ยง SLA",
      riskDescription: "งานที่ยังไม่ปิดและมีความเสี่ยงหลุด SLA",
      overdueTitle: "งานเกิน SLA",
      overdueDescription: "งานที่เกิน SLA แล้วและควรเร่งติดตาม",
      closedTitle: "งานปิดแล้ว 7 วันล่าสุด",
      closedDescription: "งานที่ปิดสำเร็จในรอบ 7 วันที่ผ่านมา",
      modalLabel: "รายละเอียด KPI",
      closeAria: "ปิดรายละเอียด KPI",
      totalLabel: "จำนวนทั้งหมด",
      totalHelper: "รายการที่ตรงกับ KPI นี้",
      popupLabel: "แสดงใน popup",
      popupHelper: "สูงสุด 12 รายการล่าสุด",
      usageLabel: "วิธีใช้งาน",
      usageAction: "กดที่รายการเพื่อเปิดรายละเอียด ticket",
      usageHelper: "เหมาะสำหรับ drill-down จากตัวเลขสรุปทันที",
      updatedAt: "อัปเดต {{value}}",
      emptyTitle: "ยังไม่มีรายการใน KPI นี้",
      emptyDescription: "เมื่อมี ticket เข้ามาตรงเงื่อนไข ตัวเลขและรายการใน popup นี้จะอัปเดตตามทันที",
      footerHint: "KPI cards ด้านบนสามารถกดเพื่อเปิด popup ดูรายการย่อยได้ทันที",
      openHistory: "เปิดประวัติ Ticket",
    },
    operational: {
      notSpecifiedRoom: "ไม่ระบุห้อง",
      otherStatus: "สถานะอื่น",
      openTickets: "Ticket ค้าง",
      todayMeetings: "ประชุมวันนี้",
      accessPending: "สิทธิ์รออนุมัติ",
      pendingNotes: "โน้ตค้าง",
      noQueue: "ยังไม่มีคิว",
      uncategorized: "ไม่ระบุหมวดหมู่",
      openLabel: "งานค้างเปิด",
      openHelper: "{{newCount}} ใหม่ / {{progressCount}} กำลังซ่อม",
      progressLabel: "กำลังซ่อม",
      progressHelper: "ติดตามงานที่กำลังดำเนินการอยู่",
      slaLabel: "เสี่ยงหรือเกิน SLA",
      slaHelper: "{{count}} งานเกิน SLA แล้ว",
      meetingLabel: "ห้องใช้งานตอนนี้",
      meetingHelper: "จาก {{totalRooms}} ห้อง, วันนี้ {{count}} รายการ",
      notebookLabel: "Notebook ต้องติดตาม",
      notebookHelper: "คำขอยืม-คืนและรายการที่รอจัดการ",
      accessLabel: "สิทธิ์รออนุมัติ",
      accessHelper: "คำขอ workflow ที่ยังไม่ปิดงาน",
      title: "แดชบอร์ดปฏิบัติการ",
      subtitle: "ภาพรวมหน้างานแบบมินิ ดูคิวปัจจุบัน เทรนด์ 7 วัน และ workload ข้ามโมดูลในบล็อกเดียว",
      slaWatch: "เฝ้าระวัง SLA {{count}}",
      queueStatus: "สถานะคิว",
      queueOpenItems: "งานค้าง {{count}} รายการ",
      sevenDayMotion: "การเคลื่อนไหว 7 วัน",
      createdVsClosed: "เปิดใหม่เทียบกับปิดงาน",
      workloadMix: "สัดส่วนภาระงาน",
      followUpItems: "{{count}} รายการที่ต้องตาม",
      noExtraWorkload: "ยังไม่มี workload เพิ่มเติม",
      modalLabel: "ภาพรวม Dashboard",
      realtime: "เรียลไทม์",
      modalDescription: "สรุปข้อมูลปัจจุบันแบบสดในหน้าเดียว โดยไม่ต้องเปลี่ยน layout หลักของ dashboard เดิม",
      onTimeSla: "SLA ตรงเวลา {{percent}}%",
      riskOverdue: "เสี่ยง {{risk}} / เกิน SLA {{overdue}}",
      overlapCount: "พบเวลาจองซ้ำ {{count}} จุด",
      trendLabel: "แนวโน้ม Ticket 7 วันล่าสุด",
      trendTitle: "เปิดใหม่ vs ปิดงาน",
      rolling7Days: "ย้อนหลัง 7 วัน",
      lineCreated: "เปิดใหม่",
      lineClosed: "ปิดงาน",
      dateLabel: "วันที่ {{label}}",
      statusOverviewLabel: "ภาพรวมสถานะ Ticket",
      statusOverviewTitle: "สัดส่วนสถานะงานปัจจุบัน",
      liveQueue: "คิวสด",
      mixLabel: "สัดส่วนงานปัจจุบัน",
      mixTitle: "สัดส่วนงานที่กำลังเกิดขึ้น",
      liveLoad: "ภาระงานสด",
      watchlistLabel: "จุดเฝ้าดูตอนนี้",
      watchlistTitle: "จุดที่ควรจับตา",
      liveFeed: "ฟีดสด",
      roomsInUseNow: "ห้องที่กำลังใช้งาน",
      nextMeetingQueue: "คิวประชุมถัดไป",
      activeMeetingFallback: "มีการใช้งานห้องประชุม",
      noMeetingInUse: "ไม่มีการใช้ห้องประชุมในตอนนี้",
      topOpenCategories: "หมวดงานค้างสูงสุด",
      noOpenTickets: "ตอนนี้ยังไม่มีงานค้างเปิด",
      urgentTickets: "Ticket เร่งด่วน",
      noUrgentTickets: "ไม่มี ticket เร่งด่วนที่ต้องจับตา",
      footerHint: "เปิดดูภาพรวมปัจจุบันจาก nav ได้ทันที โดยไม่ต้องเลื่อนหาหลาย section ในหน้าเดิม",
      openHistory: "เปิดประวัติ Ticket",
    },
    meeting: {
      hiddenSubtitle: "สถานะห้องประชุมของวันนี้แบบเรียลไทม์สำหรับพนักงานทั้งองค์กร",
      openBooking: "ไปหน้าจองห้องประชุม",
      todayCount: "วันนี้: {{count}} รายการ",
      tomorrowCount: "พรุ่งนี้: {{count}} รายการ",
      upcomingCount: "ถัดไป: {{count}} รายการ",
      nextBooking: "คิวถัดไป: {{value}}",
      nextShort: "ถัดไป: {{value}}",
      overlapCount: "พบเวลาจองซ้ำ {{count}} จุด",
      todayBookings: "รายการจองวันนี้",
      roomStatusToday: "สถานะห้องประชุมวันนี้",
      upcomingBookings: "รายการจองถัดไป",
      latestActivity: "กิจกรรมล่าสุด",
      modalTitle: "สถานะห้องประชุมและกิจกรรมล่าสุด",
      modalSubtitle: "ติดตามห้องว่าง คิวถัดไป และรายการจองล่าสุดแบบ popup",
      footerHint: "เปิดดูสถานะห้องประชุมล่าสุดจาก nav ได้ทันทีโดยไม่ต้องเลื่อนหน้า",
      noUpcomingQueue: "ไม่มีคิวห้องประชุมถัดไป",
      closeAria: "ปิดสถานะห้องประชุม",
      booked: "มีการจอง",
      available: "ว่าง",
    },
    recentActivity: {
      filteredCount: "แสดง {{visible}} จาก {{filtered}} รายการที่ผ่านตัวกรอง",
      shortcuts: "คีย์ลัด: / ค้นหา, n สร้าง Ticket",
      smartFilterBar: "แถบตัวกรองอัจฉริยะ",
      searchPlaceholder: "ค้นหาเลขที่งาน / หัวข้อ / รายละเอียด...",
      searchAria: "ค้นหา Ticket",
      clearSearch: "ล้าง",
      filterStatusAria: "กรองตามสถานะ",
      filterCategoryAria: "กรองตามหมวดหมู่",
      filterPriorityAria: "กรองตามความเร่งด่วน",
      filterSlaAria: "กรองตาม SLA",
      savedViewAria: "เลือกมุมมองที่บันทึกไว้",
      deleteSavedViewAria: "ลบมุมมองที่เลือก",
      listAria: "รายการ Ticket ล่าสุด",
      firstTicketCta: "สร้างใบแจ้งซ่อมแรก",
      modalTitle: "รายการ Ticket ล่าสุด",
      modalSubtitle: "เปิดจาก nav ได้ทันที พร้อมค้นหาและกรองสถานะสำคัญ",
      totalCount: "ทั้งหมด {{count}} รายการ",
      popupCount: "แสดงใน popup {{count}} รายการ",
      noResultsDescription: "ลองปรับคำค้นหาหรือล้างตัวกรองปัจจุบัน",
      footerHint: "กิจกรรมล่าสุดถูกย้ายมาเปิดผ่าน nav และใช้งานใน popup ได้ทันที",
      closeAria: "ปิดกิจกรรมล่าสุด",
      openHistory: "เปิดประวัติทั้งหมด",
    },
    ticket: {
      priorityInboxTitle: "กล่องงานสำคัญ",
      noTitle: "ไม่มีหัวข้อ",
      noCategory: "ไม่ระบุหมวดหมู่",
      openCaseChat: "เปิดแชทเคส",
      priorityInboxSubtitle: "งานที่ควรจัดการก่อน เรียงตามความเสี่ยง SLA และความเร่งด่วน",
      defaultView: "เปิดมุมมองมาตรฐาน",
      overdueView: "ดูงานหลุด SLA",
      noPriorityInbox: "ไม่มีงานค้างในกล่องงานสำคัญ",
      normalQueue: "ตอนนี้คิวงานอยู่ในเกณฑ์ปกติ",
    },
  },
  en: {
    ticketStatusLabels: {
      NEW: "Pending",
      IN_PROGRESS: "In Progress",
      CLOSED: "Completed",
    },
    notifications: {
      assignedTitle: "IT picked up the case",
      assignedMessage: "{{ticketNo}} assigned to {{assignee}}",
      startedTitle: "IT started working",
      startedMessage: "{{ticketNo}} is now in progress{{assigneeText}}",
      startedBy: " by {{assignee}}",
      closedTitle: "Work completed",
      closedMessageWithNote: "{{ticketNo}} closed: {{note}}",
      closedMessage: "{{ticketNo}} has been closed",
      updatedTitle: "Ticket status updated",
      updatedMessage: "{{ticketNo}} changed to {{status}}",
    },
    common: {
      loading: "Loading...",
      recently: "Just now",
      notSpecified: "Not specified",
      noEmail: "No email",
      noPhone: "No phone number",
      noLocation: "No location",
      noName: "No name found",
      employee: "Employee",
      bookingTitle: "Booked",
      noBookedBy: "No booker",
      noSystem: "No system",
      noDescription: "No description",
      noNextBooking: "No upcoming booking",
      noMeetingToday: "Meeting rooms are free today",
      partialLoadError: "Some dashboard data could not be loaded",
      retryLoad: "Retry",
      comparePrevious7Days: "Compared with previous 7 days",
      currentStatus: "Current status",
      sync: "Sync",
      fullView: "Open full view",
      items: "items",
      amount: "Amount",
      loadingDashboard: "Preparing dashboard data...",
      quickActionsTitle: "Quick Actions",
      quickActionsSubtitle: "Primary shortcuts for the tasks you use most often.",
      role: "Role",
      active: "Active",
      moreMenu: "Toggle more menu",
      profileShow: "Show profile details",
      profileHide: "Hide profile details",
      department: "Department",
      position: "Position",
      close: "Close",
      profileInfo: "Information used during employee registration",
      companyName: "TDK Industrial Co., Ltd.",
      companyLogoAlt: "TDK Industrial logo",
      profileAlt: "Profile",
      userFallback: "User",
      live: "Real-time",
      closeNotification: "Dismiss notification",
    },
    timeline: {
      createdLabel: "Ticket created",
      createdDetail: "The system received the request and started SLA tracking.",
      progressLabel: "In progress",
      assignedDetail: "Owner: {{name}}",
      waitingDetail: "Waiting for a technician to start work",
      closedLabel: "Completed",
      closedDetail: "This ticket has been completed.",
      monitoringLabel: "SLA monitoring",
      statusDetail: "Current status: {{status}}",
    },
    metrics: {
      statusNewLabel: "Pending",
      pendingShare: "{{percent}}% of open workload",
      statusProgressLabel: "In Progress",
      statusClosedLabel: "Closed",
      totalLabel: "Total tickets",
      totalShare: "{{percent}}% of all tickets",
      realtimeStatus: "Latest status updates in real time",
      open7dLabel: "Opened in last 7 days",
      riskLabel: "SLA at risk",
      overdueLabel: "SLA overdue",
      closed7dLabel: "Closed in last 7 days",
    },
    profile: {
      employeeId: "Employee ID",
      email: "Email",
      phone: "Phone",
      location: "Location",
    },
    errors: {
      meetingRoomLoad: "Failed to load meeting room status.",
      accessRequestLoad: "Failed to load access request status.",
      dashboardLoad: "Failed to load dashboard data. Please try again.",
    },
    preset: {
      title: "Save filter view",
      inputLabel: "View name",
      inputPlaceholder: "For example: My urgent work",
      confirm: "Save",
      cancel: "Cancel",
      validation: "Please enter a view name",
    },
    sla: {
      overdue: "Overdue by {{hours}}h",
      atRisk: "At risk in {{hours}}h",
      remaining: "{{hours}}h left",
    },
    kpiDetail: {
      statusNewTitle: "Pending",
      statusNewDescription: "Tickets created and still waiting to be started.",
      statusProgressTitle: "In Progress",
      statusProgressDescription: "Tickets currently being worked on by the team.",
      statusClosedTitle: "Closed",
      statusClosedDescription: "All tickets that have already been closed.",
      statusTotalTitle: "Total tickets",
      statusTotalDescription: "All tickets currently in the system.",
      openTitle: "Opened in the last 7 days",
      openDescription: "Tickets opened during the last 7 days and not yet closed.",
      riskTitle: "SLA at risk",
      riskDescription: "Open tickets that are at risk of missing SLA.",
      overdueTitle: "SLA overdue",
      overdueDescription: "Tickets that already exceeded SLA and need follow-up.",
      closedTitle: "Closed in the last 7 days",
      closedDescription: "Tickets successfully closed during the last 7 days.",
      modalLabel: "KPI Detail",
      closeAria: "Close KPI detail",
      totalLabel: "Total",
      totalHelper: "Items matching this KPI",
      popupLabel: "Shown in popup",
      popupHelper: "Up to 12 latest items",
      usageLabel: "How to use",
      usageAction: "Click an item to open ticket details",
      usageHelper: "Useful for drilling down from the summary metrics",
      updatedAt: "Updated {{value}}",
      emptyTitle: "No items in this KPI",
      emptyDescription: "As soon as matching tickets arrive, this popup updates automatically.",
      footerHint: "The KPI cards above can be opened to inspect matching tickets immediately.",
      openHistory: "Open ticket history",
    },
    operational: {
      notSpecifiedRoom: "No room",
      otherStatus: "Other",
      openTickets: "Open tickets",
      todayMeetings: "Meetings today",
      accessPending: "Access pending",
      pendingNotes: "Open notes",
      noQueue: "No queue yet",
      uncategorized: "Uncategorized",
      openLabel: "Open workload",
      openHelper: "{{newCount}} new / {{progressCount}} in progress",
      progressLabel: "In Progress",
      progressHelper: "Track tickets currently being worked on",
      slaLabel: "Risk or overdue SLA",
      slaHelper: "{{count}} tickets already overdue",
      meetingLabel: "Rooms in use now",
      meetingHelper: "{{count}} bookings today across {{totalRooms}} rooms",
      notebookLabel: "Notebook follow-up",
      notebookHelper: "Borrow-return requests and pending notebook actions",
      accessLabel: "Access pending",
      accessHelper: "Workflow requests that are still open",
      title: "Operational Dashboard",
      subtitle: "A compact live snapshot of queue, 7-day trend, and cross-module workload in one block.",
      slaWatch: "SLA watch {{count}}",
      queueStatus: "Queue Status",
      queueOpenItems: "{{count}} open items",
      sevenDayMotion: "7-Day Motion",
      createdVsClosed: "Created vs closed",
      workloadMix: "Workload Mix",
      followUpItems: "{{count}} items to follow up",
      noExtraWorkload: "No extra workload right now",
      modalLabel: "Dashboard Overview",
      realtime: "Real-time",
      modalDescription: "A live snapshot of current operations in one place without changing the main dashboard layout.",
      onTimeSla: "SLA on-time {{percent}}%",
      riskOverdue: "{{risk}} at risk / {{overdue}} overdue",
      overlapCount: "Found {{count}} overlapping booking slots",
      trendLabel: "Ticket trend, last 7 days",
      trendTitle: "Created vs closed",
      rolling7Days: "rolling 7 days",
      lineCreated: "Created",
      lineClosed: "Closed",
      dateLabel: "Date {{label}}",
      statusOverviewLabel: "Ticket status overview",
      statusOverviewTitle: "Current status distribution",
      liveQueue: "live queue",
      mixLabel: "Operational mix",
      mixTitle: "Current workload mix",
      liveLoad: "Live load",
      watchlistLabel: "Watchlist now",
      watchlistTitle: "Points to watch",
      liveFeed: "live feed",
      roomsInUseNow: "Rooms in use",
      nextMeetingQueue: "Next meeting queue",
      activeMeetingFallback: "Meeting room in use",
      noMeetingInUse: "No meeting rooms are in use right now",
      topOpenCategories: "Top open categories",
      noOpenTickets: "There are no open tickets right now",
      urgentTickets: "Urgent tickets",
      noUrgentTickets: "No urgent tickets need attention",
      footerHint: "Open the current overview directly from the nav without hunting through sections.",
      openHistory: "Open ticket history",
    },
    meeting: {
      hiddenSubtitle: "Real-time meeting room status for the whole organization today",
      openBooking: "Go to meeting room booking",
      todayCount: "Today: {{count}} items",
      tomorrowCount: "Tomorrow: {{count}} items",
      upcomingCount: "Upcoming: {{count}} items",
      nextBooking: "Next booking: {{value}}",
      nextShort: "Next: {{value}}",
      overlapCount: "Found {{count}} overlapping booking slots",
      todayBookings: "Today's bookings",
      roomStatusToday: "Today's room status",
      upcomingBookings: "Upcoming bookings",
      latestActivity: "Recent activity",
      modalTitle: "Meeting room status and recent activity",
      modalSubtitle: "Track free rooms, the next queue, and the latest bookings in a popup",
      footerHint: "Open the latest meeting room status directly from the nav without scrolling.",
      noUpcomingQueue: "No upcoming meeting room queue",
      closeAria: "Close meeting room status",
      booked: "Booked",
      available: "Available",
    },
    recentActivity: {
      filteredCount: "Showing {{visible}} of {{filtered}} filtered items",
      shortcuts: "Shortcuts: / Search, n New ticket",
      smartFilterBar: "Smart Filter Bar",
      searchPlaceholder: "Search ticket no / title / description...",
      searchAria: "Search tickets",
      clearSearch: "Clear",
      filterStatusAria: "Filter by status",
      filterCategoryAria: "Filter by category",
      filterPriorityAria: "Filter by priority",
      filterSlaAria: "Filter by SLA",
      savedViewAria: "Select saved view",
      deleteSavedViewAria: "Delete selected view",
      listAria: "Latest ticket list",
      firstTicketCta: "Create first ticket",
      modalTitle: "Latest tickets",
      modalSubtitle: "Open it from the nav and search or filter key statuses immediately.",
      totalCount: "Total {{count}} items",
      popupCount: "Shown in popup {{count}} items",
      noResultsDescription: "Try adjusting the search or clearing the current filters.",
      footerHint: "Recent activity has been moved to the nav and can be used directly in a popup.",
      closeAria: "Close recent activity",
      openHistory: "Open full history",
    },
    ticket: {
      priorityInboxTitle: "Priority Inbox",
      noTitle: "Untitled",
      noCategory: "Uncategorized",
      openCaseChat: "Open case chat",
      priorityInboxSubtitle: "Work that should be handled first, sorted by SLA risk and urgency.",
      defaultView: "Open default view",
      overdueView: "View overdue SLA",
      noPriorityInbox: "No items in Priority Inbox",
      normalQueue: "The current queue is in a normal range.",
    },
  },
  ko: {
    ticketStatusLabels: {
      NEW: "대기 중",
      IN_PROGRESS: "진행 중",
      CLOSED: "완료",
    },
    notifications: {
      assignedTitle: "IT가 케이스를 접수했습니다",
      assignedMessage: "{{ticketNo}}이(가) {{assignee}}에게 배정되었습니다",
      startedTitle: "IT가 작업을 시작했습니다",
      startedMessage: "{{ticketNo}}이(가) 처리 중입니다{{assigneeText}}",
      startedBy: " / 담당자 {{assignee}}",
      closedTitle: "작업이 완료되었습니다",
      closedMessageWithNote: "{{ticketNo}} 종료: {{note}}",
      closedMessage: "{{ticketNo}}이(가) 종료되었습니다",
      updatedTitle: "티켓 상태가 변경되었습니다",
      updatedMessage: "{{ticketNo}} 상태가 {{status}}(으)로 변경되었습니다",
    },
    common: {
      loading: "불러오는 중...",
      recently: "방금 전",
      notSpecified: "미지정",
      noEmail: "이메일 없음",
      noPhone: "전화번호 없음",
      noLocation: "위치 없음",
      noName: "이름 없음",
      employee: "직원",
      bookingTitle: "예약됨",
      noBookedBy: "예약자 없음",
      noSystem: "시스템 없음",
      noDescription: "설명 없음",
      noNextBooking: "다음 예약 없음",
      noMeetingToday: "오늘은 회의실이 비어 있습니다",
      partialLoadError: "대시보드 일부 데이터를 불러오지 못했습니다",
      retryLoad: "다시 시도",
      comparePrevious7Days: "이전 7일 대비",
      currentStatus: "현재 상태",
      sync: "동기화",
      fullView: "전체 보기",
      items: "건",
      amount: "수량",
      loadingDashboard: "대시보드 데이터를 준비하는 중...",
      quickActionsTitle: "빠른 작업",
      quickActionsSubtitle: "가장 자주 사용하는 작업으로 가는 주요 바로가기입니다.",
      role: "역할",
      active: "사용 중",
      moreMenu: "추가 메뉴 표시",
      profileShow: "프로필 상세 표시",
      profileHide: "프로필 상세 숨기기",
      department: "부서",
      position: "직책",
      close: "닫기",
      profileInfo: "직원 가입 시 사용된 정보",
      companyName: "TDK Industrial Co., Ltd.",
      companyLogoAlt: "TDK Industrial 로고",
      profileAlt: "프로필",
      userFallback: "사용자",
      live: "실시간",
      closeNotification: "알림 닫기",
    },
    timeline: {
      createdLabel: "티켓 생성",
      createdDetail: "요청이 접수되었고 SLA 측정이 시작되었습니다.",
      progressLabel: "진행 중",
      assignedDetail: "담당자: {{name}}",
      waitingDetail: "기술자 배정을 기다리는 중",
      closedLabel: "완료",
      closedDetail: "이 티켓은 이미 완료되었습니다.",
      monitoringLabel: "SLA 모니터링",
      statusDetail: "현재 상태: {{status}}",
    },
    metrics: {
      statusNewLabel: "대기 중",
      pendingShare: "미처리 작업의 {{percent}}%",
      statusProgressLabel: "진행 중",
      statusClosedLabel: "완료",
      totalLabel: "전체 티켓",
      totalShare: "전체 티켓의 {{percent}}%",
      realtimeStatus: "실시간 최신 상태 업데이트",
      open7dLabel: "최근 7일 신규",
      riskLabel: "SLA 위험",
      overdueLabel: "SLA 초과",
      closed7dLabel: "최근 7일 완료",
    },
    profile: {
      employeeId: "사번",
      email: "이메일",
      phone: "전화번호",
      location: "위치",
    },
    errors: {
      meetingRoomLoad: "회의실 상태를 불러오지 못했습니다",
      accessRequestLoad: "권한 요청 상태를 불러오지 못했습니다",
      dashboardLoad: "대시보드 데이터를 불러오지 못했습니다. 다시 시도하세요.",
    },
    preset: {
      title: "필터 보기 저장",
      inputLabel: "보기 이름",
      inputPlaceholder: "예: 내 긴급 업무",
      confirm: "저장",
      cancel: "취소",
      validation: "보기 이름을 입력하세요",
    },
    sla: {
      overdue: "{{hours}}시간 초과",
      atRisk: "{{hours}}시간 후 위험",
      remaining: "{{hours}}시간 남음",
    },
    kpiDetail: {
      statusNewTitle: "대기 중",
      statusNewDescription: "생성되었지만 아직 시작되지 않은 티켓입니다.",
      statusProgressTitle: "진행 중",
      statusProgressDescription: "팀이 현재 처리 중인 티켓입니다.",
      statusClosedTitle: "완료",
      statusClosedDescription: "이미 완료된 모든 티켓입니다.",
      statusTotalTitle: "전체 티켓",
      statusTotalDescription: "현재 시스템에 있는 모든 티켓입니다.",
      openTitle: "최근 7일 신규",
      openDescription: "최근 7일 동안 생성되었고 아직 닫히지 않은 티켓입니다.",
      riskTitle: "SLA 위험",
      riskDescription: "아직 닫히지 않았고 SLA 위험이 있는 티켓입니다.",
      overdueTitle: "SLA 초과",
      overdueDescription: "이미 SLA를 넘겨 빠른 추적이 필요한 티켓입니다.",
      closedTitle: "최근 7일 완료",
      closedDescription: "최근 7일 동안 완료된 티켓입니다.",
      modalLabel: "KPI 상세",
      closeAria: "KPI 상세 닫기",
      totalLabel: "전체 수",
      totalHelper: "이 KPI에 해당하는 항목",
      popupLabel: "팝업 표시 수",
      popupHelper: "최대 최근 12건",
      usageLabel: "사용 방법",
      usageAction: "항목을 누르면 티켓 상세를 엽니다",
      usageHelper: "요약 지표에서 바로 drill-down 하기 좋습니다",
      updatedAt: "{{value}} 업데이트",
      emptyTitle: "이 KPI에는 아직 항목이 없습니다",
      emptyDescription: "조건에 맞는 티켓이 들어오면 이 팝업의 수치와 목록이 바로 갱신됩니다.",
      footerHint: "위 KPI 카드는 눌러서 바로 관련 티켓 목록을 확인할 수 있습니다.",
      openHistory: "티켓 이력 열기",
    },
    operational: {
      notSpecifiedRoom: "회의실 없음",
      otherStatus: "기타 상태",
      openTickets: "열린 티켓",
      todayMeetings: "오늘 회의",
      accessPending: "권한 승인 대기",
      pendingNotes: "미완료 노트",
      noQueue: "대기 항목 없음",
      uncategorized: "미분류",
      openLabel: "열린 작업",
      openHelper: "신규 {{newCount}} / 진행 중 {{progressCount}}",
      progressLabel: "진행 중",
      progressHelper: "현재 진행 중인 작업을 추적합니다",
      slaLabel: "SLA 위험 또는 초과",
      slaHelper: "이미 SLA를 넘긴 작업 {{count}}건",
      meetingLabel: "현재 사용 중인 회의실",
      meetingHelper: "총 {{totalRooms}}개 회의실, 오늘 {{count}}건",
      notebookLabel: "노트북 추적 필요",
      notebookHelper: "대여/반납 요청과 처리 대기 항목",
      accessLabel: "권한 승인 대기",
      accessHelper: "아직 닫히지 않은 워크플로우 요청",
      title: "운영 대시보드",
      subtitle: "현재 큐, 7일 추세, 모듈 간 workload를 한 블록에서 보는 라이브 요약입니다.",
      slaWatch: "SLA 모니터링 {{count}}",
      queueStatus: "대기열 현황",
      queueOpenItems: "추적 필요 {{count}}건",
      sevenDayMotion: "최근 7일 추세",
      createdVsClosed: "생성 대비 종료",
      workloadMix: "업무 비중",
      followUpItems: "추적 필요 {{count}}건",
      noExtraWorkload: "추가 workload 없음",
      modalLabel: "대시보드 개요",
      realtime: "실시간",
      modalDescription: "기존 대시보드 레이아웃을 바꾸지 않고 현재 상태를 한 화면에서 보여줍니다.",
      onTimeSla: "SLA 준수 {{percent}}%",
      riskOverdue: "{{risk}}건 위험 / {{overdue}}건 SLA 초과",
      overlapCount: "중복 예약 {{count}}건 발견",
      trendLabel: "최근 7일 티켓 추세",
      trendTitle: "신규 접수 vs 완료",
      rolling7Days: "최근 7일",
      lineCreated: "신규",
      lineClosed: "완료",
      dateLabel: "날짜 {{label}}",
      statusOverviewLabel: "티켓 상태 개요",
      statusOverviewTitle: "현재 상태 분포",
      liveQueue: "실시간 대기열",
      mixLabel: "현재 업무 구성",
      mixTitle: "현재 발생 중인 업무 비중",
      liveLoad: "실시간 부하",
      watchlistLabel: "현재 주시 항목",
      watchlistTitle: "지켜봐야 할 포인트",
      liveFeed: "실시간 피드",
      roomsInUseNow: "현재 사용 중인 회의실",
      nextMeetingQueue: "다음 회의 일정",
      activeMeetingFallback: "회의실 사용 중",
      noMeetingInUse: "현재 사용 중인 회의실이 없습니다",
      topOpenCategories: "미처리 카테고리 상위",
      noOpenTickets: "현재 미처리 열린 작업이 없습니다",
      urgentTickets: "긴급 티켓",
      noUrgentTickets: "주의가 필요한 긴급 티켓이 없습니다",
      footerHint: "기존 페이지를 스크롤하지 않아도 nav에서 현재 개요를 바로 열 수 있습니다.",
      openHistory: "티켓 이력 열기",
    },
    meeting: {
      hiddenSubtitle: "오늘 회의실 상태를 전사 기준으로 실시간 확인합니다.",
      openBooking: "회의실 예약으로 이동",
      todayCount: "오늘: {{count}}건",
      tomorrowCount: "내일: {{count}}건",
      upcomingCount: "예정: {{count}}건",
      nextBooking: "다음 예약: {{value}}",
      nextShort: "다음: {{value}}",
      overlapCount: "중복 예약 {{count}}건 발견",
      todayBookings: "오늘 예약",
      roomStatusToday: "오늘 회의실 상태",
      upcomingBookings: "다음 예약 목록",
      latestActivity: "최근 활동",
      modalTitle: "회의실 상태와 최근 활동",
      modalSubtitle: "빈 회의실, 다음 일정, 최근 예약을 팝업에서 확인합니다.",
      footerHint: "nav에서 최신 회의실 상태를 바로 열 수 있습니다.",
      noUpcomingQueue: "다음 회의실 예약이 없습니다",
      closeAria: "회의실 상태 닫기",
      booked: "예약됨",
      available: "사용 가능",
    },
    recentActivity: {
      filteredCount: "필터 통과 {{filtered}}건 중 {{visible}}건 표시",
      shortcuts: "단축키: / 검색, n 티켓 생성",
      smartFilterBar: "스마트 필터 바",
      searchPlaceholder: "티켓 번호 / 제목 / 설명 검색...",
      searchAria: "티켓 검색",
      clearSearch: "지우기",
      filterStatusAria: "상태로 필터",
      filterCategoryAria: "카테고리로 필터",
      filterPriorityAria: "긴급도로 필터",
      filterSlaAria: "SLA로 필터",
      savedViewAria: "저장된 보기 선택",
      deleteSavedViewAria: "선택한 보기 삭제",
      listAria: "최신 티켓 목록",
      firstTicketCta: "첫 티켓 생성",
      modalTitle: "최신 티켓 목록",
      modalSubtitle: "nav에서 바로 열고 주요 상태로 검색하거나 필터링할 수 있습니다.",
      totalCount: "전체 {{count}}건",
      popupCount: "팝업 표시 {{count}}건",
      noResultsDescription: "검색어를 바꾸거나 현재 필터를 초기화해 보세요",
      footerHint: "최근 활동은 nav에서 바로 열고 팝업으로 사용할 수 있도록 이동했습니다.",
      closeAria: "최근 활동 닫기",
      openHistory: "전체 이력 열기",
    },
    ticket: {
      priorityInboxTitle: "우선 처리함",
      noTitle: "제목 없음",
      noCategory: "미분류",
      openCaseChat: "케이스 채팅 열기",
      priorityInboxSubtitle: "SLA 위험과 긴급도를 기준으로 먼저 처리해야 할 작업입니다.",
      defaultView: "기본 보기 열기",
      overdueView: "SLA 초과 보기",
      noPriorityInbox: "우선 처리함에 항목이 없습니다",
      normalQueue: "현재 큐는 정상 범위입니다.",
    },
  },
};

function getDashboardTranslationValue(language, key) {
  return String(key || "")
    .split(".")
    .reduce(
      (current, segment) => (current && typeof current === "object" ? current[segment] : undefined),
      DASHBOARD_TRANSLATIONS[language] || DASHBOARD_TRANSLATIONS.en,
    );
}

function getNestedValue(source, key) {
  return String(key || "")
    .split(".")
    .reduce(
      (current, segment) => (current && typeof current === "object" ? current[segment] : undefined),
      source,
    );
}

function interpolateDashboardTranslation(template, variables = {}) {
  return String(template).replace(/\{\{(.*?)\}\}/g, (_, rawKey) => {
    const key = String(rawKey || "").trim();
    return variables[key] ?? "";
  });
}

function buildTicketStatusNotification(previousTicket, nextTicket, rt) {
  const previousStatus = String(previousTicket?.status || "");
  const nextStatus = String(nextTicket?.status || "");
  const previousAssignee = String(previousTicket?.assigned_name || "");
  const nextAssignee = String(nextTicket?.assigned_name || "");
  const ticketNo = nextTicket?.ticket_no || `T${String(nextTicket?.id || "").slice(-6).toUpperCase()}`;
  const statusLabels = {
    NEW: rt("ticketStatusLabels.NEW"),
    IN_PROGRESS: rt("ticketStatusLabels.IN_PROGRESS"),
    CLOSED: rt("ticketStatusLabels.CLOSED"),
  };

  if (nextAssignee && previousAssignee !== nextAssignee && previousStatus === nextStatus) {
    return {
      title: rt("notifications.assignedTitle"),
      message: rt("notifications.assignedMessage", { ticketNo, assignee: nextAssignee }),
      tone: "indigo",
    };
  }

  if (!nextStatus || previousStatus === nextStatus) return null;

  if (nextStatus === "IN_PROGRESS") {
    return {
      title: rt("notifications.startedTitle"),
      message: rt("notifications.startedMessage", {
        ticketNo,
        assigneeText: nextAssignee ? rt("notifications.startedBy", { assignee: nextAssignee }) : "",
      }),
      tone: "amber",
    };
  }

  if (nextStatus === "CLOSED") {
    const solutionNote = getTicketDisplayNote(nextTicket);
    return {
      title: rt("notifications.closedTitle"),
      message: solutionNote
        ? rt("notifications.closedMessageWithNote", { ticketNo, note: solutionNote.slice(0, 80) })
        : rt("notifications.closedMessage", { ticketNo }),
      tone: "emerald",
    };
  }

  return {
    title: rt("notifications.updatedTitle"),
    message: rt("notifications.updatedMessage", { ticketNo, status: getTicketStatusLabel(nextTicket || nextStatus) }),
    tone: "rose",
  };
}

const normalizeClock = (value) => String(value || "").slice(0, 5);

const extractDateKey = (value) => {
  const text = String(value || "").trim();
  const directMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch?.[1]) return directMatch[1];

  const dmyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    let year = Number(dmyMatch[3]);

    if (year > 2400) year -= 543; // Thai Buddhist year -> Gregorian
    if (year < 100) year += 2000;

    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return format(parsed, "yyyy-MM-dd");
};

const clockToMinutes = (value) => {
  const [hourRaw, minuteRaw] = normalizeClock(value).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
};

const minutesToClock = (value) => {
  const safeValue = Math.max(0, Number(value) || 0);
  const hour = Math.floor(safeValue / 60);
  const minute = safeValue % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const normalizeBookingForDisplay = (booking) => {
  const bookingDateKey = booking.booking_date_key || extractDateKey(booking.booking_date);
  if (!bookingDateKey) return null;

  const startClockRaw = normalizeClock(booking.start_time);
  const endClockRaw = normalizeClock(booking.end_time);
  const startClock = /^\d{2}:\d{2}$/.test(startClockRaw) ? startClockRaw : "--:--";
  const endClock = /^\d{2}:\d{2}$/.test(endClockRaw) ? endClockRaw : "--:--";
  const startsAt = new Date(`${bookingDateKey}T${startClock === "--:--" ? "00:00" : startClock}:00`);
  if (Number.isNaN(startsAt.getTime())) return null;

  return {
    ...booking,
    bookingDateKey,
    startClock,
    endClock,
    startsAt,
  };
};

function StableChartContainer({ className, children }) {
  const containerRef = useRef(null);
  const [hasSize, setHasSize] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setHasSize(rect.width > 0 && rect.height > 0);
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {hasSize ? children : null}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function Dashboard() {
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const dateLocale = useMemo(() => DATE_FNS_LOCALES[language] || DATE_FNS_LOCALES.en, [language]);
  const dt = useCallback(
    (key, variables) => {
      const primary = getDashboardTranslationValue(language, key);
      const fallback = getDashboardTranslationValue("en", key);
      return interpolateDashboardTranslation(primary ?? fallback ?? key, variables);
    },
    [language],
  );
  const rt = useCallback(
    (key, variables) => {
      const primary = getNestedValue(DASHBOARD_RUNTIME_TEXT[language], key);
      const fallback = getNestedValue(DASHBOARD_RUNTIME_TEXT.en, key);
      return interpolateDashboardTranslation(primary ?? fallback ?? key, variables);
    },
    [language],
  );
  const localizedStatusConfig = useMemo(() => getLocalizedStatusConfig(language), [language]);
  const localizedPriorityConfig = useMemo(() => getLocalizedPriorityConfig(language), [language]);
  const localizedFilterOptions = useMemo(() => getLocalizedFilterOptions(language), [language]);
  const localizedPriorityFilterOptions = useMemo(() => getLocalizedPriorityFilterOptions(language), [language]);
  const localizedSlaFilterOptions = useMemo(() => getLocalizedSlaFilterOptions(language), [language]);
  const localizedRoleLabels = useMemo(() => getLocalizedRoleLabels(language), [language]);
  const localizedRoleViews = useMemo(() => getLocalizedRoleBasedViews(language), [language]);

  // State Management
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [slaFilter, setSlaFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedFilterPresets, setSavedFilterPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [activeRoleViewId, setActiveRoleViewId] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedKpiMetricKey, setSelectedKpiMetricKey] = useState("");
  const [supportChatOpenSignal, setSupportChatOpenSignal] = useState(0);
  const [showMoreQuickActions, setShowMoreQuickActions] = useState(false);
  const [isAssetQrScannerOpen, setIsAssetQrScannerOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isStatusOverviewMenuOpen, setIsStatusOverviewMenuOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [isOperationalOverviewModalOpen, setIsOperationalOverviewModalOpen] = useState(false);
  const [isMeetingRoomStatusModalOpen, setIsMeetingRoomStatusModalOpen] = useState(false);
  const [isRecentActivityModalOpen, setIsRecentActivityModalOpen] = useState(false);
  const [dashboardNotifications, setDashboardNotifications] = useState([]);
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const persisted = localStorage.getItem(DASHBOARD_THEME_KEY);
      return persisted === "dark" || persisted === "light" ? persisted : "light";
    } catch {
      return "light";
    }
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [slaStats, setSlaStats] = useState({ onTime: 0, total: 0, percentage: 100 });
  const [todayMeetingBookings, setTodayMeetingBookings] = useState([]);
  const [tomorrowMeetingBookings, setTomorrowMeetingBookings] = useState([]);
  const [upcomingMeetingBookings, setUpcomingMeetingBookings] = useState([]);
  const [meetingRoomLoading, setMeetingRoomLoading] = useState(true);
  const [meetingRoomError, setMeetingRoomError] = useState("");
  const [accessRequestSummary, setAccessRequestSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    total: 0,
  });
  const [accessRequestHighlights, setAccessRequestHighlights] = useState([]);
  const [accessRequestLoading, setAccessRequestLoading] = useState(true);
  const [accessRequestError, setAccessRequestError] = useState("");
  const [workNotesPendingCount, setWorkNotesPendingCount] = useState(0);
  const [notebookAttentionCount, setNotebookAttentionCount] = useState(0);
  const [chartsReady, setChartsReady] = useState(false);
  const [isCompactView, setIsCompactView] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1279px)").matches;
  });
  const channelRef = useRef(null);
  const meetingRoomChannelRef = useRef(null);
  const accessRequestChannelRef = useRef(null);
  const mobileNavMenuRef = useRef(null);
  const mobileStatusOverviewMenuRef = useRef(null);
  const desktopStatusOverviewMenuRef = useRef(null);
  const searchInputRef = useRef(null);
  const notificationTimeoutsRef = useRef(new Map());
  const quickActionsSectionRef = useRef(null);

  const hydrateTicketLocation = useCallback(
    (ticket, fallbackLocation = "") => {
      if (!ticket) return ticket;
      return {
        ...ticket,
        location:
          String(ticket?.location || "").trim() ||
          String(ticket?.reporter_location || "").trim() ||
          String(ticket?.work_location || "").trim() ||
          String(fallbackLocation || "").trim() ||
          "",
      };
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      setChartsReady(true);
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      setChartsReady(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  // ============================================
  // âœ… REAL-TIME SUBSCRIPTION (Supabase Realtime)
  // ============================================

  const setupRealtimeSubscription = useCallback((userId) => {
    // à¸–à¹‰à¸²à¸¡à¸µ Channel à¹€à¸”à¸´à¸¡à¸—à¸µà¹ˆà¸„à¹‰à¸²à¸‡à¸­à¸¢à¸¹à¹ˆà¹ƒà¸«à¹‰à¸›à¸´à¸”à¸—à¸´à¹‰à¸‡à¸à¹ˆà¸­à¸™
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const fallbackLocation = String(profile?.location || "").trim();

    const channel = supabase
      .channel(`tickets-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `creator_id=eq.${userId}`
        },
        (payload) => {
          console.log('ðŸŽ¯ Realtime update received:', payload);
          const affectedId = payload.new?.id || payload.old?.id;
          const nextRow = payload.new || payload.old;
          const nextIsBorrowRequest = payload.eventType !== "DELETE" && isPickUpEquipmentRequest(nextRow);
          const hydratedNewRow =
            payload.eventType === "DELETE"
              ? null
              : hydrateTicketLocation(payload.new, fallbackLocation);

          const updateRows = (currentRows, shouldKeepRow) => {
            const remainingRows = currentRows.filter((row) => row.id !== affectedId);
            if (payload.eventType === "DELETE" || !shouldKeepRow) return remainingRows;
            return [hydratedNewRow, ...remainingRows].sort(
              (left, right) => new Date(right?.created_at || right?.updated_at || 0).getTime() - new Date(left?.created_at || left?.updated_at || 0).getTime(),
            );
          };

          setTickets((currentTickets) => updateRows(currentTickets, !nextIsBorrowRequest));
          setBorrowRequests((currentRows) => updateRows(currentRows, nextIsBorrowRequest));

          setLastUpdated(new Date());

          if (payload.eventType === "UPDATE") {
            const nextNotification = buildTicketStatusNotification(payload.old, payload.new, rt);
            if (nextNotification) {
              showUpdateNotification(nextNotification.title, nextNotification.message, nextNotification.tone);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('ðŸ“¡ Realtime status:', status);
      });

    // à¹€à¸à¹‡à¸šà¹„à¸§à¹‰à¹ƒà¸™ Ref (à¹„à¸¡à¹ˆà¸—à¸³à¹ƒà¸«à¹‰à¹€à¸à¸´à¸” Re-render)
    channelRef.current = channel;
  }, [hydrateTicketLocation, profile?.location, rt]); // Dependency à¹€à¸›à¹‡à¸™à¸§à¹ˆà¸²à¸‡à¹€à¸›à¸¥à¹ˆà¸²à¹€à¸žà¸·à¹ˆà¸­à¹„à¸¡à¹ˆà¹ƒà¸«à¹‰à¹€à¸à¸´à¸”à¸à¸²à¸£à¸ªà¸£à¹‰à¸²à¸‡ function à¹ƒà¸«à¸¡à¹ˆà¸§à¸™à¸¥à¸¹à¸›

  const fetchMeetingRoomBookings = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setMeetingRoomLoading(true);

    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = format(tomorrowDate, "yyyy-MM-dd");
      const dayAfterTomorrowDate = new Date();
      dayAfterTomorrowDate.setDate(dayAfterTomorrowDate.getDate() + 2);
      const dayAfterTomorrow = format(dayAfterTomorrowDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("meeting_room_bookings")
        .select("*")
        .gte("booking_date", today)
        .neq("status", "cancelled")
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(500);

      if (error) throw error;

      const rows = (data || []).map((item) => ({
        ...item,
        booking_date_key: extractDateKey(item.booking_date),
      }));
      const upcomingRows = rows.filter((item) => {
        const key = item.booking_date_key;
        return Boolean(key) && key >= today;
      });
      const nearTermRows = upcomingRows.filter((item) => item.booking_date_key < dayAfterTomorrow);

      setUpcomingMeetingBookings(upcomingRows);
      setTodayMeetingBookings(nearTermRows.filter((item) => item.booking_date_key === today));
      setTomorrowMeetingBookings(nearTermRows.filter((item) => item.booking_date_key === tomorrow));
      setMeetingRoomError("");
    } catch (error) {
      console.error("Meeting room load error:", error);
      setMeetingRoomError(rt("errors.meetingRoomLoad"));
      setUpcomingMeetingBookings([]);
      setTodayMeetingBookings([]);
      setTomorrowMeetingBookings([]);
    } finally {
      if (!silent) setMeetingRoomLoading(false);
    }
  }, [rt]);

  const setupMeetingRoomRealtime = useCallback(() => {
    if (meetingRoomChannelRef.current) {
      supabase.removeChannel(meetingRoomChannelRef.current);
    }

    const channel = supabase
      .channel("meeting-room-status-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meeting_room_bookings",
        },
        () => {
          fetchMeetingRoomBookings({ silent: true });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          fetchMeetingRoomBookings({ silent: true });
        }
      });

    meetingRoomChannelRef.current = channel;
  }, [fetchMeetingRoomBookings]);

  const fetchAccessRequestSummary = useCallback(async ({
    userId,
    role,
    silent = false,
  } = {}) => {
    if (!userId) return;
    if (!silent) setAccessRequestLoading(true);

    try {
      let query = supabase
        .from("access_requests")
        .select("id, requester_user_id, status, system_name, urgency, created_at")
        .order("created_at", { ascending: false })
        .limit(120);

      const canViewAll = role === "it_support" || role === "admin";
      if (!canViewAll) {
        query = query.eq("requester_user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data || [];
      const summary = rows.reduce(
        (accumulator, item) => {
          if (item.status === ACCESS_REQUEST_STATUS.PENDING) accumulator.pending += 1;
          if (item.status === ACCESS_REQUEST_STATUS.APPROVED) accumulator.approved += 1;
          if (item.status === ACCESS_REQUEST_STATUS.REJECTED) accumulator.rejected += 1;
          if (item.status === ACCESS_REQUEST_STATUS.COMPLETED) accumulator.completed += 1;
          return accumulator;
        },
        { pending: 0, approved: 0, rejected: 0, completed: 0 },
      );

      setAccessRequestSummary({
        ...summary,
        total: summary.pending + summary.approved + summary.rejected + summary.completed,
      });
      setAccessRequestHighlights(rows.slice(0, 3));
      setAccessRequestError("");
    } catch (error) {
      console.error("Access request summary load error:", error);
      setAccessRequestError(rt("errors.accessRequestLoad"));
      setAccessRequestSummary({
        pending: 0,
        approved: 0,
        rejected: 0,
        completed: 0,
        total: 0,
      });
      setAccessRequestHighlights([]);
    } finally {
      if (!silent) setAccessRequestLoading(false);
    }
  }, [rt]);

  const setupAccessRequestRealtime = useCallback((userId, role) => {
    if (!userId) return;

    if (accessRequestChannelRef.current) {
      supabase.removeChannel(accessRequestChannelRef.current);
    }

    const canViewAll = role === "it_support" || role === "admin";

    const channel = supabase
      .channel(`dashboard-access-request-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "access_requests",
        },
        (payload) => {
          if (!canViewAll) {
            const nextUserId = payload.new?.requester_user_id;
            const prevUserId = payload.old?.requester_user_id;
            if (nextUserId !== userId && prevUserId !== userId) return;
          }

          fetchAccessRequestSummary({ userId, role, silent: true });
        },
      )
      .subscribe();

    accessRequestChannelRef.current = channel;
  }, [fetchAccessRequestSummary]);

  // Cleanup à¹€à¸¡à¸·à¹ˆà¸­à¸›à¸´à¸”à¸«à¸™à¹‰à¸²à¸ˆà¸­
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (meetingRoomChannelRef.current) {
        supabase.removeChannel(meetingRoomChannelRef.current);
      }
      if (accessRequestChannelRef.current) {
        supabase.removeChannel(accessRequestChannelRef.current);
      }
    };
  }, []);

  // ============================================
  // âœ… INITIALIZATION
  // ============================================
  const initDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setDashboardError("");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // ProtectedRoute will handle redirect, but we stop loading here
        return null;
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const user = authUser || session.user;

      // Fetch profile
      const profileRes = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileRes.error && profileRes.error.code !== "PGRST116") {
        throw profileRes.error;
      }

      const metadata = user.user_metadata || {};
      const mergedProfile = {
        ...metadata,
        ...(profileRes.data || {}),
        email: profileRes.data?.email || user.email || metadata.email || "",
        full_name: profileRes.data?.full_name || metadata.full_name || "",
        employee_code: profileRes.data?.employee_code || metadata.employee_code || metadata.employee_id || "",
        department: profileRes.data?.department || metadata.department || "",
        position: profileRes.data?.position || metadata.position || "",
        phone: profileRes.data?.phone || metadata.phone || metadata.mobile_phone || "",
        location:
          profileRes.data?.location ||
          profileRes.data?.work_location ||
          profileRes.data?.work_site ||
          profileRes.data?.site ||
          profileRes.data?.["work location / site"] ||
          metadata.location ||
          metadata.work_location ||
          metadata.workLocation ||
          metadata.work_site ||
          metadata.site ||
          metadata["work location / site"] ||
          "",
        role: profileRes.data?.role || metadata.role || "user",
      };

      setProfile(mergedProfile);
      const resolvedRole = mergedProfile.role || "user";

      // Fetch tickets
      const ticketsRes = await supabase
        .from("tickets")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (ticketsRes.error) throw ticketsRes.error;

      if (ticketsRes.data) {
        const ticketsData = ticketsRes.data || [];
        const { repairTickets, serviceRequests } = splitTicketBuckets(ticketsData);
        const fallbackLocation = String(mergedProfile.location || "").trim();
        const hydratedRepairTickets = repairTickets.map((ticket) => hydrateTicketLocation(ticket, fallbackLocation));
        const hydratedServiceRequests = serviceRequests.map((ticket) => hydrateTicketLocation(ticket, fallbackLocation));
        setTickets(hydratedRepairTickets);
        setBorrowRequests(hydratedServiceRequests);

        // Setup realtime after initial load
        setTimeout(() => {
          setupRealtimeSubscription(user.id);
        }, 100);

        // Calculate SLA stats
        calculateSlaStats(hydratedRepairTickets);
      }

      const [workNotesRes, notebookLogsRes] = await Promise.all([
        supabase
          .from("notes")
          .select("status")
          .eq("user_id", user.id),
        loadMyNotebookBorrowLogs(),
      ]);

      if (!workNotesRes.error) {
        const workNotesRows = Array.isArray(workNotesRes.data) ? workNotesRes.data : [];
        setWorkNotesPendingCount(
          workNotesRows.filter((item) => String(item?.status || "").trim().toLowerCase() !== "done").length,
        );
      } else {
        setWorkNotesPendingCount(0);
      }

      if (!notebookLogsRes.error) {
        const notebookLogs = Array.isArray(notebookLogsRes.data) ? notebookLogsRes.data : [];
        const attentionCount = notebookLogs.filter((log) =>
          log?.status === NOTEBOOK_LOG_STATUS.PENDING ||
          log?.status === NOTEBOOK_LOG_STATUS.APPROVED ||
          (log?.status === NOTEBOOK_LOG_STATUS.RETURNED && !log?.return_confirmed_at)
        ).length;
        setNotebookAttentionCount(attentionCount);
      } else {
        setNotebookAttentionCount(0);
      }

      await fetchAccessRequestSummary({ userId: user.id, role: resolvedRole });
      setupAccessRequestRealtime(user.id, resolvedRole);

      setLastUpdated(new Date());
      return user.id;

    } catch (error) {
      console.error("Dashboard Error:", error);
      setDashboardError(rt("errors.dashboardLoad"));
    } finally {
      setLoading(false);
    }
  }, [fetchAccessRequestSummary, hydrateTicketLocation, navigate, rt, setupAccessRequestRealtime, setupRealtimeSubscription]);

  useEffect(() => {
    initDashboard();
  }, [initDashboard]);

  useEffect(() => {
    fetchMeetingRoomBookings();
    setupMeetingRoomRealtime();
  }, [fetchMeetingRoomBookings, setupMeetingRoomRealtime]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchMeetingRoomBookings({ silent: true });
    }, 15000);

    const refreshOnFocus = () => fetchMeetingRoomBookings({ silent: true });
    const refreshOnVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchMeetingRoomBookings({ silent: true });
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibilityChange);
    };
  }, [fetchMeetingRoomBookings]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SMART_FILTER_PRESET_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSavedFilterPresets(parsed);
    } catch (error) {
      console.error("Load preset error:", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SMART_FILTER_PRESET_KEY, JSON.stringify(savedFilterPresets));
  }, [savedFilterPresets]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_THEME_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    // Keep the ticket workspace in compact mode until the content column is wide enough.
    const mediaQuery = window.matchMedia("(max-width: 1279px)");
    const handleChange = (event) => setIsCompactView(event.matches);

    setIsCompactView(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const handleDashboardShortcuts = (event) => {
      const activeElement = document.activeElement;
      const isTypingField =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.tagName === "SELECT" ||
        activeElement?.isContentEditable;

      if (event.key === "/" && !isTypingField) {
        event.preventDefault();
        setIsRecentActivityModalOpen(true);
        window.setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
        return;
      }

      if (event.key?.toLowerCase() === "n" && !isTypingField && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        navigate("/create-ticket");
      }
    };

    window.addEventListener("keydown", handleDashboardShortcuts);
    return () => window.removeEventListener("keydown", handleDashboardShortcuts);
  }, [navigate]);

  useEffect(() => {
    if (!showProfileDetails) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowProfileDetails(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showProfileDetails]);

  useEffect(() => {
    const hasUtilityModalOpen =
      Boolean(selectedKpiMetricKey) ||
      isOperationalOverviewModalOpen ||
      isMeetingRoomStatusModalOpen ||
      isRecentActivityModalOpen;
    if (!hasUtilityModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedKpiMetricKey("");
        setIsOperationalOverviewModalOpen(false);
        setIsMeetingRoomStatusModalOpen(false);
        setIsRecentActivityModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedKpiMetricKey, isOperationalOverviewModalOpen, isMeetingRoomStatusModalOpen, isRecentActivityModalOpen]);

  useEffect(() => {
    if (!isStatusOverviewMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      const isInsideMobileMenu = mobileNavMenuRef.current?.contains(event.target);
      const isInsideDesktopMenu = desktopStatusOverviewMenuRef.current?.contains(event.target);

      if (!isInsideMobileMenu && !isInsideDesktopMenu) setIsStatusOverviewMenuOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsStatusOverviewMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isStatusOverviewMenuOpen]);

  useEffect(() => {
    if (!isMobileNavOpen) return undefined;

    const handlePointerDown = (event) => {
      if (mobileNavMenuRef.current && !mobileNavMenuRef.current.contains(event.target)) {
        setIsMobileNavOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    return () => {
      notificationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      notificationTimeoutsRef.current.clear();
    };
  }, []);

  // ============================================
  // âœ… BUSINESS LOGIC
  // ============================================

  // Calculate SLA Statistics
  const calculateSlaStats = (ticketsData) => {
    const closedTickets = ticketsData.filter(t => t.status === 'CLOSED');
    const totalClosed = closedTickets.length;

    if (totalClosed === 0) {
      setSlaStats({ onTime: 0, total: 0, percentage: 100 });
      return;
    }

    let onTimeCount = 0;

    closedTickets.forEach(ticket => {
      if (ticket.created_at && ticket.closed_at) {
        const created = new Date(ticket.created_at);
        const closed = new Date(ticket.closed_at);
        const hoursDiff = (closed - created) / (1000 * 60 * 60);

        const priority = ticket.priority || 'normal';
        const slaHours = localizedPriorityConfig[priority]?.slaHours || 8;

        if (hoursDiff <= slaHours) {
          onTimeCount++;
        }
      }
    });

    const percentage = Math.round((onTimeCount / totalClosed) * 100);
    setSlaStats({
      onTime: onTimeCount,
      total: totalClosed,
      percentage
    });
  };

  const categoryOptions = useMemo(() => {
    const uniq = [...new Set(tickets.map((t) => t.category).filter(Boolean))];
    return ["ALL", ...uniq];
  }, [tickets]);

  const todayRoomStatusCards = useMemo(() => {
    const dynamicRooms = [...MEETING_ROOMS];
    const bookingRooms = [...todayMeetingBookings, ...tomorrowMeetingBookings]
      .map((item) => item.room_name)
      .filter((name) => typeof name === "string" && name.trim());

    bookingRooms.forEach((roomName) => {
      if (!dynamicRooms.includes(roomName)) dynamicRooms.push(roomName);
    });

    return dynamicRooms.map((roomName) => {
      const roomBookings = todayMeetingBookings
        .filter((item) => item.room_name === roomName)
        .sort((left, right) => clockToMinutes(left.start_time) - clockToMinutes(right.start_time));

      if (!roomBookings.length) {
        return {
          roomName,
          slots: [
            {
              type: "available",
              startMinutes: MEETING_DAY_START_MINUTES,
              endMinutes: MEETING_DAY_END_MINUTES,
              isAllDay: true,
            },
          ],
          bookedCount: 0,
        };
      }

      const slots = [];
      let cursor = MEETING_DAY_START_MINUTES;

      roomBookings.forEach((booking) => {
        const bookingStart = Math.max(MEETING_DAY_START_MINUTES, clockToMinutes(booking.start_time));
        const bookingEnd = Math.min(MEETING_DAY_END_MINUTES, clockToMinutes(booking.end_time));

        if (bookingStart > cursor) {
          slots.push({
            type: "available",
            startMinutes: cursor,
            endMinutes: bookingStart,
          });
        }

        slots.push({
          type: "booked",
          startMinutes: bookingStart,
          endMinutes: bookingEnd,
          title: booking.title || rt("common.bookingTitle"),
          bookedBy: booking.booked_by || rt("common.noBookedBy"),
          id: booking.id,
        });

        cursor = Math.max(cursor, bookingEnd);
      });

      if (cursor < MEETING_DAY_END_MINUTES) {
        slots.push({
          type: "available",
          startMinutes: cursor,
          endMinutes: MEETING_DAY_END_MINUTES,
        });
      }

      return { roomName, slots, bookedCount: roomBookings.length };
    });
  }, [todayMeetingBookings, tomorrowMeetingBookings]);

  const normalizedUpcomingMeetingBookings = useMemo(() => {
    const now = new Date();

    return upcomingMeetingBookings
      .map((booking) => normalizeBookingForDisplay(booking))
      .filter(Boolean)
      .filter((booking) => booking.startsAt.getTime() >= now.getTime())
      .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  }, [upcomingMeetingBookings]);

  const nextMeetingBooking = normalizedUpcomingMeetingBookings[0] || null;
  const upcomingMeetingPreview = normalizedUpcomingMeetingBookings.slice(0, 4);

  const todayMeetingOverlapCount = useMemo(() => {
    const roomGroups = new Map();
    todayMeetingBookings.forEach((booking) => {
      const roomKey = String(booking.room_name || "").trim();
      if (!roomKey) return;
      if (!roomGroups.has(roomKey)) roomGroups.set(roomKey, []);
      roomGroups.get(roomKey).push(booking);
    });

    let overlapCount = 0;
    roomGroups.forEach((items) => {
      const sorted = [...items].sort((left, right) => clockToMinutes(left.start_time) - clockToMinutes(right.start_time));
      for (let index = 0; index < sorted.length - 1; index += 1) {
        const current = sorted[index];
        const next = sorted[index + 1];
        if (clockToMinutes(next.start_time) < clockToMinutes(current.end_time)) {
          overlapCount += 1;
        }
      }
    });

    return overlapCount;
  }, [todayMeetingBookings]);

  const normalizedTodayMeetingBookings = useMemo(() => {
    return todayMeetingBookings
      .map((booking) => normalizeBookingForDisplay(booking))
      .filter(Boolean)
      .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  }, [todayMeetingBookings]);

  // Smart filter: status + priority + category + SLA + search
  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    if (activeFilter === "CLOSED") {
      filtered = filtered.filter((t) => t.status === "CLOSED");
    } else if (activeFilter === "PENDING") {
      filtered = filtered.filter((t) => t.status !== "CLOSED");
    }

    if (priorityFilter !== "ALL") {
      filtered = filtered.filter((t) => (t.priority || "normal") === priorityFilter);
    }

    if (categoryFilter !== "ALL") {
      filtered = filtered.filter((t) => (t.category || "") === categoryFilter);
    }

    if (slaFilter !== "ALL") {
      filtered = filtered.filter((t) => getSlaState(t) === slaFilter);
    }

    if (searchQuery.trim()) {
      const searchTerms = searchQuery
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      filtered = filtered.filter((t) => {
        const statusSearchLabel = localizedStatusConfig[t.status]?.label || "";
        const prioritySearchLabel = localizedPriorityConfig[t.priority || "normal"]?.label || "";

        const haystack = [
          t.ticket_no,
          t.title,
          t.description,
          t.category,
          t.location,
          t.assigned_name,
          getTicketDisplayNote(t),
          t.status,
          statusSearchLabel,
          prioritySearchLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchTerms.every((term) => haystack.includes(term));
      });
    }

    return filtered;
  }, [
    tickets,
    activeFilter,
    priorityFilter,
    categoryFilter,
    slaFilter,
    searchQuery,
    localizedPriorityConfig,
    localizedStatusConfig,
  ]);

  const visibleTickets = useMemo(
    () => filteredTickets.slice(0, isCompactView ? 8 : 5),
    [filteredTickets, isCompactView],
  );

  const roleViews = useMemo(() => {
    const role = profile?.role || "user";
    return localizedRoleViews[role] || localizedRoleViews.user;
  }, [profile?.role, localizedRoleViews]);

  const priorityInbox = useMemo(() => {
    const priorityRank = { urgent: 4, high: 3, normal: 2, low: 1 };
    const slaRank = { OVERDUE: 3, RISK: 2, ON_TRACK: 1, CLOSED: 0 };

    return tickets
      .filter((ticket) => ticket.status !== "CLOSED")
      .map((ticket) => ({
        ...ticket,
        slaState: getSlaState(ticket),
      }))
      .sort((a, b) => {
        const slaDiff = (slaRank[b.slaState] || 0) - (slaRank[a.slaState] || 0);
        if (slaDiff !== 0) return slaDiff;

        const priorityDiff = (priorityRank[b.priority || "normal"] || 0) - (priorityRank[a.priority || "normal"] || 0);
        if (priorityDiff !== 0) return priorityDiff;

        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      })
      .slice(0, 4);
  }, [tickets]);

  const activeTicket = useMemo(() => {
    if (!filteredTickets.length) return null;
    return filteredTickets.find((ticket) => ticket.id === activeTicketId) || filteredTickets[0];
  }, [filteredTickets, activeTicketId]);

  const hasActiveSmartFilters = Boolean(
    searchQuery.trim() ||
    activeFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    slaFilter !== "ALL"
  );

  useEffect(() => {
    if (!filteredTickets.length) {
      setActiveTicketId(null);
      return;
    }

    const hasSelected = filteredTickets.some((ticket) => ticket.id === activeTicketId);
    if (!hasSelected) {
      setActiveTicketId(filteredTickets[0].id);
    }
  }, [filteredTickets, activeTicketId]);

  // Get time since last update
  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return rt("common.loading");

    try {
      return formatDistanceToNow(lastUpdated, {
        addSuffix: true,
        locale: dateLocale,
        includeSeconds: true
      });
    } catch {
      return rt("common.recently");
    }
  };

  // Calculate remaining SLA time
  const calculateRemainingSla = (ticket) => {
    if (!ticket.created_at || ticket.status === 'CLOSED') return null;

    const created = new Date(ticket.created_at);
    const now = new Date();
    const hoursPassed = (now - created) / (1000 * 60 * 60);

    const priority = ticket.priority || 'normal';
    const slaHours = localizedPriorityConfig[priority]?.slaHours || 8;
    const remainingHours = slaHours - hoursPassed;

    if (remainingHours <= 0) return { overdue: true, atRisk: false, hours: Math.abs(remainingHours) };
    return { overdue: false, atRisk: remainingHours <= 2, hours: remainingHours };
  };

  // Format date safely
  const formatDate = (dateString) => {
    if (!dateString) return rt("common.notSpecified");
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy', { locale: dateLocale });
    } catch {
      return rt("common.notSpecified");
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return rt("common.notSpecified");
    try {
      const date = new Date(dateString);
      return format(date, "dd MMM yyyy HH:mm", { locale: dateLocale });
    } catch {
      return rt("common.notSpecified");
    }
  };

  // Get status config (using static map)
  const getStatusConfig = (ticketOrStatus) => {
    const status = typeof ticketOrStatus === "object" ? ticketOrStatus?.status : ticketOrStatus;
    const detailMeta = typeof ticketOrStatus === "object" ? getTicketStatusDetailMeta(ticketOrStatus) : null;

    if (detailMeta) {
      const toneMap = {
        amber: {
          color: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-200",
          badgeGradient: "from-amber-500 to-orange-500",
        },
        sky: {
          color: "text-sky-700",
          bg: "bg-sky-50",
          border: "border-sky-200",
          badgeGradient: "from-sky-500 to-cyan-500",
        },
        violet: {
          color: "text-violet-700",
          bg: "bg-violet-50",
          border: "border-violet-200",
          badgeGradient: "from-violet-500 to-fuchsia-500",
        },
        slate: {
          color: "text-slate-700",
          bg: "bg-slate-100",
          border: "border-slate-200",
          badgeGradient: "from-slate-500 to-slate-600",
        },
        rose: {
          color: "text-rose-700",
          bg: "bg-rose-50",
          border: "border-rose-200",
          badgeGradient: "from-rose-500 to-pink-500",
        },
      };
      const toneConfig = toneMap[detailMeta.tone] || toneMap.slate;
      return {
        label: detailMeta.label,
        color: toneConfig.color,
        bg: toneConfig.bg,
        border: toneConfig.border,
        icon: AlertCircle,
        gradient: "from-white to-white",
        badgeGradient: toneConfig.badgeGradient,
      };
    }

    return localizedStatusConfig[status] || {
      label: dt("activity.noCategory"),
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      icon: AlertCircle,
      gradient: 'from-slate-50 to-slate-100',
      badgeGradient: 'from-slate-500 to-slate-600'
    };
  };

  // Get priority config (using static map)
  const getPriorityConfig = (priority) => {
    return localizedPriorityConfig[priority] || {
      label: dt("activity.noCategory"),
      color: 'bg-gradient-to-r from-slate-500 to-slate-600',
      icon: Timer,
      slaHours: 8
    };
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const Icon = resolveCategoryIcon(category);
    return <Icon size={16} />;
  };

  const buildTimelineEvents = (ticket) => {
    if (!ticket) return [];

    const events = [
      {
        id: "created",
        label: rt("timeline.createdLabel"),
        detail: rt("timeline.createdDetail"),
        date: ticket.created_at,
      },
    ];

    if (ticket.assigned_name || ticket.status === "IN_PROGRESS") {
      events.push({
        id: "assigned",
        label: rt("timeline.progressLabel"),
        detail: ticket.assigned_name ? rt("timeline.assignedDetail", { name: ticket.assigned_name }) : rt("timeline.waitingDetail"),
        date: ticket.updated_at || ticket.created_at,
      });
    }

    if (ticket.status === "CLOSED" || ticket.closed_at) {
      events.push({
        id: "closed",
        label: rt("timeline.closedLabel"),
        detail: getTicketDisplayNote(ticket) || rt("timeline.closedDetail"),
        date: ticket.closed_at || ticket.updated_at || ticket.created_at,
      });
    } else {
      events.push({
        id: "monitoring",
        label: rt("timeline.monitoringLabel"),
        detail: rt("timeline.statusDetail", { status: getStatusConfig(ticket).label }),
        date: ticket.updated_at || ticket.created_at,
      });
    }

    return events.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  };

  const trendMeta = (current, previous) => {
    const diff = current - previous;
    const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
    return { diff, direction };
  };

  // KPI strip: current 7 days vs previous 7 days
  const kpiMetrics = useMemo(() => {
    const role = profile?.role || "user";
    const now = new Date();
    const startCurrent = new Date(now);
    startCurrent.setDate(startCurrent.getDate() - 7);
    const startPrevious = new Date(startCurrent);
    startPrevious.setDate(startPrevious.getDate() - 7);

    const isInRange = (value, start, end) => {
      if (!value) return false;
      const date = new Date(value);
      return date >= start && date < end;
    };

    const openCurrent = tickets.filter((t) => t.status !== "CLOSED" && isInRange(t.created_at, startCurrent, now)).length;
    const openPrevious = tickets.filter((t) => t.status !== "CLOSED" && isInRange(t.created_at, startPrevious, startCurrent)).length;

    const riskCurrent = tickets.filter((t) => t.status !== "CLOSED" && getSlaState(t) === "RISK").length;
    const riskPrevious = tickets.filter((t) => t.status !== "CLOSED" && isInRange(t.created_at, startPrevious, startCurrent) && getSlaState(t) !== "ON_TRACK").length;

    const overdueCurrent = tickets.filter((t) => t.status !== "CLOSED" && getSlaState(t) === "OVERDUE").length;
    const overduePrevious = tickets.filter((t) => t.status !== "CLOSED" && isInRange(t.created_at, startPrevious, startCurrent) && getSlaState(t) === "OVERDUE").length;

    const closedCurrent = tickets.filter((t) => t.status === "CLOSED" && isInRange(t.closed_at, startCurrent, now)).length;
    const closedPrevious = tickets.filter((t) => t.status === "CLOSED" && isInRange(t.closed_at, startPrevious, startCurrent)).length;

    if (role !== "auditor") {
      const newCount = tickets.filter((t) => t.status === "NEW").length;
      const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;
      const closedCount = tickets.filter((t) => t.status === "CLOSED").length;
      const totalCount = tickets.length;
      const pendingCount = Math.max(newCount + inProgressCount, 1);
      const toPercent = (value, base) => Math.round((value / base) * 100);

      return [
        {
          key: "status-new",
          mode: "status",
          label: rt("metrics.statusNewLabel"),
          value: newCount,
          icon: Clock,
          iconWrap: "bg-amber-50",
          iconColor: "text-amber-600",
          valueColor: "text-amber-700",
          helperText: rt("metrics.pendingShare", { percent: toPercent(newCount, pendingCount) }),
        },
        {
          key: "status-progress",
          mode: "status",
          label: rt("metrics.statusProgressLabel"),
          value: inProgressCount,
          icon: Wrench,
          iconWrap: "bg-blue-50",
          iconColor: "text-blue-600",
          valueColor: "text-blue-700",
          helperText: rt("metrics.pendingShare", { percent: toPercent(inProgressCount, pendingCount) }),
        },
        {
          key: "status-closed",
          mode: "status",
          label: rt("metrics.statusClosedLabel"),
          value: closedCount,
          icon: CheckCircle2,
          iconWrap: "bg-emerald-50",
          iconColor: "text-emerald-600",
          valueColor: "text-emerald-700",
          helperText: rt("metrics.totalShare", { percent: toPercent(closedCount, Math.max(totalCount, 1)) }),
        },
        {
          key: "status-total",
          mode: "status",
          label: rt("metrics.totalLabel"),
          value: totalCount,
          icon: BarChart3,
          iconWrap: "bg-indigo-50",
          iconColor: "text-indigo-600",
          valueColor: "text-indigo-700",
          helperText: rt("metrics.realtimeStatus"),
        },
      ];
    }

    return [
      {
        key: "open",
        label: rt("metrics.open7dLabel"),
        value: openCurrent,
        icon: Clock,
        iconWrap: "bg-amber-50",
        iconColor: "text-amber-600",
        valueColor: "text-amber-700",
        trend: trendMeta(openCurrent, openPrevious),
      },
      {
        key: "risk",
        label: rt("metrics.riskLabel"),
        value: riskCurrent,
        icon: Timer,
        iconWrap: "bg-orange-50",
        iconColor: "text-orange-600",
        valueColor: "text-orange-700",
        trend: trendMeta(riskCurrent, riskPrevious),
      },
      {
        key: "overdue",
        label: rt("metrics.overdueLabel"),
        value: overdueCurrent,
        icon: AlertCircle,
        iconWrap: "bg-rose-50",
        iconColor: "text-rose-600",
        valueColor: "text-rose-700",
        trend: trendMeta(overdueCurrent, overduePrevious),
      },
      {
        key: "closed",
        label: rt("metrics.closed7dLabel"),
        value: closedCurrent,
        icon: CheckCircle2,
        iconWrap: "bg-emerald-50",
        iconColor: "text-emerald-600",
        valueColor: "text-emerald-700",
        trend: trendMeta(closedCurrent, closedPrevious),
      },
    ];
  }, [profile?.role, rt, tickets]);

  const openTicketCount = useMemo(
    () => tickets.filter((ticket) => ticket.status !== "CLOSED").length,
    [tickets],
  );

  const hasRecentActivityFlowPending = openTicketCount > 0;
  const recentActivityBadgeCount =
    openTicketCount > 0 ? Math.min(openTicketCount, 99) : Math.min(filteredTickets.length, 99);

  const borrowOpenCount = useMemo(
    () => borrowRequests.filter((request) => String(request?.status || "").toUpperCase() !== "CLOSED").length,
    [borrowRequests],
  );

  const operationalSnapshot = useMemo(() => {
    const snapshot = {
      total: tickets.length,
      open: 0,
      new: 0,
      inProgress: 0,
      closed: 0,
      otherOpen: 0,
      risk: 0,
      overdue: 0,
    };

    tickets.forEach((ticket) => {
      const status = String(ticket.status || "").toUpperCase();

      if (status === "CLOSED") {
        snapshot.closed += 1;
        return;
      }

      snapshot.open += 1;

      if (status === "NEW") {
        snapshot.new += 1;
      } else if (status === "IN_PROGRESS") {
        snapshot.inProgress += 1;
      } else {
        snapshot.otherOpen += 1;
      }

      const slaState = getSlaState(ticket);
      if (slaState === "RISK") snapshot.risk += 1;
      if (slaState === "OVERDUE") snapshot.overdue += 1;
    });

    return snapshot;
  }, [tickets]);

  const meetingRealtimeSummary = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const activeBookings = normalizedTodayMeetingBookings.filter((booking) => {
      const startMinutes = clockToMinutes(booking.startClock);
      const endMinutes = clockToMinutes(booking.endClock);
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    });

    return {
      activeRoomCount: new Set(activeBookings.map((booking) => String(booking.room_name || rt("operational.notSpecifiedRoom"))).size),
      totalRooms: todayRoomStatusCards.length,
      activeBookings,
    };
  }, [normalizedTodayMeetingBookings, rt, todayRoomStatusCards]);

  const operationalStatusChartData = useMemo(() => {
    const rows = [
      { key: "NEW", label: rt("metrics.statusNewLabel"), value: operationalSnapshot.new, fill: "#f59e0b" },
      { key: "IN_PROGRESS", label: rt("metrics.statusProgressLabel"), value: operationalSnapshot.inProgress, fill: "#2563eb" },
      { key: "CLOSED", label: rt("metrics.statusClosedLabel"), value: operationalSnapshot.closed, fill: "#10b981" },
    ];

    if (operationalSnapshot.otherOpen > 0) {
      rows.push({ key: "OTHER", label: rt("operational.otherStatus"), value: operationalSnapshot.otherOpen, fill: "#64748b" });
    }

    return rows;
  }, [operationalSnapshot, rt]);

  const operationalTrendData = useMemo(() => {
    const days = 7;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const rows = Array.from({ length: days }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (days - 1 - index));

      return {
        key: format(date, "yyyy-MM-dd"),
        label: format(date, "dd MMM", { locale: dateLocale }),
        created: 0,
        closed: 0,
      };
    });

    const rowByKey = new Map(rows.map((row) => [row.key, row]));

    tickets.forEach((ticket) => {
      const createdKey = extractDateKey(ticket.created_at);
      if (rowByKey.has(createdKey)) {
        rowByKey.get(createdKey).created += 1;
      }

      const closedKey = extractDateKey(ticket.closed_at);
      if (rowByKey.has(closedKey)) {
        rowByKey.get(closedKey).closed += 1;
      }
    });

    return rows;
  }, [dateLocale, tickets]);

  const operationalLoadData = useMemo(() => {
    const rows = [
      { name: rt("operational.openTickets"), value: operationalSnapshot.open, fill: "#2563eb" },
      { name: rt("operational.todayMeetings"), value: todayMeetingBookings.length, fill: "#14b8a6" },
      { name: "Notebook", value: notebookAttentionCount, fill: "#8b5cf6" },
      { name: rt("operational.accessPending"), value: accessRequestSummary.pending, fill: "#f97316" },
      { name: rt("operational.pendingNotes"), value: workNotesPendingCount, fill: "#0ea5e9" },
    ].filter((row) => row.value > 0);

    if (rows.length > 0) return rows;

    return [{ name: rt("operational.noQueue"), value: 1, fill: "#cbd5e1", isPlaceholder: true }];
  }, [
    accessRequestSummary.pending,
    notebookAttentionCount,
    operationalSnapshot.open,
    rt,
    todayMeetingBookings.length,
    workNotesPendingCount,
  ]);

  const operationalLoadTotal = useMemo(
    () => operationalSnapshot.open + todayMeetingBookings.length + notebookAttentionCount + accessRequestSummary.pending + workNotesPendingCount,
    [accessRequestSummary.pending, notebookAttentionCount, operationalSnapshot.open, todayMeetingBookings.length, workNotesPendingCount],
  );

  const operationalCategoryList = useMemo(() => {
    const bucket = new Map();

    tickets
      .filter((ticket) => ticket.status !== "CLOSED")
      .forEach((ticket) => {
        const category = String(ticket.category || rt("operational.uncategorized")).trim() || rt("operational.uncategorized");
        bucket.set(category, (bucket.get(category) || 0) + 1);
      });

    return [...bucket.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 4);
  }, [rt, tickets]);

  const operationalOverviewStats = useMemo(
    () => [
      {
        key: "open",
        label: rt("operational.openLabel"),
        value: operationalSnapshot.open,
        helper: rt("operational.openHelper", { newCount: operationalSnapshot.new, progressCount: operationalSnapshot.inProgress }),
        icon: BarChart3,
        iconWrap: "bg-indigo-50",
        iconColor: "text-indigo-600",
        valueColor: "text-indigo-700",
      },
      {
        key: "progress",
        label: rt("operational.progressLabel"),
        value: operationalSnapshot.inProgress,
        helper: rt("operational.progressHelper"),
        icon: Wrench,
        iconWrap: "bg-blue-50",
        iconColor: "text-blue-600",
        valueColor: "text-blue-700",
      },
      {
        key: "sla",
        label: rt("operational.slaLabel"),
        value: operationalSnapshot.risk + operationalSnapshot.overdue,
        helper: rt("operational.slaHelper", { count: operationalSnapshot.overdue }),
        icon: Timer,
        iconWrap: "bg-amber-50",
        iconColor: "text-amber-600",
        valueColor: "text-amber-700",
      },
      {
        key: "meeting-now",
        label: rt("operational.meetingLabel"),
        value: meetingRealtimeSummary.activeRoomCount,
        helper: rt("operational.meetingHelper", { totalRooms: meetingRealtimeSummary.totalRooms, count: todayMeetingBookings.length }),
        icon: Calendar,
        iconWrap: "bg-cyan-50",
        iconColor: "text-cyan-600",
        valueColor: "text-cyan-700",
      },
      {
        key: "notebook",
        label: rt("operational.notebookLabel"),
        value: notebookAttentionCount,
        helper: rt("operational.notebookHelper"),
        icon: Laptop,
        iconWrap: "bg-violet-50",
        iconColor: "text-violet-600",
        valueColor: "text-violet-700",
      },
      {
        key: "access",
        label: rt("operational.accessLabel"),
        value: accessRequestSummary.pending,
        helper: rt("operational.accessHelper"),
        icon: ShieldCheck,
        iconWrap: "bg-emerald-50",
        iconColor: "text-emerald-600",
        valueColor: "text-emerald-700",
      },
    ],
    [
      accessRequestSummary.pending,
      meetingRealtimeSummary.activeRoomCount,
      meetingRealtimeSummary.totalRooms,
      notebookAttentionCount,
      operationalSnapshot.inProgress,
      operationalSnapshot.new,
      operationalSnapshot.open,
      operationalSnapshot.overdue,
      operationalSnapshot.risk,
      rt,
      todayMeetingBookings.length,
    ],
  );

  const operationalBadgeCount = useMemo(
    () => Math.min(
      operationalSnapshot.open +
      accessRequestSummary.pending +
      notebookAttentionCount +
      meetingRealtimeSummary.activeRoomCount,
      99,
    ),
    [
      accessRequestSummary.pending,
      meetingRealtimeSummary.activeRoomCount,
      notebookAttentionCount,
      operationalSnapshot.open,
    ],
  );

  const upcomingMeetingCount = useMemo(
    () => normalizedUpcomingMeetingBookings.length,
    [normalizedUpcomingMeetingBookings],
  );

  const handleAssetQrDetected = useCallback((rawValue) => {
    const assetTag = extractAssetTagFromQr(rawValue);
    if (!assetTag) return;
    setIsAssetQrScannerOpen(false);
    navigate(`/asset-qr/${encodeURIComponent(assetTag)}`);
  }, [navigate]);

  const quickActions = useMemo(() => {
    const role = profile?.role || "user";
    const items = [
      {
        id: "scan-asset-qr",
        label: dt("quickActions.scanAsset.label"),
        description: dt("quickActions.scanAsset.description"),
        icon: ScanLine,
        accent: "indigo",
        cta: dt("quickActions.scanAsset.cta"),
        onClick: () => setIsAssetQrScannerOpen(true),
        featured: true,
        roles: ["user", "it_support", "it_manager", "executive", "admin"],
      },
      {
        id: "create-ticket",
        label: dt("quickActions.createTicket.label"),
        description: dt("quickActions.createTicket.description"),
        icon: Wrench,
        accent: "indigo",
        cta: dt("quickActions.createTicket.cta"),
        onClick: () => navigate("/create-ticket"),
        badgeCount: openTicketCount,
        roles: ["user", "it_support", "executive", "admin"],
      },
      {
        id: "pick-up",
        label: dt("quickActions.pickup.label"),
        description: dt("quickActions.pickup.description"),
        icon: Package,
        accent: "emerald",
        cta: dt("quickActions.pickup.cta"),
        onClick: () => navigate("/pick-up-equipment"),
        badgeCount: borrowOpenCount,
        roles: ["user", "it_support", "executive", "admin"],
      },
      {
        id: "notebook-center",
        label: dt("quickActions.notebook.label"),
        description: dt("quickActions.notebook.description"),
        icon: Laptop,
        accent: "violet",
        cta: dt("quickActions.notebook.cta"),
        onClick: () => navigate("/notebook-center"),
        badgeCount: notebookAttentionCount,
        roles: ["user", "it_support", "executive", "admin"],
      },
      {
        id: "work-notes",
        label: dt("quickActions.workNotes.label"),
        description: dt("quickActions.workNotes.description"),
        icon: FileText,
        accent: "indigo",
        cta: dt("quickActions.workNotes.cta"),
        onClick: () => navigate("/work-notes"),
        badgeCount: workNotesPendingCount,
        roles: ["user", "it_support", "executive", "admin", "auditor"],
      },
      {
        id: "meeting-room-booking",
        label: dt("quickActions.meetingRoom.label"),
        description: dt("quickActions.meetingRoom.description"),
        icon: Calendar,
        accent: "sky",
        cta: dt("quickActions.meetingRoom.cta"),
        onClick: () => navigate("/meeting-room-booking"),
        badgeCount: upcomingMeetingCount,
        roles: ["user", "it_support", "executive", "admin"],
      },
      {
        id: "history",
        label: dt("quickActions.history.label"),
        description: dt("quickActions.history.description"),
        icon: BarChart3,
        accent: "sky",
        cta: dt("quickActions.history.cta"),
        onClick: () =>
          navigate("/ticket-history", {
            state: {
              initialFilter: activeFilter,
              tickets,
            },
          }),
        badgeCount: openTicketCount,
        roles: ["user", "it_support", "executive", "admin", "auditor"],
      },
      {
        id: "chat-it",
        label: dt("quickActions.chatIt.label"),
        description: dt("quickActions.chatIt.description"),
        icon: MessageSquare,
        accent: "emerald",
        cta: dt("quickActions.chatIt.cta"),
        onClick: () => setSupportChatOpenSignal((value) => value + 1),
        roles: ["user", "it_support", "it_manager", "executive", "admin", "auditor"],
      },
      {
        id: "my-status",
        label: dt("quickActions.myStatus.label"),
        description: dt("quickActions.myStatus.description"),
        icon: CheckCircle2,
        accent: "sky",
        cta: dt("quickActions.myStatus.cta"),
        onClick: () => navigate("/my-status"),
        roles: ["user", "it_support", "it_manager", "executive", "admin", "auditor"],
      },
      {
        id: "access-request",
        label: dt("quickActions.accessRequest.label"),
        description: dt("quickActions.accessRequest.description"),
        icon: KeyRound,
        accent: "indigo",
        cta: dt("quickActions.accessRequest.cta"),
        onClick: () => navigate("/access-request"),
        roles: ["user", "it_support", "executive", "admin", "auditor"],
      },
      {
        id: "admin-dashboard",
        label: dt("quickActions.adminDashboard.label"),
        description: dt("quickActions.adminDashboard.description"),
        icon: ShieldCheck,
        accent: "violet",
        cta: dt("quickActions.adminDashboard.cta"),
        onClick: () => navigate("/admin-dashboard"),
        roles: ["it_support", "admin"],
      },
      {
        id: "audit-view",
        label: dt("quickActions.auditView.label"),
        description: dt("quickActions.auditView.description"),
        icon: Shield,
        accent: "slate",
        cta: dt("quickActions.auditView.cta"),
        onClick: () => navigate("/audit-view"),
        roles: ["auditor", "admin"],
      },
    ];

    return items.filter((item) => item.roles.includes(role));
  }, [activeFilter, borrowOpenCount, dt, navigate, notebookAttentionCount, openTicketCount, profile?.role, tickets, upcomingMeetingCount, workNotesPendingCount]);

  const primaryQuickActionIds = useMemo(
    () => new Set(["scan-asset-qr", "create-ticket", "pick-up", "notebook-center", "work-notes", "meeting-room-booking", "history"]),
    [],
  );

  const primaryQuickActions = useMemo(
    () => quickActions.filter((action) => primaryQuickActionIds.has(action.id)),
    [primaryQuickActionIds, quickActions],
  );

  const secondaryQuickActions = useMemo(() => {
    const items = quickActions.filter((action) => !primaryQuickActionIds.has(action.id));
    return items.sort((left, right) => {
      if (left.id === "chat-it" && right.id !== "chat-it") return -1;
      if (right.id === "chat-it" && left.id !== "chat-it") return 1;
      return 0;
    });
  }, [primaryQuickActionIds, quickActions]);

  const localizedNavMoreLinks = useMemo(
    () =>
      NAV_MORE_LINKS.map((item) => ({
        ...item,
        label: dt(`navMore.${item.id}`),
      })),
    [dt],
  );

  const canSeePriorityInbox = useMemo(() => {
    const role = profile?.role || "user";
    return role === "it_support" || role === "admin";
  }, [profile?.role]);

  const isDarkTheme = themeMode === "dark";
  const currentRole = profile?.role || "user";
  const isUserSearchMode = currentRole === "user" || currentRole === "executive";
  const roleLabel = localizedRoleLabels[currentRole] || localizedRoleLabels.user;
  const canOpenAuditView = currentRole === "admin" || currentRole === "auditor";

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleNavMoreOpen = (item) => {
    setIsStatusOverviewMenuOpen(false);
    setIsMobileNavOpen(false);

    if (item?.href) {
      window.open(item.href, "_blank", "noopener,noreferrer");
    }
  };

  // Dark-mode-aware CSS classes
  const FORM_CONTROL_CLASS = isDarkTheme
    ? "w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
    : "w-full rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300";
  const SEARCH_CONTROL_CLASS = isDarkTheme
    ? "w-full rounded-xl border border-slate-600 bg-slate-700 pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
    : "w-full rounded-xl border border-blue-200 bg-blue-50/70 pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300";
  const SECONDARY_BUTTON_CLASS = isDarkTheme
    ? "rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    : "rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300";
  const SURFACE_SECTION_CLASS = isDarkTheme
    ? "border-slate-700/70 bg-slate-900/75"
    : "border-blue-100/80 bg-white/90 shadow-blue-100/40";
  const SURFACE_PANEL_CLASS = isDarkTheme
    ? "border-slate-700 bg-slate-800/80"
    : "border-blue-100 bg-blue-50/70";
  const TEXT_PRIMARY_CLASS = isDarkTheme ? "text-slate-100" : "text-black";
  const TEXT_SECONDARY_CLASS = isDarkTheme ? "text-slate-300" : "text-slate-800";
  const TEXT_MUTED_CLASS = isDarkTheme ? "text-slate-400" : "text-slate-700";
  const TEXT_SUBTLE_CLASS = isDarkTheme ? "text-slate-500" : "text-slate-600";
  const CHART_AXIS_COLOR = isDarkTheme ? "#94a3b8" : "#64748b";
  const CHART_GRID_COLOR = isDarkTheme ? "#334155" : "#cbd5e1";
  const CHART_TOOLTIP_STYLE = isDarkTheme
    ? {
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      borderRadius: "1rem",
      color: "#e2e8f0",
    }
    : {
      backgroundColor: "#ffffff",
      border: "1px solid #dbeafe",
      borderRadius: "1rem",
      color: "#0f172a",
    };
  const QUICK_ACTIONS_HEADING_CLASS = `text-sm font-black uppercase tracking-[0.2em] ${TEXT_SUBTLE_CLASS}`;
  const QUICK_ACTIONS_TITLE_CLASS = `text-sm sm:text-base font-black ${TEXT_PRIMARY_CLASS}`;
  const QUICK_ACTIONS_DESCRIPTION_CLASS = `text-[11px] leading-relaxed ${TEXT_MUTED_CLASS}`;
  const STAT_LABEL_CLASS = `text-[10px] font-bold uppercase tracking-wide sm:text-[11px] ${TEXT_SUBTLE_CLASS}`;
  const STAT_VALUE_CLASS = "mt-0.5 text-lg font-black leading-none tracking-tight tabular-nums sm:text-xl";
  const STAT_HELPER_LABEL_CLASS = `text-[9px] font-bold uppercase tracking-wide sm:text-[10px] ${TEXT_SUBTLE_CLASS}`;
  const STAT_HELPER_TEXT_CLASS = `text-[10px] font-semibold leading-4 ${TEXT_MUTED_CLASS}`;
  const topNavPrimaryLinks = [
    {
      id: "meeting-room-status",
      label: dt("nav.meetingRoomStatus"),
      count: todayMeetingBookings.length,
      icon: Calendar,
      onClick: () => setIsMeetingRoomStatusModalOpen(true),
      cardClass: isDarkTheme
        ? "border-cyan-500/25 bg-cyan-500/10 text-slate-100 hover:border-cyan-400/60 hover:bg-cyan-500/15"
        : "border-cyan-200 bg-cyan-50/90 text-slate-800 hover:border-cyan-300 hover:bg-cyan-100/80",
      iconClass: isDarkTheme
        ? "bg-cyan-500/15 text-cyan-200"
        : "bg-white text-cyan-700 shadow-sm shadow-cyan-200/70",
      countClass: isDarkTheme
        ? "bg-cyan-500/15 text-cyan-200"
        : "bg-white text-cyan-700 shadow-sm shadow-cyan-200/70",
    },
    {
      id: "recent-activity",
      label: dt("nav.recentActivity"),
      count: recentActivityBadgeCount > 99 ? "99+" : recentActivityBadgeCount,
      icon: Clock,
      onClick: () => setIsRecentActivityModalOpen(true),
      cardClass: hasRecentActivityFlowPending
        ? isDarkTheme
          ? "border-amber-400/55 bg-amber-500/10 text-amber-50 shadow-[0_18px_34px_-26px_rgba(245,158,11,0.85)] hover:border-amber-300 hover:bg-amber-500/15"
          : "border-amber-300 bg-amber-50/95 text-slate-800 shadow-[0_18px_34px_-26px_rgba(245,158,11,0.55)] hover:border-amber-400 hover:bg-amber-100/90"
        : isDarkTheme
          ? "border-slate-600 bg-slate-800/90 text-slate-100 hover:border-slate-500 hover:bg-slate-800"
          : "border-blue-200 bg-white/95 text-slate-800 hover:border-blue-300 hover:bg-blue-50/85",
      iconClass: hasRecentActivityFlowPending
        ? isDarkTheme
          ? "bg-amber-500/15 text-amber-200"
          : "bg-white text-amber-700 shadow-sm shadow-amber-200/70"
        : isDarkTheme
          ? "bg-slate-700 text-slate-200"
          : "bg-blue-50 text-blue-700",
      countClass: hasRecentActivityFlowPending
        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
        : isDarkTheme
          ? "bg-amber-500/15 text-amber-200"
          : "bg-amber-50 text-amber-700",
    },
    {
      id: "borrow-requests",
      label: dt("nav.borrowRequests"),
      count: borrowOpenCount > 99 ? "99+" : borrowOpenCount,
      icon: Package,
      onClick: () => navigate("/my-borrow-requests"),
      cardClass: isDarkTheme
        ? "border-emerald-500/25 bg-emerald-500/10 text-slate-100 hover:border-emerald-400/60 hover:bg-emerald-500/15"
        : "border-emerald-200 bg-emerald-50/90 text-slate-800 hover:border-emerald-300 hover:bg-emerald-100/80",
      iconClass: isDarkTheme
        ? "bg-emerald-500/15 text-emerald-200"
        : "bg-white text-emerald-700 shadow-sm shadow-emerald-200/70",
      countClass: isDarkTheme
        ? "bg-emerald-500/15 text-emerald-200"
        : "bg-white text-emerald-700 shadow-sm shadow-emerald-200/70",
    },
  ];
  const statusOverviewTotalCount = topNavPrimaryLinks.reduce((total, item) => {
    const numericCount = Number.parseInt(item.count, 10);
    return total + (Number.isFinite(numericCount) ? numericCount : 0);
  }, 0);
  const mobileNavDepartment = String(profile?.department || dt("nav.notSpecifiedDepartment")).trim();
  const mobileNavEmployeeCode = String(profile?.employee_code || dt("nav.notSpecified")).trim();
  const mobileNavEmployeeCodeCompact = (() => {
    if (!mobileNavEmployeeCode || mobileNavEmployeeCode === dt("nav.notSpecified")) return "--";
    return mobileNavEmployeeCode.slice(-4);
  })();
  const mobileNavIdentityTitle = `ID: ${mobileNavEmployeeCode} • ${mobileNavDepartment}`;
  const profileAvatarUrl = profile?.avatar_url || profile?.id_card_url || "";
  const profileDetailItems = [
    { key: "employee-code", label: rt("profile.employeeId"), value: profile?.employee_code || rt("common.notSpecified"), icon: Hash },
    { key: "email", label: rt("profile.email"), value: profile?.email || rt("common.noEmail"), icon: Mail },
    { key: "phone", label: rt("profile.phone"), value: profile?.phone || rt("common.noPhone"), icon: Phone },
    { key: "location", label: rt("profile.location"), value: profile?.location || rt("common.noLocation"), icon: MapPin },
  ];

  // ============================================
  // âœ… EVENT HANDLERS
  // ============================================

  const handleLogout = async () => {
    try {
      // à¸›à¸´à¸”à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­ Realtime à¸à¹ˆà¸­à¸™à¸­à¸­à¸ (à¸–à¹‰à¸²à¸¡à¸µ)
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
      }
      if (meetingRoomChannelRef.current) {
        await supabase.removeChannel(meetingRoomChannelRef.current);
      }
      if (accessRequestChannelRef.current) {
        await supabase.removeChannel(accessRequestChannelRef.current);
      }

      await supabase.auth.signOut();
      setIsLogoutConfirmOpen(false); // à¸›à¸´à¸” Modal
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      setIsLogoutConfirmOpen(false);
    }
  };

  const handleViewAllClick = () => {
    navigate("/ticket-history", {
      state: {
        initialFilter: activeFilter,
        tickets: tickets
      }
    });
  };

  const clearSmartFilters = () => {
    setActiveFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryFilter("ALL");
    setSlaFilter("ALL");
    setSearchQuery("");
    setSelectedPresetId("");
    setActiveRoleViewId("");
  };

  const applySelectedPreset = () => {
    const preset = savedFilterPresets.find((item) => item.id === selectedPresetId);
    if (!preset) return;

    setActiveFilter(preset.filters?.activeFilter || "ALL");
    setPriorityFilter(preset.filters?.priorityFilter || "ALL");
    setCategoryFilter(preset.filters?.categoryFilter || "ALL");
    setSlaFilter(preset.filters?.slaFilter || "ALL");
    setSearchQuery(preset.filters?.searchQuery || "");
    setActiveRoleViewId("");
  };

  const applyRoleView = (view) => {
    if (!view) return;
    setActiveRoleViewId(view.id);
    setSelectedPresetId("");
    setActiveFilter(view.filters?.activeFilter || "ALL");
    setPriorityFilter(view.filters?.priorityFilter || "ALL");
    setCategoryFilter(view.filters?.categoryFilter || "ALL");
    setSlaFilter(view.filters?.slaFilter || "ALL");
    setSearchQuery(view.filters?.searchQuery || "");
  };

  const saveCurrentPreset = async () => {
    const { value: presetName, isConfirmed } = await Swal.fire({
      title: rt("preset.title"),
      input: "text",
      inputLabel: rt("preset.inputLabel"),
      inputPlaceholder: rt("preset.inputPlaceholder"),
      confirmButtonText: rt("preset.confirm"),
      cancelButtonText: rt("preset.cancel"),
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      inputValidator: (value) => {
        if (!value || !value.trim()) return rt("preset.validation");
        return undefined;
      },
    });

    if (!isConfirmed || !presetName?.trim()) return;

    const normalized = presetName.trim();
    const preset = {
      id: `preset-${Date.now()}`,
      name: normalized,
      filters: {
        activeFilter,
        priorityFilter,
        categoryFilter,
        slaFilter,
        searchQuery,
      },
      updatedAt: new Date().toISOString(),
    };

    setSavedFilterPresets((prev) => [preset, ...prev.filter((item) => item.name !== normalized)].slice(0, 10));
    setSelectedPresetId(preset.id);
  };

  const deleteSelectedPreset = () => {
    if (!selectedPresetId) return;
    setSavedFilterPresets((prev) => prev.filter((item) => item.id !== selectedPresetId));
    setSelectedPresetId("");
  };

  const handleTicketCardSelection = (ticket, { openModal = isCompactView } = {}) => {
    if (!ticket) return;
    setActiveTicketId(ticket.id);
    if (openModal) {
      setSelectedTicket(ticket);
    }
  };

  useEffect(() => {
    if (!activeRoleViewId) return;
    const view = roleViews.find((item) => item.id === activeRoleViewId);
    if (!view) {
      setActiveRoleViewId("");
      return;
    }

    const filters = view.filters || {};
    const isSameView =
      (filters.activeFilter || "ALL") === activeFilter &&
      (filters.priorityFilter || "ALL") === priorityFilter &&
      (filters.categoryFilter || "ALL") === categoryFilter &&
      (filters.slaFilter || "ALL") === slaFilter &&
      (filters.searchQuery || "") === searchQuery;

    if (!isSameView) setActiveRoleViewId("");
  }, [activeRoleViewId, roleViews, activeFilter, priorityFilter, categoryFilter, slaFilter, searchQuery]);

  const dismissDashboardNotification = useCallback((notificationId) => {
    const activeTimer = notificationTimeoutsRef.current.get(notificationId);
    if (activeTimer) {
      window.clearTimeout(activeTimer);
      notificationTimeoutsRef.current.delete(notificationId);
    }

    setDashboardNotifications((previous) =>
      previous.filter((notification) => notification.id !== notificationId),
    );
  }, []);

  function showUpdateNotification(title, message, tone = "indigo") {
    const notificationId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setDashboardNotifications((previous) => [
      ...previous.slice(-2),
      {
        id: notificationId,
        title,
        message,
        tone,
      },
    ]);

    const timeoutId = window.setTimeout(() => {
      dismissDashboardNotification(notificationId);
    }, 5000);

    notificationTimeoutsRef.current.set(notificationId, timeoutId);
  }

  // ============================================
  // âœ… RENDER FUNCTIONS
  // ============================================

  const renderSLAIndicator = (ticket) => {
    const slaInfo = calculateRemainingSla(ticket);
    if (!slaInfo) return null;

    if (slaInfo.overdue) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-md">
          <Timer size={10} />
          <span>{rt("sla.overdue", { hours: slaInfo.hours.toFixed(1) })}</span>
        </div>
      );
    }

    if (slaInfo.atRisk) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-md">
          <Timer size={10} />
          <span>{rt("sla.atRisk", { hours: slaInfo.hours.toFixed(1) })}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md">
        <Timer size={10} />
        <span>{rt("sla.remaining", { hours: slaInfo.hours.toFixed(1) })}</span>
      </div>
    );
  };

  const selectedKpiMetric = useMemo(() => {
    if (!selectedKpiMetricKey) return null;

    const now = new Date();
    const rollingWindowStart = new Date(now);
    rollingWindowStart.setDate(rollingWindowStart.getDate() - 7);

    const sortByRecent = (items) =>
      [...items].sort(
        (left, right) =>
          new Date(right.updated_at || right.closed_at || right.created_at || 0).getTime() -
          new Date(left.updated_at || left.closed_at || left.created_at || 0).getTime(),
      );

    const isWithinRollingWindow = (value) => {
      if (!value) return false;
      const date = new Date(value);
      return date >= rollingWindowStart && date <= now;
    };

    let title = "";
    let description = "";
    let items = [];

    switch (selectedKpiMetricKey) {
      case "status-new":
        title = rt("kpiDetail.statusNewTitle");
        description = rt("kpiDetail.statusNewDescription");
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() === "NEW");
        break;
      case "status-progress":
        title = rt("kpiDetail.statusProgressTitle");
        description = rt("kpiDetail.statusProgressDescription");
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() === "IN_PROGRESS");
        break;
      case "status-closed":
        title = rt("kpiDetail.statusClosedTitle");
        description = rt("kpiDetail.statusClosedDescription");
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() === "CLOSED");
        break;
      case "status-total":
        title = rt("kpiDetail.statusTotalTitle");
        description = rt("kpiDetail.statusTotalDescription");
        items = tickets;
        break;
      case "open":
        title = rt("kpiDetail.openTitle");
        description = rt("kpiDetail.openDescription");
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() !== "CLOSED" && isWithinRollingWindow(ticket.created_at));
        break;
      case "risk":
        title = rt("kpiDetail.riskTitle");
        description = rt("kpiDetail.riskDescription");
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() !== "CLOSED" && getSlaState(ticket) === "RISK");
        break;
      case "overdue":
        title = rt("kpiDetail.overdueTitle");
        description = rt("kpiDetail.overdueDescription");
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() !== "CLOSED" && getSlaState(ticket) === "OVERDUE");
        break;
      case "closed":
        title = rt("kpiDetail.closedTitle");
        description = rt("kpiDetail.closedDescription");
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() === "CLOSED" && isWithinRollingWindow(ticket.closed_at));
        break;
      default:
        return null;
    }

    return {
      key: selectedKpiMetricKey,
      title,
      description,
      total: items.length,
      items: sortByRecent(items).slice(0, 12),
    };
  }, [rt, selectedKpiMetricKey, tickets]);

  const renderStatsCards = () => {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 xl:grid-cols-4">
        {kpiMetrics.map((card) => {
          const isTrendCard = card.mode !== "status";
          const isReverseTrend = card.key === "risk" || card.key === "overdue";
          const trendColor = !isTrendCard
            ? "text-slate-500"
            : card.trend.direction === "flat"
              ? "text-slate-500"
              : isReverseTrend
                ? (card.trend.direction === "up" ? "text-rose-600" : "text-emerald-600")
                : (card.trend.direction === "up" ? "text-emerald-600" : "text-rose-600");

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setSelectedKpiMetricKey(card.key)}
              className={`rounded-2xl border p-2.5 text-left shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 sm:p-3 ${isDarkTheme ? "border-slate-700/70 bg-slate-900/75 focus-visible:ring-indigo-400" : "border-blue-100/80 bg-white/95 shadow-blue-100/40 focus-visible:ring-blue-300"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={STAT_LABEL_CLASS}>{card.label}</p>
                  <p className={`${STAT_VALUE_CLASS} ${card.valueColor}`}>{card.value}</p>
                </div>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 sm:rounded-xl ${card.iconWrap}`}>
                  <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.iconColor}`} />
                </div>
              </div>
              {isTrendCard ? (
                <div className={`mt-1.5 flex items-center justify-between rounded-lg border px-2 py-1 ${isDarkTheme ? "border-slate-700 bg-slate-800/80" : "border-slate-100 bg-slate-50/90"}`}>
                  <p className={STAT_HELPER_LABEL_CLASS}>{rt("common.comparePrevious7Days")}</p>
                  <p className={`text-[11px] font-black tabular-nums sm:text-xs ${trendColor}`}>
                    {card.trend.diff > 0 ? "+" : ""}
                    {card.trend.diff}
                  </p>
                </div>
              ) : (
                <div className={`mt-1.5 rounded-lg border px-2 py-1 ${isDarkTheme ? "border-slate-700 bg-slate-800/80" : "border-slate-100 bg-slate-50/90"}`}>
                  <p className={STAT_HELPER_LABEL_CLASS}>{rt("common.currentStatus")}</p>
                  <p className={`mt-0.5 line-clamp-2 sm:line-clamp-1 ${STAT_HELPER_TEXT_CLASS}`}>{card.helperText}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderNavBrand = ({ className = "", compact = false } = {}) => (
    <div className={`flex min-w-0 items-center shadow-sm ${compact ? "gap-1.5 rounded-2xl px-1.5 py-1.5" : "gap-2.5 rounded-[22px] px-2.5 py-1.5"} ${isDarkTheme ? "border-slate-700 bg-slate-800/85" : "border-blue-200/80 bg-white/90 shadow-blue-100/60"} border ${className}`}>
      <div className="relative">
        <img
          src={tdkLogo}
          alt={rt("common.companyLogoAlt")}
          className={`${compact ? "h-7 w-7 rounded-lg" : "h-9 w-9 rounded-xl xl:h-10 xl:w-10"} bg-white object-contain p-1 shadow-lg shadow-blue-200 animate-float`}
        />
        <div className={`absolute ${compact ? "-bottom-0.5 -right-0.5 h-3 w-3" : "-bottom-1 -right-1 h-4 w-4"} rounded-full border-2 border-white bg-emerald-500 animate-pulse`}></div>
      </div>
      <div className="min-w-0">
        <h1 className={`truncate bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text font-black leading-none tracking-tight text-transparent ${compact ? "text-[12px]" : "text-[15px] xl:text-lg"}`}>
          {compact ? "TDK" : "TDK INDUSTRIAL"}
        </h1>
        <p className={`mt-0.5 hidden text-[9px] font-bold uppercase tracking-wider 2xl:block ${TEXT_SUBTLE_CLASS}`}>
          {rt("common.companyName")}
        </p>
      </div>
    </div>
  );

  const renderNavMoreLinkButtons = () => (
    <div className="grid grid-cols-2 gap-1.5">
      {localizedNavMoreLinks
        .filter((item) => item.href)
        .map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavMoreOpen(item)}
            className={`group flex min-w-0 items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left text-[11px] font-bold transition focus:outline-none focus-visible:ring-2 ${isDarkTheme ? "border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-700 focus-visible:ring-indigo-400" : "border-blue-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 focus-visible:ring-blue-300"}`}
            title={item.description}
          >
            <span className="truncate">{item.label}</span>
            <ExternalLink size={12} className="shrink-0 opacity-60 transition group-hover:opacity-100" />
          </button>
        ))}
    </div>
  );

  const renderStatusOverviewMenuContent = ({ mobile = false } = {}) => (
    <div className={`rounded-[22px] border shadow-2xl ${mobile ? "max-h-[min(68dvh,32rem)] overflow-y-auto p-2" : "p-2.5"} ${isDarkTheme ? "border-slate-700 bg-slate-900/95" : "border-blue-200 bg-white/95 shadow-blue-200/70"}`}>
      <div className={`flex items-start justify-between gap-3 px-1 ${mobile ? "mb-1.5" : "mb-2"}`}>
        <div className="min-w-0">
          <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${TEXT_SUBTLE_CLASS}`}>{dt("nav.statusOverview")}</p>
          <p className={`mt-1 text-[11px] ${TEXT_MUTED_CLASS}`}>{rt("operational.footerHint")}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsStatusOverviewMenuOpen(false)}
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-blue-200 bg-white text-slate-600 hover:bg-blue-50"}`}
          aria-label="Close status overview"
        >
          <X size={14} />
        </button>
      </div>

      <div className={mobile ? "space-y-1.5" : "space-y-2"}>
        {topNavPrimaryLinks.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setIsStatusOverviewMenuOpen(false);
                setIsMobileNavOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center rounded-2xl border text-left transition focus:outline-none ${mobile ? "gap-2.5 px-2.5 py-2.5" : "gap-3 px-3 py-2.5"} ${item.cardClass} ${isDarkTheme ? "focus-visible:ring-2 focus-visible:ring-indigo-400" : "focus-visible:ring-2 focus-visible:ring-blue-300"}`}
            >
              <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl ${mobile ? "h-8 w-8" : "h-9 w-9"} ${item.iconClass}`}>
                <Icon size={mobile ? 15 : 16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-black ${mobile ? "text-[13px]" : "text-sm"}`}>{item.label}</span>
                <span className={`mt-0.5 block text-[11px] ${TEXT_MUTED_CLASS}`}>{rt("common.currentStatus")}</span>
              </span>
              <span className={`inline-flex min-w-[1.6rem] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${item.countClass}`}>
                {item.count}
              </span>
              <ChevronRight size={14} className="shrink-0" />
            </button>
          );
        })}

        <div className={`border-t ${mobile ? "px-1 pt-2" : "px-1 pt-2.5"} ${isDarkTheme ? "border-slate-700" : "border-blue-100"}`}>
          <div className="mb-1.5 flex items-center gap-2">
            <SlidersHorizontal size={14} className={TEXT_SUBTLE_CLASS} />
            <span className={`text-[11px] font-black uppercase tracking-[0.14em] ${TEXT_SUBTLE_CLASS}`}>{dt("nav.moreMenu")}</span>
          </div>
          {renderNavMoreLinkButtons()}
        </div>
      </div>
    </div>
  );

  const renderProfilePanel = ({ containerClassName = "" } = {}) => (
    <div className={`relative flex flex-col ${containerClassName}`}>
      <div className={`order-1 overflow-hidden rounded-[28px] shadow-lg backdrop-blur-md group transition-all duration-500 hover:shadow-2xl lg:order-2 ${isDarkTheme ? "bg-slate-900/75 shadow-slate-900/40" : "bg-white/90 shadow-[0_14px_40px_-16px_rgba(43,89,176,0.4)]"}`}>
        <div className={`relative h-16 overflow-hidden sm:h-24 ${isDarkTheme ? "bg-gradient-to-r from-[#2b59b0] via-[#2b59b0] to-[#244a95]" : "bg-gradient-to-r from-[#2b59b0] via-[#2b59b0] to-[#244a95]"}`}>
          <div className={`absolute inset-0 ${isDarkTheme ? "bg-gradient-to-r from-[#2b59b0]/20 via-[#2b59b0]/20 to-[#244a95]/20" : "bg-gradient-to-r from-[#2b59b0]/25 via-[#2b59b0]/18 to-[#244a95]/15"}`}></div>
          <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl sm:h-40 sm:w-40"></div>
          <div className="absolute bottom-3 right-4 text-2xl font-black text-white/10 sm:bottom-4 sm:right-6 sm:text-4xl">TDK</div>
        </div>

        <div className="relative px-4 pb-4 sm:px-6 sm:pb-5">
          <div className="relative -mt-6 mb-3 flex justify-center sm:-mt-9 sm:mb-5">
            <div
              className={`relative h-20 w-20 cursor-pointer overflow-hidden rounded-3xl p-1.5 shadow-2xl group/profile sm:h-28 sm:w-28 ${isDarkTheme ? "bg-slate-800" : "bg-white"}`}
              onClick={() => profileAvatarUrl && setIsModalOpen(true)}
            >
              <div className={`absolute inset-0 ${isDarkTheme ? "bg-gradient-to-br from-[#2b59b0]/12 to-[#244a95]/12" : "bg-gradient-to-br from-[#2b59b0]/15 to-[#244a95]/15"}`}></div>
              {profileAvatarUrl ? (
                <>
                  <img
                    src={profileAvatarUrl}
                    className="w-full h-full object-cover rounded-2xl transform group-hover/profile:scale-105 transition-transform duration-500"
                    alt={rt("common.profileAlt")}
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-all duration-300 group-hover/profile:opacity-100">
                    <ExternalLink size={20} className="text-white transform transition-transform group-hover/profile:scale-110" />
                  </div>
                </>
              ) : (
                <div className={`w-full h-full rounded-2xl flex items-center justify-center ${isDarkTheme ? "bg-gradient-to-br from-slate-700 to-slate-800 text-slate-400" : "bg-gradient-to-br from-[#EEF3FF] to-[#DCE8FF] text-[#2b59b0]"}`}>
                  <User size={40} />
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 text-center sm:mb-5">
            <h2 className={`text-base font-black sm:text-xl ${TEXT_PRIMARY_CLASS}`}>{profile?.full_name || rt("common.noName")}</h2>
            <p className={`mt-1 text-xs font-bold uppercase tracking-widest ${isDarkTheme ? "text-indigo-300" : "text-[#2b59b0]"}`}>
              {profile?.position || rt("common.employee")}
            </p>
          </div>

          <div className="space-y-2.5">
            <div className={`flex items-center gap-3 rounded-xl p-3 transition-all group/item ${isDarkTheme ? "bg-slate-800/80 hover:bg-slate-800" : "bg-[#EEF3FF]/70 hover:bg-white"}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2b59b0] to-[#244a95]">
                <Building2 size={15} className="text-white" />
              </div>
              <div className="flex-1">
                <p className={`text-[10px] uppercase font-bold ${TEXT_SUBTLE_CLASS}`}>{rt("common.department")}</p>
                <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{profile?.department || rt("common.notSpecified")}</p>
              </div>
            </div>

            <div className={`flex items-center gap-3 rounded-xl p-3 transition-all group/item ${isDarkTheme ? "bg-slate-800/80 hover:bg-slate-800" : "bg-[#EEF3FF]/70 hover:bg-white"}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2b59b0] to-[#244a95]">
                <Briefcase size={15} className="text-white" />
              </div>
              <div className="flex-1">
                <p className={`text-[10px] uppercase font-bold ${TEXT_SUBTLE_CLASS}`}>{rt("common.position")}</p>
                <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{profile?.position || rt("common.employee")}</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowProfileDetails((prev) => !prev)}
                aria-expanded={showProfileDetails}
                aria-label={showProfileDetails ? rt("common.profileHide") : rt("common.profileShow")}
                title={showProfileDetails ? rt("common.profileHide") : rt("common.profileShow")}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-300 focus:outline-none focus-visible:ring-2 ${isDarkTheme
                  ? "border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800 focus-visible:ring-indigo-400"
                  : "border-slate-200 bg-white text-[#2b59b0] hover:bg-[#F8FBFF] focus-visible:ring-blue-300"
                  } ${showProfileDetails ? "rotate-90" : ""}`}
              >
                <Settings size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOperationalMiniDashboard = () => {
    const loadLegend = operationalLoadData.filter((item) => !item.isPlaceholder).slice(0, 3);

    return (
      <section className={`overflow-hidden rounded-[2rem] border p-4 shadow-sm backdrop-blur-sm sm:p-5 ${SURFACE_SECTION_CLASS}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-emerald-500" />
              <h3 className={QUICK_ACTIONS_HEADING_CLASS}>{rt("operational.title")}</h3>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${isDarkTheme ? "border-emerald-700/50 bg-emerald-900/30 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {rt("common.active")}
              </span>
            </div>
            <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{rt("operational.subtitle")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-white text-slate-700"}`}>
              {rt("common.sync")}: {lastUpdated ? formatDateTime(lastUpdated) : rt("common.loading")}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-amber-700/60 bg-amber-900/30 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              {rt("operational.slaWatch", { count: operationalSnapshot.risk + operationalSnapshot.overdue })}
            </span>
            <button
              type="button"
              onClick={() => setIsOperationalOverviewModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2b59b0] to-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20"
            >
              {rt("common.fullView")}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.05fr)_minmax(280px,0.85fr)]">
          <button
            type="button"
            onClick={() => setIsOperationalOverviewModalOpen(true)}
            className={`rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${isDarkTheme ? "border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800/80" : "border-slate-200 bg-gradient-to-br from-white to-blue-50/80"}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("operational.queueStatus")}</p>
                <p className={`mt-1 text-sm font-black ${TEXT_PRIMARY_CLASS}`}>{rt("operational.queueOpenItems", { count: operationalSnapshot.open })}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${isDarkTheme ? "bg-slate-700 text-slate-200" : "bg-white text-slate-600"}`}>
                {rt("common.currentStatus")}
              </span>
            </div>
            <StableChartContainer className="h-28 min-w-0">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                  <BarChart data={operationalStatusChartData} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${value} ${rt("common.items")}`, rt("common.amount")]} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {operationalStatusChartData.map((entry) => (
                        <Cell key={`mini-status-${entry.key}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </StableChartContainer>
          </button>

          <button
            type="button"
            onClick={() => setIsOperationalOverviewModalOpen(true)}
            className={`rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${isDarkTheme ? "border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800/80" : "border-slate-200 bg-gradient-to-br from-white to-indigo-50/70"}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("operational.sevenDayMotion")}</p>
                <p className={`mt-1 text-sm font-black ${TEXT_PRIMARY_CLASS}`}>{rt("operational.createdVsClosed")}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${isDarkTheme ? "bg-slate-700 text-slate-200" : "bg-white text-slate-600"}`}>
                {rt("common.comparePrevious7Days")}
              </span>
            </div>
            <StableChartContainer className="h-28 min-w-0">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                  <LineChart data={operationalTrendData} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [`${value} ${rt("common.items")}`, name === "created" ? rt("metrics.open7dLabel") : rt("metrics.closed7dLabel")]} />
                    <Line type="monotone" dataKey="created" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </StableChartContainer>
          </button>

          <button
            type="button"
            onClick={() => setIsOperationalOverviewModalOpen(true)}
            className={`rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${isDarkTheme ? "border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800/80" : "border-slate-200 bg-gradient-to-br from-white to-cyan-50/70"}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("operational.workloadMix")}</p>
                <p className={`mt-1 text-sm font-black ${TEXT_PRIMARY_CLASS}`}>{rt("operational.followUpItems", { count: operationalLoadTotal })}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${isDarkTheme ? "bg-slate-700 text-slate-200" : "bg-white text-slate-600"}`}>
                {rt("common.currentStatus")}
              </span>
            </div>
            <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
              <StableChartContainer className="relative h-28 min-w-0">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                    <PieChart>
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [`${value} ${rt("common.items")}`, name]} />
                      <Pie data={operationalLoadData} dataKey="value" nameKey="name" innerRadius={28} outerRadius={42} paddingAngle={3} stroke="transparent">
                        {operationalLoadData.map((entry, index) => (
                          <Cell key={`mini-load-${entry.name}-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : null}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${TEXT_SUBTLE_CLASS}`}>Live</p>
                    <p className={`text-xl font-black ${TEXT_PRIMARY_CLASS}`}>{operationalLoadTotal}</p>
                  </div>
                </div>
              </StableChartContainer>

              <div className="space-y-2">
                {loadLegend.length > 0 ? (
                  loadLegend.map((item) => (
                    <div key={`mini-load-label-${item.name}`} className="flex items-center justify-between gap-2">
                      <span className={`inline-flex min-w-0 items-center gap-2 text-[11px] font-bold ${TEXT_SECONDARY_CLASS}`}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className={`text-xs font-black ${TEXT_PRIMARY_CLASS}`}>{item.value}</span>
                    </div>
                  ))
                ) : (
                  <p className={`text-xs ${TEXT_MUTED_CLASS}`}>{rt("operational.noExtraWorkload")}</p>
                )}
              </div>
            </div>
          </button>
        </div>
      </section>
    );
  };

  const renderTicketItem = (ticket) => {
    const statusConfig = getStatusConfig(ticket);
    const priorityConfig = getPriorityConfig(ticket.priority);
    const StatusIcon = statusConfig.icon;
    const slaIndicator = renderSLAIndicator(ticket);
    const isActive = activeTicket?.id === ticket.id;
    const ticketLocation = String(ticket?.location || "").trim() || rt("common.noLocation");

    return (
      <div
        key={ticket.id}
        className={`group w-full rounded-2xl border p-4 text-left shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg focus-within:ring-2 focus-within:ring-indigo-400 ${isActive
          ? (isDarkTheme ? "border-indigo-500 ring-2 ring-indigo-900/40 shadow-md bg-slate-900/90" : "border-indigo-300 ring-2 ring-indigo-100 shadow-md bg-white/95")
          : (isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-white/95")
          }`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => handleTicketCardSelection(ticket)}
            role="option"
            aria-selected={isActive}
            className="min-w-0 flex-1 rounded-xl text-left focus:outline-none"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${statusConfig.bg}`}>
                  <StatusIcon size={18} className={statusConfig.color} />
                  <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${statusConfig.color.replace("text", "bg")}`}></div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${isDarkTheme ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-50 text-indigo-600"}`}>
                      {ticket.ticket_no || `T${ticket.id?.slice(-6).toUpperCase()}`}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-bold text-white ${priorityConfig.color}`}>
                      {priorityConfig.label}
                    </span>
                    {slaIndicator}
                  </div>

                  <h4 className={`truncate font-bold ${TEXT_PRIMARY_CLASS}`}>{ticket.title || rt("ticket.noTitle")}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs ${TEXT_MUTED_CLASS}`}>
                      {getCategoryIcon(ticket.category)}
                      {ticket.category || rt("ticket.noCategory")}
                    </span>
                    <span className={`hidden text-xs sm:inline ${TEXT_SUBTLE_CLASS}`}>•</span>
                    <span className={`text-xs ${TEXT_MUTED_CLASS}`}>{formatDate(ticket.created_at)}</span>
                  </div>
                  <div className={`mt-2 inline-flex max-w-full items-center gap-1 text-xs ${TEXT_MUTED_CLASS}`}>
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{ticketLocation}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:shrink-0">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                  {statusConfig.label}
                </span>
                <ChevronRight size={16} className={`shrink-0 transition-colors transform group-hover:translate-x-1 ${isDarkTheme ? "text-slate-500 group-hover:text-indigo-400" : "text-slate-300 group-hover:text-indigo-600"}`} />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTicket(ticket)}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${isDarkTheme
              ? "border-indigo-500/40 bg-indigo-900/30 text-indigo-300"
              : "border-indigo-200 bg-indigo-50 text-indigo-600"
              }`}
            title={rt("ticket.openCaseChat")}
            aria-label={rt("ticket.openCaseChat")}
          >
            <MessageSquare size={14} />
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // âœ… MAIN RENDER
  // ============================================

  if (loading) {
    return (
      <div className={`min-h-screen px-4 py-10 ${isDarkTheme ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" : "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100/80"}`}>
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className={`mb-6 h-14 w-full rounded-2xl ${isDarkTheme ? "bg-slate-800/80" : "bg-white/90 ring-1 ring-blue-100"}`} />
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`sk-card-${index}`} className={`h-28 rounded-2xl shadow-sm ${isDarkTheme ? "bg-slate-800/80" : "bg-white/90 ring-1 ring-blue-100"}`} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className={`h-[480px] rounded-3xl shadow-sm ${isDarkTheme ? "bg-slate-800/80" : "bg-white/90 ring-1 ring-blue-100"}`} />
            </div>
            <div className="lg:col-span-8 space-y-5">
              <div className={`h-36 rounded-3xl shadow-sm ${isDarkTheme ? "bg-slate-800/80" : "bg-white/90 ring-1 ring-blue-100"}`} />
              <div className={`h-[360px] rounded-3xl shadow-sm ${isDarkTheme ? "bg-slate-800/80" : "bg-white/90 ring-1 ring-blue-100"}`} />
            </div>
          </div>
          <p className={`mt-6 text-center text-sm font-medium ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>{rt("common.loadingDashboard")}</p>
        </div>
      </div>
    );
  }

  const activeTimeline = buildTimelineEvents(activeTicket);
  const activeTicketStatus = activeTicket ? getStatusConfig(activeTicket) : null;
  const activeTicketPriority = activeTicket ? getPriorityConfig(activeTicket.priority) : null;

  return (
    <div
      className={`app-theme dashboard-theme dashboard-theme--${themeMode} min-h-screen overflow-x-clip transition-colors duration-300 ${isDarkTheme
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 selection:bg-slate-700/60"
        : "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100/80 text-slate-800 selection:bg-blue-100"
        }`}
    >
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-indigo-700 focus:shadow-lg"
      >
        {dt("statusBar.skipToContent")}
      </a>
      {/* Status Bar */}
      <div className={`hidden shrink-0 border-b px-3 py-2 backdrop-blur-xl sm:block sm:px-4 ${isDarkTheme ? "border-slate-700/70 bg-slate-900/80" : "border-blue-100/80 bg-white/75"}`} aria-live="polite">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-end gap-2 text-xs sm:text-sm">
          <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-blue-200 bg-blue-50/80 text-blue-800"}`}>
            <RefreshCw size={12} />
            {getTimeSinceUpdate()}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${isDarkTheme ? "border-indigo-500/50 bg-indigo-900/40 text-indigo-400" : "border-blue-200 bg-blue-100 text-blue-800"}`}>
            <ShieldCheck size={12} />
            {dt("statusBar.role")}: {roleLabel}
          </span>
          {canOpenAuditView && (
            <button
              type="button"
              onClick={() => navigate("/audit-view")}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-blue-200 bg-white text-slate-700 hover:bg-blue-50"}`}
            >
              <Shield size={12} />
              {dt("statusBar.auditLog")}
            </button>
          )}
          <button
            type="button"
            onClick={initDashboard}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-blue-200 bg-white text-slate-700 hover:bg-blue-50"}`}
          >
            <RefreshCw size={12} />
            {dt("statusBar.refreshData")}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`sticky top-0 z-40 shrink-0 border-b backdrop-blur-xl ${isDarkTheme ? "border-slate-700/70 bg-slate-900/80" : "border-blue-100/80 bg-white/80"}`}>
        <div className="app-safe-top mx-auto max-w-[1440px] px-4 py-2.5 sm:px-6 lg:px-6 xl:px-8">
          <div className="relative flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between xl:gap-3">
            <div ref={mobileNavMenuRef} className="relative md:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfileDetails(true)}
                  title={mobileNavIdentityTitle}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-[1.4rem] border px-2.5 py-2 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${isDarkTheme ? "border-slate-700 bg-slate-800/90 shadow-slate-950/20" : "border-blue-200 bg-white/95 shadow-blue-100/70"}`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={tdkLogo}
                      alt={rt("common.companyLogoAlt")}
                      className="h-8 w-8 rounded-xl bg-white object-contain p-1 shadow-lg shadow-blue-200"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-[12px] font-black leading-none tracking-tight text-transparent">
                      TDK INDUSTRIAL
                    </p>
                    <div className={`mt-1 flex items-center gap-1 text-[9px] font-bold ${isDarkTheme ? "text-slate-300" : "text-slate-600"}`}>
                      <Building2 size={10} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{mobileNavDepartment}</span>
                      <span className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[8px] font-black ${isDarkTheme ? "bg-indigo-500/20 text-indigo-100" : "bg-blue-100 text-blue-700"}`}>
                        #{mobileNavEmployeeCodeCompact}
                      </span>
                    </div>
                  </div>
                </button>

                <div ref={mobileStatusOverviewMenuRef} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      setIsStatusOverviewMenuOpen((value) => !value);
                    }}
                    aria-expanded={isStatusOverviewMenuOpen}
                    aria-controls="dashboard-status-overview-menu-mobile"
                    aria-label={dt("nav.statusOverview")}
                    className={`relative inline-flex h-10 w-10 items-center justify-center rounded-[1.2rem] border shadow-sm transition-colors ${isDarkTheme ? "border-slate-700 bg-slate-800/90 text-slate-100 shadow-slate-950/20 hover:bg-slate-700" : "border-blue-200 bg-white/95 text-slate-700 shadow-blue-100/70 hover:bg-blue-50"}`}
                  >
                    <BarChart3 size={17} />
                    <span className={`absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-black ${isDarkTheme ? "bg-indigo-500 text-white" : "bg-indigo-600 text-white"}`}>
                      {statusOverviewTotalCount > 99 ? "99+" : statusOverviewTotalCount}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsStatusOverviewMenuOpen(false);
                    setIsMobileNavOpen((value) => !value);
                  }}
                  aria-expanded={isMobileNavOpen}
                  aria-label="Toggle mobile navigation"
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[1.2rem] border shadow-sm transition-colors ${isDarkTheme ? "border-slate-700 bg-slate-800/90 text-slate-100 shadow-slate-950/20 hover:bg-slate-700" : "border-blue-200 bg-white/95 text-slate-700 shadow-blue-100/70 hover:bg-blue-50"}`}
                >
                  {isMobileNavOpen ? <X size={18} /> : <Menu size={18} />}
                </button>

                <div className={`flex shrink-0 items-center gap-0.5 rounded-[1.2rem] border p-0.5 shadow-sm ${isDarkTheme ? "border-slate-700 bg-slate-800/90 shadow-slate-950/20" : "border-blue-200 bg-white/95 shadow-blue-100/70"}`}>
                  <LanguageSwitcher mode="nav" isDarkTheme={isDarkTheme} className="shrink-0" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      setIsStatusOverviewMenuOpen(false);
                      setIsLogoutConfirmOpen(true);
                    }}
                    aria-label={t("common.signOut")}
                    title={t("common.signOut")}
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${isDarkTheme ? "text-rose-300 hover:bg-rose-900/30" : "text-rose-600 hover:bg-rose-50"}`}
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              </div>

              <div
                id="dashboard-status-overview-menu-mobile"
                className={`absolute left-0 right-0 top-[calc(100%+0.55rem)] z-50 transition-all duration-150 ${isStatusOverviewMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
              >
                {renderStatusOverviewMenuContent({ mobile: true })}
              </div>

              <div
                className={`absolute left-0 right-0 top-[calc(100%+0.55rem)] z-40 transition-all duration-150 ${isMobileNavOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
              >
                <div className={`rounded-[22px] border p-2.5 shadow-2xl ${isDarkTheme ? "border-slate-700 bg-slate-900/95" : "border-blue-200 bg-white/95 shadow-blue-200/70"}`}>
                  <div className={`flex items-center justify-between gap-3 rounded-[18px] border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-800/80" : "border-blue-100 bg-blue-50/70"}`}>
                    <div className="min-w-0">
                      <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${TEXT_SUBTLE_CLASS}`}>{dt("nav.moreMenu")}</p>
                      <p className={`mt-1 text-[11px] ${TEXT_MUTED_CLASS}`}>{rt("operational.footerHint")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      aria-label={isDarkTheme ? t("common.lightMode") : t("common.darkMode")}
                      title={isDarkTheme ? t("common.lightMode") : t("common.darkMode")}
                      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${isDarkTheme ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-700" : "border-blue-200 bg-white text-slate-700 hover:bg-blue-50"}`}
                    >
                      {isDarkTheme ? <Sun size={15} /> : <Moon size={15} />}
                      <span>{isDarkTheme ? t("common.lightMode") : t("common.darkMode")}</span>
                    </button>
                  </div>

                  <div className={`mt-2 rounded-2xl border px-3 py-2.5 ${isDarkTheme ? "border-slate-700 bg-slate-800/80" : "border-blue-100 bg-blue-50/70"}`}>
                    <div className="mb-2 flex items-center gap-2">
                      <SlidersHorizontal size={14} className={TEXT_SUBTLE_CLASS} />
                      <span className={`text-[11px] font-black uppercase tracking-[0.14em] ${TEXT_SUBTLE_CLASS}`}>{dt("nav.moreMenu")}</span>
                    </div>
                    {renderNavMoreLinkButtons()}
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden md:flex md:items-center md:justify-between md:gap-3">
              {renderNavBrand({ className: "md:min-w-[280px]" })}
            </div>

            <div className="hidden md:flex md:w-auto md:flex-1 md:items-center md:justify-end md:gap-1.5">
              <div className={`flex flex-wrap items-center gap-1.5 rounded-[20px] border px-2 py-1.5 shadow-sm sm:w-auto xl:gap-2 xl:px-3 xl:py-2 ${isDarkTheme ? "border-slate-700 bg-slate-800/75" : "border-blue-200/80 bg-white/90 shadow-blue-100/40"}`}>
                <div className="relative">
                  <span className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-bold xl:px-2 xl:text-[11px] ${isDarkTheme ? "bg-slate-700 text-slate-300" : "bg-blue-100 text-blue-800"}`}>
                    <Hash size={12} />
                    ID: {profile?.employee_code || dt("nav.notSpecified")}
                  </span>
                </div>
                <span className={`inline-flex max-w-[162px] items-center gap-1 truncate rounded-lg px-1.5 py-1 text-[10px] font-bold xl:max-w-none xl:px-2 xl:text-[11px] ${isDarkTheme ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                  <Building2 size={12} />
                  {profile?.department || dt("nav.notSpecifiedDepartment")}
                </span>
              </div>

              <div ref={desktopStatusOverviewMenuRef} className="relative md:min-w-[220px]">
                <button
                  type="button"
                  onClick={() => setIsStatusOverviewMenuOpen((value) => !value)}
                  aria-expanded={isStatusOverviewMenuOpen}
                  aria-controls="dashboard-status-overview-menu-desktop"
                  className={`inline-flex h-10 w-full items-center justify-between gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all sm:h-9 sm:w-full sm:justify-center sm:px-2.5 xl:h-10 xl:gap-2 xl:px-4 xl:text-sm ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700" : "border-blue-200 bg-white text-slate-700 hover:bg-blue-50"}`}
                >
                  <span className="inline-flex items-center gap-1.5 xl:gap-2">
                    <BarChart3 size={16} />
                    <span>{dt("nav.statusOverview")}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`inline-flex min-w-[1.35rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-black xl:min-w-[1.5rem] xl:text-[10px] ${isDarkTheme ? "bg-indigo-500/20 text-indigo-200" : "bg-indigo-50 text-indigo-700"}`}>
                      {statusOverviewTotalCount > 99 ? "99+" : statusOverviewTotalCount}
                    </span>
                    <ChevronDown
                      size={15}
                      className={`transition-transform ${isStatusOverviewMenuOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

                <div
                  id="dashboard-status-overview-menu-desktop"
                  className={`absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-2rem))] transition-all duration-150 sm:w-[360px] ${isStatusOverviewMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
                >
                  {renderStatusOverviewMenuContent()}
                </div>
              </div>

              <div className="ml-auto flex items-center gap-1.5">
                <div className={`flex items-center gap-1 rounded-2xl border p-0.5 xl:p-1 shadow-sm ${isDarkTheme ? "border-slate-700 bg-slate-800/85" : "border-blue-200 bg-white/90 shadow-blue-100/40"}`}>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={isDarkTheme ? t("common.lightMode") : t("common.darkMode")}
                    title={isDarkTheme ? t("common.lightMode") : t("common.darkMode")}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition focus:outline-none focus-visible:ring-2 xl:h-10 xl:w-10 ${isDarkTheme ? "bg-slate-800 text-slate-200 hover:bg-slate-700 focus-visible:ring-indigo-400" : "bg-white/90 text-slate-700 hover:bg-blue-50 focus-visible:ring-blue-300"}`}
                  >
                    {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                  <LanguageSwitcher mode="nav" isDarkTheme={isDarkTheme} />
                </div>
                <button
                  onClick={() => setIsLogoutConfirmOpen(true)}
                  aria-label={t("common.signOut")}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition-all xl:h-10 xl:gap-2 xl:px-3 xl:text-sm ${isDarkTheme ? "border-rose-500/30 text-rose-300 hover:bg-rose-900/30" : "border-rose-200 text-rose-600 hover:bg-rose-50"}`}
                >
                  <LogOut size={16} />
                  <span className="hidden xl:inline">{t("common.signOut")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="dashboard-main-content" className="app-safe-bottom mx-auto flex w-full max-w-[1440px] flex-col px-3 pt-3 pb-28 sm:px-6 sm:pt-4 sm:pb-12 lg:px-8 lg:pb-8">
        <div className="mb-3 hidden sm:block xl:hidden">
          {renderProfilePanel()}
        </div>

        {/* Header Section */}
        <header className="mb-4 shrink-0 space-y-3">
          {/* Stats Overview */}
          {renderStatsCards()}
        </header>

        {dashboardError && (
          <div className={`mb-4 flex shrink-0 flex-col gap-3 rounded-2xl border p-3 md:flex-row md:items-center md:justify-between ${isDarkTheme ? "border-rose-700/60 bg-rose-900/30" : "border-rose-200 bg-rose-50/80"}`} role="alert">
            <div>
              <p className={`text-sm font-black ${isDarkTheme ? "text-rose-300" : "text-rose-700"}`}>{rt("common.partialLoadError")}</p>
              <p className={`text-xs font-medium ${isDarkTheme ? "text-rose-200" : "text-rose-600"}`}>{dashboardError}</p>
            </div>
            <button
              onClick={initDashboard}
              className={`inline-flex items-center gap-2 self-start rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${isDarkTheme ? "border-rose-600 bg-slate-800 text-rose-300 hover:bg-slate-700" : "border-rose-300 bg-white text-rose-700 hover:bg-rose-100"}`}
            >
              <RefreshCw size={14} />
              {rt("common.retryLoad")}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-12 xl:items-start">
          {/* Profile Section */}
          <div className="hidden xl:col-span-4 xl:block">
            {renderProfilePanel({ containerClassName: "xl:sticky xl:top-24 xl:self-start" })}
          </div>

          {/* Main Content Area */}
          <div className="flex min-w-0 flex-col gap-3 xl:col-span-8">
            {/* Quick Actions */}
            <section ref={quickActionsSectionRef} className={`order-1 rounded-[28px] border p-3 shadow-sm backdrop-blur-sm sm:p-5 ${SURFACE_SECTION_CLASS}`}>
              <div className="mb-3 flex flex-col gap-2.5 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className={QUICK_ACTIONS_HEADING_CLASS}>{rt("common.quickActionsTitle")}</h3>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{rt("common.quickActionsSubtitle")}</p>
                </div>
                <span className={`hidden w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider sm:inline-flex ${isDarkTheme ? "border-indigo-500/40 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-600"}`}>
                  {rt("common.role")}: {roleLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                {primaryQuickActions.map((action) => {
                  const Icon = action.icon;
                  const accentClassMap = {
                    indigo: {
                      hoverBorder: "hover:border-indigo-500",
                      hoverShadow: "hover:shadow-indigo-600/10",
                      text: "text-indigo-600",
                      gradient: "from-indigo-50 to-indigo-100",
                      hoverBg: "group-hover:bg-indigo-100",
                      pill: isDarkTheme ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-50 text-indigo-700",
                    },
                    emerald: {
                      hoverBorder: "hover:border-emerald-600",
                      hoverShadow: "hover:shadow-emerald-600/10",
                      text: "text-emerald-600",
                      gradient: "from-emerald-50 to-emerald-100",
                      hoverBg: "group-hover:bg-emerald-100",
                      pill: isDarkTheme ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700",
                    },
                    sky: {
                      hoverBorder: "hover:border-sky-500",
                      hoverShadow: "hover:shadow-sky-600/10",
                      text: "text-sky-600",
                      gradient: "from-sky-50 to-sky-100",
                      hoverBg: "group-hover:bg-sky-100",
                      pill: isDarkTheme ? "bg-sky-900/40 text-sky-300" : "bg-sky-50 text-sky-700",
                    },
                    violet: {
                      hoverBorder: "hover:border-violet-600",
                      hoverShadow: "hover:shadow-violet-600/10",
                      text: "text-violet-600",
                      gradient: "from-violet-50 to-violet-100",
                      hoverBg: "group-hover:bg-violet-100",
                      pill: isDarkTheme ? "bg-violet-900/40 text-violet-300" : "bg-violet-50 text-violet-700",
                    },
                    slate: {
                      hoverBorder: "hover:border-slate-500",
                      hoverShadow: "hover:shadow-slate-600/10",
                      text: "text-slate-600",
                      gradient: "from-slate-50 to-slate-100",
                      hoverBg: "group-hover:bg-slate-200",
                      pill: isDarkTheme ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700",
                    },
                  };

                  const accent = accentClassMap[action.accent] || accentClassMap.indigo;

                  return (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      className={`group h-full rounded-[20px] border p-3 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-[24px] sm:p-4 ${action.featured ? "col-span-2" : ""} ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-blue-100/80 bg-white/95"} ${accent.hoverBorder} ${accent.hoverShadow}`}
                    >
                      <div className="mb-2.5 flex items-start justify-between gap-2">
                        <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent.gradient} ${accent.text} shadow-sm transition-all duration-300 ${accent.hoverBg} sm:h-12 sm:w-12 sm:rounded-2xl`}>
                          <Icon size={17} />
                          {action.badgeCount > 0 && (
                            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-white bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
                              {action.badgeCount > 9 ? "9+" : action.badgeCount}
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold sm:px-2.5 sm:text-[11px] ${accent.pill}`}>
                          {action.cta}
                        </span>
                      </div>
                      <h4 className={`${QUICK_ACTIONS_TITLE_CLASS} text-[13px] leading-snug sm:text-base`}>{action.label}</h4>
                      <p className={`mt-1.5 line-clamp-2 text-[11px] leading-5 sm:mt-2 sm:line-clamp-3 ${action.featured ? "block" : "hidden min-[420px]:block"} ${QUICK_ACTIONS_DESCRIPTION_CLASS}`}>{action.description}</p>
                      <div className={`mt-2.5 items-center gap-1 text-[10px] font-bold sm:mt-3 sm:text-[11px] ${action.featured ? "flex" : "hidden sm:flex"} ${accent.text}`}>
                        <span>{rt("common.active")}</span>
                        <ChevronRight size={12} className="transform transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {secondaryQuickActions.length > 0 && (
                <div className="mt-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowMoreQuickActions((value) => !value)}
                      aria-label={rt("common.moreMenu")}
                      title={rt("common.moreMenu")}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${isDarkTheme ? "border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-900" : "border-blue-100 bg-white text-slate-700 hover:bg-blue-50"}`}
                    >
                      {showMoreQuickActions ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>

                  <div
                    className={`mt-2 overflow-hidden transition-all duration-200 ease-out ${showMoreQuickActions
                      ? "max-h-[560px] translate-y-0 opacity-100"
                      : "pointer-events-none max-h-0 -translate-y-1 opacity-0"
                      }`}
                  >
                    <div className={`rounded-2xl border p-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/95" : "border-blue-100 bg-white/95"}`}>
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                        {secondaryQuickActions.map((action) => {
                          const Icon = action.icon;
                          const accentClassMap = {
                            indigo: {
                              hoverBorder: "hover:border-indigo-500",
                              hoverShadow: "hover:shadow-indigo-600/10",
                              text: "text-indigo-600",
                              gradient: "from-indigo-50 to-indigo-100",
                              hoverBg: "group-hover:bg-indigo-100",
                              pill: isDarkTheme ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-50 text-indigo-700",
                            },
                            emerald: {
                              hoverBorder: "hover:border-emerald-600",
                              hoverShadow: "hover:shadow-emerald-600/10",
                              text: "text-emerald-600",
                              gradient: "from-emerald-50 to-emerald-100",
                              hoverBg: "group-hover:bg-emerald-100",
                              pill: isDarkTheme ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700",
                            },
                            sky: {
                              hoverBorder: "hover:border-sky-500",
                              hoverShadow: "hover:shadow-sky-600/10",
                              text: "text-sky-600",
                              gradient: "from-sky-50 to-sky-100",
                              hoverBg: "group-hover:bg-sky-100",
                              pill: isDarkTheme ? "bg-sky-900/40 text-sky-300" : "bg-sky-50 text-sky-700",
                            },
                            violet: {
                              hoverBorder: "hover:border-violet-600",
                              hoverShadow: "hover:shadow-violet-600/10",
                              text: "text-violet-600",
                              gradient: "from-violet-50 to-violet-100",
                              hoverBg: "group-hover:bg-violet-100",
                              pill: isDarkTheme ? "bg-violet-900/40 text-violet-300" : "bg-violet-50 text-violet-700",
                            },
                            slate: {
                              hoverBorder: "hover:border-slate-500",
                              hoverShadow: "hover:shadow-slate-600/10",
                              text: "text-slate-600",
                              gradient: "from-slate-50 to-slate-100",
                              hoverBg: "group-hover:bg-slate-200",
                              pill: isDarkTheme ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700",
                            },
                          };
                          const accent = accentClassMap[action.accent] || accentClassMap.indigo;
                          const isChatAction = action.id === "chat-it";

                          return (
                            <button
                              key={action.id}
                              onClick={action.onClick}
                              className={`group h-full rounded-[20px] border p-3 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-[24px] sm:p-4 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-blue-100/80 bg-white/95"
                                } ${accent.hoverBorder} ${accent.hoverShadow} ${isChatAction
                                  ? isDarkTheme
                                    ? "border-emerald-600/60 ring-1 ring-emerald-500/35"
                                    : "border-emerald-300 ring-1 ring-emerald-200"
                                  : ""
                                }`}
                            >
                              <div className="mb-2.5 flex items-start justify-between gap-2">
                                <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent.gradient} ${accent.text} shadow-sm transition-all duration-300 ${accent.hoverBg} sm:h-12 sm:w-12 sm:rounded-2xl`}>
                                  <Icon size={17} />
                                  {action.badgeCount > 0 && (
                                    <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-white bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
                                      {action.badgeCount > 9 ? "9+" : action.badgeCount}
                                    </span>
                                  )}
                                </div>
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold sm:px-2.5 sm:text-[11px] ${accent.pill}`}>
                                  {isChatAction ? dt("quickActions.startChat") : action.cta}
                                </span>
                              </div>
                              <h4 className={`${QUICK_ACTIONS_TITLE_CLASS} text-[13px] leading-snug sm:text-base`}>{action.label}</h4>
                              <p className={`mt-1.5 line-clamp-2 text-[11px] leading-5 sm:mt-2 sm:line-clamp-3 ${QUICK_ACTIONS_DESCRIPTION_CLASS}`}>{action.description}</p>
                              <div className={`mt-2.5 flex items-center gap-1 text-[10px] font-bold sm:mt-3 sm:text-[11px] ${accent.text}`}>
                                <span>{dt("quickActions.active")}</span>
                                <ChevronRight size={12} className="transform transition-transform group-hover:translate-x-1" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className={`hidden order-2 rounded-3xl border p-4 shadow-sm backdrop-blur-sm sm:p-5 ${SURFACE_SECTION_CLASS}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-600" />
                    <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${TEXT_SUBTLE_CLASS}`}>{dt("nav.meetingRoomStatus")}</h3>
                  </div>
                  <p className={`text-xs ${TEXT_MUTED_CLASS}`}>{rt("meeting.hiddenSubtitle")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/meeting-room-booking")}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  {rt("meeting.openBooking")}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  {rt("meeting.todayCount", { count: todayMeetingBookings.length })}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  {rt("meeting.tomorrowCount", { count: tomorrowMeetingBookings.length })}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  {rt("meeting.upcomingCount", { count: normalizedUpcomingMeetingBookings.length })}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-indigo-500/50 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
                  {rt("meeting.nextBooking", {
                    value: nextMeetingBooking
                      ? `${nextMeetingBooking.room_name} ${format(nextMeetingBooking.startsAt, "dd MMM HH:mm", { locale: dateLocale })}`
                      : rt("common.noNextBooking"),
                  })}
                </span>
                {todayMeetingOverlapCount > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-rose-700/60 bg-rose-900/40 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                    {rt("meeting.overlapCount", { count: todayMeetingOverlapCount })}
                  </span>
                )}
              </div>

              <div>
                {meetingRoomLoading ? (
                  <div className="mt-5 flex items-center justify-center py-8">
                    <div className={`h-8 w-8 animate-spin rounded-full border-2 ${isDarkTheme ? "border-slate-600 border-t-indigo-400" : "border-indigo-200 border-t-indigo-600"}`}></div>
                  </div>
                ) : meetingRoomError ? (
                  <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${isDarkTheme ? "border-rose-700/60 bg-rose-900/30 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                    {meetingRoomError}
                  </div>
                ) : todayMeetingBookings.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    <div className={`rounded-2xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
                      <div className="mb-2 flex items-center gap-2">
                        <Calendar size={14} className={isDarkTheme ? "text-indigo-300" : "text-indigo-600"} />
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>
                          {rt("meeting.todayBookings")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {normalizedTodayMeetingBookings.map((booking) => (
                          <article
                            key={`today-booking-${booking.id}`}
                            className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-slate-50/70"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`truncate text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>
                                  {booking.title || rt("common.bookingTitle")}
                                </p>
                                <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${TEXT_MUTED_CLASS}`}>
                                  <span className="inline-flex items-center gap-1">
                                    <DoorOpen size={12} />
                                    {booking.room_name || rt("operational.notSpecifiedRoom")}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <User size={12} />
                                    {booking.booked_by || rt("common.noBookedBy")}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className={`text-[11px] font-semibold ${TEXT_SUBTLE_CLASS}`}>
                                  {format(booking.startsAt, "dd MMM yyyy", { locale: dateLocale })}
                                </p>
                                <p className={`text-xs font-black ${TEXT_SECONDARY_CLASS}`}>
                                  {booking.startClock} - {booking.endClock}
                                </p>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>

                    <div className={`rounded-2xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <Clock size={14} className={isDarkTheme ? "text-slate-300" : "text-slate-600"} />
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>
                          {rt("meeting.roomStatusToday")}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 pr-1 xl:grid-cols-2">
                        {todayRoomStatusCards.map((roomCard) => (
                          <article key={roomCard.roomName} className={`rounded-2xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <DoorOpen size={15} className={isDarkTheme ? "text-slate-300" : "text-slate-600"} />
                                <h4 className={`text-sm font-black ${TEXT_SECONDARY_CLASS}`}>{roomCard.roomName}</h4>
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${roomCard.bookedCount > 0
                                ? (isDarkTheme ? "bg-rose-900/40 text-rose-300" : "bg-rose-50 text-rose-700")
                                : (isDarkTheme ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")
                                }`}>
                                {roomCard.bookedCount > 0 ? rt("meeting.booked") : rt("meeting.available")}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {roomCard.slots.map((slot, index) => (
                                <div
                                  key={`${roomCard.roomName}-slot-${index}`}
                                  className={`rounded-xl border px-3 py-2 text-xs ${slot.type === "booked"
                                    ? (isDarkTheme ? "border-rose-700/50 bg-rose-900/20 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700")
                                    : (isDarkTheme ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700")
                                    }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold">
                                      {minutesToClock(slot.startMinutes)} - {minutesToClock(slot.endMinutes)}
                                    </span>
                                    <span className="font-black">{slot.type === "booked" ? rt("meeting.booked") : rt("meeting.available")}</span>
                                  </div>
                                  {slot.type === "booked" && (
                                    <p className={`mt-1 ${isDarkTheme ? "text-rose-100" : "text-rose-600"}`}>
                                      {slot.title} • {slot.bookedBy}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : upcomingMeetingPreview.length > 0 ? (
                  <div className={`mt-5 rounded-2xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
                    <div className="mb-2 flex items-center gap-2">
                      <Calendar size={14} className={isDarkTheme ? "text-indigo-300" : "text-indigo-600"} />
                      <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>
                        {rt("meeting.upcomingBookings")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {upcomingMeetingPreview.map((booking) => (
                        <article
                          key={`upcoming-${booking.id}`}
                          className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-slate-50/70"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>
                                {booking.title || rt("common.bookingTitle")}
                              </p>
                              <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${TEXT_MUTED_CLASS}`}>
                                <span className="inline-flex items-center gap-1">
                                  <DoorOpen size={12} />
                                  {booking.room_name || rt("operational.notSpecifiedRoom")}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <User size={12} />
                                  {booking.booked_by || rt("common.noBookedBy")}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className={`text-[11px] font-semibold ${TEXT_SUBTLE_CLASS}`}>
                                {format(booking.startsAt, "dd MMM yyyy", { locale: dateLocale })}
                              </p>
                              <p className={`text-xs font-black ${TEXT_SECONDARY_CLASS}`}>
                                {booking.startClock} - {booking.endClock}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`mt-5 rounded-2xl border border-dashed p-6 text-center ${isDarkTheme ? "border-emerald-700/50 bg-emerald-900/20 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                    {rt("common.noMeetingToday")}
                  </div>
                )}
              </div>
            </section>

            {/* <section className={`order-3 rounded-3xl border p-4 shadow-sm backdrop-blur-sm ${SURFACE_SECTION_CLASS}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <KeyRound size={15} className="text-amber-500" />
                    <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${TEXT_SUBTLE_CLASS}`}>Access Requests</h3>
                  </div>
                  <p className={`text-xs ${TEXT_MUTED_CLASS}`}>ติดตามสถานะการขอสิทธิ์ระบบผ่าน workflow อนุมัติ</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/access-request")}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  เปิดรายการคำขอ
                </button>
              </div>

              {accessRequestLoading ? (
                <div className="mt-4 flex items-center justify-center py-4">
                  <div className={`h-7 w-7 animate-spin rounded-full border-2 ${isDarkTheme ? "border-slate-600 border-t-indigo-400" : "border-indigo-200 border-t-indigo-600"}`} />
                </div>
              ) : accessRequestError ? (
                <p className={`mt-4 rounded-xl border px-3 py-2 text-xs font-semibold ${isDarkTheme ? "border-rose-700/60 bg-rose-900/30 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                  {accessRequestError}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className={`rounded-xl border px-3 py-2 ${isDarkTheme ? "border-amber-700/40 bg-amber-900/20" : "border-amber-200 bg-amber-50"}`}>
                      <p className={`text-[11px] font-semibold ${isDarkTheme ? "text-amber-200" : "text-amber-700"}`}>Pending</p>
                      <p className={`mt-1 text-xl font-black ${isDarkTheme ? "text-amber-300" : "text-amber-700"}`}>{accessRequestSummary.pending}</p>
                    </div>
                    <div className={`rounded-xl border px-3 py-2 ${isDarkTheme ? "border-blue-700/40 bg-blue-900/20" : "border-blue-200 bg-blue-50"}`}>
                      <p className={`text-[11px] font-semibold ${isDarkTheme ? "text-blue-200" : "text-blue-700"}`}>Approved</p>
                      <p className={`mt-1 text-xl font-black ${isDarkTheme ? "text-blue-300" : "text-blue-700"}`}>{accessRequestSummary.approved}</p>
                    </div>
                    <div className={`rounded-xl border px-3 py-2 ${isDarkTheme ? "border-rose-700/40 bg-rose-900/20" : "border-rose-200 bg-rose-50"}`}>
                      <p className={`text-[11px] font-semibold ${isDarkTheme ? "text-rose-200" : "text-rose-700"}`}>Rejected</p>
                      <p className={`mt-1 text-xl font-black ${isDarkTheme ? "text-rose-300" : "text-rose-700"}`}>{accessRequestSummary.rejected}</p>
                    </div>
                  </div>

                  {accessRequestHighlights.length > 0 && (
                    <div className={`rounded-xl border p-3 ${SURFACE_PANEL_CLASS}`}>
                      <p className={`mb-2 text-[11px] font-black uppercase tracking-wide ${TEXT_SUBTLE_CLASS}`}>รายการล่าสุด</p>
                      <div className="space-y-2">
                        {accessRequestHighlights.map((item) => {
                          const badgeClass =
                            item.status === ACCESS_REQUEST_STATUS.PENDING
                              ? (isDarkTheme ? "border-amber-700/40 bg-amber-900/20 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-700")
                              : item.status === ACCESS_REQUEST_STATUS.APPROVED
                                ? (isDarkTheme ? "border-blue-700/40 bg-blue-900/20 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-700")
                                : item.status === ACCESS_REQUEST_STATUS.REJECTED
                                  ? (isDarkTheme ? "border-rose-700/40 bg-rose-900/20 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700")
                                  : (isDarkTheme ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700");

                          return (
                            <div key={item.id} className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-white"}`}>
                              <div className="min-w-0">
                                <p className={`truncate text-xs font-semibold ${TEXT_SECONDARY_CLASS}`}>{item.system_name || rt("common.noSystem")}</p>
                                <p className={`text-[10px] ${TEXT_MUTED_CLASS}`}>{formatDateTime(item.created_at)}</p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                                {item.status || ACCESS_REQUEST_STATUS.PENDING}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section> */}

            <div className="order-3 flex flex-col gap-4">
              {/* Priority Inbox */}
              {canSeePriorityInbox && (
                <section className={`order-2 rounded-3xl border p-4 shadow-sm backdrop-blur-sm sm:p-5 lg:order-2 ${SURFACE_SECTION_CLASS}`}>
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${TEXT_SUBTLE_CLASS}`}>{rt("ticket.priorityInboxTitle")}</h3>
                      <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{rt("ticket.priorityInboxSubtitle")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => applyRoleView(roleViews[0])}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${isDarkTheme ? "border-indigo-500/40 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}
                      >
                        {rt("ticket.defaultView")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFilter("PENDING");
                          setPriorityFilter("ALL");
                          setSlaFilter("OVERDUE");
                          setCategoryFilter("ALL");
                          setSearchQuery("");
                          setSelectedPresetId("");
                          setActiveRoleViewId("");
                        }}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${isDarkTheme ? "border-rose-700 bg-rose-900/40 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-700"}`}
                      >
                        {rt("ticket.overdueView")}
                      </button>
                    </div>
                  </div>

                  <div>
                    {priorityInbox.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 pr-1 xl:grid-cols-2">
                        {priorityInbox.map((ticket) => {
                          const status = getStatusConfig(ticket);
                          const priority = getPriorityConfig(ticket.priority);
                          return (
                            <button
                              key={`inbox-${ticket.id}`}
                              type="button"
                              onClick={() => {
                                setActiveFilter("PENDING");
                                setPriorityFilter("ALL");
                                setCategoryFilter("ALL");
                                setSlaFilter("ALL");
                                setSearchQuery("");
                                setSelectedPresetId("");
                                setActiveRoleViewId("");
                                setActiveTicketId(ticket.id);
                              }}
                              className={`group rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-white"}`}
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${isDarkTheme ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                                  {ticket.ticket_no || `T${ticket.id?.slice(-6).toUpperCase()}`}
                                </span>
                                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${status.bg} ${status.color} ${status.border}`}>
                                  {status.label}
                                </span>
                              </div>
                              <p className={`truncate text-sm font-black ${TEXT_PRIMARY_CLASS}`}>{ticket.title || rt("ticket.noTitle")}</p>
                              <div className={`mt-2 flex items-center gap-2 text-xs ${TEXT_MUTED_CLASS}`}>
                                <span className={`rounded-md px-2 py-0.5 text-white ${priority.color}`}>{priority.label}</span>
                                {renderSLAIndicator(ticket)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`rounded-2xl border border-dashed p-6 text-center ${isDarkTheme ? "border-slate-700 bg-slate-800/70" : "border-blue-100 bg-blue-50/70"}`}>
                        <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{rt("ticket.noPriorityInbox")}</p>
                        <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{rt("ticket.normalQueue")}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Recent Activity */}
              <section className={`hidden order-1 rounded-3xl border p-4 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md sm:p-5 lg:order-1 ${SURFACE_SECTION_CLASS}`}>
                <div className="mb-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${TEXT_SUBTLE_CLASS}`}>{dt("nav.recentActivity")}</h3>
                        <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></div>
                      </div>
                      <p className={`text-xs ${TEXT_MUTED_CLASS}`}>
                        {rt("recentActivity.filteredCount", {
                          visible: visibleTickets.length,
                          filtered: filteredTickets.length,
                        })}
                      </p>
                    </div>
                    <p className={`text-[11px] font-semibold ${TEXT_MUTED_CLASS}`}>
                      {rt("recentActivity.shortcuts")}
                    </p>
                  </div>
                </div>

                <div className={`mb-4 shrink-0 rounded-2xl border p-3 ${SURFACE_PANEL_CLASS}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <SlidersHorizontal size={15} className="text-indigo-600" />
                    <p className={`text-xs font-black uppercase tracking-wider ${TEXT_MUTED_CLASS}`}>{rt("recentActivity.smartFilterBar")}</p>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    {roleViews.map((view) => (
                      <button
                        key={view.id}
                        type="button"
                        onClick={() => applyRoleView(view)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 ${activeRoleViewId === view.id
                          ? (isDarkTheme
                            ? "border-indigo-500/50 bg-indigo-900/40 text-indigo-300 focus-visible:ring-indigo-400"
                            : "border-indigo-300 bg-indigo-50 text-indigo-700 focus-visible:ring-indigo-300")
                          : isDarkTheme
                            ? "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 focus-visible:ring-indigo-400"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:ring-indigo-300"
                          }`}
                        title={view.description}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="relative sm:col-span-2">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={rt("recentActivity.searchPlaceholder")}
                        aria-label={rt("recentActivity.searchAria")}
                        className={SEARCH_CONTROL_CLASS}
                      />
                      {searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-bold ${isDarkTheme ? "bg-slate-600 text-slate-200" : "bg-slate-100 text-slate-600"}`}
                        >
                          {rt("recentActivity.clearSearch")}
                        </button>
                      )}
                    </div>

                    <div>
                      <select
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value)}
                        aria-label={rt("recentActivity.filterStatusAria")}
                        className={FORM_CONTROL_CLASS}
                      >
                        {localizedFilterOptions.map((filter) => (
                          <option key={filter.id} value={filter.id}>{filter.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        aria-label={rt("recentActivity.filterCategoryAria")}
                        className={FORM_CONTROL_CLASS}
                      >
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category === "ALL" ? dt("activity.allCategories") : category}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!isUserSearchMode && (
                      <div>
                        <select
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value)}
                          aria-label={rt("recentActivity.filterPriorityAria")}
                          className={FORM_CONTROL_CLASS}
                        >
                          {localizedPriorityFilterOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isUserSearchMode && (
                      <div>
                        <select
                          value={slaFilter}
                          onChange={(e) => setSlaFilter(e.target.value)}
                          aria-label={rt("recentActivity.filterSlaAria")}
                          className={FORM_CONTROL_CLASS}
                        >
                          {localizedSlaFilterOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <p className={`mt-2 text-[11px] ${TEXT_MUTED_CLASS}`}>
                    {dt("activity.searchByHint")}
                  </p>

                  <div className="mt-3 flex flex-col gap-3">
                    {!isUserSearchMode && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <select
                          value={selectedPresetId}
                          onChange={(e) => setSelectedPresetId(e.target.value)}
                          aria-label={rt("recentActivity.savedViewAria")}
                          className={`w-full sm:min-w-[220px] sm:flex-1 ${FORM_CONTROL_CLASS}`}
                        >
                          <option value="">{dt("activity.selectSavedView")}</option>
                          {savedFilterPresets.map((preset) => (
                            <option key={preset.id} value={preset.id}>{preset.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={applySelectedPreset}
                          disabled={!selectedPresetId}
                          className={`${SECONDARY_BUTTON_CLASS} disabled:opacity-40`}
                        >
                          {dt("activity.applyView")}
                        </button>
                        <button
                          type="button"
                          onClick={deleteSelectedPreset}
                          disabled={!selectedPresetId}
                          className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-40 ${isDarkTheme ? "border-rose-700 bg-rose-900/40 text-rose-300 hover:bg-rose-900/60 focus-visible:ring-rose-400" : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 focus-visible:ring-rose-200"}`}
                          aria-label={rt("recentActivity.deleteSavedViewAria")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {!isUserSearchMode && (
                        <button
                          type="button"
                          onClick={saveCurrentPreset}
                          className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
                        >
                          <BookmarkPlus size={14} />
                          {dt("activity.saveView")}
                        </button>
                      )}
                      {hasActiveSmartFilters && (
                        <button
                          type="button"
                          onClick={clearSmartFilters}
                          className={SECONDARY_BUTTON_CLASS}
                        >
                          {dt("activity.clearFilters")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {filteredTickets.length > 0 ? (
                    <div className="space-y-3">
                      <p className={`text-[11px] font-semibold ${TEXT_MUTED_CLASS}`}>
                        {isCompactView
                          ? dt("activity.tapCard")
                          : dt("activity.selectTicket")}
                      </p>

                      <div className="space-y-3" role="listbox" aria-label={rt("recentActivity.listAria")}>
                        {visibleTickets.map(renderTicketItem)}
                      </div>

                      <button
                        type="button"
                        onClick={handleViewAllClick}
                        className={`group/view-all w-full rounded-xl border border-dashed py-3 text-center text-sm font-bold transition-all duration-300 ${isDarkTheme ? "border-indigo-500/40 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-900/30" : "border-indigo-200 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50"}`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span>{dt("activity.viewAllHistory", { count: tickets.length })}</span>
                          <ChevronRight size={14} className="transform transition-transform group-hover/view-all:translate-x-1" />
                        </div>
                      </button>

                      {!isCompactView && (
                        <div className={`rounded-2xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-800/60" : "border-blue-100 bg-blue-50/70"}`}>
                          {activeTicket ? (
                            <div>
                              <div className="mb-4">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                                    {activeTicket.ticket_no || `T${activeTicket.id?.slice(-6).toUpperCase()}`}
                                  </span>
                                  <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${activeTicketStatus.bg} ${activeTicketStatus.color} ${activeTicketStatus.border}`}>
                                    {activeTicketStatus.label}
                                  </span>
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${activeTicketPriority.color}`}>
                                    {activeTicketPriority.label}
                                  </span>
                                </div>
                                <h4 className={`text-base font-black ${TEXT_PRIMARY_CLASS}`}>{activeTicket.title || dt("activity.noTitle")}</h4>
                                <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${TEXT_MUTED_CLASS}`}>
                                  <span>{activeTicket.category || dt("activity.noCategory")}</span>
                                  <span className={TEXT_SUBTLE_CLASS}>•</span>
                                  <span>{formatDate(activeTicket.created_at)}</span>
                                  <span className={TEXT_SUBTLE_CLASS}>•</span>
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin size={12} />
                                    {String(activeTicket.location || "").trim() || rt("common.noLocation")}
                                  </span>
                                </div>
                                <p className={`mt-3 rounded-xl border p-3 text-xs leading-relaxed ${isDarkTheme ? "border-slate-700 bg-slate-900/80 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
                                  {activeTicket.description || dt("activity.noDescription")}
                                </p>
                              </div>

                              <div className={`mb-4 rounded-xl border p-3 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
                                <p className={`mb-2 text-[11px] font-black uppercase tracking-wider ${TEXT_MUTED_CLASS}`}>{dt("activity.timeline")}</p>
                                <div className="space-y-3">
                                  {activeTimeline.map((event, index) => (
                                    <div key={event.id} className="relative pl-5">
                                      {index < activeTimeline.length - 1 && (
                                        <span className={`absolute left-[6px] top-4 h-8 w-px ${isDarkTheme ? "bg-slate-700" : "bg-slate-200"}`}></span>
                                      )}
                                      <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-indigo-500"></span>
                                      <p className={`text-xs font-bold ${TEXT_SECONDARY_CLASS}`}>{event.label}</p>
                                      <p className={`text-[11px] ${TEXT_MUTED_CLASS}`}>{event.detail}</p>
                                      <p className={`text-[10px] font-semibold ${TEXT_SUBTLE_CLASS}`}>{formatDateTime(event.date)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setSelectedTicket(activeTicket)}
                                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25"
                              >
                                {dt("activity.fullDetails")}
                              </button>
                            </div>
                          ) : (
                            <div className={`rounded-xl border border-dashed p-5 text-center ${isDarkTheme ? "border-slate-700" : "border-slate-300"}`}>
                              <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{dt("activity.noSelectedTicket")}</p>
                              <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{dt("activity.selectTicketAbove")}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${isDarkTheme ? "from-slate-700 to-slate-800" : "from-slate-50 to-slate-100"}`}>
                        <AlertCircle size={24} className="text-slate-300" />
                      </div>
                      <h3 className={`mb-2 text-lg font-bold ${TEXT_SECONDARY_CLASS}`}>{dt("activity.noTicketsFound")}</h3>
                      <p className={`mx-auto mb-6 max-w-md text-sm ${TEXT_MUTED_CLASS}`}>
                        {hasActiveSmartFilters
                          ? dt("activity.noTicketsForCurrentSmartFilter")
                          : dt("activity.startFirstTicket")}
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {hasActiveSmartFilters && (
                          <button
                            type="button"
                            onClick={clearSmartFilters}
                            className={`inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}
                          >
                            {dt("activity.clearFilters")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate("/create-ticket")}
                          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25"
                        >
                          <Plus size={16} />
                          {rt("recentActivity.firstTicketCta")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
            {/* Support Section */}
            <SupportSection
              hidden={isMessengerOpen}
              onOpenChat={() => setSupportChatOpenSignal((value) => value + 1)}
            />
          </div>
        </div>

        <div className="mt-4">
          {renderOperationalMiniDashboard()}
        </div>
      </main>

      {/* ============================================
         MODALS & DIALOGS
      ============================================ */}

      {/* Profile Image Modal */}
      <ProfileImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={profile}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
      />

      <CentralChatDock
        currentUser={{
          id: profile?.id,
          name: profile?.full_name || profile?.employee_code || profile?.email || rt("common.userFallback"),
          role: profile?.role || "user",
          avatar: profile?.avatar_url || profile?.id_card_url || "",
        }}
        openSignal={supportChatOpenSignal}
        onOpenChange={setIsMessengerOpen}
        className="bottom-4 left-4 sm:bottom-6 sm:left-6"
      />

      {selectedKpiMetric && (
        <div className="fixed inset-0 z-[103] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label={rt("kpiDetail.closeAria")}
            onClick={() => setSelectedKpiMetricKey("")}
            className="absolute inset-0"
          />
          <section className={`relative z-10 flex w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[2rem] border shadow-[0_28px_70px_-26px_rgba(43,89,176,0.42)] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="shrink-0 border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-indigo-500" />
                    <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${TEXT_SUBTLE_CLASS}`}>{rt("kpiDetail.modalLabel")}</p>
                  </div>
                  <h3 className={`mt-1 text-xl font-black ${TEXT_PRIMARY_CLASS}`}>{selectedKpiMetric.title}</h3>
                  <p className={`mt-1 text-sm ${TEXT_MUTED_CLASS}`}>{selectedKpiMetric.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedKpiMetricKey("")}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <article className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                  <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("kpiDetail.totalLabel")}</p>
                  <p className={`mt-2 text-3xl font-black ${TEXT_PRIMARY_CLASS}`}>{selectedKpiMetric.total}</p>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{rt("kpiDetail.totalHelper")}</p>
                </article>
                <article className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                  <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("kpiDetail.popupLabel")}</p>
                  <p className={`mt-2 text-3xl font-black ${TEXT_PRIMARY_CLASS}`}>{selectedKpiMetric.items.length}</p>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{rt("kpiDetail.popupHelper")}</p>
                </article>
                <article className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                  <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("kpiDetail.usageLabel")}</p>
                  <p className={`mt-2 text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{rt("kpiDetail.usageAction")}</p>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{rt("kpiDetail.usageHelper")}</p>
                </article>
              </div>

              {selectedKpiMetric.items.length > 0 ? (
                <div className="space-y-3">
                  {selectedKpiMetric.items.map((ticket) => {
                    const statusConfig = getStatusConfig(ticket);
                    const priorityConfig = getPriorityConfig(ticket.priority);

                    return (
                      <button
                        key={`kpi-modal-${selectedKpiMetric.key}-${ticket.id}`}
                        type="button"
                        onClick={() => setSelectedTicket(ticket)}
                        className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${isDarkTheme ? "border-slate-700 bg-slate-800/80 hover:bg-slate-800" : "border-slate-200 bg-white hover:border-indigo-200"}`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className={`rounded px-2 py-0.5 text-xs font-bold ${isDarkTheme ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-50 text-indigo-600"}`}>
                                {ticket.ticket_no || `T${ticket.id?.slice(-6).toUpperCase()}`}
                              </span>
                              <span className={`rounded px-2 py-0.5 text-xs font-bold text-white ${priorityConfig.color}`}>
                                {priorityConfig.label}
                              </span>
                              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                            <h4 className={`truncate text-sm font-black ${TEXT_PRIMARY_CLASS}`}>{ticket.title || rt("ticket.noTitle")}</h4>
                            <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${TEXT_MUTED_CLASS}`}>
                              <span>{ticket.category || rt("ticket.noCategory")}</span>
                              <span className={TEXT_SUBTLE_CLASS}>•</span>
                              <span>{formatDate(ticket.created_at)}</span>
                              <span className={TEXT_SUBTLE_CLASS}>•</span>
                              <span>{rt("kpiDetail.updatedAt", { value: formatDateTime(ticket.updated_at || ticket.created_at) })}</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className={`shrink-0 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={`rounded-2xl border border-dashed p-8 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-slate-50/70"}`}>
                  <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{rt("kpiDetail.emptyTitle")}</p>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{rt("kpiDetail.emptyDescription")}</p>
                </div>
              )}
            </div>

            <div className={`shrink-0 border-t px-4 py-4 sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900/95" : "border-slate-200 bg-white/95"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-xs ${TEXT_MUTED_CLASS}`}>{rt("kpiDetail.footerHint")}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setSelectedKpiMetricKey("")} className={SECONDARY_BUTTON_CLASS}>{rt("common.close")}</button>
                  <button type="button" onClick={handleViewAllClick} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white">
                    {rt("kpiDetail.openHistory")}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {dashboardNotifications.length > 0 && (
        <div className="pointer-events-none fixed inset-x-4 top-20 z-[110] flex flex-col gap-3 sm:left-auto sm:right-4 sm:top-24 sm:w-full sm:max-w-sm">
          {dashboardNotifications.map((notification) => {
            const notificationToneClass =
              notification.tone === "emerald"
                ? "border-emerald-400 bg-gradient-to-r from-emerald-600 to-green-600"
                : notification.tone === "amber"
                  ? "border-amber-300 bg-gradient-to-r from-amber-500 to-orange-500"
                  : notification.tone === "rose"
                    ? "border-rose-300 bg-gradient-to-r from-rose-500 to-pink-500"
                    : "border-indigo-300 bg-gradient-to-r from-indigo-600 to-purple-600";

            const NotificationIcon =
              notification.tone === "emerald"
                ? CheckCircle2
                : notification.tone === "amber"
                  ? Timer
                  : notification.tone === "rose"
                    ? AlertCircle
                    : ShieldCheck;

            return (
              <div
                key={notification.id}
                className={`pointer-events-auto rounded-2xl border-l-4 p-4 text-white shadow-2xl ${notificationToneClass}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <NotificationIcon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black">{notification.title}</p>
                    <p className="mt-1 text-xs text-white/90">{notification.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissDashboardNotification(notification.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                    aria-label={rt("common.closeNotification")}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOperationalOverviewModalOpen && (
        <div className="fixed inset-0 z-[102] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label={rt("common.close")}
            onClick={() => setIsOperationalOverviewModalOpen(false)}
            className="absolute inset-0"
          />
          <section className={`relative z-10 flex w-full max-w-7xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[2rem] border shadow-[0_28px_70px_-26px_rgba(43,89,176,0.42)] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="shrink-0 border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-emerald-500" />
                    <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${TEXT_SUBTLE_CLASS}`}>{rt("operational.modalLabel")}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${isDarkTheme ? "border-emerald-700/50 bg-emerald-900/30 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {rt("operational.realtime")}
                    </span>
                  </div>
                  <h3 className={`mt-1 text-xl font-black ${TEXT_PRIMARY_CLASS}`}>{rt("operational.title")}</h3>
                  <p className={`mt-1 text-sm ${TEXT_MUTED_CLASS}`}>{rt("operational.modalDescription")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOperationalOverviewModalOpen(false)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  {rt("common.sync")}: {lastUpdated ? formatDateTime(lastUpdated) : rt("common.loading")}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-indigo-500/50 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
                  {rt("operational.onTimeSla", { percent: slaStats.percentage })}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-amber-700/60 bg-amber-900/30 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  {rt("operational.riskOverdue", {
                    risk: operationalSnapshot.risk,
                    overdue: operationalSnapshot.overdue,
                  })}
                </span>
                {todayMeetingOverlapCount > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-rose-700/60 bg-rose-900/30 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                    {rt("operational.overlapCount", { count: todayMeetingOverlapCount })}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {operationalOverviewStats.map((item) => {
                  const MetricIcon = item.icon;

                  return (
                    <article key={item.key} className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{item.label}</p>
                          <p className={`mt-2 text-3xl font-black ${item.valueColor}`}>{item.value}</p>
                          <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{item.helper}</p>
                        </div>
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.iconWrap}`}>
                          <MetricIcon size={18} className={item.iconColor} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                <div className="space-y-4">
                  <section className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("operational.trendLabel")}</p>
                        <h4 className={`mt-1 text-base font-black ${TEXT_PRIMARY_CLASS}`}>{rt("operational.trendTitle")}</h4>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isDarkTheme ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600"}`}>{rt("operational.rolling7Days")}</span>
                    </div>
                    <StableChartContainer className="h-[280px] min-w-0">
                      {chartsReady ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                          <LineChart data={operationalTrendData} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={CHART_TOOLTIP_STYLE}
                              formatter={(value, name) => [`${value} ${rt("common.items")}`, name]}
                              labelFormatter={(label) => rt("operational.dateLabel", { label })}
                            />
                            <Line type="monotone" dataKey="created" name={rt("operational.lineCreated")} stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="closed" name={rt("operational.lineClosed")} stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : null}
                    </StableChartContainer>
                  </section>

                  <section className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("operational.statusOverviewLabel")}</p>
                        <h4 className={`mt-1 text-base font-black ${TEXT_PRIMARY_CLASS}`}>{rt("operational.statusOverviewTitle")}</h4>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isDarkTheme ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600"}`}>{rt("operational.liveQueue")}</span>
                    </div>
                    <StableChartContainer className="h-[240px] min-w-0">
                      {chartsReady ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                          <BarChart data={operationalStatusChartData} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${value} ${rt("common.items")}`, rt("common.amount")]} />
                            <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                              {operationalStatusChartData.map((entry) => (
                                <Cell key={`status-cell-${entry.key}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : null}
                    </StableChartContainer>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("operational.mixLabel")}</p>
                        <h4 className={`mt-1 text-base font-black ${TEXT_PRIMARY_CLASS}`}>{rt("operational.mixTitle")}</h4>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isDarkTheme ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600"}`}>{operationalLoadTotal} {rt("common.items")}</span>
                    </div>

                    <StableChartContainer className="relative h-[250px] min-w-0">
                      {chartsReady ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                          <PieChart>
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [`${value} ${rt("common.items")}`, name]} />
                            <Pie data={operationalLoadData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4} stroke="transparent">
                              {operationalLoadData.map((entry, index) => (
                                <Cell key={`operational-load-${entry.name}-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      ) : null}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("operational.liveLoad")}</p>
                          <p className={`mt-1 text-3xl font-black ${TEXT_PRIMARY_CLASS}`}>{operationalLoadTotal}</p>
                        </div>
                      </div>
                    </StableChartContainer>

                    <div className="space-y-2">
                      {operationalLoadData.map((item) => (
                        <div key={`operational-load-label-${item.name}`} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
                          <span className={`inline-flex min-w-0 items-center gap-2 text-xs font-bold ${TEXT_SECONDARY_CLASS}`}>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className={`text-sm font-black ${TEXT_PRIMARY_CLASS}`}>{item.isPlaceholder ? 0 : item.value}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("operational.watchlistLabel")}</p>
                        <h4 className={`mt-1 text-base font-black ${TEXT_PRIMARY_CLASS}`}>{rt("operational.watchlistTitle")}</h4>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isDarkTheme ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600"}`}>{rt("operational.liveFeed")}</span>
                    </div>

                    <div className="space-y-3">
                      <div className={`rounded-xl border p-3 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
                        <p className={`text-xs font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{meetingRealtimeSummary.activeBookings.length > 0 ? rt("operational.roomsInUseNow") : rt("operational.nextMeetingQueue")}</p>
                        {meetingRealtimeSummary.activeBookings.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {meetingRealtimeSummary.activeBookings.slice(0, 2).map((booking) => (
                              <div key={`live-meeting-${booking.id}`} className={`rounded-lg border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-800/80" : "border-slate-100 bg-slate-50/80"}`}>
                                <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{booking.room_name || rt("operational.notSpecifiedRoom")}</p>
                                <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{booking.title || rt("operational.activeMeetingFallback")} • {booking.startClock} - {booking.endClock}</p>
                              </div>
                            ))}
                          </div>
                        ) : nextMeetingBooking ? (
                          <p className={`mt-2 text-sm ${TEXT_MUTED_CLASS}`}>{nextMeetingBooking.room_name || rt("operational.notSpecifiedRoom")} • {format(nextMeetingBooking.startsAt, "dd MMM HH:mm", { locale: dateLocale })}</p>
                        ) : (
                          <p className={`mt-2 text-sm ${TEXT_MUTED_CLASS}`}>{rt("operational.noMeetingInUse")}</p>
                        )}
                      </div>

                      <div className={`rounded-xl border p-3 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
                        <p className={`mb-2 text-xs font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("operational.topOpenCategories")}</p>
                        {operationalCategoryList.length > 0 ? (
                          <div className="space-y-2">
                            {operationalCategoryList.slice(0, 3).map((item) => (
                              <div key={`operational-category-${item.label}`} className="flex items-center justify-between gap-3">
                                <p className={`truncate text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{item.label}</p>
                                <span className={`text-xs font-black ${TEXT_PRIMARY_CLASS}`}>{item.value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-sm ${TEXT_MUTED_CLASS}`}>{rt("operational.noOpenTickets")}</p>
                        )}
                      </div>

                      <div className={`rounded-xl border p-3 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
                        <p className={`mb-2 text-xs font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("operational.urgentTickets")}</p>
                        {priorityInbox.length > 0 ? (
                          <div className="space-y-2">
                            {priorityInbox.slice(0, 2).map((ticket) => (
                              <button
                                key={`operational-priority-${ticket.id}`}
                                type="button"
                                onClick={() => {
                                  setActiveTicketId(ticket.id);
                                  setIsOperationalOverviewModalOpen(false);
                                  setIsRecentActivityModalOpen(true);
                                }}
                                className={`w-full rounded-lg border px-3 py-2 text-left transition ${isDarkTheme ? "border-slate-700 bg-slate-800/80 hover:bg-slate-800" : "border-slate-100 bg-slate-50/80 hover:bg-white"}`}
                              >
                                <p className={`truncate text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{ticket.title || rt("ticket.noTitle")}</p>
                                <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{ticket.ticket_no || `T${ticket.id?.slice(-6).toUpperCase()}`}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-sm ${TEXT_MUTED_CLASS}`}>{rt("operational.noUrgentTickets")}</p>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className={`shrink-0 border-t px-4 py-4 sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900/95" : "border-slate-200 bg-white/95"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-xs ${TEXT_MUTED_CLASS}`}>{rt("operational.footerHint")}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setIsOperationalOverviewModalOpen(false)} className={SECONDARY_BUTTON_CLASS}>{rt("common.close")}</button>
                  <button type="button" onClick={handleViewAllClick} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white">
                    {rt("operational.openHistory")}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {isMeetingRoomStatusModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label={rt("meeting.closeAria")}
            onClick={() => setIsMeetingRoomStatusModalOpen(false)}
            className="absolute inset-0"
          />
          <section className={`relative z-10 flex w-full max-w-6xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[2rem] border shadow-[0_28px_70px_-26px_rgba(43,89,176,0.42)] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="shrink-0 border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-500" />
                    <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${TEXT_SUBTLE_CLASS}`}>{dt("nav.meetingRoomStatus")}</p>
                  </div>
                  <h3 className={`mt-1 text-xl font-black ${TEXT_PRIMARY_CLASS}`}>{rt("meeting.modalTitle")}</h3>
                  <p className={`mt-1 text-sm ${TEXT_MUTED_CLASS}`}>{rt("meeting.modalSubtitle")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMeetingRoomStatusModalOpen(false)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  {rt("meeting.todayCount", { count: todayMeetingBookings.length })}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  {rt("meeting.tomorrowCount", { count: tomorrowMeetingBookings.length })}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  {rt("meeting.upcomingCount", { count: normalizedUpcomingMeetingBookings.length })}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-indigo-500/50 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
                  {rt("meeting.nextShort", {
                    value: nextMeetingBooking
                      ? `${nextMeetingBooking.room_name} ${format(nextMeetingBooking.startsAt, "dd MMM HH:mm", { locale: dateLocale })}`
                      : rt("common.noNextBooking"),
                  })}
                </span>
                {todayMeetingOverlapCount > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-rose-700/60 bg-rose-900/40 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                    {rt("meeting.overlapCount", { count: todayMeetingOverlapCount })}
                  </span>
                )}
              </div>

              {meetingRoomLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <div className={`h-8 w-8 animate-spin rounded-full border-2 ${isDarkTheme ? "border-slate-600 border-t-indigo-400" : "border-indigo-200 border-t-indigo-600"}`} />
                </div>
              ) : meetingRoomError ? (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${isDarkTheme ? "border-rose-700/60 bg-rose-900/30 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                  {meetingRoomError}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                  <div className="space-y-4">
                    <div className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                      <div className="mb-2 flex items-center gap-2">
                        <Calendar size={14} className="text-indigo-600" />
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("meeting.todayBookings")}</p>
                      </div>
                      {normalizedTodayMeetingBookings.length > 0 ? (
                        <div className="space-y-2">
                          {normalizedTodayMeetingBookings.map((booking) => (
                            <article key={`meeting-modal-${booking.id}`} className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-white"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={`truncate text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{booking.title || rt("common.bookingTitle")}</p>
                                  <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${TEXT_MUTED_CLASS}`}>
                                    <span className="inline-flex items-center gap-1">
                                      <DoorOpen size={12} />
                                      {booking.room_name || rt("operational.notSpecifiedRoom")}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <User size={12} />
                                      {booking.booked_by || rt("common.noBookedBy")}
                                    </span>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className={`text-[11px] font-semibold ${TEXT_SUBTLE_CLASS}`}>{format(booking.startsAt, "dd MMM yyyy", { locale: dateLocale })}</p>
                                  <p className={`text-xs font-black ${TEXT_SECONDARY_CLASS}`}>{booking.startClock} - {booking.endClock}</p>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className={`rounded-xl border border-dashed p-5 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                          <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{rt("common.noMeetingToday")}</p>
                        </div>
                      )}
                    </div>

                    <div className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <Clock size={14} className={isDarkTheme ? "text-slate-300" : "text-slate-600"} />
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("meeting.roomStatusToday")}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        {todayRoomStatusCards.map((roomCard) => (
                          <article key={`meeting-room-card-${roomCard.roomName}`} className={`rounded-2xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <DoorOpen size={15} className={isDarkTheme ? "text-slate-300" : "text-slate-600"} />
                                <h4 className={`text-sm font-black ${TEXT_SECONDARY_CLASS}`}>{roomCard.roomName}</h4>
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${roomCard.bookedCount > 0
                                ? (isDarkTheme ? "bg-rose-900/40 text-rose-300" : "bg-rose-50 text-rose-700")
                                : (isDarkTheme ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")
                                }`}>
                                {roomCard.bookedCount > 0 ? rt("meeting.booked") : rt("meeting.available")}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {roomCard.slots.map((slot, index) => (
                                <div
                                  key={`${roomCard.roomName}-modal-slot-${index}`}
                                  className={`rounded-xl border px-3 py-2 text-xs ${slot.type === "booked"
                                    ? (isDarkTheme ? "border-rose-700/50 bg-rose-900/20 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700")
                                    : (isDarkTheme ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700")
                                    }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold">
                                      {minutesToClock(slot.startMinutes)} - {minutesToClock(slot.endMinutes)}
                                    </span>
                                    <span>{slot.type === "booked" ? rt("meeting.booked") : rt("meeting.available")}</span>
                                  </div>
                                  {slot.type === "booked" && (
                                    <p className="mt-1 line-clamp-2">{slot.title || rt("common.bookingTitle")}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <Clock size={14} className="text-indigo-600" />
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{rt("meeting.latestActivity")}</p>
                      </div>
                      {upcomingMeetingPreview.length > 0 ? (
                        <div className="space-y-2">
                          {upcomingMeetingPreview.map((booking) => (
                            <article key={`meeting-upcoming-${booking.id}`} className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
                              <p className={`truncate text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{booking.title || rt("common.bookingTitle")}</p>
                              <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${TEXT_MUTED_CLASS}`}>
                                <span className="inline-flex items-center gap-1">
                                  <DoorOpen size={12} />
                                  {booking.room_name || rt("operational.notSpecifiedRoom")}
                                </span>
                                <span>{format(booking.startsAt, "dd MMM HH:mm", { locale: dateLocale })}</span>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className={`rounded-xl border border-dashed p-5 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                          <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{rt("meeting.noUpcomingQueue")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`shrink-0 border-t px-4 py-4 sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900/95" : "border-slate-200 bg-white/95"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-xs ${TEXT_MUTED_CLASS}`}>{rt("meeting.footerHint")}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setIsMeetingRoomStatusModalOpen(false)} className={SECONDARY_BUTTON_CLASS}>{rt("common.close")}</button>
                  <button type="button" onClick={() => navigate("/meeting-room-booking")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white">
                    {rt("meeting.openBooking")}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {isRecentActivityModalOpen && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label={rt("recentActivity.closeAria")}
            onClick={() => setIsRecentActivityModalOpen(false)}
            className="absolute inset-0"
          />
          <section className={`relative z-10 flex w-full max-w-6xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[2rem] border shadow-[0_28px_70px_-26px_rgba(43,89,176,0.42)] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="shrink-0 border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${TEXT_SUBTLE_CLASS}`}>{dt("nav.recentActivity")}</p>
                  </div>
                  <h3 className={`mt-1 text-xl font-black ${TEXT_PRIMARY_CLASS}`}>{rt("recentActivity.modalTitle")}</h3>
                  <p className={`mt-1 text-sm ${TEXT_MUTED_CLASS}`}>{rt("recentActivity.modalSubtitle")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecentActivityModalOpen(false)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className={`mb-4 rounded-2xl border p-3 ${SURFACE_PANEL_CLASS}`}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                    {rt("recentActivity.totalCount", { count: filteredTickets.length })}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-indigo-500/50 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
                    {rt("recentActivity.popupCount", { count: Math.min(filteredTickets.length, 12) })}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="relative sm:col-span-2">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={rt("recentActivity.searchPlaceholder")}
                      aria-label={rt("recentActivity.searchAria")}
                      className={SEARCH_CONTROL_CLASS}
                    />
                  </div>

                  <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} aria-label={rt("recentActivity.filterStatusAria")} className={FORM_CONTROL_CLASS}>
                    {localizedFilterOptions.map((filter) => (
                      <option key={filter.id} value={filter.id}>{filter.label}</option>
                    ))}
                  </select>

                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label={rt("recentActivity.filterCategoryAria")} className={FORM_CONTROL_CLASS}>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category === "ALL" ? dt("activity.allCategories") : category}</option>
                    ))}
                  </select>

                  {!isUserSearchMode && (
                    <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} aria-label={rt("recentActivity.filterPriorityAria")} className={FORM_CONTROL_CLASS}>
                      {localizedPriorityFilterOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  )}

                  {!isUserSearchMode && (
                    <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)} aria-label={rt("recentActivity.filterSlaAria")} className={FORM_CONTROL_CLASS}>
                      {localizedSlaFilterOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {hasActiveSmartFilters && (
                    <button type="button" onClick={clearSmartFilters} className={SECONDARY_BUTTON_CLASS}>
                      {dt("activity.clearFilters")}
                    </button>
                  )}
                  <button type="button" onClick={handleViewAllClick} className={SECONDARY_BUTTON_CLASS}>
                    {rt("recentActivity.openHistory")}
                  </button>
                </div>
              </div>

              {filteredTickets.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                  <div className="space-y-3">
                    {filteredTickets.slice(0, 12).map(renderTicketItem)}
                  </div>

                  <div className={`rounded-2xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-800/60" : "border-blue-100 bg-blue-50/70"}`}>
                    {activeTicket ? (
                      <div>
                        <div className="mb-4">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                              {activeTicket.ticket_no || `T${activeTicket.id?.slice(-6).toUpperCase()}`}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${activeTicketStatus.bg} ${activeTicketStatus.color} ${activeTicketStatus.border}`}>
                              {activeTicketStatus.label}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${activeTicketPriority.color}`}>
                              {activeTicketPriority.label}
                            </span>
                          </div>
                          <h4 className={`text-base font-black ${TEXT_PRIMARY_CLASS}`}>{activeTicket.title || rt("ticket.noTitle")}</h4>
                          <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${TEXT_MUTED_CLASS}`}>
                            <span>{activeTicket.category || rt("ticket.noCategory")}</span>
                            <span className={TEXT_SUBTLE_CLASS}>•</span>
                            <span>{formatDate(activeTicket.created_at)}</span>
                            <span className={TEXT_SUBTLE_CLASS}>•</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} />
                              {String(activeTicket.location || "").trim() || rt("common.noLocation")}
                            </span>
                          </div>
                          <p className={`mt-3 rounded-xl border p-3 text-xs leading-relaxed ${isDarkTheme ? "border-slate-700 bg-slate-900/80 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
                            {activeTicket.description || rt("common.noDescription")}
                          </p>
                        </div>

                        <div className={`mb-4 rounded-xl border p-3 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
                          <p className={`mb-2 text-[11px] font-black uppercase tracking-wider ${TEXT_MUTED_CLASS}`}>{dt("activity.timeline")}</p>
                          <div className="space-y-3">
                            {activeTimeline.map((event, index) => (
                              <div key={`activity-modal-${event.id}`} className="relative pl-5">
                                {index < activeTimeline.length - 1 && (
                                  <span className={`absolute left-[6px] top-4 h-8 w-px ${isDarkTheme ? "bg-slate-700" : "bg-slate-200"}`} />
                                )}
                                <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-indigo-500" />
                                <p className={`text-xs font-bold ${TEXT_SECONDARY_CLASS}`}>{event.label}</p>
                                <p className={`text-[11px] ${TEXT_MUTED_CLASS}`}>{event.detail}</p>
                                <p className={`text-[10px] font-semibold ${TEXT_SUBTLE_CLASS}`}>{formatDateTime(event.date)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedTicket(activeTicket)}
                          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25"
                        >
                          {dt("activity.fullDetails")}
                        </button>
                      </div>
                    ) : (
                      <div className={`rounded-xl border border-dashed p-5 text-center ${isDarkTheme ? "border-slate-700" : "border-slate-300"}`}>
                        <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{dt("activity.noSelectedTicket")}</p>
                        <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{dt("activity.selectTicketAbove")}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl border border-dashed p-8 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-slate-50/70"}`}>
                  <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{dt("activity.noTicketsFound")}</p>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{rt("recentActivity.noResultsDescription")}</p>
                </div>
              )}
            </div>

            <div className={`shrink-0 border-t px-4 py-4 sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900/95" : "border-slate-200 bg-white/95"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-xs ${TEXT_MUTED_CLASS}`}>{rt("recentActivity.footerHint")}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setIsRecentActivityModalOpen(false)} className={SECONDARY_BUTTON_CLASS}>{rt("common.close")}</button>
                  <button type="button" onClick={handleViewAllClick} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white">
                    {rt("recentActivity.openHistory")}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {isAssetQrScannerOpen ? (
        <AssetViewScannerModal
          title={dt("quickActions.scanAsset.label")}
          subtitle={dt("quickActions.scanAsset.description")}
          onDetected={handleAssetQrDetected}
          onClose={() => setIsAssetQrScannerOpen(false)}
        />
      ) : null}

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onNewTicket={() => navigate("/create-ticket")}
        getStatusConfig={getStatusConfig}
        getPriorityConfig={getPriorityConfig}
        formatDate={formatDate}
        currentUser={{
          id: profile?.id,
          name: profile?.full_name || profile?.employee_code || profile?.email || rt("common.userFallback"),
          role: profile?.role || "user",
          avatar: profile?.avatar_url || profile?.id_card_url || "",
        }}
      />

      {/* Full Profile Popup */}
      {showProfileDetails && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            aria-label={rt("common.close")}
            onClick={() => setShowProfileDetails(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="full-profile-title"
            className={`relative max-h-[92dvh] w-full max-w-xl overflow-hidden rounded-t-[28px] border shadow-[0_28px_70px_-26px_rgba(43,89,176,0.55)] sm:rounded-3xl ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-[#2b59b0]/20 bg-white text-slate-800"}`}
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1c376d] via-[#2b59b0] to-[#244a95] px-3.5 pb-3.5 pt-3 text-white sm:px-5 sm:py-5">
              <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-20 left-1/3 h-36 w-36 rounded-full bg-cyan-300/10 blur-2xl" />
              <div className="relative flex items-start gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => profileAvatarUrl && setIsModalOpen(true)}
                  disabled={!profileAvatarUrl}
                  className="group/avatar relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-white/70 bg-white/15 p-0.5 shadow-xl sm:h-[4.5rem] sm:w-[4.5rem]"
                  aria-label={rt("common.profileAlt")}
                >
                  {profileAvatarUrl ? (
                    <img
                      src={profileAvatarUrl}
                      alt={rt("common.profileAlt")}
                      className="h-full w-full rounded-[13px] object-cover transition group-hover/avatar:scale-105 sm:rounded-[15px]"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center rounded-[13px] bg-white/10 text-white/80 sm:rounded-[15px]">
                      <User size={28} />
                    </span>
                  )}
                </button>

                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/70 sm:text-[10px]">Full Profile</p>
                  <h3 id="full-profile-title" className="mt-0.5 truncate text-base font-black sm:text-lg">{profile?.full_name || rt("common.noName")}</h3>
                  <p className="truncate text-[11px] font-semibold text-white/80 sm:text-xs">
                    {profile?.position || rt("common.employee")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="max-w-full truncate rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/90">
                      {profile?.department || rt("common.notSpecified")}
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/90">
                      ID: {profile?.employee_code || rt("common.notSpecified")}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileDetails(false)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 sm:h-9 sm:w-9"
                  aria-label={rt("common.close")}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className={`max-h-[calc(92dvh-148px)] overflow-y-auto p-3.5 sm:max-h-[min(64vh,560px)] sm:p-5 ${isDarkTheme ? "bg-slate-900/95" : "bg-white/95"}`}>
              <div className="mb-3 flex items-center justify-between px-0.5">
                <p className={`text-xs font-black ${TEXT_PRIMARY_CLASS}`}>{rt("common.profileInfo")}</p>
                <span className={`text-[10px] font-bold ${TEXT_SUBTLE_CLASS}`}>{profileDetailItems.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 min-[430px]:grid-cols-2">
                {profileDetailItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.key}
                      className={`rounded-2xl border p-3 ${isDarkTheme ? "border-slate-700 bg-slate-800/80" : "border-slate-200 bg-[#F8FBFF]"}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2b59b0] to-[#244a95] text-white shadow-sm">
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${TEXT_SUBTLE_CLASS}`}>{item.label}</p>
                          <p className={`mt-1 break-words text-xs font-bold leading-5 sm:text-sm ${TEXT_SECONDARY_CLASS}`}>{item.value}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Global Styles */}
      <DashboardGlobalStyles />
    </div>
  );
}



