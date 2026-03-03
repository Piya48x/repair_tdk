import React from "react";
import { LogOut } from "lucide-react";

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogOut size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">ยืนยันการออกจากระบบ?</h3>
          <p className="text-slate-500 text-sm font-medium">
            การออกจากระบบจะยกเลิกการเชื่อมต่อแบบเรียลไทม์ทั้งหมด
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onClose}
            className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-200 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="py-3 rounded-xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:shadow-lg hover:shadow-rose-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
