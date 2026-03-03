import React from "react";
import { CheckCircle2, FileText, X } from "lucide-react";

export default function TicketDetailModal({
  ticket,
  onClose,
  onNewTicket,
  getStatusConfig,
  getPriorityConfig,
  formatDate,
}) {
  if (!ticket) return null;

  const statusConfig = getStatusConfig(ticket.status);
  const priorityConfig = getPriorityConfig(ticket.priority);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
                  {ticket.ticket_no || `T${ticket.id?.slice(-6).toUpperCase() || "000000"}`}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
                  {statusConfig.label}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${priorityConfig.color}`}>
                  {priorityConfig.label}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-800">{ticket.title || "ไม่มีหัวข้อ"}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors transform hover:rotate-90 duration-300"
            >
              <X size={24} className="text-slate-500" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={14} />
                รายละเอียดปัญหา
              </h3>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-slate-700 whitespace-pre-line">{ticket.description || "ไม่มีรายละเอียด"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">ข้อมูลงาน</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">หมวดหมู่</span>
                    <span className="font-bold text-slate-800">{ticket.category || "ไม่ระบุ"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">วันที่แจ้ง</span>
                    <span className="font-bold text-slate-800">{formatDate(ticket.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">สถานที่</span>
                    <span className="font-bold text-slate-800">{ticket.location || "ไม่ระบุ"}</span>
                  </div>
                </div>
              </div>

              {ticket.assigned_name && (
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">ช่างผู้ดูแล</h3>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {ticket.assigned_name?.charAt(0) || "T"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{ticket.assigned_name}</p>
                      <p className="text-xs text-slate-500">ช่างเทคนิค</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {ticket.solution_note && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-2xl border border-emerald-100">
                <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  สรุปการซ่อม
                </h3>
                <p className="text-emerald-800">{ticket.solution_note}</p>
              </div>
            )}

            {ticket.image_url && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">รูปภาพประกอบ</h3>
                <img
                  src={ticket.image_url}
                  alt="Ticket attachment"
                  className="w-full h-48 object-cover rounded-2xl shadow-inner"
                />
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={onClose}
                className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-200"
              >
                ปิด
              </button>
              <button
                onClick={onNewTicket}
                className="py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                สร้างใบแจ้งซ่อมใหม่
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
