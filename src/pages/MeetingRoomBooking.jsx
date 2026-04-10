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
import { useScopedI18n } from "../i18n/useScopedI18n";
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

const MEETING_ROOM_BOOKING_TRANSLATIONS = {
  th: {
    header: {
      title: "Meeting Room Booking",
      subtitle: "จองห้องประชุม ติดตามสถานะ และบันทึกผลประชุมให้ครบ workflow องค์กร",
      permission: "สิทธิ์แก้ไข: เจ้าของรายการ / IT Support / Admin",
      currentRole: "บทบาทปัจจุบัน",
    },
    stats: {
      upcoming: "รอประชุม",
      inProgress: "กำลังประชุม",
      pendingMinutes: "รอบันทึกผล",
      completed: "เสร็จสิ้น",
    },
    lifecycle: {
      cancelled: "ยกเลิก",
      completed: "เสร็จสิ้น",
      inProgress: "กำลังประชุม",
      pendingMinutes: "รอบันทึกผล",
      upcoming: "รอประชุม",
    },
    roles: {
      user: "ผู้ใช้งาน",
      admin: "Admin",
      itSupport: "IT Support",
    },
    messages: {
      loadFailed: "ไม่สามารถโหลดข้อมูลการจองห้องประชุมได้",
      titleRequired: "กรุณาระบุหัวข้อการประชุม",
      titleMinLength: "หัวข้อการประชุมควรยาวอย่างน้อย 3 ตัวอักษร",
      bookerRequired: "กรุณาระบุชื่อผู้จองหรือทีมที่จอง",
      noPastBooking: "ระบบไม่อนุญาตให้สร้างการจองย้อนหลัง",
      invalidDateTime: "รูปแบบวันเวลาไม่ถูกต้อง",
      invalidTimeRange: "เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด",
      bookingConflict: "ช่วงเวลานี้มีการจองห้องดังกล่าวแล้ว",
      bookingServerConflict: "ช่วงเวลานี้ถูกจองไปแล้วจากบัญชีอื่น กรุณาเลือกเวลาใหม่",
      createSuccess: "บันทึกรายการจองสำเร็จ",
      duplicateSlot: "ช่วงเวลานี้ถูกจองซ้ำ กรุณาเลือกเวลาใหม่",
      createPermissionDenied: "ไม่มีสิทธิ์สร้างรายการจอง โปรดติดต่อผู้ดูแลระบบ",
      createFailed: "บันทึกรายการจองไม่สำเร็จ กรุณาลองใหม่",
      deletePermissionDenied: "คุณไม่มีสิทธิ์ลบรายการจองนี้",
      deleteConfirm: "ต้องการลบรายการจองนี้ใช่หรือไม่?",
      deleteFailed: "ลบรายการไม่สำเร็จ กรุณาลองใหม่",
      deleteSuccess: "ลบรายการจองเรียบร้อย",
      minutesPermissionDenied: "คุณไม่มีสิทธิ์บันทึกผลประชุมของรายการนี้",
      minutesSummaryRequired: "กรุณาระบุสรุปผลการประชุมก่อนบันทึก",
      minutesSummaryMinLength: "สรุปผลการประชุมควรยาวอย่างน้อย 10 ตัวอักษร",
      minutesSuccess: "บันทึกผลประชุมเรียบร้อย",
      minutesUpdatePermissionDenied: "ไม่มีสิทธิ์แก้ไขรายการนี้ โปรดติดต่อผู้ดูแลระบบ",
      minutesFailed: "บันทึกผลประชุมไม่สำเร็จ กรุณาลองใหม่",
    },
    form: {
      title: "สร้างรายการจอง",
      subtitle: "มาตรฐานแนะนำ: ระบุหัวข้อให้ชัด, ตั้งเวลาจริง, และบันทึกผลประชุมหลังจบงาน",
      meetingTitle: "หัวข้อการประชุม",
      meetingTitlePlaceholder: "เช่น Weekly IT Sync",
      date: "วันที่",
      room: "ห้องประชุม",
      startTime: "เวลาเริ่ม",
      endTime: "เวลาสิ้นสุด",
      bookedBy: "ผู้จอง / ทีมที่จอง",
      bookedByPlaceholder: "เช่น IT Team, HR Team",
      save: "บันทึกรายการจอง",
      saving: "กำลังบันทึก...",
    },
    list: {
      title: "รายการประชุมและบันทึกผล",
      summary: "ทั้งหมด {{count}} รายการ (ย้อนหลัง {{days}} วัน + อนาคต)",
      pendingMinutes: "มีประชุมที่ยังไม่บันทึกผล {{count}} รายการ",
      overlaps: "พบรายการจองเวลาทับกัน {{count}} จุด (ระบบกำลังกันซ้ำ)",
      overlapWith: "ซ้อนกับ",
      empty: "ยังไม่มีรายการจองห้องประชุม",
      untitled: "ไม่ระบุหัวข้อ",
      unknownBooker: "ไม่ระบุผู้จอง",
      readOnly: "คุณมีสิทธิ์ดูรายการนี้เท่านั้น",
      addMinutes: "บันทึกผลประชุม",
      editMinutes: "แก้ไข Minutes",
      deleteAria: "ลบรายการจอง",
      savedMinutes: "บันทึกผลประชุม",
      summaryLabel: "สรุป",
      decisionsLabel: "มติ/การตัดสินใจ",
      actionItemsLabel: "Action Items",
      editorTitle: "บันทึกผลการประชุม (Minutes)",
      minutesSummary: "สรุปผลประชุม",
      minutesSummaryPlaceholder: "สรุปผลประชุมโดยย่อ เช่น ผลลัพธ์หลักที่ตกลงร่วมกัน",
      decisions: "มติ/การตัดสินใจ",
      decisionsPlaceholder: "เช่น อนุมัติแผน, เลื่อนกำหนดส่ง",
      actionItems: "Action Items",
      actionItemsPlaceholder: "ระบุงานต่อเนื่อง เช่น\n- ผู้รับผิดชอบ / งาน / กำหนดส่ง",
      cancel: "ยกเลิก",
      saveMinutes: "บันทึกผลประชุม",
      savingMinutes: "กำลังบันทึก...",
    },
  },
  en: {
    header: {
      title: "Meeting Room Booking",
      subtitle: "Book meeting rooms, track status, and save meeting minutes in one workflow.",
      permission: "Edit permission: owner / IT Support / Admin",
      currentRole: "Current role",
    },
    stats: {
      upcoming: "Upcoming",
      inProgress: "In Progress",
      pendingMinutes: "Pending Minutes",
      completed: "Completed",
    },
    lifecycle: {
      cancelled: "Cancelled",
      completed: "Completed",
      inProgress: "In Progress",
      pendingMinutes: "Pending Minutes",
      upcoming: "Upcoming",
    },
    roles: {
      user: "User",
      admin: "Admin",
      itSupport: "IT Support",
    },
    messages: {
      loadFailed: "Unable to load meeting room bookings.",
      titleRequired: "Please enter the meeting title.",
      titleMinLength: "The meeting title must be at least 3 characters long.",
      bookerRequired: "Please enter the booker or team name.",
      noPastBooking: "Backdated bookings are not allowed.",
      invalidDateTime: "The selected date or time is invalid.",
      invalidTimeRange: "Start time must be earlier than end time.",
      bookingConflict: "This room is already booked for the selected time.",
      bookingServerConflict: "This slot was booked by another account. Please choose a new time.",
      createSuccess: "Booking saved successfully.",
      duplicateSlot: "This time slot is already taken. Please choose another one.",
      createPermissionDenied: "You do not have permission to create bookings. Please contact the administrator.",
      createFailed: "Unable to save the booking. Please try again.",
      deletePermissionDenied: "You do not have permission to delete this booking.",
      deleteConfirm: "Do you want to delete this booking?",
      deleteFailed: "Unable to delete the booking. Please try again.",
      deleteSuccess: "Booking deleted successfully.",
      minutesPermissionDenied: "You do not have permission to save minutes for this booking.",
      minutesSummaryRequired: "Please enter the meeting summary before saving.",
      minutesSummaryMinLength: "The meeting summary must be at least 10 characters long.",
      minutesSuccess: "Meeting minutes saved successfully.",
      minutesUpdatePermissionDenied: "You do not have permission to edit this booking. Please contact the administrator.",
      minutesFailed: "Unable to save the meeting minutes. Please try again.",
    },
    form: {
      title: "Create Booking",
      subtitle: "Best practice: use a clear title, set the actual time, and save minutes after the meeting ends.",
      meetingTitle: "Meeting Title",
      meetingTitlePlaceholder: "For example: Weekly IT Sync",
      date: "Date",
      room: "Meeting Room",
      startTime: "Start Time",
      endTime: "End Time",
      bookedBy: "Booker / Team",
      bookedByPlaceholder: "For example: IT Team, HR Team",
      save: "Save Booking",
      saving: "Saving...",
    },
    list: {
      title: "Meetings and Minutes",
      summary: "{{count}} items total (past {{days}} days + future)",
      pendingMinutes: "{{count}} meetings are still waiting for minutes",
      overlaps: "{{count}} overlapping bookings found (the system is preventing duplicates)",
      overlapWith: "overlaps with",
      empty: "No meeting room bookings yet.",
      untitled: "Untitled meeting",
      unknownBooker: "Unknown booker",
      readOnly: "You can only view this booking.",
      addMinutes: "Save Minutes",
      editMinutes: "Edit Minutes",
      deleteAria: "Delete booking",
      savedMinutes: "Meeting Minutes",
      summaryLabel: "Summary",
      decisionsLabel: "Decisions",
      actionItemsLabel: "Action Items",
      editorTitle: "Meeting Minutes",
      minutesSummary: "Meeting Summary",
      minutesSummaryPlaceholder: "Write a short summary, such as the main agreed outcome.",
      decisions: "Decisions",
      decisionsPlaceholder: "For example: plan approved, deadline postponed",
      actionItems: "Action Items",
      actionItemsPlaceholder: "List follow-up tasks, for example:\n- Owner / task / due date",
      cancel: "Cancel",
      saveMinutes: "Save Minutes",
      savingMinutes: "Saving...",
    },
  },
  ko: {
    header: {
      title: "Meeting Room Booking",
      subtitle: "회의실을 예약하고 상태를 추적하며 회의록까지 한 흐름에서 관리합니다.",
      permission: "수정 권한: 예약자 / IT Support / Admin",
      currentRole: "현재 역할",
    },
    stats: {
      upcoming: "예정",
      inProgress: "회의 중",
      pendingMinutes: "회의록 대기",
      completed: "완료",
    },
    lifecycle: {
      cancelled: "취소됨",
      completed: "완료",
      inProgress: "회의 중",
      pendingMinutes: "회의록 대기",
      upcoming: "예정",
    },
    roles: {
      user: "사용자",
      admin: "Admin",
      itSupport: "IT Support",
    },
    messages: {
      loadFailed: "회의실 예약 정보를 불러올 수 없습니다.",
      titleRequired: "회의 제목을 입력해 주세요.",
      titleMinLength: "회의 제목은 최소 3자 이상이어야 합니다.",
      bookerRequired: "예약자 또는 팀 이름을 입력해 주세요.",
      noPastBooking: "과거 날짜로는 예약할 수 없습니다.",
      invalidDateTime: "날짜 또는 시간 형식이 올바르지 않습니다.",
      invalidTimeRange: "시작 시간은 종료 시간보다 빨라야 합니다.",
      bookingConflict: "선택한 시간에 이미 예약된 회의실입니다.",
      bookingServerConflict: "다른 계정에서 이미 예약한 시간입니다. 다른 시간을 선택해 주세요.",
      createSuccess: "예약이 저장되었습니다.",
      duplicateSlot: "이미 예약된 시간대입니다. 다른 시간을 선택해 주세요.",
      createPermissionDenied: "예약을 생성할 권한이 없습니다. 관리자에게 문의해 주세요.",
      createFailed: "예약을 저장할 수 없습니다. 다시 시도해 주세요.",
      deletePermissionDenied: "이 예약을 삭제할 권한이 없습니다.",
      deleteConfirm: "이 예약을 삭제하시겠습니까?",
      deleteFailed: "예약을 삭제할 수 없습니다. 다시 시도해 주세요.",
      deleteSuccess: "예약이 삭제되었습니다.",
      minutesPermissionDenied: "이 예약의 회의록을 저장할 권한이 없습니다.",
      minutesSummaryRequired: "저장하기 전에 회의 요약을 입력해 주세요.",
      minutesSummaryMinLength: "회의 요약은 최소 10자 이상이어야 합니다.",
      minutesSuccess: "회의록이 저장되었습니다.",
      minutesUpdatePermissionDenied: "이 예약을 수정할 권한이 없습니다. 관리자에게 문의해 주세요.",
      minutesFailed: "회의록을 저장할 수 없습니다. 다시 시도해 주세요.",
    },
    form: {
      title: "예약 생성",
      subtitle: "권장 사항: 제목을 명확히 쓰고 실제 시간을 설정한 뒤 회의 후 회의록을 남기세요.",
      meetingTitle: "회의 제목",
      meetingTitlePlaceholder: "예: Weekly IT Sync",
      date: "날짜",
      room: "회의실",
      startTime: "시작 시간",
      endTime: "종료 시간",
      bookedBy: "예약자 / 팀",
      bookedByPlaceholder: "예: IT Team, HR Team",
      save: "예약 저장",
      saving: "저장 중...",
    },
    list: {
      title: "회의 목록 및 회의록",
      summary: "총 {{count}}건 (최근 {{days}}일 + 예정)",
      pendingMinutes: "회의록이 아직 없는 회의 {{count}}건",
      overlaps: "겹치는 예약 {{count}}건 발견 (중복 방지 중)",
      overlapWith: "와 겹침",
      empty: "아직 회의실 예약이 없습니다.",
      untitled: "제목 없음",
      unknownBooker: "예약자 미지정",
      readOnly: "이 예약은 조회만 가능합니다.",
      addMinutes: "회의록 저장",
      editMinutes: "회의록 수정",
      deleteAria: "예약 삭제",
      savedMinutes: "회의록",
      summaryLabel: "요약",
      decisionsLabel: "결정 사항",
      actionItemsLabel: "실행 항목",
      editorTitle: "회의록",
      minutesSummary: "회의 요약",
      minutesSummaryPlaceholder: "합의된 핵심 결과를 간단히 정리해 주세요.",
      decisions: "결정 사항",
      decisionsPlaceholder: "예: 계획 승인, 마감 연기",
      actionItems: "실행 항목",
      actionItemsPlaceholder: "후속 작업을 적어 주세요. 예:\n- 담당자 / 작업 / 마감일",
      cancel: "취소",
      saveMinutes: "회의록 저장",
      savingMinutes: "저장 중...",
    },
  },
};

const LANGUAGE_TO_LOCALE = {
  th: "th-TH",
  en: "en-US",
  ko: "ko-KR",
};

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

const formatDisplayDate = (value, language) => {
  const dateKey = extractDateKey(value);
  if (!dateKey) return "-";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(LANGUAGE_TO_LOCALE[language] || LANGUAGE_TO_LOCALE.en, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getLifecycleMeta = (item, tt) => {
  const status = String(item.status || "confirmed").toLowerCase();
  const now = new Date();
  const start = parseDateTime(item.booking_date, item.start_time);
  const end = parseDateTime(item.booking_date, item.end_time);

  if (status === "cancelled") {
    return { key: "cancelled", label: tt("lifecycle.cancelled"), badgeClass: "border-slate-200 bg-slate-100 text-slate-600" };
  }
  if (status === "completed") {
    return { key: "completed", label: tt("lifecycle.completed"), badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    if (now >= start && now <= end) {
      return { key: "in_progress", label: tt("lifecycle.inProgress"), badgeClass: "border-amber-200 bg-amber-50 text-amber-700" };
    }
    if (now > end) {
      return { key: "pending_minutes", label: tt("lifecycle.pendingMinutes"), badgeClass: "border-violet-200 bg-violet-50 text-violet-700" };
    }
  }

  return { key: "upcoming", label: tt("lifecycle.upcoming"), badgeClass: "border-sky-200 bg-sky-50 text-sky-700" };
};

const createMinutesDraft = (item) => ({
  summary: String(item?.meeting_summary || ""),
  decisions: String(item?.meeting_decisions || ""),
  actionItems: String(item?.action_items || ""),
});

const getRoleLabel = (role, tt) => {
  const key = String(role || "user").toLowerCase();
  if (key === "admin") return tt("roles.admin");
  if (key === "it_support") return tt("roles.itSupport");
  return tt("roles.user");
};

const MeetingRoomBooking = () => {
  const navigate = useNavigate();
  const channelRef = useRef(null);
  const { language, tt } = useScopedI18n(MEETING_ROOM_BOOKING_TRANSLATIONS);

  const [form, setForm] = useState(createDefaultForm);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookingsErrorKey, setBookingsErrorKey] = useState("");
  const [errorMessageKey, setErrorMessageKey] = useState("");
  const [successMessageKey, setSuccessMessageKey] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("user");
  const [overlapWarnings, setOverlapWarnings] = useState([]);
  const [expandedMinutesId, setExpandedMinutesId] = useState("");
  const [minutesDrafts, setMinutesDrafts] = useState({});
  const [savingMinutesId, setSavingMinutesId] = useState("");

  const bookingsError = bookingsErrorKey ? tt(bookingsErrorKey) : "";
  const errorMessage = errorMessageKey ? tt(errorMessageKey) : "";
  const successMessage = successMessageKey ? tt(successMessageKey) : "";

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
      setBookingsErrorKey("");
    } catch (error) {
      console.error("Load meeting room bookings error:", error);
      setBookingsErrorKey("messages.loadFailed");
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

        const fallbackName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Employee";

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
      lifecycle: getLifecycleMeta(item, tt),
    }));
  }, [sortedBookings, tt]);

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
    setErrorMessageKey("");
    setSuccessMessageKey("");
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

    if (!title) return setErrorMessageKey("messages.titleRequired");
    if (title.length < 3) return setErrorMessageKey("messages.titleMinLength");
    if (!bookedBy) return setErrorMessageKey("messages.bookerRequired");
    if (form.date < todayKey) return setErrorMessageKey("messages.noPastBooking");

    const start = parseDateTime(form.date, form.startTime);
    const end = parseDateTime(form.date, form.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setErrorMessageKey("messages.invalidDateTime");
    if (end <= start) return setErrorMessageKey("messages.invalidTimeRange");

    const hasConflict = bookingRows.some((item) => {
      if (item.status === "cancelled") return false;
      if (item.room_name !== form.room || extractDateKey(item.booking_date) !== form.date) return false;
      const existingStart = parseDateTime(item.booking_date, String(item.start_time || "").slice(0, 5));
      const existingEnd = parseDateTime(item.booking_date, String(item.end_time || "").slice(0, 5));
      return start < existingEnd && end > existingStart;
    });

    if (hasConflict) return setErrorMessageKey("messages.bookingConflict");

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

      if (serverConflict) return setErrorMessageKey("messages.bookingServerConflict");

      const { error } = await insertMeetingRoomBookingWithSchemaFallback(
        supabase,
        {
          room_name: form.room,
          title,
          booked_by: bookedBy,
          booking_date: form.date,
          start_time: form.startTime,
          end_time: form.endTime,
          status: "confirmed",
          created_by: currentUserId || null,
        },
        { select: "id", single: true },
      );

      if (error) throw error;

      setForm((prev) => ({ ...createDefaultForm(), bookedBy: currentUserName || prev.bookedBy || "" }));
      setErrorMessageKey("");
      setSuccessMessageKey("messages.createSuccess");
      await fetchBookings({ silent: true });
    } catch (error) {
      console.error("Create booking error:", error);
      const message = String(error?.message || "");
      if (message.includes("meeting_room_no_overlap")) setErrorMessageKey("messages.duplicateSlot");
      else if (message.includes("row-level security")) setErrorMessageKey("messages.createPermissionDenied");
      else setErrorMessageKey("messages.createFailed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!canManageBooking(item)) return setErrorMessageKey("messages.deletePermissionDenied");
    if (!window.confirm(tt("messages.deleteConfirm"))) return;

    const { error } = await supabase.from("meeting_room_bookings").delete().eq("id", item.id);
    if (error) {
      console.error("Delete meeting booking error:", error);
      return setErrorMessageKey("messages.deleteFailed");
    }

    setSuccessMessageKey("messages.deleteSuccess");
    await fetchBookings({ silent: true });
  };

  const openMinutesEditor = (item) => {
    if (!canManageBooking(item)) return setErrorMessageKey("messages.minutesPermissionDenied");
    ensureDraftExists(item);
    setExpandedMinutesId(item.id);
    setErrorMessageKey("");
    setSuccessMessageKey("");
  };

  const handleMinutesFieldChange = (bookingId, field, value) => {
    setMinutesDrafts((prev) => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] || createMinutesDraft({})),
        [field]: value,
      },
    }));
    setErrorMessageKey("");
    setSuccessMessageKey("");
  };

  const handleSaveMinutes = async (item) => {
    if (savingMinutesId) return;
    if (!canManageBooking(item)) return setErrorMessageKey("messages.minutesPermissionDenied");

    const draft = minutesDrafts[item.id] || createMinutesDraft(item);
    const summary = sanitizeMultiLine(draft.summary, MINUTES_MAX_LENGTH);
    const decisions = sanitizeMultiLine(draft.decisions, MINUTES_MAX_LENGTH);
    const actionItems = sanitizeMultiLine(draft.actionItems, MINUTES_MAX_LENGTH);

    if (!summary) return setErrorMessageKey("messages.minutesSummaryRequired");
    if (summary.length < 10) return setErrorMessageKey("messages.minutesSummaryMinLength");

    try {
      setSavingMinutesId(item.id);
      const { error } = await updateMeetingRoomBookingWithSchemaFallback(
        supabase,
        item.id,
        {
          status: "completed",
          meeting_summary: summary,
          meeting_decisions: decisions || null,
          action_items: actionItems || null,
          minutes_submitted_at: new Date().toISOString(),
        },
        { select: "id", single: true },
      );

      if (error) throw error;

      setExpandedMinutesId("");
      setSuccessMessageKey("messages.minutesSuccess");
      await fetchBookings({ silent: true });
    } catch (error) {
      console.error("Save meeting minutes error:", error);
      const message = String(error?.message || "");
      if (message.includes("row-level security")) setErrorMessageKey("messages.minutesUpdatePermissionDenied");
      else setErrorMessageKey("messages.minutesFailed");
    } finally {
      setSavingMinutesId("");
    }
  };

  return (
    <div className="app-theme app-page-bg app-safe-top app-safe-bottom min-h-screen px-4 py-6 text-slate-800 selection:bg-blue-100 antialiased sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="app-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => navigate("/dashboard")} className="app-btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={15} />
              {tt("common.backDashboard")}
            </button>
            <button type="button" onClick={() => fetchBookings()} className="app-btn-secondary inline-flex items-center gap-2">
              <RefreshCw size={15} />
              {tt("common.refresh")}
            </button>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="rounded-xl bg-[var(--brand-soft)] p-3 text-[var(--brand-primary)]">
              <CalendarDays size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{tt("header.title")}</h1>
              <p className="mt-1 text-sm text-slate-600">{tt("header.subtitle")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">
                  <ShieldCheck size={12} />
                  {tt("header.permission")}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-semibold">
                  {tt("header.currentRole")}: {getRoleLabel(currentUserRole, tt)}
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 max-[399px]:grid-cols-1 sm:grid-cols-4">
          <div className="app-surface p-4">
            <p className="text-xs font-bold text-slate-500">{tt("stats.upcoming")}</p>
            <p className="mt-1 text-2xl font-black text-sky-700">{bookingStats.upcoming}</p>
          </div>
          <div className="app-surface p-4">
            <p className="text-xs font-bold text-slate-500">{tt("stats.inProgress")}</p>
            <p className="mt-1 text-2xl font-black text-amber-700">{bookingStats.inProgress}</p>
          </div>
          <div className="app-surface p-4">
            <p className="text-xs font-bold text-slate-500">{tt("stats.pendingMinutes")}</p>
            <p className="mt-1 text-2xl font-black text-violet-700">{bookingStats.pendingMinutes}</p>
          </div>
          <div className="app-surface p-4">
            <p className="text-xs font-bold text-slate-500">{tt("stats.completed")}</p>
            <p className="mt-1 text-2xl font-black text-emerald-700">{bookingStats.completed}</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.35fr]">
          <section className="app-surface p-5">
            <h2 className="text-base font-black text-slate-900">{tt("form.title")}</h2>
            <p className="mt-1 text-xs text-slate-500">{tt("form.subtitle")}</p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">{tt("form.meetingTitle")}</label>
                <input value={form.title} maxLength={TITLE_MAX_LENGTH} onChange={(event) => handleFormChange("title", event.target.value)} className="app-input" placeholder={tt("form.meetingTitlePlaceholder")} />
                <p className="mt-1 text-[10px] text-slate-400">{form.title.length}/{TITLE_MAX_LENGTH}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">{tt("form.date")}</label>
                  <input type="date" value={form.date} onChange={(event) => handleFormChange("date", event.target.value)} className="app-input" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">{tt("form.room")}</label>
                  <select value={form.room} onChange={(event) => handleFormChange("room", event.target.value)} className="app-input">
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
                  <label className="mb-1 block text-xs font-bold text-slate-500">{tt("form.startTime")}</label>
                  <input type="time" value={form.startTime} onChange={(event) => handleFormChange("startTime", event.target.value)} className="app-input" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">{tt("form.endTime")}</label>
                  <input type="time" value={form.endTime} onChange={(event) => handleFormChange("endTime", event.target.value)} className="app-input" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">{tt("form.bookedBy")}</label>
                <input value={form.bookedBy} maxLength={BOOKER_MAX_LENGTH} onChange={(event) => handleFormChange("bookedBy", event.target.value)} className="app-input" placeholder={tt("form.bookedByPlaceholder")} />
                <p className="mt-1 text-[10px] text-slate-400">{form.bookedBy.length}/{BOOKER_MAX_LENGTH}</p>
              </div>

              {errorMessage && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{errorMessage}</p>}
              {successMessage && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{successMessage}</p>}

              <button type="submit" disabled={saving} className="app-btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-60">
                <Save size={15} />
                {saving ? tt("form.saving") : tt("form.save")}
              </button>
            </form>
          </section>

          <section className="app-surface p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900">{tt("list.title")}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {tt("list.summary", {
                    count: bookingRows.length.toLocaleString(LANGUAGE_TO_LOCALE[language] || LANGUAGE_TO_LOCALE.en),
                    days: LOOKBACK_DAYS,
                  })}
                </p>
              </div>
            </div>

            {bookingStats.pendingMinutes > 0 && (
              <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
                <p className="text-xs font-bold text-violet-700">{tt("list.pendingMinutes", { count: bookingStats.pendingMinutes })}</p>
              </div>
            )}

            {overlapWarnings.length > 0 && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                <p className="text-xs font-bold text-rose-700">{tt("list.overlaps", { count: overlapWarnings.length })}</p>
                <div className="mt-1 space-y-1">
                  {overlapWarnings.slice(0, 3).map((warning) => (
                    <p key={warning.key} className="text-[11px] text-rose-700">
                      {warning.roomName} • {formatDisplayDate(warning.bookingDate, language)} • {String(warning.current.start_time || "").slice(0, 5)}-
                      {String(warning.current.end_time || "").slice(0, 5)} {tt("list.overlapWith")} {String(warning.next.start_time || "").slice(0, 5)}-
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

              {!loading && bookingsError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{bookingsError}</div>}
              {!loading && !bookingsError && bookingRows.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-soft)] p-6 text-center text-sm text-slate-500">{tt("list.empty")}</div>}

              {!loading && !bookingsError && bookingRows.map((item) => {
                const canManage = canManageBooking(item);
                const isMinutesOpen = expandedMinutesId === item.id;
                const draft = minutesDrafts[item.id] || createMinutesDraft(item);

                return (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[var(--brand-border)] hover:bg-[var(--brand-soft)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-black text-slate-900">{item.title || tt("list.untitled")}</h3>
                          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${item.lifecycle.badgeClass}`}>
                            {item.lifecycle.label}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1"><DoorOpen size={12} />{item.room_name}</span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1"><CalendarDays size={12} />{formatDisplayDate(item.booking_date, language)}</span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1"><Clock3 size={12} />{String(item.start_time || "").slice(0, 5)} - {String(item.end_time || "").slice(0, 5)}</span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1"><User size={12} />{item.booked_by || tt("list.unknownBooker")}</span>
                        </div>
                        {!canManage && <p className="mt-2 text-[11px] font-semibold text-slate-500">{tt("list.readOnly")}</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        {canManage && item.status !== "cancelled" && (
                          <button type="button" onClick={() => (isMinutesOpen ? setExpandedMinutesId("") : openMinutesEditor(item))} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100">
                            <ClipboardList size={13} />
                            {item.status === "completed" ? tt("list.editMinutes") : tt("list.addMinutes")}
                          </button>
                        )}
                        {canManage && (
                          <button type="button" onClick={() => handleDelete(item)} className="rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-100" aria-label={tt("list.deleteAria")}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {(item.meeting_summary || item.meeting_decisions || item.action_items) && (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                        <div className="mb-2 flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 size={14} />
                          <p className="text-xs font-bold">{tt("list.savedMinutes")}</p>
                        </div>
                        {item.meeting_summary && <div className="mb-2"><p className="text-[11px] font-semibold text-emerald-700">{tt("list.summaryLabel")}</p><p className="whitespace-pre-line text-xs text-emerald-800">{item.meeting_summary}</p></div>}
                        {item.meeting_decisions && <div className="mb-2"><p className="text-[11px] font-semibold text-emerald-700">{tt("list.decisionsLabel")}</p><p className="whitespace-pre-line text-xs text-emerald-800">{item.meeting_decisions}</p></div>}
                        {item.action_items && <div><p className="text-[11px] font-semibold text-emerald-700">{tt("list.actionItemsLabel")}</p><p className="whitespace-pre-line text-xs text-emerald-800">{item.action_items}</p></div>}
                      </div>
                    )}

                    {isMinutesOpen && canManage && (
                      <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
                        <div className="mb-2 flex items-center gap-1 text-indigo-700">
                          <FileText size={14} />
                          <p className="text-xs font-bold">{tt("list.editorTitle")}</p>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-600">{tt("list.minutesSummary")} <span className="text-rose-500">*</span></label>
                            <textarea rows={3} value={draft.summary} maxLength={MINUTES_MAX_LENGTH} onChange={(event) => handleMinutesFieldChange(item.id, "summary", event.target.value)} className="app-input min-h-[88px] resize-y" placeholder={tt("list.minutesSummaryPlaceholder")} />
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-600">{tt("list.decisions")}</label>
                            <textarea rows={2} value={draft.decisions} maxLength={MINUTES_MAX_LENGTH} onChange={(event) => handleMinutesFieldChange(item.id, "decisions", event.target.value)} className="app-input min-h-[70px] resize-y" placeholder={tt("list.decisionsPlaceholder")} />
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-600">{tt("list.actionItems")}</label>
                            <textarea rows={3} value={draft.actionItems} maxLength={MINUTES_MAX_LENGTH} onChange={(event) => handleMinutesFieldChange(item.id, "actionItems", event.target.value)} className="app-input min-h-[88px] resize-y" placeholder={tt("list.actionItemsPlaceholder")} />
                          </div>

                          <div className="flex flex-wrap justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setExpandedMinutesId("")} className="app-btn-secondary">{tt("list.cancel")}</button>
                            <button type="button" onClick={() => handleSaveMinutes(item)} disabled={savingMinutesId === item.id} className="app-btn-primary inline-flex items-center gap-2 disabled:opacity-60">
                              <Save size={14} />
                              {savingMinutesId === item.id ? tt("list.savingMinutes") : tt("list.saveMinutes")}
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
