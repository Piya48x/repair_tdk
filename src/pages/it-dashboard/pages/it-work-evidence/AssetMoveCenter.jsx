import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  ChevronDown,
  Eye,
  ImagePlus,
  Loader2,
  MapPin,
  MoveRight,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../../../lib/supabaseClient";
import {
  cancelAssetMove,
  createAssetMove,
  isAssetMoveSchemaError,
  loadAssetMoveRegistryAssets,
  loadAssetMoves,
  normalizeAssetMoveImages,
  normalizeAssetMoveText,
  uploadAssetMoveEvidenceFiles,
} from "../../../../services/assetMoveService";

const MAX_IMAGES_PER_GROUP = 6;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const MOVE_TYPES = [
  { value: "move", label: "ย้าย" },
  { value: "swap_user", label: "สลับผู้ใช้" },
  { value: "return", label: "รับคืน" },
  { value: "send_repair", label: "ส่งซ่อม" },
  { value: "retire", label: "ปลดระวาง" },
];

const DEVICE_TYPES = [
  { value: "pc", label: "PC" },
  { value: "notebook", label: "Notebook" },
  { value: "monitor", label: "Monitor" },
  { value: "printer", label: "Printer" },
  { value: "other", label: "อื่น ๆ" },
];

const ACCESSORY_OPTIONS = ["Charger", "Dock", "Mouse", "Keyboard"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function toLocalDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getLocalDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value || "-";
}

function getEmployeeInitials(employee) {
  const source = normalizeAssetMoveText(
    employee?.full_name || employee?.employee_code || employee?.email,
  );
  if (!source) return "?";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function sortAssetRegistryItems(left, right) {
  return normalizeAssetMoveText(left?.asset_tag).localeCompare(
    normalizeAssetMoveText(right?.asset_tag),
    "en",
    { numeric: true, sensitivity: "base" },
  );
}

function getRegistryDeviceType(asset) {
  const source = `${asset?.asset_category || ""} ${asset?.asset_name || ""}`.toLowerCase();
  if (source.includes("notebook") || source.includes("laptop")) return "notebook";
  if (source.includes("monitor") || source.includes("display")) return "monitor";
  if (source.includes("printer")) return "printer";
  if (["pc", "cpu", "desktop", "server", "computer"].some((token) => source.includes(token))) return "pc";
  return "other";
}

function getRegistryBrandModel(asset) {
  return [asset?.brand, asset?.model].map(normalizeAssetMoveText).filter(Boolean).join(" ")
    || normalizeAssetMoveText(asset?.asset_name);
}

function buildForm() {
  return {
    performed_at: toLocalDateTime(),
    move_type: "move",
    requester_profile_id: "",
    requester_name: "",
    requester_employee_code: "",
    ticket_reference: "",
    device_type: "pc",
    custom_device_type: "",
    asset_code: "",
    serial_number: "",
    brand_model: "",
    old_user_name: "",
    old_factory: "",
    old_building: "",
    old_floor: "",
    old_department: "",
    old_desk: "",
    new_user_name: "",
    new_to_it_stock: false,
    new_factory: "",
    new_building: "",
    new_floor: "",
    new_department: "",
    new_desk: "",
    condition_status: "normal",
    condition_details: "",
    accessories: [],
    accessory_other: "",
    notes: "",
  };
}

function buildFilters() {
  return { query: "", moveType: "ALL", status: "ALL", start: "", end: "" };
}

function describeLocation(record, prefix) {
  return [
    record?.[`${prefix}_factory`],
    record?.[`${prefix}_building`],
    record?.[`${prefix}_floor`],
    record?.[`${prefix}_department`],
    record?.[`${prefix}_desk`],
  ].map(normalizeAssetMoveText).filter(Boolean).join(" / ") || "-";
}

function revokeFiles(entries) {
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
  });
}

function FieldLabel({ children, required = false }) {
  return (
    <span className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">
      {children}{required ? <span className="ml-1 text-rose-500">*</span> : null}
    </span>
  );
}

function LocationFields({ prefix, form, setForm, inputClass }) {
  const fields = [
    ["factory", "โรงงาน"],
    ["building", "อาคาร"],
    ["floor", "ชั้น"],
    ["department", "แผนก"],
    ["desk", "โต๊ะ / จุดติดตั้ง"],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {fields.map(([key, label]) => {
        const field = `${prefix}_${key}`;
        return (
          <label key={field}>
            <FieldLabel>{label}</FieldLabel>
            <input value={form[field]} onChange={(event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))} className={inputClass} />
          </label>
        );
      })}
    </div>
  );
}

function ImagePicker({ title, hint, entries, setEntries, inputClass }) {
  const inputRef = useRef(null);

  const append = (files) => {
    const incoming = Array.from(files || []);
    const available = Math.max(0, MAX_IMAGES_PER_GROUP - entries.length);
    if (available === 0) {
      toast.error(`แนบได้สูงสุด ${MAX_IMAGES_PER_GROUP} รูป`);
      return 0;
    }

    const valid = incoming.filter((file) => {
      if (!String(file?.type || "").startsWith("image/")) {
        toast.error(`${file?.name || "ไฟล์"} ไม่ใช่ไฟล์รูปภาพ`);
        return false;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`${file.name} มีขนาดเกิน 5 MB`);
        return false;
      }
      return true;
    }).slice(0, available);

    setEntries((previous) => [
      ...previous,
      ...valid.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
    return valid.length;
  };

  const handlePaste = (event) => {
    const itemFiles = Array.from(event.clipboardData?.items || [])
      .filter((item) => String(item?.type || "").startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    const fileFallbacks = Array.from(event.clipboardData?.files || []).filter((file) =>
      String(file?.type || "").startsWith("image/"),
    );
    const imageFiles = itemFiles.length > 0 ? itemFiles : fileFallbacks;
    if (imageFiles.length === 0) return;

    event.preventDefault();
    event.stopPropagation();
    const addedCount = append(imageFiles);
    if (addedCount > 0) toast.success(`วางรูปใน ${title} แล้ว ${addedCount} รูป`);
  };

  const remove = (index) => {
    setEntries((previous) => {
      const target = previous[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return previous.filter((_, entryIndex) => entryIndex !== index);
    });
  };

  return (
    <div
      className={`rounded-2xl border p-4 outline-none transition focus:ring-4 ${inputClass.includes("slate-7") ? "border-slate-700 bg-slate-900/30 focus:ring-violet-500/15" : "border-slate-200 bg-slate-50 focus:ring-violet-100"}`}
      tabIndex={0}
      onPaste={handlePaste}
      aria-label={`${title} รองรับการวางรูปด้วย Ctrl+V`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-slate-100">{title} <span className="text-rose-500">*</span></p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-[#2b59b0] px-3 py-2 text-xs font-bold text-white hover:bg-[#244a95]">
          <ImagePlus size={15} /> เพิ่มรูป
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { append(event.target.files); event.target.value = ""; }} />
      </div>
      <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200">
        คลิกกรอบ {title} แล้วกด Ctrl+V เพื่อวางรูปจาก Clipboard
      </div>
      {entries.length ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((entry, index) => (
            <div key={`${entry.file.name}-${entry.file.lastModified}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <img src={entry.previewUrl} alt={entry.file.name} className="h-28 w-full object-cover" />
              <button type="button" onClick={() => remove(index)} className="absolute right-2 top-2 rounded-lg bg-slate-950/70 p-1 text-white" aria-label="ลบรูป"><X size={14} /></button>
              <p className="truncate px-2 py-1.5 text-[11px] text-slate-500 dark:text-slate-300">{entry.file.name}</p>
            </div>
          ))}
        </div>
      ) : <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">ยังไม่ได้เลือกรูป</div>}
    </div>
  );
}

export default function AssetMoveCenter({
  theme,
  uiTheme,
  currentUser,
  employeeOptions = [],
  employeeLoading = false,
  openSignal = 0,
}) {
  const [records, setRecords] = useState([]);
  const [registryAssets, setRegistryAssets] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(true);
  const [registryLoadError, setRegistryLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [cancelRecord, setCancelRecord] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [form, setForm] = useState(buildForm);
  const [beforeFiles, setBeforeFiles] = useState([]);
  const [afterFiles, setAfterFiles] = useState([]);
  const beforeFilesRef = useRef([]);
  const afterFilesRef = useRef([]);
  const [requesterLookupOpen, setRequesterLookupOpen] = useState(false);
  const [requesterActiveIndex, setRequesterActiveIndex] = useState(0);
  const [assetLookupOpen, setAssetLookupOpen] = useState(false);
  const [assetActiveIndex, setAssetActiveIndex] = useState(0);
  const [filters, setFilters] = useState(buildFilters);
  const deferredQuery = useDeferredValue(filters.query);
  const isDark = theme === "dark";
  const cardClass = `${uiTheme.surfaceCard} rounded-2xl border sm:rounded-3xl`;
  const inputClass = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none sm:rounded-2xl ${uiTheme.searchInputMobile}`;
  const softSurface = isDark ? "border-slate-700 bg-[#162136]" : "border-slate-200 bg-slate-50";

  const loadRecords = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const { data, error } = await loadAssetMoves();
    if (error) {
      const missing = isAssetMoveSchemaError(error);
      setSchemaMissing(missing);
      setLoadError(missing ? "กรุณารัน database/20260822_it_asset_move_history.sql ก่อนใช้งาน" : "ไม่สามารถโหลดประวัติเคลื่อนย้ายอุปกรณ์ได้");
      setRecords([]);
    } else {
      setRecords(Array.isArray(data) ? data : []);
      setSchemaMissing(false);
      setLoadError("");
    }
    if (!silent) setLoading(false);
  };

  const loadRegistryAssets = async ({ silent = false } = {}) => {
    if (!silent) setRegistryLoading(true);
    const { data, error } = await loadAssetMoveRegistryAssets();
    if (error) {
      setRegistryAssets([]);
      setRegistryLoadError("ไม่สามารถโหลด Asset Code จากทะเบียนสินทรัพย์ได้");
    } else {
      setRegistryAssets((Array.isArray(data) ? data : []).sort(sortAssetRegistryItems));
      setRegistryLoadError("");
    }
    if (!silent) setRegistryLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    void loadRecords();
    const channel = supabase
      .channel("it_asset_moves_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "it_asset_moves" }, () => {
        if (mounted) void loadRecords({ silent: true });
      })
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadRegistryAssets();
    const channel = supabase
      .channel("asset_move_registry_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "it_assets" }, () => {
        if (mounted) void loadRegistryAssets({ silent: true });
      })
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (openSignal <= 0) return;
    if (schemaMissing) {
      toast.error("กรุณารัน SQL สำหรับประวัติการเคลื่อนย้ายก่อนใช้งาน");
      return;
    }
    setFormOpen(true);
  }, [openSignal]);

  useEffect(() => {
    beforeFilesRef.current = beforeFiles;
  }, [beforeFiles]);

  useEffect(() => {
    afterFilesRef.current = afterFiles;
  }, [afterFiles]);

  useEffect(() => () => {
    revokeFiles(beforeFilesRef.current);
    revokeFiles(afterFilesRef.current);
  }, []);

  useEffect(() => {
    if (!formOpen && !detailRecord && !cancelRecord) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [cancelRecord, detailRecord, formOpen]);

  const resetForm = () => {
    revokeFiles(beforeFiles);
    revokeFiles(afterFiles);
    setBeforeFiles([]);
    setAfterFiles([]);
    setForm(buildForm());
    setAssetLookupOpen(false);
    setAssetActiveIndex(0);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    resetForm();
  };

  const filteredRecords = useMemo(() => {
    const query = normalizeAssetMoveText(deferredQuery).toLowerCase();
    return records.filter((record) => {
      const dateKey = getLocalDateKey(record.performed_at || record.created_at);
      const haystack = [
        record.move_id,
        record.asset_code,
        record.serial_number,
        record.brand_model,
        record.requester_name,
        record.requester_employee_code,
        record.ticket_reference,
        record.old_user_name,
        record.new_user_name,
        describeLocation(record, "old"),
        describeLocation(record, "new"),
      ].map((value) => normalizeAssetMoveText(value).toLowerCase()).join(" ");
      return (
        (filters.moveType === "ALL" || record.move_type === filters.moveType) &&
        (filters.status === "ALL" || record.status === filters.status) &&
        (!filters.start || dateKey >= filters.start) &&
        (!filters.end || dateKey <= filters.end) &&
        (!query || haystack.includes(query))
      );
    });
  }, [deferredQuery, filters.end, filters.moveType, filters.start, filters.status, records]);

  const requesterSuggestions = useMemo(() => {
    const query = normalizeAssetMoveText(form.requester_name).toLowerCase();
    return employeeOptions
      .filter((employee) => {
        if (!query) return true;
        return [
          employee.full_name,
          employee.employee_code,
          employee.email,
          employee.department,
        ]
          .map((value) => normalizeAssetMoveText(value).toLowerCase())
          .some((value) => value.includes(query));
      })
      .slice(0, 10);
  }, [employeeOptions, form.requester_name]);

  const selectedRequester = useMemo(
    () => employeeOptions.find((employee) => employee.id === form.requester_profile_id) || null,
    [employeeOptions, form.requester_profile_id],
  );

  const assetSuggestions = useMemo(() => {
    const query = normalizeAssetMoveText(form.asset_code).toLowerCase();
    return registryAssets
      .filter((asset) => {
        if (!query) return true;
        return [
          asset.asset_tag,
          asset.asset_name,
          asset.asset_category,
          asset.serial_number,
          asset.owner_name,
          asset.location,
        ]
          .map((value) => normalizeAssetMoveText(value).toLowerCase())
          .some((value) => value.includes(query));
      })
      .slice(0, 12);
  }, [form.asset_code, registryAssets]);

  const selectedRegistryAsset = useMemo(() => {
    const code = normalizeAssetMoveText(form.asset_code).toLowerCase();
    if (!code) return null;
    return registryAssets.find(
      (asset) => normalizeAssetMoveText(asset.asset_tag).toLowerCase() === code,
    ) || null;
  }, [form.asset_code, registryAssets]);

  const selectRegistryAsset = (assetId) => {
    const asset = registryAssets.find((item) => item.id === assetId);
    if (!asset) return;
    const deviceType = getRegistryDeviceType(asset);
    const hasStructuredLocation = [asset.factory, asset.building, asset.floor, asset.department]
      .some(normalizeAssetMoveText);
    setForm((previous) => ({
      ...previous,
      device_type: deviceType,
      custom_device_type: deviceType === "other"
        ? normalizeAssetMoveText(asset.asset_category) || "อุปกรณ์ IT"
        : "",
      asset_code: normalizeAssetMoveText(asset.asset_tag).toUpperCase(),
      serial_number: normalizeAssetMoveText(asset.serial_number).toUpperCase(),
      brand_model: getRegistryBrandModel(asset),
      old_user_name: normalizeAssetMoveText(asset.owner_name),
      old_factory: normalizeAssetMoveText(asset.factory),
      old_building: normalizeAssetMoveText(asset.building),
      old_floor: normalizeAssetMoveText(asset.floor),
      old_department: normalizeAssetMoveText(asset.department),
      old_desk: normalizeAssetMoveText(asset.room)
        || (!hasStructuredLocation ? normalizeAssetMoveText(asset.location) : ""),
    }));
    setAssetLookupOpen(false);
    setAssetActiveIndex(0);
  };

  const handleAssetCodeInput = (value) => {
    setForm((previous) => ({
      ...previous,
      asset_code: value.toUpperCase(),
      serial_number: "",
      brand_model: "",
      old_user_name: "",
      old_factory: "",
      old_building: "",
      old_floor: "",
      old_department: "",
      old_desk: "",
    }));
    setAssetLookupOpen(true);
    setAssetActiveIndex(0);
  };

  const handleAssetCodeKeyDown = (event) => {
    if (event.key === "Escape") {
      setAssetLookupOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setAssetLookupOpen(true);
      setAssetActiveIndex((previous) => (
        assetSuggestions.length > 0 ? Math.min(previous + 1, assetSuggestions.length - 1) : 0
      ));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setAssetActiveIndex((previous) => Math.max(previous - 1, 0));
      return;
    }
    if (event.key === "Enter" && assetLookupOpen && assetSuggestions[assetActiveIndex]) {
      event.preventDefault();
      selectRegistryAsset(assetSuggestions[assetActiveIndex].id);
    }
  };

  const selectRequester = (profileId) => {
    const profile = employeeOptions.find((item) => item.id === profileId);
    setForm((previous) => ({
      ...previous,
      requester_profile_id: profile?.id || "",
      requester_name: profile?.full_name || profile?.email || "",
      requester_employee_code: profile?.employee_code || "",
      old_user_name: previous.old_user_name || profile?.full_name || "",
      old_department: previous.old_department || profile?.department || "",
    }));
    setRequesterLookupOpen(false);
    setRequesterActiveIndex(0);
  };

  const handleRequesterInput = (value) => {
    setForm((previous) => ({
      ...previous,
      requester_profile_id: "",
      requester_name: value,
      requester_employee_code: "",
      old_user_name: previous.old_user_name === previous.requester_name
        ? ""
        : previous.old_user_name,
    }));
    setRequesterLookupOpen(true);
    setRequesterActiveIndex(0);
  };

  const handleRequesterKeyDown = (event) => {
    if (event.key === "Escape") {
      setRequesterLookupOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setRequesterLookupOpen(true);
      setRequesterActiveIndex((previous) => (
        requesterSuggestions.length > 0
          ? Math.min(previous + 1, requesterSuggestions.length - 1)
          : 0
      ));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setRequesterActiveIndex((previous) => Math.max(previous - 1, 0));
      return;
    }

    if (event.key === "Enter" && requesterLookupOpen && requesterSuggestions[requesterActiveIndex]) {
      event.preventDefault();
      selectRequester(requesterSuggestions[requesterActiveIndex].id);
    }
  };

  const toggleAccessory = (value) => {
    setForm((previous) => ({
      ...previous,
      accessories: previous.accessories.includes(value)
        ? previous.accessories.filter((item) => item !== value)
        : [...previous.accessories, value],
    }));
  };

  const validateForm = () => {
    if (!form.performed_at) return "กรุณาระบุวัน–เวลาดำเนินการ";
    if (!form.requester_name && !normalizeAssetMoveText(form.ticket_reference)) return "กรุณาเลือกผู้แจ้งหรือระบุเลข Ticket";
    if (!currentUser?.id) return "ไม่พบบัญชีผู้ดำเนินการ";
    if (!normalizeAssetMoveText(form.asset_code)) return "กรุณาระบุ Asset Code";
    if (!selectedRegistryAsset) return "กรุณาเลือก Asset Code จาก IT Asset Management";
    if (!normalizeAssetMoveText(form.brand_model)) return "กรุณาระบุยี่ห้อ/รุ่น";
    if (form.device_type === "other" && !normalizeAssetMoveText(form.custom_device_type)) return "กรุณาระบุประเภทอุปกรณ์อื่น ๆ";
    if (!form.new_to_it_stock && !normalizeAssetMoveText(form.new_user_name)) return "กรุณาระบุผู้ใช้ใหม่หรือเลือกคลัง IT";
    if (![form.old_factory, form.old_building, form.old_floor, form.old_department, form.old_desk].some(normalizeAssetMoveText)) return "กรุณาระบุสถานที่เดิมอย่างน้อย 1 ช่อง";
    if (![form.new_factory, form.new_building, form.new_floor, form.new_department, form.new_desk].some(normalizeAssetMoveText)) return "กรุณาระบุสถานที่ใหม่อย่างน้อย 1 ช่อง";
    if (form.condition_status === "damaged" && !normalizeAssetMoveText(form.condition_details)) return "กรุณาระบุรายละเอียดความชำรุด";
    if (beforeFiles.length === 0) return "กรุณาแนบรูปก่อนย้ายที่เห็นอุปกรณ์และ Asset Code";
    if (afterFiles.length === 0) return "กรุณาแนบรูปหลังย้ายที่เห็นตำแหน่งติดตั้งใหม่";
    return "";
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (saving) return;
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const [beforeImages, afterImages] = await Promise.all([
        uploadAssetMoveEvidenceFiles(beforeFiles.map((entry) => entry.file), "before", currentUser.id),
        uploadAssetMoveEvidenceFiles(afterFiles.map((entry) => entry.file), "after", currentUser.id),
      ]);
      const payload = {
        performed_at: new Date(form.performed_at).toISOString(),
        move_type: form.move_type,
        requester_profile_id: form.requester_profile_id || null,
        requester_name: normalizeAssetMoveText(form.requester_name),
        requester_employee_code: normalizeAssetMoveText(form.requester_employee_code),
        ticket_reference: normalizeAssetMoveText(form.ticket_reference),
        operator_profile_id: currentUser.id,
        operator_name: normalizeAssetMoveText(currentUser.name || currentUser.email) || "IT Support",
        device_type: form.device_type,
        custom_device_type: form.device_type === "other" ? normalizeAssetMoveText(form.custom_device_type) : "",
        asset_code: normalizeAssetMoveText(form.asset_code).toUpperCase(),
        serial_number: normalizeAssetMoveText(form.serial_number).toUpperCase(),
        brand_model: normalizeAssetMoveText(form.brand_model),
        old_user_name: normalizeAssetMoveText(form.old_user_name),
        old_factory: normalizeAssetMoveText(form.old_factory),
        old_building: normalizeAssetMoveText(form.old_building),
        old_floor: normalizeAssetMoveText(form.old_floor),
        old_department: normalizeAssetMoveText(form.old_department),
        old_desk: normalizeAssetMoveText(form.old_desk),
        new_user_name: form.new_to_it_stock ? "คลัง IT" : normalizeAssetMoveText(form.new_user_name),
        new_to_it_stock: Boolean(form.new_to_it_stock),
        new_factory: normalizeAssetMoveText(form.new_factory),
        new_building: normalizeAssetMoveText(form.new_building),
        new_floor: normalizeAssetMoveText(form.new_floor),
        new_department: normalizeAssetMoveText(form.new_department),
        new_desk: normalizeAssetMoveText(form.new_desk),
        condition_status: form.condition_status,
        condition_details: form.condition_status === "damaged" ? normalizeAssetMoveText(form.condition_details) : "",
        accessories: form.accessories,
        accessory_other: normalizeAssetMoveText(form.accessory_other),
        before_images: beforeImages,
        after_images: afterImages,
        notes: normalizeAssetMoveText(form.notes),
        created_by: currentUser.id,
        created_by_name: normalizeAssetMoveText(currentUser.name || currentUser.email) || "IT Support",
      };
      const { data, error } = await createAssetMove(payload);
      if (error) throw error;
      setRecords((previous) => [data, ...previous.filter((record) => record.id !== data.id)]);
      toast.success(`บันทึก ${data.move_id} และอัปเดต Asset Registry เรียบร้อย`);
      setFormOpen(false);
      resetForm();
    } catch (error) {
      if (isAssetMoveSchemaError(error)) {
        setSchemaMissing(true);
        setLoadError("กรุณารัน database/20260828_asset_move_registry_sync.sql ก่อนใช้งาน");
      }
      toast.error(error?.message || "ไม่สามารถบันทึกการเคลื่อนย้ายได้");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (event) => {
    event.preventDefault();
    const reason = normalizeAssetMoveText(cancelReason);
    if (reason.length < 5) {
      toast.error("กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 5 ตัวอักษร");
      return;
    }
    setCancelling(true);
    try {
      const { data, error } = await cancelAssetMove(cancelRecord.id, reason, currentUser);
      if (error) throw error;
      setRecords((previous) => previous.map((record) => record.id === data.id ? data : record));
      setDetailRecord((previous) => previous?.id === data.id ? data : previous);
      setCancelRecord(null);
      setCancelReason("");
      toast.success(`ยกเลิก ${data.move_id} แล้ว โดยยังเก็บประวัติเดิมไว้`);
    } catch (error) {
      toast.error(error?.message || "ไม่สามารถยกเลิกรายการได้");
    } finally {
      setCancelling(false);
    }
  };

  const activeFilterCount = [filters.query, filters.moveType !== "ALL", filters.status !== "ALL", filters.start, filters.end].filter(Boolean).length;
  const currentYear = new Intl.DateTimeFormat("en", {
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date());

  return (
    <section className="space-y-4">
      <div className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200">
              <MoveRight size={14} /> Asset Movement
            </div>
            <h3 className={`mt-2 text-lg font-black sm:text-xl ${uiTheme.textPrimary}`}>ประวัติการเคลื่อนย้ายอุปกรณ์</h3>
            <p className={`mt-1 text-sm leading-6 ${uiTheme.textSecondary}`}>แต่ละการย้ายสร้างรายการใหม่ แก้ทับหรือลบไม่ได้ หากข้อมูลผิดให้ยกเลิกพร้อมระบุเหตุผล</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${softSurface}`}>พบ {filteredRecords.length} จาก {records.length} รายการ</span>
            <button type="button" onClick={() => schemaMissing ? toast.error("กรุณารัน SQL สำหรับประวัติการเคลื่อนย้ายก่อนใช้งาน") : setFormOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700">
              <Plus size={16} /> ฟอร์มเคลื่อนย้ายอุปกรณ์
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_160px_150px_150px_auto]">
          <label className={`relative flex items-center rounded-xl border sm:rounded-2xl ${uiTheme.searchInputMobile}`}>
            <Search size={16} className="absolute left-3 text-slate-400" />
            <input value={filters.query} onChange={(event) => setFilters((previous) => ({ ...previous, query: event.target.value }))} placeholder="ค้นหา Move ID, Asset Code, Serial Number หรือผู้ใช้" className="w-full bg-transparent py-2.5 pl-10 pr-3 text-sm outline-none" />
          </label>
          <label className="relative">
            <select value={filters.moveType} onChange={(event) => setFilters((previous) => ({ ...previous, moveType: event.target.value }))} className={`${inputClass} appearance-none pr-9`}>
              <option value="ALL">ทุกประเภทงาน</option>
              {MOVE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>
          <label className="relative">
            <select value={filters.status} onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))} className={`${inputClass} appearance-none pr-9`}>
              <option value="ALL">ทุกสถานะ</option><option value="active">ใช้งาน</option><option value="cancelled">ยกเลิก</option>
            </select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>
          <input type="date" value={filters.start} onChange={(event) => setFilters((previous) => ({ ...previous, start: event.target.value }))} className={inputClass} aria-label="วันที่เริ่มต้น" />
          <input type="date" value={filters.end} onChange={(event) => setFilters((previous) => ({ ...previous, end: event.target.value }))} className={inputClass} aria-label="วันที่สิ้นสุด" />
          <button type="button" onClick={() => setFilters(buildFilters())} disabled={activeFilterCount === 0} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${uiTheme.clearFilterButton}`}><RefreshCw size={15} />ล้าง</button>
        </div>
      </div>

      {loadError ? <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${isDark ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{loadError}</div> : null}

      {loading ? (
        <div className={`${cardClass} p-10 text-center`}><Loader2 className="mx-auto animate-spin text-violet-500" /><p className={`mt-3 text-sm ${uiTheme.textSecondary}`}>กำลังโหลดประวัติการเคลื่อนย้าย...</p></div>
      ) : filteredRecords.length === 0 ? (
        <div className={`${cardClass} border-dashed p-10 text-center`}><PackageOpen className="mx-auto text-violet-500" size={30} /><p className={`mt-3 text-sm font-bold ${uiTheme.textPrimary}`}>{records.length ? "ไม่พบรายการที่ตรงกับตัวกรอง" : "ยังไม่มีประวัติการเคลื่อนย้ายอุปกรณ์"}</p></div>
      ) : (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full text-left text-sm">
              <thead className={isDark ? "bg-slate-800/80 text-slate-300" : "bg-slate-50 text-slate-600"}>
                <tr><th className="px-4 py-3">Move ID / วันที่</th><th className="px-4 py-3">อุปกรณ์</th><th className="px-4 py-3">ผู้ใช้เดิม → ใหม่</th><th className="px-4 py-3">สถานที่เดิม → ใหม่</th><th className="px-4 py-3">ผู้ดำเนินการ</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3 text-right">รายละเอียด</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className={record.status === "cancelled" ? "opacity-70" : ""}>
                    <td className="px-4 py-4"><p className={`font-black ${uiTheme.textPrimary}`}>{record.move_id}</p><p className={`mt-1 text-xs ${uiTheme.textSecondary}`}>{formatDateTime(record.performed_at)}</p></td>
                    <td className="px-4 py-4"><p className={`font-bold ${uiTheme.textPrimary}`}>{record.asset_code}</p><p className={`mt-1 text-xs ${uiTheme.textSecondary}`}>{getOptionLabel(DEVICE_TYPES, record.device_type)} · {record.serial_number || "ไม่มี Serial"}</p></td>
                    <td className={`px-4 py-4 ${uiTheme.textSecondary}`}>{record.old_user_name || "-"} <MoveRight className="mx-1 inline" size={14} /> {record.new_user_name || "-"}</td>
                    <td className={`max-w-xs px-4 py-4 text-xs ${uiTheme.textSecondary}`}><p className="truncate">{describeLocation(record, "old")}</p><p className="mt-1 truncate">→ {describeLocation(record, "new")}</p></td>
                    <td className={`px-4 py-4 ${uiTheme.textSecondary}`}>{record.operator_name || "-"}</td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${record.status === "cancelled" ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"}`}>{record.status === "cancelled" ? "ยกเลิก" : "ใช้งาน"}</span></td>
                    <td className="px-4 py-4 text-right"><button type="button" onClick={() => setDetailRecord(record)} className="inline-flex items-center gap-1 rounded-xl border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50 dark:border-violet-500/20 dark:text-violet-200 dark:hover:bg-violet-500/10"><Eye size={14} />ดู</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700 lg:hidden">
            {filteredRecords.map((record) => (
              <button key={record.id} type="button" onClick={() => setDetailRecord(record)} className={`block w-full p-4 text-left ${record.status === "cancelled" ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3"><div><p className="font-black text-violet-600 dark:text-violet-300">{record.move_id}</p><p className={`mt-1 text-sm font-bold ${uiTheme.textPrimary}`}>{record.asset_code} · {getOptionLabel(DEVICE_TYPES, record.device_type)}</p></div><span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${record.status === "cancelled" ? "border-rose-200 text-rose-600 dark:border-rose-500/30 dark:text-rose-300" : "border-emerald-200 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-300"}`}>{record.status === "cancelled" ? "ยกเลิก" : "ใช้งาน"}</span></div>
                <p className={`mt-2 text-xs ${uiTheme.textSecondary}`}>{record.old_user_name || "-"} → {record.new_user_name || "-"}</p><p className={`mt-1 text-xs ${uiTheme.textSecondary}`}>{formatDateTime(record.performed_at)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={closeForm} />
          <div className={`relative flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl ${isDark ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}>
            <div className={`flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-6 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">New movement record</p><h3 className={`mt-1 text-lg font-black ${uiTheme.textPrimary}`}>ฟอร์มเคลื่อนย้ายอุปกรณ์</h3><p className={`mt-1 text-xs ${uiTheme.textSecondary}`}>สร้างรายการใหม่เท่านั้น ระบบไม่อนุญาตให้แก้ทับหรือลบประวัติ</p></div>
              <button type="button" onClick={closeForm} disabled={saving} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="space-y-5">
                <div className={`rounded-2xl border p-4 ${softSurface}`}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label><FieldLabel>Move ID</FieldLabel><input value={`MOVE-${currentYear}-#### (สร้างอัตโนมัติ)`} readOnly className={`${inputClass} font-bold text-violet-600`} /></label>
                    <label><FieldLabel required>วัน–เวลาดำเนินการ</FieldLabel><input type="datetime-local" value={form.performed_at} onChange={(event) => setForm((previous) => ({ ...previous, performed_at: event.target.value }))} className={inputClass} /></label>
                    <label><FieldLabel required>ประเภทงาน</FieldLabel><select value={form.move_type} onChange={(event) => setForm((previous) => ({ ...previous, move_type: event.target.value }))} className={inputClass}>{MOVE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label><FieldLabel>ผู้ดำเนินการ</FieldLabel><input value={currentUser?.name || currentUser?.email || "กำลังโหลดบัญชี"} readOnly className={inputClass} /></label>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">วัน–เวลาบันทึกสร้างอัตโนมัติเมื่อกดบันทึก และผู้ดำเนินการยึดตาม Account ที่กำลังรับงาน</p>
                </div>

                <div className={`rounded-2xl border p-4 ${softSurface}`}>
                  <h4 className={`text-sm font-black ${uiTheme.textPrimary}`}>ผู้แจ้งและอ้างอิงงาน</h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="relative">
                      <FieldLabel>ผู้แจ้ง (พิมพ์ชื่อหรือรหัสพนักงาน)</FieldLabel>
                      <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={form.requester_name}
                          onChange={(event) => handleRequesterInput(event.target.value)}
                          onFocus={() => {
                            setRequesterLookupOpen(true);
                            setRequesterActiveIndex(0);
                          }}
                          onBlur={() => window.setTimeout(() => setRequesterLookupOpen(false), 150)}
                          onKeyDown={handleRequesterKeyDown}
                          className={`${inputClass} pl-10 pr-10`}
                          placeholder={employeeLoading ? "กำลังโหลดรายชื่อพนักงาน..." : "พิมพ์ชื่อ / รหัส / อีเมล / แผนก"}
                          autoComplete="off"
                          role="combobox"
                          aria-expanded={requesterLookupOpen}
                          aria-controls="asset-move-requester-options"
                          aria-autocomplete="list"
                        />
                        {form.requester_name ? (
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleRequesterInput("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            aria-label="ล้างผู้แจ้ง"
                          >
                            <X size={15} />
                          </button>
                        ) : null}
                      </div>

                      {requesterLookupOpen ? (
                        <div
                          id="asset-move-requester-options"
                          role="listbox"
                          className={`absolute left-0 right-0 top-full z-[130] mt-2 max-h-72 overflow-y-auto rounded-2xl border p-1.5 shadow-2xl ${
                            isDark
                              ? "border-slate-600 bg-[#0f172a] shadow-slate-950/60"
                              : "border-slate-200 bg-white shadow-slate-300/60"
                          }`}
                        >
                          {employeeLoading ? (
                            <div className={`flex items-center justify-center gap-2 px-4 py-5 text-sm ${uiTheme.textSecondary}`}>
                              <Loader2 size={16} className="animate-spin" /> กำลังโหลดรายชื่อพนักงาน...
                            </div>
                          ) : requesterSuggestions.length > 0 ? (
                            requesterSuggestions.map((employee, index) => (
                              <button
                                key={employee.id}
                                type="button"
                                role="option"
                                aria-selected={selectedRequester?.id === employee.id}
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setRequesterActiveIndex(index)}
                                onClick={() => selectRequester(employee.id)}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                  index === requesterActiveIndex
                                    ? isDark ? "bg-violet-500/15" : "bg-violet-50"
                                    : isDark ? "hover:bg-slate-800" : "hover:bg-slate-50"
                                }`}
                              >
                                {employee.avatar_url ? (
                                  <img
                                    src={employee.avatar_url}
                                    alt=""
                                    className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                                  />
                                ) : (
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                                    {getEmployeeInitials(employee)}
                                  </span>
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className={`block truncate text-sm font-bold ${uiTheme.textPrimary}`}>
                                    {employee.full_name || employee.email || employee.employee_code}
                                  </span>
                                  <span className={`mt-0.5 block truncate text-xs ${uiTheme.textSecondary}`}>
                                    {employee.employee_code || "ไม่มีรหัส"} • {employee.department || "ไม่ระบุแผนก"}
                                  </span>
                                </span>
                                {selectedRequester?.id === employee.id ? (
                                  <ShieldCheck size={17} className="shrink-0 text-emerald-500" />
                                ) : null}
                              </button>
                            ))
                          ) : (
                            <div className={`px-4 py-5 text-center text-sm ${uiTheme.textSecondary}`}>
                              ไม่พบชื่อหรือรหัสพนักงานที่ค้นหา
                            </div>
                          )}
                        </div>
                      ) : null}

                      {selectedRequester ? (
                        <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                          เลือกแล้ว: {selectedRequester.full_name || selectedRequester.email}
                          {selectedRequester.employee_code ? ` (${selectedRequester.employee_code})` : ""}
                        </p>
                      ) : null}
                    </div>
                    <label><FieldLabel>เลข Ticket (เลือกผู้แจ้งหรือ Ticket)</FieldLabel><input value={form.ticket_reference} onChange={(event) => setForm((previous) => ({ ...previous, ticket_reference: event.target.value.toUpperCase() }))} className={inputClass} placeholder="เช่น TKT-2026-0012" /></label>
                  </div>
                </div>

                <div className={`rounded-2xl border p-4 ${softSurface}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className={`text-sm font-black ${uiTheme.textPrimary}`}>ข้อมูลอุปกรณ์</h4>
                      <p className={`mt-1 text-xs ${uiTheme.textSecondary}`}>เลือก Asset Code จากทะเบียน ระบบจะเติมข้อมูลเดิมและอัปเดต Asset Registry เมื่อบันทึก</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${registryLoadError ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"}`}>
                      {registryLoading ? "กำลังเชื่อมทะเบียน..." : registryLoadError || `เชื่อมแล้ว ${registryAssets.length} รายการ`}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <label><FieldLabel required>ประเภทอุปกรณ์</FieldLabel><select value={form.device_type} onChange={(event) => setForm((previous) => ({ ...previous, device_type: event.target.value }))} className={inputClass}>{DEVICE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    {form.device_type === "other" ? <label><FieldLabel required>ประเภทอื่น ๆ</FieldLabel><input value={form.custom_device_type} onChange={(event) => setForm((previous) => ({ ...previous, custom_device_type: event.target.value }))} className={inputClass} /></label> : null}
                    <div className="relative">
                      <FieldLabel required>Asset Code จาก Asset Registry</FieldLabel>
                      <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={form.asset_code}
                          onChange={(event) => handleAssetCodeInput(event.target.value)}
                          onFocus={() => {
                            setAssetLookupOpen(true);
                            setAssetActiveIndex(0);
                          }}
                          onBlur={() => window.setTimeout(() => setAssetLookupOpen(false), 150)}
                          onKeyDown={handleAssetCodeKeyDown}
                          className={`${inputClass} pl-10 pr-10 font-bold uppercase`}
                          placeholder={registryLoading ? "กำลังโหลด Asset Code..." : "พิมพ์ Asset Code / Serial / ชื่ออุปกรณ์"}
                          autoComplete="off"
                          role="combobox"
                          aria-expanded={assetLookupOpen}
                          aria-controls="asset-move-registry-options"
                          aria-autocomplete="list"
                        />
                        {form.asset_code ? (
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleAssetCodeInput("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            aria-label="ล้าง Asset Code"
                          >
                            <X size={15} />
                          </button>
                        ) : null}
                      </div>

                      {assetLookupOpen ? (
                        <div
                          id="asset-move-registry-options"
                          role="listbox"
                          className={`absolute left-0 right-0 top-full z-[135] mt-2 max-h-80 min-w-[min(92vw,34rem)] overflow-y-auto rounded-2xl border p-1.5 shadow-2xl ${
                            isDark
                              ? "border-slate-600 bg-[#0f172a] shadow-slate-950/60"
                              : "border-slate-200 bg-white shadow-slate-300/60"
                          }`}
                        >
                          {registryLoading ? (
                            <div className={`flex items-center justify-center gap-2 px-4 py-5 text-sm ${uiTheme.textSecondary}`}>
                              <Loader2 size={16} className="animate-spin" /> กำลังโหลด Asset Registry...
                            </div>
                          ) : registryLoadError ? (
                            <div className="px-4 py-5 text-center text-sm text-rose-600 dark:text-rose-300">{registryLoadError}</div>
                          ) : assetSuggestions.length > 0 ? (
                            assetSuggestions.map((asset, index) => (
                              <button
                                key={asset.id}
                                type="button"
                                role="option"
                                aria-selected={selectedRegistryAsset?.id === asset.id}
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setAssetActiveIndex(index)}
                                onClick={() => selectRegistryAsset(asset.id)}
                                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                  index === assetActiveIndex
                                    ? isDark ? "bg-violet-500/15" : "bg-violet-50"
                                    : isDark ? "hover:bg-slate-800" : "hover:bg-slate-50"
                                }`}
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                                  <PackageOpen size={17} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className={`block truncate text-sm font-black ${uiTheme.textPrimary}`}>{asset.asset_tag}</span>
                                  <span className={`mt-0.5 block truncate text-xs ${uiTheme.textSecondary}`}>
                                    {asset.asset_name || "ไม่ระบุชื่อ"} • {[asset.brand, asset.model].filter(Boolean).join(" ") || "ไม่ระบุรุ่น"}
                                  </span>
                                  <span className="mt-1 block truncate text-[11px] text-slate-400">
                                    S/N {asset.serial_number || "-"} • {asset.owner_name || "ไม่มีผู้ใช้"} • {asset.location || "ไม่ระบุที่ตั้ง"}
                                  </span>
                                </span>
                                {selectedRegistryAsset?.id === asset.id ? <ShieldCheck size={17} className="mt-1 shrink-0 text-emerald-500" /> : null}
                              </button>
                            ))
                          ) : (
                            <div className={`px-4 py-5 text-center text-sm ${uiTheme.textSecondary}`}>ไม่พบ Asset Code ที่ค้นหาใน IT Asset Management</div>
                          )}
                        </div>
                      ) : null}

                      {selectedRegistryAsset ? (
                        <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300">เชื่อมแล้ว: {selectedRegistryAsset.asset_tag} • {selectedRegistryAsset.asset_name}</p>
                      ) : form.asset_code ? (
                        <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">กรุณาเลือกรหัสจากรายการแนะนำเพื่อเชื่อมกับทะเบียน</p>
                      ) : null}
                    </div>
                    <label><FieldLabel>Serial Number</FieldLabel><input value={form.serial_number} onChange={(event) => setForm((previous) => ({ ...previous, serial_number: event.target.value.toUpperCase() }))} className={inputClass} /></label>
                    <label><FieldLabel required>ยี่ห้อ/รุ่น</FieldLabel><input value={form.brand_model} onChange={(event) => setForm((previous) => ({ ...previous, brand_model: event.target.value }))} className={inputClass} /></label>
                  </div>
                </div>

                <div className={`rounded-2xl border p-4 ${softSurface}`}>
                  <div className="flex items-center gap-2"><UserRound size={17} className="text-amber-500" /><h4 className={`text-sm font-black ${uiTheme.textPrimary}`}>ก่อนเคลื่อนย้าย</h4></div>
                  <div className="mt-3"><label><FieldLabel>ผู้ใช้เดิม</FieldLabel><input value={form.old_user_name} onChange={(event) => setForm((previous) => ({ ...previous, old_user_name: event.target.value }))} className={inputClass} /></label></div>
                  <div className="mt-3"><LocationFields prefix="old" form={form} setForm={setForm} inputClass={inputClass} /></div>
                </div>

                <div className={`rounded-2xl border p-4 ${softSurface}`}>
                  <div className="flex items-center gap-2"><MapPin size={17} className="text-emerald-500" /><h4 className={`text-sm font-black ${uiTheme.textPrimary}`}>หลังเคลื่อนย้าย</h4></div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <label><FieldLabel required>ผู้ใช้ใหม่</FieldLabel><input value={form.new_user_name} disabled={form.new_to_it_stock} onChange={(event) => setForm((previous) => ({ ...previous, new_user_name: event.target.value }))} className={inputClass} placeholder="ชื่อผู้ใช้ใหม่" /></label>
                    <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${form.new_to_it_stock ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200" : softSurface}`}><input type="checkbox" checked={form.new_to_it_stock} onChange={(event) => setForm((previous) => ({ ...previous, new_to_it_stock: event.target.checked, new_user_name: event.target.checked ? "คลัง IT" : "" }))} />คลัง IT</label>
                  </div>
                  <div className="mt-3"><LocationFields prefix="new" form={form} setForm={setForm} inputClass={inputClass} /></div>
                </div>

                <div className={`rounded-2xl border p-4 ${softSurface}`}>
                  <h4 className={`text-sm font-black ${uiTheme.textPrimary}`}>สภาพและอุปกรณ์ร่วม</h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label><FieldLabel required>สภาพก่อนย้าย</FieldLabel><select value={form.condition_status} onChange={(event) => setForm((previous) => ({ ...previous, condition_status: event.target.value }))} className={inputClass}><option value="normal">ปกติ</option><option value="damaged">ชำรุด</option></select></label>
                    {form.condition_status === "damaged" ? <label><FieldLabel required>รายละเอียดความชำรุด</FieldLabel><input value={form.condition_details} onChange={(event) => setForm((previous) => ({ ...previous, condition_details: event.target.value }))} className={inputClass} /></label> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">{ACCESSORY_OPTIONS.map((item) => <label key={item} className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold ${form.accessories.includes(item) ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200" : softSurface}`}><input type="checkbox" checked={form.accessories.includes(item)} onChange={() => toggleAccessory(item)} className="mr-2" />{item}</label>)}</div>
                  <label className="mt-3 block"><FieldLabel>อุปกรณ์ร่วมอื่น ๆ</FieldLabel><input value={form.accessory_other} onChange={(event) => setForm((previous) => ({ ...previous, accessory_other: event.target.value }))} className={inputClass} /></label>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <ImagePicker title="รูปก่อนย้าย" hint="ต้องเห็นตัวอุปกรณ์และ Asset Code ชัดเจน • สูงสุด 6 รูป รูปละไม่เกิน 5 MB" entries={beforeFiles} setEntries={setBeforeFiles} inputClass={inputClass} />
                  <ImagePicker title="รูปหลังย้าย" hint="ต้องเห็นตำแหน่งติดตั้งใหม่ชัดเจน • สูงสุด 6 รูป รูปละไม่เกิน 5 MB" entries={afterFiles} setEntries={setAfterFiles} inputClass={inputClass} />
                </div>

                <label className="block"><FieldLabel>หมายเหตุ</FieldLabel><textarea value={form.notes} onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))} rows={3} className={inputClass} placeholder="ไม่บังคับ" /></label>
              </div>
              <div className={`sticky bottom-0 mt-5 flex flex-col gap-2 border-t py-4 sm:flex-row sm:justify-end ${isDark ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}><button type="button" onClick={closeForm} disabled={saving} className={`rounded-xl border px-5 py-2.5 text-sm font-bold ${uiTheme.clearFilterButton}`}>ยกเลิก</button><button type="submit" disabled={saving || !currentUser?.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:bg-slate-400">{saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}{saving ? "กำลังบันทึก..." : "บันทึกเป็นรายการใหม่"}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {detailRecord ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setDetailRecord(null)} />
          <div className={`relative max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl border p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${isDark ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">Movement details</p><h3 className={`mt-1 text-xl font-black ${uiTheme.textPrimary}`}>{detailRecord.move_id}</h3><p className={`mt-1 text-sm ${uiTheme.textSecondary}`}>{getOptionLabel(MOVE_TYPES, detailRecord.move_type)} · ดำเนินการ {formatDateTime(detailRecord.performed_at)}</p><p className={`mt-1 text-xs ${uiTheme.textSecondary}`}>บันทึกอัตโนมัติ {formatDateTime(detailRecord.created_at)}</p></div><button type="button" onClick={() => setDetailRecord(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button></div>
            {detailRecord.status === "cancelled" ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"><p className="font-black">รายการนี้ถูกยกเลิก</p><p className="mt-1">เหตุผล: {detailRecord.cancellation_reason}</p><p className="mt-1 text-xs">โดย {detailRecord.cancelled_by_name || "-"} · {formatDateTime(detailRecord.cancelled_at)}</p></div> : null}
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[["ประเภทอุปกรณ์", `${getOptionLabel(DEVICE_TYPES, detailRecord.device_type)}${detailRecord.custom_device_type ? ` / ${detailRecord.custom_device_type}` : ""}`], ["Asset Code", detailRecord.asset_code], ["Serial Number", detailRecord.serial_number || "-"], ["ยี่ห้อ/รุ่น", detailRecord.brand_model || "-"], ["ผู้แจ้ง", `${detailRecord.requester_name || "-"}${detailRecord.requester_employee_code ? ` (${detailRecord.requester_employee_code})` : ""}`], ["เลข Ticket", detailRecord.ticket_reference || "-"], ["ผู้ดำเนินการ", detailRecord.operator_name || "-"], ["สภาพก่อนย้าย", detailRecord.condition_status === "damaged" ? `ชำรุด: ${detailRecord.condition_details}` : "ปกติ"]].map(([label, value]) => <div key={label} className={`rounded-2xl border p-4 ${softSurface}`}><p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p><p className={`mt-2 text-sm font-bold ${uiTheme.textPrimary}`}>{value}</p></div>)}
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2"><div className={`rounded-2xl border p-4 ${softSurface}`}><p className={`font-black ${uiTheme.textPrimary}`}>ต้นทาง</p><p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>ผู้ใช้: {detailRecord.old_user_name || "-"}</p><p className={`mt-1 text-sm ${uiTheme.textSecondary}`}>{describeLocation(detailRecord, "old")}</p></div><div className={`rounded-2xl border p-4 ${softSurface}`}><p className={`font-black ${uiTheme.textPrimary}`}>ปลายทาง</p><p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>ผู้ใช้: {detailRecord.new_user_name || "-"}</p><p className={`mt-1 text-sm ${uiTheme.textSecondary}`}>{describeLocation(detailRecord, "new")}</p></div></div>
            <div className={`mt-4 rounded-2xl border p-4 ${softSurface}`}><p className="text-xs font-bold text-slate-500 dark:text-slate-400">อุปกรณ์ร่วม / หมายเหตุ</p><p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>{[...(detailRecord.accessories || []), detailRecord.accessory_other].filter(Boolean).join(", ") || "ไม่มี"}</p><p className={`mt-2 whitespace-pre-wrap text-sm ${uiTheme.textSecondary}`}>{detailRecord.notes || "ไม่มีหมายเหตุ"}</p></div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">{[["รูปก่อนย้าย", normalizeAssetMoveImages(detailRecord.before_images)], ["รูปหลังย้าย", normalizeAssetMoveImages(detailRecord.after_images)]].map(([title, images]) => <div key={title}><p className={`text-sm font-black ${uiTheme.textPrimary}`}>{title}</p><div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image, index) => <button key={`${title}-${index}`} type="button" onClick={() => window.open(image.url, "_blank", "noopener,noreferrer")} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"><img src={image.url} alt={`${title} ${index + 1}`} className="h-32 w-full object-cover" /></button>)}</div></div>)}</div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">{detailRecord.status === "active" ? <button type="button" onClick={() => { setCancelRecord(detailRecord); setCancelReason(""); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"><Ban size={16} />ยกเลิกรายการ</button> : null}<button type="button" onClick={() => setDetailRecord(null)} className={`rounded-xl border px-4 py-2.5 text-sm font-bold ${uiTheme.clearFilterButton}`}>ปิด</button></div>
          </div>
        </div>
      ) : null}

      {cancelRecord ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/75" onClick={() => !cancelling && setCancelRecord(null)} />
          <form onSubmit={handleCancel} className={`relative w-full max-w-md rounded-3xl border p-5 shadow-2xl ${isDark ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"><Ban size={20} /></span><div><h3 className={`font-black ${uiTheme.textPrimary}`}>ยกเลิก {cancelRecord.move_id}</h3><p className={`text-xs ${uiTheme.textSecondary}`}>ข้อมูลเดิมและรูปหลักฐานจะยังอยู่ครบ</p></div></div>
            <label className="mt-4 block"><FieldLabel required>เหตุผลการยกเลิก</FieldLabel><textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={4} className={inputClass} placeholder="ระบุสาเหตุที่ข้อมูลผิดหรือเหตุผลที่ต้องยกเลิก" autoFocus /></label>
            <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setCancelRecord(null)} disabled={cancelling} className={`rounded-xl border px-4 py-2.5 text-sm font-bold ${uiTheme.clearFilterButton}`}>กลับ</button><button type="submit" disabled={cancelling} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700">{cancelling ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}{cancelling ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}</button></div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
