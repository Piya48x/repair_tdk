import { supabase } from "../lib/supabaseClient";
import {
  deleteITWorkEvidenceFiles as deleteITWorkEvidenceFilesFromR2,
  isTicketHistoryStorageEnabled,
  uploadITWorkEvidenceFile,
} from "./ticketHistoryStorageService";

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
      objectKey: normalizeText(item?.objectKey) || null,
      storage: normalizeText(item?.storage) || null,
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
    text.includes('column "requester_profile_id"') ||
    text.includes('column "requester_employee_code"') ||
    text.includes('column "footage_start_at"') ||
    text.includes('column "footage_end_at"') ||
    text.includes('column "approval_status"') ||
    text.includes('column "approved_by_name"') ||
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

export async function uploadITWorkEvidenceFiles(files, createdBy, recordKey = "") {
  const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
  if (safeFiles.length === 0) return [];

  const safeUserId = sanitizePathSegment(createdBy || "unknown");
  const uploadedPaths = [];
  const uploadedObjectKeys = [];
  const uploadedImages = [];
  const safeRecordKey = sanitizePathSegment(recordKey || crypto.randomUUID());

  try {
    for (const [index, file] of safeFiles.entries()) {
      if (isTicketHistoryStorageEnabled()) {
        try {
          const result = await uploadITWorkEvidenceFile({
            recordKey: safeRecordKey,
            file,
          });
          uploadedObjectKeys.push(result.objectKey);
          uploadedImages.push({
            url: result.permanentUrl,
            name: normalizeText(file?.name || result.fileName) || null,
            mimeType: normalizeText(file?.type || result.mimeType) || null,
            size: Number(file?.size || result.size || 0) || null,
            objectKey: result.objectKey,
            storage: "r2",
          });
          continue;
        } catch (workerUploadError) {
          console.warn("R2 IT work evidence upload failed; using Supabase Storage fallback:", workerUploadError);
        }
      }

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
        storage: "supabase",
      });
    }

    return uploadedImages;
  } catch (error) {
    await cleanupUploadedPaths(uploadedPaths);
    if (uploadedObjectKeys.length > 0) {
      try {
        await deleteITWorkEvidenceFilesFromR2(uploadedObjectKeys);
      } catch (cleanupError) {
        console.warn("Cleanup R2 IT work evidence upload error:", cleanupError);
      }
    }
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
  const normalizedImages = normalizeEvidenceImages(images);
  const objectKeys = normalizedImages
    .map((item) => item.objectKey)
    .filter((key) => key?.startsWith("it-work-records/"));
  const paths = normalizedImages
    .map((item) => getStorageObjectPath(item.url, IT_WORK_EVIDENCE_BUCKET))
    .filter(Boolean);

  if (objectKeys.length > 0 && isTicketHistoryStorageEnabled()) {
    await deleteITWorkEvidenceFilesFromR2(objectKeys);
  }

  if (paths.length > 0) {
    return supabase.storage.from(IT_WORK_EVIDENCE_BUCKET).remove(paths);
  }

  return { data: [], error: null };
}
