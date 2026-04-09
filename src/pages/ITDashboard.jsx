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
  Globe,
  Lock,
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
import { toast } from "react-hot-toast";
import ITDashboardGlobalStyles from "./it-dashboard/components/ITDashboardGlobalStyles";
import TicketDetailModal from "./dashboard/components/TicketDetailModal";
import WalkInTicketModal from "./it-dashboard/components/WalkInTicketModal";
import { createWalkInTicket } from "./it-dashboard/services/walkInTicketService";

// New Refactored Components
import ITDashboardHeader from "./it-dashboard/components/ITDashboardHeader";
import ITDashboardSidebar from "./it-dashboard/components/ITDashboardSidebar";
import ITDashboardPageRenderer from "./it-dashboard/pages/ITDashboardPageRenderer";
import { DASHBOARD_PAGE_IDS, TAB_TO_PAGE } from "./it-dashboard/constants/dashboardPages";
import { getITDashboardTheme } from "./it-dashboard/theme/itDashboardTheme";
import CentralChatDock from "../components/CentralChatDock";
import {
  loadNotebookRequestQueue,
  isNotebookPermissionDenied,
  isNotebookSchemaError,
  NOTEBOOK_LOG_STATUS,
} from "../services/notebookBorrowService";

// Utilities
import {
  getStatusText,
  getPriorityText,
} from "./it-dashboard/utils/ticketUtils";
import {
  TICKET_REPAIR_STATUS_OPTIONS,
  embedTicketStatusDetailInParts,
  getTicketStatusDetailMeta,
  getTicketStatusLabel,
  getTicketStatusLifecycle,
  stripTicketStatusDetailFromParts,
} from "../lib/ticketRepairStatus";
import {
  isPickUpEquipmentRequest,
  splitTicketBuckets,
} from "../lib/serviceRequestUtils";

function buildStructuredRepairReport({
  problem,
  rootCause,
  solution,
  partsUsed,
  result,
}) {
  return [
    `ปัญหาที่พบ (Problem): ${problem}`,
    `สาเหตุของปัญหา (Root Cause): ${rootCause}`,
    `วิธีการแก้ไข (Solution): ${solution}`,
    `อะไหล่ที่ใช้ (Parts Used): ${partsUsed || "ไม่มีการเปลี่ยนอะไหล่"}`,
    `ผลการทดสอบหลังแก้ไข (Result): ${result}`,
  ].join("\n");
}

function buildAvatarFallback(name, color = "2b59b0") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || "U"))}&background=${color}&color=fff&size=96`;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalizeText(value),
  );
}

function deriveEmployeeCodeFromEmail(email) {
  const localPart = normalizeText(email).split("@")[0] || "";
  const match = localPart.match(/\d{3,}/);
  return match ? match[0] : "";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CLOSE_JOB_MAX_FILE_SIZE = 5 * 1024 * 1024;
const CLOSE_JOB_IMAGE_ACCEPT = "image/*";
const CLOSE_JOB_FILE_ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";

function formatAttachmentSize(size) {
  const bytes = Number(size || 0);
  if (!bytes) return "-";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function isImageLikeFile(file) {
  const mimeType = String(file?.type || "").toLowerCase();
  if (mimeType.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(String(file?.name || ""));
}

function inferClipboardFileName(file) {
  if (file?.name) return file.name;
  const extension = String(file?.type || "").split("/")[1] || "png";
  return `clipboard_${Date.now()}.${extension}`;
}

const ITDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(DASHBOARD_PAGE_IDS.DASHBOARD);
  const [activeTab, setActiveTab] = useState("INCOMING");
  const [isOnline, setIsOnline] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  // Date range filter state
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
  const [serviceRequestNotificationCount, setServiceRequestNotificationCount] = useState(0);
  const [notebookNotificationCount, setNotebookNotificationCount] = useState(0);
  const [theme, setTheme] = useState("dark");
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState("card");
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [detailTicket, setDetailTicket] = useState(null);
  const [isWalkInTicketOpen, setIsWalkInTicketOpen] = useState(false);
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [chatOpenTarget, setChatOpenTarget] = useState("support");

  // Export/report related state

  const [stats, setStats] = useState({
    todayCompleted: 0,
    weeklyAvg: 0,
    responseTime: 0,
    satisfaction: 0,
    urgentCount: 0,
    inProgressCount: 0,
  });
  const uiTheme = getITDashboardTheme(theme);
  const isDarkTheme = theme === "dark";
  const getSwalTemplate = (tone = "primary") => {
    const confirmButtonClass =
      tone === "danger"
        ? "inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
        : tone === "success"
          ? "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          : "inline-flex items-center justify-center rounded-xl bg-[#2b59b0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244a95] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/30";

    return {
      background: isDarkTheme ? "#0f172a" : "#ffffff",
      color: isDarkTheme ? "#ffffff" : "#1f2937",
      buttonsStyling: false,
      customClass: {
        popup: isDarkTheme
          ? "w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900  shadow-2xl"
          : "w-full max-w-md rounded-2xl border border-slate-200 bg-white  shadow-xl",
        title: " text-lg font-semibold",
        htmlContainer: " !px-5 !pt-2 !pb-1 sm:!px-6",
        actions: "!mt-5 !gap-2 !px-5 !pb-5 sm:!px-6",
        confirmButton: confirmButtonClass,
        cancelButton: isDarkTheme
          ? "inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
          : "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300",
      },
    };
  };
  const fireThemedSwal = (options = {}, tone = "primary") => {
    const template = getSwalTemplate(tone);
    const shouldReverseButtons =
      options.showCancelButton && typeof options.reverseButtons === "undefined";
    return Swal.fire({
      ...template,
      ...options,
      reverseButtons: shouldReverseButtons ? true : options.reverseButtons,
      customClass: {
        ...template.customClass,
        ...(options.customClass || {}),
      },
    });
  };
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

  const loadNotebookNotifications = async () => {
    try {
      const { data, error } = await loadNotebookRequestQueue();
      if (error) throw error;

      const queue = Array.isArray(data) ? data : [];
      const actionableCount = queue.filter((item) =>
        item?.status === NOTEBOOK_LOG_STATUS.PENDING ||
        item?.status === NOTEBOOK_LOG_STATUS.APPROVED ||
        (item?.status === NOTEBOOK_LOG_STATUS.RETURNED && !item?.return_confirmed_at)
      ).length;

      setNotebookNotificationCount(actionableCount);
    } catch (error) {
      if (!isNotebookSchemaError(error) && !isNotebookPermissionDenied(error)) {
        console.error("Load notebook notification count error:", error);
      }
      setNotebookNotificationCount(0);
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

  // Selection helpers
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
        role:
          profileData?.role ||
          user.user_metadata?.role ||
          "it_support",
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
        location:
          profileData?.location ||
          profileData?.work_location ||
          user.user_metadata?.location ||
          user.user_metadata?.work_location ||
          "",
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
              if (!isPickUpEquipmentRequest(payload.new)) {
                try {
                  await audioRef.current.play();
                } catch (e) {
                  console.log("Audio play failed", e);
                }

                showNewTicketNotification(payload.new);
              }
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

  useEffect(() => {
    let isMounted = true;

    const syncNotebookBadge = async () => {
      if (!isMounted) return;
      await loadNotebookNotifications();
    };

    syncNotebookBadge();

    const channel = supabase
      .channel("it_notebook_borrow_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "borrow_logs" },
        () => {
          if (isMounted) loadNotebookNotifications();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notebooks" },
        () => {
          if (isMounted) loadNotebookNotifications();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Show new ticket notification with animation
  // Show animated notification for new incoming tickets
  const showNewTicketNotification = (ticket) => {
    const notification = document.createElement("div");
    notification.className =
      "fixed top-4 right-4 z-[1000] animate-slide-in-right";
    notification.innerHTML = `
      <div class="bg-gradient-to-r from-[#2b59b0] to-[#2b59b0] text-white p-4 rounded-xl shadow-2xl max-w-sm border border-[#2b59b0]/30">
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
              <!-- Open detail from notification -->
              <button class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors" id="view-ticket-btn-${ticket.id}">
                ดูรายละเอียด
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Attach click handler to detail button
    const viewButton = document.getElementById(`view-ticket-btn-${ticket.id}`);
    if (viewButton) {
      viewButton.addEventListener("click", () => {
        // Open ticket detail immediately
        handleViewDetails(ticket);
        notification.remove();
      });
    }

    // Keep global helper for compatibility
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

  const enrichTicketsWithProfiles = async (rows) => {
    const ticketsData = Array.isArray(rows) ? rows : [];
    if (!ticketsData.length) return [];

    return ticketsData.map((ticket) => {
      const reporterName = normalizeText(ticket?.reporter_name) || "-";
      const reporterEmpId =
        normalizeText(ticket?.reporter_emp_id) ||
        deriveEmployeeCodeFromEmail(ticket?.reporter_email) ||
        "";
      const reporterDept =
        normalizeText(ticket?.reporter_dept) ||
        normalizeText(ticket?.department) ||
        "";
      const assignedName = normalizeText(ticket?.assigned_name) || "";
      const reporterAvatar =
        normalizeText(ticket?.reporter_avatar_url) ||
        buildAvatarFallback(reporterName, "2b59b0");
      const assignedAvatar =
        normalizeText(ticket?.assigned_avatar_url) ||
        (assignedName ? buildAvatarFallback(assignedName, "059669") : "");

      return {
        ...ticket,
        reporter_name: reporterName,
        reporter_emp_id: reporterEmpId,
        reporter_dept: reporterDept,
        department: normalizeText(ticket?.department) || reporterDept || "",
        reporter_avatar_url: reporterAvatar,
        assigned_name: assignedName || ticket?.assigned_name || "",
        assigned_employee_id: normalizeText(ticket?.assigned_employee_id) || "",
        assigned_avatar_url: assignedAvatar,
      };
    });
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enrichedTickets = await enrichTicketsWithProfiles(data || []);
      const {
        repairTickets,
        serviceRequests: nextServiceRequests,
      } = splitTicketBuckets(enrichedTickets);

      setTickets(repairTickets);
      setServiceRequests(nextServiceRequests);
      calculateStats(repairTickets);
      setLastRefreshedAt(new Date());

      const newTickets = repairTickets.filter((ticket) => ticket.status === "NEW");
      const newServiceRequests = nextServiceRequests.filter((request) => request.status === "NEW");
      setNotificationCount(newTickets.length);
      setServiceRequestNotificationCount(newServiceRequests.length);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      fireThemedSwal({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถโหลดข้อมูลได้",
      }, "danger");
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
    const { value: confirm } = await fireThemedSwal({
      title: "ยืนยันออกจากระบบ",
      text: "ยืนยันการออกจากระบบใช่หรือไม่",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    }, "primary");

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
      fireThemedSwal({
        icon: "warning",
        title: "โหมดออฟไลน์",
        text: "กรุณาเปิดโหมดออนไลน์ก่อนรับงาน",
      }, "primary");
      return;
    }

    const { value: accept } = await fireThemedSwal({
      title: "ยืนยันรับงาน",
      text: "ต้องการรับผิดชอบงานนี้ใช่หรือไม่",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "รับงาน",
      cancelButtonText: "ยกเลิก",
    }, "primary");

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

      fireThemedSwal({
        icon: "success",
        title: "รับงานสำเร็จ",
        text: "สามารถเริ่มดำเนินการได้ทันที",
        timer: 2000,
        showConfirmButton: false,
        position: "center",
      }, "success");

      setActiveTab("ACTIVE");
      await fetchTickets();
    } catch (error) {
      console.error("Error accepting job:", error);
      fireThemedSwal({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถรับงานนี้ได้ กรุณาลองใหม่อีกครั้ง",
      }, "danger");
    }
  };

  // Delete history ticket
  const handleDeleteTicket = async (ticket) => {
    const { value: confirm } = await fireThemedSwal({
      title: "ลบประวัติงาน",
      text: "ต้องการลบรายการนี้ออกจากประวัติใช่หรือไม่",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบรายการ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    }, "danger");

    if (!confirm) return;

    try {
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticket.id);

      if (error) throw error;

      await fireThemedSwal({
        icon: "success",
        title: "ลบสำเร็จ",
        text: "ลบประวัติงานเรียบร้อยแล้ว",
        timer: 1800,
        showConfirmButton: false,
      }, "success");

      fetchTickets();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      fireThemedSwal({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถลบรายการได้ กรุณาลองใหม่อีกครั้ง",
      }, "danger");
    }
  };

  // Open navigation
  const handleOpenNavigation = (location) => {
    if (!location) {
      fireThemedSwal({
        icon: "warning",
        text: "ไม่พบข้อมูลสถานที่ของเคสนี้",
      });
      return;
    }

    const encodedLocation = encodeURIComponent(location);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;

    fireThemedSwal({
      title: "เปิดแผนที่นำทาง",
      text: `ต้องการเปิด Google Maps ไปยัง ${location} ใช่หรือไม่`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "เปิด Google Maps",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed) {
        window.open(googleMapsUrl, "_blank");
      }
    });
  };

  const handleUpdateRepairStatus = async (ticket) => {
    const isDark = theme === "dark";
    const safeTicketNo = escapeHtml(
      ticket?.ticket_no || `IT-${String(ticket?.id || "").padStart(5, "0")}`,
    );
    const currentDetailKey = getTicketStatusDetailMeta(ticket)?.key || "WORKING";
    const currentNote = String(ticket?.solution_note || "").trim();
    const fieldClass = isDark
      ? "w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/30"
      : "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/20";
    const helperClass = isDark ? "text-slate-400" : "text-slate-500";
    const labelClass = isDark ? "text-slate-200" : "text-slate-700";
    const sectionClass = isDark
      ? "rounded-2xl border border-slate-700 bg-slate-800/70 p-4"
      : "rounded-2xl border border-slate-200 bg-slate-50 p-4";
    const cancelButtonClass = isDark
      ? "inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
      : "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300";
    const optionMarkup = (options) =>
      options
        .map(
          (option) => `
            <option value="${option.key}" ${currentDetailKey === option.key ? "selected" : ""}>
              ${escapeHtml(option.label)}
            </option>
          `,
        )
        .join("");
    const activeOptions = TICKET_REPAIR_STATUS_OPTIONS.filter((item) => item.lifecycle === "active");
    const closedOptions = TICKET_REPAIR_STATUS_OPTIONS.filter((item) => item.lifecycle === "closed");
    const resolvedClosedOption = {
      key: "RESOLVED_CLOSED",
      label: "ซ่อมเสร็จแล้ว",
      helper: "ล้างสถานะปิดแบบซ่อมไม่สำเร็จ และบันทึกเป็นปิดงานซ่อมเสร็จแล้ว",
    };
    const closeModeOptions = ticket?.status === "CLOSED"
      ? [resolvedClosedOption, ...closedOptions]
      : closedOptions;
    const closedOptionGroupLabel = ticket?.status === "CLOSED"
      ? "อัปเดตสถานะปิดงาน"
      : "ปิดงานแบบไม่สำเร็จ";

    const { value: formValues } = await Swal.fire({
      title: `<span class="${isDark ? "text-slate-100" : "text-slate-900"}">บันทึกสถานะงาน</span>`,
      html: `
        <div class="space-y-4 text-left">
          <div class="${sectionClass}">
            <p class="text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}">Ticket ${safeTicketNo}</p>
            <p class="mt-1 text-[11px] ${helperClass}">ใช้สำหรับงานที่ยังทำไม่จบ, ต้องรอ, หรือปิดแบบไม่สามารถซ่อมต่อได้</p>
          </div>

          <div class="${sectionClass}">
            <label class="mb-1.5 block text-xs font-semibold ${labelClass}">สถานะงาน</label>
            <select id="swal-progress-status" class="${fieldClass}">
              <optgroup label="กลับมาทำต่อ / ระหว่างดำเนินการ">
                ${optionMarkup(activeOptions)}
              </optgroup>
              <optgroup label="${closedOptionGroupLabel}">
                ${optionMarkup(closeModeOptions)}
              </optgroup>
            </select>
            <p id="swal-progress-helper" class="mt-2 text-[11px] ${helperClass}"></p>
          </div>

          <div class="${sectionClass}">
            <label class="mb-1.5 block text-xs font-semibold ${labelClass}">บันทึก / เหตุผล</label>
            <textarea
              id="swal-progress-note"
              class="${fieldClass}"
              rows="4"
              placeholder="เช่น รอพัดลม CPU จาก supplier / อยู่ระหว่างขออนุมัติซื้ออะไหล่ / ตรวจสอบแล้วเมนบอร์ดเสียและไม่มีอะไหล่รองรับ"
            >${escapeHtml(currentNote)}</textarea>
            <p class="mt-2 text-[11px] ${helperClass}">บันทึกสาเหตุให้ชัด เพื่อให้ผู้แจ้งและทีมรู้ว่าทำไมงานยังไม่จบ</p>
          </div>
        </div>
      `,
      background: isDark ? "#0f172a" : "#ffffff",
      color: isDark ? "#fff" : "#1f2937",
      showCancelButton: true,
      confirmButtonText: "บันทึกสถานะ",
      cancelButtonText: "ยกเลิก",
      focusConfirm: false,
      showLoaderOnConfirm: true,
      buttonsStyling: false,
      customClass: {
        popup: isDark
          ? "w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
          : "w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl",
        title: "font-semibold",
        htmlContainer: "!px-5 !pt-2 !pb-0 sm:!px-6",
        actions: "!mt-4 !w-full !justify-end !gap-2 !px-5 !pb-5 sm:!px-6",
        confirmButton:
          "inline-flex items-center justify-center rounded-xl bg-[#2b59b0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244a95] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/30",
        cancelButton: cancelButtonClass,
      },
      didOpen: () => {
        const selectEl = document.getElementById("swal-progress-status");
        const helperEl = document.getElementById("swal-progress-helper");
        const helperSource = [...activeOptions, ...closeModeOptions];
        const updateHelper = () => {
          const selectedKey = selectEl?.value || "WORKING";
          const selectedOption = helperSource.find((item) => item.key === selectedKey);
          if (helperEl) {
            helperEl.textContent = selectedOption?.helper || "";
          }
        };

        updateHelper();
        selectEl?.addEventListener("change", updateHelper);
      },
      preConfirm: () => {
        const detailKey = document.getElementById("swal-progress-status")?.value || "WORKING";
        const note = document.getElementById("swal-progress-note")?.value || "";

        if (note.trim().length < 6) {
          Swal.showValidationMessage('<span class="text-rose-400">กรุณาระบุบันทึกอย่างน้อย 6 ตัวอักษร</span>');
          return false;
        }

        return {
          detailKey,
          note: note.trim(),
        };
      },
    });

    if (!formValues) return;

    try {
      const isResolvedClosed = formValues.detailKey === "RESOLVED_CLOSED";
      const fallbackStatus = ticket?.status === "CLOSED" ? "IN_PROGRESS" : (ticket?.status || "IN_PROGRESS");
      const nextStatus = isResolvedClosed
        ? "CLOSED"
        : getTicketStatusLifecycle(formValues.detailKey, fallbackStatus);
      const nextParts = isResolvedClosed
        ? stripTicketStatusDetailFromParts(ticket?.parts_used || "")
        : embedTicketStatusDetailInParts(ticket?.parts_used || "", formValues.detailKey);
      const updatePayload = {
        status: nextStatus,
        solution_note: formValues.note,
        parts_used: nextParts || null,
        updated_at: new Date().toISOString(),
      };

      if (nextStatus === "CLOSED") {
        updatePayload.closed_at = new Date().toISOString();
        updatePayload.closed_by = currentUser?.id;
        updatePayload.closed_by_name = currentUser?.name;
      } else if (!ticket?.started_at) {
        updatePayload.started_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tickets")
        .update(updatePayload)
        .eq("id", ticket.id);

      if (error) throw error;

      const nextTicketSnapshot = {
        ...ticket,
        status: nextStatus,
        parts_used: nextParts,
      };

      await fireThemedSwal({
        icon: "success",
        title: "บันทึกสถานะสำเร็จ",
        text: isResolvedClosed
          ? 'อัปเดตเป็น "ซ่อมเสร็จแล้ว" เรียบร้อยแล้ว'
          : `อัปเดตเป็น "${getTicketStatusLabel(nextTicketSnapshot)}" เรียบร้อยแล้ว`,
        timer: 2200,
        showConfirmButton: false,
      }, "success");

      setActiveTab(nextStatus === "CLOSED" ? "HISTORY" : "ACTIVE");
      fetchTickets();
    } catch (error) {
      console.error("Error updating repair status:", error);
      fireThemedSwal({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถบันทึกสถานะงานได้ กรุณาลองใหม่อีกครั้ง",
      }, "danger");
    }
  };

  // Close job
  const handleCloseJob = async (ticket) => {
    const isDark = theme === "dark";
    const safeTicketNo = escapeHtml(
      ticket?.ticket_no || `IT-${String(ticket?.id || "").padStart(5, "0")}`,
    );
    const popupClass = isDark
      ? "w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900  shadow-2xl"
      : "w-full max-w-2xl rounded-3xl border border-slate-200 bg-white  shadow-2xl";
    const shellClass = isDark ? "text-slate-100" : "text-slate-900";
    const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
    const sectionClass = isDark
      ? "rounded-2xl border border-slate-700 bg-slate-800/70 p-3"
      : "rounded-2xl border border-slate-200 bg-slate-50 p-3";
    const labelClass = isDark ? "text-slate-300" : "text-slate-700";
    const fieldClass = isDark
      ? "w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/30"
      : "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/20";
    const helperClass = isDark ? "text-slate-500" : "text-slate-500";
    const chipClass = isDark
      ? "inline-flex items-center rounded-full border border-[#2b59b0]/40 bg-[#2b59b0]/15 px-2.5 py-1 text-[11px] font-semibold text-[#9dbbf8]"
      : "inline-flex items-center rounded-full border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-2.5 py-1 text-[11px] font-semibold text-[#2b59b0]";
    const cancelButtonClass = isDark
      ? "inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
      : "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300";
    const attachTriggerClass = isDark
      ? "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-slate-200 transition hover:bg-slate-700"
      : "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50";
    const attachMenuClass = isDark
      ? "absolute right-0 top-full z-30 mt-2 hidden w-48 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl"
      : "absolute right-0 top-full z-30 mt-2 hidden w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl";
    const attachMenuButtonClass = isDark
      ? "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
      : "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
    const pasteZoneClass = isDark
      ? "mt-3 rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900/60 p-4 outline-none transition hover:border-[#2b59b0]/60 focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/30"
      : "mt-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white/90 p-4 outline-none transition hover:border-[#2b59b0]/50 focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/20";
    const previewCardClass = isDark
      ? "mt-3 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900"
      : "mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white";
    const previewFooterClass = isDark
      ? "flex items-center justify-between gap-3 border-t border-slate-700 bg-slate-900/80 px-4 py-3"
      : "flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3";
    const removeButtonClass = isDark
      ? "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-slate-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
      : "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600";
    const cameraPanelClass = isDark
      ? "mt-3 hidden overflow-hidden rounded-2xl border border-slate-700 bg-slate-950"
      : "mt-3 hidden overflow-hidden rounded-2xl border border-slate-200 bg-slate-950";
    const smallGhostButtonClass = isDark
      ? "inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
      : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50";
    const primaryCameraButtonClass = "inline-flex items-center gap-2 rounded-xl bg-[#2b59b0] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#244a95]";
    const paperclipIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.82l8.49-8.48"/></svg>';
    const cameraIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/></svg>';
    const imageIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
    const fileIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
    const pasteIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2"/><path d="M12 2H8a2 2 0 0 0-2 2v4h6V2Z"/><path d="M2 14h10"/><path d="m5 11-3 3 3 3"/></svg>';
    const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    const previewCardLabelClass = isDark ? "text-slate-100" : "text-slate-800";
    const previewCardMetaClass = isDark ? "text-slate-400" : "text-slate-500";
    const existingEvidenceHint = ticket?.image_after_url ? "ไม่เลือกใหม่จะใช้หลักฐานเดิม" : "ยังไม่ได้เลือกหลักฐาน";
    let selectedEvidenceFile = null;
    let selectedEvidencePreviewUrl = null;
    let activeCameraStream = null;
    let popupElement = null;
    let attachMenuWrap = null;
    let attachMenu = null;
    let attachTrigger = null;
    let openCameraButton = null;
    let openGalleryButton = null;
    let openFileButton = null;
    let galleryInput = null;
    let genericFileInput = null;
    let pasteZone = null;
    let fileMeta = null;
    let attachmentPreview = null;
    let cameraPanel = null;
    let cameraVideo = null;
    let cameraCloseButton = null;
    let cameraCaptureButton = null;

    const hideAttachMenu = () => {
      attachMenu?.classList.add("hidden");
    };

    const stopCamera = () => {
      if (activeCameraStream) {
        activeCameraStream.getTracks().forEach((track) => track.stop());
        activeCameraStream = null;
      }
      if (cameraVideo) {
        cameraVideo.srcObject = null;
      }
      cameraPanel?.classList.add("hidden");
    };

    const revokePreviewUrl = () => {
      if (selectedEvidencePreviewUrl && selectedEvidencePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(selectedEvidencePreviewUrl);
      }
      selectedEvidencePreviewUrl = null;
    };

    const renderSelectedEvidence = () => {
      if (!attachmentPreview || !fileMeta) return;

      if (!selectedEvidenceFile) {
        attachmentPreview.classList.add("hidden");
        attachmentPreview.innerHTML = "";
        fileMeta.textContent = existingEvidenceHint;
        return;
      }

      const safeName = escapeHtml(selectedEvidenceFile.name || "attachment");
      const sizeLabel = formatAttachmentSize(selectedEvidenceFile.size);
      const previewMeta = escapeHtml(sizeLabel);
      const isImage = isImageLikeFile(selectedEvidenceFile);

      if (isImage && selectedEvidencePreviewUrl) {
        attachmentPreview.innerHTML = `
          <div class="${previewCardClass}">
            <img src="${selectedEvidencePreviewUrl}" alt="${safeName}" class="aspect-video w-full object-cover" />
            <div class="${previewFooterClass}">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold ${previewCardLabelClass}">${safeName}</p>
                <p class="text-[11px] ${previewCardMetaClass}">${previewMeta}</p>
              </div>
              <button type="button" id="swal-remove-attachment" class="${removeButtonClass}" aria-label="ลบหลักฐาน">
                ${closeIcon}
              </button>
            </div>
          </div>
        `;
      } else {
        attachmentPreview.innerHTML = `
          <div class="${previewCardClass}">
            <div class="flex items-center justify-between gap-3 px-4 py-4">
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  ${fileIcon}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold ${previewCardLabelClass}">${safeName}</p>
                  <p class="text-[11px] ${previewCardMetaClass}">${previewMeta}</p>
                </div>
              </div>
              <button type="button" id="swal-remove-attachment" class="${removeButtonClass}" aria-label="ลบหลักฐาน">
                ${closeIcon}
              </button>
            </div>
          </div>
        `;
      }

      attachmentPreview.classList.remove("hidden");
      fileMeta.textContent = `${isImage ? "พร้อมอัปโหลดรูป" : "พร้อมอัปโหลดไฟล์"} • ${sizeLabel}`;
      attachmentPreview.querySelector("#swal-remove-attachment")?.addEventListener("click", clearSelectedEvidence);
    };

    function clearSelectedEvidence() {
      selectedEvidenceFile = null;
      revokePreviewUrl();
      if (galleryInput) galleryInput.value = "";
      if (genericFileInput) genericFileInput.value = "";
      renderSelectedEvidence();
    }

    const applySelectedEvidence = (rawFile) => {
      if (!rawFile) return false;

      const normalizedFile =
        rawFile instanceof File && rawFile.name
          ? rawFile
          : new File([rawFile], inferClipboardFileName(rawFile), {
              type: rawFile?.type || "application/octet-stream",
            });

      if (normalizedFile.size > CLOSE_JOB_MAX_FILE_SIZE) {
        toast.error("ไฟล์ต้องไม่เกิน 5MB");
        return false;
      }

      selectedEvidenceFile = normalizedFile;
      revokePreviewUrl();
      selectedEvidencePreviewUrl = isImageLikeFile(normalizedFile) ? URL.createObjectURL(normalizedFile) : null;
      hideAttachMenu();
      stopCamera();
      renderSelectedEvidence();
      return true;
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("อุปกรณ์นี้ไม่รองรับกล้อง");
        return;
      }

      try {
        stopCamera();
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        activeCameraStream = stream;
        if (cameraVideo) {
          cameraVideo.srcObject = stream;
          await cameraVideo.play?.();
        }
        cameraPanel?.classList.remove("hidden");
        hideAttachMenu();
      } catch (error) {
        console.error("Close job camera error:", error);
        toast.error("เปิดกล้องไม่ได้");
      }
    };

    const captureFromCamera = async () => {
      if (!cameraVideo) {
        toast.error("กล้องไม่พร้อมใช้งาน");
        return;
      }

      const width = cameraVideo.videoWidth || 1280;
      const height = cameraVideo.videoHeight || 720;
      if (!width || !height) {
        toast.error("จับภาพไม่ได้");
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context?.drawImage(cameraVideo, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("จับภาพไม่ได้");
          return;
        }

        const capturedFile = new File([blob], `after_${ticket.id}_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        applySelectedEvidence(capturedFile);
      }, "image/jpeg", 0.92);
    };

    const { value: formValues } = await Swal.fire({
      title: `<span class="${shellClass}">ปิดงาน</span>`,
      html: `
        <div class="space-y-3 text-left ">
          <div class="${sectionClass}">
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <div class="flex flex-wrap items-center gap-2">
              <span class="${chipClass}">Ticket ${safeTicketNo}</span>
              <span class="${chipClass}">5 หัวข้อ</span>
              </div>
            </div>
            <p class="text-sm font-semibold ${shellClass}">สรุปงานซ่อม</p>
            <p class="mt-1 text-[11px] ${mutedClass}">
              กรอกสั้น ๆ ให้ครบ
            </p>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-xs font-semibold ${labelClass}">ปัญหาที่พบ (Problem)</label>
              <textarea id="swal-problem" class="${fieldClass}" rows="2" placeholder="เช่น เปิดเครื่องไม่ติด / เครื่องค้าง / มีเสียงดังผิดปกติ"></textarea>
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-semibold ${labelClass}">สาเหตุของปัญหา (Root Cause)</label>
              <textarea id="swal-root-cause" class="${fieldClass}" rows="2" placeholder="เช่น สายไฟ/พอร์ตหลวม หรือการตั้งค่าระบบผิดพลาด"></textarea>
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-semibold ${labelClass}">ผลการทดสอบหลังแก้ไข (Result)</label>
              <textarea id="swal-result" class="${fieldClass}" rows="2" placeholder="เช่น ทดสอบใช้งาน 15 นาที ระบบกลับมาปกติ"></textarea>
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-xs font-semibold ${labelClass}">วิธีการแก้ไข (Solution)</label>
              <textarea id="swal-solution" class="${fieldClass}" rows="3" placeholder="เช่น ตรวจเช็กอุปกรณ์ ปรับการเชื่อมต่อและตั้งค่าใหม่"></textarea>
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-xs font-semibold ${labelClass}">อะไหล่ที่ใช้ (Parts Used)</label>
              <input id="swal-parts" class="${fieldClass}" placeholder="เช่น ไม่มีการเปลี่ยนอะไหล่ / พัดลม CPU 1 ตัว" />
            </div>
          </div>

          <div class="${sectionClass}">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <label class="mb-1.5 block text-xs font-semibold ${labelClass}">หลักฐาน (ไม่บังคับ)</label>
                <p class="text-[11px] ${helperClass}">กล้อง / รูปภาพ / ไฟล์ / Ctrl+V</p>
              </div>
              <div id="swal-attach-menu-wrap" class="relative">
                <button type="button" id="swal-attach-trigger" class="${attachTriggerClass}" aria-label="เพิ่มหลักฐาน">
                  ${paperclipIcon}
                </button>
                <div id="swal-attach-menu" class="${attachMenuClass}">
                  <button type="button" id="swal-open-camera" class="${attachMenuButtonClass}">
                    <span class="text-[#2b59b0]">${cameraIcon}</span>
                    <span>กล้อง</span>
                  </button>
                  <button type="button" id="swal-open-gallery" class="${attachMenuButtonClass}">
                    <span class="text-emerald-600">${imageIcon}</span>
                    <span>รูปภาพ</span>
                  </button>
                  <button type="button" id="swal-open-file" class="${attachMenuButtonClass}">
                    <span class="text-amber-600">${fileIcon}</span>
                    <span>ไฟล์</span>
                  </button>
                </div>
              </div>
            </div>

            <input type="file" id="swal-image-file" accept="${CLOSE_JOB_IMAGE_ACCEPT}" class="hidden" />
            <input type="file" id="swal-file-input" accept="${CLOSE_JOB_FILE_ACCEPT}" class="hidden" />

            <div id="swal-paste-zone" tabindex="0" class="${pasteZoneClass}">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2b59b0]/10 text-[#2b59b0]">
                  ${pasteIcon}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold ${shellClass}">วางภาพหรือไฟล์</p>
                  <p class="text-[11px] ${helperClass}">Win + Shift + S แล้ว Ctrl + V</p>
                </div>
              </div>
            </div>

            <div id="swal-camera-panel" class="${cameraPanelClass}">
              <div class="relative p-3">
                <video id="swal-camera-video" autoplay playsinline class="aspect-video w-full rounded-xl object-cover"></video>
                <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p class="text-[11px] text-white/75">ถ่ายภาพหน้างานแล้วใช้เป็นหลักฐานได้ทันที</p>
                  <div class="flex flex-wrap gap-2">
                    <button type="button" id="swal-camera-close" class="${smallGhostButtonClass}">ปิด</button>
                    <button type="button" id="swal-camera-capture" class="${primaryCameraButtonClass}">
                      ${cameraIcon}
                      <span>จับภาพ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p id="swal-file-meta" class="mt-3 text-[11px] ${helperClass}">${existingEvidenceHint}</p>
            <div id="swal-attachment-preview" class="hidden"></div>
          </div>

          <div class="${sectionClass}">
            <p class="text-[11px] leading-relaxed ${helperClass}">
              ปัญหา > สาเหตุ > วิธีแก้ > ผล
            </p>
          </div>
        </div>
      `,
      background: isDark ? "#0f172a" : "#ffffff",
      color: isDark ? "#fff" : "#1f2937",
      showCancelButton: true,
      confirmButtonText: "ปิดงาน",
      confirmButtonColor: "#2b59b0",
      cancelButtonText: "ยกเลิก",
      focusConfirm: false,
      showLoaderOnConfirm: true,
      buttonsStyling: false,
      customClass: {
        popup: popupClass,
        title: " font-semibold",
        htmlContainer: "!overflow-visible !px-5 !pt-2 !pb-0 sm:!px-6",
        actions: "!mt-4 !w-full !justify-end !gap-2 !px-5 !pb-5 sm:!px-6",
        confirmButton:
          "inline-flex items-center justify-center rounded-xl bg-[#2b59b0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244a95] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/30",
        cancelButton: cancelButtonClass,
      },
      didOpen: () => {
        const problemEl = document.getElementById("swal-problem");
        if (problemEl && typeof problemEl.focus === "function") {
          problemEl.focus();
          problemEl.setSelectionRange?.(problemEl.value.length, problemEl.value.length);
        }

        popupElement = Swal.getPopup();
        attachMenuWrap = document.getElementById("swal-attach-menu-wrap");
        attachMenu = document.getElementById("swal-attach-menu");
        attachTrigger = document.getElementById("swal-attach-trigger");
        openCameraButton = document.getElementById("swal-open-camera");
        openGalleryButton = document.getElementById("swal-open-gallery");
        openFileButton = document.getElementById("swal-open-file");
        galleryInput = document.getElementById("swal-image-file");
        genericFileInput = document.getElementById("swal-file-input");
        pasteZone = document.getElementById("swal-paste-zone");
        fileMeta = document.getElementById("swal-file-meta");
        attachmentPreview = document.getElementById("swal-attachment-preview");
        cameraPanel = document.getElementById("swal-camera-panel");
        cameraVideo = document.getElementById("swal-camera-video");
        cameraCloseButton = document.getElementById("swal-camera-close");
        cameraCaptureButton = document.getElementById("swal-camera-capture");

        attachTrigger?.addEventListener("click", () => {
          attachMenu?.classList.toggle("hidden");
        });

        popupElement?.addEventListener("click", (event) => {
          if (attachMenuWrap && !attachMenuWrap.contains(event.target)) {
            hideAttachMenu();
          }
        });

        openCameraButton?.addEventListener("click", startCamera);
        openGalleryButton?.addEventListener("click", () => {
          hideAttachMenu();
          galleryInput?.click();
        });
        openFileButton?.addEventListener("click", () => {
          hideAttachMenu();
          genericFileInput?.click();
        });
        galleryInput?.addEventListener("change", (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          applySelectedEvidence(file);
          event.target.value = "";
        });
        genericFileInput?.addEventListener("change", (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          applySelectedEvidence(file);
          event.target.value = "";
        });
        pasteZone?.addEventListener("click", () => pasteZone.focus());
        pasteZone?.addEventListener("paste", (event) => {
          const clipboardItems = Array.from(event.clipboardData?.items || []);
          const clipboardFileItem = clipboardItems.find((item) => item.kind === "file");
          const clipboardFile = clipboardFileItem?.getAsFile?.() || event.clipboardData?.files?.[0];

          if (!clipboardFile) return;

          event.preventDefault();
          applySelectedEvidence(clipboardFile);
        });
        cameraCloseButton?.addEventListener("click", stopCamera);
        cameraCaptureButton?.addEventListener("click", captureFromCamera);
        renderSelectedEvidence();
      },
      willClose: () => {
        stopCamera();
        revokePreviewUrl();
      },
      preConfirm: () => {
        const problem = document.getElementById("swal-problem")?.value || "";
        const rootCause = document.getElementById("swal-root-cause")?.value || "";
        const solution = document.getElementById("swal-solution")?.value || "";
        const parts = document.getElementById("swal-parts")?.value || "";
        const result = document.getElementById("swal-result")?.value || "";

        if (!problem.trim() || !rootCause.trim() || !solution.trim() || !result.trim()) {
          Swal.showValidationMessage('<span class="text-rose-400">กรุณากรอกข้อมูลให้ครบทุกหัวข้อหลักก่อนบันทึก</span>');
          return false;
        }

        const normalizedParts = parts.trim() || "ไม่มีการเปลี่ยนอะไหล่";
        const report = buildStructuredRepairReport({
          problem: problem.trim(),
          rootCause: rootCause.trim(),
          solution: solution.trim(),
          partsUsed: normalizedParts,
          result: result.trim(),
        });

        return { solution: report, parts: normalizedParts, file: selectedEvidenceFile || null };
      },
    });

    if (!formValues) return;

    try {
      let publicUrl = ticket?.image_after_url || null;

      if (formValues.file) {
        const fileExt = formValues.file.name.split(".").pop() || "jpg";
        const fileName = `after_${ticket.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("ticket-images")
          .upload(fileName, formValues.file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl: uploadedUrl },
        } = supabase.storage.from("ticket-images").getPublicUrl(fileName);
        publicUrl = uploadedUrl || publicUrl;
      }

      const { error: dbError } = await supabase
        .from("tickets")
        .update({
          status: "CLOSED",
          solution_note: formValues.solution,
          parts_used: formValues.parts,
          image_after_url: publicUrl,
          closed_at: new Date().toISOString(),
          closed_by: currentUser?.id,
          closed_by_name: currentUser?.name,
        })
        .eq("id", ticket.id);

      if (dbError) throw dbError;

      await fireThemedSwal({
        icon: "success",
        title: "ปิดงานสำเร็จ",
        text: "อัปเดตสถานะและบันทึกรายงานเรียบร้อยแล้ว",
        timer: 2200,
        showConfirmButton: false,
      }, "success");

      setActiveTab("HISTORY");
      fetchTickets();
    } catch (error) {
      console.error("Error closing job:", error);
      fireThemedSwal({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        html: `
          <div class="text-sm">ไม่สามารถบันทึกและปิดงานได้ กรุณาลองใหม่อีกครั้ง</div>
          ${error?.message ? `<div class="mt-2 text-xs text-slate-500">รายละเอียดระบบ: ${error.message}</div>` : ""}
        `,
      }, "danger");
    }
  };

  const getModalStatusConfig = (ticketOrStatus) => {
    const status = typeof ticketOrStatus === "object" ? ticketOrStatus?.status : ticketOrStatus;
    const detailMeta = typeof ticketOrStatus === "object" ? getTicketStatusDetailMeta(ticketOrStatus) : null;

    if (detailMeta?.tone === "rose") {
      return {
        label: detailMeta.label,
        bg: "bg-rose-50",
        color: "text-rose-700",
        border: "border-rose-200",
      };
    }

    if (detailMeta?.tone === "sky") {
      return {
        label: detailMeta.label,
        bg: "bg-sky-50",
        color: "text-sky-700",
        border: "border-sky-200",
      };
    }

    if (detailMeta?.tone === "violet") {
      return {
        label: detailMeta.label,
        bg: "bg-violet-50",
        color: "text-violet-700",
        border: "border-violet-200",
      };
    }

    if (detailMeta?.tone === "slate") {
      return {
        label: detailMeta.label,
        bg: "bg-slate-100",
        color: "text-slate-700",
        border: "border-slate-200",
      };
    }

    if (detailMeta?.tone === "amber") {
      return {
        label: detailMeta.label,
        bg: "bg-amber-50",
        color: "text-amber-700",
        border: "border-amber-200",
      };
    }

    switch (status) {
      case "NEW":
        return {
          label: "ใหม่",
          bg: "bg-rose-50",
          color: "text-rose-700",
          border: "border-rose-200",
        };
      case "IN_PROGRESS":
        return {
          label: "กำลังดำเนินการ",
          bg: "bg-amber-50",
          color: "text-amber-700",
          border: "border-amber-200",
        };
      case "CLOSED":
        return {
          label: "ปิดงานแล้ว",
          bg: "bg-emerald-50",
          color: "text-emerald-700",
          border: "border-emerald-200",
        };
      default:
        return {
          label: getTicketStatusLabel(ticketOrStatus),
          bg: "bg-slate-50",
          color: "text-slate-700",
          border: "border-slate-200",
        };
    }
  };

  const getModalPriorityConfig = (priority) => {
    switch (priority) {
      case "urgent":
        return {
          label: "ด่วนมาก",
          color: "bg-rose-600",
        };
      case "normal":
        return {
          label: "สำคัญ",
          color: "bg-amber-500",
        };
      case "low":
        return {
          label: "ปกติ",
          color: "bg-emerald-600",
        };
      default:
        return {
          label: getPriorityText(priority),
          color: "bg-slate-500",
        };
    }
  };

  const formatTicketDate = (dateValue) => {
    if (!dateValue) return "-";
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // View ticket details
  const handleViewDetails = (ticket) => {
    setDetailTicket(ticket);
  };

  const resolveTicketChatTargetId = (ticket) => {
    const candidateIds = [
      ticket?.creator_id,
      ticket?.created_by,
      ticket?.requester_id,
      ticket?.user_id,
      ticket?.reporter_user_id,
      ticket?.reporter_id,
    ];

    return candidateIds
      .map((value) => normalizeText(value))
      .find((value) => isUuidLike(value) && value !== currentUser?.id) || "";
  };

  const handleOpenCaseChat = async (ticket) => {
    const reporterUserId = resolveTicketChatTargetId(ticket);

    if (!reporterUserId) {
      await fireThemedSwal(
        {
          icon: "info",
          title: "ยังเปิดแชทไม่ได้",
          text: "เคสนี้ยังไม่มีบัญชีผู้แจ้งที่เชื่อมกับแชทกลาง",
        },
        "primary",
      );
      return;
    }

    setDetailTicket(null);
    setChatOpenTarget(`user:${reporterUserId}`);
    setChatOpenSignal((previous) => previous + 1);
  };

  const handleCreateWalkInTicket = async (payload) => {
    const record = await createWalkInTicket(payload);
    await fetchTickets();
    setCurrentPage(DASHBOARD_PAGE_IDS.HISTORY);
    setActiveTab("HISTORY");
    toast.success(`บันทึก Walk-in เข้าประวัติแล้ว${record?.ticket_no ? ` #${record.ticket_no}` : ""}`);
    return record;
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
      className={`app-theme min-h-screen transition-colors duration-500 ${uiTheme.appFont} ${uiTheme.pageBackground} ${theme === "dark" ? "dark" : ""
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
        onOpenExecutiveAssets={() => navigate("/reports/executive/assets-management")}
        notificationCount={notificationCount}
        serviceRequestNotificationCount={serviceRequestNotificationCount}
        notebookNotificationCount={notebookNotificationCount}
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

        <main className="mx-auto max-w-[1440px] px-6 py-4 lg:py-5">
          <ITDashboardPageRenderer
            currentPage={currentPage}
            onNavigatePage={handleNavigatePage}
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
            onOpenWalkInTicket={() => setIsWalkInTicketOpen(true)}
            quickFilter={quickFilter}
            onQuickFilterChange={setQuickFilter}
            sortedTickets={sortedTickets}
            tickets={tickets}
            serviceRequests={serviceRequests}
            onOpenRepairFromOverview={handleOpenRepairFromOverview}
            onPickUpEquipment={() => navigate("/pick-up-equipment")}
            onRefreshData={fetchTickets}
            loading={loading}
            isMobile={isMobile}
            dateRange={dateRange}
            setDateRange={setDateRange}
            viewMode={viewMode}
            setViewMode={setViewMode}
            historyTickets={historyTickets}
            currentUser={currentUser}
            handleAcceptJob={handleAcceptJob}
            handleOpenCaseChat={handleOpenCaseChat}
            handleUpdateRepairStatus={handleUpdateRepairStatus}
            handleCloseJob={handleCloseJob}
            handleDeleteTicket={handleDeleteTicket}
            handleViewDetails={handleViewDetails}
            handleOpenNavigation={handleOpenNavigation}
            onCurrentUserUpdate={(patch) => {
              setCurrentUser((previous) => (previous ? { ...previous, ...patch } : previous));
            }}
          />
        </main>

        <TicketDetailModal
          ticket={detailTicket}
          onClose={() => setDetailTicket(null)}
          onNewTicket={() => navigate("/create-ticket")}
          getStatusConfig={getModalStatusConfig}
          getPriorityConfig={getModalPriorityConfig}
          formatDate={formatTicketDate}
          currentUser={{
            id: currentUser?.id,
            name: currentUser?.name || "IT Technician",
            role: currentUser?.role || "it_support",
            avatar: currentUser?.avatar || "",
          }}
        />

        <CentralChatDock
          currentUser={currentUser}
          openSignal={chatOpenSignal}
          openSignalTarget={chatOpenTarget}
          className="bottom-4 left-4 sm:bottom-6 sm:left-6"
        />

        <WalkInTicketModal
          isOpen={isWalkInTicketOpen}
          onClose={() => setIsWalkInTicketOpen(false)}
          onSubmit={handleCreateWalkInTicket}
          currentUser={currentUser}
          theme={theme}
        />

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






