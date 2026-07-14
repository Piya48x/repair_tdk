import React, { useDeferredValue, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Webcam from "react-webcam";
import {
  AlertTriangle,
  Building2,
  Camera,
  FileImage,
  FlipHorizontal,
  ImagePlus,
  LayoutGrid,
  Loader2,
  MapPin,
  Search,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../../../lib/supabaseClient";

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 8;
const FIELD_CLASS_BASE =
  "w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 sm:py-2.5";
const CUSTOM_CATEGORY_VALUE = "__custom__";
const LEGACY_WALK_IN_CATEGORY_OPTIONS = [
  { value: "Hardware", label: "คอมพิวเตอร์ / อุปกรณ์" },
  { value: "Network", label: "เครือข่าย / Wi-Fi" },
  { value: "Printer", label: "เครื่องพิมพ์ / สแกน" },
  { value: "Email", label: "อีเมล / บัญชี" },
  { value: "System", label: "ระบบงาน / ซอฟต์แวร์" },
  { value: "Access", label: "สิทธิ์ / บัญชีผู้ใช้" },
  { value: "Walk-in", label: "อื่น ๆ / Walk-in" },
];

const WALK_IN_CATEGORY_OPTIONS = [
  { value: "Hardware", label: "คอมพิวเตอร์ / อุปกรณ์" },
  { value: "Network", label: "เครือข่าย / Wi-Fi" },
  { value: "Printer", label: "เครื่องพิมพ์ / สแกน" },
  { value: "Email", label: "อีเมลองค์กร" },
  { value: "System", label: "ระบบงาน / ซอฟต์แวร์" },
  { value: "CCTV", label: "CCTV" },
  { value: CUSTOM_CATEGORY_VALUE, label: "อื่นๆ (พิมพ์เอง)" },
];

function toLocalDatetimeValue(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
  ].join("-") + `T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function buildInitialForm(currentUser = null) {
  const nowValue = toLocalDatetimeValue(new Date());
  return {
    requester_name: "",
    requester_emp_id: "",
    department: "",
    location: String(currentUser?.location || "").trim(),
    category: "",
    custom_category: "",
    issue_title: "",
    issue_description: "",
    priority: "medium",
    status: "closed",
    channel: "walk-in",
    start_time: nowValue,
    end_time: nowValue,
    resolution_note: "",
    reporter_avatar_url: "",
  };
}

function normalizeAttachmentFile(file) {
  if (!file) return null;
  if (file instanceof File && file.name) return file;

  const extension = String(file?.type || "").split("/")[1] || "png";
  return new File([file], `walkin_${Date.now()}.${extension}`, {
    type: file?.type || "image/png",
  });
}

function formatDateTimeSummary(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeLookupText(value) {
  return String(value || "").trim().toLowerCase();
}

function buildAvatarFallback(name, color = "2b59b0") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || "U"))}&background=${color}&color=fff&size=96`;
}

function buildAttachmentId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function revokeAttachmentPreview(item) {
  if (item?.previewUrl && String(item.previewUrl).startsWith("blob:")) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

const WalkInTicketModal = ({ isOpen, onClose, onSubmit, currentUser, theme = "light" }) => {
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachmentsRef = useRef([]);
  const initialFormRef = useRef(buildInitialForm(currentUser));

  const [form, setForm] = useState(() => buildInitialForm(currentUser));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [activeAttachmentKind, setActiveAttachmentKind] = useState("before");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [tempImage, setTempImage] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [directoryMembers, setDirectoryMembers] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [activeLookupField, setActiveLookupField] = useState(null);
  const deferredRequesterName = useDeferredValue(form.requester_name);
  const deferredRequesterEmpId = useDeferredValue(form.requester_emp_id);

  const beforeAttachments = attachments.filter((item) => item.kind === "before");
  const afterAttachments = attachments.filter((item) => item.kind === "after");
  const activeKindAttachments = activeAttachmentKind === "after" ? afterAttachments : beforeAttachments;
  const activePreviewAttachment = activeKindAttachments[activeKindAttachments.length - 1] || null;
  const remainingAttachmentSlots = Math.max(0, MAX_ATTACHMENTS - attachments.length);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(revokeAttachmentPreview);
    };
  }, []);

  const resetAttachmentState = () => {
    attachmentsRef.current.forEach(revokeAttachmentPreview);
    attachmentsRef.current = [];
    setAttachments([]);
    setActiveAttachmentKind("before");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const hasUnsavedChanges = () => {
    const initialForm = initialFormRef.current || buildInitialForm(currentUser);
    const trackedKeys = [
      "requester_name",
      "requester_emp_id",
      "department",
      "location",
      "category",
      "custom_category",
      "issue_title",
      "issue_description",
      "priority",
      "start_time",
      "end_time",
      "resolution_note",
      "reporter_avatar_url",
    ];

    if (trackedKeys.some((key) => String(form?.[key] || "") !== String(initialForm?.[key] || ""))) {
      return true;
    }

    return attachmentsRef.current.length > 0 || Boolean(tempImage);
  };

  const closeModal = () => {
    setIsCloseConfirmOpen(false);
    onClose?.();
  };

  const requestClose = () => {
    if (isSubmitting) return;
    if (hasUnsavedChanges()) {
      setIsCloseConfirmOpen(true);
      return;
    }

    closeModal();
  };

  useEffect(() => {
    if (!isOpen) {
      setIsCloseConfirmOpen(false);
      resetAttachmentState();
      setTempImage(null);
      setIsCameraOpen(false);
      setIsReviewing(false);
      return;
    }
    const nextInitialForm = buildInitialForm(currentUser);
    initialFormRef.current = nextInitialForm;
    resetAttachmentState();
    setForm(nextInitialForm);
    setIsCloseConfirmOpen(false);
    setErrors({});
    setIsSubmitting(false);
    setTempImage(null);
    setIsCameraOpen(false);
    setFacingMode("environment");
    setIsReviewing(false);
    setActiveLookupField(null);
  }, [currentUser, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isCloseConfirmOpen) {
        setIsCloseConfirmOpen(false);
        return;
      }
      if (event.key === "Escape") requestClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCloseConfirmOpen, isOpen, requestClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;
    const loadMembers = async () => {
      setDirectoryLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        const rows = Array.isArray(data) ? data : [];
        setDirectoryMembers(
          rows.map((row) => ({
            id: String(row?.id || ""),
            full_name: String(row?.full_name || row?.name || row?.email || "").trim(),
            employee_code: String(row?.employee_code || row?.employeeId || "").trim(),
            department: String(row?.department || "").trim(),
            location: String(row?.location || row?.work_location || "").trim(),
            avatar_url: String(row?.avatar_url || row?.id_card_url || "").trim(),
            email: String(row?.email || "").trim(),
          })),
        );
      } catch (error) {
        if (!cancelled) {
          setDirectoryMembers([]);
          console.warn("Load walk-in profile directory error:", error);
        }
      } finally {
        if (!cancelled) {
          setDirectoryLoading(false);
        }
      }
    };

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const setField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "category" && value !== CUSTOM_CATEGORY_VALUE ? { custom_category: "" } : {}),
    }));
    if (errors[key] || (key === "category" && errors.custom_category)) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        if (key === "category") delete next.custom_category;
        return next;
      });
    }
  };

  const activeLookupQuery =
    activeLookupField === "requester_emp_id" ? deferredRequesterEmpId : deferredRequesterName;
  const normalizedLookupQuery = normalizeLookupText(activeLookupQuery);
  const profileSuggestions =
    normalizedLookupQuery.length === 0
      ? []
      : directoryMembers
        .filter((member) => {
          const fullName = normalizeLookupText(member.full_name);
          const employeeCode = normalizeLookupText(member.employee_code);
          const email = normalizeLookupText(member.email);
          return (
            fullName.includes(normalizedLookupQuery) ||
            employeeCode.includes(normalizedLookupQuery) ||
            email.includes(normalizedLookupQuery)
          );
        })
        .slice(0, 6);

  const handleRequesterFieldChange = (field, value) => {
    setField(field, value);
    setActiveLookupField(field);
    if (field === "requester_name" || field === "requester_emp_id") {
      setForm((prev) => ({ ...prev, reporter_avatar_url: "" }));
    }
  };

  const handleProfileSelect = (member) => {
    setForm((prev) => ({
      ...prev,
      requester_name: member.full_name || prev.requester_name,
      requester_emp_id: member.employee_code || prev.requester_emp_id,
      department: member.department || prev.department,
      location: member.location || prev.location,
      reporter_avatar_url: member.avatar_url || "",
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.requester_name;
      delete next.requester_emp_id;
      return next;
    });
    setActiveLookupField(null);
  };

  const appendAttachments = (rawFiles, options = {}) => {
    const { kind = activeAttachmentKind, successMessage = "" } = options;
    const files = (Array.isArray(rawFiles) ? rawFiles : [rawFiles])
      .map((file) => normalizeAttachmentFile(file))
      .filter(Boolean);

    if (files.length === 0) return false;

    const currentCount = attachmentsRef.current.length;
    const availableSlots = Math.max(0, MAX_ATTACHMENTS - currentCount);

    if (availableSlots <= 0) {
      toast.error(`แนบรูปได้สูงสุด ${MAX_ATTACHMENTS} รูป`);
      return false;
    }

    const validFiles = [];
    let hasOversizedFile = false;

    files.forEach((file) => {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        hasOversizedFile = true;
        return;
      }
      validFiles.push(file);
    });

    if (hasOversizedFile) {
      toast.error("ไฟล์แนบต้องมีขนาดไม่เกิน 5MB");
    }

    const acceptedFiles = validFiles.slice(0, availableSlots);

    if (acceptedFiles.length === 0) {
      return false;
    }

    if (validFiles.length > acceptedFiles.length) {
      toast.error(`เหลือพื้นที่แนบได้อีก ${availableSlots} รูป`);
    }

    const nextItems = acceptedFiles.map((file) => ({
      id: buildAttachmentId(),
      kind: kind === "after" ? "after" : "before",
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setAttachments((prev) => [...prev, ...nextItems]);
    setIsCameraOpen(false);
    setIsReviewing(false);
    setTempImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (successMessage) {
      toast.success(successMessage);
    } else if (acceptedFiles.length > 1) {
      toast.success(`แนบรูป ${acceptedFiles.length} รูปแล้ว`);
    } else {
      toast.success(`แนบรูป ${kind === "after" ? "After" : "Before"} แล้ว`);
    }

    return true;
  };

  const removeAttachment = (attachmentId) => {
    setAttachments((prev) => {
      const next = [];
      prev.forEach((item) => {
        if (item.id === attachmentId) {
          revokeAttachmentPreview(item);
          return;
        }
        next.push(item);
      });
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePaste = (event) => {
      const clipboardItems = Array.from(event.clipboardData?.items || []);
      const clipboardImageItem = clipboardItems.find(
        (item) => item.kind === "file" && String(item.type || "").startsWith("image/"),
      );
      const clipboardImage =
        clipboardImageItem?.getAsFile?.() ||
        Array.from(event.clipboardData?.files || []).find((file) =>
          String(file?.type || "").startsWith("image/"),
        );

      if (!clipboardImage) return;

      event.preventDefault();
      const targetKind = activeAttachmentKind === "after" ? "after" : "before";
      appendAttachments(clipboardImage, {
        kind: targetKind,
        successMessage: `แนบภาพจากคลิปบอร์ดเข้า ${targetKind === "after" ? "After" : "Before"} แล้ว`,
      });
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeAttachmentKind, isOpen]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    appendAttachments(files, { kind: activeAttachmentKind });
    event.target.value = "";
  };

  const capture = () => {
    if (!webcamRef.current || typeof webcamRef.current.getScreenshot !== "function") {
      toast.error("กล้องไม่พร้อมใช้งาน");
      return;
    }

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error("ไม่สามารถจับภาพจากกล้องได้");
      return;
    }

    setTempImage(imageSrc);
    setIsReviewing(true);
  };

  const confirmCapture = async () => {
    if (!tempImage) return;

    try {
      const response = await fetch(tempImage);
      const blob = await response.blob();
      const file = new File([blob], `walkin_${Date.now()}.jpg`, { type: "image/jpeg" });
      appendAttachments(file, {
        kind: activeAttachmentKind,
        successMessage: `บันทึกรูป ${activeAttachmentKind === "after" ? "After" : "Before"} จากกล้องแล้ว`,
      });
    } catch (error) {
      toast.error("ไม่สามารถบันทึกรูปจากกล้องได้");
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!String(form.requester_name || "").trim()) {
      nextErrors.requester_name = "กรุณาระบุชื่อผู้แจ้ง";
    }

    if (!String(form.issue_title || "").trim()) {
      nextErrors.issue_title = "กรุณาระบุหัวข้อปัญหา";
    }

    if (!String(form.category || "").trim()) {
      nextErrors.category = "กรุณาเลือกหมวดหมู่งาน";
    }

    if (form.category === CUSTOM_CATEGORY_VALUE && !String(form.custom_category || "").trim()) {
      nextErrors.custom_category = "กรุณาพิมพ์หมวดหมู่งาน";
    }

    if (form.end_time && form.start_time) {
      const start = new Date(form.start_time);
      const end = new Date(form.end_time);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        nextErrors.end_time = "เวลาสิ้นสุดต้องมากกว่าหรือเท่ากับเวลาเริ่มต้น";
      }
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const submittedCategory =
        form.category === CUSTOM_CATEGORY_VALUE
          ? String(form.custom_category || "").trim()
          : String(form.category || "").trim();

      await onSubmit?.({
        ...form,
        requester_name: String(form.requester_name || "").trim(),
        requester_emp_id: String(form.requester_emp_id || "").trim(),
        department: String(form.department || "").trim(),
        location: String(form.location || "").trim(),
        category: submittedCategory,
        custom_category: String(form.custom_category || "").trim(),
        issue_title: String(form.issue_title || "").trim(),
        issue_description: String(form.issue_description || "").trim(),
        resolution_note: String(form.resolution_note || "").trim(),
        reporter_avatar_url: String(form.reporter_avatar_url || "").trim(),
        created_by: currentUser?.id || null,
        created_by_name: currentUser?.name || "IT Support",
        assigned_to: currentUser?.id || null,
        assigned_name: currentUser?.name || "IT Support",
        assigned_employee_id: currentUser?.employeeId || null,
        closed_by: currentUser?.id || null,
        closed_by_name: currentUser?.name || "IT Support",
        before_attachments: beforeAttachments.map((item) => item.file),
        after_attachments: afterAttachments.map((item) => item.file),
      });
      closeModal();
    } catch (error) {
      setErrors({
        form: error?.message || "ไม่สามารถบันทึกงานได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isDark = theme === "dark";
  const overlayClass = isDark ? "bg-slate-950/80" : "bg-slate-950/65";
  const shellClass = isDark
    ? "border-slate-700 bg-[#0f172a] text-slate-100 shadow-2xl"
    : "border-slate-200 bg-white text-slate-900 shadow-2xl";
  const surfaceClass = isDark
    ? "rounded-2xl border border-slate-700 bg-slate-900/70"
    : "rounded-2xl border border-slate-200 bg-slate-50";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const labelClass = isDark ? "text-slate-300" : "text-slate-700";
  const inputClass = isDark
    ? `${FIELD_CLASS_BASE} border-slate-600 bg-[#162136] text-slate-100 placeholder-slate-400 focus:border-[#2b59b0] focus:ring-[#2b59b0]/30`
    : `${FIELD_CLASS_BASE} border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-[#2b59b0] focus:ring-[#2b59b0]/20`;
  const chipClass = isDark
    ? "inline-flex items-center rounded-full border border-[#2b59b0]/35 bg-[#2b59b0]/15 px-2.5 py-1 text-[11px] font-semibold text-[#c8d9ff] sm:px-3 sm:text-xs"
    : "inline-flex items-center rounded-full border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-2.5 py-1 text-[11px] font-semibold text-[#2b59b0] sm:px-3 sm:text-xs";
  const primaryButtonClass =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2b59b0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";
  const secondaryButtonClass = isDark
    ? "inline-flex w-full items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    : "inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";
  const confirmSecondaryButtonClass = isDark
    ? "inline-flex w-full items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
  const dangerButtonClass = isDark
    ? "inline-flex w-full items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";
  const metaTileClass = isDark
    ? "rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-3"
    : "rounded-2xl border border-slate-200 bg-white px-3 py-3";
  const metaLabelClass = isDark
    ? "text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"
    : "text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400";
  const metaValueClass = isDark
    ? "mt-1 text-sm font-semibold text-slate-100"
    : "mt-1 text-sm font-semibold text-slate-700";
  const attachmentActionClass = isDark
    ? "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
  const lookupDropdownClass = isDark
    ? "absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
    : "absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl";
  const lookupItemClass = isDark
    ? "flex w-full items-center gap-3 border-b border-slate-800 px-3 py-3 text-left transition last:border-b-0 hover:bg-slate-800"
    : "flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition last:border-b-0 hover:bg-slate-50";

  const renderLookupDropdown = (field) =>
    activeLookupField === field &&
    (directoryLoading || profileSuggestions.length > 0 || normalizedLookupQuery) && (
      <div className={lookupDropdownClass}>
        {directoryLoading ? (
          <div className={`flex items-center gap-2 px-3 py-3 text-sm ${mutedClass}`}>
            <Loader2 size={14} className="animate-spin" />
            <span>กำลังโหลดรายชื่อพนักงาน...</span>
          </div>
        ) : profileSuggestions.length > 0 ? (
          profileSuggestions.map((member) => (
            <button
              key={member.id || `${member.employee_code}-${member.full_name}`}
              type="button"
              onClick={() => handleProfileSelect(member)}
              className={lookupItemClass}
            >
              <img
                src={member.avatar_url || buildAvatarFallback(member.full_name || member.employee_code || "U")}
                onError={(event) => {
                  event.currentTarget.src = buildAvatarFallback(member.full_name || member.employee_code || "U");
                }}
                alt={member.full_name || "profile"}
                className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover"
              />
              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                  {member.full_name || "-"}
                </p>
                <p className={`truncate text-xs ${mutedClass}`}>
                  {member.employee_code || "ไม่มีรหัส"} • {member.department || "ไม่ระบุแผนก"}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className={`flex items-center gap-2 px-3 py-3 text-sm ${mutedClass}`}>
            <Search size={14} />
            <span>ไม่พบรายชื่อที่ใกล้เคียง</span>
          </div>
        )}
      </div>
    );

  const renderAttachmentGallery = (title, type, items) => (
    <div className={surfaceClass}>
      <div className="flex items-center justify-between gap-3 border-b border-inherit px-4 py-3">
        <div>
          <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{title}</p>
          <p className={`text-xs ${mutedClass}`}>{items.length} รูป</p>
        </div>
        <button
          type="button"
          onClick={() => setActiveAttachmentKind(type)}
          className={
            activeAttachmentKind === type
              ? "rounded-full bg-[#2b59b0] px-3 py-1 text-xs font-semibold text-white"
              : isDark
                ? "rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
                : "rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600"
          }
        >
          ใช้งานช่องนี้
        </button>
      </div>

      {items.length === 0 ? (
        <div className={`px-4 py-4 text-sm ${mutedClass}`}>ยังไม่มีรูป {type === "after" ? "After" : "Before"}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`overflow-hidden rounded-2xl border ${isDark ? "border-slate-700 bg-slate-950/80" : "border-slate-200 bg-white"
                }`}
            >
              <div className="relative">
                <img src={item.previewUrl} alt={`${title} ${index + 1}`} className="h-28 w-full object-cover sm:h-32" />
                <button
                  type="button"
                  onClick={() => removeAttachment(item.id)}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-rose-600"
                  aria-label="ลบรูป"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="px-3 py-2">
                <p className={`truncate text-xs font-semibold ${isDark ? "text-slate-100" : "text-slate-700"}`}>
                  {title} {index + 1}
                </p>
                <p className={`truncate text-[11px] ${mutedClass}`}>{item.file.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const leftPanel = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={metaTileClass}>
          <p className={metaLabelClass}>Status</p>
          <p className={metaValueClass}>Closed</p>
        </div>
        <div className={metaTileClass}>
          <p className={metaLabelClass}>Channel</p>
          <p className={metaValueClass}>Walk-in</p>
        </div>
        <div className={metaTileClass}>
          <p className={metaLabelClass}>Started</p>
          <p className={metaValueClass}>{formatDateTimeSummary(form.start_time)}</p>
        </div>
        <div className={metaTileClass}>
          <p className={metaLabelClass}>Finished</p>
          <p className={metaValueClass}>{formatDateTimeSummary(form.end_time)}</p>
        </div>
      </div>

      <div className={`${surfaceClass} p-4 sm:p-5`}>
        <div className="mb-4">
          <p className={`text-sm font-semibold ${labelClass}`}>ข้อมูลผู้แจ้ง</p>
          <p className={`mt-1 text-xs ${mutedClass}`}>ค้นหาจากชื่อหรือรหัสพนักงาน แล้วเลือกจากโปรไฟล์ได้ทันที</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
              ชื่อผู้แจ้ง <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.requester_name}
                onChange={(event) => handleRequesterFieldChange("requester_name", event.target.value)}
                onFocus={() => setActiveLookupField("requester_name")}
                onBlur={() => {
                  window.setTimeout(() => {
                    setActiveLookupField((current) => (current === "requester_name" ? null : current));
                  }, 120);
                }}
                className={`${inputClass} pl-10 ${errors.requester_name ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : ""
                  }`}
                placeholder="ชื่อผู้แจ้ง"
                autoComplete="off"
              />
              {renderLookupDropdown("requester_name")}
            </div>
            {errors.requester_name && (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.requester_name}</p>
            )}
          </div>

          <div>
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>รหัสพนักงาน</label>
            <div className="relative">
              <FileImage size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.requester_emp_id}
                onChange={(event) => handleRequesterFieldChange("requester_emp_id", event.target.value)}
                onFocus={() => setActiveLookupField("requester_emp_id")}
                onBlur={() => {
                  window.setTimeout(() => {
                    setActiveLookupField((current) => (current === "requester_emp_id" ? null : current));
                  }, 120);
                }}
                className={`${inputClass} pl-10`}
                placeholder="รหัสพนักงาน"
                autoComplete="off"
              />
              {renderLookupDropdown("requester_emp_id")}
            </div>
          </div>

          <div>
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>แผนก</label>
            <div className="relative">
              <Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.department}
                onChange={(event) => setField("department", event.target.value)}
                className={`${inputClass} pl-10`}
                placeholder="แผนก"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>สถานที่</label>
            <div className="relative">
              <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.location}
                onChange={(event) => setField("location", event.target.value)}
                className={`${inputClass} pl-10`}
                placeholder="สถานที่ / จุดรับบริการ"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={`${surfaceClass} p-4 sm:p-5`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
              หมวดหมู่ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <LayoutGrid size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={form.category}
                onChange={(event) => setField("category", event.target.value)}
                className={`${inputClass} pl-10 ${errors.category ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : ""}`}
              >
                <option value="">เลือกหมวดหมู่</option>
                {WALK_IN_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {form.category === CUSTOM_CATEGORY_VALUE ? (
              <div className="mt-2">
                <input
                  value={form.custom_category}
                  onChange={(event) => setField("custom_category", event.target.value)}
                  className={`${inputClass} ${errors.custom_category ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : ""
                    }`}
                  placeholder="พิมพ์หมวดหมู่อื่นๆ เช่น ขอเปิดไฟล์ย้อนหลัง / ตรวจสอบระบบ"
                  autoComplete="off"
                />
                {errors.custom_category ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">{errors.custom_category}</p>
                ) : (
                  <p className={`mt-1 text-xs ${mutedClass}`}>ระบบจะบันทึกหมวดหมู่ตามข้อความที่พิมพ์</p>
                )}
              </div>
            ) : null}
            {errors.category && (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.category}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
              หัวข้อปัญหา <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FileImage size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <input
                value={form.issue_title}
                onChange={(event) => setField("issue_title", event.target.value)}
                className={`${inputClass} pl-10 ${errors.issue_title ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : ""
                  }`}
                placeholder="หัวข้อปัญหา"
                autoComplete="off"
              />
            </div>
            {errors.issue_title && (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.issue_title}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>รายละเอียดปัญหา</label>
            <textarea
              rows="4"
              value={form.issue_description}
              onChange={(event) => setField("issue_description", event.target.value)}
              className={inputClass}
              placeholder="พิมพ์อาการที่ผู้ใช้แจ้งหรือรายละเอียดงานที่เข้าดำเนินการ"
            />
          </div>

          <div>
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>ระดับความสำคัญ</label>
            <select
              value={form.priority}
              onChange={(event) => setField("priority", event.target.value)}
              className={inputClass}
            >
              <option value="low">ต่ำ</option>
              <option value="medium">ปานกลาง</option>
              <option value="high">สูง</option>
            </select>
          </div>
        </div>
      </div>

      <div className={`${surfaceClass} p-4 sm:p-5`}>
        <div className="mb-4">
          <p className={`text-sm font-semibold ${labelClass}`}>ช่วงปฏิบัติงานของ IT</p>
          <p className={`mt-1 text-xs ${mutedClass}`}>กำหนดเวลาเริ่มและเวลาสิ้นสุดให้ครบในฟอร์มเดียว</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>เริ่มปฏิบัติงาน</label>
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(event) => setField("start_time", event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>เสร็จสิ้นงาน</label>
            <input
              type="datetime-local"
              value={form.end_time}
              min={form.start_time || undefined}
              onChange={(event) => setField("end_time", event.target.value)}
              className={`${inputClass} ${errors.end_time ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : ""
                }`}
            />
            {errors.end_time && (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.end_time}</p>
            )}
          </div>
        </div>
      </div>

      <div className={`${surfaceClass} p-4 sm:p-5`}>
        <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>สรุปการแก้ไข</label>
        <textarea
          rows="3"
          value={form.resolution_note}
          onChange={(event) => setField("resolution_note", event.target.value)}
          className={inputClass}
          placeholder="สรุปสิ่งที่ทีม IT ดำเนินการ หรือผลลัพธ์ที่ได้"
        />
      </div>
    </div>
  );

  const rightPanel = (
    <div className="space-y-4">
      <div className={`${surfaceClass} p-4 sm:p-5`}>
        <div className="mb-4 flex flex-col gap-3">
          <div>
            <p className={`text-sm font-semibold ${labelClass}`}>แนบหลักฐาน</p>
            <p className={`mt-1 text-xs ${mutedClass}`}>
              รองรับรูปจากไฟล์ กล้อง และ Win + Shift + S แล้ว Ctrl + V สูงสุด {MAX_ATTACHMENTS} รูป
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className={metaTileClass}>
              <p className={metaLabelClass}>Before</p>
              <p className={metaValueClass}>{beforeAttachments.length}</p>
            </div>
            <div className={metaTileClass}>
              <p className={metaLabelClass}>After</p>
              <p className={metaValueClass}>{afterAttachments.length}</p>
            </div>
            <div className={metaTileClass}>
              <p className={metaLabelClass}>Remaining</p>
              <p className={metaValueClass}>{remainingAttachmentSlots}</p>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveAttachmentKind("before")}
            className={
              activeAttachmentKind === "before"
                ? "rounded-xl border border-[#2b59b0] bg-[#2b59b0] px-4 py-3 text-sm font-semibold text-white"
                : isDark
                  ? "rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200"
                  : "rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            }
          >
            Before
          </button>
          <button
            type="button"
            onClick={() => setActiveAttachmentKind("after")}
            className={
              activeAttachmentKind === "after"
                ? "rounded-xl border border-[#2b59b0] bg-[#2b59b0] px-4 py-3 text-sm font-semibold text-white"
                : isDark
                  ? "rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200"
                  : "rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            }
          >
            After
          </button>
        </div>

        <div className="hidden">
          <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
            โหมดที่กำลังเพิ่มรูป: {activeAttachmentKind === "after" ? "After" : "Before"}
          </p>
          <p className={`mt-1 text-xs ${mutedClass}`}>
            รูปที่เลือกหรือวางตอนนี้จะถูกจัดเข้ากลุ่ม {activeAttachmentKind === "after" ? "After" : "Before"}
          </p>
          <p className={`mt-2 text-[11px] ${mutedClass}`}>
            Clipboard paste with <span className="font-semibold">Ctrl + V</span> adds the image to{" "}
            <span className="font-semibold">{activeAttachmentKind === "after" ? "After" : "Before"}</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={remainingAttachmentSlots === 0}
            className={attachmentActionClass}
          >
            <ImagePlus size={16} />
            เลือกรูป
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCameraOpen((prev) => !prev);
              setIsReviewing(false);
              setTempImage(null);
            }}
            disabled={remainingAttachmentSlots === 0}
            className={attachmentActionClass}
          >
            <Camera size={16} />
            {isCameraOpen ? "ปิดกล้อง" : "เปิดกล้อง"}
          </button>
        </div>

        <div
          tabIndex={-1}
          className="hidden"
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isDark ? "bg-[#2b59b0]/15 text-[#c8d9ff]" : "bg-[#2b59b0]/10 text-[#2b59b0]"
                }`}
            >
              <FileImage size={18} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                วางภาพจาก Clipboard ได้ทันที
              </p>
              <p className={`mt-1 text-xs leading-5 ${mutedClass}`}>
                ขณะเปิดฟอร์มนี้ กด Win + Shift + S แล้ว Ctrl + V ระบบจะนำภาพมาแนบในกลุ่ม{" "}
                {activeAttachmentKind === "after" ? "After" : "Before"}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`mt-4 overflow-hidden rounded-2xl border ${isDark ? "border-slate-700 bg-slate-950/80" : "border-slate-200 bg-white"
            }`}
        >
          {isCameraOpen ? (
            <div className="relative p-3">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.92}
                mirrored={facingMode === "user"}
                videoConstraints={{ facingMode }}
                className={`aspect-video w-full rounded-2xl object-cover transition duration-200 ${isReviewing ? "opacity-25" : "opacity-100"
                  }`}
              />
              {isReviewing && tempImage && (
                <img
                  src={tempImage}
                  alt="camera preview"
                  className="absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] rounded-2xl object-cover"
                />
              )}
              <div className="absolute inset-x-3 top-3 rounded-2xl bg-gradient-to-b from-slate-950/80 to-transparent px-4 py-3 text-white">
                <p className="text-sm font-bold">กล้องสำหรับ {activeAttachmentKind === "after" ? "After" : "Before"}</p>
                <p className="text-[11px] text-white/75">
                  {isReviewing ? "ตรวจภาพก่อนยืนยันบันทึก" : "ถ่ายภาพหน้างานแล้วบันทึกเข้ากลุ่มนี้ได้ทันที"}
                </p>
              </div>
              <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 rounded-2xl bg-gradient-to-t from-slate-950/90 via-slate-950/70 to-transparent px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-white/75">
                  {isReviewing ? "ยืนยันรูปนี้ หรือถ่ายใหม่ได้" : "สลับกล้องหน้า/หลัง หรือถ่ายภาพเพื่อแนบได้เลย"}
                </p>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  {!isReviewing && (
                    <button
                      type="button"
                      onClick={() => setFacingMode((mode) => (mode === "user" ? "environment" : "user"))}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 sm:flex-none"
                    >
                      <FlipHorizontal size={16} />
                      <span className="hidden sm:inline">สลับกล้อง</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={isReviewing ? () => { setIsReviewing(false); setTempImage(null); } : capture}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#244a95] transition hover:bg-slate-100 sm:flex-none"
                  >
                    <Camera size={16} />
                    {isReviewing ? "ถ่ายใหม่" : "ถ่ายภาพ"}
                  </button>
                  {isReviewing && (
                    <button
                      type="button"
                      onClick={confirmCapture}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:flex-none"
                    >
                      <Send size={16} />
                      ยืนยันภาพ
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col justify-between p-4">
              <div>
                <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                  พรีวิวล่าสุดของ {activeAttachmentKind === "after" ? "After" : "Before"}
                </p>
                <p className={`mt-1 text-xs ${mutedClass}`}>
                  ฟอร์มจะไม่เด้งหรือเลื่อนเองจากการเปิดดูรูป พื้นที่พรีวิวนี้คงที่ตลอด
                </p>
              </div>

              {activePreviewAttachment ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <img src={activePreviewAttachment.previewUrl} alt="attachment preview" className="h-52 w-full object-cover" />
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{activePreviewAttachment.file.name}</p>
                      <p className="text-xs text-slate-500">
                        {activePreviewAttachment.kind === "after" ? "After" : "Before"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(activePreviewAttachment.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="ลบรูป"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`mt-4 flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed px-4 text-center ${isDark ? "border-slate-700 bg-slate-900/60 text-slate-400" : "border-slate-300 bg-slate-50 text-slate-500"
                    }`}
                >
                  <div>
                    <FileImage size={24} className="mx-auto mb-2" />
                    <p className="text-sm font-semibold">ยังไม่มีรูปในกลุ่มนี้</p>
                    <p className="mt-1 text-xs">เลือกรูป เปิดกล้อง หรือวางรูปจาก Clipboard ได้ทันที</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {renderAttachmentGallery("Before", "before", beforeAttachments)}
      {renderAttachmentGallery("After", "after", afterAttachments)}

      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${isDark
          ? "border-slate-700 bg-slate-800/60 text-slate-300"
          : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
      >
        บันทึกโดย: <span className="font-semibold">{currentUser?.name || "IT Support"}</span>
        {currentUser?.employeeId ? ` • ${currentUser.employeeId}` : ""}
      </div>
    </div>
  );

  return (
    <motion.div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 ${overlayClass}`}
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="walk-in-ticket-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <motion.div
        className={`relative flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border ${shellClass}`}
        style={{
          maxHeight: "calc(100dvh - 1rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
        }}
        onClick={(event) => event.stopPropagation()}
        initial={{ y: 20, opacity: 0.98, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
      >
        <div
          className={`border-b border-inherit px-4 py-4 backdrop-blur sm:px-6 ${isDark ? "bg-[#0f172a]/95" : "bg-white/95"
            }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className={chipClass}>บันทึกงาน Walk-in</span>
                <span className={chipClass}>save to history</span>
                <span className={chipClass}>popup mode</span>
              </div>
              <h2 id="walk-in-ticket-title" className="text-lg font-bold sm:text-2xl">
                บันทึกงานแจ้งซ่อมแบบปากเปล่า
              </h2>
              <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>
                ฟอร์มนี้จะบันทึกงานเข้าประวัติทันที พร้อมช่วงเวลาปฏิบัติงานของ IT และหลักฐาน Before / After
              </p>
            </div>

            <button
              type="button"
              onClick={requestClose}
              className={`rounded-xl p-2 transition-colors ${isDark
                ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              aria-label="ปิดหน้าต่าง"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {errors.form && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {errors.form}
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.92fr)]">
              {leftPanel}
              {rightPanel}
            </div>
          </div>

          <div
            className={`border-t px-4 py-3 backdrop-blur sm:px-6 ${isDark ? "border-slate-700 bg-[#0f172a]/95" : "border-slate-200 bg-white/95"
              }`}
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button type="button" onClick={requestClose} className={secondaryButtonClass}>
                ยกเลิก
              </button>
              <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {isSubmitting ? "กำลังบันทึก..." : "บันทึกเข้าประวัติ"}
              </button>
            </div>
          </div>
        </form>

        {isCloseConfirmOpen && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onClick={() => setIsCloseConfirmOpen(false)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              className={`w-full max-w-md rounded-[26px] border p-5 shadow-2xl ${isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isDark ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-600"
                    }`}
                >
                  <AlertTriangle size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold">ออกจากฟอร์มนี้หรือไม่?</p>
                  <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>
                    ข้อมูลที่กรอกและรูปที่แนบไว้ยังไม่ได้บันทึก หากออกตอนนี้ข้อมูลจะหาย
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => setIsCloseConfirmOpen(false)} className={confirmSecondaryButtonClass}>
                  กลับไปแก้ต่อ
                </button>
                <button type="button" onClick={closeModal} className={dangerButtonClass}>
                  ออกจากฟอร์ม
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default WalkInTicketModal;
