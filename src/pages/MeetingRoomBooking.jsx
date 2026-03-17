import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DoorOpen,
  FileText,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import {
  insertMeetingRoomBookingWithSchemaFallback,
  updateMeetingRoomBookingWithSchemaFallback,
} from "../lib/meetingRoomBookingSchemaCompat";

const ROOM_OPTIONS = ["Room A", "Room B", "Room C", "Room D"];
const LOOKBACK_DAYS = 7;
const TITLE_MAX_LENGTH = 120;
const BOOKER_MAX_LENGTH = 80;
const MINUTES_MAX_LENGTH = 3000;

const createDefaultForm = () => ({
  date: format(new Date(), "yyyy-MM-dd"),
  startTime: "09:00",
  endTime: "10:00",
  room: ROOM_OPTIONS[0],
  title: "",
  bookedBy: "",
});

const extractDateKey = (value) => {
  const text = String(value || "").trim();
  const directMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch?.[1]) return directMatch[1];

  const dmyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    let year = Number(dmyMatch[3]);

    if (year > 2400) year -= 543;
    if (year < 100) year += 2000;

    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return format(parsed, "yyyy-MM-dd");
};

const parseDateTime = (date, time) => {
  const dateKey = extractDateKey(date);
  if (!dateKey) return new Date("invalid");
  const clock = String(time || "").slice(0, 5);
  return new Date(`${dateKey}T${clock}:00`);
};

const toMinutes = (value) => {
  const [hourRaw, minuteRaw] = String(value || "").slice(0, 5).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
};

const sanitizeSingleLine = (value, maxLength) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const sanitizeMultiLine = (value, maxLength) =>
  String(value || "")
    .replace(/\r/g, "")
    .trim()
    .slice(0, maxLength);

const normalizeComparableText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const detectOverlapWarnings = (rows) => {
  const groups = new Map();
  rows.forEach((row) => {
    if (row.status === "cancelled") return;
    const dateKey = row.booking_date_key || extractDateKey(row.booking_date);
    if (!dateKey || !row.room_name) return;
    const key = `${dateKey}|${row.room_name}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  const warnings = [];
  groups.forEach((items, key) => {
    const sorted = [...items].sort((left, right) => toMinutes(left.start_time) - toMinutes(right.start_time));
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const current = sorted[index];
      const next = sorted[index + 1];
      if (toMinutes(next.start_time) < toMinutes(current.end_time)) {
        warnings.push({
          key: `${key}-${current.id}-${next.id}`,
          roomName: current.room_name,
          bookingDate: current.booking_date_key || extractDateKey(current.booking_date),
          current,
          next,
        });
      }
    }
  });

  return warnings;
};

const formatDisplayDate = (value) => {
  const dateKey = extractDateKey(value);
  if (!dateKey) return "-";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("th-TH");
};

const getLifecycleMeta = (item) => {
  const status = String(item.status || "confirmed").toLowerCase();
  const now = new Date();
  const start = parseDateTime(item.booking_date, item.start_time);
  const end = parseDateTime(item.booking_date, item.end_time);

  if (status === "cancelled") {
    return {
      key: "cancelled",
      label: "Cancelled",
      badgeClass: "border-slate-200 bg-slate-100 text-slate-600",
    };
  }
  if (status === "completed") {
    return {
      key: "completed",
      label: "Completed",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    if (now >= start && now <= end) {
      return {
        key: "in_progress",
        label: "กำลังประชุม",
        badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      };
    }
    if (now > end) {
      return {
        key: "pending_minutes",
        label: "รอบันทึกผล",
        badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
      };
    }
  }

  return {
    key: "upcoming",
    label: "รอประชุม",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
  };
};

const createMinutesDraft = (item) => ({
  summary: String(item?.meeting_summary || ""),
  decisions: String(item?.meeting_decisions || ""),
  actionItems: String(item?.action_items || ""),
});

const MeetingRoomBooking = () => {
  const navigate = useNavigate();
  const channelRef = useRef(null);

  const [form, setForm] = useState(createDefaultForm);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("user");
  const [overlapWarnings, setOverlapWarnings] = useState([]);
  const [expandedMinutesId, setExpandedMinutesId] = useState("");
  const [minutesDrafts, setMinutesDrafts] = useState({});
  const [savingMinutesId, setSavingMinutesId] = useState("");

  const fetchBookings = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - LOOKBACK_DAYS);
      const lookbackKey = format(lookbackDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("meeting_room_bookings")
        .select("*")
        .gte("booking_date", lookbackKey)
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(800);

      if (error) throw error;

      const normalizedRows = (data || []).map((item) => ({
        ...item,
        booking_date_key: extractDateKey(item.booking_date),
      }));

      setBookings(normalizedRows);
      setOverlapWarnings(detectOverlapWarnings(normalizedRows));
      setBookingsError("");
    } catch (error) {
      console.error("Load meeting room bookings error:", error);
      setBookingsError("ไม่สามารถโหลดข้อมูลการจองห้องประชุมได้");
      setBookings([]);
      setOverlapWarnings([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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

        const fallbackName =
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "พนักงาน";

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!mounted) return;

        const resolvedName = profileData?.full_name || fallbackName;
        const resolvedRole = profileData?.role || "user";
        setCurrentUserId(session.user.id);
        setCurrentUserName(resolvedName);
        setCurrentUserRole(resolvedRole);
        setForm((prev) => ({ ...prev, bookedBy: resolvedName }));

        await fetchBookings();

        channelRef.current = supabase
          .channel("meeting-room-bookings-page")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "meeting_room_bookings",
            },
            () => {
              fetchBookings({ silent: true });
            },
          )
          .subscribe();
      } catch (error) {
        console.error("Init meeting room booking page error:", error);
      }
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchBookings, navigate]);

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const left = parseDateTime(a.booking_date, String(a.start_time || "").slice(0, 5)).getTime();
      const right = parseDateTime(b.booking_date, String(b.start_time || "").slice(0, 5)).getTime();
      return left - right;
    });
  }, [bookings]);

  const bookingRows = useMemo(() => {
    return sortedBookings.map((item) => ({
      ...item,
      lifecycle: getLifecycleMeta(item),
    }));
  }, [sortedBookings]);

  const bookingStats = useMemo(() => {
    return bookingRows.reduce(
      (accumulator, item) => {
        if (item.lifecycle.key === "upcoming") accumulator.upcoming += 1;
        if (item.lifecycle.key === "in_progress") accumulator.inProgress += 1;
        if (item.lifecycle.key === "pending_minutes") accumulator.pendingMinutes += 1;
        if (item.lifecycle.key === "completed") accumulator.completed += 1;
        return accumulator;
      },
      { upcoming: 0, inProgress: 0, pendingMinutes: 0, completed: 0 },
    );
  }, [bookingRows]);

  const canManageBooking = useCallback(
    (item) => {
      if (!currentUserId) return false;
      if (currentUserRole === "admin" || currentUserRole === "it_support") return true;
      if (item.created_by && item.created_by === currentUserId) return true;

      const bookedBy = normalizeComparableText(item.booked_by);
      const currentName = normalizeComparableText(currentUserName);
      return !item.created_by && bookedBy && bookedBy === currentName;
    },
    [currentUserId, currentUserName, currentUserRole],
  );

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const ensureDraftExists = useCallback((item) => {
    setMinutesDrafts((prev) => {
      if (prev[item.id]) return prev;
      return {
        ...prev,
        [item.id]: createMinutesDraft(item),
      };
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const title = sanitizeSingleLine(form.title, TITLE_MAX_LENGTH);
    const bookedBy = sanitizeSingleLine(form.bookedBy, BOOKER_MAX_LENGTH);
    const todayKey = format(new Date(), "yyyy-MM-dd");

    if (!title) {
      setErrorMessage("กรุณาระบุหัวข้อการประชุม");
      return;
    }
    if (title.length < 3) {
      setErrorMessage("หัวข้อการประชุมควรยาวอย่างน้อย 3 ตัวอักษร");
      return;
    }
    if (!bookedBy) {
      setErrorMessage("กรุณาระบุชื่อผู้จองหรือทีมที่จอง");
      return;
    }
    if (form.date < todayKey) {
      setErrorMessage("ระบบไม่อนุญาตให้สร้างการจองย้อนหลัง");
      return;
    }

    const start = parseDateTime(form.date, form.startTime);
    const end = parseDateTime(form.date, form.endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setErrorMessage("รูปแบบวันเวลาไม่ถูกต้อง");
      return;
    }
    if (end <= start) {
      setErrorMessage("เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด");
      return;
    }

    const hasConflict = bookingRows.some((item) => {
      if (item.status === "cancelled") return false;
      if (item.room_name !== form.room || extractDateKey(item.booking_date) !== form.date) return false;
      const existingStart = parseDateTime(item.booking_date, String(item.start_time || "").slice(0, 5));
      const existingEnd = parseDateTime(item.booking_date, String(item.end_time || "").slice(0, 5));
      return start < existingEnd && end > existingStart;
    });

    if (hasConflict) {
      setErrorMessage("ช่วงเวลานี้มีการจองห้องดังกล่าวแล้ว");
      return;
    }

    try {
      setSaving(true);

      const { data: roomRows, error: roomRowsError } = await supabase
        .from("meeting_room_bookings")
        .select("id, booking_date, start_time, end_time, room_name, status")
        .eq("room_name", form.room)
        .gte("booking_date", form.date)
        .limit(800);

      if (roomRowsError) throw roomRowsError;

      const serverConflict = (roomRows || []).some((item) => {
        if (String(item.status || "").toLowerCase() === "cancelled") return false;
        if (extractDateKey(item.booking_date) !== form.date) return false;
        const existingStart = parseDateTime(item.booking_date, String(item.start_time || "").slice(0, 5));
        const existingEnd = parseDateTime(item.booking_date, String(item.end_time || "").slice(0, 5));
        return start < existingEnd && end > existingStart;
      });

      if (serverConflict) {
        setErrorMessage("ช่วงเวลานี้ถูกจองไปแล้วจากบัญชีอื่น กรุณาเลือกเวลาใหม่");
        return;
      }

      const payload = {
        room_name: form.room,
        title,
        booked_by: bookedBy,
        booking_date: form.date,
        start_time: form.startTime,
        end_time: form.endTime,
        status: "confirmed",
        created_by: currentUserId || null,
      };

      const { error } = await insertMeetingRoomBookingWithSchemaFallback(
        supabase,
        payload,
        { select: "id", single: true },
      );

      if (error) throw error;

      setForm((prev) => ({
        ...createDefaultForm(),
        bookedBy: currentUserName || prev.bookedBy || "",
      }));
      setErrorMessage("");
      setSuccessMessage("บันทึกรายการจองสำเร็จ");
      await fetchBookings({ silent: true });
    } catch (error) {
      console.error("Create booking error:", error);
      const message = String(error?.message || "");
      if (message.includes("meeting_room_no_overlap")) {
        setErrorMessage("ช่วงเวลานี้ถูกจองซ้ำ กรุณาเลือกเวลาใหม่");
      } else if (message.includes("row-level security")) {
        setErrorMessage("ไม่มีสิทธิ์สร้างรายการจอง โปรดติดต่อผู้ดูแลระบบ");
      } else {
        setErrorMessage("บันทึกรายการจองไม่สำเร็จ กรุณาลองใหม่");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!canManageBooking(item)) {
      setErrorMessage("คุณไม่มีสิทธิ์ลบรายการจองนี้");
      return;
    }

    const accepted = window.confirm("ต้องการลบรายการจองนี้ใช่หรือไม่?");
    if (!accepted) return;

    const { error } = await supabase.from("meeting_room_bookings").delete().eq("id", item.id);
    if (error) {
      console.error("Delete meeting booking error:", error);
      setErrorMessage("ลบรายการไม่สำเร็จ กรุณาลองใหม่");
      return;
    }

    setSuccessMessage("ลบรายการจองเรียบร้อย");
    await fetchBookings({ silent: true });
  };

  const openMinutesEditor = (item) => {
    if (!canManageBooking(item)) {
      setErrorMessage("คุณไม่มีสิทธิ์บันทึกผลประชุมของรายการนี้");
      return;
    }
    ensureDraftExists(item);
    setExpandedMinutesId(item.id);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleMinutesFieldChange = (bookingId, field, value) => {
    setMinutesDrafts((prev) => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] || createMinutesDraft({})),
        [field]: value,
      },
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSaveMinutes = async (item) => {
    if (savingMinutesId) return;
    if (!canManageBooking(item)) {
      setErrorMessage("คุณไม่มีสิทธิ์บันทึกผลประชุมของรายการนี้");
      return;
    }

    const draft = minutesDrafts[item.id] || createMinutesDraft(item);
    const summary = sanitizeMultiLine(draft.summary, MINUTES_MAX_LENGTH);
    const decisions = sanitizeMultiLine(draft.decisions, MINUTES_MAX_LENGTH);
    const actionItems = sanitizeMultiLine(draft.actionItems, MINUTES_MAX_LENGTH);

    if (!summary) {
      setErrorMessage("กรุณาระบุสรุปผลการประชุมก่อนบันทึก");
      return;
    }
    if (summary.length < 10) {
      setErrorMessage("สรุปผลการประชุมควรยาวอย่างน้อย 10 ตัวอักษร");
      return;
    }

    try {
      setSavingMinutesId(item.id);
      const payload = {
        status: "completed",
        meeting_summary: summary,
        meeting_decisions: decisions || null,
        action_items: actionItems || null,
        minutes_submitted_at: new Date().toISOString(),
      };

      const { error } = await updateMeetingRoomBookingWithSchemaFallback(
        supabase,
        item.id,
        payload,
        { select: "id", single: true },
      );

      if (error) throw error;

      setExpandedMinutesId("");
      setSuccessMessage("บันทึกผลประชุมเรียบร้อย");
      await fetchBookings({ silent: true });
    } catch (error) {
      console.error("Save meeting minutes error:", error);
      const message = String(error?.message || "");
      if (message.includes("row-level security")) {
        setErrorMessage("ไม่มีสิทธิ์แก้ไขรายการนี้ โปรดติดต่อผู้ดูแลระบบ");
      } else {
        setErrorMessage("บันทึกผลประชุมไม่สำเร็จ กรุณาลองใหม่");
      }
    } finally {
      setSavingMinutesId("");
    }
  };

  return (
    <div className="app-theme app-page-bg min-h-screen px-4 py-6 text-slate-800 selection:bg-blue-100 antialiased sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="app-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="app-btn-secondary inline-flex items-center gap-2"
            >
              <ArrowLeft size={15} />
              กลับ Dashboard
            </button>
            <button
              type="button"
              onClick={() => fetchBookings()}
              className="app-btn-secondary inline-flex items-center gap-2"
            >
              <RefreshCw size={15} />
              รีเฟรช
            </button>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="rounded-xl bg-[var(--brand-soft)] p-3 text-[var(--brand-primary)]">
              <CalendarDays size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Meeting Room Booking</h1>
              <p className="mt-1 text-sm text-slate-600">
                จองห้องประชุม ติดตามสถานะ และบันทึกผลประชุมให้ครบ workflow องค์กร
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">
                  <ShieldCheck size={12} />
                  สิทธิ์แก้ไข: เจ้าของรายการ / IT Support / Admin
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-semibold">
                  บทบาทปัจจุบัน: {currentUserRole}
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="app-surface p-4">
            <p className="text-xs font-bold text-slate-500">รอประชุม</p>
            <p className="mt-1 text-2xl font-black text-sky-700">{bookingStats.upcoming}</p>
          </div>
          <div className="app-surface p-4">
            <p className="text-xs font-bold text-slate-500">กำลังประชุม</p>
            <p className="mt-1 text-2xl font-black text-amber-700">{bookingStats.inProgress}</p>
          </div>
          <div className="app-surface p-4">
            <p className="text-xs font-bold text-slate-500">รอบันทึกผล</p>
            <p className="mt-1 text-2xl font-black text-violet-700">{bookingStats.pendingMinutes}</p>
          </div>
          <div className="app-surface p-4">
            <p className="text-xs font-bold text-slate-500">Completed</p>
            <p className="mt-1 text-2xl font-black text-emerald-700">{bookingStats.completed}</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.35fr]">
          <section className="app-surface p-5">
            <h2 className="text-base font-black text-slate-900">สร้างรายการจอง</h2>
            <p className="mt-1 text-xs text-slate-500">
              มาตรฐานแนะนำ: ระบุหัวข้อให้ชัด, ตั้งเวลาจริง, และบันทึกผลประชุมหลังจบงาน
            </p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">
                  หัวข้อการประชุม
                </label>
                <input
                  value={form.title}
                  maxLength={TITLE_MAX_LENGTH}
                  onChange={(event) => handleFormChange("title", event.target.value)}
                  className="app-input"
                  placeholder="เช่น Weekly IT Sync"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  {form.title.length}/{TITLE_MAX_LENGTH}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">วันที่</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => handleFormChange("date", event.target.value)}
                    className="app-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">ห้องประชุม</label>
                  <select
                    value={form.room}
                    onChange={(event) => handleFormChange("room", event.target.value)}
                    className="app-input"
                  >
                    {ROOM_OPTIONS.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">เวลาเริ่ม</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) => handleFormChange("startTime", event.target.value)}
                    className="app-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">เวลาสิ้นสุด</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) => handleFormChange("endTime", event.target.value)}
                    className="app-input"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">
                  ผู้จอง / ทีมที่จอง
                </label>
                <input
                  value={form.bookedBy}
                  maxLength={BOOKER_MAX_LENGTH}
                  onChange={(event) => handleFormChange("bookedBy", event.target.value)}
                  className="app-input"
                  placeholder="เช่น IT Team, HR Team"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  {form.bookedBy.length}/{BOOKER_MAX_LENGTH}
                </p>
              </div>

              {errorMessage && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  {successMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="app-btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save size={15} />
                {saving ? "กำลังบันทึก..." : "บันทึกรายการจอง"}
              </button>
            </form>
          </section>

          <section className="app-surface p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900">รายการประชุมและบันทึกผล</h2>
                <p className="mt-1 text-xs text-slate-500">
                  ทั้งหมด {bookingRows.length.toLocaleString("th-TH")} รายการ (ย้อนหลัง {LOOKBACK_DAYS} วัน + อนาคต)
                </p>
              </div>
            </div>

            {bookingStats.pendingMinutes > 0 && (
              <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
                <p className="text-xs font-bold text-violet-700">
                  มีประชุมที่ยังไม่บันทึกผล {bookingStats.pendingMinutes} รายการ
                </p>
              </div>
            )}

            {overlapWarnings.length > 0 && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                <p className="text-xs font-bold text-rose-700">
                  พบรายการจองเวลาทับกัน {overlapWarnings.length} จุด (ระบบกำลังกันซ้ำ)
                </p>
                <div className="mt-1 space-y-1">
                  {overlapWarnings.slice(0, 3).map((warning) => (
                    <p key={warning.key} className="text-[11px] text-rose-700">
                      {warning.roomName} • {formatDisplayDate(warning.bookingDate)} •{" "}
                      {String(warning.current.start_time || "").slice(0, 5)}-
                      {String(warning.current.end_time || "").slice(0, 5)} ซ้อนกับ{" "}
                      {String(warning.next.start_time || "").slice(0, 5)}-
                      {String(warning.next.end_time || "").slice(0, 5)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-border)] border-t-[var(--brand-primary)]" />
                </div>
              )}

              {!loading && bookingsError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  {bookingsError}
                </div>
              )}

              {!loading && !bookingsError && bookingRows.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-soft)] p-6 text-center text-sm text-slate-500">
                  ยังไม่มีรายการจองห้องประชุม
                </div>
              )}

              {!loading && !bookingsError && bookingRows.map((item) => {
                const canManage = canManageBooking(item);
                const isMinutesOpen = expandedMinutesId === item.id;
                const draft = minutesDrafts[item.id] || createMinutesDraft(item);

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[var(--brand-border)] hover:bg-[var(--brand-soft)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-black text-slate-900">
                            {item.title || "ไม่ระบุหัวข้อ"}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${item.lifecycle.badgeClass}`}
                          >
                            {item.lifecycle.label}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                            <DoorOpen size={12} />
                            {item.room_name}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                            <CalendarDays size={12} />
                            {formatDisplayDate(item.booking_date)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                            <Clock3 size={12} />
                            {String(item.start_time || "").slice(0, 5)} - {String(item.end_time || "").slice(0, 5)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                            <User size={12} />
                            {item.booked_by || "ไม่ระบุผู้จอง"}
                          </span>
                        </div>
                        {!canManage && (
                          <p className="mt-2 text-[11px] font-semibold text-slate-500">
                            คุณมีสิทธิ์ดูรายการนี้เท่านั้น
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {canManage && item.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => (isMinutesOpen ? setExpandedMinutesId("") : openMinutesEditor(item))}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            <ClipboardList size={13} />
                            {item.status === "completed" ? "แก้ไข Minutes" : "บันทึกผลประชุม"}
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-100"
                            aria-label="ลบรายการจอง"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {(item.meeting_summary || item.meeting_decisions || item.action_items) && (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                        <div className="mb-2 flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 size={14} />
                          <p className="text-xs font-bold">บันทึกผลประชุม</p>
                        </div>
                        {item.meeting_summary && (
                          <div className="mb-2">
                            <p className="text-[11px] font-semibold text-emerald-700">สรุป</p>
                            <p className="whitespace-pre-line text-xs text-emerald-800">
                              {item.meeting_summary}
                            </p>
                          </div>
                        )}
                        {item.meeting_decisions && (
                          <div className="mb-2">
                            <p className="text-[11px] font-semibold text-emerald-700">มติ/การตัดสินใจ</p>
                            <p className="whitespace-pre-line text-xs text-emerald-800">
                              {item.meeting_decisions}
                            </p>
                          </div>
                        )}
                        {item.action_items && (
                          <div>
                            <p className="text-[11px] font-semibold text-emerald-700">Action Items</p>
                            <p className="whitespace-pre-line text-xs text-emerald-800">
                              {item.action_items}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {isMinutesOpen && canManage && (
                      <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
                        <div className="mb-2 flex items-center gap-1 text-indigo-700">
                          <FileText size={14} />
                          <p className="text-xs font-bold">บันทึกผลการประชุม (Minutes)</p>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-600">
                              สรุปผลประชุม <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                              rows={3}
                              value={draft.summary}
                              maxLength={MINUTES_MAX_LENGTH}
                              onChange={(event) => handleMinutesFieldChange(item.id, "summary", event.target.value)}
                              className="app-input min-h-[88px] resize-y"
                              placeholder="สรุปผลประชุมโดยย่อ เช่น ผลลัพธ์หลักที่ตกลงร่วมกัน"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-600">
                              มติ/การตัดสินใจ
                            </label>
                            <textarea
                              rows={2}
                              value={draft.decisions}
                              maxLength={MINUTES_MAX_LENGTH}
                              onChange={(event) => handleMinutesFieldChange(item.id, "decisions", event.target.value)}
                              className="app-input min-h-[70px] resize-y"
                              placeholder="เช่น อนุมัติแผน, เลื่อนกำหนดส่ง"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-600">
                              Action Items
                            </label>
                            <textarea
                              rows={3}
                              value={draft.actionItems}
                              maxLength={MINUTES_MAX_LENGTH}
                              onChange={(event) => handleMinutesFieldChange(item.id, "actionItems", event.target.value)}
                              className="app-input min-h-[88px] resize-y"
                              placeholder={"ระบุงานต่อเนื่อง เช่น\n- ผู้รับผิดชอบ / งาน / กำหนดส่ง"}
                            />
                          </div>

                          <div className="flex flex-wrap justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setExpandedMinutesId("")}
                              className="app-btn-secondary"
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveMinutes(item)}
                              disabled={savingMinutesId === item.id}
                              className="app-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                            >
                              <Save size={14} />
                              {savingMinutesId === item.id ? "กำลังบันทึก..." : "บันทึกผลประชุม"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoomBooking;
