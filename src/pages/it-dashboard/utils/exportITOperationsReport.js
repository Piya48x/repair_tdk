import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  formatDateTime,
  formatDurationLabel,
  formatHoursLabel,
} from "../pages/it-work-evidence/shared";

const BRAND = {
  blue: "2B59B0",
  cyan: "0EA5E9",
  emerald: "10B981",
  amber: "F59E0B",
  rose: "EF4444",
  slate: "475569",
  text: "1E293B",
  muted: "64748B",
  border: "D9E2EC",
  surface: "F8FAFC",
  white: "FFFFFF",
};

const KPI_CARD_PALETTES = [
  { fill: "EAF2FF", accent: BRAND.blue, text: BRAND.blue },
  { fill: "E8FBF4", accent: BRAND.emerald, text: "047857" },
  { fill: "FFF5E4", accent: BRAND.amber, text: "B45309" },
  { fill: "FFECEE", accent: BRAND.rose, text: "BE123C" },
];

const CHART_COLORS = [
  "#2b59b0",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#7c3aed",
];

const PICK_UP_REQUEST_LABELS = {
  req_new_device: "เบิกอุปกรณ์ใหม่",
  req_replacement: "ขอเปลี่ยนเครื่องทดแทน",
  req_peripherals: "อุปกรณ์ต่อพ่วง",
  req_laptop_gps: "ขอยืมโน้ตบุ๊ค GPS",
  req_install_sw: "ติดตั้งโปรแกรมใหม่",
  req_license: "ขอ License / ต่ออายุ",
  req_os_issue: "ปัญหา Windows / OS",
  req_wifi_guest: "ขอรหัส WiFi",
  req_vpn: "ขอใช้งาน VPN",
  req_folder_access: "ขอสิทธิ์ Folder / Server",
  req_domain: "Reset Password / Domain",
  req_cctv_install: "ติดตั้งกล้องวงจรปิด",
  req_cctv_view: "ขอดูย้อนหลัง CCTV",
  req_access_card: "บัตรผ่านเข้า-ออก",
  req_purchase: "ขอจัดซื้ออุปกรณ์ไอที",
  req_quotation: "ขอใบเสนอราคา",
  req_consult: "ปรึกษาปัญหาไอที",
  req_relocate: "ย้ายจุดทำงาน",
};

function normalizeTicketText(value) {
  return String(value || "").trim();
}

function normalizeTicketKey(value) {
  return normalizeTicketText(value).toLowerCase();
}

function isRepairTicket(ticket) {
  const serviceType = normalizeTicketKey(ticket?.service_type);
  const source = `${ticket?.service_type || ""} ${ticket?.title || ""} ${ticket?.category || ""}`.toLowerCase();
  return serviceType === "req_repair" || source.includes("repair") || source.includes("ซ่อม");
}

function isPickUpServiceRequest(ticket) {
  const serviceType = normalizeTicketKey(ticket?.service_type);
  if (!serviceType || serviceType === "req_repair") return false;
  if (serviceType.startsWith("req_")) return true;

  const source = `${ticket?.service_type || ""} ${ticket?.title || ""} ${ticket?.category || ""}`.toLowerCase();
  return (
    source.includes("เบิก") ||
    source.includes("ซื้อ") ||
    source.includes("borrow") ||
    source.includes("replacement") ||
    source.includes("install") ||
    source.includes("license") ||
    source.includes("vpn") ||
    source.includes("wifi") ||
    source.includes("access") ||
    source.includes("quotation")
  );
}

function getServiceRequestLabel(ticket) {
  const serviceType = normalizeTicketKey(ticket?.service_type);
  return (
    normalizeTicketText(ticket?.title) ||
    PICK_UP_REQUEST_LABELS[serviceType] ||
    normalizeTicketText(ticket?.category) ||
    normalizeTicketText(ticket?.service_type) ||
    "คำขอบริการ"
  );
}

function getTicketDepartment(ticket) {
  return (
    normalizeTicketText(ticket?.reporter_dept) ||
    normalizeTicketText(ticket?.department) ||
    "-"
  );
}

function getTicketReference(ticket) {
  return ticket?.ticket_no || `IT-${String(ticket?.id || "").padStart(5, "0")}`;
}

function getAttachmentUrls(ticket) {
  if (Array.isArray(ticket?.attachment_urls)) return ticket.attachment_urls.filter(Boolean);
  return [];
}

function getServiceRequestDetails(ticket) {
  const detailLines = [
    normalizeTicketText(ticket?.description),
    ticket?.purpose_of_use ? `Purpose: ${normalizeTicketText(ticket.purpose_of_use)}` : "",
  ].filter(Boolean);

  return detailLines.length > 0 ? detailLines.join("\n") : "-";
}

function isLikelyImageAttachment(url) {
  const value = String(url || "").toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].some((ext) => value.includes(ext));
}

function applyBorder(cell, color = BRAND.border) {
  cell.border = {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } },
  };
}

function styleRange(worksheet, startRow, endRow, startCol, endCol, fillColor, borderColor = BRAND.border) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const cell = worksheet.getCell(row, col);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor },
      };
      applyBorder(cell, borderColor);
    }
  }
}

function addKpiCard(worksheet, { startRow, endRow, startCol, endCol, title, value, caption, fill, accent, text }) {
  styleRange(worksheet, startRow, endRow, startCol, endCol, fill, accent);
  worksheet.mergeCells(startRow, startCol, endRow, endCol);
  const cell = worksheet.getCell(startRow, startCol);
  cell.value = {
    richText: [
      { text: `${title}\n`, font: { size: 10, bold: true, color: { argb: BRAND.muted } } },
      { text: `${value}\n`, font: { size: 20, bold: true, color: { argb: text } } },
      { text: caption, font: { size: 9, color: { argb: BRAND.muted } } },
    ],
  };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
}

function addSectionTitle(worksheet, range, text, fillColor = BRAND.blue, fontColor = BRAND.white) {
  worksheet.mergeCells(range);
  const cell = worksheet.getCell(range.split(":")[0]);
  cell.value = text;
  cell.font = { size: 12, bold: true, color: { argb: fontColor } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fillColor },
  };
  applyBorder(cell, fillColor);
}

function addInfoRows(worksheet, startRow, rows, layout = { labelFrom: 2, labelTo: 3, valueFrom: 4, valueTo: 8 }) {
  rows.forEach((entry, index) => {
    const rowNumber = startRow + index;
    const [label, value] = entry;
    const labelCell = worksheet.getCell(rowNumber, layout.labelFrom);
    const valueCell = worksheet.getCell(rowNumber, layout.valueFrom);
    labelCell.value = label;
    valueCell.value = value;
    labelCell.font = { size: 10, bold: true, color: { argb: BRAND.muted } };
    valueCell.font = { size: 10, color: { argb: BRAND.text } };
    worksheet.mergeCells(rowNumber, layout.labelFrom, rowNumber, layout.labelTo);
    worksheet.mergeCells(rowNumber, layout.valueFrom, rowNumber, layout.valueTo);
    styleRange(worksheet, rowNumber, rowNumber, layout.labelFrom, layout.valueTo, BRAND.white);
    labelCell.alignment = { vertical: "middle", horizontal: "left" };
    valueCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
}

function addSummaryTable(worksheet, { startRow, startCol, title, headers, rows, accentColor = BRAND.blue }) {
  const endCol = startCol + headers.length - 1;
  const titleCell = worksheet.getCell(startRow, startCol);
  worksheet.mergeCells(startRow, startCol, startRow, endCol);
  titleCell.value = title;
  titleCell.font = { size: 11, bold: true, color: { argb: BRAND.text } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "EEF4FF" },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  applyBorder(titleCell, BRAND.border);

  const headerRow = worksheet.getRow(startRow + 1);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(startCol + index);
    cell.value = header;
    cell.font = { size: 10, bold: true, color: { argb: BRAND.white } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: accentColor },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    applyBorder(cell, accentColor);
  });

  rows.forEach((rowValues, rowIndex) => {
    rowValues.forEach((value, cellIndex) => {
      const cell = worksheet.getCell(startRow + 2 + rowIndex, startCol + cellIndex);
      cell.value = value;
      cell.font = { size: 10, color: { argb: BRAND.text } };
      cell.alignment = {
        vertical: "middle",
        horizontal: cellIndex === 0 ? "left" : "center",
        wrapText: true,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowIndex % 2 === 0 ? BRAND.white : BRAND.surface },
      };
      applyBorder(cell, BRAND.border);
    });
  });
}

function trimChartLabel(label, maxLength = 18) {
  const value = String(label || "").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function createColumnChartBase64({ title, subtitle, rows }) {
  if (typeof document === "undefined" || rows.length === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 560;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#0f172a";
  context.font = "700 28px sans-serif";
  context.fillText(title, 48, 52);
  context.fillStyle = "#64748b";
  context.font = "16px sans-serif";
  context.fillText(subtitle, 48, 82);

  const chartLeft = 72;
  const chartTop = 130;
  const chartWidth = 1060;
  const chartHeight = 330;
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const stepValue = Math.max(1, Math.ceil(maxValue / 4));

  context.strokeStyle = "#e2e8f0";
  context.lineWidth = 1;

  for (let tick = 0; tick <= 4; tick += 1) {
    const y = chartTop + chartHeight - (tick * (chartHeight / 4));
    context.beginPath();
    context.moveTo(chartLeft, y);
    context.lineTo(chartLeft + chartWidth, y);
    context.stroke();

    context.fillStyle = "#94a3b8";
    context.font = "12px sans-serif";
    context.fillText(String(stepValue * tick), 24, y + 4);
  }

  const barSpace = chartWidth / rows.length;
  const barWidth = Math.min(76, barSpace * 0.52);

  rows.forEach((row, index) => {
    const valueHeight = (row.value / maxValue) * chartHeight;
    const x = chartLeft + index * barSpace + (barSpace - barWidth) / 2;
    const y = chartTop + chartHeight - valueHeight;
    const gradient = context.createLinearGradient(x, y, x, chartTop + chartHeight);
    gradient.addColorStop(0, CHART_COLORS[index % CHART_COLORS.length]);
    gradient.addColorStop(1, "#dbeafe");
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(x, y, barWidth, valueHeight, 16);
    context.fill();

    context.fillStyle = "#0f172a";
    context.font = "600 13px sans-serif";
    context.textAlign = "center";
    context.fillText(String(row.value), x + barWidth / 2, y - 10);

    context.fillStyle = "#475569";
    context.font = "12px sans-serif";
    context.fillText(trimChartLabel(row.label, 14), x + barWidth / 2, chartTop + chartHeight + 24);
  });

  return canvas.toDataURL("image/png");
}

function createHorizontalBarChartBase64({ title, subtitle, rows }) {
  if (typeof document === "undefined" || rows.length === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 560;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#0f172a";
  context.font = "700 28px sans-serif";
  context.fillText(title, 48, 52);
  context.fillStyle = "#64748b";
  context.font = "16px sans-serif";
  context.fillText(subtitle, 48, 82);

  const chartLeft = 260;
  const chartTop = 132;
  const chartWidth = 860;
  const rowHeight = 76;
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  rows.forEach((row, index) => {
    const y = chartTop + index * rowHeight;
    context.fillStyle = "#e2e8f0";
    context.beginPath();
    context.roundRect(chartLeft, y + 10, chartWidth, 22, 11);
    context.fill();

    context.fillStyle = CHART_COLORS[index % CHART_COLORS.length];
    context.beginPath();
    context.roundRect(chartLeft, y + 10, Math.max((row.value / maxValue) * chartWidth, 24), 22, 11);
    context.fill();

    context.fillStyle = "#0f172a";
    context.font = "600 15px sans-serif";
    context.textAlign = "left";
    context.fillText(trimChartLabel(row.label, 28), 48, y + 27);

    context.fillStyle = "#64748b";
    context.font = "13px sans-serif";
    context.fillText(row.subLabel || "", 48, y + 50);

    context.fillStyle = "#0f172a";
    context.font = "700 16px sans-serif";
    context.textAlign = "right";
    context.fillText(String(row.value), 1140, y + 27);
  });

  return canvas.toDataURL("image/png");
}

async function fetchImageAsPngBase64(url, maxSize = 440) {
  if (!url || typeof document === "undefined") return null;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cannot fetch image: ${response.status}`);
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const longestSide = Math.max(image.width, image.height) || 1;
      const scale = Math.min(1, maxSize / longestSide);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas context unavailable"));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve({
        base64: canvas.toDataURL("image/png"),
        width,
        height,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };

    image.src = objectUrl;
  });
}

function columnWidthToPixels(width = 8.43) {
  if (width <= 1) return Math.round(width * 12);
  return Math.round(width * 7 + 5);
}

function rowHeightToPixels(height = 15) {
  return Math.round((height * 96) / 72);
}

function getImagePlacement({ worksheet, rowNumber, columnNumber, imageWidth, imageHeight, padding = 6 }) {
  const columnWidth = columnWidthToPixels(worksheet.getColumn(columnNumber).width || 8.43);
  const rowHeight = rowHeightToPixels(worksheet.getRow(rowNumber).height || worksheet.properties.defaultRowHeight || 15);
  const availableWidth = Math.max(columnWidth - (padding * 2), 24);
  const availableHeight = Math.max(rowHeight - (padding * 2), 24);
  const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight, 1);
  const drawWidth = Math.max(1, Math.round(imageWidth * scale));
  const drawHeight = Math.max(1, Math.round(imageHeight * scale));
  const offsetX = Math.max(0, Math.round((columnWidth - drawWidth) / 2));
  const offsetY = Math.max(0, Math.round((rowHeight - drawHeight) / 2));

  return {
    tl: {
      col: (columnNumber - 1) + (offsetX / Math.max(columnWidth, 1)),
      row: (rowNumber - 1) + (offsetY / Math.max(rowHeight, 1)),
    },
    ext: {
      width: drawWidth,
      height: drawHeight,
    },
  };
}

async function addImageToWorksheet({ workbook, worksheet, rowNumber, columnNumber, imageUrl }) {
  if (!imageUrl) return false;

  try {
    const imageData = await fetchImageAsPngBase64(imageUrl);
    if (!imageData?.base64) return false;

    const imageId = workbook.addImage({
      base64: imageData.base64,
      extension: "png",
    });
    const placement = getImagePlacement({
      worksheet,
      rowNumber,
      columnNumber,
      imageWidth: imageData.width,
      imageHeight: imageData.height,
    });

    worksheet.addImage(imageId, {
      tl: placement.tl,
      ext: placement.ext,
      editAs: "oneCell",
    });

    return true;
  } catch (error) {
    console.warn("Unable to embed image", imageUrl, error);
    return false;
  }
}

function formatDateOnlyCell(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH");
}

function formatTimeOnlyCell(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function calculateTicketDurationMinutes(ticket) {
  const start = ticket?.started_at ? new Date(ticket.started_at) : ticket?.created_at ? new Date(ticket.created_at) : null;
  const end = ticket?.closed_at ? new Date(ticket.closed_at) : ticket?.updated_at ? new Date(ticket.updated_at) : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function styleDetailSheetHeader(row) {
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = { size: 10, bold: true, color: { argb: BRAND.white } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND.blue },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    applyBorder(cell, BRAND.blue);
  });
}

function styleDetailRow(row, index) {
  row.height = 92;
  row.eachCell((cell) => {
    cell.font = { size: 10, color: { argb: BRAND.text } };
    cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: index % 2 === 0 ? BRAND.white : BRAND.surface },
    };
    applyBorder(cell, BRAND.border);
  });
}

async function buildWorkLogsSheet(workbook, rows) {
  const worksheet = workbook.addWorksheet("IT Work Logs", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  worksheet.columns = [
    { header: "No.", key: "no", width: 6 },
    { header: "Reference", key: "reference", width: 15 },
    { header: "Job Title", key: "title", width: 24 },
    { header: "Type", key: "type", width: 16 },
    { header: "Department", key: "department", width: 16 },
    { header: "Technician", key: "user", width: 16 },
    { header: "Requester", key: "requester", width: 18 },
    { header: "Started", key: "started", width: 20 },
    { header: "Ended", key: "ended", width: 20 },
    { header: "Duration", key: "duration", width: 14 },
    { header: "Evidence", key: "evidenceCount", width: 10 },
    { header: "Evidence 1", key: "image1", width: 18 },
    { header: "Evidence 2", key: "image2", width: 18 },
    { header: "Description", key: "description", width: 32 },
  ];

  styleDetailSheetHeader(worksheet.getRow(1));

  for (let index = 0; index < rows.length; index += 1) {
    const record = rows[index];
    const row = worksheet.addRow({
      no: index + 1,
      reference: record.referenceCode || "-",
      title: record.title || "-",
      type: record.typeLabel || "-",
      department: record.department || "-",
      user: record.userName || "-",
      requester: record.requesterName || "-",
      started: formatDateTime(record.startValue),
      ended: formatDateTime(record.endValue),
      duration: record.durationLabel,
      evidenceCount: record.imageCount,
      image1: "",
      image2: "",
      description: record.description || "-",
    });

    styleDetailRow(row, index);
    row.getCell("evidenceCount").alignment = { vertical: "middle", horizontal: "center" };

    const firstImage = record.images?.[0]?.url;
    const secondImage = record.images?.[1]?.url;

    if (!firstImage) {
      row.getCell("image1").value = "No image";
      row.getCell("image1").alignment = { vertical: "middle", horizontal: "center" };
    }

    if (!secondImage) {
      row.getCell("image2").value = record.imageCount > 1 ? "Load failed" : "No image";
      row.getCell("image2").alignment = { vertical: "middle", horizontal: "center" };
    }

    if (firstImage) {
      const added = await addImageToWorksheet({
        workbook,
        worksheet,
        rowNumber: row.number,
        columnNumber: 12,
        imageUrl: firstImage,
      });

      if (!added) {
        row.getCell("image1").value = "Load failed";
        row.getCell("image1").alignment = { vertical: "middle", horizontal: "center" };
      }
    }

    if (secondImage) {
      const added = await addImageToWorksheet({
        workbook,
        worksheet,
        rowNumber: row.number,
        columnNumber: 13,
        imageUrl: secondImage,
      });

      if (!added) {
        row.getCell("image2").value = "Load failed";
        row.getCell("image2").alignment = { vertical: "middle", horizontal: "center" };
      }
    }
  }

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount },
  };
}

async function buildRepairTicketsSheet(workbook, rows) {
  const worksheet = workbook.addWorksheet("Repair Tickets", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  worksheet.columns = [
    { header: "No.", key: "no", width: 6 },
    { header: "Ticket ID", key: "ticketId", width: 15 },
    { header: "Status", key: "status", width: 14 },
    { header: "Priority", key: "priority", width: 12 },
    { header: "Subject", key: "title", width: 24 },
    { header: "Reporter", key: "reporter", width: 18 },
    { header: "Department", key: "department", width: 16 },
    { header: "Location", key: "location", width: 16 },
    { header: "Created Date", key: "createdDate", width: 13 },
    { header: "Created Time", key: "createdTime", width: 12 },
    { header: "Technician", key: "technician", width: 16 },
    { header: "Closed Date", key: "closedDate", width: 13 },
    { header: "Duration", key: "duration", width: 14 },
    { header: "Before", key: "before", width: 18 },
    { header: "After", key: "after", width: 18 },
    { header: "Solution", key: "solution", width: 30 },
  ];

  styleDetailSheetHeader(worksheet.getRow(1));

  for (let index = 0; index < rows.length; index += 1) {
    const ticket = rows[index];
    const durationMinutes = calculateTicketDurationMinutes(ticket);
    const row = worksheet.addRow({
      no: index + 1,
      ticketId: ticket.ticket_no || `IT-${String(ticket.id || "").padStart(5, "0")}`,
      status: String(ticket.status || "-"),
      priority: String(ticket.priority || "-"),
      title: ticket.title || ticket.category || "-",
      reporter: ticket.reporter_name || "-",
      department: ticket.reporter_dept || ticket.department || "-",
      location: ticket.location || "-",
      createdDate: formatDateOnlyCell(ticket.created_at),
      createdTime: formatTimeOnlyCell(ticket.created_at),
      technician: ticket.assigned_name || "-",
      closedDate: formatDateOnlyCell(ticket.closed_at),
      duration: durationMinutes > 0 ? formatDurationLabel(durationMinutes) : "-",
      before: "",
      after: "",
      solution: ticket.solution_note || ticket.parts_used || "-",
    });

    styleDetailRow(row, index);
    row.getCell("status").alignment = { vertical: "middle", horizontal: "center" };
    row.getCell("priority").alignment = { vertical: "middle", horizontal: "center" };

    if (!ticket.image_url) {
      row.getCell("before").value = "No image";
      row.getCell("before").alignment = { vertical: "middle", horizontal: "center" };
    }

    if (!ticket.image_after_url) {
      row.getCell("after").value = "No image";
      row.getCell("after").alignment = { vertical: "middle", horizontal: "center" };
    }

    if (ticket.image_url) {
      const added = await addImageToWorksheet({
        workbook,
        worksheet,
        rowNumber: row.number,
        columnNumber: 14,
        imageUrl: ticket.image_url,
      });

      if (!added) {
        row.getCell("before").value = "Load failed";
        row.getCell("before").alignment = { vertical: "middle", horizontal: "center" };
      }
    }

    if (ticket.image_after_url) {
      const added = await addImageToWorksheet({
        workbook,
        worksheet,
        rowNumber: row.number,
        columnNumber: 15,
        imageUrl: ticket.image_after_url,
      });

      if (!added) {
        row.getCell("after").value = "Load failed";
        row.getCell("after").alignment = { vertical: "middle", horizontal: "center" };
      }
    }
  }

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount },
  };
}

async function buildServiceRequestsSheet(workbook, rows) {
  const worksheet = workbook.addWorksheet("Service Requests", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  worksheet.columns = [
    { header: "No.", key: "no", width: 6 },
    { header: "Request ID", key: "requestId", width: 15 },
    { header: "Request Type", key: "requestType", width: 22 },
    { header: "Status", key: "status", width: 14 },
    { header: "Priority", key: "priority", width: 12 },
    { header: "Subject", key: "title", width: 24 },
    { header: "Requester", key: "reporter", width: 18 },
    { header: "Department", key: "department", width: 16 },
    { header: "Location", key: "location", width: 16 },
    { header: "Created Date", key: "createdDate", width: 13 },
    { header: "Need From", key: "needFrom", width: 13 },
    { header: "Need Until", key: "needUntil", width: 13 },
    { header: "Attachment 1", key: "attachment1", width: 18 },
    { header: "Attachment 2", key: "attachment2", width: 18 },
    { header: "Details", key: "details", width: 34 },
  ];

  styleDetailSheetHeader(worksheet.getRow(1));

  for (let index = 0; index < rows.length; index += 1) {
    const ticket = rows[index];
    const attachments = getAttachmentUrls(ticket);
    const imageAttachments = attachments.filter(isLikelyImageAttachment);
    const nonImageAttachmentLabel = attachments.length > 0 ? "File attached" : "No file";
    const row = worksheet.addRow({
      no: index + 1,
      requestId: getTicketReference(ticket),
      requestType: getServiceRequestLabel(ticket),
      status: String(ticket.status || "-"),
      priority: String(ticket.priority || "-"),
      title: ticket.title || ticket.category || "-",
      reporter: ticket.reporter_name || "-",
      department: getTicketDepartment(ticket),
      location: ticket.location || "-",
      createdDate: formatDateOnlyCell(ticket.created_at),
      needFrom: formatDateOnlyCell(ticket.borrow_start_date),
      needUntil: formatDateOnlyCell(ticket.borrow_end_date),
      attachment1: imageAttachments[0] ? "" : nonImageAttachmentLabel,
      attachment2: imageAttachments[1] ? "" : attachments.length > 1 ? nonImageAttachmentLabel : "No file",
      details: getServiceRequestDetails(ticket),
    });

    styleDetailRow(row, index);
    row.getCell("status").alignment = { vertical: "middle", horizontal: "center" };
    row.getCell("priority").alignment = { vertical: "middle", horizontal: "center" };

    if (imageAttachments[0]) {
      const added = await addImageToWorksheet({
        workbook,
        worksheet,
        rowNumber: row.number,
        columnNumber: 13,
        imageUrl: imageAttachments[0],
      });

      if (!added) {
        row.getCell("attachment1").value = "Load failed";
        row.getCell("attachment1").alignment = { vertical: "middle", horizontal: "center" };
      }
    } else {
      row.getCell("attachment1").alignment = { vertical: "middle", horizontal: "center" };
    }

    if (imageAttachments[1]) {
      const added = await addImageToWorksheet({
        workbook,
        worksheet,
        rowNumber: row.number,
        columnNumber: 14,
        imageUrl: imageAttachments[1],
      });

      if (!added) {
        row.getCell("attachment2").value = "Load failed";
        row.getCell("attachment2").alignment = { vertical: "middle", horizontal: "center" };
      }
    } else {
      row.getCell("attachment2").alignment = { vertical: "middle", horizontal: "center" };
    }
  }

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount },
  };
}

function buildFilterRows({ filters, selectedTypeLabel, reportPeriodLabel }) {
  return [
    ["Generated at", new Date().toLocaleString("th-TH")],
    ["Department filter", filters.department === "ALL" ? "All departments" : filters.department],
    ["Technician filter", filters.user === "ALL" ? "All technicians" : filters.user],
    ["Work type filter", filters.type === "ALL" ? "All work types" : selectedTypeLabel],
    ["Summary period", reportPeriodLabel],
  ];
}

function buildInsightRows(dailySummaries, latestWorkLogs, latestServiceRequests) {
  const topDay = dailySummaries[0];

  return [
    ["Latest daily snapshot", topDay ? `${topDay.label} • ${topDay.count} jobs • ${formatHoursLabel(topDay.totalMinutes)}` : "No daily summary"],
    ["Latest work log", latestWorkLogs[0] ? `${latestWorkLogs[0].title} • ${latestWorkLogs[0].durationLabel}` : "No recent activity"],
    ["Latest service request", latestServiceRequests[0] ? `${getServiceRequestLabel(latestServiceRequests[0])} â€¢ ${getTicketDepartment(latestServiceRequests[0])}` : "No recent service request"],
  ];
}

function buildExecutiveInsightRows(dailySummaries, latestWorkLogs, latestServiceRequests) {
  const topDay = dailySummaries[0];

  return [
    ["Latest daily snapshot", topDay ? `${topDay.label} | ${topDay.count} jobs | ${formatHoursLabel(topDay.totalMinutes)}` : "No daily summary"],
    ["Latest work log", latestWorkLogs[0] ? `${latestWorkLogs[0].title} | ${latestWorkLogs[0].durationLabel}` : "No recent activity"],
    ["Latest service request", latestServiceRequests[0] ? `${getServiceRequestLabel(latestServiceRequests[0])} | ${getTicketDepartment(latestServiceRequests[0])}` : "No recent service request"],
  ];
}

function buildSummarySheet(workbook, payload) {
  const {
    filters,
    selectedTypeLabel,
    reportPeriodLabel,
    reportKpis,
    repairTickets = [],
    serviceRequestTickets = [],
    reportRows,
    issueStats,
    serviceRequestStats,
    workTypeStats,
    latestWorkLogs,
    latestServiceRequests,
    dailySummaries,
  } = payload;

  const worksheet = workbook.addWorksheet("Executive Summary", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    views: [{ showGridLines: false }],
  });

  worksheet.columns = Array.from({ length: 18 }, () => ({ width: 14 }));

  styleRange(worksheet, 2, 4, 2, 17, BRAND.blue, BRAND.blue);
  worksheet.mergeCells("B2:Q4");
  const titleCell = worksheet.getCell("B2");
  titleCell.value = "รายงานภาพรวมงาน IT คำขอบริการ และการแจ้งซ่อม";
  titleCell.value = "รายงานภาพรวมงาน IT และการแจ้งซ่อม";
  titleCell.value = "รายงานภาพรวมงาน IT คำขอบริการ และการแจ้งซ่อม";
  titleCell.value = "IT Operations, Service Requests, and Repair Summary";
  titleCell.font = { size: 24, bold: true, color: { argb: BRAND.white } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };

  styleRange(worksheet, 5, 6, 2, 17, "EAF2FF");
  worksheet.mergeCells("B5:Q6");
  const subtitleCell = worksheet.getCell("B5");
  subtitleCell.value = "สรุป KPI งานซ่อม คำขอบริการจาก Pick-up Equipment งาน IT กราฟประกอบการตัดสินใจ และไฟล์แนบใน workbook เดียว";
  subtitleCell.value = "สรุป KPI, ภาพรวมการแจ้งซ่อม, งาน IT, กราฟประกอบการตัดสินใจ และรูปหลักฐานในไฟล์เดียว";
  subtitleCell.value = "สรุป KPI งานซ่อม คำขอบริการจาก Pick-up Equipment งาน IT กราฟประกอบการตัดสินใจ และไฟล์แนบใน workbook เดียว";
  subtitleCell.value = "Single workbook with KPIs, repair tickets, service requests from Pick-up Equipment, IT work logs, and attachments.";
  subtitleCell.font = { size: 11, color: { argb: BRAND.text } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };

  const kpiValues = [
    {
      title: "งานแจ้งซ่อม",
      value: repairTickets.length.toLocaleString("th-TH"),
      caption: "จำนวนรายการ repair ticket",
    },
    {
      title: "งาน IT",
      value: reportKpis.jobCount.toLocaleString("th-TH"),
      caption: "จำนวน work log ตามตัวกรอง",
    },
    {
      title: "ชั่วโมงรวม",
      value: formatHoursLabel(reportKpis.totalMinutes),
      caption: "เวลาทำงานสะสมทั้งหมด",
    },
    {
      title: "งานมีหลักฐาน",
      value: reportKpis.evidenceJobs.toLocaleString("th-TH"),
      caption: "จำนวนงานที่มีรูปประกอบ",
    },
  ];

  kpiValues[0] = {
    title: "Repair tickets",
    value: repairTickets.length.toLocaleString("th-TH"),
    caption: "Total repair tickets in this report",
  };
  kpiValues[1] = {
    title: "Service requests",
    value: serviceRequestTickets.length.toLocaleString("th-TH"),
    caption: "Requests from Pick-up Equipment",
  };
  kpiValues[2] = {
    title: "IT work logs",
    value: reportKpis.jobCount.toLocaleString("th-TH"),
    caption: "Work logs matching the active filters",
  };
  kpiValues[3] = {
    title: "Total hours",
    value: formatHoursLabel(reportKpis.totalMinutes),
    caption: "Accumulated working hours",
  };

  [
    { startRow: 8, endRow: 11, startCol: 2, endCol: 5 },
    { startRow: 8, endRow: 11, startCol: 6, endCol: 9 },
    { startRow: 8, endRow: 11, startCol: 10, endCol: 13 },
    { startRow: 8, endRow: 11, startCol: 14, endCol: 17 },
  ].forEach((range, index) => {
    addKpiCard(worksheet, {
      ...range,
      ...kpiValues[index],
      ...KPI_CARD_PALETTES[index],
    });
  });

  addSectionTitle(worksheet, "B13:H13", "Report Filters");
  addInfoRows(worksheet, 14, buildFilterRows({ filters, selectedTypeLabel, reportPeriodLabel }));

  addSectionTitle(worksheet, "J13:Q13", "Executive Notes");
  addInfoRows(worksheet, 14, buildExecutiveInsightRows(dailySummaries, latestWorkLogs, latestServiceRequests), {
    labelFrom: 10,
    labelTo: 11,
    valueFrom: 12,
    valueTo: 17,
  });

  const periodChart = createColumnChartBase64({
    title: "ปริมาณงานตามช่วงเวลา",
    subtitle: "จำนวนงานในแต่ละช่วงที่เลือกสำหรับรายงาน",
    rows: reportRows
      .slice(0, 6)
      .reverse()
      .map((row) => ({
        label: row.label,
        value: row.count,
      })),
  });

  if (periodChart) {
    const imageId = workbook.addImage({ base64: periodChart, extension: "png" });
    worksheet.addImage(imageId, "B20:I34");
  }

  const issueChart = createHorizontalBarChartBase64({
    title: "ปัญหาที่พบจากการแจ้งซ่อม",
    subtitle: "Top repair issues ที่ผู้ใช้แจ้งเข้ามามากที่สุด",
    rows: issueStats.slice(0, 5).map((item) => ({
      label: item.label,
      value: item.count,
      subLabel: `${Math.round(item.percent)}% ของรายการแจ้งซ่อม`,
    })),
  });

  if (issueChart) {
    const imageId = workbook.addImage({ base64: issueChart, extension: "png" });
    worksheet.addImage(imageId, "J20:Q34");
  }

  addSummaryTable(worksheet, {
    startRow: 36,
    startCol: 2,
    title: "Top repair issues",
    headers: ["Issue", "Tickets", "Share"],
    rows: issueStats.slice(0, 5).map((item) => [
      item.label,
      item.count,
      `${Math.round(item.percent)}%`,
    ]),
    accentColor: BRAND.rose,
  });

  addSummaryTable(worksheet, {
    startRow: 36,
    startCol: 7,
    title: "Top IT work types",
    headers: ["Work Type", "Jobs", "Share"],
    rows: workTypeStats.slice(0, 5).map((item) => [
      item.label,
      item.count,
      `${Math.round(item.percent)}%`,
    ]),
    accentColor: BRAND.cyan,
  });

  addSummaryTable(worksheet, {
    startRow: 36,
    startCol: 12,
    title: "Latest work logs",
    headers: ["Title", "Owner", "Duration"],
    rows: latestWorkLogs.slice(0, 5).map((item) => [
      item.title,
      item.userName || "-",
      item.durationLabel,
    ]),
    accentColor: BRAND.blue,
  });

  addSummaryTable(worksheet, {
    startRow: 44,
    startCol: 2,
    title: "Top service requests",
    headers: ["Request", "Count", "Share"],
    rows: serviceRequestStats.slice(0, 5).map((item) => [
      item.label,
      item.count,
      `${Math.round(item.percent)}%`,
    ]),
    accentColor: BRAND.emerald,
  });

  addSummaryTable(worksheet, {
    startRow: 44,
    startCol: 7,
    title: "Latest service requests",
    headers: ["Request", "Department", "Status"],
    rows: latestServiceRequests.slice(0, 5).map((item) => [
      getServiceRequestLabel(item),
      getTicketDepartment(item),
      String(item.status || "-"),
    ]),
    accentColor: BRAND.emerald,
  });
}

function buildFileName() {
  const today = new Date().toISOString().slice(0, 10);
  return `it-operations-report-${today}.xlsx`;
}

export async function exportITOperationsReportWorkbook(payload) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IT Admin Dashboard";
  workbook.lastModifiedBy = "IT Admin Dashboard";
  workbook.created = new Date();
  workbook.modified = new Date();
  const repairTickets = payload.repairTickets || payload.filteredTickets || [];
  const serviceRequestTickets = payload.serviceRequestTickets || [];

  buildSummarySheet(workbook, payload);
  await buildWorkLogsSheet(workbook, payload.filteredRecords);
  await buildRepairTicketsSheet(workbook, repairTickets);
  await buildServiceRequestsSheet(workbook, serviceRequestTickets);

  const fileName = buildFileName();
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);
  return fileName;
}
