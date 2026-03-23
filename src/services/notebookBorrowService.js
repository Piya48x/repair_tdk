import { supabase } from "../lib/supabaseClient";

export const NOTEBOOK_PROOF_BUCKET = "notebook-borrow-proof";
export const NOTEBOOK_ASSET_BUCKET = "notebook-assets";

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

const NOTEBOOK_RETURN_RPC_MODE_KEY = "notebook:return-rpc-mode";

function readNotebookReturnRpcMode() {
  if (typeof window === "undefined") return "unknown";
  try {
    const value = String(window.localStorage.getItem(NOTEBOOK_RETURN_RPC_MODE_KEY) || "");
    if (value === "legacy" || value === "v2") return value;
  } catch {
    // Ignore localStorage access errors.
  }
  return "unknown";
}

function writeNotebookReturnRpcMode(mode) {
  if (typeof window === "undefined") return;
  if (mode !== "legacy" && mode !== "v2") return;
  try {
    window.localStorage.setItem(NOTEBOOK_RETURN_RPC_MODE_KEY, mode);
  } catch {
    // Ignore localStorage access errors.
  }
}

let notebookReturnRpcMode = readNotebookReturnRpcMode();

export function normalizeText(value) {
  return String(value || "").trim();
}

export function isNotebookSchemaError(error) {
  const code = String(error?.code || "");
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  const isSchemaCode =
    code === "42P01" ||
    code === "42703" ||
    code === "42883" ||
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "PGRST205";
  const mentionsNotebookSchemaObject =
    text.includes("get_notebook_dashboard") ||
    text.includes("get_my_notebook_borrow_logs") ||
    text.includes("get_notebook_request_queue") ||
    text.includes("request_notebook_borrow") ||
    text.includes("request_notebook_return") ||
    text.includes("approve_notebook_borrow_request") ||
    text.includes("confirm_notebook_return") ||
    text.includes('relation "notebooks" does not exist') ||
    text.includes('relation "borrow_logs" does not exist') ||
    text.includes('column "asset_image_url"') ||
    text.includes('column "notes"') ||
    text.includes('column "return_image_url"') ||
    text.includes("could not find the function");
  return (
    (isSchemaCode && mentionsNotebookSchemaObject) ||
    text.includes('relation "notebooks" does not exist') ||
    text.includes('relation "borrow_logs" does not exist')
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

  if (days > 0) return `${days} วัน ${hours} ชม.`;
  if (hours > 0) return `${hours} ชม. ${minutes > 0 ? `${minutes} นาที` : ""}`.trim();
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
  return rows;
}

function getStorageObjectPath(publicUrl, bucketName) {
  const url = String(publicUrl || "").trim();
  if (!url || !bucketName) return "";

  const encodedBucket = encodeURIComponent(bucketName);
  const pathMarkers = [
    `/storage/v1/object/public/${encodedBucket}/`,
    `/storage/v1/object/public/${bucketName}/`,
    `/object/public/${encodedBucket}/`,
    `/object/public/${bucketName}/`,
  ];

  for (const marker of pathMarkers) {
    const markerIndex = url.indexOf(marker);
    if (markerIndex >= 0) {
      return decodeURIComponent(url.slice(markerIndex + marker.length));
    }
  }

  return "";
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

export async function uploadNotebookReturnProof(file, userId) {
  if (!file) throw new Error("Missing file");

  const safeUserId = sanitizePathSegment(userId || "unknown");
  const safeName = sanitizePathSegment(file.name || `return_${Date.now()}`);
  const filePath = `borrow/${safeUserId}/${Date.now()}_return_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(NOTEBOOK_PROOF_BUCKET)
    .upload(filePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(NOTEBOOK_PROOF_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || "";
}

export async function uploadNotebookAssetImage(file, assetCode) {
  if (!file) throw new Error("Missing file");

  const safeAssetCode = sanitizePathSegment(assetCode || "notebook");
  const safeName = sanitizePathSegment(file.name || `notebook_${Date.now()}`);
  const filePath = `assets/${safeAssetCode}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(NOTEBOOK_ASSET_BUCKET)
    .upload(filePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(NOTEBOOK_ASSET_BUCKET).getPublicUrl(filePath);
  return {
    publicUrl: data?.publicUrl || "",
    path: filePath,
  };
}

export async function removeNotebookAssetImage(publicUrl) {
  const path = getStorageObjectPath(publicUrl, NOTEBOOK_ASSET_BUCKET);
  if (!path) return { error: null };
  return supabase.storage.from(NOTEBOOK_ASSET_BUCKET).remove([path]);
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

function isReturnRpcSignatureMismatch(error) {
  const code = String(error?.code || "");
  const status = Number(error?.status || 0);
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    (
      code === "PGRST202" ||
      code === "42883" ||
      status === 404
    ) &&
    (text.includes("request_notebook_return") || text.includes("could not find the function"))
  );
}

export async function requestNotebookReturn({
  logId,
  returnImageUrl,
  returnImageName = null,
  returnImageMimeType = null,
  returnImageSize = null,
}) {
  const nextResult = await supabase.rpc("request_notebook_return", {
    _log_id: logId,
    _return_image_url: returnImageUrl,
    _return_image_name: returnImageName,
    _return_image_mime_type: returnImageMimeType,
    _return_image_size: returnImageSize,
  });

  if (!nextResult?.error) {
    notebookReturnRpcMode = "v2";
    writeNotebookReturnRpcMode("v2");
    return nextResult;
  }
  if (!isReturnRpcSignatureMismatch(nextResult.error)) return nextResult;

  // Backward compatibility: database may still use old RPC signature.
  notebookReturnRpcMode = "legacy";
  writeNotebookReturnRpcMode("legacy");
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

