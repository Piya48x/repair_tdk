import React, { useMemo } from "react";
import { Bell, BellOff, CheckSquare, Filter, Paperclip, Pencil, Pin, PinOff, Search, Square, Tag, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { enUS, ko, th } from "date-fns/locale";
import { useI18n } from "../../i18n/LanguageProvider";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { NOTE_STATUS_VALUES, isImageAttachment } from "../../services/workNotesService";
import {
  formatDateTimeLabel,
  getChecklistSummary,
  getWorkNotesPriorityMeta,
  getWorkNotesStatusFilterOptions,
  getWorkNotesStatusMeta,
  getWorkNotesStatusOptions,
} from "./shared";

const DATE_LOCALES = {
  th,
  en: enUS,
  ko,
};

const WORK_NOTES_LIST_TRANSLATIONS = {
  th: {
    title: "รายการโน้ตงาน",
    subtitle: "ค้นหาจาก title / description / tags พร้อม filter สถานะและแท็กแบบ debounce",
    found: "พบ {{count}} รายการ",
    searchPlaceholder: "ค้นหาชื่อเรื่อง รายละเอียด หรือแท็ก",
    allTags: "ทุกแท็ก",
    emptyTitle: "ยังไม่มีโน้ตที่ตรงกับเงื่อนไขนี้",
    emptyHint: "สร้างโน้ตใหม่จากฟอร์มด้านซ้าย หรือปรับคำค้นหา / filter อีกครั้ง",
    pinned: "Pinned",
    updated: "อัปเดตล่าสุด",
    noDescription: "ไม่มีรายละเอียดเพิ่มเติม",
    changeStatus: "เปลี่ยนสถานะ",
    checklist: "Checklist",
    checklistItems: "{{done}}/{{total}} รายการ",
    noTags: "ไม่มีแท็ก",
    moreItems: "และอีก {{count}} รายการ",
    evidence: "หลักฐานงาน",
    attachments: "{{count}} ไฟล์แนบ",
    reminderOn: "เปิดเตือน",
    reminderOff: "ไม่เตือน",
    noAttachments: "ยังไม่มีไฟล์แนบ",
  },
  en: {
    title: "Notes list",
    subtitle: "Search by title, description, or tags with debounced status and tag filters.",
    found: "{{count}} items found",
    searchPlaceholder: "Search title, description, or tag",
    allTags: "All tags",
    emptyTitle: "No notes match the current filters",
    emptyHint: "Create a new note from the form on the left or adjust the search and filters.",
    pinned: "Pinned",
    updated: "Last updated",
    noDescription: "No additional description",
    changeStatus: "Change status",
    checklist: "Checklist",
    checklistItems: "{{done}}/{{total}} items",
    noTags: "No tags",
    moreItems: "and {{count}} more items",
    evidence: "Evidence",
    attachments: "{{count}} attachments",
    reminderOn: "Reminder on",
    reminderOff: "Reminder off",
    noAttachments: "No attachments yet",
  },
  ko: {
    title: "노트 목록",
    subtitle: "제목, 설명, 태그로 검색하고 상태와 태그 필터를 debounce로 적용합니다.",
    found: "{{count}}개 항목",
    searchPlaceholder: "제목, 설명 또는 태그 검색",
    allTags: "전체 태그",
    emptyTitle: "현재 조건에 맞는 노트가 없습니다",
    emptyHint: "왼쪽 폼에서 새 노트를 만들거나 검색어 / 필터를 조정하세요.",
    pinned: "고정됨",
    updated: "최근 업데이트",
    noDescription: "추가 설명 없음",
    changeStatus: "상태 변경",
    checklist: "체크리스트",
    checklistItems: "{{done}}/{{total}}개 항목",
    noTags: "태그 없음",
    moreItems: "외 {{count}}개",
    evidence: "작업 증빙",
    attachments: "첨부 {{count}}개",
    reminderOn: "알림 켜짐",
    reminderOff: "알림 없음",
    noAttachments: "아직 첨부파일이 없습니다",
  },
};

export default function WorkNotesList({
  loading,
  notes,
  searchInput,
  statusFilter,
  tagFilter,
  tagOptions,
  onSearchChange,
  onStatusFilterChange,
  onTagFilterChange,
  onTogglePin,
  onEdit,
  onDelete,
  onQuickStatusChange,
  onPreviewAttachment,
}) {
  const { language } = useI18n();
  const { tt } = useScopedI18n(WORK_NOTES_LIST_TRANSLATIONS);
  const statusMeta = useMemo(() => getWorkNotesStatusMeta(language), [language]);
  const priorityMeta = useMemo(() => getWorkNotesPriorityMeta(language), [language]);
  const statusFilterOptions = useMemo(() => getWorkNotesStatusFilterOptions(language), [language]);
  const statusOptions = useMemo(() => getWorkNotesStatusOptions(language), [language]);
  const dateLocale = DATE_LOCALES[String(language || "").toLowerCase().startsWith("th") ? "th" : String(language || "").toLowerCase().startsWith("ko") ? "ko" : "en"];

  return (
    <section className="app-surface rounded-3xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900">{tt("title")}</h2>
          <p className="mt-1 text-xs text-slate-500">{tt("subtitle")}</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {tt("found", { count: notes.length })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
        <label className="relative block">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            className="app-input pl-10"
            placeholder={tt("searchPlaceholder")}
          />
        </label>

        <label className="relative block">
          <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} className="app-input pl-10">
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="relative block">
          <Tag size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={tagFilter} onChange={(event) => onTagFilterChange(event.target.value)} className="app-input pl-10">
            <option value="ALL">{tt("allTags")}</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 min-h-[320px]">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--brand-border)] border-t-[var(--brand-primary)]" />
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">{tt("emptyTitle")}</p>
            <p className="mt-1 text-xs text-slate-500">{tt("emptyHint")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            {notes.map((note) => {
              const noteStatusMeta = statusMeta[note.status] || statusMeta[NOTE_STATUS_VALUES.TODO];
              const notePriorityMeta = priorityMeta[note.priority] || priorityMeta.medium;
              const checklist = getChecklistSummary(note);

              return (
                <article key={note.id} className={`rounded-3xl border p-4 shadow-sm transition-colors ${noteStatusMeta.surfaceClass}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {note.is_pinned ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">
                            <Pin size={11} />
                            {tt("pinned")}
                          </span>
                        ) : null}
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${noteStatusMeta.chipClass}`}>{noteStatusMeta.label}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${notePriorityMeta.chipClass}`}>{notePriorityMeta.label}</span>
                      </div>

                      <h3 className="mt-3 text-lg font-black text-slate-900">{note.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTimeLabel(note, language)} • {tt("updated")}{" "}
                        {note.updated_at ? format(new Date(note.updated_at), "dd MMM yyyy HH:mm", { locale: dateLocale }) : "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onTogglePin(note)}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${
                          note.is_pinned ? "border-rose-200 bg-rose-50 text-rose-600" : "border-slate-200 bg-white text-slate-500"
                        }`}
                      >
                        {note.is_pinned ? <Pin size={15} /> : <PinOff size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(note)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(note)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{note.description || tt("noDescription")}</p>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[170px_minmax(0,1fr)]">
                    <div className="rounded-2xl border border-white bg-white/90 p-3">
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{tt("changeStatus")}</label>
                      <select value={note.status} onChange={(event) => onQuickStatusChange(note, event.target.value)} className="app-input">
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <p className="font-semibold text-slate-700">{tt("checklist")}</p>
                        <p className="mt-1">{tt("checklistItems", { done: checklist.done, total: checklist.total || 0 })}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {note.tags.length > 0 ? (
                          note.tags.map((tag) => (
                            <span
                              key={`${note.id}-${tag}`}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                            >
                              <Tag size={11} />
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                            <Tag size={11} />
                            {tt("noTags")}
                          </span>
                        )}
                      </div>

                      {note.note_checklists.length > 0 ? (
                        <div className="rounded-2xl border border-white bg-white/90 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{tt("checklist")}</p>
                          <div className="mt-2 space-y-2">
                            {note.note_checklists.slice(0, 4).map((item) => (
                              <div key={item.id} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="mt-0.5 text-slate-500">{item.is_done ? <CheckSquare size={14} /> : <Square size={14} />}</span>
                                <span className={item.is_done ? "line-through text-slate-400" : ""}>{item.content}</span>
                              </div>
                            ))}
                            {note.note_checklists.length > 4 ? (
                              <p className="text-xs font-semibold text-slate-500">{tt("moreItems", { count: note.note_checklists.length - 4 })}</p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-white bg-white/90 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{tt("evidence")}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">{tt("attachments", { count: note.note_attachments.length })}</p>
                          </div>
                          {note.reminder_enabled ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-primary)]">
                              <Bell size={11} />
                              {tt("reminderOn")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                              <BellOff size={11} />
                              {tt("reminderOff")}
                            </span>
                          )}
                        </div>

                        {note.note_attachments.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {note.note_attachments.slice(0, 4).map((attachment) =>
                              isImageAttachment(attachment) ? (
                                <button
                                  key={attachment.id}
                                  type="button"
                                  onClick={() => onPreviewAttachment(attachment)}
                                  className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                                >
                                  <img src={attachment.file_url} alt={attachment.file_name} className="h-full w-full object-cover" />
                                </button>
                              ) : (
                                <button
                                  key={attachment.id}
                                  type="button"
                                  onClick={() => window.open(attachment.file_url, "_blank", "noopener,noreferrer")}
                                  className="inline-flex min-h-[64px] min-w-[64px] max-w-[180px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600"
                                >
                                  <Paperclip size={14} />
                                  <span className="line-clamp-2">{attachment.file_name}</span>
                                </button>
                              ),
                            )}
                            {note.note_attachments.length > 4 ? (
                              <span className="inline-flex h-16 min-w-[64px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-500">
                                +{note.note_attachments.length - 4}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">{tt("noAttachments")}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
