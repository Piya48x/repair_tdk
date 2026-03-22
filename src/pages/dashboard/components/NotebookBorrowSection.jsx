import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import { ArrowLeft, Camera, CheckCircle2, FlipHorizontal, History, Loader2, MapPin, MessageCircle, RefreshCw, Search, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../../lib/supabaseClient";
import {
  formatNotebookTime,
  isNotebookPermissionDenied,
  isNotebookSchemaError,
  loadMyNotebookBorrowLogs,
  loadNotebookDashboard,
  requestNotebookBorrow,
  requestNotebookReturn,
  uploadNotebookReturnProof,
  uploadNotebookProof,
  NOTEBOOK_LOG_STATUS,
  NOTEBOOK_STATUS,
  normalizeText,
} from "../../../services/notebookBorrowService";

const STATUS_META = {
  [NOTEBOOK_STATUS.AVAILABLE]: { label: "พร้อมให้ยืม", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  [NOTEBOOK_STATUS.BORROWED]: { label: "ถูกยืม", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  [NOTEBOOK_STATUS.REPAIR]: { label: "ซ่อม", cls: "border-amber-200 bg-amber-50 text-amber-700" },
};

const LOG_META = {
  [NOTEBOOK_LOG_STATUS.PENDING]: { label: "รออนุมัติ", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  [NOTEBOOK_LOG_STATUS.APPROVED]: { label: "กำลังยืม", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  [NOTEBOOK_LOG_STATUS.RETURNED]: { label: "คืนเรียบร้อย", cls: "border-violet-200 bg-violet-50 text-violet-700" },
};

function formatDuration(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  const diff = Math.max(0, end.getTime() - start.getTime());
  const totalHours = Math.floor(diff / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days} วัน ${hours} ชม.`;
  if (hours > 0) return `${hours} ชม. ${minutes > 0 ? `${minutes} นาที` : ""}`.trim();
  return `${minutes} นาที`;
}

function getNotebookCodeFromLog(log, notebooksById) {
  if (!log) return "-";
  return (
    log.asset_code ||
    notebooksById.get(String(log.notebook_id || ""))?.asset_code ||
    "-"
  );
}

export default function NotebookBorrowSection({ currentUser, isDarkTheme = false, onOpenChat }) {
  const currentUserId = String(currentUser?.id || "");
  const currentUserName = currentUser?.name || currentUser?.full_name || "User";
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const returnWebcamRef = useRef(null);
  const returnFileInputRef = useRef(null);
  const channelRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [notebooks, setNotebooks] = useState([]);
  const [myLogs, setMyLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [borrowReason, setBorrowReason] = useState("");
  const [borrowLocation, setBorrowLocation] = useState("");
  const [borrowFile, setBorrowFile] = useState(null);
  const [borrowPreview, setBorrowPreview] = useState("");
  const [borrowFacingMode, setBorrowFacingMode] = useState("environment");
  const [cameraError, setCameraError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnDialogLog, setReturnDialogLog] = useState(null);
  const [returnFile, setReturnFile] = useState(null);
  const [returnPreview, setReturnPreview] = useState("");
  const [returnFacingMode, setReturnFacingMode] = useState("environment");
  const [returnCameraError, setReturnCameraError] = useState(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!currentUserId) return;
    if (!silent) setLoading(true);
    try {
      const [{ data: notebookRows, error: notebookError }, { data: logRows, error: logError }] =
        await Promise.all([loadNotebookDashboard(), loadMyNotebookBorrowLogs()]);
      if (notebookError) throw notebookError;
      if (logError) throw logError;
      setNotebooks(Array.isArray(notebookRows) ? notebookRows : []);
      setMyLogs(Array.isArray(logRows) ? logRows : []);
      setErrorMessage("");
    } catch (error) {
      console.error("Load notebook error:", error);
      if (isNotebookSchemaError(error)) setErrorMessage("ระบบฐานข้อมูล notebook ยังไม่อัปเดต กรุณาให้ IT รัน migration ล่าสุด");
      else if (isNotebookPermissionDenied(error)) setErrorMessage("ไม่มีสิทธิ์เข้าถึง notebook schema หรือ RLS ยังไม่พร้อม");
      else setErrorMessage("โหลดข้อมูล notebook ไม่สำเร็จ");
      setNotebooks([]);
      setMyLogs([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return undefined;
    loadData();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel(`notebook-borrow-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notebooks" }, () => loadData({ silent: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "borrow_logs" }, () => loadData({ silent: true }))
      .subscribe();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [currentUserId, loadData]);

  useEffect(() => {
    return () => {
      if (borrowPreview && borrowPreview.startsWith("blob:")) URL.revokeObjectURL(borrowPreview);
    };
  }, [borrowPreview]);

  useEffect(() => {
    return () => {
      if (returnPreview && returnPreview.startsWith("blob:")) URL.revokeObjectURL(returnPreview);
    };
  }, [returnPreview]);

  const notebooksById = useMemo(() => {
    const map = new Map();
    notebooks.forEach((item) => map.set(String(item?.id || ""), item));
    return map;
  }, [notebooks]);

  const latestLogByNotebook = useMemo(() => {
    const map = new Map();
    myLogs.forEach((log) => {
      const key = String(log?.notebook_id || "");
      if (!map.has(key)) map.set(key, log);
    });
    return map;
  }, [myLogs]);

  const activeBorrowLog = useMemo(
    () =>
      myLogs.find((log) => {
        if (log?.status !== NOTEBOOK_LOG_STATUS.APPROVED) return false;
        const notebook = notebooksById.get(String(log?.notebook_id || ""));
        if (!notebook) return true;
        return (
          notebook?.status === NOTEBOOK_STATUS.BORROWED &&
          String(notebook?.current_user_id || "") === currentUserId
        );
      }) || null,
    [currentUserId, myLogs, notebooksById],
  );
  const pendingBorrowRequest = useMemo(
    () => myLogs.find((log) => log?.status === NOTEBOOK_LOG_STATUS.PENDING) || null,
    [myLogs],
  );
  const pendingReturnLog = useMemo(
    () => myLogs.find((log) => log?.status === NOTEBOOK_LOG_STATUS.RETURNED && !log?.return_confirmed_at) || null,
    [myLogs],
  );
  const filteredNotebooks = useMemo(() => {
    const keyword = normalizeText(searchQuery).toLowerCase();
    return notebooks.filter((item) => {
      if (!keyword) return true;
      const source = [item?.asset_code, item?.model, item?.status, item?.current_user_name]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");
      return source.includes(keyword);
    });
  }, [notebooks, searchQuery]);

  const borrowedByOtherCount = useMemo(
    () =>
      notebooks.filter(
        (item) =>
          item?.status === NOTEBOOK_STATUS.BORROWED &&
          String(item?.current_user_id || "") !== "" &&
          String(item?.current_user_id || "") !== currentUserId,
      ).length,
    [currentUserId, notebooks],
  );

  const visibleNotebooks = useMemo(() => {
    const getSortRank = (item) => {
      const ownerId = String(item?.current_user_id || "");
      const isMineActive = item?.status === NOTEBOOK_STATUS.BORROWED && ownerId === currentUserId;
      const isBorrowedByOther = item?.status === NOTEBOOK_STATUS.BORROWED && ownerId !== "" && ownerId !== currentUserId;

      if (item?.status === NOTEBOOK_STATUS.AVAILABLE && ownerId === "") return 0;
      if (isMineActive) return 1;
      if (isBorrowedByOther) return 2;
      if (item?.status === NOTEBOOK_STATUS.REPAIR) return 3;
      return 4;
    };

    return [...filteredNotebooks].sort((left, right) => {
      const rankDiff = getSortRank(left) - getSortRank(right);
      if (rankDiff !== 0) return rankDiff;
      return String(left?.asset_code || "").localeCompare(String(right?.asset_code || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [currentUserId, filteredNotebooks]);

  const closeBorrowModal = useCallback(() => {
    setSelectedNotebook(null);
    setBorrowReason("");
    setBorrowLocation("");
    setBorrowFile(null);
    setCameraError(false);
    setBorrowFacingMode("environment");
    if (borrowPreview && borrowPreview.startsWith("blob:")) URL.revokeObjectURL(borrowPreview);
    setBorrowPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [borrowPreview]);

  const closeReturnDialog = useCallback(() => {
    setReturnDialogLog(null);
    setReturnFile(null);
    setReturnCameraError(false);
    setReturnFacingMode("environment");
    if (returnPreview && returnPreview.startsWith("blob:")) URL.revokeObjectURL(returnPreview);
    setReturnPreview("");
    if (returnFileInputRef.current) returnFileInputRef.current.value = "";
  }, [returnPreview]);

  const setPhotoFile = useCallback((file) => {
    if (!file) return;
    if (borrowPreview && borrowPreview.startsWith("blob:")) URL.revokeObjectURL(borrowPreview);
    setBorrowFile(file);
    setBorrowPreview(URL.createObjectURL(file));
  }, [borrowPreview]);

  const setReturnPhotoFile = useCallback((file) => {
    if (!file) return;
    if (returnPreview && returnPreview.startsWith("blob:")) URL.revokeObjectURL(returnPreview);
    setReturnFile(file);
    setReturnPreview(URL.createObjectURL(file));
  }, [returnPreview]);

  const handleBorrow = useCallback((notebook) => {
    if (!notebook) return;
    const ownerId = String(notebook?.current_user_id || "");
    const isBorrowedByOther = notebook?.status === NOTEBOOK_STATUS.BORROWED && ownerId !== "" && ownerId !== currentUserId;
    if (isBorrowedByOther || notebook?.status !== NOTEBOOK_STATUS.AVAILABLE) {
      const borrowerName = normalizeText(notebook?.current_user_name) || "ผู้ใช้งานอื่น";
      toast.error(
        isBorrowedByOther
          ? `Notebook ${notebook?.asset_code || "-"} กำลังถูกยืมโดย ${borrowerName}`
          : "Notebook เครื่องนี้ไม่ว่าง",
      );
      return;
    }
    if (pendingBorrowRequest || activeBorrowLog || pendingReturnLog) {
      const pendingNotebookCode = getNotebookCodeFromLog(pendingBorrowRequest, notebooksById);
      const activeNotebookCode = getNotebookCodeFromLog(activeBorrowLog, notebooksById);
      const returnNotebookCode = getNotebookCodeFromLog(pendingReturnLog, notebooksById);
      if (pendingBorrowRequest) {
        toast.error(`มีคำขอยืม notebook ${pendingNotebookCode} รออนุมัติอยู่`);
      } else if (activeBorrowLog) {
        toast.error(`คุณยังยืม notebook ${activeNotebookCode} อยู่ กรุณาคืนก่อน`);
      } else if (pendingReturnLog) {
        toast.error(`Notebook ${returnNotebookCode} อยู่ระหว่างรอ IT ยืนยันการคืน`);
      } else {
        toast.error("คุณมีรายการ notebook ค้างอยู่");
      }
      return;
    }
    setSelectedNotebook(notebook);
    setBorrowReason("");
    setBorrowLocation("");
    setBorrowFile(null);
    setCameraError(false);
    setBorrowFacingMode("environment");
    if (borrowPreview && borrowPreview.startsWith("blob:")) URL.revokeObjectURL(borrowPreview);
    setBorrowPreview("");
  }, [activeBorrowLog, borrowPreview, currentUserId, notebooksById, pendingBorrowRequest, pendingReturnLog]);

  const captureFromCamera = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot?.();
    if (!imageSrc) return toast.error("ถ่ายรูปไม่สำเร็จ");
    try {
      const blob = await fetch(imageSrc).then((response) => response.blob());
      setPhotoFile(new File([blob], `notebook_${Date.now()}.jpg`, { type: "image/jpeg" }));
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถบันทึกรูปจากกล้องได้");
    }
  }, [setPhotoFile]);

  const captureReturnFromCamera = useCallback(async () => {
    const imageSrc = returnWebcamRef.current?.getScreenshot?.();
    if (!imageSrc) return toast.error("ถ่ายรูปตอนคืนไม่สำเร็จ");
    try {
      const blob = await fetch(imageSrc).then((response) => response.blob());
      setReturnPhotoFile(new File([blob], `notebook_return_${Date.now()}.jpg`, { type: "image/jpeg" }));
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถบันทึกรูปตอนคืนได้");
    }
  }, [setReturnPhotoFile]);

  const handleBorrowSubmit = useCallback(async () => {
    if (!selectedNotebook) return;
    const reason = normalizeText(borrowReason);
    const location = normalizeText(borrowLocation);
    if (!reason) return toast.error("กรุณาระบุเหตุผลในการยืม");
    if (!location) return toast.error("กรุณาระบุสถานที่ใช้งาน");
    if (!borrowFile) return toast.error("กรุณาถ่ายรูป notebook ก่อนยืนยัน");

    setIsSubmitting(true);
    try {
      const imageUrl = await uploadNotebookProof(borrowFile, currentUserId);
      const { error } = await requestNotebookBorrow({
        notebookId: Number(selectedNotebook.id),
        reason,
        location,
        imageUrl,
        imageName: borrowFile.name || null,
        imageMimeType: borrowFile.type || null,
        imageSize: borrowFile.size || null,
      });
      if (error) throw error;
      toast.success("ส่งคำขอยืม notebook แล้ว");
      closeBorrowModal();
      await loadData({ silent: true });
    } catch (error) {
      console.error(error);
      if (String(error?.message || "").includes("active notebook borrow")) {
        toast.error(String(error?.message || "").replace("You already have an active notebook borrow:", "คุณมี notebook ค้างอยู่แล้ว:"));
        await loadData({ silent: true });
        return;
      }
      if (isNotebookSchemaError(error)) toast.error("ฐานข้อมูล notebook ยังไม่อัปเดต กรุณาติดต่อ IT");
      else if (isNotebookPermissionDenied(error)) toast.error("ไม่มีสิทธิ์ใช้งานคำขอนี้");
      else toast.error(error?.message || "ส่งคำขอยืมไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  }, [borrowFile, borrowLocation, borrowReason, closeBorrowModal, currentUserId, loadData, selectedNotebook]);

  const handleReturnRequest = useCallback((log) => {
    if (!log) return;
    const currentLogId = Number(log?.log_id || log?.id || 0);
    const pendingReturnId = Number(pendingReturnLog?.log_id || pendingReturnLog?.id || 0);
    if (pendingReturnId > 0 && currentLogId !== pendingReturnId) {
      toast.error("คุณส่งคำขอคืนไปแล้ว กรุณารอ IT ยืนยัน");
      loadData({ silent: true });
      return;
    }
    if (log?.status !== NOTEBOOK_LOG_STATUS.APPROVED) {
      toast.error("รายการนี้ไม่อยู่ในสถานะที่คืนได้แล้ว");
      loadData({ silent: true });
      return;
    }
    const notebook = notebooksById.get(String(log?.notebook_id || ""));
    const isStillBorrowedByMe =
      notebook?.status === NOTEBOOK_STATUS.BORROWED &&
      String(notebook?.current_user_id || "") === currentUserId;
    if (!isStillBorrowedByMe) {
      toast.error("รายการนี้ไม่อยู่ในสถานะยืมแล้ว ระบบจะรีเฟรชข้อมูลล่าสุด");
      loadData({ silent: true });
      return;
    }
    if (returnPreview && returnPreview.startsWith("blob:")) URL.revokeObjectURL(returnPreview);
    setReturnDialogLog(log);
    setReturnFile(null);
    setReturnCameraError(false);
    setReturnFacingMode("environment");
    setReturnPreview("");
  }, [currentUserId, loadData, notebooksById, pendingReturnLog, returnPreview]);

  const handleConfirmReturn = useCallback(async () => {
    if (!returnDialogLog) return;
    if (!returnFile) return toast.error("กรุณาถ่ายรูปตอนคืน notebook ก่อน");
    setIsSubmitting(true);
    try {
      const returnImageUrl = await uploadNotebookReturnProof(returnFile, currentUserId);
      const { error } = await requestNotebookReturn({
        logId: Number(returnDialogLog.log_id || returnDialogLog.id),
        returnImageUrl,
        returnImageName: returnFile.name || null,
        returnImageMimeType: returnFile.type || null,
        returnImageSize: returnFile.size || null,
      });
      if (error) throw error;
      toast.success("ส่งคำขอคืน notebook แล้ว");
      closeReturnDialog();
      await loadData({ silent: true });
    } catch (error) {
      console.error(error);
      if (String(error?.code || "") === "P0001" && String(error?.message || "").toLowerCase().includes("not currently borrowed")) {
        toast.error("Notebook รายการนี้ไม่อยู่ในสถานะยืมแล้ว");
        closeReturnDialog();
        await loadData({ silent: true });
        return;
      }
      if (isNotebookSchemaError(error)) toast.error("ฐานข้อมูล notebook ยังไม่อัปเดต กรุณาติดต่อ IT");
      else if (isNotebookPermissionDenied(error)) toast.error("ไม่มีสิทธิ์ใช้งานคำขอนี้");
      else toast.error(error?.message || "ส่งคำขอคืนไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  }, [closeReturnDialog, currentUserId, loadData, returnDialogLog, returnFile]);

  if (!currentUserId) return null;

  const shellClass = isDarkTheme ? "border-slate-700 bg-slate-900/80 text-slate-100" : "border-blue-100 bg-white/95 text-slate-800";
  const mutedClass = isDarkTheme ? "border-slate-700 bg-slate-800/75" : "border-slate-200 bg-slate-50";
  const subtleTextClass = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const headingClass = isDarkTheme ? "text-slate-100" : "text-slate-900";
  const bodyClass = isDarkTheme ? "text-slate-300" : "text-slate-600";
  const returnNotebook = returnDialogLog ? notebooksById.get(String(returnDialogLog.notebook_id || "")) : null;

  return (
    <section className={`overflow-hidden rounded-3xl border ${shellClass}`}>
      <div className="bg-gradient-to-r from-[#1c376d] via-[#2b59b0] to-[#244a95] px-4 py-4 text-white sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/75">Notebook Center</p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">ยืม-คืนโน้ตบุ๊ก</h2>
            <p className="mt-1 text-sm text-white/80">ถ่ายรูป notebook ก่อนยืนยัน และส่งคำขอให้ IT อนุมัติ</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => loadData()} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
              <RefreshCw size={14} />
              รีเฟรช
            </button>
            <button type="button" onClick={() => onOpenChat?.()} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white px-3 py-2 text-sm font-semibold text-[#244a95] transition hover:bg-white/90">
              <MessageCircle size={14} />
              เปิดแชท IT
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {errorMessage && <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${isDarkTheme ? "border-rose-700 bg-rose-900/30 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{errorMessage}</div>}

        {pendingBorrowRequest && (
          <div className={`rounded-3xl border px-4 py-4 ${isDarkTheme ? "border-amber-700/50 bg-amber-950/30" : "border-amber-200 bg-amber-50/70"}`}>
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-500">คำขอรออนุมัติ</p>
            <h3 className={`mt-1 text-lg font-black ${headingClass}`}>{getNotebookCodeFromLog(pendingBorrowRequest, notebooksById)}</h3>
            <p className={`mt-1 text-sm ${bodyClass}`}>รอ IT อนุมัติ ก่อนจึงจะถือว่ายืมสำเร็จ</p>
          </div>
        )}

        {activeBorrowLog && (
          <div className={`rounded-3xl border px-4 py-4 ${isDarkTheme ? "border-blue-700/50 bg-blue-950/30" : "border-blue-200 bg-blue-50/70"}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-blue-500">รายการที่กำลังยืม</p>
                <h3 className={`mt-1 text-lg font-black ${headingClass}`}>{getNotebookCodeFromLog(activeBorrowLog, notebooksById)}</h3>
                <p className={`mt-1 text-sm ${bodyClass}`}>{formatNotebookTime(activeBorrowLog.borrow_time)} • {currentUserName}</p>
              </div>
              <button type="button" onClick={() => handleReturnRequest(activeBorrowLog)} className="inline-flex items-center gap-2 rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#244a95]">
                <Upload size={14} className="hidden" />
                <ArrowLeft size={14} />
                คืน notebook
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ค้นหา asset code, model, สถานะ"
              className={`w-full rounded-2xl border py-2.5 pl-9 pr-3 text-sm outline-none ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => loadData()} className={`rounded-2xl px-3 py-2 text-sm font-semibold ${isDarkTheme ? "border border-slate-600 bg-slate-800 text-slate-200" : "border border-slate-200 bg-white text-slate-700"}`}>
              รีเฟรช
            </button>
          </div>
        </div>

        {loading ? (
          <div className={`flex min-h-[220px] items-center justify-center rounded-3xl border ${mutedClass}`}>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              กำลังโหลด notebook...
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4`}>
              {[
                ["ทั้งหมด", notebooks.length, "text-slate-900"],
                ["พร้อมให้ยืม", notebooks.filter((item) => item?.status === NOTEBOOK_STATUS.AVAILABLE).length, "text-emerald-500"],
                ["ถูกยืม", notebooks.filter((item) => item?.status === NOTEBOOK_STATUS.BORROWED).length, "text-blue-500"],
                ["ซ่อม", notebooks.filter((item) => item?.status === NOTEBOOK_STATUS.REPAIR).length, "text-amber-500"],
              ].map(([label, value, color]) => (
                <article key={label} className={`rounded-2xl border p-4 ${mutedClass}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${subtleTextClass}`}>{label}</p>
                  <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
                </article>
              ))}
            </div>

            {borrowedByOtherCount > 0 && (
              <div className={`rounded-3xl border px-4 py-3 text-sm font-semibold ${isDarkTheme ? "border-blue-700/50 bg-blue-950/30 text-blue-100" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
                มี notebook ถูกยืมอยู่แล้ว {borrowedByOtherCount} เครื่อง ให้เลือกเครื่องที่สถานะพร้อมให้ยืมแทน
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {visibleNotebooks.length === 0 ? (
                <div className={`rounded-3xl border border-dashed p-8 text-center ${mutedClass} lg:col-span-3`}>
                  <p className={`text-sm font-semibold ${headingClass}`}>ไม่พบ notebook</p>
                </div>
              ) : (
                visibleNotebooks.map((notebook) => {
                  const notebookMeta = STATUS_META[notebook?.status] || STATUS_META[NOTEBOOK_STATUS.AVAILABLE];
                  const myLog = latestLogByNotebook.get(String(notebook?.id || ""));
                  const currentOwnerId = String(notebook?.current_user_id || "");
                  const isMineActive = notebook?.status === NOTEBOOK_STATUS.BORROWED && currentOwnerId === currentUserId;
                  const isBorrowedByOther = notebook?.status === NOTEBOOK_STATUS.BORROWED && currentOwnerId !== "" && currentOwnerId !== currentUserId;
                  const isMinePending = myLog?.status === NOTEBOOK_LOG_STATUS.PENDING;
                  const isMineReturnPending = myLog?.status === NOTEBOOK_LOG_STATUS.RETURNED && !myLog?.return_confirmed_at;
                  const isBlockedByOtherBorrow = Boolean(pendingBorrowRequest || activeBorrowLog || pendingReturnLog || isMinePending || isMineReturnPending);
                  const canBorrow = notebook?.status === NOTEBOOK_STATUS.AVAILABLE && currentOwnerId === "" && !isBlockedByOtherBorrow;
                  const borrowerName = normalizeText(notebook?.current_user_name) || "ผู้ใช้งานอื่น";

                  return (
                    <article key={notebook.id} className={`rounded-3xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-800/75" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2b59b0]/70">Asset</p>
                          <h3 className={`mt-1 text-lg font-black ${headingClass}`}>{notebook.asset_code}</h3>
                          <p className={`mt-1 text-sm ${bodyClass}`}>{notebook.model || "-"}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${notebookMeta.cls}`}>{notebookMeta.label}</span>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-100 bg-slate-50"}`}>
                          <span className={`text-xs ${subtleTextClass}`}>{isBorrowedByOther ? "ผู้ยืมปัจจุบัน" : "ผู้ใช้งานล่าสุด"}</span>
                          <span className={`max-w-[60%] truncate text-xs font-bold ${headingClass}`}>{isBorrowedByOther ? borrowerName : notebook.current_user_name || "-"}</span>
                        </div>
                        {isBorrowedByOther && (
                          <div className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${isDarkTheme ? "border-blue-700/50 bg-blue-950/35 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
                            เครื่องนี้กำลังถูกยืมอยู่ ให้เลือก notebook ที่ว่างเครื่องอื่นแทน
                          </div>
                        )}
                        <div className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-100 bg-slate-50"}`}>
                          <span className={`text-xs ${subtleTextClass}`}>เวลา</span>
                          <span className={`text-xs font-bold ${headingClass}`}>{formatNotebookTime(notebook.borrow_time || notebook.latest_log_requested_at)}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {isMinePending && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${LOG_META[NOTEBOOK_LOG_STATUS.PENDING].cls}`}>รออนุมัติ</span>}
                        {isMineActive && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${LOG_META[NOTEBOOK_LOG_STATUS.APPROVED].cls}`}>กำลังใช้งาน</span>}
                        {isMineReturnPending && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${LOG_META[NOTEBOOK_LOG_STATUS.RETURNED].cls}`}>รอยืนยันคืน</span>}
                      </div>

                      <div className="mt-4">
                        {notebook?.status === NOTEBOOK_STATUS.REPAIR ? (
                          <button type="button" disabled className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">อยู่ระหว่างซ่อม</button>
                        ) : isMineActive ? (
                          <button type="button" onClick={() => handleReturnRequest(myLog)} className="w-full rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white">คืน</button>
                        ) : canBorrow ? (
                          <button type="button" onClick={() => handleBorrow(notebook)} className="w-full rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white">ยืม</button>
                        ) : (
                          <button type="button" disabled className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
                            {isBorrowedByOther
                              ? `กำลังถูกยืมโดย ${borrowerName}`
                              : notebook?.status === NOTEBOOK_STATUS.BORROWED
                                ? "มีผู้ใช้งาน"
                              : pendingBorrowRequest
                                ? `รออนุมัติ ${getNotebookCodeFromLog(pendingBorrowRequest, notebooksById)}`
                                : activeBorrowLog
                                  ? `กำลังยืม ${getNotebookCodeFromLog(activeBorrowLog, notebooksById)}`
                                  : pendingReturnLog
                                    ? `รอยืนยันคืน ${getNotebookCodeFromLog(pendingReturnLog, notebooksById)}`
                                    : "รอเคลียร์รายการ"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#2b59b0]" />
                <h3 className={`text-sm font-black ${headingClass}`}>ประวัติของฉัน</h3>
              </div>
              {myLogs.length === 0 ? (
                <div className={`rounded-3xl border border-dashed p-8 text-center ${mutedClass}`}>
                  <p className={`text-sm font-semibold ${headingClass}`}>ยังไม่มีประวัติการยืม notebook</p>
                </div>
              ) : (
                myLogs.slice(0, 8).map((log) => {
                  const notebook = notebooksById.get(String(log?.notebook_id || ""));
                  const meta = LOG_META[log?.status] || LOG_META[NOTEBOOK_LOG_STATUS.PENDING];
                  const durationText = log?.return_time ? formatDuration(log.borrow_time, log.return_time) : log?.borrow_time ? formatDuration(log.borrow_time, new Date().toISOString()) : "-";
                  return (
                    <article key={log.log_id} className={`rounded-3xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-800/75" : "border-slate-200 bg-white"}`}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isDarkTheme ? "border-slate-600 bg-slate-900/60 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{notebook?.asset_code || log?.asset_code || "-"}</span>
                          </div>
                          <h4 className={`mt-2 text-base font-black ${headingClass}`}>{notebook?.model || log?.model || "-"}</h4>
                          <p className={`mt-1 text-sm ${bodyClass}`}>{log?.reason || "-"} • {log?.location || "-"}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className={`rounded-full border px-2.5 py-1 ${isDarkTheme ? "border-slate-700 bg-slate-900/70 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>ยืม: {formatNotebookTime(log?.borrow_time || log?.requested_at)}</span>
                            <span className={`rounded-full border px-2.5 py-1 ${isDarkTheme ? "border-slate-700 bg-slate-900/70 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>คืน: {formatNotebookTime(log?.return_time)}</span>
                            <span className={`rounded-full border px-2.5 py-1 ${isDarkTheme ? "border-slate-700 bg-slate-900/70 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>ใช้ไป: {durationText}</span>
                          </div>
                        </div>
                        {log?.status === NOTEBOOK_LOG_STATUS.APPROVED && (
                          <button type="button" onClick={() => handleReturnRequest(log)} className="rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white">คืน</button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {selectedNotebook && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
          <button type="button" onClick={closeBorrowModal} className="absolute inset-0" aria-label="close" />
          <div className={`relative z-10 flex w-full max-w-5xl max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-[1.6rem] border sm:rounded-[2rem] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2b59b0]/80">Borrow Notebook</p>
                <h3 className={`mt-1 text-xl font-black ${headingClass}`}>{selectedNotebook.asset_code}</h3>
                <p className={`mt-1 text-sm ${bodyClass}`}>{selectedNotebook.model || "-"}</p>
              </div>
              <button type="button" onClick={closeBorrowModal} className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-600"}`}>
                <X size={15} />
              </button>
            </div>
            <div className="grid flex-1 min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:px-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
              <div className="space-y-4">
                <div className={`overflow-hidden rounded-[1.75rem] border ${isDarkTheme ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-100"}`}>
                  {cameraError ? (
                    <div className="flex min-h-[280px] items-center justify-center text-center">
                      <div>
                        <Camera size={28} className="mx-auto text-[#2b59b0]" />
                        <p className={`mt-3 text-sm font-semibold ${headingClass}`}>กล้องไม่พร้อมใช้งาน</p>
                        <p className={`mt-1 text-xs ${bodyClass}`}>สามารถอัปโหลดรูปแทนได้</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-950 sm:aspect-video">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.92}
                        mirrored={borrowFacingMode === "user"}
                        videoConstraints={{ facingMode: borrowFacingMode }}
                        onUserMediaError={() => setCameraError(true)}
                        className={`absolute inset-0 h-full w-full object-cover transition duration-200 ${borrowPreview ? "opacity-25" : "opacity-100"}`}
                      />
                      {borrowPreview && (
                        <img src={borrowPreview} alt="borrow-preview" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-slate-950/80 to-transparent px-4 py-3 text-white">
                        <div className="min-w-0">
                          <p className="text-sm font-bold">ถ่ายรูป notebook</p>
                          <p className="text-[11px] text-white/75">
                            {borrowPreview ? "รูปนี้จะถูกใช้เป็นหลักฐานก่อนยืนยัน" : "ถ่ายแล้วรูปจะถูกซ้อนทับบนกล้องทันที"}
                          </p>
                        </div>
                        {borrowPreview && (
                          <span className="inline-flex rounded-full border border-white/15 bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                            พร้อมใช้
                          </span>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] text-white/75">
                          {borrowPreview ? "ถ่ายใหม่ได้ตลอด หรือสลับกล้องหน้า/หลัง" : "รองรับกล้องหน้า/หลัง และแสดงตัวอย่างทันที"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setBorrowFacingMode((mode) => (mode === "user" ? "environment" : "user"))}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15 max-sm:flex-1 max-sm:justify-center"
                          >
                            <FlipHorizontal size={14} />
                            <span className="hidden sm:inline">สลับกล้อง</span>
                          </button>
                          <button
                            type="button"
                            onClick={captureFromCamera}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-[#244a95] max-sm:flex-1 max-sm:justify-center"
                          >
                            <Camera size={14} />
                            {borrowPreview ? "ถ่ายใหม่" : "ถ่ายรูป"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold max-sm:flex-1 max-sm:justify-center ${isDarkTheme ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}>
                    <Upload size={14} />
                    อัปโหลดรูป
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => setPhotoFile(event.target.files?.[0])} />
                </div>
              </div>

              <div className="space-y-4">
                <div className={`rounded-[1.75rem] border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-800/70" : "border-slate-100 bg-slate-50/80"}`}>
                  <p className={`text-sm font-bold ${headingClass}`}>Notebook</p>
                  <p className={`mt-1 text-sm ${bodyClass}`}>{selectedNotebook.asset_code}</p>
                </div>
                <label className="block">
                  <span className={`text-xs font-bold uppercase tracking-wider ${subtleTextClass}`}>เหตุผลในการยืม</span>
                  <textarea
                    rows={4}
                    value={borrowReason}
                    onChange={(event) => setBorrowReason(event.target.value)}
                    placeholder="เช่น ใช้ประชุม, ทดสอบระบบ, ใช้ทำงานนอกสถานที่"
                    className={`mt-2 w-full rounded-[1.4rem] border px-4 py-3 text-sm outline-none ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
                  />
                </label>
                <label className="block">
                  <span className={`text-xs font-bold uppercase tracking-wider ${subtleTextClass}`}>สถานที่ใช้งาน</span>
                  <div className="relative mt-2">
                    <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={borrowLocation}
                      onChange={(event) => setBorrowLocation(event.target.value)}
                      placeholder="เช่น Office, Home, Meeting room"
                      className={`w-full rounded-[1.4rem] border py-3 pl-9 pr-4 text-sm outline-none ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
                    />
                  </div>
                </label>
              </div>
            </div>
            <div className={`shrink-0 flex flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
              <div className={`text-xs ${subtleTextClass}`}>คำขอนี้จะถูกส่งไปยัง CentralChatDock และหน้าอนุมัติของ IT</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={closeBorrowModal} className={`rounded-2xl px-3 py-2 text-sm font-semibold max-sm:w-full ${isDarkTheme ? "border border-slate-700 bg-slate-800 text-slate-100" : "border border-slate-200 bg-white text-slate-700"}`}>ยกเลิก</button>
                <button type="button" onClick={handleBorrowSubmit} disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 max-sm:w-full">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  ส่งคำขอยืม
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {returnDialogLog && (
        <div className="fixed inset-0 z-[81] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
          <button type="button" onClick={closeReturnDialog} className="absolute inset-0" aria-label="close" />
          <div className={`relative z-10 flex w-full max-w-5xl max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-[1.6rem] border sm:rounded-[2rem] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2b59b0]/80">Return Notebook</p>
                  <h3 className={`mt-1 text-xl font-black ${headingClass}`}>{returnNotebook?.asset_code || "-"}</h3>
                  <p className={`mt-1 text-sm ${bodyClass}`}>ถ่ายรูปตอนคืนก่อนส่งคำขอ และรอ IT ยืนยันการรับคืน</p>
                </div>
                <button
                  type="button"
                  onClick={closeReturnDialog}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="grid flex-1 min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:px-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
              <div className="space-y-4">
                <div className={`overflow-hidden rounded-[1.5rem] border ${isDarkTheme ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-100"}`}>
                  {returnCameraError ? (
                    <div className="flex min-h-[240px] items-center justify-center text-center">
                      <div>
                        <Camera size={28} className="mx-auto text-[#2b59b0]" />
                        <p className={`mt-3 text-sm font-semibold ${headingClass}`}>กล้องไม่พร้อมใช้งาน</p>
                        <p className={`mt-1 text-xs ${bodyClass}`}>อัปโหลดรูปตอนคืนแทนได้</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-950 sm:aspect-video">
                      <Webcam
                        ref={returnWebcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.92}
                        mirrored={returnFacingMode === "user"}
                        videoConstraints={{ facingMode: returnFacingMode }}
                        onUserMediaError={() => setReturnCameraError(true)}
                        className={`absolute inset-0 h-full w-full object-cover transition duration-200 ${returnPreview ? "opacity-25" : "opacity-100"}`}
                      />
                      {returnPreview && (
                        <img src={returnPreview} alt="return-preview" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-slate-950/80 to-transparent px-4 py-3 text-white">
                        <div className="min-w-0">
                          <p className="text-sm font-bold">ถ่ายรูปตอนคืน</p>
                          <p className="text-[11px] text-white/75">{returnPreview ? "รูปนี้จะถูกส่งเป็นหลักฐานคืน notebook" : "ต้องมีรูปตอนคืนก่อนถึงจะส่งคำขอคืนได้"}</p>
                        </div>
                        {returnPreview && (
                          <span className="inline-flex rounded-full border border-white/15 bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                            พร้อมใช้
                          </span>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] text-white/75">{returnPreview ? "ถ่ายใหม่ได้ตลอด หรือสลับกล้องหน้า/หลัง" : "รองรับกล้องหน้า/หลัง และแสดงรูปทับกล้องทันที"}</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setReturnFacingMode((mode) => (mode === "user" ? "environment" : "user"))}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                          >
                            <FlipHorizontal size={14} />
                            <span className="hidden sm:inline">สลับกล้อง</span>
                          </button>
                          <button
                            type="button"
                            onClick={captureReturnFromCamera}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-[#244a95] max-sm:flex-1 max-sm:justify-center"
                          >
                            <Camera size={14} />
                            {returnPreview ? "ถ่ายใหม่" : "ถ่ายรูป"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => returnFileInputRef.current?.click()} className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold max-sm:flex-1 max-sm:justify-center ${isDarkTheme ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}>
                    <Upload size={14} />
                    อัปโหลดรูป
                  </button>
                  <input ref={returnFileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => setReturnPhotoFile(event.target.files?.[0])} />
                </div>
              </div>

              <div className="space-y-3">
                <div className={`rounded-[1.5rem] border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-800/70" : "border-slate-50 bg-slate-50"}`}>
                  <p className={`text-sm font-bold ${headingClass}`}>สรุปรายการ</p>
                  <p className={`mt-1 text-sm ${bodyClass}`}>{returnNotebook?.model || "-"}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-1">
                    <span className={`rounded-2xl border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>ผู้คืน: {currentUserName}</span>
                    <span className={`rounded-2xl border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>ยืมเมื่อ {formatNotebookTime(returnDialogLog.borrow_time)}</span>
                    <span className={`rounded-2xl border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>ใช้ไป {formatDuration(returnDialogLog.borrow_time, new Date().toISOString())}</span>
                  </div>
                </div>
                <div className={`rounded-[1.5rem] border px-4 py-3 text-sm ${isDarkTheme ? "border-blue-700/40 bg-blue-950/30 text-blue-100" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
                  ต้องมีรูปตอนคืนก่อนถึงจะส่งคำขอคืนได้
                </div>
              </div>
            </div>
            <div className={`flex flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
              <p className={`text-xs ${subtleTextClass}`}>เมื่อกดยืนยัน ระบบจะส่งคำขอคืนพร้อมรูปหลักฐานให้ IT ตรวจสอบ</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={closeReturnDialog} className={`rounded-2xl px-3 py-2 text-sm font-semibold ${isDarkTheme ? "border border-slate-700 bg-slate-800 text-slate-100" : "border border-slate-200 bg-white text-slate-700"}`}>ยกเลิก</button>
                <button type="button" onClick={handleConfirmReturn} disabled={isSubmitting || !returnFile} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  ยืนยันคืน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
