import {
  Clock,
  CheckCircle2,
  Zap,
  Activity,
  Timer,
  Battery,
  Cpu,
  Server,
  Globe,
  Database,
  HardDrive,
  Smartphone,
  Wifi,
  ShieldCheck,
  Mail,
} from "lucide-react";

function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value.startsWith("th")) return "th";
  if (value.startsWith("ko")) return "ko";
  return "en";
}

function pickLabel(labels, language) {
  const normalized = normalizeLanguage(language);
  return labels[normalized] || labels.en;
}

const STATUS_DEFINITIONS = {
  NEW: {
    labels: {
      th: "รอดำเนินการ",
      en: "Pending",
      ko: "대기 중",
    },
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: Clock,
    gradient: "from-rose-50 to-rose-100",
    badgeGradient: "from-rose-500 to-rose-600",
  },
  IN_PROGRESS: {
    labels: {
      th: "กำลังซ่อม",
      en: "In Progress",
      ko: "진행 중",
    },
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Clock,
    gradient: "from-amber-50 to-amber-100",
    badgeGradient: "from-amber-500 to-orange-600",
  },
  CLOSED: {
    labels: {
      th: "สำเร็จ",
      en: "Completed",
      ko: "완료",
    },
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
    gradient: "from-emerald-50 to-emerald-100",
    badgeGradient: "from-emerald-500 to-green-600",
  },
};

const PRIORITY_DEFINITIONS = {
  urgent: {
    labels: {
      th: "ด่วน",
      en: "Urgent",
      ko: "긴급",
    },
    color: "bg-gradient-to-r from-rose-500 to-pink-600",
    icon: Zap,
    slaHours: 2,
  },
  high: {
    labels: {
      th: "สูง",
      en: "High",
      ko: "높음",
    },
    color: "bg-gradient-to-r from-amber-500 to-orange-600",
    icon: Activity,
    slaHours: 4,
  },
  normal: {
    labels: {
      th: "ปกติ",
      en: "Normal",
      ko: "보통",
    },
    color: "bg-gradient-to-r from-blue-500 to-indigo-600",
    icon: Timer,
    slaHours: 8,
  },
  low: {
    labels: {
      th: "ต่ำ",
      en: "Low",
      ko: "낮음",
    },
    color: "bg-gradient-to-r from-emerald-500 to-green-600",
    icon: Battery,
    slaHours: 24,
  },
};

const FILTER_OPTION_DEFINITIONS = [
  {
    id: "ALL",
    labels: {
      th: "ทั้งหมด",
      en: "All",
      ko: "전체",
    },
    color: "bg-slate-100 text-slate-700",
  },
  {
    id: "PENDING",
    labels: {
      th: "รอดำเนินการ",
      en: "Pending",
      ko: "대기 중",
    },
    color: "bg-amber-100 text-amber-700",
  },
  {
    id: "CLOSED",
    labels: {
      th: "สำเร็จ",
      en: "Completed",
      ko: "완료",
    },
    color: "bg-emerald-100 text-emerald-700",
  },
];

const PRIORITY_FILTER_DEFINITIONS = [
  {
    id: "ALL",
    labels: {
      th: "ทุกความเร่งด่วน",
      en: "All priorities",
      ko: "전체 우선순위",
    },
  },
  { id: "urgent", labels: PRIORITY_DEFINITIONS.urgent.labels },
  { id: "high", labels: PRIORITY_DEFINITIONS.high.labels },
  { id: "normal", labels: PRIORITY_DEFINITIONS.normal.labels },
  { id: "low", labels: PRIORITY_DEFINITIONS.low.labels },
];

const SLA_FILTER_DEFINITIONS = [
  {
    id: "ALL",
    labels: {
      th: "SLA ทั้งหมด",
      en: "All SLA states",
      ko: "전체 SLA 상태",
    },
  },
  {
    id: "ON_TRACK",
    labels: {
      th: "อยู่ใน SLA",
      en: "On track",
      ko: "SLA 내",
    },
  },
  {
    id: "RISK",
    labels: {
      th: "เสี่ยงหลุด SLA",
      en: "At risk",
      ko: "SLA 위험",
    },
  },
  {
    id: "OVERDUE",
    labels: {
      th: "หลุด SLA",
      en: "Overdue",
      ko: "SLA 초과",
    },
  },
];

const ROLE_LABEL_DEFINITIONS = {
  user: {
    th: "ผู้ใช้งาน",
    en: "User",
    ko: "사용자",
  },
  it_support: {
    th: "ทีม IT Support",
    en: "IT Support",
    ko: "IT Support",
  },
  admin: {
    th: "ผู้ดูแลระบบ",
    en: "Administrator",
    ko: "관리자",
  },
  auditor: {
    th: "ผู้ตรวจสอบ",
    en: "Auditor",
    ko: "감사 담당자",
  },
  it_manager: {
    th: "IT Manager",
    en: "IT Manager",
    ko: "IT Manager",
  },
  executive: {
    th: "Executive",
    en: "Executive",
    ko: "Executive",
  },
};

const ROLE_VIEW_DEFINITIONS = {
  user: [
    {
      id: "user-my-open",
      labels: {
        th: "งานที่ต้องตาม",
        en: "My Open Work",
        ko: "내 진행 작업",
      },
      descriptions: {
        th: "งานที่ยังไม่ปิดทั้งหมด",
        en: "All work items that are still open.",
        ko: "아직 완료되지 않은 모든 작업입니다.",
      },
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "ALL", searchQuery: "" },
    },
    {
      id: "user-sla-risk",
      labels: {
        th: "งานเสี่ยง SLA",
        en: "SLA Risk",
        ko: "SLA 위험 작업",
      },
      descriptions: {
        th: "โฟกัสงานที่ต้องเร่งติดตาม",
        en: "Focus on tickets that need urgent follow-up.",
        ko: "긴급 추적이 필요한 작업에 집중합니다.",
      },
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "RISK", searchQuery: "" },
    },
  ],
  it_support: [
    {
      id: "it-overdue",
      labels: {
        th: "คิวงานเกิน SLA",
        en: "Overdue Queue",
        ko: "SLA 초과 큐",
      },
      descriptions: {
        th: "งานหลุด SLA ที่ต้องเร่งปิด",
        en: "Tickets that exceeded SLA and need immediate closure.",
        ko: "SLA를 초과해 즉시 처리해야 하는 작업입니다.",
      },
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "OVERDUE", searchQuery: "" },
    },
    {
      id: "it-priority",
      labels: {
        th: "งาน Priority สูง",
        en: "High Priority",
        ko: "높은 우선순위",
      },
      descriptions: {
        th: "ด่วนและสูงเพื่อจัดคิวช่าง",
        en: "Urgent and high-priority work for technician assignment.",
        ko: "긴급 및 높은 우선순위 작업을 기술자에게 배정합니다.",
      },
      filters: { activeFilter: "PENDING", priorityFilter: "high", categoryFilter: "ALL", slaFilter: "ALL", searchQuery: "" },
    },
  ],
  admin: [
    {
      id: "admin-ops",
      labels: {
        th: "ภาพรวมงานปฏิบัติการ",
        en: "Ops Control",
        ko: "운영 통제",
      },
      descriptions: {
        th: "ภาพรวมงานค้างทุกประเภท",
        en: "Overview of all pending operational work.",
        ko: "모든 대기 중 운영 작업의 개요입니다.",
      },
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "ALL", searchQuery: "" },
    },
    {
      id: "admin-sla",
      labels: {
        th: "SLA Critical",
        en: "SLA Critical",
        ko: "SLA 중요",
      },
      descriptions: {
        th: "รวมงานเสี่ยงและหลุด SLA",
        en: "Collects at-risk and overdue SLA tickets.",
        ko: "SLA 위험 및 초과 작업을 모아봅니다.",
      },
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "RISK", searchQuery: "" },
    },
  ],
  auditor: [
    {
      id: "audit-closed",
      labels: {
        th: "งานที่ปิดแล้ว",
        en: "Closed Tickets",
        ko: "완료된 티켓",
      },
      descriptions: {
        th: "ตรวจสอบงานที่ปิดแล้ว",
        en: "Review tickets that have already been closed.",
        ko: "이미 완료된 작업을 검토합니다.",
      },
      filters: { activeFilter: "CLOSED", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "ALL", searchQuery: "" },
    },
    {
      id: "audit-sla",
      labels: {
        th: "SLA Findings",
        en: "SLA Findings",
        ko: "SLA 이슈",
      },
      descriptions: {
        th: "ดูงานหลุด SLA สำหรับตรวจสอบ",
        en: "Inspect overdue SLA cases for auditing.",
        ko: "감사를 위해 SLA 초과 사례를 검토합니다.",
      },
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "OVERDUE", searchQuery: "" },
    },
  ],
};

export const CATEGORY_ICONS = {
  Hardware: Cpu,
  Network: Wifi,
  Software: Database,
  System: Server,
  Email: Mail,
  Printer: HardDrive,
  Phone: Smartphone,
  Security: ShieldCheck,
  Website: Globe,
};

export const SMART_FILTER_PRESET_KEY = "dashboard-smart-filter-presets-v1";
export const DASHBOARD_THEME_KEY = "dashboard-theme-v1";

export function getStatusConfig(language) {
  return Object.fromEntries(
    Object.entries(STATUS_DEFINITIONS).map(([key, value]) => [
      key,
      {
        ...value,
        label: pickLabel(value.labels, language),
      },
    ]),
  );
}

export function getPriorityConfig(language) {
  return Object.fromEntries(
    Object.entries(PRIORITY_DEFINITIONS).map(([key, value]) => [
      key,
      {
        ...value,
        label: pickLabel(value.labels, language),
      },
    ]),
  );
}

export function getFilterOptions(language) {
  return FILTER_OPTION_DEFINITIONS.map((item) => ({
    id: item.id,
    color: item.color,
    label: pickLabel(item.labels, language),
  }));
}

export function getPriorityFilterOptions(language) {
  return PRIORITY_FILTER_DEFINITIONS.map((item) => ({
    id: item.id,
    label: pickLabel(item.labels, language),
  }));
}

export function getSlaFilterOptions(language) {
  return SLA_FILTER_DEFINITIONS.map((item) => ({
    id: item.id,
    label: pickLabel(item.labels, language),
  }));
}

export function getRoleLabels(language) {
  return Object.fromEntries(
    Object.entries(ROLE_LABEL_DEFINITIONS).map(([key, value]) => [key, pickLabel(value, language)]),
  );
}

export function getRoleBasedViews(language) {
  return Object.fromEntries(
    Object.entries(ROLE_VIEW_DEFINITIONS).map(([role, views]) => [
      role,
      views.map((view) => ({
        id: view.id,
        label: pickLabel(view.labels, language),
        description: pickLabel(view.descriptions, language),
        filters: view.filters,
      })),
    ]),
  );
}

export const PRIORITY_CONFIG = getPriorityConfig("th");

export const getSlaState = (ticket) => {
  if (!ticket?.created_at || ticket.status === "CLOSED") return "CLOSED";

  const created = new Date(ticket.created_at);
  const now = new Date();
  const hoursPassed = (now - created) / (1000 * 60 * 60);
  const priority = ticket.priority || "normal";
  const slaHours = PRIORITY_DEFINITIONS[priority]?.slaHours || 8;
  const remaining = slaHours - hoursPassed;

  if (remaining <= 0) return "OVERDUE";
  if (remaining <= 2) return "RISK";
  return "ON_TRACK";
};

export const resolveCategoryIcon = (category) => CATEGORY_ICONS[category] || HardDrive;
