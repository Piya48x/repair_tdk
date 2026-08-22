import { supabase } from "../lib/supabaseClient";

export const ASSET_MOVE_EVIDENCE_BUCKET = "asset-move-evidence";

export function normalizeAssetMoveText(value) {
  return String(value || "").trim();
}

function sanitizePathSegment(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function normalizeAssetMoveImages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      url: normalizeAssetMoveText(item?.url),
      name: normalizeAssetMoveText(item?.name) || null,
      mimeType: normalizeAssetMoveText(item?.mimeType) || null,
      size: Number(item?.size || 0) || null,
    }))
    .filter((item) => item.url);
}

export function isAssetMoveSchemaError(error) {
  const code = String(error?.code || "");
  const status = Number(error?.status || 0);
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();

  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    status === 404 ||
    text.includes('relation "it_asset_moves" does not exist') ||
    text.includes('bucket "asset-move-evidence" not found') ||
    text.includes("bucket not found")
  );
}

export async function loadAssetMoves() {
  return supabase
    .from("it_asset_moves")
    .select("*")
    .order("performed_at", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function uploadAssetMoveEvidenceFiles(files, kind, userId) {
  const safeFiles = (Array.isArray(files) ? files : []).filter(
    (file) => file instanceof File && String(file.type || "").startsWith("image/"),
  );
  if (safeFiles.length === 0) return [];

  const safeUserId = sanitizePathSegment(userId);
  const safeKind = kind === "after" ? "after" : "before";
  const uploaded = [];

  for (const [index, file] of safeFiles.entries()) {
    const safeName = sanitizePathSegment(file.name || `${safeKind}_${Date.now()}.jpg`);
    const path = `moves/${safeUserId}/${Date.now()}_${safeKind}_${index + 1}_${safeName}`;
    const { error } = await supabase.storage
      .from(ASSET_MOVE_EVIDENCE_BUCKET)
      .upload(path, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

    if (error) throw error;

    const { data } = supabase.storage.from(ASSET_MOVE_EVIDENCE_BUCKET).getPublicUrl(path);
    uploaded.push({
      url: data?.publicUrl || "",
      name: normalizeAssetMoveText(file.name) || null,
      mimeType: normalizeAssetMoveText(file.type) || null,
      size: Number(file.size || 0) || null,
    });
  }

  return uploaded.filter((item) => item.url);
}

export async function createAssetMove(payload) {
  return supabase.from("it_asset_moves").insert(payload).select("*").single();
}

export async function cancelAssetMove(recordId, reason, currentUser) {
  return supabase
    .from("it_asset_moves")
    .update({
      status: "cancelled",
      cancellation_reason: normalizeAssetMoveText(reason),
      cancelled_at: new Date().toISOString(),
      cancelled_by: currentUser?.id || null,
      cancelled_by_name: normalizeAssetMoveText(currentUser?.name || currentUser?.email),
    })
    .eq("id", recordId)
    .eq("status", "active")
    .select("*")
    .single();
}
