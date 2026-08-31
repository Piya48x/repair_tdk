const COLORS = {
  navy: "FF173B80",
  blue: "FF2B59B0",
  cyan: "FF0891B2",
  emerald: "FF059669",
  amber: "FFD97706",
  rose: "FFE11D48",
  slate900: "FF0F172A",
  slate700: "FF334155",
  slate600: "FF475569",
  slate500: "FF64748B",
  slate300: "FFCBD5E1",
  slate200: "FFE2E8F0",
  slate100: "FFF1F5F9",
  blue100: "FFDBEAFE",
  blue50: "FFEFF6FF",
  cyan50: "FFECFEFF",
  emerald50: "FFECFDF5",
  amber50: "FFFFFBEB",
  rose50: "FFFFF1F2",
  white: "FFFFFFFF",
};

const COPY = {
  th: {
    overviewSheet: "Overview",
    registerSheet: "Asset Register",
    title: "IT ASSET REGISTRY OVERVIEW",
    subtitle: "ภาพรวมทะเบียนสินทรัพย์เทคโนโลยีสารสนเทศ",
    generatedAt: "วันที่จัดทำ",
    preparedBy: "จัดทำโดย",
    exportScope: "ขอบเขตข้อมูล",
    filteredScope: "ข้อมูลตามตัวกรองปัจจุบัน",
    selectedScope: "เฉพาะรายการที่เลือก",
    totalAssets: "สินทรัพย์ทั้งหมด",
    operational: "พร้อมใช้งาน",
    needsAttention: "ต้องตรวจสอบ",
    assigned: "มีผู้รับผิดชอบ",
    categoryOverview: "สรุปตามหมวดหมู่",
    statusOverview: "สรุปตามสถานะ",
    dataQuality: "ภาพรวมคุณภาพข้อมูล",
    exportContext: "เงื่อนไขการส่งออก",
    category: "หมวดหมู่",
    status: "สถานะ",
    records: "จำนวน",
    share: "สัดส่วน",
    checkItem: "รายการตรวจสอบ",
    complete: "ครบถ้วน",
    missing: "ข้อมูลขาด",
    completeness: "ความครบถ้วน",
    serialNumber: "Serial Number",
    owner: "ผู้ใช้งาน/ผู้รับผิดชอบ",
    location: "สถานที่ติดตั้ง",
    purchaseDate: "วันที่ซื้อ",
    warrantyEnd: "วันสิ้นสุดประกัน",
    evidence: "รูปหลักฐาน",
    search: "คำค้นหา",
    categoryFilter: "ตัวกรองหมวดหมู่",
    statusFilter: "ตัวกรองสถานะ",
    archiveFilter: "รวมรายการจัดเก็บ",
    yes: "ใช่",
    no: "ไม่",
    all: "ทั้งหมด",
    none: "ไม่มี",
    registerTitle: "IT ASSET REGISTER / ทะเบียนสินทรัพย์ IT",
    registerSubtitle: "ข้อมูลต้นทางสำหรับติดตาม ตรวจสอบ และบริหารวงจรชีวิตอุปกรณ์",
    warrantyValid: "อยู่ในประกัน",
    warrantyExpired: "หมดประกัน",
    warrantyUnknown: "ไม่ระบุ",
    columns: [
      "ลำดับ",
      "Asset Code",
      "ชื่ออุปกรณ์",
      "หมวดหมู่",
      "ยี่ห้อ",
      "รุ่น",
      "Serial Number",
      "สถานะ",
      "ผู้ใช้งาน/ผู้รับผิดชอบ",
      "สถานที่ติดตั้ง",
      "วันที่ซื้อ",
      "สิ้นสุดประกัน",
      "สถานะประกัน",
      "รูปหลักฐาน",
      "หมายเหตุ",
      "อัปเดตล่าสุด",
      "Status Code",
    ],
  },
  en: {
    overviewSheet: "Overview",
    registerSheet: "Asset Register",
    title: "IT ASSET REGISTRY OVERVIEW",
    subtitle: "Standardized inventory overview and control report",
    generatedAt: "Generated at",
    preparedBy: "Prepared by",
    exportScope: "Export scope",
    filteredScope: "Current filtered records",
    selectedScope: "Selected records only",
    totalAssets: "Total assets",
    operational: "Operational",
    needsAttention: "Needs attention",
    assigned: "Assigned owner",
    categoryOverview: "Category overview",
    statusOverview: "Status overview",
    dataQuality: "Data quality overview",
    exportContext: "Export context",
    category: "Category",
    status: "Status",
    records: "Records",
    share: "Share",
    checkItem: "Quality check",
    complete: "Complete",
    missing: "Missing",
    completeness: "Completeness",
    serialNumber: "Serial number",
    owner: "Owner",
    location: "Location",
    purchaseDate: "Purchase date",
    warrantyEnd: "Warranty end",
    evidence: "Evidence photos",
    search: "Search query",
    categoryFilter: "Category filter",
    statusFilter: "Status filter",
    archiveFilter: "Include archived",
    yes: "Yes",
    no: "No",
    all: "All",
    none: "None",
    registerTitle: "IT ASSET REGISTER",
    registerSubtitle: "Source register for asset control, audit, and lifecycle management",
    warrantyValid: "Valid",
    warrantyExpired: "Expired",
    warrantyUnknown: "Not specified",
    columns: [
      "No.",
      "Asset Code",
      "Asset Name",
      "Category",
      "Brand",
      "Model",
      "Serial Number",
      "Status",
      "Owner",
      "Location",
      "Purchase Date",
      "Warranty End",
      "Warranty Status",
      "Evidence Photos",
      "Notes",
      "Last Updated",
      "Status Code",
    ],
  },
};

const ISSUE_STATUSES = new Set(["broken", "repair", "retired", "lost"]);

function asText(value) {
  return String(value ?? "").trim();
}

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = asText(value);
  if (!text) return null;
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const parsed = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function excelText(value) {
  return asText(value).replace(/"/g, '""');
}

function safeFilePart(value) {
  return asText(value)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "it-assets";
}

function getTimestamp(now) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function columnNumber(columnLetters) {
  return [...columnLetters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0);
}

function parseCellAddress(address) {
  const match = asText(address).toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid Excel cell address: ${address}`);
  return { row: Number(match[2]), column: columnNumber(match[1]) };
}

function setBorder(sheet, rangeAddress, color = COLORS.slate200) {
  const [fromAddress, toAddress = fromAddress] = rangeAddress.split(":");
  const from = parseCellAddress(fromAddress);
  const to = parseCellAddress(toAddress);
  for (let row = from.row; row <= to.row; row += 1) {
    for (let column = from.column; column <= to.column; column += 1) {
      sheet.getCell(row, column).border = {
        top: { style: "thin", color: { argb: color } },
        left: { style: "thin", color: { argb: color } },
        bottom: { style: "thin", color: { argb: color } },
        right: { style: "thin", color: { argb: color } },
      };
    }
  }
}

function styleSectionHeader(sheet, rangeAddress, title) {
  const range = sheet.getCell(rangeAddress.split(":")[0]);
  sheet.mergeCells(rangeAddress);
  range.value = title;
  range.font = { name: "Aptos Display", size: 11, bold: true, color: { argb: COLORS.white } };
  range.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  range.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(range.row).height = 25;
}

function styleTableHeader(row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "medium", color: { argb: COLORS.navy } },
    };
  });
}

function statusStyle(statusCode) {
  if (["in_use", "assigned", "available", "spare"].includes(statusCode)) {
    return { fill: COLORS.emerald50, font: COLORS.emerald };
  }
  if (statusCode === "repair") return { fill: COLORS.amber50, font: COLORS.amber };
  if (["broken", "retired", "lost"].includes(statusCode)) {
    return { fill: COLORS.rose50, font: COLORS.rose };
  }
  return { fill: COLORS.slate100, font: COLORS.slate600 };
}

function applyKpiCard(sheet, rangeAddress, label, formula, result, color) {
  const [from, to] = rangeAddress.split(":");
  const fromCell = sheet.getCell(from);
  const toCell = sheet.getCell(to);
  sheet.mergeCells(fromCell.row, fromCell.col, fromCell.row, toCell.col);
  sheet.mergeCells(fromCell.row + 1, fromCell.col, toCell.row, toCell.col);

  const labelCell = sheet.getCell(fromCell.row, fromCell.col);
  labelCell.value = label;
  labelCell.font = { name: "Aptos", size: 10, bold: true, color: { argb: color } };
  labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate100 } };
  labelCell.alignment = { horizontal: "left", vertical: "middle" };

  const valueCell = sheet.getCell(fromCell.row + 1, fromCell.col);
  valueCell.value = { formula, result };
  valueCell.numFmt = "#,##0";
  valueCell.font = { name: "Aptos Display", size: 24, bold: true, color: { argb: color } };
  valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.white } };
  valueCell.alignment = { horizontal: "left", vertical: "middle" };

  setBorder(sheet, `${from}:${to}`, COLORS.slate200);
}

function buildRegisterSheet(workbook, rows, copy, generatedAt) {
  const sheet = workbook.addWorksheet(copy.registerSheet, {
    properties: { tabColor: { argb: COLORS.blue } },
    views: [{ state: "frozen", xSplit: 2, ySplit: 5, topLeftCell: "C6", showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  sheet.mergeCells("A1:Q1");
  sheet.getCell("A1").value = copy.registerTitle;
  sheet.getCell("A1").font = { name: "Aptos Display", size: 18, bold: true, color: { argb: COLORS.white } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 32;

  sheet.mergeCells("A2:Q2");
  sheet.getCell("A2").value = copy.registerSubtitle;
  sheet.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: COLORS.slate600 } };
  sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue50 } };
  sheet.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };

  sheet.mergeCells("A3:Q3");
  sheet.getCell("A3").value = `${copy.generatedAt}: ${generatedAt.toLocaleString()}`;
  sheet.getCell("A3").font = { name: "Aptos", size: 9, italic: true, color: { argb: COLORS.slate500 } };
  sheet.getCell("A3").alignment = { vertical: "middle", horizontal: "left" };

  const today = new Date(generatedAt.getFullYear(), generatedAt.getMonth(), generatedAt.getDate());
  const tableRows = rows.map((item, index) => {
    const warrantyDate = asDate(item.warrantyEndDate);
    const warrantyStatus = !warrantyDate
      ? copy.warrantyUnknown
      : warrantyDate < today
        ? copy.warrantyExpired
        : copy.warrantyValid;
    return [
      index + 1,
      asText(item.assetCode),
      asText(item.assetName),
      asText(item.category),
      asText(item.brand),
      asText(item.model),
      asText(item.serialNumber),
      asText(item.statusLabel),
      asText(item.owner),
      asText(item.location),
      asDate(item.purchaseDate),
      warrantyDate,
      warrantyStatus,
      Number(item.evidenceCount || 0),
      asText(item.notes),
      asDate(item.updatedAt),
      asText(item.statusCode),
    ];
  });

  sheet.addTable({
    name: "AssetRegistryTable",
    ref: "A5",
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true, showColumnStripes: false },
    columns: copy.columns.map((name) => ({ name, filterButton: true })),
    rows: tableRows,
  });

  styleTableHeader(sheet.getRow(5));
  const widths = [7, 18, 28, 16, 16, 22, 23, 18, 24, 26, 14, 14, 16, 13, 38, 20, 15];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.getColumn(17).hidden = true;
  sheet.getColumn(2).numFmt = "@";
  sheet.getColumn(7).numFmt = "@";
  sheet.getColumn(11).numFmt = "dd/mm/yyyy";
  sheet.getColumn(12).numFmt = "dd/mm/yyyy";
  sheet.getColumn(14).numFmt = "#,##0";
  sheet.getColumn(16).numFmt = "dd/mm/yyyy hh:mm";

  const firstDataRow = 6;
  const lastDataRow = 5 + rows.length;
  for (let rowNumber = firstDataRow; rowNumber <= lastDataRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.height = 22;
    row.eachCell((cell, columnNumber) => {
      cell.font = { name: "Aptos", size: 9.5, color: { argb: COLORS.slate900 } };
      cell.alignment = {
        vertical: "middle",
        horizontal: [1, 14].includes(columnNumber) ? "center" : "left",
        wrapText: [3, 9, 10, 15].includes(columnNumber),
      };
    });
    const statusCode = asText(rows[rowNumber - firstDataRow]?.statusCode);
    const statusColors = statusStyle(statusCode);
    row.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusColors.fill } };
    row.getCell(8).font = { name: "Aptos", size: 9.5, bold: true, color: { argb: statusColors.font } };
    const warrantyValue = row.getCell(13).value;
    const warrantyExpired = warrantyValue === copy.warrantyExpired;
    row.getCell(13).font = {
      name: "Aptos",
      size: 9.5,
      bold: true,
      color: { argb: warrantyExpired ? COLORS.rose : warrantyValue === copy.warrantyValid ? COLORS.emerald : COLORS.slate500 },
    };
  }

  sheet.autoFilter = { from: "A5", to: "Q5" };
  sheet.headerFooter.oddHeader = `&L&B${copy.registerTitle}&R${copy.generatedAt}: ${generatedAt.toLocaleDateString()}`;
  sheet.headerFooter.oddFooter = "&LTDK IT Service Hub&CConfidential - Internal Use&RPage &P of &N";
  sheet.pageSetup.printTitlesRow = "1:5";
  return { sheet, firstDataRow, lastDataRow };
}

function buildOverviewSheet(workbook, rows, copy, context, registerMeta, generatedAt) {
  const sheet = workbook.addWorksheet(copy.overviewSheet, {
    properties: { tabColor: { argb: COLORS.emerald } },
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  const { firstDataRow, lastDataRow } = registerMeta;
  const rowCount = rows.length;
  const codeRange = `'${copy.registerSheet}'!$B$${firstDataRow}:$B$${lastDataRow}`;
  const categoryRange = `'${copy.registerSheet}'!$D$${firstDataRow}:$D$${lastDataRow}`;
  const serialRange = `'${copy.registerSheet}'!$G$${firstDataRow}:$G$${lastDataRow}`;
  const ownerRange = `'${copy.registerSheet}'!$I$${firstDataRow}:$I$${lastDataRow}`;
  const locationRange = `'${copy.registerSheet}'!$J$${firstDataRow}:$J$${lastDataRow}`;
  const purchaseRange = `'${copy.registerSheet}'!$K$${firstDataRow}:$K$${lastDataRow}`;
  const warrantyRange = `'${copy.registerSheet}'!$L$${firstDataRow}:$L$${lastDataRow}`;
  const evidenceRange = `'${copy.registerSheet}'!$N$${firstDataRow}:$N$${lastDataRow}`;
  const statusCodeRange = `'${copy.registerSheet}'!$Q$${firstDataRow}:$Q$${lastDataRow}`;
  const totalFormula = `COUNTA(${codeRange})`;

  const operationalCount = rows.filter((item) => !ISSUE_STATUSES.has(asText(item.statusCode))).length;
  const attentionCount = rowCount - operationalCount;
  const ownerCount = rows.filter((item) => asText(item.owner)).length;
  const issueFormula = [...ISSUE_STATUSES]
    .map((status) => `COUNTIF(${statusCodeRange},"${status}")`)
    .join("+");

  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = copy.title;
  sheet.getCell("A1").font = { name: "Aptos Display", size: 22, bold: true, color: { argb: COLORS.white } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 38;

  sheet.mergeCells("A2:H2");
  sheet.getCell("A2").value = copy.subtitle;
  sheet.getCell("A2").font = { name: "Aptos", size: 11, color: { argb: COLORS.slate700 } };
  sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue50 } };
  sheet.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(2).height = 24;

  sheet.mergeCells("A3:D3");
  sheet.getCell("A3").value = `${copy.generatedAt}: ${generatedAt.toLocaleString()}`;
  sheet.mergeCells("E3:H3");
  sheet.getCell("E3").value = `${copy.preparedBy}: ${asText(context.preparedBy) || "IT Service Hub"}`;
  ["A3", "E3"].forEach((address) => {
    sheet.getCell(address).font = { name: "Aptos", size: 9, italic: true, color: { argb: COLORS.slate500 } };
    sheet.getCell(address).alignment = { vertical: "middle", horizontal: "left" };
  });

  applyKpiCard(sheet, "A5:B7", copy.totalAssets, totalFormula, rowCount, COLORS.blue);
  applyKpiCard(
    sheet,
    "C5:D7",
    copy.operational,
    `${totalFormula}-(${issueFormula})`,
    operationalCount,
    COLORS.emerald,
  );
  applyKpiCard(sheet, "E5:F7", copy.needsAttention, issueFormula, attentionCount, COLORS.rose);
  applyKpiCard(sheet, "G5:H7", copy.assigned, `COUNTIF(${ownerRange},"<>")`, ownerCount, COLORS.cyan);
  sheet.getRow(6).height = 28;
  sheet.getRow(7).height = 28;

  styleSectionHeader(sheet, "A9:D9", copy.categoryOverview);
  styleSectionHeader(sheet, "F9:H9", copy.statusOverview);
  sheet.getRow(10).values = [copy.category, copy.records, copy.share, ""];
  ["F10", "G10", "H10"].forEach((address, index) => {
    sheet.getCell(address).value = [copy.status, copy.records, copy.share][index];
  });
  styleTableHeader(sheet.getRow(10));
  sheet.getCell("D10").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.white } };
  sheet.getCell("D10").border = {};

  const categoryCounts = new Map();
  rows.forEach((item) => {
    const category = asText(item.category) || "Other";
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  });
  const categoryEntries = [...categoryCounts.entries()].sort((left, right) => right[1] - left[1]);
  const statusCounts = new Map();
  rows.forEach((item) => {
    const code = asText(item.statusCode) || "unknown";
    const label = asText(item.statusLabel) || code;
    const current = statusCounts.get(code) || { label, count: 0 };
    current.count += 1;
    statusCounts.set(code, current);
  });
  const statusEntries = [...statusCounts.entries()].sort((left, right) => right[1].count - left[1].count);
  const breakdownRows = Math.max(categoryEntries.length, statusEntries.length, 1);

  for (let index = 0; index < breakdownRows; index += 1) {
    const rowNumber = 11 + index;
    const category = categoryEntries[index];
    if (category) {
      sheet.getCell(rowNumber, 1).value = category[0];
      sheet.getCell(rowNumber, 2).value = {
        formula: `COUNTIF(${categoryRange},"${excelText(category[0])}")`,
        result: category[1],
      };
      sheet.getCell(rowNumber, 3).value = {
        formula: `IFERROR(B${rowNumber}/$A$6,0)`,
        result: rowCount ? category[1] / rowCount : 0,
      };
      sheet.getCell(rowNumber, 3).numFmt = "0.0%";
    }
    const status = statusEntries[index];
    if (status) {
      const [code, detail] = status;
      sheet.getCell(rowNumber, 6).value = detail.label;
      sheet.getCell(rowNumber, 7).value = {
        formula: `COUNTIF(${statusCodeRange},"${excelText(code)}")`,
        result: detail.count,
      };
      sheet.getCell(rowNumber, 8).value = {
        formula: `IFERROR(G${rowNumber}/$A$6,0)`,
        result: rowCount ? detail.count / rowCount : 0,
      };
      sheet.getCell(rowNumber, 8).numFmt = "0.0%";
      const colors = statusStyle(code);
      sheet.getCell(rowNumber, 6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.fill } };
      sheet.getCell(rowNumber, 6).font = { name: "Aptos", size: 9.5, bold: true, color: { argb: colors.font } };
    }
    [1, 2, 3, 6, 7, 8].forEach((column) => {
      const cell = sheet.getCell(rowNumber, column);
      cell.alignment = { vertical: "middle", horizontal: column === 1 || column === 6 ? "left" : "right" };
      if (!cell.font?.name) cell.font = { name: "Aptos", size: 9.5, color: { argb: COLORS.slate900 } };
    });
  }
  setBorder(sheet, `A10:C${10 + breakdownRows}`);
  setBorder(sheet, `F10:H${10 + breakdownRows}`);

  const qualityStart = 12 + breakdownRows;
  styleSectionHeader(sheet, `A${qualityStart}:D${qualityStart}`, copy.dataQuality);
  styleSectionHeader(sheet, `F${qualityStart}:H${qualityStart}`, copy.exportContext);
  const qualityHeaderRow = qualityStart + 1;
  [copy.checkItem, copy.complete, copy.missing, copy.completeness].forEach((value, index) => {
    sheet.getCell(qualityHeaderRow, index + 1).value = value;
  });
  [copy.exportScope, "", ""].forEach((value, index) => {
    sheet.getCell(qualityHeaderRow, index + 6).value = value;
  });
  styleTableHeader(sheet.getRow(qualityHeaderRow));

  const qualityDefinitions = [
    [copy.serialNumber, serialRange, rows.filter((item) => !asText(item.serialNumber)).length],
    [copy.owner, ownerRange, rows.filter((item) => !asText(item.owner)).length],
    [copy.location, locationRange, rows.filter((item) => !asText(item.location)).length],
    [copy.purchaseDate, purchaseRange, rows.filter((item) => !asDate(item.purchaseDate)).length],
    [copy.warrantyEnd, warrantyRange, rows.filter((item) => !asDate(item.warrantyEndDate)).length],
    [copy.evidence, evidenceRange, rows.filter((item) => Number(item.evidenceCount || 0) <= 0).length, true],
  ];
  qualityDefinitions.forEach(([label, range, missingCount, zeroCheck], index) => {
    const rowNumber = qualityHeaderRow + 1 + index;
    const missingFormula = zeroCheck ? `COUNTIF(${range},0)` : `COUNTBLANK(${range})`;
    sheet.getCell(rowNumber, 1).value = label;
    sheet.getCell(rowNumber, 2).value = { formula: `${totalFormula}-(${missingFormula})`, result: rowCount - missingCount };
    sheet.getCell(rowNumber, 3).value = { formula: missingFormula, result: missingCount };
    sheet.getCell(rowNumber, 4).value = {
      formula: `IFERROR(B${rowNumber}/$A$6,0)`,
      result: rowCount ? (rowCount - missingCount) / rowCount : 0,
    };
    sheet.getCell(rowNumber, 4).numFmt = "0.0%";
    [1, 2, 3, 4].forEach((column) => {
      const cell = sheet.getCell(rowNumber, column);
      cell.font = { name: "Aptos", size: 9.5, color: { argb: column === 3 && missingCount > 0 ? COLORS.rose : COLORS.slate900 } };
      cell.alignment = { vertical: "middle", horizontal: column === 1 ? "left" : "right" };
    });
  });
  setBorder(sheet, `A${qualityHeaderRow}:D${qualityHeaderRow + qualityDefinitions.length}`);

  const filterRows = [
    [copy.exportScope, context.scope === "selected" ? copy.selectedScope : copy.filteredScope],
    [copy.search, asText(context.search) || copy.none],
    [copy.categoryFilter, asText(context.categoryFilter) || copy.all],
    [copy.statusFilter, asText(context.statusFilter) || copy.all],
    [copy.archiveFilter, context.includeArchived ? copy.yes : copy.no],
    [copy.preparedBy, asText(context.preparedBy) || "IT Service Hub"],
  ];
  filterRows.forEach(([label, value], index) => {
    const rowNumber = qualityHeaderRow + 1 + index;
    sheet.getCell(rowNumber, 6).value = label;
    sheet.mergeCells(rowNumber, 7, rowNumber, 8);
    sheet.getCell(rowNumber, 7).value = value;
    sheet.getCell(rowNumber, 6).font = { name: "Aptos", size: 9.5, bold: true, color: { argb: COLORS.slate700 } };
    sheet.getCell(rowNumber, 7).font = { name: "Aptos", size: 9.5, color: { argb: COLORS.slate900 } };
    sheet.getCell(rowNumber, 6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate100 } };
    sheet.getCell(rowNumber, 7).alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
  setBorder(sheet, `F${qualityHeaderRow}:H${qualityHeaderRow + filterRows.length}`);

  [18, 13, 13, 14, 4, 20, 20, 20].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.getColumn(5).width = 4;
  sheet.headerFooter.oddHeader = `&L&B${copy.title}&R${copy.generatedAt}: ${generatedAt.toLocaleDateString()}`;
  sheet.headerFooter.oddFooter = "&LTDK IT Service Hub&CConfidential - Internal Use&RPage &P of &N";
  return sheet;
}

export async function buildAssetRegistryWorkbook({
  rows,
  filePrefix = "it-asset-registry",
  language = "th",
  context = {},
}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Asset export requires at least one row");
  }

  const excelJsModule = await import("exceljs");
  const ExcelJS = excelJsModule.default || excelJsModule;
  const copy = COPY[language] || COPY.en;
  const generatedAt = new Date();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = asText(context.preparedBy) || "TDK IT Service Hub";
  workbook.lastModifiedBy = workbook.creator;
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.company = "TDK Industrial";
  workbook.subject = "IT Asset Registry Overview";
  workbook.title = copy.title;
  workbook.description = "Professional IT asset register with overview, data quality checks, and filterable detail.";
  workbook.keywords = "IT, asset, inventory, registry, audit";
  workbook.calcProperties.fullCalcOnLoad = true;

  const registerMeta = { firstDataRow: 6, lastDataRow: 5 + rows.length };
  buildOverviewSheet(workbook, rows, copy, context, registerMeta, generatedAt);
  buildRegisterSheet(workbook, rows, copy, generatedAt);

  return {
    workbook,
    count: rows.length,
    fileName: `${safeFilePart(filePrefix)}-${getTimestamp(generatedAt)}.xlsx`,
  };
}

export async function downloadAssetRegistryWorkbook(options) {
  const [{ workbook, fileName, count }, fileSaverModule] = await Promise.all([
    buildAssetRegistryWorkbook(options),
    import("file-saver"),
  ]);
  const saveAs = fileSaverModule.saveAs || fileSaverModule.default;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);
  return { fileName, count };
}
