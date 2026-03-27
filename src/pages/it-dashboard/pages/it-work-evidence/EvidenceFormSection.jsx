import React from "react";
import {
  Camera,
  Clock3,
  Pencil,
  Play,
  Square,
  TimerReset,
  Trash2,
  Upload,
} from "lucide-react";
import { MAX_FILES, STATUS_OPTIONS, TYPE_OPTIONS } from "./shared";

export default function EvidenceFormSection({
  theme,
  uiTheme,
  cardClass,
  subCardClass,
  inputClass,
  softTextClass,
  currentUser,
  formData,
  setFormData,
  selectedFiles,
  existingImages,
  fileInputRef,
  onFileSelect,
  onRemoveFile,
  onRemoveExistingImage,
  onReset,
  onSave,
  saving,
  schemaMissing,
  timerRunning,
  durationLabel,
  durationHours,
  durationMinutes,
  onStartTimer,
  onStopTimer,
  onDurationHoursChange,
  onDurationMinutesChange,
  isEditing,
  onCancelEdit,
}) {
  const ghostButtonClass = theme === "dark"
    ? "border-slate-600 bg-[#162136] text-slate-200 hover:bg-[#1e2b44]"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <aside className={`${cardClass} p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-lg font-black ${uiTheme.textPrimary}`}>
            {isEditing ? "แก้ไขบันทึกงาน" : "เพิ่มบันทึกงาน"}
          </h3>
          <p className={`mt-1 text-sm ${softTextClass}`}>
            ชื่อเรื่อง รายละเอียด ประเภทงาน สถานที่ เวลา และรูปหลักฐาน
          </p>
          <p className={`mt-1 text-xs ${softTextClass}`}>
            เลือกวันเวลาย้อนหลังได้ และกำหนดชั่วโมงการทำงานเองได้
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                theme === "dark"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                  : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              ยกเลิกแก้ไข
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${ghostButtonClass}`}
          >
            ล้างฟอร์ม
          </button>
        </div>
      </div>

      <div className={`${subCardClass} mt-4 p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-sm font-bold ${uiTheme.textPrimary}`}>ระบบจับเวลา</p>
            <p className={`mt-1 text-xs ${softTextClass}`}>
              เริ่มและหยุดเวลาแบบ real-time หรือกรอกชั่วโมงและนาทีเองสำหรับงานย้อนหลัง
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onStartTimer}
              disabled={timerRunning}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                timerRunning
                  ? "cursor-not-allowed bg-slate-300 text-slate-600"
                  : theme === "dark"
                    ? "bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <Play size={16} />
              Start
            </button>
            <button
              type="button"
              onClick={onStopTimer}
              disabled={!timerRunning}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                !timerRunning
                  ? "cursor-not-allowed bg-slate-300 text-slate-600"
                  : theme === "dark"
                    ? "bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <Square size={16} />
              Stop
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className={`${theme === "dark" ? "bg-[#0f172a]" : "bg-white"} rounded-2xl p-3`}>
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>เวลาเริ่ม</p>
            <p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>{formData.start_time || "-"}</p>
          </div>
          <div className={`${theme === "dark" ? "bg-[#0f172a]" : "bg-white"} rounded-2xl p-3`}>
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>เวลาสิ้นสุด</p>
            <p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>
              {formData.end_time || (timerRunning ? "กำลังจับเวลา..." : "-")}
            </p>
          </div>
          <div className={`${theme === "dark" ? "bg-[#0f172a]" : "bg-white"} rounded-2xl p-3`}>
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ระยะเวลา</p>
            <p className={`mt-2 inline-flex items-center gap-2 text-sm font-semibold ${uiTheme.textPrimary}`}>
              <Clock3 size={15} />
              {durationLabel}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={`${theme === "dark" ? "bg-[#0f172a]" : "bg-white"} rounded-2xl p-3`}>
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ชั่วโมงทำงาน</p>
            <input
              type="number"
              min="0"
              step="1"
              value={durationHours}
              onChange={(event) => onDurationHoursChange(event.target.value)}
              className="mt-2 w-full bg-transparent text-sm font-semibold outline-none"
            />
          </label>
          <label className={`${theme === "dark" ? "bg-[#0f172a]" : "bg-white"} rounded-2xl p-3`}>
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>นาทีทำงาน</p>
            <input
              type="number"
              min="0"
              max="59"
              step="1"
              value={durationMinutes}
              onChange={(event) => onDurationMinutesChange(event.target.value)}
              className="mt-2 w-full bg-transparent text-sm font-semibold outline-none"
            />
          </label>
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={onSave}>
        <input
          value={formData.title}
          onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
          className={inputClass}
          placeholder="ชื่อเรื่องงาน"
          maxLength={180}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <select
            value={formData.job_type}
            onChange={(event) => setFormData((prev) => ({ ...prev, job_type: event.target.value }))}
            className={inputClass}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={formData.work_status}
            onChange={(event) => setFormData((prev) => ({ ...prev, work_status: event.target.value }))}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="datetime-local"
            value={formData.start_time}
            onChange={(event) => setFormData((prev) => ({ ...prev, start_time: event.target.value }))}
            className={inputClass}
          />
          <input
            type="datetime-local"
            value={formData.end_time}
            onChange={(event) => setFormData((prev) => ({ ...prev, end_time: event.target.value }))}
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            value={formData.location}
            onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
            className={inputClass}
            placeholder="สถานที่"
            maxLength={120}
          />
          <input
            value={formData.reference_code}
            onChange={(event) => setFormData((prev) => ({ ...prev, reference_code: event.target.value }))}
            className={inputClass}
            placeholder="เลขอ้างอิง / Ticket / Asset"
            maxLength={80}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            value={formData.requester_name}
            onChange={(event) => setFormData((prev) => ({ ...prev, requester_name: event.target.value }))}
            className={inputClass}
            placeholder="ผู้แจ้ง / ผู้ประสานงาน"
            maxLength={120}
          />
          <input
            value={formData.department}
            onChange={(event) => setFormData((prev) => ({ ...prev, department: event.target.value }))}
            className={inputClass}
            placeholder="แผนก"
            maxLength={100}
          />
        </div>

        <input
          value={formData.device_details}
          onChange={(event) => setFormData((prev) => ({ ...prev, device_details: event.target.value }))}
          className={inputClass}
          placeholder="อุปกรณ์ / รายการที่ทำ"
          maxLength={180}
        />

        <textarea
          rows={4}
          value={formData.description}
          onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
          className={inputClass}
          placeholder="รายละเอียดงาน"
        />

        <textarea
          rows={3}
          value={formData.result_summary}
          onChange={(event) => setFormData((prev) => ({ ...prev, result_summary: event.target.value }))}
          className={inputClass}
          placeholder="ผลลัพธ์ / หมายเหตุเพิ่มเติม"
        />

        <div className={`${subCardClass} p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-sm font-bold ${uiTheme.textPrimary}`}>รูปหลักฐานงาน</p>
              <p className={`mt-1 text-xs ${softTextClass}`}>
                สูงสุด {MAX_FILES} รูป • {currentUser?.name || "-"}
              </p>
              <p className={`mt-1 text-xs ${softTextClass}`}>
                Ctrl+V วางรูปได้
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                theme === "dark"
                  ? "bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                  : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
              }`}
            >
              <Upload size={16} />
              แนบรูป
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileSelect} />

          {existingImages?.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {existingImages.map((image, index) => (
                <div key={`${image.url}_${index}`} className={`overflow-hidden rounded-2xl border ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}>
                  <img src={image.url} alt={image.name || `existing-evidence-${index + 1}`} className="h-28 w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <p className={`min-w-0 truncate text-xs font-semibold ${uiTheme.textSecondary}`}>
                      {image.name || `หลักฐานเดิม ${index + 1}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemoveExistingImage(image.url)}
                      className={theme === "dark" ? "rounded-lg p-1 text-rose-300 hover:bg-rose-500/10" : "rounded-lg p-1 text-rose-600 hover:bg-rose-50"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedFiles.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {selectedFiles.map((entry) => (
                <div key={entry.id} className={`overflow-hidden rounded-2xl border ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}>
                  <img src={entry.previewUrl} alt={entry.file?.name || "evidence-preview"} className="h-28 w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <p className={`min-w-0 truncate text-xs font-semibold ${uiTheme.textSecondary}`}>{entry.file?.name}</p>
                    <button
                      type="button"
                      onClick={() => onRemoveFile(entry.id)}
                      className={theme === "dark" ? "rounded-lg p-1 text-rose-300 hover:bg-rose-500/10" : "rounded-lg p-1 text-rose-600 hover:bg-rose-50"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !existingImages?.length ? (
            <div className={`mt-4 rounded-2xl border border-dashed px-4 py-6 text-center ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-300 text-slate-500"}`}>
              <Camera size={20} className="mx-auto mb-2" />
              <p className="text-sm font-semibold">ยังไม่ได้เลือกรูปประกอบ</p>
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={saving || !currentUser?.id || schemaMissing}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white ${
            saving || !currentUser?.id || schemaMissing ? "cursor-not-allowed bg-slate-400" : "bg-[#2b59b0] hover:bg-[#244a95]"
          }`}
        >
          {isEditing ? <Pencil size={16} /> : <TimerReset size={16} />}
          {saving ? "กำลังบันทึก..." : isEditing ? "บันทึกการแก้ไข" : "บันทึกงาน IT"}
        </button>
      </form>
    </aside>
  );
}
