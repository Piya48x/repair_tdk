import * as XLSX from "xlsx";
import { supabase } from "../../../lib/supabaseClient";

const MAX_REGISTRY_ROWS = 5000;

const FIELD_ALIASES = {
  full_name: ["fullname", "full name", "name", "driver name", "ชื่อ", "ชื่อผู้ขับขี่"],
  group_name: ["groupname", "group name", "group", "กลุ่ม"],
  vehicle_plate: ["licenseplate", "license plate", "vehicle plate", "plate", "ทะเบียนรถ", "ทะเบียน"],
  company_name: ["company", "company name", "บริษัท"],
  remark: ["remark", "remarks", "หมายเหตุ"],
  contact_name: ["contact name", "contact", "ผู้ติดต่อ", "ผู้ประสานงาน"],
  purpose: ["purpose", "contact purpose", "วัตถุประสงค์"],
  source_created_by: ["createby", "create by", "created by", "ผู้สร้าง"],
  mapping_status: ["mapping status", "mappingstatus", "สถานะ mapping", "สถานะ"],
};

const COMPARISON_FIELDS = [
  "vehicle_plate",
  "full_name",
  "company_name",
  "remark",
  "contact_name",
  "purpose",
  "source_created_by",
  "mapping_status",
];

const cleanText = (value) => String(value ?? "").trim();
const normalizeHeader = (value) => cleanText(value)
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\s_./()\-[\]]+/g, "")
  .replace(/[^\p{L}\p{N}]/gu, "");

const NORMALIZED_ALIASES = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([field, aliases]) => [field, new Set(aliases.map(normalizeHeader))]),
);

function canonicalField(value) {
  const normalized = normalizeHeader(value);
  return Object.entries(NORMALIZED_ALIASES).find(([, aliases]) => aliases.has(normalized))?.[0] || "";
}

export function normalizeRegistryPlate(value) {
  return cleanText(value).normalize("NFKC").toUpperCase().replace(/[\s-]+/g, "");
}

function normalizeGroup(value) {
  return cleanText(value).toUpperCase().replace(/[\s_-]+/g, "");
}

function findHeaderRow(rows) {
  let best = { index: -1, score: 0 };
  rows.slice(0, 30).forEach((row, index) => {
    const fields = new Set(row.map(canonicalField).filter(Boolean));
    const score = fields.size + (fields.has("vehicle_plate") ? 5 : 0) + (fields.has("group_name") ? 2 : 0);
    if (score > best.score) best = { index, score };
  });
  return best.score >= 6 ? best.index : -1;
}

function buildRegistryRecord(row, headers, sourceSheet, sourceRow) {
  const values = {};
  headers.forEach((header, index) => {
    const field = canonicalField(header);
    if (field && values[field] == null) values[field] = row[index];
  });

  const vehiclePlate = cleanText(values.vehicle_plate).toUpperCase().replace(/\s+/g, " ");
  const plateKey = normalizeRegistryPlate(vehiclePlate);
  const groupName = cleanText(values.group_name) || "TDK APPROVED";
  const errors = [];
  if (!plateKey) errors.push("ไม่ได้ระบุทะเบียนรถ");
  if (normalizeGroup(groupName) !== "TDKAPPROVED") errors.push("GroupName ต้องเป็น TDK APPROVED");

  return {
    plate_key: plateKey,
    vehicle_plate: vehiclePlate,
    full_name: cleanText(values.full_name) || null,
    group_name: "TDK APPROVED",
    company_name: cleanText(values.company_name) || null,
    remark: cleanText(values.remark) || null,
    contact_name: cleanText(values.contact_name) || null,
    purpose: cleanText(values.purpose) || null,
    source_created_by: cleanText(values.source_created_by) || null,
    mapping_status: cleanText(values.mapping_status) || null,
    source_sheet: sourceSheet,
    source_row: sourceRow,
    import_errors: errors,
  };
}

function hasMetadataChanged(existing, incoming) {
  return COMPARISON_FIELDS.some((field) => cleanText(existing?.[field]) !== cleanText(incoming?.[field]));
}

export async function previewTdkApprovedRegistryImport(file, currentRegistry = []) {
  if (!file) throw new Error("กรุณาเลือกไฟล์ทะเบียน TDK APPROVED");
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error("รองรับไฟล์ .xlsx, .xls และ .csv เท่านั้น");

  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true, raw: true });
  const parsedSheets = [];
  for (const sheetName of workbook.SheetNames || []) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: true,
      blankrows: true,
    });
    const headerIndex = findHeaderRow(rows);
    if (headerIndex < 0) continue;
    const headers = rows[headerIndex].map(cleanText);
    const records = rows
      .slice(headerIndex + 1)
      .map((row, index) => ({ row, sourceRow: headerIndex + index + 2 }))
      .filter(({ row }) => cleanText(row[headers.findIndex((header) => canonicalField(header) === "vehicle_plate")]))
      .map(({ row, sourceRow }) => buildRegistryRecord(row, headers, sheetName, sourceRow));
    if (records.length) parsedSheets.push({ sheetName, records });
  }

  if (!parsedSheets.length) throw new Error("ไม่พบตารางทะเบียนที่มีคอลัมน์ Licenseplate และ GroupName");
  let rows = parsedSheets.flatMap((sheet) => sheet.records);
  if (rows.length > MAX_REGISTRY_ROWS) throw new Error(`ไฟล์มีมากกว่า ${MAX_REGISTRY_ROWS.toLocaleString("th-TH")} ทะเบียน`);

  // A master workbook can repeat the same plate across sheets or source rows.
  // Treat it as one vehicle and fill missing details from the duplicate rows
  // instead of blocking the entire snapshot import.
  const sourceRowTotal = rows.length;
  let duplicatesIgnored = 0;
  const rowsByPlate = new Map();
  rows.forEach((row) => {
    const existing = rowsByPlate.get(row.plate_key);
    if (!existing) {
      rowsByPlate.set(row.plate_key, row);
      return;
    }

    duplicatesIgnored += 1;
    const merged = { ...existing };
    COMPARISON_FIELDS.forEach((field) => {
      if (!cleanText(merged[field]) && cleanText(row[field])) merged[field] = row[field];
    });
    merged.import_errors = [...new Set([...(existing.import_errors || []), ...(row.import_errors || [])])];
    rowsByPlate.set(row.plate_key, merged);
  });
  rows = [...rowsByPlate.values()];

  const registryByPlate = new Map(currentRegistry.map((row) => [row.plate_key, row]));
  const isBaseline = currentRegistry.length === 0;
  rows = rows.map((row) => {
    const existing = registryByPlate.get(row.plate_key);
    let changeStatus = "UNCHANGED";
    if (isBaseline) changeStatus = "BASELINE";
    else if (!existing) changeStatus = "ADDED";
    else if (!existing.is_active) changeStatus = "REACTIVATED";
    else if (hasMetadataChanged(existing, row)) changeStatus = "UPDATED";
    return { ...row, change_status: changeStatus };
  });

  const incomingKeys = new Set(rows.filter((row) => row.import_errors.length === 0).map((row) => row.plate_key));
  const removals = isBaseline
    ? []
    : currentRegistry.filter((row) => row.is_active && !incomingKeys.has(row.plate_key)).map((row) => ({ ...row, change_status: "REMOVED" }));
  const validRows = rows.filter((row) => row.import_errors.length === 0);

  return {
    fileName: file.name,
    sheetName: parsedSheets.length === 1 ? parsedSheets[0].sheetName : `${parsedSheets.length} sheets`,
    rows,
    removals,
    summary: {
      total: rows.length,
      sourceTotal: sourceRowTotal,
      duplicatesIgnored,
      ready: validRows.length,
      invalid: rows.length - validRows.length,
      baseline: validRows.filter((row) => row.change_status === "BASELINE").length,
      added: validRows.filter((row) => row.change_status === "ADDED").length,
      reactivated: validRows.filter((row) => row.change_status === "REACTIVATED").length,
      removed: removals.length,
      updated: validRows.filter((row) => row.change_status === "UPDATED").length,
      unchanged: validRows.filter((row) => row.change_status === "UNCHANGED").length,
      companies: new Set(validRows.map((row) => row.company_name).filter(Boolean)).size,
      isBaseline,
    },
  };
}

export async function applyTdkApprovedRegistryImport(preview, snapshotDate) {
  if (!preview?.rows?.length) throw new Error("ยังไม่มีข้อมูลทะเบียนสำหรับอัปเดต");
  if (preview.summary?.invalid > 0) throw new Error("กรุณาแก้รายการที่ไม่ถูกต้องก่อนอัปเดตทะเบียน");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(snapshotDate || ""))) throw new Error("กรุณาระบุวันที่อัปเดตทะเบียน");

  const rows = preview.rows.map(({ import_errors, change_status, ...row }) => row);
  const { data, error } = await supabase.rpc("sync_tdk_approved_registry", {
    p_rows: rows,
    p_source_file: preview.fileName || null,
    p_snapshot_date: snapshotDate,
  });
  if (error) throw error;
  return data || {};
}

export async function fetchTdkApprovedRegistry({ includeInactive = true } = {}) {
  let query = supabase
    .from("tdk_approved_registry")
    .select("id, plate_key, vehicle_plate, full_name, group_name, company_name, remark, contact_name, purpose, source_created_by, mapping_status, is_active, first_seen_date, last_seen_date, removed_date, source_sheet, source_row, updated_at")
    .order("is_active", { ascending: false })
    .order("vehicle_plate", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchTdkApprovedRegistryImports(limit = 12) {
  const { data, error } = await supabase
    .from("tdk_approved_registry_imports")
    .select("id, snapshot_date, source_file, total_count, baseline_count, added_count, reactivated_count, removed_count, updated_count, unchanged_count, status, imported_at")
    .order("snapshot_date", { ascending: false })
    .order("imported_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchTdkApprovedRegistryChanges({ from, to } = {}) {
  let query = supabase
    .from("tdk_approved_registry_changes")
    .select("id, import_id, change_date, change_type, plate_key, vehicle_plate, full_name, company_name, before_data, after_data, created_at")
    .order("change_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (from) query = query.gte("change_date", from);
  if (to) query = query.lte("change_date", to);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function manageTdkApprovedRegistry({ action, recordId = null, payload = {}, effectiveDate }) {
  if (!/^(ADD|UPDATE|REMOVE|REACTIVATE)$/.test(String(action || "").toUpperCase())) {
    throw new Error("Invalid TDK APPROVED registry action");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(effectiveDate || ""))) {
    throw new Error("กรุณาระบุวันที่มีผล");
  }

  const { data, error } = await supabase.rpc("manage_tdk_approved_registry", {
    p_action: String(action).toUpperCase(),
    p_record_id: recordId,
    p_payload: payload || {},
    p_effective_date: effectiveDate,
  });
  if (error) throw error;
  return data || {};
}

export function addTdkApprovedRegistryVehicle(payload, effectiveDate) {
  return manageTdkApprovedRegistry({ action: "ADD", payload, effectiveDate });
}

export function updateTdkApprovedRegistryVehicle(recordId, payload, effectiveDate) {
  return manageTdkApprovedRegistry({ action: "UPDATE", recordId, payload, effectiveDate });
}

export function removeTdkApprovedRegistryVehicle(recordId, effectiveDate) {
  return manageTdkApprovedRegistry({ action: "REMOVE", recordId, effectiveDate });
}

export function reactivateTdkApprovedRegistryVehicle(recordId, effectiveDate) {
  return manageTdkApprovedRegistry({ action: "REACTIVATE", recordId, effectiveDate });
}

export async function resetTdkApprovedRegistry() {
  const { data, error } = await supabase.rpc("reset_tdk_approved_registry");
  if (error) throw error;
  return data || {};
}

export function isTdkApprovedRegistrySchemaError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return ["42883", "42703", "42P01", "PGRST202", "PGRST204", "PGRST205"].includes(code)
    || message.includes("tdk_approved_registry")
    || message.includes("sync_tdk_approved_registry")
    || message.includes("manage_tdk_approved_registry")
    || message.includes("reset_tdk_approved_registry");
}
