import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Paperclip,
  Pin,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "../i18n/LanguageProvider";
import { useScopedI18n } from "../i18n/useScopedI18n";
import { supabase } from "../lib/supabaseClient";
import AttachmentPreviewModal from "./work-notes/AttachmentPreviewModal.jsx";
import SummaryCard from "./work-notes/SummaryCard.jsx";
import WorkNotesForm from "./work-notes/WorkNotesForm.jsx";
import WorkNotesList from "./work-notes/WorkNotesList.jsx";
import {
  MAX_ATTACHMENT_SIZE,
  buildEmptyForm,
  buildFormFromNote,
  createChecklistDraft,
  getWorkNotesStatusFilterOptions,
  revokePendingFiles,
  useDebouncedValue,
} from "./work-notes/shared";
import {
  NOTE_STATUS_VALUES,
  createWorkNote,
  deleteWorkNote,
  deleteWorkNoteAttachments,
  exportWorkNotesToExcel,
  formatTags,
  isWorkNotesSchemaError,
  loadWorkNotes,
  normalizeStatus,
  normalizeTags,
  removeWorkNoteAttachmentFiles,
  sortWorkNotes,
  syncNoteChecklistItems,
  toggleWorkNotePin,
  updateWorkNote,
  updateWorkNoteStatus,
  uploadWorkNoteAttachments,
} from "../services/workNotesService";

const WORK_NOTES_PAGE_TRANSLATIONS = {
  th: {
    back: "กลับ Dashboard",
    badge: "Personal Work Notes",
    title: "Work Notes / โน้ตงานส่วนตัว",
    subtitle: "บันทึกงาน วางแผน ติดตาม checklist แนบไฟล์หลักฐาน และ export เป็น Excel ได้ในหน้าเดียว",
    unknownUser: "ผู้ใช้งาน",
    refresh: "รีเฟรช",
    exporting: "กำลังส่งออก...",
    export: "Export Excel",
    schemaLoadError: "schema Work Notes ยังไม่พร้อม กรุณารัน database/20260324_work_notes_upgrade.sql",
    loadError: "ไม่สามารถโหลด Work Notes ได้",
    initError: "ไม่สามารถเริ่มต้นหน้า Work Notes ได้",
    fileTooLarge: "ไฟล์ต้องมีขนาดไม่เกิน 20MB: {{name}}",
    pastedFiles: "วางรูปแล้ว {{count}} ไฟล์",
    noExportItems: "ไม่มีรายการ Work Notes สำหรับส่งออก",
    exportSuccess: "Export Excel สำเร็จ",
    exportFailed: "ส่งออก Work Notes ไม่สำเร็จ",
    deleteConfirm: "ต้องการลบ Work Note นี้ใช่หรือไม่?",
    deleteSuccess: "ลบ Work Note แล้ว",
    deleteFailed: "ลบ Work Note ไม่สำเร็จ",
    togglePinFailed: "เปลี่ยนสถานะปักหมุดไม่สำเร็จ",
    quickStatusFailed: "อัปเดตสถานะ Work Note ไม่สำเร็จ",
    requiredError: "กรุณากรอกชื่อเรื่องและวันที่ของ Work Note",
    noNoteId: "ไม่พบรหัส Work Note หลังบันทึก",
    saveSchemaError: "schema Work Notes ยังไม่พร้อม กรุณารัน database/20260324_work_notes_upgrade.sql",
    saveFailed: "ไม่สามารถบันทึก Work Note ได้",
    updateSuccess: "อัปเดต Work Note แล้ว",
    createSuccess: "สร้าง Work Note แล้ว",
    allNotes: "All Notes",
    allNotesHint: "จำนวน Work Notes ทั้งหมด",
    open: "Open",
    openHint: "งานที่ยังไม่อยู่สถานะ Done",
    done: "Done",
    doneHint: "งานที่ปิดเรียบร้อยแล้ว",
    attachments: "Attachments",
    pinnedHint: "Pinned {{count}} รายการ",
    liveSummary: "Live Summary",
    visibleItems: "รายการที่แสดงอยู่ {{count}} รายการ",
    filterSummary: "Filter: {{status}} / Tag: {{tag}}",
    pinnedCount: "ปักหมุด {{count}}",
    allTags: "ทุกแท็ก",
  },
  en: {
    back: "Back to Dashboard",
    badge: "Personal Work Notes",
    title: "Work Notes / Personal Notes",
    subtitle: "Track work, plans, checklists, evidence files, and export everything to Excel from one page.",
    unknownUser: "User",
    refresh: "Refresh",
    exporting: "Exporting...",
    export: "Export Excel",
    schemaLoadError: "Work Notes schema is not ready. Please run database/20260324_work_notes_upgrade.sql",
    loadError: "Unable to load Work Notes",
    initError: "Unable to initialize the Work Notes page",
    fileTooLarge: "File size must not exceed 20MB: {{name}}",
    pastedFiles: "{{count}} image files pasted",
    noExportItems: "No Work Notes available for export",
    exportSuccess: "Excel export completed",
    exportFailed: "Work Notes export failed",
    deleteConfirm: "Do you want to delete this Work Note?",
    deleteSuccess: "Work Note deleted",
    deleteFailed: "Unable to delete the Work Note",
    togglePinFailed: "Unable to change pin status",
    quickStatusFailed: "Unable to update Work Note status",
    requiredError: "Please enter the Work Note title and date",
    noNoteId: "No Work Note ID was returned after saving",
    saveSchemaError: "Work Notes schema is not ready. Please run database/20260324_work_notes_upgrade.sql",
    saveFailed: "Unable to save the Work Note",
    updateSuccess: "Work Note updated",
    createSuccess: "Work Note created",
    allNotes: "All Notes",
    allNotesHint: "Total number of Work Notes",
    open: "Open",
    openHint: "Notes not in Done status",
    done: "Done",
    doneHint: "Completed notes",
    attachments: "Attachments",
    pinnedHint: "Pinned {{count}} items",
    liveSummary: "Live Summary",
    visibleItems: "{{count}} items shown",
    filterSummary: "Filter: {{status}} / Tag: {{tag}}",
    pinnedCount: "Pinned {{count}}",
    allTags: "All tags",
  },
  ko: {
    back: "대시보드로 돌아가기",
    badge: "Personal Work Notes",
    title: "업무 노트 / 개인 노트",
    subtitle: "작업, 계획, 체크리스트, 증빙 파일을 한 페이지에서 관리하고 Excel로 내보낼 수 있습니다.",
    unknownUser: "사용자",
    refresh: "새로고침",
    exporting: "내보내는 중...",
    export: "Excel 내보내기",
    schemaLoadError: "Work Notes 스키마가 준비되지 않았습니다. database/20260324_work_notes_upgrade.sql 을 실행하세요.",
    loadError: "Work Notes를 불러올 수 없습니다",
    initError: "Work Notes 페이지를 초기화할 수 없습니다",
    fileTooLarge: "파일 크기는 20MB를 초과할 수 없습니다: {{name}}",
    pastedFiles: "{{count}}개 이미지 파일을 붙여넣었습니다",
    noExportItems: "내보낼 Work Notes가 없습니다",
    exportSuccess: "Excel 내보내기 완료",
    exportFailed: "Work Notes 내보내기 실패",
    deleteConfirm: "이 Work Note를 삭제하시겠습니까?",
    deleteSuccess: "Work Note가 삭제되었습니다",
    deleteFailed: "Work Note를 삭제할 수 없습니다",
    togglePinFailed: "고정 상태를 변경할 수 없습니다",
    quickStatusFailed: "Work Note 상태를 업데이트할 수 없습니다",
    requiredError: "Work Note 제목과 날짜를 입력하세요",
    noNoteId: "저장 후 Work Note ID를 찾을 수 없습니다",
    saveSchemaError: "Work Notes 스키마가 준비되지 않았습니다. database/20260324_work_notes_upgrade.sql 을 실행하세요.",
    saveFailed: "Work Note를 저장할 수 없습니다",
    updateSuccess: "Work Note가 업데이트되었습니다",
    createSuccess: "Work Note가 생성되었습니다",
    allNotes: "전체 노트",
    allNotesHint: "전체 Work Notes 수",
    open: "진행 중",
    openHint: "Done 상태가 아닌 노트",
    done: "완료",
    doneHint: "완료된 노트",
    attachments: "첨부파일",
    pinnedHint: "{{count}}개 고정",
    liveSummary: "실시간 요약",
    visibleItems: "{{count}}개 항목 표시 중",
    filterSummary: "필터: {{status}} / 태그: {{tag}}",
    pinnedCount: "{{count}}개 고정",
    allTags: "전체 태그",
  },
};

function buildPendingFileEntry(file) {
  return {
    id: `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file,
    previewUrl: String(file?.type || "").toLowerCase().startsWith("image/") ? URL.createObjectURL(file) : "",
  };
}

export default function WorkNotes() {
  const navigate = useNavigate();
  const { language } = useI18n();
  const { tt } = useScopedI18n(WORK_NOTES_PAGE_TRANSLATIONS);
  const channelRef = useRef(null);
  const formPanelRef = useRef(null);
  const fileInputRef = useRef(null);
  const pendingFilesRef = useRef([]);

  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [notes, setNotes] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [formData, setFormData] = useState(buildEmptyForm);
  const [initialChecklistItems, setInitialChecklistItems] = useState([]);
  const [removedExistingAttachments, setRemovedExistingAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const debouncedSearch = useDebouncedValue(searchInput, 250);
  const statusFilterOptions = useMemo(() => getWorkNotesStatusFilterOptions(language), [language]);

  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      revokePendingFiles(pendingFilesRef.current);
    };
  }, []);

  const sortedNotes = useMemo(() => sortWorkNotes(notes), [notes]);

  const tagOptions = useMemo(() => {
    const tagSet = new Set();
    sortedNotes.forEach((note) => {
      (Array.isArray(note?.tags) ? note.tags : []).forEach((tag) => {
        if (tag) tagSet.add(tag);
      });
    });
    return [...tagSet].sort((left, right) => left.localeCompare(right, "th"));
  }, [sortedNotes]);

  const filteredNotes = useMemo(() => {
    return sortedNotes.filter((note) => {
      const matchesSearch = !debouncedSearch
        ? true
        : [note?.title, note?.description, ...(Array.isArray(note?.tags) ? note.tags : [])]
            .map((item) => String(item || "").toLowerCase())
            .join(" ")
            .includes(String(debouncedSearch || "").trim().toLowerCase());
      const matchesStatus = statusFilter === "ALL" ? true : note.status === statusFilter;
      const matchesTag = tagFilter === "ALL" ? true : (Array.isArray(note?.tags) ? note.tags : []).includes(tagFilter);
      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [debouncedSearch, sortedNotes, statusFilter, tagFilter]);

  const totalNotes = notes.length;
  const openNotes = useMemo(
    () => notes.filter((note) => note.status !== NOTE_STATUS_VALUES.DONE).length,
    [notes],
  );
  const doneNotes = useMemo(
    () => notes.filter((note) => note.status === NOTE_STATUS_VALUES.DONE).length,
    [notes],
  );
  const pinnedNotes = useMemo(
    () => notes.filter((note) => note.is_pinned).length,
    [notes],
  );
  const attachmentCount = useMemo(
    () => notes.reduce((sum, note) => sum + (Array.isArray(note?.note_attachments) ? note.note_attachments.length : 0), 0),
    [notes],
  );

  const statusFilterLabel = useMemo(
    () => statusFilterOptions.find((option) => option.value === statusFilter)?.label || statusFilterOptions[0]?.label || "-",
    [statusFilter, statusFilterOptions],
  );

  const setNotesFromRows = useCallback((rows) => {
    setNotes(sortWorkNotes(Array.isArray(rows) ? rows : []));
  }, []);

  const mergeNoteRecord = useCallback((nextNote) => {
    if (!nextNote?.id) return;

    setNotes((current) => {
      const hasExisting = current.some((note) => note.id === nextNote.id);
      const nextRows = hasExisting
        ? current.map((note) => (note.id === nextNote.id ? nextNote : note))
        : [nextNote, ...current];
      return sortWorkNotes(nextRows);
    });
  }, []);

  const resetForm = useCallback(() => {
    revokePendingFiles(pendingFilesRef.current);
    pendingFilesRef.current = [];
    setPendingFiles([]);
    setEditingNoteId(null);
    setInitialChecklistItems([]);
    setRemovedExistingAttachments([]);
    setFormData(buildEmptyForm());
    setFormError("");
    setPreviewAttachment(null);
  }, []);

  const loadNotesData = useCallback(
    async (targetUserId, { silent = false } = {}) => {
      if (!targetUserId) return;
      if (!silent) setLoading(true);

      const { data, error } = await loadWorkNotes(targetUserId);

      if (error) {
        console.error("Load work notes error:", error);
        setNotes([]);
        setLoadError(
          isWorkNotesSchemaError(error)
            ? tt("schemaLoadError")
            : error?.message || tt("loadError"),
        );
      } else {
        setNotesFromRows(data);
        setLoadError("");
      }

      if (!silent) setLoading(false);
    },
    [setNotesFromRows, tt],
  );

  const setupRealtime = useCallback(
    (targetUserId) => {
      if (!targetUserId) return;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = supabase
        .channel(`work-notes-${targetUserId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notes",
            filter: `user_id=eq.${targetUserId}`,
          },
          () => {
            loadNotesData(targetUserId, { silent: true });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "note_checklists",
            filter: `user_id=eq.${targetUserId}`,
          },
          () => {
            loadNotesData(targetUserId, { silent: true });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "note_attachments",
            filter: `user_id=eq.${targetUserId}`,
          },
          () => {
            loadNotesData(targetUserId, { silent: true });
          },
        )
        .subscribe();
    },
    [loadNotesData],
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          navigate("/", { replace: true });
          return;
        }

        const nextUserId = session.user.id;
        if (!mounted) return;

        setUserId(nextUserId);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, department, position, role")
          .eq("id", nextUserId)
          .maybeSingle();

        if (mounted) {
          setProfile(profileData || null);
        }

        await loadNotesData(nextUserId);
        setupRealtime(nextUserId);
      } catch (error) {
        console.error("Init work notes error:", error);
        if (mounted) {
          setLoadError(error?.message || tt("initError"));
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [loadNotesData, navigate, setupRealtime, tt]);

  const appendPendingFiles = useCallback((incomingFiles) => {
    const safeFiles = Array.from(incomingFiles || []).filter(Boolean);
    if (safeFiles.length === 0) return;

    const oversizedFiles = safeFiles.filter((file) => Number(file?.size || 0) > MAX_ATTACHMENT_SIZE);
    const acceptedFiles = safeFiles.filter((file) => Number(file?.size || 0) <= MAX_ATTACHMENT_SIZE);

    if (oversizedFiles.length > 0) {
      toast.error(tt("fileTooLarge", { name: oversizedFiles[0].name }));
    }

    if (acceptedFiles.length === 0) return;

    setPendingFiles((current) => [...current, ...acceptedFiles.map(buildPendingFileEntry)]);
    setFormError("");
  }, [tt]);

  useEffect(() => {
    const handlePaste = (event) => {
      const files = Array.from(event.clipboardData?.items || [])
        .filter((item) => item.kind === "file" && String(item.type || "").toLowerCase().startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (files.length === 0) return;

      appendPendingFiles(files);
      toast.success(tt("pastedFiles", { count: files.length }));
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [appendPendingFiles, tt]);

  const handleRefresh = useCallback(async () => {
    if (!userId) return;

    try {
      setRefreshing(true);
      await loadNotesData(userId, { silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadNotesData, userId]);

  const handleExport = useCallback(async () => {
    if (filteredNotes.length === 0) {
      toast.error(tt("noExportItems"));
      return;
    }

    try {
      setExporting(true);
      await exportWorkNotesToExcel({
        notes: filteredNotes,
        profile,
        filters: {
          statusLabel: statusFilterLabel,
          tagLabel: tagFilter === "ALL" ? tt("allTags") : tagFilter,
          search: debouncedSearch,
        },
      });
      toast.success(tt("exportSuccess"));
    } catch (error) {
      console.error("Export work notes error:", error);
      toast.error(error?.message || tt("exportFailed"));
    } finally {
      setExporting(false);
    }
  }, [debouncedSearch, filteredNotes, profile, statusFilterLabel, tagFilter, tt]);

  const handleFieldChange = useCallback((field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFormError("");
  }, []);

  const handleAddChecklistRow = useCallback(() => {
    setFormData((current) => ({
      ...current,
      checklists: [...current.checklists, createChecklistDraft()],
    }));
  }, []);

  const handleChecklistFieldChange = useCallback((itemKey, patch) => {
    setFormData((current) => ({
      ...current,
      checklists: current.checklists.map((item) => {
        const currentKey = item.id ?? item.tempId;
        return currentKey === itemKey ? { ...item, ...patch } : item;
      }),
    }));
  }, []);

  const handleChecklistRemove = useCallback((itemKey) => {
    setFormData((current) => ({
      ...current,
      checklists: current.checklists.filter((item) => (item.id ?? item.tempId) !== itemKey),
    }));
  }, []);

  const handleSelectFiles = useCallback((files) => {
    appendPendingFiles(files);
  }, [appendPendingFiles]);

  const handleExistingAttachmentRemove = useCallback((attachment) => {
    setRemovedExistingAttachments((current) => (
      current.some((item) => item.id === attachment?.id) ? current : [...current, attachment]
    ));
    setFormData((current) => ({
      ...current,
      attachments: current.attachments.filter((item) => item.id !== attachment?.id),
    }));
  }, []);

  const handlePendingFileRemove = useCallback((fileId) => {
    setPendingFiles((current) => {
      const removedFile = current.find((item) => item.id === fileId);
      if (removedFile) revokePendingFiles([removedFile]);
      return current.filter((item) => item.id !== fileId);
    });
  }, []);

  const handleEdit = useCallback((note) => {
    revokePendingFiles(pendingFilesRef.current);
    pendingFilesRef.current = [];
    setPendingFiles([]);
    setEditingNoteId(note.id);
    setInitialChecklistItems(Array.isArray(note?.note_checklists) ? note.note_checklists : []);
    setRemovedExistingAttachments([]);
    setFormData(buildFormFromNote(note));
    setFormError("");
    setPreviewAttachment(null);
    window.requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleDelete = useCallback(
    async (note) => {
      if (!userId || !note?.id) return;

      const confirmed = window.confirm(tt("deleteConfirm"));
      if (!confirmed) return;

      try {
        const { error } = await deleteWorkNote(note.id, userId);
        if (error) throw error;

        setNotes((current) => current.filter((item) => item.id !== note.id));
        if (editingNoteId === note.id) {
          resetForm();
        }

        if (Array.isArray(note?.note_attachments) && note.note_attachments.length > 0) {
          removeWorkNoteAttachmentFiles(note.note_attachments).catch((cleanupError) => {
            console.warn("Cleanup deleted work note attachments error:", cleanupError);
          });
        }

        toast.success(tt("deleteSuccess"));
      } catch (error) {
        console.error("Delete work note error:", error);
        toast.error(
          isWorkNotesSchemaError(error)
            ? tt("schemaLoadError")
            : error?.message || tt("deleteFailed"),
        );
      }
    },
    [editingNoteId, resetForm, tt, userId],
  );

  const handleTogglePin = useCallback(
    async (note) => {
      if (!userId || !note?.id) return;

      const { data, error } = await toggleWorkNotePin(note, userId);
      if (error) {
        console.error("Toggle work note pin error:", error);
        toast.error(error?.message || tt("togglePinFailed"));
        return;
      }

      mergeNoteRecord(data);
    },
    [mergeNoteRecord, tt, userId],
  );

  const handleQuickStatusChange = useCallback(
    async (note, nextStatus) => {
      if (!userId || !note?.id) return;

      const { data, error } = await updateWorkNoteStatus(note, userId, nextStatus);
      if (error) {
        console.error("Quick update work note status error:", error);
        toast.error(error?.message || tt("quickStatusFailed"));
        return;
      }

      mergeNoteRecord(data);
    },
    [mergeNoteRecord, tt, userId],
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!userId || saving) return;

      const title = String(formData.title || "").trim();
      if (!title || !formData.note_date) {
        setFormError(tt("requiredError"));
        return;
      }

      const tags = normalizeTags(formData.tagsInput);
      const payload = {
        user_id: userId,
        title,
        description: String(formData.description || "").trim() || null,
        note_date: formData.note_date,
        note_time: String(formData.note_time || "").trim() || null,
        priority: ["low", "medium", "high"].includes(formData.priority) ? formData.priority : "medium",
        status: normalizeStatus(formData.status),
        reminder_enabled: Boolean(formData.reminder_enabled),
        is_pinned: Boolean(formData.is_pinned),
        tag: formatTags(tags) || null,
        tags,
      };

      let baseWriteSucceeded = false;

      try {
        setSaving(true);
        setFormError("");

        const noteResult = editingNoteId
          ? await updateWorkNote(editingNoteId, userId, payload)
          : await createWorkNote(payload);

        if (noteResult.error) throw noteResult.error;

        const noteId = noteResult.data?.id;
        if (!noteId) throw new Error(tt("noNoteId"));

        baseWriteSucceeded = true;

        await syncNoteChecklistItems({
          noteId,
          userId,
          initialItems: editingNoteId ? initialChecklistItems : [],
          nextItems: formData.checklists,
        });

        if (removedExistingAttachments.length > 0) {
          await deleteWorkNoteAttachments({
            attachments: removedExistingAttachments,
            userId,
          });
        }

        const filesToUpload = pendingFiles.map((item) => item.file);
        if (filesToUpload.length > 0) {
          await uploadWorkNoteAttachments({
            noteId,
            userId,
            files: filesToUpload,
          });
        }

        await loadNotesData(userId, { silent: true });
        resetForm();
        toast.success(editingNoteId ? tt("updateSuccess") : tt("createSuccess"));
      } catch (error) {
        console.error("Save work note error:", error);

        if (baseWriteSucceeded) {
          await loadNotesData(userId, { silent: true });
        }

        setFormError(
          isWorkNotesSchemaError(error)
            ? tt("saveSchemaError")
            : error?.message || tt("saveFailed"),
        );
      } finally {
        setSaving(false);
      }
    },
    [
      editingNoteId,
      formData,
      initialChecklistItems,
      loadNotesData,
      pendingFiles,
      removedExistingAttachments,
      resetForm,
      saving,
      tt,
      userId,
    ],
  );

  return (
    <div className="app-theme app-page-bg min-h-screen text-slate-800">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="app-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="app-btn-secondary mt-0.5 inline-flex items-center gap-2"
              >
                <ArrowLeft size={15} />
                {tt("back")}
              </button>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-1 text-[11px] font-bold text-[var(--brand-primary)]">
                  <FileText size={13} />
                  {tt("badge")}
                </div>
                <h1 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">{tt("title")}</h1>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">{tt("subtitle")}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {profile?.full_name || tt("unknownUser")}
              </span>
              {profile?.department ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {profile.department}
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="app-btn-secondary inline-flex items-center gap-2 disabled:opacity-60"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                {tt("refresh")}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || filteredNotes.length === 0}
                className="app-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
              >
                <Download size={14} />
                {exporting ? tt("exporting") : tt("export")}
              </button>
            </div>
          </div>
        </header>

        {loadError ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {loadError}
          </div>
        ) : null}

        <section className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryCard icon={FileText} label={tt("allNotes")} value={totalNotes} hint={tt("allNotesHint")} />
          <SummaryCard icon={Clock3} label={tt("open")} value={openNotes} hint={tt("openHint")} />
          <SummaryCard icon={CheckCircle2} label={tt("done")} value={doneNotes} hint={tt("doneHint")} />
          <SummaryCard
            icon={Paperclip}
            label={tt("attachments")}
            value={attachmentCount}
            hint={tt("pinnedHint", { count: pinnedNotes })}
            toneClass="text-rose-600"
          />
        </section>

        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <WorkNotesForm
            formPanelRef={formPanelRef}
            fileInputRef={fileInputRef}
            editingNoteId={editingNoteId}
            formData={formData}
            pendingFiles={pendingFiles}
            saving={saving}
            formError={formError}
            onSubmit={handleSubmit}
            onReset={resetForm}
            onFieldChange={handleFieldChange}
            onAddChecklistRow={handleAddChecklistRow}
            onChecklistFieldChange={handleChecklistFieldChange}
            onChecklistRemove={handleChecklistRemove}
            onSelectFiles={handleSelectFiles}
            onExistingAttachmentRemove={handleExistingAttachmentRemove}
            onPendingFileRemove={handlePendingFileRemove}
            onPreviewAttachment={setPreviewAttachment}
          />

          <div className="space-y-5">
            <div className="app-surface rounded-3xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{tt("liveSummary")}</p>
                  <h2 className="mt-2 text-lg font-black text-slate-900">{tt("visibleItems", { count: filteredNotes.length })}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {tt("filterSummary", {
                      status: statusFilterLabel,
                      tag: tagFilter === "ALL" ? tt("allTags") : tagFilter || "-",
                    })}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                  <Pin size={13} />
                  {tt("pinnedCount", { count: pinnedNotes })}
                </div>
              </div>
            </div>

            <WorkNotesList
              loading={loading}
              notes={filteredNotes}
              searchInput={searchInput}
              statusFilter={statusFilter}
              tagFilter={tagFilter}
              tagOptions={tagOptions}
              onSearchChange={setSearchInput}
              onStatusFilterChange={setStatusFilter}
              onTagFilterChange={setTagFilter}
              onTogglePin={handleTogglePin}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onQuickStatusChange={handleQuickStatusChange}
              onPreviewAttachment={setPreviewAttachment}
            />
          </div>
        </section>
      </div>

      <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
    </div>
  );
}
