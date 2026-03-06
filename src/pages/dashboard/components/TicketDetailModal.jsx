import React, { useMemo } from "react";
import { CheckCircle2, FileText, X } from "lucide-react";
import TicketChatPanel from "../../../components/TicketChatPanel";

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

export default function TicketDetailModal({
  ticket,
  onClose,
  onNewTicket,
  getStatusConfig,
  getPriorityConfig,
  formatDate,
  currentUser,
}) {
  const attachmentUrls = useMemo(() => collectAttachmentUrls(ticket), [ticket]);

  if (!ticket) return null;

  const statusConfig = getStatusConfig(ticket.status);
  const priorityConfig = getPriorityConfig(ticket.priority);
  const reporterName = ticket.reporter_name || "ผู้แจ้ง";
  const reporterEmpId =
    ticket.reporter_emp_id || deriveEmployeeCodeFromEmail(ticket.reporter_email) || "ไม่ระบุรหัส";
  const reporterDept = ticket.reporter_dept || ticket.department || "ไม่ระบุแผนก";
  const reporterAvatar =
    ticket.reporter_avatar_url || buildAvatarFallback(reporterName, "2b59b0");
  const technicianAvatar =
    ticket.assigned_avatar_url || buildAvatarFallback(ticket.assigned_name || "IT", "059669");

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
              <h2 className="text-2xl font-black text-slate-800">{ticket.title || "Untitled ticket"}</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="close ticket detail"
            >
              <X size={22} />
            </button>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <FileText size={14} />
                Problem Details
              </h3>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {ticket.description || "No description provided"}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Ticket Info</h3>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Category</span>
                    <span className="font-semibold text-slate-800">{ticket.category || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Created at</span>
                    <span className="font-semibold text-slate-800">{formatDate(ticket.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Location</span>
                    <span className="font-semibold text-slate-800">{ticket.location || "-"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">People</h3>
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
                        alt={ticket.assigned_name || "Technician"}
                        className="h-10 w-10 rounded-full border border-emerald-200 bg-white object-cover"
                      />
                      <div>
                        <p className="font-bold text-slate-800">
                          {ticket.assigned_name || "Waiting for assignment"}
                        </p>
                        <p className="text-xs text-slate-600">
                          {ticket.assigned_employee_id || "IT Support"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {ticket.solution_note && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700">
                  <CheckCircle2 size={14} />
                  Resolution Note
                </h3>
                <p className="text-sm leading-relaxed text-emerald-800">{ticket.solution_note}</p>
              </section>
            )}

            {attachmentUrls.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Attachments</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {attachmentUrls.map((url, index) => (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm"
                    >
                      <img
                        src={url}
                        alt={`attachment-${index + 1}`}
                        className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="border-t border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                        Attachment {index + 1}
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
              Close
            </button>
            <button
              onClick={onNewTicket}
              className="rounded-xl bg-[#2b59b0] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#244a95]"
            >
              Create New Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
