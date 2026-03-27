export const PICK_UP_SERVICE_TYPE_IDS = new Set([
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

export function isRepairTicketRecord(ticket) {
  const serviceType = normalizeServiceType(ticket?.service_type);
  const source = `${ticket?.service_type || ""} ${ticket?.title || ""} ${ticket?.category || ""}`.toLowerCase();
  return serviceType === "req_repair" || source.includes("repair") || source.includes("ซ่อม");
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
