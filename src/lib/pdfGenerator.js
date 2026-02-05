import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// IMPORTANT: jsPDF does not support UTF-8/Thai by default. 
// You MUST add a font file base64 string here for Thai support (e.g., THSarabunNew).
// Since we cannot upload files directly in this environment, this is a placeholder structure.
// In a real execution, you would import the base64 string of the font.
// For now, we use a standard font but warn about encoding if Thai characters are used without the font.

const generatePDF = (ticketData, user) => {
    const doc = new jsPDF();

    // -- Font Loading Logic (Placeholder for Thai Font) --
    // doc.addFileToVFS("THSarabunNew-Normal.ttf", fontBase64String);
    // doc.addFont("THSarabunNew-Normal.ttf", "THSarabun", "normal");
    // doc.setFont("THSarabun");

    // Page Setup
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Header Background
    doc.setFillColor(41, 98, 255); // Corporate Blue
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('IT SERVICE REQUEST FORM', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text('แบบฟอร์มคำร้องขอบริการไอที', pageWidth / 2, 30, { align: 'center' });

    // Document Information
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString('th-TH', {
        working: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }); // Note: 'th-TH' works in browser, check font support

    // Right aligned info
    doc.text(`เลขที่เอกสาร: ${ticketData.ticketId || 'DRAFT'}`, pageWidth - margin, 50, { align: 'right' });
    doc.text(`วันที่: ${dateStr}`, pageWidth - margin, 56, { align: 'right' });

    // Helper for Sections
    let yPos = 65;
    const addSectionHeader = (title) => {
        doc.setFillColor(240, 242, 245);
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(title, margin + 5, yPos + 5.5);
        yPos += 15;
    };

    const addField = (label, value, xOffset = 0) => {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text(label, margin + xOffset, yPos);
        doc.setFont(undefined, 'normal');
        // Sanitize null values
        const safeValue = value || '-';
        doc.text(String(safeValue), margin + xOffset + 40, yPos);
    };

    // 1. Requester Information
    addSectionHeader('REQUESTER INFORMATION (ข้อมูลผู้ร้องขอ)');

    addField('Name:', ticketData.reporter_name);
    addField('Employee ID:', user?.employeeId || '-', 90);
    yPos += 7;

    addField('Department:', ticketData.department);
    addField('Position:', user?.position || '-', 90);
    yPos += 7;

    addField('Email:', ticketData.reporter_email);
    addField('Phone:', ticketData.reporter_phone, 90);
    yPos += 12;

    // 2. Service Details
    addSectionHeader('SERVICE DETAILS (รายละเอียดบริการ)');

    addField('Category:', ticketData.category);
    addField('Service Type:', ticketData.title, 90);
    yPos += 7;

    addField('Priority:', ticketData.priority.toUpperCase());
    addField('Location:', ticketData.location, 90);
    yPos += 12;

    // GPS specific
    if (ticketData.service_type === 'req_laptop_gps') {
        doc.setDrawColor(34, 197, 94); // Green border for asset
        doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 20);
        doc.setTextColor(21, 128, 61);
        doc.setFontSize(9);
        doc.text('[ Asset Tracking Enabled ]', margin + 5, yPos);
        yPos += 5;
        doc.setTextColor(0, 0, 0);

        addField('Start Date:', ticketData.borrow_start_date);
        addField('End Date:', ticketData.borrow_end_date, 90);
        yPos += 7;
        addField('Purpose:', ticketData.purpose_of_use);
        yPos += 12;
    }

    // Description
    doc.setFont(undefined, 'bold');
    doc.text('Description / Details:', margin, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');

    const descLines = doc.splitTextToSize(ticketData.description, pageWidth - (margin * 2));
    doc.text(descLines, margin, yPos);
    yPos += (descLines.length * 5) + 10;

    // Footer / Signatures
    const footerY = pageHeight - 50;

    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    const sigY = footerY + 15;

    doc.setFontSize(10);
    doc.text('REQUESTER SIGNATURE', margin + 10, sigY);
    doc.line(margin + 10, sigY + 15, margin + 70, sigY + 15);
    doc.text('Date: ...........................', margin + 10, sigY + 22);

    doc.text('APPROVER SIGNATURE', pageWidth - 80, sigY);
    doc.line(pageWidth - 80, sigY + 15, pageWidth - 20, sigY + 15);
    doc.text('Date: ...........................', pageWidth - 80, sigY + 22);

    // System Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by Enterprise IT Service Portal • ID: ' + (ticketData.ticketId || 'N/A'), pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.save(`IT-Request-${Date.now()}.pdf`);
};

export default generatePDF;
