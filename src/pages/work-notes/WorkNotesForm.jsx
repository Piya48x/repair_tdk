import React, { useMemo } from "react";
import {
  Bell,
  BellOff,
  CheckSquare,
  Eye,
  Loader2,
  Paperclip,
  Pin,
  PinOff,
  PlusCircle,
  Save,
  Square,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useI18n } from "../../i18n/LanguageProvider";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { formatFileSize, isImageAttachment } from "../../services/workNotesService";
import { getWorkNotesPriorityOptions, getWorkNotesStatusOptions } from "./shared";

const WORK_NOTES_FORM_TRANSLATIONS = {
  th: {
    editTitle: "แก้ไขโน้ตงาน",
    createTitle: "สร้างโน้ตใหม่",
    subtitle: "บันทึกงาน, แพลนงาน, เอกสารความรู้ และหลักฐานภาพในฟอร์มเดียว",
    cancelEdit: "ยกเลิกแก้ไข",
    titleLabel: "ชื่อเรื่อง",
    titlePlaceholder: "เช่น สรุปการติดตั้ง Notebook ให้ฝ่ายขาย",
    descriptionLabel: "รายละเอียด",
    descriptionPlaceholder: "บันทึกวิธีทำงาน, รายละเอียดปัญหา, สรุปสิ่งที่ต้องติดตามต่อ",
    dateLabel: "วันที่",
    timeLabel: "เวลา",
    statusLabel: "สถานะ",
    priorityLabel: "ความสำคัญ",
    tagsLabel: "แท็ก (คั่นด้วย comma)",
    tagsPlaceholder: "เช่น install, knowledge, urgent",
    reminderTitle: "เปิดเตือนความจำ",
    reminderHint: "เก็บ flag เตือนไว้กับโน้ตนี้",
    pinTitle: "ปักหมุดโน้ต",
    pinHint: "โน้ตนี้จะถูกแสดงบนสุดของรายการ",
    checklistTitle: "Checklist",
    checklistHint: "เหมือน Notion: เพิ่ม ติ๊ก และลบรายการได้",
    addChecklist: "เพิ่มรายการ",
    emptyChecklist: "ยังไม่มี checklist",
    checklistPlaceholder: "เช่น ตรวจ serial number, แนบรูปหลังติดตั้ง",
    attachmentsTitle: "ไฟล์แนบ / รูปหลักฐาน",
    attachmentsHint: "รองรับรูป, PDF, Excel และวางภาพจาก Win+Shift+S แล้ว Ctrl+V",
    chooseFile: "เลือกไฟล์",
    existingFiles: "ไฟล์เดิม",
    pendingFiles: "ไฟล์ใหม่ที่รออัปโหลด",
    emptyFiles: "ลากไฟล์มาใส่ หรือกด Win+Shift+S แล้ว Ctrl+V เพื่อวางภาพหน้าจอเป็นหลักฐานงาน",
    saving: "กำลังบันทึก...",
    saveEdit: "บันทึกการแก้ไข",
    create: "สร้างโน้ต",
    reset: "ล้างฟอร์ม",
  },
  en: {
    editTitle: "Edit note",
    createTitle: "Create note",
    subtitle: "Track work items, plans, knowledge documents, and visual evidence in one form.",
    cancelEdit: "Cancel edit",
    titleLabel: "Title",
    titlePlaceholder: "Example: Notebook installation summary for Sales",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Record workflow, issue details, and follow-up items",
    dateLabel: "Date",
    timeLabel: "Time",
    statusLabel: "Status",
    priorityLabel: "Priority",
    tagsLabel: "Tags (comma separated)",
    tagsPlaceholder: "Example: install, knowledge, urgent",
    reminderTitle: "Enable reminder",
    reminderHint: "Keep a reminder flag on this note",
    pinTitle: "Pin note",
    pinHint: "This note will stay at the top of the list",
    checklistTitle: "Checklist",
    checklistHint: "Like Notion: add, check, and remove items",
    addChecklist: "Add item",
    emptyChecklist: "No checklist yet",
    checklistPlaceholder: "Example: Check serial number, attach post-install photo",
    attachmentsTitle: "Attachments / Evidence",
    attachmentsHint: "Supports images, PDF, Excel, and pasted screenshots with Win+Shift+S then Ctrl+V",
    chooseFile: "Choose file",
    existingFiles: "Existing files",
    pendingFiles: "New files waiting for upload",
    emptyFiles: "Drop files here or press Win+Shift+S then Ctrl+V to paste a screenshot as evidence",
    saving: "Saving...",
    saveEdit: "Save changes",
    create: "Create note",
    reset: "Reset form",
  },
  ko: {
    editTitle: "업무 노트 수정",
    createTitle: "새 노트 만들기",
    subtitle: "작업, 계획, 지식 문서, 증빙 이미지를 하나의 폼에서 관리합니다.",
    cancelEdit: "수정 취소",
    titleLabel: "제목",
    titlePlaceholder: "예: 영업팀 노트북 설치 요약",
    descriptionLabel: "상세 내용",
    descriptionPlaceholder: "작업 방식, 문제 상세, 후속 조치 내용을 기록하세요",
    dateLabel: "날짜",
    timeLabel: "시간",
    statusLabel: "상태",
    priorityLabel: "우선순위",
    tagsLabel: "태그 (쉼표로 구분)",
    tagsPlaceholder: "예: install, knowledge, urgent",
    reminderTitle: "리마인더 사용",
    reminderHint: "이 노트에 리마인더 플래그를 저장합니다",
    pinTitle: "노트 고정",
    pinHint: "이 노트는 목록 상단에 표시됩니다",
    checklistTitle: "체크리스트",
    checklistHint: "Notion처럼 항목 추가, 체크, 삭제 가능",
    addChecklist: "항목 추가",
    emptyChecklist: "체크리스트가 없습니다",
    checklistPlaceholder: "예: 시리얼 번호 확인, 설치 후 사진 첨부",
    attachmentsTitle: "첨부파일 / 증빙 이미지",
    attachmentsHint: "이미지, PDF, Excel 및 Win+Shift+S 후 Ctrl+V 붙여넣기를 지원합니다",
    chooseFile: "파일 선택",
    existingFiles: "기존 파일",
    pendingFiles: "업로드 대기 중인 새 파일",
    emptyFiles: "파일을 끌어오거나 Win+Shift+S 후 Ctrl+V로 스크린샷을 붙여 넣어 증빙으로 사용하세요",
    saving: "저장 중...",
    saveEdit: "수정 저장",
    create: "노트 만들기",
    reset: "폼 초기화",
  },
};

export default function WorkNotesForm({
  formPanelRef,
  fileInputRef,
  editingNoteId,
  formData,
  pendingFiles,
  saving,
  formError,
  onSubmit,
  onReset,
  onFieldChange,
  onAddChecklistRow,
  onChecklistFieldChange,
  onChecklistRemove,
  onSelectFiles,
  onExistingAttachmentRemove,
  onPendingFileRemove,
  onPreviewAttachment,
}) {
  const { language } = useI18n();
  const { tt } = useScopedI18n(WORK_NOTES_FORM_TRANSLATIONS);
  const statusOptions = useMemo(() => getWorkNotesStatusOptions(language), [language]);
  const priorityOptions = useMemo(() => getWorkNotesPriorityOptions(language), [language]);

  return (
    <aside ref={formPanelRef} className="app-surface rounded-3xl p-4 sm:p-5 xl:sticky xl:top-5 xl:self-start">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900">
            {editingNoteId ? tt("editTitle") : tt("createTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{tt("subtitle")}</p>
        </div>

        {editingNoteId ? (
          <button type="button" onClick={onReset} className="app-btn-secondary inline-flex items-center gap-2">
            <XCircle size={14} />
            {tt("cancelEdit")}
          </button>
        ) : null}
      </div>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">{tt("titleLabel")}</label>
          <input
            value={formData.title}
            onChange={(event) => onFieldChange("title", event.target.value)}
            className="app-input"
            placeholder={tt("titlePlaceholder")}
            maxLength={160}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">{tt("descriptionLabel")}</label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(event) => onFieldChange("description", event.target.value)}
            className="app-input resize-y"
            placeholder={tt("descriptionPlaceholder")}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">{tt("dateLabel")}</label>
            <input
              type="date"
              value={formData.note_date}
              onChange={(event) => onFieldChange("note_date", event.target.value)}
              className="app-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">{tt("timeLabel")}</label>
            <input
              type="time"
              value={formData.note_time}
              onChange={(event) => onFieldChange("note_time", event.target.value)}
              className="app-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">{tt("statusLabel")}</label>
            <select value={formData.status} onChange={(event) => onFieldChange("status", event.target.value)} className="app-input">
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">{tt("priorityLabel")}</label>
            <select value={formData.priority} onChange={(event) => onFieldChange("priority", event.target.value)} className="app-input">
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">{tt("tagsLabel")}</label>
          <input
            value={formData.tagsInput}
            onChange={(event) => onFieldChange("tagsInput", event.target.value)}
            className="app-input"
            placeholder={tt("tagsPlaceholder")}
            maxLength={200}
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">{tt("reminderTitle")}</p>
              <p className="text-[11px] text-slate-500">{tt("reminderHint")}</p>
            </div>
            <button
              type="button"
              onClick={() => onFieldChange("reminder_enabled", !formData.reminder_enabled)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${
                formData.reminder_enabled
                  ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-primary)]"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {formData.reminder_enabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">{tt("pinTitle")}</p>
              <p className="text-[11px] text-slate-500">{tt("pinHint")}</p>
            </div>
            <button
              type="button"
              onClick={() => onFieldChange("is_pinned", !formData.is_pinned)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${
                formData.is_pinned ? "border-rose-200 bg-rose-50 text-rose-600" : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {formData.is_pinned ? <Pin size={16} /> : <PinOff size={16} />}
            </button>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-800">{tt("checklistTitle")}</p>
              <p className="text-[11px] text-slate-500">{tt("checklistHint")}</p>
            </div>
            <button type="button" onClick={onAddChecklistRow} className="app-btn-secondary inline-flex items-center gap-2">
              <PlusCircle size={14} />
              {tt("addChecklist")}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {formData.checklists.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-500">
                {tt("emptyChecklist")}
              </div>
            ) : (
              formData.checklists.map((item) => {
                const itemKey = item.id ?? item.tempId;
                return (
                  <div key={itemKey} className="flex items-center gap-2 rounded-2xl border border-white bg-white px-3 py-2 shadow-sm">
                    <button
                      type="button"
                      onClick={() => onChecklistFieldChange(itemKey, { is_done: !item.is_done })}
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        item.is_done ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {item.is_done ? <CheckSquare size={15} /> : <Square size={15} />}
                    </button>
                    <input
                      value={item.content}
                      onChange={(event) => onChecklistFieldChange(itemKey, { content: event.target.value })}
                      className="app-input min-w-0 flex-1"
                      placeholder={tt("checklistPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => onChecklistRemove(itemKey)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-800">{tt("attachmentsTitle")}</p>
              <p className="text-[11px] text-slate-500">{tt("attachmentsHint")}</p>
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="app-btn-secondary inline-flex items-center gap-2">
              <Upload size={14} />
              {tt("chooseFile")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.csv,.txt"
              className="hidden"
              onChange={(event) => {
                onSelectFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          <div className="mt-3 space-y-3">
            {formData.attachments.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{tt("existingFiles")}</p>
                <div className="space-y-2">
                  {formData.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 rounded-2xl border border-white bg-white px-3 py-2 shadow-sm">
                      {isImageAttachment(attachment) ? (
                        <button type="button" onClick={() => onPreviewAttachment(attachment)} className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          <img src={attachment.file_url} alt={attachment.file_name} className="h-full w-full object-cover" />
                        </button>
                      ) : (
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                          <Paperclip size={16} />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{attachment.file_name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(attachment.file_size)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => window.open(attachment.file_url, "_blank", "noopener,noreferrer")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onExistingAttachmentRemove(attachment)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {pendingFiles.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{tt("pendingFiles")}</p>
                <div className="space-y-2">
                  {pendingFiles.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--brand-border)] bg-white px-3 py-2">
                      {item.previewUrl ? (
                        <button
                          type="button"
                          onClick={() => onPreviewAttachment({ ...item, file_url: item.previewUrl, file_name: item.file.name })}
                          className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
                        </button>
                      ) : (
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                          <Paperclip size={16} />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{item.file.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(item.file.size)}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onPendingFileRemove(item.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-xs text-slate-500">
                {tt("emptyFiles")}
              </div>
            )}
          </div>
        </div>

        {formError ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{formError}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className="app-btn-primary inline-flex flex-1 items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? tt("saving") : editingNoteId ? tt("saveEdit") : tt("create")}
          </button>
          <button type="button" onClick={onReset} className="app-btn-secondary inline-flex items-center justify-center gap-2">
            <XCircle size={14} />
            {tt("reset")}
          </button>
        </div>
      </form>
    </aside>
  );
}
