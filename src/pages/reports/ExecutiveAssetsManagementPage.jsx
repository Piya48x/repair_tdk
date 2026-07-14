import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
  History,
  ImagePlus,
  KeyRound,
  PencilLine,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import NotebookInventoryManagementPanel from "./NotebookInventoryManagementPanel";
import AttachmentPreviewModal from "../work-notes/AttachmentPreviewModal";

const EXECUTIVE_ASSETS_TRANSLATIONS = {
  th: {
    page: {
      backLabel: "แดชบอร์ดแอดมิน",
      eyebrow: "Asset Management",
      title: "จัดการสินทรัพย์ IT",
      subtitle:
        "เพิ่ม แก้ไข นำเข้า และตรวจสอบอุปกรณ์กับไลเซนส์ในหน้าเดียว ใช้ข้อมูลนี้ต่อกับรายงานผู้บริหาร",
      importAssets: "นำเข้าอุปกรณ์",
      importLicenses: "นำเข้าไลเซนส์",
      importing: "กำลังนำเข้า...",
      refresh: "รีเฟรช",
      importGuide: "คู่มือนำเข้า Excel/CSV",
      requiredAssetColumns: "อุปกรณ์ต้องมี: asset_tag, asset_name",
      categoryHint: "หมวดหมู่หลัก: PC, Notebook, Monitor, Printer",
      assetColumns: "คอลัมน์อุปกรณ์",
      licenseColumns: "คอลัมน์ไลเซนส์",
    },
    summary: {
      totalAssets: "อุปกรณ์ทั้งหมด",
      usableAssets: "ใช้งานได้",
      issueAssets: "ต้องดูแล",
      pc: "PC",
      notebook: "Notebook",
      monitor: "Monitor",
      printer: "Printer",
      totalLicenses: "ไลเซนส์ทั้งหมด",
      usableLicenses: "ไลเซนส์ใช้งานได้",
      issueLicenses: "ไลเซนส์ใช้ไม่ได้",
      visible: "จำนวนที่แสดง",
      usable: "ใช้งานได้",
      unusable: "ใช้ไม่ได้",
    },
    sections: {
      assets: "อุปกรณ์",
      licenses: "ไลเซนส์",
      notebooks: "Notebook Center",
      activity: "ประวัติอัปเดต",
      userRole: "สิทธิ์ผู้ใช้",
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
      allCategories: "ทุกหมวดหมู่",
      allStatuses: "ทุกสถานะ",
      resetFilters: "ล้างตัวกรอง",
      view: "ดู",
      edit: "แก้ไข",
      delete: "ลบ",
      archive: "จัดเก็บ",
      processing: "กำลังดำเนินการ...",
      save: "บันทึก",
      saving: "กำลังบันทึก...",
      cancelEdit: "ยกเลิก",
      close: "ปิด",
      exportExcel: "ส่งออก Excel",
      loading: "กำลังโหลดข้อมูล...",
      noAssetData: "ไม่พบข้อมูลอุปกรณ์",
      noLicenseData: "ไม่พบข้อมูลไลเซนส์",
      openImage: "เปิดรูป",
      remove: "ลบออก",
    },
    assets: {
      formAdd: "เพิ่มอุปกรณ์",
      formEdit: "แก้ไขอุปกรณ์",
      listTitle: "รายการอุปกรณ์ ({{count}})",
      showArchived: "แสดงรายการที่จัดเก็บแล้ว",
      searchPlaceholder: "ค้นหารหัส ชื่อ หมวดหมู่ หรือผู้ใช้...",
      statusHint: "สถานะที่นับเป็นต้องดูแล: เสีย, ซ่อม, ปลดระวาง, สูญหาย",
      autoArchiveNotice: "ตัวกรองกำลังรวมรายการที่จัดเก็บแล้วให้โดยอัตโนมัติ",
      selected: "เลือกแล้ว: {{selected}} / {{total}}",
      clearSelected: "ล้างรายการที่เลือก",
      selectAllAria: "เลือกอุปกรณ์ทั้งหมดที่แสดง",
      selectRowAria: "เลือก {{asset}}",
      submitAdd: "เพิ่มข้อมูล",
      submitEdit: "บันทึกการแก้ไข",
      tableCode: "รหัส",
      tableName: "อุปกรณ์",
      tableCategory: "หมวดหมู่",
      tableStatus: "สถานะ",
      tableOwner: "ผู้ใช้/ที่ตั้ง",
      tablePurchaseDate: "วันที่ซื้อ",
      tableActions: "การทำงาน",
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
      formAdd: "เพิ่มไลเซนส์",
      formEdit: "แก้ไขไลเซนส์",
      listTitle: "รายการไลเซนส์ ({{count}})",
      showArchived: "แสดงรายการที่จัดเก็บแล้ว",
      searchPlaceholder: "ค้นหาชื่อไลเซนส์ ผู้ให้บริการ หรือประเภท...",
      submitAdd: "เพิ่มไลเซนส์",
      submitEdit: "บันทึกการแก้ไข",
      tableLicense: "ไลเซนส์",
      tableStatus: "สถานะ",
      tableTotal: "ทั้งหมด",
      tableAssigned: "ใช้งานแล้ว",
      tableAvailable: "คงเหลือ",
      tableExpiry: "วันหมดอายุ",
      tableActions: "การทำงาน",
      loading: "กำลังโหลดข้อมูลไลเซนส์...",
      detailTitle: "รายละเอียดไลเซนส์",
    },
    assetFields: {
      asset_tag: "รหัสทรัพย์สิน",
      asset_name: "ชื่ออุปกรณ์",
      asset_category: "หมวดหมู่",
      brand: "ยี่ห้อ",
      model: "รุ่น",
      serial_number: "เลขซีเรียล",
      status: "สถานะ",
      location: "ตำแหน่งที่ตั้ง",
      owner_name: "ผู้ใช้งาน",
      purchase_date: "วันที่ซื้อ",
      warranty_end_date: "วันหมดประกัน",
      notes: "หมายเหตุ",
    },
    licenseFields: {
      license_name: "ชื่อไลเซนส์",
      vendor: "ผู้ให้บริการ",
      license_type: "ประเภทไลเซนส์",
      status: "สถานะ",
      quantity_total: "จำนวนทั้งหมด",
      quantity_assigned: "จำนวนที่ใช้งาน",
      expiry_date: "วันหมดอายุ",
      renewal_date: "วันต่ออายุ",
      notes: "หมายเหตุ",
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
      fileTooLarge: "ไฟล์ {{name}} ต้องมีขนาดไม่เกิน 10 MB",
      imageOnly: "รูปหลักฐานต้องเป็นไฟล์รูปภาพเท่านั้น",
      evidencePasted: "วางรูปหลักฐานแล้ว {{count}} รูป",
      evidenceMigrationMissing: "กรุณารัน migration สำหรับรูปหลักฐานและประวัติอุปกรณ์ก่อนใช้งาน",
      evidenceUploadError: "อัปโหลดรูปหลักฐานไม่สำเร็จ",
    },
    confirm: {
      deleteLicense: "ยืนยันลบไลเซนส์ {{name}} แบบถาวร?",
      archiveLicense: "สิทธิ์ของคุณจะจัดเก็บแทนการลบถาวร\nยืนยันจัดเก็บไลเซนส์ {{name}} ?",
      deleteAsset: "ยืนยันลบอุปกรณ์ {{name}} แบบถาวร?",
      archiveAsset: "สิทธิ์ของคุณจะจัดเก็บแทนการลบถาวร\nยืนยันจัดเก็บอุปกรณ์ {{name}} ?",
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
      fileTooLarge: "File {{name}} must be 10 MB or smaller",
      imageOnly: "Evidence must be an image file.",
      evidencePasted: "Pasted {{count}} evidence photo(s)",
      evidenceMigrationMissing: "Please run the asset evidence and activity history migration before using this feature.",
      evidenceUploadError: "Unable to upload evidence photos",
    },
    confirm: {
      deleteLicense: "Permanently delete license {{name}}?",
      archiveLicense: "Your role will archive instead of permanently deleting.\nArchive license {{name}}?",
      deleteAsset: "Permanently delete asset {{name}}?",
      archiveAsset: "Your role will archive instead of permanently deleting.\nArchive asset {{name}}?",
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

export default function ExecutiveAssetsManagementPage() {
  const { language, tt } = useScopedI18n(EXECUTIVE_ASSETS_TRANSLATIONS);
  const fileInputRef = useRef(null);
  const licenseFileInputRef = useRef(null);
  const assetEvidenceInputRef = useRef(null);
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
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [licenseSearchQuery, setLicenseSearchQuery] = useState("");
  const [showArchivedAssets, setShowArchivedAssets] = useState(false);
  const [showArchivedLicenses, setShowArchivedLicenses] = useState(false);
  const [assetCategoryFilter, setAssetCategoryFilter] = useState("all");
  const [assetStatusFilter, setAssetStatusFilter] = useState("all");
  const [licenseStatusFilter, setLicenseStatusFilter] = useState("all");
  const [assetActionId, setAssetActionId] = useState("");
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
    if (!query) return scopedAssets;

    return scopedAssets.filter((item) => {
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

  const handleSelectAssetEvidence = (files) => {
    const entries = Array.from(files || []);
    if (entries.length === 0) return 0;
    const invalidFile = entries.find((file) => !isImageFile(file));
    if (invalidFile) {
      toast.error(tt("toast.imageOnly"));
      return 0;
    }
    const oversized = entries.find((file) => Number(file?.size || 0) > ASSET_EVIDENCE_MAX_SIZE);
    if (oversized) {
      toast.error(tt("toast.fileTooLarge", { name: oversized.name || "image" }));
      return 0;
    }
    setPendingAssetEvidence((prev) => [...prev, ...entries.map(createPendingAssetEvidenceEntry)]);
    return entries.length;
  };

  const handlePasteAssetEvidence = (event) => {
    const itemFiles = Array.from(event.clipboardData?.items || [])
      .filter((item) => String(item?.type || "").startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    const fileFallbacks = Array.from(event.clipboardData?.files || []).filter((file) =>
      String(file?.type || "").startsWith("image/"),
    );
    const imageFiles = (itemFiles.length > 0 ? itemFiles : fileFallbacks).map((file, index) =>
      file?.name
        ? file
        : new File([file], `asset-evidence-paste-${Date.now()}-${index}.png`, {
            type: file?.type || "image/png",
          }),
    );

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
    setFormData({
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
    });
    setAssetEvidenceAttachments(getAssetEvidenceAttachments(item));
    setRemovedAssetEvidence([]);
    setPendingAssetEvidence([]);
    setActiveSection("assets");
  };

  const handleOpenDetail = (item) => {
    setSelectedAsset(item);
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

  const handleExportAssetsExcel = () => {
    if (!Array.isArray(filteredAssets) || filteredAssets.length === 0) {
      toast.error(tt("toast.noAssetsToExport"));
      return;
    }

    const exportRows = filteredAssets.map((item) => ({
      asset_tag: normalizeText(item.asset_tag),
      asset_name: normalizeText(item.asset_name),
      asset_category: normalizeAssetCategory(item.asset_category) || normalizeText(item.asset_category),
      brand: normalizeText(item.brand),
      model: normalizeText(item.model),
      serial_number: normalizeText(item.serial_number),
      status: normalizeStatus(item.status),
      location: normalizeText(item.location),
      owner_name: normalizeText(item.owner_name),
      purchase_date: normalizeDateValue(item.purchase_date) || "",
      warranty_end_date: normalizeDateValue(item.warranty_end_date) || "",
      notes: normalizeText(item.notes),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");

    const dateStamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `executive-assets-${dateStamp}.xlsx`);
    toast.success(tt("toast.exportSuccess", { count: formatNumber(exportRows.length) }));
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <ReportsTopbar backTo="/admin-dashboard" backLabel={tt("page.backLabel")} showHub={false} />

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                {tt("page.eyebrow")}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                {tt("page.title")}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {tt("page.subtitle")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload size={16} />
                {importing ? tt("page.importing") : tt("page.importAssets")}
              </button>

              <button
                type="button"
                onClick={() => licenseFileInputRef.current?.click()}
                disabled={licenseImporting}
                className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload size={16} />
                {licenseImporting ? tt("page.importing") : tt("page.importLicenses")}
              </button>

              <button
                type="button"
                onClick={() => {
                  void loadAssets();
                  void loadLicenses();
                }}
                disabled={loading || licenseLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading || licenseLoading ? "animate-spin" : ""} />
                {tt("page.refresh")}
              </button>
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

          <div className="hidden mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <FileSpreadsheet size={16} />
              {tt("page.importGuide")}
            </div>
            <p className="mt-2">
              {TABLE_COLUMNS.join(", ")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {tt("page.requiredAssetColumns")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {tt("page.categoryHint")}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {tt("page.licenseColumns")}: <span className="font-semibold">{LICENSE_TABLE_COLUMNS.join(", ")}</span>
            </p>
          </div>

          <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-800">
              <FileSpreadsheet size={16} />
              {tt("page.importGuide")}
            </summary>
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <p>{tt("page.requiredAssetColumns")}</p>
              <p>{tt("page.categoryHint")}</p>
              <p>{tt("page.assetColumns")}: {TABLE_COLUMNS.join(", ")}</p>
              <p>{tt("page.licenseColumns")}: {LICENSE_TABLE_COLUMNS.join(", ")}</p>
            </div>
          </details>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{tt("summary.totalAssets")}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{formatNumber(liveSummary.total)}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">{tt("summary.usableAssets")}</p>
              <p className="mt-1 text-2xl font-black text-emerald-900">{formatNumber(liveSummary.usable)}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-700">{tt("summary.issueAssets")}</p>
              <p className="mt-1 text-2xl font-black text-rose-900">{formatNumber(liveSummary.broken)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{tt("summary.pc")}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{formatNumber(liveSummary.pc)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{tt("summary.notebook")}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{formatNumber(liveSummary.notebook)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{tt("summary.monitor")}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{formatNumber(liveSummary.monitor)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{tt("summary.printer")}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{formatNumber(liveSummary.printer)}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-700">{tt("summary.totalLicenses")}</p>
              <p className="mt-1 text-2xl font-black text-indigo-900">{formatNumber(liveLicenseSummary.total)}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-700">{tt("summary.usableLicenses")}</p>
              <p className="mt-1 text-2xl font-black text-indigo-900">{formatNumber(liveLicenseSummary.usable)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{tt("summary.issueLicenses")}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{formatNumber(liveLicenseSummary.broken)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex flex-wrap rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setActiveSection("assets")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeSection === "assets"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {tt("sections.assets")}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("licenses")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeSection === "licenses"
                    ? "bg-indigo-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {tt("sections.licenses")}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("notebooks")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeSection === "notebooks"
                    ? "bg-blue-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {tt("sections.notebooks")}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("activity")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeSection === "activity"
                    ? "bg-sky-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <History size={14} />
                {tt("sections.activity")}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                {tt("sections.userRole")}: {userRole || tt("sections.unknownRole")}
              </span>
              <span
                className={`rounded-full border px-3 py-1 font-semibold ${
                  canHardDelete
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {canHardDelete ? tt("sections.deleteModePermanent") : tt("sections.deleteModeArchive")}
              </span>
            </div>
          </div>
        </section>

        {activeSection === "assets" ? (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-900">
                {editingId ? tt("assets.formEdit") : tt("assets.formAdd")}
              </h2>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <X size={14} />
                  {tt("common.cancelEdit")}
                </button>
              ) : null}
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSaveAsset}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={formData.asset_tag}
                  onChange={(event) => setFormData((prev) => ({ ...prev, asset_tag: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder={`${tt("assetFields.asset_tag")} *`}
                  required
                />
                <input
                  value={formData.asset_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, asset_name: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder={`${tt("assetFields.asset_name")} *`}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={formData.asset_category}
                  onChange={(event) => setFormData((prev) => ({ ...prev, asset_category: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  {categoryOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {assetStatusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500">
                {tt("assets.statusHint")}
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={formData.brand}
                  onChange={(event) => setFormData((prev) => ({ ...prev, brand: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder={tt("assetFields.brand")}
                />
                <input
                  value={formData.model}
                  onChange={(event) => setFormData((prev) => ({ ...prev, model: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder={tt("assetFields.model")}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={formData.serial_number}
                  onChange={(event) => setFormData((prev) => ({ ...prev, serial_number: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder={tt("assetFields.serial_number")}
                />
                <input
                  value={formData.location}
                  onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder={tt("assetFields.location")}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={formData.owner_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, owner_name: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder={tt("assetFields.owner_name")}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={formData.purchase_date}
                    onChange={(event) => setFormData((prev) => ({ ...prev, purchase_date: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    type="date"
                    title={tt("assetFields.purchase_date")}
                  />
                  <input
                    value={formData.warranty_end_date}
                    onChange={(event) => setFormData((prev) => ({ ...prev, warranty_end_date: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    type="date"
                    title={tt("assetFields.warranty_end_date")}
                  />
                </div>
              </div>

              <textarea
                value={formData.notes}
                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                className="min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder={tt("assetFields.notes")}
              />

              <section
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus-within:ring-2 focus-within:ring-sky-200 focus:ring-2 focus:ring-sky-200"
                tabIndex={0}
                onPaste={handlePasteAssetEvidence}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">{tt("assets.evidenceTitle")}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{tt("assets.evidenceHint")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => assetEvidenceInputRef.current?.click()}
                    disabled={!assetEvidenceReady || saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingId ? <PencilLine size={16} /> : <Save size={16} />}
                {saving ? tt("common.saving") : editingId ? tt("assets.submitEdit") : tt("assets.submitAdd")}
              </button>
            </form>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-900">
                  {tt("assets.listTitle", { count: formatNumber(filteredAssets.length) })}
                </h2>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={showArchivedAssets}
                    onChange={(event) => setShowArchivedAssets(event.target.checked)}
                    className="rounded border-slate-300"
                  />
                  {tt("assets.showArchived")}
                </label>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-[300px]">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                  placeholder={tt("assets.searchPlaceholder")}
                />
                </div>
                <button
                  type="button"
                  onClick={handleExportAssetsExcel}
                  disabled={filteredAssets.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download size={15} />
                  {tt("common.exportExcel")}
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={assetCategoryFilter}
                onChange={(event) => setAssetCategoryFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">{tt("common.allCategories")}</option>
                {categoryOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select
                value={assetStatusFilter}
                onChange={(event) => setAssetStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">{tt("common.allStatuses")}</option>
                {assetStatusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setAssetCategoryFilter("all");
                  setAssetStatusFilter("all");
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                {tt("common.resetFilters")}
              </button>
            </div>

            {autoIncludedArchivedAssets ? (
              <p className="mt-2 text-xs font-medium text-amber-700">
                {tt("assets.autoArchiveNotice")}
              </p>
            ) : null}

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-slate-500">{tt("summary.visible")}</p>
                <p className="text-lg font-black text-slate-900">{formatNumber(filteredAssetSummary.total)}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-emerald-700">{tt("summary.usable")}</p>
                <p className="text-lg font-black text-emerald-900">{formatNumber(filteredAssetSummary.usable)}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-rose-700">{tt("summary.unusable")}</p>
                <p className="text-lg font-black text-rose-900">{formatNumber(filteredAssetSummary.broken)}</p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <span className="font-semibold text-slate-600">
                {tt("assets.selected", {
                  selected: formatNumber(selectedFilteredAssetCount),
                  total: formatNumber(filteredAssets.length),
                })}
              </span>
              <button
                type="button"
                onClick={handleClearSelectedAssets}
                disabled={selectedAssetIds.length === 0}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {tt("assets.clearSelected")}
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <div className="max-h-[560px] overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={allFilteredAssetsSelected}
                        onChange={(event) => handleToggleSelectAllFilteredAssets(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                        aria-label={tt("assets.selectAllAria")}
                      />
                    </th>
                    <th className="px-2 py-2">{tt("assets.tableCode")}</th>
                    <th className="px-2 py-2">{tt("assets.tableName")}</th>
                    <th className="px-2 py-2">{tt("assets.tableCategory")}</th>
                    <th className="px-2 py-2">{tt("assets.tableStatus")}</th>
                    <th className="px-2 py-2">{tt("assets.tableOwner")}</th>
                    <th className="px-2 py-2">{tt("assets.tablePurchaseDate")}</th>
                    <th className="px-2 py-2">{tt("assets.tableEvidence")}</th>
                    <th className="px-2 py-2 text-right">{tt("assets.tableActions")}</th>
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
                          className="cursor-pointer border-b border-slate-100 align-top transition hover:bg-slate-50/70"
                          onClick={() => handleOpenDetail(item)}
                        >
                        <td className="px-2 py-3">
                          <input
                            type="checkbox"
                            checked={selectedAssetIdSet.has(item.id)}
                            onChange={(event) => handleToggleAssetSelection(item.id, event.target.checked)}
                            onClick={(event) => event.stopPropagation()}
                            className="h-4 w-4 rounded border-slate-300"
                            aria-label={tt("assets.selectRowAria", { asset: item.asset_tag || tt("sections.assets") })}
                          />
                        </td>
                        <td className="px-2 py-3 font-semibold text-slate-800">{item.asset_tag || "-"}</td>
                        <td className="px-2 py-3 text-slate-700">
                          <div>{item.asset_name || "-"}</div>
                          <div className="text-xs text-slate-500">
                            {item.brand || "-"} {item.model ? `• ${item.model}` : ""}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-slate-700">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                            {item.asset_category || "-"}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-slate-700">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getAssetStatusChipClass(
                              item.status,
                            )}`}
                          >
                            {formatAssetStatusLabel(item.status, assetStatusLabels)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-slate-700">
                          <div>{item.owner_name || "-"}</div>
                          <div className="text-xs text-slate-500">{item.location || "-"}</div>
                        </td>
                        <td className="px-2 py-3 text-slate-700">{formatDate(item.purchase_date, locale)}</td>
                        <td className="px-2 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${evidenceCount > 0 ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                            {formatNumber(evidenceCount)}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenDetail(item);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                            >
                              <Eye size={13} />
                              {tt("common.view")}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEditAsset(item);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              <PencilLine size={13} />
                              {tt("common.edit")}
                            </button>
                            <button
                              type="button"
                              disabled={assetActionId === item.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteAsset(item);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 size={13} />
                              {assetActionId === item.id
                                ? tt("common.processing")
                                : canHardDelete
                                  ? tt("common.delete")
                                  : tt("common.archive")}
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

        {activeSection === "licenses" ? (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-indigo-600" />
                <h2 className="text-lg font-black text-slate-900">
                  {licenseEditingId ? tt("licenses.formEdit") : tt("licenses.formAdd")}
                </h2>
              </div>
              {licenseEditingId ? (
                <button
                  type="button"
                  onClick={resetLicenseForm}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <X size={14} />
                  {tt("common.cancelEdit")}
                </button>
              ) : null}
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSaveLicense}>
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
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
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

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
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

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">{tt("licenses.tableLicense")}</th>
                    <th className="px-2 py-2">{tt("licenses.tableStatus")}</th>
                    <th className="px-2 py-2 text-right">{tt("licenses.tableTotal")}</th>
                    <th className="px-2 py-2 text-right">{tt("licenses.tableAssigned")}</th>
                    <th className="px-2 py-2 text-right">{tt("licenses.tableAvailable")}</th>
                    <th className="px-2 py-2">{tt("licenses.tableExpiry")}</th>
                    <th className="px-2 py-2 text-right">{tt("licenses.tableActions")}</th>
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
                          className="cursor-pointer border-b border-slate-100 align-top transition hover:bg-slate-50/70"
                          onClick={() => handleOpenLicenseDetail(item)}
                        >
                          <td className="px-2 py-3 text-slate-700">
                            <div className="font-semibold text-slate-800">{item.license_name || "-"}</div>
                            <div className="text-xs text-slate-500">
                              {item.vendor || "-"} {item.license_type ? `• ${item.license_type}` : ""}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-slate-700">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getLicenseStatusChipClass(
                                item.status,
                              )}`}
                            >
                              {formatLicenseStatusLabel(item.status, licenseStatusLabels)}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-right font-semibold text-slate-800">{formatNumber(totalSeats)}</td>
                          <td className="px-2 py-3 text-right text-slate-700">{formatNumber(assignedSeats)}</td>
                          <td className="px-2 py-3 text-right text-emerald-700">{formatNumber(availableSeats)}</td>
                          <td className="px-2 py-3 text-slate-700">{formatDate(item.expiry_date, locale)}</td>
                          <td className="px-2 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenLicenseDetail(item);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
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
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                <PencilLine size={13} />
                                {tt("common.edit")}
                              </button>
                              <button
                                type="button"
                                disabled={licenseActionId === item.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteLicense(item);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 size={13} />
                                {licenseActionId === item.id
                                  ? tt("common.processing")
                                  : canHardDelete
                                    ? tt("common.delete")
                                    : tt("common.archive")}
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
          </article>
        </section>
        ) : null}

        {activeSection === "notebooks" ? <NotebookInventoryManagementPanel userRole={userRole} /> : null}

        {activeSection === "activity" ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onClick={() => setSelectedAsset(null)}>
            <article
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{tt("assets.detailTitle")}</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedAsset.asset_name || "-"}</h3>
                  <p className="mt-1 text-sm text-slate-500">{tt("assets.detailCode")}: {selectedAsset.asset_tag || "-"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <X size={14} />
                  {tt("common.close")}
                </button>
              </div>

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

              {(() => {
                const evidenceAttachments = getAssetEvidenceAttachments(selectedAsset);
                const assetLogs = getAssetActivityLogs(selectedAsset).slice(0, 8);
                return (
                  <>
                    <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black text-slate-800">{tt("assets.evidenceTitle")}</h4>
                          <p className="mt-1 text-xs text-slate-500">{formatNumber(evidenceAttachments.length)} {tt("assets.tableEvidence")}</p>
                        </div>
                        {evidenceAttachments.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAssetPreview(evidenceAttachments, 0)}
                            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                          >
                            <Eye size={14} />
                            {tt("common.view")}
                          </button>
                        ) : null}
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
