import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageCircle, Minimize2, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import TicketChatPanel from "./TicketChatPanel";

function getTicketActivityValue(ticket) {
  const value = ticket?.updated_at || ticket?.last_message_at || ticket?.created_at || "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatTicketLabel(ticket) {
  if (!ticket) return "แชทงานซ่อม";
  const ticketNo = ticket.ticket_no || `#${String(ticket.id || "").slice(-6)}`;
  const title = ticket.title || "ไม่มีหัวข้อ";
  return `${ticketNo} · ${title}`;
}

export default function TicketChatDock({
  tickets = [],
  currentUser = null,
  preferredTicket = null,
  suspended = false,
  openSignal = 0,
  className = "bottom-4 right-4",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingOpenRequest, setPendingOpenRequest] = useState(false);
  const isOpenRef = useRef(false);
  const currentUserId = String(currentUser?.id || "");

  const latestTicket = useMemo(() => {
    if (!Array.isArray(tickets) || tickets.length === 0) return null;
    return [...tickets].sort((left, right) => getTicketActivityValue(right) - getTicketActivityValue(left))[0] || null;
  }, [tickets]);

  const activeTicket = useMemo(() => {
    const resolvedId = String(activeTicketId || preferredTicket?.id || latestTicket?.id || "");
    if (!resolvedId) return null;
    return tickets.find((ticket) => String(ticket?.id || "") === resolvedId) || preferredTicket || latestTicket || null;
  }, [activeTicketId, latestTicket, preferredTicket, tickets]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (preferredTicket?.id) {
      setActiveTicketId(String(preferredTicket.id));
      return;
    }

    if (!activeTicketId && latestTicket?.id) {
      setActiveTicketId(String(latestTicket.id));
    }
  }, [activeTicketId, latestTicket, preferredTicket?.id]);

  useEffect(() => {
    if (!activeTicketId) return;
    const stillExists = tickets.some((ticket) => String(ticket?.id || "") === String(activeTicketId));
    if (!stillExists && latestTicket?.id) {
      setActiveTicketId(String(latestTicket.id));
    }
  }, [activeTicketId, latestTicket, tickets]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen, activeTicketId]);

  useEffect(() => {
    if (!currentUserId || suspended || !tickets.length) return undefined;

    const ticketIds = new Set(tickets.map((ticket) => String(ticket?.id || "")).filter(Boolean));
    const channel = supabase
      .channel(`ticket-dock-${currentUserId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
        },
        (payload) => {
          const incomingTicketId = String(payload?.new?.ticket_id || "");
          if (!incomingTicketId || !ticketIds.has(incomingTicketId)) return;
          if (String(payload?.new?.sender_id || "") === currentUserId) return;

          setActiveTicketId(incomingTicketId);
          setIsOpen(true);
          setIsCollapsed(false);

          if (!isOpenRef.current) {
            setUnreadCount((value) => value + 1);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, suspended, tickets]);

  useEffect(() => {
    if (suspended) {
      setIsOpen(false);
      setIsCollapsed(false);
    }
  }, [suspended]);

  useEffect(() => {
    if (!openSignal) return;

    if (currentUserId && activeTicket && !suspended) {
      setIsOpen(true);
      setIsCollapsed(false);
      setUnreadCount(0);
      setPendingOpenRequest(false);
      return;
    }

    setPendingOpenRequest(true);
  }, [activeTicket, currentUserId, openSignal, suspended]);

  useEffect(() => {
    if (!pendingOpenRequest || !currentUserId || !activeTicket || suspended) return;
    setIsOpen(true);
    setIsCollapsed(false);
    setUnreadCount(0);
    setPendingOpenRequest(false);
  }, [activeTicket, currentUserId, pendingOpenRequest, suspended]);

  if (suspended || !currentUserId || !activeTicket) return null;

  const ticketLabel = formatTicketLabel(activeTicket);

  const openDock = () => {
    setIsOpen(true);
    setIsCollapsed(false);
    setUnreadCount(0);
  };

  const closeDock = () => {
    setIsOpen(false);
    setIsCollapsed(false);
  };

  if (!isOpen) {
    return (
      <div className={`fixed ${className} z-[90] pointer-events-none`}>
        <button
          type="button"
          onClick={openDock}
          className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-[#2b59b0]/25 bg-white px-4 py-3 text-left shadow-[0_24px_60px_-28px_rgba(43,89,176,0.45)] transition hover:-translate-y-1 hover:border-[#2b59b0]/40"
          aria-label="เปิดหน้าต่างแชท"
        >
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#2b59b0] to-[#244a95] text-white">
            <MessageCircle size={20} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              Ticket Chat
            </span>
            <span className="block max-w-[220px] truncate text-sm font-bold text-slate-800">
              {ticketLabel}
            </span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${className} z-[90] pointer-events-none w-[min(96vw,460px)]`}>
      <div className="pointer-events-auto overflow-hidden rounded-[2rem] border border-[#2b59b0]/20 bg-white shadow-[0_30px_90px_-36px_rgba(43,89,176,0.42)]">
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-[#1c376d] via-[#2b59b0] to-[#244a95] px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">Live Ticket Chat</p>
            <h3 className="mt-1 truncate text-sm font-black">{ticketLabel}</h3>
            <p className="mt-1 text-[11px] text-white/75">
              {unreadCount > 0 ? `มีข้อความใหม่ ${unreadCount} รายการ` : "คุยได้แบบเรียลไทม์"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCollapsed((value) => !value)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              aria-label={isCollapsed ? "ขยายแชท" : "พับแชท"}
            >
              <ChevronDown size={14} className={isCollapsed ? "rotate-180" : "rotate-0"} />
            </button>
            <button
              type="button"
              onClick={closeDock}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="ปิดแชท"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {!isCollapsed ? (
          <div className="max-h-[min(78vh,760px)] overflow-y-auto bg-white p-3 sm:p-4">
            <TicketChatPanel
              key={String(activeTicket.id || activeTicket.ticket_no || activeTicketId || "chat")}
              ticket={activeTicket}
              currentUser={currentUser}
              embedded
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex w-full items-center justify-between bg-white px-4 py-3 text-left"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Collapsed</p>
              <p className="truncate text-sm font-semibold text-slate-800">แตะเพื่อขยายหน้าต่างแชท</p>
            </div>
            <Minimize2 size={16} className="text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );
}
