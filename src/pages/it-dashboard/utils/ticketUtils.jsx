import React from "react";
import {
    Monitor,
    Wifi,
    Globe,
    Printer,
    Mail,
    Lock,
    Shield,
    Settings,
    FileSpreadsheet,
} from "lucide-react";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
    getTicketStatusLabel,
    stripTicketStatusDetailFromParts,
} from "../../../lib/ticketRepairStatus";
import { getTicketDisplayNote } from "../../../lib/ticketAttachmentMetadata";

export const getStatusColor = (status, theme) => {
    switch (status) {
        case "NEW":
            return "text-rose-400";
        case "IN_PROGRESS":
            return "text-amber-400";
        case "CLOSED":
            return "text-emerald-400";
        default:
            return theme === "dark" ? "text-slate-400" : "text-slate-600";
    }
};

export const getStatusBgColor = (status, theme) => {
    switch (status) {
        case "NEW":
            return theme === "dark"
                ? "bg-gradient-to-r from-rose-900/30 to-pink-900/30 border-rose-700/30"
                : "bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200";
        case "IN_PROGRESS":
            return theme === "dark"
                ? "bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-amber-700/30"
                : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200";
        case "CLOSED":
            return theme === "dark"
                ? "bg-gradient-to-r from-emerald-900/30 to-green-900/30 border-emerald-700/30"
                : "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200";
        default:
            return theme === "dark"
                ? "bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700"
                : "bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200";
    }
};

export const getStatusText = (status) => {
    return getTicketStatusLabel(status);
};

export const getPriorityColor = (priority, theme) => {
    switch (priority) {
        case "urgent":
            return "text-rose-400";
        case "normal":
            return "text-amber-400";
        case "low":
            return "text-emerald-400";
        default:
            return theme === "dark" ? "text-slate-400" : "text-slate-600";
    }
};

export const getPriorityText = (priority) => {
    switch (priority) {
        case "urgent":
            return "ด่วนมาก";
        case "normal":
            return "สำคัญ";
        case "low":
            return "ปกติ";
        default:
            return priority;
    }
};

export const getDeviceIcon = (categoryName) => {
    const cat = categoryName?.toLowerCase() || "";

    if (cat.includes("hardware") || cat.includes("computer"))
        return <Monitor size={14} className="text-[#2b59b0]" />;

    if (cat.includes("network"))
        return <Globe size={14} className="text-cyan-500" />;

    if (cat.includes("printer"))
        return <Printer size={14} className="text-orange-500" />;

    if (cat.includes("email") || cat.includes("mail"))
        return <Mail size={14} className="text-purple-500" />;

    if (cat.includes("system"))
        return <Lock size={14} className="text-slate-500" />;

    return <Settings size={14} className="text-slate-400" />;
};

export const calculateDuration = (start, end) => {
    if (!start || !end) return "-";
    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = endTime - startTime;

    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours} ชม. ${minutes} นาที`;
    }
    return `${minutes} นาที`;
};

export const formatTicketId = (id) => {
    if (!id) return "IT-00000";
    const shortId = id.toString().slice(-5);
    return `IT-${shortId.padStart(5, "0")}`;
};

const isLikelyImageAttachment = (url) =>
    /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)(?:[?#].*)?$/i.test(String(url || ""));

export const handleExportExcelWithImages = async (
    ticketsToExport,
    theme,
    currentUser,
    dateRange,
) => {
    try {
        if (ticketsToExport.length === 0) {
            Swal.fire({
                icon: "warning",
                title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">ไม่พบข้อมูล</span>`,
                html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">ไม่มีข้อมูลที่ต้องการ Export</span>`,
                background: theme === "dark" ? "#1f2937" : "#ffffff",
                color: theme === "dark" ? "#fff" : "#1f2937",
                confirmButtonColor: "#3b82f6",
            });
            return;
        }

        Swal.fire({
            title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">กำลังสร้างรายงาน Excel...</span>`,
            html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">กำลังดาวน์โหลดรูปภาพและจัดเรียงข้อมูล</span>`,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            background: theme === "dark" ? "#1f2937" : "#ffffff",
            color: theme === "dark" ? "#fff" : "#1f2937",
        });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = currentUser?.name || "IT Technician";
        workbook.created = new Date();
        workbook.modified = new Date();

        const worksheet = workbook.addWorksheet("Ticket History", {
            pageSetup: {
                paperSize: 9,
                orientation: "landscape",
                fitToPage: true,
                fitToHeight: 1,
                fitToWidth: 1,
            },
            views: [{ state: "frozen", ySplit: 1 }],
        });

        worksheet.columns = [
            { header: "No.", key: "no", width: 6 },
            { header: "Ticket ID", key: "ticketId", width: 15 },
            { header: "สถานะ", key: "status", width: 12 },
            { header: "ระดับความสำคัญ", key: "priority", width: 14 },
            { header: "หัวข้อปัญหา", key: "title", width: 30 },
            { header: "ผู้แจ้ง", key: "reporterName", width: 15 },
            { header: "รหัสพนักงาน", key: "reporterId", width: 12 },
            { header: "แผนก", key: "department", width: 15 },
            { header: "เบอร์ติดต่อ", key: "phone", width: 12 },
            { header: "อีเมล", key: "email", width: 20 },
            { header: "หมวดหมู่", key: "category", width: 15 },
            { header: "อุปกรณ์", key: "device", width: 15 },
            { header: "รายละเอียดปัญหา", key: "description", width: 40 },
            { header: "สถานที่", key: "location", width: 20 },
            { header: "วันที่แจ้ง", key: "createdDate", width: 12 },
            { header: "เวลาแจ้ง", key: "createdTime", width: 10 },
            { header: "ช่างรับงาน", key: "technician", width: 15 },
            { header: "รหัสช่าง", key: "techId", width: 12 },
            { header: "วันที่รับงาน", key: "startDate", width: 12 },
            { header: "เวลาเริ่มงาน", key: "startTime", width: 10 },
            { header: "วิธีแก้ไข", key: "solution", width: 40 },
            { header: "อะไหล่ที่ใช้", key: "parts", width: 20 },
            { header: "วันที่ปิดงาน", key: "closedDate", width: 12 },
            { header: "เวลาปิดงาน", key: "closedTime", width: 10 },
            { header: "ช่างปิดงาน", key: "closedBy", width: 15 },
            { header: "ระยะเวลาซ่อม (นาที)", key: "durationMin", width: 12 },
            { header: "ระยะเวลาซ่อม", key: "durationText", width: 15 },
            { header: "รูปก่อนซ่อม", key: "imageBefore", width: 20 },
            { header: "รูปหลังซ่อม", key: "imageAfter", width: 20 },
            { header: "หมายเหตุ", key: "notes", width: 20 },
            { header: "สร้างเมื่อ", key: "createdAt", width: 18 },
            { header: "อัพเดทเมื่อ", key: "updatedAt", width: 18 },
        ];

        worksheet.getRow(1).font = { bold: true, size: 11, color: { argb: "FFFFFF" } };
        worksheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "2E75B6" },
        };
        worksheet.getRow(1).alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
        };
        worksheet.getRow(1).height = 25;

        for (let i = 0; i < ticketsToExport.length; i++) {
            const ticket = ticketsToExport[i];
            const rowIndex = i + 2;

            const createdDate = new Date(ticket.created_at);
            const startedDate = ticket.started_at ? new Date(ticket.started_at) : null;
            const closedDate = ticket.closed_at ? new Date(ticket.closed_at) : null;
            const updatedDate = ticket.updated_at ? new Date(ticket.updated_at) : null;

            let durationMinutes = 0;
            let durationTextString = "-";

            if (startedDate && closedDate) {
                const diffMs = closedDate - startedDate;
                durationMinutes = Math.floor(diffMs / (1000 * 60));
                durationTextString = calculateDuration(ticket.started_at, ticket.closed_at);
            }

            const row = worksheet.addRow({
                no: i + 1,
                ticketId: ticket.ticket_no || `IT-${ticket.id.toString().padStart(5, "0")}`,
                status: getStatusText(ticket),
                priority: getPriorityText(ticket.priority),
                title: ticket.title || "-",
                reporterName: ticket.reporter_name || "-",
                reporterId: ticket.reporter_emp_id || "-",
                department: ticket.reporter_dept || "-",
                phone: ticket.reporter_phone || "-",
                email: ticket.reporter_email || "-",
                category: ticket.category || "-",
                device: ticket.device_type || "-",
                description: ticket.description || "-",
                location: ticket.location || "-",
                createdDate: createdDate.toLocaleDateString("th-TH"),
                createdTime: createdDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
                technician: ticket.assigned_name || "-",
                techId: ticket.assigned_employee_id || "-",
                startDate: startedDate ? startedDate.toLocaleDateString("th-TH") : "-",
                startTime: startedDate ? startedDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-",
                solution: getTicketDisplayNote(ticket) || "-",
                parts: stripTicketStatusDetailFromParts(ticket.parts_used) || "-",
                closedDate: closedDate ? closedDate.toLocaleDateString("th-TH") : "-",
                closedTime: closedDate ? closedDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-",
                closedBy: ticket.closed_by_name || "-",
                durationMin: durationMinutes,
                durationText: durationTextString,
                imageBefore: isLikelyImageAttachment(ticket.image_url) ? "รูปก่อนซ่อม" : "ไม่มีรูป",
                imageAfter: isLikelyImageAttachment(ticket.image_after_url) ? "รูปหลังซ่อม" : "ไม่มีรูป",
                notes: ticket.notes || "-",
                createdAt: createdDate.toLocaleString("th-TH"),
                updatedAt: updatedDate ? updatedDate.toLocaleString("th-TH") : "-",
            });

            row.font = { size: 10 };
            row.alignment = { vertical: "top", horizontal: "left", wrapText: true };
            row.height = 60;

            const statusCell = row.getCell("status");
            switch (ticket.status) {
                case "CLOSED":
                    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "C6EFCE" } };
                    statusCell.font = { bold: true, color: { argb: "006100" } };
                    break;
                case "IN_PROGRESS":
                    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEB9C" } };
                    statusCell.font = { bold: true, color: { argb: "9C6500" } };
                    break;
                case "NEW":
                    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC7CE" } };
                    statusCell.font = { bold: true, color: { argb: "9C0006" } };
                    break;
            }
            statusCell.alignment = { horizontal: "center", vertical: "middle" };

            const priorityCell = row.getCell("priority");
            switch (ticket.priority) {
                case "urgent":
                    priorityCell.font = { bold: true, color: { argb: "FF0000" } };
                    break;
                case "normal":
                    priorityCell.font = { bold: true, color: { argb: "FF9900" } };
                    break;
                case "low":
                    priorityCell.font = { color: { argb: "00B050" } };
                    break;
            }
            priorityCell.alignment = { horizontal: "center", vertical: "middle" };

            try {
                if (isLikelyImageAttachment(ticket.image_url)) {
                    const beforeImageResponse = await fetch(ticket.image_url);
                    const beforeImageBuffer = await beforeImageResponse.arrayBuffer();
                    const beforeImageId = workbook.addImage({ buffer: beforeImageBuffer, extension: "jpeg" });
                    worksheet.addImage(beforeImageId, { tl: { col: 27, row: rowIndex - 1 }, br: { col: 28, row: rowIndex }, editAs: "oneCell" });
                }
                if (isLikelyImageAttachment(ticket.image_after_url)) {
                    const afterImageResponse = await fetch(ticket.image_after_url);
                    const afterImageBuffer = await afterImageResponse.arrayBuffer();
                    const afterImageId = workbook.addImage({ buffer: afterImageBuffer, extension: "jpeg" });
                    worksheet.addImage(afterImageId, { tl: { col: 28, row: rowIndex - 1 }, br: { col: 29, row: rowIndex }, editAs: "oneCell" });
                }
            } catch (imageError) {
                console.warn(`Cannot load images for ticket ${ticket.id}:`, imageError);
            }

            const descriptionCell = row.getCell("description");
            const solutionCell = row.getCell("solution");
            const maxTextLength = Math.max((descriptionCell.value?.toString() || "").length, (solutionCell.value?.toString() || "").length);
            const lines = Math.ceil(maxTextLength / 60);
            row.height = Math.max(60, lines * 20);
        }

        worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: worksheet.columnCount } };

        const summarySheet = workbook.addWorksheet("สรุปสถิติ", { pageSetup: { paperSize: 9, orientation: "portrait" } });
        summarySheet.mergeCells("A1:F1");
        const titleCell = summarySheet.getCell("A1");
        titleCell.value = "รายงานสรุปสถิติงานซ่อม IT";
        titleCell.font = { bold: true, size: 16, color: { argb: "1F4E78" } };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        summarySheet.getRow(1).height = 30;

        summarySheet.getCell("A3").value = "ข้อมูลการออกรายงาน";
        summarySheet.getCell("A3").font = { bold: true, size: 12 };
        summarySheet.mergeCells("A3:F3");

        const reportInfo = [
            ["วันที่ออกรายงาน", new Date().toLocaleDateString("th-TH"), "ผู้ออกรายงาน", currentUser?.name || "IT Technician"],
            ["เวลาที่ออกรายงาน", new Date().toLocaleTimeString("th-TH"), "รหัสพนักงาน", currentUser?.employeeId || "-"],
            ["ช่วงเวลาที่เลือก", `${dateRange.start ? new Date(dateRange.start).toLocaleDateString("th-TH") : "ทั้งหมด"} ถึง ${dateRange.end ? new Date(dateRange.end).toLocaleDateString("th-TH") : "ทั้งหมด"}`, "แผนก", currentUser?.department || "IT Support"],
            ["จำนวน Ticket ทั้งหมด", ticketsToExport.length, "", ""],
        ];

        reportInfo.forEach((info, index) => {
            const rowNum = 4 + index;
            summarySheet.getCell(`A${rowNum}`).value = info[0];
            summarySheet.getCell(`B${rowNum}`).value = info[1];
            summarySheet.getCell(`B${rowNum}`).font = { bold: true };
            if (info[2]) {
                summarySheet.getCell(`D${rowNum}`).value = info[2];
                summarySheet.getCell(`E${rowNum}`).value = info[3];
                summarySheet.getCell(`E${rowNum}`).font = { bold: true };
            }
        });

        const statusRowStart = 9;
        summarySheet.getCell(`A${statusRowStart}`).value = "สรุปตามสถานะ";
        summarySheet.getCell(`A${statusRowStart}`).font = { bold: true, size: 12 };
        summarySheet.mergeCells(`A${statusRowStart}:C${statusRowStart}`);

        const statusStats = {};
        ticketsToExport.forEach((ticket) => {
            const status = getStatusText(ticket);
            statusStats[status] = (statusStats[status] || 0) + 1;
        });

        summarySheet.getCell(`A${statusRowStart + 1}`).value = "สถานะ";
        summarySheet.getCell(`B${statusRowStart + 1}`).value = "จำนวน";
        summarySheet.getCell(`C${statusRowStart + 1}`).value = "ร้อยละ";

        Object.entries(statusStats).forEach(([status, count], index) => {
            const rowNum = statusRowStart + 2 + index;
            const percent = (count / ticketsToExport.length);
            summarySheet.getCell(`A${rowNum}`).value = status;
            summarySheet.getCell(`B${rowNum}`).value = count;
            summarySheet.getCell(`C${rowNum}`).value = percent;
            summarySheet.getCell(`C${rowNum}`).numFmt = "0.00%";
        });

        const priorityRowStart = statusRowStart + Object.keys(statusStats).length + 3;
        summarySheet.getCell(`A${priorityRowStart}`).value = "สรุปตามระดับความสำคัญ";
        summarySheet.getCell(`A${priorityRowStart}`).font = { bold: true, size: 12 };
        summarySheet.mergeCells(`A${priorityRowStart}:C${priorityRowStart}`);

        const priorityStats = {};
        ticketsToExport.forEach((ticket) => {
            const priority = getPriorityText(ticket.priority);
            priorityStats[priority] = (priorityStats[priority] || 0) + 1;
        });

        summarySheet.getCell(`A${priorityRowStart + 1}`).value = "ระดับความสำคัญ";
        summarySheet.getCell(`B${priorityRowStart + 1}`).value = "จำนวน";
        summarySheet.getCell(`C${priorityRowStart + 1}`).value = "ร้อยละ";

        Object.entries(priorityStats).forEach(([priority, count], index) => {
            const rowNum = priorityRowStart + 2 + index;
            const percent = (count / ticketsToExport.length);
            summarySheet.getCell(`A${rowNum}`).value = priority;
            summarySheet.getCell(`B${rowNum}`).value = count;
            summarySheet.getCell(`C${rowNum}`).value = percent;
            summarySheet.getCell(`C${rowNum}`).numFmt = "0.00%";
        });

        summarySheet.columns = [{ width: 25 }, { width: 12 }, { width: 12 }, { width: 25 }, { width: 12 }, { width: 12 }];

        const exportDate = new Date();
        const fileName = `IT_Ticket_Report_${exportDate.getFullYear()}${(exportDate.getMonth() + 1).toString().padStart(2, "0")}${exportDate.getDate().toString().padStart(2, "0")}_${currentUser?.employeeId || "ALL"}.xlsx`;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(blob, fileName);
        Swal.close();

        Swal.fire({
            icon: "success",
            title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">✅ Export Excel สำเร็จ!</span>`,
            html: `
<div class="text-left ">
  <div class="mb-4 pb-4 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"}">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-xl ${theme === "dark" ? "bg-emerald-900/30" : "bg-emerald-100"}">
        <FileSpreadsheet class="w-6 h-6 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}" />
      </div>
      <div class="overflow-hidden">
        <p class="text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} uppercase tracking-wide font-medium">ออกรายงานสำเร็จ</p>
        <p class="text-sm font-mono ${theme === "dark" ? "text-emerald-300" : "text-emerald-700"} truncate">${fileName}</p>
      </div>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-3 mb-5">
    <div class="${theme === "dark" ? "bg-slate-800/40" : "bg-slate-50"} p-3 rounded-xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}">
      <p class="text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} mb-1">จำนวนข้อมูล</p>
      <p class="text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}">${ticketsToExport.length}</p>
    </div>
    <div class="${theme === "dark" ? "bg-slate-800/40" : "bg-slate-50"} p-3 rounded-xl border ${theme === "dark" ? "border-slate-700" : "border-slate-200"}">
      <p class="text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} mb-1">จำนวนรูปภาพ</p>
      <p class="text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}">${ticketsToExport.filter((t) => isLikelyImageAttachment(t.image_url) || isLikelyImageAttachment(t.image_after_url)).length}</p>
    </div>
  </div>
  <div class="mb-5">
    <p class="text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} mb-3 font-medium">คุณสมบัติของรายงาน</p>
    <div class="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-700"}">
      <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-500"></div><span>รูปภาพในเซลล์</span></div>
      <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-500"></div><span>ปรับความสูงอัตโนมัติ</span></div>
      <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-500"></div><span>สีแสดงสถานะ</span></div>
      <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-500"></div><span>สรุปสถิติ</span></div>
    </div>
  </div>
  <div class="flex items-start gap-2 py-3 px-4 rounded-xl ${theme === "dark" ? "bg-[#2b59b0]/20" : "bg-[#2b59b0]/10"} border ${theme === "dark" ? "border-[#2b59b0]/40" : "border-[#2b59b0]/25"}">
    <span class="text-xs ${theme === "dark" ? "text-[#c7d9ff]" : "text-[#2b59b0]"}">📄 รายงานนี้พร้อมสำหรับการตรวจสอบ Audit และการนำเสนอผู้บริหาร</span>
  </div>
</div>
`,
            timer: 6000,
            showConfirmButton: false,
            position: "center",
            background: theme === "dark" ? "#1f2937" : "#ffffff",
            color: theme === "dark" ? "#fff" : "#1f2937",
            customClass: { popup: `rounded-2xl border-2 ${theme === "dark" ? "border-emerald-700 shadow-[0_0_30px_rgba(16,185,129,0.3)]" : "border-emerald-300 shadow-xl"}` },
        });
    } catch (error) {
        console.error("Export error:", error);
        Swal.fire({
            icon: "error",
            title: `<span class="${theme === "dark" ? "text-white" : "text-slate-900"}">Export ไม่สำเร็จ</span>`,
            html: `<span class="${theme === "dark" ? "text-white/80" : "text-slate-700"}">เกิดข้อผิดพลาด: ${error.message}</span>`,
            background: theme === "dark" ? "#1f2937" : "#ffffff",
            color: theme === "dark" ? "#fff" : "#1f2937",
            confirmButtonColor: "#ef4444",
        });
    }
};


