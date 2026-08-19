import {
  Camera,
  Cctv,
  FileText,
  Monitor,
  Printer,
  Wrench,
} from "lucide-react";

export const MAX_FILES = 8;
export const CAMERA_VIEW_JOB_TYPE = "camera_view_request";

export const CAMERA_APPROVAL_OPTIONS = [
  { value: "pending", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติ" },
  { value: "rejected", label: "ไม่อนุมัติ" },
];

export const TYPE_OPTIONS = [
  { value: "camera_install", label: "ติดตั้งกล้อง", icon: Camera },
  { value: CAMERA_VIEW_JOB_TYPE, label: "ขอดูภาพกล้องวงจรปิด", icon: Cctv },
  { value: "pc_install", label: "ติดตั้ง PC", icon: Monitor },
  { value: "notebook_install", label: "ติดตั้ง Notebook", icon: Monitor },
  { value: "printer_install", label: "ติดตั้ง Printer", icon: Printer },
  { value: "maintenance", label: "บำรุงรักษา / ปรับปรุง", icon: Wrench },
  { value: "repair", label: "ซ่อม / แก้ไข", icon: Wrench },
  { value: "other", label: "งาน IT อื่น ๆ", icon: FileText },
];

export const STATUS_OPTIONS = [
  { value: "pending", label: "รอดำเนินการ" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
];

export const PERIOD_OPTIONS = [
  { value: "day", label: "วัน" },
  { value: "week", label: "สัปดาห์" },
  { value: "month", label: "เดือน" },
  { value: "year", label: "ปี" },
];

const JOB_TYPE_REFERENCE_CODES = {
  [CAMERA_VIEW_JOB_TYPE]: "CTV",
  camera_install: "CAM",
  pc_install: "PC",
  notebook_install: "NB",
  printer_install: "PRN",
  maintenance: "MNT",
  repair: "REP",
  other: "GEN",
};

export function padNumber(value) {
  return String(value).padStart(2, "0");
}

export function toDateTimeLocalValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

export function normalizeText(value) {
  return String(value || "").trim();
}

export function buildForm(department = "") {
  const nowValue = toDateTimeLocalValue(new Date());

  return {
    id: null,
    title: "",
    description: "",
    job_type: TYPE_OPTIONS[0].value,
    work_status: "pending",
    location: "",
    requester_profile_id: "",
    requester_name: "",
    requester_employee_code: "",
    department,
    device_details: "",
    reference_code: buildReferenceCode({
      jobType: TYPE_OPTIONS[0].value,
      startTime: nowValue,
    }),
    start_time: nowValue,
    end_time: "",
    duration_minutes: 0,
    result_summary: "",
    footage_start_at: "",
    footage_end_at: "",
    approval_status: "pending",
    approved_by_name: "",
  };
}

export function buildCameraViewForm(department = "") {
  return {
    ...buildForm(department),
    title: "คำขอดูภาพกล้องวงจรปิด",
    job_type: CAMERA_VIEW_JOB_TYPE,
    work_status: "pending",
    reference_code: buildReferenceCode({
      jobType: CAMERA_VIEW_JOB_TYPE,
      startTime: new Date(),
    }),
  };
}

export function buildFormFromRecord(record, fallbackDepartment = "") {
  const startValue = record?.start_time || record?.performed_at || record?.created_at || "";
  const endValue = record?.end_time || "";
  const durationMinutes = Number(record?.duration_minutes || 0);
  const derivedEndValue = !endValue && startValue && durationMinutes > 0
    ? buildEndTimeFromDuration(startValue, durationMinutes)
    : "";

  return {
    id: record?.id ?? null,
    title: normalizeText(record?.title),
    description: normalizeText(record?.description),
    job_type: normalizeText(record?.job_type) || TYPE_OPTIONS[0].value,
    work_status: normalizeText(record?.work_status) || "pending",
    location: normalizeText(record?.location),
    requester_profile_id: normalizeText(record?.requester_profile_id),
    requester_name: normalizeText(record?.requester_name),
    requester_employee_code: normalizeText(record?.requester_employee_code),
    department: normalizeText(record?.department) || fallbackDepartment,
    device_details: normalizeText(record?.device_details),
    reference_code:
      normalizeText(record?.reference_code) ||
      buildReferenceCode({
        jobType: normalizeText(record?.job_type) || TYPE_OPTIONS[0].value,
        startTime: startValue || new Date(),
      }),
    start_time: startValue ? toDateTimeLocalValue(startValue) : "",
    end_time: endValue ? toDateTimeLocalValue(endValue) : derivedEndValue,
    duration_minutes: Math.max(durationMinutes, 0),
    result_summary: normalizeText(record?.result_summary),
    footage_start_at: record?.footage_start_at ? toDateTimeLocalValue(record.footage_start_at) : "",
    footage_end_at: record?.footage_end_at ? toDateTimeLocalValue(record.footage_end_at) : "",
    approval_status: normalizeText(record?.approval_status) || "pending",
    approved_by_name: normalizeText(record?.approved_by_name),
  };
}

export function calculateDurationMinutes(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function getDurationParts(totalMinutes) {
  const safeMinutes = Math.max(Number(totalMinutes || 0), 0);
  return {
    hours: Math.floor(safeMinutes / 60),
    minutes: safeMinutes % 60,
  };
}

export function buildEndTimeFromDuration(startValue, totalMinutes) {
  const start = new Date(startValue);
  const safeMinutes = Math.max(Number(totalMinutes || 0), 0);

  if (Number.isNaN(start.getTime())) return "";

  return toDateTimeLocalValue(new Date(start.getTime() + safeMinutes * 60000));
}

export function buildReferenceCode({
  jobType = TYPE_OPTIONS[0].value,
  startTime = new Date(),
} = {}) {
  const baseDate = startTime ? new Date(startTime) : new Date();
  const safeDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  const typeCode = JOB_TYPE_REFERENCE_CODES[jobType] || JOB_TYPE_REFERENCE_CODES.other;
  const datePart = [
    safeDate.getFullYear(),
    padNumber(safeDate.getMonth() + 1),
    padNumber(safeDate.getDate()),
  ].join("");
  const timePart = [
    padNumber(safeDate.getHours()),
    padNumber(safeDate.getMinutes()),
    padNumber(safeDate.getSeconds()),
  ].join("");

  return `ITW-${typeCode}-${datePart}-${timePart}`;
}

export function formatDateTime(value) {
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

export function formatDateOnly(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDurationLabel(totalMinutes) {
  const safeMinutes = Math.max(Number(totalMinutes || 0), 0);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours} ชม. ${minutes} นาที`;
  if (hours > 0) return `${hours} ชม.`;
  return `${minutes} นาที`;
}

export function formatHoursLabel(totalMinutes) {
  return `${(Math.max(Number(totalMinutes || 0), 0) / 60).toFixed(1)} ชม.`;
}

export function getTypeMeta(type) {
  return TYPE_OPTIONS.find((item) => item.value === type) || TYPE_OPTIONS[TYPE_OPTIONS.length - 1];
}

export function getStatusMeta(status) {
  return STATUS_OPTIONS.find((item) => item.value === status) || STATUS_OPTIONS[STATUS_OPTIONS.length - 1];
}

export function getLocalDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

export function getWeekStartDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const clone = new Date(date);
  const day = clone.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  clone.setHours(0, 0, 0, 0);
  clone.setDate(clone.getDate() + diff);
  return clone;
}

export function getMonthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}`;
}

export function getPeriodKey(value, period) {
  if (period === "week") {
    const weekStart = getWeekStartDate(value);
    return weekStart ? getLocalDateKey(weekStart) : "";
  }
  if (period === "month") return getMonthKey(value);
  if (period === "year") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : String(date.getFullYear());
  }
  return getLocalDateKey(value);
}

export function getPeriodLabel(key, period) {
  if (!key) return "-";

  if (period === "week") {
    const start = new Date(`${key}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDateOnly(start)} - ${formatDateOnly(end)}`;
  }

  if (period === "month") {
    const [year, month] = key.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    });
  }

  if (period === "year") {
    return `ปี ${key}`;
  }

  return formatDateOnly(`${key}T00:00:00`);
}
