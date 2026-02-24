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
  Globe, Database, HardDrive, Smartphone, Wifi, ShieldCheck
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
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [realtimeChannel, setRealtimeChannel] = useState(null);
  const [slaStats, setSlaStats] = useState({ onTime: 0, total: 0, percentage: 100 });
  const channelRef = useRef(null);

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

      if (profileRes.data) setProfile(profileRes.data);

      // Fetch tickets
      const ticketsRes = await supabase
        .from("tickets")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

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
      Swal.fire({
        icon: 'error',
        title: 'ระบบขัดข้อง',
        text: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่ในภายหลัง',
        confirmButtonColor: '#4f46e5',
        backdrop: 'rgba(0,0,0,0.7)'
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, setupRealtimeSubscription]);

  useEffect(() => {
    initDashboard();
  }, [initDashboard]);

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

  // Filter tickets based on active filter
  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    if (activeFilter === "CLOSED") {
      filtered = filtered.filter(t => t.status === "CLOSED");
    } else if (activeFilter === "PENDING") {
      filtered = filtered.filter(t => t.status !== "CLOSED");
    }

    return filtered.slice(0, 5);
  }, [tickets, activeFilter]);

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

    if (remainingHours <= 0) return { overdue: true, hours: Math.abs(remainingHours).toFixed(1) };
    return { overdue: false, hours: remainingHours.toFixed(1) };
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
          <span>เลยกำหนด {slaInfo.hours} ชม.</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md">
        <Timer size={10} />
        <span>เหลือ {slaInfo.hours} ชม.</span>
      </div>
    );
  };

  const renderStatsCards = () => {
    const pendingCount = tickets.filter((t) => t.status !== "CLOSED").length;
    const closedCount = tickets.filter((t) => t.status === "CLOSED").length;
    const maxCount = Math.max(tickets.length, pendingCount, closedCount, 1);

    const cards = [
      {
        label: "ทั้งหมด",
        value: tickets.length,
        icon: BarChart3,
        iconWrap: "bg-indigo-50",
        iconColor: "text-indigo-600",
        valueColor: "text-slate-800",
        barColor: "bg-indigo-500",
        barWidth: `${Math.max((tickets.length / maxCount) * 100, 8)}%`,
      },
      {
        label: "รอดำเนินการ",
        value: pendingCount,
        icon: Clock,
        iconWrap: "bg-amber-50",
        iconColor: "text-amber-600",
        valueColor: "text-amber-600",
        barColor: "bg-amber-500",
        barWidth: `${Math.max((pendingCount / maxCount) * 100, 8)}%`,
      },
      {
        label: "สำเร็จ",
        value: closedCount,
        icon: CheckCircle2,
        iconWrap: "bg-emerald-50",
        iconColor: "text-emerald-600",
        valueColor: "text-emerald-600",
        barColor: "bg-emerald-500",
        barWidth: `${Math.max((closedCount / maxCount) * 100, 8)}%`,
      },
      {
        label: "SLA Compliance",
        value: `${slaStats.percentage}%`,
        icon: ShieldCheck,
        iconWrap: "bg-blue-50",
        iconColor: "text-blue-600",
        valueColor: "text-blue-600",
        barColor: "bg-blue-500",
        barWidth: `${Math.max(slaStats.percentage, 8)}%`,
      },
    ];

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
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
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
              <div className={`h-1.5 rounded-full ${card.barColor}`} style={{ width: card.barWidth }} />
            </div>
            {card.label === "SLA Compliance" && (
              <p className="mt-2 text-[10px] text-slate-500">
                {slaStats.onTime}/{slaStats.total} งานเสร็จตรงเวลา
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTicketItem = (ticket) => {
    const statusConfig = getStatusConfig(ticket.status);
    const priorityConfig = getPriorityConfig(ticket.priority);
    const StatusIcon = statusConfig.icon;
    const slaIndicator = renderSLAIndicator(ticket);

    return (
      <div
        key={ticket.id}
        onClick={() => setSelectedTicket(ticket)}
        className="group cursor-pointer rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg"
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
      </div>
    );
  };

  // ============================================
  // âœ… MAIN RENDER
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-200 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Wrench className="w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-slate-600 font-medium animate-pulse">กำลังเตรียมระบบให้คุณ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-800 font-sans selection:bg-blue-100">
      {/* Status Bar - Real-time Indicator */}
      <div className="border-b border-white/70 bg-white/50 py-2 px-4 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-slate-600">ระบบเชื่อมต่อเรียบร้อย</span>
          </div>
          <div className="text-slate-500">
            <span className="hidden sm:inline">อัปเดตล่าสุด: </span>
            <span className="font-medium">{getTimeSinceUpdate()}</span>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 lg:pt-12 pb-24">
        {/* Header Section */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight animate-fade-in">
                สวัสดี, คุณ{profile?.full_name?.split(" ")[0] || 'ผู้ใช้งาน'} 👋
              </h2>
              <p className="text-slate-500 mt-1 font-medium">
                ยินดีต้อนรับสู่ระบบบริการไอทีระดับองค์กร
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1 text-slate-500">
                  <Hash size={14} />
                  ID: {profile?.employee_code || "ไม่ระบุ"}
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Building2 size={14} />
                  {profile?.department || "ไม่ระบุแผนก"}
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Briefcase size={14} />
                  {profile?.position || "พนักงาน"}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate("/create-ticket")}
              className="flex sm:hidden items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={18} />
              <span>แจ้งซ่อมใหม่</span>
            </button>
          </div>

          {/* Stats Overview */}
          {renderStatsCards()}
        </header>

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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <button
                onClick={() => navigate("/create-ticket")}
                className="group rounded-3xl border border-white/80 bg-white/80 p-7 text-left shadow-sm backdrop-blur-sm transition-all duration-500 transform hover:-translate-y-1 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-600/10"
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Wrench size={24} />
                  </div>
                  <div className="absolute top-0 right-0 w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-ping opacity-75"></div>
                </div>
                <h4 className="text-lg font-black text-slate-800">แจ้งซ่อม IT</h4>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  รายงานปัญหาอุปกรณ์หรือระบบไอที รับการแก้ไขภายใน SLA ที่กำหนด
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>ดำเนินการทันที</span>
                  <ChevronRight size={12} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => navigate("/pick-up-equipment")}
                className="group rounded-3xl border border-white/80 bg-white/80 p-7 text-left shadow-sm backdrop-blur-sm transition-all duration-500 transform hover:-translate-y-1 hover:border-emerald-600 hover:shadow-2xl hover:shadow-emerald-600/10"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                  <Package size={24} />
                </div>
                <h4 className="text-lg font-black text-slate-800">เบิกอุปกรณ์</h4>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  ขออุปกรณ์ใหม่หรือวัสดุสิ้นเปลืองผ่านระบบอนุมัติอัตโนมัติ
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>ตรวจสอบสต็อก</span>
                  <ChevronRight size={12} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            {/* Recent Activity */}
            <section className="rounded-3xl border border-white/80 bg-white/80 p-7 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md">
              <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">กิจกรรมล่าสุด</h3>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-xs text-slate-500">
                    แสดง {filteredTickets.length} จาก {tickets.length} รายการ
                    {activeFilter !== "ALL" && ` (${activeFilter === "PENDING" ? "รอดำเนินการ" : "สำเร็จ"})`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                    {FILTER_OPTIONS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all duration-200 ${activeFilter === filter.id
                          ? "bg-white text-indigo-600 shadow-sm shadow-indigo-100"
                          : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                          }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredTickets.length > 0 ? (
                <div className="space-y-3">
                  {filteredTickets.map(renderTicketItem)}

                  {/* View All Button */}
                  <button
                    onClick={handleViewAllClick}
                    className="w-full py-3 text-center text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-300 border border-dashed border-indigo-200 mt-4 hover:border-indigo-400 group/view-all"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>ดูประวัติทั้งหมด ({tickets.length} รายการ)</span>
                      <ChevronRight size={14} className="transform group-hover/view-all:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={24} className="text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-2">ไม่พบรายการแจ้งซ่อม</h3>
                  <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                    {activeFilter !== "ALL"
                      ? `ไม่มีรายการที่อยู่ในสถานะ "${FILTER_OPTIONS.find(f => f.id === activeFilter)?.label}"`
                      : "เริ่มต้นใช้งานระบบโดยการแจ้งซ่อมครั้งแรกของคุณ"}
                  </p>
                  <button
                    onClick={() => navigate("/create-ticket")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-lg hover:shadow-lg hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5"
                  >
                    <Plus size={16} />
                    สร้างใบแจ้งซ่อมแรก
                  </button>
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

