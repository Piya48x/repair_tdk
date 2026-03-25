import React from "react";
import { User, X } from "lucide-react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";

const PROFILE_IMAGE_MODAL_TRANSLATIONS = {
  th: {
    close: "ปิด",
    alt: "Profile",
    noImage: "ไม่มีรูปภาพโปรไฟล์",
  },
  en: {
    close: "Close",
    alt: "Profile",
    noImage: "No profile image",
  },
  ko: {
    close: "닫기",
    alt: "Profile",
    noImage: "프로필 이미지가 없습니다.",
  },
};

export default function ProfileImageModal({ isOpen, onClose, profile }) {
  const { tt } = useScopedI18n(PROFILE_IMAGE_MODAL_TRANSLATIONS);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold hover:text-slate-200 transition-colors group/close"
          onClick={onClose}
        >
          <span>{tt("close")}</span>
          <X size={20} className="transform group-hover/close:rotate-90 transition-transform" />
        </button>
        {profile?.id_card_url ? (
          <img
            src={profile.id_card_url}
            className="w-full h-auto rounded-3xl shadow-2xl border-4 border-white/20"
            alt={tt("alt")}
          />
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center">
            <User size={64} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">{tt("noImage")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
