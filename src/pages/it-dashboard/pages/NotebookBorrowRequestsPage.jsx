import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Laptop,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../../lib/supabaseClient";
import {
  approveNotebookBorrow,
  confirmNotebookReturn,
  formatNotebookDuration,
  formatNotebookTime,
  isNotebookPermissionDenied,
  isNotebookSchemaError,
  loadNotebookRequestQueue,
  NOTEBOOK_LOG_STATUS,
  normalizeText,
} from "../../../services/notebookBorrowService";

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const NOTEBOOK_PROOF_BUCKET = "notebook-borrow-proof";
const NOTEBOOK_PROOF_PUBLIC_BASE = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/${NOTEBOOK_PROOF_BUCKET}`
  : "";

const LOG_STATUS_META = {
  [NOTEBOOK_LOG_STATUS.PENDING]: {
    label: "รออนุมัติ",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  [NOTEBOOK_LOG_STATUS.APPROVED]: {
    label: "กำลังใช้งาน",
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
  [NOTEBOOK_LOG_STATUS.RETURNED]: {
    label: "คืนเรียบร้อย",
    cls: "border-violet-200 bg-violet-50 text-violet-700",
  },
};

const NOTEBOOK_STATUS_META = {
  available: {
    label: "พร้อมใช้",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  borrowed: {
    label: "ถูกยืม",
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
  repair: {
    label: "ซ่อม",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const formatDuration = (startValue, endValue) => {
  if (!startValue) return "-";
  const end = endValue ? new Date(endValue) : new Date();
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  return formatNotebookDuration(start, end);
};

const resolveBorrowerAvatarUrl = (row, profile, displayName) =>
  normalizeText(
    row?.user_avatar_url ||
      profile?.avatar_url ||
      profile?.id_card_url,
  );

const getAvatarInitials = (name) => {
  const normalized = normalizeText(name);
  if (!normalized) return "U";
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return normalized.slice(0, 2).toUpperCase();
};

const isRenderableAvatarUrl = (value) => /^(blob:|data:|https?:\/\/)/i.test(String(value || "").trim());

function BorrowerAvatar({ src, name, theme }) {
  const [imageFailed, setImageFailed] = useState(false);
  const canRenderImage = isRenderableAvatarUrl(src) && !imageFailed;

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border ${
        theme === "dark"
          ? "border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 text-slate-200"
          : "border-slate-200 bg-gradient-to-br from-teal-50 to-cyan-100 text-teal-700"
      }`}
    >
      {canRenderImage ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-sm font-black tracking-wide">{getAvatarInitials(name)}</span>
      )}
    </div>
  );
}

const resolveNotebookProofUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(blob:|data:)/i.test(raw)) return raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.pathname.includes("/storage/v1/object/sign/")) {
        url.pathname = url.pathname.replace("/storage/v1/object/sign/", "/storage/v1/object/public/");
        url.search = "";
        return url.toString();
      }
      if (url.pathname.includes("/storage/v1/object/public/")) {
        url.search = "";
      }
      return url.toString();
    } catch {
      return raw;
    }
  }

  if (!NOTEBOOK_PROOF_PUBLIC_BASE) return raw;

  const normalizedPath = raw.replace(/^\/+/, "");
  if (normalizedPath.startsWith("storage/v1/object/sign/")) {
    return `${SUPABASE_URL}/${normalizedPath.replace("storage/v1/object/sign/", "storage/v1/object/public/")}`;
  }
  if (normalizedPath.startsWith("storage/v1/object/public/")) {
    return `${SUPABASE_URL}/${normalizedPath}`;
  }
  if (normalizedPath.startsWith(`${NOTEBOOK_PROOF_BUCKET}/`)) {
    return `${NOTEBOOK_PROOF_PUBLIC_BASE}/${normalizedPath.slice(NOTEBOOK_PROOF_BUCKET.length + 1)}`;
  }
  return `${NOTEBOOK_PROOF_PUBLIC_BASE}/${normalizedPath}`;
};

const notebookProofFolderCache = new Map();

function isRenderableNotebookProofUrl(value) {
  return /^(blob:|data:|https?:\/\/)/i.test(String(value || "").trim());
}

function sanitizeProofName(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .toLowerCase();
}

function extractUploadTimestamp(value) {
  const match = /^(\d{10,})_/.exec(String(value || "").trim());
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseTargetTimestamp(value) {
  const parsed = new Date(value || "").getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function decodePossibleMojibake(value) {
  const raw = String(value || "");
  if (!raw) return "";
  if (!/[ÃÂàâ]/.test(raw)) return raw;
  try {
    const bytes = Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return /[\u0E00-\u0E7F]/.test(decoded) ? decoded : raw;
  } catch {
    return raw;
  }
}

async function listNotebookProofFiles(folder) {
  const key = String(folder || "").trim();
  if (!key) return [];

  if (!notebookProofFolderCache.has(key)) {
    notebookProofFolderCache.set(
      key,
      supabase.storage
        .from(NOTEBOOK_PROOF_BUCKET)
        .list(key, {
          limit: 1000,
          offset: 0,
          sortBy: { column: "name", order: "desc" },
        })
        .then(({ data }) => (Array.isArray(data) ? data : []))
        .catch(() => []),
    );
  }

  return notebookProofFolderCache.get(key);
}

async function resolveNotebookProofFromStorage(row, kind) {
  const userId = String(row?.user_id || "").trim();
  if (!userId) return "";

  const folder = `borrow/${userId}`;
  const files = await listNotebookProofFiles(folder);
  if (!files.length) return "";

  const primaryName = sanitizeProofName(kind === "return" ? row?.return_image_name : row?.image_name);
  const assetCode = String(row?.asset_code || "").trim().toLowerCase();
  const model = String(row?.model || "").trim().toLowerCase();
  const logId = String(row?.log_id || "").trim().toLowerCase();
  const kindToken = kind === "return" ? "return" : "before";
  const expectedSuffix = primaryName ? (kind === "return" ? `_return_${primaryName}` : `_${primaryName}`) : "";
  const targetTimestamp = parseTargetTimestamp(
    kind === "return" ? row?.return_time || row?.return_confirmed_at : row?.borrow_time || row?.requested_at,
  );

  const scored = files
    .map((file, index) => {
      const name = String(file?.name || "").trim().toLowerCase();
      if (!name) return null;
      const uploadTimestamp = extractUploadTimestamp(name);

      let score = 0;

      if (expectedSuffix && name.endsWith(expectedSuffix)) score += 100;
      else if (primaryName && name === primaryName) score += 70;
      else if (primaryName && name.includes(primaryName)) score += 20;

      [assetCode, model, logId, kindToken].forEach((hint) => {
        if (!hint) return;
        if (name === hint) score += 6;
        else if (name.includes(hint)) score += 3;
      });

      if (kind === "return") {
        if (name.includes("return")) score += 4;
      } else if (!name.includes("return")) {
        score += 4;
      }

      if (targetTimestamp > 0 && uploadTimestamp > 0) {
        const diffMinutes = Math.abs(uploadTimestamp - targetTimestamp) / 60000;
        if (diffMinutes <= 10) score += 40;
        else if (diffMinutes <= 30) score += 24;
        else if (diffMinutes <= 180) score += 12;
        else if (diffMinutes <= 1440) score += 4;
      }

      if (/\.(jpg|jpeg|png|webp|gif)$/i.test(name)) score += 1;
      return { name, index, score };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || right.index - left.index);

  const winner = scored[0];
  if (!winner) return "";
  if (kind === "return" && winner.score < (primaryName ? 90 : 28)) return "";
  if (kind === "before" && winner.score < 40) return "";

  const { data } = supabase.storage.from(NOTEBOOK_PROOF_BUCKET).getPublicUrl(`${folder}/${winner.name}`);
  return data?.publicUrl || "";
}

const NotebookBorrowRequestsPage = ({ theme, uiTheme, currentUser }) => {
  const channelRef = useRef(null);
  const proofLookupAttemptedRef = useRef(new Set());
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [borrowerProfiles, setBorrowerProfiles] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [proofUrlOverrides, setProofUrlOverrides] = useState({});

  const loadQueue = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await loadNotebookRequestQueue();
      if (error) throw error;
      const nextQueue = Array.isArray(data) ? data : [];
      setQueue(nextQueue);
      setErrorMessage("");

      const borrowerIds = [
        ...new Set(
          nextQueue
            .filter((item) => !normalizeText(item?.user_avatar_url))
            .map((item) => String(item?.user_id || "").trim())
            .filter(Boolean),
        ),
      ];
      if (borrowerIds.length === 0) {
        setBorrowerProfiles({});
      } else {
        const { data: profileRows, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, id_card_url")
          .in("id", borrowerIds);

        if (profileError) {
          console.error("Load notebook borrower profiles error:", profileError);
        } else if (Array.isArray(profileRows)) {
          const nextProfiles = borrowerIds.reduce((acc, id) => {
            acc[id] = null;
            return acc;
          }, {});

          profileRows.forEach((profile) => {
            const profileId = String(profile?.id || "").trim();
            if (!profileId) return;
            nextProfiles[profileId] = {
              full_name: profile?.full_name || "",
              avatar_url: profile?.avatar_url || "",
              id_card_url: profile?.id_card_url || "",
            };
          });

          setBorrowerProfiles(nextProfiles);
        }
      }
    } catch (error) {
      console.error("Load notebook queue error:", error);
      if (isNotebookSchemaError(error)) {
        setErrorMessage("ยังไม่ได้ติดตั้ง schema notebook borrowing");
      } else if (isNotebookPermissionDenied(error)) {
        setErrorMessage("สิทธิ์ไม่พอหรือ role ยังไม่ผ่าน notebook RLS (ต้องเป็น it_support/admin/it_manager และรัน SQL ล่าสุด)");
      } else {
        setErrorMessage("ไม่สามารถโหลดรายการยืม-คืนโน้ตบุ๊กได้");
      }
      setQueue([]);
      setBorrowerProfiles({});
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel("admin-notebook-borrow-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "borrow_logs" }, () => {
        loadQueue({ silent: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notebooks" }, () => {
        loadQueue({ silent: true });
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [loadQueue]);

  useEffect(() => {
    let cancelled = false;
    proofLookupAttemptedRef.current = new Set();
    setProofUrlOverrides({});
    const unresolvedRows = queue.filter((row) => {
      const beforeUrl = String(row?.image_url || "").trim();
      const returnUrl = String(row?.return_image_url || "").trim();
      return (
        (!isRenderableNotebookProofUrl(beforeUrl) && row?.image_name) ||
        (!isRenderableNotebookProofUrl(returnUrl) && (row?.return_image_name || row?.return_time))
      );
    });

    if (unresolvedRows.length === 0) return undefined;

    (async () => {
      const nextOverrides = {};
      for (const row of unresolvedRows) {
        const beforeUrl = String(row?.image_url || "").trim();
        if (!isRenderableNotebookProofUrl(beforeUrl) && row?.image_name) {
          const resolvedBefore = await resolveNotebookProofFromStorage(row, "before");
          if (resolvedBefore) {
            nextOverrides[`before:${row.log_id}`] = resolvedBefore;
          }
        }

        const returnUrl = String(row?.return_image_url || "").trim();
        if (!isRenderableNotebookProofUrl(returnUrl) && (row?.return_image_name || row?.return_time)) {
          const resolvedReturn = await resolveNotebookProofFromStorage(row, "return");
          if (resolvedReturn) {
            nextOverrides[`return:${row.log_id}`] = resolvedReturn;
          }
        }
      }

      if (!cancelled && Object.keys(nextOverrides).length > 0) {
        setProofUrlOverrides((prev) => ({ ...prev, ...nextOverrides }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queue]);

  const handleProofImageError = useCallback(
    async (row, kind) => {
      const key = `${kind}:${row?.log_id || row?.id || ""}`;
      if (!key || proofLookupAttemptedRef.current.has(key)) return;
      proofLookupAttemptedRef.current.add(key);

      const resolved = await resolveNotebookProofFromStorage(row, kind);
      if (!resolved) return;

      setProofUrlOverrides((prev) => {
        if (prev[key] === resolved) return prev;
        return { ...prev, [key]: resolved };
      });
    },
    [],
  );

  const summary = useMemo(() => {
    const count = {
      total: queue.length,
      pending: 0,
      approved: 0,
      returned: 0,
      active: 0,
    };

    queue.forEach((item) => {
      if (item.status === NOTEBOOK_LOG_STATUS.PENDING) count.pending += 1;
      if (item.status === NOTEBOOK_LOG_STATUS.APPROVED) count.approved += 1;
      if (item.status === NOTEBOOK_LOG_STATUS.RETURNED) count.returned += 1;
      if (item.status === NOTEBOOK_LOG_STATUS.APPROVED || (item.status === NOTEBOOK_LOG_STATUS.RETURNED && !item.return_confirmed_at)) {
        count.active += 1;
      }
    });

    return count;
  }, [queue]);

  const filteredQueue = useMemo(() => {
    const keyword = normalizeText(searchQuery).toLowerCase();

    return queue.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!keyword) return true;

      const source = [
        item.asset_code,
        item.model,
        item.user_name,
        item.user_role,
        item.reason,
        item.location,
        item.status,
        item.notebook_status,
      ]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");

      return source.includes(keyword);
    });
  }, [queue, searchQuery, statusFilter]);

  const handleApprove = useCallback(
    async (logId) => {
      if (!logId) return;
      setUpdatingId(String(logId));
      try {
        const { error } = await approveNotebookBorrow(Number(logId));
        if (error) throw error;
        toast.success("อนุมัติการยืมเรียบร้อยแล้ว");
        await loadQueue({ silent: true });
      } catch (error) {
        console.error("Approve notebook borrow error:", error);
        if (isNotebookSchemaError(error)) toast.error("ยังไม่ได้ติดตั้ง schema notebook borrowing");
        else if (isNotebookPermissionDenied(error)) toast.error("ไม่มีสิทธิ์อนุมัติรายการนี้");
        else toast.error(error?.message || "อนุมัติไม่สำเร็จ");
      } finally {
        setUpdatingId("");
      }
    },
    [loadQueue],
  );

  const handleConfirmReturn = useCallback(
    async (logId) => {
      if (!logId) return;
      setUpdatingId(String(logId));
      try {
        const { error } = await confirmNotebookReturn(Number(logId));
        if (error) throw error;
        toast.success("ยืนยันการคืน notebook แล้ว");
        await loadQueue({ silent: true });
      } catch (error) {
        console.error("Confirm notebook return error:", error);
        if (isNotebookSchemaError(error)) toast.error("ยังไม่ได้ติดตั้ง schema notebook borrowing");
        else if (isNotebookPermissionDenied(error)) toast.error("ไม่มีสิทธิ์ยืนยันคืนรายการนี้");
        else toast.error(error?.message || "ยืนยันคืนไม่สำเร็จ");
      } finally {
        setUpdatingId("");
      }
    },
    [loadQueue],
  );

  return (
    <>
      <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className={`text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
            อนุมัติยืม-คืนโน้ตบุ๊ก
          </h2>
          <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
            แยกจากระบบแจ้งซ่อม ใช้ตรวจสอบคำขอยืมและการคืน notebook แบบศูนย์กลาง
          </p>
        </div>

        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${uiTheme.statusBadge}`}>
          <Laptop size={14} />
          {currentUser?.name || "IT Desk"}
        </div>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ทั้งหมด</p>
          <p className="mt-1.5 text-2xl font-black text-[#2b59b0]">{summary.total}</p>
        </article>
        <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>รออนุมัติ</p>
          <p className="mt-1.5 text-2xl font-black text-amber-500">{summary.pending}</p>
        </article>
        <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>กำลังยืม</p>
          <p className="mt-1.5 text-2xl font-black text-blue-500">{summary.active}</p>
        </article>
        <article className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>คืนแล้ว</p>
          <p className="mt-1.5 text-2xl font-black text-emerald-500">{summary.returned}</p>
        </article>
      </section>

      <section className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ค้นหาจาก asset code, model, ผู้ยืม, เหตุผล, สถานที่"
              className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm ${uiTheme.searchInputMobile}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`rounded-lg border px-3 py-2.5 text-sm ${uiTheme.searchInputMobile}`}
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value={NOTEBOOK_LOG_STATUS.PENDING}>รออนุมัติ</option>
              <option value={NOTEBOOK_LOG_STATUS.APPROVED}>กำลังยืม</option>
              <option value={NOTEBOOK_LOG_STATUS.RETURNED}>คืนเรียบร้อย</option>
            </select>

            <button
              type="button"
              onClick={() => loadQueue()}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${uiTheme.statusButton}`}
            >
              <RefreshCw size={14} />
              รีเฟรช
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              กำลังโหลดรายการ notebook...
            </div>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className={`mt-4 rounded-xl border border-dashed p-8 text-center ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-slate-50"}`}>
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${theme === "dark" ? "bg-slate-800" : "bg-white"}`}>
              <AlertCircle size={22} className="text-slate-300" />
            </div>
            <p className={`text-sm font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>ไม่พบรายการยืม-คืนโน้ตบุ๊ก</p>
            <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ปรับตัวกรองหรือรีเฟรชข้อมูลเพื่อดูรายการล่าสุด</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredQueue.map((row) => {
              const logMeta = LOG_STATUS_META[row.status] || LOG_STATUS_META[NOTEBOOK_LOG_STATUS.PENDING];
              const notebookMeta = NOTEBOOK_STATUS_META[row.notebook_status] || NOTEBOOK_STATUS_META.available;
              const canApprove = row.status === NOTEBOOK_LOG_STATUS.PENDING;
              const canConfirm = row.status === NOTEBOOK_LOG_STATUS.RETURNED && !row.return_confirmed_at;
              const durationText = formatDuration(row.borrow_time, row.return_time);
              const beforeKey = `before:${row.log_id}`;
              const returnKey = `return:${row.log_id}`;
              const beforeImageUrl = proofUrlOverrides[beforeKey] || resolveNotebookProofUrl(row.image_url);
              const returnImageUrl = proofUrlOverrides[returnKey] || resolveNotebookProofUrl(row.return_image_url);
              const borrowerProfile = borrowerProfiles[String(row?.user_id || "").trim()] || null;
              const borrowerName =
                decodePossibleMojibake(row.user_name) ||
                decodePossibleMojibake(borrowerProfile?.full_name) ||
                "-";
              const borrowerAvatarUrl = resolveBorrowerAvatarUrl(row, borrowerProfile, borrowerName);

              return (
                <article
                  key={row.log_id}
                  className={`rounded-2xl border p-4 ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-white"}`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${notebookMeta.cls}`}>
                          <Laptop size={12} />
                          {row.asset_code || "-"}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${logMeta.cls}`}>
                          <ShieldCheck size={12} />
                          {logMeta.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                          {row.borrow_count || 0} ครั้ง
                        </span>
                      </div>

                      <h3 className={`mt-3 text-base font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                        {row.model || "-"}
                      </h3>
                      <div className="mt-3 flex items-center gap-3">
                        <BorrowerAvatar src={borrowerAvatarUrl} name={borrowerName} theme={theme} />
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
                            {borrowerName}
                          </p>
                          <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                            {row.user_role ? decodePossibleMojibake(row.user_role) : "-"}
                          </p>
                        </div>
                      </div>
                      <p className="hidden">
                        {decodePossibleMojibake(row.user_name) || "-"} {row.user_role ? `• ${decodePossibleMojibake(row.user_role)}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {row.notebook_status || "-"}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {formatNotebookTime(row.requested_at)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-slate-50"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ยืมเมื่อ</p>
                      <p className={`mt-1 text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{formatNotebookTime(row.borrow_time || row.requested_at)}</p>
                    </div>
                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-slate-50"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>คืนเมื่อ</p>
                      <p className={`mt-1 text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{formatNotebookTime(row.return_time)}</p>
                    </div>
                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-slate-50"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>ระยะเวลา</p>
                      <p className={`mt-1 text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{durationText}</p>
                    </div>
                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-slate-50"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>คนอนุมัติ</p>
                      <p className={`mt-1 text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{row.approved_by_name || row.confirmed_by_name || "-"}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr,0.8fr]">
                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-50 bg-slate-50"}`}>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-[#2b59b0]" />
                        <p className={`text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>เหตุผล / สถานที่</p>
                      </div>
                      <p className={`mt-2 whitespace-pre-line text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                        {decodePossibleMojibake(row.reason) || "-"}
                      </p>
                      <p className={`mt-2 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                        ใช้ที่: {decodePossibleMojibake(row.location) || "-"}
                      </p>
                    </div>

                    <div className={`rounded-xl border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-50 bg-slate-50"}`}>
                      <div className="flex items-center gap-2">
                        <ImageIcon size={14} className="text-[#2b59b0]" />
                        <p className={`text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>หลักฐานรูปภาพ</p>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className={`overflow-hidden rounded-xl border ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-white"}`}>
                          <div className={`border-b px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                            รูปก่อนยืม
                          </div>
                          {beforeImageUrl ? (
                            <button
                              type="button"
                              onClick={() => window.open(beforeImageUrl, "_blank", "noopener,noreferrer")}
                              className="block w-full"
                              title="Open before-borrow image"
                            >
                              <img
                                src={beforeImageUrl}
                                alt={`${row.asset_code || "notebook"}-before-borrow`}
                                className="h-36 w-full object-cover"
                                onError={() => handleProofImageError(row, "before")}
                              />
                            </button>
                          ) : (
                            <div className={`flex h-36 items-center justify-center px-3 text-center text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
                              ยังไม่มีรูปก่อนยืม
                            </div>
                          )}
                        </div>

                        <div className={`overflow-hidden rounded-xl border ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-white"}`}>
                          <div className={`border-b px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                            รูปตอนคืน
                          </div>
                          {returnImageUrl ? (
                            <button
                              type="button"
                              onClick={() => window.open(returnImageUrl, "_blank", "noopener,noreferrer")}
                              className="block w-full"
                              title="Open return image"
                            >
                              <img
                                src={returnImageUrl}
                                alt={`${row.asset_code || "notebook"}-return`}
                                className="h-36 w-full object-cover"
                                onError={() => handleProofImageError(row, "return")}
                              />
                            </button>
                          ) : (
                            <div className={`flex h-36 items-center justify-center px-3 text-center text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
                              ยังไม่มีรูปตอนคืน
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    {canApprove && (
                      <button
                        type="button"
                        onClick={() => handleApprove(row.log_id)}
                        disabled={updatingId === String(row.log_id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {updatingId === String(row.log_id) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        อนุมัติ
                      </button>
                    )}

                    {canConfirm && (
                      <button
                        type="button"
                        onClick={() => handleConfirmReturn(row.log_id)}
                        disabled={updatingId === String(row.log_id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                      >
                        {updatingId === String(row.log_id) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        ยืนยันคืน
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
};

export default NotebookBorrowRequestsPage;
