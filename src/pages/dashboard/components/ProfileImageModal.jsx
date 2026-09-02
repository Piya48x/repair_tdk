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
  const profileImageUrl = profile?.avatar_url || profile?.id_card_url || "";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md animate-fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition hover:bg-black/65 sm:-top-12 sm:right-0 sm:h-auto sm:w-auto sm:gap-2 sm:border-0 sm:bg-transparent sm:font-bold"
          onClick={onClose}
          aria-label={tt("close")}
        >
          <span className="hidden sm:inline">{tt("close")}</span>
          <X size={20} className="transform group-hover/close:rotate-90 transition-transform" />
        </button>
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            className="max-h-[88dvh] w-full rounded-t-3xl border border-white/20 bg-slate-900 object-contain shadow-2xl sm:rounded-3xl sm:border-4"
            alt={tt("alt")}
          />
        ) : (
          <div className="rounded-t-3xl bg-white p-12 text-center sm:rounded-3xl">
            <User size={64} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">{tt("noImage")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
