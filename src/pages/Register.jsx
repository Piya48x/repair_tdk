import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Register({
  fullName,
  setFullName,
  employeeCode,
  setEmployeeCode,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  onRegister,
  loading,
}) {
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [idCardFile, setIdCardFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [acceptPolicy, setAcceptPolicy] = useState(false);

  // ===== Upload ID Card =====
  const handleUploadIdCard = async () => {
    if (!idCardFile) return null;

    setUploadingImage(true);
    try {
      const fileExt = idCardFile.name.split(".").pop();
      const fileName = `${employeeCode.toUpperCase()}_id_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("id-cards")
        .upload(fileName, idCardFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("id-cards")
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err) {
      alert("อัปโหลดรูปบัตรไม่สำเร็จ: " + err.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // ===== Submit =====
  const handleSubmitRegister = async (e) => {
    e.preventDefault();

    if (!acceptPolicy) {
      alert("กรุณายินยอมนโยบายก่อนลงทะเบียน");
      return;
    }

    if (password !== confirmPassword) {
      alert("รหัสผ่านไม่ตรงกัน");
      return;
    }

    const idCardUrl = await handleUploadIdCard();
    if (idCardFile && !idCardUrl) return;

    onRegister({
      fullName,
      employeeCode,
      department,
      position,
      idCardUrl,
      password,
      confirmPassword,
    });
  };

  return (
    <div className="space-y-8">
      {/* ===== Header ===== */}
      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          ลงทะเบียนพนักงาน
        </h2>
        <p className="text-slate-500 mt-2">
          เพื่อเข้าใช้งานระบบแจ้งซ่อมและบริการ IT
        </p>
      </div>

      <form onSubmit={handleSubmitRegister} className="space-y-6">
        
        {/* ===== Section: Employee Info ===== */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            ข้อมูลพนักงาน
          </h3>

          <input
            type="text"
            placeholder="ชื่อ - นามสกุล"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <input
            type="text"
            placeholder="รหัสพนักงาน"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="แผนก"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="text"
              placeholder="ตำแหน่ง"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* ===== Section: Security ===== */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            ความปลอดภัยบัญชี
          </h3>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
            >
              {showPassword ? "ซ่อน" : "ดู"}
            </button>
          </div>

          <input
            type="password"
            placeholder="ยืนยันรหัสผ่าน"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* ===== Section: ID Card ===== */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            เอกสารยืนยันตัวตน
          </h3>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setIdCardFile(e.target.files[0])}
            className="w-full text-sm"
          />
        </div>

        {/* ===== Policy Consent ===== */}
        <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            checked={acceptPolicy}
            onChange={(e) => setAcceptPolicy(e.target.checked)}
            className="mt-1 w-5 h-5 text-blue-600"
          />
          <p className="text-sm text-slate-600 leading-relaxed">
            ข้าพเจ้ายินยอมให้บริษัทใช้ข้อมูลส่วนบุคคลนี้
            เพื่อการแจ้งซ่อม การติดต่อ และเพื่อความรวดเร็วในการดำเนินการด้าน IT
            ภายในองค์กรเท่านั้น
          </p>
        </div>

        {/* ===== Submit ===== */}
        <button
          type="submit"
          disabled={loading || uploadingImage}
          className={`w-full py-4 rounded-2xl font-black text-white transition-all ${
            loading || uploadingImage
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
          }`}
        >
          {loading || uploadingImage
            ? "กำลังดำเนินการ..."
            : "ลงทะเบียนเข้าใช้งาน"}
        </button>
      </form>
    </div>
  );
}
