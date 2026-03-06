import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Camera,
  ChevronDown,
  ImagePlus,
  Loader2,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const REMOTE_MODE = "remote";
const LOCAL_MODE = "local";
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const BOTTOM_THRESHOLD_PX = 48;
const MESSAGE_TOAST_TIMEOUT_MS = 4200;
const NOTIFICATION_PROMPT_KEY = "ticket-chat:notification-permission-prompted";

function getStorageKey(ticketId) {
  return `ticket-chat:${ticketId}`;
}

function sortByCreatedAt(messages) {
  return [...messages].sort((a, b) => {
    const left = new Date(a?.created_at || 0).getTime();
    const right = new Date(b?.created_at || 0).getTime();
    return left - right;
  });
}

function readLocalMessages(ticketId) {
  if (!ticketId) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(ticketId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortByCreatedAt(parsed);
  } catch {
    return [];
  }
}

function writeLocalMessages(ticketId, messages) {
  if (!ticketId) return;
  try {
    localStorage.setItem(getStorageKey(ticketId), JSON.stringify(messages));
  } catch {
    // Ignore localStorage failures.
  }
}

function isMissingTicketMessageTable(error) {
  const code = String(error?.code || "");
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return code === "42P01" || code === "PGRST205" || code === "PGRST204" || text.includes("ticket_messages");
}

function isMissingSenderAvatarColumn(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return text.includes("sender_avatar_url");
}

function toDisplayName(currentUser, fallbackUser) {
  return (
    currentUser?.name ||
    currentUser?.full_name ||
    currentUser?.employeeName ||
    fallbackUser?.user_metadata?.full_name ||
    fallbackUser?.email?.split("@")[0] ||
    "ผู้ใช้"
  );
}

function toDisplayAvatarUrl(currentUser, fallbackUser) {
  return (
    currentUser?.avatar ||
    currentUser?.avatar_url ||
    currentUser?.id_card_url ||
    fallbackUser?.user_metadata?.avatar_url ||
    fallbackUser?.user_metadata?.picture ||
    ""
  );
}

function toDisplayRole(currentUser) {
  const role = String(currentUser?.role || "").toLowerCase();
  if (role === "it_support" || role === "admin") return "เจ้าหน้าที่ IT";
  return "ผู้แจ้ง";
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

function sanitizePathSegment(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function deriveEmployeeCodeFromEmail(email) {
  const localPart = String(email || "").trim().split("@")[0] || "";
  const match = localPart.match(/\d{3,}/);
  return match ? match[0] : "";
}

function toMessagePreview(message) {
  const text = String(message?.message || "").trim();
  if (text) {
    if (text.length <= 50) return text;
    return `${text.slice(0, 50)}...`;
  }
  if (message?.image_url) return "ส่งรูปภาพในแชท";
  return "มีข้อความใหม่";
}

function toThaiChatError(message) {
  const text = String(message || "").toLowerCase();
  if (!text) return "ส่งข้อความไม่สำเร็จ";
  if (text.includes("network") || text.includes("fetch")) {
    return "เครือข่ายขัดข้อง กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
  }
  if (text.includes("permission") || text.includes("policy") || text.includes("rls")) {
    return "ไม่มีสิทธิ์ใช้งานแชทของเคสนี้";
  }
  if (text.includes("ticket_messages")) {
    return "ระบบแชทยังไม่พร้อมใช้งานในฐานข้อมูล";
  }
  if (text.includes("storage") || text.includes("bucket")) {
    return "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }
  return "ส่งข้อความไม่สำเร็จ กรุณาลองใหม่";
}

function buildAvatarFallback(name, tone = "slate") {
  const background =
    tone === "primary" ? "2b59b0" : tone === "emerald" ? "059669" : "64748b";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || "U"))}&background=${background}&color=fff&size=96`;
}

function toAvatarUrl(avatarUrl, name, tone = "slate") {
  return avatarUrl || buildAvatarFallback(name, tone);
}

function applyAvatarFallback(event, name, tone = "slate") {
  const element = event.currentTarget;
  if (!element || element.dataset.fallbackApplied === "1") return;
  element.dataset.fallbackApplied = "1";
  element.src = buildAvatarFallback(name, tone);
}

export default function TicketChatPanel({ ticket, currentUser }) {
  const ticketId = ticket?.id ? String(ticket.id) : "";
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [activeUser, setActiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [storageMode, setStorageMode] = useState(REMOTE_MODE);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [incomingToast, setIncomingToast] = useState(null);
  const [flashMessageId, setFlashMessageId] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState("unsupported");
  const [profileMap, setProfileMap] = useState({});

  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const messagesRef = useRef([]);
  const isAtBottomRef = useRef(true);
  const profileMapRef = useRef({});
  const toastTimerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const scrollFrameRef = useRef(null);
  const initialLoadDoneRef = useRef(false);

  const activeUserId = currentUser?.id || activeUser?.id || null;

  const requesterName = ticket?.reporter_name || "ผู้แจ้ง";
  const requesterMeta =
    [
      ticket?.reporter_emp_id || deriveEmployeeCodeFromEmail(ticket?.reporter_email),
      ticket?.reporter_dept || ticket?.department,
    ]
      .filter(Boolean)
      .join(" • ") || "ผู้แจ้งเคสนี้";
  const technicianName = ticket?.assigned_name || "เจ้าหน้าที่ IT";
  const technicianMeta = ticket?.assigned_employee_id || "ยังไม่ระบุผู้รับผิดชอบ";

  useEffect(() => {
    profileMapRef.current = profileMap;
  }, [profileMap]);

  const fetchMissingProfiles = useCallback(async (ids = []) => {
    const normalizedIds = Array.from(
      new Set(
        ids
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      )
    );
    const uuidLikeIds = normalizedIds.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    );
    const missingIds = uuidLikeIds.filter((id) => !profileMapRef.current[id]);
    if (!missingIds.length) return;

    let data = null;

    const { data: rpcData, error: rpcError } = await supabase.rpc("get_ticket_chat_profiles", {
      _ticket_id: ticketId || null,
      _user_ids: missingIds,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      data = rpcData;
    } else {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select("id, full_name, role, employee_code, avatar_url, id_card_url")
        .in("id", missingIds);

      if (fallbackError || !Array.isArray(fallbackData)) return;
      data = fallbackData;
    }

    const patch = {};
    data.forEach((row) => {
      const rowId = String(row?.id || "").trim();
      if (!rowId) return;
      patch[rowId] = {
        id: rowId,
        name: row?.full_name || "",
        role: row?.role || "",
        employeeCode: row?.employee_code || "",
        avatarUrl: row?.avatar_url || row?.id_card_url || "",
      };
    });

    if (Object.keys(patch).length) {
      setProfileMap((prev) => ({ ...prev, ...patch }));
    }
  }, [ticketId]);

  const applyMessages = useCallback(
    (nextMessages, options = {}) => {
      const sorted = sortByCreatedAt(nextMessages || []);
      messagesRef.current = sorted;
      setMessages(sorted);
      if (options.persistLocal) {
        writeLocalMessages(ticketId, sorted);
      }
    },
    [ticketId]
  );

  const scrollToBottom = useCallback((behavior = "auto") => {
    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current);
    }
    scrollFrameRef.current = requestAnimationFrame(() => {
      const container = messagesScrollRef.current;
      if (container) {
        if (behavior === "smooth") {
          container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
        } else {
          container.scrollTop = container.scrollHeight;
        }
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
      }
      isAtBottomRef.current = true;
      setIsAtBottom(true);
      setUnreadCount(0);
    });
  }, []);

  const keepLatestVisible = useCallback(() => {
    if (isAtBottomRef.current) {
      scrollToBottom("auto");
    }
  }, [scrollToBottom]);

  const computeIsAtBottom = useCallback(() => {
    const container = messagesScrollRef.current;
    if (!container) return true;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= BOTTOM_THRESHOLD_PX;
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const atBottomNow = computeIsAtBottom();
    isAtBottomRef.current = atBottomNow;
    setIsAtBottom(atBottomNow);
    if (atBottomNow) {
      setUnreadCount(0);
    }
  }, [computeIsAtBottom]);

  const showIncomingToast = useCallback((message) => {
    setIncomingToast(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setIncomingToast(null);
    }, MESSAGE_TOAST_TIMEOUT_MS);
  }, []);

  const flashIncomingMessage = useCallback((messageId) => {
    setFlashMessageId(String(messageId || ""));
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = setTimeout(() => {
      setFlashMessageId("");
    }, 1100);
  }, []);

  const notifyBrowserIncoming = useCallback(
    (message) => {
      if (typeof window === "undefined" || typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      if (document.visibilityState === "visible" && isAtBottomRef.current) return;

      const senderName = message?.sender_name || "ข้อความใหม่";
      const preview = toMessagePreview(message);
      try {
        const browserNotification = new Notification(`ข้อความใหม่: ${ticket?.ticket_no || ticketId || "-"}`, {
          body: `${senderName}: ${preview}`,
          tag: `ticket-chat-${ticketId}`,
          renotify: true,
        });
        browserNotification.onclick = () => {
          window.focus();
          scrollToBottom("smooth");
          browserNotification.close();
        };
      } catch {
        // Ignore notification permission/runtime errors.
      }

      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(120);
      }
    },
    [scrollToBottom, ticket?.ticket_no, ticketId]
  );

  const handleIncomingMessage = useCallback(
    (incoming, options = {}) => {
      if (!incoming) return;

      const incomingId = String(incoming?.id || "");
      const exists = messagesRef.current.some((item) => {
        if (!incomingId) return false;
        return String(item?.id || "") === incomingId;
      });
      if (exists) return;

      const nextMessages = sortByCreatedAt([...messagesRef.current, incoming]);
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      if (options.persistLocal) {
        writeLocalMessages(ticketId, nextMessages);
      }

      const mine = Boolean(activeUserId) && String(incoming?.sender_id || "") === String(activeUserId);
      if (mine) {
        scrollToBottom("auto");
        return;
      }

      flashIncomingMessage(incoming?.id || incoming?.created_at || Date.now());
      showIncomingToast(incoming);

      // Live chat mode: always keep newest message visible on screen.
      scrollToBottom("auto");

      notifyBrowserIncoming(incoming);
    },
    [activeUserId, flashIncomingMessage, notifyBrowserIncoming, scrollToBottom, showIncomingToast, ticketId]
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    setDraft("");
    setSelectedImage(null);
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImagePreview("");
    applyMessages([]);
    setUnreadCount(0);
    setIncomingToast(null);
    setFlashMessageId("");
    setIsAtBottom(true);
    isAtBottomRef.current = true;
    initialLoadDoneRef.current = false;
    setNotice("");
    setError("");
  }, [applyMessages, ticketId]);

  useEffect(() => {
    let ignore = false;

    const loadCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (ignore) return;
      setActiveUser(data?.user || null);
    };

    loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const senderIds = messages.map((message) => message?.sender_id);
    fetchMissingProfiles([ticket?.creator_id, ticket?.assigned_to, activeUserId, ...senderIds]);
  }, [activeUserId, fetchMissingProfiles, messages, ticket?.assigned_to, ticket?.creator_id]);

  useEffect(() => {
    let ignore = false;

    const loadMessages = async () => {
      if (!ticketId) {
        applyMessages([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (ignore) return;

      if (fetchError) {
        const localMessages = readLocalMessages(ticketId);
        applyMessages(localMessages);
        setStorageMode(LOCAL_MODE);
        setNotice(
          isMissingTicketMessageTable(fetchError)
            ? "ยังไม่พบตารางแชทในฐานข้อมูล ระบบจะบันทึกแชทไว้เฉพาะเครื่องนี้ชั่วคราว"
            : "เชื่อมต่อแชทแบบเรียลไทม์ไม่ได้ชั่วคราว ระบบจะบันทึกแชทเฉพาะเครื่องนี้"
        );
      } else {
        applyMessages(data || []);
        setStorageMode(REMOTE_MODE);
        setNotice("");
      }

      setLoading(false);
    };

    loadMessages();

    return () => {
      ignore = true;
    };
  }, [applyMessages, ticketId]);

  useEffect(() => {
    if (loading || !ticketId || initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;
    scrollToBottom("auto");
  }, [loading, scrollToBottom, ticketId]);

  useEffect(() => {
    if (!messages.length) return;
    const timer = window.setTimeout(() => {
      keepLatestVisible();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [keepLatestVisible, messages.length]);

  useEffect(() => {
    if (!ticketId || storageMode !== REMOTE_MODE) return undefined;

    const channel = supabase
      .channel(`ticket-chat-${ticketId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          handleIncomingMessage(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleIncomingMessage, storageMode, ticketId]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    };
  }, [selectedImagePreview]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch {
      setNotificationPermission(Notification.permission || "denied");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return undefined;
    if (!ticketId || storageMode !== REMOTE_MODE) return undefined;
    if (Notification.permission !== "default") return undefined;

    let prompted = false;
    try {
      prompted = localStorage.getItem(NOTIFICATION_PROMPT_KEY) === "1";
    } catch {
      prompted = false;
    }
    if (prompted) return undefined;

    const timer = window.setTimeout(() => {
      requestNotificationPermission();
      try {
        localStorage.setItem(NOTIFICATION_PROMPT_KEY, "1");
      } catch {
        // Ignore localStorage failures.
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [requestNotificationPermission, storageMode, ticketId]);

  const notificationButtonProps = useMemo(() => {
    if (notificationPermission === "granted") {
      return {
        label: "แจ้งเตือนเปิดอยู่",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        disabled: true,
      };
    }
    if (notificationPermission === "denied") {
      return {
        label: "เบราว์เซอร์บล็อกแจ้งเตือน",
        className: "border-rose-200 bg-rose-50 text-rose-700",
        disabled: true,
      };
    }
    return {
      label: "เปิดแจ้งเตือนข้อความ",
      className: "border-[#2b59b0]/30 bg-[#2b59b0]/10 text-[#2b59b0] hover:bg-[#2b59b0]/20",
      disabled: false,
    };
  }, [notificationPermission]);

  const submitReady = useMemo(
    () => !sending && (draft.trim().length > 0 || Boolean(selectedImage)),
    [draft, sending, selectedImage]
  );

  const resetComposer = useCallback(() => {
    setDraft("");
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImage(null);
    setSelectedImagePreview("");
  }, [selectedImagePreview]);

  const clearSelectedImage = useCallback(() => {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImage(null);
    setSelectedImagePreview("");
  }, [selectedImagePreview]);

  const addLocalMessage = useCallback(
    (payload) => {
      const next = sortByCreatedAt([...messagesRef.current, payload]);
      applyMessages(next, { persistLocal: true });
      scrollToBottom("auto");
    },
    [applyMessages, scrollToBottom]
  );

  const uploadImageToStorage = useCallback(
    async (file) => {
      const ext = String(file?.name?.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "") || "jpg";
      const safeTicketId = sanitizePathSegment(ticketId);
      const safeUserId = sanitizePathSegment(activeUserId || "unknown");
      const filePath = `chat/${safeTicketId}/${safeUserId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("ticket-attachments")
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("ticket-attachments").getPublicUrl(filePath);
      return publicData?.publicUrl || "";
    },
    [activeUserId, ticketId]
  );

  const onSelectImage = useCallback(
    (event) => {
      setError("");
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("อัปโหลดได้เฉพาะไฟล์รูปภาพ");
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setError("ขนาดรูปภาพต้องไม่เกิน 10MB");
        return;
      }

      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);

      setSelectedImage(file);
      setSelectedImagePreview(URL.createObjectURL(file));
    },
    [selectedImagePreview]
  );

  const sendMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content && !selectedImage) return;

    setSending(true);
    setError("");

    const senderName = toDisplayName(currentUser, activeUser);
    const senderRole = toDisplayRole(currentUser);
    const senderAvatarUrl = toDisplayAvatarUrl(currentUser, activeUser);
    const basePayload = {
      ticket_id: ticketId,
      sender_id: activeUserId,
      sender_name: senderName,
      sender_role: senderRole,
      sender_avatar_url: senderAvatarUrl || null,
      message: content,
      image_url: null,
      created_at: new Date().toISOString(),
    };

    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImageToStorage(selectedImage);
      }

      const payload = {
        ...basePayload,
        message: content || null,
        image_url: imageUrl,
      };

      if (storageMode === LOCAL_MODE) {
        addLocalMessage({
          ...payload,
          id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        });
        resetComposer();
        setSending(false);
        return;
      }

      let { data: inserted, error: insertError } = await supabase
        .from("ticket_messages")
        .insert(payload)
        .select("*")
        .single();

      if (insertError && isMissingSenderAvatarColumn(insertError)) {
        const retryPayload = { ...payload };
        delete retryPayload.sender_avatar_url;
        const retryResult = await supabase
          .from("ticket_messages")
          .insert(retryPayload)
          .select("*")
          .single();
        inserted = retryResult.data;
        insertError = retryResult.error;
      }

      if (insertError) {
        if (isMissingTicketMessageTable(insertError)) {
          setStorageMode(LOCAL_MODE);
          setNotice("ยังไม่พบตารางแชทในฐานข้อมูล ระบบจะบันทึกแชทไว้เฉพาะเครื่องนี้ชั่วคราว");
          addLocalMessage({
            ...payload,
            id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          });
        } else {
          throw insertError;
        }
      } else if (inserted) {
        handleIncomingMessage(inserted);
      }

      resetComposer();
    } catch (sendError) {
      setError(toThaiChatError(sendError?.message));
    } finally {
      setSending(false);
    }
  }, [
    activeUser,
    activeUserId,
    addLocalMessage,
    currentUser,
    draft,
    handleIncomingMessage,
    resetComposer,
    selectedImage,
    storageMode,
    ticketId,
    uploadImageToStorage,
  ]);

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (submitReady) sendMessage();
    }
  };

  const requesterProfile = ticket?.creator_id ? profileMap[String(ticket.creator_id)] : null;
  const technicianProfile = ticket?.assigned_to ? profileMap[String(ticket.assigned_to)] : null;
  const requesterAvatar = toAvatarUrl(
    requesterProfile?.avatarUrl || ticket?.reporter_avatar_url || "",
    requesterName,
    "primary"
  );
  const technicianAvatar = toAvatarUrl(
    technicianProfile?.avatarUrl || "",
    technicianName,
    "emerald"
  );
  const incomingToastAvatar = incomingToast
    ? toAvatarUrl(
        incomingToast?.sender_avatar_url ||
          profileMap[String(incomingToast?.sender_id || "")]?.avatarUrl ||
          "",
        incomingToast?.sender_name || "ข้อความใหม่",
        "primary"
      )
    : "";

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#2b59b0]/20 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800">
            <MessageCircle size={16} className="text-[#2b59b0]" />
            แชทติดต่อเจ้าหน้าที่
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500">คุยรายละเอียดเคสนี้แบบเรียลไทม์ แนบรูปจากมือถือได้</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {notificationPermission !== "unsupported" && (
            <button
              type="button"
              onClick={requestNotificationPermission}
              disabled={notificationButtonProps.disabled}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${notificationButtonProps.className} ${
                notificationButtonProps.disabled ? "cursor-not-allowed opacity-95" : ""
              }`}
            >
              <Bell size={12} />
              {notificationButtonProps.label}
            </button>
          )}

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              storageMode === REMOTE_MODE ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {storageMode === REMOTE_MODE ? "เรียลไทม์" : "โหมดออฟไลน์"}
          </span>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start gap-2.5">
            <img
              src={requesterAvatar}
              onError={(event) => applyAvatarFallback(event, requesterName, "primary")}
              onLoad={keepLatestVisible}
              alt={requesterName}
              className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-[#2b59b0]/20 bg-white object-cover"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">ผู้แจ้ง</p>
              <p className="truncate text-sm font-bold text-slate-800">{requesterName}</p>
              <p className="truncate text-xs text-slate-500">{requesterMeta}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start gap-2.5">
            <img
              src={technicianAvatar}
              onError={(event) => applyAvatarFallback(event, technicianName, "emerald")}
              onLoad={keepLatestVisible}
              alt={technicianName}
              className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-emerald-200 bg-white object-cover"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">เจ้าหน้าที่</p>
              <p className="truncate text-sm font-bold text-slate-800">{technicianName}</p>
              <p className="truncate text-xs text-slate-500">{technicianMeta}</p>
            </div>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          {notice}
        </div>
      )}

      <div className="relative">
        <div
          ref={messagesScrollRef}
          onScroll={handleMessagesScroll}
          className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3"
          style={{ overflowAnchor: "none" }}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              กำลังโหลดข้อความ...
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
              ยังไม่มีข้อความ เริ่มคุยรายละเอียดเคสได้เลย
            </div>
          ) : (
            messages.map((message, index) => {
              const mine = Boolean(activeUserId) && String(message?.sender_id || "") === String(activeUserId);
              const senderName = message?.sender_name || (mine ? "คุณ" : "ผู้ใช้งาน");
              const senderRole = message?.sender_role || "";
              const shouldFlash = !mine && String(message?.id || "") === flashMessageId;
              const senderProfile = profileMap[String(message?.sender_id || "")];
              const senderAvatar = toAvatarUrl(
                message?.sender_avatar_url ||
                  senderProfile?.avatarUrl ||
                  (mine ? toDisplayAvatarUrl(currentUser, activeUser) : ""),
                senderName,
                mine ? "primary" : "slate"
              );

              return (
                <div
                  key={`${message?.id || message?.created_at || "message"}-${index}`}
                  className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                >
                  {!mine && (
                    <img
                      src={senderAvatar}
                      onError={(event) => applyAvatarFallback(event, senderName, "slate")}
                      onLoad={keepLatestVisible}
                      alt={senderName}
                      className="h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white object-cover"
                    />
                  )}
                  <div
                    style={shouldFlash ? { animation: "chatFlash 0.95s ease-out" } : undefined}
                    className={`max-w-[calc(100%-2.5rem)] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[80%] ${
                      mine
                        ? "border border-[#2b59b0]/20 bg-[#2b59b0] text-white"
                        : "border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`font-bold ${mine ? "text-white" : "text-[#2b59b0]"}`}>{senderName}</span>
                      {senderRole && (
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            mine ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {senderRole}
                        </span>
                      )}
                      <span className={mine ? "text-blue-100" : "text-slate-500"}>{formatDateTime(message?.created_at)}</span>
                    </div>

                    {message?.message && (
                      <p className={`whitespace-pre-wrap text-sm leading-relaxed ${mine ? "text-white" : "text-slate-700"}`}>
                        {message.message}
                      </p>
                    )}

                    {message?.image_url && (
                      <button
                        type="button"
                        onClick={() => window.open(message.image_url, "_blank", "noopener,noreferrer")}
                        className="mt-2 block overflow-hidden rounded-lg border border-black/10"
                      >
                        <img
                          src={message.image_url}
                          onLoad={keepLatestVisible}
                          alt="chat attachment"
                          className="max-h-56 w-full object-cover"
                        />
                      </button>
                    )}
                  </div>
                  {mine && (
                    <img
                      src={senderAvatar}
                      onError={(event) => applyAvatarFallback(event, senderName, "primary")}
                      onLoad={keepLatestVisible}
                      alt={senderName}
                      className="h-8 w-8 shrink-0 rounded-full border border-[#2b59b0]/20 bg-white object-cover"
                    />
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {incomingToast && (
          <div
            className="pointer-events-none absolute right-3 top-3 z-20 w-[min(92%,280px)]"
            style={{ animation: "chatToastPop 0.28s cubic-bezier(0.2,0.9,0.3,1)" }}
          >
            <div className="pointer-events-auto rounded-xl border border-[#2b59b0]/20 bg-white p-2.5 shadow-xl">
              <div className="flex items-start gap-2">
                <img
                  src={incomingToastAvatar}
                  onError={(event) => applyAvatarFallback(event, incomingToast?.sender_name, "primary")}
                  onLoad={keepLatestVisible}
                  alt={incomingToast?.sender_name || "ข้อความใหม่"}
                  className="h-8 w-8 shrink-0 rounded-full border border-[#2b59b0]/20 bg-white object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-800">{incomingToast?.sender_name || "ข้อความใหม่"}</p>
                  <p className="truncate text-xs text-slate-500">{toMessagePreview(incomingToast)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIncomingToast(null)}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="close incoming message preview"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {unreadCount > 0 && !isAtBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#2b59b0]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#2b59b0] shadow-lg"
            style={{ animation: "chatBounce 1.4s ease-in-out infinite" }}
          >
            <ChevronDown size={14} />
            มีข้อความใหม่ {unreadCount}
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {selectedImagePreview && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="flex items-start gap-2">
              <img src={selectedImagePreview} alt="selected" className="h-14 w-14 rounded-md object-cover" />
              <div>
                <p className="text-xs font-semibold text-slate-700">พร้อมส่งรูปภาพ</p>
                <p className="text-[11px] text-slate-500">{selectedImage?.name || "photo"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSelectedImage}
              className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-500 hover:text-rose-600"
              aria-label="remove selected image"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <textarea
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder="พิมพ์ข้อความถึงอีกฝ่ายเพื่อคุยรายละเอียดงาน..."
          className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#2b59b0] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/20"
        />
        <p className="text-[11px] text-slate-500">กด Enter เพื่อส่ง | Shift + Enter ขึ้นบรรทัดใหม่</p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={onSelectImage} />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onSelectImage}
            />
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#2b59b0] hover:text-[#2b59b0]"
            >
              <ImagePlus size={14} />
              อัปโหลดรูป
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#2b59b0] hover:text-[#2b59b0]"
            >
              <Camera size={14} />
              ถ่ายรูป
            </button>
          </div>

          <button
            type="button"
            disabled={!submitReady}
            onClick={sendMessage}
            className="inline-flex items-center gap-1 rounded-lg bg-[#2b59b0] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#244a95] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            ส่งข้อความ
          </button>
        </div>
      </div>

      <style>{`
        @keyframes chatToastPop {
          0% {
            opacity: 0;
            transform: translate3d(0, -8px, 0) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes chatFlash {
          0% {
            box-shadow: 0 0 0 0 rgba(43, 89, 176, 0.32);
          }
          100% {
            box-shadow: 0 0 0 12px rgba(43, 89, 176, 0);
          }
        }
        @keyframes chatBounce {
          0%,
          100% {
            transform: translate(-50%, 0);
          }
          50% {
            transform: translate(-50%, -3px);
          }
        }
      `}</style>
    </section>
  );
}
