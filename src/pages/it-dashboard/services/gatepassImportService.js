import * as XLSX from "xlsx";
import { supabase } from "../../../lib/supabaseClient";

const MAX_IMPORT_ROWS = 5000;

const FIELD_ALIASES = {
  visit_date: ["visit_date", "date", "visit date", "วันที่", "วันที่เข้า", "วันที่รถเข้า", "วันเดือนปี"],
  entry_datetime: ["entry_datetime", "entry datetime", "date time in", "datetime in", "วันเวลาเข้า", "วันที่เวลาเข้า"],
  entry_time: ["entry_time", "time in", "entry time", "in time", "เวลาเข้า", "เวลาเข้าบริษัท"],
  exit_date: ["exit_date", "exit date", "วันที่ออก", "วันที่รถออก"],
  exit_datetime: ["exit_datetime", "exit datetime", "date time out", "datetime out", "วันเวลาออก", "วันที่เวลาออก"],
  exit_time: ["exit_time", "time out", "exit time", "out time", "เวลาออก", "เวลาออกบริษัท"],
  pass_type: ["pass_type", "gatepass type", "pass type", "type", "group", "group name", "groupname", "ประเภท", "ประเภท gatepass", "ประเภทบัตร"],
  gatepass_number: ["gatepass_number", "gatepass no", "gatepass number", "pass no", "เลข gatepass", "หมายเลข gatepass", "เลขที่บัตร"],
  vehicle_plate: ["vehicle_plate", "vehicle plate", "plate number", "license plate", "ทะเบียนรถ", "เลขทะเบียน", "ทะเบียน"],
  province: ["province", "จังหวัด"],
  vehicle_type: ["vehicle_type", "vehicle type", "ประเภทรถ", "ชนิดรถ"],
  driver_name: ["driver_name", "driver", "driver name", "ชื่อคนขับ", "คนขับ", "ผู้ขับขี่"],
  company_name: ["company_name", "company", "vendor", "supplier", "บริษัท", "ชื่อบริษัท"],
  contact_person: ["contact_person", "contact", "contact name", "contact staff name", "ผู้ติดต่อ", "ผู้ประสานงาน", "ผู้รับรอง"],
  department: ["department", "dept", "แผนก", "ฝ่าย"],
  purpose: ["purpose", "reason", "contact purpose", "วัตถุประสงค์", "เหตุผล", "มาติดต่อเรื่อง"],
  telephone_number: ["telephone_number", "telephone number", "telephone", "phone", "phone number", "เบอร์โทร", "เบอร์โทรศัพท์", "โทรศัพท์"],
  gate_name: ["gate_name", "gate", "gate no", "ประตู", "จุดเข้าออก"],
  approval_reference: ["approval_reference", "approval ref", "approve by", "ผู้อนุมัติ", "เลขอ้างอิงอนุมัติ"],
  notes: ["notes", "remark", "remarks", "note", "หมายเหตุ"],
};

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

function toIsoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const text = cleanText(value);
  if (!text) return "";
  let match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  let year;
  let month;
  let day;
  if (match) {
    [, year, month, day] = match;
  } else {
    match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (!match) return "";
    [, day, month, year] = match;
  }

  year = Number(year);
  month = Number(month);
  day = Number(day);
  if (year > 2400) year -= 543;
  if (year < 100) year += 2000;
  const candidate = new Date(year, month - 1, day);
  if (
    Number.isNaN(candidate.getTime())
    || candidate.getFullYear() !== year
    || candidate.getMonth() !== month - 1
    || candidate.getDate() !== day
  ) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}:${String(value.getSeconds()).padStart(2, "0")}`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const seconds = Math.round((((value % 1) + 1) % 1) * 86400) % 86400;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  const text = cleanText(value);
  if (!text) return "";
  const match = text.match(/^(\d{1,2})[:.](\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  const meridiem = String(match[4] || "").toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59 || seconds > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function toDateTimeParts(value) {
  if (value instanceof Date || (typeof value === "number" && Number.isFinite(value))) {
    return { date: toIsoDate(value), time: toTime(value) };
  }

  const text = cleanText(value);
  if (!text) return { date: "", time: "" };
  const match = text.match(/^(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})[ T]+(\d{1,2}[:.]\d{1,2}(?::\d{1,2})?\s*(?:AM|PM)?)/i);
  if (!match) return { date: toIsoDate(text), time: "" };
  return { date: toIsoDate(match[1]), time: toTime(match[2]) };
}

function isMarked(value) {
  const normalized = cleanText(value).toLowerCase();
  return Boolean(normalized && !["0", "false", "no", "n", "ไม่", "-"].includes(normalized));
}

function normalizePassType(value, rawRow) {
  const normalized = cleanText(value).toLowerCase().replace(/[\s_-]+/g, "");
  if (
    normalized.includes("temporary")
    || normalized.includes("temp")
    || normalized.includes("ชั่วคราว")
    || normalized.includes("supplier")
    || normalized.includes("vendor")
    || normalized.includes("vender")
  ) return "TEMPORARY";
  if (normalized.includes("approved") || normalized.includes("tdk") || normalized.includes("อนุมัติ")) return "TDK_APPROVED";

  const approvedMarker = rawRow.find((cell, index) => canonicalField(rawRow.__headers?.[index]) === "" && normalizeHeader(rawRow.__headers?.[index]) === normalizeHeader("TDK APPROVED") && isMarked(cell));
  const temporaryMarker = rawRow.find((cell, index) => canonicalField(rawRow.__headers?.[index]) === "" && normalizeHeader(rawRow.__headers?.[index]) === normalizeHeader("TEMPORARY") && isMarked(cell));
  if (temporaryMarker !== undefined) return "TEMPORARY";
  if (approvedMarker !== undefined) return "TDK_APPROVED";
  return "UNSPECIFIED";
}

function findHeaderRow(rows) {
  let best = { index: -1, score: 0 };
  rows.slice(0, 20).forEach((row, index) => {
    const fields = new Set(row.map(canonicalField).filter(Boolean));
    const score = fields.size + (fields.has("visit_date") ? 2 : 0) + (fields.has("vehicle_plate") ? 3 : 0);
    if (score > best.score) best = { index, score };
  });
  return best.score >= 4 ? best.index : -1;
}

function buildRecord(row, headers, sourceFile, sourceSheet, sourceRow) {
  const values = {};
  headers.forEach((header, index) => {
    const field = canonicalField(header);
    if (field && values[field] == null) values[field] = row[index];
  });

  const rawRow = [...row];
  rawRow.__headers = headers;
  const entryDateTime = toDateTimeParts(values.entry_datetime);
  const exitDateTime = toDateTimeParts(values.exit_datetime);
  const visitDate = toIsoDate(values.visit_date) || entryDateTime.date;
  const entryTime = toTime(values.entry_time) || entryDateTime.time;
  const exitTime = toTime(values.exit_time) || exitDateTime.time;
  const exitDate = toIsoDate(values.exit_date) || exitDateTime.date || (exitTime ? visitDate : "");
  const passType = normalizePassType(values.pass_type, rawRow);
  const vehiclePlate = cleanText(values.vehicle_plate).toUpperCase().replace(/\s+/g, " ");
  const gatepassNumber = cleanText(values.gatepass_number).toUpperCase();
  const errors = [];

  if (!visitDate) errors.push("วันที่ไม่ถูกต้องหรือไม่ได้ระบุ");
  if (!vehiclePlate) errors.push("ไม่ได้ระบุทะเบียนรถ");
  if ((cleanText(values.entry_time) || cleanText(values.entry_datetime)) && !entryTime) errors.push("เวลาเข้าไม่ถูกต้อง");
  if ((cleanText(values.exit_time) || cleanText(values.exit_datetime)) && !exitTime) errors.push("เวลาออกไม่ถูกต้อง");
  if (entryTime && exitTime && `${exitDate || visitDate}T${exitTime}` < `${visitDate}T${entryTime}`) errors.push("วันเวลาออกต้องไม่น้อยกว่าวันเวลาเข้า");

  const recordKey = gatepassNumber
    ? `GP|${gatepassNumber}`
    : `ROW|${visitDate}|${entryTime}|${vehiclePlate}|${cleanText(values.gate_name).toUpperCase()}`;

  return {
    visit_date: visitDate,
    entry_time: entryTime || null,
    exit_date: exitDate || null,
    exit_time: exitTime || null,
    pass_type: passType,
    source_group_name: cleanText(values.pass_type) || null,
    gatepass_number: gatepassNumber || null,
    vehicle_plate: vehiclePlate,
    province: cleanText(values.province) || null,
    vehicle_type: cleanText(values.vehicle_type) || null,
    driver_name: cleanText(values.driver_name) || null,
    company_name: cleanText(values.company_name) || null,
    contact_person: cleanText(values.contact_person) || null,
    department: cleanText(values.department) || null,
    purpose: cleanText(values.purpose) || null,
    telephone_number: cleanText(values.telephone_number) || null,
    gate_name: cleanText(values.gate_name) || null,
    approval_reference: cleanText(values.approval_reference) || null,
    notes: cleanText(values.notes) || null,
    source_file: sourceFile,
    source_sheet: sourceSheet,
    source_row: sourceRow,
    record_key: recordKey,
    import_errors: errors,
  };
}

export async function previewGatepassExcelImport(file) {
  if (!file) throw new Error("กรุณาเลือกไฟล์ Excel");
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error("รองรับไฟล์ .xlsx, .xls และ .csv เท่านั้น");

  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true, raw: true });
  const selectedSheets = [];
  for (const sheetName of workbook.SheetNames || []) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: true, blankrows: true });
    const headerIndex = findHeaderRow(rows);
    if (headerIndex >= 0) {
      const headers = rows[headerIndex].map(cleanText);
      const sheetRecords = rows
        .slice(headerIndex + 1)
        .map((row, index) => ({ row, sourceRow: headerIndex + index + 2 }))
        .filter(({ row }) => row.some((value) => cleanText(value)))
        .map(({ row, sourceRow }) => buildRecord(row, headers, file.name, sheetName, sourceRow));
      if (sheetRecords.length) selectedSheets.push({ sheetName, records: sheetRecords });
    }
  }
  if (!selectedSheets.length) throw new Error("ไม่พบหัวตาราง Gatepass กรุณาใช้ไฟล์ต้นแบบหรือตรวจชื่อคอลัมน์");

  let records = selectedSheets.flatMap((sheet) => sheet.records);

  if (!records.length) throw new Error("ไฟล์นี้ไม่มีรายการ Gatepass สำหรับนำเข้า");
  if (records.length > MAX_IMPORT_ROWS) throw new Error(`ไฟล์มีมากกว่า ${MAX_IMPORT_ROWS.toLocaleString("th-TH")} รายการ กรุณาแบ่งไฟล์ก่อนนำเข้า`);

  const duplicateCounts = records.reduce((map, row) => map.set(row.record_key, (map.get(row.record_key) || 0) + 1), new Map());
  records = records.map((row) => (
    (duplicateCounts.get(row.record_key) || 0) > 1
      ? { ...row, import_errors: [...row.import_errors, "รายการซ้ำกันภายในไฟล์"] }
      : row
  ));

  const validRows = records.filter((row) => row.import_errors.length === 0);
  const dates = validRows.map((row) => row.visit_date).filter(Boolean).sort();
  return {
    fileName: file.name,
    sheetName: selectedSheets.length === 1 ? selectedSheets[0].sheetName : `${selectedSheets.length} sheets`,
    sheetCount: selectedSheets.length,
    rows: records,
    summary: {
      total: records.length,
      ready: validRows.length,
      invalid: records.length - validRows.length,
      approved: validRows.filter((row) => row.pass_type === "TDK_APPROVED").length,
      temporary: validRows.filter((row) => row.pass_type === "TEMPORARY").length,
      unspecified: validRows.filter((row) => row.pass_type === "UNSPECIFIED").length,
      dateFrom: dates[0] || "",
      dateTo: dates[dates.length - 1] || "",
    },
  };
}

export async function applyGatepassExcelImport(preview) {
  if (!preview?.rows?.length) throw new Error("ยังไม่มีข้อมูลสำหรับนำเข้า");
  if (preview.summary?.invalid > 0) throw new Error("กรุณาแก้รายการที่ไม่ถูกต้องก่อนนำเข้า");

  const rows = preview.rows.map(({ import_errors, record_key, ...row }) => row);
  const { data, error } = await supabase.rpc("import_gatepass_vehicle_records", {
    p_rows: rows,
    p_source_file: preview.fileName || null,
  });
  if (error) throw error;
  return data || {};
}

export function isGatepassImportSchemaError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return ["42883", "42703", "PGRST202", "PGRST204", "42P01", "PGRST205"].includes(code)
    || message.includes("import_gatepass_vehicle_records")
    || message.includes("gatepass_import_batches");
}

export async function fetchGatepassImportBatches(limit = 12) {
  const { data, error } = await supabase
    .from("gatepass_import_batches")
    .select("id, source_file, record_count, inserted_count, updated_count, date_from, date_to, imported_at, status")
    .order("imported_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export function downloadGatepassImportTemplate() {
  const headers = [
    "วันที่", "เวลาเข้า", "วันที่ออก", "เวลาออก", "ประเภท Gatepass", "เลข Gatepass", "ทะเบียนรถ", "จังหวัด",
    "ประเภทรถ", "ชื่อคนขับ", "บริษัท", "ผู้ติดต่อ", "แผนก", "วัตถุประสงค์", "เบอร์โทรศัพท์", "ประตู", "ผู้อนุมัติ", "หมายเหตุ",
  ];
  const dataSheet = XLSX.utils.aoa_to_sheet([headers]);
  dataSheet["!cols"] = headers.map((header) => ({ wch: Math.max(14, header.length + 4) }));
  const guideSheet = XLSX.utils.aoa_to_sheet([
    ["Gatepass Import Guide"],
    ["Required fields", "วันที่ และทะเบียนรถ"],
    ["Pass types", "TDK APPROVED, TEMPORARY หรือเว้นว่างเป็น UNSPECIFIED"],
    ["Date format", "DD/MM/YYYY หรือ YYYY-MM-DD"],
    ["Time format", "HH:mm เช่น 08:30"],
    ["System export", "รองรับ DateTime IN / DateTime OUT, GroupName และหลายชีตในไฟล์เดียว"],
    ["Duplicate handling", "เลข Gatepass เดิมจะอัปเดตรายการเดิม ไม่สร้างรายการซ้ำ"],
  ]);
  guideSheet["!cols"] = [{ wch: 24 }, { wch: 72 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Gatepass Data");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Guide");
  XLSX.writeFile(workbook, "gatepass-import-template.xlsx", { compression: true });
}
