import React, { useMemo } from "react";
import { CheckCircle2, FileText, X } from "lucide-react";
import TicketChatPanel from "../../../components/TicketChatPanel";
import { useScopedI18n } from "../../../i18n/useScopedI18n";

const TICKET_DETAIL_MODAL_TRANSLATIONS = {
  th: {
    reporter: "ผู้แจ้ง",
    noEmployeeId: "ไม่ระบุรหัส",
    noDepartment: "ไม่ระบุแผนก",
    untitledTicket: "ไม่มีหัวข้อ",
    closeAria: "ปิดรายละเอียดเคส",
    problemDetails: "รายละเอียดปัญหา",
    noDescription: "ไม่มีรายละเอียดเพิ่มเติม",
    ticketInfo: "ข้อมูลเคส",
    category: "หมวดหมู่",
    createdAt: "วันที่สร้าง",
    location: "สถานที่",
    people: "ผู้เกี่ยวข้อง",
    technician: "ช่างผู้รับผิดชอบ",
    waitingAssignment: "รอมอบหมายงาน",
    itSupport: "IT Support",
    resolutionNote: "บันทึกการแก้ไข",
    attachments: "ไฟล์แนบ",
    attachmentLabel: "ไฟล์แนบ {{index}}",
    close: "ปิด",
    createNewTicket: "สร้าง Ticket ใหม่",
  },
  en: {
    reporter: "Reporter",
    noEmployeeId: "No employee ID",
    noDepartment: "No department",
    untitledTicket: "Untitled ticket",
    closeAria: "Close ticket details",
    problemDetails: "Problem details",
    noDescription: "No description provided",
    ticketInfo: "Ticket info",
    category: "Category",
    createdAt: "Created at",
    location: "Location",
    people: "People",
    technician: "Technician",
    waitingAssignment: "Waiting for assignment",
    itSupport: "IT Support",
    resolutionNote: "Resolution note",
    attachments: "Attachments",
    attachmentLabel: "Attachment {{index}}",
    close: "Close",
    createNewTicket: "Create new ticket",
  },
  ko: {
    reporter: "신청자",
    noEmployeeId: "사번 없음",
    noDepartment: "부서 없음",
    untitledTicket: "제목 없음",
    closeAria: "티켓 상세 닫기",
    problemDetails: "문제 상세",
    noDescription: "설명이 없습니다",
    ticketInfo: "티켓 정보",
    category: "카테고리",
    createdAt: "생성일",
    location: "위치",
    people: "관련자",
    technician: "담당자",
    waitingAssignment: "담당자 배정 대기",
    itSupport: "IT Support",
    resolutionNote: "처리 메모",
    attachments: "첨부 파일",
    attachmentLabel: "첨부 {{index}}",
    close: "닫기",
    createNewTicket: "새 티켓 만들기",
  },
};

function buildAvatarFallback(name, color = "2b59b0") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || "U"))}&background=${color}&color=fff&size=96`;
}

function deriveEmployeeCodeFromEmail(email) {
  const localPart = String(email || "").trim().split("@")[0] || "";
  const match = localPart.match(/\d{3,}/);
  return match ? match[0] : "";
}

function collectAttachmentUrls(ticket) {
  const urls = [];

  if (Array.isArray(ticket?.attachments)) {
    ticket.attachments.forEach((url) => {
      if (typeof url === "string" && url.trim()) urls.push(url.trim());
    });
  }

  if (typeof ticket?.image_url === "string" && ticket.image_url.trim()) {
    urls.push(ticket.image_url.trim());
  }

  if (typeof ticket?.image_after_url === "string" && ticket.image_after_url.trim()) {
    urls.push(ticket.image_after_url.trim());
  }

  return Array.from(new Set(urls));
}

function isImageAttachmentUrl(url) {
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)(?:[?#].*)?$/i.test(String(url || ""));
}

function getAttachmentName(url) {
  try {
    const pathname = new URL(String(url || "")).pathname;
    return decodeURIComponent(pathname.split("/").pop() || "attachment");
  } catch {
    const cleanUrl = String(url || "").split("?")[0];
    return decodeURIComponent(cleanUrl.split("/").pop() || "attachment");
  }
}

export default function TicketDetailModal({
  ticket,
  onClose,
  onNewTicket,
  getStatusConfig,
  getPriorityConfig,
  formatDate,
  currentUser,
}) {
  const { tt } = useScopedI18n(TICKET_DETAIL_MODAL_TRANSLATIONS);
  const attachmentUrls = useMemo(() => collectAttachmentUrls(ticket), [ticket]);

  if (!ticket) return null;

  const statusConfig = getStatusConfig(ticket);
  const priorityConfig = getPriorityConfig(ticket.priority);
  const reporterName = ticket.reporter_name || tt("reporter");
  const reporterEmpId =
    ticket.reporter_emp_id || deriveEmployeeCodeFromEmail(ticket.reporter_email) || tt("noEmployeeId");
  const reporterDept = ticket.reporter_dept || ticket.department || tt("noDepartment");
  const reporterAvatar =
    ticket.reporter_avatar_url || buildAvatarFallback(reporterName, "2b59b0");
  const technicianAvatar =
    ticket.assigned_avatar_url || buildAvatarFallback(ticket.assigned_name || "IT", "059669");
  const ticketLocation =
    ticket.location ||
    ticket.reporter_location ||
    ticket.work_location ||
    currentUser?.location ||
    "-";
  const isResolvedTicket = String(ticket.status || "").toUpperCase() === "CLOSED" || Boolean(ticket.closed_at);
  const noteSectionClass = isResolvedTicket
    ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
    : "rounded-2xl border border-amber-200 bg-amber-50 p-4";
  const noteHeadingClass = isResolvedTicket
    ? "mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700"
    : "mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-700";
  const noteBodyClass = isResolvedTicket
    ? "text-sm leading-relaxed text-emerald-800"
    : "text-sm leading-relaxed text-amber-900";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#2b59b0]/10 px-3 py-1 text-xs font-bold text-[#2b59b0]">
                  {ticket.ticket_no || `T${String(ticket.id || "").slice(-6).toUpperCase() || "000000"}`}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                >
                  {statusConfig.label}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${priorityConfig.color}`}>
                  {priorityConfig.label}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-800">{ticket.title || tt("untitledTicket")}</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label={tt("closeAria")}
            >
              <X size={22} />
            </button>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <FileText size={14} />
                {tt("problemDetails")}
              </h3>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {ticket.description || tt("noDescription")}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{tt("ticketInfo")}</h3>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">{tt("category")}</span>
                    <span className="font-semibold text-slate-800">{ticket.category || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">{tt("createdAt")}</span>
                    <span className="font-semibold text-slate-800">{formatDate(ticket.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">{tt("location")}</span>
                    <span className="font-semibold text-slate-800">{ticketLocation}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{tt("people")}</h3>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-[#2b59b0]/20 bg-[#2b59b0]/10 p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={reporterAvatar}
                        onError={(event) => {
                          event.currentTarget.src = buildAvatarFallback(reporterName, "2b59b0");
                        }}
                        alt={reporterName}
                        className="h-10 w-10 rounded-full border border-[#2b59b0]/20 bg-white object-cover"
                      />
                      <div>
                        <p className="font-bold text-slate-800">{reporterName}</p>
                        <p className="text-xs text-slate-600">{reporterEmpId}</p>
                        <p className="text-xs text-slate-500">{reporterDept}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={technicianAvatar}
                        onError={(event) => {
                          event.currentTarget.src = buildAvatarFallback(
                            ticket.assigned_name || "IT",
                            "059669",
                          );
                        }}
                        alt={ticket.assigned_name || tt("technician")}
                        className="h-10 w-10 rounded-full border border-emerald-200 bg-white object-cover"
                      />
                      <div>
                        <p className="font-bold text-slate-800">
                          {ticket.assigned_name || tt("waitingAssignment")}
                        </p>
                        <p className="text-xs text-slate-600">
                          {ticket.assigned_employee_id || tt("itSupport")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {ticket.solution_note && (
              <section className={noteSectionClass}>
                <h3 className={noteHeadingClass}>
                  <CheckCircle2 size={14} />
                  {tt("resolutionNote")}
                </h3>
                <p className={noteBodyClass}>{ticket.solution_note}</p>
              </section>
            )}

            {attachmentUrls.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{tt("attachments")}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {attachmentUrls.map((url, index) => (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm"
                    >
                      {isImageAttachmentUrl(url) ? (
                        <img
                          src={url}
                          alt={tt("attachmentLabel", { index: index + 1 })}
                          className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-44 items-center gap-3 bg-gradient-to-br from-slate-50 to-white px-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                            <FileText size={24} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                              {tt("attachmentLabel", { index: index + 1 })}
                            </p>
                            <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-700">
                              {getAttachmentName(url)}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="border-t border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                        {isImageAttachmentUrl(url) ? tt("attachmentLabel", { index: index + 1 }) : getAttachmentName(url)}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <TicketChatPanel ticket={ticket} currentUser={currentUser} />
          </div>

          <div className="mt-7 grid grid-cols-1 gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
            >
              {tt("close")}
            </button>
            <button
              onClick={onNewTicket}
              className="rounded-xl bg-[#2b59b0] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#244a95]"
            >
              {tt("createNewTicket")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
