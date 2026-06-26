export const PICK_UP_SERVICE_TYPE_IDS = new Set([
  "req_stock_item",
  "req_new_device",
  "req_replacement",
  "req_peripherals",
  "req_laptop_gps",
  "req_install_sw",
  "req_license",
  "req_os_issue",
  "req_wifi_guest",
  "req_vpn",
  "req_folder_access",
  "req_domain",
  "req_cctv_install",
  "req_cctv_view",
  "req_access_card",
  "req_purchase",
  "req_quotation",
  "req_consult",
  "req_relocate",
]);

export function normalizeServiceType(value) {
  return String(value || "").trim().toLowerCase();
}

export function isWalkInTicketRecord(ticket) {
  const serviceType = normalizeServiceType(ticket?.service_type);
  const channel = normalizeServiceType(ticket?.channel);
  return serviceType === "walk-in" || serviceType === "walk_in" || channel === "walk-in" || channel === "walk_in";
}

export function isRepairTicketRecord(ticket) {
  const serviceType = normalizeServiceType(ticket?.service_type);
  const source = `${ticket?.service_type || ""} ${ticket?.title || ""} ${ticket?.category || ""}`.toLowerCase();
  return isWalkInTicketRecord(ticket) || serviceType === "req_repair" || source.includes("repair") || source.includes("ซ่อม");
}

export function isPickUpEquipmentRequest(ticket) {
  const serviceType = normalizeServiceType(ticket?.service_type);
  if (!serviceType || serviceType === "req_repair") return false;
  if (PICK_UP_SERVICE_TYPE_IDS.has(serviceType)) return true;

  const source = `${ticket?.service_type || ""} ${ticket?.title || ""} ${ticket?.category || ""}`.toLowerCase();
  return (
    source.includes("req_") ||
    source.includes("เบิก") ||
    source.includes("จัดซื้อ") ||
    source.includes("borrow") ||
    source.includes("replacement") ||
    source.includes("install") ||
    source.includes("license") ||
    source.includes("vpn") ||
    source.includes("wifi") ||
    source.includes("access") ||
    source.includes("quotation")
  );
}

export function getTicketDepartmentValue(ticket) {
  return String(ticket?.reporter_dept || ticket?.department || "").trim();
}

export function splitTicketBuckets(rows) {
  const repairTickets = [];
  const serviceRequests = [];

  (Array.isArray(rows) ? rows : []).forEach((ticket) => {
    if (isPickUpEquipmentRequest(ticket)) {
      serviceRequests.push(ticket);
      return;
    }

    repairTickets.push(ticket);
  });

  return { repairTickets, serviceRequests };
}

const STOCK_REQUEST_META_START = "\n[[stock-request-meta::";
const STOCK_REQUEST_META_END = "]]";

export function stripStockRequestMetadata(description) {
  const rawDescription = String(description || "");
  const startIndex = rawDescription.indexOf(STOCK_REQUEST_META_START);

  if (startIndex === -1) {
    return {
      description: rawDescription.trim(),
      stockRequest: null,
    };
  }

  const metaStartIndex = startIndex + STOCK_REQUEST_META_START.length;
  const metaEndIndex = rawDescription.indexOf(STOCK_REQUEST_META_END, metaStartIndex);

  if (metaEndIndex === -1) {
    return {
      description: rawDescription.trim(),
      stockRequest: null,
    };
  }

  let stockRequest = null;
  try {
    const parsed = JSON.parse(rawDescription.slice(metaStartIndex, metaEndIndex));
    if (parsed && typeof parsed === "object") {
      stockRequest = parsed;
    }
  } catch {
    stockRequest = null;
  }

  return {
    description: rawDescription.slice(0, startIndex).trim(),
    stockRequest,
  };
}

export function buildStockRequestDescription(description, stockRequest = null) {
  const cleanDescription = stripStockRequestMetadata(description).description;
  if (!stockRequest || typeof stockRequest !== "object") return cleanDescription;

  return `${cleanDescription}${cleanDescription ? "\n\n" : ""}${STOCK_REQUEST_META_START}${JSON.stringify(stockRequest)}${STOCK_REQUEST_META_END}`;
}

export function getStockRequestMetadata(request) {
  if (!request || typeof request !== "object") return null;

  const parsed = stripStockRequestMetadata(request.description).stockRequest;
  if (parsed) return parsed;

  if (request.stock_request && typeof request.stock_request === "object") {
    return request.stock_request;
  }

  return null;
}

export function getServiceRequestDisplayDescription(request) {
  const cleanDescription = stripStockRequestMetadata(request?.description).description;
  return cleanDescription || String(request?.purpose_of_use || "").trim();
}
