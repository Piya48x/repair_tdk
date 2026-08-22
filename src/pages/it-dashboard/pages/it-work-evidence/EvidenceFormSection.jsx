import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Camera,
  CheckCircle2,
  Clock3,
  Copy,
  Cctv,
  FileText,
  Hash,
  ImagePlus,
  MapPin,
  Pencil,
  Play,
  Square,
  ShieldCheck,
  TimerReset,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import {
  CAMERA_APPROVAL_OPTIONS,
  CAMERA_VIEW_JOB_TYPE,
  MAX_FILES,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from "./shared";

function FieldLabel({ children, softTextClass, required = false }) {
  return (
    <p className={`mb-1 text-[10px] font-bold uppercase tracking-[0.12em] sm:mb-2 sm:text-xs sm:tracking-[0.16em] ${softTextClass}`}>
      {children}
      {required ? <span className="ml-1 text-rose-500">*</span> : null}
    </p>
  );
}

function StepCard({
  step,
  title,
  helper,
  icon: Icon,
  theme,
  uiTheme,
  subCardClass,
  children,
}) {
  return (
    <section className={`${subCardClass} overflow-hidden`}>
      <div className={`border-b px-3 py-3 sm:px-4 sm:py-4 ${theme === "dark" ? "border-slate-700/80" : "border-slate-200"}`}>
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#2b59b0] text-xs font-black text-white shadow-[0_14px_30px_-18px_rgba(43,89,176,0.9)] sm:h-9 sm:w-9 sm:rounded-2xl sm:text-sm">
            {step}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {Icon ? (
                <span className={`hidden rounded-xl p-2 sm:inline-flex ${theme === "dark" ? "bg-[#0f172a] text-cyan-200" : "bg-white text-[#2b59b0]"}`}>
                  <Icon size={16} />
                </span>
              ) : null}
              <h4 className={`text-sm font-black sm:text-base ${uiTheme.textPrimary}`}>{title}</h4>
            </div>
            {helper ? <p className={`mt-1 hidden text-xs leading-5 sm:block ${uiTheme.textSecondary}`}>{helper}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

function buildEmployeeLabel(member) {
  return [
    member?.employee_code,
    member?.full_name || member?.email,
    member?.department,
  ]
    .filter(Boolean)
    .join(" • ");
}

function normalizeLookupText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function buildAvatarFallback(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=2B59B0&color=fff`;
}

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
  employeeOptions = [],
  employeeLoading = false,
  onEmployeeSelect,
  isModal = false,
}) {
  const ghostButtonClass = theme === "dark"
    ? "border-slate-600 bg-[#162136] text-slate-200 hover:bg-[#1e2b44]"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  const timerTileClass = `${theme === "dark" ? "bg-[#0f172a]" : "bg-white"} rounded-xl p-2.5 sm:rounded-2xl sm:p-3`;
  const referencePanelClass = theme === "dark"
    ? "rounded-xl border-slate-700 bg-[#0f172a] sm:rounded-2xl"
    : "rounded-xl border-slate-200 bg-white sm:rounded-2xl";
  const imageCardClass = theme === "dark"
    ? "rounded-xl border-slate-700 bg-[#0f172a] sm:rounded-2xl"
    : "rounded-xl border-slate-200 bg-white sm:rounded-2xl";
  const selectedEmployee = useMemo(
    () => employeeOptions.find((member) => member.id === formData.requester_profile_id) || null,
    [employeeOptions, formData.requester_profile_id],
  );
  const [requesterLookupOpen, setRequesterLookupOpen] = useState(false);
  const requesterLookupQuery = normalizeLookupText(formData.requester_name);
  const requesterSuggestions = useMemo(() => {
    if (!requesterLookupQuery) return [];

    return employeeOptions
      .filter((member) => {
        const searchable = [
          member.full_name,
          member.employee_code,
          member.email,
          member.department,
        ]
          .map(normalizeLookupText)
          .join(" ");

        return searchable.includes(requesterLookupQuery);
      })
      .slice(0, 6);
  }, [employeeOptions, requesterLookupQuery]);
  const evidenceCount = (existingImages?.length || 0) + selectedFiles.length;
  const isCameraViewRequest = formData.job_type === CAMERA_VIEW_JOB_TYPE;

  const handleRequesterSuggestionSelect = (member) => {
    onEmployeeSelect?.(member.id);
    setRequesterLookupOpen(false);
  };

  const handleCopyReference = async () => {
    if (!formData.reference_code) return;

    try {
      await navigator.clipboard.writeText(formData.reference_code);
      toast.success("คัดลอกเลขอ้างอิงแล้ว");
    } catch {
      toast.error("ไม่สามารถคัดลอกเลขอ้างอิงได้");
    }
  };

  return (
    <aside className={isModal ? "p-0" : `${cardClass} p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-base font-black sm:text-lg ${uiTheme.textPrimary}`}>
            {isEditing
              ? isCameraViewRequest ? "แก้ไขประวัติการขอดูกล้อง" : "แก้ไขบันทึกงาน"
              : isCameraViewRequest ? "บันทึกประวัติการขอดูกล้อง" : "เพิ่มบันทึกงาน"}
          </h3>
          <p className={`mt-1 hidden text-sm leading-6 sm:block ${softTextClass}`}>
            {isCameraViewRequest
              ? "เก็บชื่อผู้ขอ เหตุผล จุดกล้อง ช่วงเวลาภาพ และผู้อนุมัติไว้ตรวจสอบย้อนหลัง"
              : "กรอกตามลำดับเลข 1-5 เพื่อลดการสลับช่องผิด รายชื่อพนักงานเลือกจาก dropdown แล้วระบบจะเติมชื่อและแผนกให้"}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2">
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
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold sm:px-3 sm:py-2 ${ghostButtonClass}`}
          >
            ล้างฟอร์ม
          </button>
        </div>
      </div>

      <form className="mt-3 space-y-3 sm:mt-5 sm:space-y-4" onSubmit={onSave}>
        <StepCard
          step="1"
          title={isCameraViewRequest ? "เวลารับคำขอและเวลาดำเนินการ" : "กำหนดเวลาและชั่วโมงงาน"}
          helper={isCameraViewRequest
            ? "บันทึกเวลาที่ IT รับคำขอและเวลาที่ดำเนินการเสร็จ โดยใช้ Start/Stop หรือกรอกย้อนหลังได้"
            : "ใช้ Start/Stop เมื่อทำงานสด หรือกรอกชั่วโมงย้อนหลังเองได้"}
          icon={Clock3}
          theme={theme}
          uiTheme={uiTheme}
          subCardClass={subCardClass}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div>
              <p className={`text-sm font-bold ${uiTheme.textPrimary}`}>ระบบจับเวลา</p>
              <p className={`mt-1 hidden text-xs sm:block ${softTextClass}`}>ถ้ากรอกย้อนหลัง ให้เลือกเวลาเริ่มและใส่ชั่วโมง/นาทีด้านล่าง</p>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={onStartTimer}
                disabled={timerRunning}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
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
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
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

          <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
            <div className={timerTileClass}>
              <FieldLabel softTextClass={softTextClass}>เวลาเริ่ม</FieldLabel>
              <p className={`break-words text-xs font-semibold sm:text-sm ${uiTheme.textPrimary}`}>{formData.start_time || "-"}</p>
            </div>
            <div className={timerTileClass}>
              <FieldLabel softTextClass={softTextClass}>เวลาสิ้นสุด</FieldLabel>
              <p className={`break-words text-xs font-semibold sm:text-sm ${uiTheme.textPrimary}`}>
                {formData.end_time || (timerRunning ? "กำลังจับเวลา..." : "-")}
              </p>
            </div>
            <div className={timerTileClass}>
              <FieldLabel softTextClass={softTextClass}>ระยะเวลา</FieldLabel>
              <p className={`inline-flex items-center gap-2 text-sm font-semibold ${uiTheme.textPrimary}`}>
                <Clock3 size={15} />
                {durationLabel}
              </p>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:gap-3">
            <label className={timerTileClass}>
              <FieldLabel softTextClass={softTextClass}>ชั่วโมงทำงาน</FieldLabel>
              <input
                type="number"
                min="0"
                step="1"
                value={durationHours}
                onChange={(event) => onDurationHoursChange(event.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </label>
            <label className={timerTileClass}>
              <FieldLabel softTextClass={softTextClass}>นาทีทำงาน</FieldLabel>
              <input
                type="number"
                min="0"
                max="59"
                step="1"
                value={durationMinutes}
                onChange={(event) => onDurationMinutesChange(event.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </label>
          </div>
        </StepCard>

        <StepCard
          step="2"
          title={isCameraViewRequest ? "ข้อมูลรายการขอดูกล้อง" : "ระบุหัวข้องานและประเภท"}
          helper={isCameraViewRequest
            ? "เลขอ้างอิง CTV จะช่วยค้นประวัติคำขอดูกล้องได้รวดเร็ว"
            : "เลือกประเภทให้ถูก เพราะเลขอ้างอิงจะสร้างตามประเภทงานและเวลาเริ่ม"}
          icon={isCameraViewRequest ? Cctv : FileText}
          theme={theme}
          uiTheme={uiTheme}
          subCardClass={subCardClass}
        >
          <label className="block">
            <FieldLabel softTextClass={softTextClass} required>ชื่อเรื่องงาน</FieldLabel>
            <input
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              className={inputClass}
              placeholder={isCameraViewRequest
                ? "เช่น ขอดูภาพกล้องเหตุการณ์สินค้าเสียหาย"
                : "เช่น ติดตั้งเครื่องใหม่ / เปลี่ยนอุปกรณ์ / แก้ปัญหาหน้างาน"}
              maxLength={180}
            />
          </label>

          <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
            <label className="block">
              <FieldLabel softTextClass={softTextClass}>ประเภทงาน</FieldLabel>
              <select
                value={formData.job_type}
                onChange={(event) => setFormData((prev) => ({ ...prev, job_type: event.target.value }))}
                className={inputClass}
              >
                {TYPE_OPTIONS.filter((option) => option.value !== CAMERA_VIEW_JOB_TYPE).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <FieldLabel softTextClass={softTextClass}>สถานะงาน</FieldLabel>
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
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
            <label className="block">
              <FieldLabel softTextClass={softTextClass}>วันเวลาเริ่ม</FieldLabel>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(event) => setFormData((prev) => ({ ...prev, start_time: event.target.value }))}
                className={inputClass}
              />
            </label>

            <label className="block">
              <FieldLabel softTextClass={softTextClass}>วันเวลาสิ้นสุด</FieldLabel>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(event) => setFormData((prev) => ({ ...prev, end_time: event.target.value }))}
                className={inputClass}
              />
            </label>
          </div>

          <div className={`mt-3 grid gap-3 sm:mt-4 sm:gap-4 ${isCameraViewRequest ? "" : "sm:grid-cols-2"}`}>
            {!isCameraViewRequest ? (
              <label className="block">
                <FieldLabel softTextClass={softTextClass}>สถานที่</FieldLabel>
                <div className="relative">
                  <MapPin size={16} className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${softTextClass}`} />
                  <input
                    value={formData.location}
                    onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                    className={`${inputClass} pl-10`}
                    placeholder="เช่น อาคาร A, ไลน์ผลิต, ห้องผู้บริหาร"
                    maxLength={120}
                  />
                </div>
              </label>
            ) : null}

            <div className={`overflow-hidden border ${referencePanelClass}`}>
              <div className={`flex items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4 sm:py-3 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
                <div className="min-w-0">
                  <p className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>
                    <Hash size={13} />
                    เลขอ้างอิงอัตโนมัติ
                  </p>
                  <p className={`mt-1 hidden text-xs sm:block ${softTextClass}`}>สร้างจากประเภทงานและเวลาเริ่ม</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyReference}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold sm:gap-2 sm:px-3 sm:py-2 ${ghostButtonClass}`}
                >
                  <Copy size={14} />
                  คัดลอก
                </button>
              </div>

              <div className="px-3 py-2.5 sm:px-4 sm:py-3">
                <input
                  value={formData.reference_code}
                  readOnly
                  className={`${inputClass} cursor-default border-0 px-0 py-0 font-semibold tracking-[0.08em] shadow-none focus:border-transparent focus:shadow-none`}
                  placeholder="ระบบจะสร้างเลขอ้างอิงให้อัตโนมัติ"
                />
              </div>
            </div>
          </div>
        </StepCard>

        <StepCard
          step="3"
          title={isCameraViewRequest ? "ผู้ขอดูภาพกล้อง" : "เลือกพนักงานและแผนก"}
          helper={isCameraViewRequest
            ? "ค้นหาจากรายชื่อพนักงาน ระบบจะเติมรหัสและแผนกให้อัตโนมัติ"
            : "เลือกจาก dropdown เพื่อลดชื่อซ้ำ/สะกดผิด ถ้าไม่มีรายชื่อยังพิมพ์เองได้"}
          icon={UserRound}
          theme={theme}
          uiTheme={uiTheme}
          subCardClass={subCardClass}
        >
          <div className="space-y-3 sm:space-y-4">
            <label className="block">
              <FieldLabel softTextClass={softTextClass} required={isCameraViewRequest}>
                {isCameraViewRequest ? "ชื่อผู้ขอดูภาพ" : "ผู้แจ้ง / ผู้ประสานงาน"}
              </FieldLabel>
              <div>
                <input
                  value={formData.requester_name}
                  onFocus={() => setRequesterLookupOpen(true)}
                  onBlur={() => window.setTimeout(() => setRequesterLookupOpen(false), 120)}
                  onChange={(event) => {
                    const nextRequesterName = event.target.value;
                    setRequesterLookupOpen(true);
                    setFormData((prev) => ({
                      ...prev,
                      requester_name: nextRequesterName,
                      requester_profile_id: "",
                      requester_employee_code: prev.requester_profile_id ? "" : prev.requester_employee_code,
                      department: prev.requester_profile_id ? "" : prev.department,
                    }));
                  }}
                  className={`${inputClass} pr-10`}
                  placeholder="พิมพ์ชื่อ / รหัสพนักงาน / อีเมล"
                  maxLength={120}
                  autoComplete="off"
                />

                {requesterLookupOpen && requesterLookupQuery ? (
                  <div className={`mt-2 max-h-56 overflow-y-auto rounded-xl border sm:max-h-72 sm:rounded-2xl ${
                    theme === "dark"
                      ? "border-slate-700 bg-[#0f172a]"
                      : "border-slate-200 bg-white"
                  }`}>
                    {requesterSuggestions.length > 0 ? (
                      requesterSuggestions.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleRequesterSuggestionSelect(member)}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition sm:px-4 sm:py-3 ${
                            theme === "dark" ? "hover:bg-[#162136]" : "hover:bg-slate-50"
                          }`}
                        >
                          <img
                            src={member.avatar_url || buildAvatarFallback(member.full_name || member.employee_code || member.email)}
                            alt={member.full_name || "profile"}
                            className="h-8 w-8 shrink-0 rounded-full object-cover sm:h-9 sm:w-9"
                            onError={(event) => {
                              event.currentTarget.src = buildAvatarFallback(member.full_name || member.employee_code || member.email);
                            }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-bold ${uiTheme.textPrimary}`}>
                              {member.full_name || member.employee_code || member.email || "-"}
                            </span>
                            <span className={`mt-0.5 block truncate text-xs ${softTextClass}`}>
                              {member.employee_code || "ไม่มีรหัส"} • {member.department || "ไม่ระบุแผนก"}
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className={`px-4 py-3 text-sm ${softTextClass}`}>
                        ไม่พบรายชื่อในระบบ สามารถพิมพ์เองได้
                      </div>
                    )}
                  </div>
                ) : null}

                {selectedEmployee ? (
                  <div className={`mt-3 rounded-xl border px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3 ${theme === "dark" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{selectedEmployee.full_name || selectedEmployee.employee_code || selectedEmployee.email}</p>
                        <p className="mt-1 text-xs opacity-85">
                          {selectedEmployee.employee_code || "ไม่มีรหัส"} • {selectedEmployee.department || "ไม่ระบุแผนก"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </label>

            <div className={`grid gap-3 sm:gap-4 ${isCameraViewRequest ? "sm:grid-cols-2" : ""}`}>
              {isCameraViewRequest ? (
                <label className="block">
                  <FieldLabel softTextClass={softTextClass}>รหัสพนักงาน</FieldLabel>
                  <input
                    value={formData.requester_employee_code}
                    onChange={(event) => setFormData((prev) => ({ ...prev, requester_employee_code: event.target.value }))}
                    className={inputClass}
                    placeholder="เช่น 012345"
                    maxLength={60}
                  />
                </label>
              ) : null}

              <label className="block">
                <FieldLabel softTextClass={softTextClass}>แผนก</FieldLabel>
                <input
                  value={formData.department}
                  onChange={(event) => setFormData((prev) => ({ ...prev, department: event.target.value }))}
                  className={inputClass}
                  placeholder="เช่น IT, QA, Production"
                  maxLength={100}
                />
              </label>
            </div>
          </div>
        </StepCard>

        <StepCard
          step="4"
          title={isCameraViewRequest ? "ช่วงภาพ เหตุผล และการอนุมัติ" : "รายละเอียดงานและผลลัพธ์"}
          helper={isCameraViewRequest
            ? "ระบุช่วงเวลาของภาพที่ต้องการดูให้ชัด พร้อมผู้อนุมัติและผลการดำเนินการ"
            : "แยกรายละเอียดงานกับผลลัพธ์ชัดเจน เพื่อย้อนดูประวัติและทำรายงานได้ง่าย"}
          icon={isCameraViewRequest ? ShieldCheck : Pencil}
          theme={theme}
          uiTheme={uiTheme}
          subCardClass={subCardClass}
        >
          {isCameraViewRequest ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <label className="block">
                  <FieldLabel softTextClass={softTextClass} required>พื้นที่ / จุดเกิดเหตุ</FieldLabel>
                  <div className="relative">
                    <MapPin size={16} className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${softTextClass}`} />
                    <input
                      value={formData.location}
                      onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                      className={`${inputClass} pl-10`}
                      placeholder="เช่น Warehouse A ประตูทางออก"
                      maxLength={120}
                    />
                  </div>
                </label>

                <label className="block">
                  <FieldLabel softTextClass={softTextClass} required>กล้อง / จุดกล้องที่ขอดู</FieldLabel>
                  <input
                    value={formData.device_details}
                    onChange={(event) => setFormData((prev) => ({ ...prev, device_details: event.target.value }))}
                    className={inputClass}
                    placeholder="เช่น CAM-WH-01, CAM-WH-02"
                    maxLength={180}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <label className="block">
                  <FieldLabel softTextClass={softTextClass} required>เริ่มช่วงภาพที่ขอดู</FieldLabel>
                  <input
                    type="datetime-local"
                    value={formData.footage_start_at}
                    onChange={(event) => setFormData((prev) => ({ ...prev, footage_start_at: event.target.value }))}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <FieldLabel softTextClass={softTextClass} required>สิ้นสุดช่วงภาพที่ขอดู</FieldLabel>
                  <input
                    type="datetime-local"
                    value={formData.footage_end_at}
                    onChange={(event) => setFormData((prev) => ({ ...prev, footage_end_at: event.target.value }))}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="block">
                <FieldLabel softTextClass={softTextClass} required>เหตุผลที่ขอดูภาพ</FieldLabel>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  className={inputClass}
                  placeholder="อธิบายเหตุการณ์และวัตถุประสงค์ที่ต้องการตรวจสอบภาพ"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <label className="block">
                  <FieldLabel softTextClass={softTextClass}>สถานะการอนุมัติ</FieldLabel>
                  <select
                    value={formData.approval_status}
                    onChange={(event) => setFormData((prev) => ({ ...prev, approval_status: event.target.value }))}
                    className={inputClass}
                  >
                    {CAMERA_APPROVAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <FieldLabel
                    softTextClass={softTextClass}
                    required={formData.approval_status === "approved" || formData.approval_status === "rejected"}
                  >
                    ผู้อนุมัติ / ผู้พิจารณา
                  </FieldLabel>
                  <input
                    value={formData.approved_by_name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, approved_by_name: event.target.value }))}
                    className={inputClass}
                    placeholder="ชื่อผู้อนุมัติหรือผู้ไม่อนุมัติ"
                    maxLength={120}
                  />
                </label>
              </div>

              <label className="block">
                <FieldLabel softTextClass={softTextClass}>ผลการให้ดูภาพ / หมายเหตุ</FieldLabel>
                <textarea
                  rows={2}
                  value={formData.result_summary}
                  onChange={(event) => setFormData((prev) => ({ ...prev, result_summary: event.target.value }))}
                  className={inputClass}
                  placeholder="เช่น เปิดให้ดูภาพแล้ว ไม่พบเหตุการณ์ หรือไม่อนุมัติพร้อมเหตุผล"
                />
              </label>
            </div>
          ) : (
            <>
              <label className="block">
                <FieldLabel softTextClass={softTextClass}>อุปกรณ์ / รายการที่ทำ</FieldLabel>
                <input
                  value={formData.device_details}
                  onChange={(event) => setFormData((prev) => ({ ...prev, device_details: event.target.value }))}
                  className={inputClass}
                  placeholder="เช่น PC Dell, Printer, CCTV, Network Point"
                  maxLength={180}
                />
              </label>

              <label className="mt-3 block sm:mt-4">
                <FieldLabel softTextClass={softTextClass} required>รายละเอียดงาน</FieldLabel>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  className={inputClass}
                  placeholder="สรุปสิ่งที่ทำ ปัญหาที่พบ และขั้นตอนที่ดำเนินการ"
                />
              </label>

              <label className="mt-3 block sm:mt-4">
                <FieldLabel softTextClass={softTextClass}>ผลลัพธ์ / หมายเหตุเพิ่มเติม</FieldLabel>
                <textarea
                  rows={2}
                  value={formData.result_summary}
                  onChange={(event) => setFormData((prev) => ({ ...prev, result_summary: event.target.value }))}
                  className={inputClass}
                  placeholder="เช่น ใช้งานได้ปกติ, รออะไหล่, นัดติดตามต่อ"
                />
              </label>
            </>
          )}
        </StepCard>

        <StepCard
          step="5"
          title="แนบภาพหลักฐาน"
          helper={`แนบได้สูงสุด ${MAX_FILES} รูป รองรับการกด Ctrl+V เพื่อวางภาพจาก clipboard`}
          icon={ImagePlus}
          theme={theme}
          uiTheme={uiTheme}
          subCardClass={subCardClass}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div>
              <p className={`text-sm font-bold ${uiTheme.textPrimary}`}>
                {isCameraViewRequest ? "เอกสารอนุมัติ / หลักฐานประกอบ" : "รูปหลักฐานงาน"}
              </p>
              <p className={`mt-1 text-xs ${softTextClass}`}>
                เลือกแล้ว {evidenceCount}/{MAX_FILES} รูป • ผู้บันทึก {currentUser?.name || "-"}
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
            <div className="mt-3 sm:mt-4">
              <p className={`mb-2 text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>รูปเดิม</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {existingImages.map((image, index) => (
                  <div key={`${image.url}_${index}`} className={`overflow-hidden border ${imageCardClass}`}>
                    <img src={image.url} alt={image.name || `existing-evidence-${index + 1}`} className="h-20 w-full object-cover sm:h-28" />
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 sm:px-3 sm:py-2">
                      <p className={`min-w-0 truncate text-xs font-semibold ${uiTheme.textSecondary}`}>
                        {image.name || `หลักฐานเดิม ${index + 1}`}
                      </p>
                      <button
                        type="button"
                        onClick={() => onRemoveExistingImage(image.url)}
                        className={theme === "dark" ? "rounded-lg p-1 text-rose-300 hover:bg-rose-500/10" : "rounded-lg p-1 text-rose-600 hover:bg-rose-50"}
                        aria-label="ลบรูปเดิม"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedFiles.length > 0 ? (
            <div className="mt-3 sm:mt-4">
              <p className={`mb-2 text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>รูปใหม่</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {selectedFiles.map((entry, index) => (
                  <div key={entry.id} className={`overflow-hidden border ${imageCardClass}`}>
                    <div className="relative">
                      <img src={entry.previewUrl} alt={entry.file?.name || "evidence-preview"} className="h-20 w-full object-cover sm:h-28" />
                      <span className="absolute left-2 top-2 rounded-full bg-[#2b59b0] px-2 py-0.5 text-[11px] font-black text-white">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 sm:px-3 sm:py-2">
                      <p className={`min-w-0 truncate text-xs font-semibold ${uiTheme.textSecondary}`}>{entry.file?.name}</p>
                      <button
                        type="button"
                        onClick={() => onRemoveFile(entry.id)}
                        className={theme === "dark" ? "rounded-lg p-1 text-rose-300 hover:bg-rose-500/10" : "rounded-lg p-1 text-rose-600 hover:bg-rose-50"}
                        aria-label="ลบรูปใหม่"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !existingImages?.length ? (
            <div className={`mt-3 rounded-xl border border-dashed px-3 py-4 text-center sm:mt-4 sm:rounded-2xl sm:px-4 sm:py-6 ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-300 text-slate-500"}`}>
              <Camera size={20} className="mx-auto mb-2" />
              <p className="text-sm font-semibold">ยังไม่ได้เลือกรูปประกอบ</p>
              <p className="mt-1 text-xs">กด “แนบรูป” หรือวางภาพด้วย Ctrl+V</p>
            </div>
          ) : null}
        </StepCard>

        <button
          type="submit"
          disabled={saving || !currentUser?.id || schemaMissing}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white sm:rounded-2xl sm:py-3 ${isModal ? "sticky bottom-0 z-10 shadow-lg" : ""} ${
            saving || !currentUser?.id || schemaMissing ? "cursor-not-allowed bg-slate-400" : "bg-[#2b59b0] hover:bg-[#244a95]"
          }`}
        >
          {isEditing ? <Pencil size={16} /> : isCameraViewRequest ? <Cctv size={16} /> : <TimerReset size={16} />}
          {saving
            ? "กำลังบันทึก..."
            : isEditing
              ? "บันทึกการแก้ไข"
              : isCameraViewRequest ? "บันทึกประวัติการขอดูกล้อง" : "บันทึกงาน IT"}
        </button>
      </form>
    </aside>
  );
}
