import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const COPY = {
  th: {
    sheetName: "ประวัติการเบิก",
    title: "รายงานสรุปการเบิกอุปกรณ์ IT",
    generated: "ออกรายงาน",
    generatedBy: "ผู้จัดทำ",
    scope: "ขอบเขต",
    allRecords: "ประวัติการเบิกทั้งหมด",
    filteredRecords: "ข้อมูลตามตัวกรองปัจจุบัน",
    selectedItem: "เฉพาะอุปกรณ์",
    metrics: ["รายการเบิก", "จำนวนที่เบิกรวม", "ผู้เบิก", "อุปกรณ์"],
    headers: ["ลำดับ", "รูปอุปกรณ์", "รูปหลักฐาน", "รหัส Stock", "อุปกรณ์", "รายละเอียดอุปกรณ์", "ผู้เบิก", "รหัสพนักงาน", "แผนก", "จำนวน", "หน่วย", "วันที่เบิก", "วัตถุประสงค์", "ผู้บันทึก"],
    noImage: "ไม่มีรูป",
    imageUnavailable: "โหลดรูปไม่ได้",
    moreImages: (count) => `อีก ${count} รูป`,
    filePrefix: "รายงานการเบิกอุปกรณ์",
  },
  en: {
    sheetName: "Issue History",
    title: "IT Equipment Issue Summary",
    generated: "Generated at",
    generatedBy: "Prepared by",
    scope: "Scope",
    allRecords: "All issue history",
    filteredRecords: "Current filtered records",
    selectedItem: "Selected equipment",
    metrics: ["Issue records", "Total quantity", "Requesters", "Equipment items"],
    headers: ["No.", "Device Image", "Evidence Images", "Stock Code", "Equipment", "Equipment Details", "Requester", "Employee ID", "Department", "Quantity", "Unit", "Issued At", "Purpose", "Recorded By"],
    noImage: "No image",
    imageUnavailable: "Image unavailable",
    moreImages: (count) => `${count} more`,
    filePrefix: "equipment-issue-report",
  },
};

const safeText = (value, fallback = "-") => String(value || "").trim() || fallback;
const MAX_EVIDENCE_IMAGES = 3;
const MAX_SOURCE_DIMENSION = 900;

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(reader.error || new Error("Unable to read image"));
  reader.readAsDataURL(blob);
});

const canvasToBlob = (canvas, type = "image/jpeg", quality = 0.82) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Unable to convert image"));
  }, type, quality);
});

async function decodeImageBlob(blob) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      return createImageBitmap(blob);
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Unable to decode image"));
      element.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadEmbeddedImage(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "force-cache", credentials: "omit" });
    if (!response.ok) throw new Error(`Image request failed (${response.status})`);
    const sourceBlob = await response.blob();
    if (!String(sourceBlob.type || "").toLowerCase().startsWith("image/")) {
      throw new Error("Attachment is not an image");
    }

    const decoded = await decodeImageBlob(sourceBlob);
    const sourceWidth = Number(decoded.width || decoded.naturalWidth || 0);
    const sourceHeight = Number(decoded.height || decoded.naturalHeight || 0);
    if (!sourceWidth || !sourceHeight) throw new Error("Invalid image dimensions");

    const scale = Math.min(1, MAX_SOURCE_DIMENSION / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, width, height);
    context.drawImage(decoded, 0, 0, width, height);
    if (typeof decoded.close === "function") decoded.close();

    const optimizedBlob = await canvasToBlob(canvas);
    return {
      dataUrl: await blobToDataUrl(optimizedBlob),
      extension: "jpeg",
      width,
      height,
    };
  } catch (error) {
    console.warn("Unable to embed report image:", url, error);
    return null;
  }
}

async function loadImagesWithConcurrency(urls, concurrency = 5) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  const results = new Map();
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, uniqueUrls.length) }, async () => {
    while (cursor < uniqueUrls.length) {
      const index = cursor;
      cursor += 1;
      const url = uniqueUrls[index];
      results.set(url, await loadEmbeddedImage(url));
    }
  });
  await Promise.all(workers);
  return results;
}

function fitImage(asset, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / asset.width, maxHeight / asset.height);
  return {
    width: Math.max(1, Math.round(asset.width * scale)),
    height: Math.max(1, Math.round(asset.height * scale)),
  };
}

function placeEmbeddedImage({ workbook, worksheet, asset, rowNumber, columnNumber, maxWidth, maxHeight, columnOffset = 0.08 }) {
  if (!asset) return false;
  if (asset.imageId == null) {
    asset.imageId = workbook.addImage({ base64: asset.dataUrl, extension: asset.extension });
  }
  const size = fitImage(asset, maxWidth, maxHeight);
  worksheet.addImage(asset.imageId, {
    tl: { col: columnNumber - 1 + columnOffset, row: rowNumber - 1 + 0.1 },
    ext: size,
    editAs: "oneCell",
  });
  return true;
}

export async function exportStockIssueReport({ rows = [], language = "th", currentUser = null, selectedItemName = "", hasActiveFilter = false } = {}) {
  const copy = COPY[language] || COPY.th;
  const locale = language === "en" ? "en-GB" : "th-TH";
  const safeRows = Array.isArray(rows) ? rows : [];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = currentUser?.name || "IT Service Hub";
  workbook.lastModifiedBy = currentUser?.name || "IT Service Hub";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(copy.sheetName, {
    views: [{ state: "frozen", xSplit: 4, ySplit: 8, showGridLines: false, zoomScale: 80 }],
    properties: { defaultRowHeight: 20 },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 } },
  });

  worksheet.properties.tabColor = { argb: "1E3A8A" };
  worksheet.headerFooter.oddFooter = language === "en" ? "Page &P of &N" : "หน้า &P จาก &N";
  worksheet.pageSetup.printTitlesRow = "1:8";

  const columns = [7, 17, 27, 16, 28, 27, 24, 16, 20, 11, 12, 22, 32, 22];
  worksheet.columns = columns.map((width) => ({ width }));
  worksheet.mergeCells("A2:N2");
  worksheet.getCell("A2").value = copy.title;
  worksheet.getCell("A2").font = { name: "Arial", size: 16, bold: true, color: { argb: "0F172A" } };
  worksheet.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(2).height = 27;

  const scopeText = selectedItemName
    ? `${copy.selectedItem}: ${selectedItemName}`
    : hasActiveFilter
      ? copy.filteredRecords
      : copy.allRecords;
  worksheet.mergeCells("A3:N3");
  worksheet.getCell("A3").value = `${copy.generated}: ${new Date().toLocaleString(locale)}    ${copy.generatedBy}: ${currentUser?.name || "IT Service Hub"}    ${copy.scope}: ${scopeText}`;
  worksheet.getCell("A3").font = { name: "Arial", size: 10, italic: true, color: { argb: "64748B" } };
  worksheet.getCell("A3").alignment = { vertical: "middle", horizontal: "left" };
  worksheet.mergeCells("A4:N4");
  worksheet.getCell("A4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E3A8A" } };
  worksheet.getRow(4).height = 3;

  const totalQuantity = safeRows.reduce((sum, row) => sum + Number(row?.quantity || 0), 0);
  const requesterCount = new Set(safeRows.map((row) => safeText(row?.requesterKey, "")).filter(Boolean)).size;
  const itemCount = new Set(safeRows.map((row) => safeText(row?.stockItemId, "")).filter(Boolean)).size;
  const metricValues = [safeRows.length, totalQuantity, requesterCount, itemCount];
  const metricRanges = [["A5:C5", "A6:C6"], ["D5:F5", "D6:F6"], ["G5:I5", "G6:I6"], ["J5:N5", "J6:N6"]];
  metricRanges.forEach(([labelRange, valueRange], index) => {
    worksheet.mergeCells(labelRange);
    worksheet.mergeCells(valueRange);
    const labelCell = worksheet.getCell(labelRange.split(":")[0]);
    const valueCell = worksheet.getCell(valueRange.split(":")[0]);
    labelCell.value = copy.metrics[index];
    valueCell.value = metricValues[index];
    labelCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "475569" } };
    valueCell.font = { name: "Arial", size: 15, bold: true, color: { argb: "1D4ED8" } };
    labelCell.alignment = valueCell.alignment = { vertical: "middle", horizontal: "center" };
    labelCell.fill = valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 === 0 ? "EFF6FF" : "F5F3FF" } };
    labelCell.border = valueCell.border = { bottom: { style: "thin", color: { argb: "CBD5E1" } } };
  });
  worksheet.getRow(5).height = 21;
  worksheet.getRow(6).height = 28;

  const headerRow = worksheet.getRow(8);
  headerRow.values = copy.headers;
  headerRow.height = 31;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E3A8A" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "CBD5E1" } } };
  });

  const imageUrls = safeRows.flatMap((row) => [
    row?.deviceImageUrl,
    ...(Array.isArray(row?.evidenceUrls) ? row.evidenceUrls.slice(0, MAX_EVIDENCE_IMAGES) : []),
  ]).filter(Boolean);
  const imageAssets = await loadImagesWithConcurrency(imageUrls);

  safeRows.forEach((row, index) => {
    const issuedAt = row?.issuedAt ? new Date(row.issuedAt) : null;
    const validIssuedAt = issuedAt && !Number.isNaN(issuedAt.getTime()) ? issuedAt : "-";
    const evidenceUrls = Array.isArray(row?.evidenceUrls) ? row.evidenceUrls.filter(Boolean) : [];
    const deviceAsset = imageAssets.get(row?.deviceImageUrl) || null;
    const evidenceAssets = evidenceUrls.slice(0, MAX_EVIDENCE_IMAGES).map((url) => imageAssets.get(url)).filter(Boolean);
    const excelRow = worksheet.addRow([
      index + 1,
      deviceAsset ? "" : (row?.deviceImageUrl ? copy.imageUnavailable : copy.noImage),
      evidenceAssets.length > 0
        ? (evidenceUrls.length > MAX_EVIDENCE_IMAGES ? copy.moreImages(evidenceUrls.length - MAX_EVIDENCE_IMAGES) : "")
        : (evidenceUrls.length > 0 ? copy.imageUnavailable : copy.noImage),
      safeText(row?.stockCode),
      safeText(row?.itemName),
      safeText(row?.itemDetails),
      safeText(row?.requesterName),
      safeText(row?.requesterEmpId),
      safeText(row?.requesterDepartment),
      Number(row?.quantity || 0),
      safeText(row?.unit),
      validIssuedAt,
      safeText(row?.purpose),
      safeText(row?.issuedByName),
    ]);
    excelRow.height = 88;
    excelRow.eachCell((cell, columnNumber) => {
      cell.font = { name: "Arial", size: 10, color: { argb: "334155" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 === 0 ? "FFFFFF" : "F8FAFC" } };
      cell.alignment = { vertical: "middle", horizontal: [1, 2, 3, 10, 11].includes(columnNumber) ? "center" : "left", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "E2E8F0" } } };
    });
    excelRow.getCell(10).numFmt = "#,##0";
    if (validIssuedAt instanceof Date) excelRow.getCell(12).numFmt = "dd mmm yyyy hh:mm";

    if (deviceAsset) {
      placeEmbeddedImage({ workbook, worksheet, asset: deviceAsset, rowNumber: excelRow.number, columnNumber: 2, maxWidth: 92, maxHeight: 96, columnOffset: 0.13 });
    }
    evidenceAssets.forEach((asset, imageIndex) => {
      placeEmbeddedImage({
        workbook,
        worksheet,
        asset,
        rowNumber: excelRow.number,
        columnNumber: 3,
        maxWidth: 54,
        maxHeight: 79,
        columnOffset: 0.04 + imageIndex * 0.31,
      });
    });
    if (evidenceUrls.length > MAX_EVIDENCE_IMAGES && evidenceAssets.length > 0) {
      excelRow.getCell(3).alignment = { vertical: "bottom", horizontal: "right", wrapText: false };
      excelRow.getCell(3).font = { name: "Arial", size: 9, italic: true, color: { argb: "64748B" } };
    }
  });

  worksheet.autoFilter = { from: { row: 8, column: 1 }, to: { row: Math.max(8, 8 + safeRows.length), column: 14 } };
  worksheet.getColumn(10).numFmt = "#,##0";
  worksheet.getColumn(12).numFmt = "dd mmm yyyy hh:mm";

  const fileStamp = new Date().toISOString().slice(0, 10);
  const languageSuffix = language === "en" ? "en" : "th";
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${copy.filePrefix}-${languageSuffix}-${fileStamp}.xlsx`);
}
