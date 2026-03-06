import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  DoorOpen,
  RefreshCw,
  Save,
  Trash2,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "../lib/supabaseClient";

const ROOM_OPTIONS = ["Room A", "Room B", "Room C", "Room D"];

const createDefaultForm = () => ({
  date: format(new Date(), "yyyy-MM-dd"),
  startTime: "09:00",
  endTime: "10:00",
  room: ROOM_OPTIONS[0],
  title: "",
  bookedBy: "",
});

const parseDateTime = (date, time) => new Date(`${date}T${time}:00`);

const MeetingRoomBooking = () => {
  const navigate = useNavigate();
  const channelRef = useRef(null);

  const [form, setForm] = useState(createDefaultForm);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");

  const fetchBookings = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const { data, error } = await supabase
        .from("meeting_room_bookings")
        .select("*")
        .gte("booking_date", format(new Date(), "yyyy-MM-dd"))
        .neq("status", "cancelled")
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setBookings(data || []);
      setBookingsError("");
    } catch (error) {
      console.error("Load meeting room bookings error:", error);
      setBookingsError("ไม่สามารถโหลดข้อมูลการจองห้องประชุมได้");
      setBookings([]);
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
          .select("full_name")
          .eq("id", session.user.id)
          .maybeSingle();

        const resolvedName = profileData?.full_name || fallbackName;
        if (!mounted) return;

        setCurrentUserName(resolvedName);
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
            }
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

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (!form.title.trim()) {
      setErrorMessage("กรุณาระบุหัวข้อการประชุม");
      return;
    }
    if (!form.bookedBy.trim()) {
      setErrorMessage("กรุณาระบุชื่อผู้จองหรือทีมที่จอง");
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

    const hasConflict = bookings.some((item) => {
      if (item.room_name !== form.room || item.booking_date !== form.date) return false;
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
      const { error } = await supabase.from("meeting_room_bookings").insert({
        room_name: form.room,
        title: form.title.trim(),
        booked_by: form.bookedBy.trim(),
        booking_date: form.date,
        start_time: form.startTime,
        end_time: form.endTime,
        status: "confirmed",
      });

      if (error) throw error;

      setForm((prev) => ({
        ...createDefaultForm(),
        bookedBy: currentUserName || prev.bookedBy || "",
      }));
      setErrorMessage("");
      await fetchBookings({ silent: true });
    } catch (error) {
      console.error("Create booking error:", error);
      setErrorMessage("บันทึกรายการจองไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bookingId) => {
    const accepted = window.confirm("ต้องการลบรายการจองนี้ใช่หรือไม่?");
    if (!accepted) return;

    const { error } = await supabase.from("meeting_room_bookings").delete().eq("id", bookingId);
    if (!error) {
      await fetchBookings({ silent: true });
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
              <h1 className="text-2xl font-black text-slate-900">จองห้องประชุม</h1>
              <p className="mt-1 text-sm text-slate-600">
                บันทึกรายการจองห้องประชุมและซิงก์สถานะขึ้น Dashboard แบบเรียลไทม์
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.25fr]">
          <section className="app-surface p-5">
            <h2 className="text-base font-black text-slate-900">สร้างรายการจอง</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">หัวข้อการประชุม</label>
                <input
                  value={form.title}
                  onChange={(event) => handleFormChange("title", event.target.value)}
                  className="app-input"
                  placeholder="เช่น Weekly IT Sync"
                />
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
                <label className="mb-1 block text-xs font-bold text-slate-500">ผู้จอง / ทีมที่จอง</label>
                <input
                  value={form.bookedBy}
                  onChange={(event) => handleFormChange("bookedBy", event.target.value)}
                  className="app-input"
                  placeholder="เช่น IT Team, HR Team"
                />
              </div>

              {errorMessage && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  {errorMessage}
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
            <h2 className="text-base font-black text-slate-900">ตารางการจอง</h2>
            <p className="mt-1 text-xs text-slate-500">
              ทั้งหมด {sortedBookings.length.toLocaleString("th-TH")} รายการ
            </p>

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

              {!loading && !bookingsError && sortedBookings.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-soft)] p-6 text-center text-sm text-slate-500">
                  ยังไม่มีรายการจองห้องประชุม
                </div>
              )}

              {!loading && !bookingsError && sortedBookings.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[var(--brand-border)] hover:bg-[var(--brand-soft)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-slate-900">{item.title || "ไม่ระบุหัวข้อ"}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          <DoorOpen size={12} />
                          {item.room_name}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          <CalendarDays size={12} />
                          {new Date(item.booking_date).toLocaleDateString("th-TH")}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          <Clock3 size={12} />
                          {String(item.start_time || "").slice(0, 5)} - {String(item.end_time || "").slice(0, 5)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          <User size={12} />
                          {item.booked_by || "ไม่ระบุผู้จอง"}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-semibold ${item.status === "confirmed" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                          {item.status === "confirmed" ? "Booked" : item.status}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-100"
                      aria-label="ลบรายการจอง"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoomBooking;
