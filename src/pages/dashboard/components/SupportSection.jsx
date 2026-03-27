import React, { useState } from "react";
import { ChevronRight, Mail, MessageCircle, Phone, Shield, X } from "lucide-react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";

const SUPPORT_SECTION_TRANSLATIONS = {
  th: {
    badge: "Quick Help",
    title: "บริการช่วยเหลือด่วน",
    description: "หากงานเร่งหรือมีข้อสงสัยเรื่องการแจ้งซ่อม สามารถติดต่อทีม IT ได้โดยตรง",
    closePanel: "ปิดแผงช่วยเหลือด่วน",
    hidePanel: "ซ่อนบริการช่วยเหลือด่วน",
    openPanel: "เปิดบริการช่วยเหลือด่วน",
    openChat: "แชทกับ Support",
    contacts: {
      hotline: "โทร",
      email: "อีเมล",
      line: "OA",
    },
  },
  en: {
    badge: "Quick Help",
    title: "Urgent support",
    description: "If the issue is urgent or you need help with ticket submission, contact the IT team directly.",
    closePanel: "Close quick help panel",
    hidePanel: "Hide quick help",
    openPanel: "Open quick help",
    openChat: "Chat with Support",
    contacts: {
      hotline: "Phone",
      email: "Email",
      line: "OA",
    },
  },
  ko: {
    badge: "Quick Help",
    title: "긴급 지원",
    description: "긴급한 문제이거나 티켓 접수 도움이 필요하면 IT 팀에 바로 연락하세요.",
    closePanel: "긴급 지원 패널 닫기",
    hidePanel: "긴급 지원 숨기기",
    openPanel: "긴급 지원 열기",
    openChat: "Support와 채팅",
    contacts: {
      hotline: "전화",
      email: "이메일",
      line: "OA",
    },
  },
};

function SupportContactCard({ item }) {
  const content = (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2b59b0] to-[#244a95] text-white shadow-sm">
        <item.icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-800">{item.value}</p>
      </div>
      {item.href ? <ChevronRight size={14} className="text-slate-400" /> : null}
    </>
  );

  const className = `flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-3 ${
    item.href ? "transition hover:border-[#2b59b0]/25 hover:bg-[#EEF3FF]" : ""
  }`;

  if (!item.href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <a href={item.href} className={className}>
      {content}
    </a>
  );
}

export default function SupportSection({ onOpenChat, hidden = false }) {
  const { tt } = useScopedI18n(SUPPORT_SECTION_TRANSLATIONS);
  const [isOpen, setIsOpen] = useState(false);

  const supportContacts = [
    { icon: Phone, label: tt("contacts.hotline"), value: "038 394 337", href: "tel:038394337" },
    { icon: Mail, label: tt("contacts.email"), value: "it@tdk.co.th", href: "mailto:it@tdk.co.th" },
    { icon: MessageCircle, label: tt("contacts.line"), value: "TF Team" },
  ];

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[85] sm:bottom-6 sm:right-6">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {isOpen && (
          <div className="w-[min(88vw,320px)] overflow-hidden rounded-3xl border border-[#2b59b0]/15 bg-white/95 text-slate-800 shadow-[0_28px_70px_-26px_rgba(43,89,176,0.42)] backdrop-blur-xl">
            <div className="bg-gradient-to-r from-[#1c376d] via-[#2b59b0] to-[#244a95] px-4 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Shield size={16} className="text-white/90" />
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/80">{tt("badge")}</p>
                  </div>
                  <h3 className="text-base font-black">{tt("title")}</h3>
                  <p className="mt-1 text-xs text-white/80">{tt("description")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label={tt("closePanel")}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid grid-cols-1 gap-2.5">
                {supportContacts.map((item) => (
                  <SupportContactCard key={`${item.label}-${item.value}`} item={item} />
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  onOpenChat?.();
                  setIsOpen(false);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2b59b0] to-[#244a95] px-4 py-3 text-sm font-bold text-white shadow-[0_16px_28px_-18px_rgba(43,89,176,0.65)] transition hover:brightness-[0.98]"
              >
                <MessageCircle size={16} />
                {tt("openChat")}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`inline-flex h-14 w-14 items-center justify-center rounded-full border text-white shadow-[0_22px_45px_-22px_rgba(43,89,176,0.7)] transition-all duration-300 ${
            isOpen
              ? "border-[#244a95] bg-[#244a95] rotate-90"
              : "border-[#2b59b0] bg-gradient-to-br from-[#2b59b0] to-[#244a95] hover:-translate-y-1"
          }`}
          aria-label={isOpen ? tt("hidePanel") : tt("openPanel")}
        >
          {isOpen ? <X size={22} /> : <Shield size={22} />}
        </button>
      </div>
    </div>
  );
}
