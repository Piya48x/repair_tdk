import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import {
  Building2,
  Camera,
  Clock3,
  FileImage,
  ImagePlus,
  Loader2,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

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

function buildInitialForm() {
  return {
    requester_name: "",
    requester_emp_id: "",
    department: "",
    issue_title: "",
    issue_description: "",
    priority: "medium",
    status: "open",
    channel: "walk-in",
    start_time: toLocalDatetimeValue(new Date()),
    end_time: "",
    resolution_note: "",
    attachment: null,
  };
}

const FIELD_CLASS_BASE =
  "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2";

const WalkInTicketModal = ({ isOpen, onClose, onSubmit, currentUser, theme = "light" }) => {
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(buildInitialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(buildInitialForm());
    setErrors({});
    setIsSubmitting(false);
    setPreview(null);
    setTempImage(null);
    setIsCameraOpen(false);
    setIsReviewing(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  if (!isOpen) return null;

  const isDark = theme === "dark";
  const overlayClass = isDark ? "bg-slate-950/75" : "bg-slate-950/60";
  const shellClass = isDark
    ? "border-slate-700 bg-[#0f172a] text-slate-100 shadow-2xl"
    : "border-slate-200 bg-white text-slate-900 shadow-2xl";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const labelClass = isDark ? "text-slate-300" : "text-slate-700";
  const inputClass = isDark
    ? `${FIELD_CLASS_BASE} border-slate-600 bg-[#162136] text-slate-100 placeholder-slate-400 focus:border-[#2b59b0] focus:ring-[#2b59b0]/30`
    : `${FIELD_CLASS_BASE} border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-[#2b59b0] focus:ring-[#2b59b0]/20`;
  const readonlyClass = isDark
    ? `${FIELD_CLASS_BASE} cursor-not-allowed border-slate-600 bg-slate-800 text-slate-200`
    : `${FIELD_CLASS_BASE} cursor-not-allowed border-slate-300 bg-slate-50 text-slate-700`;
  const chipClass = isDark
    ? "inline-flex items-center rounded-full border border-[#2b59b0]/35 bg-[#2b59b0]/15 px-3 py-1 text-xs font-semibold text-[#c8d9ff]"
    : "inline-flex items-center rounded-full border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-3 py-1 text-xs font-semibold text-[#2b59b0]";
  const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#2b59b0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryButtonClass = isDark
    ? "inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
    : "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const clearAttachment = () => {
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setTempImage(null);
    setIsReviewing(false);
    setIsCameraOpen(false);
    setField("attachment", null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์แนบต้องมีขนาดไม่เกิน 5MB");
      event.target.value = "";
      return;
    }

    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    const nextPreview = URL.createObjectURL(file);
    setField("attachment", file);
    setPreview(nextPreview);
    setIsCameraOpen(false);
    setIsReviewing(false);
    setTempImage(null);
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

      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }

      setField("attachment", file);
      setPreview(tempImage);
      setIsCameraOpen(false);
      setIsReviewing(false);
      setTempImage(null);
      toast.success("บันทึกรูปจากกล้องเรียบร้อย");
    } catch (error) {
      toast.error("ไม่สามารถบันทึกรูปจากกล้องได้");
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!String(form.requester_name || "").trim()) nextErrors.requester_name = "กรุณาระบุชื่อผู้แจ้ง";
    if (!String(form.issue_title || "").trim()) nextErrors.issue_title = "กรุณาระบุหัวข้อปัญหา";

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
      await onSubmit?.({
        ...form,
        requester_name: String(form.requester_name || "").trim(),
        requester_emp_id: String(form.requester_emp_id || "").trim(),
        department: String(form.department || "").trim(),
        issue_title: String(form.issue_title || "").trim(),
        issue_description: String(form.issue_description || "").trim(),
        resolution_note: String(form.resolution_note || "").trim(),
        created_by: currentUser?.id || null,
        attachment: form.attachment,
      });
      onClose?.();
    } catch (error) {
      setErrors({
        form: error?.message || "ไม่สามารถบันทึกงานได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAttachmentName = form.attachment?.name || "";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${overlayClass} animate-fade-in`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="walk-in-ticket-title"
    >
      <div
        className={`w-full max-w-4xl overflow-hidden rounded-3xl border ${shellClass} animate-scale-in`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-inherit px-5 py-4 sm:px-6">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <span className={chipClass}>➕ บันทึกงาน (Walk-in)</span>
              <span className={chipClass}>status: open</span>
              <span className={chipClass}>channel: walk-in</span>
            </div>
            <h2 id="walk-in-ticket-title" className="text-xl font-bold sm:text-2xl">
              บันทึกงานแจ้งซ่อมแบบปากเปล่า
            </h2>
            <p className={`mt-1 text-sm ${mutedClass}`}>
              กรอกข้อมูลให้ครบเพื่อบันทึก Ticket ลง Supabase พร้อมเก็บรหัสพนักงานและรูปประกอบ
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl p-2 transition-colors ${isDark ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[85vh] overflow-y-auto px-5 py-5 sm:px-6">
          {errors.form && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errors.form}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
                requester_name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.requester_name}
                  onChange={(event) => setField("requester_name", event.target.value)}
                  className={`${inputClass} pl-10 ${errors.requester_name ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : ""}`}
                  placeholder="ชื่อผู้แจ้ง"
                  autoComplete="off"
                />
              </div>
              {errors.requester_name && <p className="mt-1 text-xs font-medium text-rose-600">{errors.requester_name}</p>}
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
                requester_emp_id
              </label>
              <div className="relative">
                <FileImage size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.requester_emp_id}
                  onChange={(event) => setField("requester_emp_id", event.target.value)}
                  className={`${inputClass} pl-10`}
                  placeholder="รหัสพนักงาน"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
                department
              </label>
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

            <div className="md:col-span-2">
              <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
                issue_title <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FileImage size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.issue_title}
                  onChange={(event) => setField("issue_title", event.target.value)}
                  className={`${inputClass} pl-10 ${errors.issue_title ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : ""}`}
                  placeholder="หัวข้อปัญหา"
                  autoComplete="off"
                />
              </div>
              {errors.issue_title && <p className="mt-1 text-xs font-medium text-rose-600">{errors.issue_title}</p>}
            </div>

            <div className="md:col-span-2">
              <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
                issue_description
              </label>
              <textarea
                rows="4"
                value={form.issue_description}
                onChange={(event) => setField("issue_description", event.target.value)}
                className={inputClass}
                placeholder="รายละเอียดปัญหา"
              />
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>priority</label>
              <select
                value={form.priority}
                onChange={(event) => setField("priority", event.target.value)}
                className={inputClass}
              >
                <option value="low">low - ต่ำ</option>
                <option value="medium">medium - ปานกลาง</option>
                <option value="high">high - สูง</option>
              </select>
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>status</label>
              <input value={form.status} readOnly className={readonlyClass} />
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>channel</label>
              <input value={form.channel} readOnly className={readonlyClass} />
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
                start_time
              </label>
              <div className="relative">
                <Clock3 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="datetime-local"
                  value={form.start_time}
                  readOnly
                  className={`${readonlyClass} pl-10`}
                />
              </div>
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>end_time</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(event) => setField("end_time", event.target.value)}
                className={`${inputClass} ${errors.end_time ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : ""}`}
              />
              {errors.end_time && <p className="mt-1 text-xs font-medium text-rose-600">{errors.end_time}</p>}
            </div>

            <div className="md:col-span-2">
              <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>
                resolution_note
              </label>
              <textarea
                rows="3"
                value={form.resolution_note}
                onChange={(event) => setField("resolution_note", event.target.value)}
                className={inputClass}
                placeholder="สรุปการแก้ไข"
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">แนบรูปประกอบ</p>
                <p className="text-xs text-slate-500">รองรับแนบไฟล์รูปจากเครื่อง หรือถ่ายจากกล้อง</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ImagePlus size={16} />
                  แนบไฟล์รูป
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCameraOpen((prev) => !prev);
                    setIsReviewing(false);
                    setTempImage(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-4 py-2.5 text-sm font-semibold text-[#2b59b0] transition hover:bg-[#2b59b0]/15"
                >
                  <Camera size={16} />
                  {isCameraOpen ? "ปิดกล้อง" : "เปิดกล้อง"}
                </button>
              </div>
            </div>

            {selectedAttachmentName && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{selectedAttachmentName}</p>
                  <p className="text-xs text-slate-500">ไฟล์ที่เลือกจะถูกอัปโหลดและผูกกับ Ticket นี้</p>
                </div>
                <button
                  type="button"
                  onClick={clearAttachment}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-rose-600"
                  aria-label="ลบไฟล์แนบ"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {preview && !isCameraOpen && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <img src={preview} alt="attachment preview" className="max-h-72 w-full object-cover" />
              </div>
            )}

            {isCameraOpen && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                {isReviewing && tempImage ? (
                  <div className="p-3">
                    <img src={tempImage} alt="camera preview" className="max-h-80 w-full rounded-xl object-cover" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={confirmCapture}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2b59b0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244a95]"
                      >
                        ยืนยันรูปนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsReviewing(false);
                          setTempImage(null);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                      >
                        ถ่ายใหม่
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.92}
                      videoConstraints={{ facingMode: "environment" }}
                      className="aspect-video w-full rounded-xl object-cover"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={capture}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2b59b0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244a95]"
                      >
                        <Camera size={16} />
                        ถ่ายรูป
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(false)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                      >
                        ปิดกล้อง
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
              isDark
                ? "border-slate-700 bg-slate-800/60 text-slate-300"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            บันทึกโดย: <span className="font-semibold">{currentUser?.name || "IT Support"}</span>
            {currentUser?.employeeId ? ` • ${currentUser.employeeId}` : ""}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              ยกเลิก
            </button>
            <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isSubmitting ? "กำลังบันทึก..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WalkInTicketModal;
