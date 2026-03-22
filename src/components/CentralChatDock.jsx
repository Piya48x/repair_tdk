import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCheck,
  Circle,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Smile,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const MESSAGE_LIMIT = 200;
const PRESENCE_INTERVAL_MS = 30000;
const DIRECTORY_RESYNC_INTERVAL_MS = 5 * 60 * 1000;
const PRESENCE_ONLINE_WINDOW_MS = 90 * 1000;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const SUPPORT_ROLES = new Set(["it_support", "it_manager", "admin"]);
const STICKER_TOKEN_PATTERN = /\[\[sticker:([a-z0-9_-]+)\]\]/i;
const CHAT_STICKERS = [
  { id: "thumbs-up", emoji: "👍", label: "Like" },
  { id: "party", emoji: "🎉", label: "Party" },
  { id: "love", emoji: "😍", label: "Love" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "ok", emoji: "👌", label: "OK" },
  { id: "thanks", emoji: "🙏", label: "Thanks" },
  { id: "wow", emoji: "🤩", label: "Wow" },
  { id: "rocket", emoji: "🚀", label: "Go" },
];
const CHAT_STICKER_MAP = new Map(CHAT_STICKERS.map((sticker) => [sticker.id, sticker]));

function normalizeText(value) {
  return String(value || "").trim();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeClock(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function buildStickerToken(stickerId) {
  return `[[sticker:${String(stickerId || "").trim()}]]`;
}

function parseStickerMessage(message) {
  const normalizedMessage = String(message || "");
  const match = normalizedMessage.match(STICKER_TOKEN_PATTERN);
  if (!match) return null;

  const sticker = CHAT_STICKER_MAP.get(String(match[1] || "").trim());
  if (!sticker) return null;

  const caption = normalizedMessage.replace(match[0], "").trim();
  return {
    sticker,
    caption,
    token: match[0],
  };
}

function buildAvatarFallback(name, color = "2b59b0") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || "U"))}&background=${color}&color=fff&size=96`;
}

function toAvatarUrl(avatarUrl, displayName, tone = "2b59b0") {
  return avatarUrl || buildAvatarFallback(displayName, tone);
}

function roleLabel(role) {
  const normalized = normalizeText(role).toLowerCase();
  if (normalized === "it_support") return "IT";
  if (normalized === "it_manager") return "IT Manager";
  if (normalized === "admin") return "Admin";
  if (normalized === "executive") return "Executive";
  if (normalized === "auditor") return "Auditor";
  return "User";
}

function previewForSummary(summary, currentUserId) {
  if (!summary?.last_message_id) return "เริ่มต้นแชทได้ทันที";
  const prefix = String(summary?.last_message_sender_id || "") === currentUserId ? "คุณ: " : "";
  if (summary?.last_message_type === "image") return `${prefix}ส่งรูปภาพ`;
  if (summary?.last_message_type === "file") return `${prefix}${summary?.last_message_file_name || "ส่งไฟล์"}`;
  return `${prefix}${summary?.last_message || "มีข้อความใหม่"}`;
}

function isImageMime(mimeType, fileName = "") {
  const normalizedMime = String(mimeType || "").toLowerCase();
  if (normalizedMime.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(String(fileName || ""));
}

function sanitizePathSegment(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isMissingMessengerSchema(error) {
  const code = String(error?.code || "");
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    text.includes("chat_rooms") ||
    text.includes("chat_messages") ||
    text.includes("messages") ||
    text.includes("chat_presence") ||
    text.includes("get_my_chat_room_summaries") ||
    text.includes("get_user_directory")
  );
}

function isPermissionDenied(error) {
  const code = String(error?.code || "").toUpperCase();
  const status = Number(error?.status || 0);
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    code === "42501" ||
    status === 401 ||
    status === 403 ||
    text.includes("permission denied") ||
    text.includes("forbidden") ||
    text.includes("row-level security")
  );
}

function sortMessages(messages) {
  return [...messages].sort((left, right) => {
    const leftValue = new Date(left?.created_at || 0).getTime();
    const rightValue = new Date(right?.created_at || 0).getTime();
    return leftValue - rightValue;
  });
}

function resolvePresenceStatus(lastSeenAt, nowValue = Date.now()) {
  const lastSeenValue = new Date(lastSeenAt || 0).getTime();
  if (!lastSeenValue || Number.isNaN(lastSeenValue)) return "offline";
  return nowValue - lastSeenValue <= PRESENCE_ONLINE_WINDOW_MS ? "online" : "offline";
}

function normalizeMemberRecord(member, nowValue = Date.now()) {
  const lastSeenAt = member?.last_seen_at || "";
  return {
    id: String(member?.id || ""),
    name: member?.name || "Member",
    email: member?.email || "",
    role: member?.role || "user",
    avatar_url: member?.avatar_url || "",
    status: resolvePresenceStatus(lastSeenAt, nowValue),
    last_seen_at: lastSeenAt,
  };
}

function mergeMembers(previousMembers, nextMembers) {
  const previousMap = new Map(previousMembers.map((member) => [String(member?.id || ""), member]));

  return nextMembers.map((member) => {
    const memberId = String(member?.id || "");
    const previous = previousMap.get(memberId);
    if (!previous) return member;

    if (
      previous.name === member.name &&
      previous.email === member.email &&
      previous.role === member.role &&
      previous.avatar_url === member.avatar_url &&
      previous.status === member.status &&
      previous.last_seen_at === member.last_seen_at
    ) {
      return previous;
    }

    return { ...previous, ...member };
  });
}

function compareMembers(left, right) {
  const leftLastMessage = new Date(left?.last_message_created_at || 0).getTime();
  const rightLastMessage = new Date(right?.last_message_created_at || 0).getTime();
  if (leftLastMessage !== rightLastMessage) return rightLastMessage - leftLastMessage;

  const leftUnread = Number(left?.unread_count || 0);
  const rightUnread = Number(right?.unread_count || 0);
  if (leftUnread !== rightUnread) return rightUnread - leftUnread;

  return String(left?.name || "").localeCompare(String(right?.name || ""), "th");
}

const DOCK_EDGE_GAP = 12;
const DOCK_DRAG_HOLD_MS = 180;

function isInteractiveDragTarget(target) {
  return target instanceof Element && Boolean(target.closest("button,a,input,textarea,select,label,[role='button']"));
}

function clampDockPosition(nextPosition, bounds) {
  const width = Number(bounds?.width || 0);
  const height = Number(bounds?.height || 0);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  const maxLeft = Math.max(DOCK_EDGE_GAP, viewportWidth - width - DOCK_EDGE_GAP);
  const maxTop = Math.max(DOCK_EDGE_GAP, viewportHeight - height - DOCK_EDGE_GAP);

  return {
    left: Math.min(Math.max(DOCK_EDGE_GAP, Number(nextPosition?.left || 0)), maxLeft),
    top: Math.min(Math.max(DOCK_EDGE_GAP, Number(nextPosition?.top || 0)), maxTop),
  };
}

export default function CentralChatDock({
  currentUser = null,
  openSignal = 0,
  className = "bottom-4 left-4 sm:bottom-6 sm:left-6",
  onOpenChange,
}) {
  const currentUserId = String(currentUser?.id || "");
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [members, setMembers] = useState([]);
  const [roomSummaries, setRoomSummaries] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingFilePreview, setPendingFilePreview] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [sending, setSending] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [mobileThreadVisible, setMobileThreadVisible] = useState(false);
  const [typingMemberId, setTypingMemberId] = useState("");
  const [typingMemberName, setTypingMemberName] = useState("");
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const messageListRef = useRef(null);
  const stickerPickerRef = useRef(null);
  const dockRef = useRef(null);
  const openSignalRef = useRef(openSignal);
  const selectedRoomIdRef = useRef("");
  const loadMessagesRequestRef = useRef(0);
  const typingClearTimerRef = useRef(null);
  const typingChannelRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const pendingSupportOpenRef = useRef(false);
  const dragHoldTimerRef = useRef(null);
  const dragStateRef = useRef(null);
  const launcherDragActiveRef = useRef(false);
  const [dockPosition, setDockPosition] = useState(null);
  const [isDraggingDock, setIsDraggingDock] = useState(false);
  const [presenceTick, setPresenceTick] = useState(() => Date.now());
  const dockInlineStyle = useMemo(() => {
    if (isMobileViewport) {
      if (!isOpen) {
        return { left: "0.75rem", right: "auto", transform: "none", bottom: "1rem", width: "auto" };
      }
      return { left: "0.5rem", right: "0.5rem", transform: "none", bottom: "0.75rem", width: "auto" };
    }

    if (!dockPosition) return undefined;

    return {
      left: `${dockPosition.left}px`,
      top: `${dockPosition.top}px`,
      right: "auto",
      bottom: "auto",
    };
  }, [dockPosition, isMobileViewport]);

  const summaryMap = useMemo(() => {
    const nextMap = new Map();
    roomSummaries.forEach((summary) => {
      nextMap.set(String(summary?.other_user_id || ""), summary);
    });
    return nextMap;
  }, [roomSummaries]);

  const directoryMembers = useMemo(() => {
    const normalizedSearch = normalizeText(deferredSearchQuery).toLowerCase();
    const nowValue = presenceTick || Date.now();
    return members
      .filter((member) => String(member?.id || "") !== currentUserId)
      .map((member) => {
        const summary = summaryMap.get(String(member?.id || ""));
        const lastSeenAt = member?.last_seen_at || summary?.other_user_last_seen_at || "";
        const stickerMessage = parseStickerMessage(summary?.last_message);
        const lastPreview = stickerMessage?.sticker
          ? `${stickerMessage.caption ? `Sticker · ${stickerMessage.caption}` : "Sent a sticker"}`
          : previewForSummary(summary, currentUserId);
        return {
          ...member,
          room_id: summary?.room_id || "",
          unread_count: Number(summary?.unread_count || 0),
          last_message_created_at: summary?.last_message_created_at || "",
          last_seen_at: lastSeenAt,
          status: resolvePresenceStatus(lastSeenAt, nowValue),
          last_preview: lastPreview,
        };
      })
      .filter((member) => {
        if (!normalizedSearch) return true;
        const haystack = `${member.name || ""} ${member.email || ""} ${member.role || ""}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort(compareMembers);
  }, [currentUserId, deferredSearchQuery, members, presenceTick, summaryMap]);

  const selectedMember = useMemo(
    () => directoryMembers.find((member) => String(member?.id || "") === String(selectedMemberId || "")) || null,
    [directoryMembers, selectedMemberId]
  );

  const launcherTitle = selectedMember?.name || "Messenger";
  const typingHintVisible = Boolean(typingMemberId) && String(selectedMemberId || "") === String(typingMemberId);

  const scrollToBottom = useCallback((behavior = "auto") => {
    const container = messageListRef.current;
    if (!container) return;
    if (behavior === "smooth") {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, []);

  const scrollToBottomSoon = useCallback((behavior = "auto") => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => scrollToBottom(behavior));
  }, [scrollToBottom]);

  const clearPendingFile = useCallback(() => {
    if (pendingFilePreview) {
      URL.revokeObjectURL(pendingFilePreview);
    }
    setPendingFile(null);
    setPendingFilePreview("");
  }, [pendingFilePreview]);

  const loadUserDirectory = useCallback(async ({ background = false } = {}) => {
    if (!currentUserId) return;
    if (!background) {
      setMembersLoading(true);
    }
    const { data, error: queryError } = await supabase.rpc("get_user_directory");

    if (queryError) {
      if (isMissingMessengerSchema(queryError)) {
        setNotice("ยังไม่ได้ติดตั้ง schema แชทใหม่บน Supabase");
      } else if (isPermissionDenied(queryError)) {
        setNotice("Chat permission denied. Run database/20260321_direct_messenger.sql and re-login.");
      } else {
        setError("โหลดรายชื่อผู้ใช้ไม่สำเร็จ");
      }
      if (!background) {
        setMembers([]);
        setMembersLoading(false);
      }
      return;
    }

    const normalizedMembers = (data || []).map((member) => normalizeMemberRecord(member));
    /*
      name: member?.name || "สมาชิก",

    */
    setMembers((previousMembers) => mergeMembers(previousMembers, normalizedMembers));
    if (!background) {
      setMembersLoading(false);
    }
  }, [currentUserId]);

  const applyPresenceUpdate = useCallback((payload) => {
    const row = payload?.eventType === "DELETE" ? payload.old : payload.new;
    const memberId = String(row?.user_id || "");
    if (!memberId) return;

    const nextLastSeenAt = row?.last_seen_at || "";
    const nextStatus = payload?.eventType === "DELETE"
      ? "offline"
      : resolvePresenceStatus(nextLastSeenAt);

    let foundMember = false;
    setMembers((previousMembers) => {
      let changed = false;
      const nextMembers = previousMembers.map((member) => {
        if (String(member?.id || "") !== memberId) return member;
        foundMember = true;
        if (member.last_seen_at === nextLastSeenAt && member.status === nextStatus) {
          return member;
        }

        changed = true;
        return {
          ...member,
          last_seen_at: nextLastSeenAt,
          status: nextStatus,
        };
      });

      return changed ? nextMembers : previousMembers;
    });

    if (!foundMember) {
      loadUserDirectory({ background: true });
    }
  }, [loadUserDirectory]);

  const loadRoomSummaries = useCallback(async () => {
    if (!currentUserId) return;
    const { data, error: queryError } = await supabase.rpc("get_my_chat_room_summaries");

    if (queryError && isPermissionDenied(queryError)) {
      setNotice("Chat permission denied. Run database/20260321_direct_messenger.sql and re-login.");
      setRoomSummaries([]);
      setTotalUnreadCount(0);
      return;
    }

    if (queryError) {
      if (isMissingMessengerSchema(queryError)) {
        setNotice("ยังไม่ได้ติดตั้ง schema แชทใหม่บน Supabase");
      } else {
        setError("โหลดห้องแชทไม่สำเร็จ");
      }
      setRoomSummaries([]);
      setTotalUnreadCount(0);
      return;
    }

    const nextSummaries = (data || []).map((summary) => ({
      ...summary,
      room_id: String(summary?.room_id || ""),
      other_user_id: String(summary?.other_user_id || ""),
      unread_count: Number(summary?.unread_count || 0),
    }));

    setRoomSummaries(nextSummaries);
    setTotalUnreadCount(
      nextSummaries.reduce((sum, summary) => sum + Number(summary?.unread_count || 0), 0)
    );
  }, [currentUserId]);

  const markMessagesRead = useCallback(async (roomId) => {
    if (!roomId) return;
    await supabase.rpc("mark_room_messages_read", { _room_id: Number(roomId) });
    setMessages((prev) =>
      prev.map((message) =>
        String(message?.sender_id || "") === currentUserId
          ? message
          : { ...message, read_status: true, read_at: message?.read_at || new Date().toISOString() }
      )
    );
  }, [currentUserId]);

  const loadMessages = useCallback(async (roomId) => {
    if (!roomId) {
      setMessages([]);
      return;
    }

    const requestId = Date.now();
    loadMessagesRequestRef.current = requestId;
    setMessagesLoading(true);
    setError("");
    setNotice("");

    const { data, error: queryError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(MESSAGE_LIMIT);

    if (loadMessagesRequestRef.current !== requestId) return;

    if (queryError && isPermissionDenied(queryError)) {
      setNotice("Chat permission denied. Run database/20260321_direct_messenger.sql and re-login.");
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    if (queryError) {
      if (isMissingMessengerSchema(queryError)) {
        setNotice("ยังไม่ได้ติดตั้ง schema แชทใหม่บน Supabase");
      } else {
        setError("โหลดข้อความไม่สำเร็จ");
      }
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessages(sortMessages(data || []));
    setMessagesLoading(false);
    await markMessagesRead(roomId);
    await loadRoomSummaries();
    scrollToBottomSoon("auto");
  }, [loadRoomSummaries, markMessagesRead, scrollToBottomSoon]);

  const ensureRoomForMember = useCallback(async (memberId) => {
    if (!memberId || !currentUserId) return null;
    const { data, error: queryError } = await supabase.rpc("get_or_create_chat_room", {
      _other_user_id: memberId,
    });

    if (queryError) {
      if (isMissingMessengerSchema(queryError)) {
        setNotice("ยังไม่ได้ติดตั้ง schema แชทใหม่บน Supabase");
      } else {
        setError("สร้างห้องแชทไม่สำเร็จ");
      }
      return null;
    }

    return data || null;
  }, [currentUserId]);

  const selectMember = useCallback(async (memberId, options = {}) => {
    const normalizedId = String(memberId || "");
    if (!normalizedId) return;

    setSelectedMemberId(normalizedId);
    setMobileThreadVisible(true);
    setError("");
    setNotice("");

    const existingSummary = summaryMap.get(normalizedId);
    const existingRoomId = String(existingSummary?.room_id || "");

    if (existingRoomId) {
      setSelectedRoomId(existingRoomId);
      selectedRoomIdRef.current = existingRoomId;
      await loadMessages(existingRoomId);
      return;
    }

    if (options.skipRoomCreation) {
      setSelectedRoomId("");
      selectedRoomIdRef.current = "";
      setMessages([]);
      return;
    }

    const room = await ensureRoomForMember(normalizedId);
    if (!room?.id) return;
    const roomId = String(room.id);
    setSelectedRoomId(roomId);
    selectedRoomIdRef.current = roomId;
    await loadMessages(roomId);
    await loadRoomSummaries();
  }, [ensureRoomForMember, loadMessages, loadRoomSummaries, summaryMap]);

  const chooseDefaultSupportMember = useCallback(async () => {
    const candidate = directoryMembers.find((member) =>
      SUPPORT_ROLES.has(String(member?.role || "").toLowerCase())
    );
    if (!candidate?.id) return;
    await selectMember(candidate.id);
  }, [directoryMembers, selectMember]);

  const uploadAttachment = useCallback(async (file) => {
    const safeUserId = sanitizePathSegment(currentUserId || "unknown");
    const safeName = sanitizePathSegment(file?.name || `file_${Date.now()}`);
    const filePath = `direct/${safeUserId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-files")
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("chat-files").getPublicUrl(filePath);
    return data?.publicUrl || "";
  }, [currentUserId]);

  const handleIncomingFile = useCallback((file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("ไฟล์ต้องมีขนาดไม่เกิน 20MB");
      return;
    }

    setError("");
    if (pendingFilePreview) {
      URL.revokeObjectURL(pendingFilePreview);
    }

    const preview = isImageMime(file.type, file.name) ? URL.createObjectURL(file) : "";
    setPendingFile(file);
    setPendingFilePreview(preview);
  }, [pendingFilePreview]);

  const handleSend = useCallback(async () => {
    const content = normalizeText(draft);
    if ((!content && !pendingFile) || sending || !currentUserId || !selectedMemberId) return;

    setSending(true);
    setError("");
    setNotice("");

    let roomId = String(selectedRoomIdRef.current || "");
    if (!roomId) {
      const room = await ensureRoomForMember(selectedMemberId);
      if (!room?.id) {
        setSending(false);
        return;
      }
      roomId = String(room.id);
      setSelectedRoomId(roomId);
      selectedRoomIdRef.current = roomId;
    }

    try {
      let fileUrl = null;
      let fileName = null;
      let fileMimeType = null;
      let fileSize = null;
      let messageType = "text";

      if (pendingFile) {
        fileUrl = await uploadAttachment(pendingFile);
        fileName = pendingFile.name || null;
        fileMimeType = pendingFile.type || null;
        fileSize = pendingFile.size || null;
        messageType = isImageMime(pendingFile.type, pendingFile.name) ? "image" : "file";
      }

      const payload = {
        room_id: Number(roomId),
        message: content || null,
        type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        file_mime_type: fileMimeType,
        file_size: fileSize,
      };

      const { data, error: insertError } = await supabase
      .from("chat_messages")
        .insert(payload)
        .select("*")
        .single();

      if (insertError) throw insertError;

      setDraft("");
      clearPendingFile();
      if (data) {
        setMessages((prev) => {
          if (prev.some((message) => String(message?.id || "") === String(data?.id || ""))) return prev;
          return sortMessages([...prev, data]);
        });
      }

      await loadRoomSummaries();
      scrollToBottomSoon("smooth");
    } catch (sendError) {
      if (isMissingMessengerSchema(sendError)) {
        setNotice("ยังไม่ได้ติดตั้ง schema แชทใหม่บน Supabase");
      } else if (isPermissionDenied(sendError)) {
        setNotice("Chat permission denied. Run database/20260321_direct_messenger.sql and re-login.");
      } else {
        setError("ส่งข้อความไม่สำเร็จ");
      }
    } finally {
      setSending(false);
    }
  }, [
    clearPendingFile,
    currentUserId,
    draft,
    ensureRoomForMember,
    loadRoomSummaries,
    pendingFile,
    scrollToBottom,
    scrollToBottomSoon,
    selectedMemberId,
    sending,
    uploadAttachment,
  ]);

  const handleStickerSelect = useCallback(async (stickerId) => {
    if (!selectedMember || sending || !currentUserId || !selectedMemberId) return;

    setStickerPickerOpen(false);
    setSending(true);
    setError("");
    setNotice("");

    let roomId = String(selectedRoomIdRef.current || "");
    if (!roomId) {
      const room = await ensureRoomForMember(selectedMemberId);
      if (!room?.id) {
        setSending(false);
        return;
      }
      roomId = String(room.id);
      setSelectedRoomId(roomId);
      selectedRoomIdRef.current = roomId;
    }

    try {
      const payload = {
        room_id: Number(roomId),
        message: buildStickerToken(stickerId),
        type: "text",
        file_url: null,
        file_name: null,
        file_mime_type: null,
        file_size: null,
      };

      const { data, error: insertError } = await supabase
        .from("chat_messages")
        .insert(payload)
        .select("*")
        .single();

      if (insertError) throw insertError;

      if (data) {
        setMessages((prev) => {
          if (prev.some((message) => String(message?.id || "") === String(data?.id || ""))) return prev;
          return sortMessages([...prev, data]);
        });
      }

      await loadRoomSummaries();
      scrollToBottomSoon("smooth");
    } catch (sendError) {
      if (isMissingMessengerSchema(sendError)) {
        setNotice("à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸•à¸´à¸”à¸•à¸±à¹‰à¸‡ schema à¹à¸Šà¸—à¹ƒà¸«à¸¡à¹ˆà¸šà¸™ Supabase");
      } else if (isPermissionDenied(sendError)) {
        setNotice("Chat permission denied. Run database/20260321_direct_messenger.sql and re-login.");
      } else {
        setError("à¸ªà¹ˆà¸‡à¸ªà¸•à¸´à¹Šà¸à¹€à¸à¸­à¸£à¹Œà¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ");
      }
    } finally {
      setSending(false);
    }
  }, [
    currentUserId,
    ensureRoomForMember,
    loadRoomSummaries,
    scrollToBottomSoon,
    selectedMember,
    selectedMemberId,
    sending,
  ]);

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleComposerPaste = useCallback((event) => {
    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const imageItem = clipboardItems.find((item) => String(item?.type || "").startsWith("image/"));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    handleIncomingFile(file);
  }, [handleIncomingFile]);

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    handleIncomingFile(file);
  };

  const handleDockPointerDown = useCallback(
    (event, options = {}) => {
      const allowInteractiveTarget = Boolean(options?.allowInteractiveTarget);
      if (
        isMobileViewport ||
        event.button !== 0 ||
        event.defaultPrevented ||
        (!allowInteractiveTarget && isInteractiveDragTarget(event.target))
      ) {
        return;
      }

      const dockNode = dockRef.current || event.currentTarget;
      if (!dockNode) return;

      const rect = dockNode.getBoundingClientRect();
      const startLeft = rect.left;
      const startTop = rect.top;
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      if (dragHoldTimerRef.current) {
        clearTimeout(dragHoldTimerRef.current);
      }

      dragStateRef.current = {
        pointerId: event.pointerId,
        offsetX,
        offsetY,
        width: rect.width,
        height: rect.height,
        startLeft,
        startTop,
        source: allowInteractiveTarget ? "launcher" : "dock",
      };

      dragHoldTimerRef.current = window.setTimeout(() => {
        const activeState = dragStateRef.current;
        if (!activeState || activeState.pointerId !== event.pointerId) return;
        dragHoldTimerRef.current = null;
        if (activeState.source === "launcher") {
          launcherDragActiveRef.current = true;
        }
        const nextPosition = clampDockPosition(
          { left: activeState.startLeft, top: activeState.startTop },
          { width: activeState.width, height: activeState.height }
        );
        setDockPosition(nextPosition);
        setIsDraggingDock(true);
      }, DOCK_DRAG_HOLD_MS);

      const cancelPendingDrag = (cancelEvent) => {
        const activeState = dragStateRef.current;
        const samePointer = !activeState || activeState.pointerId === cancelEvent?.pointerId;
        if (!samePointer) return;

        if (dragHoldTimerRef.current) {
          clearTimeout(dragHoldTimerRef.current);
          dragHoldTimerRef.current = null;
          dragStateRef.current = null;
          launcherDragActiveRef.current = false;
          return;
        }

        dragStateRef.current = null;
      };

      window.addEventListener("pointerup", cancelPendingDrag, { once: true });
      window.addEventListener("pointercancel", cancelPendingDrag, { once: true });

      if (!allowInteractiveTarget) {
        event.preventDefault();
      }
    },
    [isMobileViewport]
  );

  const handleLauncherClick = useCallback(() => {
    if (launcherDragActiveRef.current) {
      launcherDragActiveRef.current = false;
      return;
    }
    setIsOpen(true);
    setIsCollapsed(false);
  }, []);

  useEffect(() => {
    if (!isDraggingDock) return undefined;

    const finishDragging = () => {
      setIsDraggingDock(false);
      dragStateRef.current = null;
      if (dragHoldTimerRef.current) {
        clearTimeout(dragHoldTimerRef.current);
        dragHoldTimerRef.current = null;
      }
    };

    const handlePointerMove = (event) => {
      const activeState = dragStateRef.current;
      if (!activeState) return;
      event.preventDefault();

      const nextPosition = clampDockPosition(
        {
          left: event.clientX - activeState.offsetX,
          top: event.clientY - activeState.offsetY,
        },
        { width: activeState.width, height: activeState.height }
      );

      setDockPosition(nextPosition);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishDragging);
    window.addEventListener("pointercancel", finishDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDragging);
      window.removeEventListener("pointercancel", finishDragging);
    };
  }, [isDraggingDock]);

  useEffect(() => {
    if (!dockPosition || typeof window === "undefined") return undefined;

    const handleResize = () => {
      const dockNode = dockRef.current;
      if (!dockNode) return;
      const rect = dockNode.getBoundingClientRect();
      setDockPosition((current) => (current ? clampDockPosition(current, rect) : current));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dockPosition]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const onChange = (event) => {
      setIsMobileViewport(event.matches);
    };
    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    selectedRoomIdRef.current = String(selectedRoomId || "");
  }, [selectedRoomId]);

  useEffect(() => {
    if (!currentUserId) return;
    loadUserDirectory();
    loadRoomSummaries();
  }, [currentUserId, loadRoomSummaries, loadUserDirectory]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const interval = window.setInterval(() => {
      setPresenceTick(Date.now());
    }, PRESENCE_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (selectedMemberId) return;
    const firstRecentMemberId = String(roomSummaries[0]?.other_user_id || "");
    if (!firstRecentMemberId) return;
    setSelectedMemberId(firstRecentMemberId);
    setSelectedRoomId(String(roomSummaries[0]?.room_id || ""));
    selectedRoomIdRef.current = String(roomSummaries[0]?.room_id || "");
  }, [roomSummaries, selectedMemberId]);

  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      return;
    }
    loadMessages(selectedRoomId);
  }, [loadMessages, selectedRoomId]);

  useEffect(() => {
    if (!isOpen || !selectedRoomId || !messages.length) return;
    const timer = window.setTimeout(() => scrollToBottom("auto"), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, messages.length, scrollToBottom, selectedRoomId]);

  useEffect(() => {
    if (openSignalRef.current === openSignal) return;
    openSignalRef.current = openSignal;
    setIsOpen(true);
    setIsCollapsed(false);
    pendingSupportOpenRef.current = true;
  }, [openSignal]);

  useEffect(() => {
    if (!pendingSupportOpenRef.current) return;
    if (!directoryMembers.length) return;
    pendingSupportOpenRef.current = false;
    chooseDefaultSupportMember();
  }, [chooseDefaultSupportMember, directoryMembers]);

  useEffect(() => {
    if (!stickerPickerOpen) return undefined;

    const handlePointerDown = (event) => {
      if (stickerPickerRef.current?.contains(event.target)) return;
      setStickerPickerOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [stickerPickerOpen]);

  useEffect(() => {
    setStickerPickerOpen(false);
  }, [selectedMemberId]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const syncPresence = async () => {
      const { error: presenceError } = await supabase.rpc("touch_chat_presence");
      if (!presenceError) return;
      if (isMissingMessengerSchema(presenceError)) {
        setNotice("Chat schema is missing on Supabase. Run database/20260321_direct_messenger.sql.");
        return;
      }
      if (isMissingMessengerSchema(presenceError)) {
        setNotice("à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸•à¸´à¸”à¸•à¸±à¹‰à¸‡ schema à¹à¸Šà¸—à¹ƒà¸«à¸¡à¹ˆà¸šà¸™ Supabase");
        return;
      }
      if (isPermissionDenied(presenceError)) {
        setNotice("Chat permission denied. Run database/20260321_direct_messenger.sql and re-login.");
      }
    };

    syncPresence();

    const interval = window.setInterval(syncPresence, PRESENCE_INTERVAL_MS);
    const handleFocus = () => {
      syncPresence();
    };
    const handleVisibility = () => {
      if (!document.hidden) syncPresence();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const resyncDirectory = () => {
      loadUserDirectory({ background: true });
    };

    const interval = window.setInterval(resyncDirectory, DIRECTORY_RESYNC_INTERVAL_MS);
    window.addEventListener("focus", resyncDirectory);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", resyncDirectory);
    };
  }, [currentUserId, loadUserDirectory]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const channel = supabase
      .channel(`messenger-db-${currentUserId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        async (payload) => {
          const row = payload.eventType === "DELETE" ? payload.old : payload.new;
          const roomId = String(row?.room_id || "");
          const senderId = String(row?.sender_id || "");
          const isIncoming = senderId && senderId !== currentUserId;

          if (payload.eventType === "INSERT" && roomId && roomId === String(selectedRoomIdRef.current || "")) {
            setMessages((prev) => {
              if (prev.some((message) => String(message?.id || "") === String(row?.id || ""))) return prev;
              return sortMessages([...prev, row]);
            });
            if (isIncoming) {
              await markMessagesRead(roomId);
            }
          } else if (payload.eventType === "UPDATE" && roomId && roomId === String(selectedRoomIdRef.current || "")) {
            setMessages((prev) =>
              prev.map((message) =>
                String(message?.id || "") === String(row?.id || "") ? { ...message, ...row } : message
              )
            );
          }

          await loadRoomSummaries();

          if (isIncoming) {
            setIsOpen(true);
            setIsCollapsed(false);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        () => {
          loadRoomSummaries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_presence" },
        (payload) => {
          applyPresenceUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applyPresenceUpdate, currentUserId, loadRoomSummaries, markMessagesRead]);

  useEffect(() => {
    if (!selectedRoomId || !currentUserId) return undefined;

    const channel = supabase
      .channel(`messenger-typing-${selectedRoomId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const roomId = String(payload?.roomId || "");
        const memberId = String(payload?.memberId || "");
        if (roomId !== String(selectedRoomId) || !memberId || memberId === currentUserId) return;

        setTypingMemberId(memberId);
        setTypingMemberName(payload?.memberName || "สมาชิก");

        if (typingClearTimerRef.current) {
          clearTimeout(typingClearTimerRef.current);
        }

        typingClearTimerRef.current = setTimeout(() => {
          setTypingMemberId("");
          setTypingMemberName("");
        }, 1600);
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      if (typingClearTimerRef.current) {
        clearTimeout(typingClearTimerRef.current);
      }
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [currentUserId, selectedRoomId]);

  useEffect(() => {
    const content = normalizeText(draft);
    if (!content || !selectedRoomId || !typingChannelRef.current) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current < 700) return;
    lastTypingSentRef.current = now;

    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        roomId: String(selectedRoomId),
        memberId: currentUserId,
        memberName: currentUser?.name || currentUser?.full_name || "สมาชิก",
      },
    });
  }, [currentUser?.full_name, currentUser?.name, currentUserId, draft, selectedRoomId]);

  useEffect(() => {
    if (!isOpen || isCollapsed) return;
    setTotalUnreadCount(
      roomSummaries.reduce((sum, summary) => sum + Number(summary?.unread_count || 0), 0)
    );
  }, [isCollapsed, isOpen, roomSummaries]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    return () => {
      if (pendingFilePreview) {
        URL.revokeObjectURL(pendingFilePreview);
      }
      if (typingClearTimerRef.current) {
        clearTimeout(typingClearTimerRef.current);
      }
    };
  }, [pendingFilePreview]);

  if (!currentUserId) return null;

  if (!isOpen) {
    return (
      <div className={`fixed ${className} z-[90] pointer-events-none`} style={dockInlineStyle}>
        <button
          type="button"
          onClick={handleLauncherClick}
          onPointerDown={(event) => handleDockPointerDown(event, { allowInteractiveTarget: true })}
          className={`pointer-events-auto inline-flex items-center gap-3 rounded-full border border-[#12b981]/20 bg-white px-4 py-3 text-left shadow-[0_24px_60px_-28px_rgba(43,89,176,0.45)] transition hover:-translate-y-1 hover:border-[#12b981]/35 ${
            isDraggingDock ? "cursor-grabbing" : "cursor-grab"
          } ${isMobileViewport ? "h-14 w-14 justify-center px-0" : ""}`}
          aria-label="เปิด Messenger"
          title="กดค้างแล้วลากเพื่อย้าย Messenger"
        >
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-[#2b59b0] to-[#244a95] text-white shadow-[0_14px_26px_-14px_rgba(16,185,129,0.55)]">
            <span className="absolute inset-0 rounded-full bg-emerald-400/25 opacity-70 blur-[2px] animate-pulse" aria-hidden="true" />
            <MessageCircle size={20} className="relative drop-shadow-[0_1px_1px_rgba(15,23,42,0.25)]" />
            {totalUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
              </span>
            )}
          </span>
          {!isMobileViewport && (
            <span className="min-w-0">
            <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              Messenger
            </span>
            <span className="block max-w-[220px] truncate text-sm font-bold text-slate-800">
              {launcherTitle}
            </span>
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={dockRef}
      className={`fixed ${className} z-[90] pointer-events-none ${isMobileViewport ? "w-[calc(100vw-1rem)] max-h-[min(76dvh,620px)]" : "w-[min(96vw,860px)] max-h-[calc(100dvh-1rem)]"}`}
      style={dockInlineStyle}
    >
      <div className={`pointer-events-auto overflow-hidden border border-[#2b59b0]/15 bg-white shadow-[0_34px_90px_-30px_rgba(15,23,42,0.28)] ${isMobileViewport ? "max-h-[min(76dvh,620px)] rounded-[1.5rem]" : "max-h-[calc(100dvh-1rem)] rounded-[2rem]"}`}>
        <div
          className={`flex items-start justify-between gap-3 bg-gradient-to-r from-[#eff4ff] via-white to-[#f6f9ff] ${isMobileViewport ? "px-3 py-2" : "px-4 py-3"} ${
            isDraggingDock ? "select-none cursor-grabbing" : "cursor-grab select-none"
          }`}
          onPointerDown={(event) => handleDockPointerDown(event, { allowInteractiveTarget: false })}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <div className={`${isMobileViewport ? "hidden" : "mt-0.5 inline-flex"} h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#2b59b0]/10 bg-white text-[#2b59b0] shadow-[0_10px_22px_-16px_rgba(43,89,176,0.45)]`}>
              <GripVertical size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2b59b0]/70">Central Messenger</p>
              <h3 className={`truncate font-black text-slate-900 ${isMobileViewport ? "mt-0.5 text-sm" : "mt-1 text-base"}`}>
                {isMobileViewport ? "Messenger" : selectedMember ? selectedMember.name : "เลือกผู้ใช้เพื่อเริ่มแชท"}
              </h3>
              {!isMobileViewport && (
                <p className="mt-1 text-xs text-slate-500">
                {totalUnreadCount > 0 ? `มีข้อความที่ยังไม่อ่าน ${totalUnreadCount} รายการ` : "คุยแบบ 1-1 กับสมาชิกทุกคน"}
                </p>
              )}
            </div>
          </div>

          <div className={`flex items-center ${isMobileViewport ? "gap-1.5" : "gap-2"}`}>
            <button
              type="button"
              onClick={() => setIsCollapsed((value) => !value)}
              className={`inline-flex items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 ${isMobileViewport ? "h-8 w-8 rounded-xl" : "h-9 w-9 rounded-2xl"}`}
              aria-label={isCollapsed ? "ขยายแชท" : "พับแชท"}
            >
              <Circle size={12} className={isCollapsed ? "fill-current text-[#2b59b0]" : "text-slate-400"} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsCollapsed(false);
              }}
              className={`inline-flex items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 ${isMobileViewport ? "h-8 w-8 rounded-xl" : "h-9 w-9 rounded-2xl"}`}
              aria-label="ปิดแชท"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {!isCollapsed ? (
          <div className={`grid min-h-0 grid-cols-1 overflow-hidden md:grid-cols-[280px,1fr] ${isMobileViewport ? "h-[min(66dvh,540px)]" : "max-h-[calc(100dvh-4.5rem)] md:h-[min(78dvh,640px)]"}`}>
            <aside className={`${mobileThreadVisible ? "hidden md:flex" : "flex"} min-h-0 flex-col border-b border-slate-200 bg-[#fbfcff] md:border-b-0 md:border-r`}>
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="ค้นหาผู้ใช้"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-[#2b59b0] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/15"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                {membersLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl px-3 py-3 text-sm text-slate-500">
                    <Loader2 size={15} className="animate-spin" />
                    กำลังโหลดรายชื่อ...
                  </div>
                ) : directoryMembers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">
                    ไม่พบผู้ใช้
                  </div>
                ) : (
                  directoryMembers.map((member) => {
                    const isActive = String(member.id) === String(selectedMemberId || "");
                    const avatarUrl = toAvatarUrl(member.avatar_url, member.name, member.status === "online" ? "059669" : "64748b");
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => selectMember(member.id)}
                        className={`mb-1 flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          isActive
                            ? "bg-white shadow-[0_12px_26px_-20px_rgba(43,89,176,0.55)] ring-1 ring-[#2b59b0]/15"
                            : "hover:bg-white"
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={avatarUrl}
                            alt={member.name}
                            onError={(event) => {
                              event.currentTarget.src = buildAvatarFallback(member.name, "2b59b0");
                            }}
                            className="h-11 w-11 rounded-full border border-slate-200 bg-white object-cover"
                          />
                          <span
                            className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
                              member.status === "online" ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                            aria-hidden="true"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-bold text-slate-900">{member.name}</p>
                            <span className="shrink-0 text-[11px] text-slate-400">
                              {formatRelativeClock(member.last_message_created_at || member.last_seen_at)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            {roleLabel(member.role)}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="truncate text-xs text-slate-500">{member.last_preview}</p>
                            {member.unread_count > 0 && (
                              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                                {member.unread_count > 9 ? "9+" : member.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className={`${mobileThreadVisible ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden bg-white`}>
              <div className={`shrink-0 flex items-center gap-3 border-b border-slate-200 bg-white/95 backdrop-blur ${isMobileViewport ? "px-3 py-2" : "px-4 py-3"}`}>
                <button
                  type="button"
                  onClick={() => setMobileThreadVisible(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 md:hidden"
                  aria-label="กลับไปยังรายชื่อผู้ใช้"
                >
                  <ArrowLeft size={15} />
                </button>

                {selectedMember ? (
                  <>
                    <img
                      src={toAvatarUrl(selectedMember.avatar_url, selectedMember.name, selectedMember.status === "online" ? "059669" : "64748b")}
                      alt={selectedMember.name}
                      onError={(event) => {
                        event.currentTarget.src = buildAvatarFallback(selectedMember.name, "2b59b0");
                      }}
                      className={`${isMobileViewport ? "h-10 w-10" : "h-11 w-11"} rounded-full border border-slate-200 bg-white object-cover`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-black text-slate-900">{selectedMember.name}</h4>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          selectedMember.status === "online"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {selectedMember.status === "online" ? "online" : "offline"}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-slate-500">
                        {roleLabel(selectedMember.role)}
                        {!isMobileViewport && selectedMember.email ? ` · ${selectedMember.email}` : ""}
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <h4 className="text-sm font-black text-slate-900">ยังไม่ได้เลือกผู้ใช้</h4>
                    <p className="text-xs text-slate-500">เลือกชื่อจากฝั่งซ้ายเพื่อเริ่มแชท</p>
                  </div>
                )}
              </div>

              <div
                className={`relative min-h-0 flex-1 overflow-hidden ${dragActive ? "bg-[#eef4ff]" : "bg-white"}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget.contains(event.relatedTarget)) return;
                  setDragActive(false);
                }}
                onDrop={handleDrop}
              >
                <div
                  ref={messageListRef}
                  className={`${isMobileViewport ? "px-3 py-3 pb-14" : "px-4 py-4 pb-12"} h-full min-h-0 space-y-3 overflow-y-auto`}
                >
                  {messagesLoading ? (
                    <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
                      <Loader2 size={16} className="animate-spin" />
                      กำลังโหลดข้อความ...
                    </div>
                  ) : !selectedMember ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                        <MessageCircle size={24} className="mx-auto text-[#2b59b0]" />
                        <p className="mt-3 text-sm font-semibold text-slate-700">เลือกผู้ใช้เพื่อเริ่มแชท</p>
                        <p className="mt-1 text-xs text-slate-500">รองรับข้อความ รูปภาพ และไฟล์เอกสาร</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                        <MessageCircle size={24} className="mx-auto text-[#2b59b0]" />
                        <p className="mt-3 text-sm font-semibold text-slate-700">ยังไม่มีข้อความ</p>
                        <p className="mt-1 text-xs text-slate-500">เริ่มต้นพูดคุยกับ {selectedMember.name}</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const mine = String(message?.sender_id || "") === currentUserId;
                      const senderName = mine ? (currentUser?.name || "คุณ") : (selectedMember?.name || "สมาชิก");
                      const imageAttachment = message?.file_url && isImageMime(message?.file_mime_type, message?.file_name);
                      const stickerMessage = parseStickerMessage(message?.message);
                      const stickerOnly = Boolean(stickerMessage?.sticker) && !stickerMessage?.caption && !message?.file_url;

                      return (
                        <div
                          key={String(message?.id || `${message?.room_id}-${message?.created_at}`)}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[88%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                            <div
                              className={`rounded-[1.4rem] px-4 py-3 shadow-sm ${
                                stickerOnly
                                  ? "bg-transparent px-0 py-0 shadow-none"
                                  : mine
                                    ? "bg-[#2b59b0] text-white"
                                    : "border border-slate-200 bg-white text-slate-800"
                              }`}
                            >
                              {!mine && (
                                <p className="mb-1 text-[11px] font-bold text-[#2b59b0]">{senderName}</p>
                              )}
                              {stickerMessage?.sticker ? (
                                <div className={message?.file_url ? "mb-3" : ""}>
                                  <div
                                    className={`inline-flex h-20 w-20 items-center justify-center rounded-[1.8rem] border text-[2.5rem] shadow-sm ${
                                      mine
                                        ? "border-white/20 bg-white/10"
                                        : "border-slate-200 bg-slate-50"
                                    }`}
                                  >
                                    <span role="img" aria-label={stickerMessage.sticker.label}>
                                      {stickerMessage.sticker.emoji}
                                    </span>
                                  </div>
                                  {stickerMessage.caption && (
                                    <p className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed ${mine ? "text-white" : "text-slate-700"}`}>
                                      {stickerMessage.caption}
                                    </p>
                                  )}
                                </div>
                              ) : message?.message ? (
                                <p className={`whitespace-pre-wrap text-sm leading-relaxed ${mine ? "text-white" : "text-slate-700"}`}>
                                  {message.message}
                                </p>
                              ) : null}
                              {message?.file_url && imageAttachment && (
                                <button
                                  type="button"
                                  onClick={() => window.open(message.file_url, "_blank", "noopener,noreferrer")}
                                  className={`${message?.message ? "mt-3" : ""} block overflow-hidden rounded-2xl border border-black/10`}
                                >
                                  <img
                                    src={message.file_url}
                                    alt={message?.file_name || "image"}
                                    className="max-h-64 w-full object-cover"
                                  />
                                </button>
                              )}
                              {message?.file_url && !imageAttachment && (
                                <a
                                  href={message.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${message?.message ? "mt-3" : ""} flex items-center gap-3 rounded-2xl border border-black/10 bg-black/5 px-3 py-3 text-left`}
                                >
                                  <Paperclip size={16} className={mine ? "text-white" : "text-[#2b59b0]"} />
                                  <span className="min-w-0">
                                    <span className={`block truncate text-sm font-semibold ${mine ? "text-white" : "text-slate-800"}`}>
                                      {message?.file_name || "ไฟล์แนบ"}
                                    </span>
                                    <span className={`block text-[11px] ${mine ? "text-blue-100" : "text-slate-500"}`}>
                                      {(message?.file_mime_type || "file").toUpperCase()}
                                    </span>
                                  </span>
                                </a>
                              )}
                            </div>
                            <div className={`mt-1 flex items-center gap-1 px-1 text-[11px] ${mine ? "text-slate-400" : "text-slate-500"}`}>
                              <span>{formatDateTime(message?.created_at)}</span>
                              {mine && (
                                <>
                                  {message?.read_status ? (
                                    <CheckCheck size={12} className="text-emerald-500" />
                                  ) : (
                                    <Check size={12} className="text-slate-400" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {typingHintVisible && (
                  <div className={`absolute rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm ${isMobileViewport ? "bottom-3 left-3" : "bottom-3 left-4"}`}>
                    {typingMemberName || "สมาชิก"} กำลังพิมพ์...
                  </div>
                )}

                {dragActive && (
                  <div className="pointer-events-none absolute inset-4 flex items-center justify-center rounded-[1.8rem] border-2 border-dashed border-[#2b59b0]/35 bg-[#eef4ff]/90">
                    <div className="text-center">
                      <Paperclip size={22} className="mx-auto text-[#2b59b0]" />
                      <p className="mt-3 text-sm font-semibold text-slate-700">ปล่อยไฟล์เพื่อแนบส่งในแชท</p>
                      <p className="mt-1 text-xs text-slate-500">รองรับรูปภาพ PDF Excel และเอกสารทั่วไป</p>
                    </div>
                  </div>
                )}
              </div>

              <div className={`shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur ${isMobileViewport ? "px-3 py-2.5" : "px-4 py-3"}`}>
                {notice && (
                  <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    {notice}
                  </div>
                )}
                {error && (
                  <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {error}
                  </div>
                )}

                {pendingFile && (
                  <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {pendingFilePreview ? (
                        <img
                          src={pendingFilePreview}
                          alt={pendingFile.name}
                          className={`${isMobileViewport ? "h-10 w-10" : "h-11 w-11"} rounded-2xl object-cover`}
                        />
                      ) : (
                          <div className={`flex items-center justify-center rounded-2xl bg-white text-[#2b59b0] ${isMobileViewport ? "h-10 w-10" : "h-11 w-11"}`}>
                            <ImageIcon size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{pendingFile.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(pendingFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearPendingFile}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
                      aria-label="ลบไฟล์แนบ"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className={`flex items-center ${isMobileViewport ? "gap-1" : "gap-2"}`}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedMember}
                    className={`inline-flex shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 ${isMobileViewport ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl"}`}
                    aria-label="แนบไฟล์"
                  >
                    <Paperclip size={16} />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      handleIncomingFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      handleIncomingFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={!selectedMember}
                    className={`inline-flex shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 ${isMobileViewport ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl"}`}
                    aria-label="open camera"
                  >
                    <Camera size={16} />
                  </button>

                  <div className="relative shrink-0" ref={stickerPickerRef}>
                    <button
                      type="button"
                      onClick={() => setStickerPickerOpen((value) => !value)}
                      disabled={!selectedMember}
                      className={`inline-flex items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 ${isMobileViewport ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl"}`}
                      aria-label="open stickers"
                    >
                      <Smile size={16} />
                    </button>

                    {stickerPickerOpen && (
                      <div className={`absolute z-10 rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] ${isMobileViewport ? "bottom-12 right-0 w-[220px]" : "bottom-14 left-0 w-[240px]"}`}>
                        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Stickers
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {CHAT_STICKERS.map((sticker) => (
                            <button
                              key={sticker.id}
                              type="button"
                              onClick={() => handleStickerSelect(sticker.id)}
                              className="flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl transition hover:-translate-y-0.5 hover:border-[#2b59b0]/25 hover:bg-[#eef4ff]"
                              title={sticker.label}
                              aria-label={sticker.label}
                            >
                              <span role="img" aria-hidden="true">
                                {sticker.emoji}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <textarea
                      rows={isMobileViewport ? 1 : 2}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      onPaste={handleComposerPaste}
                      placeholder={selectedMember ? `พิมพ์ข้อความถึง ${selectedMember.name}` : "เลือกผู้ใช้ก่อนพิมพ์ข้อความ"}
                      disabled={!selectedMember}
                      className={`w-full resize-none border text-sm text-slate-700 focus:border-[#2b59b0] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/15 disabled:cursor-not-allowed disabled:bg-slate-50 ${isMobileViewport ? "min-h-9 max-h-24 rounded-xl border-slate-200 px-3 py-2 leading-5" : "rounded-[1.4rem] border-slate-300 px-4 py-3"}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || (!normalizeText(draft) && !pendingFile) || !selectedMember}
                    className={`inline-flex shrink-0 items-center justify-center bg-[#2b59b0] text-white transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:bg-slate-300 ${isMobileViewport ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl"}`}
                    aria-label="ส่งข้อความ"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex w-full items-center justify-between bg-white px-4 py-3 text-left"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Collapsed</p>
              <p className="truncate text-sm font-semibold text-slate-800">แตะเพื่อขยาย Messenger</p>
            </div>
            <MessageCircle size={16} className="text-[#2b59b0]" />
          </button>
        )}
      </div>
    </div>
  );
}
