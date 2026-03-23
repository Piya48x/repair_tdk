import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PencilLine, RefreshCw, Save, Search, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import {
  NOTEBOOK_STATUS,
  isNotebookPermissionDenied,
  isNotebookSchemaError,
  removeNotebookAssetImage,
  uploadNotebookAssetImage,
} from "../../services/notebookBorrowService";

const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

const NOTEBOOK_STATUS_OPTIONS = [
  { value: NOTEBOOK_STATUS.AVAILABLE, label: "พร้อมให้ยืม" },
  { value: NOTEBOOK_STATUS.BORROWED, label: "ถูกยืม" },
  { value: NOTEBOOK_STATUS.REPAIR, label: "ซ่อม" },
];

const EMPTY_NOTEBOOK_FORM = {
  asset_code: "",
  model: "",
  status: NOTEBOOK_STATUS.AVAILABLE,
  notes: "",
};

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeOptionalText(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeNotebookStatus(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (NOTEBOOK_STATUS_OPTIONS.some((item) => item.value === normalized)) return normalized;
  return NOTEBOOK_STATUS.AVAILABLE;
}

function getNotebookStatusChipClass(status) {
  const normalized = normalizeNotebookStatus(status);
  if (normalized === NOTEBOOK_STATUS.AVAILABLE) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === NOTEBOOK_STATUS.BORROWED) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_TIME_FORMATTER.format(date);
}

function isBlobUrl(value) {
  return typeof value === "string" && value.startsWith("blob:");
}

function revokePreviewUrl(value) {
  if (isBlobUrl(value)) {
    URL.revokeObjectURL(value);
  }
}

export default function NotebookInventoryManagementPanel({ userRole = "" }) {
  const imageInputRef = useRef(null);
  const canManageNotebooks = normalizeText(userRole).toLowerCase() === "admin";
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState(EMPTY_NOTEBOOK_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);

  const loadNotebooks = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase.from("notebooks").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      setNotebooks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load notebooks error:", error);
      if (isNotebookSchemaError(error)) {
        toast.error("schema notebook ยังไม่อัปเดต กรุณารัน migration ล่าสุด");
      } else if (isNotebookPermissionDenied(error)) {
        toast.error("ไม่มีสิทธิ์เข้าถึง notebook inventory");
      } else {
        toast.error(error?.message || "โหลดรายการ notebook ไม่สำเร็จ");
      }
      setNotebooks([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotebooks();
  }, [loadNotebooks]);

  useEffect(() => {
    const channel = supabase
      .channel("notebook-inventory-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notebooks" }, () => {
        void loadNotebooks({ silent: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "borrow_logs" }, () => {
        void loadNotebooks({ silent: true });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotebooks]);

  useEffect(() => {
    return () => revokePreviewUrl(imagePreview);
  }, [imagePreview]);

  const filteredNotebooks = useMemo(() => {
    const keyword = normalizeText(searchQuery).toLowerCase();
    return notebooks.filter((item) => {
      const statusMatched = statusFilter === "all" || normalizeNotebookStatus(item?.status) === statusFilter;
      if (!statusMatched) return false;
      if (!keyword) return true;

      const source = [
        item?.asset_code,
        item?.model,
        item?.status,
        item?.notes,
      ]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");
      return source.includes(keyword);
    });
  }, [notebooks, searchQuery, statusFilter]);

  const summary = useMemo(
    () =>
      notebooks.reduce(
        (acc, item) => {
          acc.total += 1;
          const status = normalizeNotebookStatus(item?.status);
          if (status === NOTEBOOK_STATUS.AVAILABLE) acc.available += 1;
          if (status === NOTEBOOK_STATUS.BORROWED) acc.borrowed += 1;
          if (status === NOTEBOOK_STATUS.REPAIR) acc.repair += 1;
          return acc;
        },
        { total: 0, available: 0, borrowed: 0, repair: 0 },
      ),
    [notebooks],
  );

  const resetForm = useCallback(() => {
    setEditingId("");
    setFormData(EMPTY_NOTEBOOK_FORM);
    setImageFile(null);
    setRemoveImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setImagePreview((prev) => {
      revokePreviewUrl(prev);
      return "";
    });
  }, []);

  const handleEditNotebook = useCallback((item) => {
    setEditingId(item.id);
    setFormData({
      asset_code: item?.asset_code || "",
      model: item?.model || "",
      status: normalizeNotebookStatus(item?.status),
      notes: item?.notes || "",
    });
    setImageFile(null);
    setRemoveImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setImagePreview((prev) => {
      revokePreviewUrl(prev);
      return normalizeText(item?.asset_image_url);
    });
  }, []);

  const handleSelectImage = useCallback((file) => {
    if (!file) return;
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview((prev) => {
      revokePreviewUrl(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const handleClearImage = useCallback(() => {
    setImageFile(null);
    setRemoveImage(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setImagePreview((prev) => {
      revokePreviewUrl(prev);
      return "";
    });
  }, []);

  const handleSaveNotebook = useCallback(
    async (event) => {
      event.preventDefault();
      if (!canManageNotebooks) {
        toast.error("เฉพาะ admin เท่านั้นที่จัดการ notebook inventory ได้");
        return;
      }
      if (saving) return;

      const assetCode = normalizeText(formData.asset_code).toUpperCase();
      const model = normalizeText(formData.model);
      if (!assetCode || !model) {
        toast.error("กรุณากรอกรหัส notebook และรุ่น");
        return;
      }

      const currentRow = notebooks.find((item) => String(item?.id || "") === String(editingId || ""));
      const nextStatus = normalizeNotebookStatus(formData.status);
      let uploadedAsset = null;
      let nextImageUrl = removeImage ? null : normalizeOptionalText(currentRow?.asset_image_url);
      let nextImageName = removeImage ? null : normalizeOptionalText(currentRow?.asset_image_name);
      let nextImageMimeType = removeImage ? null : normalizeOptionalText(currentRow?.asset_image_mime_type);
      let nextImageSize = removeImage ? null : currentRow?.asset_image_size ?? null;

      setSaving(true);
      try {
        if (imageFile) {
          uploadedAsset = await uploadNotebookAssetImage(imageFile, assetCode);
          nextImageUrl = uploadedAsset.publicUrl || null;
          nextImageName = imageFile.name || null;
          nextImageMimeType = imageFile.type || null;
          nextImageSize = Number(imageFile.size || 0) || null;
        }

        const payload = {
          asset_code: assetCode,
          model,
          status: nextStatus,
          notes: normalizeOptionalText(formData.notes),
          asset_image_url: nextImageUrl,
          asset_image_name: nextImageName,
          asset_image_mime_type: nextImageMimeType,
          asset_image_size: nextImageSize,
        };

        if (editingId) {
          const { error } = await supabase.from("notebooks").update(payload).eq("id", editingId);
          if (error) throw error;
          toast.success("อัปเดต notebook แล้ว");
        } else {
          const { error } = await supabase.from("notebooks").insert(payload);
          if (error) throw error;
          toast.success("เพิ่ม notebook แล้ว");
        }

        const previousImageUrl = normalizeText(currentRow?.asset_image_url);
        if ((removeImage || imageFile) && previousImageUrl && previousImageUrl !== nextImageUrl) {
          void removeNotebookAssetImage(previousImageUrl);
        }

        resetForm();
        await loadNotebooks({ silent: true });
      } catch (error) {
        if (uploadedAsset?.publicUrl) {
          void removeNotebookAssetImage(uploadedAsset.publicUrl);
        }
        console.error("Save notebook inventory error:", error);
        if (String(error?.code || "") === "23505") {
          toast.error(`รหัส ${assetCode} ถูกใช้งานแล้ว`);
        } else if (isNotebookSchemaError(error)) {
          toast.error("schema notebook inventory ยังไม่อัปเดต");
        } else if (isNotebookPermissionDenied(error)) {
          toast.error("สิทธิ์ของบัญชีนี้ไม่พอสำหรับแก้ไข notebook");
        } else {
          toast.error(error?.message || "บันทึก notebook ไม่สำเร็จ");
        }
      } finally {
        setSaving(false);
      }
    },
    [canManageNotebooks, editingId, formData, imageFile, loadNotebooks, notebooks, removeImage, resetForm, saving],
  );

  const handleDeleteNotebook = useCallback(
    async (item) => {
      if (!canManageNotebooks) {
        toast.error("เฉพาะ admin เท่านั้นที่ลบ notebook ได้");
        return;
      }
      if (actionId && actionId === item.id) return;

      const borrowedMessage =
        normalizeNotebookStatus(item?.status) === NOTEBOOK_STATUS.BORROWED
          ? "\nรายการนี้อาจมีประวัติการยืมค้างอยู่"
          : "";
      const confirmed = window.confirm(
        `ยืนยันลบ notebook ${item?.asset_code || "-"} ?${borrowedMessage}\nระบบจะลบประวัติการยืมที่ผูกกับเครื่องนี้ด้วย`,
      );
      if (!confirmed) return;

      setActionId(item.id);
      try {
        const imageUrl = normalizeText(item?.asset_image_url);
        const { error } = await supabase.from("notebooks").delete().eq("id", item.id);
        if (error) throw error;

        if (imageUrl) {
          void removeNotebookAssetImage(imageUrl);
        }

        setNotebooks((prev) => prev.filter((row) => row.id !== item.id));
        if (String(editingId || "") === String(item.id)) {
          resetForm();
        }
        toast.success("ลบ notebook แล้ว");
      } catch (error) {
        console.error("Delete notebook inventory error:", error);
        if (isNotebookPermissionDenied(error)) {
          toast.error("ไม่มีสิทธิ์ลบ notebook");
        } else {
          toast.error(error?.message || "ลบ notebook ไม่สำเร็จ");
        }
      } finally {
        setActionId("");
      }
    },
    [actionId, canManageNotebooks, editingId, resetForm],
  );

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.35fr]">
      <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {editingId ? "แก้ไข notebook inventory" : "เพิ่ม notebook"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">สถานะที่แก้ที่นี่จะถูกใช้ต่อในหน้า Notebook Center</p>
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <X size={14} />
              ยกเลิก
            </button>
          ) : null}
        </div>

        {!canManageNotebooks ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            สิทธิ์ปัจจุบันเป็นแบบดูอย่างเดียว การเพิ่ม แก้ไข ลบ และอัปโหลดรูป notebook เปิดให้เฉพาะ admin
          </div>
        ) : null}

        <form className="mt-4 space-y-4" onSubmit={handleSaveNotebook}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={formData.asset_code}
              onChange={(event) => setFormData((prev) => ({ ...prev, asset_code: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="รหัส notebook *"
              required
              disabled={!canManageNotebooks}
            />
            <input
              value={formData.model}
              onChange={(event) => setFormData((prev) => ({ ...prev, model: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="รุ่น / รายละเอียด *"
              required
              disabled={!canManageNotebooks}
            />
          </div>

          <select
            value={formData.status}
            onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            disabled={!canManageNotebooks}
          >
            {NOTEBOOK_STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <textarea
            value={formData.notes}
            onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
            className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="หมายเหตุเพิ่มเติม"
            disabled={!canManageNotebooks}
          />

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white">
              {imagePreview ? (
                <img src={imagePreview} alt={formData.asset_code || "Notebook"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
                  ยังไม่มีรูป notebook
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={!canManageNotebooks}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload size={16} />
                {imagePreview ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
              </button>
              <button
                type="button"
                onClick={handleClearImage}
                disabled={!canManageNotebooks || (!imagePreview && !imageFile)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                ลบรูป
              </button>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleSelectImage(event.target.files?.[0] || null)}
            />
          </div>

          <button
            type="submit"
            disabled={!canManageNotebooks || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editingId ? <PencilLine size={16} /> : <Save size={16} />}
            {saving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่ม notebook"}
          </button>
        </form>
      </article>

      <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              รายการ notebook ({NUMBER_FORMATTER.format(filteredNotebooks.length)})
            </h2>
            <p className="mt-1 text-sm text-slate-500">ใช้ร่วมกับหน้า /notebook-center และอัปเดตแบบ realtime</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative w-full sm:w-[280px]">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                placeholder="ค้นหารหัส รุ่น หรือหมายเหตุ..."
              />
            </div>
            <button
              type="button"
              onClick={() => void loadNotebooks()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              รีเฟรช
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-500">ทั้งหมด</p>
            <p className="text-lg font-black text-slate-900">{NUMBER_FORMATTER.format(summary.total)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-emerald-700">พร้อมให้ยืม</p>
            <p className="text-lg font-black text-emerald-900">{NUMBER_FORMATTER.format(summary.available)}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-blue-700">ถูกยืม</p>
            <p className="text-lg font-black text-blue-900">{NUMBER_FORMATTER.format(summary.borrowed)}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-amber-700">ซ่อม</p>
            <p className="text-lg font-black text-amber-900">{NUMBER_FORMATTER.format(summary.repair)}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">ทุกสถานะ</option>
            {NOTEBOOK_STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            ล้างตัวกรอง
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Notebook</th>
                <th className="px-3 py-2">สถานะ</th>
                <th className="px-3 py-2">ภาพ</th>
                <th className="px-3 py-2">อัปเดตล่าสุด</th>
                <th className="px-3 py-2 text-right">การทำงาน</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    กำลังโหลด notebook...
                  </td>
                </tr>
              ) : filteredNotebooks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    ไม่พบ notebook
                  </td>
                </tr>
              ) : (
                filteredNotebooks.map((item) => {
                  const imageUrl = normalizeText(item?.asset_image_url);
                  return (
                    <tr key={item.id} className="border-b border-slate-100 align-top last:border-b-0">
                      <td className="px-3 py-3 text-slate-700">
                        <div className="font-semibold text-slate-900">{item?.asset_code || "-"}</div>
                        <div className="text-xs text-slate-500">{item?.model || "-"}</div>
                        {item?.notes ? <div className="mt-1 text-xs text-slate-500">{item.notes}</div> : null}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getNotebookStatusChipClass(item?.status)}`}>
                          {NOTEBOOK_STATUS_OPTIONS.find((statusItem) => statusItem.value === normalizeNotebookStatus(item?.status))?.label || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-14 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {imageUrl ? (
                            <img src={imageUrl} alt={item?.asset_code || "Notebook"} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] font-semibold text-slate-400">
                              ไม่มีรูป
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{formatDateTime(item?.updated_at || item?.created_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditNotebook(item)}
                            disabled={!canManageNotebooks}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <PencilLine size={13} />
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteNotebook(item)}
                            disabled={!canManageNotebooks || actionId === item.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={13} />
                            {actionId === item.id ? "กำลังลบ..." : "ลบ"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
