import { enUS, ko, th } from "date-fns/locale";

export const LANGUAGE_STORAGE_KEY = "app_language";

export const LANGUAGE_OPTIONS = [
  { id: "th", flag: "🇹🇭", label: "ไทย" },
  { id: "en", flag: "🇺🇸", label: "English" },
  { id: "ko", flag: "🇰🇷", label: "한국어" },
];

export const DATE_FNS_LOCALES = {
  th,
  en: enUS,
  ko,
};

export const translations = {
  th: {
    common: {
      appLanguage: "ภาษา",
      backDashboard: "กลับ Dashboard",
      refresh: "รีเฟรช",
      exportExcel: "ส่งออก Excel",
      exporting: "กำลังส่งออก...",
      user: "ผู้ใช้งาน",
      all: "ทั้งหมด",
      allTags: "ทุกแท็ก",
      lightMode: "โหมดสว่าง",
      darkMode: "โหมดมืด",
      openITChat: "เปิดแชท IT",
      signOut: "ออกจากระบบ",
      notifications: "การแจ้งเตือน",
      toggleSidebar: "สลับเมนูด้านข้าง",
      toggleTheme: "สลับธีม",
      syncing: "ซิงก์",
      itDepartment: "ฝ่าย IT",
    },
    workNotes: {
      badge: "Personal Work Notes",
      title: "Work Notes / โน้ตงานส่วนตัว",
      subtitle: "บันทึกงาน วางแผน ติดตาม checklist แนบไฟล์หลักฐาน และ export เป็น Excel ได้ในหน้าเดียว",
      allNotes: "โน้ตทั้งหมด",
      open: "งานค้าง",
      done: "เสร็จแล้ว",
      attachments: "ไฟล์แนบ",
      totalHint: "จำนวน Work Notes ทั้งหมด",
      openHint: "งานที่ยังไม่อยู่สถานะ Done",
      doneHint: "งานที่ปิดเรียบร้อยแล้ว",
      pinnedHint: "Pinned {{count}} รายการ",
      liveSummary: "สรุปผลลัพธ์",
      visibleItems: "รายการที่แสดงอยู่ {{count}} รายการ",
      filterSummary: "Filter: {{status}} / Tag: {{tag}}",
      pinnedCount: "ปักหมุด {{count}}",
    },
    accessRequest: {
      badge: "Access Request",
      title: "ขอสิทธิ์ระบบ",
      subtitle: "ส่งคำขอเข้าถึงระบบผ่าน workflow และติดตามสถานะอนุมัติแบบเรียลไทม์",
      create: "สร้างคำขอสิทธิ์",
      pendingApproval: "รออนุมัติ",
      approved: "อนุมัติแล้ว",
      rejected: "ถูกปฏิเสธ",
      completed: "ปิดงานแล้ว",
    },
    ticketHistory: {
      badge: "Ticket Center",
      title: "ประวัติการแจ้งซ่อม",
      totalItems: "ทั้งหมด {{count}} รายการ",
      refresh: "รีเฟรช",
      exportExcel: "ส่งออก Excel",
      all: "ทั้งหมด",
      pending: "รอดำเนินการ",
      success: "สำเร็จ",
      averageTime: "เวลาเฉลี่ย",
      loading: "กำลังโหลดประวัติการแจ้งซ่อม...",
    },
    itDashboard: {
      title: "IT Service Hub",
      subtitle: "แดชบอร์ดช่างเทคนิค",
    },
  },
  en: {
    common: {
      appLanguage: "Language",
      backDashboard: "Back to Dashboard",
      refresh: "Refresh",
      exportExcel: "Export Excel",
      exporting: "Exporting...",
      user: "User",
      all: "All",
      allTags: "All tags",
      lightMode: "Light mode",
      darkMode: "Dark mode",
      openITChat: "Open IT chat",
      signOut: "Sign out",
      notifications: "Notifications",
      toggleSidebar: "Toggle sidebar",
      toggleTheme: "Toggle theme",
      syncing: "Sync",
      itDepartment: "IT Department",
    },
    workNotes: {
      badge: "Personal Work Notes",
      title: "Work Notes / Personal Notes",
      subtitle: "Track work, plans, checklists, evidence attachments, and export everything to Excel from one page.",
      allNotes: "All Notes",
      open: "Open",
      done: "Done",
      attachments: "Attachments",
      totalHint: "Total work notes",
      openHint: "Notes not in Done status",
      doneHint: "Completed notes",
      pinnedHint: "Pinned {{count}} items",
      liveSummary: "Live Summary",
      visibleItems: "{{count}} items shown",
      filterSummary: "Filter: {{status}} / Tag: {{tag}}",
      pinnedCount: "Pinned {{count}}",
    },
    accessRequest: {
      badge: "Access Request",
      title: "System Access Request",
      subtitle: "Submit system access requests through a workflow and track approvals in real time.",
      create: "Create Request",
      pendingApproval: "Pending Approval",
      approved: "Approved",
      rejected: "Rejected",
      completed: "Completed",
    },
    ticketHistory: {
      badge: "Ticket Center",
      title: "Ticket History",
      totalItems: "{{count}} total items",
      refresh: "Refresh",
      exportExcel: "Export Excel",
      all: "All",
      pending: "Pending",
      success: "Completed",
      averageTime: "Average Time",
      loading: "Loading ticket history...",
    },
    itDashboard: {
      title: "IT Service Hub",
      subtitle: "Technician Dashboard",
    },
  },
  ko: {
    common: {
      appLanguage: "언어",
      backDashboard: "대시보드로 돌아가기",
      refresh: "새로고침",
      exportExcel: "엑셀 내보내기",
      exporting: "내보내는 중...",
      user: "사용자",
      all: "전체",
      allTags: "전체 태그",
      lightMode: "라이트 모드",
      darkMode: "다크 모드",
      openITChat: "IT 채팅 열기",
      signOut: "로그아웃",
      notifications: "알림",
      toggleSidebar: "사이드바 전환",
      toggleTheme: "테마 전환",
      syncing: "동기화",
      itDepartment: "IT 부서",
    },
    workNotes: {
      badge: "Personal Work Notes",
      title: "업무 노트 / 개인 노트",
      subtitle: "업무, 계획, 체크리스트, 증빙 첨부를 한 페이지에서 관리하고 엑셀로 내보낼 수 있습니다.",
      allNotes: "전체 노트",
      open: "진행 중",
      done: "완료",
      attachments: "첨부파일",
      totalHint: "전체 업무 노트 수",
      openHint: "완료되지 않은 노트",
      doneHint: "완료된 노트",
      pinnedHint: "고정 {{count}}개",
      liveSummary: "실시간 요약",
      visibleItems: "{{count}}개 표시 중",
      filterSummary: "필터: {{status}} / 태그: {{tag}}",
      pinnedCount: "고정 {{count}}",
    },
    accessRequest: {
      badge: "Access Request",
      title: "시스템 권한 요청",
      subtitle: "워크플로우를 통해 시스템 권한을 요청하고 승인 상태를 실시간으로 추적합니다.",
      create: "요청 생성",
      pendingApproval: "승인 대기",
      approved: "승인됨",
      rejected: "반려됨",
      completed: "완료됨",
    },
    ticketHistory: {
      badge: "Ticket Center",
      title: "티켓 이력",
      totalItems: "총 {{count}}건",
      refresh: "새로고침",
      exportExcel: "엑셀 내보내기",
      all: "전체",
      pending: "진행 중",
      success: "완료",
      averageTime: "평균 시간",
      loading: "티켓 이력을 불러오는 중...",
    },
    itDashboard: {
      title: "IT Service Hub",
      subtitle: "기술자 대시보드",
    },
  },
};

function getValueByPath(source, path) {
  return String(path || "")
    .split(".")
    .reduce((current, segment) => (current && typeof current === "object" ? current[segment] : undefined), source);
}

function interpolate(template, variables = {}) {
  return String(template).replace(/\{\{(.*?)\}\}/g, (_, rawKey) => {
    const key = String(rawKey || "").trim();
    return variables[key] ?? "";
  });
}

export function resolveLanguage(input) {
  const normalized = String(input || "").toLowerCase();
  if (normalized.startsWith("th")) return "th";
  if (normalized.startsWith("ko")) return "ko";
  return "en";
}

export function getInitialLanguage() {
  if (typeof window === "undefined") return "th";

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved) return resolveLanguage(saved);

  return resolveLanguage(window.navigator.language);
}

export function translate(language, key, variables) {
  const primary = getValueByPath(translations[language], key);
  const fallback = getValueByPath(translations.en, key);
  const result = primary ?? fallback ?? key;
  return interpolate(result, variables);
}
