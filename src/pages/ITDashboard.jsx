import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
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
  LayoutGrid,
  FileSpreadsheet,
  CheckSquare,
  Square,
} from "lucide-react";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

const ITDashboard = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("INCOMING");
  const [isOnline, setIsOnline] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  // ใช้แค่อันนี้พอ
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [theme, setTheme] = useState("dark");
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [historyView, setHistoryView] = useState("CARD"); // CARD | TABLE
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });
  const [showProfileModal, setShowProfileModal] = useState(false);

  const today = new Date(); // สำหรับใช้เช็ควันที่ max ใน input

  // เพิ่ม Component Badge ด้านบนของ ITDashboard ถ้ายังไม่มี
  const Badge = ({ label, value, onClear, theme, color = "blue" }) => {
    const colorClasses = {
      blue:
        theme === "dark"
          ? "bg-blue-900/30 text-blue-300 border-blue-700/50"
          : "bg-blue-50 text-blue-600 border-blue-200",
      emerald:
        theme === "dark"
          ? "bg-emerald-900/30 text-emerald-300 border-emerald-700/50"
          : "bg-emerald-50 text-emerald-600 border-emerald-200",
      amber:
        theme === "dark"
          ? "bg-amber-900/30 text-amber-300 border-amber-700/50"
          : "bg-amber-50 text-amber-600 border-amber-200",
      rose:
        theme === "dark"
          ? "bg-rose-900/30 text-rose-300 border-rose-700/50"
          : "bg-rose-50 text-rose-600 border-rose-200",
    };

    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${colorClasses[color]}`}
      >
        <span className="text-xs font-bold opacity-80">{label}:</span>
        <span className="text-xs font-medium truncate max-w-[120px]">
          {value}
        </span>
        <button
          onClick={onClear}
          className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={10} />
        </button>
      </div>
    );
  };

  // 2. ฟังก์ชัน Export ข้อมูลเป็น CSV (เปิดใน Excel ได้)

  const [stats, setStats] = useState({
    todayCompleted: 0,
    weeklyAvg: 0,
    responseTime: 0,
    satisfaction: 0,
    urgentCount: 0,
    inProgressCount: 0,
  });

  const tableTheme = {
    wrapper:
      theme === "dark"
        ? "bg-gray-900 border-gray-700"
        : "bg-white border-gray-200",

    thead:
      theme === "dark"
        ? "bg-gray-800 text-gray-300"
        : "bg-gray-50 text-gray-600",

    row: theme === "dark" ? "hover:bg-gray-800/60" : "hover:bg-gray-50",

    textPrimary: theme === "dark" ? "text-gray-100" : "text-gray-900",

    textSecondary: theme === "dark" ? "text-gray-400" : "text-gray-600",

    textMuted: theme === "dark" ? "text-gray-500" : "text-gray-400",

    divider: theme === "dark" ? "divide-gray-700" : "divide-gray-200",
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

  const handleSort = (key) => {
    let direction = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
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

  // Load theme from localStorage and apply to document
  useEffect(() => {
    const savedTheme = localStorage.getItem("it-dashboard-theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("it-dashboard-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  useEffect(() => {
    let isMounted = true;
    const loadUserAndProfile = async () => {
      // 1. ดึงข้อมูล user จาก auth
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        if (isMounted) navigate("/login");
        return;
      }

      // 1. ตรวจสอบว่าใน useEffect มีการดึงข้อมูลจาก profiles หรือยัง
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

        // ✅ Priority: profiles.avatar_url -> profiles.id_card_url -> user_metadata.avatar_url -> user_metadata.id_card_url -> Google picture
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
  }, [navigate]);

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
      title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">ออกจากระบบ</span>`,
      html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">คุณต้องการออกจากระบบหรือไม่?</span>`,
      icon: "question",
      background: theme === "dark" ? "#1f2937" : "#ffffff",
      color: theme === "dark" ? "#fff" : "#1f2937",
      showCancelButton: true,
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      customClass: {
        popup: `rounded-2xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`,
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
        title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">คุณอยู่ในสถานะออฟไลน์</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">กรุณาเปิดสถานะออนไลน์เพื่อรับงาน</span>`,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    const { value: accept } = await Swal.fire({
      title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">ยืนยันการรับงาน</span>`,
      html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">คุณต้องการรับงานนี้เข้าคลังงานของคุณหรือไม่?</span>`,
      icon: "question",
      background: theme === "dark" ? "#1f2937" : "#ffffff",
      color: theme === "dark" ? "#fff" : "#1f2937",
      showCancelButton: true,
      confirmButtonText: "รับงาน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#6b7280",
      customClass: {
        popup: `rounded-2xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`,
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
        title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">รับงานสำเร็จ!</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">เริ่มเดินทางได้เลย</span>`,
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
        title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">เกิดข้อผิดพลาด</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">ไม่สามารถรับงานได้</span>`,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  // Delete history ticket
  const handleDeleteTicket = async (ticket) => {
    const { value: confirm } = await Swal.fire({
      title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">ยืนยันการลบ</span>`,
      html: `
        <div class="text-left">
          <p class="${theme === "dark" ? "text-white/80" : "text-gray-700"} mb-3">คุณต้องการลบประวัติงานนี้หรือไม่?</p>
          <div class="${theme === "dark" ? "bg-rose-900/30" : "bg-rose-50"} p-3 rounded-xl border ${theme === "dark" ? "border-rose-700/50" : "border-rose-200"}">
            <p class="text-sm font-bold ${theme === "dark" ? "text-rose-300" : "text-rose-600"}">Ticket #${ticket.id.toString().slice(-6)}</p>
            <p class="text-sm ${theme === "dark" ? "text-white/80" : "text-gray-700"} mt-1">${ticket.title}</p>
            <p class="text-xs ${theme === "dark" ? "text-white/60" : "text-gray-500"} mt-2">ข้อมูลจะถูกลบถาวรและไม่สามารถกู้คืนได้</p>
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
        popup: `rounded-2xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`,
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
        title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">ลบสำเร็จ!</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">ประวัติงานถูกลบเรียบร้อยแล้ว</span>`,
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
        title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">เกิดข้อผิดพลาด</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">ไม่สามารถลบประวัติได้</span>`,
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

        html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">ไม่สามารถเปิดการนำทางได้</span>`,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    const encodedLocation = encodeURIComponent(location);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;

    Swal.fire({
      title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">เปิดการนำทาง</span>`,
      html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">ต้องการเปิด Google Maps ไปยัง ${location} หรือไม่?</span>`,
      icon: "question",
      background: theme === "dark" ? "#1f2937" : "#ffffff",
      color: theme === "dark" ? "#fff" : "#1f2937",
      showCancelButton: true,
      confirmButtonText: "เปิด Google Maps",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#6b7280",
      customClass: {
        popup: `rounded-2xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`,
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
      title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">บันทึกผลการซ่อม</span>`,
      html: `
        <div class="text-left space-y-4">
          <div class="${theme === "dark" ? "bg-gradient-to-r from-blue-900/30 to-indigo-900/30" : "bg-blue-50"} p-4 rounded-xl border ${theme === "dark" ? "border-blue-700/30" : "border-blue-200"}">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-xs ${theme === "dark" ? "text-blue-300" : "text-blue-600"} font-bold">Ticket ID</p>
                <p class="font-mono font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}">#${ticket.id.toString().slice(-6)}</p>
              </div>
              <div>
                <p class="text-xs ${theme === "dark" ? "text-blue-300" : "text-blue-600"} font-bold">เวลาเริ่ม</p>
                <p class="${theme === "dark" ? "text-white" : "text-gray-900"}">${new Date(ticket.started_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</p>
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
              class="w-full p-3 ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm placeholder-gray-500" 
              rows="4" 
              placeholder="ระบุรายละเอียดการซ่อม..."
            ></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-bold ${theme === "dark" ? "text-blue-300" : "text-blue-600"} mb-1">อุปกรณ์ที่เปลี่ยน</label>
            <input 
              id="swal-parts" 
              class="w-full p-3 ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} border rounded-xl outline-none text-sm placeholder-gray-500" 
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
                class="block w-full text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}
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
            <p class="text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"} mt-2">ถ่ายรูปหลักฐานหลังซ่อมเสร็จ</p>
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
        popup: `rounded-2xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`,
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
        title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">ปิดงานสำเร็จ!</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">บันทึกข้อมูลเรียบร้อยแล้ว</span>`,
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
        title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">เกิดข้อผิดพลาด</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">${error.message}</span>`,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  // View ticket details
  const handleViewDetails = (ticket) => {
    Swal.fire({
      title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">รายละเอียด Ticket #${ticket.id.toString().slice(-6)}</span>`,
      html: `
        <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="${theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-900" : "bg-gradient-to-r from-gray-50 to-gray-100"} p-4 rounded-xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}">
              <p class="text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} font-bold uppercase">สถานะ</p>
              <p class="text-sm font-bold ${getStatusColor(ticket.status)} mt-1">${getStatusText(ticket.status)}</p>
            </div>
            <div class="${theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-900" : "bg-gradient-to-r from-gray-50 to-gray-100"} p-4 rounded-xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}">
              <p class="text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} font-bold uppercase">ความสำคัญ</p>
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
                  <p class="text-base font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}">${ticket.reporter_name || "ไม่ระบุ"}</p>
                  <span class="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                    ${ticket.reporter_emp_id || "ไม่ระบุรหัส"}
                  </span>
                  <span class="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                    ${ticket.reporter_dept || "ไม่ระบุแผนก"}
                  </span>
                </div>
                <div class="flex items-center gap-3 mt-2 flex-wrap">
                  ${
                    ticket.reporter_phone
                      ? `
                  <div class="flex items-center gap-1">
                    <Phone class="w-3 h-3 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}" />
                    <span class="text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}">${ticket.reporter_phone}</span>
                  </div>
                  `
                      : ""
                  }
                  ${
                    ticket.reporter_email
                      ? `
                  <div class="flex items-center gap-1">
                    <Mail class="w-3 h-3 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}" />
                    <span class="text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"} truncate max-w-[150px]">${ticket.reporter_email}</span>
                  </div>
                  `
                      : ""
                  }
                </div>
              </div>
            </div>
          </div>
          
          <div class="${theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-900" : "bg-gradient-to-r from-gray-50 to-gray-100"} p-4 rounded-xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}">
            <p class="text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} font-bold uppercase mb-2">หัวข้อปัญหา</p>
            <p class="text-base font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}">${ticket.title}</p>
          </div>
          
          <div class="${theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-900" : "bg-gradient-to-r from-gray-50 to-gray-100"} p-4 rounded-xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}">
            <p class="text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} font-bold uppercase mb-2">รายละเอียด</p>
            <p class="text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"} italic leading-relaxed">"${ticket.description}"</p>
          </div><br/>
          
        
          </div>
          
          <div class="${theme === "dark" ? "bg-gradient-to-r from-blue-900/30 to-indigo-900/30" : "bg-blue-50"} p-4 rounded-xl border ${theme === "dark" ? "border-blue-700/30" : "border-blue-200"}">
            <p class="text-xs ${theme === "dark" ? "text-blue-300" : "text-blue-600"} font-bold uppercase mb-3">ประวัติเวลา</p>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span class="text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}">แจ้งเมื่อ:</span>
                </div>
                <span class="text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}">
                  ${new Date(ticket.created_at).toLocaleString("th-TH")}
                </span>
              </div>
              
              ${
                ticket.started_at
                  ? `
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span class="text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}">รับงานเมื่อ:</span>
                </div>
                <span class="text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}">
                  ${new Date(ticket.started_at).toLocaleString("th-TH")}
                </span>
              </div>
              `
                  : ""
              }
              
              ${
                ticket.closed_at
                  ? `
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span class="text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}">ปิดงานเมื่อ:</span>
                </div>
                <span class="text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}">
                  ${new Date(ticket.closed_at).toLocaleString("th-TH")}
                </span>
              </div>
              `
                  : ""
              }
              
              ${
                ticket.started_at && ticket.closed_at
                  ? `
              <div class="pt-3 border-t ${theme === "dark" ? "border-blue-800/50" : "border-blue-200"}">
                <div class="flex items-center justify-between">
                  <span class="text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}">ระยะเวลาซ่อม:</span>
                  <span class="text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}">
                    ${calculateDuration(ticket.started_at, ticket.closed_at)}
                  </span>
                </div>
              </div>
              `
                  : ""
              }
            </div>
          </div><br/>
          
          ${
            ticket.solution_note
              ? `
          <div class="${theme === "dark" ? "bg-gradient-to-r from-emerald-900/30 to-green-900/30" : "bg-emerald-50"} p-4 rounded-xl border ${theme === "dark" ? "border-emerald-700/30" : "border-emerald-200"}">
            <p class="text-xs ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"} font-bold uppercase mb-2">วิธีแก้ไข</p>
            <p class="text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"} leading-relaxed">${ticket.solution_note}</p>
          </div>
          `
              : ""
          }
          <br/>
          ${
            ticket.parts_used
              ? `
          <div class="${theme === "dark" ? "bg-gradient-to-r from-amber-900/30 to-yellow-900/30" : "bg-amber-50"} p-4 rounded-xl border ${theme === "dark" ? "border-amber-700/30" : "border-amber-200"}">
            <p class="text-xs ${theme === "dark" ? "text-amber-300" : "text-amber-600"} font-bold uppercase mb-2">อะไหล่ที่ใช้</p>
            <p class="text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}">${ticket.parts_used}</p>
          </div>
          `
              : ""
          }
          <br/>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${
              ticket.image_url
                ? `
            <div class="${theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-900" : "bg-gradient-to-r from-gray-50 to-gray-100"} p-4 rounded-xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}">
              <p class="text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} font-bold uppercase mb-3">รูปก่อนซ่อม</p>
              <img 
                src="${ticket.image_url}" 
                alt="Before" 
                class="w-full h-48 object-cover rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-300"} hover:scale-[1.02] transition-transform cursor-zoom-in"
                onclick="window.open('${ticket.image_url}', '_blank')"
              />
            </div>
            `
                : ""
            }
            
            ${
              ticket.image_after_url
                ? `
            <div class="${theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-900" : "bg-gradient-to-r from-gray-50 to-gray-100"} p-4 rounded-xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}">
              <p class="text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} font-bold uppercase mb-3">รูปหลังซ่อม</p>
              <img 
                src="${ticket.image_after_url}" 
                alt="After" 
                class="w-full h-48 object-cover rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-300"} hover:scale-[1.02] transition-transform cursor-zoom-in"
                onclick="window.open('${ticket.image_after_url}', '_blank')"
              />
            </div>
            `
                : ""
            }
          </div><br/>
          
          ${
            ticket.status === "CLOSED" && ticket.closed_by_name
              ? `
          <div class="${theme === "dark" ? "bg-gradient-to-r from-emerald-900/30 to-green-900/30" : "bg-emerald-50"} p-4 rounded-xl border ${theme === "dark" ? "border-emerald-700/30" : "border-emerald-200"}">
            <div class="flex items-center justify-between"><br/>
              <div>
                <p class="text-xs font-bold ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"} uppercase">ปิดงานโดย</p>
                <p class="text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"} mt-1">${ticket.closed_by_name}</p>
              </div><br/>
              <div class="text-right">
                <p class="text-xs ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}">รหัสพนักงาน</p>
                <p class="text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}">${ticket.assigned_employee_id || currentUser?.employeeId || "ไม่ระบุ"}</p>
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
        popup: `rounded-2xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`,
        closeButton:
          theme === "dark"
            ? "text-gray-400 hover:text-white"
            : "text-gray-500 hover:text-gray-700",
      },
    });
  };

  // Calculate duration between two dates
  const calculateDuration = (start, end) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = endTime - startTime;

    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} ชม. ${minutes} นาที`;
    }
    return `${minutes} นาที`;
  };

  // Filter tickets
  const incomingTickets = tickets.filter((t) => t.status === "NEW");
  const myActiveTickets = tickets.filter(
    (t) => t.assigned_to === currentUser?.id && t.status === "IN_PROGRESS",
  );
  const historyTickets = tickets.filter((t) => t.status === "CLOSED");

  // ค้นหา const filteredTickets และแทนที่ด้วยโค้ดชุดนี้
  const filteredTickets = tickets.filter((ticket) => {
    // 1. กรองตาม Tab
    const matchesTab =
      activeTab === "INCOMING"
        ? ticket.status === "NEW"
        : activeTab === "ACTIVE"
          ? ticket.status === "IN_PROGRESS" &&
            ticket.assigned_to === currentUser?.id
          : activeTab === "HISTORY"
            ? ticket.status === "CLOSED"
            : true;

    // 2. กรองตามคำค้นหา
    const matchesSearch =
      ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.reporter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id?.toString().includes(searchQuery);

    // 3. กรองตามวันที่ - ใช้ dateRange
    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const ticketDate = ticket.created_at.split("T")[0];
      matchesDate =
        ticketDate >= dateRange.start && ticketDate <= dateRange.end;
    }

    return matchesTab && matchesSearch && matchesDate;
  });

  // --- เพิ่มฟังก์ชันจัดการตัวกรองวันที่ ---
  const handleApply = () => {
    setShowDateFilter(false); // ปิดหน้าต่าง Modal
    // เมื่อ State เปลี่ยน filteredTickets จะคำนวณใหม่ให้อัตโนมัติ
  };

  const handleClear = () => {
    setStartDate("");
    setEndDate("");
    setDateRange({ start: null, end: null });
    setShowDateFilter(false);
  };

  const applyQuickPreset = (preset) => {
    const end = new Date();
    const start = new Date();

    if (preset === "วันนี้") {
      // ใช้วันที่เดียวกันทั้งเริ่มและจบ
      start.setDate(end.getDate());
    } else if (preset === "7 วันล่าสุด") {
      start.setDate(end.getDate() - 7);
    } else if (preset === "30 วันล่าสุด") {
      start.setDate(end.getDate() - 30);
    }

    // ฟอร์แมตเป็น YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split("T")[0];

    setDateRange({
      start: formatDate(start),
      end: formatDate(end),
    });
  };

  const quickPresets = [
    { label: "วันนี้" },
    { label: "7 วันล่าสุด" },
    { label: "30 วันล่าสุด" },
  ];

  const handleExportExcelWithImages = async (selectedOnly = false) => {
    try {
      let ticketsToExport = filteredTickets;

      if (selectedOnly && selectedTickets.length > 0) {
        ticketsToExport = filteredTickets.filter((ticket) =>
          selectedTickets.includes(ticket.id),
        );
      }

      if (ticketsToExport.length === 0) {
        Swal.fire({
          icon: "warning",
          title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">ไม่พบข้อมูล</span>`,
          html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">ไม่มีข้อมูลที่ต้องการ Export</span>`,
          background: theme === "dark" ? "#1f2937" : "#ffffff",
          color: theme === "dark" ? "#fff" : "#1f2937",
          confirmButtonColor: "#3b82f6",
        });
        return;
      }

      // แสดง loading
      Swal.fire({
        title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">กำลังสร้างรายงาน Excel...</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">กำลังดาวน์โหลดรูปภาพและจัดเรียงข้อมูล</span>`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
      });

      // สร้าง Workbook ใหม่
      const workbook = new ExcelJS.Workbook();
      workbook.creator = currentUser?.name || "IT Technician";
      workbook.created = new Date();
      workbook.modified = new Date();

      // ===== สร้าง Sheet หลัก (Ticket History) =====
      const worksheet = workbook.addWorksheet("Ticket History", {
        pageSetup: {
          paperSize: 9, // A4
          orientation: "landscape",
          fitToPage: true,
          fitToHeight: 1,
          fitToWidth: 1,
        },
        views: [
          { state: "frozen", ySplit: 1 }, // Freeze header row
        ],
      });

      // กำหนดคอลัมน์
      worksheet.columns = [
        { header: "No.", key: "no", width: 6 },
        { header: "Ticket ID", key: "ticketId", width: 15 },
        { header: "สถานะ", key: "status", width: 12 },
        { header: "ระดับความสำคัญ", key: "priority", width: 14 },
        { header: "หัวข้อปัญหา", key: "title", width: 30 },
        { header: "ผู้แจ้ง", key: "reporterName", width: 15 },
        { header: "รหัสพนักงาน", key: "reporterId", width: 12 },
        { header: "แผนก", key: "department", width: 15 },
        { header: "เบอร์ติดต่อ", key: "phone", width: 12 },
        { header: "อีเมล", key: "email", width: 20 },
        { header: "หมวดหมู่", key: "category", width: 15 },
        { header: "อุปกรณ์", key: "device", width: 15 },
        { header: "รายละเอียดปัญหา", key: "description", width: 40 },
        { header: "สถานที่", key: "location", width: 20 },
        { header: "วันที่แจ้ง", key: "createdDate", width: 12 },
        { header: "เวลาแจ้ง", key: "createdTime", width: 10 },
        { header: "ช่างรับงาน", key: "technician", width: 15 },
        { header: "รหัสช่าง", key: "techId", width: 12 },
        { header: "วันที่รับงาน", key: "startDate", width: 12 },
        { header: "เวลาเริ่มงาน", key: "startTime", width: 10 },
        { header: "วิธีแก้ไข", key: "solution", width: 40 },
        { header: "อะไหล่ที่ใช้", key: "parts", width: 20 },
        { header: "วันที่ปิดงาน", key: "closedDate", width: 12 },
        { header: "เวลาปิดงาน", key: "closedTime", width: 10 },
        { header: "ช่างปิดงาน", key: "closedBy", width: 15 },
        { header: "ระยะเวลาซ่อม (นาที)", key: "durationMin", width: 12 },
        { header: "ระยะเวลาซ่อม", key: "durationText", width: 15 },
        { header: "รูปก่อนซ่อม", key: "imageBefore", width: 20 },
        { header: "รูปหลังซ่อม", key: "imageAfter", width: 20 },
        { header: "หมายเหตุ", key: "notes", width: 20 },
        { header: "สร้างเมื่อ", key: "createdAt", width: 18 },
        { header: "อัพเดทเมื่อ", key: "updatedAt", width: 18 },
      ];

      // Style สำหรับ header
      worksheet.getRow(1).font = {
        bold: true,
        size: 11,
        color: { argb: "FFFFFF" },
      };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "2E75B6" }, // สีน้ำเงินเข้ม
      };
      worksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      worksheet.getRow(1).height = 25;

      // เพิ่มข้อมูลทีละแถว
      for (let i = 0; i < ticketsToExport.length; i++) {
        const ticket = ticketsToExport[i];
        const rowIndex = i + 2; // +2 เพราะแถวที่ 1 เป็น header

        const createdDate = new Date(ticket.created_at);
        const startedDate = ticket.started_at
          ? new Date(ticket.started_at)
          : null;
        const closedDate = ticket.closed_at ? new Date(ticket.closed_at) : null;
        const updatedDate = ticket.updated_at
          ? new Date(ticket.updated_at)
          : null;

        // คำนวณระยะเวลา
        let durationMinutes = 0;
        let durationText = "-";

        if (startedDate && closedDate) {
          const diffMs = closedDate - startedDate;
          durationMinutes = Math.floor(diffMs / (1000 * 60));
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;

          if (hours > 0) {
            durationText = `${hours} ชม. ${minutes} นาที`;
          } else {
            durationText = `${minutes} นาที`;
          }
        }

        // เพิ่มแถวข้อมูล
        const row = worksheet.addRow({
          no: i + 1,
          ticketId:
            ticket.ticket_no || `IT-${ticket.id.toString().padStart(5, "0")}`,
          status: getStatusText(ticket.status),
          priority: getPriorityText(ticket.priority),
          title: ticket.title || "-",
          reporterName: ticket.reporter_name || "-",
          reporterId: ticket.reporter_emp_id || "-",
          department: ticket.reporter_dept || "-",
          phone: ticket.reporter_phone || "-",
          email: ticket.reporter_email || "-",
          category: ticket.category || "-",
          device: ticket.device_type || "-",
          description: ticket.description || "-",
          location: ticket.location || "-",
          createdDate: createdDate.toLocaleDateString("th-TH"),
          createdTime: createdDate.toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          technician: ticket.assigned_name || "-",
          techId: ticket.assigned_employee_id || "-",
          startDate: startedDate
            ? startedDate.toLocaleDateString("th-TH")
            : "-",
          startTime: startedDate
            ? startedDate.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
          solution: ticket.solution_note || "-",
          parts: ticket.parts_used || "-",
          closedDate: closedDate ? closedDate.toLocaleDateString("th-TH") : "-",
          closedTime: closedDate
            ? closedDate.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
          closedBy: ticket.closed_by_name || "-",
          durationMin: durationMinutes,
          durationText: durationText,
          imageBefore: ticket.image_url ? "รูปก่อนซ่อม" : "ไม่มีรูป",
          imageAfter: ticket.image_after_url ? "รูปหลังซ่อม" : "ไม่มีรูป",
          notes: ticket.notes || "-",
          createdAt: createdDate.toLocaleString("th-TH"),
          updatedAt: updatedDate ? updatedDate.toLocaleString("th-TH") : "-",
        });

        // ตั้งค่า style สำหรับแถวข้อมูล
        row.font = { size: 10 };
        row.alignment = {
          vertical: "top",
          horizontal: "left",
          wrapText: true,
        };
        row.height = 60; // ความสูงเริ่มต้นสำหรับแถวที่มีรูป

        // Conditional Formatting สำหรับสถานะ
        const statusCell = row.getCell("status");
        switch (ticket.status) {
          case "CLOSED":
            statusCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "C6EFCE" }, // เขียวอ่อน
            };
            statusCell.font = { bold: true, color: { argb: "006100" } };
            break;
          case "IN_PROGRESS":
            statusCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFEB9C" }, // เหลืองอ่อน
            };
            statusCell.font = { bold: true, color: { argb: "9C6500" } };
            break;
          case "NEW":
            statusCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFC7CE" }, // แดงอ่อน
            };
            statusCell.font = { bold: true, color: { argb: "9C0006" } };
            break;
        }
        statusCell.alignment = { horizontal: "center", vertical: "middle" };

        // Conditional Formatting สำหรับความสำคัญ
        const priorityCell = row.getCell("priority");
        switch (ticket.priority) {
          case "urgent":
            priorityCell.font = { bold: true, color: { argb: "FF0000" } };
            break;
          case "normal":
            priorityCell.font = { bold: true, color: { argb: "FF9900" } };
            break;
          case "low":
            priorityCell.font = { color: { argb: "00B050" } };
            break;
        }
        priorityCell.alignment = { horizontal: "center", vertical: "middle" };

        // ===== ดาวน์โหลดและเพิ่มรูปภาพ =====
        try {
          // รูปก่อนซ่อม
          if (ticket.image_url) {
            const beforeImageResponse = await fetch(ticket.image_url);
            const beforeImageBuffer = await beforeImageResponse.arrayBuffer();

            const beforeImageId = workbook.addImage({
              buffer: beforeImageBuffer,
              extension: "jpeg", // หรือ 'png' ตามจริง
            });

            // เพิ่มรูปภาพใน cell
            worksheet.addImage(beforeImageId, {
              tl: { col: 27, row: rowIndex - 1 }, // column AA (27), row เริ่มจาก 0
              br: { col: 28, row: rowIndex }, // column AB (28)
              editAs: "oneCell",
            });
          }

          // รูปหลังซ่อม
          if (ticket.image_after_url) {
            const afterImageResponse = await fetch(ticket.image_after_url);
            const afterImageBuffer = await afterImageResponse.arrayBuffer();

            const afterImageId = workbook.addImage({
              buffer: afterImageBuffer,
              extension: "jpeg",
            });

            // เพิ่มรูปภาพใน cell
            worksheet.addImage(afterImageId, {
              tl: { col: 28, row: rowIndex - 1 }, // column AB (28)
              br: { col: 29, row: rowIndex }, // column AC (29)
              editAs: "oneCell",
            });
          }
        } catch (imageError) {
          console.warn(
            `Cannot load images for ticket ${ticket.id}:`,
            imageError,
          );
          // ยังคงดำเนินการต่อแม้โหลดรูปไม่สำเร็จ
        }

        // ปรับความสูงแถวตามความยาวข้อความ
        const descriptionCell = row.getCell("description");
        const solutionCell = row.getCell("solution");
        const maxTextLength = Math.max(
          (descriptionCell.value?.toString() || "").length,
          (solutionCell.value?.toString() || "").length,
        );

        // ปรับความสูงตามจำนวนบรรทัด (ประมาณ 60 ตัวอักษรต่อบรรทัด)
        const lines = Math.ceil(maxTextLength / 60);
        row.height = Math.max(60, lines * 20); // ขั้นต่ำ 60px, เพิ่ม 20px ต่อบรรทัด
      }

      // ตั้งค่า Auto Filter
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columnCount },
      };

      // ===== สร้าง Summary Sheet =====
      const summarySheet = workbook.addWorksheet("สรุปสถิติ", {
        pageSetup: {
          paperSize: 9, // A4
          orientation: "portrait",
        },
      });

      // Header ของ Summary Sheet
      summarySheet.mergeCells("A1:F1");
      const titleCell = summarySheet.getCell("A1");
      titleCell.value = "รายงานสรุปสถิติงานซ่อม IT";
      titleCell.font = { bold: true, size: 16, color: { argb: "1F4E78" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      summarySheet.getRow(1).height = 30;

      // ข้อมูลการออกรายงาน
      summarySheet.getCell("A3").value = "ข้อมูลการออกรายงาน";
      summarySheet.getCell("A3").font = { bold: true, size: 12 };
      summarySheet.mergeCells("A3:F3");

      const reportInfo = [
        [
          "วันที่ออกรายงาน",
          new Date().toLocaleDateString("th-TH"),
          "ผู้ออกรายงาน",
          currentUser?.name || "IT Technician",
        ],
        [
          "เวลาที่ออกรายงาน",
          new Date().toLocaleTimeString("th-TH"),
          "รหัสพนักงาน",
          currentUser?.employeeId || "-",
        ],
        [
          "ช่วงเวลาที่เลือก",
          `${dateRange.start ? new Date(dateRange.start).toLocaleDateString("th-TH") : "ทั้งหมด"} ถึง ${dateRange.end ? new Date(dateRange.end).toLocaleDateString("th-TH") : "ทั้งหมด"}`,
          "แผนก",
          currentUser?.department || "IT Support",
        ],
        ["จำนวน Ticket ทั้งหมด", ticketsToExport.length, "", ""],
      ];

      reportInfo.forEach((info, index) => {
        const rowNum = 4 + index;
        summarySheet.getCell(`A${rowNum}`).value = info[0];
        summarySheet.getCell(`B${rowNum}`).value = info[1];
        summarySheet.getCell(`B${rowNum}`).font = { bold: true };

        if (info[2]) {
          summarySheet.getCell(`D${rowNum}`).value = info[2];
          summarySheet.getCell(`E${rowNum}`).value = info[3];
          summarySheet.getCell(`E${rowNum}`).font = { bold: true };
        }
      });

      // สถิติตามสถานะ
      const statusRowStart = 9;
      summarySheet.getCell(`A${statusRowStart}`).value = "สรุปตามสถานะ";
      summarySheet.getCell(`A${statusRowStart}`).font = {
        bold: true,
        size: 12,
      };
      summarySheet.mergeCells(`A${statusRowStart}:C${statusRowStart}`);

      const statusStats = {};
      ticketsToExport.forEach((ticket) => {
        const status = getStatusText(ticket.status);
        statusStats[status] = (statusStats[status] || 0) + 1;
      });

      summarySheet.getCell(`A${statusRowStart + 1}`).value = "สถานะ";
      summarySheet.getCell(`B${statusRowStart + 1}`).value = "จำนวน";
      summarySheet.getCell(`C${statusRowStart + 1}`).value = "ร้อยละ";

      Object.entries(statusStats).forEach(([status, count], index) => {
        const rowNum = statusRowStart + 2 + index;
        const percent = ((count / ticketsToExport.length) * 100).toFixed(2);

        summarySheet.getCell(`A${rowNum}`).value = status;
        summarySheet.getCell(`B${rowNum}`).value = count;
        summarySheet.getCell(`C${rowNum}`).value = Number(percent);
        summarySheet.getCell(`C${rowNum}`).numFmt = "0.00%";
      });

      // สถิติตามความสำคัญ
      const priorityRowStart =
        statusRowStart + Object.keys(statusStats).length + 3;
      summarySheet.getCell(`A${priorityRowStart}`).value =
        "สรุปตามระดับความสำคัญ";
      summarySheet.getCell(`A${priorityRowStart}`).font = {
        bold: true,
        size: 12,
      };
      summarySheet.mergeCells(`A${priorityRowStart}:C${priorityRowStart}`);

      const priorityStats = {};
      ticketsToExport.forEach((ticket) => {
        const priority = getPriorityText(ticket.priority);
        priorityStats[priority] = (priorityStats[priority] || 0) + 1;
      });

      summarySheet.getCell(`A${priorityRowStart + 1}`).value = "ระดับความสำคัญ";
      summarySheet.getCell(`B${priorityRowStart + 1}`).value = "จำนวน";
      summarySheet.getCell(`C${priorityRowStart + 1}`).value = "ร้อยละ";

      Object.entries(priorityStats).forEach(([priority, count], index) => {
        const rowNum = priorityRowStart + 2 + index;
        const percent = ((count / ticketsToExport.length) * 100).toFixed(2);

        summarySheet.getCell(`A${rowNum}`).value = priority;
        summarySheet.getCell(`B${rowNum}`).value = count;
        summarySheet.getCell(`C${rowNum}`).value = Number(percent);
        summarySheet.getCell(`C${rowNum}`).numFmt = "0.00%";
      });

      // ปรับ column width สำหรับ summary sheet
      summarySheet.columns = [
        { width: 25 },
        { width: 12 },
        { width: 12 },
        { width: 25 },
        { width: 12 },
        { width: 12 },
      ];

      // ===== บันทึกไฟล์ =====
      const exportDate = new Date();
      const fileName = `IT_Ticket_Report_${exportDate.getFullYear()}${(exportDate.getMonth() + 1).toString().padStart(2, "0")}${exportDate.getDate().toString().padStart(2, "0")}_${currentUser?.employeeId || "ALL"}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, fileName);

      // ปิด loading และแสดงผลสำเร็จ
      Swal.close();

      Swal.fire({
        icon: "success",
        title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">✅ Export Excel สำเร็จ!</span>`,
        html: `
<div class="text-left font-sans">
  <!-- Header -->
  <div class="mb-4 pb-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-xl ${theme === "dark" ? "bg-emerald-900/30" : "bg-emerald-100"}">
        <FileSpreadsheet class="w-6 h-6 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}" />
      </div>
      <div class="overflow-hidden">
        <p class="text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} uppercase tracking-wide font-medium">ออกรายงานสำเร็จ</p>
        <p class="text-sm font-mono ${theme === "dark" ? "text-emerald-300" : "text-emerald-700"} truncate">${fileName}</p>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 gap-3 mb-5">
    <div class="${theme === "dark" ? "bg-gray-800/40" : "bg-gray-50"} p-3 rounded-xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}">
      <p class="text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} mb-1">จำนวนข้อมูล</p>
      <p class="text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}">${ticketsToExport.length}</p>
    </div>
    <div class="${theme === "dark" ? "bg-gray-800/40" : "bg-gray-50"} p-3 rounded-xl border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}">
      <p class="text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} mb-1">จำนวนรูปภาพ</p>
      <p class="text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}">${ticketsToExport.filter((t) => t.image_url || t.image_after_url).length}</p>
    </div>
  </div>

  <!-- Features -->
  <div class="mb-5">
    <p class="text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} mb-3 font-medium">คุณสมบัติของรายงาน</p>
    <div class="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"}">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
        <span>รูปภาพในเซลล์</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
        <span>ปรับความสูงอัตโนมัติ</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
        <span>สีแสดงสถานะ</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
        <span>สรุปสถิติ</span>
      </div>
    </div>
  </div>

  <!-- Note -->
  <div class="flex items-start gap-2 py-3 px-4 rounded-xl ${theme === "dark" ? "bg-blue-900/20" : "bg-blue-50"} border ${theme === "dark" ? "border-blue-800/30" : "border-blue-200"}">
    <span class="text-xs ${theme === "dark" ? "text-blue-300" : "text-blue-700"}">
      📄 รายงานนี้พร้อมสำหรับการตรวจสอบ Audit และการนำเสนอผู้บริหาร
    </span>
  </div>
</div>
`,
        timer: 6000,
        showConfirmButton: false,
        position: "center",
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        customClass: {
          popup: `rounded-2xl border-2 ${theme === "dark" ? "border-emerald-700 shadow-[0_0_30px_rgba(16,185,129,0.3)]" : "border-emerald-300 shadow-xl"}`,
        },
      });
    } catch (error) {
      console.error("Export error:", error);
      Swal.fire({
        icon: "error",
        title: `<span class="${theme === "dark" ? "text-white" : "text-gray-900"}">Export ไม่สำเร็จ</span>`,
        html: `<span class="${theme === "dark" ? "text-white/80" : "text-gray-700"}">เกิดข้อผิดพลาด: ${error.message}</span>`,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#fff" : "#1f2937",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  // เรียงลำดับ tickets สำหรับ Table View
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (
      sortConfig.key === "created_at" ||
      sortConfig.key === "started_at" ||
      sortConfig.key === "closed_at"
    ) {
      const dateA = new Date(a[sortConfig.key] || 0);
      const dateB = new Date(b[sortConfig.key] || 0);
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }

    const aValue = a[sortConfig.key] || "";
    const bValue = b[sortConfig.key] || "";

    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case "NEW":
        return "text-rose-400";
      case "IN_PROGRESS":
        return "text-amber-400";
      case "CLOSED":
        return "text-emerald-400";
      default:
        return theme === "dark" ? "text-gray-400" : "text-gray-600";
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case "NEW":
        return theme === "dark"
          ? "bg-gradient-to-r from-rose-900/30 to-pink-900/30 border-rose-700/30"
          : "bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200";
      case "IN_PROGRESS":
        return theme === "dark"
          ? "bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-amber-700/30"
          : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200";
      case "CLOSED":
        return theme === "dark"
          ? "bg-gradient-to-r from-emerald-900/30 to-green-900/30 border-emerald-700/30"
          : "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200";
      default:
        return theme === "dark"
          ? "bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700"
          : "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "NEW":
        return "ใหม่";
      case "IN_PROGRESS":
        return "กำลังดำเนินการ";
      case "CLOSED":
        return "ปิดงานแล้ว";
      default:
        return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "text-rose-400";
      case "normal":
        return "text-amber-400";
      case "low":
        return "text-emerald-400";
      default:
        return theme === "dark" ? "text-gray-400" : "text-gray-600";
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case "urgent":
        return "ด่วนมาก";
      case "normal":
        return "สำคัญ";
      case "low":
        return "ปกติ";
      default:
        return priority;
    }
  };

  const getDeviceIcon = (categoryName) => {
    const cat = categoryName?.toLowerCase() || "";

    // ใช้ Monitor แทนถ้า Globe หรือ Lock ยังไม่ได้ Import (กัน Error)
    if (cat.includes("hardware") || cat.includes("computer"))
      return <Monitor size={14} className="text-blue-500" />;

    if (cat.includes("network"))
      // เช็คว่ามี Globe ไหม ถ้าไม่มีให้ใช้ Wifi แทน (ซึ่งคุณมี Import ไว้แล้ว)
      return typeof Globe !== "undefined" ? (
        <Wifi size={14} className="text-cyan-500" />
      ) : (
        <Globe size={14} className="text-cyan-500" />
      );

    if (cat.includes("printer"))
      return <Printer size={14} className="text-orange-500" />;

    if (cat.includes("email") || cat.includes("mail"))
      return <Mail size={14} className="text-purple-500" />;

    if (cat.includes("system"))
      // เช็คว่ามี Lock ไหม ถ้าไม่มีให้ใช้ Shield แทน (ซึ่งคุณมี Import ไว้แล้ว)
      return typeof Lock !== "undefined" ? (
        <Lock size={14} className="text-slate-500" />
      ) : (
        <Shield size={14} className="text-slate-500" />
      );

    return <Settings size={14} className="text-slate-400" />;
  };

  // Date range picker component
  // --- Component ตัวเลือกวันที่ (DateRangePicker) ---
  const DateRangePicker = ({ dateRange, setDateRange, onClose, theme }) => {
    const handleApply = () => {
      // ตรวจสอบวันที่ถูกต้องก่อนปิด
      if (dateRange.start && dateRange.end && dateRange.start > dateRange.end) {
        // ถ้าวันที่เริ่มมากกว่าวันที่สิ้นสุด ให้สลับค่า
        setDateRange({
          start: dateRange.end,
          end: dateRange.start,
        });
      }
      onClose();
    };

    const handleClear = () => {
      setDateRange({ start: "", end: "" });
      onClose();
    };

    return (
      <div
        className={`p-4 rounded-2xl shadow-2xl border w-[320px] ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h4
            className={`text-sm font-bold ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}
          >
            เลือกช่วงเวลา
          </h4>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label
              className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
            >
              เริ่มต้น
            </label>
            <input
              type="date"
              value={dateRange.start || ""}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className={`w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 ${
                theme === "dark"
                  ? "bg-gray-900 border-gray-600 text-white placeholder-gray-500"
                  : "bg-gray-50 border-gray-300 text-gray-900"
              }`}
            />
          </div>
          <div className="space-y-1">
            <label
              className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
            >
              สิ้นสุด
            </label>
            <input
              type="date"
              value={dateRange.end || ""}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className={`w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 ${
                theme === "dark"
                  ? "bg-gray-900 border-gray-600 text-white placeholder-gray-500"
                  : "bg-gray-50 border-gray-300 text-gray-900"
              }`}
            />
          </div>
        </div>

        {/* Presets Buttons */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => handlePreset(0)}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              theme === "dark"
                ? "border-gray-600 hover:bg-gray-700 text-gray-300"
                : "border-gray-200 hover:bg-gray-50 text-gray-600"
            }`}
          >
            วันนี้
          </button>
          <button
            onClick={() => handlePreset(7)}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              theme === "dark"
                ? "border-gray-600 hover:bg-gray-700 text-gray-300"
                : "border-gray-200 hover:bg-gray-50 text-gray-600"
            }`}
          >
            7 วัน
          </button>
          <button
            onClick={() => handlePreset(30)}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              theme === "dark"
                ? "border-gray-600 hover:bg-gray-700 text-gray-300"
                : "border-gray-200 hover:bg-gray-50 text-gray-600"
            }`}
          >
            30 วัน
          </button>
        </div>

        {/* Footer Action */}
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <button
            onClick={() => setDateRange({ start: null, end: null })}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
          >
            ล้างค่า
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg"
          >
            ตกลง
          </button>
        </div>
      </div>
    );
  };

  // Calendar component
  const CalendarView = () => {
    const today = new Date();
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
    ).getDate();
    const firstDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    ).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const ticketsOnDate = (day) => {
      const date = new Date(today.getFullYear(), today.getMonth(), day);
      return tickets.filter((t) => {
        const ticketDate = new Date(t.created_at);
        return (
          ticketDate.getDate() === day &&
          ticketDate.getMonth() === today.getMonth() &&
          ticketDate.getFullYear() === today.getFullYear()
        );
      }).length;
    };

    return (
      <div
        className={`${theme === "dark" ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700" : "bg-white border-gray-200"} rounded-2xl shadow-xl border p-5`}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3
              className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"} text-xl`}
            >
              {today.toLocaleDateString("th-TH", {
                month: "long",
                year: "numeric",
              })}
            </h3>
            <p className="text-sm text-gray-400 mt-1">ปฏิทินงานซ่อม</p>
          </div>
          <button
            onClick={() => setShowCalendar(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <XIcon size={22} className="text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
            <div
              key={day}
              className="text-center py-2 text-sm font-bold text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => (
            <div
              key={index}
              className={`min-h-12 p-2 ${day ? "cursor-pointer group" : ""}`}
              onClick={() =>
                day &&
                setSelectedDate(
                  new Date(today.getFullYear(), today.getMonth(), day),
                )
              }
            >
              {day && (
                <>
                  <div
                    className={`relative text-center text-sm font-medium rounded-xl transition-all duration-300 ${
                      day === today.getDate()
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105"
                        : theme === "dark"
                          ? "text-gray-300 group-hover:bg-gray-800"
                          : "text-gray-700 group-hover:bg-gray-100"
                    }`}
                  >
                    <div className="py-2">{day}</div>
                    {ticketsOnDate(day) > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        {ticketsOnDate(day) > 1 && (
                          <div
                            className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Sidebar component with FIXED text colors
  const Sidebar = () => (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-80 min-h-screen transform transition-all duration-500 ease-in-out
      ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      lg:translate-x-0 lg:shadow-xl
      ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95 backdrop-blur-lg border-r border-gray-700/50"
          : "bg-gradient-to-br from-white/95 via-gray-50/95 to-gray-100/95 backdrop-blur-lg border-r border-gray-300/50"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Sidebar Header with Branding */}
        <div
          className={`px-6 py-5 border-b ${theme === "dark" ? "border-gray-700/50" : "border-gray-300/50"}`}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                <Wrench size={26} className="drop-shadow-md" />
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 ${theme === "dark" ? "border-gray-900" : "border-white"} bg-gradient-to-r from-emerald-500 to-green-500`}
              >
                <span className="text-[10px] font-bold text-white">Pro</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className={`text-lg font-extrabold tracking-tight truncate ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                IT SERVICE HUB
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}
                >
                  Technician
                </span>
                <span
                  className={`text-xs font-medium ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                >
                  v4.0.1
                </span>
              </div>
            </div>
          </div>

          {/* Close Button for Mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className={`lg:hidden absolute top-6 right-6 p-2.5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95
            ${
              theme === "dark"
                ? "text-gray-400 hover:text-white hover:bg-gray-800/50"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
            }`}
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* User Profile Section with Glassmorphism */}
        {currentUser && (
          <>
            {/* User Profile Section in Sidebar */}
            <div
              className={`px-6 py-5 border-b ${theme === "dark" ? "border-gray-700/50" : "border-gray-300/50"}`}
            >
              <div className="relative">
                {/* Online Status Indicator */}
                <div className="absolute -top-1 -right-1 z-20">
                  <div
                    className={`relative ${isOnline ? "animate-pulse" : ""}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 transition-colors duration-500 ${
                        theme === "dark" ? "border-gray-900" : "border-white"
                      } ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`}
                    ></div>
                    {isOnline && (
                      <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Avatar with Modal Trigger */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Open profile"
                    onClick={() => setShowProfileModal(true)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setShowProfileModal(true)
                    }
                    className="
    relative
    cursor-pointer
    rounded-2xl
    p-1
    focus:outline-none
    focus-visible:ring-2
    focus-visible:ring-blue-500
    focus-visible:ring-offset-2
  "
                  >
                    {/* Glass Card */}
                    <div
                      className="
      relative
      flex
      items-center
      justify-center
      w-16
      h-16
      rounded-2xl
      bg-white/60
      backdrop-blur-md
      border
      border-white/40
      shadow-sm
      transition
      duration-200
      hover:shadow-md
      hover:bg-white/70
    "
                    >
                      <img
                        src={
                          currentUser.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            currentUser.name || "User",
                          )}&background=3b82f6&color=fff`
                        }
                        alt={currentUser.name || "User profile"}
                        className="w-full h-full rounded-xl object-cover"
                      />

                      {/* Hover Action */}
                      <div
                        className="
        absolute
        inset-0
        flex
        items-center
        justify-center
        rounded-xl
        bg-black/30
        opacity-0
        transition-opacity
        duration-200
        hover:opacity-100
      "
                      >
                        <Search size={18} className="text-white" />
                      </div>
                    </div>
                  </div>

                  {/* User Info - ดึงข้อมูลจาก user_metadata */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Name & Title */}
                    <div>
                      <h3
                        className={`text-base font-bold truncate ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                      >
                        {currentUser.name || "IT Technician"}
                      </h3>
                      <div
                        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg mt-1 ${theme === "dark" ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"}`}
                      >
                        <span
                          className={`text-xs font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}
                        >
                          {currentUser.position || "IT Technician"}
                        </span>
                      </div>
                    </div>

                    {/* Employee Info Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Employee ID */}
                      <div
                        className={`p-2 rounded-xl ${theme === "dark" ? "bg-gray-800/30" : "bg-gray-100/50"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <User size={12} className="text-blue-500" />
                          <span
                            className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                          >
                            ID
                          </span>
                        </div>
                        <p
                          className={`text-sm font-bold font-mono ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}
                        >
                          {currentUser.employeeId ?? "—"}
                        </p>
                      </div>

                      {/* Department */}
                      <div
                        className={`p-2 rounded-xl ${theme === "dark" ? "bg-gray-800/30" : "bg-gray-100/50"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Building size={12} className="text-emerald-500" />
                          <span
                            className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                          >
                            แผนก
                          </span>
                        </div>
                        <p
                          className={`text-sm font-bold truncate ${theme === "dark" ? "text-emerald-400" : "text-emerald-700"}`}
                        >
                          {currentUser.department || "IT Department"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Modal - ดึงข้อมูลจาก Supabase */}
            {showProfileModal && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-lg"
                  onClick={() => setShowProfileModal(false)}
                />

                {/* Modal Container */}
                <div
                  className={`relative z-10 w-full max-w-md rounded-3xl shadow-2xl border ${
                    theme === "dark"
                      ? "bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-gray-700/50"
                      : "bg-gradient-to-br from-white/95 to-gray-50/95 border-gray-300/50"
                  }`}
                >
                  {/* Modal Header */}
                  <div
                    className={`px-8 py-6 border-b ${
                      theme === "dark"
                        ? "border-gray-700/50"
                        : "border-gray-300/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User
                          size={24}
                          className={
                            theme === "dark" ? "text-blue-400" : "text-blue-600"
                          }
                        />
                        <h2
                          className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                        >
                          โปรไฟล์ผู้ใช้งาน
                        </h2>
                      </div>
                      <button
                        onClick={() => setShowProfileModal(false)}
                        className={`p-2 rounded-xl transition-all hover:scale-110 ${
                          theme === "dark"
                            ? "text-gray-400 hover:text-white hover:bg-gray-800/50"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        <X size={24} />
                      </button>
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="p-8">
                    {/* Profile Image */}
                    <div className="flex justify-center mb-8">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl blur-xl opacity-30"></div>
                        <img
                          src={
                            currentUser.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3b82f6&color=fff&size=256`
                          }
                          alt={currentUser.name}
                          className="relative w-32 h-32 rounded-3xl border-4 border-white/30 shadow-2xl object-cover"
                        />
                        {/* Status Badge */}
                        <div
                          className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 ${
                            theme === "dark"
                              ? "border-gray-900"
                              : "border-white"
                          } ${isOnline ? "bg-emerald-500" : "bg-gray-500"} flex items-center justify-center`}
                        >
                          {isOnline ? (
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          ) : (
                            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* User Details Grid */}
                    <div className="space-y-6">
                      {/* Name & Position Row */}
                      <div
                        className={`p-6 rounded-2xl ${
                          theme === "dark" ? "bg-gray-800/30" : "bg-gray-100/50"
                        }`}
                      >
                        <div className="text-center">
                          <h3
                            className={`text-2xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                          >
                            {currentUser.name || "IT Technician"}
                          </h3>
                          <div
                            className={`inline-flex items-center gap-3 px-4 py-2 rounded-full ${
                              theme === "dark"
                                ? "bg-blue-500/10 border border-blue-500/20"
                                : "bg-blue-100 border border-blue-200"
                            }`}
                          >
                            <Wrench
                              size={16}
                              className={
                                theme === "dark"
                                  ? "text-blue-400"
                                  : "text-blue-600"
                              }
                            />
                            <span
                              className={`text-sm font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}
                            >
                              {currentUser.position || "IT Technician"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info Cards Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Employee ID Card */}
                        <div
                          className={`p-5 rounded-2xl ${
                            theme === "dark"
                              ? "bg-gray-800/30"
                              : "bg-gray-100/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={`p-2.5 rounded-xl ${
                                theme === "dark"
                                  ? "bg-blue-500/10"
                                  : "bg-blue-100"
                              }`}
                            >
                              <User size={18} className="text-blue-500" />
                            </div>
                            <div>
                              <p
                                className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                              >
                                รหัสพนักงาน
                              </p>
                              <p
                                className={`text-lg font-bold font-mono mt-1 ${
                                  theme === "dark"
                                    ? "text-blue-400"
                                    : "text-blue-700"
                                }`}
                              >
                                {currentUser.employeeId}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Department Card */}
                        <div
                          className={`p-5 rounded-2xl ${
                            theme === "dark"
                              ? "bg-gray-800/30"
                              : "bg-gray-100/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={`p-2.5 rounded-xl ${
                                theme === "dark"
                                  ? "bg-emerald-500/10"
                                  : "bg-emerald-100"
                              }`}
                            >
                              <Building
                                size={18}
                                className="text-emerald-500"
                              />
                            </div>
                            <div>
                              <p
                                className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                              >
                                แผนก
                              </p>
                              <p
                                className={`text-lg font-bold mt-1 ${
                                  theme === "dark"
                                    ? "text-emerald-400"
                                    : "text-emerald-700"
                                }`}
                              >
                                {currentUser.department}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Email Card */}
                        <div
                          className={`p-5 rounded-2xl ${
                            theme === "dark"
                              ? "bg-gray-800/30"
                              : "bg-gray-100/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={`p-2.5 rounded-xl ${
                                theme === "dark"
                                  ? "bg-purple-500/10"
                                  : "bg-purple-100"
                              }`}
                            >
                              <Mail size={18} className="text-purple-500" />
                            </div>
                            <div>
                              <p
                                className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                              >
                                อีเมล
                              </p>
                              <p
                                className={`text-sm font-medium mt-1 truncate ${
                                  theme === "dark"
                                    ? "text-gray-300"
                                    : "text-gray-700"
                                }`}
                              >
                                {currentUser.email ||
                                  currentUser.user_metadata?.email ||
                                  "ไม่ระบุ"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Phone Card */}
                        <div
                          className={`p-5 rounded-2xl ${
                            theme === "dark"
                              ? "bg-gray-800/30"
                              : "bg-gray-100/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={`p-2.5 rounded-xl ${
                                theme === "dark"
                                  ? "bg-cyan-500/10"
                                  : "bg-cyan-100"
                              }`}
                            >
                              <Phone size={18} className="text-cyan-500" />
                            </div>
                            <div>
                              <p
                                className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                              >
                                โทรศัพท์
                              </p>
                              <p
                                className={`text-sm font-medium mt-1 ${
                                  theme === "dark"
                                    ? "text-gray-300"
                                    : "text-gray-700"
                                }`}
                              >
                                {currentUser.phone ||
                                  currentUser.user_metadata?.phone ||
                                  "ไม่ระบุ"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Info from user_metadata */}
                      <div
                        className={`p-5 rounded-2xl ${
                          theme === "dark" ? "bg-gray-800/30" : "bg-gray-100/50"
                        }`}
                      >
                        <h4
                          className={`text-sm font-bold mb-3 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
                        >
                          ข้อมูลเพิ่มเติม
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Position */}
                          <div>
                            <p
                              className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                            >
                              ตำแหน่ง
                            </p>
                            <p
                              className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                            >
                              {currentUser.position ||
                                currentUser.user_metadata?.position ||
                                "IT Technician"}
                            </p>
                          </div>
                          {/* Join Date */}
                          <div>
                            <p
                              className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                            >
                              วันที่เข้าร่วม
                            </p>
                            <p
                              className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                            >
                              {currentUser.created_at
                                ? new Date(
                                    currentUser.created_at,
                                  ).toLocaleDateString("th-TH")
                                : "ไม่ระบุ"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div
                        className={`p-5 rounded-2xl ${
                          theme === "dark"
                            ? isOnline
                              ? "bg-emerald-500/10 border border-emerald-500/20"
                              : "bg-gray-800/30"
                            : isOnline
                              ? "bg-emerald-50 border border-emerald-200"
                              : "bg-gray-100/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2.5 rounded-xl ${
                                theme === "dark"
                                  ? isOnline
                                    ? "bg-emerald-500/20"
                                    : "bg-gray-700/50"
                                  : isOnline
                                    ? "bg-emerald-100"
                                    : "bg-gray-200"
                              }`}
                            >
                              <Activity
                                size={18}
                                className={
                                  isOnline
                                    ? "text-emerald-500"
                                    : "text-gray-500"
                                }
                              />
                            </div>
                            <div>
                              <p
                                className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                              >
                                สถานะ
                              </p>
                              <p
                                className={`text-lg font-bold mt-1 ${
                                  isOnline
                                    ? theme === "dark"
                                      ? "text-emerald-400"
                                      : "text-emerald-700"
                                    : theme === "dark"
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                }`}
                              >
                                {isOnline ? "พร้อมปฏิบัติงาน" : "ออฟไลน์"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsOnline(!isOnline)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                              theme === "dark"
                                ? isOnline
                                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                                : isOnline
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                            }`}
                          >
                            {isOnline ? "ออนไลน์" : "ออฟไลน์"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div
                    className={`px-8 py-6 border-t ${
                      theme === "dark"
                        ? "border-gray-700/50"
                        : "border-gray-300/50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div
                        className={`flex items-center gap-2 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                      >
                        <Shield size={14} />
                        <span className="text-xs">
                          User ID: {currentUser.id?.slice(0, 8)}...
                        </span>
                      </div>
                      <button
                        onClick={() => setShowProfileModal(false)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        ปิด
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Navigation Menu with Clear Grouping */}
        <div className="flex-1 px-4 py-6 overflow-y-auto">
          <nav className="space-y-1.5">
            {/* Primary Navigation Group */}
            <div className="mb-6">
              <div className="px-3 mb-3">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                >
                  งานซ่อม
                </span>
              </div>

              {/* INCOMING */}
              <button
                onClick={() => {
                  setActiveTab("INCOMING");
                  setSidebarOpen(false);
                }}
                className={`group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 relative
                ${
                  activeTab === "INCOMING"
                    ? `shadow-lg ${
                        theme === "dark"
                          ? "bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 text-white"
                          : "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-400 text-blue-700"
                      }`
                    : `hover:scale-[1.02] ${
                        theme === "dark"
                          ? "text-gray-400 hover:text-white hover:bg-gray-800/40"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`
                }`}
              >
                <div
                  className={`relative ${activeTab === "INCOMING" ? "text-blue-400" : "text-gray-500 group-hover:text-blue-500"}`}
                >
                  <Bell size={22} />
                  {incomingTickets.length > 0 && (
                    <div className="absolute -top-2 -right-2">
                      <div className="relative">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-[10px] font-bold text-white">
                            {incomingTickets.length}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75"></div>
                      </div>
                    </div>
                  )}
                </div>
                <span className="font-semibold text-sm flex-1 text-left">
                  งานใหม่
                </span>
                <ChevronRight
                  size={16}
                  className={
                    activeTab === "INCOMING"
                      ? "text-blue-400"
                      : "text-gray-500 opacity-0 group-hover:opacity-100"
                  }
                />
              </button>

              {/* ACTIVE */}
              <button
                onClick={() => {
                  setActiveTab("ACTIVE");
                  setSidebarOpen(false);
                }}
                className={`group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300
                ${
                  activeTab === "ACTIVE"
                    ? `shadow-lg ${
                        theme === "dark"
                          ? "bg-gradient-to-r from-emerald-900/40 to-green-900/40 border border-emerald-500/30 text-white"
                          : "bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-400 text-emerald-700"
                      }`
                    : `hover:scale-[1.02] ${
                        theme === "dark"
                          ? "text-gray-400 hover:text-white hover:bg-gray-800/40"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`
                }`}
              >
                <Activity
                  size={22}
                  className={
                    activeTab === "ACTIVE"
                      ? "text-emerald-400"
                      : "text-gray-500 group-hover:text-emerald-500"
                  }
                />
                <span className="font-semibold text-sm flex-1 text-left">
                  กำลังทำ
                </span>
                <div className="flex items-center gap-2">
                  {myActiveTickets.length > 0 && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-bold ${activeTab === "ACTIVE" ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-800 text-gray-400"}`}
                    >
                      {myActiveTickets.length}
                    </span>
                  )}
                  <ChevronRight
                    size={16}
                    className={
                      activeTab === "ACTIVE"
                        ? "text-emerald-400"
                        : "text-gray-500 opacity-0 group-hover:opacity-100"
                    }
                  />
                </div>
              </button>

              {/* HISTORY */}
              <button
                onClick={() => {
                  setActiveTab("HISTORY");
                  setSidebarOpen(false);
                }}
                className={`group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300
                ${
                  activeTab === "HISTORY"
                    ? `shadow-lg ${
                        theme === "dark"
                          ? "bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border border-amber-500/30 text-white"
                          : "bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-400 text-amber-700"
                      }`
                    : `hover:scale-[1.02] ${
                        theme === "dark"
                          ? "text-gray-400 hover:text-white hover:bg-gray-800/40"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`
                }`}
              >
                <History
                  size={22}
                  className={
                    activeTab === "HISTORY"
                      ? "text-amber-400"
                      : "text-gray-500 group-hover:text-amber-500"
                  }
                />
                <span className="font-semibold text-sm flex-1 text-left">
                  ประวัติ
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-bold ${activeTab === "HISTORY" ? "bg-amber-500/20 text-amber-300" : "bg-gray-800 text-gray-400"}`}
                  >
                    {historyTickets.length}
                  </span>
                  <ChevronRight
                    size={16}
                    className={
                      activeTab === "HISTORY"
                        ? "text-amber-400"
                        : "text-gray-500 opacity-0 group-hover:opacity-100"
                    }
                  />
                </div>
              </button>
            </div>

            {/* Tools Group */}
            <div className="mb-6">
              <div className="px-3 mb-3">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                >
                  เครื่องมือ
                </span>
              </div>

              {/* CALENDAR */}
              <button
                onClick={() => {
                  setShowCalendar(true);
                  setSidebarOpen(false);
                }}
                className={`group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.02]
                ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-white hover:bg-gray-800/40"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <CalendarIcon
                  size={22}
                  className="text-purple-500 group-hover:text-purple-600"
                />
                <span className="font-semibold text-sm flex-1 text-left">
                  ปฏิทิน
                </span>
                <ChevronRight
                  size={16}
                  className="text-gray-500 opacity-0 group-hover:opacity-100"
                />
              </button>

              {/* FILTER */}
              <button
                onClick={() => {
                  setShowDateFilter((prev) => !prev);
                  setSidebarOpen(false);
                }}
                className={`group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.02]
                ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-white hover:bg-gray-800/40"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Filter
                  size={22}
                  className="text-cyan-500 group-hover:text-cyan-600"
                />
                <span className="font-semibold text-sm flex-1 text-left">
                  ตัวกรอง
                </span>
                <ChevronRight
                  size={16}
                  className="text-gray-500 opacity-0 group-hover:opacity-100"
                />
              </button>
            </div>

            {/* Stats Summary with Glassmorphism */}
            <div
              className={`p-4 rounded-2xl border backdrop-blur-sm ${
                theme === "dark"
                  ? "bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/30"
                  : "bg-gradient-to-br from-white/40 to-gray-100/40 border-gray-300/30"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h4
                  className={`text-sm font-bold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  สถิติประสิทธิภาพ
                </h4>
                <TrendingUp
                  size={16}
                  className={
                    theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                  }
                />
              </div>

              <div className="space-y-3">
                {/* Today's Performance */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span
                      className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      เสร็จวันนี้
                    </span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">
                    {stats.todayCompleted}
                  </span>
                </div>

                {/* Urgent Tasks */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                    <span
                      className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      งานด่วน
                    </span>
                  </div>
                  <span className="text-sm font-bold text-rose-400">
                    {stats.urgentCount}
                  </span>
                </div>

                {/* Response Time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span
                      className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      เวลาเฉลี่ย
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-blue-400" />
                    <span className="text-sm font-bold text-blue-400">
                      {stats.responseTime} นาที
                    </span>
                  </div>
                </div>

                {/* Active Tasks */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span
                      className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      กำลังทำ
                    </span>
                  </div>
                  <span className="text-sm font-bold text-amber-400">
                    {myActiveTickets.length}
                  </span>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Logout Section */}
        <div
          className={`px-6 py-5 border-t ${theme === "dark" ? "border-gray-700/50" : "border-gray-300/50"}`}
        >
          <button
            onClick={handleLogout}
            className={`group w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300
            hover:scale-[1.02] active:scale-95 relative overflow-hidden
            ${
              theme === "dark"
                ? "bg-gradient-to-r from-gray-800/50 to-gray-900/50 hover:from-rose-900/30 hover:to-pink-900/30 text-gray-300 hover:text-white border border-gray-700/50 hover:border-rose-500/30"
                : "bg-gradient-to-r from-gray-100 to-gray-200 hover:from-rose-50 hover:to-pink-50 text-gray-700 hover:text-rose-700 border border-gray-300/50 hover:border-rose-300"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <LogOut size={18} className="relative z-10" />
            <span className="font-semibold text-sm relative z-10">
              ออกจากระบบ
            </span>
          </button>

          {/* User Session Info */}
          <div className="mt-3 text-center">
            <p
              className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
            >
              Session ID:{" "}
              <span className="font-mono">{currentUser?.id?.slice(0, 8)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  /* ================= LOGIC / HELPERS ================= */

  // Helper สำหรับแปลง ID เป็นรูปแบบ IT-0000X
  const formatTicketId = (id) => {
    if (!id) return "IT-00000";
    // นำ 5 หลักสุดท้ายมาเติม 0 ข้างหน้าให้ครบ 5 หลัก
    const shortId = id.toString().slice(-5);
    return `IT-${shortId.padStart(5, "0")}`;
  };

  /* ================= UI RENDERER ================= */

  const renderTicketList = () => {
    if (loading && tickets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 w-full">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Wrench className="w-8 h-8 text-blue-400 animate-pulse" />
            </div>
          </div>
          <p
            className={`font-medium mt-4 animate-pulse ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
          >
            กำลังโหลดข้อมูล...
          </p>
        </div>
      );
    }

    if (filteredTickets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 w-full">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <Search size={40} className="text-gray-600" />
          </div>
          <p
            className={`text-lg font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
          >
            ไม่พบรายการงาน
          </p>
          <p
            className={`text-sm mt-2 text-center ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
          >
            {searchQuery || (activeTab === "HISTORY" && dateRange.start)
              ? "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง"
              : "พักผ่อนรอเสียงแจ้งเตือนได้เลย"}
          </p>
          {(searchQuery || (activeTab === "HISTORY" && dateRange.start)) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setDateRange({ start: null, end: null });
              }}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg"
            >
              ล้างการค้นหา
            </button>
          )}
        </div>
      );
    }

    return (
      <div className={`px-4 py-6 w-full ${isMobile ? "pb-32" : "pb-12"}`}>
        {/* 🛠 Toolbar: แสดงเฉพาะหน้าประวัติ (HISTORY) */}
        {/* 🛠 Toolbar: เครื่องมือจัดการมุมมองและการส่งออก (แสดงเฉพาะหน้าประวัติ) */}
        {activeTab === "HISTORY" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 animate-fade-in-up">
            {/* View Switcher */}
            <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
              <button
                onClick={() => setViewMode("card")}
                className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  viewMode === "card"
                    ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400 font-medium"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <LayoutGrid size={18} />
                <span className="text-xs hidden sm:inline">การ์ด</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  viewMode === "table"
                    ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400 font-medium"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <List size={18} />
                <span className="text-xs hidden sm:inline">ตาราง</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <div
                className={`hidden md:flex text-xs font-medium px-3 py-1.5 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-white border-gray-200 text-gray-500"}`}
              >
                ทั้งหมด:{" "}
                <span
                  className={
                    theme === "dark" ? "text-white ml-1" : "text-gray-900 ml-1"
                  }
                >
                  {historyTickets.length}
                </span>
              </div>
              <button
                onClick={() => handleExportExcelWithImages()}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl transition-all duration-300 text-sm font-bold shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                <DownloadCloud size={18} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* 📋 ส่วนแสดงผลข้อมูล */}
        {viewMode === "table" && activeTab === "HISTORY" ? (
          /* --- มุมมองตาราง (Table View) --- */
          <div
            className={`overflow-x-auto rounded-2xl border shadow-xl ${tableTheme.wrapper}`}
          >
            <table className="w-full text-left border-collapse">
              {/* ================== THEAD ================== */}
              <thead>
                <tr
                  className={`text-xs uppercase tracking-wider ${tableTheme.thead}`}
                >
                  <th className="px-4 py-4 font-semibold">Ticket ID</th>
                  <th className="px-4 py-4 font-semibold">หัวข้อปัญหา</th>
                  <th className="px-4 py-4 font-semibold">ผู้แจ้ง / แผนก</th>
                  <th className="px-4 py-4 font-semibold">สถานที่</th>
                  <th className="px-4 py-4 font-semibold">หมวดหมู่</th>
                  <th className="px-4 py-4 font-semibold">วันเสร็จสิ้น</th>
                  <th className="px-4 py-4 font-semibold">ช่างรับงาน</th>
                  <th className="px-4 py-4 font-semibold text-center">
                    จัดการ
                  </th>
                </tr>
              </thead>

              {/* ================== TBODY ================== */}
              <tbody className={`divide-y ${tableTheme.divider}`}>
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`transition-colors ${tableTheme.row}`}
                  >
                    {/* Ticket ID */}
                    <td className="px-4 py-4 font-mono text-sm">
                      <span className="font-semibold text-blue-400">
                        IT-{ticket.id.toString().padStart(5, "0")}
                      </span>
                    </td>

                    {/* Title + Priority */}
                    <td className="px-4 py-4">
                      <p
                        className={`text-sm font-semibold line-clamp-1 ${tableTheme.textPrimary}`}
                      >
                        {ticket.title}
                      </p>

                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium
                ${
                  ticket.priority === "urgent"
                    ? "bg-rose-500/20 text-rose-400"
                    : ticket.priority === "normal"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400"
                }`}
                      >
                        {getPriorityText(ticket.priority)}
                      </span>
                    </td>

                    {/* Reporter */}
                    <td className="px-4 py-4">
                      <div
                        className={`text-sm font-medium ${tableTheme.textPrimary}`}
                      >
                        {ticket.reporter_name}
                      </div>
                      <div className={`text-xs ${tableTheme.textSecondary}`}>
                        {ticket.reporter_dept}
                      </div>
                      <div className={`text-xs ${tableTheme.textMuted}`}>
                        {ticket.reporter_emp_id}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-4">
                      <div
                        className={`flex items-center gap-1 text-sm ${tableTheme.textSecondary}`}
                      >
                        <MapPin size={12} />
                        {ticket.location || "ไม่ระบุ"}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4">
                      <div
                        className={`flex items-center gap-2 text-sm ${tableTheme.textPrimary}`}
                      >
                        {getDeviceIcon(ticket.device_type || ticket.category)}
                        <span>{ticket.category || "ไม่ระบุ"}</span>
                      </div>
                    </td>

                    {/* Closed Date */}
                    <td className="px-4 py-4">
                      <div
                        className={`text-sm font-medium ${tableTheme.textPrimary}`}
                      >
                        {ticket.closed_at
                          ? new Date(ticket.closed_at).toLocaleDateString(
                              "th-TH",
                            )
                          : "-"}
                      </div>
                      <div className={`text-xs ${tableTheme.textMuted}`}>
                        {ticket.closed_at
                          ? new Date(ticket.closed_at).toLocaleTimeString(
                              "th-TH",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : "-"}
                      </div>
                    </td>

                    {/* Technician */}
                    <td className="px-4 py-4">
                      <div
                        className={`text-sm font-medium ${tableTheme.textPrimary}`}
                      >
                        {ticket.assigned_name || "-"}
                      </div>
                      <div className={`text-xs ${tableTheme.textMuted}`}>
                        {ticket.assigned_employee_id || "-"}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewDetails(ticket)}
                          className="rounded-lg p-2 text-blue-400 hover:bg-blue-500/10"
                          title="ดูรายละเอียด"
                        >
                          <Eye size={18} />
                        </button>

                        <button
                          onClick={() => handleOpenNavigation(ticket.location)}
                          className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10"
                          title="เปิดแผนที่"
                        >
                          <MapPin size={18} />
                        </button>

                        <button
                          onClick={() => handleDeleteTicket(ticket)}
                          className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                          title="ลบประวัติ"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ================== FOOTER ================== */}
            <div
              className={`flex items-center justify-between border-t px-4 py-3 ${tableTheme.divider}`}
            >
              <div className={`text-sm ${tableTheme.textSecondary}`}>
                แสดง{" "}
                <span className={`font-medium ${tableTheme.textPrimary}`}>
                  {filteredTickets.length}
                </span>{" "}
                จาก {historyTickets.length} รายการ
              </div>

              <button
                onClick={handleExportExcelWithImages}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                <Download size={14} />
                Export Excel
              </button>
            </div>
          </div>
        ) : (
          /* --- มุมมองการ์ด (Card View - โค้ดเดิมของคุณ) --- */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredTickets.map((ticket, index) => (
              <div
                key={ticket.id}
                className={`flex flex-col h-full rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                  theme === "dark"
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-white border border-gray-200"
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header - Status & Priority */}
                <div
                  className={`px-4 py-3 rounded-t-2xl ${
                    ticket.status === "NEW"
                      ? "bg-gradient-to-r from-rose-500/10 to-pink-500/10"
                      : ticket.status === "IN_PROGRESS"
                        ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10"
                        : "bg-gradient-to-r from-emerald-500/10 to-green-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          ticket.status === "NEW"
                            ? "bg-rose-500"
                            : ticket.status === "IN_PROGRESS"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                      ></div>
                      <span
                        className={`text-xs font-bold ${
                          ticket.status === "NEW"
                            ? "text-rose-400"
                            : ticket.status === "IN_PROGRESS"
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }`}
                      >
                        {getStatusText(ticket.status)}
                      </span>
                      {ticket.priority === "urgent" && (
                        <span className="px-2 py-0.5 bg-rose-500 text-white text-xs rounded-full animate-pulse">
                          ด่วน!
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {new Date(ticket.created_at).toLocaleTimeString(
                          "th-TH",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                      <p
                        className={`text-[10px] ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                      >
                        {new Date(ticket.created_at).toLocaleDateString(
                          "th-TH",
                          {
                            day: "numeric",
                            month: "short",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4 flex-1 flex flex-col">
                  {/* Title & Ticket ID */}
                  <div>
                    <h3
                      className={`font-bold text-base mb-1 line-clamp-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                    >
                      {ticket.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      {/* แสดง Ticket ID แบบ IT-XXXXX */}
                      <p
                        className={`text-xs font-mono font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}
                      >
                        IT-{ticket.id.toString().padStart(5, "0")}
                      </p>
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          ticket.priority === "urgent"
                            ? "bg-rose-500/20 text-rose-400"
                            : ticket.priority === "normal"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {getPriorityText(ticket.priority)}
                      </div>
                    </div>
                  </div>

                  {/* Reporter Info - Clear UI */}
                  <div
                    className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                        {ticket.reporter_name?.charAt(0) || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User
                            size={12}
                            className={
                              theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-500"
                            }
                          />
                          <p
                            className={`font-medium text-sm truncate ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                          >
                            {ticket.reporter_name || "ไม่ระบุชื่อ"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${theme === "dark" ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}`}
                          >
                            {ticket.reporter_emp_id || "ไม่ระบุรหัส"}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${theme === "dark" ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700"}`}
                          >
                            {ticket.reporter_dept || "ไม่ระบุแผนก"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Technician Info - Clear UI */}
                  {(ticket.status === "IN_PROGRESS" ||
                    ticket.status === "CLOSED") &&
                    ticket.assigned_name && (
                      <div
                        className={`p-3 rounded-lg border ${theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700" : "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              ticket.assigned_to === currentUser?.id
                                ? "bg-gradient-to-br from-emerald-500 to-green-600"
                                : "bg-gradient-to-br from-amber-500 to-yellow-600"
                            } text-white font-bold text-sm`}
                          >
                            {ticket.assigned_name?.charAt(0) || "T"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <UserCheck
                                size={12}
                                className={
                                  ticket.assigned_to === currentUser?.id
                                    ? "text-emerald-400"
                                    : "text-amber-400"
                                }
                              />
                              <p
                                className={`font-medium text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                              >
                                {ticket.assigned_name}
                              </p>
                              {ticket.assigned_to === currentUser?.id && (
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                                  คุณ
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                            >
                              รหัส: {ticket.assigned_employee_id || "ไม่ระบุ"}
                            </p>
                            {ticket.started_at && (
                              <p className="text-xs text-amber-500 mt-1">
                                รับเมื่อ:{" "}
                                {new Date(ticket.started_at).toLocaleTimeString(
                                  "th-TH",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Location & Device - Enhanced UI */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* สถานที่ */}
                    <div
                      className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-700/30" : "bg-gray-100"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={14} className="text-blue-400" />
                        <span
                          className={`text-xs font-bold ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                        >
                          สถานที่
                        </span>
                      </div>
                      <p
                        className={`text-sm font-medium truncate ${theme === "dark" ? "text-gray-100" : "text-gray-700"}`}
                      >
                        {ticket.location || "ไม่ระบุ"}
                      </p>
                    </div>

                    {/* อุปกรณ์ (แก้ไขส่วน Icon) */}
                    <div
                      className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-700/30" : "bg-gray-100"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {/* เรียกใช้ฟังก์ชันที่เช็ค category โดยตรง */}
                        {getDeviceIcon(ticket.category)}
                        <span
                          className={`text-xs font-bold ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                        >
                          อุปกรณ์
                        </span>
                      </div>
                      <p
                        className={`text-sm font-medium truncate ${theme === "dark" ? "text-gray-100" : "text-gray-700"}`}
                      >
                        {ticket.category || "ไม่ระบุ"}
                      </p>
                    </div>
                  </div>

                  {/* Description Preview */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText
                        size={14}
                        className={
                          theme === "dark" ? "text-gray-500" : "text-gray-400"
                        }
                      />
                      <span
                        className={`text-xs font-bold ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                      >
                        รายละเอียดปัญหา
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-900/50 border border-gray-700" : "bg-gray-50 border border-gray-200"}`}
                    >
                      <p
                        className={`text-sm line-clamp-3 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
                      >
                        {ticket.description || "ไม่มีรายละเอียด"}
                      </p>
                    </div>
                  </div>

                  {/* Timeline Progress */}
                  <div className="relative pt-6 pb-2">
                    {/* นำส่วน div เส้น absolute ออกแล้ว */}

                    <div className="grid grid-cols-3 relative z-10">
                      {/* จุดที่ 1: แจ้งงาน */}
                      <div className="flex flex-col items-center text-center px-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mb-2 relative  ">
                          <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                        </div>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">
                          แจ้ง
                        </p>
                        <p
                          className={`text-[11px] font-semibold mt-0.5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                        >
                          {new Date(ticket.created_at).toLocaleTimeString(
                            "th-TH",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate w-full">
                          {ticket.reporter_name?.split(" ")[0] || "ผู้ใช้"}
                        </p>
                      </div>

                      {/* จุดที่ 2: รับงาน (สีเหลือง - อยู่กึ่งกลางเป๊ะ) */}
                      <div className="flex flex-col items-center text-center px-1">
                        <div
                          className={`w-3 h-3 rounded-full mb-2 relative   transition-colors duration-300 ${ticket.started_at ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"}`}
                        >
                          {ticket.started_at && !ticket.closed_at && (
                            <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-75"></div>
                          )}
                        </div>
                        <p
                          className={`text-[10px] font-bold uppercase tracking-tight ${ticket.started_at ? "text-amber-500" : "text-gray-400"}`}
                        >
                          รับงาน
                        </p>
                        <p
                          className={`text-[11px] font-semibold mt-0.5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                        >
                          {ticket.started_at
                            ? new Date(ticket.started_at).toLocaleTimeString(
                                "th-TH",
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : "--:--"}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate w-full">
                          {ticket.assigned_name
                            ? ticket.assigned_name.split(" ")[0]
                            : "รอช่าง"}
                        </p>
                      </div>

                      {/* จุดที่ 3: เสร็จงาน */}
                      <div className="flex flex-col items-center text-center px-1">
                        <div
                          className={`w-3 h-3 rounded-full mb-2 relative   transition-colors duration-300 ${ticket.closed_at ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
                        >
                          {ticket.closed_at && (
                            <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                          )}
                        </div>
                        <p
                          className={`text-[10px] font-bold uppercase tracking-tight ${ticket.closed_at ? "text-emerald-500" : "text-gray-400"}`}
                        >
                          เสร็จ
                        </p>
                        <p
                          className={`text-[11px] font-semibold mt-0.5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                        >
                          {ticket.closed_at
                            ? new Date(ticket.closed_at).toLocaleTimeString(
                                "th-TH",
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : "--:--"}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {ticket.closed_at ? "สำเร็จ" : "รอผล"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    {ticket.status === "NEW" && (
                      <button
                        onClick={() => handleAcceptJob(ticket.id)}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                      >
                        <CheckCircle size={18} />
                        <span>รับงานนี้</span>
                      </button>
                    )}
                    {ticket.status === "IN_PROGRESS" &&
                      ticket.assigned_to === currentUser?.id && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() =>
                              handleOpenNavigation(ticket.location)
                            }
                            className={`py-3 rounded-lg font-medium flex items-center justify-center gap-2 border ${
                              theme === "dark"
                                ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                                : "border-gray-300 text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <Navigation size={16} />
                            <span className="text-sm">นำทาง</span>
                          </button>
                          <button
                            onClick={() => handleCloseJob(ticket)}
                            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                          >
                            <Camera size={16} />
                            <span className="text-sm">ปิดงาน</span>
                          </button>
                        </div>
                      )}
                    {ticket.status === "IN_PROGRESS" &&
                      ticket.assigned_to !== currentUser?.id && (
                        <div
                          className={`p-3 rounded-lg text-center border ${
                            theme === "dark"
                              ? "border-amber-700/30 bg-amber-500/10"
                              : "border-amber-200 bg-amber-50"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <UserCheck size={14} className="text-amber-500" />
                            <p
                              className={`text-sm ${theme === "dark" ? "text-amber-300" : "text-amber-600"}`}
                            >
                              {ticket.assigned_name || "ช่างคนอื่น"}{" "}
                              รับงานนี้แล้ว
                            </p>
                          </div>
                          <p
                            className={`text-xs mt-1 ${theme === "dark" ? "text-amber-400/80" : "text-amber-600/80"}`}
                          >
                            รหัสพนักงาน:{" "}
                            {ticket.assigned_employee_id || "ไม่ระบุ"}
                          </p>
                        </div>
                      )}
                    {ticket.status === "CLOSED" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div
                            className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                          >
                            ระยะเวลาซ่อม:
                            <span
                              className={`ml-1 font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                            >
                              {ticket.started_at && ticket.closed_at
                                ? calculateDuration(
                                    ticket.started_at,
                                    ticket.closed_at,
                                  )
                                : "ไม่ระบุ"}
                            </span>
                          </div>
                          {ticket.closed_by_name && (
                            <div
                              className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                            >
                              ช่าง:{" "}
                              <span className="font-medium">
                                {ticket.closed_by_name}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(ticket)}
                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-1 ${
                              theme === "dark"
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            <Eye size={14} />
                            รายละเอียด
                          </button>
                          <button
                            onClick={() =>
                              handleOpenNavigation(ticket.location)
                            }
                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-1 ${
                              theme === "dark"
                                ? "bg-blue-900/30 text-blue-300 hover:bg-blue-900/50"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            }`}
                          >
                            <MapPin size={14} />
                            ที่ตั้ง
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket)}
                            className={`p-2.5 rounded-lg font-medium text-sm flex items-center justify-center ${
                              theme === "dark"
                                ? "bg-rose-900/30 text-rose-400 hover:bg-rose-900/50"
                                : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                            }`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Debug component
  const DebugInfo = () => {
    if (process.env.NODE_ENV !== "development") return null;

    return (
      <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-3 rounded-lg text-xs">
        <div>Theme: {theme}</div>
        <div>Mobile: {isMobile ? "Yes" : "No"}</div>
        <div>Tickets: {tickets.length}</div>
        <div>Active Tab: {activeTab}</div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
          : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
      }`}
    >
      {/* Debug Info */}
      <DebugInfo />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="lg:ml-80 transition-all duration-500 ease-in-out">
        {/* Enterprise Header */}
        <header
          className={`sticky top-0 z-40 border-b backdrop-blur-2xl transition-all duration-500 ${
            theme === "dark"
              ? "bg-gradient-to-b from-gray-950/95 via-gray-900/95 to-gray-950/95 border-gray-800/30 shadow-2xl shadow-black/40"
              : "bg-gradient-to-b from-white/97 via-gray-50/97 to-white/97 border-gray-300/30 shadow-xl shadow-gray-200/30"
          }`}
        >
          <div className="max-w-[2400px] mx-auto px-4 lg:px-10">
            {/* Top Row */}
            <div className="flex items-center justify-between py-4 lg:py-5">
              {/* Left Section */}
              <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
                {/* ในส่วน Header ตรงปุ่มเปิด Sidebar */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`lg:hidden flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300
    hover:scale-105 active:scale-95 group ${
      theme === "dark"
        ? "text-gray-400 hover:text-white hover:bg-gray-800/50"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
    }`}
                >
                  {/* Animated Hamburger Icon */}
                  <div className="flex flex-col items-center justify-center w-6 h-6 relative">
                    <span
                      className={`w-6 h-0.5 rounded-full transition-all duration-300
      ${sidebarOpen ? "rotate-45 translate-y-0.5" : "mb-1.5"} 
      ${theme === "dark" ? "bg-gray-400 group-hover:bg-white" : "bg-gray-600 group-hover:bg-gray-900"}`}
                    />
                    <span
                      className={`w-6 h-0.5 rounded-full transition-all duration-300
      ${sidebarOpen ? "opacity-0 -rotate-45" : "mb-1.5"} 
      ${theme === "dark" ? "bg-gray-400 group-hover:bg-white" : "bg-gray-600 group-hover:bg-gray-900"}`}
                    />
                    <span
                      className={`w-6 h-0.5 rounded-full transition-all duration-300
      ${sidebarOpen ? "-rotate-45 -translate-y-0.5" : ""} 
      ${theme === "dark" ? "bg-gray-400 group-hover:bg-white" : "bg-gray-600 group-hover:bg-gray-900"}`}
                    />
                  </div>
                </button>

                <div className="flex items-center gap-4 lg:gap-5">
                  <div
                    className={`hidden sm:flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-2xl shadow-blue-500/30`}
                  >
                    <Wrench size={28} className="text-white drop-shadow-lg" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl lg:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                        IT SERVICE HUB
                      </h1>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          theme === "dark"
                            ? "bg-gradient-to-r from-emerald-500/15 to-green-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-300"
                        }`}
                      >
                        Technician Dashboard
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Search */}
              <div className="hidden xl:flex flex-1 max-w-3xl mx-10">
                <div className="relative w-full group">
                  <Search
                    className={`absolute left-5 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
                      theme === "dark"
                        ? "text-gray-500 group-focus-within:text-blue-400"
                        : "text-gray-400 group-focus-within:text-blue-500"
                    }`}
                    size={22}
                  />
                  <input
                    type="text"
                    placeholder="ค้นหา Ticket ID, ผู้แจ้ง, แผนก, หรือคำค้นหา..."
                    className={`relative w-full pl-14 pr-12 py-3.5 rounded-2xl text-sm border-2 ${
                      theme === "dark"
                        ? "bg-gray-900/60 border-gray-700/60 text-gray-100 placeholder-gray-500 focus:border-blue-500/50"
                        : "bg-white/80 border-gray-300/80 text-gray-900 placeholder-gray-500 focus:border-blue-400"
                    }`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                        theme === "dark"
                          ? "text-gray-500 hover:text-red-400 hover:bg-gray-800"
                          : "text-gray-400 hover:text-red-500 hover:bg-gray-100"
                      }`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsOnline(!isOnline)}
                  className={`hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300 ${
                    isOnline
                      ? `shadow-lg ${
                          theme === "dark"
                            ? "bg-gradient-to-r from-emerald-900/20 to-green-900/20 border-emerald-500/30 text-emerald-400"
                            : "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400 text-emerald-700"
                        }`
                      : `shadow-sm ${
                          theme === "dark"
                            ? "bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-gray-700 text-gray-400"
                            : "bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300 text-gray-600"
                        }`
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`}
                  ></div>
                  <span className="text-sm font-semibold">
                    {isOnline ? "พร้อมทำงาน" : "ออฟไลน์"}
                  </span>
                </button>

                <div
                  className={`h-10 w-[1px] ${theme === "dark" ? "bg-gray-800" : "bg-gray-300"}`}
                ></div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleTheme}
                    className={`p-3 rounded-2xl transition-all duration-300 ${
                      theme === "dark"
                        ? "text-yellow-400 hover:bg-gray-800/50"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveTab("INCOMING");
                        setNotificationCount(0);
                      }}
                      className={`p-3 rounded-2xl transition-all duration-300 ${
                        theme === "dark"
                          ? "text-gray-400 hover:text-white hover:bg-gray-800/50"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      <Bell size={22} />
                    </button>
                    {notificationCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {notificationCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Search Row */}
            <div className="xl:hidden mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหางานซ่อม..."
                  className={`w-full pl-12 pr-10 py-3.5 rounded-2xl text-sm border-2 ${
                    theme === "dark"
                      ? "bg-gray-900/60 border-gray-700 text-white placeholder-gray-500"
                      : "bg-white/80 border-gray-300 text-gray-900 placeholder-gray-500"
                  }`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters */}
            {(searchQuery ||
              (activeTab === "HISTORY" &&
                dateRange.start &&
                dateRange.end)) && (
              <div className="flex items-center gap-3 flex-wrap pb-4">
                <div
                  className={`px-3 py-2 rounded-2xl border flex items-center gap-3 ${
                    theme === "dark"
                      ? "bg-gray-900/40 border-gray-700"
                      : "bg-white/70 border-gray-300"
                  }`}
                >
                  <Filter size={16} className="text-blue-500" />

                  {searchQuery && (
                    <div
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                        theme === "dark"
                          ? "bg-blue-900/30 border-blue-700/30"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <span
                        className={`text-xs font-semibold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}
                      >
                        ค้นหา:
                      </span>
                      <span
                        className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                      >
                        {searchQuery}
                      </span>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="p-1 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  {activeTab === "HISTORY" &&
                    dateRange.start &&
                    dateRange.end && (
                      <div
                        className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                          theme === "dark"
                            ? "bg-emerald-900/30 border-emerald-700/30"
                            : "bg-emerald-50 border-emerald-200"
                        }`}
                      >
                        <CalendarIcon
                          size={12}
                          className={
                            theme === "dark"
                              ? "text-emerald-400"
                              : "text-emerald-600"
                          }
                        />
                        <span
                          className={`text-xs ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
                        >
                          วันที่
                        </span>
                        <span
                          className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                        >
                          {new Date(dateRange.start).toLocaleDateString(
                            "th-TH",
                            { day: "numeric", month: "short" },
                          )}{" "}
                          -{" "}
                          {new Date(dateRange.end).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <button
                          onClick={() => setDateRange({ start: "", end: "" })}
                          className="p-1 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                </div>

                {activeTab === "HISTORY" && (
                  <button
                    onClick={() => setShowDateFilter(!showDateFilter)}
                    className={`px-4 py-2 rounded-2xl border text-sm font-semibold ${
                      dateRange.start && dateRange.end
                        ? theme === "dark"
                          ? "bg-blue-600 text-white border-blue-500"
                          : "bg-blue-500 text-white border-blue-400"
                        : theme === "dark"
                          ? "bg-gray-800 text-gray-300 border-gray-700"
                          : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    <CalendarIcon size={16} />
                    {dateRange.start && dateRange.end
                      ? "เปลี่ยนวันที่"
                      : "ตัวกรองวันที่"}
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Dashboard */}
        <main className="max-w-[2400px] mx-auto px-4 lg:px-10 py-6 lg:py-8">
          {/* Stats Cards - Simplified & Professional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                title: "เสร็จวันนี้",
                value: stats.todayCompleted,
                icon: CheckCircle,
                color: "emerald",
                trend: "+2",
              },
              {
                title: "งานรอรับ",
                value: incomingTickets.length,
                icon: Bell,
                color: "rose",
                trend: `ด่วน ${stats.urgentCount}`,
              },
              {
                title: "กำลังทำ",
                value: myActiveTickets.length,
                icon: Wrench,
                color: "amber",
                trend: "ของคุณ",
              },
              {
                title: "เวลาเฉลี่ย",
                value: `${stats.responseTime} นาที`,
                icon: Clock,
                color: "blue",
                trend: "ต่องาน",
              },
            ].map((stat, index) => (
              <div
                key={index}
                className={`rounded-2xl p-5 border transition-all ${
                  theme === "dark"
                    ? "bg-gray-900/50 border-gray-800"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {stat.title}
                    </p>
                    <p
                      className={`text-2xl font-bold text-${stat.color}-400 mt-2`}
                    >
                      {stat.value}
                    </p>
                    <p
                      className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"} mt-1`}
                    >
                      {stat.trend}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-xl bg-${stat.color}-500/10 border border-${stat.color}-500/20`}
                  >
                    <stat.icon size={24} className={`text-${stat.color}-400`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tab Navigation - Clean & Professional */}
          <div className="mb-8">
            <div
              className={`rounded-2xl border p-2 ${
                theme === "dark"
                  ? "bg-gray-900/50 border-gray-800"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex space-x-2">
                {[
                  {
                    id: "INCOMING",
                    label: "งานใหม่",
                    icon: Bell,
                    count: incomingTickets.length,
                    color: "blue",
                  },
                  {
                    id: "ACTIVE",
                    label: "กำลังทำ",
                    icon: Activity,
                    count: myActiveTickets.length,
                    color: "amber",
                  },
                  {
                    id: "HISTORY",
                    label: "ประวัติ",
                    icon: History,
                    count: historyTickets.length,
                    color: "emerald",
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? theme === "dark"
                          ? `bg-gradient-to-r from-${tab.color}-900/30 to-${tab.color}-800/30 text-${tab.color}-400 border border-${tab.color}-700/30`
                          : `bg-gradient-to-r from-${tab.color}-100 to-${tab.color}-50 text-${tab.color}-600 border border-${tab.color}-300`
                        : theme === "dark"
                          ? "text-gray-400 hover:text-white hover:bg-gray-800"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <tab.icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        activeTab === tab.id
                          ? theme === "dark"
                            ? `bg-${tab.color}-900/30 text-${tab.color}-300`
                            : `bg-${tab.color}-500/20 text-${tab.color}-600`
                          : theme === "dark"
                            ? "bg-gray-800 text-gray-400"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar View */}
          {showCalendar && (
            <div className="mb-8">
              <CalendarView />
            </div>
          )}

          {/* Main Content */}
          <div className="px-4 py-2">{renderTicketList()}</div>
        </main>

        {/* Date Range Picker Modal */}
        {showDateFilter && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop with enhanced blur */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setShowDateFilter(false)}
            />

            {/* Main Modal Container with Glassmorphism */}
            <div className="relative z-10 w-full max-w-[420px] animate-modal-enter">
              <div
                className={`
        rounded-2xl shadow-2xl border overflow-hidden
        ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-gray-700/50 backdrop-blur-xl"
            : "bg-gradient-to-br from-white/95 to-gray-50/95 border-gray-300/50 backdrop-blur-xl"
        }
      `}
              >
                {/* Header with gradient */}
                <div
                  className={`
          px-6 py-4 border-b relative overflow-hidden
          ${
            theme === "dark"
              ? "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-gray-700/30"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200/50"
          }
        `}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"}`}
                      >
                        <CalendarIcon
                          className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}
                        />
                      </div>
                      <div>
                        <h3
                          className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                        >
                          เลือกช่วงเวลา
                        </h3>
                        <p
                          className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} mt-0.5`}
                        >
                          กรองข้อมูลตามวันที่ที่ต้องการ
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDateFilter(false)}
                      className={`
                p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95
                ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }
              `}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content Section with proper spacing */}
                <div className="p-6 space-y-6">
                  {/* Date Inputs with clear grouping */}
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${theme === "dark" ? "bg-blue-500" : "bg-blue-600"}`}
                        ></div>
                        <label
                          className={`text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                        >
                          วันที่เริ่มต้น
                        </label>
                      </div>
                      <div className="relative group">
                        <input
                          type="date"
                          value={dateRange.start || ""}
                          onChange={(e) =>
                            setDateRange({
                              ...dateRange,
                              start: e.target.value,
                            })
                          }
                          className={`
                    w-full pl-12 pr-4 py-3.5 rounded-xl border text-sm
                    transition-all duration-200 outline-none
                    ${
                      theme === "dark"
                        ? "bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                    }
                  `}
                          placeholder="เลือกวันที่เริ่มต้น"
                        />
                        <div
                          className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg ${theme === "dark" ? "bg-gray-800/50" : "bg-gray-100"}`}
                        >
                          <CalendarIcon
                            className={`w-4 h-4 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${theme === "dark" ? "bg-blue-500" : "bg-blue-600"}`}
                        ></div>
                        <label
                          className={`text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                        >
                          วันที่สิ้นสุด
                        </label>
                      </div>
                      <div className="relative group">
                        <input
                          type="date"
                          value={dateRange.end || ""}
                          onChange={(e) =>
                            setDateRange({ ...dateRange, end: e.target.value })
                          }
                          className={`
                    w-full pl-12 pr-4 py-3.5 rounded-xl border text-sm
                    transition-all duration-200 outline-none
                    ${
                      theme === "dark"
                        ? "bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                    }
                  `}
                          placeholder="เลือกวันที่สิ้นสุด"
                        />
                        <div
                          className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg ${theme === "dark" ? "bg-gray-800/50" : "bg-gray-100"}`}
                        >
                          <CalendarIcon
                            className={`w-4 h-4 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Presets Section */}
                  <div className="space-y-3">
                    <label
                      className={`text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      ช่วงเวลาสำเร็จรูป
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "วันนี้", days: 0 },
                        { label: "7 วัน", days: 7 },
                        { label: "30 วัน", days: 30 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            const end = new Date();
                            const start = new Date();
                            start.setDate(end.getDate() - preset.days);
                            setDateRange({
                              start: start.toISOString().split("T")[0],
                              end: end.toISOString().split("T")[0],
                            });
                          }}
                          className={`
                    py-2.5 px-3 rounded-xl text-xs font-medium border transition-all duration-200
                    hover:scale-[1.02] active:scale-95
                    ${
                      theme === "dark"
                        ? "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-blue-500/50 hover:bg-blue-900/20"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-400 hover:bg-blue-50"
                    }
                  `}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons - Clearly Separated */}
                  <div className="pt-4 border-t border-gray-700/30 dark:border-gray-700/30">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setDateRange({ start: "", end: "" });
                          setShowDateFilter(false);
                        }}
                        className={`
                  flex-1 py-3.5 rounded-xl font-semibold text-sm border
                  transition-all duration-200 hover:scale-[1.02] active:scale-95
                  ${
                    theme === "dark"
                      ? "border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600"
                      : "border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:border-gray-400"
                  }
                `}
                      >
                        ล้างค่า
                      </button>
                      <button
                        onClick={() => setShowDateFilter(false)}
                        className={`
                  flex-1 py-3.5 rounded-xl font-semibold text-sm border
                  bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                  hover:from-blue-700 hover:to-indigo-700
                  transition-all duration-200 hover:scale-[1.02] active:scale-95
                  shadow-lg shadow-blue-500/20 border-blue-500/30
                `}
                      >
                        ใช้ตัวกรอง
                      </button>
                    </div>

                    {/* Current Selection Indicator */}
                    {dateRange.start && dateRange.end && (
                      <div
                        className={`mt-4 p-3 rounded-xl border ${theme === "dark" ? "bg-emerald-900/10 border-emerald-700/30" : "bg-emerald-50 border-emerald-200"}`}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle
                            className={`w-4 h-4 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
                          />
                          <span
                            className={`text-xs font-medium ${theme === "dark" ? "text-emerald-300" : "text-emerald-700"}`}
                          >
                            เลือกแล้ว:{" "}
                            {new Date(dateRange.start).toLocaleDateString(
                              "th-TH",
                            )}{" "}
                            -{" "}
                            {new Date(dateRange.end).toLocaleDateString(
                              "th-TH",
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Image Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setShowProfileModal(false)}
            ></div>
            <div className="relative animate-fade-in-up">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              >
                <X size={32} />
              </button>
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  className="w-48 h-48 rounded-3xl object-cover border-4 border-white/20 shadow-2xl"
                  alt={currentUser.name}
                />
              ) : (
                <div
                  className="w-48 h-48 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600
                  flex items-center justify-center text-white text-6xl font-black shadow-2xl border-4 border-white/20"
                >
                  {currentUser.name?.charAt(0)}
                </div>
              )}
              <div className="mt-4 text-center">
                <h3 className="text-white text-xl font-bold">
                  {currentUser.name}
                </h3>
                <p className="text-blue-400">{currentUser.position}</p>
              </div>
            </div>
          </div>
        )}

        {/* Global Styles */}
        <style>{`
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }

        .animate-slide-out-right {
          animation: slide-out-right 0.3s ease-in;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out;
        }

        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* ในส่วน <style> ใน return statement */
@keyframes slide-in-left {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-out-left {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-100%);
    opacity: 0;
  }
}

@keyframes overlay-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes overlay-fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.animate-slide-in-left {
  animation: slide-in-left 0.3s ease-out;
}

.animate-slide-out-left {
  animation: slide-out-left 0.3s ease-in;
}

.animate-overlay-fade-in {
  animation: overlay-fade-in 0.3s ease-out;
}

.animate-overlay-fade-out {
  animation: overlay-fade-out 0.3s ease-in;
}

        @keyframes slide-out-right {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        @keyframes fade-in-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Smooth scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: ${theme === "dark" ? "#1f2937" : "#f3f4f6"};
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: ${theme === "dark" ? "#4b5563" : "#9ca3af"};
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${theme === "dark" ? "#6b7280" : "#6b7280"};
        }

        ::selection {
          background: rgba(59, 130, 246, 0.3);
          color: ${theme === "dark" ? "white" : "#1f2937"};
        }
      `}</style>
      </div>
    </div>
  );
};

export default ITDashboard;
