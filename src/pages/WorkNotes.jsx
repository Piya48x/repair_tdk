import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  BellOff,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Pencil,
  PlusCircle,
  Save,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
import { endOfMonth, endOfWeek, eachDayOfInterval, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subMonths, addMonths } from "date-fns";
import { th } from "date-fns/locale";
import { supabase } from "../lib/supabaseClient";

const FILTER_OPTIONS = [
  { id: "SELECTED", label: "วันที่เลือก" },
  { id: "TODAY", label: "Today" },
  { id: "UPCOMING", label: "Upcoming" },
  { id: "COMPLETED", label: "Completed" },
];

const PRIORITY_META = {
  low: {
    label: "Low",
    chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  medium: {
    label: "Medium",
    chipClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  high: {
    label: "High",
    chipClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

const STATUS_META = {
  PENDING: {
    label: "Pending",
    chipClass: "border-slate-200 bg-slate-50 text-slate-700",
    icon: Circle,
  },
  DONE: {
    label: "Done",
    chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
};

const toIsoDate = (date = new Date()) => format(date, "yyyy-MM-dd");

const buildInitialForm = (dateValue = toIsoDate()) => ({
  title: "",
  description: "",
  note_date: dateValue,
  note_time: "",
  priority: "medium",
  reminder_enabled: false,
  tag: "",
});

const parseDateOnly = (value) => parseISO(`${value}T00:00:00`);
const normalizeTime = (value) => {
  if (!value) return "00:00";
  return String(value).slice(0, 5);
};
const parseDateTime = (dateValue, timeValue) => new Date(`${dateValue}T${normalizeTime(timeValue)}:00`);

const formatDateLabel = (value) => {
  if (!value) return "-";
  try {
    return format(parseDateOnly(value), "dd MMM yyyy", { locale: th });
  } catch {
    return value;
  }
};

const formatTimeLabel = (value) => {
  if (!value) return "ไม่ระบุเวลา";
  return normalizeTime(value);
};

export default function WorkNotes() {
  const navigate = useNavigate();
  const channelRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(toIsoDate());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState("SELECTED");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [formError, setFormError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [formData, setFormData] = useState(buildInitialForm(toIsoDate()));

  const selectedDateObject = useMemo(() => parseDateOnly(selectedDate), [selectedDate]);
  const todayIso = useMemo(() => toIsoDate(), []);

  const loadNotes = useCallback(async (targetUserId, options = { silent: false }) => {
    if (!targetUserId) return;

    if (!options.silent) setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", targetUserId)
      .order("note_date", { ascending: true })
      .order("note_time", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error) {
      setNotes(data || []);
      setLoadError("");
    } else {
      console.error("Load notes error:", error);
      setLoadError("ไม่สามารถโหลดโน้ตได้ กรุณาตรวจสอบว่าตาราง notes ถูกสร้างใน Supabase แล้ว");
    }

    if (!options.silent) setLoading(false);
  }, []);

  const setupRealtime = useCallback(
    (targetUserId) => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = supabase
        .channel(`work-notes-${targetUserId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notes",
            filter: `user_id=eq.${targetUserId}`,
          },
          async () => {
            await loadNotes(targetUserId, { silent: true });
          }
        )
        .subscribe();
    },
    [loadNotes]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          navigate("/", { replace: true });
          return;
        }

        const uid = session.user.id;
        if (!mounted) return;

        setUserId(uid);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, department, position")
          .eq("id", uid)
          .maybeSingle();

        if (mounted) {
          setProfile(profileData || null);
        }

        await loadNotes(uid);
        setupRealtime(uid);
      } catch (error) {
        console.error("Work notes init error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [navigate, loadNotes, setupRealtime]);

  useEffect(() => {
    if (!editingNoteId) {
      setFormData((prev) => ({ ...prev, note_date: selectedDate }));
    }
  }, [selectedDate, editingNoteId]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarMonth]);

  const noteCountByDate = useMemo(() => {
    const countMap = new Map();
    notes.forEach((note) => {
      if (!note.note_date) return;
      const key = note.note_date;
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });
    return countMap;
  }, [notes]);

  const notesSorted = useMemo(() => {
    return [...notes].sort((left, right) => {
      const leftDate = left.note_date ? parseDateTime(left.note_date, left.note_time).getTime() : 0;
      const rightDate = right.note_date ? parseDateTime(right.note_date, right.note_time).getTime() : 0;
      return leftDate - rightDate;
    });
  }, [notes]);

  const filterCounts = useMemo(() => {
    return {
      SELECTED: notes.filter((note) => note.note_date === selectedDate).length,
      TODAY: notes.filter((note) => note.note_date === todayIso).length,
      UPCOMING: notes.filter((note) => note.status !== "DONE" && note.note_date >= todayIso).length,
      COMPLETED: notes.filter((note) => note.status === "DONE").length,
    };
  }, [notes, selectedDate, todayIso]);

  const visibleNotes = useMemo(() => {
    return notesSorted.filter((note) => {
      if (activeFilter === "SELECTED") return note.note_date === selectedDate;
      if (activeFilter === "TODAY") return note.note_date === todayIso;
      if (activeFilter === "UPCOMING") return note.status !== "DONE" && note.note_date >= todayIso;
      if (activeFilter === "COMPLETED") return note.status === "DONE";
      return true;
    });
  }, [notesSorted, activeFilter, selectedDate, todayIso]);

  const pendingCount = useMemo(() => notes.filter((note) => note.status !== "DONE").length, [notes]);
  const doneCount = useMemo(() => notes.filter((note) => note.status === "DONE").length, [notes]);

  const resetForm = useCallback(
    (dateValue = selectedDate) => {
      setEditingNoteId(null);
      setFormData(buildInitialForm(dateValue));
      setFormError("");
    },
    [selectedDate]
  );

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError("");
  };

  const handleSaveNote = async (event) => {
    event.preventDefault();
    if (!userId || saving) return;

    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedTitle || !formData.note_date) {
      setFormError("กรุณากรอกหัวข้อและวันที่ของโน้ต");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      user_id: userId,
      title: trimmedTitle,
      description: trimmedDescription,
      note_date: formData.note_date,
      note_time: formData.note_time || null,
      priority: formData.priority,
      reminder_enabled: Boolean(formData.reminder_enabled),
      tag: formData.tag.trim() || null,
    };

    try {
      if (editingNoteId) {
        const { error } = await supabase
          .from("notes")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingNoteId)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("notes").insert(payload);
        if (error) throw error;
      }

      resetForm(formData.note_date);
      await loadNotes(userId, { silent: true });
    } catch (error) {
      console.error("Save note error:", error);
      setFormError("ไม่สามารถบันทึกโน้ตได้ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setFormData({
      title: note.title || "",
      description: note.description || "",
      note_date: note.note_date || selectedDate,
      note_time: note.note_time ? String(note.note_time).slice(0, 5) : "",
      priority: note.priority || "medium",
      reminder_enabled: Boolean(note.reminder_enabled),
      tag: note.tag || "",
    });

    if (note.note_date) {
      const noteDateObject = parseDateOnly(note.note_date);
      setSelectedDate(note.note_date);
      setCalendarMonth(noteDateObject);
      setActiveFilter("SELECTED");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!userId || !noteId) return;

    const accepted = window.confirm("ต้องการลบโน้ตนี้ใช่หรือไม่?");
    if (!accepted) return;

    const { error } = await supabase.from("notes").delete().eq("id", noteId).eq("user_id", userId);
    if (!error) {
      if (editingNoteId === noteId) resetForm(selectedDate);
      await loadNotes(userId, { silent: true });
    }
  };

  const handleToggleDone = async (note) => {
    if (!userId || !note?.id) return;
    const nextStatus = note.status === "DONE" ? "PENDING" : "DONE";

    const { error } = await supabase
      .from("notes")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", note.id)
      .eq("user_id", userId);

    if (!error) {
      await loadNotes(userId, { silent: true });
    }
  };

  return (
    <div className="app-theme min-h-screen app-page-bg text-slate-800">
      <div className="mx-auto w-full max-w-[1450px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="app-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="app-btn-secondary mt-1 inline-flex items-center gap-2"
              >
                <ArrowLeft size={15} />
                กลับ Dashboard
              </button>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-1 text-[11px] font-bold text-[var(--brand-primary)]">
                  <CalendarDays size={13} />
                  Personal Work Notes
                </div>
                <h1 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">โน้ตงาน / แพลนงานส่วนตัว</h1>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  บันทึกงานล่วงหน้า ติดตามงานรายวัน และจัดการเตือนความจำแบบเคสต่อเคส
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                รอดำเนินการ {pendingCount} งาน
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                สำเร็จแล้ว {doneCount} งาน
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {profile?.full_name || "ผู้ใช้งาน"}
              </span>
            </div>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[290px_minmax(0,1fr)_360px]">
          <aside className="app-surface p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Calendar View</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((prev) => subMonths(prev, 1))}
                  className="app-icon-btn"
                  aria-label="เดือนก่อนหน้า"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                  className="app-icon-btn"
                  aria-label="เดือนถัดไป"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-700">
              {format(calendarMonth, "MMMM yyyy", { locale: th })}
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500">
              {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dateValue) => {
                const dayIso = toIsoDate(dateValue);
                const isCurrentMonth = isSameMonth(dateValue, calendarMonth);
                const isSelectedDay = isSameDay(dateValue, selectedDateObject);
                const isTodayDay = isToday(dateValue);
                const count = noteCountByDate.get(dayIso) || 0;

                return (
                  <button
                    key={dayIso}
                    type="button"
                    onClick={() => {
                      setSelectedDate(dayIso);
                      setActiveFilter("SELECTED");
                    }}
                    className={[
                      "relative h-10 rounded-lg text-sm font-semibold transition-colors",
                      isSelectedDay
                        ? "bg-[var(--brand-primary)] text-white shadow-sm"
                        : isCurrentMonth
                          ? "text-slate-700 hover:bg-[var(--brand-soft)]"
                          : "text-slate-300 hover:bg-slate-100",
                      isTodayDay && !isSelectedDay ? "ring-2 ring-[var(--tdk-primary-ring)]" : "",
                    ].join(" ")}
                  >
                    {format(dateValue, "d")}
                    {count > 0 && (
                      <span
                        className={[
                          "absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                          isSelectedDay ? "bg-white text-[var(--brand-primary)]" : "bg-[var(--brand-primary)] text-white",
                        ].join(" ")}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setSelectedDate(toIsoDate(today));
                setCalendarMonth(today);
                setActiveFilter("TODAY");
              }}
              className="app-btn-secondary mt-4 w-full"
            >
              ไปยังวันนี้
            </button>
          </aside>

          <section className="app-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900">รายการโน้ตงาน</h2>
                <p className="text-xs text-slate-500">
                  วันที่เลือก: <span className="font-semibold text-slate-700">{formatDateLabel(selectedDate)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter("SELECTED");
                  setSelectedDate(toIsoDate());
                }}
                className="app-btn-secondary inline-flex items-center gap-2"
              >
                <PlusCircle size={14} />
                โน้ตวันนี้
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => {
                const isActive = activeFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setActiveFilter(option.id)}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      isActive
                        ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {option.label}
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                      {filterCounts[option.id] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 min-h-[300px] space-y-3">
              {loading ? (
                <div className="flex min-h-[260px] items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--brand-border)] border-t-[var(--brand-primary)]" />
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                  {loadError}
                </div>
              ) : visibleNotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">ยังไม่มีโน้ตในเงื่อนไขที่เลือก</p>
                  <p className="mt-1 text-xs text-slate-500">สร้างโน้ตใหม่จากฟอร์มด้านขวา แล้วเลือกวันที่จากปฏิทินได้ทันที</p>
                </div>
              ) : (
                visibleNotes.map((note) => {
                  const priorityMeta = PRIORITY_META[note.priority] || PRIORITY_META.medium;
                  const statusMeta = STATUS_META[note.status] || STATUS_META.PENDING;
                  const StatusIcon = statusMeta.icon;
                  const isDone = note.status === "DONE";

                  return (
                    <article
                      key={note.id}
                      className={[
                        "rounded-2xl border p-4 transition-colors",
                        isDone ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white hover:bg-slate-50/60",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-slate-900">{note.title}</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateLabel(note.note_date)} • {formatTimeLabel(note.note_time)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityMeta.chipClass}`}>
                            {priorityMeta.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.chipClass}`}>
                            <StatusIcon size={11} />
                            {statusMeta.label}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                        {note.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {note.reminder_enabled ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[var(--brand-border)] bg-[var(--brand-soft)] px-2 py-1 font-semibold text-[var(--brand-primary)]">
                            <Bell size={12} />
                            เปิดเตือนความจำ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-500">
                            <BellOff size={12} />
                            ไม่เปิดเตือน
                          </span>
                        )}

                        {note.tag && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600">
                            <Tag size={12} />
                            {note.tag}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleDone(note)}
                          className={[
                            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                            isDone
                              ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                          ].join(" ")}
                        >
                          <CheckCircle2 size={13} />
                          {isDone ? "ยกเลิก Done" : "Mark Done"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditNote(note)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <Pencil size={13} />
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                        >
                          <Trash2 size={13} />
                          ลบ
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <aside className="app-surface p-4 sm:p-5">
            <h2 className="text-base font-black text-slate-900">
              {editingNoteId ? "แก้ไขโน้ตงาน" : "สร้างโน้ตใหม่"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">ฟอร์มนี้รองรับการวางแผนงานรายวัน พร้อมตั้งระดับความสำคัญและเตือนความจำ</p>

            <form className="mt-4 space-y-3" onSubmit={handleSaveNote}>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Title</label>
                <input
                  value={formData.title}
                  onChange={(event) => updateFormField("title", event.target.value)}
                  className="app-input"
                  placeholder="เช่น เตรียมเอกสารประชุมทีม"
                  maxLength={120}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(event) => updateFormField("description", event.target.value)}
                  className="app-input resize-y"
                  placeholder="รายละเอียดงานหรือ checklist แบบย่อ"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Date</label>
                  <input
                    type="date"
                    value={formData.note_date}
                    onChange={(event) => updateFormField("note_date", event.target.value)}
                    className="app-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Optional Time</label>
                  <input
                    type="time"
                    value={formData.note_time}
                    onChange={(event) => updateFormField("note_time", event.target.value)}
                    className="app-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(event) => updateFormField("priority", event.target.value)}
                    className="app-input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Tag (optional)</label>
                  <input
                    value={formData.tag}
                    onChange={(event) => updateFormField("tag", event.target.value)}
                    className="app-input"
                    placeholder="เช่น meeting, report"
                    maxLength={40}
                  />
                </div>
              </div>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Reminder Toggle</p>
                  <p className="text-[11px] text-slate-500">เปิดเตือนความจำสำหรับโน้ตนี้</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.reminder_enabled}
                  onChange={(event) => updateFormField("reminder_enabled", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--tdk-primary-ring)]"
                />
              </label>

              {formError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{formError}</p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" disabled={saving} className="app-btn-primary inline-flex flex-1 items-center justify-center gap-2 disabled:opacity-60">
                  <Save size={14} />
                  {saving ? "กำลังบันทึก..." : editingNoteId ? "บันทึกการแก้ไข" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => resetForm(selectedDate)}
                  className="app-btn-secondary inline-flex items-center justify-center gap-2"
                >
                  <XCircle size={14} />
                  Cancel
                </button>
              </div>
            </form>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Tip:</p>
              <p className="mt-1">เลือกวันที่จากปฏิทินด้านซ้ายเพื่อดูโน้ตของวันนั้น แล้วกด Mark Done เมื่องานเสร็จ</p>
              <p className="mt-2 inline-flex items-center gap-1 font-semibold text-slate-500">
                <Clock3 size={12} />
                สถานะล่าสุดซิงก์แบบเรียลไทม์ผ่าน Supabase
              </p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
