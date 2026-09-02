import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Barcode,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Cpu,
  Database,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  HardDrive,
  History,
  ImagePlus,
  KeyRound,
  Laptop,
  LayoutGrid,
  MapPin,
  Monitor,
  PackageCheck,
  PencilLine,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import NotebookInventoryManagementPanel from "./NotebookInventoryManagementPanel";
import AttachmentPreviewModal from "../work-notes/AttachmentPreviewModal";
import { downloadAssetRegistryWorkbook } from "./assetRegistryExcelExport";

const EXECUTIVE_ASSETS_TRANSLATIONS = {
  th: {
    page: {
      backLabel: "แดชบอร์ดแอดมิน",
      eyebrow: "IT OPERATIONS · ASSET CONTROL",
      title: "IT Asset Management / จัดการสินทรัพย์",
      subtitle:
        "ศูนย์กลาง Asset Registry และ Software License สำหรับเพิ่ม แก้ไข นำเข้า และตรวจสอบข้อมูลที่ใช้ในงาน IT Operations",
      importAssets: "Import Assets",
      importLicenses: "Import Licenses",
      importing: "Importing...",
      refresh: "Refresh",
      importGuide: "Excel / CSV Import Guide",
      requiredAssetColumns: "อุปกรณ์ต้องมี: asset_tag, asset_name",
      categoryHint: "หมวดหมู่หลัก: PC, Notebook, Monitor, Printer",
      assetColumns: "คอลัมน์อุปกรณ์",
      licenseColumns: "คอลัมน์ไลเซนส์",
    },
    summary: {
      totalAssets: "Total Assets / ทั้งหมด",
      usableAssets: "Operational / พร้อมใช้",
      issueAssets: "Needs Attention / ต้องดูแล",
      pc: "PC",
      notebook: "Notebook",
      monitor: "Monitor",
      printer: "Printer",
      totalLicenses: "Total Licenses / ไลเซนส์",
      usableLicenses: "Active Licenses / ใช้งานได้",
      issueLicenses: "License Issues / ใช้ไม่ได้",
      visible: "จำนวนที่แสดง",
      usable: "ใช้งานได้",
      unusable: "ใช้ไม่ได้",
    },
    ux: {
      liveData: "ข้อมูลล่าสุด",
      ready: "พร้อมใช้งาน",
      needsAttention: "ควรตรวจสอบ",
      noIssues: "ไม่พบรายการผิดปกติ",
      records: "รายการ",
      assetRegistry: "ทะเบียนสินทรัพย์",
      licenseRegistry: "ทะเบียนไลเซนส์",
      notebookRegistry: "ทะเบียน Notebook",
      addNotebook: "เพิ่ม Notebook",
      listHelper: "ค้นหา กรอง และจัดการสินทรัพย์ IT ได้จากจุดเดียว",
    },
    sections: {
      assets: "Assets / อุปกรณ์",
      licenses: "Licenses / ไลเซนส์",
      notebooks: "Notebook Center",
      activity: "Activity Log / ประวัติ",
      userRole: "Access Role",
      unknownRole: "ไม่ทราบ",
      deleteModePermanent: "โหมดลบ: ลบถาวร",
      deleteModeArchive: "โหมดลบ: จัดเก็บ",
    },
    status: {
      in_use: "ใช้งานอยู่",
      assigned: "มอบหมายแล้ว",
      spare: "สำรอง",
      available: "พร้อมใช้งาน",
      broken: "เสีย",
      repair: "ซ่อม",
      retired: "ปลดระวาง",
      lost: "สูญหาย",
    },
    licenseStatus: {
      active: "ใช้งานอยู่",
      pending_renewal: "ใกล้ต่ออายุ",
      inactive: "ไม่ใช้งาน",
      expired: "หมดอายุ",
    },
    category: {
      PC: "พีซี (PC)",
      Notebook: "โน้ตบุ๊ก (Notebook)",
      Monitor: "จอภาพ (Monitor)",
      Printer: "เครื่องพิมพ์ (Printer)",
    },
    common: {
      allCategories: "All Categories / ทุกหมวด",
      allStatuses: "All Statuses / ทุกสถานะ",
      resetFilters: "Reset Filters",
      view: "View / ดู",
      edit: "Edit / แก้ไข",
      delete: "Delete / ลบ",
      archive: "Archive / จัดเก็บ",
      processing: "กำลังดำเนินการ...",
      save: "Save / บันทึก",
      saving: "กำลังบันทึก...",
      cancelEdit: "Cancel",
      close: "Close / ปิด",
      exportExcel: "Export Excel",
      exportingExcel: "กำลังสร้างรายงาน...",
      loading: "กำลังโหลดข้อมูล...",
      noAssetData: "ไม่พบข้อมูลอุปกรณ์",
      noLicenseData: "ไม่พบข้อมูลไลเซนส์",
      openImage: "เปิดรูป",
      remove: "ลบออก",
    },
    assets: {
      formAdd: "Add New Asset / เพิ่มอุปกรณ์",
      formEdit: "Edit Asset / แก้ไขอุปกรณ์",
      listTitle: "Asset Registry ({{count}})",
      showArchived: "แสดงรายการที่จัดเก็บแล้ว",
      searchPlaceholder: "Search asset code, name, category or owner...",
      statusHint: "สถานะที่นับเป็นต้องดูแล: เสีย, ซ่อม, ปลดระวาง, สูญหาย",
      autoArchiveNotice: "ตัวกรองกำลังรวมรายการที่จัดเก็บแล้วให้โดยอัตโนมัติ",
      selected: "เลือกแล้ว: {{selected}} / {{total}}",
      clearSelected: "ล้างรายการที่เลือก",
      exportSelected: "Export ที่เลือก ({{count}})",
      deleteSelected: "ลบที่เลือก ({{count}})",
      archiveSelected: "จัดเก็บที่เลือก ({{count}})",
      detailsButton: "รายละเอียด",
      selectAllAria: "เลือกอุปกรณ์ทั้งหมดที่แสดง",
      selectRowAria: "เลือก {{asset}}",
      submitAdd: "Add Asset",
      submitEdit: "Save Changes",
      tableCode: "Asset Code",
      tableName: "Asset / อุปกรณ์",
      tableCategory: "Category",
      tableStatus: "Status",
      tableOwner: "Owner / Location",
      tablePurchaseDate: "Purchase Date",
      tableActions: "Actions",
      detailTitle: "รายละเอียดอุปกรณ์",
      detailCode: "รหัสทรัพย์สิน",
      tableEvidence: "หลักฐาน",
      evidenceTitle: "รูปหลักฐานอุปกรณ์",
      evidenceHint: "แนบรูปเครื่องจริง สภาพอุปกรณ์ จุดติดตั้ง หรือหลักฐานส่งมอบ",
      evidenceButton: "เพิ่มรูปหลักฐาน",
      evidencePasteHint: "แคปภาพแล้วคลิกกล่องนี้ จากนั้นกด Ctrl+V เพื่อวางรูปได้ทันที",
      evidenceEmpty: "ยังไม่มีรูปหลักฐานของอุปกรณ์นี้",
      evidencePending: "รออัปโหลด {{count}} รูป",
      evidenceMigrationMissing: "ยังไม่ได้รัน migration สำหรับรูปหลักฐานและประวัติอุปกรณ์",
      latestHistory: "ประวัติอัปเดตล่าสุด",
      noHistory: "ยังไม่มีประวัติอัปเดตของอุปกรณ์นี้",
    },
    activity: {
      title: "ประวัติการอัปเดตอุปกรณ์ล่าสุด",
      subtitle: "ติดตามว่าใครเปลี่ยนสถานะ ย้ายผู้ใช้งาน หรือเพิ่มรูปหลักฐานให้เครื่องใดล่าสุด",
      noData: "ยังไม่มีประวัติการอัปเดต",
      schemaNotice: "เปิดใช้งานหลังรัน migration รูปหลักฐานและ activity log",
      action_created: "เพิ่มอุปกรณ์",
      action_updated: "อัปเดตอุปกรณ์",
      action_archived: "จัดเก็บ/ปลดระวาง",
      action_evidence: "อัปเดตรูปหลักฐาน",
      evidenceAdded: "เพิ่มรูป {{count}} รูป",
      evidenceRemoved: "ลบรูป {{count}} รูป",
      changes: "รายการเปลี่ยนแปลง",
    },
    licenses: {
      formAdd: "Add License / เพิ่มไลเซนส์",
      formEdit: "Edit License / แก้ไขไลเซนส์",
      listTitle: "License Registry ({{count}})",
      showArchived: "แสดงรายการที่จัดเก็บแล้ว",
      searchPlaceholder: "Search license, vendor or type...",
      submitAdd: "Add License",
      submitEdit: "Save Changes",
      tableLicense: "License",
      tableStatus: "Status",
      tableTotal: "Total",
      tableAssigned: "Assigned",
      tableAvailable: "Available",
      tableExpiry: "Expiry Date",
      tableActions: "Actions",
      loading: "กำลังโหลดข้อมูลไลเซนส์...",
      detailTitle: "รายละเอียดไลเซนส์",
    },
    assetFields: {
      asset_tag: "Asset Code / รหัสทรัพย์สิน",
      asset_name: "Asset Name / ชื่ออุปกรณ์",
      asset_category: "Category / หมวดหมู่",
      brand: "Brand / ยี่ห้อ",
      model: "Model / รุ่น",
      serial_number: "Serial Number",
      status: "Status / สถานะ",
      location: "Location / ที่ตั้ง",
      owner_name: "Owner / ผู้ใช้งาน",
      purchase_date: "Purchase Date",
      warranty_end_date: "Warranty End",
      notes: "Notes / หมายเหตุ",
    },
    licenseFields: {
      license_name: "License Name",
      vendor: "Vendor / ผู้ให้บริการ",
      license_type: "License Type",
      status: "Status / สถานะ",
      quantity_total: "Total Seats",
      quantity_assigned: "Assigned Seats",
      expiry_date: "Expiry Date",
      renewal_date: "Renewal Date",
      notes: "Notes / หมายเหตุ",
    },
    toast: {
      loadAssetsError: "โหลดข้อมูลอุปกรณ์ไม่สำเร็จ",
      loadLicensesError: "โหลดข้อมูลไลเซนส์ไม่สำเร็จ",
      requireAsset: "กรุณากรอกรหัสทรัพย์สินและชื่ออุปกรณ์",
      assetUpdated: "อัปเดตข้อมูลอุปกรณ์แล้ว",
      assetCreated: "เพิ่มอุปกรณ์ใหม่แล้ว",
      saveAssetError: "บันทึกข้อมูลไม่สำเร็จ",
      requireLicense: "กรุณากรอกชื่อไลเซนส์",
      licenseUpdated: "อัปเดตไลเซนส์แล้ว",
      licenseCreated: "เพิ่มไลเซนส์ใหม่แล้ว",
      saveLicenseError: "บันทึกข้อมูลไลเซนส์ไม่สำเร็จ",
      licenseDeleted: "ลบข้อมูลไลเซนส์แล้ว",
      licenseArchived: "เปลี่ยนสถานะไลเซนส์เป็นไม่ใช้งานแล้ว",
      licenseArchiveError: "ไม่สามารถจัดเก็บไลเซนส์ได้",
      deleteLicenseError: "ลบข้อมูลไลเซนส์ไม่สำเร็จ",
      assetDeleted: "ลบข้อมูลอุปกรณ์แล้ว",
      assetArchived: "เปลี่ยนสถานะอุปกรณ์เป็นปลดระวางแล้ว",
      assetArchiveError: "ไม่สามารถจัดเก็บอุปกรณ์ได้",
      deleteAssetError: "ลบข้อมูลไม่สำเร็จ",
      noSheet: "ไม่พบชีตข้อมูลในไฟล์",
      emptyFile: "ไฟล์ว่างหรือไม่พบข้อมูลสำหรับนำเข้า",
      noValidAssetRows: "ไม่พบแถวที่มีรหัสทรัพย์สินและชื่ออุปกรณ์ครบ",
      importAssetsSuccess: "นำเข้าสำเร็จ เพิ่ม {{insert}} | อัปเดต {{update}} | ข้าม {{skip}}",
      importAssetsError: "นำเข้าไฟล์ไม่สำเร็จ",
      noLicenseSheet: "ไม่พบชีตข้อมูลในไฟล์ไลเซนส์",
      emptyLicenseFile: "ไฟล์ไลเซนส์ว่างหรือไม่พบข้อมูลสำหรับนำเข้า",
      noValidLicenseRows: "ไม่พบแถวที่มีชื่อไลเซนส์",
      importLicensesSuccess: "นำเข้าไลเซนส์สำเร็จ เพิ่ม {{insert}} | อัปเดต {{update}} | ข้าม {{skip}}",
      importLicensesError: "นำเข้าไลเซนส์ไม่สำเร็จ",
      noAssetsToExport: "ไม่มีรายการอุปกรณ์สำหรับส่งออก",
      exportSuccess: "ส่งออกข้อมูลสำเร็จ {{count}} รายการ",
      exportError: "สร้างรายงาน Excel ไม่สำเร็จ",
      selectedDeleteSuccess: "ลบอุปกรณ์ที่เลือกสำเร็จ {{count}} รายการ",
      selectedArchiveSuccess: "จัดเก็บอุปกรณ์ที่เลือกสำเร็จ {{count}} รายการ",
      selectedActionError: "ดำเนินการกับรายการที่เลือกไม่สำเร็จ",
      fileTooLarge: "ไฟล์ {{name}} ต้องมีขนาดไม่เกิน 10 MB",
      imageOnly: "รูปหลักฐานต้องเป็นไฟล์รูปภาพเท่านั้น",
      evidencePasted: "วางรูปหลักฐานแล้ว {{count}} รูป",
      evidenceAdded: "เพิ่มรูปหลักฐานแล้ว {{count}} รูป",
      evidenceMigrationMissing: "กรุณารัน migration สำหรับรูปหลักฐานและประวัติอุปกรณ์ก่อนใช้งาน",
      evidenceUploadError: "อัปโหลดรูปหลักฐานไม่สำเร็จ",
    },
    confirm: {
      deleteLicense: "ยืนยันลบไลเซนส์ {{name}} แบบถาวร?",
      archiveLicense: "สิทธิ์ของคุณจะจัดเก็บแทนการลบถาวร\nยืนยันจัดเก็บไลเซนส์ {{name}} ?",
      deleteAsset: "ยืนยันลบอุปกรณ์ {{name}} แบบถาวร?",
      archiveAsset: "สิทธิ์ของคุณจะจัดเก็บแทนการลบถาวร\nยืนยันจัดเก็บอุปกรณ์ {{name}} ?",
      deleteSelectedAssets: "ยืนยันลบอุปกรณ์ที่เลือก {{count}} รายการแบบถาวร? การดำเนินการนี้ย้อนกลับไม่ได้",
      archiveSelectedAssets: "ยืนยันจัดเก็บอุปกรณ์ที่เลือก {{count}} รายการ?",
    },
  },
  en: {
    page: {
      backLabel: "Admin dashboard",
      eyebrow: "Asset Management",
      title: "IT asset management",
      subtitle:
        "Add, edit, import, and review assets and licenses in one simple page. This data feeds the executive reports.",
      importAssets: "Import assets",
      importLicenses: "Import licenses",
      importing: "Importing...",
      refresh: "Refresh",
      importGuide: "Excel/CSV import guide",
      requiredAssetColumns: "Assets require: asset_tag, asset_name",
      categoryHint: "Core categories: PC, Notebook, Monitor, Printer",
      assetColumns: "Asset columns",
      licenseColumns: "License columns",
    },
    summary: {
      totalAssets: "Total assets",
      usableAssets: "Ready to use",
      issueAssets: "Needs attention",
      pc: "PC",
      notebook: "Notebook",
      monitor: "Monitor",
      printer: "Printer",
      totalLicenses: "Total licenses",
      usableLicenses: "Usable licenses",
      issueLicenses: "Unavailable licenses",
      visible: "Visible items",
      usable: "Usable",
      unusable: "Unavailable",
    },
    ux: {
      liveData: "Live data",
      ready: "ready",
      needsAttention: "Needs attention",
      noIssues: "No issue found",
      records: "records",
      assetRegistry: "Asset registry",
      licenseRegistry: "License registry",
      notebookRegistry: "Notebook registry",
      addNotebook: "Add notebook",
      listHelper: "Search, filter, and manage every IT asset from one place",
    },
    sections: {
      assets: "Assets",
      licenses: "Licenses",
      notebooks: "Notebook Center",
      activity: "Update history",
      userRole: "Role",
      unknownRole: "Unknown",
      deleteModePermanent: "Delete mode: permanent",
      deleteModeArchive: "Delete mode: archive",
    },
    status: {
      in_use: "In use",
      assigned: "Assigned",
      spare: "Spare",
      available: "Available",
      broken: "Broken",
      repair: "Repair",
      retired: "Retired",
      lost: "Lost",
    },
    licenseStatus: {
      active: "Active",
      pending_renewal: "Pending renewal",
      inactive: "Inactive",
      expired: "Expired",
    },
    category: {
      PC: "PC",
      Notebook: "Notebook",
      Monitor: "Monitor",
      Printer: "Printer",
    },
    common: {
      allCategories: "All categories",
      allStatuses: "All statuses",
      resetFilters: "Reset filters",
      view: "View",
      edit: "Edit",
      delete: "Delete",
      archive: "Archive",
      processing: "Processing...",
      save: "Save",
      saving: "Saving...",
      cancelEdit: "Cancel",
      close: "Close",
      exportExcel: "Export Excel",
      exportingExcel: "Building report...",
      loading: "Loading data...",
      noAssetData: "No assets found",
      noLicenseData: "No licenses found",
      openImage: "Open image",
      remove: "Remove",
    },
    assets: {
      formAdd: "Add asset",
      formEdit: "Edit asset",
      listTitle: "Asset list ({{count}})",
      showArchived: "Show archived items",
      searchPlaceholder: "Search code, name, category, or owner...",
      statusHint: "Needs attention includes: broken, repair, retired, and lost",
      autoArchiveNotice: "This filter is automatically including archived retired and lost assets.",
      selected: "Selected: {{selected}} / {{total}}",
      clearSelected: "Clear selection",
      exportSelected: "Export selected ({{count}})",
      deleteSelected: "Delete selected ({{count}})",
      archiveSelected: "Archive selected ({{count}})",
      detailsButton: "Details",
      selectAllAria: "Select all visible assets",
      selectRowAria: "Select {{asset}}",
      submitAdd: "Add asset",
      submitEdit: "Save changes",
      tableCode: "Code",
      tableName: "Asset",
      tableCategory: "Category",
      tableStatus: "Status",
      tableOwner: "Owner/location",
      tablePurchaseDate: "Purchase date",
      tableActions: "Actions",
      detailTitle: "Asset details",
      detailCode: "Asset code",
      tableEvidence: "Evidence",
      evidenceTitle: "Asset evidence photos",
      evidenceHint: "Attach photos of the device, condition, installation point, or handover proof.",
      evidenceButton: "Add evidence photos",
      evidencePasteHint: "Capture an image, click this panel, then press Ctrl+V to paste it instantly.",
      evidenceEmpty: "No evidence photos for this asset yet.",
      evidencePending: "{{count}} photo(s) waiting to upload",
      evidenceMigrationMissing: "The evidence and asset history migration has not been run yet.",
      latestHistory: "Latest update history",
      noHistory: "No update history for this asset yet.",
    },
    activity: {
      title: "Latest asset update history",
      subtitle: "Track who changed status, reassigned users, or added evidence photos most recently.",
      noData: "No update history yet",
      schemaNotice: "Available after running the asset evidence and activity log migration.",
      action_created: "Asset created",
      action_updated: "Asset updated",
      action_archived: "Archived / retired",
      action_evidence: "Evidence updated",
      evidenceAdded: "Added {{count}} photo(s)",
      evidenceRemoved: "Removed {{count}} photo(s)",
      changes: "Changes",
    },
    licenses: {
      formAdd: "Add license",
      formEdit: "Edit license",
      listTitle: "License list ({{count}})",
      showArchived: "Show archived items",
      searchPlaceholder: "Search license, vendor, or type...",
      submitAdd: "Add license",
      submitEdit: "Save changes",
      tableLicense: "License",
      tableStatus: "Status",
      tableTotal: "Total",
      tableAssigned: "Assigned",
      tableAvailable: "Available",
      tableExpiry: "Expiry",
      tableActions: "Actions",
      loading: "Loading licenses...",
      detailTitle: "License details",
    },
    assetFields: {
      asset_tag: "Asset code",
      asset_name: "Asset name",
      asset_category: "Category",
      brand: "Brand",
      model: "Model",
      serial_number: "Serial number",
      status: "Status",
      location: "Location",
      owner_name: "Owner",
      purchase_date: "Purchase date",
      warranty_end_date: "Warranty end",
      notes: "Notes",
    },
    licenseFields: {
      license_name: "License name",
      vendor: "Vendor",
      license_type: "License type",
      status: "Status",
      quantity_total: "Total seats",
      quantity_assigned: "Assigned seats",
      expiry_date: "Expiry date",
      renewal_date: "Renewal date",
      notes: "Notes",
    },
    toast: {
      loadAssetsError: "Unable to load assets",
      loadLicensesError: "Unable to load licenses",
      requireAsset: "Please enter an asset code and asset name",
      assetUpdated: "Asset updated",
      assetCreated: "Asset added",
      saveAssetError: "Unable to save asset",
      requireLicense: "Please enter a license name",
      licenseUpdated: "License updated",
      licenseCreated: "License added",
      saveLicenseError: "Unable to save license",
      licenseDeleted: "License deleted",
      licenseArchived: "License marked inactive",
      licenseArchiveError: "Unable to archive license",
      deleteLicenseError: "Unable to delete license",
      assetDeleted: "Asset deleted",
      assetArchived: "Asset marked retired",
      assetArchiveError: "Unable to archive asset",
      deleteAssetError: "Unable to delete asset",
      noSheet: "No sheet found in this file",
      emptyFile: "This file is empty or has no importable rows",
      noValidAssetRows: "No rows include both asset code and asset name",
      importAssetsSuccess: "Import complete: added {{insert}} | updated {{update}} | skipped {{skip}}",
      importAssetsError: "Unable to import file",
      noLicenseSheet: "No license sheet found in this file",
      emptyLicenseFile: "This license file is empty or has no importable rows",
      noValidLicenseRows: "No rows include a license name",
      importLicensesSuccess: "License import complete: added {{insert}} | updated {{update}} | skipped {{skip}}",
      importLicensesError: "Unable to import licenses",
      noAssetsToExport: "No assets to export",
      exportSuccess: "Exported {{count}} assets",
      exportError: "Unable to create the Excel report",
      selectedDeleteSuccess: "Deleted {{count}} selected assets",
      selectedArchiveSuccess: "Archived {{count}} selected assets",
      selectedActionError: "Unable to process the selected assets",
      fileTooLarge: "File {{name}} must be 10 MB or smaller",
      imageOnly: "Evidence must be an image file.",
      evidencePasted: "Pasted {{count}} evidence photo(s)",
      evidenceAdded: "Added {{count}} evidence photo(s)",
      evidenceMigrationMissing: "Please run the asset evidence and activity history migration before using this feature.",
      evidenceUploadError: "Unable to upload evidence photos",
    },
    confirm: {
      deleteLicense: "Permanently delete license {{name}}?",
      archiveLicense: "Your role will archive instead of permanently deleting.\nArchive license {{name}}?",
      deleteAsset: "Permanently delete asset {{name}}?",
      archiveAsset: "Your role will archive instead of permanently deleting.\nArchive asset {{name}}?",
      deleteSelectedAssets: "Permanently delete {{count}} selected assets? This action cannot be undone.",
      archiveSelectedAssets: "Archive {{count}} selected assets?",
    },
  },
};

const STATUS_OPTIONS = [
  { value: "in_use", label: "ใช้งานอยู่" },
  { value: "assigned", label: "มอบหมายแล้ว" },
  { value: "spare", label: "สำรอง" },
  { value: "available", label: "พร้อมใช้งาน" },
  { value: "broken", label: "เสีย" },
  { value: "repair", label: "ซ่อม" },
  { value: "retired", label: "ปลดระวาง" },
  { value: "lost", label: "สูญหาย" },
];

const ASSET_BROKEN_STATUS_SET = new Set(["broken", "repair", "retired", "lost"]);
const LICENSE_USABLE_STATUS_SET = new Set(["active", "pending_renewal"]);
const ASSET_EVIDENCE_BUCKET = "it-asset-evidence";
const ASSET_EVIDENCE_ACCEPT = "image/*";
const ASSET_EVIDENCE_MAX_SIZE = 10 * 1024 * 1024;

const LICENSE_STATUS_OPTIONS = [
  { value: "active", label: "ใช้งานอยู่" },
  { value: "pending_renewal", label: "ใกล้ต่ออายุ" },
  { value: "inactive", label: "ไม่ใช้งาน" },
  { value: "expired", label: "หมดอายุ" },
];

const HEADER_ALIASES = {
  asset_tag: ["assettag", "tag", "assetcode", "รหัสทรัพย์สิน", "รหัสอุปกรณ์"],
  asset_name: ["assetname", "name", "อุปกรณ์", "ชื่ออุปกรณ์"],
  asset_category: ["assetcategory", "category", "ประเภท", "หมวดหมู่"],
  brand: ["brand", "ยี่ห้อ"],
  model: ["model", "รุ่น"],
  serial_number: ["serialnumber", "serial", "sn", "เลขซีเรียล"],
  status: ["status", "สถานะ"],
  location: ["location", "site", "ที่ตั้ง"],
  owner_name: ["ownername", "owner", "ผู้ถือครอง", "ผู้ใช้งาน"],
  purchase_date: ["purchasedate", "buydate", "วันที่ซื้อ"],
  warranty_end_date: ["warrantyenddate", "warranty", "วันหมดประกัน"],
  notes: ["notes", "remark", "หมายเหตุ"],
};

const TABLE_COLUMNS = [
  "asset_tag",
  "asset_name",
  "asset_category",
  "brand",
  "model",
  "serial_number",
  "status",
  "location",
  "owner_name",
  "purchase_date",
  "warranty_end_date",
  "notes",
];

const LICENSE_TABLE_COLUMNS = [
  "license_name",
  "vendor",
  "license_type",
  "status",
  "quantity_total",
  "quantity_assigned",
  "expiry_date",
  "renewal_date",
  "notes",
];

const LICENSE_HEADER_ALIASES = {
  license_name: ["licensename", "license", "name", "ชื่อไลเซนส์"],
  vendor: ["vendor", "provider", "ผู้ให้บริการ"],
  license_type: ["licensetype", "type", "ประเภทไลเซนส์"],
  status: ["status", "สถานะ"],
  quantity_total: ["quantitytotal", "total", "seatstotal", "จำนวนทั้งหมด", "qtytotal"],
  quantity_assigned: ["quantityassigned", "assigned", "usedseats", "จำนวนใช้งาน", "qtyused"],
  expiry_date: ["expirydate", "expiredate", "วันหมดอายุ", "expire"],
  renewal_date: ["renewaldate", "renewdate", "วันต่ออายุ"],
  notes: ["notes", "remark", "หมายเหตุ"],
};

const CATEGORY_OPTIONS = [
  { value: "PC", label: "พีซี (PC)" },
  { value: "Notebook", label: "โน้ตบุ๊ก (Notebook)" },
  { value: "Monitor", label: "จอภาพ (Monitor)" },
  { value: "Printer", label: "เครื่องพิมพ์ (Printer)" },
];

const CORE_CATEGORY_KEYWORDS = {
  pc: [
    "pc",
    "desktop",
    "computer",
    "workstation",
    "all in one",
    "aoi",
    "คอม",
    "คอมพิวเตอร์",
    "เดสก์ท็อป",
    "เดสกทอป",
    "พีซี",
  ],
  notebook: [
    "notebook",
    "laptop",
    "macbook",
    "โน้ตบุ๊ก",
    "โน๊ตบุ๊ก",
    "โน้ตบุ๊ค",
    "โน๊ตบุ๊ค",
    "แล็ปท็อป",
    "แลปทอป",
  ],
  monitor: ["monitor", "display", "screen", "จอ", "จอมอนิเตอร์", "มอนิเตอร์", "moniter"],
  printer: ["printer", "print", "เครื่องพิมพ์", "พรินเตอร์", "ปริ้นเตอร์", "ปริ้น"],
};

const DETAIL_FIELDS = [
  { key: "asset_tag", label: "รหัสทรัพย์สิน" },
  { key: "asset_name", label: "ชื่ออุปกรณ์" },
  { key: "asset_category", label: "หมวดหมู่" },
  { key: "brand", label: "ยี่ห้อ" },
  { key: "model", label: "รุ่น" },
  { key: "serial_number", label: "เลขซีเรียล" },
  { key: "status", label: "สถานะ" },
  { key: "location", label: "ตำแหน่งที่ตั้ง" },
  { key: "owner_name", label: "ผู้ใช้งาน" },
  { key: "purchase_date", label: "วันที่ซื้อ" },
  { key: "warranty_end_date", label: "วันหมดประกัน" },
  { key: "notes", label: "หมายเหตุ" },
];

const ASSET_ACTIVITY_TRACKED_FIELDS = DETAIL_FIELDS.map((field) => field.key);

const LICENSE_DETAIL_FIELDS = [
  { key: "license_name", label: "ชื่อไลเซนส์" },
  { key: "vendor", label: "ผู้ให้บริการ" },
  { key: "license_type", label: "ประเภทไลเซนส์" },
  { key: "status", label: "สถานะ" },
  { key: "quantity_total", label: "จำนวนทั้งหมด" },
  { key: "quantity_assigned", label: "จำนวนที่ใช้งาน" },
  { key: "expiry_date", label: "วันหมดอายุ" },
  { key: "renewal_date", label: "วันต่ออายุ" },
  { key: "notes", label: "หมายเหตุ" },
];

const EMPTY_FORM = {
  asset_tag: "",
  asset_name: "",
  asset_category: "PC",
  brand: "",
  model: "",
  serial_number: "",
  status: "in_use",
  location: "",
  owner_name: "",
  purchase_date: "",
  warranty_end_date: "",
  notes: "",
};

function getAssetFormData(item = {}) {
  return {
    asset_tag: item.asset_tag || "",
    asset_name: item.asset_name || "",
    asset_category: normalizeAssetCategory(item.asset_category) || "PC",
    brand: item.brand || "",
    model: item.model || "",
    serial_number: item.serial_number || "",
    status: normalizeStatus(item.status),
    location: item.location || "",
    owner_name: item.owner_name || "",
    purchase_date: item.purchase_date || "",
    warranty_end_date: item.warranty_end_date || "",
    notes: item.notes || "",
  };
}

const EMPTY_LICENSE_FORM = {
  license_name: "",
  vendor: "",
  license_type: "",
  status: "active",
  quantity_total: "1",
  quantity_assigned: "0",
  expiry_date: "",
  renewal_date: "",
  notes: "",
};

function normalizeText(value) {
  return String(value || "").trim();
}

function sanitizePathSegment(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isImageFile(file) {
  return String(file?.type || "").startsWith("image/");
}

function getClipboardImageFiles(event, namePrefix = "asset-evidence-paste") {
  const itemFiles = Array.from(event?.clipboardData?.items || [])
    .filter((item) => String(item?.type || "").startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  const fileFallbacks = Array.from(event?.clipboardData?.files || []).filter(isImageFile);

  return (itemFiles.length > 0 ? itemFiles : fileFallbacks).map((file, index) => (
    file?.name
      ? file
      : new File([file], `${namePrefix}-${Date.now()}-${index}.png`, {
          type: file?.type || "image/png",
        })
  ));
}

function createPendingAssetEvidenceEntry(file) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    file,
    previewUrl: isImageFile(file) ? URL.createObjectURL(file) : "",
  };
}

function revokePendingPreview(entry) {
  if (entry?.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(entry.previewUrl);
  }
}

function isAssetEvidenceSchemaError(error) {
  const code = String(error?.code || "");
  const status = Number(error?.status || 0);
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();

  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST200" ||
    code === "PGRST204" ||
    status === 404 ||
    text.includes("it_asset_attachments") ||
    text.includes("it_asset_activity_logs") ||
    text.includes("it-asset-evidence") ||
    text.includes("bucket not found") ||
    text.includes("could not find a relationship")
  );
}

function getStorageObjectPath(publicUrl, bucketName) {
  const url = normalizeText(publicUrl);
  if (!url || !bucketName) return "";

  const encodedBucket = encodeURIComponent(bucketName);
  const markers = [
    `/storage/v1/object/public/${encodedBucket}/`,
    `/storage/v1/object/public/${bucketName}/`,
    `/object/public/${encodedBucket}/`,
    `/object/public/${bucketName}/`,
  ];

  for (const marker of markers) {
    const markerIndex = url.indexOf(marker);
    if (markerIndex >= 0) {
      return decodeURIComponent(url.slice(markerIndex + marker.length));
    }
  }

  return "";
}

function sortByCreatedDesc(left, right) {
  return new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime();
}

function sortByAssetCodeNatural(left, right) {
  const codeCompare = normalizeText(left?.asset_tag).localeCompare(
    normalizeText(right?.asset_tag),
    "en",
    { numeric: true, sensitivity: "base" },
  );
  if (codeCompare !== 0) return codeCompare;

  return normalizeText(left?.asset_name).localeCompare(
    normalizeText(right?.asset_name),
    "th",
    { numeric: true, sensitivity: "base" },
  );
}

function getAssetEvidenceAttachments(asset) {
  return (Array.isArray(asset?.it_asset_attachments) ? asset.it_asset_attachments : [])
    .filter((item) => item?.file_url)
    .sort(sortByCreatedDesc);
}

function getAssetActivityLogs(asset) {
  return (Array.isArray(asset?.it_asset_activity_logs) ? asset.it_asset_activity_logs : [])
    .sort(sortByCreatedDesc);
}

function normalizeAssetRecord(row) {
  return {
    ...row,
    it_asset_attachments: getAssetEvidenceAttachments(row),
    it_asset_activity_logs: getAssetActivityLogs(row),
  };
}

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "");
}

function normalizeCategorySource(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAssetCategory(value) {
  const source = normalizeCategorySource(value);
  if (!source) return "";
  if (CORE_CATEGORY_KEYWORDS.pc.some((keyword) => source.includes(keyword))) return "PC";
  if (CORE_CATEGORY_KEYWORDS.notebook.some((keyword) => source.includes(keyword))) return "Notebook";
  if (CORE_CATEGORY_KEYWORDS.monitor.some((keyword) => source.includes(keyword))) return "Monitor";
  if (CORE_CATEGORY_KEYWORDS.printer.some((keyword) => source.includes(keyword))) return "Printer";
  return "";
}

function detectCoreCategory(item) {
  const normalizedCategory = normalizeAssetCategory(item?.asset_category);
  if (normalizedCategory === "PC") return "pc";
  if (normalizedCategory === "Notebook") return "notebook";
  if (normalizedCategory === "Monitor") return "monitor";
  if (normalizedCategory === "Printer") return "printer";

  const source = normalizeCategorySource(`${item?.asset_name || ""} ${item?.model || ""}`);
  if (!source) return "";

  if (CORE_CATEGORY_KEYWORDS.pc.some((keyword) => source.includes(keyword))) return "pc";
  if (CORE_CATEGORY_KEYWORDS.notebook.some((keyword) => source.includes(keyword))) return "notebook";
  if (CORE_CATEGORY_KEYWORDS.monitor.some((keyword) => source.includes(keyword))) return "monitor";
  if (CORE_CATEGORY_KEYWORDS.printer.some((keyword) => source.includes(keyword))) return "printer";
  return "";
}

function normalizeOptionalText(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeStatus(value) {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  if (!normalized) return "in_use";
  if (STATUS_OPTIONS.some((item) => item.value === normalized)) return normalized;

  if (
    [
      "broken",
      "damage",
      "damaged",
      "defect",
      "faulty",
      "เสีย",
      "เสียหาย",
      "พัง",
      "ชำรุด",
      "ใช้งานไม่ได้",
      "ใช้ไม่ได้",
    ].includes(normalized)
  ) {
    return "broken";
  }
  if (["repair", "maintenance", "fixing", "ซ่อม", "กำลังซ่อม", "ส่งซ่อม"].includes(normalized)) {
    return "repair";
  }
  if (["retired", "decommissioned", "disposed", "ปลดระวาง", "ตัดจำหน่าย", "จำหน่าย"].includes(normalized)) {
    return "retired";
  }
  if (["lost", "missing", "สูญหาย", "หาย"].includes(normalized)) {
    return "lost";
  }
  if (["assigned", "มอบหมาย", "มอบหมายแล้ว"].includes(normalized)) {
    return "assigned";
  }
  if (["spare", "สำรอง"].includes(normalized)) {
    return "spare";
  }
  if (["available", "stock", "ready", "ว่าง", "พร้อมใช้", "พร้อมใช้งาน"].includes(normalized)) {
    return "available";
  }
  if (["active", "inuse", "in_use", "ใช้งาน", "ใช้งานอยู่", "ใช้งานได้"].includes(normalized)) {
    return "in_use";
  }
  return "in_use";
}

function isAssetBrokenStatus(status) {
  const normalized = normalizeStatus(status);
  return ASSET_BROKEN_STATUS_SET.has(normalized);
}

function normalizeInteger(value, fallback = 0) {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned) return fallback;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(Math.round(parsed), 0);
}

function normalizeLicenseStatus(value) {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (LICENSE_STATUS_OPTIONS.some((item) => item.value === normalized)) return normalized;
  if (["pending", "renewal", "pendingrenewal"].includes(normalized)) return "pending_renewal";
  if (["inactive", "disable", "disabled", "ใช้งานไม่ได้"].includes(normalized)) return "inactive";
  if (["expire", "expired", "หมดอายุ"].includes(normalized)) return "expired";
  return "active";
}

function isLicenseUsableStatus(status) {
  return LICENSE_USABLE_STATUS_SET.has(normalizeLicenseStatus(status));
}

function parseExcelSerialDate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const parsed = XLSX.SSF.parse_date_code(numeric);
  if (!parsed?.y || !parsed?.m || !parsed?.d) return null;
  const date = new Date(parsed.y, parsed.m - 1, parsed.d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeDateValue(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    return parseExcelSerialDate(value);
  }

  const text = normalizeText(value);
  if (!text) return null;

  const serialAsDate = parseExcelSerialDate(text);
  if (serialAsDate) return serialAsDate;

  const directDate = new Date(text);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString().slice(0, 10);
  }

  const ddmmyyyy = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]);
    const year = Number(ddmmyyyy[3].length === 2 ? `20${ddmmyyyy[3]}` : ddmmyyyy[3]);
    const fallbackDate = new Date(year, month - 1, day);
    if (!Number.isNaN(fallbackDate.getTime())) {
      return fallbackDate.toISOString().slice(0, 10);
    }
  }

  return null;
}

function mapRowToPayload(rawRow) {
  const normalizedRow = {};
  Object.entries(rawRow || {}).forEach(([key, value]) => {
    normalizedRow[normalizeHeader(key)] = value;
  });

  const pick = (field) => {
    const aliases = HEADER_ALIASES[field] || [];
    for (const alias of aliases) {
      const value = normalizedRow[alias];
      if (value !== undefined && normalizeText(value) !== "") {
        return value;
      }
    }
    return "";
  };

  const payload = {
    asset_tag: normalizeText(pick("asset_tag")),
    asset_name: normalizeText(pick("asset_name")),
    asset_category:
      normalizeAssetCategory(`${pick("asset_category")} ${pick("asset_name")} ${pick("model")}`) || "PC",
    brand: normalizeOptionalText(pick("brand")),
    model: normalizeOptionalText(pick("model")),
    serial_number: normalizeOptionalText(pick("serial_number")),
    status: normalizeStatus(pick("status")),
    location: normalizeOptionalText(pick("location")),
    owner_name: normalizeOptionalText(pick("owner_name")),
    purchase_date: normalizeDateValue(pick("purchase_date")),
    warranty_end_date: normalizeDateValue(pick("warranty_end_date")),
    notes: normalizeOptionalText(pick("notes")),
  };

  return payload;
}

function mapLicenseRowToPayload(rawRow) {
  const normalizedRow = {};
  Object.entries(rawRow || {}).forEach(([key, value]) => {
    normalizedRow[normalizeHeader(key)] = value;
  });

  const pick = (field) => {
    const aliases = LICENSE_HEADER_ALIASES[field] || [];
    for (const alias of aliases) {
      const value = normalizedRow[alias];
      if (value !== undefined && normalizeText(value) !== "") {
        return value;
      }
    }
    return "";
  };

  const quantityTotal = normalizeInteger(pick("quantity_total"), 1);
  const quantityAssigned = Math.min(normalizeInteger(pick("quantity_assigned"), 0), quantityTotal);

  return {
    license_name: normalizeText(pick("license_name")),
    vendor: normalizeOptionalText(pick("vendor")),
    license_type: normalizeOptionalText(pick("license_type")),
    status: normalizeLicenseStatus(pick("status")),
    quantity_total: quantityTotal,
    quantity_assigned: quantityAssigned,
    expiry_date: normalizeDateValue(pick("expiry_date")),
    renewal_date: normalizeDateValue(pick("renewal_date")),
    notes: normalizeOptionalText(pick("notes")),
  };
}

function formatDate(value, locale = "th-TH") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale);
}

function formatDateTime(value, locale = "th-TH") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDetailValue(item, key, { locale = "th-TH", statusLabels = {} } = {}) {
  if (key === "purchase_date" || key === "warranty_end_date") {
    return formatDate(item?.[key], locale);
  }
  if (key === "status") {
    const normalized = normalizeStatus(item?.[key]);
    return statusLabels[normalized] || normalizeText(item?.[key]) || "-";
  }
  return normalizeText(item?.[key]) || "-";
}

function formatLicenseDetailValue(
  item,
  key,
  { locale = "th-TH", numberFormatter = new Intl.NumberFormat("th-TH"), statusLabels = {} } = {},
) {
  if (key === "expiry_date" || key === "renewal_date") {
    return formatDate(item?.[key], locale);
  }
  if (key === "quantity_total" || key === "quantity_assigned") {
    return numberFormatter.format(normalizeInteger(item?.[key], 0));
  }
  if (key === "status") {
    const normalized = normalizeLicenseStatus(item?.[key]);
    return statusLabels[normalized] || normalizeText(item?.[key]) || "-";
  }
  return normalizeText(item?.[key]) || "-";
}

function formatAssetStatusLabel(status, statusLabels = {}) {
  const normalized = normalizeStatus(status);
  return statusLabels[normalized] || normalizeText(status) || "-";
}

function formatAssetFieldValue(item, key, { locale = "th-TH", statusLabels = {} } = {}) {
  if (key === "purchase_date" || key === "warranty_end_date") {
    return normalizeDateValue(item?.[key]) || "";
  }
  if (key === "status") {
    return formatAssetStatusLabel(item?.[key], statusLabels);
  }
  if (key === "asset_category") {
    return normalizeAssetCategory(item?.[key]) || normalizeText(item?.[key]);
  }
  return normalizeText(item?.[key]);
}

function buildAssetChangeEntries(beforeAsset, afterAsset, { fieldLabels = {}, statusLabels = {}, locale = "th-TH" } = {}) {
  if (!beforeAsset) return [];

  return ASSET_ACTIVITY_TRACKED_FIELDS.map((key) => {
    const beforeValue = formatAssetFieldValue(beforeAsset, key, { locale, statusLabels });
    const afterValue = formatAssetFieldValue(afterAsset, key, { locale, statusLabels });
    if (beforeValue === afterValue) return null;
    return {
      key,
      label: fieldLabels[key] || key,
      before: beforeValue || "-",
      after: afterValue || "-",
    };
  }).filter(Boolean);
}

function formatLicenseStatusLabel(status, statusLabels = {}) {
  const normalized = normalizeLicenseStatus(status);
  return statusLabels[normalized] || normalizeText(status) || "-";
}

function getAssetStatusChipClass(status) {
  const normalized = normalizeStatus(status);
  if (["in_use", "assigned", "available", "spare"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "repair") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["broken", "retired", "lost"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getLicenseStatusChipClass(status) {
  const normalized = normalizeLicenseStatus(status);
  if (["active", "pending_renewal"].includes(normalized)) {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }
  if (["inactive", "expired"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function AssetsManagementWorkspace({ embedded = false, theme = "light" }) {
  const { language, tt } = useScopedI18n(EXECUTIVE_ASSETS_TRANSLATIONS);
  const fileInputRef = useRef(null);
  const licenseFileInputRef = useRef(null);
  const assetEvidenceInputRef = useRef(null);
  const detailAssetEvidenceInputRef = useRef(null);
  const assetFormRef = useRef(null);
  const assetListRef = useRef(null);
  const licenseListRef = useRef(null);
  const notebookPanelRef = useRef(null);
  const pendingAssetEvidenceRef = useRef([]);
  const [activeSection, setActiveSection] = useState("assets");
  const [userRole, setUserRole] = useState("");
  const [currentProfile, setCurrentProfile] = useState(null);
  const [canHardDelete, setCanHardDelete] = useState(false);
  const [assets, setAssets] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [licenseImporting, setLicenseImporting] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [licenseEditingId, setLicenseEditingId] = useState("");
  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [licenseFormOpen, setLicenseFormOpen] = useState(false);
  const [notebookCreateRequest, setNotebookCreateRequest] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailEvidenceUploading, setDetailEvidenceUploading] = useState(false);
  const [detailFormData, setDetailFormData] = useState(EMPTY_FORM);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [licenseSearchQuery, setLicenseSearchQuery] = useState("");
  const [showArchivedAssets, setShowArchivedAssets] = useState(false);
  const [showArchivedLicenses, setShowArchivedLicenses] = useState(false);
  const [assetCategoryFilter, setAssetCategoryFilter] = useState("all");
  const [assetStatusFilter, setAssetStatusFilter] = useState("all");
  const [licenseStatusFilter, setLicenseStatusFilter] = useState("all");
  const [assetActionId, setAssetActionId] = useState("");
  const [assetBulkAction, setAssetBulkAction] = useState("");
  const [assetExporting, setAssetExporting] = useState(false);
  const [licenseActionId, setLicenseActionId] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [assetEvidenceReady, setAssetEvidenceReady] = useState(true);
  const [assetEvidenceAttachments, setAssetEvidenceAttachments] = useState([]);
  const [removedAssetEvidence, setRemovedAssetEvidence] = useState([]);
  const [pendingAssetEvidence, setPendingAssetEvidence] = useState([]);
  const [assetPreviewState, setAssetPreviewState] = useState({ attachments: [], initialIndex: 0 });
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [licenseFormData, setLicenseFormData] = useState(EMPTY_LICENSE_FORM);
  const locale = language === "th" ? "th-TH" : "en-US";
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formatNumber = useCallback(
    (value) => numberFormatter.format(Number(value || 0)),
    [numberFormatter],
  );
  const assetInputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#2b59b0] focus:ring-4 focus:ring-blue-100/70";
  const assetFilterInputClass = "min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#2b59b0] focus:ring-2 focus:ring-blue-100/80 sm:text-sm";
  const assetStickyTopClass = embedded ? "top-[61px] sm:top-[65px]" : "top-2";
  const assetStatusOptions = useMemo(
    () => STATUS_OPTIONS.map((item) => ({ ...item, label: tt(`status.${item.value}`) })),
    [tt],
  );
  const licenseStatusOptions = useMemo(
    () =>
      LICENSE_STATUS_OPTIONS.map((item) => ({
        ...item,
        label: tt(`licenseStatus.${item.value}`),
      })),
    [tt],
  );
  const categoryOptions = useMemo(
    () => CATEGORY_OPTIONS.map((item) => ({ ...item, label: tt(`category.${item.value}`) })),
    [tt],
  );
  const assetStatusLabels = useMemo(
    () => Object.fromEntries(assetStatusOptions.map((item) => [item.value, item.label])),
    [assetStatusOptions],
  );
  const licenseStatusLabels = useMemo(
    () => Object.fromEntries(licenseStatusOptions.map((item) => [item.value, item.label])),
    [licenseStatusOptions],
  );
  const assetDetailFields = useMemo(
    () => DETAIL_FIELDS.map((field) => ({ ...field, label: tt(`assetFields.${field.key}`) })),
    [tt],
  );
  const licenseDetailFields = useMemo(
    () =>
      LICENSE_DETAIL_FIELDS.map((field) => ({
        ...field,
        label: tt(`licenseFields.${field.key}`),
      })),
    [tt],
  );

  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("role, full_name, employee_code")
          .eq("id", user.id)
          .maybeSingle();
        if (error || !mounted) return;

        const role = normalizeText(data?.role).toLowerCase();
        setUserRole(role);
        setCurrentProfile({
          id: user.id,
          name: normalizeText(data?.full_name) || normalizeText(user.email) || "IT Admin",
          employeeCode: normalizeText(data?.employee_code),
          email: normalizeText(user.email),
        });
        setCanHardDelete(role === "admin" || role === "it_support" || role === "it_manager");
      } catch (error) {
        console.error("Load profile role error:", error);
      }
    };

    void loadRole();
    return () => {
      mounted = false;
    };
  }, []);

  const loadAssets = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("it_assets")
        .select("*, it_asset_attachments(*), it_asset_activity_logs(*)")
        .order("updated_at", { ascending: false });

      if (error) {
        if (isAssetEvidenceSchemaError(error)) {
          setAssetEvidenceReady(false);
          const fallback = await supabase
            .from("it_assets")
            .select("*")
            .order("updated_at", { ascending: false });
          if (fallback.error) throw fallback.error;
          setAssets(Array.isArray(fallback.data) ? fallback.data.map(normalizeAssetRecord) : []);
          return;
        }
        throw error;
      }

      setAssetEvidenceReady(true);
      setAssets(Array.isArray(data) ? data.map(normalizeAssetRecord) : []);
    } catch (error) {
      console.error("Load it_assets error:", error);
      toast.error(error?.message || tt("toast.loadAssetsError"));
      setAssets([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tt]);

  const loadLicenses = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLicenseLoading(true);
    try {
      const { data, error } = await supabase
        .from("it_licenses")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setLicenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load it_licenses error:", error);
      toast.error(error?.message || tt("toast.loadLicensesError"));
      setLicenses([]);
    } finally {
      if (!silent) setLicenseLoading(false);
    }
  }, [tt]);

  useEffect(() => {
    void loadAssets();
    void loadLicenses();
  }, [loadAssets, loadLicenses]);

  useEffect(() => {
    pendingAssetEvidenceRef.current = pendingAssetEvidence;
  }, [pendingAssetEvidence]);

  useEffect(() => {
    return () => {
      pendingAssetEvidenceRef.current.forEach(revokePendingPreview);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("it-assets-management-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "it_assets" },
        () => {
          void loadAssets({ silent: true });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "it_licenses" },
        () => {
          void loadLicenses({ silent: true });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "it_asset_attachments" },
        () => {
          void loadAssets({ silent: true });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "it_asset_activity_logs" },
        () => {
          void loadAssets({ silent: true });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAssets, loadLicenses]);

  const filteredAssets = useMemo(() => {
    const query = normalizeText(searchQuery).toLowerCase();
    const includeArchivedByStatus = ["retired", "lost"].includes(assetStatusFilter);
    const shouldIncludeArchived = showArchivedAssets || includeArchivedByStatus || Boolean(query);
    let scopedAssets = shouldIncludeArchived
      ? assets
      : assets.filter((item) => !["retired", "lost"].includes(normalizeStatus(item?.status)));
    if (assetCategoryFilter !== "all") {
      scopedAssets = scopedAssets.filter(
        (item) => normalizeAssetCategory(item?.asset_category) === assetCategoryFilter,
      );
    }
    if (assetStatusFilter !== "all") {
      scopedAssets = scopedAssets.filter((item) => normalizeStatus(item?.status) === assetStatusFilter);
    }
    const matchedAssets = !query ? scopedAssets : scopedAssets.filter((item) => {
      const source = [
        item?.asset_tag,
        item?.asset_name,
        item?.asset_category,
        item?.brand,
        item?.model,
        item?.serial_number,
        item?.status,
        item?.location,
        item?.owner_name,
      ]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");
      return source.includes(query);
    });

    return [...matchedAssets].sort(sortByAssetCodeNatural);
  }, [assets, searchQuery, showArchivedAssets, assetCategoryFilter, assetStatusFilter]);

  const autoIncludedArchivedAssets = !showArchivedAssets && (
    Boolean(normalizeText(searchQuery)) || ["retired", "lost"].includes(assetStatusFilter)
  );

  const filteredLicenses = useMemo(() => {
    const query = normalizeText(licenseSearchQuery).toLowerCase();
    let scopedLicenses = showArchivedLicenses
      ? licenses
      : licenses.filter((item) => !["inactive", "expired"].includes(normalizeLicenseStatus(item?.status)));
    if (licenseStatusFilter !== "all") {
      scopedLicenses = scopedLicenses.filter(
        (item) => normalizeLicenseStatus(item?.status) === licenseStatusFilter,
      );
    }
    if (!query) return scopedLicenses;

    return scopedLicenses.filter((item) => {
      const source = [
        item?.license_name,
        item?.vendor,
        item?.license_type,
        item?.status,
        item?.notes,
      ]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");
      return source.includes(query);
    });
  }, [licenses, licenseSearchQuery, showArchivedLicenses, licenseStatusFilter]);

  const liveSummary = useMemo(() => {
    return assets.reduce(
      (summary, item) => {
        summary.total += 1;
        if (isAssetBrokenStatus(item?.status)) {
          summary.broken += 1;
        } else {
          summary.usable += 1;
        }
        const category = detectCoreCategory(item);
        if (category) summary[category] += 1;
        return summary;
      },
      { total: 0, usable: 0, broken: 0, pc: 0, notebook: 0, monitor: 0, printer: 0 },
    );
  }, [assets]);

  const liveLicenseSummary = useMemo(() => {
    return licenses.reduce(
      (summary, item) => {
        const totalSeats = normalizeInteger(item?.quantity_total, 0);
        summary.records += 1;
        summary.total += totalSeats;
        if (isLicenseUsableStatus(item?.status)) {
          summary.usable += totalSeats;
        } else {
          summary.broken += totalSeats;
        }
        summary.assigned += Math.min(normalizeInteger(item?.quantity_assigned, 0), totalSeats);
        return summary;
      },
      { records: 0, total: 0, usable: 0, broken: 0, assigned: 0 },
    );
  }, [licenses]);

  const filteredAssetSummary = useMemo(() => {
    return filteredAssets.reduce(
      (summary, item) => {
        summary.total += 1;
        if (isAssetBrokenStatus(item?.status)) {
          summary.broken += 1;
        } else {
          summary.usable += 1;
        }
        return summary;
      },
      { total: 0, usable: 0, broken: 0 },
    );
  }, [filteredAssets]);

  const filteredLicenseSummary = useMemo(() => {
    return filteredLicenses.reduce(
      (summary, item) => {
        const totalSeats = normalizeInteger(item?.quantity_total, 0);
        summary.total += totalSeats;
        if (isLicenseUsableStatus(item?.status)) {
          summary.usable += totalSeats;
        } else {
          summary.broken += totalSeats;
        }
        return summary;
      },
      { total: 0, usable: 0, broken: 0 },
    );
  }, [filteredLicenses]);

  const recentAssetActivities = useMemo(() => {
    return assets
      .flatMap((asset) =>
        getAssetActivityLogs(asset).map((log) => ({
          ...log,
          asset,
        })),
      )
      .sort(sortByCreatedDesc)
      .slice(0, 80);
  }, [assets]);

  const selectedAssetIdSet = useMemo(() => new Set(selectedAssetIds), [selectedAssetIds]);

  const selectedAssets = useMemo(
    () => assets.filter((item) => selectedAssetIdSet.has(item.id)),
    [assets, selectedAssetIdSet],
  );

  const selectedFilteredAssetCount = useMemo(() => {
    return filteredAssets.reduce((count, item) => {
      if (selectedAssetIdSet.has(item.id)) return count + 1;
      return count;
    }, 0);
  }, [filteredAssets, selectedAssetIdSet]);

  const allFilteredAssetsSelected =
    filteredAssets.length > 0 && selectedFilteredAssetCount === filteredAssets.length;

  useEffect(() => {
    if (!selectedAsset?.id) return;
    const current = assets.find((item) => item.id === selectedAsset.id);
    if (!current) {
      setSelectedAsset(null);
      return;
    }
    if (current !== selectedAsset) {
      setSelectedAsset(current);
    }
  }, [assets, selectedAsset]);

  useEffect(() => {
    const availableIdSet = new Set(assets.map((item) => item.id));
    setSelectedAssetIds((prev) => prev.filter((id) => availableIdSet.has(id)));
  }, [assets]);

  useEffect(() => {
    if (!selectedLicense?.id) return;
    const current = licenses.find((item) => item.id === selectedLicense.id);
    if (!current) {
      setSelectedLicense(null);
      return;
    }
    if (current !== selectedLicense) {
      setSelectedLicense(current);
    }
  }, [licenses, selectedLicense]);

  const resetForm = useCallback(() => {
    pendingAssetEvidenceRef.current.forEach(revokePendingPreview);
    pendingAssetEvidenceRef.current = [];
    if (assetEvidenceInputRef.current) assetEvidenceInputRef.current.value = "";
    setEditingId("");
    setFormData(EMPTY_FORM);
    setAssetEvidenceAttachments([]);
    setRemovedAssetEvidence([]);
    setPendingAssetEvidence([]);
  }, []);

  const resetLicenseForm = useCallback(() => {
    setLicenseEditingId("");
    setLicenseFormData(EMPTY_LICENSE_FORM);
  }, []);

  const handleToggleAssetSelection = useCallback((id, checked) => {
    setSelectedAssetIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((itemId) => itemId !== id);
    });
  }, []);

  const handleToggleSelectAllFilteredAssets = useCallback(
    (checked) => {
      const filteredIds = filteredAssets.map((item) => item.id);
      const filteredIdSet = new Set(filteredIds);

      setSelectedAssetIds((prev) => {
        if (checked) {
          return [...new Set([...prev, ...filteredIds])];
        }
        return prev.filter((id) => !filteredIdSet.has(id));
      });
    },
    [filteredAssets],
  );

  const handleClearSelectedAssets = useCallback(() => {
    setSelectedAssetIds([]);
  }, []);

  const getValidAssetEvidenceFiles = (files) => {
    const entries = Array.from(files || []);
    if (entries.length === 0) return [];
    const invalidFile = entries.find((file) => !isImageFile(file));
    if (invalidFile) {
      toast.error(tt("toast.imageOnly"));
      return [];
    }
    const oversized = entries.find((file) => Number(file?.size || 0) > ASSET_EVIDENCE_MAX_SIZE);
    if (oversized) {
      toast.error(tt("toast.fileTooLarge", { name: oversized.name || "image" }));
      return [];
    }
    return entries;
  };

  const handleSelectAssetEvidence = (files) => {
    const entries = getValidAssetEvidenceFiles(files);
    if (entries.length === 0) return 0;
    setPendingAssetEvidence((prev) => [...prev, ...entries.map(createPendingAssetEvidenceEntry)]);
    return entries.length;
  };

  const handlePasteAssetEvidence = (event) => {
    const imageFiles = getClipboardImageFiles(event);

    if (imageFiles.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const addedCount = handleSelectAssetEvidence(imageFiles);
    if (addedCount > 0) {
      toast.success(tt("toast.evidencePasted", { count: addedCount }));
    }
  };

  const removePendingAssetEvidence = (entryId) => {
    setPendingAssetEvidence((prev) => {
      const next = [];
      prev.forEach((entry) => {
        if (entry.id === entryId) revokePendingPreview(entry);
        else next.push(entry);
      });
      return next;
    });
  };

  const handleRemoveExistingAssetEvidence = (attachment) => {
    if (!attachment?.id) return;
    setAssetEvidenceAttachments((prev) => prev.filter((item) => item.id !== attachment.id));
    setRemovedAssetEvidence((prev) => (prev.some((item) => item.id === attachment.id) ? prev : [...prev, attachment]));
  };

  const handleOpenAssetPreview = (attachments = [], initialIndex = 0) => {
    const previewAttachments = (Array.isArray(attachments) ? attachments : []).filter((item) => item?.file_url);
    if (previewAttachments.length === 0) return;
    const nextIndex = Math.min(Math.max(Number(initialIndex) || 0, 0), previewAttachments.length - 1);
    setAssetPreviewState({ attachments: previewAttachments, initialIndex: nextIndex });
  };

  const handleCloseAssetPreview = () => {
    setAssetPreviewState({ attachments: [], initialIndex: 0 });
  };

  const cleanupUploadedAssetEvidencePaths = async (paths) => {
    const safePaths = (Array.isArray(paths) ? paths : []).filter(Boolean);
    if (safePaths.length === 0) return;
    try {
      await supabase.storage.from(ASSET_EVIDENCE_BUCKET).remove(safePaths);
    } catch (error) {
      console.warn("Cleanup asset evidence upload error:", error);
    }
  };

  const uploadAssetEvidenceFiles = async ({ assetId, assetTag, files = [] }) => {
    const safeFiles = (Array.isArray(files) ? files : []).filter((file) => file instanceof File);
    if (!assetId || safeFiles.length === 0) return [];

    const uploadedPaths = [];
    const attachmentRows = [];
    try {
      for (const [index, file] of safeFiles.entries()) {
        const safeAssetTag = sanitizePathSegment(assetTag || assetId);
        const safeName = sanitizePathSegment(file?.name || `asset-evidence-${Date.now()}.jpg`);
        const filePath = `assets/${safeAssetTag}/${Date.now()}_${index}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from(ASSET_EVIDENCE_BUCKET)
          .upload(filePath, file, {
            upsert: false,
            contentType: file?.type || "image/jpeg",
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(ASSET_EVIDENCE_BUCKET).getPublicUrl(filePath);
        uploadedPaths.push(filePath);
        attachmentRows.push({
          asset_id: assetId,
          file_name: normalizeText(file?.name) || `asset-evidence-${index + 1}.jpg`,
          file_path: filePath,
          file_url: normalizeText(data?.publicUrl),
          mime_type: normalizeText(file?.type),
          file_size: Number(file?.size || 0) || 0,
          uploaded_by: currentProfile?.id || null,
        });
      }

      const { data, error } = await supabase
        .from("it_asset_attachments")
        .insert(attachmentRows)
        .select("*");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      await cleanupUploadedAssetEvidencePaths(uploadedPaths);
      if (isAssetEvidenceSchemaError(error)) setAssetEvidenceReady(false);
      throw error;
    }
  };

  const deleteAssetEvidenceFiles = async (attachments = []) => {
    const safeAttachments = (Array.isArray(attachments) ? attachments : []).filter((item) => item?.id);
    if (safeAttachments.length === 0) return;

    const ids = safeAttachments.map((item) => item.id);
    const paths = safeAttachments
      .map((item) => getStorageObjectPath(item.file_url, ASSET_EVIDENCE_BUCKET) || normalizeText(item.file_path))
      .filter(Boolean);

    const { error } = await supabase.from("it_asset_attachments").delete().in("id", ids);
    if (error) {
      if (isAssetEvidenceSchemaError(error)) setAssetEvidenceReady(false);
      throw error;
    }
    await cleanupUploadedAssetEvidencePaths(paths);
  };

  const insertAssetActivityLog = async ({ assetId, action, changes = [], afterAsset = null, evidenceAdded = 0, evidenceRemoved = 0 }) => {
    if (!assetId || !assetEvidenceReady) return;
    try {
      const { error } = await supabase.from("it_asset_activity_logs").insert({
        asset_id: assetId,
        action,
        changes: {
          fields: changes,
          evidence_added: evidenceAdded,
          evidence_removed: evidenceRemoved,
        },
        snapshot: afterAsset || {},
        created_by: currentProfile?.id || null,
        created_by_name: currentProfile?.name || null,
      });
      if (error) throw error;
    } catch (error) {
      if (isAssetEvidenceSchemaError(error)) {
        setAssetEvidenceReady(false);
        return;
      }
      console.warn("Insert asset activity log error:", error);
    }
  };

  const handleSaveAsset = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!assetEvidenceReady && (pendingAssetEvidence.length > 0 || removedAssetEvidence.length > 0)) {
      toast.error(tt("toast.evidenceMigrationMissing"));
      return;
    }

    const payload = {
      asset_tag: normalizeText(formData.asset_tag),
      asset_name: normalizeText(formData.asset_name),
      asset_category: normalizeAssetCategory(formData.asset_category) || "PC",
      brand: normalizeOptionalText(formData.brand),
      model: normalizeOptionalText(formData.model),
      serial_number: normalizeOptionalText(formData.serial_number),
      status: normalizeStatus(formData.status),
      location: normalizeOptionalText(formData.location),
      owner_name: normalizeOptionalText(formData.owner_name),
      purchase_date: normalizeDateValue(formData.purchase_date),
      warranty_end_date: normalizeDateValue(formData.warranty_end_date),
      notes: normalizeOptionalText(formData.notes),
    };

    if (!payload.asset_tag || !payload.asset_name) {
      toast.error(tt("toast.requireAsset"));
      return;
    }

    setSaving(true);
    try {
      const beforeAsset = editingId ? assets.find((item) => item.id === editingId) || null : null;
      const changeEntries = buildAssetChangeEntries(beforeAsset, payload, {
        fieldLabels: Object.fromEntries(assetDetailFields.map((field) => [field.key, field.label])),
        statusLabels: assetStatusLabels,
        locale,
      });
      const evidenceFiles = pendingAssetEvidence.map((entry) => entry.file).filter(Boolean);
      let savedAsset = null;

      if (editingId) {
        const { data, error } = await supabase.from("it_assets").update(payload).eq("id", editingId).select("*").single();
        if (error) throw error;
        savedAsset = data;
        toast.success(tt("toast.assetUpdated"));
      } else {
        const { data, error } = await supabase.from("it_assets").insert(payload).select("*").single();
        if (error) throw error;
        savedAsset = data;
        toast.success(tt("toast.assetCreated"));
      }

      if (removedAssetEvidence.length > 0) {
        await deleteAssetEvidenceFiles(removedAssetEvidence);
      }
      if (evidenceFiles.length > 0) {
        await uploadAssetEvidenceFiles({
          assetId: savedAsset?.id,
          assetTag: savedAsset?.asset_tag || payload.asset_tag,
          files: evidenceFiles,
        });
      }
      await insertAssetActivityLog({
        assetId: savedAsset?.id,
        action: editingId ? "updated" : "created",
        changes: changeEntries,
        afterAsset: savedAsset,
        evidenceAdded: evidenceFiles.length,
        evidenceRemoved: removedAssetEvidence.length,
      });

      resetForm();
      setAssetFormOpen(false);
      await loadAssets({ silent: true });
    } catch (error) {
      console.error("Save it_asset error:", error);
      toast.error(error?.message || (pendingAssetEvidence.length > 0 ? tt("toast.evidenceUploadError") : tt("toast.saveAssetError")));
    } finally {
      setSaving(false);
    }
  };

  const handleEditAsset = (item) => {
    pendingAssetEvidenceRef.current.forEach(revokePendingPreview);
    pendingAssetEvidenceRef.current = [];
    if (assetEvidenceInputRef.current) assetEvidenceInputRef.current.value = "";
    setEditingId(item.id);
    setFormData(getAssetFormData(item));
    setAssetEvidenceAttachments(getAssetEvidenceAttachments(item));
    setRemovedAssetEvidence([]);
    setPendingAssetEvidence([]);
    setActiveSection("assets");
    setAssetFormOpen(true);
  };

  const handleOpenNewAsset = () => {
    resetForm();
    setActiveSection("assets");
    setAssetFormOpen(true);
  };

  const handleCloseAssetForm = () => {
    if (saving) return;
    resetForm();
    setAssetFormOpen(false);
  };

  const handleOpenAssetRegistry = () => {
    setActiveSection("assets");
    window.requestAnimationFrame(() => {
      assetListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleOpenDetail = (item) => {
    setDetailEditMode(false);
    setDetailFormData(getAssetFormData(item));
    setSelectedAsset(item);
  };

  const handleCloseAssetDetail = () => {
    if (detailSaving || detailEvidenceUploading) return;
    setDetailEditMode(false);
    setSelectedAsset(null);
  };

  const uploadDetailAssetEvidence = async (files, { pasted = false } = {}) => {
    if (!selectedAsset?.id || detailEvidenceUploading) return;
    if (!assetEvidenceReady) {
      toast.error(tt("toast.evidenceMigrationMissing"));
      return;
    }

    const validFiles = getValidAssetEvidenceFiles(files);
    if (validFiles.length === 0) return;

    setDetailEvidenceUploading(true);
    try {
      const uploaded = await uploadAssetEvidenceFiles({
        assetId: selectedAsset.id,
        assetTag: selectedAsset.asset_tag,
        files: validFiles,
      });

      if (uploaded.length === 0) throw new Error(tt("toast.evidenceUploadError"));

      const assetId = selectedAsset.id;
      const mergeEvidence = (asset) => {
        const seen = new Set();
        const attachments = [...uploaded, ...getAssetEvidenceAttachments(asset)].filter((attachment) => {
          const key = attachment?.id || attachment?.file_path || attachment?.file_url;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return normalizeAssetRecord({ ...asset, it_asset_attachments: attachments });
      };
      const evidenceSnapshot = mergeEvidence(selectedAsset);

      setAssets((prev) => prev.map((item) => (item.id === assetId ? mergeEvidence(item) : item)));
      setSelectedAsset((prev) => (prev?.id === assetId ? mergeEvidence(prev) : prev));

      await insertAssetActivityLog({
        assetId,
        action: "evidence",
        afterAsset: evidenceSnapshot,
        evidenceAdded: uploaded.length,
      });

      toast.success(tt(pasted ? "toast.evidencePasted" : "toast.evidenceAdded", { count: uploaded.length }));
      await loadAssets({ silent: true });
    } catch (error) {
      console.error("Upload evidence from asset detail error:", error);
      toast.error(error?.message || tt("toast.evidenceUploadError"));
    } finally {
      setDetailEvidenceUploading(false);
      if (detailAssetEvidenceInputRef.current) detailAssetEvidenceInputRef.current.value = "";
    }
  };

  const handlePasteDetailAssetEvidence = (event) => {
    const imageFiles = getClipboardImageFiles(event, "asset-detail-evidence-paste");
    if (imageFiles.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    void uploadDetailAssetEvidence(imageFiles, { pasted: true });
  };

  const handleStartDetailEdit = () => {
    if (!selectedAsset) return;
    setDetailFormData(getAssetFormData(selectedAsset));
    setDetailEditMode(true);
  };

  const handleCancelDetailEdit = () => {
    setDetailFormData(getAssetFormData(selectedAsset));
    setDetailEditMode(false);
  };

  const handleSaveDetailAsset = async (event) => {
    event.preventDefault();
    if (detailSaving || !selectedAsset?.id) return;

    const payload = {
      asset_tag: normalizeText(detailFormData.asset_tag),
      asset_name: normalizeText(detailFormData.asset_name),
      asset_category: normalizeAssetCategory(detailFormData.asset_category) || "PC",
      brand: normalizeOptionalText(detailFormData.brand),
      model: normalizeOptionalText(detailFormData.model),
      serial_number: normalizeOptionalText(detailFormData.serial_number),
      status: normalizeStatus(detailFormData.status),
      location: normalizeOptionalText(detailFormData.location),
      owner_name: normalizeOptionalText(detailFormData.owner_name),
      purchase_date: normalizeDateValue(detailFormData.purchase_date),
      warranty_end_date: normalizeDateValue(detailFormData.warranty_end_date),
      notes: normalizeOptionalText(detailFormData.notes),
    };

    if (!payload.asset_tag || !payload.asset_name) {
      toast.error(tt("toast.requireAsset"));
      return;
    }

    setDetailSaving(true);
    try {
      const beforeAsset = selectedAsset;
      const changeEntries = buildAssetChangeEntries(beforeAsset, payload, {
        fieldLabels: Object.fromEntries(assetDetailFields.map((field) => [field.key, field.label])),
        statusLabels: assetStatusLabels,
        locale,
      });
      const { data, error } = await supabase
        .from("it_assets")
        .update(payload)
        .eq("id", selectedAsset.id)
        .select("*")
        .single();
      if (error) throw error;

      const savedAsset = normalizeAssetRecord({
        ...beforeAsset,
        ...data,
        it_asset_attachments: getAssetEvidenceAttachments(beforeAsset),
        it_asset_activity_logs: getAssetActivityLogs(beforeAsset),
      });

      await insertAssetActivityLog({
        assetId: savedAsset.id,
        action: "updated",
        changes: changeEntries,
        afterAsset: savedAsset,
      });

      setAssets((prev) => prev.map((item) => (item.id === savedAsset.id ? savedAsset : item)));
      setSelectedAsset(savedAsset);
      setDetailFormData(getAssetFormData(savedAsset));
      setDetailEditMode(false);
      toast.success(tt("toast.assetUpdated"));
      await loadAssets({ silent: true });
    } catch (error) {
      console.error("Save asset from detail popup error:", error);
      toast.error(error?.message || tt("toast.saveAssetError"));
    } finally {
      setDetailSaving(false);
    }
  };

  const handleSaveLicense = async (event) => {
    event.preventDefault();
    if (licenseSaving) return;

    const quantityTotal = normalizeInteger(licenseFormData.quantity_total, 1);
    const payload = {
      license_name: normalizeText(licenseFormData.license_name),
      vendor: normalizeOptionalText(licenseFormData.vendor),
      license_type: normalizeOptionalText(licenseFormData.license_type),
      status: normalizeLicenseStatus(licenseFormData.status),
      quantity_total: quantityTotal,
      quantity_assigned: Math.min(normalizeInteger(licenseFormData.quantity_assigned, 0), quantityTotal),
      expiry_date: normalizeDateValue(licenseFormData.expiry_date),
      renewal_date: normalizeDateValue(licenseFormData.renewal_date),
      notes: normalizeOptionalText(licenseFormData.notes),
    };

    if (!payload.license_name) {
      toast.error(tt("toast.requireLicense"));
      return;
    }

    setLicenseSaving(true);
    try {
      if (licenseEditingId) {
        const { error } = await supabase.from("it_licenses").update(payload).eq("id", licenseEditingId);
        if (error) throw error;
        toast.success(tt("toast.licenseUpdated"));
      } else {
        const { error } = await supabase.from("it_licenses").insert(payload);
        if (error) throw error;
        toast.success(tt("toast.licenseCreated"));
      }

      resetLicenseForm();
      setLicenseFormOpen(false);
      await loadLicenses({ silent: true });
    } catch (error) {
      console.error("Save it_license error:", error);
      toast.error(error?.message || tt("toast.saveLicenseError"));
    } finally {
      setLicenseSaving(false);
    }
  };

  const handleEditLicense = (item) => {
    setLicenseEditingId(item.id);
    setLicenseFormData({
      license_name: item.license_name || "",
      vendor: item.vendor || "",
      license_type: item.license_type || "",
      status: normalizeLicenseStatus(item.status),
      quantity_total: String(normalizeInteger(item.quantity_total, 1)),
      quantity_assigned: String(normalizeInteger(item.quantity_assigned, 0)),
      expiry_date: item.expiry_date || "",
      renewal_date: item.renewal_date || "",
      notes: item.notes || "",
    });
    setActiveSection("licenses");
    setLicenseFormOpen(true);
  };

  const handleOpenNewLicense = () => {
    resetLicenseForm();
    setActiveSection("licenses");
    setLicenseFormOpen(true);
  };

  const handleCloseLicenseForm = () => {
    if (licenseSaving) return;
    resetLicenseForm();
    setLicenseFormOpen(false);
  };

  const handleOpenLicenseRegistry = () => {
    setActiveSection("licenses");
    window.requestAnimationFrame(() => {
      licenseListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleOpenNotebookRegistry = () => {
    setActiveSection("notebooks");
    window.requestAnimationFrame(() => {
      notebookPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleOpenNewNotebook = () => {
    setActiveSection("notebooks");
    setNotebookCreateRequest((prev) => prev + 1);
  };

  const handleOpenLicenseDetail = (item) => {
    setSelectedLicense(item);
  };

  const deleteAssetHard = async (id) => {
    const { error } = await supabase.from("it_assets").delete().eq("id", id);
    if (error) throw error;
  };

  const archiveAsset = async (id) => {
    const { data, error } = await supabase
      .from("it_assets")
      .update({ status: "retired" })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data || null;
  };

  const deleteLicenseHard = async (id) => {
    const { error } = await supabase.from("it_licenses").delete().eq("id", id);
    if (error) throw error;
  };

  const archiveLicense = async (id) => {
    const { data, error } = await supabase
      .from("it_licenses")
      .update({ status: "inactive" })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    return Array.isArray(data) ? data.length : 0;
  };

  const handleDeleteLicense = async (item) => {
    if (licenseActionId && licenseActionId === item.id) return;
    const ok = window.confirm(
      canHardDelete
        ? tt("confirm.deleteLicense", { name: item.license_name || "-" })
        : tt("confirm.archiveLicense", { name: item.license_name || "-" }),
    );
    if (!ok) return;

    setLicenseActionId(item.id);
    try {
      if (canHardDelete) {
        await deleteLicenseHard(item.id);
        setLicenses((prev) => prev.filter((row) => row.id !== item.id));
        setSelectedLicense((prev) => (prev?.id === item.id ? null : prev));
        toast.success(tt("toast.licenseDeleted"));
      } else {
        const archivedCount = await archiveLicense(item.id);
        if (archivedCount > 0) {
          setLicenses((prev) =>
            prev.map((row) => (row.id === item.id ? { ...row, status: "inactive" } : row)),
          );
          setSelectedLicense((prev) =>
            prev?.id === item.id ? { ...prev, status: "inactive" } : prev,
          );
          toast.success(tt("toast.licenseArchived"));
        } else {
          throw new Error(tt("toast.licenseArchiveError"));
        }
      }
      await loadLicenses({ silent: true });
    } catch (error) {
      console.error("Delete it_license error:", error);
      toast.error(error?.message || tt("toast.deleteLicenseError"));
    }
    setLicenseActionId("");
  };

  const handleDeleteAsset = async (item) => {
    if (assetActionId && assetActionId === item.id) return;
    const ok = window.confirm(
      canHardDelete
        ? tt("confirm.deleteAsset", { name: item.asset_tag || "-" })
        : tt("confirm.archiveAsset", { name: item.asset_tag || "-" }),
    );
    if (!ok) return;

    setAssetActionId(item.id);
    try {
      if (canHardDelete) {
        await deleteAssetHard(item.id);
        setAssets((prev) => prev.filter((row) => row.id !== item.id));
        setSelectedAsset((prev) => (prev?.id === item.id ? null : prev));
        toast.success(tt("toast.assetDeleted"));
      } else {
        const archivedAsset = await archiveAsset(item.id);
        if (archivedAsset?.id) {
          const changeEntries = buildAssetChangeEntries(item, archivedAsset, {
            fieldLabels: Object.fromEntries(assetDetailFields.map((field) => [field.key, field.label])),
            statusLabels: assetStatusLabels,
            locale,
          });
          await insertAssetActivityLog({
            assetId: archivedAsset.id,
            action: "archived",
            changes: changeEntries,
            afterAsset: archivedAsset,
          });
          setAssets((prev) =>
            prev.map((row) => (row.id === item.id ? { ...row, status: "retired" } : row)),
          );
          setSelectedAsset((prev) =>
            prev?.id === item.id ? { ...prev, status: "retired" } : prev,
          );
          toast.success(tt("toast.assetArchived"));
        } else {
          throw new Error(tt("toast.assetArchiveError"));
        }
      }
      await loadAssets({ silent: true });
    } catch (error) {
      console.error("Delete it_asset error:", error);
      toast.error(error?.message || tt("toast.deleteAssetError"));
    }
    setSelectedAssetIds((prev) => prev.filter((id) => id !== item.id));
    setAssetActionId("");
  };

  const handleDeleteSelectedAssets = async () => {
    if (assetBulkAction || selectedAssets.length === 0) return;

    const selectedIds = selectedAssets.map((item) => item.id);
    const selectedIdSet = new Set(selectedIds);
    const ok = window.confirm(
      canHardDelete
        ? tt("confirm.deleteSelectedAssets", { count: formatNumber(selectedIds.length) })
        : tt("confirm.archiveSelectedAssets", { count: formatNumber(selectedIds.length) }),
    );
    if (!ok) return;

    setAssetBulkAction(canHardDelete ? "delete" : "archive");
    try {
      if (canHardDelete) {
        const { error } = await supabase.from("it_assets").delete().in("id", selectedIds);
        if (error) throw error;
        setAssets((prev) => prev.filter((item) => !selectedIdSet.has(item.id)));
        setSelectedAsset((prev) => (selectedIdSet.has(prev?.id) ? null : prev));
        toast.success(tt("toast.selectedDeleteSuccess", { count: formatNumber(selectedIds.length) }));
      } else {
        const { data, error } = await supabase
          .from("it_assets")
          .update({ status: "retired" })
          .in("id", selectedIds)
          .select("*");
        if (error) throw error;

        const archivedAssets = Array.isArray(data) ? data : [];
        await Promise.all(
          archivedAssets.map((archivedAsset) => {
            const beforeAsset = selectedAssets.find((item) => item.id === archivedAsset.id) || null;
            const changeEntries = buildAssetChangeEntries(beforeAsset, archivedAsset, {
              fieldLabels: Object.fromEntries(assetDetailFields.map((field) => [field.key, field.label])),
              statusLabels: assetStatusLabels,
              locale,
            });
            return insertAssetActivityLog({
              assetId: archivedAsset.id,
              action: "archived",
              changes: changeEntries,
              afterAsset: archivedAsset,
            });
          }),
        );

        setAssets((prev) =>
          prev.map((item) => (selectedIdSet.has(item.id) ? { ...item, status: "retired" } : item)),
        );
        setSelectedAsset((prev) =>
          selectedIdSet.has(prev?.id) ? { ...prev, status: "retired" } : prev,
        );
        toast.success(tt("toast.selectedArchiveSuccess", { count: formatNumber(selectedIds.length) }));
      }

      setSelectedAssetIds([]);
      await loadAssets({ silent: true });
    } catch (error) {
      console.error("Bulk asset action error:", error);
      toast.error(error?.message || tt("toast.selectedActionError"));
    } finally {
      setAssetBulkAction("");
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) {
        toast.error(tt("toast.noSheet"));
        return;
      }

      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        raw: true,
        defval: "",
      });

      if (!Array.isArray(rows) || rows.length === 0) {
        toast.error(tt("toast.emptyFile"));
        return;
      }

      const mappedRows = rows.map((row) => ({
        payload: mapRowToPayload(row),
      }));

      const validRows = mappedRows
        .filter((row) => row.payload.asset_tag && row.payload.asset_name)
        .map((row) => row.payload);
      const invalidCount = mappedRows.length - validRows.length;

      if (validRows.length === 0) {
        toast.error(tt("toast.noValidAssetRows"));
        return;
      }

      const uniqueByTag = new Map();
      validRows.forEach((row) => {
        uniqueByTag.set(row.asset_tag, row);
      });
      const upsertRows = [...uniqueByTag.values()];
      const tags = upsertRows.map((row) => row.asset_tag);

      const { data: existingRows, error: existingError } = await supabase
        .from("it_assets")
        .select("asset_tag")
        .in("asset_tag", tags);
      if (existingError) throw existingError;

      const existingTagSet = new Set(
        (existingRows || []).map((row) => normalizeText(row.asset_tag).toLowerCase()),
      );
      const updateCount = upsertRows.reduce((sum, row) => {
        if (existingTagSet.has(row.asset_tag.toLowerCase())) return sum + 1;
        return sum;
      }, 0);
      const insertCount = upsertRows.length - updateCount;
      const dedupeCount = validRows.length - upsertRows.length;

      const { error: upsertError } = await supabase
        .from("it_assets")
        .upsert(upsertRows, { onConflict: "asset_tag" });

      if (upsertError) throw upsertError;

      toast.success(
        tt("toast.importAssetsSuccess", {
          insert: formatNumber(insertCount),
          update: formatNumber(updateCount),
          skip: formatNumber(invalidCount + dedupeCount),
        }),
      );
      await loadAssets({ silent: true });
    } catch (error) {
      console.error("Import it_assets error:", error);
      toast.error(error?.message || tt("toast.importAssetsError"));
    } finally {
      setImporting(false);
    }
  };

  const handleImportLicenseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setLicenseImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) {
        toast.error(tt("toast.noLicenseSheet"));
        return;
      }

      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        raw: true,
        defval: "",
      });

      if (!Array.isArray(rows) || rows.length === 0) {
        toast.error(tt("toast.emptyLicenseFile"));
        return;
      }

      const validRows = rows
        .map((row) => mapLicenseRowToPayload(row))
        .filter((row) => row.license_name);
      const invalidCount = rows.length - validRows.length;

      if (validRows.length === 0) {
        toast.error(tt("toast.noValidLicenseRows"));
        return;
      }

      const dedupeMap = new Map();
      validRows.forEach((row) => {
        const key = `${normalizeText(row.license_name).toLowerCase()}::${normalizeText(row.vendor).toLowerCase()}`;
        dedupeMap.set(key, row);
      });
      const dedupedRows = [...dedupeMap.values()];

      const { data: existingRows, error: existingError } = await supabase
        .from("it_licenses")
        .select("id,license_name,vendor");
      if (existingError) throw existingError;

      const existingMap = new Map();
      (existingRows || []).forEach((row) => {
        const key = `${normalizeText(row.license_name).toLowerCase()}::${normalizeText(row.vendor).toLowerCase()}`;
        if (!existingMap.has(key)) {
          existingMap.set(key, row.id);
        }
      });

      const updates = [];
      const inserts = [];
      dedupedRows.forEach((row) => {
        const key = `${normalizeText(row.license_name).toLowerCase()}::${normalizeText(row.vendor).toLowerCase()}`;
        const existingId = existingMap.get(key);
        if (existingId) {
          updates.push({ id: existingId, payload: row });
        } else {
          inserts.push(row);
        }
      });

      if (updates.length > 0) {
        const updateResults = await Promise.all(
          updates.map((item) =>
            supabase.from("it_licenses").update(item.payload).eq("id", item.id),
          ),
        );
        const updateError = updateResults.find((result) => result.error)?.error;
        if (updateError) throw updateError;
      }

      if (inserts.length > 0) {
        const { error: insertError } = await supabase.from("it_licenses").insert(inserts);
        if (insertError) throw insertError;
      }

      const dedupeCount = validRows.length - dedupedRows.length;
      toast.success(
        tt("toast.importLicensesSuccess", {
          insert: formatNumber(inserts.length),
          update: formatNumber(updates.length),
          skip: formatNumber(invalidCount + dedupeCount),
        }),
      );
      await loadLicenses({ silent: true });
    } catch (error) {
      console.error("Import it_licenses error:", error);
      toast.error(error?.message || tt("toast.importLicensesError"));
    } finally {
      setLicenseImporting(false);
    }
  };

  const exportAssetsExcel = async (items, filePrefix = "it-asset-registry", scope = "filtered") => {
    if (!Array.isArray(items) || items.length === 0) {
      toast.error(tt("toast.noAssetsToExport"));
      return;
    }

    setAssetExporting(true);
    try {
      const exportRows = [...items].sort(sortByAssetCodeNatural).map((item) => {
        const statusCode = normalizeStatus(item.status);
        return {
          assetCode: normalizeText(item.asset_tag),
          assetName: normalizeText(item.asset_name),
          category: normalizeAssetCategory(item.asset_category) || normalizeText(item.asset_category) || "Other",
          brand: normalizeText(item.brand),
          model: normalizeText(item.model),
          serialNumber: normalizeText(item.serial_number),
          statusCode,
          statusLabel: assetStatusLabels[statusCode] || statusCode,
          owner: normalizeText(item.owner_name),
          location: normalizeText(item.location),
          purchaseDate: normalizeDateValue(item.purchase_date) || "",
          warrantyEndDate: normalizeDateValue(item.warranty_end_date) || "",
          evidenceCount: getAssetEvidenceAttachments(item).length,
          notes: normalizeText(item.notes),
          updatedAt: item.updated_at || item.created_at || "",
        };
      });

      await downloadAssetRegistryWorkbook({
        rows: exportRows,
        filePrefix,
        language,
        context: {
          scope,
          preparedBy: currentProfile?.name || currentProfile?.email || "IT Service Hub",
          search: scope === "selected" ? "" : normalizeText(searchQuery),
          categoryFilter: scope === "selected"
            ? tt("common.allCategories")
            : assetCategoryFilter === "all"
              ? tt("common.allCategories")
              : categoryOptions.find((item) => item.value === assetCategoryFilter)?.label || assetCategoryFilter,
          statusFilter: scope === "selected"
            ? tt("common.allStatuses")
            : assetStatusFilter === "all"
              ? tt("common.allStatuses")
              : assetStatusLabels[assetStatusFilter] || assetStatusFilter,
          includeArchived: scope === "selected" || showArchivedAssets || autoIncludedArchivedAssets,
        },
      });
      toast.success(tt("toast.exportSuccess", { count: formatNumber(exportRows.length) }));
    } catch (error) {
      console.error("Export asset registry error:", error);
      toast.error(tt("toast.exportError"));
    } finally {
      setAssetExporting(false);
    }
  };

  const handleExportAssetsExcel = () => {
    void exportAssetsExcel(filteredAssets);
  };

  const handleExportSelectedAssets = () => {
    void exportAssetsExcel(selectedAssets, "it-asset-registry-selected", "selected");
  };

  return (
    <div
      className={embedded
        ? `asset-management-workspace ${theme === "dark" ? "is-dark" : ""}`
        : "min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8"}
    >
      <div className={embedded ? "space-y-3" : "mx-auto max-w-[1600px] space-y-4"}>
        {!embedded ? (
          <ReportsTopbar backTo="/admin-dashboard" backLabel={tt("page.backLabel")} showHub={false} />
        ) : null}

        <section className="relative overflow-hidden rounded-[1.15rem] border border-blue-100 bg-white shadow-[0_14px_42px_-36px_rgba(30,64,175,0.42)] sm:rounded-[1.5rem]">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
          <div className="pointer-events-none absolute left-1/3 top-0 h-40 w-40 rounded-full bg-cyan-200/20 blur-3xl" />

          <div className="relative border-b border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-cyan-50/60 px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2b59b0] to-[#173b80] text-white shadow-[0_12px_28px_-16px_rgba(43,89,176,0.9)] sm:h-12 sm:w-12">
                  <HardDrive size={20} aria-hidden="true" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
                </span>
                <div className="min-w-0 max-w-4xl">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#2b59b0] sm:text-[10px]">
                      {tt("page.eyebrow")}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {tt("ux.liveData")}
                    </span>
                  </div>
                  <h1 className="mt-0.5 text-lg font-black leading-tight tracking-tight text-slate-950 sm:mt-1 sm:text-2xl">
                    {tt("page.title")}
                  </h1>
                  <p className="mt-0.5 max-w-3xl text-[11px] leading-4 text-slate-600 sm:mt-1 sm:text-[13px] sm:leading-5">
                    {tt("page.subtitle")}
                  </p>
                </div>
              </div>

              <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-1.5 sm:flex sm:gap-2 lg:w-auto lg:justify-end">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-[#2b59b0] px-2 text-[11px] font-bold text-white shadow-[0_10px_24px_-14px_rgba(43,89,176,0.8)] transition hover:-translate-y-0.5 hover:bg-[#244a95] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1 sm:px-3 sm:text-xs lg:flex-none"
                >
                  <Upload size={14} />
                  {importing ? tt("page.importing") : tt("page.importAssets")}
                </button>

                <button
                  type="button"
                  onClick={() => licenseFileInputRef.current?.click()}
                  disabled={licenseImporting}
                  className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white/90 px-2 text-[11px] font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2b59b0]/40 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1 sm:px-3 sm:text-xs lg:flex-none"
                >
                  <KeyRound size={14} className="text-[#2b59b0]" />
                  {licenseImporting ? tt("page.importing") : tt("page.importLicenses")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void loadAssets();
                    void loadLicenses();
                  }}
                  disabled={loading || licenseLoading}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 text-xs font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto xl:px-3"
                  title={tt("page.refresh")}
                  aria-label={tt("page.refresh")}
                >
                  <RefreshCw size={14} className={loading || licenseLoading ? "animate-spin text-[#2b59b0]" : "text-slate-500"} />
                  <span className="hidden xl:inline">{tt("page.refresh")}</span>
                </button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <input
            ref={licenseFileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportLicenseFile}
          />

          <div className="relative grid grid-cols-2 gap-1.5 bg-slate-50/70 p-2 sm:gap-2 sm:p-3 lg:grid-cols-4 lg:p-3.5">
            <AssetMetricCard
              icon={Database}
              label={tt("summary.totalAssets")}
              value={formatNumber(liveSummary.total)}
              helper={`${tt("summary.pc")} ${formatNumber(liveSummary.pc)} • ${tt("summary.notebook")} ${formatNumber(liveSummary.notebook)}`}
            />
            <AssetMetricCard
              icon={PackageCheck}
              label={tt("summary.usableAssets")}
              value={formatNumber(liveSummary.usable)}
              helper={`${liveSummary.total > 0 ? Math.round((liveSummary.usable / liveSummary.total) * 100) : 0}% ${tt("ux.ready")}`}
              tone="emerald"
            />
            <AssetMetricCard
              icon={AlertTriangle}
              label={tt("summary.issueAssets")}
              value={formatNumber(liveSummary.broken)}
              helper={liveSummary.broken > 0 ? tt("ux.needsAttention") : tt("ux.noIssues")}
              tone="rose"
            />
            <AssetMetricCard
              icon={ShieldCheck}
              label={tt("summary.usableLicenses")}
              value={formatNumber(liveLicenseSummary.usable)}
              helper={`${tt("summary.totalLicenses")} ${formatNumber(liveLicenseSummary.total)}`}
              tone="violet"
            />
          </div>

          <div className="relative flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-1.5 sm:px-4 sm:py-2">
            <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto text-[10px] text-slate-600">
              {[
                [Monitor, tt("summary.pc"), liveSummary.pc, "text-blue-600 bg-blue-50"],
                [Laptop, tt("summary.notebook"), liveSummary.notebook, "text-indigo-600 bg-indigo-50"],
                [Monitor, tt("summary.monitor"), liveSummary.monitor, "text-cyan-600 bg-cyan-50"],
                [Printer, tt("summary.printer"), liveSummary.printer, "text-amber-600 bg-amber-50"],
                [KeyRound, tt("summary.issueLicenses"), liveLicenseSummary.broken, "text-rose-600 bg-rose-50"],
              ].map(([Icon, label, value, className]) => (
                <span key={label} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-semibold ${className}`}>
                  <Icon size={11} />
                  {label} <strong>{formatNumber(value)}</strong>
                </span>
              ))}
            </div>

            <details className="group hidden shrink-0 text-xs text-slate-600 sm:block">
              <summary className="flex min-h-7 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-transparent px-2 font-semibold text-slate-700 transition hover:border-slate-200 hover:bg-slate-50">
                <FileSpreadsheet size={13} />
                {tt("page.importGuide")}
              </summary>
              <div className="mt-2 space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs text-slate-500 lg:max-w-[620px]">
                <p>{tt("page.requiredAssetColumns")}</p>
                <p>{tt("page.categoryHint")}</p>
                <p>{tt("page.assetColumns")}: {TABLE_COLUMNS.join(", ")}</p>
                <p>{tt("page.licenseColumns")}: {LICENSE_TABLE_COLUMNS.join(", ")}</p>
              </div>
            </details>
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-[0_14px_38px_-34px_rgba(15,23,42,0.55)] sm:p-2.5">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5 xl:pb-0">
              {[
                { id: "assets", label: tt("sections.assets"), icon: HardDrive, count: liveSummary.total },
                { id: "licenses", label: tt("sections.licenses"), icon: KeyRound, count: liveLicenseSummary.records },
                { id: "notebooks", label: tt("sections.notebooks"), icon: Laptop },
                { id: "activity", label: tt("sections.activity"), icon: History, count: recentAssetActivities.length },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition duration-200 ${
                      active
                        ? "border-[#2b59b0] bg-[#2b59b0] text-white shadow-[0_12px_26px_-16px_rgba(43,89,176,0.85)]"
                        : "border-slate-200 bg-slate-50/80 text-slate-600 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/15 text-white" : "bg-white text-[#2b59b0] shadow-sm"}`}>
                      <Icon size={14} strokeWidth={2.25} />
                    </span>
                    <span className="whitespace-nowrap text-xs font-bold">{item.label}</span>
                    {item.count !== undefined ? (
                      <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-black ${active ? "bg-white/15 text-blue-50" : "bg-slate-200/70 text-slate-500"}`}>
                        {formatNumber(item.count)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5 text-[11px]">
              <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-semibold text-slate-600 sm:inline-flex">
                <CircleUserRound size={13} className="text-[#2b59b0]" />
                {tt("sections.userRole")}: {userRole || tt("sections.unknownRole")}
              </span>
              {activeSection === "assets" ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenAssetRegistry}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 font-bold text-[#2b59b0] transition hover:-translate-y-0.5 hover:bg-blue-100"
                  >
                    <Database size={14} />
                    {tt("ux.assetRegistry")}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenNewAsset}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-[#2b59b0] px-2.5 font-bold text-white shadow-[0_8px_18px_-13px_rgba(43,89,176,0.9)] transition hover:-translate-y-0.5 hover:bg-[#244a95]"
                  >
                    <Plus size={14} />
                    {tt("assets.formAdd")}
                  </button>
                </>
              ) : null}
              {activeSection === "licenses" ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenLicenseRegistry}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 font-bold text-indigo-700 transition hover:-translate-y-0.5 hover:bg-indigo-100"
                  >
                    <KeyRound size={14} />
                    {tt("ux.licenseRegistry")}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenNewLicense}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-indigo-700 px-2.5 font-bold text-white shadow-[0_8px_18px_-13px_rgba(67,56,202,0.9)] transition hover:-translate-y-0.5 hover:bg-indigo-800"
                  >
                    <Plus size={14} />
                    {tt("licenses.formAdd")}
                  </button>
                </>
              ) : null}
              {activeSection === "notebooks" ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenNotebookRegistry}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 font-bold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100"
                  >
                    <Laptop size={14} />
                    {tt("ux.notebookRegistry")}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenNewNotebook}
                    disabled={!canHardDelete}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 font-bold text-white shadow-[0_8px_18px_-13px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus size={14} />
                    {tt("ux.addNotebook")}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </section>

        {activeSection === "assets" ? (
          <section className="space-y-5">
          {assetFormOpen ? (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5" onClick={handleCloseAssetForm}>
          <article
            ref={assetFormRef}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-white px-5 py-4 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${editingId ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-[#2b59b0]"}`}>
                  {editingId ? <PencilLine size={18} /> : <Plus size={18} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{tt("ux.assetRegistry")}</p>
                  <h2 className="truncate text-lg font-black text-slate-900">
                    {editingId ? tt("assets.formEdit") : tt("assets.formAdd")}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAssetForm}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={14} />
                {editingId ? tt("common.cancelEdit") : tt("common.close")}
              </button>
            </div>

            <form className="space-y-4 p-5" onSubmit={handleSaveAsset}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AssetFormField icon={Tag} label={tt("assetFields.asset_tag")} required>
                  <input value={formData.asset_tag} onChange={(event) => setFormData((prev) => ({ ...prev, asset_tag: event.target.value }))} className={assetInputClass} placeholder="IT-PC-001" required />
                </AssetFormField>
                <AssetFormField icon={HardDrive} label={tt("assetFields.asset_name")} required>
                  <input value={formData.asset_name} onChange={(event) => setFormData((prev) => ({ ...prev, asset_name: event.target.value }))} className={assetInputClass} placeholder={tt("assetFields.asset_name")} required />
                </AssetFormField>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AssetFormField icon={LayoutGrid} label={tt("assetFields.asset_category")} required>
                  <select value={formData.asset_category} onChange={(event) => setFormData((prev) => ({ ...prev, asset_category: event.target.value }))} className={assetInputClass} required>
                    {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </AssetFormField>
                <AssetFormField icon={CheckCircle2} label={tt("assetFields.status")}>
                  <select value={formData.status} onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))} className={assetInputClass}>
                    {assetStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </AssetFormField>
              </div>
              <p className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
                <ShieldCheck size={14} className="mt-0.5 shrink-0" /> {tt("assets.statusHint")}
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AssetFormField icon={Cpu} label={tt("assetFields.brand")}>
                  <input value={formData.brand} onChange={(event) => setFormData((prev) => ({ ...prev, brand: event.target.value }))} className={assetInputClass} placeholder={tt("assetFields.brand")} />
                </AssetFormField>
                <AssetFormField icon={SlidersHorizontal} label={tt("assetFields.model")}>
                  <input value={formData.model} onChange={(event) => setFormData((prev) => ({ ...prev, model: event.target.value }))} className={assetInputClass} placeholder={tt("assetFields.model")} />
                </AssetFormField>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AssetFormField icon={Barcode} label={tt("assetFields.serial_number")}>
                  <input value={formData.serial_number} onChange={(event) => setFormData((prev) => ({ ...prev, serial_number: event.target.value }))} className={assetInputClass} placeholder={tt("assetFields.serial_number")} />
                </AssetFormField>
                <AssetFormField icon={MapPin} label={tt("assetFields.location")}>
                  <input value={formData.location} onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))} className={assetInputClass} placeholder={tt("assetFields.location")} />
                </AssetFormField>
              </div>

              <AssetFormField icon={UserRound} label={tt("assetFields.owner_name")}>
                <input value={formData.owner_name} onChange={(event) => setFormData((prev) => ({ ...prev, owner_name: event.target.value }))} className={assetInputClass} placeholder={tt("assetFields.owner_name")} />
              </AssetFormField>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AssetFormField icon={CalendarDays} label={tt("assetFields.purchase_date")}>
                  <input value={formData.purchase_date} onChange={(event) => setFormData((prev) => ({ ...prev, purchase_date: event.target.value }))} className={assetInputClass} type="date" />
                </AssetFormField>
                <AssetFormField icon={ShieldCheck} label={tt("assetFields.warranty_end_date")}>
                  <input value={formData.warranty_end_date} onChange={(event) => setFormData((prev) => ({ ...prev, warranty_end_date: event.target.value }))} className={assetInputClass} type="date" />
                </AssetFormField>
              </div>

              <AssetFormField icon={ClipboardList} label={tt("assetFields.notes")}>
                <textarea value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} className={`${assetInputClass} min-h-[90px] resize-y`} placeholder={tt("assetFields.notes")} />
              </AssetFormField>

              <section
                className="rounded-2xl border border-dashed border-sky-200 bg-gradient-to-br from-sky-50/80 to-white p-3 outline-none transition focus-within:ring-4 focus-within:ring-sky-100 focus:ring-4 focus:ring-sky-100"
                tabIndex={0}
                onPaste={handlePasteAssetEvidence}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                      <ImagePlus size={17} />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">{tt("assets.evidenceTitle")}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{tt("assets.evidenceHint")}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => assetEvidenceInputRef.current?.click()}
                    disabled={!assetEvidenceReady || saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ImagePlus size={14} />
                    {tt("assets.evidenceButton")}
                  </button>
                  <input
                    ref={assetEvidenceInputRef}
                    type="file"
                    multiple
                    accept={ASSET_EVIDENCE_ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                      handleSelectAssetEvidence(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </div>

                <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
                  {tt("assets.evidencePasteHint")}
                </div>

                {!assetEvidenceReady ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    {tt("assets.evidenceMigrationMissing")}
                  </div>
                ) : null}

                {pendingAssetEvidence.length > 0 ? (
                  <p className="mt-3 text-xs font-semibold text-sky-700">
                    {tt("assets.evidencePending", { count: formatNumber(pendingAssetEvidence.length) })}
                  </p>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {assetEvidenceAttachments.map((attachment, index) => (
                    <div key={attachment.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={() => handleOpenAssetPreview(assetEvidenceAttachments, index)}
                        className="block h-24 w-full bg-slate-100"
                      >
                        <img src={attachment.file_url} alt={attachment.file_name || "asset evidence"} className="h-full w-full object-cover" />
                      </button>
                      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                        <span className="truncate text-[11px] font-semibold text-slate-600">{attachment.file_name || tt("assets.evidenceTitle")}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingAssetEvidence(attachment)}
                          disabled={saving}
                          className="shrink-0 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {tt("common.remove")}
                        </button>
                      </div>
                    </div>
                  ))}

                  {pendingAssetEvidence.map((entry) => (
                    <div key={entry.id} className="overflow-hidden rounded-xl border border-dashed border-sky-200 bg-white">
                      {entry.previewUrl ? (
                        <button type="button" onClick={() => window.open(entry.previewUrl, "_blank", "noopener,noreferrer")} className="block h-24 w-full bg-slate-100">
                          <img src={entry.previewUrl} alt={entry.file?.name || "pending evidence"} className="h-full w-full object-cover" />
                        </button>
                      ) : (
                        <div className="flex h-24 items-center justify-center bg-slate-100 text-xs font-semibold text-slate-500">
                          {entry.file?.name || "image"}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                        <span className="truncate text-[11px] font-semibold text-sky-700">{entry.file?.name || "image"}</span>
                        <button
                          type="button"
                          onClick={() => removePendingAssetEvidence(entry.id)}
                          disabled={saving}
                          className="shrink-0 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {tt("common.remove")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {assetEvidenceAttachments.length === 0 && pendingAssetEvidence.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-xs font-medium text-slate-500">
                    {tt("assets.evidenceEmpty")}
                  </div>
                ) : null}
              </section>

              <button
                type="submit"
                disabled={saving}
                className="sticky bottom-0 z-10 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2b59b0] to-[#1f478f] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_-10px_rgba(43,89,176,0.85)] transition hover:-translate-y-0.5 hover:from-[#244a95] hover:to-[#173b80] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingId ? <PencilLine size={16} /> : <Save size={16} />}
                {saving ? tt("common.saving") : editingId ? tt("assets.submitEdit") : tt("assets.submitAdd")}
              </button>
            </form>
          </article>
          </div>
          ) : null}

          <article ref={assetListRef} className="min-w-0 scroll-mt-20 rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_18px_48px_-40px_rgba(15,23,42,0.65)] sm:rounded-[1.5rem]">
            <div className="rounded-t-[1.2rem] border-b border-slate-200 bg-gradient-to-r from-white to-slate-50/80 px-3 py-3 sm:rounded-t-[1.45rem] sm:px-4 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 sm:h-10 sm:w-10 sm:rounded-2xl">
                    <Database size={17} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-slate-900 sm:text-lg">{tt("ux.assetRegistry")}</h2>
                    <p className="truncate text-[11px] text-slate-500 sm:text-xs">{tt("ux.listHelper")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportAssetsExcel}
                  disabled={filteredAssets.length === 0 || assetExporting}
                  className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:rounded-xl sm:px-3 sm:text-sm"
                >
                  {assetExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  <span className="hidden min-[390px]:inline">{assetExporting ? tt("common.exportingExcel") : tt("common.exportExcel")}</span>
                </button>
              </div>
            </div>

            <div className={`sticky ${assetStickyTopClass} z-30 border-b border-slate-200 bg-white px-3 py-2.5 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.65)] sm:px-4`}>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] gap-1.5 lg:grid-cols-[minmax(240px,1fr)_160px_160px_auto] lg:gap-2">
                <label className="relative col-span-3 block min-w-0 lg:col-span-1">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className={`${assetFilterInputClass} pl-9`}
                    placeholder={tt("assets.searchPlaceholder")}
                    aria-label={tt("assets.searchPlaceholder")}
                  />
                </label>
                <label className="relative block min-w-0">
                  <LayoutGrid size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select value={assetCategoryFilter} onChange={(event) => setAssetCategoryFilter(event.target.value)} className={`${assetFilterInputClass} pl-8`} aria-label={tt("common.allCategories")}>
                    <option value="all">{tt("common.allCategories")}</option>
                    {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="relative block min-w-0">
                  <Filter size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select value={assetStatusFilter} onChange={(event) => setAssetStatusFilter(event.target.value)} className={`${assetFilterInputClass} pl-8`} aria-label={tt("common.allStatuses")}>
                    <option value="all">{tt("common.allStatuses")}</option>
                    {assetStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setAssetCategoryFilter("all");
                    setAssetStatusFilter("all");
                  }}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 lg:px-3 lg:text-sm lg:font-bold"
                  title={tt("common.resetFilters")}
                  aria-label={tt("common.resetFilters")}
                >
                  <RotateCcw size={14} />
                  <span className="hidden lg:inline">{tt("common.resetFilters")}</span>
                </button>
              </div>

              <div className="mt-2 flex min-w-0 items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px] font-bold sm:text-[11px]">
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                    <Eye size={11} /> {tt("summary.visible")} {formatNumber(filteredAssetSummary.total)} / {formatNumber(assets.length)}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                    <CheckCircle2 size={11} /> {tt("summary.usable")} {formatNumber(filteredAssetSummary.usable)}
                  </span>
                  {filteredAssetSummary.broken > 0 ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-rose-700">
                      <AlertTriangle size={11} /> {tt("summary.unusable")} {formatNumber(filteredAssetSummary.broken)}
                    </span>
                  ) : null}
                </div>
                <label className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-slate-600 sm:text-xs">
                  <input
                    type="checkbox"
                    checked={showArchivedAssets}
                    onChange={(event) => setShowArchivedAssets(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2b59b0]"
                  />
                  <Archive size={12} />
                  <span className="hidden min-[430px]:inline">{tt("assets.showArchived")}</span>
                </label>
              </div>

              {selectedAssets.length > 0 ? (
                <div className="mt-2 flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:text-xs">
                  <span className="shrink-0 font-bold text-[#2b59b0]">
                    {tt("assets.selected", {
                      selected: formatNumber(selectedAssets.length),
                      total: formatNumber(filteredAssets.length),
                    })}
                  </span>
                  <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
                    <button
                      type="button"
                      onClick={handleExportSelectedAssets}
                      disabled={Boolean(assetBulkAction) || assetExporting}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download size={13} />
                      {tt("assets.exportSelected", { count: formatNumber(selectedAssets.length) })}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedAssets}
                      disabled={Boolean(assetBulkAction)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {assetBulkAction ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      {assetBulkAction
                        ? tt("common.processing")
                        : canHardDelete
                          ? tt("assets.deleteSelected", { count: formatNumber(selectedAssets.length) })
                          : tt("assets.archiveSelected", { count: formatNumber(selectedAssets.length) })}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelectedAssets}
                      disabled={Boolean(assetBulkAction)}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {tt("assets.clearSelected")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-b-[1.2rem] bg-white p-3 pt-2 sm:rounded-b-[1.45rem] sm:p-4 sm:pt-3">
              {autoIncludedArchivedAssets ? (
                <p className="mb-2 text-xs font-medium text-amber-700">
                  {tt("assets.autoArchiveNotice")}
                </p>
              ) : null}

            <div className="space-y-2.5 lg:hidden">
              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">{tt("common.loading")}</div>
              ) : filteredAssets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                  <Database size={24} className="mx-auto text-slate-400" />
                  <p className="mt-2 text-sm font-bold text-slate-600">{tt("common.noAssetData")}</p>
                </div>
              ) : filteredAssets.map((item) => {
                const evidenceCount = getAssetEvidenceAttachments(item).length;
                return (
                  <article key={`mobile-${item.id}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm" onClick={() => handleOpenDetail(item)}>
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedAssetIdSet.has(item.id)}
                        onChange={(event) => handleToggleAssetSelection(item.id, event.target.checked)}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                        aria-label={tt("assets.selectRowAria", { asset: item.asset_tag || tt("sections.assets") })}
                      />
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2b59b0]">
                        <HardDrive size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="truncate text-sm font-black text-slate-900">{item.asset_name || "-"}</p>
                          <ChevronRight size={16} className="text-slate-400" />
                        </div>
                        <p className="mt-0.5 font-mono text-xs font-bold text-[#2b59b0]">{item.asset_tag || "-"}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">{item.asset_category || "-"}</span>
                          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${getAssetStatusChipClass(item.status)}`}>{formatAssetStatusLabel(item.status, assetStatusLabels)}</span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700"><ImagePlus size={10} />{formatNumber(evidenceCount)}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1.5 truncate"><UserRound size={12} />{item.owner_name || "-"}</span>
                          <span className="inline-flex items-center gap-1.5 truncate"><MapPin size={12} />{item.location || "-"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-2.5" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => handleOpenDetail(item)} className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg bg-cyan-50 px-1.5 text-[11px] font-bold text-cyan-700"><Eye size={12} />{tt("common.view")}</button>
                      <button type="button" onClick={() => handleEditAsset(item)} className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg bg-slate-100 px-1.5 text-[11px] font-bold text-slate-700"><PencilLine size={12} />{tt("common.edit")}</button>
                      <button type="button" disabled={assetActionId === item.id} onClick={() => handleDeleteAsset(item)} className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg bg-rose-50 px-1.5 text-[11px] font-bold text-rose-700 disabled:opacity-60"><Trash2 size={12} />{canHardDelete ? tt("common.delete") : tt("common.archive")}</button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
              <div className="max-h-[calc(100vh-250px)] min-h-[360px] overflow-auto">
                <table className="w-full min-w-[860px] table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-9" />
                    <col className="w-[104px]" />
                    <col className="w-[180px]" />
                    <col className="w-[74px]" />
                    <col className="w-[76px]" />
                    <col className="w-[150px]" />
                    <col className="w-[90px]" />
                    <col className="w-[48px]" />
                    <col className="w-[154px]" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-[0.04em] text-slate-500">
                      <th className="px-1.5 py-2">
                        <input
                          type="checkbox"
                          checked={allFilteredAssetsSelected}
                          onChange={(event) => handleToggleSelectAllFilteredAssets(event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300"
                          aria-label={tt("assets.selectAllAria")}
                        />
                      </th>
                      <th className="px-1.5 py-2">{tt("assets.tableCode")}</th>
                      <th className="px-1.5 py-2">{tt("assets.tableName")}</th>
                      <th className="px-1.5 py-2">{tt("assets.tableCategory")}</th>
                      <th className="px-1.5 py-2">{tt("assets.tableStatus")}</th>
                      <th className="px-1.5 py-2">{tt("assets.tableOwner")}</th>
                      <th className="px-1.5 py-2">{tt("assets.tablePurchaseDate")}</th>
                      <th className="px-1.5 py-2 text-center">{tt("assets.tableEvidence")}</th>
                      <th className="sticky right-0 z-20 border-l border-slate-200 bg-slate-50 px-1.5 py-2 text-right shadow-[-8px_0_14px_-14px_rgba(15,23,42,0.65)]">{tt("assets.tableActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-2 py-8 text-center text-slate-500">
                          {tt("common.loading")}
                        </td>
                      </tr>
                    ) : filteredAssets.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-2 py-8 text-center text-slate-500">
                          {tt("common.noAssetData")}
                        </td>
                      </tr>
                    ) : (
                      filteredAssets.map((item) => {
                        const evidenceCount = getAssetEvidenceAttachments(item).length;
                        return (
                          <tr
                            key={item.id}
                            className="group cursor-pointer border-b border-slate-100 align-middle transition hover:bg-blue-50/45"
                            onClick={() => handleOpenDetail(item)}
                          >
                            <td className="px-1.5 py-2">
                              <input
                                type="checkbox"
                                checked={selectedAssetIdSet.has(item.id)}
                                onChange={(event) => handleToggleAssetSelection(item.id, event.target.checked)}
                                onClick={(event) => event.stopPropagation()}
                                className="h-4 w-4 rounded border-slate-300"
                                aria-label={tt("assets.selectRowAria", { asset: item.asset_tag || tt("sections.assets") })}
                              />
                            </td>
                            <td className="truncate px-1.5 py-2 font-bold text-slate-800" title={item.asset_tag || "-"}>{item.asset_tag || "-"}</td>
                            <td className="px-1.5 py-2 text-slate-700">
                              <div className="truncate font-semibold" title={item.asset_name || "-"}>{item.asset_name || "-"}</div>
                              <div className="truncate text-[10px] leading-4 text-slate-500" title={`${item.brand || "-"} ${item.model || ""}`}>
                                {item.brand || "-"} {item.model ? `• ${item.model}` : ""}
                              </div>
                            </td>
                            <td className="px-1.5 py-2 text-slate-700">
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                {item.asset_category || "-"}
                              </span>
                            </td>
                            <td className="px-1.5 py-2 text-slate-700">
                              <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${getAssetStatusChipClass(item.status)}`}>
                                {formatAssetStatusLabel(item.status, assetStatusLabels)}
                              </span>
                            </td>
                            <td className="px-1.5 py-2 text-slate-700">
                              <div className="truncate font-semibold" title={item.owner_name || "-"}>{item.owner_name || "-"}</div>
                              <div className="truncate text-[10px] leading-4 text-slate-500" title={item.location || "-"}>{item.location || "-"}</div>
                            </td>
                            <td className="whitespace-nowrap px-1.5 py-2 text-[11px] text-slate-700">{formatDate(item.purchase_date, locale)}</td>
                            <td className="px-1.5 py-2 text-center">
                              <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${evidenceCount > 0 ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                                {formatNumber(evidenceCount)}
                              </span>
                            </td>
                            <td className="sticky right-0 border-l border-slate-100 bg-white px-1.5 py-2 shadow-[-8px_0_14px_-14px_rgba(15,23,42,0.65)] transition group-hover:bg-blue-50">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleOpenDetail(item);
                                  }}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2 text-[10px] font-bold text-cyan-700 hover:bg-cyan-100"
                                >
                                  <Eye size={12} />
                                  {tt("assets.detailsButton")}
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEditAsset(item);
                                  }}
                                  title={tt("common.edit")}
                                  aria-label={tt("common.edit")}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                >
                                  <PencilLine size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={assetActionId === item.id || Boolean(assetBulkAction)}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteAsset(item);
                                  }}
                                  title={canHardDelete ? tt("common.delete") : tt("common.archive")}
                                  aria-label={canHardDelete ? tt("common.delete") : tt("common.archive")}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {assetActionId === item.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </article>
        </section>
        ) : null}

        {activeSection === "licenses" ? (
          <section className="space-y-5">
          {licenseFormOpen ? (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5" onClick={handleCloseLicenseForm}>
          <article className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-indigo-600" />
                <h2 className="text-lg font-black text-slate-900">
                  {licenseEditingId ? tt("licenses.formEdit") : tt("licenses.formAdd")}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseLicenseForm}
                disabled={licenseSaving}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={14} />
                {licenseEditingId ? tt("common.cancelEdit") : tt("common.close")}
              </button>
            </div>

            <form className="space-y-4 p-5" onSubmit={handleSaveLicense}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={licenseFormData.license_name}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, license_name: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder={`${tt("licenseFields.license_name")} *`}
                  required
                />
                <input
                  value={licenseFormData.vendor}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, vendor: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder={tt("licenseFields.vendor")}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={licenseFormData.license_type}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, license_type: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder={tt("licenseFields.license_type")}
                />
                <select
                  value={licenseFormData.status}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, status: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {licenseStatusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={licenseFormData.quantity_total}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, quantity_total: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  type="number"
                  min={0}
                  placeholder={tt("licenseFields.quantity_total")}
                />
                <input
                  value={licenseFormData.quantity_assigned}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, quantity_assigned: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  type="number"
                  min={0}
                  placeholder={tt("licenseFields.quantity_assigned")}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={licenseFormData.expiry_date}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, expiry_date: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  type="date"
                  title={tt("licenseFields.expiry_date")}
                />
                <input
                  value={licenseFormData.renewal_date}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, renewal_date: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  type="date"
                  title={tt("licenseFields.renewal_date")}
                />
              </div>

              <textarea
                value={licenseFormData.notes}
                onChange={(event) => setLicenseFormData((prev) => ({ ...prev, notes: event.target.value }))}
                className="min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder={tt("licenseFields.notes")}
              />

              <button
                type="submit"
                disabled={licenseSaving}
                className="sticky bottom-0 z-10 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-10px_rgba(67,56,202,0.75)] transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {licenseEditingId ? <PencilLine size={16} /> : <Save size={16} />}
                {licenseSaving
                  ? tt("common.saving")
                  : licenseEditingId
                    ? tt("licenses.submitEdit")
                    : tt("licenses.submitAdd")}
              </button>
            </form>
          </article>
          </div>
          ) : null}

          <article ref={licenseListRef} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-indigo-600" />
                  <h2 className="text-lg font-black text-slate-900">
                    {tt("licenses.listTitle", { count: formatNumber(filteredLicenses.length) })}
                  </h2>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={showArchivedLicenses}
                    onChange={(event) => setShowArchivedLicenses(event.target.checked)}
                    className="rounded border-slate-300"
                  />
                  {tt("licenses.showArchived")}
                </label>
              </div>
              <div className="relative w-full sm:w-[280px]">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={licenseSearchQuery}
                  onChange={(event) => setLicenseSearchQuery(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                  placeholder={tt("licenses.searchPlaceholder")}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={licenseStatusFilter}
                onChange={(event) => setLicenseStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">{tt("common.allStatuses")}</option>
                {licenseStatusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setLicenseSearchQuery("");
                  setLicenseStatusFilter("all");
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                {tt("common.resetFilters")}
              </button>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-slate-500">{tt("summary.visible")}</p>
                <p className="text-lg font-black text-slate-900">{formatNumber(filteredLicenseSummary.total)}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-indigo-700">{tt("summary.usable")}</p>
                <p className="text-lg font-black text-indigo-900">{formatNumber(filteredLicenseSummary.usable)}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-rose-700">{tt("summary.unusable")}</p>
                <p className="text-lg font-black text-rose-900">{formatNumber(filteredLicenseSummary.broken)}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 lg:hidden">
              {licenseLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">{tt("licenses.loading")}</div>
              ) : filteredLicenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">{tt("common.noLicenseData")}</div>
              ) : filteredLicenses.map((item) => {
                const totalSeats = normalizeInteger(item.quantity_total, 0);
                const assignedSeats = Math.min(normalizeInteger(item.quantity_assigned, 0), totalSeats);
                const availableSeats = Math.max(totalSeats - assignedSeats, 0);
                return (
                  <article key={`license-mobile-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" onClick={() => handleOpenLicenseDetail(item)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-slate-900">{item.license_name || "-"}</h3>
                        <p className="mt-1 truncate text-xs text-slate-500">{item.vendor || "-"} {item.license_type ? `• ${item.license_type}` : ""}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${getLicenseStatusChipClass(item.status)}`}>
                        {formatLicenseStatusLabel(item.status, licenseStatusLabels)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-slate-50 px-2 py-2"><p className="text-[10px] text-slate-500">{tt("licenses.tableTotal")}</p><p className="font-black text-slate-800">{formatNumber(totalSeats)}</p></div>
                      <div className="rounded-xl bg-indigo-50 px-2 py-2"><p className="text-[10px] text-indigo-600">{tt("licenses.tableAssigned")}</p><p className="font-black text-indigo-800">{formatNumber(assignedSeats)}</p></div>
                      <div className="rounded-xl bg-emerald-50 px-2 py-2"><p className="text-[10px] text-emerald-600">{tt("licenses.tableAvailable")}</p><p className="font-black text-emerald-800">{formatNumber(availableSeats)}</p></div>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-500">{tt("licenses.tableExpiry")}: {formatDate(item.expiry_date, locale)}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => handleOpenLicenseDetail(item)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-cyan-50 px-2 py-2 text-xs font-bold text-cyan-700"><Eye size={13} />{tt("common.view")}</button>
                      <button type="button" onClick={() => handleEditLicense(item)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-2 py-2 text-xs font-bold text-slate-700"><PencilLine size={13} />{tt("common.edit")}</button>
                      <button type="button" disabled={licenseActionId === item.id} onClick={() => handleDeleteLicense(item)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-50 px-2 py-2 text-xs font-bold text-rose-700 disabled:opacity-60"><Trash2 size={13} />{canHardDelete ? tt("common.delete") : tt("common.archive")}</button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
              <div className="max-h-[calc(100vh-250px)] min-h-[320px] overflow-auto">
              <table className="w-full min-w-[760px] table-fixed text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-[0.04em] text-slate-500">
                    <th className="px-2 py-2">{tt("licenses.tableLicense")}</th>
                    <th className="px-2 py-2">{tt("licenses.tableStatus")}</th>
                    <th className="px-2 py-2 text-right">{tt("licenses.tableTotal")}</th>
                    <th className="px-2 py-2 text-right">{tt("licenses.tableAssigned")}</th>
                    <th className="px-2 py-2 text-right">{tt("licenses.tableAvailable")}</th>
                    <th className="px-2 py-2">{tt("licenses.tableExpiry")}</th>
                    <th className="sticky right-0 z-20 border-l border-slate-200 bg-slate-50 px-2 py-2 text-right">{tt("licenses.tableActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {licenseLoading ? (
                    <tr>
                      <td colSpan={7} className="px-2 py-8 text-center text-slate-500">
                        {tt("licenses.loading")}
                      </td>
                    </tr>
                  ) : filteredLicenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-2 py-8 text-center text-slate-500">
                        {tt("common.noLicenseData")}
                      </td>
                    </tr>
                  ) : (
                    filteredLicenses.map((item) => {
                      const totalSeats = normalizeInteger(item.quantity_total, 0);
                      const assignedSeats = Math.min(normalizeInteger(item.quantity_assigned, 0), totalSeats);
                      const availableSeats = Math.max(totalSeats - assignedSeats, 0);
                      return (
                        <tr
                          key={item.id}
                          className="group cursor-pointer border-b border-slate-100 align-top transition hover:bg-slate-50/70"
                          onClick={() => handleOpenLicenseDetail(item)}
                        >
                          <td className="px-2 py-2 text-slate-700">
                            <div className="truncate font-semibold text-slate-800" title={item.license_name || "-"}>{item.license_name || "-"}</div>
                            <div className="truncate text-[10px] text-slate-500">
                              {item.vendor || "-"} {item.license_type ? `• ${item.license_type}` : ""}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-slate-700">
                            <span
                              className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${getLicenseStatusChipClass(
                                item.status,
                              )}`}
                            >
                              {formatLicenseStatusLabel(item.status, licenseStatusLabels)}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right font-semibold text-slate-800">{formatNumber(totalSeats)}</td>
                          <td className="px-2 py-2 text-right text-slate-700">{formatNumber(assignedSeats)}</td>
                          <td className="px-2 py-2 text-right text-emerald-700">{formatNumber(availableSeats)}</td>
                          <td className="whitespace-nowrap px-2 py-2 text-slate-700">{formatDate(item.expiry_date, locale)}</td>
                          <td className="sticky right-0 border-l border-slate-100 bg-white px-2 py-2 transition group-hover:bg-slate-50">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenLicenseDetail(item);
                                }}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2 text-[10px] font-semibold text-cyan-700 hover:bg-cyan-100"
                              >
                                <Eye size={13} />
                                {tt("common.view")}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleEditLicense(item);
                                }}
                                title={tt("common.edit")}
                                aria-label={tt("common.edit")}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              >
                                <PencilLine size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={licenseActionId === item.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteLicense(item);
                                }}
                                title={canHardDelete ? tt("common.delete") : tt("common.archive")}
                                aria-label={canHardDelete ? tt("common.delete") : tt("common.archive")}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {licenseActionId === item.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </article>
        </section>
        ) : null}

        {activeSection === "notebooks" ? (
          <div ref={notebookPanelRef} className="scroll-mt-4">
            <NotebookInventoryManagementPanel
              userRole={userRole}
              createRequest={notebookCreateRequest}
              onCreateRequestHandled={() => setNotebookCreateRequest(0)}
            />
          </div>
        ) : null}

        {activeSection === "activity" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">{tt("activity.title")}</h2>
                <p className="mt-1 text-sm text-slate-500">{tt("activity.subtitle")}</p>
              </div>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                {formatNumber(recentAssetActivities.length)}
              </span>
            </div>

            {!assetEvidenceReady ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                {tt("activity.schemaNotice")}
              </div>
            ) : recentAssetActivities.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">
                {tt("activity.noData")}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentAssetActivities.map((log) => {
                  const changes = Array.isArray(log?.changes?.fields) ? log.changes.fields : [];
                  const evidenceAdded = Number(log?.changes?.evidence_added || 0);
                  const evidenceRemoved = Number(log?.changes?.evidence_removed || 0);
                  const asset = log.asset || {};
                  return (
                    <article key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs font-bold text-sky-700">
                              {tt(`activity.action_${log.action}`)}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              {formatDateTime(log.created_at, locale)}
                            </span>
                          </div>
                          <h3 className="mt-2 text-base font-black text-slate-900">
                            {asset.asset_tag || "-"} • {asset.asset_name || "-"}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {log.created_by_name || "-"} {asset.owner_name ? `• ${asset.owner_name}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => asset?.id ? handleOpenDetail(asset) : undefined}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Eye size={14} />
                          {tt("common.view")}
                        </button>
                      </div>

                      {changes.length > 0 ? (
                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                          {changes.slice(0, 6).map((change) => (
                            <div key={`${log.id}-${change.key}`} className="rounded-xl border border-white bg-white px-3 py-2 text-xs">
                              <p className="font-bold text-slate-600">{change.label}</p>
                              <p className="mt-1 text-slate-500">
                                <span className="line-through decoration-slate-300">{change.before || "-"}</span>
                                <span className="mx-2 text-slate-400">→</span>
                                <span className="font-semibold text-slate-800">{change.after || "-"}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {(evidenceAdded > 0 || evidenceRemoved > 0) ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                          {evidenceAdded > 0 ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">{tt("activity.evidenceAdded", { count: formatNumber(evidenceAdded) })}</span> : null}
                          {evidenceRemoved > 0 ? <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">{tt("activity.evidenceRemoved", { count: formatNumber(evidenceRemoved) })}</span> : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {selectedAsset ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onClick={handleCloseAssetDetail}>
            <article
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{tt("assets.detailTitle")}</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedAsset.asset_name || "-"}</h3>
                  <p className="mt-1 text-sm text-slate-500">{tt("assets.detailCode")}: {selectedAsset.asset_tag || "-"}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  {detailEditMode ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelDetailEdit}
                        disabled={detailSaving}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <X size={14} />
                        {tt("common.cancelEdit")}
                      </button>
                      <button
                        type="submit"
                        form="asset-detail-edit-form"
                        disabled={detailSaving}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#2b59b0] px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {detailSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        {detailSaving ? tt("common.saving") : tt("common.save")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleStartDetailEdit}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-[#2b59b0] transition hover:bg-blue-100"
                      >
                        <PencilLine size={14} />
                        {tt("common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseAssetDetail}
                        disabled={detailEvidenceUploading}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        title={tt("common.close")}
                        aria-label={tt("common.close")}
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {detailEditMode ? (
                <form id="asset-detail-edit-form" className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4" onSubmit={handleSaveDetailAsset}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <AssetFormField icon={Tag} label={tt("assetFields.asset_tag")} required>
                      <input value={detailFormData.asset_tag} onChange={(event) => setDetailFormData((prev) => ({ ...prev, asset_tag: event.target.value }))} className={assetInputClass} required autoFocus />
                    </AssetFormField>
                    <AssetFormField icon={HardDrive} label={tt("assetFields.asset_name")} required>
                      <input value={detailFormData.asset_name} onChange={(event) => setDetailFormData((prev) => ({ ...prev, asset_name: event.target.value }))} className={assetInputClass} required />
                    </AssetFormField>
                    <AssetFormField icon={LayoutGrid} label={tt("assetFields.asset_category")} required>
                      <select value={detailFormData.asset_category} onChange={(event) => setDetailFormData((prev) => ({ ...prev, asset_category: event.target.value }))} className={assetInputClass} required>
                        {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </AssetFormField>
                    <AssetFormField icon={CheckCircle2} label={tt("assetFields.status")}>
                      <select value={detailFormData.status} onChange={(event) => setDetailFormData((prev) => ({ ...prev, status: event.target.value }))} className={assetInputClass}>
                        {assetStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </AssetFormField>
                    <AssetFormField icon={Cpu} label={tt("assetFields.brand")}>
                      <input value={detailFormData.brand} onChange={(event) => setDetailFormData((prev) => ({ ...prev, brand: event.target.value }))} className={assetInputClass} />
                    </AssetFormField>
                    <AssetFormField icon={SlidersHorizontal} label={tt("assetFields.model")}>
                      <input value={detailFormData.model} onChange={(event) => setDetailFormData((prev) => ({ ...prev, model: event.target.value }))} className={assetInputClass} />
                    </AssetFormField>
                    <AssetFormField icon={Barcode} label={tt("assetFields.serial_number")}>
                      <input value={detailFormData.serial_number} onChange={(event) => setDetailFormData((prev) => ({ ...prev, serial_number: event.target.value }))} className={assetInputClass} />
                    </AssetFormField>
                    <AssetFormField icon={MapPin} label={tt("assetFields.location")}>
                      <input value={detailFormData.location} onChange={(event) => setDetailFormData((prev) => ({ ...prev, location: event.target.value }))} className={assetInputClass} />
                    </AssetFormField>
                    <AssetFormField icon={UserRound} label={tt("assetFields.owner_name")}>
                      <input value={detailFormData.owner_name} onChange={(event) => setDetailFormData((prev) => ({ ...prev, owner_name: event.target.value }))} className={assetInputClass} />
                    </AssetFormField>
                    <AssetFormField icon={CalendarDays} label={tt("assetFields.purchase_date")}>
                      <input type="date" value={detailFormData.purchase_date} onChange={(event) => setDetailFormData((prev) => ({ ...prev, purchase_date: event.target.value }))} className={assetInputClass} />
                    </AssetFormField>
                    <AssetFormField icon={ShieldCheck} label={tt("assetFields.warranty_end_date")}>
                      <input type="date" value={detailFormData.warranty_end_date} onChange={(event) => setDetailFormData((prev) => ({ ...prev, warranty_end_date: event.target.value }))} className={assetInputClass} />
                    </AssetFormField>
                    <AssetFormField icon={ClipboardList} label={tt("assetFields.notes")} className="sm:col-span-2">
                      <textarea value={detailFormData.notes} onChange={(event) => setDetailFormData((prev) => ({ ...prev, notes: event.target.value }))} className={`${assetInputClass} min-h-[88px] resize-y`} />
                    </AssetFormField>
                  </div>
                </form>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {assetDetailFields.map((field) => (
                    <div key={field.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{field.label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatDetailValue(selectedAsset, field.key, {
                          locale,
                          statusLabels: assetStatusLabels,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {(() => {
                const evidenceAttachments = getAssetEvidenceAttachments(selectedAsset);
                const assetLogs = getAssetActivityLogs(selectedAsset).slice(0, 8);
                return (
                  <>
                    <section
                      className="mt-5 rounded-2xl border border-dashed border-sky-200 bg-slate-50 p-4 outline-none transition focus:ring-4 focus:ring-sky-100"
                      tabIndex={0}
                      onPaste={handlePasteDetailAssetEvidence}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black text-slate-800">{tt("assets.evidenceTitle")}</h4>
                          <p className="mt-1 text-xs text-slate-500">{formatNumber(evidenceAttachments.length)} {tt("assets.tableEvidence")}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {evidenceAttachments.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAssetPreview(evidenceAttachments, 0)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 sm:w-auto sm:px-3"
                            title={tt("common.view")}
                            aria-label={tt("common.view")}
                          >
                            <Eye size={14} />
                            <span className="hidden sm:inline">{tt("common.view")}</span>
                          </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => detailAssetEvidenceInputRef.current?.click()}
                            disabled={!assetEvidenceReady || detailEvidenceUploading}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-2.5 text-xs font-bold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {detailEvidenceUploading ? <RefreshCw size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                            <span className="hidden min-[390px]:inline">{detailEvidenceUploading ? tt("common.processing") : tt("assets.evidenceButton")}</span>
                          </button>
                          <input
                            ref={detailAssetEvidenceInputRef}
                            type="file"
                            multiple
                            accept={ASSET_EVIDENCE_ACCEPT}
                            className="hidden"
                            onChange={(event) => {
                              void uploadDetailAssetEvidence(event.target.files);
                              event.target.value = "";
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
                        {detailEvidenceUploading ? tt("common.processing") : tt("assets.evidencePasteHint")}
                      </div>

                      {evidenceAttachments.length === 0 ? (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-xs font-medium text-slate-500">
                          {assetEvidenceReady ? tt("assets.evidenceEmpty") : tt("assets.evidenceMigrationMissing")}
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {evidenceAttachments.slice(0, 6).map((attachment, index) => (
                            <button
                              key={attachment.id}
                              type="button"
                              onClick={() => handleOpenAssetPreview(evidenceAttachments, index)}
                              className="overflow-hidden rounded-xl border border-white bg-white text-left shadow-sm"
                            >
                              <img src={attachment.file_url} alt={attachment.file_name || "asset evidence"} className="h-24 w-full object-cover" />
                              <span className="block truncate px-2 py-1.5 text-[11px] font-semibold text-slate-600">
                                {attachment.file_name || tt("assets.evidenceTitle")}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black text-slate-800">{tt("assets.latestHistory")}</h4>
                          <p className="mt-1 text-xs text-slate-500">{tt("activity.subtitle")}</p>
                        </div>
                        <History size={18} className="text-sky-600" />
                      </div>

                      {!assetEvidenceReady ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          {tt("activity.schemaNotice")}
                        </div>
                      ) : assetLogs.length === 0 ? (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-center text-xs font-medium text-slate-500">
                          {tt("assets.noHistory")}
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {assetLogs.map((log) => {
                            const changes = Array.isArray(log?.changes?.fields) ? log.changes.fields : [];
                            const evidenceAdded = Number(log?.changes?.evidence_added || 0);
                            const evidenceRemoved = Number(log?.changes?.evidence_removed || 0);
                            return (
                              <article key={log.id} className="relative rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs font-bold text-sky-700">
                                    {tt(`activity.action_${log.action}`)}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-500">{formatDateTime(log.created_at, locale)}</span>
                                </div>
                                <p className="mt-2 text-xs font-semibold text-slate-500">{log.created_by_name || "-"}</p>
                                {changes.length > 0 ? (
                                  <div className="mt-2 space-y-1.5">
                                    {changes.slice(0, 4).map((change) => (
                                      <p key={`${log.id}-${change.key}`} className="text-xs text-slate-600">
                                        <span className="font-bold text-slate-700">{change.label}: </span>
                                        <span className="line-through decoration-slate-300">{change.before || "-"}</span>
                                        <span className="mx-1 text-slate-400">→</span>
                                        <span className="font-semibold text-slate-800">{change.after || "-"}</span>
                                      </p>
                                    ))}
                                  </div>
                                ) : null}
                                {(evidenceAdded > 0 || evidenceRemoved > 0) ? (
                                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                                    {evidenceAdded > 0 ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">{tt("activity.evidenceAdded", { count: formatNumber(evidenceAdded) })}</span> : null}
                                    {evidenceRemoved > 0 ? <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">{tt("activity.evidenceRemoved", { count: formatNumber(evidenceRemoved) })}</span> : null}
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </>
                );
              })()}
            </article>
          </div>
        ) : null}

        {selectedLicense ? (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4" onClick={() => setSelectedLicense(null)}>
            <article
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{tt("licenses.detailTitle")}</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedLicense.license_name || "-"}</h3>
                  <p className="mt-1 text-sm text-slate-500">{selectedLicense.vendor || "-"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLicense(null)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <X size={14} />
                  {tt("common.close")}
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {licenseDetailFields.map((field) => (
                  <div key={field.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{field.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatLicenseDetailValue(selectedLicense, field.key, {
                        locale,
                        numberFormatter,
                        statusLabels: licenseStatusLabels,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : null}

        <AttachmentPreviewModal
          attachment={assetPreviewState.attachments[assetPreviewState.initialIndex] || null}
          attachments={assetPreviewState.attachments}
          initialIndex={assetPreviewState.initialIndex}
          onClose={handleCloseAssetPreview}
        />
      </div>
    </div>
  );
}

function AssetMetricCard({ icon: Icon, label, value, helper, tone = "blue" }) {
  const tones = {
    blue: "border-blue-100 bg-gradient-to-br from-white to-blue-50/80 text-[#2b59b0]",
    emerald: "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80 text-emerald-600",
    rose: "border-rose-100 bg-gradient-to-br from-white to-rose-50/80 text-rose-600",
    violet: "border-violet-100 bg-gradient-to-br from-white to-violet-50/80 text-violet-600",
  };
  const iconTones = {
    blue: "bg-blue-100 text-[#2b59b0]",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    violet: "bg-violet-100 text-violet-700",
  };

  return (
    <article className={`group min-h-[62px] rounded-xl border px-2.5 py-2 shadow-[0_10px_28px_-25px_rgba(15,23,42,0.5)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-25px_rgba(43,89,176,0.32)] sm:min-h-[76px] sm:px-3 sm:py-2.5 ${tones[tone]}`}>
      <div className="flex h-full items-center justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px]">{label}</p>
          <p className="mt-0.5 text-lg font-black leading-none tracking-tight text-slate-900 sm:text-xl">{value}</p>
          {helper ? <p className="mt-1 hidden truncate text-[10px] font-medium leading-4 text-slate-500 sm:block">{helper}</p> : null}
        </div>
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition group-hover:scale-105 sm:h-9 sm:w-9 sm:rounded-xl ${iconTones[tone]}`}>
          <Icon size={15} strokeWidth={2.25} className="sm:h-[17px] sm:w-[17px]" />
        </span>
      </div>
    </article>
  );
}

function AssetFormField({ icon: Icon, label, required = false, children, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-600">
        {Icon ? <Icon size={14} className="text-[#2b59b0]" /> : null}
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}
