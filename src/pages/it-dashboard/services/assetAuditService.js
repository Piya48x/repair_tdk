import { supabase } from "../../../lib/supabaseClient";

export const ASSET_AUDIT_EVIDENCE_BUCKET = "it-asset-audit-evidence";

const AUDIT_SCHEMA_NAMES = [
  "it_asset_audit_sessions",
  "it_asset_audit_items",
  "it_asset_audit_attachments",
  "review_it_asset_audit_item",
];

const cleanText = (value) => String(value ?? "").trim();

const safeFileName = (value) => {
  const normalized = cleanText(value).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return normalized || `evidence_${Date.now()}.jpg`;
};

const makeAuditCode = (year) => {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  return `AUDIT-${year}-${suffix}`;
};

export const isAssetAuditSchemaError = (error) => {
  const code = String(error?.code || "").toUpperCase();
  const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    ["42P01", "PGRST202", "PGRST204", "PGRST205"].includes(code) ||
    AUDIT_SCHEMA_NAMES.some((name) => message.includes(name))
  );
};

export async function fetchAssetAuditSessions() {
  const { data, error } = await supabase
    .from("it_asset_audit_sessions")
    .select("*")
    .order("audit_year", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchAuditableAssets() {
  const { data, error } = await supabase
    .from("it_assets")
    .select("id, asset_tag, asset_name, asset_category, brand, model, serial_number, status, location, owner_name, purchase_date, warranty_end_date, notes, created_at, updated_at")
    .order("asset_tag", { ascending: true });

  if (error) throw error;
  return (Array.isArray(data) ? data : []).filter(
    (item) => !["retired", "lost"].includes(cleanText(item?.status).toLowerCase()),
  );
}

export async function fetchAssetAuditItems(sessionId) {
  if (!sessionId) return [];

  const { data, error } = await supabase
    .from("it_asset_audit_items")
    .select("*, it_asset_audit_attachments(*)")
    .eq("audit_session_id", sessionId)
    .order("asset_tag_snapshot", { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createAssetAuditSession({
  name,
  auditYear,
  scopeLocation,
  assetCategories,
  notes,
  assets,
  currentUser,
}) {
  const selectedAssets = Array.isArray(assets) ? assets : [];
  if (!selectedAssets.length) {
    throw new Error("ไม่พบทรัพย์สินในขอบเขตที่เลือก");
  }

  const sessionPayload = {
    audit_code: makeAuditCode(auditYear),
    name: cleanText(name) || `Stock Audit ${auditYear}`,
    audit_year: Number(auditYear),
    status: "in_progress",
    scope_location: cleanText(scopeLocation) || null,
    asset_categories: (Array.isArray(assetCategories) ? assetCategories : []).map(cleanText).filter(Boolean),
    notes: cleanText(notes) || null,
    created_by: currentUser?.id || null,
    created_by_name: currentUser?.name || currentUser?.full_name || null,
  };

  const { data: session, error: sessionError } = await supabase
    .from("it_asset_audit_sessions")
    .insert(sessionPayload)
    .select("*")
    .single();

  if (sessionError) throw sessionError;

  const itemRows = selectedAssets.map((asset) => ({
    audit_session_id: session.id,
    asset_id: asset.id,
    asset_tag_snapshot: cleanText(asset.asset_tag),
    asset_name_snapshot: cleanText(asset.asset_name) || cleanText(asset.asset_tag),
    asset_category_snapshot: cleanText(asset.asset_category) || null,
    serial_number_snapshot: cleanText(asset.serial_number) || null,
    status_snapshot: cleanText(asset.status) || null,
    location_snapshot: cleanText(asset.location) || null,
    owner_name_snapshot: cleanText(asset.owner_name) || null,
    asset_snapshot: asset,
  }));

  try {
    for (let index = 0; index < itemRows.length; index += 200) {
      const { error } = await supabase
        .from("it_asset_audit_items")
        .insert(itemRows.slice(index, index + 200));
      if (error) throw error;
    }
  } catch (error) {
    await supabase.from("it_asset_audit_sessions").delete().eq("id", session.id);
    throw error;
  }

  return session;
}

export async function saveAssetAuditResult({
  itemId,
  resultStatus,
  foundLocation,
  foundOwnerName,
  foundSerialNumber,
  conditionNotes,
  proposedChanges,
  currentUser,
}) {
  const needsReview = ["mismatch", "not_found", "damaged", "unregistered"].includes(resultStatus);
  const payload = {
    result_status: resultStatus,
    found_location: cleanText(foundLocation) || null,
    found_owner_name: cleanText(foundOwnerName) || null,
    found_serial_number: cleanText(foundSerialNumber) || null,
    condition_notes: cleanText(conditionNotes) || null,
    proposed_changes: proposedChanges || {},
    review_status: needsReview ? "pending" : "not_required",
    audited_by: currentUser?.id || null,
    audited_by_name: currentUser?.name || currentUser?.full_name || null,
    audited_at: new Date().toISOString(),
    reviewed_by: null,
    reviewed_by_name: null,
    reviewed_at: null,
    review_notes: null,
  };

  const verifiedAt = payload.audited_at;

  const { data, error } = await supabase
    .from("it_asset_audit_items")
    .update(payload)
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw error;

  if (data?.asset_id && resultStatus !== "not_found") {
    const { error: verificationError } = await supabase
      .from("it_assets")
      .update({ last_verified_at: verifiedAt })
      .eq("id", data.asset_id);
    if (verificationError) {
      console.warn("Update asset last_verified_at error:", verificationError);
    }
  }

  return data;
}

export async function addUnregisteredAuditItem({ sessionId, asset, currentUser }) {
  const tag = cleanText(asset?.asset_tag);
  if (!tag) throw new Error("กรุณาระบุ Asset Tag");

  const snapshot = {
    asset_tag: tag,
    asset_name: cleanText(asset?.asset_name),
    asset_category: cleanText(asset?.asset_category),
    serial_number: cleanText(asset?.serial_number),
    location: cleanText(asset?.location),
    owner_name: cleanText(asset?.owner_name),
  };

  const { data, error } = await supabase
    .from("it_asset_audit_items")
    .insert({
      audit_session_id: sessionId,
      asset_id: null,
      asset_tag_snapshot: tag,
      asset_name_snapshot: snapshot.asset_name || "Unregistered asset",
      asset_category_snapshot: snapshot.asset_category || null,
      serial_number_snapshot: snapshot.serial_number || null,
      location_snapshot: null,
      owner_name_snapshot: null,
      asset_snapshot: snapshot,
      result_status: "unregistered",
      found_location: snapshot.location || null,
      found_owner_name: snapshot.owner_name || null,
      found_serial_number: snapshot.serial_number || null,
      condition_notes: cleanText(asset?.notes) || null,
      proposed_changes: {},
      review_status: "pending",
      audited_by: currentUser?.id || null,
      audited_by_name: currentUser?.name || currentUser?.full_name || null,
      audited_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function uploadAssetAuditEvidence({ itemId, sessionId, files, currentUser }) {
  const safeFiles = (Array.isArray(files) ? files : []).filter((file) => file instanceof File);
  if (!safeFiles.length) return [];

  const uploadedPaths = [];
  const rows = [];

  try {
    for (const file of safeFiles) {
      const fileName = safeFileName(file.name);
      const path = `audits/${sessionId}/${itemId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from(ASSET_AUDIT_EVIDENCE_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) throw uploadError;

      uploadedPaths.push(path);
      const { data: publicData } = supabase.storage.from(ASSET_AUDIT_EVIDENCE_BUCKET).getPublicUrl(path);
      rows.push({
        audit_item_id: itemId,
        file_name: file.name || fileName,
        file_path: path,
        file_url: publicData?.publicUrl || "",
        mime_type: file.type || null,
        file_size: Number(file.size || 0),
        uploaded_by: currentUser?.id || null,
      });
    }

    const { data, error } = await supabase
      .from("it_asset_audit_attachments")
      .insert(rows)
      .select("*");
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from(ASSET_AUDIT_EVIDENCE_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export async function reviewAssetAuditItem({ itemId, approved, reviewerName, notes }) {
  const { data, error } = await supabase.rpc("review_it_asset_audit_item", {
    p_item_id: itemId,
    p_approved: Boolean(approved),
    p_reviewer_name: cleanText(reviewerName) || null,
    p_review_notes: cleanText(notes) || null,
  });

  if (error) throw error;
  return data;
}

export async function updateAssetAuditSessionStatus(sessionId, status) {
  const payload = {
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("it_asset_audit_sessions")
    .update(payload)
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAssetAuditSession(sessionId) {
  if (!sessionId) throw new Error("ไม่พบรอบตรวจที่ต้องการลบ");

  const { data: auditItems, error: itemsError } = await supabase
    .from("it_asset_audit_items")
    .select("id")
    .eq("audit_session_id", sessionId);

  if (itemsError) throw itemsError;

  const itemIds = (Array.isArray(auditItems) ? auditItems : []).map((item) => item.id).filter(Boolean);
  let evidencePaths = [];

  for (let index = 0; index < itemIds.length; index += 200) {
    const { data: attachments, error: attachmentsError } = await supabase
      .from("it_asset_audit_attachments")
      .select("file_path")
      .in("audit_item_id", itemIds.slice(index, index + 200));

    if (attachmentsError) throw attachmentsError;
    evidencePaths = evidencePaths.concat(
      (Array.isArray(attachments) ? attachments : []).map((item) => item.file_path).filter(Boolean),
    );
  }

  const { error: deleteError } = await supabase
    .from("it_asset_audit_sessions")
    .delete()
    .eq("id", sessionId);

  if (deleteError) throw deleteError;

  let cleanupError = null;
  for (let index = 0; index < evidencePaths.length; index += 100) {
    const { error } = await supabase.storage
      .from(ASSET_AUDIT_EVIDENCE_BUCKET)
      .remove(evidencePaths.slice(index, index + 100));
    if (error && !cleanupError) cleanupError = error;
  }

  return { cleanupError, removedEvidenceCount: evidencePaths.length };
}
