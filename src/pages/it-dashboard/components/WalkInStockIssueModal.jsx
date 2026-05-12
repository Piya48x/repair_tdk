import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Select from "react-select";
import {
  Building2,
  Eye,
  Loader2,
  Package,
  Search,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatFileSize } from "../../../services/workNotesService";
import {
  issueStockItem,
  isStockPermissionDenied,
  isStockSchemaError,
  loadProfileDirectory,
  loadStockItems,
} from "../services/stockManagementService";

const EMPTY_ISSUE_FORM = {
  requester_name: "",
  requester_emp_id: "",
  requester_department: "",
  requester_profile_id: "",
  stock_item_search: "",
  stock_item_id: "",
  quantity: "1",
  purpose: "",
  notes: "",
};

const normalizeText = (value) => String(value || "").trim();
const normalizeLookupText = (value) => normalizeText(value).toLowerCase();
const formatQuantity = (value) => new Intl.NumberFormat("th-TH").format(Number(value || 0));
const MAX_LOOKUP_RESULTS = 8;
const buildAvatarFallback = (name, color = "2b59b0") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || "U"))}&background=${color}&color=fff&size=96`;

const createPendingAttachmentEntry = (file) => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  file,
  previewUrl: String(file?.type || "").startsWith("image/") ? URL.createObjectURL(file) : "",
});

function revokePendingPreview(entry) {
  if (entry?.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(entry.previewUrl);
  }
}

function getAvailabilityLabel(item) {
  const quantity = Number(item?.quantity_on_hand || 0);
  const minimum = Number(item?.minimum_quantity || 0);
  if (quantity <= 0) return "หมด stock";
  if (minimum > 0 && quantity <= minimum) return "ใกล้หมด";
  return "พร้อมเบิก";
}

function getAvailabilityClass(item) {
  const quantity = Number(item?.quantity_on_hand || 0);
  const minimum = Number(item?.minimum_quantity || 0);
  if (quantity <= 0) return "border-rose-200 bg-rose-50 text-rose-700";
  if (minimum > 0 && quantity <= minimum) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function buildInitialForm(initialRequest = null) {
  return {
    ...EMPTY_ISSUE_FORM,
    requester_name: normalizeText(initialRequest?.reporter_name),
    requester_emp_id: normalizeText(initialRequest?.reporter_emp_id),
    requester_department: normalizeText(initialRequest?.reporter_dept || initialRequest?.department),
    requester_profile_id: normalizeText(initialRequest?.reporter_id || initialRequest?.user_id),
    purpose: normalizeText(
      initialRequest?.purpose_of_use || initialRequest?.title || initialRequest?.description,
    ),
  };
}

function PendingAttachmentList({ entries, onRemove }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-xs text-slate-500">
        ยังไม่ได้แนบรูปหลักฐานการเบิก
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-3 py-2">
          {entry.previewUrl ? (
            <button
              type="button"
              onClick={() => window.open(entry.previewUrl, "_blank", "noopener,noreferrer")}
              className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              <img src={entry.previewUrl} alt={entry.file?.name || "issue-evidence"} className="h-full w-full object-cover" />
            </button>
          ) : (
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
              <Package size={16} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{entry.file?.name || "attachment"}</p>
            <p className="text-xs text-slate-500">{formatFileSize(entry.file?.size || 0)}</p>
          </div>
          <div className="flex items-center gap-2">
            {entry.previewUrl ? (
              <button
                type="button"
                onClick={() => window.open(entry.previewUrl, "_blank", "noopener,noreferrer")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
              >
                <Eye size={14} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WalkInStockIssueModal({
  isOpen,
  onClose,
  onIssued,
  currentUser,
  theme = "light",
  initialRequest = null,
}) {
  const fileInputRef = useRef(null);
  const pendingFilesRef = useRef([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [directoryMembers, setDirectoryMembers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [issueForm, setIssueForm] = useState(() => buildInitialForm(initialRequest));
  const [pendingIssueFiles, setPendingIssueFiles] = useState([]);
  const [activeLookupField, setActiveLookupField] = useState("");

  const deferredRequesterName = useDeferredValue(issueForm.requester_name);
  const deferredRequesterEmpId = useDeferredValue(issueForm.requester_emp_id);
  const deferredStockSearch = useDeferredValue(issueForm.stock_item_search);

  const isDark = theme === "dark";
  const overlayClass = isDark ? "bg-slate-950/80" : "bg-slate-950/65";
  const shellClass = isDark
    ? "border-slate-700 bg-[#0f172a] text-slate-100 shadow-2xl"
    : "border-slate-200 bg-white text-slate-900 shadow-2xl";
  const surfaceClass = isDark
    ? "rounded-2xl border border-slate-700 bg-slate-900/70"
    : "rounded-2xl border border-slate-200 bg-slate-50";
  const inputClass = isDark
    ? "w-full rounded-xl border border-slate-600 bg-[#162136] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/30"
    : "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/20";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const labelClass = isDark ? "text-slate-300" : "text-slate-700";
  const chipClass = isDark
    ? "inline-flex items-center rounded-full border border-[#2b59b0]/35 bg-[#2b59b0]/15 px-2.5 py-1 text-[11px] font-semibold text-[#c8d9ff]"
    : "inline-flex items-center rounded-full border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-2.5 py-1 text-[11px] font-semibold text-[#2b59b0]";
  const secondaryButtonClass = isDark
    ? "inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  const selectedIssueItem = useMemo(
    () => stockItems.find((item) => String(item?.id || "") === String(issueForm.stock_item_id || "")) || null,
    [issueForm.stock_item_id, stockItems],
  );
  const availableStockItems = useMemo(
    () => stockItems.filter((item) => Number(item?.quantity_on_hand || 0) > 0),
    [stockItems],
  );

  const normalizedRequesterQuery =
    activeLookupField === "requester_emp_id"
      ? normalizeLookupText(deferredRequesterEmpId)
      : normalizeLookupText(deferredRequesterName);
  const normalizedStockQuery = normalizeLookupText(deferredStockSearch);

  const profileSuggestions = useMemo(
    () =>
      (!normalizedRequesterQuery
        ? directoryMembers
        : directoryMembers.filter((member) =>
            [member.full_name, member.employee_code, member.email, member.department]
              .map(normalizeLookupText)
              .join(" ")
              .includes(normalizedRequesterQuery),
          )
      ).slice(0, MAX_LOOKUP_RESULTS),
    [directoryMembers, normalizedRequesterQuery],
  );

  const stockSuggestions = useMemo(() => {
    return (!normalizedStockQuery
      ? availableStockItems
      : availableStockItems.filter((item) =>
          [
            item?.stock_code,
            item?.item_name,
            item?.item_category,
            item?.reference_item_code,
            item?.brand,
            item?.model,
            item?.lot_number,
          ]
            .map(normalizeLookupText)
            .join(" ")
            .includes(normalizedStockQuery),
        )
    ).slice(0, MAX_LOOKUP_RESULTS);
  }, [availableStockItems, normalizedStockQuery]);
  const profileQuickPickItems = useMemo(() => profileSuggestions.slice(0, 6), [profileSuggestions]);
  const requesterOptions = useMemo(
    () =>
      directoryMembers.slice(0, 500).map((member) => ({
        value: member.id || `${member.employee_code}-${member.full_name}`,
        profile_id: member.id || "",
        full_name: member.full_name || "",
        employee_code: member.employee_code || "",
        department: member.department || "",
        email: member.email || "",
        avatar_url: member.avatar_url || "",
        label: member.full_name || member.employee_code || member.email || "Unknown user",
      })),
    [directoryMembers],
  );
  const selectedRequesterOption = useMemo(() => {
    const byProfileId = requesterOptions.find(
      (option) => String(option.profile_id || "") === String(issueForm.requester_profile_id || ""),
    );
    if (byProfileId) return byProfileId;

    const byEmployeeCode = requesterOptions.find(
      (option) =>
        option.employee_code &&
        String(option.employee_code || "") === String(issueForm.requester_emp_id || ""),
    );
    if (byEmployeeCode) return byEmployeeCode;

    const byName = requesterOptions.find(
      (option) =>
        option.full_name &&
        String(option.full_name || "").trim() === String(issueForm.requester_name || "").trim(),
    );
    if (byName) return byName;

    if (!issueForm.requester_name) return null;
    return {
      value: issueForm.requester_profile_id || issueForm.requester_emp_id || issueForm.requester_name,
      profile_id: issueForm.requester_profile_id || "",
      full_name: issueForm.requester_name || "",
      employee_code: issueForm.requester_emp_id || "",
      department: issueForm.requester_department || "",
      email: "",
      avatar_url: "",
      label: issueForm.requester_name || "",
    };
  }, [
    issueForm.requester_department,
    issueForm.requester_emp_id,
    issueForm.requester_name,
    issueForm.requester_profile_id,
    requesterOptions,
  ]);
  const requesterSelectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: 48,
        borderRadius: 16,
        borderColor: state.isFocused ? "#2b59b0" : isDark ? "#475569" : "#cbd5e1",
        backgroundColor: isDark ? "#162136" : "#ffffff",
        boxShadow: state.isFocused
          ? isDark
            ? "0 0 0 3px rgba(43, 89, 176, 0.32)"
            : "0 0 0 3px rgba(43, 89, 176, 0.16)"
          : "none",
        paddingLeft: 4,
        ":hover": {
          borderColor: "#2b59b0",
        },
      }),
      valueContainer: (base) => ({
        ...base,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 6,
        paddingRight: 6,
      }),
      input: (base) => ({
        ...base,
        color: isDark ? "#f8fafc" : "#0f172a",
        margin: 0,
        padding: 0,
      }),
      placeholder: (base) => ({
        ...base,
        color: isDark ? "#94a3b8" : "#64748b",
      }),
      singleValue: (base) => ({
        ...base,
        color: isDark ? "#f8fafc" : "#0f172a",
        margin: 0,
      }),
      menu: (base) => ({
        ...base,
        borderRadius: 18,
        overflow: "hidden",
        border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        boxShadow: isDark
          ? "0 20px 40px -24px rgba(15, 23, 42, 0.9)"
          : "0 18px 36px -24px rgba(15, 23, 42, 0.28)",
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 10060,
      }),
      option: (base, state) => ({
        ...base,
        padding: "12px 14px",
        backgroundColor: state.isSelected
          ? isDark
            ? "#1d4ed8"
            : "#dbeafe"
          : state.isFocused
            ? isDark
              ? "#172033"
              : "#f8fafc"
            : isDark
              ? "#0f172a"
              : "#ffffff",
        color: state.isSelected
          ? isDark
            ? "#eff6ff"
            : "#1e3a8a"
          : isDark
            ? "#e2e8f0"
            : "#334155",
        cursor: "pointer",
      }),
      noOptionsMessage: (base) => ({
        ...base,
        color: isDark ? "#94a3b8" : "#64748b",
      }),
      indicatorSeparator: () => ({
        display: "none",
      }),
    }),
    [isDark],
  );

  useEffect(() => {
    pendingFilesRef.current = pendingIssueFiles;
  }, [pendingIssueFiles]);

  useEffect(
    () => () => {
      pendingFilesRef.current.forEach(revokePendingPreview);
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      pendingFilesRef.current.forEach(revokePendingPreview);
      pendingFilesRef.current = [];
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIssueForm(buildInitialForm(initialRequest));
      setPendingIssueFiles([]);
      setActiveLookupField("");
      setSaving(false);
      setLoading(false);
      setErrorMessage("");
      return;
    }

    setIssueForm(buildInitialForm(initialRequest));
    setPendingIssueFiles([]);
    setActiveLookupField("");
    setErrorMessage("");

    let cancelled = false;
    const loadModalData = async () => {
      try {
        setLoading(true);
        const [itemsResult, membersResult] = await Promise.all([loadStockItems(), loadProfileDirectory()]);
        const firstError = itemsResult.error || membersResult.error;
        if (firstError) throw firstError;
        if (cancelled) return;
        setStockItems(itemsResult.data);
        setDirectoryMembers(membersResult.data);
      } catch (error) {
        if (cancelled) return;
        console.error("Load walk-in stock issue modal data error:", error);
        if (isStockSchemaError(error)) {
          setErrorMessage("schema stock management ยังไม่อัปเดต");
        } else if (isStockPermissionDenied(error)) {
          setErrorMessage("บัญชีนี้ยังไม่มีสิทธิ์บันทึกการเบิกจาก stock");
        } else {
          setErrorMessage(error?.message || "ไม่สามารถโหลดข้อมูล stock สำหรับการเบิกได้");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadModalData();

    return () => {
      cancelled = true;
    };
  }, [initialRequest, isOpen]);

  const setField = (field, value) => {
    setIssueForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "stock_item_search" ? { stock_item_id: "" } : {}),
      ...((field === "requester_name" || field === "requester_emp_id") ? { requester_profile_id: "" } : {}),
    }));
  };

  const handleRequesterFieldChange = (field, value) => {
    setField(field, value);
    setActiveLookupField(field);
  };

  const handleStockSearchChange = (value) => {
    setField("stock_item_search", value);
    setActiveLookupField("stock_item_search");
  };

  const resetForm = () => {
    pendingFilesRef.current.forEach(revokePendingPreview);
    pendingFilesRef.current = [];
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIssueForm(buildInitialForm(initialRequest));
    setPendingIssueFiles([]);
    setActiveLookupField("");
    setErrorMessage("");
  };

  const closeModal = () => {
    if (saving) return;
    onClose?.();
  };

  const handleSelectFiles = (files) => {
    const entries = Array.from(files || []);
    if (entries.length === 0) return;
    if (entries.some((file) => !String(file?.type || "").startsWith("image/"))) {
      toast.error("หลักฐานการเบิกต้องเป็นรูปภาพเท่านั้น");
      return;
    }
    setPendingIssueFiles((prev) => [...prev, ...entries.map(createPendingAttachmentEntry)]);
  };

  const handleRemovePendingFile = (entryId) => {
    setPendingIssueFiles((prev) => {
      const next = [];
      prev.forEach((entry) => {
        if (entry.id === entryId) {
          revokePendingPreview(entry);
          return;
        }
        next.push(entry);
      });
      return next;
    });
  };

  const handleSelectProfile = (member) => {
    setIssueForm((prev) => ({
      ...prev,
      requester_name: member.full_name || prev.requester_name,
      requester_emp_id: member.employee_code || prev.requester_emp_id,
      requester_department: member.department || prev.requester_department,
      requester_profile_id: member.id || "",
    }));
    setActiveLookupField("");
  };

  const handleRequesterSelect = (option) => {
    if (!option) {
      setIssueForm((prev) => ({
        ...prev,
        requester_name: "",
        requester_emp_id: "",
        requester_department: "",
        requester_profile_id: "",
      }));
      return;
    }

    handleSelectProfile(option);
  };

  const handleSelectStockItem = (item) => {
    setIssueForm((prev) => ({
      ...prev,
      stock_item_id: item.id,
      stock_item_search: `${item.stock_code || "-"} • ${item.item_name || "-"}`,
    }));
    setActiveLookupField("");
  };

  const handleLookupEnterSelect = (event, field) => {
    if (event.key !== "Enter") return;

    const isProfileLookup = field === "requester_name" || field === "requester_emp_id";
    const suggestions = isProfileLookup ? profileSuggestions : stockSuggestions;
    if (suggestions.length === 0) return;

    event.preventDefault();
    if (isProfileLookup) {
      handleSelectProfile(suggestions[0]);
      return;
    }

    handleSelectStockItem(suggestions[0]);
  };

  const renderLookupDropdown = (field) => {
    const isProfileLookup = field === "requester_name" || field === "requester_emp_id";
    const suggestions = isProfileLookup ? profileSuggestions : stockSuggestions;
    const hasBaseData = isProfileLookup ? directoryMembers.length > 0 : availableStockItems.length > 0;
    const hasKeyword = isProfileLookup ? Boolean(normalizedRequesterQuery) : Boolean(normalizedStockQuery);
    const sectionTitle = isProfileLookup
      ? hasKeyword
        ? "ผลการค้นหาผู้เบิก"
        : "รายชื่อพนักงานล่าสุด"
      : hasKeyword
        ? "ผลการค้นหา stock"
        : "รายการ stock พร้อมเบิกล่าสุด";

    if (activeLookupField !== field || (!hasBaseData && !hasKeyword)) return null;

    return (
      <div
        className={`absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border ${
          isDark ? "border-slate-700 bg-slate-900 shadow-2xl" : "border-slate-200 bg-white shadow-xl"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 border-b px-3 py-2 text-[11px] font-semibold ${
            isDark ? "border-slate-800 bg-slate-950/70 text-slate-400" : "border-slate-100 bg-slate-50 text-slate-500"
          }`}
        >
          <span>{sectionTitle}</span>
          <span>{formatQuantity(suggestions.length)} รายการ</span>
        </div>
        {suggestions.length > 0 ? (
          suggestions.map((entry) =>
            isProfileLookup ? (
              <button
                key={entry.id || `${entry.employee_code}-${entry.full_name}`}
                type="button"
                onClick={() => handleSelectProfile(entry)}
                className={`flex w-full items-center gap-3 border-b px-3 py-3 text-left transition last:border-b-0 ${
                  isDark ? "border-slate-800 hover:bg-slate-800" : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <img
                  src={entry.avatar_url || buildAvatarFallback(entry.full_name || entry.employee_code || "U")}
                  alt={entry.full_name || "profile"}
                  onError={(event) => {
                    event.currentTarget.src = buildAvatarFallback(entry.full_name || entry.employee_code || "U");
                  }}
                  className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover"
                />
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                    {entry.full_name || "-"}
                  </p>
                  <p className={`truncate text-xs ${mutedClass}`}>
                    {entry.employee_code || "ไม่มีรหัส"} • {entry.department || "ไม่ระบุแผนก"}
                  </p>
                </div>
              </button>
            ) : (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleSelectStockItem(entry)}
                className={`flex w-full items-center gap-3 border-b px-3 py-3 text-left transition last:border-b-0 ${
                  isDark ? "border-slate-800 hover:bg-slate-800" : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
                  <Package size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                    {entry.item_name || "-"}
                  </p>
                  <p className={`truncate text-xs ${mutedClass}`}>
                    {entry.stock_code || "-"} • คงเหลือ {formatQuantity(entry.quantity_on_hand)} {entry.unit || "ชิ้น"}
                  </p>
                </div>
              </button>
            ),
          )
        ) : (
          <div className={`flex items-center gap-2 px-3 py-3 text-sm ${mutedClass}`}>
            <Search size={14} />
            <span>{isProfileLookup ? "ไม่พบรายชื่อที่ใกล้เคียง" : "ไม่พบรายการ stock ที่พร้อมเบิก"}</span>
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || !selectedIssueItem) return;

    try {
      setSaving(true);
      setErrorMessage("");
      const result = await issueStockItem({
        stockItem: selectedIssueItem,
        quantity: issueForm.quantity,
        requester: issueForm,
        purpose: issueForm.purpose,
        notes: issueForm.notes,
        currentUser,
        pendingFiles: pendingIssueFiles.map((entry) => entry.file).filter(Boolean),
      });
      setStockItems((prev) =>
        prev.map((item) =>
          String(item?.id || "") === String(result.updatedItem?.id || "") ? result.updatedItem : item,
        ),
      );
      toast.success("บันทึกการเบิกแบบ walk-in แล้ว");
      onIssued?.(result, initialRequest);
      closeModal();
      resetForm();
    } catch (error) {
      console.error("Walk-in stock issue modal submit error:", error);
      if (isStockSchemaError(error)) {
        setErrorMessage("schema stock management ยังไม่อัปเดต");
      } else if (isStockPermissionDenied(error)) {
        setErrorMessage("บัญชีนี้ยังไม่มีสิทธิ์บันทึกการเบิกจาก stock");
      } else {
        setErrorMessage(error?.message || "บันทึกการเบิกไม่สำเร็จ");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className={`fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 ${overlayClass}`}
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="walk-in-stock-issue-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <motion.div
        className={`flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border ${shellClass}`}
        style={{ maxHeight: "calc(100dvh - 1rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))" }}
        onClick={(event) => event.stopPropagation()}
        initial={{ y: 20, opacity: 0.98, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
      >
        <div className={`border-b border-inherit px-4 py-4 backdrop-blur sm:px-6 ${isDark ? "bg-[#0f172a]/95" : "bg-white/95"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className={chipClass}>Walk-in stock issue</span>
                <span className={chipClass}>proof required</span>
                {initialRequest?.id ? (
                  <span className={chipClass}>{initialRequest.ticket_no || `REQ-${String(initialRequest.id).slice(-6).toUpperCase()}`}</span>
                ) : null}
              </div>
              <h2 id="walk-in-stock-issue-title" className="text-lg font-bold sm:text-2xl">
                {initialRequest?.id ? "เบิกของแทนจากคำขอผู้ใช้" : "บันทึกการเบิกของแบบ Walk-in"}
              </h2>
              <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>
                ค้นหาผู้เบิกจากรายชื่อพนักงาน เลือกรายการ stock ที่พร้อมจ่าย และแนบรูปหลักฐานก่อนบันทึก
              </p>
            </div>

            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className={`rounded-xl p-2 transition-colors ${
                isDark ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              } disabled:cursor-not-allowed disabled:opacity-60`}
              aria-label="ปิดหน้าต่าง"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {errorMessage ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {loading ? (
              <div className={`${surfaceClass} flex min-h-[260px] items-center justify-center p-6`}>
                <div className={`flex items-center gap-3 text-sm ${mutedClass}`}>
                  <Loader2 size={18} className="animate-spin" />
                  <span>กำลังโหลดข้อมูล stock และรายชื่อพนักงาน...</span>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
                <div className="space-y-4">
                  <div className={`${surfaceClass} p-4 sm:p-5`}>
                    <div className="mb-4">
                      <p className={`text-sm font-semibold ${labelClass}`}>ข้อมูลผู้เบิก</p>
                      <p className={`mt-1 text-xs ${mutedClass}`}>ค้นหาจากชื่อหรือรหัสพนักงาน แล้วเลือกจากรายชื่อกลางได้ทันที</p>
                    </div>

                    <div className="hidden mb-4 space-y-4">
                      <div>
                        <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>รายชื่อผู้เบิก *</label>
                        <Select
                          inputId="walk-in-stock-issue-requester"
                          options={requesterOptions}
                          value={selectedRequesterOption}
                          onChange={handleRequesterSelect}
                          placeholder="ค้นหาชื่อหรือรหัสพนักงานจาก Supabase"
                          isClearable
                          isSearchable
                          menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                          styles={requesterSelectStyles}
                          noOptionsMessage={() => "ไม่พบรายชื่อพนักงาน"}
                          formatOptionLabel={(option) => (
                            <div className="flex items-center gap-3">
                              <img
                                src={option.avatar_url || buildAvatarFallback(option.full_name || option.employee_code || "U")}
                                alt={option.full_name || "profile"}
                                onError={(event) => {
                                  event.currentTarget.src = buildAvatarFallback(option.full_name || option.employee_code || "U");
                                }}
                                className="h-10 w-10 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover"
                              />
                              <div className="min-w-0">
                                <div className={`truncate text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                                  {option.full_name || "-"}
                                </div>
                                <div className={`truncate text-xs ${mutedClass}`}>
                                  {option.employee_code || "ไม่มีรหัส"} • {option.department || "ไม่ระบุแผนก"}
                                </div>
                              </div>
                            </div>
                          )}
                          filterOption={(candidate, inputValue) => {
                            const keyword = normalizeLookupText(inputValue);
                            if (!keyword) return true;
                            return [
                              candidate.data.full_name,
                              candidate.data.employee_code,
                              candidate.data.department,
                              candidate.data.email,
                            ]
                              .map(normalizeLookupText)
                              .join(" ")
                              .includes(keyword);
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="relative">
                          <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>รหัสพนักงาน</label>
                          <Search size={16} className="pointer-events-none absolute left-3 top-[2.6rem] text-slate-400" />
                          <input
                            value={issueForm.requester_emp_id}
                            readOnly
                            className={`${inputClass} pl-10 ${isDark ? "opacity-90" : "bg-slate-50"}`}
                            placeholder="รหัสพนักงาน"
                          />
                        </div>

                        <div className="relative">
                          <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>แผนก</label>
                          <Building2 size={16} className="pointer-events-none absolute left-3 top-[2.6rem] text-slate-400" />
                          <input
                            value={issueForm.requester_department}
                            readOnly
                            className={`${inputClass} pl-10 ${isDark ? "opacity-90" : "bg-slate-50"}`}
                            placeholder="แผนก"
                          />
                        </div>
                      </div>

                      <div className={`rounded-2xl border px-3 py-3 ${isDark ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className={`text-xs font-semibold ${labelClass}`}>รายชื่อจาก Supabase</p>
                          <span className={`text-[11px] ${mutedClass}`}>{formatQuantity(requesterOptions.length)} รายการ</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="relative sm:col-span-2">
                        <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>ชื่อผู้เบิก *</label>
                        <UserRound size={16} className="pointer-events-none absolute left-3 top-[2.6rem] text-slate-400" />
                        <input
                          value={issueForm.requester_name}
                          onChange={(event) => handleRequesterFieldChange("requester_name", event.target.value)}
                          onFocus={() => setActiveLookupField("requester_name")}
                          onBlur={() => window.setTimeout(() => setActiveLookupField((value) => (value === "requester_name" ? "" : value)), 120)}
                          onKeyDown={(event) => handleLookupEnterSelect(event, "requester_name")}
                          className={`${inputClass} pl-10`}
                          placeholder="ชื่อผู้เบิก"
                          required
                          autoComplete="off"
                        />
                        {renderLookupDropdown("requester_name")}
                      </div>

                      <div className="relative">
                        <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>รหัสพนักงาน</label>
                        <Search size={16} className="pointer-events-none absolute left-3 top-[2.6rem] text-slate-400" />
                        <input
                          value={issueForm.requester_emp_id}
                          onChange={(event) => handleRequesterFieldChange("requester_emp_id", event.target.value)}
                          onFocus={() => setActiveLookupField("requester_emp_id")}
                          onBlur={() => window.setTimeout(() => setActiveLookupField((value) => (value === "requester_emp_id" ? "" : value)), 120)}
                          onKeyDown={(event) => handleLookupEnterSelect(event, "requester_emp_id")}
                          className={`${inputClass} pl-10`}
                          placeholder="รหัสพนักงาน"
                          autoComplete="off"
                        />
                        {renderLookupDropdown("requester_emp_id")}
                      </div>

                      <div className="relative">
                        <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>แผนก</label>
                        <Building2 size={16} className="pointer-events-none absolute left-3 top-[2.6rem] text-slate-400" />
                        <input
                          value={issueForm.requester_department}
                          onChange={(event) => setField("requester_department", event.target.value)}
                          className={`${inputClass} pl-10`}
                          placeholder="แผนก"
                        />
                      </div>
                    </div>
                    <div className={`hidden mt-4 rounded-2xl border px-3 py-3 ${isDark ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className={`text-xs font-semibold ${labelClass}`}>เลือกรายชื่อพนักงานจาก list ได้ทันที</p>
                        <span className={`text-[11px] ${mutedClass}`}>{formatQuantity(profileQuickPickItems.length)} รายการ</span>
                      </div>

                      {profileQuickPickItems.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {profileQuickPickItems.map((member) => {
                            const isSelected =
                              String(member.id || "") === String(issueForm.requester_profile_id || "") ||
                              (issueForm.requester_emp_id && String(member.employee_code || "") === String(issueForm.requester_emp_id || ""));

                            return (
                              <button
                                key={member.id || `${member.employee_code}-${member.full_name}`}
                                type="button"
                                onClick={() => handleSelectProfile(member)}
                                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                                  isSelected
                                    ? isDark
                                      ? "border-blue-400 bg-blue-500/15"
                                      : "border-blue-300 bg-blue-50"
                                    : isDark
                                      ? "border-slate-700 hover:bg-slate-800"
                                      : "border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <img
                                  src={member.avatar_url || buildAvatarFallback(member.full_name || member.employee_code || "U")}
                                  alt={member.full_name || "profile"}
                                  onError={(event) => {
                                    event.currentTarget.src = buildAvatarFallback(member.full_name || member.employee_code || "U");
                                  }}
                                  className="h-10 w-10 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className={`block truncate text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                                    {member.full_name || "-"}
                                  </span>
                                  <span className={`mt-0.5 block truncate text-xs ${mutedClass}`}>
                                    {member.employee_code || "no-code"} • {member.department || "no-department"}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`rounded-2xl border border-dashed px-3 py-4 text-sm ${mutedClass}`}>
                          ไม่พบรายชื่อพนักงานที่ตรงกับคำค้น
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`${surfaceClass} p-4 sm:p-5`}>
                    <div className="mb-4">
                      <p className={`text-sm font-semibold ${labelClass}`}>รายการที่ต้องการเบิก</p>
                      <p className={`mt-1 text-xs ${mutedClass}`}>ค้นหาจากรหัส stock, ชื่ออุปกรณ์ หรือรหัสอ้างอิง แล้วเลือกจากรายการที่พร้อมจ่าย</p>
                    </div>

                    {availableStockItems.length === 0 ? (
                      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        ยังไม่มี stock พร้อมเบิกในระบบ กรุณาเพิ่มหรือ import stock ก่อน แล้วจึงกลับมาเปิดฟอร์มนี้อีกครั้ง
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
                      <div className="relative">
                        <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>รายการ stock *</label>
                        <Package size={16} className="pointer-events-none absolute left-3 top-[2.6rem] text-slate-400" />
                        <input
                          value={issueForm.stock_item_search}
                          onChange={(event) => handleStockSearchChange(event.target.value)}
                          onFocus={() => setActiveLookupField("stock_item_search")}
                          onBlur={() => window.setTimeout(() => setActiveLookupField((value) => (value === "stock_item_search" ? "" : value)), 120)}
                          onKeyDown={(event) => handleLookupEnterSelect(event, "stock_item_search")}
                          className={`${inputClass} pl-10`}
                          placeholder="ค้นหา stock จากรหัสหรือชื่ออุปกรณ์"
                          required
                          autoComplete="off"
                          disabled={availableStockItems.length === 0}
                        />
                        {renderLookupDropdown("stock_item_search")}
                      </div>

                      <div>
                        <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>จำนวน *</label>
                        <input
                          value={issueForm.quantity}
                          onChange={(event) => setField("quantity", event.target.value)}
                          type="number"
                          min="1"
                          className={inputClass}
                          placeholder="จำนวน"
                          required
                        />
                      </div>
                    </div>

                    {selectedIssueItem ? (
                      <div className={`mt-4 rounded-2xl border px-3 py-3 ${isDark ? "border-slate-700 bg-slate-900/70" : "border-blue-100 bg-blue-50/60"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`truncate text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{selectedIssueItem.item_name || "-"}</p>
                            <p className={`mt-1 text-xs ${mutedClass}`}>
                              {selectedIssueItem.stock_code || "-"} • {selectedIssueItem.reference_item_code || selectedIssueItem.item_category || "-"}
                              {selectedIssueItem.lot_number ? ` • lot ${selectedIssueItem.lot_number}` : ""}
                            </p>
                            <p className={`mt-1 text-xs ${mutedClass}`}>คงเหลือ {formatQuantity(selectedIssueItem.quantity_on_hand)} {selectedIssueItem.unit || "ชิ้น"}</p>
                          </div>
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getAvailabilityClass(selectedIssueItem)}`}>
                            {getAvailabilityLabel(selectedIssueItem)}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-1 gap-4">
                      <div>
                        <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>วัตถุประสงค์</label>
                        <input value={issueForm.purpose} onChange={(event) => setField("purpose", event.target.value)} className={inputClass} placeholder="วัตถุประสงค์การเบิก" />
                      </div>
                      <div>
                        <label className={`mb-1.5 block text-sm font-semibold ${labelClass}`}>หมายเหตุ</label>
                        <textarea value={issueForm.notes} onChange={(event) => setField("notes", event.target.value)} className={`${inputClass} min-h-[96px]`} placeholder="หมายเหตุเพิ่มเติม" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`${surfaceClass} p-4 sm:p-5`}>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-semibold ${labelClass}`}>รูปหลักฐานการเบิก</p>
                        <p className={`mt-1 text-xs ${mutedClass}`}>บังคับแนบอย่างน้อย 1 รูป เพื่อยืนยันการจ่ายของให้ผู้รับ</p>
                      </div>
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={saving} className={secondaryButtonClass}>
                        <Upload size={15} />
                        <span>ถ่ายหรือเลือกรูป</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(event) => {
                          handleSelectFiles(event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </div>

                    <PendingAttachmentList entries={pendingIssueFiles} onRemove={handleRemovePendingFile} />
                  </div>

                  <div className={`${surfaceClass} p-4 text-sm`}>
                    <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>ผู้บันทึก: {currentUser?.name || "IT Admin"}</p>
                    <p className={`mt-1 text-xs ${mutedClass}`}>{currentUser?.employeeId ? `รหัส ${currentUser.employeeId}` : "บัญชี IT"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`border-t px-4 py-3 backdrop-blur sm:px-6 ${isDark ? "border-slate-700 bg-[#0f172a]/95" : "border-slate-200 bg-white/95"}`}>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button type="button" onClick={closeModal} disabled={saving} className={secondaryButtonClass}>
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving || loading || !selectedIssueItem}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                {saving ? "กำลังบันทึก..." : "ยืนยันการเบิก"}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
