import { supabase } from "../lib/supabaseClient";

const API_BASE_URL = String(import.meta.env.VITE_TICKET_HISTORY_API_URL || "")
  .trim()
  .replace(/\/+$/, "");

export function isTicketHistoryStorageEnabled() {
  return Boolean(API_BASE_URL);
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const token = data?.session?.access_token;
  if (!token) throw new Error("ไม่พบ session สำหรับอัปโหลดไฟล์");
  return token;
}

async function workerRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error("ยังไม่ได้ตั้งค่า VITE_TICKET_HISTORY_API_URL");
  }

  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Ticket History API error (${response.status})`);
  }
  return payload;
}

export async function uploadTicketHistoryFile({ ticketId, kind = "general", file }) {
  const formData = new FormData();
  formData.append("ticketId", String(ticketId));
  formData.append("kind", kind);
  formData.append("file", file);

  const result = await workerRequest("/upload", {
    method: "POST",
    body: formData,
  });

  if (!result.permanentUrl) {
    throw new Error("Worker เวอร์ชันนี้ยังไม่รองรับ permanentUrl กรุณา Deploy worker.js เวอร์ชันล่าสุด");
  }

  return {
    ...result,
    publicUrl: result.permanentUrl,
  };
}

export async function archiveTicketHistory({ ticketId, record }) {
  return workerRequest("/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId, record }),
  });
}

export async function uploadITWorkEvidenceFile({ recordKey, file }) {
  const formData = new FormData();
  formData.append("recordKey", String(recordKey || "draft"));
  formData.append("file", file);

  const result = await workerRequest("/it-work/upload", {
    method: "POST",
    body: formData,
  });

  if (!result.permanentUrl || !result.objectKey) {
    throw new Error("Worker เวอร์ชันนี้ยังไม่รองรับ IT Work Evidence กรุณา Deploy worker.js เวอร์ชันล่าสุด");
  }

  return result;
}

export async function deleteITWorkEvidenceFiles(objectKeys = []) {
  const normalizedKeys = [...new Set(
    (Array.isArray(objectKeys) ? objectKeys : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  )];

  if (normalizedKeys.length === 0) return { deleted: 0 };

  return workerRequest("/it-work/files", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectKeys: normalizedKeys }),
  });
}

const MANAGED_R2_PREFIXES = ["stock-files/", "it-assets/", "asset-audits/", "asset-moves/"];

export function isManagedR2ObjectKey(value) {
  const key = String(value || "").trim();
  return MANAGED_R2_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function getR2ObjectKeyFromUrl(value) {
  try {
    const key = new URL(String(value || "")).searchParams.get("key") || "";
    return isManagedR2ObjectKey(key) ? key : "";
  } catch {
    return "";
  }
}

export async function uploadManagedR2File({ scope, recordKey, kind = "general", file }) {
  const formData = new FormData();
  formData.append("scope", String(scope || ""));
  formData.append("recordKey", String(recordKey || "draft"));
  formData.append("kind", String(kind || "general"));
  formData.append("file", file);

  const result = await workerRequest("/managed/upload", {
    method: "POST",
    body: formData,
  });

  if (!result.permanentUrl || !result.objectKey) {
    throw new Error("Worker เวอร์ชันนี้ยังไม่รองรับ Managed R2 upload กรุณา Deploy worker.js เวอร์ชันล่าสุด");
  }
  return result;
}

export async function deleteManagedR2Files(objectKeys = []) {
  const normalizedKeys = [...new Set(
    (Array.isArray(objectKeys) ? objectKeys : [])
      .map((value) => String(value || "").trim())
      .filter(isManagedR2ObjectKey),
  )];

  if (normalizedKeys.length === 0) return { deleted: 0 };
  return workerRequest("/managed/files", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectKeys: normalizedKeys }),
  });
}
