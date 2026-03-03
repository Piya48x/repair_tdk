import React from "react";
import { ChevronRight, Mail, MessageCircle, Phone, Shield, Timer } from "lucide-react";

const SUPPORT_CONTACTS = [
  { icon: Phone, label: "เบอร์ด่วน", value: "02-XXX-XXXX ต่อ 199" },
  { icon: Mail, label: "อีเมล", value: "helpdesk@company.co.th" },
  { icon: MessageCircle, label: "ไลน์ OA", value: "@IT_Support_Official" },
  { icon: Timer, label: "SLA Response", value: "ภายใน 15 นาที" },
];

export default function SupportSection() {
  return (
    <div className="order-4 relative overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-r from-slate-900 to-slate-800 p-5 sm:p-7 md:p-9 text-white shadow-xl group hover:shadow-2xl transition-shadow duration-500">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10"></div>
      <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={20} className="text-indigo-400" />
              <h3 className="text-xl md:text-2xl font-black">บริการช่วยเหลือด่วน</h3>
            </div>
            <p className="text-slate-400 text-sm">
              ทีมเทคนิคพร้อมให้บริการตลอด 24 ชั่วโมงตาม SLA ที่กำหนด
            </p>
          </div>

          <div className="flex w-full sm:w-auto flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm">
            <button className="group/chat flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 sm:px-5 py-3 font-bold transition-all transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-900/50">
              <MessageCircle size={18} />
              <span>แชทกับ Support</span>
              <ChevronRight size={14} className="transform group-hover/chat:translate-x-1 transition-transform" />
            </button>
            <button className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 sm:px-5 py-3 font-bold transition-all hover:bg-white/20">
              <Phone size={18} />
              โทรด่วน
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SUPPORT_CONTACTS.map((item, index) => (
            <div key={index} className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <item.icon size={14} className="text-indigo-400" />
                <p className="text-xs font-bold text-slate-300">{item.label}</p>
              </div>
              <p className="text-sm font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
