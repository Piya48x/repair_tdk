import React from "react";
import { Eye, Image as ImageIcon, XCircle } from "lucide-react";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { formatFileSize } from "../../services/workNotesService";

const ATTACHMENT_PREVIEW_TRANSLATIONS = {
  th: {
    preview: "Preview",
    openFile: "เปิดไฟล์",
    imageAlt: "preview",
    notImage: "ไฟล์นี้ไม่ใช่รูปภาพ",
    help: "กดปุ่ม “เปิดไฟล์” เพื่อดูเอกสารในแท็บใหม่",
  },
  en: {
    preview: "Preview",
    openFile: "Open file",
    imageAlt: "preview",
    notImage: "This file is not an image",
    help: 'Click "Open file" to view the document in a new tab.',
  },
  ko: {
    preview: "미리보기",
    openFile: "파일 열기",
    imageAlt: "preview",
    notImage: "이 파일은 이미지가 아닙니다.",
    help: '"파일 열기" 버튼을 눌러 새 탭에서 문서를 확인하세요.',
  },
};

export default function AttachmentPreviewModal({ attachment, onClose }) {
  const { tt } = useScopedI18n(ATTACHMENT_PREVIEW_TRANSLATIONS);

  if (!attachment) return null;

  const isImage =
    String(attachment.file_url || "").match(/\.(png|jpg|jpeg|gif|webp|heic|heif)$/i) ||
    String(attachment.mime_type || attachment.file?.type || "").startsWith("image/");

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-900">{attachment.file_name || tt("preview")}</p>
            <p className="mt-1 text-xs text-slate-500">{attachment.file_size ? formatFileSize(attachment.file_size) : "-"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.open(attachment.file_url, "_blank", "noopener,noreferrer")}
              className="app-btn-secondary inline-flex items-center gap-2"
            >
              <Eye size={14} />
              {tt("openFile")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
            >
              <XCircle size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex max-h-[75vh] items-center justify-center overflow-auto rounded-2xl bg-slate-100 p-4">
          {isImage ? (
            <img
              src={attachment.file_url}
              alt={attachment.file_name || tt("imageAlt")}
              className="max-h-[68vh] w-auto max-w-full rounded-2xl object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-10 text-center">
              <ImageIcon className="h-9 w-9 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">{tt("notImage")}</p>
              <p className="text-xs text-slate-500">{tt("help")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
