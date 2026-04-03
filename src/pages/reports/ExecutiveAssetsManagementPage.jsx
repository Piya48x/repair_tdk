import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
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
import NotebookInventoryManagementPanel from "./NotebookInventoryManagementPanel";

const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");

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

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH");
}

function formatDetailValue(item, key) {
  if (key === "purchase_date" || key === "warranty_end_date") {
    return formatDate(item?.[key]);
  }
  if (key === "status") {
    const matched = STATUS_OPTIONS.find((option) => option.value === normalizeStatus(item?.[key]));
    return matched?.label || normalizeText(item?.[key]) || "-";
  }
  return normalizeText(item?.[key]) || "-";
}

function formatLicenseDetailValue(item, key) {
  if (key === "expiry_date" || key === "renewal_date") {
    return formatDate(item?.[key]);
  }
  if (key === "quantity_total" || key === "quantity_assigned") {
    return NUMBER_FORMATTER.format(normalizeInteger(item?.[key], 0));
  }
  if (key === "status") {
    const matched = LICENSE_STATUS_OPTIONS.find(
      (option) => option.value === normalizeLicenseStatus(item?.[key]),
    );
    return matched?.label || normalizeText(item?.[key]) || "-";
  }
  return normalizeText(item?.[key]) || "-";
}

function formatAssetStatusLabel(status) {
  const matched = STATUS_OPTIONS.find((option) => option.value === normalizeStatus(status));
  return matched?.label || normalizeText(status) || "-";
}

function formatLicenseStatusLabel(status) {
  const matched = LICENSE_STATUS_OPTIONS.find(
    (option) => option.value === normalizeLicenseStatus(status),
  );
  return matched?.label || normalizeText(status) || "-";
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
  const fileInputRef = useRef(null);
  const licenseFileInputRef = useRef(null);
  const [activeSection, setActiveSection] = useState("assets");
  const [userRole, setUserRole] = useState("");
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
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [licenseFormData, setLicenseFormData] = useState(EMPTY_LICENSE_FORM);

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
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (error || !mounted) return;

        const role = normalizeText(data?.role).toLowerCase();
        setUserRole(role);
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
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load it_assets error:", error);
      toast.error(error?.message || "โหลดข้อมูลอุปกรณ์ไม่สำเร็จ");
      setAssets([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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
      toast.error(error?.message || "โหลดข้อมูลไลเซนส์ไม่สำเร็จ");
      setLicenses([]);
    } finally {
      if (!silent) setLicenseLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssets();
    void loadLicenses();
  }, [loadAssets, loadLicenses]);

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
    setEditingId("");
    setFormData(EMPTY_FORM);
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

  const handleSaveAsset = async (event) => {
    event.preventDefault();
    if (saving) return;

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
      toast.error("กรุณากรอกรหัสทรัพย์สินและชื่ออุปกรณ์");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("it_assets").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("อัปเดตข้อมูลอุปกรณ์แล้ว");
      } else {
        const { error } = await supabase.from("it_assets").insert(payload);
        if (error) throw error;
        toast.success("เพิ่มอุปกรณ์ใหม่แล้ว");
      }

      resetForm();
      await loadAssets({ silent: true });
    } catch (error) {
      console.error("Save it_asset error:", error);
      toast.error(error?.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleEditAsset = (item) => {
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
      toast.error("กรุณากรอกชื่อไลเซนส์");
      return;
    }

    setLicenseSaving(true);
    try {
      if (licenseEditingId) {
        const { error } = await supabase.from("it_licenses").update(payload).eq("id", licenseEditingId);
        if (error) throw error;
        toast.success("อัปเดตไลเซนส์แล้ว");
      } else {
        const { error } = await supabase.from("it_licenses").insert(payload);
        if (error) throw error;
        toast.success("เพิ่มไลเซนส์ใหม่แล้ว");
      }

      resetLicenseForm();
      await loadLicenses({ silent: true });
    } catch (error) {
      console.error("Save it_license error:", error);
      toast.error(error?.message || "บันทึกข้อมูลไลเซนส์ไม่สำเร็จ");
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
      .select("id");
    if (error) throw error;
    return Array.isArray(data) ? data.length : 0;
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
        ? `ยืนยันลบไลเซนส์ ${item.license_name || "-"} แบบถาวร?`
        : `สิทธิ์ของคุณจะจัดเก็บแทนการลบถาวร\nยืนยันจัดเก็บไลเซนส์ ${item.license_name || "-"} ?`,
    );
    if (!ok) return;

    setLicenseActionId(item.id);
    try {
      if (canHardDelete) {
        await deleteLicenseHard(item.id);
        setLicenses((prev) => prev.filter((row) => row.id !== item.id));
        setSelectedLicense((prev) => (prev?.id === item.id ? null : prev));
        toast.success("ลบข้อมูลไลเซนส์แล้ว");
      } else {
        const archivedCount = await archiveLicense(item.id);
        if (archivedCount > 0) {
          setLicenses((prev) =>
            prev.map((row) => (row.id === item.id ? { ...row, status: "inactive" } : row)),
          );
          setSelectedLicense((prev) =>
            prev?.id === item.id ? { ...prev, status: "inactive" } : prev,
          );
          toast.success("เปลี่ยนสถานะไลเซนส์เป็นไม่ใช้งานแล้ว");
        } else {
          throw new Error("ไม่สามารถจัดเก็บไลเซนส์ได้");
        }
      }
      await loadLicenses({ silent: true });
    } catch (error) {
      console.error("Delete it_license error:", error);
      toast.error(error?.message || "ลบข้อมูลไลเซนส์ไม่สำเร็จ");
    }
    setLicenseActionId("");
  };

  const handleDeleteAsset = async (item) => {
    if (assetActionId && assetActionId === item.id) return;
    const ok = window.confirm(
      canHardDelete
        ? `ยืนยันลบอุปกรณ์ ${item.asset_tag || "-"} แบบถาวร?`
        : `สิทธิ์ของคุณจะจัดเก็บแทนการลบถาวร\nยืนยันจัดเก็บอุปกรณ์ ${item.asset_tag || "-"} ?`,
    );
    if (!ok) return;

    setAssetActionId(item.id);
    try {
      if (canHardDelete) {
        await deleteAssetHard(item.id);
        setAssets((prev) => prev.filter((row) => row.id !== item.id));
        setSelectedAsset((prev) => (prev?.id === item.id ? null : prev));
        toast.success("ลบข้อมูลอุปกรณ์แล้ว");
      } else {
        const archivedCount = await archiveAsset(item.id);
        if (archivedCount > 0) {
          setAssets((prev) =>
            prev.map((row) => (row.id === item.id ? { ...row, status: "retired" } : row)),
          );
          setSelectedAsset((prev) =>
            prev?.id === item.id ? { ...prev, status: "retired" } : prev,
          );
          toast.success("เปลี่ยนสถานะอุปกรณ์เป็นปลดระวางแล้ว");
        } else {
          throw new Error("ไม่สามารถจัดเก็บอุปกรณ์ได้");
        }
      }
      await loadAssets({ silent: true });
    } catch (error) {
      console.error("Delete it_asset error:", error);
      toast.error(error?.message || "ลบข้อมูลไม่สำเร็จ");
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
        toast.error("ไม่พบชีตข้อมูลในไฟล์");
        return;
      }

      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        raw: true,
        defval: "",
      });

      if (!Array.isArray(rows) || rows.length === 0) {
        toast.error("ไฟล์ว่างหรือไม่พบข้อมูลสำหรับนำเข้า");
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
        toast.error("ไม่พบแถวที่มีรหัสทรัพย์สินและชื่ออุปกรณ์ครบ");
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
        `นำเข้าสำเร็จ เพิ่ม ${insertCount} | อัปเดต ${updateCount} | ข้าม ${invalidCount + dedupeCount}`,
      );
      await loadAssets({ silent: true });
    } catch (error) {
      console.error("Import it_assets error:", error);
      toast.error(error?.message || "นำเข้าไฟล์ไม่สำเร็จ");
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
        toast.error("ไม่พบชีตข้อมูลในไฟล์ไลเซนส์");
        return;
      }

      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        raw: true,
        defval: "",
      });

      if (!Array.isArray(rows) || rows.length === 0) {
        toast.error("ไฟล์ไลเซนส์ว่างหรือไม่พบข้อมูลสำหรับนำเข้า");
        return;
      }

      const validRows = rows
        .map((row) => mapLicenseRowToPayload(row))
        .filter((row) => row.license_name);
      const invalidCount = rows.length - validRows.length;

      if (validRows.length === 0) {
        toast.error("ไม่พบแถวที่มีชื่อไลเซนส์");
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
        `นำเข้าไลเซนส์สำเร็จ เพิ่ม ${inserts.length} | อัปเดต ${updates.length} | ข้าม ${invalidCount + dedupeCount}`,
      );
      await loadLicenses({ silent: true });
    } catch (error) {
      console.error("Import it_licenses error:", error);
      toast.error(error?.message || "นำเข้าไลเซนส์ไม่สำเร็จ");
    } finally {
      setLicenseImporting(false);
    }
  };

  const handleExportAssetsExcel = () => {
    if (!Array.isArray(filteredAssets) || filteredAssets.length === 0) {
      toast.error("ไม่มีรายการอุปกรณ์สำหรับส่งออก");
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
    toast.success(`ส่งออกข้อมูลสำเร็จ ${NUMBER_FORMATTER.format(exportRows.length)} รายการ`);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <ReportsTopbar backTo="/admin-dashboard" backLabel="แดชบอร์ดแอดมิน" showHub={false} />

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                การจัดการอุปกรณ์
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                จัดการอุปกรณ์สำหรับรายงานผู้บริหาร
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                เพิ่ม แก้ไข ลบ และนำเข้าข้อมูลจาก Excel/CSV เพื่ออัปเดตสต็อกอุปกรณ์ให้รายงานผู้บริหารแบบต่อเนื่อง
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
                {importing ? "กำลังนำเข้า..." : "นำเข้าอุปกรณ์ (Excel/CSV)"}
              </button>

              <button
                type="button"
                onClick={() => licenseFileInputRef.current?.click()}
                disabled={licenseImporting}
                className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload size={16} />
                {licenseImporting ? "กำลังนำเข้า..." : "นำเข้าไลเซนส์ (Excel/CSV)"}
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
                รีเฟรช
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
              หัวคอลัมน์ที่รองรับสำหรับนำเข้าอุปกรณ์
            </div>
            <p className="mt-2">
              {TABLE_COLUMNS.join(", ")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              ต้องมีอย่างน้อย: <span className="font-semibold">asset_tag</span>, <span className="font-semibold">asset_name</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              ค่า category สำหรับฟอร์มและรายงานหลัก: <span className="font-semibold">PC, Notebook, Monitor, Printer</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              คอลัมน์ไลเซนส์: <span className="font-semibold">{LICENSE_TABLE_COLUMNS.join(", ")}</span>
            </p>
          </div>

          <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-800">
              <FileSpreadsheet size={16} />
              คู่มือนำเข้าข้อมูล (อุปกรณ์และไลเซนส์)
            </summary>
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <p>
                คอลัมน์บังคับของอุปกรณ์: <span className="font-semibold">asset_tag, asset_name</span>
              </p>
              <p>
                หมวดหมู่ที่ใช้ในสรุปผู้บริหาร: <span className="font-semibold">PC, Notebook, Monitor, Printer</span>
              </p>
              <p>คอลัมน์อุปกรณ์: {TABLE_COLUMNS.join(", ")}</p>
              <p>คอลัมน์ไลเซนส์: {LICENSE_TABLE_COLUMNS.join(", ")}</p>
            </div>
          </details>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">อุปกรณ์ทั้งหมด</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{NUMBER_FORMATTER.format(liveSummary.total)}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">ใช้งานได้</p>
              <p className="mt-1 text-2xl font-black text-emerald-900">{NUMBER_FORMATTER.format(liveSummary.usable)}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-700">เสีย/ใช้ไม่ได้</p>
              <p className="mt-1 text-2xl font-black text-rose-900">{NUMBER_FORMATTER.format(liveSummary.broken)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">พีซี</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{NUMBER_FORMATTER.format(liveSummary.pc)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">โน้ตบุ๊ก</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{NUMBER_FORMATTER.format(liveSummary.notebook)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">จอภาพ</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{NUMBER_FORMATTER.format(liveSummary.monitor)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">เครื่องพิมพ์</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{NUMBER_FORMATTER.format(liveSummary.printer)}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-700">ไลเซนส์ทั้งหมด</p>
              <p className="mt-1 text-2xl font-black text-indigo-900">{NUMBER_FORMATTER.format(liveLicenseSummary.total)}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-700">ไลเซนส์ใช้งานได้</p>
              <p className="mt-1 text-2xl font-black text-indigo-900">{NUMBER_FORMATTER.format(liveLicenseSummary.usable)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">ไลเซนส์ใช้ไม่ได้</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{NUMBER_FORMATTER.format(liveLicenseSummary.broken)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setActiveSection("assets")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeSection === "assets"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                สต็อกอุปกรณ์
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
                สต็อกไลเซนส์
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
                Notebook Center
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                สิทธิ์ผู้ใช้: {userRole || "ไม่ทราบ"}
              </span>
              <span
                className={`rounded-full border px-3 py-1 font-semibold ${
                  canHardDelete
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {canHardDelete
                  ? "โหมดลบ: ลบถาวร (Admin/IT Support/IT Manager)"
                  : "โหมดลบ: จัดเก็บ (ไม่มีสิทธิ์ลบถาวร)"}
              </span>
            </div>
          </div>
        </section>

        {activeSection === "assets" ? (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-900">
                {editingId ? "แก้ไขข้อมูลอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}
              </h2>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <X size={14} />
                  ยกเลิกแก้ไข
                </button>
              ) : null}
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSaveAsset}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={formData.asset_tag}
                  onChange={(event) => setFormData((prev) => ({ ...prev, asset_tag: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="รหัสทรัพย์สิน *"
                  required
                />
                <input
                  value={formData.asset_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, asset_name: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="ชื่ออุปกรณ์ *"
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
                  {CATEGORY_OPTIONS.map((item) => (
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
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500">
                ระบบนับสถานะเสีย/ใช้ไม่ได้จาก: <span className="font-semibold">เสีย, ซ่อม, ปลดระวาง, สูญหาย</span>
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={formData.brand}
                  onChange={(event) => setFormData((prev) => ({ ...prev, brand: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="ยี่ห้อ"
                />
                <input
                  value={formData.model}
                  onChange={(event) => setFormData((prev) => ({ ...prev, model: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="รุ่น"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={formData.serial_number}
                  onChange={(event) => setFormData((prev) => ({ ...prev, serial_number: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="เลขซีเรียล"
                />
                <input
                  value={formData.location}
                  onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="ตำแหน่งที่ตั้ง"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={formData.owner_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, owner_name: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="ผู้ใช้งาน"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={formData.purchase_date}
                    onChange={(event) => setFormData((prev) => ({ ...prev, purchase_date: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    type="date"
                    title="วันที่ซื้อ"
                  />
                  <input
                    value={formData.warranty_end_date}
                    onChange={(event) => setFormData((prev) => ({ ...prev, warranty_end_date: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    type="date"
                    title="วันหมดประกัน"
                  />
                </div>
              </div>

              <textarea
                value={formData.notes}
                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                className="min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="หมายเหตุ"
              />

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingId ? <PencilLine size={16} /> : <Save size={16} />}
                {saving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มข้อมูล"}
              </button>
            </form>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-900">
                  รายการอุปกรณ์ ({NUMBER_FORMATTER.format(filteredAssets.length)})
                </h2>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={showArchivedAssets}
                    onChange={(event) => setShowArchivedAssets(event.target.checked)}
                    className="rounded border-slate-300"
                  />
                  แสดงรายการที่จัดเก็บแล้ว (ปลดระวาง/สูญหาย)
                </label>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-[300px]">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                  placeholder="ค้นหารหัสทรัพย์สิน ชื่อ หรือหมวดหมู่..."
                />
                </div>
                <button
                  type="button"
                  onClick={handleExportAssetsExcel}
                  disabled={filteredAssets.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download size={15} />
                  ส่งออก Excel
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={assetCategoryFilter}
                onChange={(event) => setAssetCategoryFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">ทุกหมวดหมู่</option>
                {CATEGORY_OPTIONS.map((item) => (
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
                <option value="all">ทุกสถานะ</option>
                {STATUS_OPTIONS.map((item) => (
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
                ล้างตัวกรอง
              </button>
            </div>

            {autoIncludedArchivedAssets ? (
              <p className="mt-2 text-xs font-medium text-amber-700">
                Search/status filter now includes archived retired and lost assets automatically.
              </p>
            ) : null}

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-slate-500">จำนวนที่แสดง</p>
                <p className="text-lg font-black text-slate-900">{NUMBER_FORMATTER.format(filteredAssetSummary.total)}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-emerald-700">ใช้งานได้</p>
                <p className="text-lg font-black text-emerald-900">{NUMBER_FORMATTER.format(filteredAssetSummary.usable)}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-rose-700">เสีย/ใช้ไม่ได้</p>
                <p className="text-lg font-black text-rose-900">{NUMBER_FORMATTER.format(filteredAssetSummary.broken)}</p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <span className="font-semibold text-slate-600">
                เลือกแล้ว: {NUMBER_FORMATTER.format(selectedFilteredAssetCount)} / {NUMBER_FORMATTER.format(filteredAssets.length)}
              </span>
              <button
                type="button"
                onClick={handleClearSelectedAssets}
                disabled={selectedAssetIds.length === 0}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ล้างรายการที่เลือก
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
                        aria-label="เลือกอุปกรณ์ทั้งหมดที่แสดง"
                      />
                    </th>
                    <th className="px-2 py-2">รหัสทรัพย์สิน</th>
                    <th className="px-2 py-2">ชื่ออุปกรณ์</th>
                    <th className="px-2 py-2">หมวดหมู่</th>
                    <th className="px-2 py-2">สถานะ</th>
                    <th className="px-2 py-2">ผู้ใช้/ตำแหน่ง</th>
                    <th className="px-2 py-2">วันที่ซื้อ</th>
                    <th className="px-2 py-2 text-right">การทำงาน</th>
                    </tr>
                  </thead>
                  <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-2 py-8 text-center text-slate-500">
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  ) : filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-2 py-8 text-center text-slate-500">
                        ไม่พบข้อมูลอุปกรณ์
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((item) => (
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
                            aria-label={`เลือก ${item.asset_tag || "อุปกรณ์"}`}
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
                            {formatAssetStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-slate-700">
                          <div>{item.owner_name || "-"}</div>
                          <div className="text-xs text-slate-500">{item.location || "-"}</div>
                        </td>
                        <td className="px-2 py-3 text-slate-700">{formatDate(item.purchase_date)}</td>
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
                              ดู
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
                              แก้ไข
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
                              {assetActionId === item.id ? "กำลังดำเนินการ..." : canHardDelete ? "ลบ" : "จัดเก็บ"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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
                  {licenseEditingId ? "แก้ไขข้อมูลไลเซนส์" : "เพิ่มไลเซนส์"}
                </h2>
              </div>
              {licenseEditingId ? (
                <button
                  type="button"
                  onClick={resetLicenseForm}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <X size={14} />
                  ยกเลิกแก้ไข
                </button>
              ) : null}
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSaveLicense}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={licenseFormData.license_name}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, license_name: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="ชื่อไลเซนส์ *"
                  required
                />
                <input
                  value={licenseFormData.vendor}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, vendor: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="ผู้ให้บริการ"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={licenseFormData.license_type}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, license_type: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="ประเภทไลเซนส์"
                />
                <select
                  value={licenseFormData.status}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, status: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {LICENSE_STATUS_OPTIONS.map((item) => (
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
                  placeholder="จำนวนทั้งหมด"
                />
                <input
                  value={licenseFormData.quantity_assigned}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, quantity_assigned: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  type="number"
                  min={0}
                  placeholder="จำนวนที่ใช้งาน"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={licenseFormData.expiry_date}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, expiry_date: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  type="date"
                  title="วันหมดอายุ"
                />
                <input
                  value={licenseFormData.renewal_date}
                  onChange={(event) => setLicenseFormData((prev) => ({ ...prev, renewal_date: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  type="date"
                  title="วันต่ออายุ"
                />
              </div>

              <textarea
                value={licenseFormData.notes}
                onChange={(event) => setLicenseFormData((prev) => ({ ...prev, notes: event.target.value }))}
                className="min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="หมายเหตุ"
              />

              <button
                type="submit"
                disabled={licenseSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {licenseEditingId ? <PencilLine size={16} /> : <Save size={16} />}
                {licenseSaving ? "กำลังบันทึก..." : licenseEditingId ? "บันทึกการแก้ไข" : "เพิ่มไลเซนส์"}
              </button>
            </form>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-indigo-600" />
                  <h2 className="text-lg font-black text-slate-900">
                    รายการไลเซนส์ ({NUMBER_FORMATTER.format(filteredLicenses.length)})
                  </h2>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={showArchivedLicenses}
                    onChange={(event) => setShowArchivedLicenses(event.target.checked)}
                    className="rounded border-slate-300"
                  />
                  แสดงรายการที่จัดเก็บแล้ว (ไม่ใช้งาน/หมดอายุ)
                </label>
              </div>
              <div className="relative w-full sm:w-[280px]">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={licenseSearchQuery}
                  onChange={(event) => setLicenseSearchQuery(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                  placeholder="ค้นหาชื่อไลเซนส์ ผู้ให้บริการ หรือประเภท..."
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={licenseStatusFilter}
                onChange={(event) => setLicenseStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">ทุกสถานะ</option>
                {LICENSE_STATUS_OPTIONS.map((item) => (
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
                ล้างตัวกรอง
              </button>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-slate-500">จำนวนที่แสดง</p>
                <p className="text-lg font-black text-slate-900">{NUMBER_FORMATTER.format(filteredLicenseSummary.total)}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-indigo-700">ใช้งานได้</p>
                <p className="text-lg font-black text-indigo-900">{NUMBER_FORMATTER.format(filteredLicenseSummary.usable)}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-rose-700">ใช้ไม่ได้</p>
                <p className="text-lg font-black text-rose-900">{NUMBER_FORMATTER.format(filteredLicenseSummary.broken)}</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">ไลเซนส์</th>
                    <th className="px-2 py-2">สถานะ</th>
                    <th className="px-2 py-2 text-right">ทั้งหมด</th>
                    <th className="px-2 py-2 text-right">ใช้งานแล้ว</th>
                    <th className="px-2 py-2 text-right">คงเหลือ</th>
                    <th className="px-2 py-2">วันหมดอายุ</th>
                    <th className="px-2 py-2 text-right">การทำงาน</th>
                  </tr>
                </thead>
                <tbody>
                  {licenseLoading ? (
                    <tr>
                      <td colSpan={7} className="px-2 py-8 text-center text-slate-500">
                        กำลังโหลดข้อมูลไลเซนส์...
                      </td>
                    </tr>
                  ) : filteredLicenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-2 py-8 text-center text-slate-500">
                        ไม่พบข้อมูลไลเซนส์
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
                              {formatLicenseStatusLabel(item.status)}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-right font-semibold text-slate-800">{NUMBER_FORMATTER.format(totalSeats)}</td>
                          <td className="px-2 py-3 text-right text-slate-700">{NUMBER_FORMATTER.format(assignedSeats)}</td>
                          <td className="px-2 py-3 text-right text-emerald-700">{NUMBER_FORMATTER.format(availableSeats)}</td>
                          <td className="px-2 py-3 text-slate-700">{formatDate(item.expiry_date)}</td>
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
                                ดู
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
                                แก้ไข
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
                                {licenseActionId === item.id ? "กำลังดำเนินการ..." : canHardDelete ? "ลบ" : "จัดเก็บ"}
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

        {selectedAsset ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onClick={() => setSelectedAsset(null)}>
            <article
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">รายละเอียดอุปกรณ์</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedAsset.asset_name || "-"}</h3>
                  <p className="mt-1 text-sm text-slate-500">รหัสทรัพย์สิน: {selectedAsset.asset_tag || "-"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <X size={14} />
                  ปิด
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DETAIL_FIELDS.map((field) => (
                  <div key={field.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{field.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatDetailValue(selectedAsset, field.key)}
                    </p>
                  </div>
                ))}
              </div>
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
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">รายละเอียดไลเซนส์</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedLicense.license_name || "-"}</h3>
                  <p className="mt-1 text-sm text-slate-500">{selectedLicense.vendor || "-"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLicense(null)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <X size={14} />
                  ปิด
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {LICENSE_DETAIL_FIELDS.map((field) => (
                  <div key={field.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{field.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatLicenseDetailValue(selectedLicense, field.key)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : null}
      </div>
    </div>
  );
}
