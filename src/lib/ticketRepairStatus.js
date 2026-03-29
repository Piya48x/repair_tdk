const STATUS_DETAIL_TOKEN_PREFIX = "__IT_STATUS_DETAIL__:";

export const TICKET_REPAIR_STATUS_DETAILS = {
  WAITING_PARTS: {
    key: "WAITING_PARTS",
    label: "รออะไหล่",
    helper: "ของยังมาไม่ถึง",
    lifecycle: "active",
    tone: "amber",
  },
  ON_ORDER: {
    key: "ON_ORDER",
    label: "อยู่ระหว่างสั่งซื้อ",
    helper: "กำลังดำเนินการจัดซื้อ",
    lifecycle: "active",
    tone: "sky",
  },
  PENDING_APPROVAL: {
    key: "PENDING_APPROVAL",
    label: "รออนุมัติ",
    helper: "ต้องรอหัวหน้าหรือผู้เกี่ยวข้องอนุมัติ",
    lifecycle: "active",
    tone: "violet",
  },
  ON_HOLD: {
    key: "ON_HOLD",
    label: "ระงับชั่วคราว",
    helper: "พักงานไว้ก่อนและกลับมาทำต่อได้",
    lifecycle: "active",
    tone: "slate",
  },
  UNREPAIRABLE: {
    key: "UNREPAIRABLE",
    label: "ซ่อมไม่ได้",
    helper: "ตรวจสอบแล้วไม่สามารถซ่อมให้สำเร็จได้",
    lifecycle: "closed",
    tone: "rose",
  },
  CANCELLED: {
    key: "CANCELLED",
    label: "ยกเลิกการซ่อม",
    helper: "ประเมินแล้วไม่คุ้มหรือยกเลิกตามการตัดสินใจ",
    lifecycle: "closed",
    tone: "slate",
  },
  UNABLE_TO_PROCEED: {
    key: "UNABLE_TO_PROCEED",
    label: "ไม่สามารถดำเนินการได้",
    helper: "มีข้อจำกัดทางเทคนิคหรือไม่มีอะไหล่รองรับ",
    lifecycle: "closed",
    tone: "amber",
  },
  RETURNED_UNSOLVED: {
    key: "RETURNED_UNSOLVED",
    label: "คืนงานแบบยังไม่จบ",
    helper: "มีการคืนเครื่องหรือปิดงานโดยอาการยังไม่หาย",
    lifecycle: "closed",
    tone: "slate",
  },
};

export const TICKET_REPAIR_STATUS_OPTIONS = [
  {
    key: "WORKING",
    label: "กลับมาดำเนินการต่อ",
    helper: "ล้างสถานะรอ แล้วเดินงานต่อจนจบ",
    lifecycle: "active",
    tone: "emerald",
  },
  TICKET_REPAIR_STATUS_DETAILS.WAITING_PARTS,
  TICKET_REPAIR_STATUS_DETAILS.ON_ORDER,
  TICKET_REPAIR_STATUS_DETAILS.PENDING_APPROVAL,
  TICKET_REPAIR_STATUS_DETAILS.ON_HOLD,
  TICKET_REPAIR_STATUS_DETAILS.UNREPAIRABLE,
  TICKET_REPAIR_STATUS_DETAILS.CANCELLED,
  TICKET_REPAIR_STATUS_DETAILS.UNABLE_TO_PROCEED,
  TICKET_REPAIR_STATUS_DETAILS.RETURNED_UNSOLVED,
];

function normalizeKey(value = "") {
  return String(value || "").trim().toUpperCase();
}

export function stripTicketStatusDetailFromParts(partsUsed = "") {
  const value = String(partsUsed || "");
  if (!value.startsWith(STATUS_DETAIL_TOKEN_PREFIX)) {
    return value.trim();
  }

  const [, ...rest] = value.split(/\r?\n/);
  return rest.join("\n").trim();
}

export function extractTicketStatusDetailKey(ticketOrParts = null) {
  const raw =
    typeof ticketOrParts === "string"
      ? ticketOrParts
      : String(ticketOrParts?.parts_used || "");

  const match = raw.match(/^__IT_STATUS_DETAIL__:([A-Z_]+)(?:\r?\n|$)/);
  return normalizeKey(match?.[1] || "");
}

export function getTicketStatusDetailMeta(ticketOrParts = null) {
  const detailKey = extractTicketStatusDetailKey(ticketOrParts);
  if (!detailKey) return null;
  return TICKET_REPAIR_STATUS_DETAILS[detailKey] || null;
}

export function embedTicketStatusDetailInParts(partsUsed = "", detailKey = "") {
  const cleanedParts = stripTicketStatusDetailFromParts(partsUsed);
  const normalizedKey = normalizeKey(detailKey);

  if (!normalizedKey || normalizedKey === "WORKING") {
    return cleanedParts;
  }

  return `${STATUS_DETAIL_TOKEN_PREFIX}${normalizedKey}${cleanedParts ? `\n${cleanedParts}` : ""}`;
}

export function getBaseTicketStatusLabel(status = "") {
  switch (normalizeKey(status)) {
    case "NEW":
      return "ใหม่";
    case "IN_PROGRESS":
      return "กำลังดำเนินการ";
    case "CLOSED":
      return "ปิดงานแล้ว";
    default:
      return String(status || "").trim() || "-";
  }
}

export function getTicketStatusLabel(ticketOrStatus = null) {
  if (ticketOrStatus && typeof ticketOrStatus === "object") {
    const detailMeta = getTicketStatusDetailMeta(ticketOrStatus);
    if (detailMeta?.label) return detailMeta.label;
    return getBaseTicketStatusLabel(ticketOrStatus.status);
  }

  return getBaseTicketStatusLabel(ticketOrStatus);
}

export function getTicketStatusLifecycle(detailKey = "", fallbackStatus = "IN_PROGRESS") {
  const normalizedKey = normalizeKey(detailKey);
  if (!normalizedKey || normalizedKey === "WORKING") {
    return normalizeKey(fallbackStatus) || "IN_PROGRESS";
  }

  return TICKET_REPAIR_STATUS_DETAILS[normalizedKey]?.lifecycle === "closed"
    ? "CLOSED"
    : "IN_PROGRESS";
}
