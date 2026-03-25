import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { enUS, ko, th } from "date-fns/locale";
import { NOTE_STATUS_VALUES, normalizeStatus, normalizeText } from "../../services/workNotesService";

const DATE_LOCALES = {
  th,
  en: enUS,
  ko,
};

const STATUS_LABELS = {
  [NOTE_STATUS_VALUES.TODO]: {
    th: "Todo",
    en: "Todo",
    ko: "할 일",
  },
  [NOTE_STATUS_VALUES.DOING]: {
    th: "Doing",
    en: "Doing",
    ko: "진행 중",
  },
  [NOTE_STATUS_VALUES.DONE]: {
    th: "Done",
    en: "Done",
    ko: "완료",
  },
};

const PRIORITY_LABELS = {
  low: {
    th: "Low",
    en: "Low",
    ko: "낮음",
  },
  medium: {
    th: "Medium",
    en: "Medium",
    ko: "보통",
  },
  high: {
    th: "High",
    en: "High",
    ko: "높음",
  },
};

function resolveLanguage(language) {
  const normalized = String(language || "").toLowerCase();
  if (normalized.startsWith("th")) return "th";
  if (normalized.startsWith("ko")) return "ko";
  return "en";
}

function pickLabel(labels, language) {
  const normalized = resolveLanguage(language);
  return labels?.[normalized] || labels?.en || "";
}

export const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

export function getWorkNotesStatusOptions(language) {
  return [
    { value: NOTE_STATUS_VALUES.TODO, label: pickLabel(STATUS_LABELS[NOTE_STATUS_VALUES.TODO], language) },
    { value: NOTE_STATUS_VALUES.DOING, label: pickLabel(STATUS_LABELS[NOTE_STATUS_VALUES.DOING], language) },
    { value: NOTE_STATUS_VALUES.DONE, label: pickLabel(STATUS_LABELS[NOTE_STATUS_VALUES.DONE], language) },
  ];
}

export function getWorkNotesPriorityOptions(language) {
  return [
    { value: "low", label: pickLabel(PRIORITY_LABELS.low, language) },
    { value: "medium", label: pickLabel(PRIORITY_LABELS.medium, language) },
    { value: "high", label: pickLabel(PRIORITY_LABELS.high, language) },
  ];
}

export function getWorkNotesStatusFilterOptions(language) {
  return [
    {
      value: "ALL",
      label:
        resolveLanguage(language) === "th"
          ? "ทุกสถานะ"
          : resolveLanguage(language) === "ko"
            ? "전체 상태"
            : "All statuses",
    },
    ...getWorkNotesStatusOptions(language),
  ];
}

export function getWorkNotesStatusMeta(language) {
  return {
    [NOTE_STATUS_VALUES.TODO]: {
      label: pickLabel(STATUS_LABELS[NOTE_STATUS_VALUES.TODO], language),
      chipClass: "border-slate-200 bg-slate-50 text-slate-700",
      surfaceClass: "border-slate-200 bg-white",
    },
    [NOTE_STATUS_VALUES.DOING]: {
      label: pickLabel(STATUS_LABELS[NOTE_STATUS_VALUES.DOING], language),
      chipClass: "border-amber-200 bg-amber-50 text-amber-700",
      surfaceClass: "border-amber-200 bg-amber-50/30",
    },
    [NOTE_STATUS_VALUES.DONE]: {
      label: pickLabel(STATUS_LABELS[NOTE_STATUS_VALUES.DONE], language),
      chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      surfaceClass: "border-emerald-200 bg-emerald-50/40",
    },
  };
}

export function getWorkNotesPriorityMeta(language) {
  return {
    low: {
      label: pickLabel(PRIORITY_LABELS.low, language),
      chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    medium: {
      label: pickLabel(PRIORITY_LABELS.medium, language),
      chipClass: "border-amber-200 bg-amber-50 text-amber-700",
    },
    high: {
      label: pickLabel(PRIORITY_LABELS.high, language),
      chipClass: "border-rose-200 bg-rose-50 text-rose-700",
    },
  };
}

export const STATUS_META = getWorkNotesStatusMeta("th");
export const PRIORITY_META = getWorkNotesPriorityMeta("th");
export const STATUS_FILTER_OPTIONS = getWorkNotesStatusFilterOptions("th");

export function getTodayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

export function createChecklistDraft(item = {}) {
  return {
    id: item?.id ?? null,
    tempId: item?.id ? `saved-${item.id}` : `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    content: normalizeText(item?.content),
    is_done: Boolean(item?.is_done),
  };
}

export function buildEmptyForm(dateValue = getTodayIso()) {
  return {
    title: "",
    description: "",
    note_date: dateValue,
    note_time: "",
    priority: "medium",
    status: NOTE_STATUS_VALUES.TODO,
    reminder_enabled: false,
    is_pinned: false,
    tagsInput: "",
    checklists: [],
    attachments: [],
  };
}

export function buildFormFromNote(note) {
  return {
    title: note?.title || "",
    description: note?.description || "",
    note_date: note?.note_date || getTodayIso(),
    note_time: note?.note_time || "",
    priority: note?.priority || "medium",
    status: normalizeStatus(note?.status),
    reminder_enabled: Boolean(note?.reminder_enabled),
    is_pinned: Boolean(note?.is_pinned),
    tagsInput: Array.isArray(note?.tags) ? note.tags.join(", ") : "",
    checklists: Array.isArray(note?.note_checklists) ? note.note_checklists.map((item) => createChecklistDraft(item)) : [],
    attachments: Array.isArray(note?.note_attachments) ? [...note.note_attachments] : [],
  };
}

export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function revokePendingFiles(files) {
  (Array.isArray(files) ? files : []).forEach((item) => {
    if (item?.previewUrl && String(item.previewUrl).startsWith("blob:")) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
}

export function formatDateLabel(value, language = "th") {
  if (!value) return "-";

  try {
    return format(parseISO(`${value}T00:00:00`), "dd MMM yyyy", {
      locale: DATE_LOCALES[resolveLanguage(language)] || DATE_LOCALES.en,
    });
  } catch {
    return value;
  }
}

export function formatDateTimeLabel(note, language = "th") {
  if (!note?.note_date) return "-";
  return note.note_time ? `${formatDateLabel(note.note_date, language)} • ${note.note_time}` : formatDateLabel(note.note_date, language);
}

export function getChecklistSummary(note) {
  const total = Array.isArray(note?.note_checklists) ? note.note_checklists.length : 0;
  const done = Array.isArray(note?.note_checklists)
    ? note.note_checklists.filter((item) => item.is_done).length
    : 0;
  return { done, total };
}

export function matchSearch(note, searchValue) {
  const query = normalizeText(searchValue).toLowerCase();
  if (!query) return true;

  const searchable = [note?.title, note?.description, ...(Array.isArray(note?.tags) ? note.tags : [])]
    .map((item) => String(item || "").toLowerCase())
    .join(" ");

  return searchable.includes(query);
}
