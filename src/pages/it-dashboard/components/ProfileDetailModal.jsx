import React from "react";
import {
  Activity,
  Building,
  Mail,
  Phone,
  Shield,
  User,
  Wrench,
  X,
} from "lucide-react";

const ProfileDetailModal = ({
  isOpen,
  theme,
  currentUser,
  isOnline,
  onClose,
  onToggleOnline,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-lg"
        onClick={onClose}
      />

      <div
        className={`relative z-10 w-full max-w-md rounded-3xl shadow-2xl border ${
          theme === "dark"
            ? "bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-slate-700/50"
            : "bg-gradient-to-br from-white/95 to-slate-50/95 border-slate-300/50"
        }`}
      >
        <div
          className={`px-8 py-6 border-b ${
            theme === "dark" ? "border-slate-700/50" : "border-slate-300/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User
                size={24}
                className={theme === "dark" ? "text-blue-400" : "text-blue-600"}
              />
              <h2
                className={`text-xl font-bold ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                โปรไฟล์ผู้ใช้งาน
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all hover:scale-110 ${
                theme === "dark"
                  ? "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl blur-xl opacity-30"></div>
              <img
                src={
                  currentUser?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || "IT Technician")}&background=3b82f6&color=fff&size=256`
                }
                alt={currentUser?.name}
                className="relative w-32 h-32 rounded-3xl border-4 border-white/30 shadow-2xl object-cover"
              />
              <div
                className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 ${
                  theme === "dark" ? "border-slate-900" : "border-white"
                } ${
                  isOnline ? "bg-emerald-500" : "bg-slate-500"
                } flex items-center justify-center`}
              >
                {isOnline ? (
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                ) : (
                  <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div
              className={`p-6 rounded-2xl ${
                theme === "dark" ? "bg-slate-800/30" : "bg-slate-100/50"
              }`}
            >
              <div className="text-center">
                <h3
                  className={`text-2xl font-bold mb-2 ${
                    theme === "dark" ? "text-white" : "text-slate-900"
                  }`}
                >
                  {currentUser?.name || "IT Technician"}
                </h3>
                <div
                  className={`inline-flex items-center gap-3 px-4 py-2 rounded-full ${
                    theme === "dark"
                      ? "bg-blue-500/10 border border-blue-500/20"
                      : "bg-blue-100 border border-blue-200"
                  }`}
                >
                  <Wrench
                    size={16}
                    className={theme === "dark" ? "text-blue-400" : "text-blue-600"}
                  />
                  <span
                    className={`text-sm font-bold ${
                      theme === "dark" ? "text-blue-400" : "text-blue-700"
                    }`}
                  >
                    {currentUser?.position || "IT Technician"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div
                className={`p-5 rounded-2xl ${
                  theme === "dark" ? "bg-slate-800/30" : "bg-slate-100/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      theme === "dark" ? "bg-blue-500/10" : "bg-blue-100"
                    }`}
                  >
                    <User size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-medium ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      รหัสพนักงาน
                    </p>
                    <p
                      className={`text-lg font-bold font-mono mt-1 ${
                        theme === "dark" ? "text-blue-400" : "text-blue-700"
                      }`}
                    >
                      {currentUser?.employeeId}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-5 rounded-2xl ${
                  theme === "dark" ? "bg-slate-800/30" : "bg-slate-100/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-100"
                    }`}
                  >
                    <Building size={18} className="text-emerald-500" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-medium ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      แผนก
                    </p>
                    <p
                      className={`text-lg font-bold mt-1 ${
                        theme === "dark" ? "text-emerald-400" : "text-emerald-700"
                      }`}
                    >
                      {currentUser?.department}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-5 rounded-2xl ${
                  theme === "dark" ? "bg-slate-800/30" : "bg-slate-100/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      theme === "dark" ? "bg-purple-500/10" : "bg-purple-100"
                    }`}
                  >
                    <Mail size={18} className="text-purple-500" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-medium ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      อีเมล
                    </p>
                    <p
                      className={`text-sm font-medium mt-1 truncate ${
                        theme === "dark" ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      {currentUser?.email ||
                        currentUser?.user_metadata?.email ||
                        "ไม่ระบุ"}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-5 rounded-2xl ${
                  theme === "dark" ? "bg-slate-800/30" : "bg-slate-100/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      theme === "dark" ? "bg-cyan-500/10" : "bg-cyan-100"
                    }`}
                  >
                    <Phone size={18} className="text-cyan-500" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-medium ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      โทรศัพท์
                    </p>
                    <p
                      className={`text-sm font-medium mt-1 ${
                        theme === "dark" ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      {currentUser?.phone ||
                        currentUser?.user_metadata?.phone ||
                        "ไม่ระบุ"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`p-5 rounded-2xl ${
                theme === "dark" ? "bg-slate-800/30" : "bg-slate-100/50"
              }`}
            >
              <h4
                className={`text-sm font-bold mb-3 ${
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }`}
              >
                ข้อมูลเพิ่มเติม
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p
                    className={`text-xs ${
                      theme === "dark" ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    ตำแหน่ง
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    {currentUser?.position ||
                      currentUser?.user_metadata?.position ||
                      "IT Technician"}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-xs ${
                      theme === "dark" ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    วันที่เข้าร่วม
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    {currentUser?.created_at
                      ? new Date(currentUser.created_at).toLocaleDateString(
                          "th-TH",
                        )
                      : "ไม่ระบุ"}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`p-5 rounded-2xl ${
                theme === "dark"
                  ? isOnline
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-slate-800/30"
                  : isOnline
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-slate-100/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      theme === "dark"
                        ? isOnline
                          ? "bg-emerald-500/20"
                          : "bg-slate-700/50"
                        : isOnline
                          ? "bg-emerald-100"
                          : "bg-slate-200"
                    }`}
                  >
                    <Activity
                      size={18}
                      className={isOnline ? "text-emerald-500" : "text-slate-500"}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      สถานะ
                    </p>
                    <p
                      className={`text-lg font-bold mt-1 ${
                        isOnline
                          ? theme === "dark"
                            ? "text-emerald-400"
                            : "text-emerald-700"
                          : theme === "dark"
                            ? "text-slate-400"
                            : "text-slate-600"
                      }`}
                    >
                      {isOnline ? "พร้อมปฏิบัติงาน" : "ออฟไลน์"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onToggleOnline}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    theme === "dark"
                      ? isOnline
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                      : isOnline
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  {isOnline ? "ออนไลน์" : "ออฟไลน์"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`px-8 py-6 border-t ${
            theme === "dark" ? "border-slate-700/50" : "border-slate-300/50"
          }`}
        >
          <div className="flex justify-between items-center">
            <div
              className={`flex items-center gap-2 ${
                theme === "dark" ? "text-slate-500" : "text-slate-400"
              }`}
            >
              <Shield size={14} />
              <span className="text-xs">
                User ID: {currentUser?.id?.slice(0, 8)}...
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetailModal;

