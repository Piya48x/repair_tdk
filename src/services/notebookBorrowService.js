import { supabase } from "../lib/supabaseClient";

export const NOTEBOOK_PROOF_BUCKET = "notebook-borrow-proof";

export const NOTEBOOK_STATUS = {
  AVAILABLE: "available",
  BORROWED: "borrowed",
  REPAIR: "repair",
};

export const NOTEBOOK_LOG_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  RETURNED: "returned",
};

export const NOTEBOOK_ALLOWED_ASSET_CODES = ["NB-018", "NB-017", "NB-016", "NB-014"];
const NOTEBOOK_ALLOWED_ASSET_CODE_SET = new Set(NOTEBOOK_ALLOWED_ASSET_CODES.map((code) => code.toUpperCase()));

export function normalizeText(value) {
  return String(value || "").trim();
}

export function isNotebookSchemaError(error) {
  const code = String(error?.code || "");
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    text.includes("notebooks") ||
    text.includes("borrow_logs") ||
    text.includes("get_notebook_dashboard") ||
    text.includes("get_my_notebook_borrow_logs") ||
    text.includes("get_notebook_request_queue")
  );
}

export function isNotebookPermissionDenied(error) {
  const code = String(error?.code || "").toUpperCase();
  const status = Number(error?.status || 0);
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    code === "42501" ||
    status === 401 ||
    status === 403 ||
    text.includes("permission denied") ||
    text.includes("forbidden") ||
    text.includes("not authorized") ||
    text.includes("row-level security")
  );
}

export function formatNotebookDuration(startValue, endValue) {
  if (!startValue || !endValue) return "";
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  let diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) diffMs = 0;

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} วัน ${hours} ชม.`;
  }

  if (hours > 0) {
    return `${hours} ชม. ${minutes > 0 ? `${minutes} นาที` : ""}`.trim();
  }

  return `${minutes} นาที`;
}

export function formatNotebookTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sanitizePathSegment(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function filterAllowedNotebookRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => NOTEBOOK_ALLOWED_ASSET_CODE_SET.has(String(row?.asset_code || "").toUpperCase()));
}

export async function uploadNotebookProof(file, userId) {
  if (!file) throw new Error("Missing file");

  const safeUserId = sanitizePathSegment(userId || "unknown");
  const safeName = sanitizePathSegment(file.name || `proof_${Date.now()}`);
  const filePath = `borrow/${safeUserId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(NOTEBOOK_PROOF_BUCKET)
    .upload(filePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(NOTEBOOK_PROOF_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || "";
}

export async function loadNotebookDashboard() {
  const result = await supabase.rpc("get_notebook_dashboard");
  return {
    ...result,
    data: filterAllowedNotebookRows(result.data),
  };
}

export async function loadMyNotebookBorrowLogs() {
  const result = await supabase.rpc("get_my_notebook_borrow_logs");
  return result;
}

export async function loadNotebookRequestQueue() {
  const result = await supabase.rpc("get_notebook_request_queue");
  return {
    ...result,
    data: filterAllowedNotebookRows(result.data),
  };
}

export async function requestNotebookBorrow({
  notebookId,
  reason,
  location,
  imageUrl,
  imageName = null,
  imageMimeType = null,
  imageSize = null,
}) {
  return supabase.rpc("request_notebook_borrow", {
    _notebook_id: notebookId,
    _reason: reason,
    _location: location,
    _image_url: imageUrl,
    _image_name: imageName,
    _image_mime_type: imageMimeType,
    _image_size: imageSize,
  });
}

export async function requestNotebookReturn(logId) {
  return supabase.rpc("request_notebook_return", {
    _log_id: logId,
  });
}

export async function approveNotebookBorrow(logId) {
  return supabase.rpc("approve_notebook_borrow_request", {
    _log_id: logId,
  });
}

export async function confirmNotebookReturn(logId) {
  return supabase.rpc("confirm_notebook_return", {
    _log_id: logId,
  });
}
