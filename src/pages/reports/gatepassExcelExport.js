const COLORS = {
  navy: "FF173B80",
  blue: "FF2B59B0",
  cyan: "FF0891B2",
  green: "FF059669",
  amber: "FFD97706",
  rose: "FFE11D48",
  slate900: "FF0F172A",
  slate700: "FF334155",
  slate500: "FF64748B",
  slate300: "FFCBD5E1",
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
    locale: "th-TH",
    summarySheet: "สรุปผู้บริหาร",
    logSheet: "รายการรถเข้าออก",
    changesSheet: "รถเพิ่มลด",
    title: "รายงานรถเข้าออก GATEPASS",
    subtitle: "รายงานรถเข้า-ออกสำหรับผู้บริหาร",
    generatedAt: "วันที่จัดทำ",
    preparedBy: "จัดทำโดย",
    period: "ช่วงรายงาน",
    compareWith: "เปรียบเทียบกับ",
    currentVehicles: "รถในช่วงปัจจุบัน",
    previousVehicles: "รถในช่วงก่อน",
    netChange: "ผลต่างสุทธิ",
    totalPasses: "รายการ Gatepass",
    typeSummary: "สรุปตามประเภท Gatepass",
    trend: "แนวโน้มตามช่วงเวลา",
    type: "ประเภท",
    current: "ปัจจุบัน",
    previous: "ช่วงก่อน",
    difference: "ผลต่าง",
    date: "วันที่",
    uniqueVehicles: "รถไม่ซ้ำ",
    approved: "TDK APPROVED",
    temporary: "TEMPORARY",
    unspecified: "UNSPECIFIED",
    total: "รวมรายการ",
    no: "ลำดับ",
    gatepassNo: "เลข Gatepass",
    plate: "ทะเบียนรถ",
    province: "จังหวัด",
    vehicleType: "ประเภทรถ",
    entry: "เวลาเข้า",
    exitDate: "วันที่ออก",
    exit: "เวลาออก",
    duration: "เวลาอยู่ในบริษัท",
    driver: "ผู้ขับขี่",
    company: "บริษัท",
    contact: "ผู้ติดต่อ",
    department: "แผนก",
    purpose: "วัตถุประสงค์",
    phone: "เบอร์โทรศัพท์",
    gate: "ประตู",
    approvalRef: "เลขอ้างอิงอนุมัติ",
    notes: "หมายเหตุ",
    changeStatus: "สถานะเทียบช่วงก่อน",
    added: "รถเพิ่ม",
    reduced: "รถลด/ไม่พบในช่วงปัจจุบัน",
    confidential: "เอกสารภายใน - ห้ามเผยแพร่",
    page: "หน้า",
  },
  en: {
    locale: "en-GB",
    summarySheet: "Executive Summary",
    logSheet: "Vehicle Log",
    changesSheet: "Vehicle Changes",
    title: "GATEPASS VEHICLE REPORT",
    subtitle: "Executive vehicle access report",
    generatedAt: "Generated at",
    preparedBy: "Prepared by",
    period: "Reporting period",
    compareWith: "Compared with",
    currentVehicles: "Current vehicles",
    previousVehicles: "Previous vehicles",
    netChange: "Net change",
    totalPasses: "Gatepass records",
    typeSummary: "Gatepass type summary",
    trend: "Period trend",
    type: "Type",
    current: "Current",
    previous: "Previous",
    difference: "Difference",
    date: "Date",
    uniqueVehicles: "Unique vehicles",
    approved: "TDK APPROVED",
    temporary: "TEMPORARY",
    unspecified: "UNSPECIFIED",
    total: "Total records",
    no: "No.",
    gatepassNo: "Gatepass No.",
    plate: "Vehicle plate",
    province: "Province",
    vehicleType: "Vehicle type",
    entry: "Entry time",
    exitDate: "Exit date",
    exit: "Exit time",
    duration: "Time on site",
    driver: "Driver",
    company: "Company",
    contact: "Contact person",
    department: "Department",
    purpose: "Purpose",
    phone: "Telephone",
    gate: "Gate",
    approvalRef: "Approval reference",
    notes: "Notes",
    changeStatus: "Change vs prior period",
    added: "Added vehicle",
    reduced: "Reduced / absent in current period",
    confidential: "Confidential - Internal Use",
    page: "Page",
  },
  ko: {
    locale: "ko-KR",
    summarySheet: "경영진 요약",
    logSheet: "차량 출입 내역",
    changesSheet: "차량 증감",
    title: "GATEPASS 차량 출입 보고서",
    subtitle: "경영진용 차량 출입 현황 보고서",
    generatedAt: "작성 일시",
    preparedBy: "작성자",
    period: "보고 기간",
    compareWith: "비교 기간",
    currentVehicles: "현재 기간 차량",
    previousVehicles: "이전 기간 차량",
    netChange: "순증감",
    totalPasses: "Gatepass 기록",
    typeSummary: "Gatepass 유형별 요약",
    trend: "기간별 추이",
    type: "유형",
    current: "현재 기간",
    previous: "이전 기간",
    difference: "차이",
    date: "날짜",
    uniqueVehicles: "고유 차량",
    approved: "TDK APPROVED",
    temporary: "TEMPORARY",
    unspecified: "미지정",
    total: "전체 기록",
    no: "번호",
    gatepassNo: "Gatepass 번호",
    plate: "차량 번호",
    province: "지역",
    vehicleType: "차량 유형",
    entry: "입차 시간",
    exitDate: "출차 날짜",
    exit: "출차 시간",
    duration: "회사 체류 시간",
    driver: "운전자",
    company: "업체",
    contact: "연락 담당자",
    department: "부서",
    purpose: "방문 목적",
    phone: "전화번호",
    gate: "게이트",
    approvalRef: "승인 참조번호",
    notes: "비고",
    changeStatus: "이전 기간 대비",
    added: "추가 차량",
    reduced: "감소·현재 기간 미확인",
    confidential: "대외비 - 내부용",
    page: "페이지",
  },
};

function textValue(value) {
  return String(value ?? "").trim();
}

function durationMinutes(item) {
  const entryDate = textValue(item.visit_date);
  const entryTime = textValue(item.entry_time);
  const exitTime = textValue(item.exit_time);
  if (!entryDate || !entryTime || !exitTime) return "";
  const entry = new Date(`${entryDate}T${entryTime.length === 5 ? `${entryTime}:00` : entryTime}`);
  let exit = new Date(`${textValue(item.exit_date) || entryDate}T${exitTime.length === 5 ? `${exitTime}:00` : exitTime}`);
  if (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime())) return "";
  if (!item.exit_date && exit < entry) exit = new Date(exit.getTime() + 24 * 60 * 60 * 1000);
  return Math.max(0, Math.floor((exit.getTime() - entry.getTime()) / 60000));
}

function styleHeader(row, color = COLORS.blue) {
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: COLORS.navy } } };
  });
}

function styleSection(sheet, range, title) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(":")[0]);
  cell.value = title;
  cell.font = { name: "Aptos Display", size: 11, bold: true, color: { argb: COLORS.white } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(cell.row).height = 25;
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
  labelCell.alignment = { vertical: "middle", horizontal: "center" };
  valueCell.value = value;
  valueCell.font = { name: "Aptos Display", size: 22, bold: true, color: { argb: color } };
  valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.white } };
  valueCell.alignment = { vertical: "middle", horizontal: "center" };
  valueCell.numFmt = value < 0 ? "[Red]-#,##0;[Green]+#,##0;0" : "#,##0";
  [labelCell, valueCell].forEach((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.slate200 } },
      left: { style: "thin", color: { argb: COLORS.slate200 } },
      right: { style: "thin", color: { argb: COLORS.slate200 } },
      bottom: { style: "thin", color: { argb: COLORS.slate200 } },
    };
  });
}

function setReportHeader(sheet, copy, context, generatedAt, lastColumn) {
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getCell("A1").value = copy.title;
  sheet.getCell("A1").font = { name: "Aptos Display", size: 22, bold: true, color: { argb: COLORS.white } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 38;

  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getCell("A2").value = copy.subtitle;
  sheet.getCell("A2").font = { name: "Aptos", size: 11, color: { argb: COLORS.slate700 } };
  sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue50 } };
  sheet.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(2).height = 24;

  sheet.mergeCells(`A3:${lastColumn}3`);
  sheet.getCell("A3").value = `${copy.period}: ${context.periodLabel}    ${copy.compareWith}: ${context.compareLabel}    ${copy.generatedAt}: ${generatedAt.toLocaleString(copy.locale)}    ${copy.preparedBy}: ${context.preparedBy || "TDK"}`;
  sheet.getCell("A3").font = { name: "Aptos", size: 9, italic: true, color: { argb: COLORS.slate500 } };
  sheet.getCell("A3").alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  sheet.getRow(3).height = 28;
  sheet.headerFooter.oddFooter = `&LTDK&C${copy.confidential}&R${copy.page} &P / &N`;
}

function buildSummarySheet(workbook, payload, copy, generatedAt) {
  const { summary, typeSummary, trend, context } = payload;
  const sheet = workbook.addWorksheet(copy.summarySheet, {
    views: [{ state: "frozen", ySplit: 3, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  setReportHeader(sheet, copy, context, generatedAt, "H");
  addKpi(sheet, "A5:B7", copy.currentVehicles, summary.currentVehicles, COLORS.blue);
  addKpi(sheet, "C5:D7", copy.previousVehicles, summary.previousVehicles, COLORS.slate700);
  addKpi(sheet, "E5:F7", copy.netChange, summary.difference, summary.difference < 0 ? COLORS.rose : COLORS.green);
  addKpi(sheet, "G5:H7", copy.totalPasses, summary.totalRecords, COLORS.cyan);
  sheet.getRow(6).height = 28;
  sheet.getRow(7).height = 28;

  styleSection(sheet, "A9:D9", copy.typeSummary);
  sheet.getRow(10).values = [copy.type, copy.current, copy.previous, copy.difference];
  styleHeader(sheet.getRow(10));
  typeSummary.forEach((item, index) => {
    const row = sheet.getRow(11 + index);
    row.values = [copy[item.key] || item.label, item.current, item.previous, item.current - item.previous];
    row.eachCell((cell, column) => {
      cell.font = { name: "Aptos", size: 10, bold: column === 1, color: { argb: COLORS.slate900 } };
      cell.alignment = { vertical: "middle", horizontal: column === 1 ? "left" : "right" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? COLORS.white : COLORS.slate100 } };
      if (column === 4) cell.numFmt = "[Red]-#,##0;[Green]+#,##0;0";
    });
  });

  const trendStart = 14;
  styleSection(sheet, `A${trendStart}:H${trendStart}`, copy.trend);
  const trendHeader = trendStart + 1;
  sheet.getRow(trendHeader).values = [copy.date, copy.uniqueVehicles, copy.approved, copy.temporary, copy.unspecified, copy.total];
  styleHeader(sheet.getRow(trendHeader));
  trend.forEach((item, index) => {
    const row = sheet.getRow(trendHeader + 1 + index);
    const localizedLabel = item.key
      ? new Intl.DateTimeFormat(copy.locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${item.key}T00:00:00`))
      : item.label;
    row.values = [localizedLabel, item.unique, item.approved, item.temporary, item.unspecified, item.total];
    row.eachCell((cell, column) => {
      cell.font = { name: "Aptos", size: 9.5, color: { argb: COLORS.slate900 } };
      cell.alignment = { vertical: "middle", horizontal: column === 1 ? "left" : "right" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? COLORS.white : COLORS.slate100 } };
    });
  });

  [18, 15, 15, 15, 15, 4, 15, 15].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.autoFilter = { from: `A${trendHeader}`, to: `F${trendHeader + Math.max(trend.length, 1)}` };
  return sheet;
}

function buildLogSheet(workbook, rows, copy, context, generatedAt) {
  const sheet = workbook.addWorksheet(copy.logSheet, {
    views: [{ state: "frozen", ySplit: 5, xSplit: 3, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  setReportHeader(sheet, copy, context, generatedAt, "R");
  const headers = [copy.no, copy.date, copy.type, copy.plate, copy.province, copy.vehicleType, copy.entry, copy.exitDate, copy.exit, copy.duration, copy.driver, copy.company, copy.contact, copy.phone, copy.department, copy.purpose, copy.approvalRef, copy.notes];
  const headerRow = sheet.getRow(5);
  headerRow.values = headers;
  styleHeader(headerRow);
  rows.forEach((item, index) => {
    const row = sheet.getRow(6 + index);
    const minutes = durationMinutes(item);
    row.values = [index + 1, item.visit_date || "", item.pass_type || "", item.vehicle_plate || "", item.province || "", item.vehicle_type || "", item.entry_time || "", item.exit_date || "", item.exit_time || "", minutes === "" ? "" : minutes / 1440, item.driver_name || "", item.company_name || "", item.contact_person || "", item.telephone_number || "", item.department || "", item.purpose || "", item.approval_reference || "", item.notes || ""];
    if (minutes !== "") row.getCell(10).numFmt = "[h]\" h \"mm\" m\"";
    row.height = 22;
    row.eachCell((cell, column) => {
      cell.font = { name: "Aptos", size: 9, color: { argb: COLORS.slate900 } };
      cell.alignment = { vertical: "middle", horizontal: [1, 2, 7, 8, 9, 10].includes(column) ? "center" : "left", wrapText: column >= 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? COLORS.white : COLORS.slate100 } };
    });
    const typeCell = row.getCell(3);
    typeCell.font = { name: "Aptos", size: 9, bold: true, color: { argb: item.pass_type === "TEMPORARY" ? COLORS.amber : item.pass_type === "UNSPECIFIED" ? COLORS.slate500 : COLORS.green } };
    typeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: item.pass_type === "TEMPORARY" ? COLORS.amber50 : item.pass_type === "UNSPECIFIED" ? COLORS.slate100 : COLORS.green50 } };
  });
  [7, 13, 17, 15, 13, 15, 11, 13, 11, 16, 18, 20, 18, 16, 18, 25, 20, 25].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.autoFilter = { from: "A5", to: `R${5 + Math.max(rows.length, 1)}` };
  return sheet;
}

function buildChangesSheet(workbook, changes, copy, context, generatedAt) {
  const sheet = workbook.addWorksheet(copy.changesSheet, { views: [{ state: "frozen", ySplit: 5, showGridLines: false }] });
  setReportHeader(sheet, copy, context, generatedAt, "D");
  sheet.getRow(5).values = [copy.no, copy.changeStatus, copy.plate, copy.type];
  styleHeader(sheet.getRow(5));
  const rows = [
    ...changes.added.map((item) => ({ ...item, status: copy.added })),
    ...changes.reduced.map((item) => ({ ...item, status: copy.reduced })),
  ];
  rows.forEach((item, index) => {
    const row = sheet.getRow(6 + index);
    row.values = [index + 1, item.status, item.plate, item.passType || ""];
    const isAdded = item.status === copy.added;
    row.eachCell((cell, column) => {
      cell.font = { name: "Aptos", size: 10, bold: column === 2, color: { argb: column === 2 ? (isAdded ? COLORS.green : COLORS.rose) : COLORS.slate900 } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isAdded ? COLORS.green50 : COLORS.rose50 } };
      cell.alignment = { vertical: "middle", horizontal: column === 1 ? "center" : "left" };
    });
  });
  [8, 34, 20, 20].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.autoFilter = { from: "A5", to: `D${5 + Math.max(rows.length, 1)}` };
  return sheet;
}

export async function buildGatepassWorkbook(payload) {
  const excelJsModule = await import("exceljs");
  const ExcelJS = excelJsModule.default || excelJsModule;
  const copy = COPY[payload.language] || COPY.en;
  const generatedAt = new Date();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = textValue(payload.context?.preparedBy) || "TDK";
  workbook.company = "TDK";
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.title = copy.title;
  workbook.subject = "TDK Gatepass vehicle management report";
  workbook.description = "Monthly and daily comparison of TDK APPROVED, TEMPORARY, and unclassified gatepass vehicles.";
  workbook.calcProperties.fullCalcOnLoad = true;

  buildSummarySheet(workbook, payload, copy, generatedAt);
  buildLogSheet(workbook, payload.rows, copy, payload.context, generatedAt);
  buildChangesSheet(workbook, payload.changes, copy, payload.context, generatedAt);

  const stamp = generatedAt.toISOString().slice(0, 16).replace(/\D/g, "");
  const period = textValue(payload.context?.periodKey).replace(/[^0-9-]/g, "") || "all";
  const languageTag = textValue(payload.language || "en").toUpperCase();
  const fileName = `gatepass-executive-report-${languageTag}-${period}-${stamp}.xlsx`;
  return { workbook, fileName, count: payload.rows.length };
}

export async function downloadGatepassReport(payload) {
  const [{ workbook, fileName, count }, fileSaverModule] = await Promise.all([
    buildGatepassWorkbook(payload),
    import("file-saver"),
  ]);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const saveAs = fileSaverModule.saveAs || fileSaverModule.default;
  saveAs(blob, fileName);
  return { fileName, count };
}
