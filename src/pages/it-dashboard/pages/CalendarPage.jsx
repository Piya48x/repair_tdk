import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react";

const LOCAL_NOTE_KEY = "it-dashboard-calendar-notes-v1";

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateKey = (value) => {
  const date = value instanceof Date ? value : toDate(value);
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseLocalNotes = () => {
  try {
    const raw = localStorage.getItem(LOCAL_NOTE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const CalendarPage = ({ theme, uiTheme, tickets = [], currentUser }) => {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [notes, setNotes] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formState, setFormState] = useState({
    title: "",
    requestedBy: "",
    description: "",
    imageDataUrl: "",
    imageName: "",
  });

  useEffect(() => {
    setNotes(parseLocalNotes());
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_NOTE_KEY, JSON.stringify(notes));
  }, [notes]);

  const monthDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(year, month, day));
    }
    return cells;
  }, [viewDate]);

  const ticketCountByDate = useMemo(() => {
    const map = new Map();
    tickets.forEach((ticket) => {
      const key = toDateKey(ticket.created_at || ticket.updated_at || ticket.closed_at);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [tickets]);

  const noteCountByDate = useMemo(() => {
    const map = new Map();
    notes.forEach((note) => {
      map.set(note.dateKey, (map.get(note.dateKey) || 0) + 1);
    });
    return map;
  }, [notes]);

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedDateKey.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }, [selectedDateKey]);

  const todayKey = toDateKey(new Date());
  const isFutureDate = selectedDateKey > todayKey;

  const selectedDateTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const key = toDateKey(ticket.created_at || ticket.updated_at || ticket.closed_at);
      return key === selectedDateKey;
    });
  }, [tickets, selectedDateKey]);

  const activeTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "IN_PROGRESS"),
    [tickets],
  );

  const completedTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (ticket.status !== "CLOSED") return false;
      const key = toDateKey(ticket.closed_at || ticket.updated_at || ticket.created_at);
      return key === selectedDateKey;
    });
  }, [tickets, selectedDateKey]);

  const selectedDateNotes = useMemo(() => {
    return notes
      .filter((note) => note.dateKey === selectedDateKey)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notes, selectedDateKey]);

  const resetForm = () => {
    setFormState({
      title: "",
      requestedBy: "",
      description: "",
      imageDataUrl: "",
      imageName: "",
    });
    setFormError("");
  };

  const handleOpenForm = () => {
    resetForm();
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    resetForm();
  };

  const handlePickImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("รองรับเฉพาะไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFormError("ขนาดรูปภาพต้องไม่เกิน 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormState((prev) => ({
        ...prev,
        imageDataUrl: typeof reader.result === "string" ? reader.result : "",
        imageName: file.name,
      }));
      setFormError("");
    };
    reader.onerror = () => setFormError("ไม่สามารถอ่านไฟล์รูปภาพได้");
    reader.readAsDataURL(file);
  };

  const handleSaveNote = (event) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      setFormError("กรุณาระบุหัวข้อนัดหมาย");
      return;
    }
    if (!formState.requestedBy.trim()) {
      setFormError("กรุณาระบุผู้นัดหมาย");
      return;
    }

    const nextNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      dateKey: selectedDateKey,
      title: formState.title.trim(),
      requestedBy: formState.requestedBy.trim(),
      description: formState.description.trim(),
      imageDataUrl: formState.imageDataUrl || "",
      imageName: formState.imageName || "",
      createdBy: currentUser?.name || "ผู้ใช้งาน",
      createdAt: new Date().toISOString(),
    };

    setNotes((prev) => [nextNote, ...prev]);
    handleCloseForm();
  };

  const handleDeleteNote = (noteId) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
  };

  const changeMonth = (offset) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + offset);
    setViewDate(next);
  };

  return (
    <>
      <section className="mb-6">
        <div className={`rounded-lg border px-4 py-3 ${uiTheme.surfaceCard}`}>
          <h3 className={`text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
            ปฏิทินนัดหมายงานซ่อม
          </h3>
          <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
            เลือกวันที่เพื่อดูงานย้อนหลัง งานที่กำลังทำ และบันทึกนัดหมายล่วงหน้า
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className={`rounded-2xl border p-4 ${uiTheme.surfaceCard}`}>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${uiTheme.statusButton}`}
            >
              <ChevronLeft size={16} />
            </button>
            <p className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
              {viewDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${uiTheme.statusButton}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-2">
            {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((label) => (
              <div key={label} className="py-2 text-center text-xs font-semibold text-slate-500">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} className="h-16 rounded-lg" />;

              const key = toDateKey(date);
              const isToday = key === todayKey;
              const isSelected = key === selectedDateKey;
              const ticketCount = ticketCountByDate.get(key) || 0;
              const noteCount = noteCountByDate.get(key) || 0;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDateKey(key)}
                  className={`h-16 rounded-lg border p-1 text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/10"
                      : theme === "dark"
                        ? "border-slate-700 hover:border-slate-500 hover:bg-slate-800/60"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        isToday
                          ? "text-blue-600"
                          : theme === "dark"
                            ? "text-slate-200"
                            : "text-slate-700"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {noteCount > 0 && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {ticketCount > 0 && <p className="text-[10px] text-blue-500">งาน {ticketCount}</p>}
                    {noteCount > 0 && <p className="text-[10px] text-emerald-500">นัด {noteCount}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${uiTheme.surfaceCard}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>วันที่เลือก</p>
              <p className={`mt-1 text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                {selectedDate.toLocaleDateString("th-TH", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <CalendarDays className={theme === "dark" ? "text-slate-400" : "text-slate-500"} size={18} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className={`rounded-lg border p-2 text-center ${theme === "dark" ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
              <p className="text-xs text-slate-500">งานวันนั้น</p>
              <p className={`mt-1 text-lg font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>{selectedDateTickets.length}</p>
            </div>
            <div className={`rounded-lg border p-2 text-center ${theme === "dark" ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
              <p className="text-xs text-slate-500">กำลังทำ</p>
              <p className="mt-1 text-lg font-bold text-amber-500">{activeTickets.length}</p>
            </div>
            <div className={`rounded-lg border p-2 text-center ${theme === "dark" ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
              <p className="text-xs text-slate-500">นัดหมาย</p>
              <p className="mt-1 text-lg font-bold text-emerald-500">{selectedDateNotes.length}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenForm}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={14} />
            {isFutureDate ? "บันทึกนัดหมายล่วงหน้า" : "บันทึกโน้ตประจำวัน"}
          </button>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`rounded-2xl border p-4 ${uiTheme.surfaceCard}`}>
          <div className="mb-3 flex items-center justify-between">
            <h4 className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
              โน้ต/นัดหมายในวันที่เลือก
            </h4>
            <span className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              {selectedDateNotes.length} รายการ
            </span>
          </div>

          <div className="space-y-3">
            {selectedDateNotes.length === 0 && (
              <div className={`rounded-lg border p-4 text-sm ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                ยังไม่มีบันทึกนัดหมายในวันนี้
              </div>
            )}

            {selectedDateNotes.map((note) => (
              <article key={note.id} className={`rounded-lg border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                      {note.title}
                    </p>
                    <p className="mt-0.5 text-xs text-blue-500">ผู้นัดหมาย: {note.requestedBy}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    className="rounded-md p-1 text-rose-500 hover:bg-rose-500/10"
                    aria-label="ลบบันทึก"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {note.description && (
                  <p className={`mt-2 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{note.description}</p>
                )}

                {note.imageDataUrl && (
                  <img src={note.imageDataUrl} alt={note.imageName || "note"} className="mt-2 h-36 w-full rounded-lg object-cover" />
                )}

                <p className={`mt-2 text-[11px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
                  บันทึกโดย {note.createdBy} • {new Date(note.createdAt).toLocaleString("th-TH")}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${uiTheme.surfaceCard}`}>
          <div className="mb-3 flex items-center gap-2">
            <Clock3 size={16} className="text-amber-500" />
            <h4 className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
              งานในระบบ
            </h4>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                งานที่กำลังดำเนินการตอนนี้ ({activeTickets.length})
              </p>
              <div className="space-y-2">
                {activeTickets.slice(0, 5).map((ticket) => (
                  <div key={`active-${ticket.id}`} className={`rounded-lg border p-2 text-sm ${theme === "dark" ? "border-slate-700 bg-slate-800/40 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                    #{ticket.id?.toString().slice(-6)} {ticket.title}
                  </div>
                ))}
                {activeTickets.length === 0 && (
                  <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ไม่มีงานที่กำลังทำ</p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                งานที่ปิดในวันที่เลือก ({completedTickets.length})
              </p>
              <div className="space-y-2">
                {completedTickets.slice(0, 5).map((ticket) => (
                  <div key={`closed-${ticket.id}`} className={`rounded-lg border p-2 text-sm ${theme === "dark" ? "border-slate-700 bg-slate-800/40 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                    #{ticket.id?.toString().slice(-6)} {ticket.title}
                  </div>
                ))}
                {completedTickets.length === 0 && (
                  <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    ยังไม่มีงานที่ปิดในวันที่เลือก
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {openForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45" onClick={handleCloseForm} />
          <form
            onSubmit={handleSaveNote}
            className={`relative z-[81] w-full max-w-lg rounded-2xl border p-4 shadow-xl ${uiTheme.modalShell}`}
          >
            <div className={`mb-4 flex items-center justify-between border-b pb-3 ${uiTheme.modalFooterBorder}`}>
              <div>
                <h4 className={`text-base font-semibold ${uiTheme.modalTitle}`}>บันทึกนัดหมายล่วงหน้า</h4>
                <p className={`text-sm ${uiTheme.modalSubtitle}`}>
                  วันที่ {selectedDate.toLocaleDateString("th-TH")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                className={`rounded-lg p-2 ${uiTheme.modalCloseButton}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`mb-1 block text-sm ${uiTheme.modalLabel}`}>หัวข้อนัดหมาย</label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="เช่น เข้าเปลี่ยนเครื่องที่แผนกบัญชี"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.modalInput}`}
                />
              </div>

              <div>
                <label className={`mb-1 block text-sm ${uiTheme.modalLabel}`}>ผู้นัดหมาย</label>
                <input
                  type="text"
                  value={formState.requestedBy}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, requestedBy: event.target.value }))
                  }
                  placeholder="เช่น ผู้จัดการฝ่ายบุคคล"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.modalInput}`}
                />
              </div>

              <div>
                <label className={`mb-1 block text-sm ${uiTheme.modalLabel}`}>รายละเอียดงาน</label>
                <textarea
                  rows={4}
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="ระบุว่าให้ทำอะไร เวลาไหน และข้อกำหนดสำคัญ"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm ${uiTheme.modalInput}`}
                />
              </div>

              <div>
                <label className={`mb-1 block text-sm ${uiTheme.modalLabel}`}>แนบรูปภาพ (ไม่บังคับ)</label>
                <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm ${uiTheme.modalSecondaryButton}`}>
                  <ImageIcon size={15} />
                  เลือกรูปภาพ
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handlePickImage(event.target.files?.[0])}
                  />
                </label>
                {formState.imageDataUrl && (
                  <div className="mt-2">
                    <img
                      src={formState.imageDataUrl}
                      alt={formState.imageName || "preview"}
                      className="h-36 w-full rounded-lg object-cover"
                    />
                    <p className={`mt-1 text-xs ${uiTheme.textMuted}`}>{formState.imageName}</p>
                  </div>
                )}
              </div>

              {formError && <p className="text-sm text-rose-500">{formError}</p>}
            </div>

            <div className={`mt-4 flex justify-end gap-2 border-t pt-3 ${uiTheme.modalFooterBorder}`}>
              <button
                type="button"
                onClick={handleCloseForm}
                className={`rounded-lg border px-3 py-2 text-sm ${uiTheme.modalSecondaryButton}`}
              >
                ยกเลิก
              </button>
              <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                บันทึกนัดหมาย
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default CalendarPage;
