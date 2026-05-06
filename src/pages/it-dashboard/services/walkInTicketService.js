import { supabase } from "../../../lib/supabaseClient";
import { insertTicketWithSchemaFallback } from "../../../lib/ticketSchemaCompat";
import { buildTicketAttachmentNote } from "../../../lib/ticketAttachmentMetadata";

function normalizeText(value) {
  return String(value || "").trim();
}

function toIsoString(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapPriorityToSystemValue(priority) {
  switch (String(priority || "").toLowerCase()) {
    case "high":
      return "urgent";
    case "medium":
      return "normal";
    case "low":
    default:
      return "low";
  }
}

function normalizeAttachmentGroup(attachments, type) {
  return (Array.isArray(attachments) ? attachments : [])
    .map((attachment) => {
      const file = attachment?.file || attachment;
      if (!(file instanceof File)) return null;
      return {
        file,
        type: type === "after" ? "after" : "before",
      };
    })
    .filter(Boolean);
}

async function uploadWalkInAttachments({ attachments, createdBy }) {
  const safeAttachments = (Array.isArray(attachments) ? attachments : []).filter(
    (entry) => entry?.file instanceof File,
  );

  if (safeAttachments.length === 0) return [];

  const safePrefix = String(createdBy || "walkin").replace(/[^a-zA-Z0-9_-]/g, "") || "walkin";
  const uploadedEntries = [];

  for (let index = 0; index < safeAttachments.length; index += 1) {
    const attachment = safeAttachments[index];
    const fileExt = String(attachment.file.name || "").split(".").pop() || "jpg";
    const filePath = `${safePrefix}/${Date.now()}_${attachment.type}_${index + 1}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("ticket-attachments")
      .upload(filePath, attachment.file, {
        contentType: attachment.file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "ไม่สามารถอัปโหลดไฟล์ได้");
    }

    const { data } = supabase.storage.from("ticket-attachments").getPublicUrl(filePath);
    const publicUrl = data?.publicUrl || "";

    if (publicUrl) {
      uploadedEntries.push({
        url: publicUrl,
        type: attachment.type,
        name: normalizeText(attachment.file.name),
      });
    }
  }

  return uploadedEntries;
}

export async function createWalkInTicket({
  requester_name,
  requester_emp_id,
  department,
  location,
  category,
  issue_title,
  issue_description,
  priority,
  start_time,
  end_time,
  resolution_note,
  reporter_avatar_url,
  created_by,
  created_by_name,
  assigned_to,
  assigned_name,
  assigned_employee_id,
  closed_by,
  closed_by_name,
  before_attachments,
  after_attachments,
}) {
  const requesterName = normalizeText(requester_name);
  const issueTitle = normalizeText(issue_title);

  if (!requesterName) {
    throw new Error("กรุณาระบุชื่อผู้แจ้ง");
  }

  if (!issueTitle) {
    throw new Error("กรุณาระบุหัวข้อปัญหา");
  }

  const startTimeIso = toIsoString(start_time) || new Date().toISOString();
  const endTimeIso = toIsoString(end_time);
  const closedAtIso = endTimeIso || startTimeIso || new Date().toISOString();
  const note = normalizeText(resolution_note);
  const systemPriority = mapPriorityToSystemValue(priority);
  const departmentValue = normalizeText(department) || null;
  const locationValue = normalizeText(location) || departmentValue;
  const categoryValue = normalizeText(category) || "Walk-in";
  const assignedNameValue = normalizeText(assigned_name) || normalizeText(created_by_name) || "IT Support";
  const closedByNameValue =
    normalizeText(closed_by_name) ||
    normalizeText(created_by_name) ||
    assignedNameValue;
  const uploadedAttachments = await uploadWalkInAttachments({
    attachments: [
      ...normalizeAttachmentGroup(before_attachments, "before"),
      ...normalizeAttachmentGroup(after_attachments, "after"),
    ],
    createdBy: created_by,
  });
  const beforeUrls = uploadedAttachments
    .filter((entry) => entry.type === "before")
    .map((entry) => entry.url)
    .filter(Boolean);
  const afterUrls = uploadedAttachments
    .filter((entry) => entry.type === "after")
    .map((entry) => entry.url)
    .filter(Boolean);
  const noteWithAttachments = buildTicketAttachmentNote(note, uploadedAttachments);

  const payload = {
    creator_id: created_by || null,
    created_by: created_by || null,
    reporter_name: requesterName,
    reporter_emp_id: normalizeText(requester_emp_id) || null,
    reporter_dept: departmentValue,
    reporter_avatar_url: normalizeText(reporter_avatar_url) || null,
    department: departmentValue,
    location: locationValue || null,
    category: categoryValue,
    title: issueTitle,
    description: normalizeText(issue_description) || null,
    service_type: "walk-in",
    priority: systemPriority,
    status: "CLOSED",
    channel: "walk-in",
    started_at: startTimeIso,
    start_time: startTimeIso,
    end_time: endTimeIso || closedAtIso,
    assigned_to: assigned_to || created_by || null,
    assigned_name: assignedNameValue,
    assigned_employee_id: normalizeText(assigned_employee_id) || null,
    resolution_note: noteWithAttachments || null,
    solution_note: noteWithAttachments || null,
    image_url: beforeUrls[0] || null,
    image_after_url: afterUrls[0] || null,
    attachments: uploadedAttachments.map((entry) => entry.url).filter(Boolean),
    closed_at: closedAtIso,
    closed_by: closed_by || created_by || null,
    closed_by_name: closedByNameValue || null,
    updated_at: closedAtIso,
  };

  const { data, error } = await insertTicketWithSchemaFallback(supabase, payload, {
    select: "id,ticket_no",
    single: true,
    maxRetries: 12,
  });

  if (error) throw error;
  return data;
}
