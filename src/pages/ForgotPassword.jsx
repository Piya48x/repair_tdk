import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useScopedI18n } from "../i18n/useScopedI18n";
import MessageAlert from "../components/MessageAlert";
import { supabase } from "../lib/supabaseClient";
import {
  getPasswordResetRedirectUrl,
  resolveEmailFromIdentifier,
} from "../lib/authHelpers";

const FORGOT_PASSWORD_TRANSLATIONS = {
  th: {
    badge: "Password Recovery",
    heroTitle: "รีเซ็ตรหัสผ่านพนักงานแบบใช้งานจริง",
    heroDescription: "กรอกรหัสพนักงานหรืออีเมล ระบบจะส่งลิงก์รีเซ็ตไปยังบัญชีที่ผูกไว้กับโปรไฟล์ของคุณโดยตรง",
    back: "กลับหน้าเข้าสู่ระบบ",
    title: "ลืมรหัสผ่าน",
    subtitle: "รองรับการค้นหาจาก `Employee Code` หรืออีเมลเดียวกับที่ใช้ login",
    identifierLabel: "Employee Code / Email",
    identifierPlaceholder: "เช่น EMP00123 หรือ name@tdk.co.th",
    submitting: "กำลังส่งลิงก์รีเซ็ต...",
    submit: "ส่งลิงก์รีเซ็ตรหัสผ่าน",
    afterSubmit: "After Submit",
    afterSubmitDefault: "เมื่อส่งสำเร็จ ระบบจะส่งอีเมลรีเซ็ตไปยังบัญชีที่ผูกไว้กับโปรไฟล์พนักงาน",
    afterSubmitSent: "ระบบส่งลิงก์ไปที่ {{email}} แล้ว หากไม่พบอีเมลให้ตรวจสอบ Spam/Junk",
    step1Title: "ระบุบัญชี",
    step1Description: "กรอกรหัสพนักงานหรืออีเมลที่ใช้เข้าสู่ระบบ",
    step2Title: "เปิดอีเมล",
    step2Description: "กดลิงก์จาก Supabase recovery email ที่ระบบส่งให้",
    step3Title: "ตั้งรหัสใหม่",
    step3Description: "ระบบจะพาไปหน้า `reset-password` เพื่อยืนยันรหัสผ่านใหม่",
    emptyError: "กรุณากรอกอีเมลหรือรหัสพนักงาน",
    success: "ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมลของคุณ",
    sendFailed: "ส่งลิงก์รีเซ็ตไม่สำเร็จ: {{message}}",
  },
  en: {
    badge: "Password Recovery",
    heroTitle: "Reset employee passwords with the real workflow",
    heroDescription: "Enter an employee code or email and the system will send a reset link directly to the account bound to the profile.",
    back: "Back to sign in",
    title: "Forgot password",
    subtitle: "You can search by `Employee Code` or the same email used for login.",
    identifierLabel: "Employee Code / Email",
    identifierPlaceholder: "Example: EMP00123 or name@tdk.co.th",
    submitting: "Sending reset link...",
    submit: "Send password reset link",
    afterSubmit: "After Submit",
    afterSubmitDefault: "After a successful request, the system will send a reset email to the account linked to the employee profile.",
    afterSubmitSent: "A link was sent to {{email}}. If you do not see it, check Spam/Junk.",
    step1Title: "Identify account",
    step1Description: "Enter the employee code or email used to sign in.",
    step2Title: "Open email",
    step2Description: "Click the link from the Supabase recovery email.",
    step3Title: "Set a new password",
    step3Description: "The system will take you to `reset-password` to confirm the new password.",
    emptyError: "Please enter an email or employee code.",
    success: "Password reset link sent. Please check your email.",
    sendFailed: "Could not send reset link: {{message}}",
  },
  ko: {
    badge: "Password Recovery",
    heroTitle: "실제 업무 흐름으로 직원 비밀번호 재설정",
    heroDescription: "사번 또는 이메일을 입력하면 프로필에 연결된 계정으로 재설정 링크가 전송됩니다.",
    back: "로그인으로 돌아가기",
    title: "비밀번호 찾기",
    subtitle: "`Employee Code` 또는 로그인에 사용한 이메일로 조회할 수 있습니다.",
    identifierLabel: "Employee Code / Email",
    identifierPlaceholder: "예: EMP00123 또는 name@tdk.co.th",
    submitting: "재설정 링크를 보내는 중...",
    submit: "비밀번호 재설정 링크 보내기",
    afterSubmit: "After Submit",
    afterSubmitDefault: "요청이 성공하면 직원 프로필에 연결된 계정으로 재설정 이메일이 전송됩니다.",
    afterSubmitSent: "{{email}}로 링크를 보냈습니다. 보이지 않으면 스팸/정크 메일함을 확인하세요.",
    step1Title: "계정 확인",
    step1Description: "로그인에 사용하는 사번 또는 이메일을 입력합니다.",
    step2Title: "이메일 열기",
    step2Description: "Supabase recovery email의 링크를 클릭합니다.",
    step3Title: "새 비밀번호 설정",
    step3Description: "`reset-password` 페이지에서 새 비밀번호를 확인합니다.",
    emptyError: "이메일 또는 사번을 입력하세요.",
    success: "비밀번호 재설정 링크를 보냈습니다. 이메일을 확인하세요.",
    sendFailed: "재설정 링크 전송 실패: {{message}}",
  },
};

export default function ForgotPassword() {
  const { tt } = useScopedI18n(FORGOT_PASSWORD_TRANSLATIONS);
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [sentEmail, setSentEmail] = useState("");

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!identifier.trim()) {
      setMessage({ type: "error", text: tt("emptyError") });
      return;
    }

    setLoading(true);
    try {
      const email = await resolveEmailFromIdentifier(supabase, identifier);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      if (error) {
        throw error;
      }

      setSentEmail(email);
      setMessage({
        type: "success",
        text: tt("success"),
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: tt("sendFailed", { message: error.message }),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_32%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_45%,_#ffffff_100%)]">
      <MessageAlert message={message} />

      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-blue-100/70 bg-white/70 p-8 shadow-[0_30px_80px_rgba(37,99,235,0.12)] backdrop-blur-xl sm:p-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-blue-700">
              <ShieldCheck size={14} />
              {tt("badge")}
            </div>

            <h1 className="mt-6 max-w-lg text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              {tt("heroTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">{tt("heroDescription")}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Step 1</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{tt("step1Title")}</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">{tt("step1Description")}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Step 2</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{tt("step2Title")}</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">{tt("step2Description")}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Step 3</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{tt("step3Title")}</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">{tt("step3Description")}</p>
              </article>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_25px_70px_rgba(15,23,42,0.08)] sm:p-10">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft size={15} />
              {tt("back")}
            </button>

            <div className="mt-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200">
                <KeyRound size={24} />
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900">{tt("title")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{tt("subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{tt("identifierLabel")}</label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder={tt("identifierPlaceholder")}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white py-4 pl-12 pr-4 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-2xl py-4 text-base font-black text-white transition ${
                  loading
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-indigo-800"
                }`}
              >
                {loading ? tt("submitting") : tt("submit")}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{tt("afterSubmit")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {sentEmail
                  ? tt("afterSubmitSent", { email: sentEmail })
                  : tt("afterSubmitDefault")}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
