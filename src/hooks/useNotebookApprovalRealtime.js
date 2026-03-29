import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  countPendingNotebookApprovals,
  loadNotebookRequestQueue,
  NOTEBOOK_LOG_STATUS,
  normalizeText,
} from "../services/notebookBorrowService";

export default function useNotebookApprovalRealtime({
  enabled = true,
  onNewPendingRequest = null,
} = {}) {
  const [pendingCount, setPendingCount] = useState(0);
  const onNewPendingRequestRef = useRef(onNewPendingRequest);

  useEffect(() => {
    onNewPendingRequestRef.current = onNewPendingRequest;
  }, [onNewPendingRequest]);

  const refreshPendingCount = useCallback(async () => {
    if (!enabled) {
      setPendingCount(0);
      return;
    }

    const { data, error } = await loadNotebookRequestQueue();
    if (error) {
      console.warn("Load notebook approval count error:", error);
      return;
    }

    setPendingCount(countPendingNotebookApprovals(data));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setPendingCount(0);
      return undefined;
    }

    let isMounted = true;

    const syncPendingCount = async () => {
      if (!isMounted) return;
      await refreshPendingCount();
    };

    void syncPendingCount();

    const channel = supabase
      .channel(`notebook-approval-badge-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "borrow_logs" },
        (payload) => {
          if (
            payload.eventType === "INSERT" &&
            normalizeText(payload?.new?.status).toLowerCase() === NOTEBOOK_LOG_STATUS.PENDING
          ) {
            onNewPendingRequestRef.current?.(payload.new);
          }

          void syncPendingCount();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notebooks" },
        () => {
          void syncPendingCount();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void syncPendingCount();
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [enabled, refreshPendingCount]);

  return {
    pendingCount,
    refreshPendingCount,
  };
}
