import { supabase } from "../../../lib/supabaseClient";
import { insertTicketWithSchemaFallback } from "../../../lib/ticketSchemaCompat";
import { buildTicketAttachmentNote } from "../../../lib/ticketAttachmentMetadata";
import {
  archiveTicketHistory,
  requireTicketHistoryStorage,
  uploadTicketHistoryFile,
} from "../../../services/ticketHistoryStorageService";

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

const WORK_TYPE_LABELS = {
  repair: "ซ่อมอุปกรณ์",
  system: "ปัญหาระบบ / เครือข่าย",
  service: "งานบริการ / คำขอทั่วไป",
};

const OUTCOME_LABELS = {
  success: "สำเร็จ",
  temporary: "แก้ชั่วคราว",
  waiting_parts: "รออะไหล่",
  follow_up: "ต้องติดตามต่อ",
};

function buildWalkInDescription(workType, description) {
  const typeLabel = WORK_TYPE_LABELS[normalizeText(workType)] || normalizeText(workType);
  const detail = normalizeText(description);
  return [typeLabel ? `ประเภทงาน: ${typeLabel}` : "", detail].filter(Boolean).join("\n\n");
}

function buildWalkInResolution({ rootCause, actionTaken, outcome, materialsUsed, technicianName, fallbackNote }) {
  const hasStructuredResult = [rootCause, actionTaken, outcome, materialsUsed, technicianName].some(
    (value) => normalizeText(value),
  );
  if (!hasStructuredResult) return normalizeText(fallbackNote);

  return [
    `สาเหตุที่พบ: ${normalizeText(rootCause) || "-"}`,
    `วิธีดำเนินการ: ${normalizeText(actionTaken) || "-"}`,
    `ผลลัพธ์: ${OUTCOME_LABELS[normalizeText(outcome)] || normalizeText(outcome) || "-"}`,
    `วัสดุหรืออะไหล่ที่ใช้: ${normalizeText(materialsUsed) || "ไม่มี"}`,
    `ผู้ดำเนินการ: ${normalizeText(technicianName) || "IT Support"}`,
  ].join("\n");
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

async function uploadWalkInAttachments({ ticketId, attachments }) {
  const safeAttachments = (Array.isArray(attachments) ? attachments : []).filter(
    (entry) => entry?.file instanceof File,
  );

  if (safeAttachments.length === 0) return [];

  const uploadedEntries = [];

  for (const attachment of safeAttachments) {
    const uploaded = await uploadTicketHistoryFile({
      ticketId,
      kind: attachment.type,
      file: attachment.file,
    });
    if (!uploaded.publicUrl) {
      throw new Error("Cloudflare R2 ไม่ได้ส่ง URL ของไฟล์กลับมา");
    }
    uploadedEntries.push({
      url: uploaded.publicUrl,
      type: attachment.type,
      name: normalizeText(attachment.file.name) || uploaded.fileName,
    });
  }

  return uploadedEntries;
}

export async function createWalkInTicket({
  requester_name,
  requester_emp_id,
  department,
  location,
  work_type,
  category,
  issue_title,
  issue_description,
  priority,
  start_time,
  end_time,
  resolution_note,
  root_cause,
  action_taken,
  outcome,
  materials_used,
  technician_name,
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

  requireTicketHistoryStorage();

  const startTimeIso = toIsoString(start_time) || new Date().toISOString();
  const endTimeIso = toIsoString(end_time);
  const closedAtIso = endTimeIso || startTimeIso || new Date().toISOString();
  const note = buildWalkInResolution({
    rootCause: root_cause,
    actionTaken: action_taken,
    outcome,
    materialsUsed: materials_used,
    technicianName: technician_name,
    fallbackNote: resolution_note,
  });
  const systemPriority = mapPriorityToSystemValue(priority);
  const departmentValue = normalizeText(department) || null;
  const locationValue = normalizeText(location) || departmentValue;
  const categoryValue = normalizeText(category) || "Walk-in";
  const assignedNameValue =
    normalizeText(technician_name) || normalizeText(assigned_name) || normalizeText(created_by_name) || "IT Support";
  const closedByNameValue =
    normalizeText(closed_by_name) ||
    normalizeText(created_by_name) ||
    assignedNameValue;
  const basePayload = {
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
    description: buildWalkInDescription(work_type, issue_description) || null,
    service_type: "walk-in",
    parts_used: normalizeText(materials_used) || null,
    priority: systemPriority,
    status: "IN_PROGRESS",
    channel: "walk-in",
    started_at: startTimeIso,
    start_time: startTimeIso,
    end_time: endTimeIso || closedAtIso,
    assigned_to: assigned_to || created_by || null,
    assigned_name: assignedNameValue,
    assigned_employee_id: normalizeText(assigned_employee_id) || null,
    updated_at: new Date().toISOString(),
  };

  const { data: pendingTicket, error } = await insertTicketWithSchemaFallback(supabase, basePayload, {
    select: "id,ticket_no,created_at",
    single: true,
    maxRetries: 12,
  });

  if (error) throw error;

  let archiveCreated = false;
  try {
    const uploadedAttachments = await uploadWalkInAttachments({
      ticketId: pendingTicket.id,
      attachments: [
        ...normalizeAttachmentGroup(before_attachments, "before"),
        ...normalizeAttachmentGroup(after_attachments, "after"),
      ],
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
    const closedPayload = {
      status: "CLOSED",
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
    const archived = await archiveTicketHistory({
      ticketId: pendingTicket.id,
      record: {
        ...basePayload,
        ...pendingTicket,
        ...closedPayload,
      },
    });
    archiveCreated = true;

    const { data: closedTicket, error: closeError } = await supabase
      .from("tickets")
      .update({
        ...closedPayload,
        archive_object_key: archived.objectKey,
        archived_at: archived.archivedAt,
      })
      .eq("id", pendingTicket.id)
      .select("id,ticket_no")
      .single();

    if (closeError) throw closeError;
    return closedTicket;
  } catch (archiveError) {
    if (!archiveCreated && pendingTicket?.id) {
      await supabase.from("tickets").delete().eq("id", pendingTicket.id);
    }
    throw new Error(`ไม่สามารถบันทึก Walk-in ลง Cloudflare R2 ได้: ${archiveError?.message || "กรุณาลองใหม่อีกครั้ง"}`);
  }
}
