import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Webcam from "react-webcam";
import {
  Camera,
  FileImage,
  FlipHorizontal,
  ImagePlus,
  Loader2,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getTicketAttachmentEntries } from "../../../lib/ticketAttachmentMetadata";

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 8;

function buildAttachmentId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeAttachmentFile(file) {
  if (!file) return null;
  if (file instanceof File && file.name) return file;

  const extension = String(file?.type || "").split("/")[1] || "png";
  return new File([file], `close_job_${Date.now()}.${extension}`, {
    type: file?.type || "image/png",
  });
}

function revokeAttachmentPreview(item) {
  if (item?.previewUrl && String(item.previewUrl).startsWith("blob:")) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

function buildInitialForm() {
  return {
    problem: "",
    rootCause: "",
    solution: "",
    partsUsed: "",
    result: "",
  };
}

const CloseJobModal = ({
  isOpen,
  onClose,
  onSubmit,
  ticket,
  currentUser,
  theme = "light",
  isSubmitting = false,
}) => {
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachmentsRef = useRef([]);

  const [form, setForm] = useState(buildInitialForm);
  const [errors, setErrors] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [activeAttachmentKind, setActiveAttachmentKind] = useState("before");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [tempImage, setTempImage] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const existingAttachments = getTicketAttachmentEntries(ticket);
  const existingBeforeCount = existingAttachments.filter((item) => item.type === "before").length;
  const existingAfterCount = existingAttachments.filter((item) => item.type === "after").length;
  const beforeAttachments = attachments.filter((item) => item.kind === "before");
  const afterAttachments = attachments.filter((item) => item.kind === "after");
  const activeKindAttachments = activeAttachmentKind === "after" ? afterAttachments : beforeAttachments;
  const activePreviewAttachment = activeKindAttachments[activeKindAttachments.length - 1] || null;
  const remainingAttachmentSlots = Math.max(0, MAX_ATTACHMENTS - attachments.length);

  const resetAttachmentState = () => {
    attachmentsRef.current.forEach(revokeAttachmentPreview);
    attachmentsRef.current = [];
    setAttachments([]);
    setActiveAttachmentKind("before");
    setIsCameraOpen(false);
    setFacingMode("environment");
    setTempImage(null);
    setIsReviewing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(revokeAttachmentPreview);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setForm(buildInitialForm());
      setErrors({});
      resetAttachmentState();
      return;
    }

    setForm(buildInitialForm());
    setErrors({});
    resetAttachmentState();
  }, [isOpen, ticket?.id]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

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
      appendAttachments(clipboardImage, {
        kind: activeAttachmentKind,
        successMessage: `แนบภาพ ${activeAttachmentKind === "after" ? "After" : "Before"} แล้ว`,
      });
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, activeAttachmentKind]);

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
    ? "w-full rounded-xl border border-slate-600 bg-[#162136] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/30"
    : "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/20";
  const chipClass = isDark
    ? "inline-flex items-center rounded-full border border-[#2b59b0]/35 bg-[#2b59b0]/15 px-3 py-1 text-[11px] font-semibold text-[#c8d9ff]"
    : "inline-flex items-center rounded-full border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-3 py-1 text-[11px] font-semibold text-[#2b59b0]";
  const secondaryButtonClass = isDark
    ? "inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
  const attachmentActionClass = isDark
    ? "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key] || errors.form) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        delete next.form;
        return next;
      });
    }
  };

  const appendAttachments = (rawFiles, options = {}) => {
    const { kind = activeAttachmentKind, successMessage = "" } = options;
    const files = (Array.isArray(rawFiles) ? rawFiles : [rawFiles])
      .map((file) => normalizeAttachmentFile(file))
      .filter(Boolean);

    if (files.length === 0) return false;

    const availableSlots = Math.max(0, MAX_ATTACHMENTS - attachmentsRef.current.length);
    if (availableSlots <= 0) {
      toast.error(`แนบรูปได้สูงสุด ${MAX_ATTACHMENTS} รูป`);
      return false;
    }

    const validFiles = files.filter((file) => {
      if (!String(file?.type || "").startsWith("image/")) {
        return false;
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error("ไฟล์แนบต้องมีขนาดไม่เกิน 5MB");
        return false;
      }
      return true;
    });

    const nextFiles = validFiles.slice(0, availableSlots);
    if (nextFiles.length === 0) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ");
      return false;
    }

    const nextItems = nextFiles.map((file) => ({
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

    toast.success(successMessage || `แนบรูป ${kind === "after" ? "After" : "Before"} แล้ว`);
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
      toast.error("ไม่สามารถถ่ายรูปได้");
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
      const file = new File([blob], `close_job_${Date.now()}.jpg`, { type: "image/jpeg" });
      appendAttachments(file, {
        kind: activeAttachmentKind,
        successMessage: `บันทึกรูป ${activeAttachmentKind === "after" ? "After" : "Before"} แล้ว`,
      });
    } catch {
      toast.error("ไม่สามารถบันทึกรูปจากกล้องได้");
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!String(form.problem || "").trim()) {
      nextErrors.problem = "กรุณาระบุปัญหาที่พบ";
    }
    if (!String(form.rootCause || "").trim()) {
      nextErrors.rootCause = "กรุณาระบุสาเหตุของปัญหา";
    }
    if (!String(form.solution || "").trim()) {
      nextErrors.solution = "กรุณาระบุวิธีการแก้ไข";
    }
    if (!String(form.result || "").trim()) {
      nextErrors.result = "กรุณาระบุผลการทดสอบหลังแก้ไข";
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      await onSubmit?.({
        ticket,
        problem: String(form.problem || "").trim(),
        rootCause: String(form.rootCause || "").trim(),
        solution: String(form.solution || "").trim(),
        partsUsed: String(form.partsUsed || "").trim(),
        result: String(form.result || "").trim(),
        before_attachments: beforeAttachments.map((item) => item.file),
        after_attachments: afterAttachments.map((item) => item.file),
      });
      onClose?.();
    } catch (error) {
      setErrors({
        form: error?.message || "ไม่สามารถปิดงานได้ กรุณาลองใหม่อีกครั้ง",
      });
    }
  };

  const renderFieldError = (key) =>
    errors[key] ? <p className="mt-1 text-xs font-medium text-rose-600">{errors[key]}</p> : null;

  const renderAttachmentGallery = (title, kind, items, existingCount) => (
    <div className={`${surfaceClass} p-4 sm:p-5`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${labelClass}`}>{title}</p>
          <p className={`mt-1 text-xs ${mutedClass}`}>
            ใหม่ {items.length} รูป{existingCount > 0 ? ` • เดิม ${existingCount} รูป` : ""}
          </p>
        </div>
        <span className={chipClass}>{kind === "after" ? "After" : "Before"}</span>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`overflow-hidden rounded-2xl border ${
                isDark ? "border-slate-700 bg-slate-950/70" : "border-slate-200 bg-white"
              }`}
            >
              <img src={item.previewUrl} alt={item.file.name} className="h-28 w-full object-cover" />
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <p className={`min-w-0 truncate text-xs font-medium ${labelClass}`}>{item.file.name}</p>
                <button
                  type="button"
                  onClick={() => removeAttachment(item.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="ลบรูป"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed px-4 text-center ${
            isDark ? "border-slate-700 bg-slate-900/60 text-slate-400" : "border-slate-300 bg-white text-slate-500"
          }`}
        >
          <div>
            <FileImage size={22} className="mx-auto mb-2" />
            <p className="text-sm font-semibold">ยังไม่มีรูปใหม่ในกลุ่มนี้</p>
            <p className="mt-1 text-xs">เลือกรูปหรือใช้กล้องเพื่อเพิ่มหลักฐาน {title}</p>
          </div>
        </div>
      )}
    </div>
  );

  const leftPanel = (
    <div className="space-y-4">
      <div className={`${surfaceClass} p-4 sm:p-5`}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>ปัญหาที่พบ</label>
            <textarea
              rows="3"
              value={form.problem}
              onChange={(event) => setField("problem", event.target.value)}
              className={inputClass}
              placeholder="เช่น เครื่องเปิดไม่ติด ระบบค้าง หรือมีเสียงผิดปกติ"
            />
            {renderFieldError("problem")}
          </div>

          <div>
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>สาเหตุของปัญหา</label>
            <textarea
              rows="3"
              value={form.rootCause}
              onChange={(event) => setField("rootCause", event.target.value)}
              className={inputClass}
              placeholder="เช่น สายไฟหลวม อุปกรณ์เสื่อม หรือค่าระบบผิด"
            />
            {renderFieldError("rootCause")}
          </div>

          <div>
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>ผลการทดสอบหลังแก้ไข</label>
            <textarea
              rows="3"
              value={form.result}
              onChange={(event) => setField("result", event.target.value)}
              className={inputClass}
              placeholder="เช่น ทดลองใช้งาน 15 นาทีแล้วกลับมาปกติ"
            />
            {renderFieldError("result")}
          </div>

          <div className="md:col-span-2">
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>วิธีการแก้ไข</label>
            <textarea
              rows="4"
              value={form.solution}
              onChange={(event) => setField("solution", event.target.value)}
              className={inputClass}
              placeholder="เช่น ตรวจสอบอุปกรณ์ ปรับการเชื่อมต่อ อัปเดตไดรเวอร์ และทดสอบซ้ำ"
            />
            {renderFieldError("solution")}
          </div>

          <div className="md:col-span-2">
            <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>อะไหล่ที่ใช้</label>
            <input
              value={form.partsUsed}
              onChange={(event) => setField("partsUsed", event.target.value)}
              className={inputClass}
              placeholder="เช่น ไม่มีการเปลี่ยนอะไหล่ / RAM 1 แผง / SSD 1 ลูก"
            />
          </div>
        </div>
      </div>

      {renderAttachmentGallery("Before", "before", beforeAttachments, existingBeforeCount)}
      {renderAttachmentGallery("After", "after", afterAttachments, existingAfterCount)}
    </div>
  );

  const rightPanel = (
    <div className="space-y-4">
      <div className={`${surfaceClass} p-4 sm:p-5`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className={`text-sm font-semibold ${labelClass}`}>แนบหลักฐานหน้างาน</p>
            <p className={`mt-1 text-xs leading-5 ${mutedClass}`}>
              รองรับรูปจากเครื่อง กล้อง และภาพที่วางจาก Clipboard ได้ทันที
            </p>
          </div>
          <span className={chipClass}>สูงสุด {MAX_ATTACHMENTS} รูป</span>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className={`rounded-2xl border px-3 py-3 ${isDark ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-white"}`}>
            <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${mutedClass}`}>Before</p>
            <p className={`mt-1 text-sm font-semibold ${labelClass}`}>{existingBeforeCount + beforeAttachments.length}</p>
          </div>
          <div className={`rounded-2xl border px-3 py-3 ${isDark ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-white"}`}>
            <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${mutedClass}`}>After</p>
            <p className={`mt-1 text-sm font-semibold ${labelClass}`}>{existingAfterCount + afterAttachments.length}</p>
          </div>
          <div className={`rounded-2xl border px-3 py-3 ${isDark ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-white"}`}>
            <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${mutedClass}`}>Remaining</p>
            <p className={`mt-1 text-sm font-semibold ${labelClass}`}>{remainingAttachmentSlots}</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveAttachmentKind("before")}
            className={
              activeAttachmentKind === "before"
                ? "rounded-xl border border-[#2b59b0] bg-[#2b59b0] px-4 py-3 text-sm font-semibold text-white"
                : secondaryButtonClass
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
                : secondaryButtonClass
            }
          >
            After
          </button>
        </div>

        <div className={`mb-4 rounded-2xl border px-4 py-3 ${isDark ? "border-slate-700 bg-slate-950/60" : "border-slate-200 bg-white"}`}>
          <p className={`text-sm font-semibold ${labelClass}`}>
            กำลังเพิ่มรูปในกลุ่ม {activeAttachmentKind === "after" ? "After" : "Before"}
          </p>
          <p className={`mt-1 text-xs ${mutedClass}`}>
            รูปที่เลือกหรือถ่ายตอนนี้จะถูกจัดเข้ากลุ่มนี้อัตโนมัติ
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
            disabled={remainingAttachmentSlots === 0 || isSubmitting}
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
            disabled={remainingAttachmentSlots === 0 || isSubmitting}
            className={attachmentActionClass}
          >
            <Camera size={16} />
            {isCameraOpen ? "ปิดกล้อง" : "เปิดกล้อง"}
          </button>
        </div>

        <div className={`mt-4 rounded-2xl border-2 border-dashed px-4 py-3 ${isDark ? "border-slate-600 bg-slate-950/50" : "border-slate-300 bg-white"}`}>
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isDark ? "bg-[#2b59b0]/15 text-[#c8d9ff]" : "bg-[#2b59b0]/10 text-[#2b59b0]"}`}>
              <FileImage size={18} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${labelClass}`}>วางภาพจาก Clipboard ได้ทันที</p>
              <p className={`mt-1 text-xs leading-5 ${mutedClass}`}>
                กด Win + Shift + S แล้ว Ctrl + V เพื่อแนบภาพเข้ากลุ่ม {activeAttachmentKind === "after" ? "After" : "Before"}
              </p>
            </div>
          </div>
        </div>

        <div className={`mt-4 overflow-hidden rounded-2xl border ${isDark ? "border-slate-700 bg-slate-950/80" : "border-slate-200 bg-white"}`}>
          {isCameraOpen ? (
            <div className="relative p-3">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.92}
                mirrored={facingMode === "user"}
                videoConstraints={{ facingMode }}
                className={`aspect-video w-full rounded-2xl object-cover transition duration-200 ${isReviewing ? "opacity-25" : "opacity-100"}`}
              />
              {isReviewing && tempImage && (
                <img src={tempImage} alt="camera preview" className="absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] rounded-2xl object-cover" />
              )}
              <div className="absolute inset-x-3 top-3 rounded-2xl bg-gradient-to-b from-slate-950/80 to-transparent px-4 py-3 text-white">
                <p className="text-sm font-bold">กล้องสำหรับ {activeAttachmentKind === "after" ? "After" : "Before"}</p>
                <p className="text-[11px] text-white/75">
                  {isReviewing ? "ตรวจภาพก่อนยืนยันบันทึก" : "ถ่ายภาพหน้างานแล้วแนบหลักฐานได้ทันที"}
                </p>
              </div>
              <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 rounded-2xl bg-gradient-to-t from-slate-950/90 via-slate-950/70 to-transparent px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-white/75">
                  {isReviewing ? "ยืนยันรูปนี้หรือถ่ายใหม่ได้" : "สลับกล้องหน้า/หลังหรือถ่ายรูปเพื่อแนบเคสนี้"}
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
                <p className={`text-sm font-semibold ${labelClass}`}>พรีวิวล่าสุดของ {activeAttachmentKind === "after" ? "After" : "Before"}</p>
                <p className={`mt-1 text-xs ${mutedClass}`}>
                  ใช้พื้นที่นี้ตรวจรูปก่อนบันทึก โดยไม่ดันฟอร์มให้ยาวเกินไปบนหน้าจอเล็ก
                </p>
              </div>

              {activePreviewAttachment ? (
                <div className={`mt-4 overflow-hidden rounded-2xl border ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
                  <img src={activePreviewAttachment.previewUrl} alt="attachment preview" className="h-52 w-full object-cover" />
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${labelClass}`}>{activePreviewAttachment.file.name}</p>
                      <p className={`text-xs ${mutedClass}`}>{activePreviewAttachment.kind === "after" ? "After" : "Before"}</p>
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
                <div className={`mt-4 flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed px-4 text-center ${isDark ? "border-slate-700 bg-slate-900/60 text-slate-400" : "border-slate-300 bg-slate-50 text-slate-500"}`}>
                  <div>
                    <FileImage size={24} className="mx-auto mb-2" />
                    <p className="text-sm font-semibold">ยังไม่มีรูปในกลุ่มนี้</p>
                    <p className="mt-1 text-xs">เลือกรูป เปิดกล้อง หรือวางภาพจาก Clipboard ได้ทันที</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`${surfaceClass} px-4 py-3 text-sm`}>
        ปิดงานโดย <span className="font-semibold">{currentUser?.name || "IT Support"}</span>
        {currentUser?.employeeId ? ` • ${currentUser.employeeId}` : ""}
      </div>
    </div>
  );

  if (!isOpen || !ticket) return null;

  return (
    <motion.div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 ${overlayClass}`}
      onClick={() => !isSubmitting && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-job-modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <motion.div
        className={`flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border ${shellClass}`}
        style={{
          maxHeight: "calc(100dvh - 1rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
        }}
        onClick={(event) => event.stopPropagation()}
        initial={{ y: 20, opacity: 0.98, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
      >
        <div className={`border-b border-inherit px-4 py-4 sm:px-6 ${isDark ? "bg-[#0f172a]/95" : "bg-white/95"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className={chipClass}>ปิดงานซ่อม</span>
                <span className={chipClass}>
                  Ticket {ticket.ticket_no || `IT-${String(ticket.id).padStart(5, "0")}`}
                </span>
              </div>
              <h2 id="close-job-modal-title" className="text-lg font-bold sm:text-2xl">
                บันทึกรายงานและหลักฐาน Before / After
              </h2>
              <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>
                สรุปปัญหา สาเหตุ วิธีแก้ และแนบรูปหน้างานก่อนปิดเคส
              </p>
            </div>

            <button
              type="button"
              onClick={() => !isSubmitting && onClose?.()}
              className={`rounded-xl p-2 transition-colors ${
                isDark ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
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

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
              {leftPanel}
              {rightPanel}
            </div>
          </div>

          <div className={`border-t px-4 py-3 sm:px-6 ${isDark ? "border-slate-700 bg-[#0f172a]/95" : "border-slate-200 bg-white/95"}`}>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => !isSubmitting && onClose?.()}
                disabled={isSubmitting}
                className={secondaryButtonClass}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {isSubmitting ? "กำลังบันทึก..." : "บันทึกและปิดงาน"}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CloseJobModal;
