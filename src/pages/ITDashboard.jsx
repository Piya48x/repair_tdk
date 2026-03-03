import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  MapPin,
  Navigation,
  Clock,
  Camera,
  CheckCircle,
  XCircle,
  LogOut,
  ChevronRight,
  User,
  Calendar,
  Wrench,
  Shield,
  Power,
  Search,
  Filter,
  Plus,
  Home,
  List,
  History,
  Phone,
  Mail,
  Building,
  Map,
  ExternalLink,
  Download,
  Printer,
  Share2,
  Eye,
  Edit,
  ChevronLeft,
  ChevronDown,
  Check,
  X,
  Star,
  Globe, // เพิ่มตัวนี้ (สำหรับ Network)
  Lock, // เพิ่มตัวนี้ (สำหรับ System)
  Award,
  TrendingUp,
  BarChart3,
  Smartphone,
  Laptop,
  Server,
  Wifi,
  FileText,
  Image as ImageIcon,
  UserCheck,
  Trash2,
  Calendar as CalendarIcon,
  Users,
  Activity,
  Zap,
  AlertCircle,
  MessageSquare,
  DownloadCloud,
  UploadCloud,
  Settings,
  Menu,
  X as XIcon,
  ChevronUp,
  Map as MapIcon,
  Briefcase,
  Monitor,
  HardDrive,
  Router,
  Database,
  Cloud,
  Cpu,
  Battery,
  Volume2,
  Printer as PrinterIcon,
  Keyboard,
  Mouse,
  Headphones,
  Wifi as WifiIcon,
  Shield as ShieldIcon,
  Sun,
  Moon,
  RefreshCw,
  ShieldCheck,
  LayoutGrid,
  FileSpreadsheet,
  CheckSquare,
  Square,
} from "lucide-react";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import ITDashboardGlobalStyles from "./it-dashboard/components/ITDashboardGlobalStyles";

// New Refactored Components
import ITDashboardHeader from "./it-dashboard/components/ITDashboardHeader";
import ITDashboardSidebar from "./it-dashboard/components/ITDashboardSidebar";
import ITDashboardPageRenderer from "./it-dashboard/pages/ITDashboardPageRenderer";
import { DASHBOARD_PAGE_IDS, TAB_TO_PAGE } from "./it-dashboard/constants/dashboardPages";
import { getITDashboardTheme } from "./it-dashboard/theme/itDashboardTheme";

// Utilities
import {
  getStatusColor,
  getStatusText,
  getPriorityColor,
  getPriorityText,
  calculateDuration,
} from "./it-dashboard/utils/ticketUtils";

const ITDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(DASHBOARD_PAGE_IDS.DASHBOARD);
  const [activeTab, setActiveTab] = useState("INCOMING");
  const [isOnline, setIsOnline] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  // ใช้แค่อันนี้พอ
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const [quickFilter, setQuickFilter] = useState("ALL");
  const [filterState, setFilterState] = useState({
    status: "ALL",
    priority: "ALL",
    department: "ALL",
    assigned: "ALL",
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [theme, setTheme] = useState("dark");
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState("card");
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // 2. ฟังก์ชัน Export ข้อมูลเป็น CSV (เปิดใน Excel ได้)

  const [stats, setStats] = useState({
    todayCompleted: 0,
    weeklyAvg: 0,
    responseTime: 0,
    satisfaction: 0,
    urgentCount: 0,
    inProgressCount: 0,
  });
  const uiTheme = getITDashboardTheme(theme);
  const showCalendar =
    currentPage === DASHBOARD_PAGE_IDS.CALENDAR || currentPage === DASHBOARD_PAGE_IDS.REPORTS;
  const showReports = currentPage === DASHBOARD_PAGE_IDS.REPORTS;

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(TAB_TO_PAGE[tabId] || DASHBOARD_PAGE_IDS.TICKETS);
  };

  const handleNavigatePage = (pageId) => {
    setCurrentPage(pageId);
    if (pageId === DASHBOARD_PAGE_IDS.DASHBOARD || pageId === DASHBOARD_PAGE_IDS.TICKETS) {
      setActiveTab("INCOMING");
      return;
    }
    if (pageId === DASHBOARD_PAGE_IDS.ACTIVE) {
      setActiveTab("ACTIVE");
      return;
    }
    if (pageId === DASHBOARD_PAGE_IDS.HISTORY) {
      setActiveTab("HISTORY");
    }
  };


  const audioRef = useRef(
    new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
    ),
  );
  const notificationSoundRef = useRef(
    new Audio(
      "https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3",
    ),
  );

  // เพิ่มฟังก์ชันเหล่านี้หลัง state declarations
  const handleSelectTicket = (ticketId) => {
    setSelectedTickets((prev) => {
      if (prev.includes(ticketId)) {
        return prev.filter((id) => id !== ticketId);
      } else {
        return [...prev, ticketId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(filteredTickets.map((t) => t.id));
    }
    setSelectAll(!selectAll);
  };

  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load dashboard theme and keep dark mode scoped to this page only.
  useEffect(() => {
    const savedTheme = localStorage.getItem("it-dashboard-theme") || "dark";
    setTheme(savedTheme);
    // Keep dark mode scoped to this page container to avoid cross-page style leakage.
    document.documentElement.classList.remove("dark");
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("it-dashboard-theme", newTheme);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const state = location.state;
    if (!state?.fromServiceDashboard) return;

    if (state.targetTab) {
      setActiveTab(state.targetTab);
      setCurrentPage(TAB_TO_PAGE[state.targetTab] || DASHBOARD_PAGE_IDS.TICKETS);
    }
    if (state.searchQuery !== undefined) setSearchQuery(String(state.searchQuery || ""));
    if (state.quickFilter) setQuickFilter(state.quickFilter);
    if (state.sortBy) setSortBy(state.sortBy);

    if (state.status || state.priority || state.department || state.assigned) {
      setFilterState((prev) => ({
        ...prev,
        status: state.status || prev.status,
        priority: state.priority || prev.priority,
        department: state.department || prev.department,
        assigned: state.assigned || prev.assigned,
      }));
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  useEffect(() => {
    let isMounted = true;
    const loadUserAndProfile = async () => {
      // 1. Get current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // No need to navigate here, ProtectedRoute handles it
        return;
      }

      const user = session.user;

      // 2. Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      const email = user.email;
      const username = email.split("@")[0];
      const derivedEmpId = username.replace(/\D/g, "") || "EMP-0000";

      setCurrentUser({
        id: user.id,
        name:
          profileData?.full_name ||
          user.user_metadata?.full_name ||
          username.toUpperCase(),
        email: user.email,
        employeeId:
          profileData?.employee_code ||
          user.user_metadata?.employee_code ||
          user.user_metadata?.employee_id ||
          derivedEmpId,
        department:
          profileData?.department ||
          user.user_metadata?.department ||
          "ไม่ระบุแผนก",
        position:
          profileData?.position ||
          user.user_metadata?.position ||
          "IT Technician",

        avatar:
          profileData?.avatar_url ||
          profileData?.id_card_url ||
          user.user_metadata?.avatar_url ||
          user.user_metadata?.id_card_url ||
          user.user_metadata?.picture,

        phone: profileData?.phone || user.user_metadata?.phone,
        created_at: profileData?.created_at || user.created_at,
      });
    };

    loadUserAndProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // FIX: Recalculate stats when currentUser is loaded to prevent race condition
  useEffect(() => {
    if (currentUser && tickets.length > 0) {
      calculateStats(tickets);
    }
  }, [currentUser]);

  // Fetch tickets with real-time updates
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (isMounted) {
        await fetchTickets();
      }
    };

    fetchData();

    // Real-time subscription
    const channel = supabase
      .channel("it_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        async (payload) => {
          if (isMounted) {
            if (payload.eventType === "INSERT") {
              try {
                await audioRef.current.play();
              } catch (e) {
                console.log("Audio play failed", e);
              }

              showNewTicketNotification(payload.new);
              setNotificationCount((prev) => prev + 1);
            }
            await fetchTickets();
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Show new ticket notification with animation
  // แก้ไข function showNewTicketNotification
  const showNewTicketNotification = (ticket) => {
    const notification = document.createElement("div");
    notification.className =
      "fixed top-4 right-4 z-[1000] animate-slide-in-right";
    notification.innerHTML = `
      <div class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-xl shadow-2xl max-w-sm border border-blue-300">
        <div class="flex items-start gap-3">
          <div class="animate-pulse">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-lg">มีงานซ่อมใหม่!</h4>
              <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" class="text-white/80 hover:text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <p class="text-sm mt-1 opacity-90">${ticket.title || "งานซ่อมใหม่เข้ามา"}</p>
            <div class="flex items-center gap-2 mt-2 text-xs opacity-80">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              <span>${ticket.reporter_name || "ผู้ใช้"}</span>
              <span class="mx-1">•</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span>${ticket.location || "สถานที่"}</span>
            </div>
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-white/20">
              <span class="text-xs">${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
              <!-- เปลี่ยนปุ่มให้เรียก handleViewDetails โดยตรง -->
              <button class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors" id="view-ticket-btn-${ticket.id}">
                ดูรายละเอียด
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // เพิ่ม Event Listener ให้กับปุ่ม "ดูรายละเอียด"
    const viewButton = document.getElementById(`view-ticket-btn-${ticket.id}`);
    if (viewButton) {
      viewButton.addEventListener("click", () => {
        // เรียก handleViewDetails เพื่อแสดงรายละเอียดทันที
        handleViewDetails(ticket);
        notification.remove();
      });
    }

    // ตั้งค่า global function สำหรับปุ่มปิด (ถ้ายังต้องการ)
    window.viewNewTicket = (ticketId) => {
      const ticketToView = tickets.find((t) => t.id === ticketId);
      if (ticketToView) {
        handleViewDetails(ticketToView);
      }
      notification.remove();
    };

    setTimeout(() => {
      if (notification.parentElement) {
        notification.classList.add("animate-slide-out-right");
        setTimeout(() => notification.remove(), 300);
      }
    }, 8000);
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTickets(data || []);
      calculateStats(data || []);
      setLastRefreshedAt(new Date());

      const newTickets = data?.filter((t) => t.status === "NEW") || [];
      setNotificationCount(newTickets.length);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถโหลดข้อมูลได้",
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        confirmButtonColor: "#3b82f6",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeSinceRefresh = () => {
    if (!lastRefreshedAt) return "กำลังซิงก์ข้อมูล";
    const seconds = Math.max(
      1,
      Math.floor((Date.now() - lastRefreshedAt.getTime()) / 1000),
    );
    if (seconds < 60) return `${seconds} วินาทีที่แล้ว`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ชั่วโมงที่แล้ว`;
  };

  const calculateStats = (ticketsData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCompleted = ticketsData.filter((t) => {
      if (t.status === "CLOSED" && t.closed_at) {
        const closedDate = new Date(t.closed_at);
        closedDate.setHours(0, 0, 0, 0);
        return closedDate.getTime() === today.getTime();
      }
      return false;
    }).length;

    const completedTickets = ticketsData.filter(
      (t) => t.status === "CLOSED" && t.started_at && t.closed_at,
    );
    let totalResponseTime = 0;
    completedTickets.forEach((ticket) => {
      const start = new Date(ticket.started_at);
      const end = new Date(ticket.closed_at);
      totalResponseTime += (end - start) / (1000 * 60);
    });
    const avgResponseTime =
      completedTickets.length > 0
        ? Math.round(totalResponseTime / completedTickets.length)
        : 0;

    const urgentCount = ticketsData.filter(
      (t) => t.priority === "urgent" && t.status === "NEW",
    ).length;

    const inProgressCount = ticketsData.filter(
      (t) => t.status === "IN_PROGRESS" && t.assigned_to === currentUser?.id,
    ).length;

    setStats({
      todayCompleted,
      weeklyAvg: Math.round(ticketsData.length / 7),
      responseTime: avgResponseTime,
      satisfaction: 95,
      urgentCount,
      inProgressCount,
    });
  };

  // Handle logout
  const handleLogout = async () => {
    const { value: confirm } = await Swal.fire({
      title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">ออกจากระบบ</span>`,
      html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">คุณต้องการออกจากระบบหรือไม่?</span>`,
      icon: "question",
      background: theme === "dark" ? "#1f2937" : "#ffffff",
      color: theme === "dark" ? "#fff" : "#1f2937",
      showCancelButton: true,
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      customClass: {
        popup: `rounded-2xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`,
      },
    });

    if (confirm) {
      try {
        await supabase.auth.signOut();
        navigate("/login");
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  };

  // Accept job
  const handleAcceptJob = async (id) => {
    if (!isOnline) {
      Swal.fire({
        icon: "warning",
        title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">คุณอยู่ในสถานะออฟไลน์</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">กรุณาเปิดสถานะออนไลน์เพื่อรับงาน</span>`,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    const { value: accept } = await Swal.fire({
      title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">ยืนยันการรับงาน</span>`,
      html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">คุณต้องการรับงานนี้เข้าคลังงานของคุณหรือไม่?</span>`,
      icon: "question",
      background: theme === "dark" ? "#1f2937" : "#ffffff",
      color: theme === "dark" ? "#fff" : "#1f2937",
      showCancelButton: true,
      confirmButtonText: "รับงาน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#6b7280",
      customClass: {
        popup: `rounded-2xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`,
      },
    });

    if (!accept) return;

    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          status: "IN_PROGRESS",
          assigned_to: currentUser?.id,
          assigned_name: currentUser?.name,
          assigned_employee_id: currentUser?.employeeId,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      notificationSoundRef.current
        .play()
        .catch((e) => console.log("Sound play failed", e));

      Swal.fire({
        icon: "success",
        title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">รับงานสำเร็จ!</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">เริ่มเดินทางได้เลย</span>`,
        timer: 2000,
        showConfirmButton: false,

        // 1. เปลี่ยนจาก 'top-end' เป็น 'center'
        position: "center",

        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        customClass: {
          // 2. ถ้าอยู่ตรงกลางแนะนำให้เพิ่ม shadow-2xl ให้ดูเด่นขึ้น
          popup: `rounded-2xl border shadow-2xl ${theme === "dark" ? "border-emerald-700" : "border-emerald-200"}`,
        },

        // 3. เพิ่มการตั้งค่าให้มันดูนุ่มนวลขึ้นเวลาเด้งตรงกลาง
        showClass: {
          popup: "animate__animated animate__fadeInDown",
        },
        hideClass: {
          popup: "animate__animated animate__fadeOutUp",
        },
      });

      setActiveTab("ACTIVE");
      await fetchTickets();
    } catch (error) {
      console.error("Error accepting job:", error);
      Swal.fire({
        icon: "error",
        title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">เกิดข้อผิดพลาด</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">ไม่สามารถรับงานได้</span>`,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  // Delete history ticket
  const handleDeleteTicket = async (ticket) => {
    const { value: confirm } = await Swal.fire({
      title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">ยืนยันการลบ</span>`,
      html: `
        <div class="text-left">
          <p class="${theme === "dark" ? "text-white/80" : "text-slate-700"} mb-3">คุณต้องการลบประวัติงานนี้หรือไม่?</p>
          <div class="${theme === "dark" ? "bg-rose-900/30" : "bg-rose-50"} p-3 rounded-xl border ${theme === "dark" ? "border-rose-700/50" : "border-rose-200"}">
            <p class="text-sm font-bold ${theme === "dark" ? "text-rose-300" : "text-rose-600"}">Ticket #${ticket.id.toString().slice(-6)}</p>
            <p class="text-sm ${theme === "dark" ? "text-white/80" : "text-slate-700"} mt-1">${ticket.title}</p>
            <p class="text-xs ${theme === "dark" ? "text-white/60" : "text-slate-500"} mt-2">ข้อมูลจะถูกลบถาวรและไม่สามารถกู้คืนได้</p>
          </div>
        </div>
      `,
      icon: "warning",
      background: theme === "dark" ? "#1f2937" : "#ffffff",
      color: theme === "dark" ? "#fff" : "#1f2937",
      showCancelButton: true,
      confirmButtonText: "ลบประวัติ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      reverseButtons: true,
      customClass: {
        popup: `rounded-2xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`,
      },
    });

    if (!confirm) return;

    try {
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticket.id);

      if (error) throw error;

      notificationSoundRef.current
        .play()
        .catch((e) => console.log("Sound play failed", e));

      Swal.fire({
        icon: "success",
        title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">ลบสำเร็จ!</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">ประวัติงานถูกลบเรียบร้อยแล้ว</span>`,
        timer: 2000,
        showConfirmButton: false,

        // ย้ายมาไว้ตรงกลางหน้าจอ
        position: "center",

        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        customClass: {
          // ปรับความโค้งมน (rounded-2xl) ให้เข้ากับก้อน Block ของเรา
          popup: `rounded-2xl border shadow-2xl ${theme === "dark" ? "border-rose-900/50" : "border-rose-200"}`,
        },
      });

      fetchTickets();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      Swal.fire({
        icon: "error",
        title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">เกิดข้อผิดพลาด</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">ไม่สามารถลบประวัติได้</span>`,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  // Open navigation
  const handleOpenNavigation = (location) => {
    if (!location) {
      Swal.fire({
        icon: "warning",

        html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">ไม่สามารถเปิดการนำทางได้</span>`,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    const encodedLocation = encodeURIComponent(location);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;

    Swal.fire({
      title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">เปิดการนำทาง</span>`,
      html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">ต้องการเปิด Google Maps ไปยัง ${location} หรือไม่?</span>`,
      icon: "question",
      background: theme === "dark" ? "#1f2937" : "#ffffff",
      color: theme === "dark" ? "#fff" : "#1f2937",
      showCancelButton: true,
      confirmButtonText: "เปิด Google Maps",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#6b7280",
      customClass: {
        popup: `rounded-2xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`,
      },
    }).then((result) => {
      if (result.isConfirmed) {
        window.open(googleMapsUrl, "_blank");
      }
    });
  };

  // Close job with enhanced UI
  const handleCloseJob = async (ticket) => {
    const { value: formValues } = await Swal.fire({
      title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">บันทึกผลการซ่อม</span>`,
      html: `
        <div class="text-left space-y-4">
          <div class="${theme === "dark" ? "bg-gradient-to-r from-blue-900/30 to-indigo-900/30" : "bg-blue-50"} p-4 rounded-xl border ${theme === "dark" ? "border-blue-700/30" : "border-blue-200"}">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-xs ${theme === "dark" ? "text-blue-300" : "text-blue-600"} font-bold">Ticket ID</p>
                <p class="font-mono font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}">#${ticket.id.toString().slice(-6)}</p>
              </div>
              <div>
                <p class="text-xs ${theme === "dark" ? "text-blue-300" : "text-blue-600"} font-bold">เวลาเริ่ม</p>
                <p class="${theme === "dark" ? "text-white" : "text-slate-900"}">${new Date(ticket.started_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
            <p class="text-sm font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-700"} mt-2">${ticket.title}</p>
          </div>

          <div>
            <label class="block text-sm font-bold ${theme === "dark" ? "text-blue-300" : "text-blue-600"} mb-1">
              สาเหตุ/วิธีแก้ไข <span class="text-rose-400">*</span>
            </label>
            <textarea 
              id="swal-solution" 
              class="w-full p-3 ${theme === "dark" ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"} border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm placeholder-slate-500" 
              rows="4" 
              placeholder="ระบุรายละเอียดการซ่อม..."
            ></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-bold ${theme === "dark" ? "text-blue-300" : "text-blue-600"} mb-1">อุปกรณ์ที่เปลี่ยน</label>
            <input 
              id="swal-parts" 
              class="w-full p-3 ${theme === "dark" ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"} border rounded-xl outline-none text-sm placeholder-slate-500" 
              placeholder="เช่น เมาส์, RAM 8GB, แบตเตอรี่โน๊ตบุ๊ค"
            />
          </div>

          <div>
            <label class="block text-sm font-bold ${theme === "dark" ? "text-blue-300" : "text-blue-600"} mb-1">
              รูปถ่ายหลังซ่อม <span class="text-rose-400">*</span>
            </label>
            <div class="relative">
              <input 
                type="file" 
                id="swal-file" 
                accept="image/*" 
                capture="environment" 
                class="block w-full text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}
                  file:mr-4 file:py-3 file:px-4 file:rounded-xl 
                  file:border-0 file:text-sm file:font-semibold
                  file:bg-gradient-to-r file:from-blue-600 file:to-indigo-600 
                  file:text-white hover:file:from-blue-700 hover:file:to-indigo-700
                  file:cursor-pointer file:transition-all"
              />
              <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Camera class="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p class="text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-400"} mt-2">ถ่ายรูปหลักฐานหลังซ่อมเสร็จ</p>
          </div>

          <div class="${theme === "dark" ? "bg-gradient-to-r from-amber-900/30 to-yellow-900/30" : "bg-amber-50"} p-3 rounded-xl border ${theme === "dark" ? "border-amber-700/30" : "border-amber-200"}">
            <p class="text-xs ${theme === "dark" ? "text-amber-300" : "text-amber-600"}">
              <span class="font-bold">หมายเหตุ:</span> ระบบจะบันทึกเวลาเสร็จสิ้นงานโดยอัตโนมัติ
            </p>
          </div>
        </div>
      `,
      background: theme === "dark" ? "#1f2937" : "#ffffff",
      color: theme === "dark" ? "#fff" : "#1f2937",
      showCancelButton: true,
      confirmButtonText: "บันทึกและปิดงาน",
      confirmButtonColor: "#10b981",
      cancelButtonText: "ยกเลิก",
      focusConfirm: false,
      showLoaderOnConfirm: true,
      customClass: {
        popup: `rounded-2xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`,
      },
      preConfirm: () => {
        const solution = document.getElementById("swal-solution").value;
        const parts = document.getElementById("swal-parts").value;
        const file = document.getElementById("swal-file").files[0];

        if (!solution.trim()) {
          Swal.showValidationMessage(
            `<span class="text-rose-400">กรุณาระบุวิธีแก้ไขปัญหา</span>`,
          );
          return false;
        }
        if (!file) {
          Swal.showValidationMessage(
            `<span class="text-rose-400">กรุณาถ่ายรูปหลังซ่อมเสร็จ</span>`,
          );
          return false;
        }

        return { solution, parts, file };
      },
    });

    if (!formValues) return;

    try {
      const fileExt = formValues.file.name.split(".").pop();
      const fileName = `after_${ticket.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("ticket-images")
        .upload(fileName, formValues.file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("ticket-images").getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("tickets")
        .update({
          status: "CLOSED",
          solution_note: formValues.solution,
          parts_used: formValues.parts,
          image_after_url: publicUrl,
          closed_at: new Date().toISOString(),
          // updated_at: new Date().toISOString(),
          closed_by: currentUser?.id,
          closed_by_name: currentUser?.name,
        })
        .eq("id", ticket.id);

      if (dbError) throw dbError;

      notificationSoundRef.current
        .play()
        .catch((e) => console.log("Sound play failed", e));

      await Swal.fire({
        icon: "success",
        title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">ปิดงานสำเร็จ!</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">บันทึกข้อมูลเรียบร้อยแล้ว</span>`,
        timer: 2500,
        showConfirmButton: false,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        customClass: {
          popup: `rounded-2xl border ${theme === "dark" ? "border-emerald-700" : "border-emerald-200"}`,
        },
      });

      setActiveTab("HISTORY");
      fetchTickets();
    } catch (error) {
      console.error("Error closing job:", error);
      Swal.fire({
        icon: "error",
        title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">เกิดข้อผิดพลาด</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">${error.message}</span>`,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  // View ticket details
  const handleViewDetails = (ticket) => {
    Swal.fire({
      title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">รายละเอียด Ticket #${ticket.id.toString().slice(-6)}</span>`,
      html: `
        <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="${theme === "dark" ? "bg-gradient-to-r from-slate-800 to-slate-900" : "bg-gradient-to-r from-slate-50 to-slate-100"} p-4 rounded-xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}">
              <p class="text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} font-bold uppercase">สถานะ</p>
              <p class="text-sm font-bold ${getStatusColor(ticket.status)} mt-1">${getStatusText(ticket.status)}</p>
            </div>
            <div class="${theme === "dark" ? "bg-gradient-to-r from-slate-800 to-slate-900" : "bg-gradient-to-r from-slate-50 to-slate-100"} p-4 rounded-xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}">
              <p class="text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} font-bold uppercase">ความสำคัญ</p>
              <p class="text-sm font-bold ${getPriorityColor(ticket.priority)} mt-1">${getPriorityText(ticket.priority)}</p>
            </div>
          </div>
          
          <div class="${theme === "dark" ? "bg-gradient-to-r from-blue-900/30 to-indigo-900/30" : "bg-blue-50"} p-4 rounded-xl border ${theme === "dark" ? "border-blue-700/30" : "border-blue-200"}">
            <p class="text-xs ${theme === "dark" ? "text-blue-300" : "text-blue-600"} font-bold uppercase mb-3">ผู้แจ้ง</p>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                ${ticket.reporter_name?.charAt(0) || "U"}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-base font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}">${ticket.reporter_name || "ไม่ระบุ"}</p>
                  <span class="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                    ${ticket.reporter_emp_id || "ไม่ระบุรหัส"}
                  </span>
                  <span class="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                    ${ticket.reporter_dept || "ไม่ระบุแผนก"}
                  </span>
                </div>
                <div class="flex items-center gap-3 mt-2 flex-wrap">
                  ${ticket.reporter_phone
          ? `
                  <div class="flex items-center gap-1">
                    <Phone class="w-3 h-3 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}" />
                    <span class="text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"}">${ticket.reporter_phone}</span>
                  </div>
                  `
          : ""
        }
                  ${ticket.reporter_email
          ? `
                  <div class="flex items-center gap-1">
                    <Mail class="w-3 h-3 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}" />
                    <span class="text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"} truncate max-w-[150px]">${ticket.reporter_email}</span>
                  </div>
                  `
          : ""
        }
                </div>
              </div>
            </div>
          </div>
          
          <div class="${theme === "dark" ? "bg-gradient-to-r from-slate-800 to-slate-900" : "bg-gradient-to-r from-slate-50 to-slate-100"} p-4 rounded-xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}">
            <p class="text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} font-bold uppercase mb-2">หัวข้อปัญหา</p>
            <p class="text-base font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}">${ticket.title}</p>
          </div>
          
          <div class="${theme === "dark" ? "bg-gradient-to-r from-slate-800 to-slate-900" : "bg-gradient-to-r from-slate-50 to-slate-100"} p-4 rounded-xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}">
            <p class="text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} font-bold uppercase mb-2">รายละเอียด</p>
            <p class="text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"} italic leading-relaxed">"${ticket.description}"</p>
          </div><br/>
          
        
          </div>
          
          <div class="${theme === "dark" ? "bg-gradient-to-r from-blue-900/30 to-indigo-900/30" : "bg-blue-50"} p-4 rounded-xl border ${theme === "dark" ? "border-blue-700/30" : "border-blue-200"}">
            <p class="text-xs ${theme === "dark" ? "text-blue-300" : "text-blue-600"} font-bold uppercase mb-3">ประวัติเวลา</p>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span class="text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"}">แจ้งเมื่อ:</span>
                </div>
                <span class="text-sm font-medium ${theme === "dark" ? "text-white" : "text-slate-900"}">
                  ${new Date(ticket.created_at).toLocaleString("th-TH")}
                </span>
              </div>
              
              ${ticket.started_at
          ? `
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span class="text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"}">รับงานเมื่อ:</span>
                </div>
                <span class="text-sm font-medium ${theme === "dark" ? "text-white" : "text-slate-900"}">
                  ${new Date(ticket.started_at).toLocaleString("th-TH")}
                </span>
              </div>
              `
          : ""
        }
              
              ${ticket.closed_at
          ? `
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span class="text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"}">ปิดงานเมื่อ:</span>
                </div>
                <span class="text-sm font-medium ${theme === "dark" ? "text-white" : "text-slate-900"}">
                  ${new Date(ticket.closed_at).toLocaleString("th-TH")}
                </span>
              </div>
              `
          : ""
        }
              
              ${ticket.started_at && ticket.closed_at
          ? `
              <div class="pt-3 border-t ${theme === "dark" ? "border-blue-800/50" : "border-blue-200"}">
                <div class="flex items-center justify-between">
                  <span class="text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}">ระยะเวลาซ่อม:</span>
                  <span class="text-sm font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}">
                    ${calculateDuration(ticket.started_at, ticket.closed_at)}
                  </span>
                </div>
              </div>
              `
          : ""
        }
            </div>
          </div><br/>
          
          ${ticket.solution_note
          ? `
          <div class="${theme === "dark" ? "bg-gradient-to-r from-emerald-900/30 to-green-900/30" : "bg-emerald-50"} p-4 rounded-xl border ${theme === "dark" ? "border-emerald-700/30" : "border-emerald-200"}">
            <p class="text-xs ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"} font-bold uppercase mb-2">วิธีแก้ไข</p>
            <p class="text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"} leading-relaxed">${ticket.solution_note}</p>
          </div>
          `
          : ""
        }
          <br/>
          ${ticket.parts_used
          ? `
          <div class="${theme === "dark" ? "bg-gradient-to-r from-amber-900/30 to-yellow-900/30" : "bg-amber-50"} p-4 rounded-xl border ${theme === "dark" ? "border-amber-700/30" : "border-amber-200"}">
            <p class="text-xs ${theme === "dark" ? "text-amber-300" : "text-amber-600"} font-bold uppercase mb-2">อะไหล่ที่ใช้</p>
            <p class="text-sm ${theme === "dark" ? "text-white" : "text-slate-900"}">${ticket.parts_used}</p>
          </div>
          `
          : ""
        }
          <br/>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${ticket.attachments && Array.isArray(ticket.attachments) && ticket.attachments.length > 0
          ? ticket.attachments.map((url, idx) => `
            <div class="${theme === "dark" ? "bg-gradient-to-r from-slate-800 to-slate-900" : "bg-gradient-to-r from-slate-50 to-slate-100"} p-4 rounded-xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}">
              <p class="text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} font-bold uppercase mb-3">รูปภาพประกอบ ${idx + 1}</p>
              <img 
                src="${url}" 
                alt="Attachment ${idx + 1}" 
                class="w-full h-48 object-cover rounded-lg border ${theme === "dark" ? "border-slate-700" : "border-slate-300"} hover:scale-[1.02] transition-transform cursor-zoom-in"
                onclick="window.open('${url}', '_blank')"
              />
            </div>
            `).join('')
          : ticket.image_url
            ? `
            <div class="${theme === "dark" ? "bg-gradient-to-r from-slate-800 to-slate-900" : "bg-gradient-to-r from-slate-50 to-slate-100"} p-4 rounded-xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}">
              <p class="text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} font-bold uppercase mb-3">รูปก่อนซ่อม</p>
              <img 
                src="${ticket.image_url}" 
                alt="Before" 
                class="w-full h-48 object-cover rounded-lg border ${theme === "dark" ? "border-slate-700" : "border-slate-300"} hover:scale-[1.02] transition-transform cursor-zoom-in"
                onclick="window.open('${ticket.image_url}', '_blank')"
              />
            </div>
            `
            : ""
        }
            
            ${ticket.image_after_url
          ? `
            <div class="${theme === "dark" ? "bg-gradient-to-r from-slate-800 to-slate-900" : "bg-gradient-to-r from-slate-50 to-slate-100"} p-4 rounded-xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}">
              <p class="text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} font-bold uppercase mb-3">รูปหลังซ่อม</p>
              <img 
                src="${ticket.image_after_url}" 
                alt="After" 
                class="w-full h-48 object-cover rounded-lg border ${theme === "dark" ? "border-slate-700" : "border-slate-300"} hover:scale-[1.02] transition-transform cursor-zoom-in"
                onclick="window.open('${ticket.image_after_url}', '_blank')"
              />
            </div>
            `
          : ""
        }
          </div><br/>
          
          ${ticket.status === "CLOSED" && ticket.closed_by_name
          ? `
          <div class="${theme === "dark" ? "bg-gradient-to-r from-emerald-900/30 to-green-900/30" : "bg-emerald-50"} p-4 rounded-xl border ${theme === "dark" ? "border-emerald-700/30" : "border-emerald-200"}">
            <div class="flex items-center justify-between"><br/>
              <div>
                <p class="text-xs font-bold ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"} uppercase">ปิดงานโดย</p>
                <p class="text-sm font-medium ${theme === "dark" ? "text-white" : "text-slate-900"} mt-1">${ticket.closed_by_name}</p>
              </div><br/>
              <div class="text-right">
                <p class="text-xs ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}">รหัสพนักงาน</p>
                <p class="text-sm font-medium ${theme === "dark" ? "text-white" : "text-slate-900"}">${ticket.assigned_employee_id || currentUser?.employeeId || "ไม่ระบุ"}</p>
              </div><br/>
            </div>
          </div>
          `
          : ""
        }
        </div>
      `,
      width: isMobile ? "90%" : 700,
      background: theme === "dark" ? "#1f2937" : "#ffffff",
      color: theme === "dark" ? "#fff" : "#1f2937",
      confirmButtonText: "ปิด",
      confirmButtonColor: "#3b82f6",
      showCloseButton: true,
      customClass: {
        popup: `rounded-2xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`,
        closeButton:
          theme === "dark"
            ? "text-slate-400 hover:text-white"
            : "text-slate-500 hover:text-slate-700",
      },
    });
  };


  // Filter tickets
  const incomingTickets = tickets.filter((t) => t.status === "NEW");
  const myActiveTickets = tickets.filter(
    (t) => t.assigned_to === currentUser?.id && t.status === "IN_PROGRESS",
  );
  const historyTickets = tickets.filter((t) => t.status === "CLOSED");
  const departmentOptions = [
    ...new Set(
      tickets
        .map((t) => t.reporter_dept)
        .filter((dept) => typeof dept === "string" && dept.trim() !== ""),
    ),
  ];
  const assigneeOptions = [
    ...new Set(
      tickets
        .map((t) => t.assigned_name)
        .filter((name) => typeof name === "string" && name.trim() !== ""),
    ),
  ];

  const filteredTickets = tickets.filter((ticket) => {
    const matchesTab =
      activeTab === "INCOMING"
        ? ticket.status === "NEW"
        : activeTab === "ACTIVE"
          ? ticket.status === "IN_PROGRESS" &&
          ticket.assigned_to === currentUser?.id
          : activeTab === "HISTORY"
            ? ticket.status === "CLOSED"
            : true;

    const searchValue = debouncedSearchQuery.toLowerCase();
    const matchesSearch =
      !searchValue ||
      ticket.title?.toLowerCase().includes(searchValue) ||
      ticket.reporter_name?.toLowerCase().includes(searchValue) ||
      ticket.reporter_dept?.toLowerCase().includes(searchValue) ||
      ticket.location?.toLowerCase().includes(searchValue) ||
      ticket.category?.toLowerCase().includes(searchValue) ||
      ticket.id?.toString().includes(searchValue);

    const matchesFilterStatus =
      filterState.status === "ALL" || ticket.status === filterState.status;
    const matchesFilterPriority =
      filterState.priority === "ALL" || ticket.priority === filterState.priority;
    const matchesFilterDepartment =
      filterState.department === "ALL" ||
      ticket.reporter_dept === filterState.department;
    const matchesFilterAssignee =
      filterState.assigned === "ALL" ||
      ticket.assigned_name === filterState.assigned;

    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const ticketDate = ticket.created_at.split("T")[0];
      matchesDate =
        ticketDate >= dateRange.start && ticketDate <= dateRange.end;
    }

    let matchesQuickFilter = true;
    if (quickFilter === "URGENT") {
      matchesQuickFilter = ticket.priority === "urgent";
    } else if (quickFilter === "MINE") {
      matchesQuickFilter = ticket.assigned_to === currentUser?.id;
    } else if (quickFilter === "TODAY") {
      const todayText = new Date().toISOString().split("T")[0];
      matchesQuickFilter = ticket.created_at?.startsWith(todayText);
    } else if (quickFilter === "HARDWARE") {
      const text = `${ticket.category || ""} ${ticket.device_type || ""}`.toLowerCase();
      matchesQuickFilter = /(hardware|laptop|computer|printer|router|monitor)/.test(text);
    } else if (quickFilter === "SYSTEM") {
      const text = `${ticket.category || ""} ${ticket.device_type || ""}`.toLowerCase();
      matchesQuickFilter = /(system|network|server|software|account|email|wifi)/.test(text);
    }

    return (
      matchesTab &&
      matchesSearch &&
      matchesDate &&
      matchesFilterStatus &&
      matchesFilterPriority &&
      matchesFilterDepartment &&
      matchesFilterAssignee &&
      matchesQuickFilter
    );
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sortBy === "oldest") {
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    }
    if (sortBy === "priority") {
      const rank = { urgent: 3, normal: 2, low: 1 };
      return (rank[b.priority] || 0) - (rank[a.priority] || 0);
    }
    if (sortBy === "status") {
      const rank = { NEW: 1, IN_PROGRESS: 2, CLOSED: 3 };
      return (rank[a.status] || 99) - (rank[b.status] || 99);
    }
    if (sortBy === "updated") {
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    }
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const activeFilterCount = [
    filterState.status !== "ALL",
    filterState.priority !== "ALL",
    filterState.department !== "ALL",
    filterState.assigned !== "ALL",
    Boolean(dateRange.start && dateRange.end),
  ].filter(Boolean).length;

  const statCards = [
    {
      key: "new",
      title: "งานใหม่",
      value: incomingTickets.length,
      icon: Bell,
      trend: "รอรับงาน",
      valueClass: theme === "dark" ? "text-red-400" : "text-red-600",
      iconWrapClass:
        theme === "dark" ? "border border-slate-700 bg-[#1e293b]" : "bg-red-500/10",
      iconClass: theme === "dark" ? "text-red-400" : "text-red-600",
    },
    {
      key: "inProgress",
      title: "กำลังดำเนินการ",
      value: myActiveTickets.length,
      icon: Wrench,
      trend: "งานที่กำลังดำเนินการ",
      valueClass: theme === "dark" ? "text-amber-400" : "text-amber-600",
      iconWrapClass:
        theme === "dark" ? "border border-slate-700 bg-[#1e293b]" : "bg-amber-500/10",
      iconClass: theme === "dark" ? "text-amber-400" : "text-amber-600",
    },
    {
      key: "urgent",
      title: "งานด่วน",
      value: stats.urgentCount,
      icon: AlertCircle,
      trend: "ต้องดำเนินการด่วน",
      valueClass: theme === "dark" ? "text-red-400" : "text-red-600",
      iconWrapClass:
        theme === "dark" ? "border border-slate-700 bg-[#1e293b]" : "bg-red-500/10",
      iconClass: theme === "dark" ? "text-red-400" : "text-red-600",
    },
    {
      key: "response",
      title: "เวลาเฉลี่ย",
      value: `${stats.responseTime} นาที`,
      icon: Clock,
      trend: "เวลาต่อรายการ",
      valueClass: theme === "dark" ? "text-slate-300" : "text-slate-600",
      iconWrapClass:
        theme === "dark" ? "border border-slate-700 bg-[#1e293b]" : "bg-slate-500/10",
      iconClass: theme === "dark" ? "text-slate-300" : "text-slate-600",
    },
  ];

  const tabItems = [
    {
      id: "INCOMING",
      label: "งานใหม่",
      icon: Bell,
      count: incomingTickets.length,
    },
    {
      id: "ACTIVE",
      label: "กำลังทำ",
      icon: Activity,
      count: myActiveTickets.length,
    },
    {
      id: "HISTORY",
      label: "ประวัติ",
      icon: History,
      count: historyTickets.length,
    },
  ];

  const handleOpenRepairFromOverview = ({
    tab = "INCOMING",
    searchQuery: nextSearch = "",
    quickFilter: nextQuickFilter = "ALL",
    sortBy: nextSort = "latest",
  } = {}) => {
    handleTabChange(tab);
    setSearchQuery(String(nextSearch || ""));
    setQuickFilter(nextQuickFilter);
    setSortBy(nextSort);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${uiTheme.appFont} ${uiTheme.pageBackground} ${
        theme === "dark" ? "dark" : ""
      }`}
    >
      <ITDashboardSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        theme={theme}
        currentPage={currentPage}
        onNavigatePage={handleNavigatePage}
      />

      <div
        className={`${sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"} transition-all duration-300 ease-in-out`}
      >

        <ITDashboardHeader
          theme={theme}
          toggleTheme={toggleTheme}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isOnline={isOnline}
          notificationCount={notificationCount}
          setNotificationCount={setNotificationCount}
          setActiveTab={handleTabChange}
          currentUser={currentUser}
          onLogout={handleLogout}
          syncText={
            lastRefreshedAt
              ? new Date(lastRefreshedAt).toLocaleTimeString("th-TH")
              : "กำลังโหลด..."
          }
          syncAgoText={getTimeSinceRefresh()}
        />

        <main className="max-w-[1400px] mx-auto px-6 py-4 lg:py-5">
          <ITDashboardPageRenderer
            currentPage={currentPage}
            theme={theme}
            uiTheme={uiTheme}
            statCards={statCards}
            tabItems={tabItems}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            activeFilterCount={activeFilterCount}
            onOpenDateFilter={() => setShowDateFilter(true)}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            onCreateTicket={() => navigate("/create-ticket")}
            quickFilter={quickFilter}
            onQuickFilterChange={setQuickFilter}
            sortedTickets={sortedTickets}
            tickets={tickets}
            showCalendar={showCalendar}
            onCloseCalendar={(visible) => {
              if (visible) {
                setCurrentPage(DASHBOARD_PAGE_IDS.CALENDAR);
                return;
              }
              setCurrentPage(TAB_TO_PAGE[activeTab] || DASHBOARD_PAGE_IDS.TICKETS);
            }}
            setSelectedDate={setSelectedDate}
            showReports={showReports}
            onOpenRepairFromOverview={handleOpenRepairFromOverview}
            onPickUpEquipment={() => navigate("/pick-up-equipment")}
            loading={loading}
            isMobile={isMobile}
            dateRange={dateRange}
            setDateRange={setDateRange}
            viewMode={viewMode}
            setViewMode={setViewMode}
            historyTickets={historyTickets}
            currentUser={currentUser}
            handleAcceptJob={handleAcceptJob}
            handleCloseJob={handleCloseJob}
            handleDeleteTicket={handleDeleteTicket}
            handleViewDetails={handleViewDetails}
            handleOpenNavigation={handleOpenNavigation}
          />
        </main>

        {showDateFilter && (
          <div className="fixed inset-0 z-[70]">
            <div className={`absolute inset-0 ${theme === "dark" ? "bg-slate-950" : "bg-black/40"}`} onClick={() => setShowDateFilter(false)} />
            <div className={`absolute right-0 top-0 h-full w-full overflow-y-auto border-l p-4 sm:w-[420px] ${theme === "dark" ? "border-slate-700 bg-[#111827]" : "border-slate-200 bg-white"}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className={`text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>ตัวกรองข้อมูล</h3>
                  <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>ปรับเงื่อนไขการค้นหาและรายการที่แสดง</p>
                </div>
                <button
                  onClick={() => setShowDateFilter(false)}
                  className={`rounded-lg p-2 ${theme === "dark" ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
                  aria-label="ปิดตัวกรอง"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`mb-1 block text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>สถานะ</label>
                  <select
                    value={filterState.status}
                    onChange={(event) => setFilterState((prev) => ({ ...prev, status: event.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}
                  >
                    <option value="ALL">ทั้งหมด</option>
                    <option value="NEW">ใหม่</option>
                    <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                    <option value="CLOSED">ปิดงานแล้ว</option>
                  </select>
                </div>

                <div>
                  <label className={`mb-1 block text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>ความสำคัญ</label>
                  <select
                    value={filterState.priority}
                    onChange={(event) => setFilterState((prev) => ({ ...prev, priority: event.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}
                  >
                    <option value="ALL">ทั้งหมด</option>
                    <option value="urgent">ด่วน</option>
                    <option value="normal">ปกติ</option>
                    <option value="low">ต่ำ</option>
                  </select>
                </div>

                <div>
                  <label className={`mb-1 block text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>แผนก</label>
                  <select
                    value={filterState.department}
                    onChange={(event) => setFilterState((prev) => ({ ...prev, department: event.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}
                  >
                    <option value="ALL">ทั้งหมด</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`mb-1 block text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>ผู้รับผิดชอบ</label>
                  <select
                    value={filterState.assigned}
                    onChange={(event) => setFilterState((prev) => ({ ...prev, assigned: event.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}
                  >
                    <option value="ALL">ทั้งหมด</option>
                    {assigneeOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`mb-1 block text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>วันที่เริ่มต้น</label>
                    <input
                      type="date"
                      value={dateRange.start || ""}
                      onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))}
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}
                    />
                  </div>
                  <div>
                    <label className={`mb-1 block text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>วันที่สิ้นสุด</label>
                    <input
                      type="date"
                      value={dateRange.end || ""}
                      onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))}
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setFilterState({
                      status: "ALL",
                      priority: "ALL",
                      department: "ALL",
                      assigned: "ALL",
                    });
                    setDateRange({ start: "", end: "" });
                  }}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${uiTheme.clearFilterButton}`}
                >
                  รีเซ็ต
                </button>
                <button
                  onClick={() => setShowDateFilter(false)}
                  className="rounded-lg bg-[#2b59b0] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#244a95]"
                >
                  ใช้ตัวกรอง
                </button>
              </div>
            </div>
          </div>
        )}

        <ITDashboardGlobalStyles theme={theme} />
      </div>
    </div>
  );
};

export default ITDashboard;




