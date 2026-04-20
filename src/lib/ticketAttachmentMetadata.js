const ATTACHMENT_META_START = "\n[[ticket-attachments-meta::";
const ATTACHMENT_META_END = "]]";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeAttachmentType(value) {
  return String(value || "").toLowerCase() === "after" ? "after" : "before";
}

function normalizeAttachmentEntry(entry, fallbackType = "before") {
  if (typeof entry === "string") {
    const url = normalizeText(entry);
    if (!url) return null;
    return {
      url,
      type: normalizeAttachmentType(fallbackType),
      name: "",
    };
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const url = normalizeText(
    entry.url ||
      entry.publicUrl ||
      entry.image_url ||
      entry.imageUrl,
  );

  if (!url) return null;

  return {
    url,
    type: normalizeAttachmentType(entry.type || entry.kind || entry.group || fallbackType),
    name: normalizeText(entry.name || entry.file_name || entry.fileName),
  };
}

export function stripTicketAttachmentMetadata(note) {
  const rawNote = String(note || "");
  const startIndex = rawNote.indexOf(ATTACHMENT_META_START);

  if (startIndex === -1) {
    return {
      note: rawNote.trim(),
      attachments: [],
    };
  }

  const metaStartIndex = startIndex + ATTACHMENT_META_START.length;
  const metaEndIndex = rawNote.indexOf(ATTACHMENT_META_END, metaStartIndex);

  if (metaEndIndex === -1) {
    return {
      note: rawNote.trim(),
      attachments: [],
    };
  }

  let attachments = [];
  try {
    const parsed = JSON.parse(rawNote.slice(metaStartIndex, metaEndIndex));
    attachments = (Array.isArray(parsed) ? parsed : [])
      .map((entry) => normalizeAttachmentEntry(entry))
      .filter(Boolean);
  } catch {
    attachments = [];
  }

  return {
    note: rawNote.slice(0, startIndex).trim(),
    attachments,
  };
}

export function buildTicketAttachmentNote(note, attachments = []) {
  const cleanNote = stripTicketAttachmentMetadata(note).note;
  const normalizedAttachments = (Array.isArray(attachments) ? attachments : [])
    .map((entry) => normalizeAttachmentEntry(entry))
    .filter(Boolean);

  if (normalizedAttachments.length === 0) {
    return cleanNote;
  }

  const metadata = normalizedAttachments.map((entry) => ({
    url: entry.url,
    type: entry.type,
    name: entry.name || "",
  }));

  return `${cleanNote}${cleanNote ? "\n\n" : ""}${ATTACHMENT_META_START}${JSON.stringify(metadata)}${ATTACHMENT_META_END}`;
}

export function getTicketDisplayNote(ticketOrNote) {
  if (typeof ticketOrNote === "string") {
    return stripTicketAttachmentMetadata(ticketOrNote).note;
  }

  return stripTicketAttachmentMetadata(
    ticketOrNote?.solution_note || ticketOrNote?.resolution_note || "",
  ).note;
}

export function getTicketAttachmentEntries(ticket) {
  const entries = [];

  if (!ticket || typeof ticket !== "object") {
    return entries;
  }

  const metadataAttachments = stripTicketAttachmentMetadata(
    ticket.solution_note || ticket.resolution_note || "",
  ).attachments;

  if (ticket.image_url) {
    entries.push({ url: normalizeText(ticket.image_url), type: "before", name: "" });
  }

  if (ticket.image_after_url) {
    entries.push({ url: normalizeText(ticket.image_after_url), type: "after", name: "" });
  }

  if (Array.isArray(ticket.attachments)) {
    ticket.attachments.forEach((entry) => {
      const normalized = normalizeAttachmentEntry(entry);
      if (normalized) entries.push(normalized);
    });
  }

  metadataAttachments.forEach((entry) => {
    const normalized = normalizeAttachmentEntry(entry);
    if (normalized) entries.push(normalized);
  });

  const seenUrls = new Set();
  return entries.reduce((accumulator, entry) => {
    const normalized = normalizeAttachmentEntry(entry);
    if (!normalized || seenUrls.has(normalized.url)) {
      return accumulator;
    }
    seenUrls.add(normalized.url);
    accumulator.push(normalized);
    return accumulator;
  }, []);
}

export function getTicketAttachmentUrls(ticket) {
  return getTicketAttachmentEntries(ticket).map((entry) => entry.url);
}
