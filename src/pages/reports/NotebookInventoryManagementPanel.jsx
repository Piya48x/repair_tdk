import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Laptop, PencilLine, Plus, RefreshCw, Save, Search, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import {
  NOTEBOOK_STATUS,
  isNotebookPermissionDenied,
  isNotebookSchemaError,
  removeNotebookAssetImage,
  uploadNotebookAssetImage,
} from "../../services/notebookBorrowService";

const NOTEBOOK_INVENTORY_TRANSLATIONS = {
  th: {
    status: {
      available: "พร้อมให้ยืม",
      borrowed: "ถูกยืม",
      repair: "ซ่อม",
      stale: "สถานะค้าง",
    },
    form: {
      addTitle: "เพิ่ม notebook",
      editTitle: "แก้ไข notebook",
      subtitle: "สถานะที่แก้ที่นี่จะถูกใช้ต่อในหน้า Notebook Center",
      cancel: "ยกเลิก",
      readOnly:
        "สิทธิ์ปัจจุบันเป็นแบบดูอย่างเดียว การเพิ่ม แก้ไข ลบ และอัปโหลดรูป notebook เปิดให้เฉพาะ admin / IT Support / IT Manager",
      assetCode: "รหัส notebook",
      model: "รุ่น / รายละเอียด",
      workflowLocked:
        "เครื่องนี้กำลังอยู่ใน workflow ยืม-คืนจริง สถานะถูกยืมจะแก้ได้จากหน้าอนุมัติของ IT เท่านั้น",
      borrowedAuto: "สถานะ 'ถูกยืม' จะถูกตั้งอัตโนมัติเมื่อ IT อนุมัติคำขอยืม",
      staleHelp:
        "รายการนี้ค้างสถานะถูกยืม แต่ไม่พบผู้ยืมในระบบ ให้เปลี่ยนเป็น พร้อมให้ยืม หรือ ซ่อม เพื่อปลดล็อกหน้า Notebook Center",
      showInCenter: "แสดงใน Notebook Center",
      showHint: "ถ้าต้องการให้มี notebook ให้ยืม 3 เครื่อง ให้เปิดตัวเลือกนี้ไว้ 3 รายการที่ต้องการแสดง",
      notes: "หมายเหตุเพิ่มเติม",
      noImage: "ยังไม่มีรูป notebook",
      uploadImage: "อัปโหลดรูป",
      changeImage: "เปลี่ยนรูป",
      deleteImage: "ลบรูป",
      saving: "กำลังบันทึก...",
      addSubmit: "เพิ่ม notebook",
      editSubmit: "บันทึกการแก้ไข",
    },
    list: {
      title: "รายการ notebook ({{count}})",
      subtitle: "ใช้ร่วมกับหน้า /notebook-center และอัปเดตแบบ realtime โดยแสดงเฉพาะรายการที่เปิดใน Notebook Center",
      search: "ค้นหารหัส รุ่น หรือหมายเหตุ...",
      refresh: "รีเฟรช",
      total: "ทั้งหมด",
      visible: "แสดงใน Center",
      available: "พร้อมให้ยืม",
      borrowed: "ถูกยืม",
      repair: "ซ่อม",
      staleWarning:
        "พบ notebook สถานะค้าง {{count}} เครื่อง (ถูกยืมแต่ไม่ผูกผู้ยืม) ให้แก้เป็น พร้อมให้ยืม หรือ ซ่อม เพื่อปลดล็อกการใช้งาน",
      allStatuses: "ทุกสถานะ",
      resetFilters: "ล้างตัวกรอง",
      tableNotebook: "Notebook",
      tableStatus: "สถานะ",
      tableImage: "ภาพ",
      tableUpdated: "อัปเดตล่าสุด",
      tableActions: "การทำงาน",
      loading: "กำลังโหลด notebook...",
      noData: "ไม่พบ notebook",
      centerLabel: "Notebook Center",
      visibleText: "แสดง",
      hiddenText: "ซ่อน",
      staleText: "สถานะค้าง: ไม่พบ current user ในระบบ",
      noImage: "ไม่มีรูป",
      updating: "กำลังอัปเดต...",
      hideFromCenter: "ไม่พร้อมให้ยืม",
      showInCenter: "พร้อมให้ยืม",
      edit: "แก้ไข",
      deleting: "กำลังลบ...",
      delete: "ลบ",
    },
    toast: {
      schemaMissing: "schema notebook ยังไม่อัปเดต กรุณารัน migration ล่าสุด",
      permissionView: "ไม่มีสิทธิ์เข้าถึง notebook inventory",
      loadError: "โหลดรายการ notebook ไม่สำเร็จ",
      manageOnly: "เฉพาะ admin / IT Support / IT Manager เท่านั้นที่จัดการ notebook inventory ได้",
      deleteOnly: "เฉพาะ admin / IT Support / IT Manager เท่านั้นที่ลบ notebook ได้",
      enabled: "เปิด {{code}} ให้แสดงใน Notebook Center แล้ว",
      disabled: "ตั้ง {{code}} เป็นไม่พร้อมให้ยืมแล้ว",
      schemaInventoryMissing: "schema notebook inventory ยังไม่อัปเดต",
      permissionEdit: "สิทธิ์ของบัญชีนี้ไม่พอสำหรับแก้ไข notebook",
      availabilityError: "อัปเดตสถานะการให้ยืมไม่สำเร็จ",
      required: "กรุณากรอกรหัส notebook และรุ่น",
      borrowedWorkflowOnly: "สถานะ 'ถูกยืม' จะถูกตั้งจาก workflow ยืม-คืนเท่านั้น",
      updated: "อัปเดต notebook แล้ว",
      created: "เพิ่ม notebook แล้ว",
      duplicate: "รหัส {{code}} ถูกใช้งานแล้ว",
      saveError: "บันทึก notebook ไม่สำเร็จ",
      deleteConfirm:
        "ยืนยันลบ notebook {{code}} ?{{borrowedMessage}}\nระบบจะลบประวัติการยืมที่ผูกกับเครื่องนี้ด้วย",
      borrowedDeleteNote: "\nรายการนี้อาจมีประวัติการยืมค้างอยู่",
      deleted: "ลบ notebook แล้ว",
      permissionDelete: "ไม่มีสิทธิ์ลบ notebook",
      deleteError: "ลบ notebook ไม่สำเร็จ",
    },
  },
  en: {
    status: {
      available: "Available",
      borrowed: "Borrowed",
      repair: "Repair",
      stale: "Stale status",
    },
    form: {
      addTitle: "Add notebook",
      editTitle: "Edit notebook",
      subtitle: "Changes here are used by the Notebook Center page.",
      cancel: "Cancel",
      readOnly:
        "Your current role is view-only. Adding, editing, deleting, and image uploads are limited to admin / IT Support / IT Manager.",
      assetCode: "Notebook code",
      model: "Model / details",
      workflowLocked:
        "This notebook is in an active borrow-return workflow. Borrowed status can only be changed from IT approval.",
      borrowedAuto: "Borrowed status is set automatically when IT approves a borrow request.",
      staleHelp:
        "This notebook is marked borrowed but has no linked borrower. Change it to Available or Repair to unlock Notebook Center.",
      showInCenter: "Show in Notebook Center",
      showHint: "If you want 3 notebooks available for borrowing, keep this enabled on the 3 records you want to show.",
      notes: "Additional notes",
      noImage: "No notebook image yet",
      uploadImage: "Upload image",
      changeImage: "Change image",
      deleteImage: "Delete image",
      saving: "Saving...",
      addSubmit: "Add notebook",
      editSubmit: "Save changes",
    },
    list: {
      title: "Notebook list ({{count}})",
      subtitle: "Shared with /notebook-center and updated in real time. Only records enabled for Notebook Center are shown there.",
      search: "Search code, model, or notes...",
      refresh: "Refresh",
      total: "Total",
      visible: "Shown in Center",
      available: "Available",
      borrowed: "Borrowed",
      repair: "Repair",
      staleWarning:
        "{{count}} notebook has a stale borrowed status with no linked borrower. Change it to Available or Repair to unlock usage.",
      allStatuses: "All statuses",
      resetFilters: "Reset filters",
      tableNotebook: "Notebook",
      tableStatus: "Status",
      tableImage: "Image",
      tableUpdated: "Last updated",
      tableActions: "Actions",
      loading: "Loading notebooks...",
      noData: "No notebooks found",
      centerLabel: "Notebook Center",
      visibleText: "Shown",
      hiddenText: "Hidden",
      staleText: "Stale status: current user is missing",
      noImage: "No image",
      updating: "Updating...",
      hideFromCenter: "Make unavailable",
      showInCenter: "Make available",
      edit: "Edit",
      deleting: "Deleting...",
      delete: "Delete",
    },
    toast: {
      schemaMissing: "Notebook schema is not updated. Please run the latest migration.",
      permissionView: "You do not have access to notebook inventory",
      loadError: "Unable to load notebooks",
      manageOnly: "Only admin / IT Support / IT Manager can manage notebook inventory",
      deleteOnly: "Only admin / IT Support / IT Manager can delete notebooks",
      enabled: "{{code}} is now shown in Notebook Center",
      disabled: "{{code}} is now unavailable for borrowing",
      schemaInventoryMissing: "Notebook inventory schema is not updated",
      permissionEdit: "This account cannot edit notebooks",
      availabilityError: "Unable to update borrowing availability",
      required: "Please enter a notebook code and model",
      borrowedWorkflowOnly: "Borrowed status is set by the borrow-return workflow only",
      updated: "Notebook updated",
      created: "Notebook added",
      duplicate: "Code {{code}} is already in use",
      saveError: "Unable to save notebook",
      deleteConfirm:
        "Delete notebook {{code}}?{{borrowedMessage}}\nBorrow history linked to this notebook will also be removed.",
      borrowedDeleteNote: "\nThis item may have pending borrow history",
      deleted: "Notebook deleted",
      permissionDelete: "You do not have permission to delete notebooks",
      deleteError: "Unable to delete notebook",
    },
  },
};

const NOTEBOOK_STATUS_OPTIONS = [
  { value: NOTEBOOK_STATUS.AVAILABLE, label: "พร้อมให้ยืม" },
  { value: NOTEBOOK_STATUS.BORROWED, label: "ถูกยืม" },
  { value: NOTEBOOK_STATUS.REPAIR, label: "ซ่อม" },
];

const NOTEBOOK_MANAGER_ROLES = new Set(["admin", "it_support", "it_manager"]);

const EMPTY_NOTEBOOK_FORM = {
  asset_code: "",
  model: "",
  status: NOTEBOOK_STATUS.AVAILABLE,
  show_in_notebook_center: true,
  notes: "",
};

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeOptionalText(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeNotebookStatus(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (NOTEBOOK_STATUS_OPTIONS.some((item) => item.value === normalized)) return normalized;
  return NOTEBOOK_STATUS.AVAILABLE;
}

function normalizeNotebookCenterVisibility(value) {
  return value !== false;
}

function hasNotebookBorrowOwner(notebook) {
  return normalizeText(notebook?.current_user_id) !== "";
}

function isNotebookBorrowStateInconsistent(notebook) {
  return normalizeNotebookStatus(notebook?.status) === NOTEBOOK_STATUS.BORROWED && !hasNotebookBorrowOwner(notebook);
}

function isNotebookBorrowWorkflowLocked(notebook) {
  return normalizeNotebookStatus(notebook?.status) === NOTEBOOK_STATUS.BORROWED && hasNotebookBorrowOwner(notebook);
}

function getNotebookStatusChipClass(notebook) {
  if (isNotebookBorrowStateInconsistent(notebook)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  const normalized = normalizeNotebookStatus(notebook?.status);
  if (normalized === NOTEBOOK_STATUS.AVAILABLE) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === NOTEBOOK_STATUS.BORROWED) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getNotebookStatusLabel(notebook, statusLabels = {}) {
  if (isNotebookBorrowStateInconsistent(notebook)) {
    return statusLabels.stale || "Stale status";
  }

  const normalized = normalizeNotebookStatus(notebook?.status);
  return statusLabels[normalized] || NOTEBOOK_STATUS_OPTIONS.find((statusItem) => statusItem.value === normalized)?.label || "-";
}

function formatDateTime(value, locale = "th-TH") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isBlobUrl(value) {
  return typeof value === "string" && value.startsWith("blob:");
}

function revokePreviewUrl(value) {
  if (isBlobUrl(value)) {
    URL.revokeObjectURL(value);
  }
}

export default function NotebookInventoryManagementPanel({ userRole = "", createRequest = 0, onCreateRequestHandled }) {
  const { language, tt } = useScopedI18n(NOTEBOOK_INVENTORY_TRANSLATIONS);
  const imageInputRef = useRef(null);
  const canManageNotebooks = NOTEBOOK_MANAGER_ROLES.has(normalizeText(userRole).toLowerCase());
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [availabilityActionId, setAvailabilityActionId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState(EMPTY_NOTEBOOK_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const locale = language === "th" ? "th-TH" : "en-US";
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formatNumber = useCallback(
    (value) => numberFormatter.format(Number(value || 0)),
    [numberFormatter],
  );
  const notebookStatusOptions = useMemo(
    () =>
      NOTEBOOK_STATUS_OPTIONS.map((item) => ({
        ...item,
        label: tt(`status.${item.value}`),
      })),
    [tt],
  );
  const notebookManualStatusOptions = useMemo(
    () => notebookStatusOptions.filter((item) => item.value !== NOTEBOOK_STATUS.BORROWED),
    [notebookStatusOptions],
  );
  const notebookStatusLabels = useMemo(
    () => ({
      ...Object.fromEntries(notebookStatusOptions.map((item) => [item.value, item.label])),
      stale: tt("status.stale"),
    }),
    [notebookStatusOptions, tt],
  );

  const editingNotebook = useMemo(
    () => notebooks.find((item) => String(item?.id || "") === String(editingId || "")) || null,
    [editingId, notebooks],
  );
  const isEditingBorrowedFromWorkflow = isNotebookBorrowWorkflowLocked(editingNotebook);
  const isEditingStaleBorrowed = isNotebookBorrowStateInconsistent(editingNotebook);

  const loadNotebooks = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase.from("notebooks").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      setNotebooks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load notebooks error:", error);
      if (isNotebookSchemaError(error)) {
        toast.error(tt("toast.schemaMissing"));
      } else if (isNotebookPermissionDenied(error)) {
        toast.error(tt("toast.permissionView"));
      } else {
        toast.error(error?.message || tt("toast.loadError"));
      }
      setNotebooks([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tt]);

  useEffect(() => {
    void loadNotebooks();
  }, [loadNotebooks]);

  useEffect(() => {
    const channel = supabase
      .channel("notebook-inventory-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notebooks" }, () => {
        void loadNotebooks({ silent: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "borrow_logs" }, () => {
        void loadNotebooks({ silent: true });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotebooks]);

  useEffect(() => {
    return () => revokePreviewUrl(imagePreview);
  }, [imagePreview]);

  const filteredNotebooks = useMemo(() => {
    const keyword = normalizeText(searchQuery).toLowerCase();
    return notebooks.filter((item) => {
      const statusMatched = statusFilter === "all" || normalizeNotebookStatus(item?.status) === statusFilter;
      if (!statusMatched) return false;
      if (!keyword) return true;

      const source = [
        item?.asset_code,
        item?.model,
        item?.status,
        item?.notes,
      ]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");
      return source.includes(keyword);
    });
  }, [notebooks, searchQuery, statusFilter]);

  const summary = useMemo(
    () =>
      notebooks.reduce(
        (acc, item) => {
          acc.total += 1;
          const status = normalizeNotebookStatus(item?.status);
          if (status === NOTEBOOK_STATUS.AVAILABLE) acc.available += 1;
          if (status === NOTEBOOK_STATUS.BORROWED) acc.borrowed += 1;
          if (status === NOTEBOOK_STATUS.REPAIR) acc.repair += 1;
          if (normalizeNotebookCenterVisibility(item?.show_in_notebook_center)) acc.visibleInCenter += 1;
          return acc;
        },
        { total: 0, available: 0, borrowed: 0, repair: 0, visibleInCenter: 0 },
      ),
    [notebooks],
  );

  const staleBorrowedCount = useMemo(
    () => notebooks.filter((item) => isNotebookBorrowStateInconsistent(item)).length,
    [notebooks],
  );

  const resetForm = useCallback(() => {
    setEditingId("");
    setFormData(EMPTY_NOTEBOOK_FORM);
    setImageFile(null);
    setRemoveImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setImagePreview((prev) => {
      revokePreviewUrl(prev);
      return "";
    });
  }, []);

  const handleEditNotebook = useCallback((item) => {
    setEditingId(item.id);
    setFormData({
      asset_code: item?.asset_code || "",
      model: item?.model || "",
      status: normalizeNotebookStatus(item?.status),
      show_in_notebook_center: normalizeNotebookCenterVisibility(item?.show_in_notebook_center),
      notes: item?.notes || "",
    });
    setImageFile(null);
    setRemoveImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setImagePreview((prev) => {
      revokePreviewUrl(prev);
      return normalizeText(item?.asset_image_url);
    });
    setFormOpen(true);
  }, []);

  const handleOpenNewNotebook = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const handleCloseNotebookForm = useCallback(() => {
    if (saving) return;
    resetForm();
    setFormOpen(false);
  }, [resetForm, saving]);

  useEffect(() => {
    if (!createRequest) return;
    if (canManageNotebooks) {
      handleOpenNewNotebook();
    }
    onCreateRequestHandled?.();
  }, [canManageNotebooks, createRequest, handleOpenNewNotebook, onCreateRequestHandled]);

  const handleSelectImage = useCallback((file) => {
    if (!file) return;
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview((prev) => {
      revokePreviewUrl(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const handleClearImage = useCallback(() => {
    setImageFile(null);
    setRemoveImage(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setImagePreview((prev) => {
      revokePreviewUrl(prev);
      return "";
    });
  }, []);

  const handleToggleNotebookCenterVisibility = useCallback(
    async (item) => {
      if (!canManageNotebooks) {
        toast.error(tt("toast.manageOnly"));
        return;
      }

      const rowId = String(item?.id || "");
      if (!rowId || availabilityActionId === rowId) return;

      const nextVisible = !normalizeNotebookCenterVisibility(item?.show_in_notebook_center);
      setAvailabilityActionId(rowId);
      try {
        const { error } = await supabase
          .from("notebooks")
          .update({ show_in_notebook_center: nextVisible })
          .eq("id", item.id);
        if (error) throw error;

        setNotebooks((prev) =>
          prev.map((row) =>
            String(row?.id || "") === rowId
              ? { ...row, show_in_notebook_center: nextVisible }
              : row,
          ),
        );
        if (String(editingId || "") === rowId) {
          setFormData((prev) => ({ ...prev, show_in_notebook_center: nextVisible }));
        }
        toast.success(
          nextVisible
            ? tt("toast.enabled", { code: item?.asset_code || "notebook" })
            : tt("toast.disabled", { code: item?.asset_code || "notebook" }),
        );
      } catch (error) {
        console.error("Toggle notebook center visibility error:", error);
        if (isNotebookSchemaError(error)) {
          toast.error(tt("toast.schemaInventoryMissing"));
        } else if (isNotebookPermissionDenied(error)) {
          toast.error(tt("toast.permissionEdit"));
        } else {
          toast.error(error?.message || tt("toast.availabilityError"));
        }
      } finally {
        setAvailabilityActionId("");
      }
    },
    [availabilityActionId, canManageNotebooks, editingId, tt],
  );

  const handleSaveNotebook = useCallback(
    async (event) => {
      event.preventDefault();
      if (!canManageNotebooks) {
        toast.error(tt("toast.manageOnly"));
        return;
      }
      if (saving) return;

      const assetCode = normalizeText(formData.asset_code).toUpperCase();
      const model = normalizeText(formData.model);
      if (!assetCode || !model) {
        toast.error(tt("toast.required"));
        return;
      }

      const currentRow = notebooks.find((item) => String(item?.id || "") === String(editingId || ""));
      const nextStatus = normalizeNotebookStatus(formData.status);
      const canUseBorrowedStatus = isNotebookBorrowWorkflowLocked(currentRow);
      if (nextStatus === NOTEBOOK_STATUS.BORROWED && !canUseBorrowedStatus) {
        toast.error(tt("toast.borrowedWorkflowOnly"));
        return;
      }
      let uploadedAsset = null;
      let nextImageUrl = removeImage ? null : normalizeOptionalText(currentRow?.asset_image_url);
      let nextImageName = removeImage ? null : normalizeOptionalText(currentRow?.asset_image_name);
      let nextImageMimeType = removeImage ? null : normalizeOptionalText(currentRow?.asset_image_mime_type);
      let nextImageSize = removeImage ? null : currentRow?.asset_image_size ?? null;

      setSaving(true);
      try {
        if (imageFile) {
          uploadedAsset = await uploadNotebookAssetImage(imageFile, assetCode);
          nextImageUrl = uploadedAsset.publicUrl || null;
          nextImageName = imageFile.name || null;
          nextImageMimeType = imageFile.type || null;
          nextImageSize = Number(imageFile.size || 0) || null;
        }

        const payload = {
          asset_code: assetCode,
          model,
          status: nextStatus,
          show_in_notebook_center: Boolean(formData.show_in_notebook_center),
          notes: normalizeOptionalText(formData.notes),
          asset_image_url: nextImageUrl,
          asset_image_name: nextImageName,
          asset_image_mime_type: nextImageMimeType,
          asset_image_size: nextImageSize,
        };

        if (editingId) {
          const { error } = await supabase.from("notebooks").update(payload).eq("id", editingId);
          if (error) throw error;
          toast.success(tt("toast.updated"));
        } else {
          const { error } = await supabase.from("notebooks").insert(payload);
          if (error) throw error;
          toast.success(tt("toast.created"));
        }

        const previousImageUrl = normalizeText(currentRow?.asset_image_url);
        if ((removeImage || imageFile) && previousImageUrl && previousImageUrl !== nextImageUrl) {
          void removeNotebookAssetImage(previousImageUrl);
        }

        resetForm();
        setFormOpen(false);
        await loadNotebooks({ silent: true });
      } catch (error) {
        if (uploadedAsset?.publicUrl) {
          void removeNotebookAssetImage(uploadedAsset.publicUrl);
        }
        console.error("Save notebook inventory error:", error);
        if (String(error?.code || "") === "23505") {
          toast.error(tt("toast.duplicate", { code: assetCode }));
        } else if (isNotebookSchemaError(error)) {
          toast.error(tt("toast.schemaInventoryMissing"));
        } else if (isNotebookPermissionDenied(error)) {
          toast.error(tt("toast.permissionEdit"));
        } else {
          toast.error(error?.message || tt("toast.saveError"));
        }
      } finally {
        setSaving(false);
      }
    },
    [canManageNotebooks, editingId, formData, imageFile, loadNotebooks, notebooks, removeImage, resetForm, saving, tt],
  );

  const handleDeleteNotebook = useCallback(
    async (item) => {
      if (!canManageNotebooks) {
        toast.error(tt("toast.deleteOnly"));
        return;
      }
      if (actionId && actionId === item.id) return;

      const borrowedMessage =
        normalizeNotebookStatus(item?.status) === NOTEBOOK_STATUS.BORROWED
          ? tt("toast.borrowedDeleteNote")
          : "";
      const confirmed = window.confirm(
        tt("toast.deleteConfirm", {
          code: item?.asset_code || "-",
          borrowedMessage,
        }),
      );
      if (!confirmed) return;

      setActionId(item.id);
      try {
        const imageUrl = normalizeText(item?.asset_image_url);
        const { error } = await supabase.from("notebooks").delete().eq("id", item.id);
        if (error) throw error;

        if (imageUrl) {
          void removeNotebookAssetImage(imageUrl);
        }

        setNotebooks((prev) => prev.filter((row) => row.id !== item.id));
        if (String(editingId || "") === String(item.id)) {
          resetForm();
        }
        toast.success(tt("toast.deleted"));
      } catch (error) {
        console.error("Delete notebook inventory error:", error);
        if (isNotebookPermissionDenied(error)) {
          toast.error(tt("toast.permissionDelete"));
        } else {
          toast.error(error?.message || tt("toast.deleteError"));
        }
      } finally {
        setActionId("");
      }
    },
    [actionId, canManageNotebooks, editingId, resetForm, tt],
  );

  return (
    <section className="space-y-5">
      {formOpen ? (
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5" onClick={handleCloseNotebookForm}>
      <article className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-white px-5 py-4 shadow-sm">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {editingId ? tt("form.editTitle") : tt("form.addTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{tt("form.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={handleCloseNotebookForm}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={14} />
            {tt("form.cancel")}
          </button>
        </div>

        {!canManageNotebooks ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {tt("form.readOnly")}
          </div>
        ) : null}

        <form className="space-y-4 p-5" onSubmit={handleSaveNotebook}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={formData.asset_code}
              onChange={(event) => setFormData((prev) => ({ ...prev, asset_code: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder={`${tt("form.assetCode")} *`}
              required
              disabled={!canManageNotebooks}
            />
            <input
              value={formData.model}
              onChange={(event) => setFormData((prev) => ({ ...prev, model: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder={`${tt("form.model")} *`}
              required
              disabled={!canManageNotebooks}
            />
          </div>

          <div>
            <select
              value={formData.status}
              onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              disabled={!canManageNotebooks || isEditingBorrowedFromWorkflow}
            >
              {((isEditingBorrowedFromWorkflow || isEditingStaleBorrowed)
                ? notebookStatusOptions
                : notebookManualStatusOptions).map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                  disabled={item.value === NOTEBOOK_STATUS.BORROWED && !isEditingBorrowedFromWorkflow}
                >
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              {isEditingBorrowedFromWorkflow
                ? tt("form.workflowLocked")
                : tt("form.borrowedAuto")}
            </p>
            {isEditingStaleBorrowed ? (
              <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {tt("form.staleHelp")}
              </div>
            ) : null}
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <input
              type="checkbox"
              checked={Boolean(formData.show_in_notebook_center)}
              onChange={(event) => setFormData((prev) => ({ ...prev, show_in_notebook_center: event.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-slate-300"
              disabled={!canManageNotebooks}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-800">{tt("form.showInCenter")}</span>
              <span className="mt-1 block text-xs text-slate-500">
                {tt("form.showHint")}
              </span>
            </span>
          </label>

          <textarea
            value={formData.notes}
            onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
            className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder={tt("form.notes")}
            disabled={!canManageNotebooks}
          />

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white">
              {imagePreview ? (
                <img src={imagePreview} alt={formData.asset_code || "Notebook"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
                  {tt("form.noImage")}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={!canManageNotebooks}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload size={16} />
                {imagePreview ? tt("form.changeImage") : tt("form.uploadImage")}
              </button>
              <button
                type="button"
                onClick={handleClearImage}
                disabled={!canManageNotebooks || (!imagePreview && !imageFile)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                {tt("form.deleteImage")}
              </button>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleSelectImage(event.target.files?.[0] || null)}
            />
          </div>

          <button
            type="submit"
            disabled={!canManageNotebooks || saving}
            className="sticky bottom-0 z-10 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-10px_rgba(15,23,42,0.65)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editingId ? <PencilLine size={16} /> : <Save size={16} />}
            {saving ? tt("form.saving") : editingId ? tt("form.editSubmit") : tt("form.addSubmit")}
          </button>
        </form>
      </article>
      </div>
      ) : null}

      <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Laptop size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900">
                {tt("list.title", { count: formatNumber(filteredNotebooks.length) })}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{tt("list.subtitle")}</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <div className="relative w-full sm:w-[280px]">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                placeholder={tt("list.search")}
              />
            </div>
            <button
              type="button"
              onClick={() => void loadNotebooks()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              {tt("list.refresh")}
            </button>
            <button
              type="button"
              onClick={handleOpenNewNotebook}
              disabled={!canManageNotebooks}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={15} />
              {tt("form.addTitle")}
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-500">{tt("list.total")}</p>
            <p className="text-lg font-black text-slate-900">{formatNumber(summary.total)}</p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-indigo-700">{tt("list.visible")}</p>
            <p className="text-lg font-black text-indigo-900">{formatNumber(summary.visibleInCenter)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-emerald-700">{tt("list.available")}</p>
            <p className="text-lg font-black text-emerald-900">{formatNumber(summary.available)}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-blue-700">{tt("list.borrowed")}</p>
            <p className="text-lg font-black text-blue-900">{formatNumber(summary.borrowed)}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-amber-700">{tt("list.repair")}</p>
            <p className="text-lg font-black text-amber-900">{formatNumber(summary.repair)}</p>
          </div>
        </div>

        {staleBorrowedCount > 0 ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {tt("list.staleWarning", { count: formatNumber(staleBorrowedCount) })}
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">{tt("list.allStatuses")}</option>
            {notebookStatusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {tt("list.resetFilters")}
          </button>
        </div>

        <div className="mt-4 space-y-3 lg:hidden">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">{tt("list.loading")}</div>
          ) : filteredNotebooks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">{tt("list.noData")}</div>
          ) : filteredNotebooks.map((item) => {
            const imageUrl = normalizeText(item?.asset_image_url);
            const isStaleBorrowed = isNotebookBorrowStateInconsistent(item);
            const showInNotebookCenter = normalizeNotebookCenterVisibility(item?.show_in_notebook_center);
            return (
              <article key={`notebook-mobile-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {imageUrl ? <img src={imageUrl} alt={item?.asset_code || "Notebook"} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] font-semibold text-slate-400">{tt("list.noImage")}</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-900">{item?.asset_code || "-"}</h3><p className="mt-1 truncate text-xs text-slate-500">{item?.model || "-"}</p></div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${getNotebookStatusChipClass(item)}`}>{getNotebookStatusLabel(item, notebookStatusLabels)}</span>
                    </div>
                    <p className={`mt-2 text-xs font-semibold ${showInNotebookCenter ? "text-indigo-600" : "text-slate-400"}`}>{tt("list.centerLabel")}: {showInNotebookCenter ? tt("list.visibleText") : tt("list.hiddenText")}</p>
                    {isStaleBorrowed ? <p className="mt-1 text-xs font-semibold text-rose-600">{tt("list.staleText")}</p> : null}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                  <button type="button" onClick={() => void handleToggleNotebookCenterVisibility(item)} disabled={!canManageNotebooks || availabilityActionId === String(item.id || "")} className={`inline-flex items-center justify-center rounded-xl px-2 py-2 text-[10px] font-bold disabled:opacity-60 ${showInNotebookCenter ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{showInNotebookCenter ? tt("list.hideFromCenter") : tt("list.showInCenter")}</button>
                  <button type="button" onClick={() => handleEditNotebook(item)} disabled={!canManageNotebooks} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-2 py-2 text-xs font-bold text-slate-700 disabled:opacity-60"><PencilLine size={13} />{tt("list.edit")}</button>
                  <button type="button" onClick={() => void handleDeleteNotebook(item)} disabled={!canManageNotebooks || actionId === item.id} className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-50 px-2 py-2 text-xs font-bold text-rose-700 disabled:opacity-60"><Trash2 size={13} />{tt("list.delete")}</button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
          <div className="max-h-[calc(100vh-250px)] min-h-[320px] overflow-auto">
          <table className="w-full min-w-[850px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[280px]" />
              <col className="w-[110px]" />
              <col className="w-[90px]" />
              <col className="w-[120px]" />
              <col className="w-[250px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <tr className="border-b border-slate-200 text-[10px] uppercase tracking-[0.04em] text-slate-500">
                <th className="px-3 py-2">{tt("list.tableNotebook")}</th>
                <th className="px-3 py-2">{tt("list.tableStatus")}</th>
                <th className="px-3 py-2">{tt("list.tableImage")}</th>
                <th className="px-3 py-2">{tt("list.tableUpdated")}</th>
                <th className="sticky right-0 z-20 border-l border-slate-200 bg-slate-50 px-3 py-2 text-right">{tt("list.tableActions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    {tt("list.loading")}
                  </td>
                </tr>
              ) : filteredNotebooks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    {tt("list.noData")}
                  </td>
                </tr>
              ) : (
                filteredNotebooks.map((item) => {
                  const imageUrl = normalizeText(item?.asset_image_url);
                  const isStaleBorrowed = isNotebookBorrowStateInconsistent(item);
                  const showInNotebookCenter = normalizeNotebookCenterVisibility(item?.show_in_notebook_center);
                  return (
                    <tr key={item.id} className="group border-b border-slate-100 align-top last:border-b-0 hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-slate-700">
                        <div className="font-semibold text-slate-900">{item?.asset_code || "-"}</div>
                        <div className="truncate text-xs text-slate-500" title={item?.model || "-"}>{item?.model || "-"}</div>
                        {item?.notes ? <div className="mt-1 truncate text-[10px] text-slate-500" title={item.notes}>{item.notes}</div> : null}
                        <div className={`mt-1 text-xs font-semibold ${showInNotebookCenter ? "text-indigo-600" : "text-slate-400"}`}>
                          {tt("list.centerLabel")}: {showInNotebookCenter ? tt("list.visibleText") : tt("list.hiddenText")}
                        </div>
                        {isStaleBorrowed ? (
                          <div className="mt-1 text-xs font-semibold text-rose-600">
                            {tt("list.staleText")}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${getNotebookStatusChipClass(item)}`}>
                          {getNotebookStatusLabel(item, notebookStatusLabels)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="h-10 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          {imageUrl ? (
                            <img src={imageUrl} alt={item?.asset_code || "Notebook"} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] font-semibold text-slate-400">
                              {tt("list.noImage")}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-slate-500">{formatDateTime(item?.updated_at || item?.created_at, locale)}</td>
                      <td className="sticky right-0 border-l border-slate-100 bg-white px-3 py-2 transition group-hover:bg-slate-50">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => void handleToggleNotebookCenterVisibility(item)}
                            disabled={!canManageNotebooks || availabilityActionId === String(item.id || "")}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              showInNotebookCenter
                                ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {availabilityActionId === String(item.id || "")
                              ? tt("list.updating")
                              : showInNotebookCenter
                                ? tt("list.hideFromCenter")
                                : tt("list.showInCenter")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditNotebook(item)}
                            disabled={!canManageNotebooks}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <PencilLine size={13} />
                            {tt("list.edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteNotebook(item)}
                            disabled={!canManageNotebooks || actionId === item.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={13} />
                            {actionId === item.id ? tt("list.deleting") : tt("list.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </article>
    </section>
  );
}
