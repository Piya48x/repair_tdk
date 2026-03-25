import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useScopedI18n } from "../i18n/useScopedI18n";

const REGISTER_TRANSLATIONS = {
  th: {
    uploadFailed: "อัปโหลดรูปบัตรไม่สำเร็จ: {{message}}",
    acceptPolicyError: "กรุณายินยอมนโยบายก่อนลงทะเบียน",
    passwordMismatch: "รหัสผ่านไม่ตรงกัน",
    title: "ลงทะเบียนพนักงาน",
    subtitle: "เพื่อเข้าใช้งานระบบแจ้งซ่อมและบริการ IT",
    employeeInfo: "ข้อมูลพนักงาน",
    fullName: "ชื่อ - นามสกุล",
    workEmail: "Work Email",
    firstNameEn: "First Name (ภาษาอังกฤษ)",
    lastNameEn: "Last Name (ภาษาอังกฤษ)",
    employeeCode: "รหัสพนักงาน",
    department: "แผนก",
    position: "ตำแหน่ง",
    location: "Work Location / Site",
    security: "ความปลอดภัยบัญชี",
    phone: "เบอร์โทรศัพท์",
    password: "รหัสผ่าน",
    show: "ดู",
    hide: "ซ่อน",
    confirmPassword: "ยืนยันรหัสผ่าน",
    document: "เอกสารยืนยันตัวตน",
    policy: "ข้าพเจ้ายินยอมให้บริษัทใช้ข้อมูลส่วนบุคคลนี้ เพื่อการแจ้งซ่อม การติดต่อ และเพื่อความรวดเร็วในการดำเนินการด้าน IT ภายในองค์กรเท่านั้น",
    submitting: "กำลังดำเนินการ...",
    submit: "ลงทะเบียนเข้าใช้งาน",
  },
  en: {
    uploadFailed: "ID card upload failed: {{message}}",
    acceptPolicyError: "Please accept the policy before registering.",
    passwordMismatch: "Passwords do not match.",
    title: "Employee registration",
    subtitle: "Register to use the IT service and repair request system.",
    employeeInfo: "Employee information",
    fullName: "Full name",
    workEmail: "Work Email",
    firstNameEn: "First Name (English)",
    lastNameEn: "Last Name (English)",
    employeeCode: "Employee code",
    department: "Department",
    position: "Position",
    location: "Work Location / Site",
    security: "Account security",
    phone: "Phone number",
    password: "Password",
    show: "Show",
    hide: "Hide",
    confirmPassword: "Confirm password",
    document: "Identity document",
    policy: "I consent to the company using this personal information for repair requests, communication, and faster internal IT operations only.",
    submitting: "Processing...",
    submit: "Register account",
  },
  ko: {
    uploadFailed: "신분증 이미지 업로드 실패: {{message}}",
    acceptPolicyError: "등록 전에 정책에 동의해 주세요.",
    passwordMismatch: "비밀번호가 일치하지 않습니다.",
    title: "직원 등록",
    subtitle: "IT 서비스 및 수리 요청 시스템 사용을 위해 등록합니다.",
    employeeInfo: "직원 정보",
    fullName: "이름 - 성",
    workEmail: "Work Email",
    firstNameEn: "First Name (영문)",
    lastNameEn: "Last Name (영문)",
    employeeCode: "사번",
    department: "부서",
    position: "직책",
    location: "Work Location / Site",
    security: "계정 보안",
    phone: "전화번호",
    password: "비밀번호",
    show: "보기",
    hide: "숨기기",
    confirmPassword: "비밀번호 확인",
    document: "신원 확인 서류",
    policy: "수리 요청, 연락, 그리고 내부 IT 업무의 신속한 처리를 위해 회사가 이 개인정보를 사용하는 것에 동의합니다.",
    submitting: "처리 중...",
    submit: "계정 등록",
  },
};

export default function Register({ onRegister, loading }) {
  const { tt } = useScopedI18n(REGISTER_TRANSLATIONS);
  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstNameEn, setFirstNameEn] = useState("");
  const [lastNameEn, setLastNameEn] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [idCardFile, setIdCardFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [acceptPolicy, setAcceptPolicy] = useState(false);

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
      alert(tt("uploadFailed", { message: err.message }));
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitRegister = async (event) => {
    event.preventDefault();

    if (!acceptPolicy) {
      alert(tt("acceptPolicyError"));
      return;
    }

    if (password !== confirmPassword) {
      alert(tt("passwordMismatch"));
      return;
    }

    const idCardUrl = await handleUploadIdCard();
    if (idCardFile && !idCardUrl) return;

    onRegister({
      fullName,
      firstNameEn,
      lastNameEn,
      email,
      phone,
      location,
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
      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{tt("title")}</h2>
        <p className="text-slate-500 mt-2">{tt("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmitRegister} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{tt("employeeInfo")}</h3>

          <input
            type="text"
            placeholder={tt("fullName")}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <input
            type="email"
            placeholder={tt("workEmail")}
            value={email}
            onChange={(event) => setEmail(event.target.value.toLowerCase().trim())}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder={tt("firstNameEn")}
              value={firstNameEn}
              onChange={(event) => setFirstNameEn(event.target.value.replace(/[^a-zA-Z]/g, ""))}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="text"
              placeholder={tt("lastNameEn")}
              value={lastNameEn}
              onChange={(event) => setLastNameEn(event.target.value.replace(/[^a-zA-Z]/g, ""))}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <input
            type="text"
            placeholder={tt("employeeCode")}
            value={employeeCode}
            onChange={(event) => setEmployeeCode(event.target.value.toUpperCase())}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder={tt("department")}
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="text"
              placeholder={tt("position")}
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <input
            type="text"
            placeholder={tt("location")}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{tt("security")}</h3>

          <input
            type="tel"
            placeholder={tt("phone")}
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={tt("password")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
            >
              {showPassword ? tt("hide") : tt("show")}
            </button>
          </div>

          <input
            type="password"
            placeholder={tt("confirmPassword")}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{tt("document")}</h3>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setIdCardFile(event.target.files[0])}
            className="w-full text-sm"
          />
        </div>

        <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            checked={acceptPolicy}
            onChange={(event) => setAcceptPolicy(event.target.checked)}
            className="mt-1 w-5 h-5 text-blue-600"
          />
          <p className="text-sm text-slate-600 leading-relaxed">{tt("policy")}</p>
        </div>

        <button
          type="submit"
          disabled={loading || uploadingImage}
          className={`w-full py-4 rounded-2xl font-black text-white transition-all ${
            loading || uploadingImage
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
          }`}
        >
          {loading || uploadingImage ? tt("submitting") : tt("submit")}
        </button>
      </form>
    </div>
  );
}
