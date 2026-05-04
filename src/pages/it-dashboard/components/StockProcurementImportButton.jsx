import React, { useRef, useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { importStockFromProcurementWorkbook } from "../services/stockProcurementImportService";
import { isStockPermissionDenied, isStockSchemaError } from "../services/stockManagementService";

export default function StockProcurementImportButton({ currentUser, onImported }) {
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || importing) return;

    try {
      setImporting(true);
      const result = await importStockFromProcurementWorkbook({ file, currentUser });
      const importedCount = Array.isArray(result.importedRows) ? result.importedRows.length : 0;
      if (typeof onImported === "function") {
        await onImported(result);
      }

      if (importedCount === 0) {
        toast.success(`ไม่ได้นำเข้าใหม่ เพราะรายการจาก ${result.docNo || file.name} มีอยู่แล้วทั้งหมด`);
        return;
      }

      const summaryParts = [`นำเข้า ${importedCount} รายการ`];
      if (result.skippedCount > 0) summaryParts.push(`ข้าม ${result.skippedCount} รายการที่มีอยู่แล้ว`);
      if (result.fallbackCount > 0) summaryParts.push(`${result.fallbackCount} รายการใช้รหัส import ชั่วคราว`);
      toast.success(summaryParts.join(" • "));
    } catch (error) {
      console.error("Import procurement stock error:", error);
      if (isStockSchemaError(error)) {
        toast.error("schema stock management ยังไม่อัปเดต");
      } else if (isStockPermissionDenied(error)) {
        toast.error("บัญชีนี้ยังไม่มีสิทธิ์ import stock");
      } else {
        toast.error(error?.message || "นำเข้า stock จากไฟล์ไม่สำเร็จ");
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {importing ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
        {importing ? "กำลัง import..." : "Import Excel"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
