import { supabase } from "../lib/supabaseClient";

export const IT_WORK_EVIDENCE_BUCKET = "it-work-evidence";

export function normalizeText(value) {
  return String(value || "").trim();
}

export function sanitizePathSegment(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function normalizeEvidenceImages(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      url: normalizeText(item?.url),
      name: normalizeText(item?.name) || null,
      mimeType: normalizeText(item?.mimeType) || null,
      size: Number(item?.size || 0) || null,
    }))
    .filter((item) => item.url);
}

export function isITWorkRecordSchemaError(error) {
  const code = String(error?.code || "");
  const status = Number(error?.status || 0);
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();

  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    status === 404 ||
    text.includes('relation "it_work_records" does not exist') ||
    text.includes('column "start_time"') ||
    text.includes('column "end_time"') ||
    text.includes('column "duration_minutes"') ||
    text.includes('bucket "it-work-evidence" not found') ||
    text.includes("bucket not found")
  );
}

function getStorageObjectPath(publicUrl, bucketName) {
  const url = normalizeText(publicUrl);
  if (!url || !bucketName) return "";

  const encodedBucket = encodeURIComponent(bucketName);
  const markers = [
    `/storage/v1/object/public/${encodedBucket}/`,
    `/storage/v1/object/public/${bucketName}/`,
    `/object/public/${encodedBucket}/`,
    `/object/public/${bucketName}/`,
  ];

  for (const marker of markers) {
    const markerIndex = url.indexOf(marker);
    if (markerIndex >= 0) {
      return decodeURIComponent(url.slice(markerIndex + marker.length));
    }
  }

  return "";
}

async function cleanupUploadedPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return;

  try {
    await supabase.storage.from(IT_WORK_EVIDENCE_BUCKET).remove(paths);
  } catch (error) {
    console.warn("Cleanup IT work evidence upload error:", error);
  }
}

export async function loadITWorkRecords(options = {}) {
  const { columns = "*" } = options;

  return supabase
    .from("it_work_records")
    .select(columns)
    .order("start_time", { ascending: false })
    .order("performed_at", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function uploadITWorkEvidenceFiles(files, createdBy) {
  const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
  if (safeFiles.length === 0) return [];

  const safeUserId = sanitizePathSegment(createdBy || "unknown");
  const uploadedPaths = [];
  const uploadedImages = [];

  try {
    for (const [index, file] of safeFiles.entries()) {
      const safeName = sanitizePathSegment(file?.name || `evidence_${Date.now()}.jpg`);
      const filePath = `records/${safeUserId}/${Date.now()}_${index}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(IT_WORK_EVIDENCE_BUCKET)
        .upload(filePath, file, {
          upsert: false,
          contentType: file?.type || "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(IT_WORK_EVIDENCE_BUCKET).getPublicUrl(filePath);
      uploadedPaths.push(filePath);
      uploadedImages.push({
        url: data?.publicUrl || "",
        name: normalizeText(file?.name) || null,
        mimeType: normalizeText(file?.type) || null,
        size: Number(file?.size || 0) || null,
      });
    }

    return uploadedImages;
  } catch (error) {
    await cleanupUploadedPaths(uploadedPaths);
    throw error;
  }
}

export async function createITWorkRecord(payload) {
  return supabase.from("it_work_records").insert(payload).select("*").single();
}

export async function updateITWorkRecord(recordId, payload) {
  return supabase
    .from("it_work_records")
    .update(payload)
    .eq("id", recordId)
    .select("*")
    .single();
}

export async function deleteITWorkRecord(recordId) {
  return supabase.from("it_work_records").delete().eq("id", recordId);
}

export async function removeITWorkEvidenceFiles(images) {
  const paths = normalizeEvidenceImages(images)
    .map((item) => getStorageObjectPath(item.url, IT_WORK_EVIDENCE_BUCKET))
    .filter(Boolean);

  if (paths.length === 0) {
    return { data: [], error: null };
  }

  return supabase.storage.from(IT_WORK_EVIDENCE_BUCKET).remove(paths);
}
