import { supabase } from "../../../lib/supabaseClient";

export const STOCK_ATTACHMENT_BUCKET = "it-stock-attachments";
export const STOCK_ATTACHMENT_MAX_SIZE = 20 * 1024 * 1024;

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeOptionalText(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(Math.round(parsed), 0);
}

function sanitizePathSegment(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizePendingStockUpload(entry) {
  if (entry instanceof File) {
    return { file: entry, role: "evidence" };
  }
  const file = entry?.file;
  return {
    file: file instanceof File ? file : null,
    role: normalizeText(entry?.role) === "device" ? "device" : "evidence",
  };
}

function normalizeStockAttachment(item) {
  return {
    id: item?.id ?? null,
    stock_item_id: item?.stock_item_id ?? null,
    issue_log_id: item?.issue_log_id ?? null,
    file_name: normalizeText(item?.file_name) || "attachment",
    file_path: normalizeText(item?.file_path),
    file_url: normalizeText(item?.file_url),
    mime_type: normalizeText(item?.mime_type),
    file_size: Number(item?.file_size || 0) || 0,
    uploaded_by: item?.uploaded_by ?? null,
    created_at: item?.created_at || null,
  };
}

function sortAttachments(items = []) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const leftValue = new Date(left?.created_at || 0).getTime();
    const rightValue = new Date(right?.created_at || 0).getTime();
    return rightValue - leftValue || String(right?.id || "").localeCompare(String(left?.id || ""));
  });
}

async function cleanupUploadedPaths(paths) {
  const safePaths = (Array.isArray(paths) ? paths : []).filter(Boolean);
  if (safePaths.length === 0) return;
  try {
    await supabase.storage.from(STOCK_ATTACHMENT_BUCKET).remove(safePaths);
  } catch (error) {
    console.warn("Cleanup stock attachment error:", error);
  }
}

export function isStockSchemaError(error) {
  const code = String(error?.code || "");
  const status = Number(error?.status || 0);
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();

  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    status === 404 ||
    text.includes('relation "it_stock_items" does not exist') ||
    text.includes('relation "it_stock_issue_logs" does not exist') ||
    text.includes('relation "it_stock_item_attachments" does not exist') ||
    text.includes('relation "it_stock_issue_attachments" does not exist') ||
    text.includes("it_stock_items") ||
    text.includes("it_stock_issue_logs") ||
    text.includes("it_stock_item_attachments") ||
    text.includes("it_stock_issue_attachments") ||
    text.includes(`bucket "${STOCK_ATTACHMENT_BUCKET}" not found`) ||
    text.includes("bucket not found")
  );
}

export function isStockPermissionDenied(error) {
  const code = String(error?.code || "");
  const status = Number(error?.status || 0);
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();

  return (
    code === "42501" ||
    status === 401 ||
    status === 403 ||
    text.includes("permission denied") ||
    text.includes("row-level security")
  );
}

export async function loadStockItems() {
  const { data, error } = await supabase
    .from("it_stock_items")
    .select("*, it_stock_item_attachments(*)")
    .order("updated_at", { ascending: false });

  return {
    data: Array.isArray(data)
      ? data.map((row) => ({
          ...row,
          stock_attachments: sortAttachments(
            (Array.isArray(row?.it_stock_item_attachments) ? row.it_stock_item_attachments : [])
              .map(normalizeStockAttachment)
              .filter((item) => item.file_url),
          ),
        }))
      : [],
    error: error || null,
  };
}

export async function loadStockIssueLogs() {
  const { data, error } = await supabase
    .from("it_stock_issue_logs")
    .select("*, it_stock_issue_attachments(*)")
    .order("issued_at", { ascending: false })
    .limit(80);

  return {
    data: Array.isArray(data)
      ? data.map((row) => ({
          ...row,
          issue_attachments: sortAttachments(
            (Array.isArray(row?.it_stock_issue_attachments) ? row.it_stock_issue_attachments : [])
              .map(normalizeStockAttachment)
              .filter((item) => item.file_url),
          ),
        }))
      : [],
    error: error || null,
  };
}

export async function loadProfileDirectory() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    data: Array.isArray(data)
      ? data.map((row) => ({
          id: String(row?.id || ""),
          full_name: normalizeText(row?.full_name || row?.name || row?.email || ""),
          employee_code: normalizeText(row?.employee_code || row?.employeeId || ""),
          department: normalizeText(row?.department),
          avatar_url: normalizeText(row?.avatar_url || row?.id_card_url),
          email: normalizeText(row?.email),
        }))
      : [],
    error: error || null,
  };
}

export async function saveStockItem({
  editingId = "",
  formData = {},
  currentUser = null,
  existingAttachments = [],
  removedAttachments = [],
  pendingFiles = [],
}) {
  const payload = {
    stock_code: normalizeText(formData.stock_code).toUpperCase(),
    item_name: normalizeText(formData.item_name),
    item_category: normalizeText(formData.item_category) || "General",
    category_th: normalizeOptionalText(formData.category_th),
    category_en: normalizeOptionalText(formData.category_en),
    item_prefix: normalizeOptionalText(formData.item_prefix),
    reference_item_code: normalizeOptionalText(formData.reference_item_code),
    description_th: normalizeOptionalText(formData.description_th),
    description_en: normalizeOptionalText(formData.description_en),
    brand: normalizeOptionalText(formData.brand),
    model: normalizeOptionalText(formData.model),
    unit: normalizeText(formData.unit) || "ชิ้น",
    quantity_on_hand: normalizeInteger(formData.quantity_on_hand, 0),
    minimum_quantity: normalizeInteger(formData.minimum_quantity, 0),
    location: normalizeOptionalText(formData.location),
    source_ref: normalizeOptionalText(formData.source_ref),
    lot_number: normalizeOptionalText(formData.lot_number),
    notes: normalizeOptionalText(formData.notes),
    created_by: currentUser?.id || undefined,
  };

  if (!payload.stock_code || !payload.item_name) {
    throw new Error("กรุณากรอกรหัส stock และชื่ออุปกรณ์");
  }

  if (!payload.reference_item_code || !payload.item_prefix || !payload.category_en) {
    throw new Error("กรุณาเลือกรหัสอุปกรณ์มาตรฐานจากรายการอ้างอิงก่อนบันทึก");
  }

  let savedItem = null;
  if (editingId) {
    const { data, error } = await supabase
      .from("it_stock_items")
      .update(payload)
      .eq("id", editingId)
      .select("*")
      .single();

    if (error) throw error;
    savedItem = data;
  } else {
    const { data, error } = await supabase
      .from("it_stock_items")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    savedItem = data;
  }

  const safeRemoved = (Array.isArray(removedAttachments) ? removedAttachments : [])
    .map(normalizeStockAttachment)
    .filter((item) => item.id);
  const safeExisting = sortAttachments(
    (Array.isArray(existingAttachments) ? existingAttachments : [])
      .map(normalizeStockAttachment)
      .filter((item) => item.file_url),
  );

  if (safeRemoved.length > 0) {
    await deleteStockItemAttachments({ attachments: safeRemoved });
  }

  const uploadedAttachments = await uploadStockItemAttachments({
    stockItemId: savedItem.id,
    userId: currentUser?.id,
    files: pendingFiles,
  });

  const nextAttachments = sortAttachments([
    ...uploadedAttachments,
    ...safeExisting,
  ]);

  return {
    ...savedItem,
    stock_attachments: nextAttachments,
  };
}

export async function uploadStockItemAttachments({ stockItemId, userId, files = [] }) {
  const safeUploads = (Array.isArray(files) ? files : []).map(normalizePendingStockUpload).filter((entry) => entry.file instanceof File);
  if (!stockItemId || safeUploads.length === 0) return [];

  const uploadedPaths = [];
  const attachmentRows = [];

  try {
    for (const [index, upload] of safeUploads.entries()) {
      const { file, role } = upload;
      if (Number(file.size || 0) > STOCK_ATTACHMENT_MAX_SIZE) {
        throw new Error(`ไฟล์ ${file.name} ต้องมีขนาดไม่เกิน 20 MB`);
      }

      const safeUserId = sanitizePathSegment(userId || "unknown");
      const safeRole = sanitizePathSegment(role || "evidence");
      const safeName = sanitizePathSegment(file?.name || `stock_attachment_${Date.now()}`);
      const filePath = `items/${safeUserId}/${stockItemId}/${safeRole}/${Date.now()}_${index}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(STOCK_ATTACHMENT_BUCKET)
        .upload(filePath, file, {
          upsert: false,
          contentType: file?.type || "application/octet-stream",
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(STOCK_ATTACHMENT_BUCKET).getPublicUrl(filePath);
      uploadedPaths.push(filePath);
      attachmentRows.push({
        stock_item_id: stockItemId,
        file_name: normalizeText(file?.name) || "attachment",
        file_path: filePath,
        file_url: normalizeText(data?.publicUrl),
        mime_type: normalizeText(file?.type),
        file_size: Number(file?.size || 0) || 0,
        uploaded_by: userId || null,
      });
    }

    const { data, error } = await supabase
      .from("it_stock_item_attachments")
      .insert(attachmentRows)
      .select("*");

    if (error) {
      await cleanupUploadedPaths(uploadedPaths);
      throw error;
    }

    return sortAttachments(Array.isArray(data) ? data.map(normalizeStockAttachment) : []);
  } catch (error) {
    await cleanupUploadedPaths(uploadedPaths);
    throw error;
  }
}

export async function deleteStockItemAttachments({ attachments = [] }) {
  const safeAttachments = (Array.isArray(attachments) ? attachments : [])
    .map(normalizeStockAttachment)
    .filter((item) => item.id);

  if (safeAttachments.length === 0) return;

  const ids = safeAttachments.map((item) => item.id);
  const paths = safeAttachments.map((item) => item.file_path).filter(Boolean);

  const { error } = await supabase
    .from("it_stock_item_attachments")
    .delete()
    .in("id", ids);

  if (error) throw error;
  await cleanupUploadedPaths(paths);
}

export async function deleteStockItem({ stockItem = null }) {
  const stockItemId = stockItem?.id;
  if (!stockItemId) {
    throw new Error("ไม่พบรายการ stock ที่ต้องการลบ");
  }

  const { count, error: countError } = await supabase
    .from("it_stock_issue_logs")
    .select("id", { count: "exact", head: true })
    .eq("stock_item_id", stockItemId);

  if (countError) throw countError;
  if (Number(count || 0) > 0) {
    throw new Error("รายการนี้มีประวัติการเบิกแล้ว ไม่สามารถลบได้ ให้ปรับจำนวนคงเหลือหรือใส่หมายเหตุแทน");
  }

  const existingAttachments = Array.isArray(stockItem?.stock_attachments)
    ? stockItem.stock_attachments
    : [];

  if (existingAttachments.length > 0) {
    await deleteStockItemAttachments({ attachments: existingAttachments });
  }

  const { error } = await supabase
    .from("it_stock_items")
    .delete()
    .eq("id", stockItemId);

  if (error) throw error;
  return { id: stockItemId };
}

export async function uploadStockIssueAttachments({ issueLogId, userId, files = [] }) {
  const safeFiles = (Array.isArray(files) ? files : []).filter((file) => file instanceof File);
  if (!issueLogId || safeFiles.length === 0) return [];

  const uploadedPaths = [];
  const attachmentRows = [];

  try {
    for (const [index, file] of safeFiles.entries()) {
      if (Number(file.size || 0) > STOCK_ATTACHMENT_MAX_SIZE) {
        throw new Error(`ไฟล์ ${file.name} ต้องมีขนาดไม่เกิน 20 MB`);
      }

      const safeUserId = sanitizePathSegment(userId || "unknown");
      const safeName = sanitizePathSegment(file?.name || `issue_attachment_${Date.now()}`);
      const filePath = `issues/${safeUserId}/${issueLogId}/${Date.now()}_${index}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(STOCK_ATTACHMENT_BUCKET)
        .upload(filePath, file, {
          upsert: false,
          contentType: file?.type || "application/octet-stream",
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(STOCK_ATTACHMENT_BUCKET).getPublicUrl(filePath);
      uploadedPaths.push(filePath);
      attachmentRows.push({
        issue_log_id: issueLogId,
        file_name: normalizeText(file?.name) || "attachment",
        file_path: filePath,
        file_url: normalizeText(data?.publicUrl),
        mime_type: normalizeText(file?.type),
        file_size: Number(file?.size || 0) || 0,
        uploaded_by: userId || null,
      });
    }

    const { data, error } = await supabase
      .from("it_stock_issue_attachments")
      .insert(attachmentRows)
      .select("*");

    if (error) {
      await cleanupUploadedPaths(uploadedPaths);
      throw error;
    }

    return sortAttachments(Array.isArray(data) ? data.map(normalizeStockAttachment) : []);
  } catch (error) {
    await cleanupUploadedPaths(uploadedPaths);
    throw error;
  }
}

export async function issueStockItem({
  stockItem = null,
  quantity = 0,
  requester = {},
  purpose = "",
  notes = "",
  currentUser = null,
  pendingFiles = [],
}) {
  const safeFiles = (Array.isArray(pendingFiles) ? pendingFiles : []).filter((file) => file instanceof File);
  const safeQuantity = normalizeInteger(quantity, 0);
  if (!stockItem?.id) {
    throw new Error("กรุณาเลือกรายการ stock");
  }
  if (safeQuantity <= 0) {
    throw new Error("จำนวนที่เบิกต้องมากกว่า 0");
  }

  const currentQty = normalizeInteger(stockItem?.quantity_on_hand, 0);
  if (safeQuantity > currentQty) {
    throw new Error("จำนวนคงเหลือไม่พอสำหรับการเบิก");
  }

  if (safeFiles.length === 0) {
    throw new Error("Attachment evidence is required before confirming the issue");
  }

  const nextQuantity = currentQty - safeQuantity;
  const { data: updatedItem, error: updateError } = await supabase
    .from("it_stock_items")
    .update({ quantity_on_hand: nextQuantity })
    .eq("id", stockItem.id)
    .select("*")
    .single();

  if (updateError) throw updateError;

  const logPayload = {
    stock_item_id: stockItem.id,
    quantity: safeQuantity,
    requester_profile_id: normalizeOptionalText(requester.requester_profile_id),
    requester_name: normalizeText(requester.requester_name),
    requester_emp_id: normalizeOptionalText(requester.requester_emp_id),
    requester_department: normalizeOptionalText(requester.requester_department),
    purpose: normalizeOptionalText(purpose),
    notes: normalizeOptionalText(notes),
    channel: "walk-in",
    stock_code_snapshot: normalizeText(stockItem.stock_code),
    item_name_snapshot: normalizeText(stockItem.item_name),
    unit_snapshot: normalizeOptionalText(stockItem.unit),
    issued_by: currentUser?.id || null,
    issued_by_name: normalizeOptionalText(currentUser?.name || currentUser?.full_name || "IT Admin"),
  };

  if (!logPayload.requester_name) {
    try {
      await supabase.from("it_stock_items").update({ quantity_on_hand: currentQty }).eq("id", stockItem.id);
    } catch {
      // Ignore rollback failure; original error remains more actionable.
    }
    throw new Error("กรุณาระบุชื่อผู้เบิก");
  }

  const { data: createdLog, error: insertError } = await supabase
    .from("it_stock_issue_logs")
    .insert(logPayload)
    .select("*")
    .single();

  if (insertError) {
    try {
      await supabase.from("it_stock_items").update({ quantity_on_hand: currentQty }).eq("id", stockItem.id);
    } catch {
      // Ignore rollback failure; original error remains more actionable.
    }
    throw insertError;
  }

  try {
    const issueAttachments = await uploadStockIssueAttachments({
      issueLogId: createdLog.id,
      userId: currentUser?.id,
      files: safeFiles,
    });

    return {
      updatedItem: {
        ...updatedItem,
        stock_attachments: Array.isArray(stockItem?.stock_attachments) ? stockItem.stock_attachments : [],
      },
      createdLog: {
        ...createdLog,
        issue_attachments: issueAttachments,
      },
    };
  } catch (error) {
    try {
      await supabase.from("it_stock_issue_attachments").delete().eq("issue_log_id", createdLog.id);
    } catch {
      // Ignore cleanup failure; rollback below is more important.
    }
    try {
      await supabase.from("it_stock_issue_logs").delete().eq("id", createdLog.id);
    } catch {
      // Ignore cleanup failure; rollback below is more important.
    }
    try {
      await supabase.from("it_stock_items").update({ quantity_on_hand: currentQty }).eq("id", stockItem.id);
    } catch {
      // Ignore rollback failure; original error remains more actionable.
    }
    throw error;
  }
}
