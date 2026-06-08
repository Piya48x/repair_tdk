import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Building2, Eye, FileImage, LayoutGrid, List, Loader2, Package, Paperclip, PencilLine, Plus, RefreshCw, Save, Search, Trash2, Upload, UserRound, X } from "lucide-react";
import toast from "react-hot-toast";
import AttachmentPreviewModal from "../../work-notes/AttachmentPreviewModal";
import { formatFileSize, isImageAttachment } from "../../../services/workNotesService";
import { IT_STOCK_CATALOG, IT_STOCK_CATEGORY_OPTIONS, findStockCatalogItem } from "../constants/stockCatalog";
import StockProcurementImportButton from "../components/StockProcurementImportButton";
import DashboardSummaryGrid from "../components/DashboardSummaryGrid";
import { STOCK_ATTACHMENT_MAX_SIZE, deleteStockItem, isStockPermissionDenied, isStockSchemaError, issueStockItem, loadProfileDirectory, loadStockIssueLogs, loadStockItems, saveStockItem } from "../services/stockManagementService";

const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");
const MIGRATION_PATH = "database/20260326_it_stock_management.sql";
const STOCK_IMAGE_ACCEPT = "image/*";
const STOCK_ATTACHMENT_ACCEPT = "image/*,.pdf,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.csv,.txt";
const ISSUE_ATTACHMENT_ACCEPT = "image/*";
const UNIT_OPTIONS = ["ชิ้น", "ชุด", "เส้น", "กล่อง", "อัน", "ใบ", "เครื่อง", "ตู้", "ใบอนุญาต"];
const EMPTY_STOCK_FORM = { category_key: "", category_th: "", category_en: "", item_prefix: "", reference_item_code: "", description_th: "", description_en: "", stock_code: "", item_name: "", item_category: "", brand: "", model: "", unit: "ชิ้น", quantity_on_hand: "1", minimum_quantity: "0", location: "", source_ref: "", lot_number: "", notes: "" };
const EMPTY_ISSUE_FORM = { requester_name: "", requester_emp_id: "", requester_department: "", requester_profile_id: "", stock_item_search: "", stock_item_id: "", quantity: "1", purpose: "", notes: "" };

const normalizeText = (value) => String(value || "").trim();
const normalizeLookupText = (value) => normalizeText(value).toLowerCase();
const formatQuantity = (value) => NUMBER_FORMATTER.format(Number(value || 0));
const buildAvatarFallback = (name, color = "2b59b0") => `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || "U"))}&background=${color}&color=fff&size=96`;
const formatDateTime = (value) => !value ? "-" : (Number.isNaN(new Date(value).getTime()) ? "-" : new Date(value).toLocaleString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }));
const isLowStock = (item) => Number(item?.minimum_quantity || 0) > 0 && Number(item?.quantity_on_hand || 0) <= Number(item?.minimum_quantity || 0);
const getAvailabilityLabel = (item) => Number(item?.quantity_on_hand || 0) <= 0 ? "หมด stock" : isLowStock(item) ? "ใกล้หมด" : "พร้อมเบิก";
const getAvailabilityClass = (item) => Number(item?.quantity_on_hand || 0) <= 0 ? "border-rose-200 bg-rose-50 text-rose-700" : isLowStock(item) ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700";
const createPendingAttachmentEntry = (file) => ({ id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`, file, previewUrl: String(file?.type || "").startsWith("image/") ? URL.createObjectURL(file) : "" });
const revokePendingPreview = (entry) => { if (entry?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(entry.previewUrl); };
const getSafeAttachments = (attachments) => Array.isArray(attachments) ? attachments : [];
const getAttachmentRole = (attachment) => {
  const path = normalizeLookupText(attachment?.file_path);
  if (path.includes("/device/")) return "device";
  if (path.includes("/evidence/")) return "evidence";
  return "legacy";
};
const getStockImageAttachments = (attachments) => {
  const imageAttachments = getSafeAttachments(attachments).filter(isImageAttachment);
  const deviceImages = imageAttachments.filter((attachment) => getAttachmentRole(attachment) === "device");
  return deviceImages.length > 0 ? deviceImages : imageAttachments.filter((attachment) => getAttachmentRole(attachment) !== "evidence");
};
const getEvidenceAttachments = (attachments) => getSafeAttachments(attachments).filter((attachment) => getAttachmentRole(attachment) === "evidence" || !isImageAttachment(attachment));
const getPrimaryStockImage = (item) => getStockImageAttachments(item?.stock_attachments)[0] || null;
const findCatalogItemForStock = (item = {}) => {
  const direct = findStockCatalogItem(item?.reference_item_code);
  if (direct) return direct;

  const haystack = [
    item?.stock_code,
    item?.reference_item_code,
    item?.item_prefix,
    item?.description_th,
    item?.description_en,
    item?.item_name,
    item?.notes,
  ].map((value) => normalizeText(value).toUpperCase()).join(" ");

  const codeMatch = IT_STOCK_CATALOG.find((catalogItem) => haystack.includes(catalogItem.referenceCode.toUpperCase()));
  if (codeMatch) return codeMatch;

  const categoryText = normalizeLookupText([item?.category_th, item?.category_en, item?.item_category].filter(Boolean).join(" "));
  const itemText = normalizeLookupText([item?.description_th, item?.description_en, item?.item_name].filter(Boolean).join(" "));
  return IT_STOCK_CATALOG.find((catalogItem) => {
    const categoryMatch = !categoryText || categoryText.includes(normalizeLookupText(catalogItem.categoryTh)) || categoryText.includes(normalizeLookupText(catalogItem.categoryEn));
    const descriptionMatch = itemText && [catalogItem.descriptionTh, catalogItem.descriptionEn].some((value) => itemText.includes(normalizeLookupText(value)));
    return categoryMatch && descriptionMatch;
  }) || null;
};

function AttachmentField({ title, hint, buttonLabel, emptyLabel, accept, capture, inputRef, onSelect, existing = [], pending = [], onPreview, onRemoveExisting, onRemovePending, onPaste, pasteHint }) {
  return (
    <div
      className={`rounded-2xl border bg-slate-50 p-3 ${onPaste ? "border-dashed border-blue-300 outline-none transition focus-within:ring-2 focus-within:ring-blue-200 focus:ring-2 focus:ring-blue-200" : "border-slate-200"}`}
      tabIndex={onPaste ? 0 : undefined}
      onPaste={onPaste}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-sm font-bold text-slate-800">{title}</p><p className="text-[11px] text-slate-500">{hint}</p></div>
        <button type="button" onClick={() => inputRef.current?.click()} className="app-btn-secondary inline-flex items-center gap-2"><Upload size={14} />{buttonLabel}</button>
        <input ref={inputRef} type="file" multiple accept={accept} capture={capture} className="hidden" onChange={(event) => { onSelect(event.target.files); event.target.value = ""; }} />
      </div>
      {pasteHint ? <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{pasteHint}</div> : null}
      <div className="mt-3 space-y-2">
        {existing.map((attachment) => (
          <div key={attachment.id} className="flex items-center gap-3 rounded-2xl border border-white bg-white px-3 py-2 shadow-sm">
            {isImageAttachment(attachment) ? <button type="button" onClick={() => onPreview(attachment)} className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><img src={attachment.file_url} alt={attachment.file_name} className="h-full w-full object-cover" /></button> : <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500"><Paperclip size={16} /></span>}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{attachment.file_name}</p><p className="text-xs text-slate-500">{formatFileSize(attachment.file_size)}</p></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => window.open(attachment.file_url, "_blank", "noopener,noreferrer")} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"><Eye size={14} /></button>
              {onRemoveExisting ? <button type="button" onClick={() => onRemoveExisting(attachment)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600"><Trash2 size={14} /></button> : null}
            </div>
          </div>
        ))}
        {pending.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-white px-3 py-2">
            {entry.previewUrl ? <button type="button" onClick={() => onPreview({ file_url: entry.previewUrl, file_name: entry.file?.name, file_size: entry.file?.size, mime_type: entry.file?.type })} className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><img src={entry.previewUrl} alt={entry.file?.name} className="h-full w-full object-cover" /></button> : <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500"><Paperclip size={16} /></span>}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{entry.file?.name || "attachment"}</p><p className="text-xs text-slate-500">{formatFileSize(entry.file?.size || 0)}</p></div>
            <button type="button" onClick={() => onRemovePending(entry.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600"><Trash2 size={14} /></button>
          </div>
        ))}
        {existing.length === 0 && pending.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-xs text-slate-500">{emptyLabel}</div> : null}
      </div>
    </div>
  );
}

export default function StockManagementPage({ theme, uiTheme, currentUser, stockManagementSection = "issue", onStockManagementSectionChange }) {
  const stockImageInputRef = useRef(null);
  const stockFileInputRef = useRef(null);
  const issueFileInputRef = useRef(null);
  const issueFormRef = useRef(null);
  const pendingStockImageFilesRef = useRef([]);
  const pendingStockFilesRef = useRef([]);
  const pendingIssueFilesRef = useRef([]);
  const [stockItems, setStockItems] = useState([]);
  const [issueLogs, setIssueLogs] = useState([]);
  const [directoryMembers, setDirectoryMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStock, setSavingStock] = useState(false);
  const [issuingStock, setIssuingStock] = useState(false);
  const [deletingStockId, setDeletingStockId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [schemaOutdated, setSchemaOutdated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [historyViewMode, setHistoryViewMode] = useState("card");
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [stockForm, setStockForm] = useState(EMPTY_STOCK_FORM);
  const [issueForm, setIssueForm] = useState(EMPTY_ISSUE_FORM);
  const [stockAttachments, setStockAttachments] = useState([]);
  const [removedStockAttachments, setRemovedStockAttachments] = useState([]);
  const [pendingStockImageFiles, setPendingStockImageFiles] = useState([]);
  const [pendingStockFiles, setPendingStockFiles] = useState([]);
  const [pendingIssueFiles, setPendingIssueFiles] = useState([]);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [activeLookupField, setActiveLookupField] = useState("");
  const deferredRequesterName = useDeferredValue(issueForm.requester_name);
  const deferredRequesterEmpId = useDeferredValue(issueForm.requester_emp_id);
  const deferredStockSearch = useDeferredValue(issueForm.stock_item_search);

  const loadPageData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);
    try {
      setErrorMessage("");
      const [itemsResult, logsResult, membersResult] = await Promise.all([loadStockItems(), loadStockIssueLogs(), loadProfileDirectory()]);
      const firstError = itemsResult.error || logsResult.error || membersResult.error;
      if (firstError) throw firstError;
      setStockItems(itemsResult.data);
      setIssueLogs(logsResult.data);
      setDirectoryMembers(membersResult.data);
      setSchemaOutdated(false);
    } catch (error) {
      console.error("Load stock management data error:", error);
      if (isStockSchemaError(error)) {
        setSchemaOutdated(true);
        setErrorMessage("schema stock management ยังไม่อัปเดต");
      } else if (isStockPermissionDenied(error)) {
        setErrorMessage("บัญชีนี้ยังไม่มีสิทธิ์เข้าถึง stock management");
      } else {
        setErrorMessage(error?.message || "ไม่สามารถโหลดข้อมูล stock management ได้");
      }
      setStockItems([]);
      setIssueLogs([]);
    } finally {
      if (!silent) setLoading(false);
      if (silent) setRefreshing(false);
    }
  };

  useEffect(() => { void loadPageData(); }, []);
  useEffect(() => { pendingStockImageFilesRef.current = pendingStockImageFiles; }, [pendingStockImageFiles]);
  useEffect(() => { pendingStockFilesRef.current = pendingStockFiles; }, [pendingStockFiles]);
  useEffect(() => { pendingIssueFilesRef.current = pendingIssueFiles; }, [pendingIssueFiles]);
  useEffect(() => () => { pendingStockImageFilesRef.current.forEach(revokePendingPreview); pendingStockFilesRef.current.forEach(revokePendingPreview); pendingIssueFilesRef.current.forEach(revokePendingPreview); }, []);
  const selectedIssueItem = useMemo(() => stockItems.find((item) => String(item?.id || "") === String(issueForm.stock_item_id || "")) || null, [issueForm.stock_item_id, stockItems]);
  const selectedCatalogItem = useMemo(() => findStockCatalogItem(stockForm.reference_item_code), [stockForm.reference_item_code]);
  const availableCatalogItems = useMemo(() => stockForm.category_key ? IT_STOCK_CATALOG.filter((item) => item.categoryKey === stockForm.category_key) : [], [stockForm.category_key]);
  const stockImageAttachments = useMemo(() => getStockImageAttachments(stockAttachments), [stockAttachments]);
  const stockEvidenceAttachments = useMemo(() => getEvidenceAttachments(stockAttachments), [stockAttachments]);
  const normalizedRequesterQuery = activeLookupField === "requester_emp_id" ? normalizeLookupText(deferredRequesterEmpId) : normalizeLookupText(deferredRequesterName);
  const profileSuggestions = useMemo(() => !normalizedRequesterQuery ? [] : directoryMembers.filter((member) => [member.full_name, member.employee_code, member.email].map(normalizeLookupText).join(" ").includes(normalizedRequesterQuery)).slice(0, 6), [directoryMembers, normalizedRequesterQuery]);
  const stockSuggestions = useMemo(() => {
    const keyword = normalizeLookupText(deferredStockSearch);
    return !keyword ? [] : stockItems.filter((item) => Number(item?.quantity_on_hand || 0) > 0).filter((item) => [item?.stock_code, item?.item_name, item?.item_category, item?.reference_item_code, item?.brand, item?.model].map(normalizeLookupText).join(" ").includes(keyword)).slice(0, 6);
  }, [deferredStockSearch, stockItems]);
  const filteredStockItems = useMemo(() => {
    const keyword = normalizeLookupText(stockSearchQuery);
    return stockItems.filter((item) => {
      const quantity = Number(item?.quantity_on_hand || 0);
      if (stockFilter === "READY" && quantity <= 0) return false;
      if (stockFilter === "LOW" && !isLowStock(item)) return false;
      if (stockFilter === "OUT" && quantity > 0) return false;
      return !keyword || [item?.stock_code, item?.item_name, item?.item_category, item?.category_th, item?.reference_item_code, item?.brand, item?.model, item?.location, item?.source_ref, item?.lot_number, item?.notes].map(normalizeLookupText).join(" ").includes(keyword);
    });
  }, [stockFilter, stockItems, stockSearchQuery]);
  const summary = useMemo(() => ({
    totalUnits: stockItems.reduce((sum, item) => sum + Number(item?.quantity_on_hand || 0), 0),
    lowStockCount: stockItems.filter(isLowStock).length,
    outOfStockCount: stockItems.filter((item) => Number(item?.quantity_on_hand || 0) <= 0).length,
    issuedThisMonth: issueLogs.reduce((sum, log) => {
      const date = new Date(log?.issued_at || log?.created_at || 0);
      const now = new Date();
      return Number.isNaN(date.getTime()) || date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear() ? sum : sum + Number(log?.quantity || 0);
    }, 0),
  }), [issueLogs, stockItems]);
  const summaryCards = useMemo(() => [
    { key: "tracked", title: "รายการ stock", value: formatQuantity(stockItems.length), valueClass: "text-violet-500", hint: "จำนวน lot / SKU ที่ติดตามอยู่" },
    { key: "units", title: "คงเหลือทั้งหมด", value: formatQuantity(summary.totalUnits), valueClass: "text-blue-500", hint: "รวมทุกหมวดอุปกรณ์" },
    { key: "low", title: "ใกล้หมด", value: formatQuantity(summary.lowStockCount), valueClass: "text-amber-500", hint: "ต่ำกว่าหรือเท่าจุดเตือนขั้นต่ำ" },
    { key: "issued", title: "เบิกเดือนนี้", value: formatQuantity(summary.issuedThisMonth), valueClass: "text-emerald-500", hint: "ยอดเบิกแบบ walk-in ล่าสุด" },
  ], [stockItems.length, summary]);
  const stockIssueSummaryById = useMemo(() => {
    const summaryById = new Map();
    issueLogs.forEach((log) => {
      const stockItemId = String(log?.stock_item_id || "");
      if (!stockItemId) return;
      const current = summaryById.get(stockItemId) || { totalIssued: 0, issueCount: 0, latestLog: null };
      const quantity = Number(log?.quantity || 0);
      const logTime = new Date(log?.issued_at || log?.created_at || 0).getTime();
      const currentLatestTime = new Date(current.latestLog?.issued_at || current.latestLog?.created_at || 0).getTime();
      summaryById.set(stockItemId, {
        totalIssued: current.totalIssued + quantity,
        issueCount: current.issueCount + 1,
        latestLog: !current.latestLog || logTime > currentLatestTime ? log : current.latestLog,
      });
    });
    return summaryById;
  }, [issueLogs]);
  const requesterDirectoryLookup = useMemo(() => {
    const byProfileId = new Map();
    const byEmployeeCode = new Map();
    const byName = new Map();
    directoryMembers.forEach((member) => {
      if (member?.id) byProfileId.set(String(member.id), member);
      const employeeCode = normalizeLookupText(member?.employee_code);
      if (employeeCode) byEmployeeCode.set(employeeCode, member);
      const fullName = normalizeLookupText(member?.full_name);
      if (fullName) byName.set(fullName, member);
    });
    return { byProfileId, byEmployeeCode, byName };
  }, [directoryMembers]);
  const resolveRequesterProfile = (log) => {
    const profileId = String(log?.requester_profile_id || "");
    const employeeCode = normalizeLookupText(log?.requester_emp_id);
    const requesterName = normalizeLookupText(log?.requester_name);
    return (
      requesterDirectoryLookup.byProfileId.get(profileId) ||
      requesterDirectoryLookup.byEmployeeCode.get(employeeCode) ||
      requesterDirectoryLookup.byName.get(requesterName) ||
      null
    );
  };

  const handleStockFieldChange = (field, value) => setStockForm((prev) => ({ ...prev, [field]: value }));
  const handleIssueFieldChange = (field, value) => setIssueForm((prev) => ({ ...prev, [field]: value, ...(field === "stock_item_search" ? { stock_item_id: "" } : {}), ...((field === "requester_name" || field === "requester_emp_id") ? { requester_profile_id: "" } : {}) }));
  const handleStockCategoryChange = (categoryKey) => {
    const group = IT_STOCK_CATEGORY_OPTIONS.find((item) => item.key === categoryKey) || null;
    setStockForm((prev) => ({ ...prev, category_key: categoryKey, category_th: group?.categoryTh || "", category_en: group?.categoryEn || "", item_category: group?.categoryEn || "", item_prefix: "", reference_item_code: "", description_th: "", description_en: "", item_name: "" }));
  };
  const handleCatalogItemChange = (referenceCode) => {
    const item = findStockCatalogItem(referenceCode);
    setStockForm((prev) => !item ? { ...prev, item_prefix: "", reference_item_code: "", description_th: "", description_en: "", item_name: "" } : { ...prev, category_key: item.categoryKey, category_th: item.categoryTh, category_en: item.categoryEn, item_category: item.categoryEn, item_prefix: item.prefix, reference_item_code: item.referenceCode, description_th: item.descriptionTh, description_en: item.descriptionEn, item_name: item.descriptionTh, unit: item.unit || prev.unit, stock_code: prev.stock_code || item.referenceCode });
  };
  const handleSelectFiles = (files, setter, imageOnly = false) => {
    const entries = Array.from(files || []);
    if (entries.length === 0) return 0;
    const oversized = entries.find((file) => Number(file?.size || 0) > STOCK_ATTACHMENT_MAX_SIZE);
    if (oversized) { toast.error(`ไฟล์ ${oversized.name} ต้องมีขนาดไม่เกิน 20 MB`); return 0; }
    if (imageOnly && entries.some((file) => !String(file?.type || "").startsWith("image/"))) { toast.error("หลักฐานการเบิกต้องเป็นรูปภาพเท่านั้น"); return 0; }
    const nextEntries = entries.map(createPendingAttachmentEntry);
    setter((prev) => [...prev, ...nextEntries]);
    return nextEntries.length;
  };
  const removePendingFile = (entryId, setter) => setter((prev) => { const next = []; prev.forEach((entry) => { if (entry.id === entryId) revokePendingPreview(entry); else next.push(entry); }); return next; });
  const handlePasteIssueEvidence = (event) => {
    const itemFiles = Array.from(event.clipboardData?.items || []).filter((item) => String(item?.type || "").startsWith("image/")).map((item) => item.getAsFile()).filter(Boolean);
    const fileFallbacks = Array.from(event.clipboardData?.files || []).filter((file) => String(file?.type || "").startsWith("image/"));
    const imageFiles = (itemFiles.length > 0 ? itemFiles : fileFallbacks).map((file, index) => file?.name ? file : new File([file], `stock-issue-evidence-${Date.now()}-${index}.png`, { type: file?.type || "image/png" }));
    if (imageFiles.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const addedCount = handleSelectFiles(imageFiles, setPendingIssueFiles, true);
    if (addedCount > 0) toast.success(`วางรูปหลักฐานแล้ว ${addedCount} รูป`);
  };
  const resetStockForm = () => {
    pendingStockImageFilesRef.current.forEach(revokePendingPreview);
    pendingStockFilesRef.current.forEach(revokePendingPreview);
    pendingStockImageFilesRef.current = [];
    pendingStockFilesRef.current = [];
    if (stockImageInputRef.current) stockImageInputRef.current.value = "";
    if (stockFileInputRef.current) stockFileInputRef.current.value = "";
    setEditingId("");
    setStockForm(EMPTY_STOCK_FORM);
    setStockAttachments([]);
    setRemovedStockAttachments([]);
    setPendingStockImageFiles([]);
    setPendingStockFiles([]);
  };
  const resetIssueForm = () => { pendingIssueFilesRef.current.forEach(revokePendingPreview); pendingIssueFilesRef.current = []; if (issueFileInputRef.current) issueFileInputRef.current.value = ""; setIssueForm(EMPTY_ISSUE_FORM); setPendingIssueFiles([]); setActiveLookupField(""); };
  const handleRemoveExistingStockAttachment = (attachment) => { setRemovedStockAttachments((prev) => prev.some((item) => String(item?.id || "") === String(attachment?.id || "")) ? prev : [...prev, attachment]); setStockAttachments((prev) => prev.filter((item) => String(item?.id || "") !== String(attachment?.id || ""))); };
  const handleOpenIssueModal = () => {
    resetIssueForm();
    setIssueModalOpen(true);
  };
  const handleCloseIssueModal = () => {
    if (issuingStock) return;
    resetIssueForm();
    setIssueModalOpen(false);
  };
  const handleOpenReceiveModal = () => {
    resetStockForm();
    setReceiveModalOpen(true);
  };
  const handleCloseReceiveModal = () => {
    if (savingStock) return;
    resetStockForm();
    setReceiveModalOpen(false);
  };
  const handleEditItem = (item) => {
    const catalog = findCatalogItemForStock(item);
    pendingStockImageFilesRef.current.forEach(revokePendingPreview);
    pendingStockFilesRef.current.forEach(revokePendingPreview);
    pendingStockImageFilesRef.current = [];
    pendingStockFilesRef.current = [];
    if (stockImageInputRef.current) stockImageInputRef.current.value = "";
    if (stockFileInputRef.current) stockFileInputRef.current.value = "";
    setEditingId(String(item?.id || ""));
    setStockForm({ category_key: catalog?.categoryKey || "", category_th: catalog?.categoryTh || item?.category_th || "", category_en: catalog?.categoryEn || item?.category_en || "", item_prefix: catalog?.prefix || item?.item_prefix || "", reference_item_code: catalog?.referenceCode || item?.reference_item_code || "", description_th: catalog?.descriptionTh || item?.description_th || "", description_en: catalog?.descriptionEn || item?.description_en || "", stock_code: item?.stock_code || "", item_name: item?.item_name || catalog?.descriptionTh || "", item_category: catalog?.categoryEn || item?.item_category || "", brand: item?.brand || "", model: item?.model || "", unit: item?.unit || catalog?.unit || "ชิ้น", quantity_on_hand: String(Number(item?.quantity_on_hand || 0)), minimum_quantity: String(Number(item?.minimum_quantity || 0)), location: item?.location || "", source_ref: item?.source_ref || "", lot_number: item?.lot_number || "", notes: item?.notes || "" });
    setStockAttachments(Array.isArray(item?.stock_attachments) ? item.stock_attachments : []);
    setRemovedStockAttachments([]);
    setPendingStockImageFiles([]);
    setPendingStockFiles([]);
    setReceiveModalOpen(true);
    onStockManagementSectionChange?.("receive");
  };
  const handlePrefillIssue = (item) => {
    onStockManagementSectionChange?.("issue");
    setIssueForm((prev) => ({ ...prev, stock_item_id: item.id, stock_item_search: `${item.stock_code || "-"} • ${item.item_name || "-"}` }));
    setIssueModalOpen(true);
  };
  const handleSelectProfile = (member) => { setIssueForm((prev) => ({ ...prev, requester_name: member.full_name || prev.requester_name, requester_emp_id: member.employee_code || prev.requester_emp_id, requester_department: member.department || prev.requester_department, requester_profile_id: member.id || "" })); setActiveLookupField(""); };
  const handleSelectStockItem = (item) => { setIssueForm((prev) => ({ ...prev, stock_item_id: item.id, stock_item_search: `${item.stock_code || "-"} • ${item.item_name || "-"}` })); setActiveLookupField(""); };
  const handleImportedProcurementStock = async () => {
    resetStockForm();
    await loadPageData({ silent: true });
  };
  const handleSaveStock = async (event) => {
    event.preventDefault();
    if (savingStock) return;
    try {
      setSavingStock(true);
      setErrorMessage("");
      const stockImageUploads = pendingStockImageFiles.map((entry) => ({ file: entry.file, role: "device" }));
      const stockEvidenceUploads = pendingStockFiles.map((entry) => ({ file: entry.file, role: "evidence" }));
      const savedItem = await saveStockItem({ editingId, formData: stockForm, currentUser, existingAttachments: stockAttachments, removedAttachments: removedStockAttachments, pendingFiles: [...stockImageUploads, ...stockEvidenceUploads].filter((entry) => entry.file) });
      setStockItems((prev) => editingId ? prev.map((item) => String(item?.id || "") === String(editingId) ? savedItem : item) : [savedItem, ...prev]);
      toast.success(editingId ? "อัปเดต stock แล้ว" : "เพิ่ม stock แล้ว");
      resetStockForm();
      setReceiveModalOpen(false);
    } catch (error) {
      console.error("Save stock item error:", error);
      void loadPageData({ silent: true });
      if (isStockSchemaError(error)) { setSchemaOutdated(true); toast.error("schema stock management ยังไม่อัปเดต"); }
      else if (isStockPermissionDenied(error)) toast.error("บัญชีนี้ยังไม่มีสิทธิ์แก้ไข stock");
      else if (String(error?.code || "") === "23505") toast.error(`รหัส ${normalizeText(stockForm.stock_code).toUpperCase()} ถูกใช้งานแล้ว`);
      else toast.error(error?.message || "บันทึก stock ไม่สำเร็จ");
    } finally { setSavingStock(false); }
  };
  const handleDeleteStock = async (item) => {
    if (!item?.id || deletingStockId) return;
    const confirmed = window.confirm(`ลบรายการ stock "${item.item_name || item.stock_code || "-"}" ใช่หรือไม่?\n\nรายการที่มีประวัติการเบิกแล้วจะไม่สามารถลบได้`);
    if (!confirmed) return;

    try {
      setDeletingStockId(String(item.id));
      setErrorMessage("");
      await deleteStockItem({ stockItem: item });
      setStockItems((prev) => prev.filter((stockItem) => String(stockItem?.id || "") !== String(item.id)));
      if (String(editingId || "") === String(item.id)) {
        resetStockForm();
        setReceiveModalOpen(false);
      }
      toast.success("ลบรายการ stock แล้ว");
    } catch (error) {
      console.error("Delete stock item error:", error);
      if (isStockSchemaError(error)) { setSchemaOutdated(true); toast.error("schema stock management ยังไม่อัปเดต"); }
      else if (isStockPermissionDenied(error)) toast.error("บัญชีนี้ยังไม่มีสิทธิ์ลบ stock");
      else if (String(error?.code || "") === "23503") toast.error("รายการนี้มีประวัติการเบิกแล้ว ไม่สามารถลบได้");
      else toast.error(error?.message || "ลบรายการ stock ไม่สำเร็จ");
    } finally {
      setDeletingStockId("");
    }
  };
  const handleSubmitIssue = async (event) => {
    event.preventDefault();
    if (issuingStock || !selectedIssueItem) return;
    try {
      setIssuingStock(true);
      setErrorMessage("");
      const result = await issueStockItem({ stockItem: selectedIssueItem, quantity: issueForm.quantity, requester: issueForm, purpose: issueForm.purpose, notes: issueForm.notes, currentUser, pendingFiles: pendingIssueFiles.map((entry) => entry.file).filter(Boolean) });
      setStockItems((prev) => prev.map((item) => String(item?.id || "") === String(result.updatedItem?.id || "") ? result.updatedItem : item));
      setIssueLogs((prev) => [result.createdLog, ...prev].slice(0, 80));
      toast.success("บันทึกการเบิก stock แล้ว");
      resetIssueForm();
      setIssueModalOpen(false);
    } catch (error) {
      console.error("Issue stock error:", error);
      if (isStockSchemaError(error)) { setSchemaOutdated(true); toast.error("schema stock management ยังไม่อัปเดต"); }
      else if (isStockPermissionDenied(error)) toast.error("บัญชีนี้ยังไม่มีสิทธิ์บันทึกการเบิก");
      else toast.error(error?.message || "บันทึกการเบิกไม่สำเร็จ");
    } finally { setIssuingStock(false); }
  };
  const renderLookupDropdown = (field) => {
    const isProfileLookup = field === "requester_name" || field === "requester_emp_id";
    const suggestions = isProfileLookup ? profileSuggestions : stockSuggestions;
    const show = isProfileLookup ? Boolean(normalizedRequesterQuery) : Boolean(normalizeLookupText(deferredStockSearch));
    if (activeLookupField !== field || (!show && suggestions.length === 0)) return null;
    return (
      <div className={`absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border ${theme === "dark" ? "border-slate-700 bg-slate-900 shadow-2xl" : "border-slate-200 bg-white shadow-xl"}`}>
        {suggestions.length > 0 ? suggestions.map((entry) => isProfileLookup ? (
          <button key={entry.id || `${entry.employee_code}-${entry.full_name}`} type="button" onClick={() => handleSelectProfile(entry)} className={`flex w-full items-center gap-3 border-b px-3 py-3 text-left transition last:border-b-0 ${theme === "dark" ? "border-slate-800 hover:bg-slate-800" : "border-slate-100 hover:bg-slate-50"}`}>
            <img src={entry.avatar_url || buildAvatarFallback(entry.full_name || entry.employee_code || "U")} alt={entry.full_name || "profile"} onError={(event) => { event.currentTarget.src = buildAvatarFallback(entry.full_name || entry.employee_code || "U"); }} className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover" />
            <div className="min-w-0"><p className={`truncate text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{entry.full_name || "-"}</p><p className={`truncate text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{entry.employee_code || "ไม่มีรหัส"} • {entry.department || "ไม่ระบุแผนก"}</p></div>
          </button>
        ) : (
          <button key={entry.id} type="button" onClick={() => handleSelectStockItem(entry)} className={`flex w-full items-center gap-3 border-b px-3 py-3 text-left transition last:border-b-0 ${theme === "dark" ? "border-slate-800 hover:bg-slate-800" : "border-slate-100 hover:bg-slate-50"}`}>
            {getPrimaryStockImage(entry) ? <img src={getPrimaryStockImage(entry).file_url} alt={entry.item_name || "stock"} className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 object-cover" /> : <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700"><Package size={18} /></span>}
            <div className="min-w-0 flex-1"><p className={`truncate text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{entry.item_name || "-"}</p><p className={`truncate text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{entry.stock_code || "-"} • คงเหลือ {formatQuantity(entry.quantity_on_hand)} {entry.unit || "ชิ้น"}</p></div>
          </button>
        )) : <div className={`flex items-center gap-2 px-3 py-3 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}><Search size={14} /><span>{isProfileLookup ? "ไม่พบรายชื่อที่ใกล้เคียง" : "ไม่พบรายการ stock ที่พร้อมเบิก"}</span></div>}
      </div>
    );
  };

  const normalizedStockSection = ["receive", "history"].includes(stockManagementSection) ? stockManagementSection : "issue";
  const showIssuePage = normalizedStockSection === "issue";
  const showReceivePage = normalizedStockSection === "receive";
  const showHistoryPage = normalizedStockSection === "history";
  const showStockList = !showHistoryPage;
  const pageMeta = {
    issue: {
      title: "บันทึกการเบิกแบบ walk-in",
      description: "ค้นหาพนักงาน เลือก stock ระบุจำนวน และแนบรูปหลักฐานก่อนบันทึก เพื่อไม่ปนกับงานรับเข้าและประวัติ",
    },
    receive: {
      title: "รับเข้า stock จากจัดซื้อ",
      description: "เพิ่มหรือแก้ไข lot จากจัดซื้อ เก็บ PR/PO และหลักฐานรับเข้าแยกจากงานเบิก",
    },
    history: {
      title: "ประวัติการเบิกจาก stock",
      description: "ดูรายการเบิกย้อนหลังและรูปหลักฐานเท่านั้น ไม่มีฟอร์มรับเข้า/เบิกมาปะปน",
    },
  }[normalizedStockSection];

  return (
    <>
      <section className="mb-4"><p className={`text-xs font-black uppercase tracking-[0.16em] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>จัดการ stock IT</p><h2 className={`mt-1 text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>{pageMeta.title}</h2><p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>{pageMeta.description}</p></section>
      {schemaOutdated ? <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><p className="font-semibold">schema stock management ยังไม่พร้อม</p><p className="mt-1">กรุณารัน migration ที่ <span className="font-mono">{MIGRATION_PATH}</span> ใน Supabase ก่อนใช้งานหน้าเมนูนี้</p></section> : null}
      <DashboardSummaryGrid items={summaryCards} theme={theme} uiTheme={uiTheme} />
      {showReceivePage ? (
        <section className="mt-4">
          <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>รับเข้า stock จากจัดซื้อ</h3>
                <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>เลือกหมวดมาตรฐานและรหัสอุปกรณ์ก่อนบันทึก lot / PR / PO</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleOpenReceiveModal} className="inline-flex items-center gap-2 rounded-lg bg-[#2b59b0] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#244a95]">
                  <Plus size={14} />
                  รับเข้า lot ใหม่
                </button>
                <StockProcurementImportButton currentUser={currentUser} onImported={handleImportedProcurementStock} />
              </div>
            </div>
          </article>
        </section>
      ) : null}
      {showReceivePage && receiveModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:py-8">
          <div className={`w-full max-w-5xl overflow-hidden rounded-lg border shadow-2xl ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-white"}`}>
            <div className={`flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5 ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>stock receiving</p>
                <h3 className={`mt-1 text-lg font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>{editingId ? "แก้ไข lot / ตรวจ stock" : "รับเข้า stock จากจัดซื้อ"}</h3>
                <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>หมวดมาตรฐานและรหัสอุปกรณ์เป็นข้อมูลตั้งต้นก่อนบันทึก lot / PR / PO</p>
              </div>
              <button type="button" onClick={handleCloseReceiveModal} disabled={savingStock} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${uiTheme.statusButton}`} aria-label="ปิด popup รับเข้า stock">
                <X size={16} />
              </button>
            </div>
            <form className="max-h-[calc(100vh-9rem)] overflow-y-auto px-4 py-4 sm:px-5" onSubmit={handleSaveStock} noValidate>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <section className={`rounded-lg border p-3 ${theme === "dark" ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-slate-50"}`}>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>หมวดมาตรฐาน *</span>
                        <select value={stockForm.category_key} onChange={(event) => handleStockCategoryChange(event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} required>
                          <option value="">เลือกหมวดมาตรฐาน</option>
                          {IT_STOCK_CATEGORY_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.categoryTh} / {option.categoryEn}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>รหัสอุปกรณ์ *</span>
                        <select value={stockForm.reference_item_code} onChange={(event) => handleCatalogItemChange(event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} disabled={!stockForm.category_key} required>
                          <option value="">เลือกรหัสอุปกรณ์</option>
                          {availableCatalogItems.map((item) => <option key={item.referenceCode} value={item.referenceCode}>{item.referenceCode} - {item.descriptionTh}</option>)}
                        </select>
                      </label>
                    </div>
                    {selectedCatalogItem ? (
                      <div className={`mt-3 rounded-lg border px-3 py-3 ${theme === "dark" ? "border-slate-700 bg-slate-950/60" : "border-blue-100 bg-blue-50/80"}`}>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700">{selectedCatalogItem.prefix}</span>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">{selectedCatalogItem.referenceCode}</span>
                          <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{selectedCatalogItem.unit}</span>
                        </div>
                        <p className={`mt-3 text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{selectedCatalogItem.descriptionTh}</p>
                        <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{selectedCatalogItem.descriptionEn}</p>
                      </div>
                    ) : null}
                  </section>

                  <section className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>รหัส stock / lot *</span>
                        <input value={stockForm.stock_code} onChange={(event) => handleStockFieldChange("stock_code", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="เช่น PO-2026-001-01" required />
                      </label>
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>ชื่ออุปกรณ์ *</span>
                        <input value={stockForm.item_name} onChange={(event) => handleStockFieldChange("item_name", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="ชื่ออุปกรณ์" required />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>ยี่ห้อ</span>
                        <input value={stockForm.brand} onChange={(event) => handleStockFieldChange("brand", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="ยี่ห้อ" />
                      </label>
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>รุ่น</span>
                        <input value={stockForm.model} onChange={(event) => handleStockFieldChange("model", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="รุ่น" />
                      </label>
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>หน่วย</span>
                        <select value={stockForm.unit} onChange={(event) => handleStockFieldChange("unit", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}>
                          {UNIT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>เลข lot / batch</span>
                        <input value={stockForm.lot_number} onChange={(event) => handleStockFieldChange("lot_number", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="เลข lot / batch" />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>จำนวนรับเข้า</span>
                        <input value={stockForm.quantity_on_hand} onChange={(event) => handleStockFieldChange("quantity_on_hand", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} type="number" min="0" placeholder="จำนวน" />
                      </label>
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>จุดเตือนขั้นต่ำ</span>
                        <input value={stockForm.minimum_quantity} onChange={(event) => handleStockFieldChange("minimum_quantity", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} type="number" min="0" placeholder="ขั้นต่ำ" />
                      </label>
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>ตำแหน่งเก็บ</span>
                        <input value={stockForm.location} onChange={(event) => handleStockFieldChange("location", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="ตำแหน่งเก็บ" />
                      </label>
                      <label className="block">
                        <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>PR / PO / ใบรับเข้า</span>
                        <input value={stockForm.source_ref} onChange={(event) => handleStockFieldChange("source_ref", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="PR / PO / ใบรับเข้า" />
                      </label>
                    </div>
                    <label className="block">
                      <span className={`mb-1 block text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>หมายเหตุ</span>
                      <textarea value={stockForm.notes} onChange={(event) => handleStockFieldChange("notes", event.target.value)} className={`min-h-[92px] w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="หมายเหตุเพิ่มเติม" />
                    </label>
                  </section>
                </div>

                <aside className="space-y-4">
                  <AttachmentField title="รูปภาพอุปกรณ์" hint="รูปแรกจะแสดงเป็นภาพอุปกรณ์ในรายการ stock" buttonLabel="เพิ่มรูป" emptyLabel="ยังไม่มีรูปภาพอุปกรณ์" accept={STOCK_IMAGE_ACCEPT} capture="environment" inputRef={stockImageInputRef} onSelect={(files) => handleSelectFiles(files, setPendingStockImageFiles, true)} existing={stockImageAttachments} pending={pendingStockImageFiles} onPreview={setPreviewAttachment} onRemoveExisting={handleRemoveExistingStockAttachment} onRemovePending={(entryId) => removePendingFile(entryId, setPendingStockImageFiles)} />
                  <AttachmentField title="หลักฐานรับเข้า" hint="แนบ invoice, ใบส่งของ หรือไฟล์อ้างอิงของ lot นี้" buttonLabel="เพิ่มหลักฐาน" emptyLabel="ยังไม่มีไฟล์หลักฐานรับเข้า" accept={STOCK_ATTACHMENT_ACCEPT} inputRef={stockFileInputRef} onSelect={(files) => handleSelectFiles(files, setPendingStockFiles, false)} existing={stockEvidenceAttachments} pending={pendingStockFiles} onPreview={setPreviewAttachment} onRemoveExisting={handleRemoveExistingStockAttachment} onRemovePending={(entryId) => removePendingFile(entryId, setPendingStockFiles)} />
                </aside>
              </div>
              <div className={`mt-5 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                <button type="button" onClick={handleCloseReceiveModal} disabled={savingStock} className={`inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${uiTheme.statusButton}`}>ยกเลิก</button>
                <button type="submit" disabled={savingStock} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2b59b0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:opacity-60">
                  {savingStock ? <Loader2 size={16} className="animate-spin" /> : editingId ? <PencilLine size={16} /> : <Save size={16} />}
                  {savingStock ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มเข้า stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showIssuePage ? (
        <section className="mt-4">
          <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>บันทึกการเบิกแบบ walk-in</h3>
                <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>เปิด popup เพื่อค้นหาผู้เบิก เลือก stock และแนบรูปหลักฐานก่อนบันทึก</p>
              </div>
              <button type="button" onClick={handleOpenIssueModal} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700">
                <Plus size={14} />
                บันทึกเบิก walk-in
              </button>
            </div>
          </article>
        </section>
      ) : null}
      {showIssuePage && issueModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:py-8">
          <div className={`w-full max-w-4xl overflow-hidden rounded-lg border shadow-2xl ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-white"}`}>
            <div className={`flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5 ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>stock issue</p>
                <h3 className={`mt-1 text-lg font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>บันทึกการเบิกแบบ walk-in</h3>
                <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ค้นหาผู้เบิก เลือก stock ระบุจำนวน และแนบรูปหลักฐานก่อนยืนยัน</p>
              </div>
              <button type="button" onClick={handleCloseIssueModal} disabled={issuingStock} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${uiTheme.statusButton}`} aria-label="ปิด popup เบิก stock">
                <X size={16} />
              </button>
            </div>
            <form ref={issueFormRef} onPaste={handlePasteIssueEvidence} className="max-h-[calc(100vh-9rem)] overflow-y-auto px-4 py-4 sm:px-5" onSubmit={handleSubmitIssue} noValidate>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-4">
                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="relative sm:col-span-2">
                      <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={issueForm.requester_name} onChange={(event) => handleIssueFieldChange("requester_name", event.target.value)} onFocus={() => setActiveLookupField("requester_name")} onBlur={() => window.setTimeout(() => setActiveLookupField((value) => value === "requester_name" ? "" : value), 120)} className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm ${uiTheme.searchInputMobile}`} placeholder="ชื่อผู้เบิก *" required autoComplete="off" />
                      {renderLookupDropdown("requester_name")}
                    </div>
                    <div className="relative">
                      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={issueForm.requester_emp_id} onChange={(event) => handleIssueFieldChange("requester_emp_id", event.target.value)} onFocus={() => setActiveLookupField("requester_emp_id")} onBlur={() => window.setTimeout(() => setActiveLookupField((value) => value === "requester_emp_id" ? "" : value), 120)} className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm ${uiTheme.searchInputMobile}`} placeholder="รหัสพนักงาน" autoComplete="off" />
                      {renderLookupDropdown("requester_emp_id")}
                    </div>
                    <div className="relative">
                      <Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={issueForm.requester_department} onChange={(event) => handleIssueFieldChange("requester_department", event.target.value)} className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm ${uiTheme.searchInputMobile}`} placeholder="แผนก" />
                    </div>
                  </section>
                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
                    <div className="relative">
                      <Package size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={issueForm.stock_item_search} onChange={(event) => handleIssueFieldChange("stock_item_search", event.target.value)} onFocus={() => setActiveLookupField("stock_item_search")} onBlur={() => window.setTimeout(() => setActiveLookupField((value) => value === "stock_item_search" ? "" : value), 120)} className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm ${uiTheme.searchInputMobile}`} placeholder="ค้นหา stock จากรหัสหรือชื่ออุปกรณ์ *" required autoComplete="off" />
                      {renderLookupDropdown("stock_item_search")}
                    </div>
                    <input value={issueForm.quantity} onChange={(event) => handleIssueFieldChange("quantity", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} type="number" min="1" placeholder="จำนวน" required />
                  </section>
                  {selectedIssueItem ? (
                    <section className={`rounded-lg border px-3 py-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/70" : "border-blue-100 bg-blue-50/60"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{selectedIssueItem.item_name || "-"}</p>
                          <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{selectedIssueItem.stock_code || "-"} • {selectedIssueItem.reference_item_code || selectedIssueItem.item_category || "-"} • คงเหลือ {formatQuantity(selectedIssueItem.quantity_on_hand)} {selectedIssueItem.unit || "ชิ้น"}</p>
                        </div>
                        <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${getAvailabilityClass(selectedIssueItem)}`}>{getAvailabilityLabel(selectedIssueItem)}</span>
                      </div>
                    </section>
                  ) : null}
                  <input value={issueForm.purpose} onChange={(event) => handleIssueFieldChange("purpose", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="วัตถุประสงค์การเบิก" />
                  <textarea value={issueForm.notes} onChange={(event) => handleIssueFieldChange("notes", event.target.value)} className={`min-h-[92px] w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="หมายเหตุเพิ่มเติม" />
                </div>
                <aside>
                  <AttachmentField title="รูปหลักฐานการเบิก" hint="บังคับแนบอย่างน้อย 1 รูป เพื่อยืนยันการจ่ายของ" pasteHint="แคปจอแล้วคลิกกล่องนี้ จากนั้นกด Ctrl+V เพื่อวางรูปได้ทันที" buttonLabel="ถ่ายหรือเลือกรูป" emptyLabel="ยังไม่ได้แนบรูปหลักฐานการเบิก" accept={ISSUE_ATTACHMENT_ACCEPT} capture="environment" inputRef={issueFileInputRef} onSelect={(files) => handleSelectFiles(files, setPendingIssueFiles, true)} onPaste={handlePasteIssueEvidence} pending={pendingIssueFiles} onPreview={setPreviewAttachment} onRemovePending={(entryId) => removePendingFile(entryId, setPendingIssueFiles)} />
                </aside>
              </div>
              <div className={`mt-5 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                <button type="button" onClick={handleCloseIssueModal} disabled={issuingStock} className={`inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${uiTheme.statusButton}`}>ยกเลิก</button>
                <button type="button" onClick={resetIssueForm} disabled={issuingStock} className={`inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${uiTheme.statusButton}`}>ล้างฟอร์ม</button>
                <button type="submit" disabled={issuingStock || !selectedIssueItem} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {issuingStock ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {issuingStock ? "กำลังบันทึก..." : "ยืนยันการเบิก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {showStockList ? (
        <section className={`mt-4 rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>{showIssuePage ? "รายการ stock สำหรับเลือกเบิก" : "รายการ stock สำหรับแก้ไข/ตรวจ lot"}</h3>
              <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{showIssuePage ? "หน้านี้แสดง action เบิกออกเท่านั้น เพื่อไม่ปนกับงานรับเข้า" : "หน้านี้แสดง action แก้ไขเท่านั้น เพื่อไม่ปนกับงานเบิก"}</p>
            </div>
            <div className="relative min-w-0 flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={stockSearchQuery} onChange={(event) => setStockSearchQuery(event.target.value)} placeholder="ค้นหารหัส stock, lot, รหัสอ้างอิง, ชื่ออุปกรณ์, ยี่ห้อ, ที่เก็บ, PR/PO" className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm ${uiTheme.searchInputMobile}`} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}>
                <option value="ALL">ทุกสถานะ</option>
                <option value="READY">พร้อมเบิก</option>
                <option value="LOW">ใกล้หมด</option>
                <option value="OUT">หมด stock</option>
              </select>
              <button type="button" onClick={() => void loadPageData({ silent: true })} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${uiTheme.statusButton}`}>
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                รีเฟรชข้อมูล
              </button>
            </div>
          </div>
          {errorMessage ? (
            <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${theme === "dark" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {loading ? (
              <div className={`rounded-lg border px-4 py-5 text-center text-sm ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>กำลังโหลดข้อมูล stock...</div>
            ) : filteredStockItems.length === 0 ? (
              <div className={`rounded-lg border px-4 py-5 text-center text-sm ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>ไม่พบรายการ stock</div>
            ) : filteredStockItems.map((item) => {
              const stockImage = getPrimaryStockImage(item);
              const stockAttachments = getSafeAttachments(item.stock_attachments);
              const evidencePreview = stockAttachments.find((attachment) => stockImage ? String(attachment?.id || "") !== String(stockImage?.id || "") : true) || stockImage || null;
              const itemCategoryLabel = item.category_th || item.category_en || item.item_category || "-";
              const itemCodeLabel = item.reference_item_code || "-";
              const issueSummary = stockIssueSummaryById.get(String(item.id || ""));
              const latestIssueLog = issueSummary?.latestLog || null;
              const latestIssueLabel = latestIssueLog ? `${formatQuantity(latestIssueLog.quantity)} ${latestIssueLog.unit_snapshot || item.unit || "ชิ้น"} • ${formatDateTime(latestIssueLog.issued_at || latestIssueLog.created_at)}` : "ยังไม่มีประวัติเบิก";
              return (
                <article key={item.id} className={`rounded-lg border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                  <div className="flex gap-3">
                    {stockImage ? (
                      <button type="button" onClick={() => setPreviewAttachment(stockImage)} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        <img src={stockImage.file_url} alt={stockImage.file_name || item.item_name || "stock"} className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border ${theme === "dark" ? "border-slate-700 bg-slate-800 text-slate-500" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                        <FileImage size={24} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{item.item_name || "-"}</p>
                          <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{item.stock_code || "-"} • {itemCodeLabel}{item.lot_number ? ` • lot ${item.lot_number}` : ""}</p>
                        </div>
                        <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${getAvailabilityClass(item)}`}>{getAvailabilityLabel(item)}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>ประเภท: {itemCategoryLabel}</div>
                        <div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>รหัสอุปกรณ์: {itemCodeLabel}</div>
                        <div className={`rounded-lg border px-3 py-2 sm:col-span-2 ${theme === "dark" ? "border-blue-500/30 bg-blue-500/10 text-blue-100" : "border-blue-100 bg-blue-50 text-blue-800"}`}>
                          <p className="font-semibold">เบิกล่าสุด: {latestIssueLabel}</p>
                          <p className={`mt-1 ${theme === "dark" ? "text-blue-200/80" : "text-blue-700"}`}>เบิกสะสม: {formatQuantity(issueSummary?.totalIssued || 0)} {item.unit || "ชิ้น"}{issueSummary?.issueCount ? ` • ${formatQuantity(issueSummary.issueCount)} ครั้ง` : ""}</p>
                        </div>
                        <div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>คงเหลือ: {formatQuantity(item.quantity_on_hand)} {item.unit || "ชิ้น"}</div>
                        <div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>ขั้นต่ำ: {formatQuantity(item.minimum_quantity)} {item.unit || "ชิ้น"}</div>
                        <div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>ที่เก็บ: {item.location || "-"}</div>
                        <div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>หลักฐาน: {stockAttachments.length} ไฟล์</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {evidencePreview ? <button type="button" onClick={() => setPreviewAttachment(evidencePreview)} className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">ดูหลักฐาน</button> : null}
                    {showIssuePage ? <button type="button" onClick={() => handlePrefillIssue(item)} disabled={Number(item?.quantity_on_hand || 0) <= 0} className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">เบิกออก</button> : null}
                    {showReceivePage ? <button type="button" onClick={() => handleEditItem(item)} className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">แก้ไข</button> : null}
                    {showReceivePage ? <button type="button" onClick={() => handleDeleteStock(item)} disabled={deletingStockId === String(item.id || "")} className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60">{deletingStockId === String(item.id || "") ? "กำลังลบ..." : "ลบรายการ"}</button> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      {showHistoryPage ? (
        <section className={`mt-4 rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>ประวัติการเบิกจาก stock</h3>
              <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ล่าสุด {Math.min(issueLogs.length, 80)} รายการ สำหรับติดตามการเบิก walk-in และรูปหลักฐานการจ่ายของ</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className={`inline-flex rounded-lg border p-1 ${theme === "dark" ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-50"}`}>
                <button type="button" onClick={() => setHistoryViewMode("card")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${historyViewMode === "card" ? "bg-[#2b59b0] text-white" : theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-white"}`} title="มุมมองการ์ด">
                  <LayoutGrid size={14} />
                  Card
                </button>
                <button type="button" onClick={() => setHistoryViewMode("list")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${historyViewMode === "list" ? "bg-[#2b59b0] text-white" : theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-white"}`} title="มุมมอง list">
                  <List size={14} />
                  List
                </button>
              </div>
              <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>หมด stock {formatQuantity(summary.outOfStockCount)} รายการ</div>
            </div>
          </div>
          {issueLogs.length === 0 ? (
            <div className={`mt-4 rounded-lg border px-4 py-5 text-center text-sm ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>ยังไม่มีประวัติการเบิก</div>
          ) : historyViewMode === "card" ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {issueLogs.map((log) => {
                const requesterProfile = resolveRequesterProfile(log);
                const requesterName = log.requester_name || requesterProfile?.full_name || "-";
                const requesterAvatar = requesterProfile?.avatar_url || buildAvatarFallback(requesterName || log.requester_emp_id || "U");
                return (
                  <article key={log.id} className={`rounded-lg border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <img src={requesterAvatar} alt={requesterName || "requester"} onError={(event) => { event.currentTarget.src = buildAvatarFallback(requesterName || log.requester_emp_id || "U"); }} className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-white object-cover" />
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{log.item_name_snapshot || "-"}</p>
                          <p className={`mt-1 truncate text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{log.stock_code_snapshot || "-"} • {formatDateTime(log.issued_at || log.created_at)}</p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">{formatQuantity(log.quantity)} {log.unit_snapshot || "ชิ้น"}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                      <div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>ผู้เบิก: {requesterName} {log.requester_emp_id ? `(${log.requester_emp_id})` : ""}{log.requester_department ? ` • ${log.requester_department}` : ""}</div>
                      <div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>วัตถุประสงค์: {log.purpose || log.notes || "-"}</div>
                      <div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>หลักฐาน: {Array.isArray(log.issue_attachments) ? log.issue_attachments.length : 0} รูป</div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {Array.isArray(log.issue_attachments) && log.issue_attachments.length > 0 ? <button type="button" onClick={() => setPreviewAttachment(log.issue_attachments[0])} className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">ดูหลักฐาน</button> : null}
                      <div className={`flex-1 rounded-lg border px-3 py-2 text-xs ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>ผู้บันทึก: {log.issued_by_name || "-"}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={`mt-4 overflow-hidden rounded-lg border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
              <div className={`hidden grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)_120px_150px_100px] gap-3 border-b px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] lg:grid ${theme === "dark" ? "border-slate-700 bg-slate-900 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                <span>อุปกรณ์</span>
                <span>ผู้เบิก</span>
                <span>จำนวน</span>
                <span>วันที่เบิก</span>
                <span>หลักฐาน</span>
              </div>
              {issueLogs.map((log) => {
                const requesterProfile = resolveRequesterProfile(log);
                const requesterName = log.requester_name || requesterProfile?.full_name || "-";
                const requesterAvatar = requesterProfile?.avatar_url || buildAvatarFallback(requesterName || log.requester_emp_id || "U");
                return (
                  <div key={log.id} className={`grid grid-cols-1 gap-3 border-b px-3 py-3 text-sm last:border-b-0 lg:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)_120px_150px_100px] lg:items-center ${theme === "dark" ? "border-slate-700 bg-slate-900/60 text-slate-200" : "border-slate-100 bg-white text-slate-700"}`}>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{log.item_name_snapshot || "-"}</p>
                      <p className={`mt-1 truncate text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{log.stock_code_snapshot || "-"} • {log.purpose || log.notes || "-"}</p>
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={requesterAvatar} alt={requesterName || "requester"} onError={(event) => { event.currentTarget.src = buildAvatarFallback(requesterName || log.requester_emp_id || "U"); }} className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-white object-cover" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{requesterName}</p>
                        <p className={`truncate text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{log.requester_emp_id || "-"}{log.requester_department ? ` • ${log.requester_department}` : ""}</p>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{formatQuantity(log.quantity)} {log.unit_snapshot || "ชิ้น"}</div>
                    <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{formatDateTime(log.issued_at || log.created_at)}</div>
                    <div>{Array.isArray(log.issue_attachments) && log.issue_attachments.length > 0 ? <button type="button" onClick={() => setPreviewAttachment(log.issue_attachments[0])} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">ดูรูป</button> : <span className={`text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>ไม่มีรูป</span>}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
      <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
    </>
  );
}
