import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Building2, Eye, Loader2, Package, Paperclip, PencilLine, RefreshCw, Save, Search, Trash2, Upload, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import AttachmentPreviewModal from "../../work-notes/AttachmentPreviewModal";
import { formatFileSize, isImageAttachment } from "../../../services/workNotesService";
import { IT_STOCK_CATALOG, IT_STOCK_CATEGORY_OPTIONS, findStockCatalogItem } from "../constants/stockCatalog";
import StockProcurementImportButton from "../components/StockProcurementImportButton";
import DashboardSummaryGrid from "../components/DashboardSummaryGrid";
import { STOCK_ATTACHMENT_MAX_SIZE, isStockPermissionDenied, isStockSchemaError, issueStockItem, loadProfileDirectory, loadStockIssueLogs, loadStockItems, saveStockItem } from "../services/stockManagementService";

const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");
const MIGRATION_PATH = "database/20260326_it_stock_management.sql";
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

function AttachmentField({ title, hint, buttonLabel, emptyLabel, accept, capture, inputRef, onSelect, existing = [], pending = [], onPreview, onRemoveExisting, onRemovePending }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-sm font-bold text-slate-800">{title}</p><p className="text-[11px] text-slate-500">{hint}</p></div>
        <button type="button" onClick={() => inputRef.current?.click()} className="app-btn-secondary inline-flex items-center gap-2"><Upload size={14} />{buttonLabel}</button>
        <input ref={inputRef} type="file" multiple accept={accept} capture={capture} className="hidden" onChange={(event) => { onSelect(event.target.files); event.target.value = ""; }} />
      </div>
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

export default function StockManagementPage({ theme, uiTheme, currentUser }) {
  const stockFileInputRef = useRef(null);
  const issueFileInputRef = useRef(null);
  const issueFormRef = useRef(null);
  const pendingStockFilesRef = useRef([]);
  const pendingIssueFilesRef = useRef([]);
  const [stockItems, setStockItems] = useState([]);
  const [issueLogs, setIssueLogs] = useState([]);
  const [directoryMembers, setDirectoryMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStock, setSavingStock] = useState(false);
  const [issuingStock, setIssuingStock] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [schemaOutdated, setSchemaOutdated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [stockForm, setStockForm] = useState(EMPTY_STOCK_FORM);
  const [issueForm, setIssueForm] = useState(EMPTY_ISSUE_FORM);
  const [stockAttachments, setStockAttachments] = useState([]);
  const [removedStockAttachments, setRemovedStockAttachments] = useState([]);
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
  useEffect(() => { pendingStockFilesRef.current = pendingStockFiles; }, [pendingStockFiles]);
  useEffect(() => { pendingIssueFilesRef.current = pendingIssueFiles; }, [pendingIssueFiles]);
  useEffect(() => () => { pendingStockFilesRef.current.forEach(revokePendingPreview); pendingIssueFilesRef.current.forEach(revokePendingPreview); }, []);

  const selectedIssueItem = useMemo(() => stockItems.find((item) => String(item?.id || "") === String(issueForm.stock_item_id || "")) || null, [issueForm.stock_item_id, stockItems]);
  const selectedCatalogItem = useMemo(() => findStockCatalogItem(stockForm.reference_item_code), [stockForm.reference_item_code]);
  const availableCatalogItems = useMemo(() => stockForm.category_key ? IT_STOCK_CATALOG.filter((item) => item.categoryKey === stockForm.category_key) : [], [stockForm.category_key]);
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
    if (entries.length === 0) return;
    const oversized = entries.find((file) => Number(file?.size || 0) > STOCK_ATTACHMENT_MAX_SIZE);
    if (oversized) return toast.error(`ไฟล์ ${oversized.name} ต้องมีขนาดไม่เกิน 20 MB`);
    if (imageOnly && entries.some((file) => !String(file?.type || "").startsWith("image/"))) return toast.error("หลักฐานการเบิกต้องเป็นรูปภาพเท่านั้น");
    setter((prev) => [...prev, ...entries.map(createPendingAttachmentEntry)]);
  };
  const removePendingFile = (entryId, setter) => setter((prev) => { const next = []; prev.forEach((entry) => { if (entry.id === entryId) revokePendingPreview(entry); else next.push(entry); }); return next; });
  const resetStockForm = () => { pendingStockFilesRef.current.forEach(revokePendingPreview); pendingStockFilesRef.current = []; if (stockFileInputRef.current) stockFileInputRef.current.value = ""; setEditingId(""); setStockForm(EMPTY_STOCK_FORM); setStockAttachments([]); setRemovedStockAttachments([]); setPendingStockFiles([]); };
  const resetIssueForm = () => { pendingIssueFilesRef.current.forEach(revokePendingPreview); pendingIssueFilesRef.current = []; if (issueFileInputRef.current) issueFileInputRef.current.value = ""; setIssueForm(EMPTY_ISSUE_FORM); setPendingIssueFiles([]); setActiveLookupField(""); };
  const handleRemoveExistingStockAttachment = (attachment) => { setRemovedStockAttachments((prev) => prev.some((item) => String(item?.id || "") === String(attachment?.id || "")) ? prev : [...prev, attachment]); setStockAttachments((prev) => prev.filter((item) => String(item?.id || "") !== String(attachment?.id || ""))); };
  const handleEditItem = (item) => {
    const catalog = findStockCatalogItem(item?.reference_item_code);
    pendingStockFilesRef.current.forEach(revokePendingPreview);
    pendingStockFilesRef.current = [];
    if (stockFileInputRef.current) stockFileInputRef.current.value = "";
    setEditingId(String(item?.id || ""));
    setStockForm({ category_key: catalog?.categoryKey || "", category_th: item?.category_th || catalog?.categoryTh || "", category_en: item?.category_en || catalog?.categoryEn || "", item_prefix: item?.item_prefix || catalog?.prefix || "", reference_item_code: item?.reference_item_code || catalog?.referenceCode || "", description_th: item?.description_th || catalog?.descriptionTh || "", description_en: item?.description_en || catalog?.descriptionEn || "", stock_code: item?.stock_code || "", item_name: item?.item_name || "", item_category: item?.item_category || catalog?.categoryEn || "", brand: item?.brand || "", model: item?.model || "", unit: item?.unit || "ชิ้น", quantity_on_hand: String(Number(item?.quantity_on_hand || 0)), minimum_quantity: String(Number(item?.minimum_quantity || 0)), location: item?.location || "", source_ref: item?.source_ref || "", lot_number: item?.lot_number || "", notes: item?.notes || "" });
    setStockAttachments(Array.isArray(item?.stock_attachments) ? item.stock_attachments : []);
    setRemovedStockAttachments([]);
    setPendingStockFiles([]);
  };
  const handlePrefillIssue = (item) => { setIssueForm((prev) => ({ ...prev, stock_item_id: item.id, stock_item_search: `${item.stock_code || "-"} • ${item.item_name || "-"}` })); issueFormRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }); };
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
      const savedItem = await saveStockItem({ editingId, formData: stockForm, currentUser, existingAttachments: stockAttachments, removedAttachments: removedStockAttachments, pendingFiles: pendingStockFiles.map((entry) => entry.file).filter(Boolean) });
      setStockItems((prev) => editingId ? prev.map((item) => String(item?.id || "") === String(editingId) ? savedItem : item) : [savedItem, ...prev]);
      toast.success(editingId ? "อัปเดต stock แล้ว" : "เพิ่ม stock แล้ว");
      resetStockForm();
    } catch (error) {
      console.error("Save stock item error:", error);
      void loadPageData({ silent: true });
      if (isStockSchemaError(error)) { setSchemaOutdated(true); toast.error("schema stock management ยังไม่อัปเดต"); }
      else if (isStockPermissionDenied(error)) toast.error("บัญชีนี้ยังไม่มีสิทธิ์แก้ไข stock");
      else if (String(error?.code || "") === "23505") toast.error(`รหัส ${normalizeText(stockForm.stock_code).toUpperCase()} ถูกใช้งานแล้ว`);
      else toast.error(error?.message || "บันทึก stock ไม่สำเร็จ");
    } finally { setSavingStock(false); }
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
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700"><Package size={18} /></span>
            <div className="min-w-0 flex-1"><p className={`truncate text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{entry.item_name || "-"}</p><p className={`truncate text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{entry.stock_code || "-"} • คงเหลือ {formatQuantity(entry.quantity_on_hand)} {entry.unit || "ชิ้น"}</p></div>
          </button>
        )) : <div className={`flex items-center gap-2 px-3 py-3 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}><Search size={14} /><span>{isProfileLookup ? "ไม่พบรายชื่อที่ใกล้เคียง" : "ไม่พบรายการ stock ที่พร้อมเบิก"}</span></div>}
      </div>
    );
  };

  return (
    <>
      <section className="mb-4"><h2 className={`text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>จัดการ stock อุปกรณ์ IT</h2><p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>รับเข้าอุปกรณ์ตามรหัสมาตรฐาน, เก็บหลักฐาน lot, และบันทึกการเบิกแบบ walk-in พร้อมรูปหลักฐาน</p></section>
      {schemaOutdated ? <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><p className="font-semibold">schema stock management ยังไม่พร้อม</p><p className="mt-1">กรุณารัน migration ที่ <span className="font-mono">{MIGRATION_PATH}</span> ใน Supabase ก่อนใช้งานหน้าเมนูนี้</p></section> : null}
      <DashboardSummaryGrid items={summaryCards} theme={theme} uiTheme={uiTheme} />
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <div className="flex items-center justify-between gap-3"><div><h3 className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>{editingId ? "แก้ไขรายการ stock" : "รับเข้า stock จากจัดซื้อ"}</h3><p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>เลือกหมวดมาตรฐานและรหัสอุปกรณ์ก่อน แล้วเก็บ lot / PR / PO พร้อมหลักฐานรับเข้า</p></div>{editingId ? <button type="button" onClick={resetStockForm} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${uiTheme.statusButton}`}>ยกเลิกแก้ไข</button> : null}</div>
          {!editingId ? (
            <div className={`mt-4 flex flex-col gap-2 rounded-2xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${theme === "dark" ? "border-emerald-500/20 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50/80"}`}>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${theme === "dark" ? "text-emerald-200" : "text-emerald-800"}`}>Import stock จากไฟล์จัดซื้อ</p>
                <p className={`mt-1 text-[11px] ${theme === "dark" ? "text-emerald-300/90" : "text-emerald-700"}`}>ใช้ไฟล์ Excel ฟอร์มจัดซื้อ IT เพื่อสร้าง stock code, lot และจำนวนคงเหลืออัตโนมัติ</p>
              </div>
              <StockProcurementImportButton currentUser={currentUser} onImported={handleImportedProcurementStock} />
            </div>
          ) : null}
          <form className="mt-4 space-y-4" onSubmit={handleSaveStock}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2"><select value={stockForm.category_key} onChange={(event) => handleStockCategoryChange(event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} required><option value="">เลือกหมวดมาตรฐาน *</option>{IT_STOCK_CATEGORY_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.categoryTh} / {option.categoryEn}</option>)}</select><select value={stockForm.reference_item_code} onChange={(event) => handleCatalogItemChange(event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} disabled={!stockForm.category_key} required><option value="">เลือกรหัสอุปกรณ์ *</option>{availableCatalogItems.map((item) => <option key={item.referenceCode} value={item.referenceCode}>{item.referenceCode} - {item.descriptionTh}</option>)}</select></div>
            {selectedCatalogItem ? <div className={`rounded-2xl border px-3 py-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/70" : "border-blue-100 bg-blue-50/70"}`}><div className="flex flex-wrap gap-2"><span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700">{selectedCatalogItem.prefix}</span><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">{selectedCatalogItem.referenceCode}</span><span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{selectedCatalogItem.unit}</span></div><p className={`mt-3 text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{selectedCatalogItem.descriptionTh}</p><p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{selectedCatalogItem.descriptionEn}</p></div> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><input value={stockForm.stock_code} onChange={(event) => handleStockFieldChange("stock_code", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="รหัส stock / lot *" required /><input value={stockForm.item_name} onChange={(event) => handleStockFieldChange("item_name", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="ชื่ออุปกรณ์ *" required /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><input value={stockForm.brand} onChange={(event) => handleStockFieldChange("brand", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="ยี่ห้อ" /><input value={stockForm.model} onChange={(event) => handleStockFieldChange("model", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="รุ่น" /><select value={stockForm.unit} onChange={(event) => handleStockFieldChange("unit", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}>{UNIT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select><input value={stockForm.lot_number} onChange={(event) => handleStockFieldChange("lot_number", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="เลข lot / batch" /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><input value={stockForm.quantity_on_hand} onChange={(event) => handleStockFieldChange("quantity_on_hand", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} type="number" min="0" placeholder="จำนวนรับเข้า" /><input value={stockForm.minimum_quantity} onChange={(event) => handleStockFieldChange("minimum_quantity", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} type="number" min="0" placeholder="จุดเตือนขั้นต่ำ" /><input value={stockForm.location} onChange={(event) => handleStockFieldChange("location", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="ตำแหน่งเก็บ" /><input value={stockForm.source_ref} onChange={(event) => handleStockFieldChange("source_ref", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="อ้างอิง PR/PO/ใบรับเข้า" /></div>
            <textarea value={stockForm.notes} onChange={(event) => handleStockFieldChange("notes", event.target.value)} className={`min-h-[92px] w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="หมายเหตุเพิ่มเติม" />
            <AttachmentField title="หลักฐาน lot ที่รับเข้า" hint="แนบรูปสินค้า, invoice, ใบส่งของ หรือเอกสารรับเข้าไว้กับ lot นี้" buttonLabel="เพิ่มไฟล์หรือรูป" emptyLabel="ยังไม่มีไฟล์หลักฐาน lot นี้" accept={STOCK_ATTACHMENT_ACCEPT} inputRef={stockFileInputRef} onSelect={(files) => handleSelectFiles(files, setPendingStockFiles, false)} existing={stockAttachments} pending={pendingStockFiles} onPreview={setPreviewAttachment} onRemoveExisting={handleRemoveExistingStockAttachment} onRemovePending={(entryId) => removePendingFile(entryId, setPendingStockFiles)} />
            <button type="submit" disabled={savingStock} className="inline-flex items-center gap-2 rounded-lg bg-[#2b59b0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:opacity-60">{savingStock ? <Loader2 size={16} className="animate-spin" /> : editingId ? <PencilLine size={16} /> : <Save size={16} />}{savingStock ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มเข้า stock"}</button>
          </form>
        </article>
        <article ref={issueFormRef} className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <div><h3 className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>บันทึกการเบิกแบบ walk-in</h3><p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ค้นหาผู้เบิกจากชื่อหรือรหัสพนักงาน แล้วคีย์รายการเบิกแทนผู้ใช้ได้ทันที พร้อมแนบรูปหลักฐานก่อนบันทึก</p></div>
          <form className="mt-4 space-y-4" onSubmit={handleSubmitIssue}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="relative sm:col-span-2"><UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={issueForm.requester_name} onChange={(event) => handleIssueFieldChange("requester_name", event.target.value)} onFocus={() => setActiveLookupField("requester_name")} onBlur={() => window.setTimeout(() => setActiveLookupField((value) => value === "requester_name" ? "" : value), 120)} className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm ${uiTheme.searchInputMobile}`} placeholder="ชื่อผู้เบิก *" required autoComplete="off" />{renderLookupDropdown("requester_name")}</div>
              <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={issueForm.requester_emp_id} onChange={(event) => handleIssueFieldChange("requester_emp_id", event.target.value)} onFocus={() => setActiveLookupField("requester_emp_id")} onBlur={() => window.setTimeout(() => setActiveLookupField((value) => value === "requester_emp_id" ? "" : value), 120)} className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm ${uiTheme.searchInputMobile}`} placeholder="รหัสพนักงาน" autoComplete="off" />{renderLookupDropdown("requester_emp_id")}</div>
              <div className="relative"><Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={issueForm.requester_department} onChange={(event) => handleIssueFieldChange("requester_department", event.target.value)} className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm ${uiTheme.searchInputMobile}`} placeholder="แผนก" /></div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]"><div className="relative"><Package size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={issueForm.stock_item_search} onChange={(event) => handleIssueFieldChange("stock_item_search", event.target.value)} onFocus={() => setActiveLookupField("stock_item_search")} onBlur={() => window.setTimeout(() => setActiveLookupField((value) => value === "stock_item_search" ? "" : value), 120)} className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm ${uiTheme.searchInputMobile}`} placeholder="ค้นหา stock จากรหัสหรือชื่ออุปกรณ์ *" required autoComplete="off" />{renderLookupDropdown("stock_item_search")}</div><input value={issueForm.quantity} onChange={(event) => handleIssueFieldChange("quantity", event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} type="number" min="1" placeholder="จำนวน" required /></div>
            {selectedIssueItem ? <div className={`rounded-lg border px-3 py-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/70" : "border-blue-100 bg-blue-50/60"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className={`truncate text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{selectedIssueItem.item_name || "-"}</p><p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{selectedIssueItem.stock_code || "-"} • {selectedIssueItem.reference_item_code || selectedIssueItem.item_category || "-"} • คงเหลือ {formatQuantity(selectedIssueItem.quantity_on_hand)} {selectedIssueItem.unit || "ชิ้น"}</p></div><span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getAvailabilityClass(selectedIssueItem)}`}>{getAvailabilityLabel(selectedIssueItem)}</span></div></div> : null}
            <input value={issueForm.purpose} onChange={(event) => handleIssueFieldChange("purpose", event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="วัตถุประสงค์การเบิก" />
            <textarea value={issueForm.notes} onChange={(event) => handleIssueFieldChange("notes", event.target.value)} className={`min-h-[92px] w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`} placeholder="หมายเหตุเพิ่มเติม" />
            <AttachmentField title="รูปหลักฐานการเบิก" hint="บังคับแนบอย่างน้อย 1 รูป เพื่อยืนยันการจ่ายของ" buttonLabel="ถ่ายหรือเลือกรูป" emptyLabel="ยังไม่ได้แนบรูปหลักฐานการเบิก" accept={ISSUE_ATTACHMENT_ACCEPT} capture="environment" inputRef={issueFileInputRef} onSelect={(files) => handleSelectFiles(files, setPendingIssueFiles, true)} pending={pendingIssueFiles} onPreview={setPreviewAttachment} onRemovePending={(entryId) => removePendingFile(entryId, setPendingIssueFiles)} />
            <div className="flex flex-wrap items-center gap-2"><button type="submit" disabled={issuingStock || !selectedIssueItem} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{issuingStock ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{issuingStock ? "กำลังบันทึก..." : "ยืนยันการเบิก"}</button><button type="button" onClick={resetIssueForm} className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${uiTheme.statusButton}`}>ล้างฟอร์ม</button></div>
          </form>
        </article>
      </section>
      <section className={`mt-4 rounded-lg border p-4 ${uiTheme.surfaceCard}`}><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="relative min-w-0 flex-1"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={stockSearchQuery} onChange={(event) => setStockSearchQuery(event.target.value)} placeholder="ค้นหารหัส stock, lot, รหัสอ้างอิง, ชื่ออุปกรณ์, ยี่ห้อ, ที่เก็บ, PR/PO" className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm ${uiTheme.searchInputMobile}`} /></div><div className="flex flex-wrap items-center gap-2"><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}><option value="ALL">ทุกสถานะ</option><option value="READY">พร้อมเบิก</option><option value="LOW">ใกล้หมด</option><option value="OUT">หมด stock</option></select><button type="button" onClick={() => void loadPageData({ silent: true })} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${uiTheme.statusButton}`}><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />รีเฟรชข้อมูล</button></div></div>{errorMessage ? <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${theme === "dark" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}><AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{errorMessage}</span></div> : null}<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">{loading ? <div className={`rounded-lg border px-4 py-5 text-center text-sm ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>กำลังโหลดข้อมูล stock...</div> : filteredStockItems.length === 0 ? <div className={`rounded-lg border px-4 py-5 text-center text-sm ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>ไม่พบรายการ stock</div> : filteredStockItems.map((item) => <article key={item.id} className={`rounded-lg border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className={`truncate text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{item.item_name || "-"}</p><p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{item.stock_code || "-"} • {item.reference_item_code || item.item_category || "-"}{item.lot_number ? ` • lot ${item.lot_number}` : ""}</p></div><span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getAvailabilityClass(item)}`}>{getAvailabilityLabel(item)}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>คงเหลือ: {formatQuantity(item.quantity_on_hand)} {item.unit || "ชิ้น"}</div><div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>ขั้นต่ำ: {formatQuantity(item.minimum_quantity)} {item.unit || "ชิ้น"}</div><div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>ที่เก็บ: {item.location || "-"}</div><div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>หลักฐาน lot: {Array.isArray(item.stock_attachments) ? item.stock_attachments.length : 0} ไฟล์</div></div><div className="mt-3 flex gap-2">{Array.isArray(item.stock_attachments) && item.stock_attachments.length > 0 ? <button type="button" onClick={() => setPreviewAttachment(item.stock_attachments[0])} className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">ดูหลักฐาน</button> : null}<button type="button" onClick={() => handlePrefillIssue(item)} disabled={Number(item?.quantity_on_hand || 0) <= 0} className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">เบิกออก</button><button type="button" onClick={() => handleEditItem(item)} className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">แก้ไข</button></div></article>)}</div></section>
      <section className={`mt-4 rounded-lg border p-4 ${uiTheme.surfaceCard}`}><div className="flex items-center justify-between gap-3"><div><h3 className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>ประวัติการเบิกจาก stock</h3><p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ล่าสุด {Math.min(issueLogs.length, 80)} รายการ สำหรับติดตามการเบิก walk-in และรูปหลักฐานการจ่ายของ</p></div><div className={`text-xs font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>หมด stock {formatQuantity(summary.outOfStockCount)} รายการ</div></div><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">{issueLogs.length === 0 ? <div className={`rounded-lg border px-4 py-5 text-center text-sm ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>ยังไม่มีประวัติการเบิก</div> : issueLogs.map((log) => <article key={log.id} className={`rounded-lg border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className={`truncate text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{log.item_name_snapshot || "-"}</p><p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{log.stock_code_snapshot || "-"} • {formatDateTime(log.issued_at || log.created_at)}</p></div><span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">{formatQuantity(log.quantity)} {log.unit_snapshot || "ชิ้น"}</span></div><div className="mt-3 grid grid-cols-1 gap-2 text-xs"><div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>ผู้เบิก: {log.requester_name || "-"} {log.requester_emp_id ? `(${log.requester_emp_id})` : ""}{log.requester_department ? ` • ${log.requester_department}` : ""}</div><div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>วัตถุประสงค์: {log.purpose || log.notes || "-"}</div><div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>หลักฐาน: {Array.isArray(log.issue_attachments) ? log.issue_attachments.length : 0} รูป</div></div><div className="mt-3 flex gap-2">{Array.isArray(log.issue_attachments) && log.issue_attachments.length > 0 ? <button type="button" onClick={() => setPreviewAttachment(log.issue_attachments[0])} className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">ดูหลักฐาน</button> : null}<div className={`flex-1 rounded-lg border px-3 py-2 text-xs ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>ผู้บันทึก: {log.issued_by_name || "-"}</div></div></article>)}</div></section>
      <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
    </>
  );
}
