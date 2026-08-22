import React from "react";
import {
  ArrowUp,
  CalendarDays,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";

export default function EvidenceRecordsSection({
  theme,
  uiTheme,
  cardClass,
  subCardClass,
  inputClass,
  softTextClass,
  listRef,
  loading,
  records,
  totalRecords = records.length,
  filters,
  setFilters,
  typeOptions,
  statusOptions,
  userOptions,
  departmentOptions,
  onEdit,
  editingId,
  onDelete,
  deletingId,
  onScrollToTop,
  onStartFreshView,
  onCreateRecord,
}) {
  const chipClass = theme === "dark"
    ? "border-slate-600 bg-[#162136] text-slate-300"
    : "border-slate-200 bg-slate-50 text-slate-600";
  const ghostButtonClass = theme === "dark"
    ? "border-slate-600 bg-[#162136] text-slate-200 hover:bg-[#1e2b44]"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <section ref={listRef} className="space-y-4">
      <div className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className={`text-lg font-black ${uiTheme.textPrimary}`}>รายการงาน</h3>
            <p className={`mt-1 text-sm ${softTextClass}`}>
              กรองตามประเภทงาน ผู้บันทึก แผนก และสถานะ พร้อมย้อนขึ้นบนสุดได้ทันทีเมื่อดูรายการลึก
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${chipClass}`}>
              พบ {records.length} จาก {totalRecords} รายการ
            </div>
            <button
              type="button"
              onClick={onCreateRecord}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#244a95]"
            >
              <Plus size={15} />
              เพิ่มบันทึกงาน
            </button>
            <button
              type="button"
              onClick={onStartFreshView}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${ghostButtonClass}`}
            >
              <RotateCcw size={15} />
              เริ่มดูใหม่
            </button>
            <button
              type="button"
              onClick={onScrollToTop}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${ghostButtonClass}`}
            >
              <ArrowUp size={15} />
              บนสุด
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_180px_180px_180px_180px]">
          <label className={`group flex items-center gap-2 rounded-2xl border px-4 py-3 ${uiTheme.searchInputMobile}`}>
            <Search size={16} className={uiTheme.searchIcon} />
            <input
              value={filters.query}
              onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="ค้นหาจากชื่อเรื่อง รายละเอียด หรือเลขอ้างอิง"
            />
          </label>
          <select value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))} className={inputClass}>
            <option value="ALL">ทุกประเภท</option>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className={inputClass}>
            <option value="ALL">ทุกสถานะ</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select value={filters.user} onChange={(event) => setFilters((prev) => ({ ...prev, user: event.target.value }))} className={inputClass}>
            <option value="ALL">ทุกผู้ใช้</option>
            {userOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select value={filters.department} onChange={(event) => setFilters((prev) => ({ ...prev, department: event.target.value }))} className={inputClass}>
            <option value="ALL">ทุกแผนก</option>
            {departmentOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={`${cardClass} p-10 text-center`}>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#2b59b0]/20 border-t-[#2b59b0]" />
        </div>
      ) : records.length === 0 ? (
        <div className={`${cardClass} border-dashed p-10 text-center`}>
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl ${
            theme === "dark" ? "bg-[#162136] text-cyan-200" : "bg-cyan-50 text-cyan-700"
          }`}>
            <Plus size={24} />
          </div>
          <p className={`text-base font-black ${uiTheme.textPrimary}`}>
            {totalRecords === 0 ? "ยังไม่มีประวัติบันทึกงาน" : "ยังไม่มีรายการงานที่ตรงกับเงื่อนไข"}
          </p>
          <p className={`mx-auto mt-2 max-w-md text-sm leading-6 ${uiTheme.textSecondary}`}>
            {totalRecords === 0
              ? "กดปุ่มเพิ่มบันทึกงานเพื่อเริ่มเก็บประวัติงานติดตั้ง ปรับปรุง และแก้ไข"
              : "ลองล้างตัวกรองหรือค้นหาด้วยคำอื่น เพื่อดูรายการที่บันทึกไว้"}
          </p>
          <button
            type="button"
            onClick={totalRecords === 0 ? onCreateRecord : onStartFreshView}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#2b59b0] px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#244a95]"
          >
            {totalRecords === 0 ? <Plus size={16} /> : <RotateCcw size={16} />}
            {totalRecords === 0 ? "เพิ่มบันทึกงานแรก" : "ล้างตัวกรอง"}
          </button>
        </div>
      ) : (
        records.map((record) => (
          <article key={record.id} className={`${cardClass} overflow-hidden p-5 transition hover:-translate-y-0.5 sm:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${theme === "dark" ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-200" : "border-cyan-200 bg-cyan-50 text-cyan-700"}`}>
                    {record.typeLabel}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${record.statusTone}`}>
                    {record.statusLabel}
                  </span>
                  {editingId === record.id && (
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${theme === "dark" ? "border-amber-500/20 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                      กำลังแก้ไข
                    </span>
                  )}
                </div>

                <h4 className={`mt-3 text-xl font-black ${uiTheme.textPrimary}`}>{record.title}</h4>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${chipClass}`}>
                    Ref {record.referenceCode || "-"}
                  </span>
                  {record.requesterName ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${chipClass}`}>
                      <User size={13} />
                      {record.requesterName}
                    </span>
                  ) : null}
                  {record.requesterEmployeeCode ? (
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${chipClass}`}>
                      รหัส {record.requesterEmployeeCode}
                    </span>
                  ) : null}
                  {record.isCameraView ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                      record.approvalStatus === "approved"
                        ? theme === "dark" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : record.approvalStatus === "rejected"
                          ? theme === "dark" ? "border-rose-500/20 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"
                          : theme === "dark" ? "border-amber-500/20 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}>
                      <ShieldCheck size={13} />
                      {record.approvalLabel}
                    </span>
                  ) : null}
                </div>

                <div className={`mt-3 flex flex-wrap items-center gap-3 text-sm ${uiTheme.textSecondary}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={15} />
                    {record.startLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={15} />
                    {record.durationLabel}
                  </span>
                  {record.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={15} />
                      {record.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {record.isCameraView ? (
                  <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${chipClass}`}>
                    <ShieldCheck size={15} />
                    ประวัติ CCTV เดิม · อ่านอย่างเดียว
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit(record)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${theme === "dark" ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20" : "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"}`}
                    >
                      <Pencil size={15} />
                      {editingId === record.id ? "กำลังแก้ไข" : "แก้ไขรายการ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(record.raw)}
                      disabled={deletingId === record.id}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${theme === "dark" ? "border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"} ${deletingId === record.id ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                      <Trash2 size={15} />
                      {deletingId === record.id ? "กำลังลบ..." : "ลบรายการ"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className={`${subCardClass} p-4`}>
                <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ผู้บันทึก</p>
                <p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>{record.userName || "-"}</p>
              </div>
              <div className={`${subCardClass} p-4`}>
                <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>แผนก</p>
                <p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>{record.department || "-"}</p>
              </div>
              <div className={`${subCardClass} p-4`}>
                <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>เวลาเริ่ม - สิ้นสุด</p>
                <p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>{record.startShort} - {record.endShort}</p>
              </div>
              <div className={`${subCardClass} p-4`}>
                <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ภาพหลักฐาน</p>
                <p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>{record.imageCount} รูป</p>
              </div>
            </div>

            {record.isCameraView ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className={`${subCardClass} p-4`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ช่วงภาพที่ขอดู</p>
                  <p className={`mt-2 text-sm font-semibold leading-6 ${uiTheme.textPrimary}`}>
                    {record.footageStartLabel}<br />ถึง {record.footageEndLabel}
                  </p>
                </div>
                <div className={`${subCardClass} p-4`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>กล้อง / จุดกล้อง</p>
                  <p className={`mt-2 whitespace-pre-line text-sm leading-6 ${uiTheme.textSecondary}`}>{record.deviceDetails || "-"}</p>
                </div>
                <div className={`${subCardClass} p-4`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ผู้อนุมัติ / ผู้พิจารณา</p>
                  <p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>{record.approvedByName || "-"}</p>
                  <p className={`mt-1 text-xs ${uiTheme.textSecondary}`}>สถานะ: {record.approvalLabel}</p>
                </div>
                <div className={`${subCardClass} p-4 sm:col-span-2`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>เหตุผลที่ขอดูภาพ</p>
                  <p className={`mt-2 whitespace-pre-line text-sm leading-6 ${uiTheme.textSecondary}`}>{record.description || "-"}</p>
                </div>
                <div className={`${subCardClass} p-4`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ผลการให้ดูภาพ / หมายเหตุ</p>
                  <p className={`mt-2 whitespace-pre-line text-sm leading-6 ${uiTheme.textSecondary}`}>{record.resultSummary || "-"}</p>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className={`${subCardClass} p-4`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>รายละเอียดงาน</p>
                  <p className={`mt-2 line-clamp-5 whitespace-pre-line text-sm leading-6 ${uiTheme.textSecondary}`}>{record.description || "-"}</p>
                </div>
                <div className="space-y-4">
                  <div className={`${subCardClass} p-4`}>
                    <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>อุปกรณ์ / รายการที่ทำ</p>
                    <p className={`mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 ${uiTheme.textSecondary}`}>{record.deviceDetails || "-"}</p>
                  </div>
                  <div className={`${subCardClass} p-4`}>
                    <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>ผลลัพธ์ / หมายเหตุ</p>
                    <p className={`mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 ${uiTheme.textSecondary}`}>{record.resultSummary || "-"}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5">
              <p className={`text-xs font-bold uppercase tracking-[0.16em] ${softTextClass}`}>
                {record.isCameraView ? "เอกสารอนุมัติ / หลักฐานประกอบ" : "ภาพประกอบ"}
              </p>
              {record.images.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {record.images.slice(0, 4).map((image, index) => (
                    <button
                      key={`${record.id}_${index}`}
                      type="button"
                      onClick={() => window.open(image.url, "_blank", "noopener,noreferrer")}
                      className={`overflow-hidden rounded-2xl border text-left transition hover:-translate-y-[1px] ${theme === "dark" ? "border-slate-700 bg-[#162136]" : "border-slate-200 bg-slate-50"}`}
                    >
                      <div className="relative">
                        <img src={image.url} alt={image.name || `it-evidence-${index + 1}`} className="h-32 w-full object-cover" />
                        {index === 3 && record.images.length > 4 ? (
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-lg font-black text-white">
                            +{record.images.length - 4}
                          </span>
                        ) : null}
                      </div>
                      <div className="px-3 py-2">
                        <p className={`truncate text-xs font-semibold ${uiTheme.textSecondary}`}>{image.name || `หลักฐาน ${index + 1}`}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`mt-3 rounded-2xl border border-dashed px-4 py-5 text-sm ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-300 text-slate-500"}`}>
                  รายการนี้ยังไม่มีภาพประกอบ
                </div>
              )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
