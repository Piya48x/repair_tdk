const COLORS = {
  navy: "FF173B80",
  blue: "FF2B59B0",
  green: "FF059669",
  amber: "FFD97706",
  rose: "FFE11D48",
  slate900: "FF0F172A",
  slate700: "FF334155",
  slate500: "FF64748B",
  slate200: "FFE2E8F0",
  slate100: "FFF1F5F9",
  blue50: "FFEFF6FF",
  green50: "FFECFDF5",
  amber50: "FFFFFBEB",
  rose50: "FFFFF1F2",
  white: "FFFFFFFF",
};

const COPY = {
  th: {
    summarySheet: "สรุปผู้บริหาร",
    registrySheet: "ทะเบียนปัจจุบัน",
    changesSheet: "รายการเปลี่ยนแปลง",
    title: "รายงานทะเบียนรถ TDK APPROVED",
    subtitle: "สรุปทะเบียนตั้งต้น รถที่เพิ่มภายหลัง และทะเบียนที่ใช้งานปัจจุบัน",
    period: "ประจำเดือน",
    generated: "วันที่จัดทำ",
    active: "ทะเบียนใช้งานปัจจุบัน",
    added: "เพิ่มใหม่ / กลับมาใช้งาน",
    removed: "ถอดออก",
    updated: "แก้ไขข้อมูล",
    net: "เพิ่มสุทธิ",
    companySummary: "จำนวนทะเบียนแยกตามบริษัท",
    changeSummary: "สรุปการเปลี่ยนแปลง",
    company: "บริษัท",
    vehicles: "จำนวนรถ",
    no: "ลำดับ",
    plate: "ทะเบียนรถ",
    fullName: "ชื่อ / ผู้ขับขี่",
    group: "กลุ่ม",
    contact: "ผู้ติดต่อ",
    purpose: "วัตถุประสงค์",
    firstSeen: "เริ่มพบในระบบ",
    lastSeen: "อัปเดตล่าสุด",
    mapping: "สถานะ Mapping",
    remark: "หมายเหตุ",
    date: "วันที่",
    changeType: "ประเภทการเปลี่ยนแปลง",
    before: "ข้อมูลเดิม",
    after: "ข้อมูลใหม่",
    confidential: "Confidential - Internal Use",
    baseline: "ทะเบียนตั้งต้น",
    addedSinceBaseline: "เพิ่มหลังวันตั้งต้น",
    fleetJourney: "ภาพรวมทะเบียนตั้งแต่วันเริ่มต้น",
    addedVehiclesDetail: "รายละเอียดรถที่เพิ่มหลังทะเบียนตั้งต้น",
    addedDate: "วันที่เพิ่ม",
    addedListHint: "เรียงตามวันที่เพิ่มจากเก่าไปใหม่",
  },
  en: {
    summarySheet: "Executive Summary",
    registrySheet: "Current Registry",
    changesSheet: "Monthly Changes",
    title: "TDK APPROVED VEHICLE REGISTRY REPORT",
    subtitle: "Official baseline, later additions, and current active registry",
    period: "Reporting month",
    generated: "Generated at",
    active: "Current active vehicles",
    added: "Added / reactivated",
    removed: "Removed",
    updated: "Details updated",
    net: "Net additions",
    companySummary: "Active vehicles by company",
    changeSummary: "Monthly change summary",
    company: "Company",
    vehicles: "Vehicles",
    no: "No.",
    plate: "License plate",
    fullName: "Name / driver",
    group: "Group",
    contact: "Contact",
    purpose: "Purpose",
    firstSeen: "First seen",
    lastSeen: "Last updated",
    mapping: "Mapping status",
    remark: "Remark",
    date: "Date",
    changeType: "Change type",
    before: "Previous details",
    after: "New details",
    confidential: "Confidential - Internal Use",
    baseline: "Official baseline",
    addedSinceBaseline: "Added after baseline",
    fleetJourney: "Registry growth since the official baseline",
    addedVehiclesDetail: "Vehicles added after the official baseline",
    addedDate: "Date added",
    addedListHint: "Sorted by date added, oldest first",
  },
};

const clean = (value) => String(value ?? "").trim();
const toExcelDate = (value) => {
  const normalized = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
const formatIsoDate = (value) => {
  const [year, month, day] = clean(value).split("-");
  return year && month && day ? `${day}-${month}-${year}` : clean(value);
};
const displayChange = (change, copy) => {
  const labels = {
    BASELINE: copy.active,
    ADDED: copy.added,
    REACTIVATED: copy.added,
    REMOVED: copy.removed,
    UPDATED: copy.updated,
  };
  return labels[change] || change;
};

function styleHeader(row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: COLORS.navy } } };
  });
}

function setReportHeader(sheet, copy, monthLabel, generatedAt, lastColumn) {
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getCell("A1").value = copy.title;
  sheet.getCell("A1").font = { name: "Aptos Display", size: 20, bold: true, color: { argb: COLORS.white } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 38;

  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getCell("A2").value = copy.subtitle;
  sheet.getCell("A2").font = { name: "Aptos", size: 11, color: { argb: COLORS.slate700 } };
  sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue50 } };
  sheet.getRow(2).height = 24;

  sheet.mergeCells(`A3:${lastColumn}3`);
  sheet.getCell("A3").value = `${copy.period}: ${monthLabel}    ${copy.generated}: ${generatedAt.toLocaleString()}`;
  sheet.getCell("A3").font = { name: "Aptos", size: 9, italic: true, color: { argb: COLORS.slate500 } };
  sheet.getRow(3).height = 24;
  sheet.headerFooter.oddFooter = `&LTDK&C${copy.confidential}&RPage &P of &N`;
}

function addKpi(sheet, range, label, value, color) {
  const [from, to] = range.split(":");
  const start = sheet.getCell(from);
  const end = sheet.getCell(to);
  sheet.mergeCells(start.row, start.col, start.row, end.col);
  sheet.mergeCells(start.row + 1, start.col, end.row, end.col);
  const labelCell = sheet.getCell(start.row, start.col);
  const valueCell = sheet.getCell(start.row + 1, start.col);
  labelCell.value = label;
  labelCell.font = { name: "Aptos", size: 9, bold: true, color: { argb: COLORS.slate700 } };
  labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate100 } };
  labelCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  valueCell.value = value;
  valueCell.font = { name: "Aptos Display", size: 20, bold: true, color: { argb: color } };
  valueCell.alignment = { vertical: "middle", horizontal: "center" };
  [labelCell, valueCell].forEach((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.slate200 } },
      bottom: { style: "thin", color: { argb: COLORS.slate200 } },
      left: { style: "thin", color: { argb: COLORS.slate200 } },
      right: { style: "thin", color: { argb: COLORS.slate200 } },
    };
  });
}

function styleSection(sheet, range, title) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(":")[0]);
  cell.value = title;
  cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.white } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function detailsText(payload) {
  if (!payload || typeof payload !== "object") return "";
  return [payload.full_name, payload.company_name, payload.purpose].map(clean).filter(Boolean).join(" | ");
}

export async function buildTdkApprovedMonthlyWorkbook(payload = {}) {
  const {
    language = "en",
    month,
    registry = [],
    changes = [],
    allChanges = changes,
    baselineDate = "2026-09-08",
    baselineCount = 39,
  } = payload;
  const excelJsModule = await import("exceljs");
  const ExcelJS = excelJsModule.default || excelJsModule;
  const copy = COPY[language] || COPY.en;
  const generatedAt = new Date();
  const activeRows = registry.filter((row) => row.is_active);
  const added = changes.filter((row) => ["ADDED", "REACTIVATED"].includes(row.change_type)).length;
  const removed = changes.filter((row) => row.change_type === "REMOVED").length;
  const updated = changes.filter((row) => row.change_type === "UPDATED").length;
  const historyChanges = Array.isArray(allChanges) ? allChanges : changes;
  const addedSinceBaselineMap = new Map();
  [...historyChanges]
    .filter((row) => row.change_type === "ADDED" && clean(row.change_date) >= baselineDate)
    .sort((a, b) => `${a.change_date}|${a.created_at || ""}`.localeCompare(`${b.change_date}|${b.created_at || ""}`))
    .forEach((row) => {
      const key = clean(row.plate_key) || clean(row.vehicle_plate).replace(/[\s-]+/g, "").toUpperCase();
      if (key && !addedSinceBaselineMap.has(key)) addedSinceBaselineMap.set(key, row);
    });
  const addedSinceBaselineRows = [...addedSinceBaselineMap.values()];
  const monthDate = new Date(`${month}-01T00:00:00`);
  const monthLabel = new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-GB", { month: "long", year: "numeric" }).format(monthDate);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TDK Gatepass Management";
  workbook.company = "TDK";
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.title = copy.title;
  workbook.subject = `${copy.title} - ${monthLabel}`;

  const summary = workbook.addWorksheet(copy.summarySheet, {
    views: [{ state: "frozen", ySplit: 13, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  setReportHeader(summary, copy, monthLabel, generatedAt, "N");
  addKpi(summary, "A5:B7", `${copy.baseline} (${formatIsoDate(baselineDate)})`, baselineCount, COLORS.blue);
  addKpi(summary, "C5:D7", `${copy.addedSinceBaseline} (${formatIsoDate(baselineDate)})`, addedSinceBaselineRows.length, COLORS.green);
  addKpi(summary, "E5:F7", copy.active, activeRows.length, COLORS.blue);
  addKpi(summary, "G5:H7", copy.added, added, COLORS.green);
  addKpi(summary, "I5:J7", copy.removed, removed, COLORS.rose);
  addKpi(summary, "K5:L7", copy.updated, updated, COLORS.amber);
  addKpi(summary, "M5:N7", copy.net, added - removed, added - removed < 0 ? COLORS.rose : COLORS.green);

  const companyCounts = [...activeRows.reduce((map, row) => {
    const company = clean(row.company_name) || "Unmapped / Review";
    map.set(company, (map.get(company) || 0) + 1);
    return map;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  styleSection(summary, "A9:N9", copy.fleetJourney);
  summary.mergeCells("A10:N10");
  summary.getCell("A10").value = `${copy.baseline}: ${Number(baselineCount).toLocaleString()}  |  ${formatIsoDate(baselineDate)}     ${copy.addedSinceBaseline}: ${addedSinceBaselineRows.length.toLocaleString()}     ${copy.active}: ${activeRows.length.toLocaleString()}`;
  summary.getCell("A10").font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.slate700 } };
  summary.getCell("A10").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue50 } };
  summary.getCell("A10").alignment = { vertical: "middle", horizontal: "left" };
  summary.getRow(10).height = 25;
  summary.mergeCells("A11:G11");
  summary.getCell("A11").value = copy.addedListHint;
  summary.getCell("A11").font = { name: "Aptos", size: 9, italic: true, color: { argb: COLORS.slate500 } };
  summary.getCell("A11").alignment = { vertical: "middle", horizontal: "left" };

  styleSection(summary, "A12:G12", `${copy.addedVehiclesDetail} (${addedSinceBaselineRows.length.toLocaleString()})`);
  styleSection(summary, "I12:K12", copy.companySummary);
  styleSection(summary, "M12:N12", copy.changeSummary);

  const addedHeaders = [copy.no, copy.addedDate, copy.plate, copy.company, copy.fullName, copy.contact, copy.purpose];
  addedHeaders.forEach((label, index) => { summary.getRow(13).getCell(index + 1).value = label; });
  [copy.no, copy.company, copy.vehicles].forEach((label, index) => { summary.getRow(13).getCell(index + 9).value = label; });
  [copy.changeType, copy.vehicles].forEach((label, index) => { summary.getRow(13).getCell(index + 13).value = label; });
  [...Array.from({ length: 7 }, (_, index) => index + 1), 9, 10, 11, 13, 14].forEach((column) => {
    const cell = summary.getRow(13).getCell(column);
    cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: COLORS.navy } } };
  });
  summary.getRow(13).height = 28;

  addedSinceBaselineRows.forEach((item, index) => {
    const after = item.after_data && typeof item.after_data === "object" ? item.after_data : {};
    const row = summary.getRow(14 + index);
    row.getCell(1).value = index + 1;
    row.getCell(2).value = toExcelDate(item.change_date);
    row.getCell(3).value = item.vehicle_plate || after.vehicle_plate || "";
    row.getCell(4).value = item.company_name || after.company_name || "";
    row.getCell(5).value = item.full_name || after.full_name || "";
    row.getCell(6).value = after.contact_name || "";
    row.getCell(7).value = after.purpose || after.remark || "";
    row.getCell(2).numFmt = "dd-mm-yyyy";
    row.height = 23;
    for (let column = 1; column <= 7; column += 1) {
      const cell = row.getCell(column);
      cell.font = { name: "Aptos", size: 9.5, color: { argb: COLORS.slate900 } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? COLORS.white : COLORS.slate100 } };
      cell.alignment = { vertical: "middle", horizontal: [1, 2].includes(column) ? "center" : "left", wrapText: column >= 4 };
    }
    row.getCell(3).font = { name: "Aptos", size: 9.5, bold: true, color: { argb: COLORS.green } };
  });

  companyCounts.forEach(([company, count], index) => {
    const row = summary.getRow(14 + index);
    row.getCell(9).value = index + 1;
    row.getCell(10).value = company;
    row.getCell(11).value = count;
    [9, 10, 11].forEach((column) => {
      const cell = row.getCell(column);
      cell.font = { name: "Aptos", size: 9.5, color: { argb: COLORS.slate900 } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? COLORS.white : COLORS.slate100 } };
      cell.alignment = { vertical: "middle", horizontal: column === 11 ? "right" : "left" };
    });
  });

  [copy.added, copy.removed, copy.updated].forEach((label, index) => {
    const row = summary.getRow(14 + index);
    row.getCell(13).value = label;
    row.getCell(14).value = [added, removed, updated][index];
    row.getCell(13).font = { name: "Aptos", size: 9.5, bold: true, color: { argb: COLORS.slate700 } };
    row.getCell(14).font = { name: "Aptos", size: 9.5, color: { argb: COLORS.slate900 } };
    row.getCell(14).alignment = { horizontal: "right" };
  });
  [6, 13, 15, 22, 24, 20, 30, 3, 6, 24, 10, 3, 27, 10].forEach((width, index) => { summary.getColumn(index + 1).width = width; });
  summary.autoFilter = { from: "A13", to: `G${13 + Math.max(addedSinceBaselineRows.length, 1)}` };

  const registrySheet = workbook.addWorksheet(copy.registrySheet, {
    views: [{ state: "frozen", ySplit: 5, xSplit: 2, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  setReportHeader(registrySheet, copy, monthLabel, generatedAt, "K");
  registrySheet.getRow(5).values = [copy.no, copy.plate, copy.fullName, copy.group, copy.company, copy.contact, copy.purpose, copy.firstSeen, copy.lastSeen, copy.mapping, copy.remark];
  styleHeader(registrySheet.getRow(5));
  activeRows.forEach((item, index) => {
    const row = registrySheet.getRow(6 + index);
    row.values = [index + 1, item.vehicle_plate || "", item.full_name || "", item.group_name || "TDK APPROVED", item.company_name || "", item.contact_name || "", item.purpose || "", item.first_seen_date || "", item.last_seen_date || "", item.mapping_status || "", item.remark || ""];
    row.height = 23;
    row.eachCell((cell, column) => {
      cell.font = { name: "Aptos", size: 9.5, color: { argb: COLORS.slate900 } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? COLORS.white : COLORS.slate100 } };
      cell.alignment = { vertical: "middle", horizontal: [1, 8, 9].includes(column) ? "center" : "left", wrapText: column >= 3 };
    });
  });
  [7, 16, 27, 17, 22, 24, 28, 14, 14, 25, 28].forEach((width, index) => { registrySheet.getColumn(index + 1).width = width; });
  registrySheet.autoFilter = { from: "A5", to: `K${5 + Math.max(activeRows.length, 1)}` };

  const changesSheet = workbook.addWorksheet(copy.changesSheet, {
    views: [{ state: "frozen", ySplit: 5, xSplit: 2, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  setReportHeader(changesSheet, copy, monthLabel, generatedAt, "H");
  changesSheet.getRow(5).values = [copy.no, copy.date, copy.changeType, copy.plate, copy.fullName, copy.company, copy.before, copy.after];
  styleHeader(changesSheet.getRow(5));
  changes.forEach((item, index) => {
    const row = changesSheet.getRow(6 + index);
    row.values = [index + 1, item.change_date || "", displayChange(item.change_type, copy), item.vehicle_plate || "", item.full_name || "", item.company_name || "", detailsText(item.before_data), detailsText(item.after_data)];
    row.height = 25;
    row.eachCell((cell, column) => {
      cell.font = { name: "Aptos", size: 9.5, color: { argb: COLORS.slate900 } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? COLORS.white : COLORS.slate100 } };
      cell.alignment = { vertical: "middle", horizontal: [1, 2].includes(column) ? "center" : "left", wrapText: column >= 5 };
    });
    const statusCell = row.getCell(3);
    const isRemoved = item.change_type === "REMOVED";
    const isUpdated = item.change_type === "UPDATED";
    statusCell.font = { name: "Aptos", size: 9.5, bold: true, color: { argb: isRemoved ? COLORS.rose : isUpdated ? COLORS.amber : COLORS.green } };
    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isRemoved ? COLORS.rose50 : isUpdated ? COLORS.amber50 : COLORS.green50 } };
  });
  [7, 14, 23, 16, 27, 22, 32, 32].forEach((width, index) => { changesSheet.getColumn(index + 1).width = width; });
  changesSheet.autoFilter = { from: "A5", to: `H${5 + Math.max(changes.length, 1)}` };

  const fileName = `TDK-Approved-Monthly-Report-${language.toUpperCase()}-${month}.xlsx`;
  return { workbook, fileName, count: activeRows.length };
}

export async function downloadTdkApprovedMonthlyReport(payload) {
  const { workbook, fileName } = await buildTdkApprovedMonthlyWorkbook(payload);
  const buffer = await workbook.xlsx.writeBuffer();
  const fileSaverModule = await import("file-saver");
  const saveAs = fileSaverModule.saveAs || fileSaverModule.default?.saveAs || fileSaverModule.default;
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName);
  return fileName;
}
