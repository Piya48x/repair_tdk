import { supabase } from "../../../lib/supabaseClient";
import { fetchProfilesWithCompatibility } from "../../../lib/profileSchemaCompat";

export const ASSET_EVIDENCE_BUCKET = "it-asset-evidence";

const QR_SCHEMA_FIELDS = [
  "factory",
  "building",
  "floor",
  "room",
  "department",
  "po_number",
  "owner_profile_id",
  "owner_employee_code",
  "last_verified_at",
  "qr_created_at",
];

const ASSET_QR_SELECT = `
  id, asset_tag, asset_name, asset_category, brand, model, serial_number, status,
  location, owner_name, purchase_date, warranty_end_date, notes, created_by,
  created_at, updated_at, factory, building, floor, room, department, po_number,
  owner_profile_id, owner_employee_code, last_verified_at, qr_created_at,
  it_asset_attachments(*)
`;

const cleanText = (value) => String(value ?? "").trim();

const sanitizePathSegment = (value) => cleanText(value)
  .replace(/[^a-zA-Z0-9._-]+/g, "_")
  .replace(/^_+|_+$/g, "") || "asset";

export const isAssetQrSchemaError = (error) => {
  const code = String(error?.code || "").toUpperCase();
  const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    ["PGRST204", "PGRST205", "42703"].includes(code) ||
    QR_SCHEMA_FIELDS.some((field) => message.includes(field))
  );
};

export function buildAssetLocation({ factory, building, floor, room }) {
  return [factory, building, floor, room].map(cleanText).filter(Boolean).join(" / ") || null;
}

export function buildAssetQrUrl(assetTag) {
  if (typeof window === "undefined") return `/asset-qr/${encodeURIComponent(cleanText(assetTag))}`;
  return `${window.location.origin}/asset-qr/${encodeURIComponent(cleanText(assetTag))}`;
}

export async function fetchAssetQrDirectory() {
  const { data, error } = await supabase
    .from("it_assets")
    .select(ASSET_QR_SELECT)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchAssetQrProfiles() {
  const { data: directoryData, error: directoryError } = await supabase.rpc("get_asset_qr_user_directory");
  if (!directoryError) {
    return (Array.isArray(directoryData) ? directoryData : []).filter((profile) => profile?.is_active !== false);
  }

  const missingDirectoryFunction = ["42883", "PGRST202"].includes(String(directoryError?.code || "").toUpperCase())
    || String(directoryError?.message || "").toLowerCase().includes("get_asset_qr_user_directory");
  if (!missingDirectoryFunction) throw directoryError;

  const { data, error } = await fetchProfilesWithCompatibility(supabase, {
    columns: ["full_name", "employee_code", "department", "avatar_url", "id_card_url", "email", "role", "is_active"],
    orderBy: "full_name",
    ascending: true,
  });
  if (error) throw error;
  return data.filter((profile) => profile?.is_active !== false);
}

export async function fetchAssetQrDetail(assetTag) {
  const tag = cleanText(assetTag);
  if (!tag) throw new Error("ไม่พบ Asset Code");

  let { data: asset, error } = await supabase
    .from("it_assets")
    .select(ASSET_QR_SELECT)
    .eq("asset_tag", tag)
    .maybeSingle();

  if (error) throw error;
  if (!asset) {
    const { data: resolvedCode, error: resolveError } = await supabase.rpc("resolve_it_asset_code", { p_code: tag });
    const missingResolver = ["42883", "PGRST202"].includes(String(resolveError?.code || "").toUpperCase())
      || String(resolveError?.message || "").toLowerCase().includes("resolve_it_asset_code");
    if (resolveError && !missingResolver) throw resolveError;
    if (resolvedCode) {
      const { data: resolvedAsset, error: resolvedError } = await supabase
        .from("it_assets")
        .select(ASSET_QR_SELECT)
        .eq("asset_tag", resolvedCode)
        .maybeSingle();
      if (resolvedError) throw resolvedError;
      asset = resolvedAsset;
    }
  }
  if (!asset) return null;

  let ownerProfile = null;
  if (asset.owner_profile_id) {
    const { data: profiles, error: profileError } = await fetchProfilesWithCompatibility(supabase, {
      ids: [asset.owner_profile_id],
      columns: ["full_name", "employee_code", "department", "avatar_url", "id_card_url", "email", "role"],
    });
    if (profileError) throw profileError;
    ownerProfile = profiles[0] || null;
  }

  return { ...asset, owner_profile: ownerProfile };
}

async function uploadAssetEvidence({ assetId, assetTag, files, currentUserId }) {
  const safeFiles = (Array.isArray(files) ? files : []).filter((file) => file instanceof File);
  if (!safeFiles.length) return [];

  const uploadedPaths = [];
  const rows = [];
  try {
    for (let index = 0; index < safeFiles.length; index += 1) {
      const file = safeFiles[index];
      const safeName = sanitizePathSegment(file.name || `asset_${Date.now()}.jpg`);
      const path = `assets/${sanitizePathSegment(assetTag)}/${Date.now()}_${index}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(ASSET_EVIDENCE_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) throw uploadError;

      uploadedPaths.push(path);
      const { data: publicData } = supabase.storage.from(ASSET_EVIDENCE_BUCKET).getPublicUrl(path);
      rows.push({
        asset_id: assetId,
        file_name: file.name || safeName,
        file_path: path,
        file_url: publicData?.publicUrl || "",
        mime_type: file.type || null,
        file_size: Number(file.size || 0),
        uploaded_by: currentUserId || null,
      });
    }

    const { data, error } = await supabase.from("it_asset_attachments").insert(rows).select("*");
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from(ASSET_EVIDENCE_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export async function saveAssetQrRecord({ form, files, editingAsset, currentUser }) {
  const ownerProfileId = cleanText(form.owner_profile_id) || null;
  const payload = {
    asset_tag: cleanText(form.asset_tag),
    asset_name: cleanText(form.asset_name),
    asset_category: cleanText(form.asset_category) || "Other",
    brand: cleanText(form.brand) || null,
    model: cleanText(form.model) || null,
    serial_number: cleanText(form.serial_number) || null,
    factory: cleanText(form.factory) || null,
    building: cleanText(form.building) || null,
    floor: cleanText(form.floor) || null,
    room: cleanText(form.room) || null,
    location: buildAssetLocation(form),
    department: cleanText(form.department) || null,
    owner_profile_id: ownerProfileId,
    owner_employee_code: cleanText(form.owner_employee_code) || null,
    owner_name: cleanText(form.owner_name) || null,
    purchase_date: cleanText(form.purchase_date) || null,
    po_number: cleanText(form.po_number) || null,
    status: cleanText(form.status) || "in_use",
    notes: cleanText(form.notes) || null,
    last_verified_at: form.last_verified_at ? new Date(form.last_verified_at).toISOString() : null,
  };

  if (!payload.asset_tag || !payload.asset_name) {
    throw new Error("กรุณาระบุ Asset Code และชื่ออุปกรณ์");
  }

  let savedAsset;
  if (editingAsset?.id) {
    payload.asset_tag = editingAsset.asset_tag;
    const { data, error } = await supabase
      .from("it_assets")
      .update(payload)
      .eq("id", editingAsset.id)
      .select("*")
      .single();
    if (error) throw error;
    savedAsset = data;
  } else {
    payload.created_by = currentUser?.id || null;
    payload.qr_created_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("it_assets")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    savedAsset = data;
  }

  const uploadedAttachments = await uploadAssetEvidence({
    assetId: savedAsset.id,
    assetTag: savedAsset.asset_tag,
    files,
    currentUserId: currentUser?.id,
  });

  try {
    await supabase.from("it_asset_activity_logs").insert({
      asset_id: savedAsset.id,
      action: editingAsset?.id ? "updated" : "created",
      summary: editingAsset?.id ? "Updated from Asset QR Center" : "Created from Asset QR Center",
      changes: {
        source: "asset_qr_center",
        evidence_added: uploadedAttachments.length,
      },
      snapshot: savedAsset,
      created_by: currentUser?.id || null,
      created_by_name: currentUser?.name || currentUser?.full_name || null,
    });
  } catch (error) {
    console.warn("Insert QR asset activity log error:", error);
  }

  return { ...savedAsset, it_asset_attachments: uploadedAttachments };
}

export async function markAssetQrGenerated(asset) {
  if (!asset?.id || asset.qr_created_at) return asset;
  const qrCreatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("it_assets")
    .update({ qr_created_at: qrCreatedAt })
    .eq("id", asset.id)
    .select("*")
    .single();
  if (error) throw error;
  return { ...asset, ...data };
}
