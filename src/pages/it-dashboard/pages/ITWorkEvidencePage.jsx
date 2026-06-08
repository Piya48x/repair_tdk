import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ArrowUp, LayoutDashboard, ListChecks } from "lucide-react";
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
  STATUS_OPTIONS,
  TYPE_OPTIONS,
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

  const deferredQuery = useDeferredValue(filters.query);
  const isEditing = editingRecordId !== null;
  const cardClass = `${uiTheme.surfaceCard} rounded-3xl border`;
  const subCardClass = theme === "dark"
    ? "rounded-2xl border border-slate-700 bg-[#162136]"
    : "rounded-2xl border border-slate-200 bg-slate-50";
  const inputClass = `w-full rounded-2xl border px-4 py-3 text-sm ${uiTheme.searchInputMobile}`;
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

  const resetForm = () => {
    clearFormState();
  };

  const handleCancelEdit = () => {
    clearFormState();
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
      }));
      return;
    }

    const member = employeeDirectory.find((item) => item.id === profileId);
    if (!member) return;

    setFormData((prev) => ({
      ...prev,
      requester_profile_id: member.id,
      requester_name: member.full_name || member.employee_code || member.email || prev.requester_name,
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = (uploadedImages) => {
    const startIso = new Date(formData.start_time).toISOString();
    const endIso = formData.end_time ? new Date(formData.end_time).toISOString() : null;
    const durationMinutes = endIso
      ? calculateDurationMinutes(formData.start_time, formData.end_time)
      : 0;

    return {
      title: normalizeText(formData.title),
      description: normalizeText(formData.description),
      job_type: normalizeText(formData.job_type) || "other",
      work_status: endIso ? normalizeText(formData.work_status || "completed") : "in_progress",
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

        toast.success("แก้ไขบันทึกงาน IT สำเร็จ");
      } else {
        const { data, error } = await createITWorkRecord(payload);
        if (error) throw error;

        setRecords((prev) => upsertRecord(prev, data));
        toast.success("บันทึกงาน IT สำเร็จ");
      }

      clearFormState();
    } catch (error) {
      if (uploadedImages.length > 0) {
        await removeITWorkEvidenceFiles(uploadedImages);
      }
      if (isITWorkRecordSchemaError(error)) {
        setSchemaMissing(true);
        setLoadError("ยังไม่พบโครงสร้างฐานข้อมูลสำหรับบันทึกงาน IT กรุณารัน SQL migration ก่อนใช้งาน");
      }
      toast.error(error?.message || "ไม่สามารถบันทึกงาน IT ได้");
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
    setFilters(buildDefaultFilters());
    scrollToTop();
  };

  return (
    <div className="space-y-6">
      <section className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
              theme === "dark"
                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                : "border-cyan-200 bg-cyan-50 text-cyan-700"
            }`}>
              <ListChecks size={14} />
              บันทึกงาน IT
            </div>
            <h2 className={`mt-3 text-2xl font-black ${uiTheme.textPrimary}`}>
              บันทึกงานติดตั้ง ปรับปรุง และแก้ไข พร้อมภาพหลักฐาน
            </h2>
            <p className={`mt-2 max-w-3xl text-sm leading-6 ${uiTheme.textSecondary}`}>
              รองรับการบันทึกย้อนหลัง กำหนดชั่วโมงงานเอง และแก้ไขรายการเดิมได้จากหน้าเดียว
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigatePage?.(DASHBOARD_PAGE_IDS.REPORTS)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                theme === "dark"
                  ? "bg-[#162136] text-slate-200 hover:bg-[#1e2b44]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard IT Usage
            </button>
            <button
              type="button"
              onClick={scrollToList}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                theme === "dark"
                  ? "bg-[#162136] text-slate-200 hover:bg-[#1e2b44]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <ListChecks size={16} />
              รายการงาน
            </button>
          </div>
        </div>
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

      <section className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <EvidenceFormSection
          theme={theme}
          uiTheme={uiTheme}
          cardClass={cardClass}
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
        />

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
        />
      </section>

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
