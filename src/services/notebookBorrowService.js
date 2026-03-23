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
    text.includes('column "show_in_notebook_center"') ||
    text.includes('column "return_image_url"') ||
    text.includes("return_image_url does not exist") ||
    text.includes("bl.return_image_url") ||
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

function getProfileDisplayName(profile) {
  return (
    normalizeText(profile?.full_name) ||
    normalizeText(profile?.employee_code) ||
    normalizeText(profile?.email) ||
    ""
  );
}

function getQueueSortValue(row) {
  const value =
    row?.return_confirmed_at ||
    row?.return_time ||
    row?.approved_at ||
    row?.requested_at ||
    row?.borrow_time ||
    "";
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

async function loadNotebookRequestQueueFallback() {
  const { data: logRows, error: logError } = await supabase
    .from("borrow_logs")
    .select(
      [
        "id",
        "notebook_id",
        "user_id",
        "borrow_time",
        "return_time",
        "duration",
        "reason",
        "location",
        "image_url",
        "image_name",
        "image_mime_type",
        "image_size",
        "status",
        "requested_at",
        "approved_at",
        "return_confirmed_at",
        "approved_by",
        "confirmed_by",
      ].join(", "),
    )
    .order("requested_at", { ascending: false });

  if (logError) {
    return { data: null, error: logError };
  }

  const safeLogs = Array.isArray(logRows) ? logRows : [];
  const notebookIds = [...new Set(safeLogs.map((row) => Number(row?.notebook_id || 0)).filter((id) => id > 0))];
  const profileIds = [
    ...new Set(
      safeLogs
        .flatMap((row) => [row?.user_id, row?.approved_by, row?.confirmed_by])
        .map((value) => normalizeText(value))
        .filter(Boolean),
    ),
  ];

  const notebookQuery =
    notebookIds.length > 0
      ? supabase
          .from("notebooks")
          .select("id, asset_code, model, status")
          .in("id", notebookIds)
      : Promise.resolve({ data: [], error: null });

  const profileQuery =
    profileIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name, employee_code, email, role, avatar_url, id_card_url")
          .in("id", profileIds)
      : Promise.resolve({ data: [], error: null });

  const [{ data: notebookRows, error: notebookError }, { data: profileRows, error: profileError }] = await Promise.all([
    notebookQuery,
    profileQuery,
  ]);

  if (notebookError) {
    return { data: null, error: notebookError };
  }

  if (profileError && !isNotebookPermissionDenied(profileError)) {
    return { data: null, error: profileError };
  }

  const notebookMap = new Map(
    (Array.isArray(notebookRows) ? notebookRows : []).map((row) => [String(row?.id || ""), row]),
  );
  const profileMap = new Map(
    (Array.isArray(profileRows) ? profileRows : []).map((row) => [normalizeText(row?.id), row]),
  );
  const borrowCountMap = safeLogs.reduce((acc, row) => {
    const key = String(row?.notebook_id || "");
    if (!key) return acc;
    acc.set(key, (acc.get(key) || 0) + 1);
    return acc;
  }, new Map());

  const data = safeLogs
    .map((row) => {
      const notebook = notebookMap.get(String(row?.notebook_id || ""));
      if (!notebook) return null;

      const borrowerProfile = profileMap.get(normalizeText(row?.user_id));
      const approvedProfile = profileMap.get(normalizeText(row?.approved_by));
      const confirmedProfile = profileMap.get(normalizeText(row?.confirmed_by));
      const userName = getProfileDisplayName(borrowerProfile) || normalizeText(row?.user_id) || "-";

      return {
        log_id: row?.id ?? null,
        notebook_id: row?.notebook_id ?? null,
        asset_code: notebook?.asset_code || "",
        model: notebook?.model || "",
        notebook_status: notebook?.status || "",
        user_id: row?.user_id || null,
        user_name: userName,
        user_role: normalizeText(borrowerProfile?.role) || "user",
        user_avatar_url:
          normalizeText(borrowerProfile?.avatar_url) ||
          normalizeText(borrowerProfile?.id_card_url) ||
          "",
        borrow_time: row?.borrow_time || null,
        return_time: row?.return_time || null,
        duration: row?.duration ?? null,
        reason: row?.reason || "",
        location: row?.location || "",
        image_url: row?.image_url || "",
        image_name: row?.image_name || null,
        image_mime_type: row?.image_mime_type || null,
        image_size: row?.image_size ?? null,
        return_image_url: "",
        return_image_name: null,
        return_image_mime_type: null,
        return_image_size: null,
        status: row?.status || "",
        requested_at: row?.requested_at || null,
        approved_at: row?.approved_at || null,
        return_confirmed_at: row?.return_confirmed_at || null,
        approved_by_name: getProfileDisplayName(approvedProfile) || "-",
        confirmed_by_name: getProfileDisplayName(confirmedProfile) || "-",
        borrow_count: borrowCountMap.get(String(row?.notebook_id || "")) || 0,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const diff = getQueueSortValue(right) - getQueueSortValue(left);
      if (diff !== 0) return diff;
      return Number(right?.log_id || 0) - Number(left?.log_id || 0);
    });

  return { data, error: null };
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
  if (result?.error && isNotebookSchemaError(result.error)) {
    const fallbackResult = await loadNotebookRequestQueueFallback();
    if (!fallbackResult?.error) {
      return {
        data: filterAllowedNotebookRows(fallbackResult.data),
        error: null,
      };
    }
  }
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

