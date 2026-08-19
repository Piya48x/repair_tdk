import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  ArrowUp,
  CheckCircle2,
  Clock3,
  Cctv,
  LayoutDashboard,
  ListChecks,
  Plus,
  X,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { fetchProfilesWithCompatibility } from "../../../lib/profileSchemaCompat";
import {
  createITWorkRecord,
  deleteITWorkRecord,
  isITWorkRecordSchemaError,
  loadITWorkRecords,
  normalizeEvidenceImages,
  normalizeText,
  removeITWorkEvidenceFiles,
  updateITWorkRecord,
  uploadITWorkEvidenceFiles,
} from "../../../services/itWorkRecordService";
import { DASHBOARD_PAGE_IDS } from "../constants/dashboardPages";
import EvidenceFormSection from "./it-work-evidence/EvidenceFormSection";
import EvidenceRecordsSection from "./it-work-evidence/EvidenceRecordsSection";
import {
  CAMERA_APPROVAL_OPTIONS,
  CAMERA_VIEW_JOB_TYPE,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  buildCameraViewForm,
  buildReferenceCode,
  buildEndTimeFromDuration,
  buildForm,
  buildFormFromRecord,
  calculateDurationMinutes,
  formatDateTime,
  formatDurationLabel,
  getDurationParts,
  getStatusMeta,
  getTypeMeta,
  toDateTimeLocalValue,
} from "./it-work-evidence/shared";

function getStatusTone(theme, status) {
  if (status === "completed") {
    return theme === "dark"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "in_progress") {
    return theme === "dark"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
      : "border-amber-200 bg-amber-50 text-amber-700";
  }
  return theme === "dark"
    ? "border-slate-600 bg-slate-700/30 text-slate-200"
    : "border-slate-200 bg-slate-100 text-slate-700";
}

function revokePreviewEntries(entries) {
  if (!Array.isArray(entries)) return;
  entries.forEach((entry) => {
    if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
  });
}

function sortRecordsByLatest(records) {
  return [...records].sort((left, right) => {
    const leftTime = new Date(left?.start_time || left?.performed_at || left?.created_at || 0).getTime();
    const rightTime = new Date(right?.start_time || right?.performed_at || right?.created_at || 0).getTime();
    return rightTime - leftTime;
  });
}

function upsertRecord(records, nextRecord) {
  return sortRecordsByLatest([
    nextRecord,
    ...records.filter((record) => record.id !== nextRecord.id),
  ]);
}

function clampDurationInput(value, max) {
  const numeric = Number.parseInt(String(value || "").replace(/[^\d]/g, ""), 10);
  if (Number.isNaN(numeric) || numeric < 0) return 0;
  return Math.min(numeric, max);
}

function buildDefaultFilters() {
  return {
    query: "",
    type: "ALL",
    status: "ALL",
    user: "ALL",
    department: "ALL",
  };
}

export default function ITWorkEvidencePage({
  theme,
  uiTheme,
  currentUser,
  onNavigatePage,
}) {
  const fileInputRef = useRef(null);
  const previewRef = useRef([]);
  const listRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [formData, setFormData] = useState(buildForm());
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [originalImages, setOriginalImages] = useState([]);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingRecordSnapshot, setEditingRecordSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [nowValue, setNowValue] = useState(new Date());
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [filters, setFilters] = useState(buildDefaultFilters);
  const [employeeDirectory, setEmployeeDirectory] = useState([]);
  const [employeeDirectoryLoading, setEmployeeDirectoryLoading] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);

  const deferredQuery = useDeferredValue(filters.query);
  const isEditing = editingRecordId !== null;
  const isCameraViewRequest = formData.job_type === CAMERA_VIEW_JOB_TYPE;
  const cardClass = `${uiTheme.surfaceCard} rounded-2xl border sm:rounded-3xl`;
  const subCardClass = theme === "dark"
    ? "rounded-xl border border-slate-700 bg-[#162136] sm:rounded-2xl"
    : "rounded-xl border border-slate-200 bg-slate-50 sm:rounded-2xl";
  const inputClass = `w-full rounded-xl border px-3 py-2.5 text-sm sm:rounded-2xl sm:px-4 sm:py-3 ${uiTheme.searchInputMobile}`;
  const softTextClass = theme === "dark" ? "text-slate-400" : "text-slate-500";

  const loadRecords = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const { data, error } = await loadITWorkRecords();

    if (error) {
      const missing = isITWorkRecordSchemaError(error);
      setSchemaMissing(missing);
      setLoadError(
        missing
          ? "ยังไม่พบโครงสร้างฐานข้อมูลสำหรับบันทึกงาน IT กรุณารัน SQL migration ก่อนใช้งาน"
          : "ไม่สามารถโหลดบันทึกงาน IT ได้",
      );
      setRecords([]);
    } else {
      setRecords(sortRecordsByLatest(Array.isArray(data) ? data : []));
      setLoadError("");
      setSchemaMissing(false);
    }

    if (!silent) setLoading(false);
  };

  useEffect(() => {
    previewRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(() => () => revokePreviewEntries(previewRef.current), []);

  useEffect(() => {
    let mounted = true;
    let channel = null;

    const init = async () => {
      await loadRecords();
      if (!mounted) return;

      channel = supabase
        .channel("it_work_records_realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "it_work_records" }, () => {
          if (mounted) void loadRecords({ silent: true });
        })
        .subscribe();
    };

    void init();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadEmployeeDirectory = async () => {
      setEmployeeDirectoryLoading(true);

      const { data, error } = await fetchProfilesWithCompatibility(supabase, {
        ids: null,
        columns: ["id", "full_name", "employee_code", "department", "avatar_url", "id_card_url", "email"],
      });

      if (!mounted) return;

      if (error) {
        console.warn("Load IT work evidence employee directory error:", error);
        setEmployeeDirectory([]);
      } else {
        const rows = (Array.isArray(data) ? data : [])
          .map((row) => ({
            id: normalizeText(row?.id),
            full_name: normalizeText(row?.full_name || row?.name || row?.email),
            employee_code: normalizeText(row?.employee_code || row?.employeeId),
            department: normalizeText(row?.department),
            avatar_url: normalizeText(row?.avatar_url || row?.id_card_url),
            email: normalizeText(row?.email),
          }))
          .filter((row) => row.id && (row.full_name || row.employee_code || row.email))
          .sort((left, right) => (
            (left.full_name || left.employee_code || left.email)
              .localeCompare(right.full_name || right.employee_code || right.email, "th")
          ));

        const currentUserOption = currentUser?.id
          ? {
              id: normalizeText(currentUser.id),
              full_name: normalizeText(currentUser.name || currentUser.email),
              employee_code: normalizeText(currentUser.employeeId),
              department: normalizeText(currentUser.department),
              avatar_url: normalizeText(currentUser.avatar),
              email: normalizeText(currentUser.email),
            }
          : null;
        const withCurrentUser = currentUserOption?.id && !rows.some((row) => row.id === currentUserOption.id)
          ? [currentUserOption, ...rows]
          : rows;

        setEmployeeDirectory(withCurrentUser);
      }

      setEmployeeDirectoryLoading(false);
    };

    void loadEmployeeDirectory();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const timer = window.setInterval(() => setNowValue(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [timerRunning]);

  useEffect(() => {
    if (isEditing) return;

    const nextReference = buildReferenceCode({
      jobType: formData.job_type,
      startTime: formData.start_time || new Date(),
    });

    setFormData((prev) => (
      prev.reference_code === nextReference
        ? prev
        : { ...prev, reference_code: nextReference }
    ));
  }, [formData.job_type, formData.start_time, isEditing]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 720);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!recordModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [recordModalOpen]);

  const clearFormState = () => {
    setTimerRunning(false);
    setNowValue(new Date());
    setEditingRecordId(null);
    setEditingRecordSnapshot(null);
    setExistingImages([]);
    setOriginalImages([]);
    setFormData(buildForm());
    setSelectedFiles((prev) => {
      revokePreviewEntries(prev);
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openCreateRecordModal = () => {
    if (saving) return;
    clearFormState();
    setRecordModalOpen(true);
  };

  const openCameraViewRecordModal = () => {
    if (saving) return;
    clearFormState();
    setFormData(buildCameraViewForm());
    setRecordModalOpen(true);
  };

  const closeRecordModal = () => {
    if (saving) return;
    clearFormState();
    setRecordModalOpen(false);
  };

  const resetForm = () => {
    const resetAsCameraViewRequest = isCameraViewRequest;
    clearFormState();
    if (resetAsCameraViewRequest) {
      setFormData(buildCameraViewForm());
    }
  };

  const handleCancelEdit = () => {
    closeRecordModal();
  };

  const appendEvidenceFiles = (files, { source = "upload", notifyInvalid = true } = {}) => {
    const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    if (safeFiles.length === 0) return false;

    const normalizedFiles = safeFiles.map((file, index) => {
      if (file instanceof File && file.name) return file;

      const extension = String(file?.type || "image/png").split("/")[1] || "png";
      return new File([file], `clipboard-${Date.now()}-${index}.${extension}`, {
        type: file?.type || "image/png",
      });
    });

    const imageFiles = normalizedFiles.filter((file) => String(file.type || "").startsWith("image/"));
    const remainingSlots = 8 - existingImages.length - selectedFiles.length;

    if (notifyInvalid && imageFiles.length !== normalizedFiles.length) {
      toast.error("ระบบรองรับเฉพาะไฟล์รูปภาพ");
    }
    if (imageFiles.length === 0) {
      return false;
    }
    if (remainingSlots <= 0) {
      toast.error("อัปโหลดได้สูงสุด 8 รูป");
      return false;
    }

    const nextEntries = imageFiles.slice(0, remainingSlots).map((file, index) => ({
      id: `${source}_${file.name}_${file.lastModified}_${selectedFiles.length + index}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (imageFiles.length > remainingSlots) {
      toast.error("เลือกได้ไม่เกิน 8 รูป");
    }

    setSelectedFiles((prev) => [...prev, ...nextEntries]);

    if (source === "clipboard" && nextEntries.length > 0) {
      toast.success(`วางรูปจากคลิปบอร์ดแล้ว ${nextEntries.length} รูป`);
    }

    return nextEntries.length > 0;
  };

  const handleFileSelect = (event) => {
    const rawFiles = Array.from(event.target.files || []);
    appendEvidenceFiles(rawFiles, { source: "upload", notifyInvalid: true });
    event.target.value = "";
  };

  const handleRemoveFile = (fileId) => {
    setSelectedFiles((prev) => {
      const removed = prev.find((item) => item.id === fileId);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((item) => item.id !== fileId);
    });
  };

  const handleRemoveExistingImage = (imageUrl) => {
    setExistingImages((prev) => prev.filter((image) => image.url !== imageUrl));
  };

  useEffect(() => {
    const handleWindowPaste = (event) => {
      if (event.defaultPrevented) return;

      const clipboardItems = Array.from(event.clipboardData?.items || []);
      const pastedImages = clipboardItems
        .filter((item) => String(item.type || "").startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (pastedImages.length === 0) return;

      event.preventDefault();
      appendEvidenceFiles(pastedImages, { source: "clipboard", notifyInvalid: false });
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [existingImages.length, selectedFiles.length]);

  const handleStartTimer = () => {
    const startValue = toDateTimeLocalValue(new Date());
    setNowValue(new Date());
    setTimerRunning(true);
    setFormData((prev) => ({
      ...prev,
      start_time: startValue,
      end_time: "",
      duration_minutes: 0,
      work_status: "in_progress",
    }));
  };

  const handleStopTimer = () => {
    const endValue = toDateTimeLocalValue(new Date());
    setTimerRunning(false);
    setFormData((prev) => ({
      ...prev,
      end_time: endValue,
      duration_minutes: calculateDurationMinutes(prev.start_time, endValue),
      work_status: "completed",
    }));
  };

  const currentDurationMinutes = useMemo(() => {
    if (!formData.start_time) return Math.max(Number(formData.duration_minutes || 0), 0);
    const endValue = formData.end_time || (timerRunning ? toDateTimeLocalValue(nowValue) : "");
    return endValue
      ? calculateDurationMinutes(formData.start_time, endValue)
      : Math.max(Number(formData.duration_minutes || 0), 0);
  }, [formData.duration_minutes, formData.end_time, formData.start_time, nowValue, timerRunning]);

  const durationParts = useMemo(
    () => getDurationParts(currentDurationMinutes),
    [currentDurationMinutes],
  );

  const applyManualDuration = (nextHoursValue, nextMinutesValue) => {
    if (!formData.start_time) {
      toast.error("กรุณาระบุเวลาเริ่มก่อน");
      return;
    }

    const totalMinutes = clampDurationInput(nextHoursValue, 999) * 60 + clampDurationInput(nextMinutesValue, 59);
    const nextEndTime = buildEndTimeFromDuration(formData.start_time, totalMinutes);

    setTimerRunning(false);
    setFormData((prev) => ({
      ...prev,
      end_time: nextEndTime,
      duration_minutes: totalMinutes,
      work_status: totalMinutes > 0 ? "completed" : prev.work_status,
    }));
  };

  const handleDurationHoursChange = (value) => {
    applyManualDuration(value, durationParts.minutes);
  };

  const handleDurationMinutesChange = (value) => {
    applyManualDuration(durationParts.hours, value);
  };

  const handleEmployeeSelect = (profileId) => {
    if (!profileId) {
      setFormData((prev) => ({
        ...prev,
        requester_profile_id: "",
        requester_employee_code: "",
      }));
      return;
    }

    const member = employeeDirectory.find((item) => item.id === profileId);
    if (!member) return;

    setFormData((prev) => ({
      ...prev,
      requester_profile_id: member.id,
      requester_name: member.full_name || member.employee_code || member.email || prev.requester_name,
      requester_employee_code: member.employee_code || "",
      department: member.department || "",
    }));
  };

  const recordViews = useMemo(() => {
    const activeNowIso = nowValue.toISOString();

    return records.map((record) => {
      const startValue = record.start_time || record.performed_at || record.created_at || "";
      const activeEnd =
        record.end_time ||
        (record.work_status === "in_progress" ? activeNowIso : startValue);
      const durationMinutes = Math.max(
        Number(record.duration_minutes || 0),
        calculateDurationMinutes(startValue, activeEnd),
      );
      const typeMeta = getTypeMeta(record.job_type);
      const statusMeta = getStatusMeta(record.work_status);
      const images = normalizeEvidenceImages(record.evidence_images);
      const approvalStatus = normalizeText(record.approval_status) || "pending";
      const approvalMeta = CAMERA_APPROVAL_OPTIONS.find((item) => item.value === approvalStatus)
        || CAMERA_APPROVAL_OPTIONS[0];
      const isCameraView = record.job_type === CAMERA_VIEW_JOB_TYPE;

      return {
        id: record.id,
        raw: record,
        title: normalizeText(record.title) || "-",
        description: normalizeText(record.description),
        resultSummary: normalizeText(record.result_summary),
        deviceDetails: normalizeText(record.device_details),
        location: normalizeText(record.location),
        department: normalizeText(record.department),
        referenceCode:
          normalizeText(record.reference_code) ||
          buildReferenceCode({
            jobType: record.job_type,
            startTime: startValue || new Date(),
          }),
        requesterName: normalizeText(record.requester_name),
        requesterEmployeeCode: normalizeText(record.requester_employee_code),
        userName: normalizeText(record.created_by_name),
        startValue,
        startLabel: formatDateTime(startValue),
        endLabel: formatDateTime(record.end_time),
        startShort: startValue ? formatDateTime(startValue).split(" ").slice(-1)[0] : "-",
        endShort: record.end_time
          ? formatDateTime(record.end_time).split(" ").slice(-1)[0]
          : record.work_status === "in_progress"
            ? "กำลังทำ"
            : "-",
        durationMinutes,
        durationLabel: formatDurationLabel(durationMinutes),
        typeLabel: typeMeta.label,
        statusLabel: statusMeta.label,
        statusTone: getStatusTone(theme, record.work_status),
        isCameraView,
        footageStartLabel: formatDateTime(record.footage_start_at),
        footageEndLabel: formatDateTime(record.footage_end_at),
        approvalStatus,
        approvalLabel: approvalMeta.label,
        approvedByName: normalizeText(record.approved_by_name),
        images,
        imageCount: images.length,
      };
    });
  }, [nowValue, records, theme]);

  const userOptions = useMemo(
    () => [...new Set(recordViews.map((item) => item.userName).filter(Boolean))].sort((left, right) => left.localeCompare(right, "th")),
    [recordViews],
  );

  const departmentOptions = useMemo(
    () => [...new Set(recordViews.map((item) => item.department).filter(Boolean))].sort((left, right) => left.localeCompare(right, "th")),
    [recordViews],
  );

  const filteredRecords = useMemo(() => {
    const searchValue = normalizeText(deferredQuery).toLowerCase();

    return recordViews.filter((record) => {
      const haystack = [
        record.title,
        record.description,
        record.location,
        record.referenceCode,
        record.department,
        record.userName,
        record.deviceDetails,
        record.requesterName,
        record.requesterEmployeeCode,
        record.approvedByName,
        record.approvalLabel,
        record.footageStartLabel,
        record.footageEndLabel,
      ]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");

      return (
        (filters.type === "ALL" || record.raw.job_type === filters.type) &&
        (filters.status === "ALL" || record.raw.work_status === filters.status) &&
        (filters.user === "ALL" || record.userName === filters.user) &&
        (filters.department === "ALL" || record.department === filters.department) &&
        (!searchValue || haystack.includes(searchValue))
      );
    });
  }, [deferredQuery, filters.department, filters.status, filters.type, filters.user, recordViews]);

  const beginEditRecord = (recordView) => {
    const nextImages = normalizeEvidenceImages(recordView?.raw?.evidence_images);

    setTimerRunning(false);
    setNowValue(new Date());
    setEditingRecordId(recordView.id);
    setEditingRecordSnapshot(recordView.raw);
    setExistingImages(nextImages);
    setOriginalImages(nextImages);
    setFormData(buildFormFromRecord(recordView.raw));
    setSelectedFiles((prev) => {
      revokePreviewEntries(prev);
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setRecordModalOpen(true);
  };

  const buildPayload = (uploadedImages) => {
    const startIso = new Date(formData.start_time).toISOString();
    const endIso = formData.end_time ? new Date(formData.end_time).toISOString() : null;
    const cameraRequest = formData.job_type === CAMERA_VIEW_JOB_TYPE;
    const shouldWriteCameraFields = cameraRequest
      || editingRecordSnapshot?.job_type === CAMERA_VIEW_JOB_TYPE;
    const durationMinutes = endIso
      ? calculateDurationMinutes(formData.start_time, formData.end_time)
      : 0;

    return {
      title: normalizeText(formData.title),
      description: normalizeText(formData.description),
      job_type: normalizeText(formData.job_type) || "other",
      work_status: cameraRequest
        ? normalizeText(formData.work_status) || "pending"
        : endIso ? normalizeText(formData.work_status || "completed") : "in_progress",
      location: normalizeText(formData.location),
      requester_name: normalizeText(formData.requester_name),
      department: normalizeText(formData.department),
      device_details: normalizeText(formData.device_details),
      reference_code:
        normalizeText(formData.reference_code) ||
        buildReferenceCode({
          jobType: formData.job_type,
          startTime: formData.start_time || new Date(),
        }),
      result_summary: normalizeText(formData.result_summary),
      ...(shouldWriteCameraFields ? {
        requester_profile_id: cameraRequest ? normalizeText(formData.requester_profile_id) || null : null,
        requester_employee_code: cameraRequest ? normalizeText(formData.requester_employee_code) : "",
        footage_start_at: cameraRequest ? new Date(formData.footage_start_at).toISOString() : null,
        footage_end_at: cameraRequest ? new Date(formData.footage_end_at).toISOString() : null,
        approval_status: cameraRequest ? normalizeText(formData.approval_status) || "pending" : "not_required",
        approved_by_name: cameraRequest ? normalizeText(formData.approved_by_name) : "",
      } : {}),
      start_time: startIso,
      end_time: endIso,
      duration_minutes: durationMinutes,
      performed_at: startIso,
      evidence_images: uploadedImages,
      created_by: editingRecordSnapshot?.created_by || currentUser.id,
      created_by_name:
        normalizeText(editingRecordSnapshot?.created_by_name) ||
        normalizeText(currentUser.name) ||
        normalizeText(currentUser.email) ||
        "IT Support",
    };
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!currentUser?.id) {
      toast.error("กำลังโหลดข้อมูลผู้ใช้งาน");
      return;
    }
    if (!normalizeText(formData.title) || !normalizeText(formData.description)) {
      toast.error("กรุณากรอกชื่อเรื่องและรายละเอียดงาน");
      return;
    }
    if (isCameraViewRequest) {
      if (!normalizeText(formData.requester_name)) {
        toast.error("กรุณาระบุชื่อผู้ขอดูภาพกล้อง");
        return;
      }
      if (!normalizeText(formData.location) || !normalizeText(formData.device_details)) {
        toast.error("กรุณาระบุพื้นที่เกิดเหตุและจุดกล้องที่ขอดู");
        return;
      }
      if (!formData.footage_start_at || !formData.footage_end_at) {
        toast.error("กรุณาระบุช่วงเวลาภาพที่ขอดูให้ครบ");
        return;
      }
      if (new Date(formData.footage_end_at) < new Date(formData.footage_start_at)) {
        toast.error("เวลาสิ้นสุดของภาพต้องไม่น้อยกว่าเวลาเริ่ม");
        return;
      }
      if (
        ["approved", "rejected"].includes(formData.approval_status)
        && !normalizeText(formData.approved_by_name)
      ) {
        toast.error("กรุณาระบุผู้อนุมัติหรือผู้พิจารณา");
        return;
      }
    }
    if (!formData.start_time) {
      toast.error("กรุณาระบุเวลาเริ่ม");
      return;
    }
    if (
      formData.end_time &&
      calculateDurationMinutes(formData.start_time, formData.end_time) === 0 &&
      formData.end_time !== formData.start_time
    ) {
      toast.error("เวลาสิ้นสุดต้องมากกว่าหรือเท่ากับเวลาเริ่ม");
      return;
    }

    setSaving(true);
    let uploadedImages = [];

    try {
      uploadedImages = await uploadITWorkEvidenceFiles(
        selectedFiles.map((entry) => entry.file),
        currentUser.id,
      );

      const nextImages = [...existingImages, ...uploadedImages];
      const payload = buildPayload(nextImages);

      if (isEditing && editingRecordId) {
        const { data, error } = await updateITWorkRecord(editingRecordId, payload);
        if (error) throw error;

        setRecords((prev) => upsertRecord(prev, data));

        const removedImages = originalImages.filter(
          (image) => !existingImages.some((currentImage) => currentImage.url === image.url),
        );
        if (removedImages.length > 0) {
          void removeITWorkEvidenceFiles(removedImages);
        }

        toast.success(isCameraViewRequest ? "แก้ไขประวัติการขอดูกล้องสำเร็จ" : "แก้ไขบันทึกงาน IT สำเร็จ");
      } else {
        const { data, error } = await createITWorkRecord(payload);
        if (error) throw error;

        setRecords((prev) => upsertRecord(prev, data));
        toast.success(isCameraViewRequest ? "บันทึกประวัติการขอดูกล้องสำเร็จ" : "บันทึกงาน IT สำเร็จ");
      }

      clearFormState();
      setRecordModalOpen(false);
    } catch (error) {
      if (uploadedImages.length > 0) {
        await removeITWorkEvidenceFiles(uploadedImages);
      }
      if (isITWorkRecordSchemaError(error)) {
        setSchemaMissing(true);
        const schemaMessage = isCameraViewRequest
          ? "ฐานข้อมูลยังไม่รองรับประวัติการขอดูกล้อง กรุณารัน database/20260813_camera_view_history.sql ใน Supabase"
          : "ยังไม่พบโครงสร้างฐานข้อมูลสำหรับบันทึกงาน IT กรุณารัน SQL migration ก่อนใช้งาน";
        setLoadError(schemaMessage);
        toast.error(schemaMessage);
      } else {
        toast.error(error?.message || "ไม่สามารถบันทึกงาน IT ได้");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!record?.id || deletingId) return;
    if (!window.confirm("ต้องการลบบันทึกงาน IT รายการนี้ใช่หรือไม่?")) return;

    setDeletingId(record.id);
    try {
      const { error } = await deleteITWorkRecord(record.id);
      if (error) throw error;

      setRecords((prev) => prev.filter((item) => item.id !== record.id));
      await removeITWorkEvidenceFiles(record.evidence_images);

      if (editingRecordId === record.id) {
        clearFormState();
      }

      toast.success("ลบบันทึกงานเรียบร้อย");
    } catch (error) {
      toast.error(error?.message || "ไม่สามารถลบบันทึกงานได้");
    } finally {
      setDeletingId(null);
    }
  };

  const scrollToList = () => {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartFreshView = () => {
    clearFormState();
    setRecordModalOpen(false);
    setFilters(buildDefaultFilters());
    scrollToTop();
  };

  const summaryCards = useMemo(() => {
    const todayKey = toDateTimeLocalValue(new Date()).slice(0, 10);
    const totalMinutes = recordViews.reduce((sum, record) => sum + record.durationMinutes, 0);
    const completedCount = recordViews.filter((record) => record.raw.work_status === "completed").length;
    const activeCount = recordViews.filter((record) => record.raw.work_status === "in_progress").length;
    const todayCount = recordViews.filter((record) => {
      if (!record.startValue) return false;
      return toDateTimeLocalValue(record.startValue).slice(0, 10) === todayKey;
    }).length;
    const cameraViewCount = recordViews.filter((record) => record.isCameraView).length;

    return [
      {
        key: "total",
        title: "ประวัติทั้งหมด",
        value: recordViews.length,
        hint: cameraViewCount > 0
          ? `รวมคำขอดูกล้อง ${cameraViewCount} รายการ`
          : "งานติดตั้ง/ปรับปรุงที่บันทึกไว้",
        icon: ListChecks,
        tone: theme === "dark" ? "bg-cyan-500/10 text-cyan-200" : "bg-cyan-50 text-cyan-700",
      },
      {
        key: "today",
        title: "บันทึกวันนี้",
        value: todayCount,
        hint: "รายการที่เริ่มงานวันนี้",
        icon: Clock3,
        tone: theme === "dark" ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700",
      },
      {
        key: "completed",
        title: "เสร็จสิ้น",
        value: completedCount,
        hint: activeCount > 0 ? `กำลังทำ ${activeCount} รายการ` : "ไม่มีงานค้างในหน้านี้",
        icon: CheckCircle2,
        tone: theme === "dark" ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-700",
      },
      {
        key: "hours",
        title: "ชั่วโมงรวม",
        value: formatDurationLabel(totalMinutes),
        hint: "รวมเวลาจากประวัติงานทั้งหมด",
        icon: Clock3,
        tone: theme === "dark" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700",
      },
    ];
  }, [recordViews, theme]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className={`${cardClass} overflow-hidden`}>
        <div className="relative p-4 sm:p-6">
          <div className={`pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full blur-3xl sm:h-48 sm:w-48 ${
            theme === "dark" ? "bg-cyan-500/10" : "bg-cyan-200/50"
          }`} />
          <div className={`pointer-events-none absolute bottom-0 left-8 h-24 w-24 rounded-full blur-3xl sm:h-32 sm:w-32 ${
            theme === "dark" ? "bg-[#2b59b0]/20" : "bg-[#2b59b0]/10"
          }`} />

          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                theme === "dark"
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                  : "border-cyan-200 bg-cyan-50 text-cyan-700"
              }`}>
                <ListChecks size={14} />
                บันทึกงาน IT
              </div>
              <h2 className={`mt-2 text-xl font-black sm:mt-3 sm:text-3xl ${uiTheme.textPrimary}`}>
                บันทึกงานติดตั้ง ปรับปรุง และแก้ไข
              </h2>
              <p className={`mt-1 line-clamp-2 max-w-3xl text-xs leading-5 sm:mt-2 sm:text-sm sm:leading-6 ${uiTheme.textSecondary}`}>
                หน้าแรกจะแสดงประวัติงานที่บันทึกไว้ทันที ส่วนการเพิ่มหรือแก้ไขงานย้ายไปอยู่ใน popup เพื่อให้ใช้งานเร็วและไม่ต้องเลื่อนหาฟอร์มยาว
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={openCreateRecordModal}
                disabled={schemaMissing}
                className={`col-span-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 sm:col-span-1 sm:rounded-2xl sm:px-4 sm:py-3 ${
                  schemaMissing
                    ? "cursor-not-allowed bg-slate-400 shadow-none"
                    : "bg-[#2b59b0] shadow-[#2b59b0]/25 hover:bg-[#244a95]"
                }`}
              >
                <Plus size={18} />
                เพิ่มบันทึกงาน
              </button>
              <button
                type="button"
                onClick={openCameraViewRecordModal}
                disabled={schemaMissing}
                className={`col-span-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 sm:col-span-1 sm:rounded-2xl sm:px-4 sm:py-3 ${
                  schemaMissing
                    ? "cursor-not-allowed bg-slate-400 shadow-none"
                    : "bg-cyan-700 shadow-cyan-700/20 hover:bg-cyan-800"
                }`}
              >
                <Cctv size={18} />
                บันทึกประวัติการขอดูกล้อง
              </button>
              <button
                type="button"
                onClick={() => onNavigatePage?.(DASHBOARD_PAGE_IDS.REPORTS)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${
                  theme === "dark"
                    ? "bg-[#162136] text-slate-200 hover:bg-[#1e2b44]"
                    : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <LayoutDashboard size={16} />
                <span className="truncate">Dashboard</span>
              </button>
              <button
                type="button"
                onClick={scrollToList}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${
                  theme === "dark"
                    ? "bg-[#162136] text-slate-200 hover:bg-[#1e2b44]"
                    : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <ListChecks size={16} />
                <span className="truncate">ประวัติงาน</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.key} className={`${cardClass} p-3 sm:p-5`}>
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.16em] ${softTextClass}`}>{card.title}</p>
                  <p className={`mt-1 text-lg font-black leading-tight sm:mt-2 sm:text-2xl ${uiTheme.textPrimary}`}>{card.value}</p>
                  <p className={`mt-1 hidden text-xs leading-5 sm:block ${uiTheme.textSecondary}`}>{card.hint}</p>
                </div>
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl ${card.tone}`}>
                  <Icon size={18} />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      {loadError && (
        <section className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
          schemaMissing
            ? theme === "dark"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-amber-200 bg-amber-50 text-amber-800"
            : theme === "dark"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border-rose-200 bg-rose-50 text-rose-700"
        }`}>
          {loadError}
        </section>
      )}

      <EvidenceRecordsSection
        theme={theme}
        uiTheme={uiTheme}
        cardClass={cardClass}
        subCardClass={subCardClass}
        inputClass={inputClass}
        softTextClass={softTextClass}
        listRef={listRef}
        loading={loading}
        records={filteredRecords}
        totalRecords={recordViews.length}
        filters={filters}
        setFilters={setFilters}
        typeOptions={TYPE_OPTIONS}
        statusOptions={STATUS_OPTIONS}
        userOptions={userOptions}
        departmentOptions={departmentOptions}
        onEdit={beginEditRecord}
        editingId={editingRecordId}
        onDelete={handleDelete}
        deletingId={deletingId}
        onScrollToTop={scrollToTop}
        onStartFreshView={handleStartFreshView}
        onCreateRecord={openCreateRecordModal}
        onCreateCameraViewRecord={openCameraViewRecordModal}
      />

      {recordModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div
            className={`absolute inset-0 backdrop-blur-sm ${
              theme === "dark" ? "bg-slate-950/80" : "bg-slate-900/35"
            }`}
            onClick={closeRecordModal}
          />

          <div className={`relative z-10 flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:max-h-[96vh] sm:rounded-[2rem] ${
            theme === "dark"
              ? "border-slate-700 bg-[#0f172a] shadow-slate-950/60"
              : "border-slate-200 bg-white shadow-slate-400/30"
          }`}>
            <div className={`flex items-start justify-between gap-3 border-b px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 ${
              theme === "dark" ? "border-slate-700" : "border-slate-200"
            }`}>
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-[0.16em] sm:text-xs sm:tracking-[0.18em] ${softTextClass}`}>
                  {isCameraViewRequest
                    ? isEditing ? "Edit CCTV viewing history" : "New CCTV viewing history"
                    : isEditing ? "Edit work record" : "New work record"}
                </p>
                <h3 className={`mt-0.5 text-base font-black sm:mt-1 sm:text-lg ${uiTheme.textPrimary}`}>
                  {isCameraViewRequest
                    ? isEditing ? "แก้ไขประวัติการขอดูกล้อง" : "บันทึกประวัติการขอดูกล้อง"
                    : isEditing ? "แก้ไขบันทึกงาน" : "เพิ่มบันทึกงาน"}
                </h3>
                <p className={`mt-1 hidden text-sm sm:block ${uiTheme.textSecondary}`}>
                  {isCameraViewRequest
                    ? "บันทึกผู้ขอ เหตุผล จุดกล้อง ช่วงเวลาภาพ และผู้อนุมัติ เพื่อใช้ตรวจสอบย้อนหลัง"
                    : "กรอกข้อมูลและแนบรูปหลักฐานได้ในหน้าต่างนี้ บันทึกเสร็จแล้วรายการจะอัปเดตในประวัติทันที"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeRecordModal}
                disabled={saving}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition sm:h-10 sm:w-10 sm:rounded-2xl ${
                  saving
                    ? "cursor-not-allowed opacity-60"
                    : theme === "dark"
                      ? "border-slate-600 text-slate-300 hover:bg-slate-800"
                      : "border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}
                aria-label="ปิดหน้าต่างบันทึกงาน"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-3 py-3 sm:px-6 sm:py-5">
              <EvidenceFormSection
                theme={theme}
                uiTheme={uiTheme}
                cardClass="border-0 bg-transparent shadow-none"
                subCardClass={subCardClass}
                inputClass={inputClass}
                softTextClass={softTextClass}
                currentUser={currentUser}
                formData={formData}
                setFormData={setFormData}
                selectedFiles={selectedFiles}
                existingImages={existingImages}
                fileInputRef={fileInputRef}
                onFileSelect={handleFileSelect}
                onRemoveFile={handleRemoveFile}
                onRemoveExistingImage={handleRemoveExistingImage}
                onReset={resetForm}
                onSave={handleSave}
                saving={saving}
                schemaMissing={schemaMissing}
                timerRunning={timerRunning}
                durationLabel={formatDurationLabel(currentDurationMinutes)}
                durationHours={durationParts.hours}
                durationMinutes={durationParts.minutes}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopTimer}
                onDurationHoursChange={handleDurationHoursChange}
                onDurationMinutesChange={handleDurationMinutesChange}
                isEditing={isEditing}
                onCancelEdit={handleCancelEdit}
                employeeOptions={employeeDirectory}
                employeeLoading={employeeDirectoryLoading}
                onEmployeeSelect={handleEmployeeSelect}
                isModal
              />
            </div>
          </div>
        </div>
      )}

      {showScrollToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className={`fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5 sm:bottom-5 sm:right-5 ${
            theme === "dark"
              ? "border-slate-600 bg-[#162136]/95 text-slate-100 shadow-slate-950/40"
              : "border-slate-200 bg-white/95 text-slate-700 shadow-slate-300/40"
          }`}
          aria-label="กลับขึ้นบนสุด"
        >
          <ArrowUp size={16} />
          <span className="hidden sm:inline">กลับขึ้นบนสุด</span>
        </button>
      )}
    </div>
  );
}
