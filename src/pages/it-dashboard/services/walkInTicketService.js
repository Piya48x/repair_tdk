import { supabase } from "../../../lib/supabaseClient";
import { insertTicketWithSchemaFallback } from "../../../lib/ticketSchemaCompat";

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

async function uploadWalkInAttachment({ attachment, createdBy }) {
  if (!attachment) return null;

  const fileExt = String(attachment.name || "").split(".").pop() || "jpg";
  const safePrefix = String(createdBy || "walkin").replace(/[^a-zA-Z0-9_-]/g, "");
  const filePath = `${safePrefix}/${Date.now()}_walkin.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("ticket-attachments")
    .upload(filePath, attachment, {
      contentType: attachment.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "ไม่สามารถอัปโหลดไฟล์ได้");
  }

  const { data } = supabase.storage.from("ticket-attachments").getPublicUrl(filePath);
  return data?.publicUrl || null;
}

export async function createWalkInTicket({
  requester_name,
  requester_emp_id,
  department,
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
  attachment,
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
  const assignedNameValue = normalizeText(assigned_name) || normalizeText(created_by_name) || "IT Support";
  const closedByNameValue =
    normalizeText(closed_by_name) ||
    normalizeText(created_by_name) ||
    assignedNameValue;
  const attachmentUrl = await uploadWalkInAttachment({
    attachment,
    createdBy: created_by,
  });

  const payload = {
    creator_id: created_by || null,
    created_by: created_by || null,
    reporter_name: requesterName,
    reporter_emp_id: normalizeText(requester_emp_id) || null,
    reporter_dept: departmentValue,
    reporter_avatar_url: normalizeText(reporter_avatar_url) || null,
    department: departmentValue,
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
    resolution_note: note || null,
    solution_note: note || null,
    image_url: attachmentUrl,
    image_after_url: attachmentUrl,
    closed_at: closedAtIso,
    closed_by: closed_by || created_by || null,
    closed_by_name: closedByNameValue || null,
    updated_at: closedAtIso,
  };

  const { data, error } = await insertTicketWithSchemaFallback(supabase, payload, {
    select: "id,ticket_no",
    single: true,
    maxRetries: 10,
  });

  if (error) throw error;
  return data;
}
