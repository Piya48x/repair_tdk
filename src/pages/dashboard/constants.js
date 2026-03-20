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

export const STATUS_CONFIG = {
  NEW: {
    label: "รอดำเนินการ",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: Clock,
    gradient: "from-rose-50 to-rose-100",
    badgeGradient: "from-rose-500 to-rose-600",
  },
  IN_PROGRESS: {
    label: "กำลังซ่อม",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Clock,
    gradient: "from-amber-50 to-amber-100",
    badgeGradient: "from-amber-500 to-orange-600",
  },
  CLOSED: {
    label: "สำเร็จ",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
    gradient: "from-emerald-50 to-emerald-100",
    badgeGradient: "from-emerald-500 to-green-600",
  },
};

export const PRIORITY_CONFIG = {
  urgent: {
    label: "ด่วน",
    color: "bg-gradient-to-r from-rose-500 to-pink-600",
    icon: Zap,
    slaHours: 2,
  },
  high: {
    label: "สูง",
    color: "bg-gradient-to-r from-amber-500 to-orange-600",
    icon: Activity,
    slaHours: 4,
  },
  normal: {
    label: "ปกติ",
    color: "bg-gradient-to-r from-blue-500 to-indigo-600",
    icon: Timer,
    slaHours: 8,
  },
  low: {
    label: "ต่ำ",
    color: "bg-gradient-to-r from-emerald-500 to-green-600",
    icon: Battery,
    slaHours: 24,
  },
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

export const FILTER_OPTIONS = [
  { id: "ALL", label: "ทั้งหมด", color: "bg-slate-100 text-slate-700" },
  { id: "PENDING", label: "รอดำเนินการ", color: "bg-amber-100 text-amber-700" },
  { id: "CLOSED", label: "สำเร็จ", color: "bg-emerald-100 text-emerald-700" },
];

export const PRIORITY_FILTER_OPTIONS = [
  { id: "ALL", label: "ทุกความเร่งด่วน" },
  { id: "urgent", label: "ด่วน" },
  { id: "high", label: "สูง" },
  { id: "normal", label: "ปกติ" },
  { id: "low", label: "ต่ำ" },
];

export const SLA_FILTER_OPTIONS = [
  { id: "ALL", label: "SLA ทั้งหมด" },
  { id: "ON_TRACK", label: "อยู่ใน SLA" },
  { id: "RISK", label: "เสี่ยงหลุด SLA" },
  { id: "OVERDUE", label: "หลุด SLA" },
];

export const SMART_FILTER_PRESET_KEY = "dashboard-smart-filter-presets-v1";
export const DASHBOARD_THEME_KEY = "dashboard-theme-v1";

export const ROLE_LABELS = {
  user: "ผู้ใช้งาน",
  it_support: "ทีม IT Support",
  admin: "ผู้ดูแลระบบ",
  auditor: "ผู้ตรวจสอบ",
  it_manager: "IT Manager",
  executive: "Executive",
};

export const ROLE_BASED_VIEWS = {
  user: [
    {
      id: "user-my-open",
      label: "งานที่ต้องตาม",
      description: "งานที่ยังไม่ปิดทั้งหมด",
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "ALL", searchQuery: "" },
    },
    {
      id: "user-sla-risk",
      label: "งานเสี่ยง SLA",
      description: "โฟกัสงานที่ต้องเร่งติดตาม",
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "RISK", searchQuery: "" },
    },
  ],
  it_support: [
    {
      id: "it-overdue",
      label: "Overdue Queue",
      description: "งานหลุด SLA ที่ต้องเร่งปิด",
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "OVERDUE", searchQuery: "" },
    },
    {
      id: "it-priority",
      label: "งาน Priority สูง",
      description: "ด่วนและสูงเพื่อจัดคิวช่าง",
      filters: { activeFilter: "PENDING", priorityFilter: "high", categoryFilter: "ALL", slaFilter: "ALL", searchQuery: "" },
    },
  ],
  admin: [
    {
      id: "admin-ops",
      label: "Ops Control",
      description: "ภาพรวมงานค้างทุกประเภท",
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "ALL", searchQuery: "" },
    },
    {
      id: "admin-sla",
      label: "SLA Critical",
      description: "รวมงานเสี่ยงและหลุด SLA",
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "RISK", searchQuery: "" },
    },
  ],
  auditor: [
    {
      id: "audit-closed",
      label: "Closed Tickets",
      description: "ตรวจสอบงานที่ปิดแล้ว",
      filters: { activeFilter: "CLOSED", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "ALL", searchQuery: "" },
    },
    {
      id: "audit-sla",
      label: "SLA Findings",
      description: "ดูงานหลุด SLA สำหรับตรวจสอบ",
      filters: { activeFilter: "PENDING", priorityFilter: "ALL", categoryFilter: "ALL", slaFilter: "OVERDUE", searchQuery: "" },
    },
  ],
};

export const getSlaState = (ticket) => {
  if (!ticket?.created_at || ticket.status === "CLOSED") return "CLOSED";

  const created = new Date(ticket.created_at);
  const now = new Date();
  const hoursPassed = (now - created) / (1000 * 60 * 60);
  const priority = ticket.priority || "normal";
  const slaHours = PRIORITY_CONFIG[priority]?.slaHours || 8;
  const remaining = slaHours - hoursPassed;

  if (remaining <= 0) return "OVERDUE";
  if (remaining <= 2) return "RISK";
  return "ON_TRACK";
};

export const resolveCategoryIcon = (category) => CATEGORY_ICONS[category] || HardDrive;
