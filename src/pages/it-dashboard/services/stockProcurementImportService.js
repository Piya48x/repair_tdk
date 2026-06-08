import ExcelJS from "exceljs";
import { supabase } from "../../../lib/supabaseClient";
import { IT_STOCK_CATALOG, IT_STOCK_CATEGORY_OPTIONS, findStockCatalogItem } from "../constants/stockCatalog";

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

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}./ -]/gu, "");
}

function sanitizeCodeSegment(value, fallback = "IMPORT") {
  const cleaned = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

function readCellText(worksheet, rowNumber, columnNumber) {
  const cell = worksheet.getRow(rowNumber).getCell(columnNumber);
  if (cell?.text) return normalizeText(cell.text);
  return normalizeText(cell?.value);
}

function findCategoryOption(categoryTh) {
  const normalized = normalizeKey(categoryTh);
  return (
    IT_STOCK_CATEGORY_OPTIONS.find((option) => normalizeKey(option.categoryTh) === normalized) ||
    IT_STOCK_CATEGORY_OPTIONS.find((option) => normalized.includes(normalizeKey(option.categoryTh))) ||
    null
  );
}

function guessCatalogItem({ categoryTh, itemDescription, brandModel, unit, deviceId }) {
  const categoryOption = findCategoryOption(categoryTh);
  const haystack = normalizeKey([itemDescription, brandModel, unit, deviceId].filter(Boolean).join(" "));

  const manualMatches = [
    { pattern: /usb\s*hub|hub usb|otn-5220|gl029/, code: "IT-UB-001" },
    { pattern: /hdmi/, code: null },
    { pattern: /dock/, code: "IT-DC-001" },
    { pattern: /webcam|กล้องเว็บแคม/, code: "IT-WC-001" },
    { pattern: /keyboard|คีย์บอร์ด/, code: "IT-KB-001" },
    { pattern: /mouse|เมาส์/, code: "IT-MS-001" },
    { pattern: /monitor|จอภาพ/, code: "IT-MN-001" },
    { pattern: /printer|เครื่องพิมพ์/, code: "IT-PR-001" },
    { pattern: /charger|charging cable|adapter|adaptor|สายชาจ|สายชาร์จ/, code: "IT-BS-001" },
    { pattern: /lan cable|สายแลน/, code: "IT-MC-001" },
  ];

  const manual = manualMatches.find((entry) => entry.pattern.test(haystack));
  if (manual?.code) {
    return findStockCatalogItem(manual.code);
  }

  const candidates = categoryOption
    ? IT_STOCK_CATALOG.filter((item) => item.categoryKey === categoryOption.key)
    : IT_STOCK_CATALOG;

  let bestMatch = null;
  let bestScore = 0;
  candidates.forEach((item) => {
    const tokens = [
      item.descriptionTh,
      item.descriptionEn,
      item.prefix,
      item.referenceCode,
    ]
      .map(normalizeKey)
      .filter(Boolean);

    let score = 0;
    tokens.forEach((token) => {
      if (token && haystack.includes(token)) score += token.length;
    });

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  });

  if (bestMatch && bestScore >= 4) return bestMatch;
  return null;
}

function buildFallbackCatalog({ categoryTh, itemDescription, unit, deviceId, rowNo }) {
  const categoryOption = findCategoryOption(categoryTh);
  const basePrefix = sanitizeCodeSegment(deviceId || `ROW${rowNo}`, "ITEM");
  const prefix = `IMP-${basePrefix.slice(0, 8)}`;
  return {
    categoryTh: categoryOption?.categoryTh || categoryTh || "นำเข้า",
    categoryEn: categoryOption?.categoryEn || "Imported",
    prefix,
    referenceCode: `${prefix}-${String(rowNo).padStart(3, "0")}`,
    descriptionTh: itemDescription || "นำเข้าจากฟอร์มจัดซื้อ",
    descriptionEn: itemDescription || "Imported from procurement form",
    unit: normalizeText(unit) || "ชิ้น",
  };
}

function buildStockPayload({ catalogItem, rowData, meta, fileName, currentUser }) {
  const rowNo = normalizeInteger(rowData.no, 0) || rowData.rowNumber;
  const lotNumber = `${sanitizeCodeSegment(meta.docNo || fileName)}-${String(rowNo).padStart(2, "0")}`;
  const stockCode = `${lotNumber}-${sanitizeCodeSegment(rowData.deviceId || "ITEM")}`;
  const detailParts = [
    meta.docNo ? `Doc No: ${meta.docNo}` : "",
    meta.docDate ? `Date: ${meta.docDate}` : "",
    meta.requestedBy ? `Requested by: ${meta.requestedBy}` : "",
    rowData.purpose ? `Purpose: ${rowData.purpose}` : "",
    rowData.remark ? `Remark: ${rowData.remark}` : "",
    rowData.link ? `Link: ${rowData.link}` : "",
    `Imported from file: ${fileName}`,
  ].filter(Boolean);

  return {
    stock_code: stockCode,
    item_name: rowData.itemDescription,
    item_category: catalogItem.categoryEn,
    category_th: catalogItem.categoryTh,
    category_en: catalogItem.categoryEn,
    item_prefix: catalogItem.prefix,
    reference_item_code: catalogItem.referenceCode,
    description_th: catalogItem.descriptionTh,
    description_en: catalogItem.descriptionEn,
    brand: normalizeOptionalText(rowData.brandModel),
    model: null,
    unit: normalizeText(rowData.unit) || catalogItem.unit || "ชิ้น",
    quantity_on_hand: normalizeInteger(rowData.qty, 0),
    minimum_quantity: 0,
    location: null,
    source_ref: normalizeOptionalText(meta.docNo || fileName),
    lot_number: lotNumber,
    notes: normalizeOptionalText(detailParts.join(" | ")),
    created_by: currentUser?.id || undefined,
  };
}

function extractProcurementRows(worksheet) {
  const rows = [];

  for (let rowNumber = 9; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const firstCell = readCellText(worksheet, rowNumber, 1);
    if (!firstCell) continue;
    if (/(subtotal|vat|grand total|รวม|ภาษี|ยอดรวม)/i.test(firstCell)) break;
    if (!/^\d+$/.test(firstCell)) continue;

    const rowData = {
      rowNumber,
      no: firstCell,
      deviceId: readCellText(worksheet, rowNumber, 2),
      categoryTh: readCellText(worksheet, rowNumber, 3),
      itemDescription: readCellText(worksheet, rowNumber, 4),
      brandModel: readCellText(worksheet, rowNumber, 5),
      unit: readCellText(worksheet, rowNumber, 6),
      qty: readCellText(worksheet, rowNumber, 7),
      purpose: readCellText(worksheet, rowNumber, 10),
      remark: readCellText(worksheet, rowNumber, 11),
      link: readCellText(worksheet, rowNumber, 12),
    };

    if (!rowData.itemDescription || normalizeInteger(rowData.qty, 0) <= 0) continue;
    rows.push(rowData);
  }

  return rows;
}

export async function importStockFromProcurementWorkbook({ file, currentUser }) {
  if (!(file instanceof File)) {
    throw new Error("กรุณาเลือกไฟล์ Excel ก่อนนำเข้า");
  }

  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("ไม่พบ worksheet ในไฟล์ที่เลือก");
  }

  const meta = {
    docNo: readCellText(worksheet, 4, 4),
    docDate: readCellText(worksheet, 5, 4),
    requestedBy: readCellText(worksheet, 6, 4),
  };
  const procurementRows = extractProcurementRows(worksheet);
  if (procurementRows.length === 0) {
    throw new Error("ไม่พบรายการอุปกรณ์ในฟอร์มจัดซื้อ");
  }

  const mappedRows = procurementRows.map((rowData) => {
    const catalogItem =
      guessCatalogItem(rowData) ||
      buildFallbackCatalog({ categoryTh: rowData.categoryTh, itemDescription: rowData.itemDescription, unit: rowData.unit, deviceId: rowData.deviceId, rowNo: normalizeInteger(rowData.no, rowData.rowNumber) });
    return {
      payload: buildStockPayload({ catalogItem, rowData, meta, fileName: file.name, currentUser }),
      fallbackUsed: !findStockCatalogItem(catalogItem.referenceCode),
    };
  });

  const stockCodes = mappedRows.map((row) => row.payload.stock_code);
  const { data: existingRows, error: existingError } = await supabase
    .from("it_stock_items")
    .select("stock_code")
    .in("stock_code", stockCodes);

  if (existingError) throw existingError;

  const existingStockCodes = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => normalizeText(row?.stock_code).toUpperCase()));
  const newRows = mappedRows.filter((row) => !existingStockCodes.has(normalizeText(row.payload.stock_code).toUpperCase()));
  const skippedRows = mappedRows.filter((row) => existingStockCodes.has(normalizeText(row.payload.stock_code).toUpperCase()));

  if (newRows.length === 0) {
    return {
      importedRows: [],
      skippedCount: skippedRows.length,
      fallbackCount: mappedRows.filter((row) => row.fallbackUsed).length,
      docNo: meta.docNo,
    };
  }

  const { data, error } = await supabase
    .from("it_stock_items")
    .insert(newRows.map((row) => row.payload))
    .select("*");

  if (error) throw error;

  return {
    importedRows: Array.isArray(data) ? data : [],
    skippedCount: skippedRows.length,
    fallbackCount: newRows.filter((row) => row.fallbackUsed).length,
    docNo: meta.docNo,
  };
}
