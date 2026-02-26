import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
// ^^^ à¸•à¹‰à¸­à¸‡à¸¡à¸µ useRef à¸­à¸¢à¸¹à¹ˆà¸•à¸£à¸‡à¸™à¸µà¹‰à¸”à¹‰à¸§à¸¢
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Wrench, Package, MessageCircle, Bell, ChevronRight,
  User, Briefcase, Building2, ExternalLink, Clock, CheckCircle2,
  AlertCircle, X, Plus, Search, Download, RefreshCw,
  BarChart3, Calendar, Hash, Phone, Mail, Shield, Zap,
  TrendingUp, Timer, Battery, Activity, Cpu, Server,
  Globe, Database, HardDrive, Smartphone, Wifi, ShieldCheck,
  SlidersHorizontal, BookmarkPlus, Trash2
} from "lucide-react";
import Swal from "sweetalert2";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

// ============================================
// CONSTANTS & CONFIGURATION (Build-Safe)
// ============================================

// 1. Static Status Configuration Map (No Dynamic Classes)
const STATUS_CONFIG = {
  'NEW': {
    label: 'รอดำเนินการ',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: Clock,
    gradient: 'from-rose-50 to-rose-100',
    badgeGradient: 'from-rose-500 to-rose-600'
  },
  'IN_PROGRESS': {
    label: 'กำลังซ่อม',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: Clock,
    gradient: 'from-amber-50 to-amber-100',
    badgeGradient: 'from-amber-500 to-orange-600'
  },
  'CLOSED': {
    label: 'สำเร็จ',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    gradient: 'from-emerald-50 to-emerald-100',
    badgeGradient: 'from-emerald-500 to-green-600'
  }
};

// 2. Priority Configuration Map
const PRIORITY_CONFIG = {
  'urgent': {
    label: 'ด่วน',
    color: 'bg-gradient-to-r from-rose-500 to-pink-600',
    icon: Zap,
    slaHours: 2
  },
  'high': {
    label: 'สูง',
    color: 'bg-gradient-to-r from-amber-500 to-orange-600',
    icon: Activity,
    slaHours: 4
  },
  'normal': {
    label: 'ปกติ',
    color: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    icon: Timer,
    slaHours: 8
  },
  'low': {
    label: 'ต่ำ',
    color: 'bg-gradient-to-r from-emerald-500 to-green-600',
    icon: Battery,
    slaHours: 24
  }
};

// 3. Category Icons Map
const CATEGORY_ICONS = {
  'Hardware': Cpu,
  'Network': Wifi,
  'Software': Database,
  'System': Server,
  'Email': Mail,
  'Printer': HardDrive,
  'Phone': Smartphone,
  'Security': ShieldCheck,
  'Website': Globe
};

// 4. Filter Options
const FILTER_OPTIONS = [
  { id: 'ALL', label: 'ทั้งหมด', color: 'bg-slate-100 text-slate-700' },
  { id: 'PENDING', label: 'รอดำเนินการ', color: 'bg-amber-100 text-amber-700' },
  { id: 'CLOSED', label: 'สำเร็จ', color: 'bg-emerald-100 text-emerald-700' }
];

const PRIORITY_FILTER_OPTIONS = [
  { id: 'ALL', label: 'ทุกความเร่งด่วน' },
  { id: 'urgent', label: 'ด่วน' },
  { id: 'high', label: 'สูง' },
  { id: 'normal', label: 'ปกติ' },
  { id: 'low', label: 'ต่ำ' },
];

const SLA_FILTER_OPTIONS = [
  { id: 'ALL', label: 'SLA ทั้งหมด' },
  { id: 'ON_TRACK', label: 'อยู่ใน SLA' },
  { id: 'RISK', label: 'เสี่ยงหลุด SLA' },
  { id: 'OVERDUE', label: 'หลุด SLA' },
];

const SMART_FILTER_PRESET_KEY = "dashboard-smart-filter-presets-v1";
const FORM_CONTROL_CLASS = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const SEARCH_CONTROL_CLASS = "w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const SECONDARY_BUTTON_CLASS = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300";

const ROLE_LABELS = {
  user: "ผู้ใช้งาน",
  it_support: "ทีม IT Support",
  admin: "ผู้ดูแลระบบ",
  auditor: "ผู้ตรวจสอบ",
};

const ROLE_BASED_VIEWS = {
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

const getSlaState = (ticket) => {
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function Dashboard() {
  const navigate = useNavigate();

  // State Management
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [realtimeChannel, setRealtimeChannel] = useState(null);
  const [slaStats, setSlaStats] = useState({ onTime: 0, total: 0, percentage: 100 });
  const channelRef = useRef(null);
  const searchInputRef = useRef(null);

  // ============================================
  // âœ… REAL-TIME SUBSCRIPTION (Supabase Realtime)
  // ============================================

  const setupRealtimeSubscription = useCallback((userId) => {
    // à¸–à¹‰à¸²à¸¡à¸µ Channel à¹€à¸”à¸´à¸¡à¸—à¸µà¹ˆà¸„à¹‰à¸²à¸‡à¸­à¸¢à¸¹à¹ˆà¹ƒà¸«à¹‰à¸›à¸´à¸”à¸—à¸´à¹‰à¸‡à¸à¹ˆà¸­à¸™
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

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

          setTickets(currentTickets => {
            const newTickets = [...currentTickets];
            const existingIndex = newTickets.findIndex(t => t.id === (payload.new?.id || payload.old?.id));

            if (payload.eventType === 'INSERT') {
              newTickets.unshift(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              if (existingIndex >= 0) newTickets[existingIndex] = payload.new;
            } else if (payload.eventType === 'DELETE') {
              if (existingIndex >= 0) newTickets.splice(existingIndex, 1);
            }
            return newTickets;
          });

          setLastUpdated(new Date());

          if (payload.eventType === 'UPDATE' && payload.new?.status === 'CLOSED') {
            showUpdateNotification('งานซ่อมสำเร็จแล้ว!', `Ticket #${payload.new.ticket_no} ปิดเรียบร้อย`);
          }
        }
      )
      .subscribe((status) => {
        console.log('ðŸ“¡ Realtime status:', status);
      });

    // à¹€à¸à¹‡à¸šà¹„à¸§à¹‰à¹ƒà¸™ Ref (à¹„à¸¡à¹ˆà¸—à¸³à¹ƒà¸«à¹‰à¹€à¸à¸´à¸” Re-render)
    channelRef.current = channel;
  }, []); // Dependency à¹€à¸›à¹‡à¸™à¸§à¹ˆà¸²à¸‡à¹€à¸›à¸¥à¹ˆà¸²à¹€à¸žà¸·à¹ˆà¸­à¹„à¸¡à¹ˆà¹ƒà¸«à¹‰à¹€à¸à¸´à¸”à¸à¸²à¸£à¸ªà¸£à¹‰à¸²à¸‡ function à¹ƒà¸«à¸¡à¹ˆà¸§à¸™à¸¥à¸¹à¸›

  // Cleanup à¹€à¸¡à¸·à¹ˆà¸­à¸›à¸´à¸”à¸«à¸™à¹‰à¸²à¸ˆà¸­
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [realtimeChannel]);

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

      const user = session.user;

      // Fetch profile
      const profileRes = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileRes.error && profileRes.error.code !== "PGRST116") {
        throw profileRes.error;
      }

      if (profileRes.data) setProfile(profileRes.data);

      // Fetch tickets
      const ticketsRes = await supabase
        .from("tickets")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (ticketsRes.error) throw ticketsRes.error;

      if (ticketsRes.data) {
        const ticketsData = ticketsRes.data || [];
        setTickets(ticketsData);

        // Setup realtime after initial load
        setTimeout(() => {
          setupRealtimeSubscription(user.id);
        }, 100);

        // Calculate SLA stats
        calculateSlaStats(ticketsData);
      }

      setLastUpdated(new Date());
      return user.id;

    } catch (error) {
      console.error("Dashboard Error:", error);
      setDashboardError("ไม่สามารถโหลดข้อมูล Dashboard ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, [navigate, setupRealtimeSubscription]);

  useEffect(() => {
    initDashboard();
  }, [initDashboard]);

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
    const handleDashboardShortcuts = (event) => {
      const activeElement = document.activeElement;
      const isTypingField =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.tagName === "SELECT" ||
        activeElement?.isContentEditable;

      if (event.key === "/" && !isTypingField) {
        event.preventDefault();
        searchInputRef.current?.focus();
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
        const slaHours = PRIORITY_CONFIG[priority]?.slaHours || 8;

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
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((t) =>
        (t.ticket_no || "").toLowerCase().includes(query) ||
        (t.title || "").toLowerCase().includes(query) ||
        (t.description || "").toLowerCase().includes(query) ||
        (t.category || "").toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tickets, activeFilter, priorityFilter, categoryFilter, slaFilter, searchQuery]);

  const visibleTickets = useMemo(() => filteredTickets.slice(0, 8), [filteredTickets]);

  const roleViews = useMemo(() => {
    const role = profile?.role || "user";
    return ROLE_BASED_VIEWS[role] || ROLE_BASED_VIEWS.user;
  }, [profile?.role]);

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
    if (!lastUpdated) return 'กำลังโหลด...';

    try {
      return formatDistanceToNow(lastUpdated, {
        addSuffix: true,
        locale: th,
        includeSeconds: true
      });
    } catch {
      return 'ไม่นานมานี้';
    }
  };

  // Calculate remaining SLA time
  const calculateRemainingSla = (ticket) => {
    if (!ticket.created_at || ticket.status === 'CLOSED') return null;

    const created = new Date(ticket.created_at);
    const now = new Date();
    const hoursPassed = (now - created) / (1000 * 60 * 60);

    const priority = ticket.priority || 'normal';
    const slaHours = PRIORITY_CONFIG[priority]?.slaHours || 8;
    const remainingHours = slaHours - hoursPassed;

    if (remainingHours <= 0) return { overdue: true, atRisk: false, hours: Math.abs(remainingHours) };
    return { overdue: false, atRisk: remainingHours <= 2, hours: remainingHours };
  };

  // Format date safely
  const formatDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุ';
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy', { locale: th });
    } catch {
      return 'ไม่ระบุ';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "ไม่ระบุ";
    try {
      const date = new Date(dateString);
      return format(date, "dd MMM yyyy HH:mm", { locale: th });
    } catch {
      return "ไม่ระบุ";
    }
  };

  // Get status config (using static map)
  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || {
      label: 'ไม่ระบุ',
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
    return PRIORITY_CONFIG[priority] || {
      label: 'ไม่ระบุ',
      color: 'bg-gradient-to-r from-slate-500 to-slate-600',
      icon: Timer,
      slaHours: 8
    };
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const Icon = CATEGORY_ICONS[category] || HardDrive;
    return <Icon size={16} />;
  };

  const buildTimelineEvents = (ticket) => {
    if (!ticket) return [];

    const events = [
      {
        id: "created",
        label: "สร้างใบแจ้งซ่อม",
        detail: "ระบบรับเรื่องเรียบร้อยและเริ่มนับ SLA",
        date: ticket.created_at,
      },
    ];

    if (ticket.assigned_name || ticket.status === "IN_PROGRESS") {
      events.push({
        id: "assigned",
        label: "อยู่ระหว่างดำเนินการ",
        detail: ticket.assigned_name ? `ผู้รับผิดชอบ: ${ticket.assigned_name}` : "กำลังรอช่างเข้าดำเนินการ",
        date: ticket.updated_at || ticket.created_at,
      });
    }

    if (ticket.status === "CLOSED" || ticket.closed_at) {
      events.push({
        id: "closed",
        label: "ปิดงานสำเร็จ",
        detail: ticket.solution_note || "งานนี้ถูกปิดเรียบร้อยแล้ว",
        date: ticket.closed_at || ticket.updated_at || ticket.created_at,
      });
    } else {
      events.push({
        id: "monitoring",
        label: "ติดตาม SLA",
        detail: `สถานะปัจจุบัน: ${getStatusConfig(ticket.status).label}`,
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

    return [
      {
        key: "open",
        label: "Open (7 วัน)",
        value: openCurrent,
        icon: Clock,
        iconWrap: "bg-amber-50",
        iconColor: "text-amber-600",
        valueColor: "text-amber-700",
        trend: trendMeta(openCurrent, openPrevious),
      },
      {
        key: "risk",
        label: "SLA Risk",
        value: riskCurrent,
        icon: Timer,
        iconWrap: "bg-orange-50",
        iconColor: "text-orange-600",
        valueColor: "text-orange-700",
        trend: trendMeta(riskCurrent, riskPrevious),
      },
      {
        key: "overdue",
        label: "Overdue",
        value: overdueCurrent,
        icon: AlertCircle,
        iconWrap: "bg-rose-50",
        iconColor: "text-rose-600",
        valueColor: "text-rose-700",
        trend: trendMeta(overdueCurrent, overduePrevious),
      },
      {
        key: "closed",
        label: "Closed (7 วัน)",
        value: closedCurrent,
        icon: CheckCircle2,
        iconWrap: "bg-emerald-50",
        iconColor: "text-emerald-600",
        valueColor: "text-emerald-700",
        trend: trendMeta(closedCurrent, closedPrevious),
      },
    ];
  }, [tickets]);

  const quickActions = useMemo(() => {
    const role = profile?.role || "user";
    const items = [
      {
        id: "create-ticket",
        label: "แจ้งซ่อม IT",
        description: "รายงานปัญหาและติดตามผลตาม SLA",
        icon: Wrench,
        accent: "indigo",
        cta: "ดำเนินการทันที",
        onClick: () => navigate("/create-ticket"),
        roles: ["user", "it_support", "admin"],
      },
      {
        id: "pick-up",
        label: "เบิกอุปกรณ์",
        description: "ขออุปกรณ์หรือวัสดุสิ้นเปลืองผ่าน workflow",
        icon: Package,
        accent: "emerald",
        cta: "ตรวจสอบสต็อก",
        onClick: () => navigate("/pick-up-equipment"),
        roles: ["user", "it_support", "admin"],
      },
      {
        id: "history",
        label: "ประวัติ Ticket",
        description: "ค้นหาและติดตาม Ticket ที่เคยแจ้งทั้งหมด",
        icon: BarChart3,
        accent: "sky",
        cta: "เปิดรายการ",
        onClick: () =>
          navigate("/ticket-history", {
            state: {
              initialFilter: activeFilter,
              tickets,
            },
          }),
        roles: ["user", "it_support", "admin", "auditor"],
      },
      {
        id: "admin-dashboard",
        label: "Technician Dashboard",
        description: "จัดคิวงาน, SLA และการมอบหมายระดับ IT",
        icon: ShieldCheck,
        accent: "violet",
        cta: "เข้าสู่โหมดช่าง",
        onClick: () => navigate("/admin-dashboard"),
        roles: ["it_support", "admin"],
      },
      {
        id: "audit-view",
        label: "Audit View",
        description: "ตรวจสอบ Log และรายงานเพื่อการกำกับดูแล",
        icon: Shield,
        accent: "slate",
        cta: "เปิดมุมมองตรวจสอบ",
        onClick: () => navigate("/audit-view"),
        roles: ["auditor", "admin"],
      },
    ];

    return items.filter((item) => item.roles.includes(role));
  }, [profile?.role, navigate, activeFilter, tickets]);

  const canSeePriorityInbox = useMemo(() => {
    const role = profile?.role || "user";
    return role === "it_support" || role === "admin";
  }, [profile?.role]);

  const currentRole = profile?.role || "user";
  const roleLabel = ROLE_LABELS[currentRole] || ROLE_LABELS.user;
  const canOpenAuditView = currentRole === "admin" || currentRole === "auditor";

  // ============================================
  // âœ… EVENT HANDLERS
  // ============================================

  const handleLogout = async () => {
    try {
      // à¸›à¸´à¸”à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­ Realtime à¸à¹ˆà¸­à¸™à¸­à¸­à¸ (à¸–à¹‰à¸²à¸¡à¸µ)
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
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
      title: "บันทึกมุมมองตัวกรอง",
      input: "text",
      inputLabel: "ชื่อมุมมอง",
      inputPlaceholder: "เช่น งานด่วนของฉัน",
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      inputValidator: (value) => {
        if (!value || !value.trim()) return "กรุณาระบุชื่อมุมมอง";
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

  const showUpdateNotification = (title, message) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 z-[9999] 
      bg-gradient-to-r from-indigo-600 to-purple-600 
      text-white p-4 rounded-xl shadow-2xl 
      max-w-sm animate-slide-in-right
      border-l-4 border-emerald-400
    `;

    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="flex-1">
          <p class="font-bold text-sm">${title}</p>
          <p class="text-xs opacity-90 mt-1">${message}</p>
        </div>
        <button class="text-white/60 hover:text-white">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('animate-fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 5000);

    // Close button handler
    notification.querySelector('button').onclick = () => notification.remove();
  };

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
          <span>เลยกำหนด {slaInfo.hours.toFixed(1)} ชม.</span>
        </div>
      );
    }

    if (slaInfo.atRisk) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-md">
          <Timer size={10} />
          <span>เสี่ยงหลุดใน {slaInfo.hours.toFixed(1)} ชม.</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md">
        <Timer size={10} />
        <span>เหลือ {slaInfo.hours.toFixed(1)} ชม.</span>
      </div>
    );
  };

  const renderStatsCards = () => {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiMetrics.map((card) => {
          const isReverseTrend = card.key === "risk" || card.key === "overdue";
          const trendColor =
            card.trend.direction === "flat"
              ? "text-slate-500"
              : isReverseTrend
                ? (card.trend.direction === "up" ? "text-rose-600" : "text-emerald-600")
                : (card.trend.direction === "up" ? "text-emerald-600" : "text-rose-600");

          return (
            <div
              key={card.key}
              className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <p className={`mt-1 text-2xl font-black ${card.valueColor}`}>{card.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconWrap}`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">เทียบ 7 วันก่อน</p>
                <p className={`text-[11px] font-black ${trendColor}`}>
                  {card.trend.diff > 0 ? "+" : ""}
                  {card.trend.diff}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTicketItem = (ticket) => {
    const statusConfig = getStatusConfig(ticket.status);
    const priorityConfig = getPriorityConfig(ticket.priority);
    const StatusIcon = statusConfig.icon;
    const slaIndicator = renderSLAIndicator(ticket);
    const isActive = activeTicket?.id === ticket.id;

    return (
      <button
        key={ticket.id}
        type="button"
        onClick={() => setActiveTicketId(ticket.id)}
        role="option"
        aria-selected={isActive}
        className={`group w-full text-left rounded-2xl border bg-white/95 p-4 shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
          isActive
            ? "border-indigo-300 ring-2 ring-indigo-100 shadow-md"
            : "border-slate-100"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${statusConfig.bg}`}>
              <StatusIcon size={18} className={statusConfig.color} />
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${statusConfig.color.replace('text', 'bg')}`}></div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {ticket.ticket_no || `T${ticket.id?.slice(-6).toUpperCase()}`}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${priorityConfig.color} text-white`}>
                  {priorityConfig.label}
                </span>
                {slaIndicator}
              </div>

              <h4 className="font-bold text-slate-800 truncate">{ticket.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  {getCategoryIcon(ticket.category)}
                  {ticket.category}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{formatDate(ticket.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
              {statusConfig.label}
            </span>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors transform group-hover:translate-x-1" />
          </div>
        </div>
      </button>
    );
  };

  // ============================================
  // âœ… MAIN RENDER
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-10">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="mb-6 h-14 w-full rounded-2xl bg-white/80" />
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`sk-card-${index}`} className="h-28 rounded-2xl bg-white/80 shadow-sm" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="h-[480px] rounded-3xl bg-white/80 shadow-sm" />
            </div>
            <div className="lg:col-span-8 space-y-5">
              <div className="h-36 rounded-3xl bg-white/80 shadow-sm" />
              <div className="h-[360px] rounded-3xl bg-white/80 shadow-sm" />
            </div>
          </div>
          <p className="mt-6 text-center text-sm font-medium text-slate-500">กำลังเตรียมข้อมูล Dashboard...</p>
        </div>
      </div>
    );
  }

  const activeTimeline = buildTimelineEvents(activeTicket);
  const activeTicketStatus = activeTicket ? getStatusConfig(activeTicket.status) : null;
  const activeTicketPriority = activeTicket ? getPriorityConfig(activeTicket.priority) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-800 font-sans selection:bg-blue-100">
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-indigo-700 focus:shadow-lg"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      {/* Status Bar - Real-time Indicator */}
      <div className="border-b border-white/70 bg-white/50 py-2 px-4 backdrop-blur-xl" aria-live="polite">
        <div className="max-w-7xl mx-auto flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="font-semibold text-slate-700">ระบบพร้อมใช้งาน</span>
            <span className="hidden sm:inline text-slate-500">แหล่งข้อมูล: Supabase Realtime</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-2 py-1 text-[11px] font-bold text-slate-600">
              <Calendar size={12} />
              Sync: {lastUpdated ? formatDateTime(lastUpdated) : "กำลังโหลด..."}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-2 py-1 text-[11px] font-bold text-slate-600">
              <RefreshCw size={12} />
              {getTimeSinceUpdate()}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">
              <ShieldCheck size={12} />
              Role: {roleLabel}
            </span>
            {canOpenAuditView && (
              <button
                type="button"
                onClick={() => navigate("/audit-view")}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                <Shield size={12} />
                Audit Log
              </button>
            )}
            <button
              type="button"
              onClick={initDashboard}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <RefreshCw size={12} />
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-white/80 bg-white/65 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-1.5 shadow-sm">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 animate-float">
                <Wrench size={20} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                IT SERVICE PLATFORM
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Enterprise Service Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                <Hash size={12} />
                ID: {profile?.employee_code || "ไม่ระบุ"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">
                <Building2 size={12} />
                {profile?.department || "ไม่ระบุแผนก"}
              </span>
            </div>
            <button
              onClick={() => navigate("/create-ticket")}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-white font-bold transition-all transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0"
            >
              <Plus size={18} />
              <span>แจ้งซ่อมใหม่</span>
            </button>
            <button
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-rose-600 transition-all hover:bg-rose-50"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="dashboard-main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 lg:pt-12 pb-24">
        {/* Header Section */}
        <header className="mb-12">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">
                Dashboard งานแจ้งซ่อมของคุณ
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                ติดตามสถานะ Ticket, SLA และมุมมองที่บันทึกไว้ได้ในหน้าเดียว
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-600">
              <Briefcase size={13} />
              {profile?.position || "พนักงาน"}
            </span>
          </div>

          {/* Stats Overview */}
          {renderStatsCards()}
        </header>

        {dashboardError && (
          <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 md:flex-row md:items-center md:justify-between" role="alert">
            <div>
              <p className="text-sm font-black text-rose-700">มีปัญหาในการโหลดข้อมูลบางส่วน</p>
              <p className="text-xs font-medium text-rose-600">{dashboardError}</p>
            </div>
            <button
              onClick={initDashboard}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
            >
              <RefreshCw size={14} />
              ลองโหลดอีกครั้ง
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Profile Section */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 overflow-hidden rounded-3xl border border-white/80 bg-white/75 shadow-lg shadow-slate-200/60 backdrop-blur-md group transition-all duration-500 hover:shadow-2xl">
              <div className="h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20"></div>
                <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-4 right-6 text-white/10 font-black text-4xl">PRO</div>
              </div>

              <div className="px-7 pb-9">
                <div className="relative -mt-16 mb-7 flex justify-center">
                  <div
                    className="w-32 h-32 rounded-3xl bg-white p-1.5 shadow-2xl cursor-pointer relative group/profile overflow-hidden"
                    onClick={() => profile?.id_card_url && setIsModalOpen(true)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10"></div>
                    {profile?.id_card_url ? (
                      <>
                        <img
                          src={profile.id_card_url}
                          className="w-full h-full object-cover rounded-2xl transform group-hover/profile:scale-105 transition-transform duration-500"
                          alt="Profile"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/profile:opacity-100 bg-black/40 transition-all duration-300 rounded-2xl">
                          <ExternalLink size={20} className="text-white transform group-hover/profile:scale-110 transition-transform" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center text-slate-300">
                        <User size={48} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-7 text-center">
                  <h2 className="text-xl font-black text-slate-800">{profile?.full_name || "ไม่พบชื่อ"}</h2>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">
                    {profile?.position || "พนักงาน"}
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition-all group/item hover:bg-white">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Building2 size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">แผนก</p>
                      <p className="text-sm font-bold text-slate-700">{profile?.department || "ไม่ระบุ"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition-all group/item hover:bg-white">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                      <Briefcase size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">ตำแหน่ง</p>
                      <p className="text-sm font-bold text-slate-700">{profile?.position || "พนักงาน"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-10">
            {/* Quick Actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Quick Actions</h3>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-1 uppercase tracking-wider">
                  role: {profile?.role || "user"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const accentClassMap = {
                    indigo: {
                      hoverBorder: "hover:border-indigo-500",
                      hoverShadow: "hover:shadow-indigo-600/10",
                      text: "text-indigo-600",
                      gradient: "from-indigo-50 to-indigo-100",
                      hoverBg: "group-hover:bg-indigo-600",
                    },
                    emerald: {
                      hoverBorder: "hover:border-emerald-600",
                      hoverShadow: "hover:shadow-emerald-600/10",
                      text: "text-emerald-600",
                      gradient: "from-emerald-50 to-emerald-100",
                      hoverBg: "group-hover:bg-emerald-600",
                    },
                    sky: {
                      hoverBorder: "hover:border-sky-500",
                      hoverShadow: "hover:shadow-sky-600/10",
                      text: "text-sky-600",
                      gradient: "from-sky-50 to-sky-100",
                      hoverBg: "group-hover:bg-sky-600",
                    },
                    violet: {
                      hoverBorder: "hover:border-violet-600",
                      hoverShadow: "hover:shadow-violet-600/10",
                      text: "text-violet-600",
                      gradient: "from-violet-50 to-violet-100",
                      hoverBg: "group-hover:bg-violet-600",
                    },
                    slate: {
                      hoverBorder: "hover:border-slate-500",
                      hoverShadow: "hover:shadow-slate-600/10",
                      text: "text-slate-600",
                      gradient: "from-slate-50 to-slate-100",
                      hoverBg: "group-hover:bg-slate-600",
                    },
                  };

                  const accent = accentClassMap[action.accent] || accentClassMap.indigo;

                  return (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      className={`group rounded-3xl border border-white/80 bg-white/80 p-7 text-left shadow-sm backdrop-blur-sm transition-all duration-500 transform hover:-translate-y-1 hover:shadow-2xl ${accent.hoverBorder} ${accent.hoverShadow}`}
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${accent.gradient} ${accent.text} rounded-2xl flex items-center justify-center mb-4 group-hover:text-white transition-all duration-300 ${accent.hoverBg}`}>
                        <Icon size={24} />
                      </div>
                      <h4 className="text-lg font-black text-slate-800">{action.label}</h4>
                      <p className="text-sm text-slate-500 mt-2 leading-relaxed">{action.description}</p>
                      <div className={`mt-4 flex items-center gap-1 text-xs font-bold ${accent.text} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                        <span>{action.cta}</span>
                        <ChevronRight size={12} className="transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Inbox */}
            {canSeePriorityInbox && (
            <section className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Priority Inbox</h3>
                  <p className="mt-1 text-xs text-slate-500">งานที่ควรจัดการก่อน เรียงตามความเสี่ยง SLA และความเร่งด่วน</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyRoleView(roleViews[0])}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700"
                  >
                    เปิดมุมมองมาตรฐาน
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
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
                  >
                    ดูงานหลุด SLA
                  </button>
                </div>
              </div>

              {priorityInbox.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {priorityInbox.map((ticket) => {
                    const status = getStatusConfig(ticket.status);
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
                        className="group rounded-2xl border border-slate-100 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                            {ticket.ticket_no || `T${ticket.id?.slice(-6).toUpperCase()}`}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${status.bg} ${status.color} ${status.border}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="truncate text-sm font-black text-slate-800">{ticket.title || "ไม่มีหัวข้อ"}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <span className={`rounded-md px-2 py-0.5 text-white ${priority.color}`}>{priority.label}</span>
                          {renderSLAIndicator(ticket)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                  <p className="text-sm font-bold text-slate-600">ไม่มีงานค้างใน Priority Inbox</p>
                  <p className="mt-1 text-xs text-slate-500">ตอนนี้คิวงานอยู่ในเกณฑ์ปกติ</p>
                </div>
              )}
            </section>
            )}

            {/* Recent Activity */}
            <section className="rounded-3xl border border-white/80 bg-white/80 p-7 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md">
              <div className="mb-7">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">กิจกรรมล่าสุด</h3>
                      <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></div>
                    </div>
                    <p className="text-xs text-slate-500">
                      แสดง {visibleTickets.length} จาก {filteredTickets.length} รายการที่ผ่านตัวกรอง
                    </p>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500">
                    คีย์ลัด: <span className="font-black text-slate-700">/</span> ค้นหา, <span className="font-black text-slate-700">n</span> สร้าง Ticket
                  </p>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <SlidersHorizontal size={15} className="text-indigo-600" />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Smart Filter Bar</p>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  {roleViews.map((view) => (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => applyRoleView(view)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 ${
                        activeRoleViewId === view.id
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700 focus-visible:ring-indigo-300"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:ring-indigo-300"
                      }`}
                      title={view.description}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                  <div className="relative lg:col-span-4">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาเลขที่งาน / หัวข้อ / รายละเอียด..."
                      aria-label="ค้นหา Ticket"
                      className={SEARCH_CONTROL_CLASS}
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <select
                      value={activeFilter}
                      onChange={(e) => setActiveFilter(e.target.value)}
                      aria-label="กรองตามสถานะ"
                      className={FORM_CONTROL_CLASS}
                    >
                      {FILTER_OPTIONS.map((filter) => (
                        <option key={filter.id} value={filter.id}>{filter.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      aria-label="กรองตามความเร่งด่วน"
                      className={FORM_CONTROL_CLASS}
                    >
                      {PRIORITY_FILTER_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      aria-label="กรองตามหมวดหมู่"
                      className={FORM_CONTROL_CLASS}
                    >
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category === "ALL" ? "ทุกหมวดหมู่" : category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <select
                      value={slaFilter}
                      onChange={(e) => setSlaFilter(e.target.value)}
                      aria-label="กรองตาม SLA"
                      className={FORM_CONTROL_CLASS}
                    >
                      {SLA_FILTER_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedPresetId}
                      onChange={(e) => setSelectedPresetId(e.target.value)}
                      aria-label="เลือกมุมมองที่บันทึกไว้"
                      className={`min-w-[220px] ${FORM_CONTROL_CLASS}`}
                    >
                      <option value="">เลือกมุมมองที่บันทึกไว้</option>
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
                      ใช้มุมมอง
                    </button>
                    <button
                      type="button"
                      onClick={deleteSelectedPreset}
                      disabled={!selectedPresetId}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:opacity-40"
                      aria-label="ลบมุมมองที่เลือก"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveCurrentPreset}
                      className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
                    >
                      <BookmarkPlus size={14} />
                      บันทึกมุมมอง
                    </button>
                    {hasActiveSmartFilters && (
                      <button
                        type="button"
                      onClick={clearSmartFilters}
                        className={SECONDARY_BUTTON_CLASS}
                      >
                        ล้างตัวกรอง
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {filteredTickets.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="space-y-3" role="listbox" aria-label="รายการ Ticket ล่าสุด">
                    {visibleTickets.map(renderTicketItem)}

                    <button
                      type="button"
                      onClick={handleViewAllClick}
                      className="group/view-all mt-4 w-full rounded-xl border border-dashed border-indigo-200 py-3 text-center text-sm font-bold text-indigo-600 transition-all duration-300 hover:border-indigo-400 hover:bg-indigo-50"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>ดูประวัติทั้งหมด ({tickets.length} รายการ)</span>
                        <ChevronRight size={14} className="transform transition-transform group-hover/view-all:translate-x-1" />
                      </div>
                    </button>
                  </div>

                  <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:sticky lg:top-28">
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
                          <h4 className="text-base font-black text-slate-800">{activeTicket.title || "ไม่มีหัวข้อ"}</h4>
                          <p className="mt-1 text-xs text-slate-500">{activeTicket.category || "ไม่ระบุหมวดหมู่"} • {formatDate(activeTicket.created_at)}</p>
                          <p className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600">
                            {activeTicket.description || "ไม่มีรายละเอียด"}
                          </p>
                        </div>

                        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Activity Timeline</p>
                          <div className="space-y-3">
                            {activeTimeline.map((event, index) => (
                              <div key={event.id} className="relative pl-5">
                                {index < activeTimeline.length - 1 && (
                                  <span className="absolute left-[6px] top-4 h-8 w-px bg-slate-200"></span>
                                )}
                                <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-indigo-500"></span>
                                <p className="text-xs font-bold text-slate-700">{event.label}</p>
                                <p className="text-[11px] text-slate-500">{event.detail}</p>
                                <p className="text-[10px] font-semibold text-slate-400">{formatDateTime(event.date)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedTicket(activeTicket)}
                          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25"
                        >
                          เปิดรายละเอียดเต็ม
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
                        <p className="text-sm font-bold text-slate-600">ยังไม่มีรายการที่เลือก</p>
                        <p className="mt-1 text-xs text-slate-500">เลือก Ticket จากรายการด้านซ้ายเพื่อดูรายละเอียด</p>
                      </div>
                    )}
                  </aside>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-50 to-slate-100">
                    <AlertCircle size={24} className="text-slate-300" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-slate-700">ไม่พบรายการแจ้งซ่อม</h3>
                  <p className="mx-auto mb-6 max-w-md text-sm text-slate-500">
                    {hasActiveSmartFilters
                      ? "ไม่พบรายการที่ตรงกับ Smart Filter ปัจจุบัน"
                      : "เริ่มต้นใช้งานระบบโดยการแจ้งซ่อมครั้งแรกของคุณ"}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {hasActiveSmartFilters && (
                      <button
                        type="button"
                        onClick={clearSmartFilters}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600"
                      >
                        ล้างตัวกรอง
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate("/create-ticket")}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25"
                    >
                      <Plus size={16} />
                      สร้างใบแจ้งซ่อมแรก
                    </button>
                  </div>
                </div>
              )}
            </section>
            {/* Support Section */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-r from-slate-900 to-slate-800 p-7 md:p-9 text-white shadow-xl group hover:shadow-2xl transition-shadow duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10"></div>
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={20} className="text-indigo-400" />
                      <h3 className="text-xl md:text-2xl font-black">บริการช่วยเหลือด่วน</h3>
                    </div>
                    <p className="text-slate-400 text-sm">
                      ทีมเทคนิคพร้อมให้บริการตลอด 24 ชั่วโมงตาม SLA ที่กำหนด
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm">
                    <button className="group/chat flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-3 font-bold transition-all transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-900/50">
                      <MessageCircle size={18} />
                      <span>แชทกับ Support</span>
                      <ChevronRight size={14} className="transform group-hover/chat:translate-x-1 transition-transform" />
                    </button>
                    <button className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-bold transition-all hover:bg-white/20">
                      <Phone size={18} />
                      โทรด่วน
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Phone, label: 'เบอร์ด่วน', value: '02-XXX-XXXX ต่อ 199' },
                    { icon: Mail, label: 'อีเมล', value: 'helpdesk@company.co.th' },
                    { icon: MessageCircle, label: 'ไลน์ OA', value: '@IT_Support_Official' },
                    { icon: Timer, label: 'SLA Response', value: 'ภายใน 15 นาที' }
                  ].map((item, index) => (
                    <div key={index} className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon size={14} className="text-indigo-400" />
                        <p className="text-xs font-bold text-slate-300">{item.label}</p>
                      </div>
                      <p className="text-sm font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================
         MODALS & DIALOGS
      ============================================ */}

      {/* Profile Image Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold hover:text-slate-200 transition-colors group/close"
              onClick={() => setIsModalOpen(false)}
            >
              <span>ปิด</span>
              <X size={20} className="transform group-hover/close:rotate-90 transition-transform" />
            </button>
            {profile?.id_card_url ? (
              <img
                src={profile.id_card_url}
                className="w-full h-auto rounded-3xl shadow-2xl border-4 border-white/20"
                alt="Profile"
              />
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center">
                <User size={64} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">ไม่มีรูปภาพโปรไฟล์</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">ยืนยันการออกจากระบบ?</h3>
              <p className="text-slate-500 text-sm font-medium">
                การออกจากระบบจะยกเลิกการเชื่อมต่อแบบเรียลไทม์ทั้งหมด
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-200 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleLogout}
                className="py-3 rounded-xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:shadow-lg hover:shadow-rose-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onNewTicket={() => navigate("/create-ticket")}
          getStatusConfig={getStatusConfig}
          getPriorityConfig={getPriorityConfig}
          formatDate={formatDate}
        />
      )}

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fade-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .animate-fade-out {
          animation: fade-out 0.3s ease-out;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

// ============================================
// SUBCOMPONENT: Ticket Detail Modal
// ============================================

const TicketDetailModal = ({ ticket, onClose, onNewTicket, getStatusConfig, getPriorityConfig, formatDate }) => {
  const statusConfig = getStatusConfig(ticket.status);
  const priorityConfig = getPriorityConfig(ticket.priority);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
                  {ticket.ticket_no || `T${ticket.id?.slice(-6).toUpperCase() || '000000'}`}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
                  {statusConfig.label}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${priorityConfig.color}`}>
                  {priorityConfig.label}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-800">{ticket.title || "ไม่มีหัวข้อ"}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors transform hover:rotate-90 duration-300"
            >
              <X size={24} className="text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={14} />
                รายละเอียดปัญหา
              </h3>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-slate-700 whitespace-pre-line">{ticket.description || "ไม่มีรายละเอียด"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">ข้อมูลงาน</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">หมวดหมู่</span>
                    <span className="font-bold text-slate-800">{ticket.category || "ไม่ระบุ"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">วันที่แจ้ง</span>
                    <span className="font-bold text-slate-800">{formatDate(ticket.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">สถานที่</span>
                    <span className="font-bold text-slate-800">{ticket.location || "ไม่ระบุ"}</span>
                  </div>
                </div>
              </div>

              {ticket.assigned_name && (
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">ช่างผู้ดูแล</h3>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {ticket.assigned_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{ticket.assigned_name}</p>
                      <p className="text-xs text-slate-500">ช่างเทคนิค</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {ticket.solution_note && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-2xl border border-emerald-100">
                <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  สรุปการซ่อม
                </h3>
                <p className="text-emerald-800">{ticket.solution_note}</p>
              </div>
            )}

            {ticket.image_url && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">รูปภาพประกอบ</h3>
                <img
                  src={ticket.image_url}
                  alt="Ticket attachment"
                  className="w-full h-48 object-cover rounded-2xl shadow-inner"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={onClose}
                className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-200"
              >
                ปิด
              </button>
              <button
                onClick={onNewTicket}
                className="py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                สร้างใบแจ้งซ่อมใหม่
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for FileText icon
const FileText = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

