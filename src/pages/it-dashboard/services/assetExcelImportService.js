import * as XLSX from "xlsx";
import { supabase } from "../../../lib/supabaseClient";

const cleanText = (value) => String(value ?? "").trim();
const normalizeKey = (value) => cleanText(value).toLowerCase();
const normalizeCode = (value) => cleanText(value).toUpperCase().replace(/\s+/g, "");

const STATUS_MAP = new Map([
  ["active", "in_use"],
  ["in use", "in_use"],
  ["in_use", "in_use"],
  ["assigned", "assigned"],
  ["spare", "spare"],
  ["available", "available"],
  ["repair", "repair"],
  ["broken", "broken"],
  ["lost", "lost"],
  ["retired", "retired"],
]);

const normalizeHeader = (value) => cleanText(value)
  .toLowerCase()
  .replace(/[\s/-]+/g, "_")
  .replace(/[^a-z0-9_]/g, "");

function toIsoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86_400_000));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const text = cleanText(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const shortYearMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
  if (shortYearMatch) return `20${shortYearMatch[3]}-${shortYearMatch[2].padStart(2, "0")}-${shortYearMatch[1].padStart(2, "0")}`;
  return "";
}

function extractEmbeddedAssetCode(notes) {
  const match = cleanText(notes).match(/(?:^|\|)\s*Asset\s*Code\s*:\s*([^|]+)/i)
    || cleanText(notes).match(/(?:^|\|)\s*AssetCode\s*:\s*([^|]+)/i);
  return normalizeCode(match?.[1]);
}

function stripEmbeddedAssetCode(notes) {
  return cleanText(notes)
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && !/^Asset\s*Code\s*:/i.test(part) && !/^AssetCode\s*:/i.test(part))
    .join(" | ");
}

function normalizeStatus(value) {
  return STATUS_MAP.get(normalizeKey(value)) || "in_use";
}

function normalizeRecord(record) {
  return Object.fromEntries(Object.entries(record || {}).map(([key, value]) => [normalizeHeader(key), value]));
}

function readRecordField(record, ...names) {
  for (const name of names) {
    const key = normalizeHeader(name);
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return "";
}

async function parseWorkbook(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames?.[0];
  const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;
  if (!worksheet) throw new Error(`ไม่พบ Worksheet ในไฟล์ ${file.name}`);

  const records = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: true }).map(normalizeRecord);
  const firstRecord = records[0] || {};
  if (!Object.prototype.hasOwnProperty.call(firstRecord, "asset_tag") || !Object.prototype.hasOwnProperty.call(firstRecord, "asset_name")) {
    throw new Error(`${file.name}: ต้องมีคอลัมน์ asset_tag และ asset_name`);
  }

  const rows = [];
  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const sourceAssetTag = normalizeCode(readRecordField(record, "asset_tag", "old_asset_tag"));
    const notesRaw = cleanText(readRecordField(record, "notes", "remark"));
    const explicitAssetCode = cleanText(readRecordField(record, "asset_code", "main_asset_code"));
    const embeddedAssetCode = extractEmbeddedAssetCode(notesRaw);
    const sourceIsTemporary = /^(?:PC|NB|MN|MON)-\d+$/i.test(sourceAssetTag);
    const targetAssetCode = normalizeCode(explicitAssetCode || embeddedAssetCode || (sourceIsTemporary ? "" : sourceAssetTag));
    const assetName = cleanText(readRecordField(record, "asset_name", "name"));

    if (!sourceAssetTag && !targetAssetCode && !assetName) return;

    rows.push({
      source_file: file.name,
      source_row: rowNumber,
      source_asset_tag: sourceAssetTag,
      asset_tag: targetAssetCode,
      asset_name: assetName,
      asset_category: cleanText(readRecordField(record, "asset_category", "category")) || "Other",
      brand: cleanText(readRecordField(record, "brand")),
      model: cleanText(readRecordField(record, "model")),
      serial_number: cleanText(readRecordField(record, "serial_number", "serial", "sn")),
      status: normalizeStatus(readRecordField(record, "status")),
      location: cleanText(readRecordField(record, "location")),
      owner_name: cleanText(readRecordField(record, "owner_name", "user_name")),
      purchase_date: toIsoDate(readRecordField(record, "purchase_date")),
      warranty_end_date: toIsoDate(readRecordField(record, "warranty_end_date")),
      notes: stripEmbeddedAssetCode(notesRaw),
    });
  });

  return rows;
}

function buildUniqueSerialMap(existingAssets) {
  const groups = new Map();
  existingAssets.forEach((asset) => {
    const serial = normalizeKey(asset?.serial_number);
    if (!serial) return;
    const group = groups.get(serial) || [];
    group.push(asset);
    groups.set(serial, group);
  });
  return new Map([...groups.entries()].filter(([, assets]) => assets.length === 1).map(([serial, assets]) => [serial, assets[0]]));
}

function addPreview(rows, existingAssets) {
  const assetsByTag = new Map(existingAssets.map((asset) => [normalizeKey(asset?.asset_tag), asset]));
  const assetsByUniqueSerial = buildUniqueSerialMap(existingAssets);
  const targetCounts = new Map();
  rows.forEach((row) => {
    const target = normalizeKey(row.asset_tag);
    if (target) targetCounts.set(target, (targetCounts.get(target) || 0) + 1);
  });

  const previewRows = rows.map((row) => {
    const sourceMatch = assetsByTag.get(normalizeKey(row.source_asset_tag)) || null;
    const targetMatch = assetsByTag.get(normalizeKey(row.asset_tag)) || null;
    const serialMatch = assetsByUniqueSerial.get(normalizeKey(row.serial_number)) || null;
    const matchedAsset = sourceMatch || targetMatch || serialMatch;
    let import_action = "insert";
    let import_error = "";

    if (!row.asset_tag) import_error = "ไม่พบ AssetCode ในไฟล์";
    else if (!row.asset_name) import_error = "ไม่พบชื่ออุปกรณ์";
    else if ((targetCounts.get(normalizeKey(row.asset_tag)) || 0) > 1) import_error = "Asset Code ซ้ำกันในไฟล์ที่เลือก";
    else if (sourceMatch && targetMatch && sourceMatch.id !== targetMatch.id) import_error = `รหัส ${row.asset_tag} ถูกใช้โดยอุปกรณ์รายการอื่นแล้ว`;
    else if (matchedAsset && targetMatch && matchedAsset.id !== targetMatch.id) import_error = `Serial/รหัสเดิมชี้คนละรายการกับ ${row.asset_tag}`;
    else if (matchedAsset) import_action = normalizeKey(matchedAsset.asset_tag) === normalizeKey(row.asset_tag) ? "update" : "code_change";

    return {
      ...row,
      match_asset_id: matchedAsset?.id || null,
      previous_asset_tag: matchedAsset?.asset_tag || "",
      import_action: import_error ? "conflict" : import_action,
      import_error,
    };
  });

  const matchedCounts = new Map();
  previewRows.forEach((row) => {
    if (row.match_asset_id && !row.import_error) {
      matchedCounts.set(row.match_asset_id, (matchedCounts.get(row.match_asset_id) || 0) + 1);
    }
  });

  const finalRows = previewRows.map((row) => (
    row.match_asset_id && (matchedCounts.get(row.match_asset_id) || 0) > 1
      ? { ...row, import_action: "conflict", import_error: "มีมากกว่าหนึ่งแถวจับคู่กับอุปกรณ์เดิมรายการเดียวกัน" }
      : row
  ));

  return {
    rows: finalRows,
    summary: {
      total: finalRows.length,
      codeChange: finalRows.filter((row) => row.import_action === "code_change").length,
      update: finalRows.filter((row) => row.import_action === "update").length,
      insert: finalRows.filter((row) => row.import_action === "insert").length,
      conflict: finalRows.filter((row) => row.import_action === "conflict").length,
    },
  };
}

export async function previewAssetExcelImport({ files, existingAssets = [] }) {
  const selectedFiles = Array.from(files || []);
  if (!selectedFiles.length) throw new Error("กรุณาเลือกไฟล์ Excel อย่างน้อย 1 ไฟล์");

  const parsedGroups = [];
  for (const file of selectedFiles) {
    if (!/\.xlsx$/i.test(file.name)) throw new Error(`${file.name}: รองรับไฟล์ .xlsx เท่านั้น`);
    parsedGroups.push(await parseWorkbook(file));
  }

  return {
    ...addPreview(parsedGroups.flat(), Array.isArray(existingAssets) ? existingAssets : []),
    fileNames: selectedFiles.map((file) => file.name),
  };
}

export function isAssetExcelImportSchemaError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return ["42883", "PGRST202"].includes(code) || message.includes("import_it_assets_from_excel");
}

export async function applyAssetExcelImport(preview) {
  const rows = (preview?.rows || []).filter((row) => row.import_action !== "conflict");
  if (!rows.length) throw new Error("ไม่มีรายการที่พร้อม Import");
  if ((preview?.summary?.conflict || 0) > 0) throw new Error("กรุณาแก้รายการที่ขัดแย้งก่อน Import");

  const payloadRows = rows.map(({ import_action, import_error, previous_asset_tag, ...row }) => row);
  const { data, error } = await supabase.rpc("import_it_assets_from_excel", {
    p_rows: payloadRows,
    p_source_files: preview.fileNames || [],
  });
  if (error) throw error;
  return data || {};
}
