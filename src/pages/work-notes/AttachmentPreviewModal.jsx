import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Image as ImageIcon, XCircle } from "lucide-react";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { formatFileSize } from "../../services/workNotesService";

const ATTACHMENT_PREVIEW_TRANSLATIONS = {
  th: {
    preview: "Preview",
    openFile: "เปิดไฟล์",
    imageAlt: "preview",
    notImage: "ไฟล์นี้ไม่ใช่รูปภาพ",
    help: 'กดปุ่ม "เปิดไฟล์" เพื่อดูเอกสารในแท็บใหม่',
    previous: "รูปก่อนหน้า",
    next: "รูปถัดไป",
    itemCount: "รูป {{current}} / {{total}}",
  },
  en: {
    preview: "Preview",
    openFile: "Open file",
    imageAlt: "preview",
    notImage: "This file is not an image",
    help: 'Click "Open file" to view the document in a new tab.',
    previous: "Previous",
    next: "Next",
    itemCount: "Image {{current}} / {{total}}",
  },
  ko: {
    preview: "미리보기",
    openFile: "파일 열기",
    imageAlt: "preview",
    notImage: "이 파일은 이미지가 아닙니다.",
    help: '"파일 열기" 버튼을 눌러 새 탭에서 문서를 확인하세요.',
    previous: "이전",
    next: "다음",
    itemCount: "이미지 {{current}} / {{total}}",
  },
};

const isImageAttachmentPreview = (attachment) =>
  String(attachment?.file_url || "").match(/\.(png|jpg|jpeg|gif|webp|heic|heif)$/i) ||
  String(attachment?.mime_type || attachment?.file?.type || "").startsWith("image/");

export default function AttachmentPreviewModal({ attachment, attachments = [], initialIndex = 0, onClose }) {
  const { tt } = useScopedI18n(ATTACHMENT_PREVIEW_TRANSLATIONS);
  const previewItems = useMemo(() => {
    const items = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
    if (items.length > 0) return items;
    return attachment ? [attachment] : [];
  }, [attachment, attachments]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (previewItems.length === 0) {
      setActiveIndex(0);
      return;
    }

    const attachmentIndex = attachment
      ? previewItems.findIndex(
          (item) =>
            String(item?.id || "") === String(attachment?.id || "") ||
            String(item?.file_url || "") === String(attachment?.file_url || ""),
        )
      : -1;

    const nextIndex =
      attachmentIndex >= 0
        ? attachmentIndex
        : Math.min(Math.max(Number(initialIndex) || 0, 0), previewItems.length - 1);

    setActiveIndex(nextIndex);
  }, [attachment, initialIndex, previewItems]);

  if (previewItems.length === 0) return null;

  const currentAttachment = previewItems[activeIndex] || previewItems[0];
  const isImage = isImageAttachmentPreview(currentAttachment);
  const hasMultipleItems = previewItems.length > 1;
  const goToPrevious = () => setActiveIndex((current) => (current <= 0 ? previewItems.length - 1 : current - 1));
  const goToNext = () => setActiveIndex((current) => (current >= previewItems.length - 1 ? 0 : current + 1));

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-900">{currentAttachment.file_name || tt("preview")}</p>
            <p className="mt-1 text-xs text-slate-500">
              {currentAttachment.file_size ? formatFileSize(currentAttachment.file_size) : "-"}
              {hasMultipleItems ? ` • ${tt("itemCount", { current: activeIndex + 1, total: previewItems.length })}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.open(currentAttachment.file_url, "_blank", "noopener,noreferrer")}
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

        <div className="mt-4 flex items-center gap-3">
          {hasMultipleItems ? (
            <button
              type="button"
              onClick={goToPrevious}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
              aria-label={tt("previous")}
              title={tt("previous")}
            >
              <ChevronLeft size={18} />
            </button>
          ) : null}

          <div className="flex max-h-[75vh] flex-1 items-center justify-center overflow-auto rounded-2xl bg-slate-100 p-4">
            {isImage ? (
              <img
                src={currentAttachment.file_url}
                alt={currentAttachment.file_name || tt("imageAlt")}
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

          {hasMultipleItems ? (
            <button
              type="button"
              onClick={goToNext}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
              aria-label={tt("next")}
              title={tt("next")}
            >
              <ChevronRight size={18} />
            </button>
          ) : null}
        </div>

        {hasMultipleItems ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {previewItems.map((item, index) => {
              const itemIsImage = isImageAttachmentPreview(item);
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.id || item.file_url || `${item.file_name || "attachment"}_${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`shrink-0 overflow-hidden rounded-2xl border transition ${
                    isActive ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200 bg-white"
                  } ${itemIsImage ? "h-20 w-20" : "flex h-20 w-32 items-center gap-2 px-3 py-2 text-left"}`}
                >
                  {itemIsImage ? (
                    <img src={item.file_url} alt={item.file_name || tt("imageAlt")} className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5 shrink-0 text-slate-400" />
                      <span className="line-clamp-3 text-xs font-semibold text-slate-600">{item.file_name || tt("preview")}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
