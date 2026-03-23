import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
// ^^^ à¸•à¹‰à¸­à¸‡à¸¡à¸µ useRef à¸­à¸¢à¸¹à¹ˆà¸•à¸£à¸‡à¸™à¸µà¹‰à¸”à¹‰à¸§à¸¢
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Wrench, Package, Laptop, ChevronRight,
  ChevronDown, ChevronUp,
  User, Briefcase, Building2, ExternalLink, Clock, CheckCircle2,
  AlertCircle, Plus, Search, RefreshCw,
  BarChart3, Calendar, Hash, Shield,
  Timer, ShieldCheck, Mail, Phone, MapPin, Settings,
  SlidersHorizontal, BookmarkPlus, Trash2, Moon, Sun, MessageSquare, FileText, DoorOpen, KeyRound, X
} from "lucide-react";
import Swal from "sweetalert2";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
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
  FILTER_OPTIONS,
  PRIORITY_CONFIG,
  PRIORITY_FILTER_OPTIONS,
  ROLE_BASED_VIEWS,
  ROLE_LABELS,
  SLA_FILTER_OPTIONS,
  SMART_FILTER_PRESET_KEY,
  STATUS_CONFIG,
  getSlaState,
  resolveCategoryIcon,
} from "./dashboard/constants";
import TicketDetailModal from "./dashboard/components/TicketDetailModal";
import ProfileImageModal from "./dashboard/components/ProfileImageModal";
import LogoutConfirmModal from "./dashboard/components/LogoutConfirmModal";
import DashboardGlobalStyles from "./dashboard/components/DashboardGlobalStyles";
import SupportSection from "./dashboard/components/SupportSection";
import CentralChatDock from "../components/CentralChatDock";
import { loadMyNotebookBorrowLogs, NOTEBOOK_LOG_STATUS } from "../services/notebookBorrowService";
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

const TICKET_STATUS_LABELS = {
  NEW: "รอดำเนินการ",
  IN_PROGRESS: "กำลังซ่อม",
  CLOSED: "สำเร็จ",
};

function buildTicketStatusNotification(previousTicket, nextTicket) {
  const previousStatus = String(previousTicket?.status || "");
  const nextStatus = String(nextTicket?.status || "");
  const previousAssignee = String(previousTicket?.assigned_name || "");
  const nextAssignee = String(nextTicket?.assigned_name || "");
  const ticketNo = nextTicket?.ticket_no || `T${String(nextTicket?.id || "").slice(-6).toUpperCase()}`;

  if (nextAssignee && previousAssignee !== nextAssignee && previousStatus === nextStatus) {
    return {
      title: "IT รับเคสแล้ว",
      message: `${ticketNo} มอบหมายให้ ${nextAssignee}`,
      tone: "indigo",
    };
  }

  if (!nextStatus || previousStatus === nextStatus) return null;

  if (nextStatus === "IN_PROGRESS") {
    return {
      title: "IT เริ่มดำเนินการแล้ว",
      message: `${ticketNo} อยู่ระหว่างซ่อม${nextAssignee ? ` โดย ${nextAssignee}` : ""}`,
      tone: "amber",
    };
  }

  if (nextStatus === "CLOSED") {
    const solutionNote = String(nextTicket?.solution_note || "").trim();
    return {
      title: "งานเสร็จเรียบร้อยแล้ว",
      message: solutionNote ? `${ticketNo} ปิดงานแล้ว: ${solutionNote.slice(0, 80)}` : `${ticketNo} ปิดงานเรียบร้อยแล้ว`,
      tone: "emerald",
    };
  }

  return {
    title: "Ticket อัปเดตสถานะ",
    message: `${ticketNo} เปลี่ยนเป็น ${TICKET_STATUS_LABELS[nextStatus] || nextStatus}`,
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
  const searchInputRef = useRef(null);
  const notificationTimeoutsRef = useRef(new Map());
  const quickActionsSectionRef = useRef(null);

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

          if (payload.eventType === "UPDATE") {
            const nextNotification = buildTicketStatusNotification(payload.old, payload.new);
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
  }, []); // Dependency à¹€à¸›à¹‡à¸™à¸§à¹ˆà¸²à¸‡à¹€à¸›à¸¥à¹ˆà¸²à¹€à¸žà¸·à¹ˆà¸­à¹„à¸¡à¹ˆà¹ƒà¸«à¹‰à¹€à¸à¸´à¸”à¸à¸²à¸£à¸ªà¸£à¹‰à¸²à¸‡ function à¹ƒà¸«à¸¡à¹ˆà¸§à¸™à¸¥à¸¹à¸›

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
      setMeetingRoomError("ไม่สามารถโหลดสถานะห้องประชุมได้");
      setUpcomingMeetingBookings([]);
      setTodayMeetingBookings([]);
      setTomorrowMeetingBookings([]);
    } finally {
      if (!silent) setMeetingRoomLoading(false);
    }
  }, []);

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
      setAccessRequestError("ไม่สามารถโหลดสถานะคำขอสิทธิ์ระบบได้");
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
  }, []);

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
        setTickets(ticketsData);

        // Setup realtime after initial load
        setTimeout(() => {
          setupRealtimeSubscription(user.id);
        }, 100);

        // Calculate SLA stats
        calculateSlaStats(ticketsData);
      }

      const [workNotesRes, notebookLogsRes] = await Promise.all([
        supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "DONE"),
        loadMyNotebookBorrowLogs(),
      ]);

      if (!workNotesRes.error) {
        setWorkNotesPendingCount(Number(workNotesRes.count || 0));
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
      setDashboardError("ไม่สามารถโหลดข้อมูล Dashboard ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, [fetchAccessRequestSummary, navigate, setupAccessRequestRealtime, setupRealtimeSubscription]);

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
          title: booking.title || "มีการจอง",
          bookedBy: booking.booked_by || "ไม่ระบุผู้จอง",
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
        const statusSearchLabel = t.status === "NEW"
          ? "รอดำเนินการ"
          : t.status === "IN_PROGRESS"
            ? "กำลังซ่อม"
            : t.status === "CLOSED"
              ? "สำเร็จ ปิดงาน"
              : "";

        const prioritySearchLabel = PRIORITY_CONFIG[t.priority || "normal"]?.label || "";

        const haystack = [
          t.ticket_no,
          t.title,
          t.description,
          t.category,
          t.location,
          t.assigned_name,
          t.solution_note,
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
  }, [tickets, activeFilter, priorityFilter, categoryFilter, slaFilter, searchQuery]);

  const visibleTickets = useMemo(
    () => filteredTickets.slice(0, isCompactView ? 8 : 5),
    [filteredTickets, isCompactView],
  );

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
    const Icon = resolveCategoryIcon(category);
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
          label: "รอดำเนินการ",
          value: newCount,
          icon: Clock,
          iconWrap: "bg-amber-50",
          iconColor: "text-amber-600",
          valueColor: "text-amber-700",
          helperText: `${toPercent(newCount, pendingCount)}% ของงานค้าง`,
        },
        {
          key: "status-progress",
          mode: "status",
          label: "กำลังซ่อม",
          value: inProgressCount,
          icon: Wrench,
          iconWrap: "bg-blue-50",
          iconColor: "text-blue-600",
          valueColor: "text-blue-700",
          helperText: `${toPercent(inProgressCount, pendingCount)}% ของงานค้าง`,
        },
        {
          key: "status-closed",
          mode: "status",
          label: "ปิดงานแล้ว",
          value: closedCount,
          icon: CheckCircle2,
          iconWrap: "bg-emerald-50",
          iconColor: "text-emerald-600",
          valueColor: "text-emerald-700",
          helperText: `${toPercent(closedCount, Math.max(totalCount, 1))}% ของงานทั้งหมด`,
        },
        {
          key: "status-total",
          mode: "status",
          label: "งานที่แจ้งทั้งหมด",
          value: totalCount,
          icon: BarChart3,
          iconWrap: "bg-indigo-50",
          iconColor: "text-indigo-600",
          valueColor: "text-indigo-700",
          helperText: "อัปเดตสถานะล่าสุดแบบเรียลไทม์",
        },
      ];
    }

    return [
      {
        key: "open",
        label: "งานเปิดใหม่ (7 วัน)",
        value: openCurrent,
        icon: Clock,
        iconWrap: "bg-amber-50",
        iconColor: "text-amber-600",
        valueColor: "text-amber-700",
        trend: trendMeta(openCurrent, openPrevious),
      },
      {
        key: "risk",
        label: "งานเสี่ยง SLA",
        value: riskCurrent,
        icon: Timer,
        iconWrap: "bg-orange-50",
        iconColor: "text-orange-600",
        valueColor: "text-orange-700",
        trend: trendMeta(riskCurrent, riskPrevious),
      },
      {
        key: "overdue",
        label: "งานเกิน SLA",
        value: overdueCurrent,
        icon: AlertCircle,
        iconWrap: "bg-rose-50",
        iconColor: "text-rose-600",
        valueColor: "text-rose-700",
        trend: trendMeta(overdueCurrent, overduePrevious),
      },
      {
        key: "closed",
        label: "งานปิดแล้ว (7 วัน)",
        value: closedCurrent,
        icon: CheckCircle2,
        iconWrap: "bg-emerald-50",
        iconColor: "text-emerald-600",
        valueColor: "text-emerald-700",
        trend: trendMeta(closedCurrent, closedPrevious),
      },
    ];
  }, [tickets, profile?.role]);

  const openTicketCount = useMemo(
    () => tickets.filter((ticket) => ticket.status !== "CLOSED").length,
    [tickets],
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
      activeRoomCount: new Set(activeBookings.map((booking) => String(booking.room_name || "ไม่ระบุห้อง"))).size,
      totalRooms: todayRoomStatusCards.length,
      activeBookings,
    };
  }, [normalizedTodayMeetingBookings, todayRoomStatusCards]);

  const operationalStatusChartData = useMemo(() => {
    const rows = [
      { key: "NEW", label: "รอดำเนินการ", value: operationalSnapshot.new, fill: "#f59e0b" },
      { key: "IN_PROGRESS", label: "กำลังซ่อม", value: operationalSnapshot.inProgress, fill: "#2563eb" },
      { key: "CLOSED", label: "ปิดงาน", value: operationalSnapshot.closed, fill: "#10b981" },
    ];

    if (operationalSnapshot.otherOpen > 0) {
      rows.push({ key: "OTHER", label: "สถานะอื่น", value: operationalSnapshot.otherOpen, fill: "#64748b" });
    }

    return rows;
  }, [operationalSnapshot]);

  const operationalTrendData = useMemo(() => {
    const days = 7;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const rows = Array.from({ length: days }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (days - 1 - index));

      return {
        key: format(date, "yyyy-MM-dd"),
        label: format(date, "dd MMM", { locale: th }),
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
  }, [tickets]);

  const operationalLoadData = useMemo(() => {
    const rows = [
      { name: "Ticket ค้าง", value: operationalSnapshot.open, fill: "#2563eb" },
      { name: "ประชุมวันนี้", value: todayMeetingBookings.length, fill: "#14b8a6" },
      { name: "Notebook", value: notebookAttentionCount, fill: "#8b5cf6" },
      { name: "สิทธิ์รออนุมัติ", value: accessRequestSummary.pending, fill: "#f97316" },
      { name: "โน้ตค้าง", value: workNotesPendingCount, fill: "#0ea5e9" },
    ].filter((row) => row.value > 0);

    if (rows.length > 0) return rows;

    return [{ name: "ยังไม่มีคิว", value: 1, fill: "#cbd5e1", isPlaceholder: true }];
  }, [
    accessRequestSummary.pending,
    notebookAttentionCount,
    operationalSnapshot.open,
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
        const category = String(ticket.category || "ไม่ระบุหมวดหมู่").trim() || "ไม่ระบุหมวดหมู่";
        bucket.set(category, (bucket.get(category) || 0) + 1);
      });

    return [...bucket.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 4);
  }, [tickets]);

  const operationalOverviewStats = useMemo(
    () => [
      {
        key: "open",
        label: "งานค้างเปิด",
        value: operationalSnapshot.open,
        helper: `${operationalSnapshot.new} ใหม่ / ${operationalSnapshot.inProgress} กำลังซ่อม`,
        icon: BarChart3,
        iconWrap: "bg-indigo-50",
        iconColor: "text-indigo-600",
        valueColor: "text-indigo-700",
      },
      {
        key: "progress",
        label: "กำลังซ่อม",
        value: operationalSnapshot.inProgress,
        helper: "ติดตามงานที่กำลังดำเนินการอยู่",
        icon: Wrench,
        iconWrap: "bg-blue-50",
        iconColor: "text-blue-600",
        valueColor: "text-blue-700",
      },
      {
        key: "sla",
        label: "เสี่ยงหรือเกิน SLA",
        value: operationalSnapshot.risk + operationalSnapshot.overdue,
        helper: `${operationalSnapshot.overdue} งานเกิน SLA แล้ว`,
        icon: Timer,
        iconWrap: "bg-amber-50",
        iconColor: "text-amber-600",
        valueColor: "text-amber-700",
      },
      {
        key: "meeting-now",
        label: "ห้องใช้งานตอนนี้",
        value: meetingRealtimeSummary.activeRoomCount,
        helper: `จาก ${meetingRealtimeSummary.totalRooms} ห้อง, วันนี้ ${todayMeetingBookings.length} รายการ`,
        icon: Calendar,
        iconWrap: "bg-cyan-50",
        iconColor: "text-cyan-600",
        valueColor: "text-cyan-700",
      },
      {
        key: "notebook",
        label: "Notebook ต้องติดตาม",
        value: notebookAttentionCount,
        helper: "คำขอยืม-คืนและรายการที่รอจัดการ",
        icon: Laptop,
        iconWrap: "bg-violet-50",
        iconColor: "text-violet-600",
        valueColor: "text-violet-700",
      },
      {
        key: "access",
        label: "สิทธิ์รออนุมัติ",
        value: accessRequestSummary.pending,
        helper: "คำขอ workflow ที่ยังไม่ปิดงาน",
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
        badgeCount: openTicketCount,
        roles: ["user", "it_support", "executive", "admin"],
      },
      {
        id: "pick-up",
        label: "เบิกอุปกรณ์",
        description: "ขออุปกรณ์หรือวัสดุสิ้นเปลืองผ่าน workflow",
        icon: Package,
        accent: "emerald",
        cta: "ตรวจสอบสต็อก",
        onClick: () => navigate("/pick-up-equipment"),
        badgeCount: accessRequestSummary.pending,
        roles: ["user", "it_support", "executive", "admin"],
      },
      {
        id: "notebook-center",
        label: "การยืมคืน notebook",
        description: "เปิดหน้า Notebook Center สำหรับยืม-คืน notebook",
        icon: Laptop,
        accent: "violet",
        cta: "เปิดหน้า Notebook",
        onClick: () => navigate("/notebook-center"),
        badgeCount: notebookAttentionCount,
        roles: ["user", "it_support", "executive", "admin"],
      },
      {
        id: "work-notes",
        label: "โน้ตงาน / Work Notes",
        description: "บันทึกงาน วางแผนงาน และตั้งเตือนความจำส่วนตัว",
        icon: FileText,
        accent: "indigo",
        cta: "เปิดหน้าโน้ต",
        onClick: () => navigate("/work-notes"),
        badgeCount: workNotesPendingCount,
        roles: ["user", "it_support", "executive", "admin", "auditor"],
      },
      {
        id: "meeting-room-booking",
        label: "จองห้องประชุม",
        description: "จองห้องประชุมและจัดตารางเวลาการใช้งาน",
        icon: Calendar,
        accent: "sky",
        cta: "เปิดหน้าจอง",
        onClick: () => navigate("/meeting-room-booking"),
        badgeCount: upcomingMeetingCount,
        roles: ["user", "it_support", "executive", "admin"],
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
        badgeCount: openTicketCount,
        roles: ["user", "it_support", "executive", "admin", "auditor"],
      },
      {
        id: "chat-it",
        label: "แชท IT / แจ้งปัญหาด่วน",
        description: "คุยกับทีม IT แบบ realtime",
        icon: MessageSquare,
        accent: "emerald",
        cta: "เริ่มแชท",
        onClick: () => setSupportChatOpenSignal((value) => value + 1),
        roles: ["user", "it_support", "it_manager", "executive", "admin", "auditor"],
      },
      {
        id: "my-status",
        label: "สถานะของฉัน / ดู notebook, ticket และคำขอ",
        description: "สรุปสถานะทั้งหมดในหน้าเดียว",
        icon: CheckCircle2,
        accent: "sky",
        cta: "เปิดสถานะ",
        onClick: () => navigate("/my-status"),
        roles: ["user", "it_support", "it_manager", "executive", "admin", "auditor"],
      },
      {
        id: "access-request",
        label: "ขอสิทธิ์ระบบ",
        description: "ส่งคำขอสิทธิ์ ERP, Shared Folder, Email Group หรือ Software",
        icon: KeyRound,
        accent: "indigo",
        cta: "เปิดฟอร์มคำขอ",
        onClick: () => navigate("/access-request"),
        roles: ["user", "it_support", "executive", "admin", "auditor"],
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
  }, [accessRequestSummary.pending, activeFilter, navigate, notebookAttentionCount, openTicketCount, profile?.role, tickets, upcomingMeetingCount, workNotesPendingCount]);

  const primaryQuickActionIds = useMemo(
    () => new Set(["create-ticket", "pick-up", "notebook-center", "work-notes", "meeting-room-booking", "history"]),
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

  const canSeePriorityInbox = useMemo(() => {
    const role = profile?.role || "user";
    return role === "it_support" || role === "admin";
  }, [profile?.role]);

  const isDarkTheme = themeMode === "dark";
  const currentRole = profile?.role || "user";
  const isUserSearchMode = currentRole === "user" || currentRole === "executive";
  const roleLabel = ROLE_LABELS[currentRole] || ROLE_LABELS.user;
  const canOpenAuditView = currentRole === "admin" || currentRole === "auditor";

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const openMoreMenuPanel = useCallback(() => {
    setShowMoreQuickActions((value) => !value);
    const section = quickActionsSectionRef.current;
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
  const STAT_LABEL_CLASS = `text-xs font-bold uppercase tracking-wide ${TEXT_SUBTLE_CLASS}`;
  const STAT_VALUE_CLASS = "mt-1 text-xl font-black leading-none tracking-tight tabular-nums sm:text-2xl";
  const STAT_HELPER_LABEL_CLASS = `text-xs font-bold uppercase tracking-wide ${TEXT_SUBTLE_CLASS}`;
  const STAT_HELPER_TEXT_CLASS = `text-[11px] font-semibold leading-relaxed ${TEXT_MUTED_CLASS}`;
  const profileDetailItems = [
    { key: "employee-code", label: "Employee ID", value: profile?.employee_code || "ไม่ระบุ", icon: Hash },
    { key: "email", label: "Email", value: profile?.email || "ไม่ระบุอีเมล", icon: Mail },
    { key: "phone", label: "Phone", value: profile?.phone || "ไม่ระบุเบอร์โทรศัพท์", icon: Phone },
    { key: "location", label: "Location", value: profile?.location || "ไม่ระบุสถานที่", icon: MapPin },
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
        title = "รอดำเนินการ";
        description = "Ticket ที่สร้างแล้วและยังรอเริ่มดำเนินการ";
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() === "NEW");
        break;
      case "status-progress":
        title = "กำลังซ่อม";
        description = "Ticket ที่ทีมกำลังดำเนินการอยู่ในตอนนี้";
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() === "IN_PROGRESS");
        break;
      case "status-closed":
        title = "ปิดงานแล้ว";
        description = "Ticket ที่ปิดเรียบร้อยแล้วทั้งหมด";
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() === "CLOSED");
        break;
      case "status-total":
        title = "งานที่แจ้งทั้งหมด";
        description = "Ticket ทั้งหมดที่อยู่ในระบบ ณ ตอนนี้";
        items = tickets;
        break;
      case "open":
        title = "งานเปิดใหม่ 7 วันล่าสุด";
        description = "งานที่เปิดเข้ามาในรอบ 7 วันและยังไม่ปิด";
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() !== "CLOSED" && isWithinRollingWindow(ticket.created_at));
        break;
      case "risk":
        title = "งานเสี่ยง SLA";
        description = "งานที่ยังไม่ปิดและมีความเสี่ยงหลุด SLA";
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() !== "CLOSED" && getSlaState(ticket) === "RISK");
        break;
      case "overdue":
        title = "งานเกิน SLA";
        description = "งานที่เกิน SLA แล้วและควรเร่งติดตาม";
        items = tickets.filter((ticket) => String(ticket.status || "").toUpperCase() !== "CLOSED" && getSlaState(ticket) === "OVERDUE");
        break;
      case "closed":
        title = "งานปิดแล้ว 7 วันล่าสุด";
        description = "งานที่ปิดสำเร็จในรอบ 7 วันที่ผ่านมา";
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
  }, [selectedKpiMetricKey, tickets]);

  const renderStatsCards = () => {
    return (
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
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
              className={`rounded-2xl border p-3 text-left shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 ${isDarkTheme ? "border-slate-700/70 bg-slate-900/75 focus-visible:ring-indigo-400" : "border-blue-100/80 bg-white/95 shadow-blue-100/40 focus-visible:ring-blue-300"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={STAT_LABEL_CLASS}>{card.label}</p>
                  <p className={`${STAT_VALUE_CLASS} ${card.valueColor}`}>{card.value}</p>
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.iconWrap}`}>
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </div>
              {isTrendCard ? (
                <div className={`mt-2 flex items-center justify-between rounded-xl border px-2.5 py-1.5 ${isDarkTheme ? "border-slate-700 bg-slate-800/80" : "border-slate-100 bg-slate-50/90"}`}>
                  <p className={STAT_HELPER_LABEL_CLASS}>เทียบ 7 วันก่อน</p>
                  <p className={`text-xs font-black tabular-nums sm:text-sm ${trendColor}`}>
                    {card.trend.diff > 0 ? "+" : ""}
                    {card.trend.diff}
                  </p>
                </div>
              ) : (
                <div className={`mt-2 rounded-xl border px-2.5 py-1.5 ${isDarkTheme ? "border-slate-700 bg-slate-800/80" : "border-slate-100 bg-slate-50/90"}`}>
                  <p className={STAT_HELPER_LABEL_CLASS}>สถานะปัจจุบัน</p>
                  <p className={`mt-1 ${STAT_HELPER_TEXT_CLASS}`}>{card.helperText}</p>
                </div>
              )}
              <div className="mt-2 flex items-center justify-end">
                <ChevronRight size={14} className={isDarkTheme ? "text-slate-500" : "text-slate-400"} />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderOperationalMiniDashboard = () => {
    const loadLegend = operationalLoadData.filter((item) => !item.isPlaceholder).slice(0, 3);

    return (
      <section className={`overflow-hidden rounded-[2rem] border p-4 shadow-sm backdrop-blur-sm sm:p-5 ${SURFACE_SECTION_CLASS}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-emerald-500" />
              <h3 className={QUICK_ACTIONS_HEADING_CLASS}>Operational Dashboard</h3>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${isDarkTheme ? "border-emerald-700/50 bg-emerald-900/30 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                live
              </span>
            </div>
            <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>ภาพรวมหน้างานแบบมินิ ดูคิวปัจจุบัน เทรนด์ 7 วัน และ workload ข้ามโมดูลในบล็อกเดียว</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-white text-slate-700"}`}>
              Sync: {lastUpdated ? formatDateTime(lastUpdated) : "กำลังโหลด"}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-amber-700/60 bg-amber-900/30 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              SLA watch {operationalSnapshot.risk + operationalSnapshot.overdue}
            </span>
            <button
              type="button"
              onClick={() => setIsOperationalOverviewModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2b59b0] to-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20"
            >
              ดูภาพเต็ม
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
                <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>Queue Status</p>
                <p className={`mt-1 text-sm font-black ${TEXT_PRIMARY_CLASS}`}>งานค้าง {operationalSnapshot.open} รายการ</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${isDarkTheme ? "bg-slate-700 text-slate-200" : "bg-white text-slate-600"}`}>
                now
              </span>
            </div>
            <div className="h-28 min-w-0">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                  <BarChart data={operationalStatusChartData} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${value} รายการ`, "จำนวน"]} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {operationalStatusChartData.map((entry) => (
                        <Cell key={`mini-status-${entry.key}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsOperationalOverviewModalOpen(true)}
            className={`rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${isDarkTheme ? "border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800/80" : "border-slate-200 bg-gradient-to-br from-white to-indigo-50/70"}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>7-Day Motion</p>
                <p className={`mt-1 text-sm font-black ${TEXT_PRIMARY_CLASS}`}>เปิดใหม่เทียบกับปิดงาน</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${isDarkTheme ? "bg-slate-700 text-slate-200" : "bg-white text-slate-600"}`}>
                7 days
              </span>
            </div>
            <div className="h-28 min-w-0">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                  <LineChart data={operationalTrendData} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [`${value} รายการ`, name === "created" ? "เปิดใหม่" : "ปิดงาน"]} />
                    <Line type="monotone" dataKey="created" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsOperationalOverviewModalOpen(true)}
            className={`rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${isDarkTheme ? "border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800/80" : "border-slate-200 bg-gradient-to-br from-white to-cyan-50/70"}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>Workload Mix</p>
                <p className={`mt-1 text-sm font-black ${TEXT_PRIMARY_CLASS}`}>{operationalLoadTotal} รายการที่ต้องตาม</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${isDarkTheme ? "bg-slate-700 text-slate-200" : "bg-white text-slate-600"}`}>
                multi-source
              </span>
            </div>
            <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
              <div className="relative h-28 min-w-0">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                    <PieChart>
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [`${value} รายการ`, name]} />
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
              </div>

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
                  <p className={`text-xs ${TEXT_MUTED_CLASS}`}>ยังไม่มี workload เพิ่มเติม</p>
                )}
              </div>
            </div>
          </button>
        </div>
      </section>
    );
  };

  const renderTicketItem = (ticket) => {
    const statusConfig = getStatusConfig(ticket.status);
    const priorityConfig = getPriorityConfig(ticket.priority);
    const StatusIcon = statusConfig.icon;
    const slaIndicator = renderSLAIndicator(ticket);
    const isActive = activeTicket?.id === ticket.id;

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

                  <h4 className={`truncate font-bold ${TEXT_PRIMARY_CLASS}`}>{ticket.title || "ไม่มีหัวข้อ"}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs ${TEXT_MUTED_CLASS}`}>
                      {getCategoryIcon(ticket.category)}
                      {ticket.category || "ไม่ระบุหมวดหมู่"}
                    </span>
                    <span className={`hidden text-xs sm:inline ${TEXT_SUBTLE_CLASS}`}>•</span>
                    <span className={`text-xs ${TEXT_MUTED_CLASS}`}>{formatDate(ticket.created_at)}</span>
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
            title="เปิดแชทเคส"
            aria-label="เปิดแชทเคส"
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
          <p className={`mt-6 text-center text-sm font-medium ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>กำลังเตรียมข้อมูล Dashboard...</p>
        </div>
      </div>
    );
  }

  const activeTimeline = buildTimelineEvents(activeTicket);
  const activeTicketStatus = activeTicket ? getStatusConfig(activeTicket.status) : null;
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
        ข้ามไปยังเนื้อหาหลัก
      </a>
      {/* Status Bar - Real-time Indicator */}
      <div className={`shrink-0 border-b px-3 py-1.5 backdrop-blur-xl sm:px-4 ${isDarkTheme ? "border-slate-700/70 bg-slate-900/80" : "border-blue-100/80 bg-white/75"}`} aria-live="polite">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1.5 text-xs sm:text-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className={`font-semibold ${isDarkTheme ? "text-slate-300" : "text-slate-700"}`}>ระบบพร้อมใช้งาน</span>
            <span className={`hidden sm:inline ${isDarkTheme ? "text-slate-500" : "text-slate-500"}`}>แหล่งข้อมูล: Supabase Realtime</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`hidden sm:inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-blue-200 bg-blue-50/80 text-blue-800"}`}>
              <Calendar size={12} />
              Sync: {lastUpdated ? formatDateTime(lastUpdated) : "กำลังโหลด..."}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-blue-200 bg-blue-50/80 text-blue-800"}`}>
              <RefreshCw size={12} />
              {getTimeSinceUpdate()}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${isDarkTheme ? "border-indigo-500/50 bg-indigo-900/40 text-indigo-400" : "border-blue-200 bg-blue-100 text-blue-800"}`}>
              <ShieldCheck size={12} />
              Role: {roleLabel}
            </span>
            {canOpenAuditView && (
              <button
                type="button"
                onClick={() => navigate("/audit-view")}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-blue-200 bg-white text-slate-700 hover:bg-blue-50"}`}
              >
                <Shield size={12} />
                Audit Log
              </button>
            )}
            <button
              type="button"
              onClick={initDashboard}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-blue-200 bg-white text-slate-700 hover:bg-blue-50"}`}
            >
              <RefreshCw size={12} />
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`sticky top-0 z-40 shrink-0 border-b backdrop-blur-xl ${isDarkTheme ? "border-slate-700/70 bg-slate-900/80" : "border-blue-100/80 bg-white/80"}`}>
        <div className="mx-auto flex min-h-[56px] max-w-[1440px] items-center gap-3 px-4 py-2 sm:min-h-[64px] sm:px-6 lg:px-8">
          <div className={`flex min-w-0 flex-1 items-center gap-2 rounded-2xl border p-1.5 shadow-sm sm:flex-none ${isDarkTheme ? "border-slate-700 bg-slate-800/85" : "border-blue-200/80 bg-white/90 shadow-blue-100/60"}`}>
            <div className="relative">
              <img
                src={tdkLogo}
                alt="TDK Industrial logo"
                className="h-10 w-10 rounded-xl bg-white object-contain p-1 shadow-lg shadow-blue-200 animate-float"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            {/* <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 animate-float">
                <Wrench size={20} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div> */}
            <div>
              <h1 className="text-sm sm:text-lg font-black tracking-tight leading-none bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                TDK INDUSTRIAL
              </h1>
              <p className={`hidden sm:block text-[10px] font-bold uppercase tracking-widest mt-1 ${TEXT_SUBTLE_CLASS}`}>
                บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด
              </p>
            </div>
          </div>

          <div className="ml-auto flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-2 sm:gap-3 pr-1">
                <div className={`flex items-center gap-2 rounded-2xl border p-1 shadow-sm ${isDarkTheme ? "border-slate-700 bg-slate-800/85" : "border-blue-200 bg-white/90 shadow-blue-100/40"}`}>
                  <button
                    type="button"
                    onClick={() => setIsMeetingRoomStatusModalOpen(true)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 focus-visible:ring-indigo-400" : "border-blue-200 bg-white/90 text-slate-700 hover:bg-blue-50 focus-visible:ring-blue-300"}`}
                  >
                    <Calendar size={16} />
                    <span className="hidden 2xl:inline">Meeting Room Status</span>
                    <span className={`inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${isDarkTheme ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                      {todayMeetingBookings.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRecentActivityModalOpen(true)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 focus-visible:ring-indigo-400" : "border-blue-200 bg-white/90 text-slate-700 hover:bg-blue-50 focus-visible:ring-blue-300"}`}
                  >
                    <Clock size={16} />
                    <span className="hidden 2xl:inline">กิจกรรมล่าสุด</span>
                    <span className={`inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${isDarkTheme ? "bg-amber-900/40 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                      {Math.min(filteredTickets.length, 99)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={openMoreMenuPanel}
                    aria-label={showMoreQuickActions ? "ซ่อนเมนูอื่นๆ" : "แสดงเมนูอื่นๆ"}
                    className={`inline-flex items-center gap-2 rounded-xl border px-2.5 sm:px-3 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 focus-visible:ring-indigo-400" : "border-blue-200 bg-white/90 text-slate-700 hover:bg-blue-50 focus-visible:ring-blue-300"}`}
                  >
                    <SlidersHorizontal size={16} />
                    <span className="hidden lg:inline">เมนูอื่นๆ</span>
                    {showMoreQuickActions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDarkTheme ? "สลับเป็นธีมสว่าง" : "สลับเป็นธีมมืด"}
                title={isDarkTheme ? "สลับเป็นธีมสว่าง" : "สลับเป็นธีมมืด"}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition focus:outline-none focus-visible:ring-2 ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 focus-visible:ring-indigo-400" : "border-blue-200 bg-white/90 text-slate-700 hover:bg-blue-50 focus-visible:ring-blue-300"}`}
              >
                {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <div className={`hidden xl:flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm ${isDarkTheme ? "border-slate-700 bg-slate-800/85" : "border-blue-200 bg-white/90 shadow-blue-100/40"}`}>
                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${isDarkTheme ? "bg-slate-700 text-slate-300" : "bg-blue-100 text-blue-800"}`}>
                  <Hash size={12} />
                  ID: {profile?.employee_code || "ไม่ระบุ"}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${isDarkTheme ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                  <Building2 size={12} />
                  {profile?.department || "ไม่ระบุแผนก"}
                </span>
              </div>
              <button
                onClick={() => navigate("/create-ticket")}
                className="inline-flex sm:hidden items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-white shadow-sm"
                aria-label="แจ้งซ่อมใหม่"
              >
                <Plus size={18} />
              </button>
              <button
                onClick={() => navigate("/create-ticket")}
                className="hidden lg:flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-white font-bold transition-all transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0"
              >
                <Plus size={18} />
                <span>แจ้งซ่อมใหม่</span>
              </button>
              <button
                onClick={() => setIsLogoutConfirmOpen(true)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-2.5 sm:px-3 lg:px-4 py-2 text-sm font-bold text-rose-600 transition-all ${isDarkTheme ? "hover:bg-rose-900/30" : "hover:bg-rose-50"}`}
              >
                <LogOut size={18} />
                <span className="hidden md:inline">ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="dashboard-main-content" className="mx-auto flex w-full max-w-[1440px] flex-col px-4 pt-3 pb-28 sm:px-6 sm:pt-4 sm:pb-12 lg:px-8 lg:pb-8">
        {/* Header Section */}
        <header className="mb-4 shrink-0 space-y-3">
          {/* Stats Overview */}
          {renderStatsCards()}
        </header>

        {dashboardError && (
          <div className={`mb-4 flex shrink-0 flex-col gap-3 rounded-2xl border p-3 md:flex-row md:items-center md:justify-between ${isDarkTheme ? "border-rose-700/60 bg-rose-900/30" : "border-rose-200 bg-rose-50/80"}`} role="alert">
            <div>
              <p className={`text-sm font-black ${isDarkTheme ? "text-rose-300" : "text-rose-700"}`}>มีปัญหาในการโหลดข้อมูลบางส่วน</p>
              <p className={`text-xs font-medium ${isDarkTheme ? "text-rose-200" : "text-rose-600"}`}>{dashboardError}</p>
            </div>
            <button
              onClick={initDashboard}
              className={`inline-flex items-center gap-2 self-start rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${isDarkTheme ? "border-rose-600 bg-slate-800 text-rose-300 hover:bg-slate-700" : "border-rose-300 bg-white text-rose-700 hover:bg-rose-100"}`}
            >
              <RefreshCw size={14} />
              ลองโหลดอีกครั้ง
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-4 xl:grid-cols-12 xl:items-start">
          {/* Profile Section */}
          <div className="relative flex flex-col xl:sticky xl:top-24 xl:col-span-4 xl:self-start">
            <div className={`order-1 overflow-hidden rounded-3xl shadow-lg backdrop-blur-md group transition-all duration-500 hover:shadow-2xl lg:order-2 ${isDarkTheme ? "bg-slate-900/75 shadow-slate-900/40" : "bg-white/90 shadow-[0_14px_40px_-16px_rgba(43,89,176,0.4)]"}`}>
              <div className={`h-20 sm:h-28 relative overflow-hidden ${isDarkTheme ? "bg-gradient-to-r from-[#2b59b0] via-[#2b59b0] to-[#244a95]" : "bg-gradient-to-r from-[#2b59b0] via-[#2b59b0] to-[#244a95]"}`}>
                <div className={`absolute inset-0 ${isDarkTheme ? "bg-gradient-to-r from-[#2b59b0]/20 via-[#2b59b0]/20 to-[#244a95]/20" : "bg-gradient-to-r from-[#2b59b0]/25 via-[#2b59b0]/18 to-[#244a95]/15"}`}></div>
                <div className="absolute -bottom-8 -right-8 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-3 sm:bottom-4 right-4 sm:right-6 text-white/10 font-black text-2xl sm:text-4xl">TDK</div>
              </div>

              <div className="relative px-4 pb-4 sm:px-6 sm:pb-5">
                <div className="relative -mt-6 mb-4 flex justify-center sm:-mt-9 sm:mb-5">
                  <div
                    className={`h-20 w-20 rounded-3xl p-1.5 shadow-2xl cursor-pointer relative group/profile overflow-hidden sm:h-28 sm:w-28 ${isDarkTheme ? "bg-slate-800" : "bg-white"}`}
                    onClick={() => profile?.id_card_url && setIsModalOpen(true)}
                  >
                    <div className={`absolute inset-0 ${isDarkTheme ? "bg-gradient-to-br from-[#2b59b0]/12 to-[#244a95]/12" : "bg-gradient-to-br from-[#2b59b0]/15 to-[#244a95]/15"}`}></div>
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
                      <div className={`w-full h-full rounded-2xl flex items-center justify-center ${isDarkTheme ? "bg-gradient-to-br from-slate-700 to-slate-800 text-slate-400" : "bg-gradient-to-br from-[#EEF3FF] to-[#DCE8FF] text-[#2b59b0]"}`}>
                        <User size={40} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4 text-center sm:mb-5">
                  <h2 className={`text-lg sm:text-xl font-black ${TEXT_PRIMARY_CLASS}`}>{profile?.full_name || "ไม่พบชื่อ"}</h2>
                  <p className={`mt-1 text-xs font-bold uppercase tracking-widest ${isDarkTheme ? "text-indigo-300" : "text-[#2b59b0]"}`}>
                    {profile?.position || "พนักงาน"}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className={`flex items-center gap-3 rounded-xl p-3 transition-all group/item ${isDarkTheme ? "bg-slate-800/80 hover:bg-slate-800" : "bg-[#EEF3FF]/70 hover:bg-white"}`}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2b59b0] to-[#244a95]">
                      <Building2 size={15} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-[10px] uppercase font-bold ${TEXT_SUBTLE_CLASS}`}>Department</p>
                      <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{profile?.department || "ไม่ระบุ"}</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 rounded-xl p-3 transition-all group/item ${isDarkTheme ? "bg-slate-800/80 hover:bg-slate-800" : "bg-[#EEF3FF]/70 hover:bg-white"}`}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2b59b0] to-[#244a95]">
                      <Briefcase size={15} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-[10px] uppercase font-bold ${TEXT_SUBTLE_CLASS}`}>Position</p>
                      <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{profile?.position || "พนักงาน"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-start pt-1">
                    <button
                      type="button"
                      onClick={() => setShowProfileDetails((prev) => !prev)}
                      aria-expanded={showProfileDetails}
                      aria-label={showProfileDetails ? "ซ่อนรายละเอียดโปรไฟล์" : "แสดงรายละเอียดโปรไฟล์"}
                      title={showProfileDetails ? "ซ่อนรายละเอียดโปรไฟล์" : "แสดงรายละเอียดโปรไฟล์"}
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

          {/* Main Content Area */}
          <div className="flex min-w-0 flex-col gap-4 xl:col-span-8">
            {/* Quick Actions */}
            <section ref={quickActionsSectionRef} className={`order-1 rounded-3xl border p-4 shadow-sm backdrop-blur-sm sm:p-5 ${SURFACE_SECTION_CLASS}`}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className={QUICK_ACTIONS_HEADING_CLASS}>Quick Actions</h3>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>ทางลัดหลักของระบบสำหรับงานที่ใช้บ่อยที่สุด</p>
                </div>
                <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isDarkTheme ? "border-indigo-500/40 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-600"}`}>
                  role: {profile?.role || "user"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                      className={`group h-full rounded-[28px] border p-4 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-blue-100/80 bg-white/95"} ${accent.hoverBorder} ${accent.hoverShadow}`}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent.gradient} ${accent.text} shadow-sm transition-all duration-300 ${accent.hoverBg}`}>
                          <Icon size={20} />
                          {action.badgeCount > 0 && (
                            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-white bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
                              {action.badgeCount > 9 ? "9+" : action.badgeCount}
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${accent.pill}`}>
                          {action.cta}
                        </span>
                      </div>
                      <h4 className={QUICK_ACTIONS_TITLE_CLASS}>{action.label}</h4>
                      <p className={`mt-2 ${QUICK_ACTIONS_DESCRIPTION_CLASS}`}>{action.description}</p>
                      <div className={`mt-4 flex items-center gap-1 text-[11px] font-bold ${accent.text}`}>
                        <span>เปิดใช้งาน</span>
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
                      aria-label="แสดงเมนูเพิ่มเติม"
                      title="แสดงเมนูเพิ่มเติม"
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${isDarkTheme ? "border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-900" : "border-blue-100 bg-white text-slate-700 hover:bg-blue-50"}`}
                    >
                      {showMoreQuickActions ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>

                  <div
                    className={`mt-2 overflow-hidden transition-all duration-200 ease-out ${
                      showMoreQuickActions
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
                              className={`group h-full rounded-[28px] border p-4 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                                isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-blue-100/80 bg-white/95"
                              } ${accent.hoverBorder} ${accent.hoverShadow} ${
                                isChatAction
                                  ? isDarkTheme
                                    ? "border-emerald-600/60 ring-1 ring-emerald-500/35"
                                    : "border-emerald-300 ring-1 ring-emerald-200"
                                  : ""
                              }`}
                            >
                              <div className="mb-4 flex items-start justify-between gap-3">
                                <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent.gradient} ${accent.text} shadow-sm transition-all duration-300 ${accent.hoverBg}`}>
                                  <Icon size={20} />
                                  {action.badgeCount > 0 && (
                                    <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-white bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
                                      {action.badgeCount > 9 ? "9+" : action.badgeCount}
                                    </span>
                                  )}
                                </div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${accent.pill}`}>
                                  {isChatAction ? "เริ่มแชท" : action.cta}
                                </span>
                              </div>
                              <h4 className={QUICK_ACTIONS_TITLE_CLASS}>{action.label}</h4>
                              <p className={`mt-2 ${QUICK_ACTIONS_DESCRIPTION_CLASS}`}>{action.description}</p>
                              <div className={`mt-4 flex items-center gap-1 text-[11px] font-bold ${accent.text}`}>
                                <span>เปิดใช้งาน</span>
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
                    <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${TEXT_SUBTLE_CLASS}`}>Meeting Room Status</h3>
                  </div>
                  <p className={`text-xs ${TEXT_MUTED_CLASS}`}>สถานะห้องประชุมของวันนี้แบบเรียลไทม์สำหรับพนักงานทั้งองค์กร</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/meeting-room-booking")}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  ไปหน้าจองห้องประชุม
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  Today: {todayMeetingBookings.length} รายการ
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  Tomorrow: {tomorrowMeetingBookings.length} รายการ
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  Upcoming: {normalizedUpcomingMeetingBookings.length} รายการ
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-indigo-500/50 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
                  Next booking: {nextMeetingBooking
                    ? `${nextMeetingBooking.room_name} ${format(nextMeetingBooking.startsAt, "dd MMM HH:mm", { locale: th })}`
                    : "ไม่มีคิวถัดไป"}
                </span>
                {todayMeetingOverlapCount > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-rose-700/60 bg-rose-900/40 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                    พบเวลาจองซ้ำ {todayMeetingOverlapCount} จุด
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
                          รายการจองวันนี้
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
                                  {booking.title || "มีการจอง"}
                                </p>
                                <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${TEXT_MUTED_CLASS}`}>
                                  <span className="inline-flex items-center gap-1">
                                    <DoorOpen size={12} />
                                    {booking.room_name || "ไม่ระบุห้อง"}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <User size={12} />
                                    {booking.booked_by || "ไม่ระบุผู้จอง"}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className={`text-[11px] font-semibold ${TEXT_SUBTLE_CLASS}`}>
                                  {format(booking.startsAt, "dd MMM yyyy", { locale: th })}
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
                          สถานะห้องประชุมวันนี้
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
                                {roomCard.bookedCount > 0 ? "Booked" : "Available"}
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
                                    <span className="font-black">{slot.type === "booked" ? "Booked" : "Available"}</span>
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
                        รายการจองถัดไป
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
                                {booking.title || "มีการจอง"}
                              </p>
                              <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${TEXT_MUTED_CLASS}`}>
                                <span className="inline-flex items-center gap-1">
                                  <DoorOpen size={12} />
                                  {booking.room_name || "ไม่ระบุห้อง"}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <User size={12} />
                                  {booking.booked_by || "ไม่ระบุผู้จอง"}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className={`text-[11px] font-semibold ${TEXT_SUBTLE_CLASS}`}>
                                {format(booking.startsAt, "dd MMM yyyy", { locale: th })}
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
                    วันนี้ห้องประชุมว่าง
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
                                <p className={`truncate text-xs font-semibold ${TEXT_SECONDARY_CLASS}`}>{item.system_name || "ไม่ระบุระบบ"}</p>
                                <p className={`text-[10px] ${TEXT_MUTED_CLASS}`}>{formatDate(item.created_at, "dd MMM HH:mm", { locale: th })}</p>
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
                      <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${TEXT_SUBTLE_CLASS}`}>Priority Inbox</h3>
                      <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>งานที่ควรจัดการก่อน เรียงตามความเสี่ยง SLA และความเร่งด่วน</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => applyRoleView(roleViews[0])}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${isDarkTheme ? "border-indigo-500/40 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}
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
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${isDarkTheme ? "border-rose-700 bg-rose-900/40 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-700"}`}
                      >
                        ดูงานหลุด SLA
                      </button>
                    </div>
                  </div>

                  <div>
                    {priorityInbox.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 pr-1 xl:grid-cols-2">
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
                              <p className={`truncate text-sm font-black ${TEXT_PRIMARY_CLASS}`}>{ticket.title || "ไม่มีหัวข้อ"}</p>
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
                        <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>ไม่มีงานค้างใน Priority Inbox</p>
                        <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>ตอนนี้คิวงานอยู่ในเกณฑ์ปกติ</p>
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
                        <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${TEXT_SUBTLE_CLASS}`}>กิจกรรมล่าสุด</h3>
                        <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></div>
                      </div>
                      <p className={`text-xs ${TEXT_MUTED_CLASS}`}>
                        แสดง {visibleTickets.length} จาก {filteredTickets.length} รายการที่ผ่านตัวกรอง
                      </p>
                    </div>
                    <p className={`text-[11px] font-semibold ${TEXT_MUTED_CLASS}`}>
                      คีย์ลัด: <span className={`font-black ${TEXT_SECONDARY_CLASS}`}>/</span> ค้นหา, <span className={`font-black ${TEXT_SECONDARY_CLASS}`}>n</span> สร้าง Ticket
                    </p>
                  </div>
                </div>

                <div className={`mb-4 shrink-0 rounded-2xl border p-3 ${SURFACE_PANEL_CLASS}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <SlidersHorizontal size={15} className="text-indigo-600" />
                    <p className={`text-xs font-black uppercase tracking-wider ${TEXT_MUTED_CLASS}`}>Smart Filter Bar</p>
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
                        placeholder="ค้นหาเลขที่งาน / หัวข้อ / รายละเอียด..."
                        aria-label="ค้นหา Ticket"
                        className={SEARCH_CONTROL_CLASS}
                      />
                      {searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-bold ${isDarkTheme ? "bg-slate-600 text-slate-200" : "bg-slate-100 text-slate-600"}`}
                        >
                          ล้าง
                        </button>
                      )}
                    </div>

                    <div>
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

                    <div>
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

                    {!isUserSearchMode && (
                      <div>
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
                    )}

                    {!isUserSearchMode && (
                      <div>
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
                    )}
                  </div>

                  <p className={`mt-2 text-[11px] ${TEXT_MUTED_CLASS}`}>
                    ค้นหาได้จาก: เลขงาน, หัวข้อ, รายละเอียด, หมวดหมู่, สถานที่, สถานะ, ความเร่งด่วน
                  </p>

                  <div className="mt-3 flex flex-col gap-3">
                    {!isUserSearchMode && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <select
                          value={selectedPresetId}
                          onChange={(e) => setSelectedPresetId(e.target.value)}
                          aria-label="เลือกมุมมองที่บันทึกไว้"
                          className={`w-full sm:min-w-[220px] sm:flex-1 ${FORM_CONTROL_CLASS}`}
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
                          className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-40 ${isDarkTheme ? "border-rose-700 bg-rose-900/40 text-rose-300 hover:bg-rose-900/60 focus-visible:ring-rose-400" : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 focus-visible:ring-rose-200"}`}
                          aria-label="ลบมุมมองที่เลือก"
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
                          บันทึกมุมมอง
                        </button>
                      )}
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

                <div>
                  {filteredTickets.length > 0 ? (
                    <div className="space-y-3">
                      <p className={`text-[11px] font-semibold ${TEXT_MUTED_CLASS}`}>
                        {isCompactView
                          ? "แตะการ์ดเพื่อเปิดรายละเอียดทันที"
                          : "เลือก Ticket เพื่อดูสรุปด้านล่าง หรือเปิดรายละเอียดเต็มได้ทันที"}
                      </p>

                      <div className="space-y-3" role="listbox" aria-label="รายการ Ticket ล่าสุด">
                        {visibleTickets.map(renderTicketItem)}
                      </div>

                      <button
                        type="button"
                        onClick={handleViewAllClick}
                        className={`group/view-all w-full rounded-xl border border-dashed py-3 text-center text-sm font-bold transition-all duration-300 ${isDarkTheme ? "border-indigo-500/40 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-900/30" : "border-indigo-200 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50"}`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span>ดูประวัติทั้งหมด ({tickets.length} รายการ)</span>
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
                                <h4 className={`text-base font-black ${TEXT_PRIMARY_CLASS}`}>{activeTicket.title || "ไม่มีหัวข้อ"}</h4>
                                <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{activeTicket.category || "ไม่ระบุหมวดหมู่"} • {formatDate(activeTicket.created_at)}</p>
                                <p className={`mt-3 rounded-xl border p-3 text-xs leading-relaxed ${isDarkTheme ? "border-slate-700 bg-slate-900/80 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
                                  {activeTicket.description || "ไม่มีรายละเอียด"}
                                </p>
                              </div>

                              <div className={`mb-4 rounded-xl border p-3 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
                                <p className={`mb-2 text-[11px] font-black uppercase tracking-wider ${TEXT_MUTED_CLASS}`}>Activity Timeline</p>
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
                                เปิดรายละเอียดเต็ม
                              </button>
                            </div>
                          ) : (
                            <div className={`rounded-xl border border-dashed p-5 text-center ${isDarkTheme ? "border-slate-700" : "border-slate-300"}`}>
                              <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>ยังไม่มีรายการที่เลือก</p>
                              <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>เลือก Ticket จากรายการด้านบนเพื่อดูรายละเอียด</p>
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
                      <h3 className={`mb-2 text-lg font-bold ${TEXT_SECONDARY_CLASS}`}>ไม่พบรายการแจ้งซ่อม</h3>
                      <p className={`mx-auto mb-6 max-w-md text-sm ${TEXT_MUTED_CLASS}`}>
                        {hasActiveSmartFilters
                          ? "ไม่พบรายการที่ตรงกับ Smart Filter ปัจจุบัน"
                          : "เริ่มต้นใช้งานระบบโดยการแจ้งซ่อมครั้งแรกของคุณ"}
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {hasActiveSmartFilters && (
                          <button
                            type="button"
                            onClick={clearSmartFilters}
                            className={`inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}
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
          name: profile?.full_name || profile?.employee_code || profile?.email || "User",
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
            aria-label="ปิดรายละเอียด KPI"
            onClick={() => setSelectedKpiMetricKey("")}
            className="absolute inset-0"
          />
          <section className={`relative z-10 flex w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[2rem] border shadow-[0_28px_70px_-26px_rgba(43,89,176,0.42)] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="shrink-0 border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-indigo-500" />
                    <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${TEXT_SUBTLE_CLASS}`}>KPI Detail</p>
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
                  <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>จำนวนทั้งหมด</p>
                  <p className={`mt-2 text-3xl font-black ${TEXT_PRIMARY_CLASS}`}>{selectedKpiMetric.total}</p>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>รายการที่ตรงกับ KPI นี้</p>
                </article>
                <article className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                  <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>แสดงใน popup</p>
                  <p className={`mt-2 text-3xl font-black ${TEXT_PRIMARY_CLASS}`}>{selectedKpiMetric.items.length}</p>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>สูงสุด 12 รายการล่าสุด</p>
                </article>
                <article className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                  <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>วิธีใช้งาน</p>
                  <p className={`mt-2 text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>กดที่รายการเพื่อเปิดรายละเอียด ticket</p>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>เหมาะสำหรับ drill-down จากตัวเลขสรุปทันที</p>
                </article>
              </div>

              {selectedKpiMetric.items.length > 0 ? (
                <div className="space-y-3">
                  {selectedKpiMetric.items.map((ticket) => {
                    const statusConfig = getStatusConfig(ticket.status);
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
                            <h4 className={`truncate text-sm font-black ${TEXT_PRIMARY_CLASS}`}>{ticket.title || "ไม่มีหัวข้อ"}</h4>
                            <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${TEXT_MUTED_CLASS}`}>
                              <span>{ticket.category || "ไม่ระบุหมวดหมู่"}</span>
                              <span className={TEXT_SUBTLE_CLASS}>•</span>
                              <span>{formatDate(ticket.created_at)}</span>
                              <span className={TEXT_SUBTLE_CLASS}>•</span>
                              <span>อัปเดต {formatDateTime(ticket.updated_at || ticket.created_at)}</span>
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
                  <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>ยังไม่มีรายการใน KPI นี้</p>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>เมื่อมี ticket เข้ามาตรงเงื่อนไข ตัวเลขและรายการใน popup นี้จะอัปเดตตามทันที</p>
                </div>
              )}
            </div>

            <div className={`shrink-0 border-t px-4 py-4 sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900/95" : "border-slate-200 bg-white/95"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-xs ${TEXT_MUTED_CLASS}`}>KPI cards ด้านบนสามารถกดเพื่อเปิด popup ดูรายการย่อยได้ทันที</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setSelectedKpiMetricKey("")} className={SECONDARY_BUTTON_CLASS}>ปิด</button>
                  <button type="button" onClick={handleViewAllClick} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white">
                    เปิดประวัติ Ticket
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
                    aria-label="ปิดการแจ้งเตือน"
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
            aria-label="ปิด Operational Dashboard"
            onClick={() => setIsOperationalOverviewModalOpen(false)}
            className="absolute inset-0"
          />
          <section className={`relative z-10 flex w-full max-w-7xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[2rem] border shadow-[0_28px_70px_-26px_rgba(43,89,176,0.42)] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="shrink-0 border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-emerald-500" />
                    <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${TEXT_SUBTLE_CLASS}`}>Dashboard Overview</p>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${isDarkTheme ? "border-emerald-700/50 bg-emerald-900/30 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      Real-time
                    </span>
                  </div>
                  <h3 className={`mt-1 text-xl font-black ${TEXT_PRIMARY_CLASS}`}>Operational Dashboard</h3>
                  <p className={`mt-1 text-sm ${TEXT_MUTED_CLASS}`}>สรุปข้อมูลปัจจุบันแบบสดในหน้าเดียว โดยไม่ต้องเปลี่ยน layout หลักของ dashboard เดิม</p>
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
                  Sync: {lastUpdated ? formatDateTime(lastUpdated) : "กำลังโหลด"}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-indigo-500/50 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
                  SLA on-time {slaStats.percentage}%
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-amber-700/60 bg-amber-900/30 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  เสี่ยง {operationalSnapshot.risk} / เกิน SLA {operationalSnapshot.overdue}
                </span>
                {todayMeetingOverlapCount > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-rose-700/60 bg-rose-900/30 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                    พบเวลาจองซ้ำ {todayMeetingOverlapCount} จุด
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
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>Ticket Trend 7 วันล่าสุด</p>
                        <h4 className={`mt-1 text-base font-black ${TEXT_PRIMARY_CLASS}`}>เปิดใหม่ vs ปิดงาน</h4>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isDarkTheme ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600"}`}>rolling 7 days</span>
                    </div>
                    <div className="h-[280px] min-w-0">
                      {chartsReady ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                          <LineChart data={operationalTrendData} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [`${value} รายการ`, name === "created" ? "เปิดใหม่" : "ปิดงาน"]} labelFormatter={(label) => `วันที่ ${label}`} />
                            <Line type="monotone" dataKey="created" name="created" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="closed" name="closed" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : null}
                    </div>
                  </section>

                  <section className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>Ticket Status Overview</p>
                        <h4 className={`mt-1 text-base font-black ${TEXT_PRIMARY_CLASS}`}>สัดส่วนสถานะงานปัจจุบัน</h4>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isDarkTheme ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600"}`}>live queue</span>
                    </div>
                    <div className="h-[240px] min-w-0">
                      {chartsReady ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                          <BarChart data={operationalStatusChartData} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${value} รายการ`, "จำนวน"]} />
                            <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                              {operationalStatusChartData.map((entry) => (
                                <Cell key={`status-cell-${entry.key}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : null}
                    </div>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>Operational Mix</p>
                        <h4 className={`mt-1 text-base font-black ${TEXT_PRIMARY_CLASS}`}>สัดส่วนงานที่กำลังเกิดขึ้น</h4>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isDarkTheme ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600"}`}>{operationalLoadTotal} รายการ</span>
                    </div>

                    <div className="relative h-[250px] min-w-0">
                      {chartsReady ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                          <PieChart>
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [`${value} รายการ`, name]} />
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
                          <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>Live Load</p>
                          <p className={`mt-1 text-3xl font-black ${TEXT_PRIMARY_CLASS}`}>{operationalLoadTotal}</p>
                        </div>
                      </div>
                    </div>

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
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>Watchlist ตอนนี้</p>
                        <h4 className={`mt-1 text-base font-black ${TEXT_PRIMARY_CLASS}`}>จุดที่ควรจับตา</h4>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isDarkTheme ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600"}`}>live feed</span>
                    </div>

                    <div className="space-y-3">
                      <div className={`rounded-xl border p-3 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
                        <p className={`text-xs font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>{meetingRealtimeSummary.activeBookings.length > 0 ? "ห้องที่กำลังใช้งาน" : "คิวประชุมถัดไป"}</p>
                        {meetingRealtimeSummary.activeBookings.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {meetingRealtimeSummary.activeBookings.slice(0, 2).map((booking) => (
                              <div key={`live-meeting-${booking.id}`} className={`rounded-lg border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-800/80" : "border-slate-100 bg-slate-50/80"}`}>
                                <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{booking.room_name || "ไม่ระบุห้อง"}</p>
                                <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{booking.title || "มีการใช้งานห้องประชุม"} • {booking.startClock} - {booking.endClock}</p>
                              </div>
                            ))}
                          </div>
                        ) : nextMeetingBooking ? (
                          <p className={`mt-2 text-sm ${TEXT_MUTED_CLASS}`}>{nextMeetingBooking.room_name || "ไม่ระบุห้อง"} • {format(nextMeetingBooking.startsAt, "dd MMM HH:mm", { locale: th })}</p>
                        ) : (
                          <p className={`mt-2 text-sm ${TEXT_MUTED_CLASS}`}>ไม่มีการใช้ห้องประชุมในตอนนี้</p>
                        )}
                      </div>

                      <div className={`rounded-xl border p-3 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
                        <p className={`mb-2 text-xs font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>หมวดงานค้างสูงสุด</p>
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
                          <p className={`text-sm ${TEXT_MUTED_CLASS}`}>ตอนนี้ยังไม่มีงานค้างเปิด</p>
                        )}
                      </div>

                      <div className={`rounded-xl border p-3 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
                        <p className={`mb-2 text-xs font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>Ticket เร่งด่วน</p>
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
                                <p className={`truncate text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{ticket.title || "ไม่มีหัวข้อ"}</p>
                                <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{ticket.ticket_no || `T${ticket.id?.slice(-6).toUpperCase()}`}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-sm ${TEXT_MUTED_CLASS}`}>ไม่มี ticket เร่งด่วนที่ต้องจับตา</p>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className={`shrink-0 border-t px-4 py-4 sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900/95" : "border-slate-200 bg-white/95"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-xs ${TEXT_MUTED_CLASS}`}>เปิดดูภาพรวมปัจจุบันจาก nav ได้ทันที โดยไม่ต้องเลื่อนหาหลาย section ในหน้าเดิม</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setIsOperationalOverviewModalOpen(false)} className={SECONDARY_BUTTON_CLASS}>ปิด</button>
                  <button type="button" onClick={handleViewAllClick} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white">
                    เปิดประวัติ Ticket
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
            aria-label="ปิด Meeting Room Status"
            onClick={() => setIsMeetingRoomStatusModalOpen(false)}
            className="absolute inset-0"
          />
          <section className={`relative z-10 flex w-full max-w-6xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[2rem] border shadow-[0_28px_70px_-26px_rgba(43,89,176,0.42)] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="shrink-0 border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-500" />
                    <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${TEXT_SUBTLE_CLASS}`}>Meeting Room Status</p>
                  </div>
                  <h3 className={`mt-1 text-xl font-black ${TEXT_PRIMARY_CLASS}`}>สถานะห้องประชุมและกิจกรรมล่าสุด</h3>
                  <p className={`mt-1 text-sm ${TEXT_MUTED_CLASS}`}>ติดตามห้องว่าง คิวถัดไป และรายการจองล่าสุดแบบ popup</p>
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
                  Today: {todayMeetingBookings.length} รายการ
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  Tomorrow: {tomorrowMeetingBookings.length} รายการ
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  Upcoming: {normalizedUpcomingMeetingBookings.length} รายการ
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-indigo-500/50 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
                  Next: {nextMeetingBooking ? `${nextMeetingBooking.room_name} ${format(nextMeetingBooking.startsAt, "dd MMM HH:mm", { locale: th })}` : "ไม่มีคิวถัดไป"}
                </span>
                {todayMeetingOverlapCount > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-rose-700/60 bg-rose-900/40 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                    พบเวลาจองซ้ำ {todayMeetingOverlapCount} จุด
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
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>รายการจองวันนี้</p>
                      </div>
                      {normalizedTodayMeetingBookings.length > 0 ? (
                        <div className="space-y-2">
                          {normalizedTodayMeetingBookings.map((booking) => (
                            <article key={`meeting-modal-${booking.id}`} className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-white"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={`truncate text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{booking.title || "มีการจอง"}</p>
                                  <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${TEXT_MUTED_CLASS}`}>
                                    <span className="inline-flex items-center gap-1">
                                      <DoorOpen size={12} />
                                      {booking.room_name || "ไม่ระบุห้อง"}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <User size={12} />
                                      {booking.booked_by || "ไม่ระบุผู้จอง"}
                                    </span>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className={`text-[11px] font-semibold ${TEXT_SUBTLE_CLASS}`}>{format(booking.startsAt, "dd MMM yyyy", { locale: th })}</p>
                                  <p className={`text-xs font-black ${TEXT_SECONDARY_CLASS}`}>{booking.startClock} - {booking.endClock}</p>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className={`rounded-xl border border-dashed p-5 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                          <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>วันนี้ยังไม่มีการจองห้องประชุม</p>
                        </div>
                      )}
                    </div>

                    <div className={`rounded-2xl border p-4 ${SURFACE_PANEL_CLASS}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <Clock size={14} className={isDarkTheme ? "text-slate-300" : "text-slate-600"} />
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>สถานะห้องประชุมวันนี้</p>
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
                                {roomCard.bookedCount > 0 ? "Booked" : "Available"}
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
                                    <span>{slot.type === "booked" ? "Booked" : "Available"}</span>
                                  </div>
                                  {slot.type === "booked" && (
                                    <p className="mt-1 line-clamp-2">{slot.title || "มีการจอง"}</p>
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
                        <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${TEXT_SUBTLE_CLASS}`}>กิจกรรมล่าสุด</p>
                      </div>
                      {upcomingMeetingPreview.length > 0 ? (
                        <div className="space-y-2">
                          {upcomingMeetingPreview.map((booking) => (
                            <article key={`meeting-upcoming-${booking.id}`} className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
                              <p className={`truncate text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>{booking.title || "มีการจอง"}</p>
                              <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${TEXT_MUTED_CLASS}`}>
                                <span className="inline-flex items-center gap-1">
                                  <DoorOpen size={12} />
                                  {booking.room_name || "ไม่ระบุห้อง"}
                                </span>
                                <span>{format(booking.startsAt, "dd MMM HH:mm", { locale: th })}</span>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className={`rounded-xl border border-dashed p-5 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                          <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>ไม่มีคิวห้องประชุมถัดไป</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`shrink-0 border-t px-4 py-4 sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900/95" : "border-slate-200 bg-white/95"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-xs ${TEXT_MUTED_CLASS}`}>เปิดดูสถานะห้องประชุมล่าสุดจาก nav ได้ทันทีโดยไม่ต้องเลื่อนหน้า</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setIsMeetingRoomStatusModalOpen(false)} className={SECONDARY_BUTTON_CLASS}>ปิด</button>
                  <button type="button" onClick={() => navigate("/meeting-room-booking")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white">
                    ไปหน้าจองห้องประชุม
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
            aria-label="ปิดกิจกรรมล่าสุด"
            onClick={() => setIsRecentActivityModalOpen(false)}
            className="absolute inset-0"
          />
          <section className={`relative z-10 flex w-full max-w-6xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[2rem] border shadow-[0_28px_70px_-26px_rgba(43,89,176,0.42)] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="shrink-0 border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${TEXT_SUBTLE_CLASS}`}>กิจกรรมล่าสุด</p>
                  </div>
                  <h3 className={`mt-1 text-xl font-black ${TEXT_PRIMARY_CLASS}`}>รายการ Ticket ล่าสุด</h3>
                  <p className={`mt-1 text-sm ${TEXT_MUTED_CLASS}`}>เปิดจาก nav ได้ทันที พร้อมค้นหาและกรองสถานะสำคัญ</p>
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
                    ทั้งหมด {filteredTickets.length} รายการ
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isDarkTheme ? "border-indigo-500/50 bg-indigo-900/40 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
                    แสดงใน popup {Math.min(filteredTickets.length, 12)} รายการ
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
                      placeholder="ค้นหาเลขที่งาน / หัวข้อ / รายละเอียด..."
                      aria-label="ค้นหา Ticket"
                      className={SEARCH_CONTROL_CLASS}
                    />
                  </div>

                  <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} aria-label="กรองตามสถานะ" className={FORM_CONTROL_CLASS}>
                    {FILTER_OPTIONS.map((filter) => (
                      <option key={filter.id} value={filter.id}>{filter.label}</option>
                    ))}
                  </select>

                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="กรองตามหมวดหมู่" className={FORM_CONTROL_CLASS}>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category === "ALL" ? "ทุกหมวดหมู่" : category}</option>
                    ))}
                  </select>

                  {!isUserSearchMode && (
                    <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} aria-label="กรองตามความเร่งด่วน" className={FORM_CONTROL_CLASS}>
                      {PRIORITY_FILTER_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  )}

                  {!isUserSearchMode && (
                    <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)} aria-label="กรองตาม SLA" className={FORM_CONTROL_CLASS}>
                      {SLA_FILTER_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {hasActiveSmartFilters && (
                    <button type="button" onClick={clearSmartFilters} className={SECONDARY_BUTTON_CLASS}>
                      ล้างตัวกรอง
                    </button>
                  )}
                  <button type="button" onClick={handleViewAllClick} className={SECONDARY_BUTTON_CLASS}>
                    ดูประวัติทั้งหมด
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
                          <h4 className={`text-base font-black ${TEXT_PRIMARY_CLASS}`}>{activeTicket.title || "ไม่มีหัวข้อ"}</h4>
                          <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>{activeTicket.category || "ไม่ระบุหมวดหมู่"} • {formatDate(activeTicket.created_at)}</p>
                          <p className={`mt-3 rounded-xl border p-3 text-xs leading-relaxed ${isDarkTheme ? "border-slate-700 bg-slate-900/80 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
                            {activeTicket.description || "ไม่มีรายละเอียด"}
                          </p>
                        </div>

                        <div className={`mb-4 rounded-xl border p-3 ${isDarkTheme ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
                          <p className={`mb-2 text-[11px] font-black uppercase tracking-wider ${TEXT_MUTED_CLASS}`}>Activity Timeline</p>
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
                          เปิดรายละเอียดเต็ม
                        </button>
                      </div>
                    ) : (
                      <div className={`rounded-xl border border-dashed p-5 text-center ${isDarkTheme ? "border-slate-700" : "border-slate-300"}`}>
                        <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>ยังไม่มีรายการที่เลือก</p>
                        <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>เลือก Ticket จากรายการด้านซ้ายเพื่อดูรายละเอียด</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl border border-dashed p-8 text-center ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-slate-50/70"}`}>
                  <p className={`text-sm font-bold ${TEXT_SECONDARY_CLASS}`}>ไม่พบรายการแจ้งซ่อม</p>
                  <p className={`mt-1 text-xs ${TEXT_MUTED_CLASS}`}>ลองปรับคำค้นหาหรือล้างตัวกรองปัจจุบัน</p>
                </div>
              )}
            </div>

            <div className={`shrink-0 border-t px-4 py-4 sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900/95" : "border-slate-200 bg-white/95"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-xs ${TEXT_MUTED_CLASS}`}>กิจกรรมล่าสุดถูกย้ายมาเปิดผ่าน nav และใช้งานใน popup ได้ทันที</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setIsRecentActivityModalOpen(false)} className={SECONDARY_BUTTON_CLASS}>ปิด</button>
                  <button type="button" onClick={handleViewAllClick} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white">
                    เปิดประวัติทั้งหมด
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

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
          name: profile?.full_name || profile?.employee_code || profile?.email || "User",
          role: profile?.role || "user",
          avatar: profile?.avatar_url || profile?.id_card_url || "",
        }}
      />

      {/* Full Profile Popup */}
      {showProfileDetails && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            aria-label="ปิดรายละเอียดโปรไฟล์"
            onClick={() => setShowProfileDetails(false)}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="full-profile-title"
            className={`relative w-full max-w-lg overflow-hidden rounded-3xl border shadow-[0_28px_70px_-26px_rgba(43,89,176,0.42)] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-[#2b59b0]/20 bg-white text-slate-800"}`}
          >
            <div className="bg-gradient-to-r from-[#1c376d] via-[#2b59b0] to-[#244a95] px-4 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/80">Full Profile</p>
                  <h3 id="full-profile-title" className="mt-1 text-base font-black">{profile?.full_name || "ไม่พบชื่อ"}</h3>
                  <p className="mt-1 text-xs text-white/80">ข้อมูลที่ใช้ตอนสมัครสมาชิกพนักงาน</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileDetails(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="ปิด popup โปรไฟล์"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className={`max-h-[min(74vh,620px)] overflow-y-auto p-4 ${isDarkTheme ? "bg-slate-900/95" : "bg-white/95"}`}>
              <div className="space-y-2.5">
                {profileDetailItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.key}
                      className={`rounded-2xl border p-3.5 ${isDarkTheme ? "border-slate-700 bg-slate-800/80" : "border-slate-200 bg-[#F8FBFF]"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2b59b0] to-[#244a95] text-white">
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[10px] uppercase font-black tracking-[0.18em] ${TEXT_SUBTLE_CLASS}`}>{item.label}</p>
                          <p className={`mt-1.5 break-all text-sm font-bold leading-6 ${TEXT_SECONDARY_CLASS}`}>{item.value}</p>
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



