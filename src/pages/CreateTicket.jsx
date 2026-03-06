import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { insertTicketWithSchemaFallback } from "../lib/ticketSchemaCompat";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import { toast, Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  Building,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Info,
  LayoutGrid,
  Loader2,
  Mail,
  Monitor,
  Printer,
  Server,
  Upload,
  User,
  Wifi,
  X,
  AlertTriangle,
  FlipHorizontal,
  ShieldCheck,
  CircleDashed,
  FileText,
  Briefcase,
  Hash,
  Crown,
  Gem,
  Heart,
  Sparkles,
  Layers,
  HardDrive,
  Image as ImageIcon,
  Zap,
  Shield,
  Clock,
  Award
} from "lucide-react";

const CATEGORIES = [
  {
    id: "Hardware",
    label: "คอมพิวเตอร์ / อุปกรณ์",
    desc: "PC, Notebook, จอภาพ, อุปกรณ์ต่อพ่วง",
    icon: Monitor,
    selectedClass: "from-[#2b59b0] to-[#244a95] border-[#2b59b0]/30",
    iconClass: "text-[#2b59b0]",
    softClass: "bg-[#2b59b0]/10",
    gradient: "from-[#2b59b0] via-[#2b59b0] to-[#244a95]"
  },
  {
    id: "Network",
    label: "เครือข่าย / Wi-Fi",
    desc: "LAN, Wi-Fi, VPN, Internet",
    icon: Wifi,
    selectedClass: "from-[#2b59b0] to-[#244a95] border-[#2b59b0]/30",
    iconClass: "text-[#2b59b0]",
    softClass: "bg-[#2b59b0]/10",
    gradient: "from-[#2b59b0] via-[#2b59b0] to-[#244a95]"
  },
  {
    id: "Printer",
    label: "เครื่องพิมพ์ / สแกน",
    desc: "Printer, Scanner, Copier",
    icon: Printer,
    selectedClass: "from-[#2b59b0] to-[#244a95] border-[#2b59b0]/30",
    iconClass: "text-[#2b59b0]",
    softClass: "bg-[#2b59b0]/10",
    gradient: "from-[#2b59b0] via-[#2b59b0] to-[#244a95]"
  },
  {
    id: "Email",
    label: "อีเมลองค์กร",
    desc: "Outlook, Exchange, การส่งรับเมล",
    icon: Mail,
    selectedClass: "from-[#2b59b0] to-[#244a95] border-[#2b59b0]/30",
    iconClass: "text-[#2b59b0]",
    softClass: "bg-[#2b59b0]/10",
    gradient: "from-[#2b59b0] via-[#2b59b0] to-[#244a95]"
  },
  {
    id: "System",
    label: "ระบบงาน / ซอฟต์แวร์",
    desc: "OS, แอปพลิเคชัน, สิทธิ์การใช้งาน",
    icon: Server,
    selectedClass: "from-[#2b59b0] to-[#244a95] border-[#2b59b0]/30",
    iconClass: "text-[#2b59b0]",
    softClass: "bg-[#2b59b0]/10",
    gradient: "from-[#2b59b0] via-[#2b59b0] to-[#244a95]"
  },
];

const ISSUES = {
  Hardware: [
    "เครื่องเปิดไม่ติด",
    "เครื่องทำงานช้ามาก",
    "จอฟ้า (Blue Screen)",
    "อุปกรณ์ต่อพ่วงใช้งานไม่ได้",
    "พัดลมหรือเสียงเครื่องผิดปกติ",
  ],
  Network: [
    "เชื่อมต่อ Wi-Fi ไม่ได้",
    "อินเทอร์เน็ตช้า/หลุดบ่อย",
    "VPN เชื่อมต่อไม่ได้",
    "เข้า Shared Folder ไม่ได้",
    "DNS / IP Error",
  ],
  Printer: [
    "สั่งพิมพ์ไม่ออก",
    "กระดาษติด",
    "หมึกหมด/สีเพี้ยน",
    "สแกนเอกสารไม่ได้",
    "Driver มีปัญหา",
  ],
  Email: [
    "รับส่งอีเมลไม่ได้",
    "ลืมรหัสผ่าน",
    "Outlook ไม่ซิงก์",
    "กล่องเมลเต็ม",
    "ตั้งค่า Signature",
  ],
  System: [
    "โปรแกรมค้าง / Error",
    "ขอสิทธิ์ Admin",
    "ติดตั้งโปรแกรม",
    "อัปเดตระบบไม่ผ่าน",
    "เข้าใช้งานระบบภายในไม่ได้",
  ],
};

const URGENCY = [
  {
    id: "low",
    label: "ปกติ",
    desc: "ภายใน 48 ชั่วโมง",
    priority: "P3",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
    chip: "bg-emerald-100 text-emerald-700",
    selectedBg: "bg-emerald-50",
    gradient: "from-emerald-500 to-teal-500",
    color: "emerald"
  },
  {
    id: "normal",
    label: "เร่งด่วน",
    desc: "ภายใน 24 ชั่วโมง",
    priority: "P2",
    dot: "bg-amber-500",
    border: "border-amber-200",
    chip: "bg-amber-100 text-amber-700",
    selectedBg: "bg-amber-50",
    gradient: "from-amber-500 to-orange-500",
    color: "amber"
  },
  {
    id: "urgent",
    label: "วิกฤต",
    desc: "ต้องการความช่วยเหลือทันที",
    priority: "P1",
    dot: "bg-rose-500",
    border: "border-rose-200",
    chip: "bg-rose-100 text-rose-700",
    selectedBg: "bg-rose-50",
    gradient: "from-rose-500 to-red-500",
    color: "rose"
  },
];

function formatThaiDateTime(date) {
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return { date: `${day} ${month} ${year}`, time: `${hours}:${minutes}` };
}

const sectionAnim = {
  initial: { y: 15, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.4 },
};

const CreateTicket = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketRef, setTicketRef] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [tempImage, setTempImage] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    position: "",
    category: "",
    issue: "",
    urgency: "normal",
    attachment: null,
    profilePic: null,
  });

  const [preview, setPreview] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile) {
          let avatarUrl = profile.avatar_url || profile.id_card_url || null;

          setForm((p) => ({
            ...p,
            employeeId: profile.employee_code || "EMP-001",
            employeeName: profile.full_name || "พนักงาน",
            department: profile.department || "ฝ่ายเทคโนโลยีสารสนเทศ",
            position: profile.position || "เจ้าหน้าที่ระบบ",
            profilePic: avatarUrl,
          }));
        }
      } catch (err) {
        console.error("Profile Error:", err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์แนบต้องมีขนาดไม่เกิน 5MB");
      return;
    }

    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    const url = URL.createObjectURL(file);
    setForm((p) => ({ ...p, attachment: file }));
    setPreview(url);
    setIsCameraActive(false);
  };

  const clearAttachment = () => {
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setTempImage(null);
    setIsReviewing(false);
    setForm((p) => ({ ...p, attachment: null }));
  };

  const capture = useCallback(() => {
    if (!webcamRef.current || typeof webcamRef.current.getScreenshot !== "function") {
      toast.error("กล้องไม่พร้อมใช้งาน");
      return;
    }

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setTempImage(imageSrc);
        setIsReviewing(true);
      }
    } catch (err) {
      console.error("Capture error", err);
      toast.error("ไม่สามารถถ่ายรูปได้");
    }
  }, []);

  const confirmCapture = () => {
    if (!tempImage) return;
    fetch(tempImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setForm((p) => ({ ...p, attachment: file }));
        setPreview(tempImage);
        setIsReviewing(false);
        setIsCameraActive(false);
        toast.success("แนบรูปภาพเรียบร้อย");
      })
      .catch(() => toast.error("ไม่สามารถบันทึกรูปได้"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.issue.trim()) {
      toast.error("กรุณาเลือกหมวดหมู่และระบุรายละเอียดปัญหา");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("ไม่พบผู้ใช้งาน");

      let fileUrl = null;
      if (form.attachment) {
        try {
          const ext = form.attachment.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_ticket.${ext}`;
          const { error: uploadError } = await supabase
            .storage
            .from("ticket-attachments")
            .upload(fileName, form.attachment);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase
              .storage
              .from("ticket-attachments")
              .getPublicUrl(fileName);
            fileUrl = publicUrl;
          }
        } catch (uploadErr) {
          console.warn("Upload warning:", uploadErr?.message || uploadErr);
        }
      }

      const ticketPayload = {
        creator_id: user.id,
        reporter_name: form.employeeName,
        reporter_emp_id: form.employeeId || null,
        reporter_dept: form.department || null,
        reporter_avatar_url: form.profilePic || null,
        reporter_email: user.email || "",
        department: form.department,
        location: form.position,
        category: form.category,
        title: form.issue.substring(0, 60),
        description: form.issue,
        priority: form.urgency,
        status: "NEW",
        image_url: fileUrl,
      };

      const { data, error } = await insertTicketWithSchemaFallback(
        supabase,
        ticketPayload,
        { select: "id,ticket_no", single: true },
      );

      if (error) throw error;

      const ref = data?.ticket_no || `T${String(data.id).padStart(6, "0")}`;
      setTicketRef(ref);
      setSuccess(true);
      toast.success("ส่งคำขอเรียบร้อยแล้ว");
    } catch (err) {
      toast.error(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const thaiDateTime = formatThaiDateTime(currentTime);
  const selectedCategory = CATEGORIES.find((c) => c.id === form.category);
  const selectedUrgency = URGENCY.find((u) => u.id === form.urgency);
  const canSubmit = !!form.category && !!form.issue.trim() && !loading;

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="app-theme min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-50 p-6 "
      >
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25 }}
          className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-8"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[#2b59b0]" />
          <div className="relative">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
              <div className="absolute h-24 w-24 animate-pulse rounded-3xl bg-[#2b59b0]/15 blur-xl" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-[#2b59b0] shadow-lg shadow-[#2b59b0]/25">
                <CheckCircle2 className="text-white" size={48} />
              </div>
            </div>

            <h1 className="text-center text-2xl font-semibold text-slate-900 sm:text-[30px]">
              แจ้งปัญหาสำเร็จ
            </h1>
            <p className="mt-2 text-center text-sm text-slate-600 sm:text-base">
              ระบบบันทึกคำขอเรียบร้อยแล้ว ทีม IT จะติดต่อกลับตามระดับความเร่งด่วน
            </p>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-[11px] font-medium tracking-wide text-slate-500">
                Ticket Reference
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#2b59b0] sm:text-4xl">
                #{String(ticketRef || "").toUpperCase()}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedCategory && (
                  <span className="rounded-full border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-3 py-1.5 text-xs font-semibold text-[#2b59b0]">
                    {selectedCategory.label}
                  </span>
                )}
                {selectedUrgency && (
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedUrgency.chip}`}>
                    {selectedUrgency.label} ({selectedUrgency.priority})
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate("/dashboard")}
              className="mt-6 w-full rounded-xl bg-[#2b59b0] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#244a95] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/30"
            >
              ไปยัง Dashboard
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="app-theme min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-800  selection:bg-blue-100 antialiased">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      {/* Clean enterprise background */}

      {/* Premium Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "#f1f5f9" }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-200/80 bg-white/90 p-2.5 text-slate-700 shadow-sm transition-all hover:shadow-md"
            >
              <ArrowLeft size={18} />
            </motion.button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 sm:text-xl">
                  IT Service Desk
                </h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                  Standard
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                สร้างคำขอแจ้งซ่อม • ระบบมาตรฐานองค์กร
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="hidden items-center gap-3 rounded-xl border border-slate-200/70 bg-white/70 px-4 py-2 backdrop-blur-sm shadow-sm sm:flex"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
                <Calendar size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">{thaiDateTime.date}</p>
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">{thaiDateTime.time} น.</p>
              </div>
            </motion.div>

            <div className="flex items-center gap-2 rounded-xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2">
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <div className="absolute -inset-1 animate-ping rounded-full bg-emerald-500 opacity-20" />
              </div>
              <span className="text-xs font-bold text-emerald-700">พร้อมใช้งาน</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:py-8">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-8 space-y-6">
          <form id="create-ticket-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Premium Profile Card */}
            <motion.section
              {...sectionAnim}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-0.5 shadow-xl shadow-indigo-200/50 sm:h-24 sm:w-24">
                    <div className="h-full w-full rounded-2xl bg-white overflow-hidden border-2 border-white/50">
                      {form.profilePic ? (
                        <img
                          src={form.profilePic}
                          alt="Profile"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${form.employeeName}&background=6366f1&color=fff&size=96`;
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                          <User size={36} className="text-indigo-600" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2">
                    <div className="relative">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 border-2 border-white flex items-center justify-center shadow-lg">
                        <CheckCircle2 size={12} className="text-white" />
                      </div>
                      <div className="absolute -inset-1 animate-ping rounded-full bg-emerald-500/30" />
                    </div>
                  </div>
                  <div className="absolute -top-2 -left-2">
                    <div className="h-5 w-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 border-2 border-white flex items-center justify-center shadow-lg">
                      <Crown size={10} className="text-white" />
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                        Employee Profile
                      </p>
                      <h2 className="text-xl font-black text-slate-800 sm:text-2xl">
                        {form.employeeName || "พนักงาน"}
                      </h2>
                    </div>
                    <span className="w-fit rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-200 shadow-sm">
                      <Hash size={12} className="inline mr-1" />
                      {form.employeeId || "EMP-001"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Briefcase size={16} className="text-indigo-500" />
                      <span className="font-medium">{form.position || "เจ้าหน้าที่ระบบ"}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building size={16} className="text-indigo-500" />
                      <span className="font-medium">{form.department || "ฝ่ายเทคโนโลยีสารสนเทศ"}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Award size={16} className="text-amber-500" />
                      <span className="font-medium">ระดับพนักงาน</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Category Selection */}
            <motion.section
              {...sectionAnim}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="relative">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600" />
                      <div className="absolute -inset-1 animate-pulse rounded-full bg-indigo-500/20 blur-sm" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 sm:text-base">หมวดหมู่ปัญหา</h3>
                      <p className="text-xs text-slate-500 mt-0.5">เลือกหมวดหมู่ที่ตรงกับปัญหาของคุณ</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    จำเป็น *
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const selected = form.category === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        type="button"
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setForm((p) => ({ ...p, category: cat.id, issue: "" }))}
                        className={`
                          relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300
                          ${selected
                            ? `bg-gradient-to-br ${cat.selectedClass} text-white shadow-md`
                            : "bg-white border-slate-200/80 hover:border-slate-400 hover:shadow-sm"
                          }
                        `}
                      >
                        <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/5 blur-2xl" />

                        <div className="relative">
                          <div className="mb-4 flex items-center justify-between">
                            <div className={`
                              rounded-xl p-2.5 transition-all duration-300
                              ${selected ? 'bg-white' : cat.softClass}
                            `}>
                              <Icon size={20} className={cat.iconClass} />
                            </div>
                            {selected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="rounded-full bg-white/20 p-1"
                              >
                                <CheckCircle2 size={16} className="text-white" />
                              </motion.div>
                            )}
                          </div>

                          <p className={`text-sm font-bold mb-1 ${selected ? 'text-white' : 'text-slate-800'}`}>
                            {cat.label}
                          </p>
                          <p className={`text-xs ${selected ? 'text-white/80' : 'text-slate-500'}`}>
                            {cat.desc}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.section>

            {/* Issue Details */}
            <AnimatePresence mode="wait">
              {form.category && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                >
                  <div className="relative">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-amber-500 to-orange-500" />
                          <div className="absolute -inset-1 animate-pulse rounded-full bg-amber-500/20 blur-sm" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 sm:text-base">รายละเอียดปัญหา</h3>
                          <p className="text-xs text-slate-500 mt-0.5">กรุณาอธิบายปัญหาให้ชัดเจน</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        จำเป็น *
                      </span>
                    </div>

                    <div className="mb-5">
                      <label className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <Sparkles size={14} className="text-amber-500" />
                        ปัญหาที่พบบ่อย
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(ISSUES[form.category] || []).map((item, idx) => (
                          <motion.button
                            key={item}
                            type="button"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.03 }}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setForm((p) => ({ ...p, issue: item }))}
                            className={`
                              rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 border-2
                              ${form.issue === item
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-lg shadow-amber-200/50"
                                : "bg-slate-100 border-transparent text-slate-700 hover:bg-amber-50 hover:border-amber-300"
                              }
                            `}
                          >
                            {item}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <FileText size={14} className="text-blue-500" />
                        คำอธิบายเพิ่มเติม
                      </label>
                      <div className="relative group/textarea">
                        <textarea
                          required
                          maxLength={500}
                          value={form.issue}
                          onChange={(e) => setForm((p) => ({ ...p, issue: e.target.value }))}
                          onFocus={() => setFocusedField('description')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="ระบุอาการที่พบ ข้อความผิดพลาด เวลาที่เกิดเหตุ และสิ่งที่ได้ลองแก้ไขแล้ว..."
                          className={`
                            min-h-[180px] w-full rounded-2xl border-2 px-5 py-4 text-sm
                            outline-none transition-all duration-300 resize-none
                            bg-slate-50/80 placeholder:text-slate-400
                            ${focusedField === 'description'
                              ? 'border-indigo-500 bg-white ring-4 ring-indigo-100/50 shadow-md'
                              : 'border-slate-200/80 hover:border-slate-300'
                            }
                          `}
                        />
                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                          <div className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-lg border border-slate-200 shadow-sm">
                            <span className="text-xs font-bold text-slate-500">
                              {form.issue.length}/500
                            </span>
                          </div>
                          {form.issue.length > 20 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg"
                            >
                              <CheckCircle2 size={14} className="text-white" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Info size={14} />
                        การระบุรายละเอียดที่ชัดเจนช่วยให้ทีมงานแก้ไขปัญหาได้เร็วขึ้น
                      </p>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Attachment Section */}
            <motion.section
              {...sectionAnim}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="relative">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-cyan-600 to-teal-600" />
                      <div className="absolute -inset-1 animate-pulse rounded-full bg-cyan-500/20 blur-sm" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 sm:text-base">หลักฐานประกอบ</h3>
                      <p className="text-xs text-slate-500 mt-0.5">รูปภาพ, เอกสาร, หรือภาพหน้าจอ</p>
                    </div>
                  </div>
                  <div className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${preview
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-200/50'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }
                  `}>
                    <Camera size={14} />
                    {preview ? 'แนบแล้ว' : 'ไม่บังคับ'}
                  </div>
                </div>

                {isCameraActive ? (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-200 bg-black/5 shadow-lg">
                      {isReviewing ? (
                        <img src={tempImage} alt="preview capture" className="aspect-video w-full object-cover" />
                      ) : (
                        <Webcam
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          mirrored={facingMode === "user"}
                          videoConstraints={{ facingMode }}
                          className="aspect-video w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {!isReviewing && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={capture}
                            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                          >
                            ถ่ายภาพ
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => setFacingMode((p) => (p === "user" ? "environment" : "user"))}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                          >
                            <FlipHorizontal size={18} />
                          </motion.button>
                        </>
                      )}
                      {isReviewing && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => setIsReviewing(false)}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                          >
                            ถ่ายใหม่
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={confirmCapture}
                            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                          >
                            ใช้รูปนี้
                          </motion.button>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCameraActive(false);
                        setIsReviewing(false);
                        setTempImage(null);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      ปิดกล้อง
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <motion.button
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setIsCameraActive(true)}
                      className="group rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50/80 to-white p-6 text-center transition-all hover:border-indigo-400 hover:bg-gradient-to-br hover:from-indigo-50/50 hover:to-white"
                    >
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 group-hover:scale-110 transition-transform">
                        <Camera size={24} className="text-indigo-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 mb-1">เปิดกล้อง</p>
                      <p className="text-xs text-slate-500">ถ่ายภาพหน้างานทันที</p>
                    </motion.button>

                    <label className="group cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50/80 to-white p-6 text-center transition-all hover:border-emerald-400 hover:bg-gradient-to-br hover:from-emerald-50/50 hover:to-white">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 group-hover:scale-110 transition-transform">
                        <Upload size={24} className="text-emerald-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 mb-1">อัปโหลดไฟล์</p>
                      <p className="text-xs text-slate-500">JPG / PNG ไม่เกิน 5MB</p>
                      <input type="file" hidden accept="image/*" onChange={handleFile} />
                    </label>
                  </div>
                )}

                {preview && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 overflow-hidden rounded-2xl border-2 border-slate-200/80 bg-white shadow-lg"
                  >
                    <img src={preview} alt="attachment preview" className="aspect-video w-full object-cover" />
                    <div className="flex items-center justify-between border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                          <ImageIcon size={16} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">ไฟล์แนบ</p>
                          <p className="text-[9px] text-slate-500">พร้อมใช้งาน</p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={clearAttachment}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.section>
          </form>
        </div>

        {/* Right Column - Summary & Submit */}
        <div className="lg:col-span-4 space-y-6">
          {/* Priority Card */}
          <motion.section
            {...sectionAnim}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="relative">
                  <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-amber-500 to-red-500" />
                  <div className="absolute -inset-1 animate-pulse rounded-full bg-amber-500/20 blur-sm" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 sm:text-base">ระดับความเร่งด่วน</h3>
                  <p className="text-xs text-slate-500 mt-0.5">เลือกตามผลกระทบ</p>
                </div>
              </div>

              <div className="space-y-3">
                {URGENCY.map((item, idx) => {
                  const active = form.urgency === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setForm((p) => ({ ...p, urgency: item.id }))}
                      className={`
                        w-full rounded-xl border-2 p-4 text-left transition-all duration-300
                        ${active
                          ? `${item.border} ${item.selectedBg} shadow-lg`
                          : "bg-white border-slate-200/80 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-white"
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${item.dot} ${active ? 'animate-pulse' : ''}`} />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className={`text-sm font-bold ${active ? `text-${item.color}-700` : 'text-slate-800'}`}>
                                {item.label}
                              </p>
                              <span className={`
                                rounded-full px-2 py-0.5 text-[9px] font-bold font-mono
                                ${active ? item.chip : 'bg-slate-100 text-slate-600 border border-slate-200'}
                              `}>
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">SLA: {item.desc}</p>
                          </div>
                        </div>
                        {active && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`h-2 w-2 rounded-full bg-${item.color}-500 animate-pulse`}
                          />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* SLA Timeline */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-500" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">SLA Response</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {URGENCY.map((u) => (
                      <div
                        key={u.id}
                        className={`
                          h-1.5 rounded-full transition-all duration-300
                          ${form.urgency === u.id
                            ? `w-8 bg-gradient-to-r ${u.gradient}`
                            : 'w-4 bg-slate-200'
                          }
                        `}
                      />
                    ))}
                  </div>
                </div>
                {selectedUrgency && (
                  <p className="text-[9px] text-slate-500 mt-2">
                    เวลาดำเนินการ: <span className="font-bold text-slate-700">{selectedUrgency.desc}</span>
                  </p>
                )}
              </div>
            </div>
          </motion.section>

          {/* Premium Summary Card */}
          <motion.section
            {...sectionAnim}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="relative">
                  <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600" />
                  <div className="absolute -inset-1 animate-pulse rounded-full bg-indigo-500/20 blur-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <FileText size={16} className="text-white" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                    สรุปคำขอ
                  </h3>
                </div>
                {canSubmit && (
                  <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                    <Sparkles size={12} className="text-amber-600" />
                    <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">พร้อมส่ง</span>
                  </div>
                )}
              </div>

              {/* Summary Grid */}
              <div className="space-y-3">
                <div className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-4 border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                      <User size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">ผู้แจ้ง</p>
                      <p className="text-sm font-bold text-slate-800">{form.employeeName || "-"}</p>
                      <p className="text-[10px] text-slate-500">{form.position || "-"} • {form.department || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-3 border border-slate-200/80">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">หมวดหมู่</p>
                    {selectedCategory ? (
                      <div className="flex items-center gap-1.5">
                        <div className={`h-6 w-6 rounded-lg ${selectedCategory.softClass} flex items-center justify-center`}>
                          <selectedCategory.icon size={14} className={selectedCategory.iconClass} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">{selectedCategory.label}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">ยังไม่เลือก</p>
                    )}
                  </div>

                  <div className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-3 border border-slate-200/80">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">ความเร่งด่วน</p>
                    {selectedUrgency ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${selectedUrgency.dot} animate-pulse`} />
                        <span className="text-xs font-bold text-slate-800">{selectedUrgency.label}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${selectedUrgency.chip}`}>
                          {selectedUrgency.priority}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">ยังไม่เลือก</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-3 border border-slate-200/80">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">หลักฐานแนบ</p>
                  {preview ? (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center">
                        <ImageIcon size={16} className="text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">มีไฟล์แนบ</p>
                        <p className="text-[8px] text-slate-500">พร้อมส่ง</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Camera size={16} className="text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500">ไม่มีไฟล์แนบ</p>
                    </div>
                  )}
                </div>

                {form.issue && (
                  <div className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-3 border border-slate-200/80">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">รายละเอียด</p>
                    <p className="text-xs text-slate-700 line-clamp-2">{form.issue}</p>
                    <p className="text-[8px] text-slate-400 mt-1">{form.issue.length}/500 ตัวอักษร</p>
                  </div>
                )}
              </div>

              {/* Premium Submit Button */}
              <div className="relative mt-6">
                <button
                  type="submit"
                  form="create-ticket-form"
                  disabled={!canSubmit}
                  className={`
                    relative w-full py-4 px-6 rounded-xl font-bold text-sm
                    flex items-center justify-center gap-3 transition-all duration-300
                    overflow-hidden group/btn
                    ${canSubmit && !loading
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />

                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span className="bg-gradient-to-r from-white via-indigo-100 to-white bg-clip-text text-transparent">
                        กำลังส่งคำขอ...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <Zap size={18} className="text-yellow-300 fill-yellow-300 group-hover/btn:rotate-12 group-hover/btn:scale-125 transition-all duration-300" />
                        <div className="absolute -inset-1 bg-white/30 rounded-full blur-sm animate-ping opacity-0 group-hover/btn:opacity-100" />
                      </div>
                      <span className="bg-gradient-to-r from-white via-indigo-100 to-white bg-clip-text text-transparent">
                        ยืนยันการแจ้งซ่อม
                      </span>
                      <ChevronRight size={18} className="group-hover/btn:translate-x-2 transition-transform duration-300" />
                    </>
                  )}
                </button>
              </div>

              {/* Security & Time Footer */}
              <div className="mt-5 flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/80 backdrop-blur rounded-lg border border-slate-200/80 shadow-sm">
                  <Shield size={12} className="text-indigo-600" />
                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Secure</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/80 backdrop-blur rounded-lg border border-slate-200/80 shadow-sm">
                  <Clock size={12} className="text-indigo-600" />
                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{thaiDateTime.time} น.</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg border border-slate-200 shadow-sm">
                  <Crown size={12} className="text-amber-600" />
                  <span className="text-[8px] font-bold text-slate-700 uppercase tracking-wider">Standard</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Help Tip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Info size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1">เคล็ดลับการแจ้งซ่อม</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ระบุขั้นตอนที่ทำก่อนเกิดปัญหา เวลาที่เริ่มเกิดปัญหา และแนบภาพหน้าจอหรือภาพหน้างาน
                  เพื่อให้ทีมงานแก้ไขปัญหาได้รวดเร็วขึ้น
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Premium Footer */}
      <footer className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200/80 pt-5 text-[9px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Building size={12} className="text-indigo-400" />
            IT Service Management System v3.0
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <Gem size={12} className="text-indigo-400" />
            Enterprise Edition
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <Heart size={12} className="text-indigo-400" />
            24/7 Support
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="text-indigo-400" />
            {thaiDateTime.date}
          </span>
        </div>
      </footer>

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CreateTicket;

