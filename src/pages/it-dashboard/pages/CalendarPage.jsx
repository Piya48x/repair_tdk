import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Image as ImageIcon,
  MapPin,
  Plus,
  Trash2,
  UserRound,
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

const normalizeText = (value) => String(value || "").trim();

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTicketNo = (ticket) => ticket?.ticket_no || `#${String(ticket?.id || "").slice(-6).toUpperCase()}`;

const getTicketDateKeys = (ticket) => {
  const keys = [
    ticket?.created_at,
    ticket?.started_at,
    ticket?.closed_at,
    ticket?.updated_at,
  ]
    .map(toDateKey)
    .filter(Boolean);
  return [...new Set(keys)];
};

const getStatusMeta = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "NEW":
      return { label: "New", className: "border-rose-200 bg-rose-50 text-rose-700" };
    case "IN_PROGRESS":
      return { label: "In progress", className: "border-amber-200 bg-amber-50 text-amber-700" };
    case "CLOSED":
      return { label: "Closed", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    default:
      return { label: normalizeText(status) || "Unknown", className: "border-slate-200 bg-slate-50 text-slate-600" };
  }
};

const getPriorityMeta = (priority) => {
  switch (String(priority || "").toLowerCase()) {
    case "urgent":
      return { label: "Urgent", className: "bg-rose-600 text-white" };
    case "normal":
    case "medium":
      return { label: "Important", className: "bg-amber-500 text-white" };
    case "low":
      return { label: "Normal", className: "bg-emerald-600 text-white" };
    default:
      return { label: normalizeText(priority) || "Priority", className: "bg-slate-500 text-white" };
  }
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

const CalendarPage = ({ theme, uiTheme, tickets = [], currentUser, handleViewDetails }) => {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [openDayKey, setOpenDayKey] = useState("");
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

  useEffect(() => {
    if (!openDayKey) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpenDayKey("");
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openDayKey]);

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
      getTicketDateKeys(ticket).forEach((key) => {
        map.set(key, (map.get(key) || 0) + 1);
      });
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
      return getTicketDateKeys(ticket).includes(selectedDateKey);
    }).sort((a, b) => {
      const left = toDate(b.closed_at || b.started_at || b.updated_at || b.created_at)?.getTime() || 0;
      const right = toDate(a.closed_at || a.started_at || a.updated_at || a.created_at)?.getTime() || 0;
      return left - right;
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

  const openDayDate = useMemo(() => {
    if (!openDayKey) return null;
    const [y, m, d] = openDayKey.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }, [openDayKey]);

  const dayTicketSummary = useMemo(() => {
    return selectedDateTickets.reduce(
      (summary, ticket) => {
        const status = String(ticket?.status || "").toUpperCase();
        if (status === "NEW") summary.new += 1;
        else if (status === "IN_PROGRESS") summary.active += 1;
        else if (status === "CLOSED") summary.closed += 1;
        else summary.other += 1;
        return summary;
      },
      { new: 0, active: 0, closed: 0, other: 0 },
    );
  }, [selectedDateTickets]);

  const handleOpenDay = (key) => {
    setSelectedDateKey(key);
    setOpenDayKey(key);
  };

  const handleOpenTicket = (ticket) => {
    setOpenDayKey("");
    handleViewDetails?.(ticket);
  };

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
    setOpenDayKey("");
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
                  onClick={() => handleOpenDay(key)}
                  className={`h-16 rounded-lg border p-1 text-left transition ${
                    isSelected
                      ? "border-[#2b59b0] bg-[#2b59b0]/10"
                      : theme === "dark"
                        ? "border-slate-700 hover:border-slate-500 hover:bg-slate-800/60"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        isToday
                          ? "text-[#2b59b0]"
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
                    {ticketCount > 0 && <p className="text-[10px] text-[#2b59b0]">งาน {ticketCount}</p>}
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
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2b59b0] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#244a95]"
          >
            <Plus size={14} />
            {isFutureDate ? "บันทึกนัดหมายล่วงหน้า" : "บันทึกโน้ตประจำวัน"}
          </button>
          <button
            type="button"
            onClick={() => setOpenDayKey(selectedDateKey)}
            className={`mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${uiTheme.statusButton}`}
          >
            <Eye size={14} />
            ดูรายการงานของวันนี้
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
                    <p className="mt-0.5 text-xs text-[#2b59b0]">ผู้นัดหมาย: {note.requestedBy}</p>
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

      {openDayKey && openDayDate && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setOpenDayKey("")} />
          <div
            className={`relative z-[91] flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${uiTheme.modalShell}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`border-b px-4 py-4 sm:px-5 ${uiTheme.modalFooterBorder}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#2b59b0]/25 bg-[#2b59b0]/10 px-3 py-1 text-xs font-semibold text-[#2b59b0]">
                      Repair calendar
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${theme === "dark" ? "border-slate-600 text-slate-300" : "border-slate-200 text-slate-600"}`}>
                      {selectedDateTickets.length} งาน / {selectedDateNotes.length} นัดหมาย
                    </span>
                  </div>
                  <h3 className={`text-lg font-black sm:text-2xl ${uiTheme.modalTitle}`}>
                    {openDayDate.toLocaleDateString("th-TH", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <p className={`mt-1 text-sm ${uiTheme.modalSubtitle}`}>
                    รายการงานซ่อมและนัดหมายที่เกี่ยวข้องกับวันนี้
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenDayKey("")}
                  className={`shrink-0 rounded-lg p-2 ${uiTheme.modalCloseButton}`}
                  aria-label="ปิดรายการงานประจำวัน"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "งานใหม่", value: dayTicketSummary.new, cls: "text-rose-600" },
                  { label: "กำลังทำ", value: dayTicketSummary.active, cls: "text-amber-600" },
                  { label: "ปิดงานแล้ว", value: dayTicketSummary.closed, cls: "text-emerald-600" },
                  { label: "นัดหมาย", value: selectedDateNotes.length, cls: "text-[#2b59b0]" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl border px-3 py-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-slate-50"}`}
                  >
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      {item.label}
                    </p>
                    <p className={`mt-1 text-2xl font-black ${item.cls}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
                <section className={`rounded-xl border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className={`text-sm font-bold ${uiTheme.modalTitle}`}>งานซ่อมในวันนั้น</h4>
                    <span className={`text-xs ${uiTheme.modalSubtitle}`}>{selectedDateTickets.length} รายการ</span>
                  </div>

                  {selectedDateTickets.length === 0 ? (
                    <div className={`rounded-xl border border-dashed px-4 py-8 text-center text-sm ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                      ยังไม่มีงานซ่อมในวันนี้
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateTickets.map((ticket) => {
                        const statusMeta = getStatusMeta(ticket.status);
                        const priorityMeta = getPriorityMeta(ticket.priority);
                        const requester = normalizeText(ticket.reporter_name) || "-";
                        const department = normalizeText(ticket.reporter_dept || ticket.department) || "-";
                        const assigned = normalizeText(ticket.assigned_name) || "ยังไม่ระบุผู้ดูแล";

                        return (
                          <article
                            key={ticket.id}
                            className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-slate-50"}`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                                    {statusMeta.label}
                                  </span>
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityMeta.className}`}>
                                    {priorityMeta.label}
                                  </span>
                                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-600 text-slate-300" : "border-slate-200 text-slate-600"}`}>
                                    {getTicketNo(ticket)}
                                  </span>
                                </div>
                                <h5 className={`line-clamp-2 text-sm font-bold sm:text-base ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                                  {ticket.title || "ไม่มีหัวข้องาน"}
                                </h5>
                                <p className={`mt-1 line-clamp-2 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                                  {ticket.description || "ไม่มีรายละเอียดปัญหา"}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenTicket(ticket)}
                                disabled={!handleViewDetails}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Eye size={14} />
                                ดูงาน
                              </button>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>
                                <UserRound size={13} />
                                <span className="truncate">{requester} / {department}</span>
                              </div>
                              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>
                                <MapPin size={13} />
                                <span className="truncate">{ticket.location || "-"}</span>
                              </div>
                              <div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>
                                แจ้ง: {formatDateTime(ticket.created_at)}
                              </div>
                              <div className={`rounded-lg border px-3 py-2 ${theme === "dark" ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"}`}>
                                ผู้ดูแล: {assigned}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className={`rounded-xl border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className={`text-sm font-bold ${uiTheme.modalTitle}`}>โน้ตและนัดหมาย</h4>
                    <button
                      type="button"
                      onClick={handleOpenForm}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2b59b0] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#244a95]"
                    >
                      <Plus size={13} />
                      เพิ่ม
                    </button>
                  </div>

                  {selectedDateNotes.length === 0 ? (
                    <div className={`rounded-xl border border-dashed px-4 py-8 text-center text-sm ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                      ยังไม่มีโน้ตหรือนัดหมาย
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateNotes.map((note) => (
                        <article
                          key={`modal-note-${note.id}`}
                          className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-slate-50"}`}
                        >
                          <p className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                            {note.title}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[#2b59b0]">ผู้นัดหมาย: {note.requestedBy}</p>
                          {note.description && (
                            <p className={`mt-2 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{note.description}</p>
                          )}
                          {note.imageDataUrl && (
                            <img src={note.imageDataUrl} alt={note.imageName || "note"} className="mt-2 h-28 w-full rounded-lg object-cover" />
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <button type="submit" className="rounded-lg bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white hover:bg-[#244a95]">
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
