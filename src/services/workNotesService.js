import imageCompression from "browser-image-compression";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { supabase } from "../lib/supabaseClient";

export const WORK_NOTE_ATTACHMENT_BUCKET = "note-attachments";

export const NOTE_STATUS_VALUES = {
  TODO: "todo",
  DOING: "doing",
  DONE: "done",
};

export const NOTE_STATUS_OPTIONS = [
  { value: NOTE_STATUS_VALUES.TODO, label: "Todo" },
  { value: NOTE_STATUS_VALUES.DOING, label: "Doing" },
  { value: NOTE_STATUS_VALUES.DONE, label: "Done" },
];

export const NOTE_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const NOTE_BASE_SELECT_QUERY = `
  id,
  user_id,
  title,
  description,
  note_date,
  note_time,
  priority,
  status,
  reminder_enabled,
  tag,
  tags,
  is_pinned,
  created_at,
  updated_at
`;

const NOTE_CHECKLIST_SELECT_QUERY = `
  id,
  note_id,
  user_id,
  content,
  is_done,
  created_at,
  updated_at
`;

const NOTE_ATTACHMENT_SELECT_QUERY = `
  id,
  note_id,
  user_id,
  file_name,
  file_path,
  file_url,
  mime_type,
  file_size,
  created_at
`;

function mapRowsByNoteId(rows) {
  const map = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = String(row?.note_id ?? "");
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });

  return map;
}

async function loadWorkNoteRelations(noteIds, userId) {
  const safeNoteIds = [...new Set((Array.isArray(noteIds) ? noteIds : []).filter(Boolean))];

  if (safeNoteIds.length === 0) {
    return {
      checklistsByNoteId: new Map(),
      attachmentsByNoteId: new Map(),
      error: null,
    };
  }

  const [checklistsRes, attachmentsRes] = await Promise.all([
    supabase
      .from("note_checklists")
      .select(NOTE_CHECKLIST_SELECT_QUERY)
      .eq("user_id", userId)
      .in("note_id", safeNoteIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("note_attachments")
      .select(NOTE_ATTACHMENT_SELECT_QUERY)
      .eq("user_id", userId)
      .in("note_id", safeNoteIds)
      .order("created_at", { ascending: false }),
  ]);

  if (checklistsRes.error) {
    return {
      checklistsByNoteId: new Map(),
      attachmentsByNoteId: new Map(),
      error: checklistsRes.error,
    };
  }

  if (attachmentsRes.error) {
    return {
      checklistsByNoteId: new Map(),
      attachmentsByNoteId: new Map(),
      error: attachmentsRes.error,
    };
  }

  return {
    checklistsByNoteId: mapRowsByNoteId(checklistsRes.data),
    attachmentsByNoteId: mapRowsByNoteId(attachmentsRes.data),
    error: null,
  };
}

async function hydrateWorkNotes(rows, userId) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const relationResult = await loadWorkNoteRelations(
    safeRows.map((row) => row?.id),
    userId,
  );

  if (relationResult.error) {
    return {
      data: [],
      error: relationResult.error,
    };
  }

  const hydratedRows = safeRows.map((row) => ({
    ...row,
    note_checklists: relationResult.checklistsByNoteId.get(String(row.id)) || [],
    note_attachments: relationResult.attachmentsByNoteId.get(String(row.id)) || [],
  }));

  return {
    data: hydratedRows.map(normalizeWorkNote),
    error: null,
  };
}

async function loadHydratedWorkNoteById(noteId, userId) {
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_BASE_SELECT_QUERY)
    .eq("id", noteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error,
    };
  }

  if (!data) {
    return {
      data: null,
      error: null,
    };
  }

  const hydrated = await hydrateWorkNotes([data], userId);
  return {
    data: hydrated.data[0] || null,
    error: hydrated.error,
  };
}

export function isWorkNotesRelationCacheError(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();

  return (
    text.includes("could not find a relationship between") &&
    text.includes("notes") &&
    (text.includes("note_checklists") || text.includes("note_attachments"))
  );
}

export function normalizeText(value) {
  return String(value || "").trim();
}

export function sanitizePathSegment(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function normalizeStatus(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "done") return NOTE_STATUS_VALUES.DONE;
  if (text === "doing") return NOTE_STATUS_VALUES.DOING;
  if (text === "pending") return NOTE_STATUS_VALUES.TODO;
  return NOTE_STATUS_VALUES.TODO;
}

export function normalizeTags(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim());

  const unique = new Set();

  source.forEach((item) => {
    const cleaned = String(item || "").trim().replace(/^#/, "");
    if (!cleaned) return;
    unique.add(cleaned);
  });

  return [...unique];
}

export function formatTags(tags) {
  return normalizeTags(tags).join(", ");
}

export function formatFileSize(size) {
  const bytes = Number(size || 0);
  if (!bytes) return "-";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function isImageAttachment(item) {
  const mimeType = String(item?.mime_type || item?.type || "").toLowerCase();
  return mimeType.startsWith("image/");
}

function toSafeTimeLabel(value) {
  const text = normalizeText(value);
  return text ? text.slice(0, 5) : "";
}

function toSortTimestamp(note) {
  const datePart = normalizeText(note?.note_date) || "1970-01-01";
  const timePart = toSafeTimeLabel(note?.note_time) || "00:00";
  const isoValue = `${datePart}T${timePart}:00`;
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(note?.updated_at || note?.created_at || 0);
    return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
  }
  return date.getTime();
}

function normalizeChecklistItem(item) {
  return {
    id: item?.id ?? null,
    note_id: item?.note_id ?? null,
    user_id: item?.user_id ?? null,
    content: normalizeText(item?.content),
    is_done: Boolean(item?.is_done),
    created_at: item?.created_at || null,
    updated_at: item?.updated_at || null,
  };
}

function normalizeAttachment(item) {
  return {
    id: item?.id ?? null,
    note_id: item?.note_id ?? null,
    user_id: item?.user_id ?? null,
    file_name: normalizeText(item?.file_name) || "attachment",
    file_path: normalizeText(item?.file_path),
    file_url: normalizeText(item?.file_url),
    mime_type: normalizeText(item?.mime_type),
    file_size: Number(item?.file_size || 0) || 0,
    created_at: item?.created_at || null,
  };
}

export function normalizeWorkNote(row) {
  const tags = normalizeTags(Array.isArray(row?.tags) && row.tags.length > 0 ? row.tags : row?.tag);
  const checklists = Array.isArray(row?.note_checklists)
    ? row.note_checklists
        .map(normalizeChecklistItem)
        .filter((item) => item.content)
        .sort((left, right) => {
          const leftValue = new Date(left.created_at || 0).getTime();
          const rightValue = new Date(right.created_at || 0).getTime();
          return leftValue - rightValue || Number(left.id || 0) - Number(right.id || 0);
        })
    : [];
  const attachments = Array.isArray(row?.note_attachments)
    ? row.note_attachments
        .map(normalizeAttachment)
        .filter((item) => item.file_url)
        .sort((left, right) => {
          const leftValue = new Date(left.created_at || 0).getTime();
          const rightValue = new Date(right.created_at || 0).getTime();
          return rightValue - leftValue || Number(right.id || 0) - Number(left.id || 0);
        })
    : [];

  return {
    ...row,
    title: normalizeText(row?.title),
    description: normalizeText(row?.description),
    note_time: toSafeTimeLabel(row?.note_time),
    status: normalizeStatus(row?.status),
    priority: normalizeText(row?.priority) || "medium",
    reminder_enabled: Boolean(row?.reminder_enabled),
    is_pinned: Boolean(row?.is_pinned),
    tags,
    note_checklists: checklists,
    note_attachments: attachments,
  };
}

export function sortWorkNotes(notes) {
  return [...(Array.isArray(notes) ? notes : [])].sort((left, right) => {
    if (Boolean(left?.is_pinned) !== Boolean(right?.is_pinned)) {
      return Number(Boolean(right?.is_pinned)) - Number(Boolean(left?.is_pinned));
    }
    return toSortTimestamp(right) - toSortTimestamp(left);
  });
}

export function isWorkNotesSchemaError(error) {
  const code = String(error?.code || "");
  const status = Number(error?.status || 0);
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();

  return (
    isWorkNotesRelationCacheError(error) ||
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    status === 404 ||
    text.includes('relation "note_checklists" does not exist') ||
    text.includes('relation "note_attachments" does not exist') ||
    text.includes('relation "notes" does not exist') ||
    text.includes('column "tags"') ||
    text.includes('column "is_pinned"') ||
    text.includes('bucket "note-attachments" not found') ||
    text.includes("bucket not found")
  );
}

export async function loadWorkNotes(userId) {
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_BASE_SELECT_QUERY)
    .eq("user_id", userId)
    .order("is_pinned", { ascending: false })
    .order("note_date", { ascending: false })
    .order("note_time", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      data: [],
      error,
    };
  }

  return hydrateWorkNotes(data, userId);
}

export async function createWorkNote(payload) {
  const { data, error } = await supabase.from("notes").insert(payload).select(NOTE_BASE_SELECT_QUERY).single();

  if (error || !data) {
    return {
      data: null,
      error,
    };
  }

  return {
    ...(await loadHydratedWorkNoteById(data.id, payload.user_id)),
  };
}

export async function updateWorkNote(noteId, userId, payload) {
  const { data, error } = await supabase
    .from("notes")
    .update(payload)
    .eq("id", noteId)
    .eq("user_id", userId)
    .select(NOTE_BASE_SELECT_QUERY)
    .single();

  if (error || !data) {
    return {
      data: null,
      error,
    };
  }

  return {
    ...(await loadHydratedWorkNoteById(data.id, userId)),
  };
}

export async function deleteWorkNote(noteId, userId) {
  return supabase.from("notes").delete().eq("id", noteId).eq("user_id", userId);
}

export async function syncNoteChecklistItems({ noteId, userId, initialItems = [], nextItems = [] }) {
  const normalizedInitial = initialItems.map(normalizeChecklistItem).filter((item) => item.id);
  const normalizedNext = nextItems
    .map((item) => ({
      id: item?.id ?? null,
      content: normalizeText(item?.content),
      is_done: Boolean(item?.is_done),
    }))
    .filter((item) => item.content);

  const initialMap = new Map(normalizedInitial.map((item) => [String(item.id), item]));
  const nextIds = new Set(normalizedNext.filter((item) => item.id).map((item) => String(item.id)));
  const deleteIds = normalizedInitial.filter((item) => !nextIds.has(String(item.id))).map((item) => item.id);
  const updateItems = normalizedNext.filter((item) => {
    if (!item.id) return false;
    const current = initialMap.get(String(item.id));
    if (!current) return false;
    return current.content !== item.content || Boolean(current.is_done) !== Boolean(item.is_done);
  });
  const insertItems = normalizedNext
    .filter((item) => !item.id)
    .map((item) => ({
      note_id: noteId,
      user_id: userId,
      content: item.content,
      is_done: item.is_done,
    }));

  if (deleteIds.length > 0) {
    const { error } = await supabase.from("note_checklists").delete().in("id", deleteIds).eq("user_id", userId);
    if (error) throw error;
  }

  if (insertItems.length > 0) {
    const { error } = await supabase.from("note_checklists").insert(insertItems);
    if (error) throw error;
  }

  if (updateItems.length > 0) {
    const results = await Promise.all(
      updateItems.map((item) =>
        supabase
          .from("note_checklists")
          .update({
            content: item.content,
            is_done: item.is_done,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("user_id", userId)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
  }
}

async function compressAttachment(file) {
  if (!file || !String(file.type || "").toLowerCase().startsWith("image/")) return file;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.82,
    });

    return new File([compressed], file.name, {
      type: compressed.type || file.type || "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Compress work note attachment error:", error);
    return file;
  }
}

async function cleanupUploadedPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return;
  try {
    await supabase.storage.from(WORK_NOTE_ATTACHMENT_BUCKET).remove(paths);
  } catch (error) {
    console.warn("Cleanup work note attachment error:", error);
  }
}

export async function uploadWorkNoteAttachments({ noteId, userId, files = [] }) {
  const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
  if (safeFiles.length === 0) return [];

  const uploadedPaths = [];
  const attachmentRows = [];

  try {
    for (const [index, originalFile] of safeFiles.entries()) {
      const file = await compressAttachment(originalFile);
      const safeUserId = sanitizePathSegment(userId || "unknown");
      const safeName = sanitizePathSegment(file?.name || `attachment_${Date.now()}`);
      const filePath = `notes/${safeUserId}/${noteId}/${Date.now()}_${index}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(WORK_NOTE_ATTACHMENT_BUCKET)
        .upload(filePath, file, {
          upsert: false,
          contentType: file?.type || "application/octet-stream",
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(WORK_NOTE_ATTACHMENT_BUCKET).getPublicUrl(filePath);
      uploadedPaths.push(filePath);
      attachmentRows.push({
        note_id: noteId,
        user_id: userId,
        file_name: normalizeText(file?.name) || "attachment",
        file_path: filePath,
        file_url: normalizeText(data?.publicUrl),
        mime_type: normalizeText(file?.type),
        file_size: Number(file?.size || 0) || 0,
      });
    }

    const { data, error } = await supabase.from("note_attachments").insert(attachmentRows).select("*");
    if (error) {
      await cleanupUploadedPaths(uploadedPaths);
      throw error;
    }

    return Array.isArray(data) ? data.map(normalizeAttachment) : [];
  } catch (error) {
    await cleanupUploadedPaths(uploadedPaths);
    throw error;
  }
}

export async function deleteWorkNoteAttachments({ attachments = [], userId }) {
  const safeAttachments = (Array.isArray(attachments) ? attachments : []).map(normalizeAttachment).filter((item) => item.id);
  if (safeAttachments.length === 0) return;

  const ids = safeAttachments.map((item) => item.id);
  const paths = safeAttachments.map((item) => item.file_path).filter(Boolean);

  const { error } = await supabase.from("note_attachments").delete().in("id", ids).eq("user_id", userId);
  if (error) throw error;

  await cleanupUploadedPaths(paths);
}

export async function removeWorkNoteAttachmentFiles(attachments = []) {
  const paths = (Array.isArray(attachments) ? attachments : [])
    .map(normalizeAttachment)
    .map((item) => item.file_path)
    .filter(Boolean);

  await cleanupUploadedPaths(paths);
}

export async function toggleWorkNotePin(note, userId) {
  return updateWorkNote(note.id, userId, { is_pinned: !Boolean(note?.is_pinned) });
}

export async function updateWorkNoteStatus(note, userId, status) {
  return updateWorkNote(note.id, userId, { status: normalizeStatus(status) });
}

function getStatusLabel(status) {
  const value = normalizeStatus(status);
  if (value === NOTE_STATUS_VALUES.DONE) return "Done";
  if (value === NOTE_STATUS_VALUES.DOING) return "Doing";
  return "Todo";
}

function getPriorityLabel(priority) {
  const text = String(priority || "").toLowerCase();
  if (text === "high") return "High";
  if (text === "low") return "Low";
  return "Medium";
}

function formatNoteSchedule(note) {
  const datePart = normalizeText(note?.note_date);
  if (!datePart) return "-";
  const timePart = toSafeTimeLabel(note?.note_time);
  return timePart ? `${datePart} ${timePart}` : datePart;
}

function createWorkbookStyles(workbook) {
  workbook.creator = "Codex";
  workbook.lastModifiedBy = "Codex";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.views = [{ x: 0, y: 0, width: 1600, height: 900 }];
}

export async function exportWorkNotesToExcel({ notes = [], profile, filters = {} }) {
  const workbook = new ExcelJS.Workbook();
  createWorkbookStyles(workbook);

  const overviewSheet = workbook.addWorksheet("Overview", {
    properties: { defaultRowHeight: 22 },
    views: [{ showGridLines: false }],
  });
  const detailSheet = workbook.addWorksheet("Work Notes", {
    properties: { defaultRowHeight: 22 },
    views: [{ state: "frozen", ySplit: 5 }],
  });

  const normalizedNotes = sortWorkNotes(notes).map(normalizeWorkNote);
  const totalNotes = normalizedNotes.length;
  const doneNotes = normalizedNotes.filter((item) => item.status === NOTE_STATUS_VALUES.DONE).length;
  const doingNotes = normalizedNotes.filter((item) => item.status === NOTE_STATUS_VALUES.DOING).length;
  const todoNotes = normalizedNotes.filter((item) => item.status === NOTE_STATUS_VALUES.TODO).length;
  const pinnedNotes = normalizedNotes.filter((item) => item.is_pinned).length;
  const totalAttachments = normalizedNotes.reduce((sum, item) => sum + item.note_attachments.length, 0);
  const totalChecklistItems = normalizedNotes.reduce((sum, item) => sum + item.note_checklists.length, 0);
  const doneChecklistItems = normalizedNotes.reduce(
    (sum, item) => sum + item.note_checklists.filter((checklist) => checklist.is_done).length,
    0,
  );

  overviewSheet.mergeCells("A1:F1");
  overviewSheet.getCell("A1").value = "Work Notes Report";
  overviewSheet.getCell("A1").font = { size: 20, bold: true, color: { argb: "FF123C78" } };
  overviewSheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

  overviewSheet.mergeCells("A2:F2");
  overviewSheet.getCell("A2").value = `Generated ${format(new Date(), "yyyy-MM-dd HH:mm")} | User ${normalizeText(profile?.full_name) || "Unknown"}`;
  overviewSheet.getCell("A2").font = { size: 11, color: { argb: "FF475569" } };

  overviewSheet.getRow(4).values = ["Metric", "Value", "", "Filter", "Value", ""];
  overviewSheet.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
  overviewSheet.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123C78" } };
  overviewSheet.getRow(4).alignment = { vertical: "middle", horizontal: "center" };

  const summaryRows = [
    ["Total Notes", totalNotes, "", "Status Filter", normalizeText(filters.statusLabel) || "All", ""],
    ["Todo", todoNotes, "", "Tag Filter", normalizeText(filters.tagLabel) || "All", ""],
    ["Doing", doingNotes, "", "Search", normalizeText(filters.search) || "-", ""],
    ["Done", doneNotes, "", "Pinned Notes", pinnedNotes, ""],
    ["Attachments", totalAttachments, "", "Checklist Completed", `${doneChecklistItems}/${totalChecklistItems}`, ""],
  ];

  summaryRows.forEach((row) => overviewSheet.addRow(row));

  overviewSheet.getColumn(1).width = 22;
  overviewSheet.getColumn(2).width = 18;
  overviewSheet.getColumn(4).width = 18;
  overviewSheet.getColumn(5).width = 26;

  for (let rowIndex = 5; rowIndex < 10; rowIndex += 1) {
    const row = overviewSheet.getRow(rowIndex);
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: colNumber <= 2 ? "FFF8FAFC" : "FFFFFFFF" },
      };
      cell.alignment = { vertical: "middle", horizontal: colNumber === 2 || colNumber === 5 ? "center" : "left" };
    });
  }

  detailSheet.columns = [
    { header: "Pinned", key: "is_pinned", width: 10 },
    { header: "Status", key: "status", width: 12 },
    { header: "Priority", key: "priority", width: 12 },
    { header: "Title", key: "title", width: 28 },
    { header: "Description", key: "description", width: 40 },
    { header: "Schedule", key: "schedule", width: 20 },
    { header: "Tags", key: "tags", width: 24 },
    { header: "Checklist", key: "checklist", width: 28 },
    { header: "Checklist Progress", key: "checklist_progress", width: 18 },
    { header: "Attachments", key: "attachments", width: 26 },
    { header: "Updated At", key: "updated_at", width: 22 },
  ];

  detailSheet.getRow(1).values = ["Work Notes Export"];
  detailSheet.mergeCells("A1:K1");
  detailSheet.getCell("A1").font = { size: 18, bold: true, color: { argb: "FF123C78" } };
  detailSheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

  detailSheet.getRow(2).values = [
    `User: ${normalizeText(profile?.full_name) || "Unknown"} | Department: ${normalizeText(profile?.department) || "-"}`,
  ];
  detailSheet.mergeCells("A2:K2");
  detailSheet.getCell("A2").font = { size: 11, color: { argb: "FF475569" } };

  detailSheet.getRow(4).values = detailSheet.columns.map((column) => column.header);
  detailSheet.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
  detailSheet.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123C78" } };
  detailSheet.getRow(4).alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  normalizedNotes.forEach((note) => {
    const checklistDone = note.note_checklists.filter((item) => item.is_done).length;
    const checklistTotal = note.note_checklists.length;
    const row = detailSheet.addRow({
      is_pinned: note.is_pinned ? "Yes" : "",
      status: getStatusLabel(note.status),
      priority: getPriorityLabel(note.priority),
      title: note.title || "-",
      description: note.description || "-",
      schedule: formatNoteSchedule(note),
      tags: formatTags(note.tags) || "-",
      checklist: note.note_checklists.map((item) => `${item.is_done ? "[x]" : "[ ]"} ${item.content}`).join("\n") || "-",
      checklist_progress: checklistTotal > 0 ? `${checklistDone}/${checklistTotal}` : "-",
      attachments: note.note_attachments.map((item) => item.file_name).join("\n") || "-",
      updated_at: note.updated_at ? format(new Date(note.updated_at), "yyyy-MM-dd HH:mm") : "-",
    });

    row.height = 54;
    row.alignment = { vertical: "top", wrapText: true };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: row.number % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC" },
      };
    });
  });

  const fileName = `work-notes-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName,
  );
}
