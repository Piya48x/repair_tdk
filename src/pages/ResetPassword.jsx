import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { useScopedI18n } from "../i18n/useScopedI18n";
import MessageAlert from "../components/MessageAlert";
import { supabase } from "../lib/supabaseClient";

const MIN_PASSWORD_LENGTH = 8;

const RESET_PASSWORD_TRANSLATIONS = {
  th: {
    invalidLink: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว",
    cannotVerifyLink: "ไม่สามารถตรวจสอบลิงก์รีเซ็ตได้",
    invalidRecoveryLink: "ลิงก์รีเซ็ตไม่ถูกต้อง กรุณาขออีเมลรีเซ็ตใหม่อีกครั้ง",
    noRecoverySession: "ไม่พบ recovery session จากลิงก์นี้ กรุณาขออีเมลรีเซ็ตใหม่",
    passwordLength: "รหัสผ่านต้องยาวอย่างน้อย {{count}} ตัวอักษร",
    passwordMismatch: "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน",
    success: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กำลังพากลับไปหน้าเข้าสู่ระบบ",
    failed: "รีเซ็ตรหัสผ่านไม่สำเร็จ: {{message}}",
    badge: "Secure Reset",
    heroTitle: "ตั้งรหัสผ่านใหม่",
    heroDescription: "หน้านี้ทำงานกับ recovery link จาก Supabase โดยตรง เมื่อกดลิงก์จากอีเมล ระบบจะเปิด session ชั่วคราวเพื่อให้ตั้งรหัสผ่านใหม่ได้ทันที",
    requirement: "Requirement",
    requirementValue: "รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร",
    policy: "Link Policy",
    policyValue: "ลิงก์รีเซ็ตใช้ครั้งเดียวและหมดอายุได้",
    back: "กลับหน้าเข้าสู่ระบบ",
    checkingTitle: "กำลังตรวจสอบ recovery link",
    checkingDescription: "รอสักครู่เพื่อเปิด session สำหรับการรีเซ็ตรหัสผ่าน",
    newPassword: "รหัสผ่านใหม่",
    newPasswordPlaceholder: "อย่างน้อย 8 ตัวอักษร",
    confirmPassword: "ยืนยันรหัสผ่านใหม่",
    confirmPasswordPlaceholder: "กรอกรหัสผ่านเดิมอีกครั้ง",
    saving: "กำลังบันทึกรหัสผ่านใหม่...",
    submit: "ยืนยันการเปลี่ยนรหัสผ่าน",
    unusableTitle: "ใช้ลิงก์นี้รีเซ็ตไม่ได้แล้ว",
    unusableDescription: "recovery session ไม่ถูกสร้างจากลิงก์นี้ อาจเกิดจากลิงก์หมดอายุ ถูกเปิดซ้ำ หรือ redirect URL ยังไม่ตรงกับระบบ",
    requestNewEmail: "ขออีเมลรีเซ็ตใหม่",
  },
  en: {
    invalidLink: "The password reset link is invalid or has expired.",
    cannotVerifyLink: "Unable to verify the reset link.",
    invalidRecoveryLink: "This reset link is invalid. Please request a new reset email.",
    noRecoverySession: "No recovery session was created from this link. Please request a new reset email.",
    passwordLength: "Password must be at least {{count}} characters long.",
    passwordMismatch: "The new password and confirmation do not match.",
    success: "Password changed successfully. Redirecting back to sign in.",
    failed: "Password reset failed: {{message}}",
    badge: "Secure Reset",
    heroTitle: "Set a new password",
    heroDescription: "This page works directly with the Supabase recovery link. After opening the email link, the system creates a temporary session so you can set a new password immediately.",
    requirement: "Requirement",
    requirementValue: "New password must be at least 8 characters",
    policy: "Link Policy",
    policyValue: "Reset links are single-use and can expire",
    back: "Back to sign in",
    checkingTitle: "Checking recovery link",
    checkingDescription: "Please wait while the recovery session is being opened.",
    newPassword: "New password",
    newPasswordPlaceholder: "At least 8 characters",
    confirmPassword: "Confirm new password",
    confirmPasswordPlaceholder: "Enter the new password again",
    saving: "Saving new password...",
    submit: "Confirm password change",
    unusableTitle: "This link can no longer reset your password",
    unusableDescription: "A recovery session could not be created from this link. It may have expired, been reused, or the redirect URL may not match the system.",
    requestNewEmail: "Request a new reset email",
  },
  ko: {
    invalidLink: "비밀번호 재설정 링크가 올바르지 않거나 만료되었습니다.",
    cannotVerifyLink: "재설정 링크를 확인할 수 없습니다.",
    invalidRecoveryLink: "재설정 링크가 올바르지 않습니다. 새 재설정 이메일을 요청하세요.",
    noRecoverySession: "이 링크에서 recovery session을 찾을 수 없습니다. 새 재설정 이메일을 요청하세요.",
    passwordLength: "비밀번호는 최소 {{count}}자 이상이어야 합니다.",
    passwordMismatch: "새 비밀번호와 확인 비밀번호가 일치하지 않습니다.",
    success: "비밀번호가 변경되었습니다. 로그인 화면으로 이동합니다.",
    failed: "비밀번호 재설정 실패: {{message}}",
    badge: "Secure Reset",
    heroTitle: "새 비밀번호 설정",
    heroDescription: "이 페이지는 Supabase recovery link와 직접 연결됩니다. 이메일 링크를 열면 임시 세션이 생성되어 즉시 새 비밀번호를 설정할 수 있습니다.",
    requirement: "Requirement",
    requirementValue: "새 비밀번호는 최소 8자 이상이어야 합니다.",
    policy: "Link Policy",
    policyValue: "재설정 링크는 1회용이며 만료될 수 있습니다.",
    back: "로그인으로 돌아가기",
    checkingTitle: "recovery link 확인 중",
    checkingDescription: "비밀번호 재설정을 위한 세션을 여는 중입니다. 잠시만 기다려 주세요.",
    newPassword: "새 비밀번호",
    newPasswordPlaceholder: "최소 8자",
    confirmPassword: "새 비밀번호 확인",
    confirmPasswordPlaceholder: "새 비밀번호를 다시 입력하세요",
    saving: "새 비밀번호 저장 중...",
    submit: "비밀번호 변경 확인",
    unusableTitle: "이 링크로는 더 이상 재설정할 수 없습니다",
    unusableDescription: "이 링크에서 recovery session이 생성되지 않았습니다. 링크가 만료되었거나 재사용되었거나 redirect URL이 시스템과 맞지 않을 수 있습니다.",
    requestNewEmail: "새 재설정 이메일 요청",
  },
};

function getRecoveryErrorMessage(tt, error) {
  const rawMessage = String(error?.message || "");

  if (/expired|invalid|otp/i.test(rawMessage)) {
    return tt("invalidLink");
  }

  return rawMessage || tt("cannotVerifyLink");
}

export default function ResetPassword() {
  const { tt } = useScopedI18n(RESET_PASSWORD_TRANSLATIONS);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    let isMounted = true;
    let fallbackTimerId;

    const applySessionState = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return false;
      }

      if (session) {
        setRecoveryReady(true);
        setCheckingLink(false);
        return true;
      }

      return false;
    };

    const initializeRecovery = async () => {
      try {
        const currentUrl = new URL(window.location.href);
        const authCode = currentUrl.searchParams.get("code");
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const looksLikeRecoveryLink =
          currentUrl.searchParams.get("type") === "recovery" ||
          hashParams.get("type") === "recovery" ||
          currentUrl.searchParams.has("code") ||
          hashParams.has("access_token");

        if (!looksLikeRecoveryLink) {
          if (isMounted) {
            setMessage({
              type: "error",
              text: tt("invalidRecoveryLink"),
            });
            setCheckingLink(false);
          }
          return;
        }

        if (await applySessionState()) {
          return;
        }

        if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);

          if (error) {
            throw error;
          }

          if (await applySessionState()) {
            return;
          }
        }

        fallbackTimerId = window.setTimeout(async () => {
          const hasSession = await applySessionState();

          if (!hasSession && isMounted) {
            setMessage({
              type: "error",
              text: tt("noRecoverySession"),
            });
            setCheckingLink(false);
          }
        }, 1200);
      } catch (error) {
        if (isMounted) {
          setMessage({
            type: "error",
            text: getRecoveryErrorMessage(tt, error),
          });
          setCheckingLink(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setRecoveryReady(true);
        setCheckingLink(false);
      }
    });

    initializeRecovery();

    return () => {
      isMounted = false;
      if (fallbackTimerId) {
        window.clearTimeout(fallbackTimerId);
      }
      subscription.unsubscribe();
    };
  }, [tt]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage({
        type: "error",
        text: tt("passwordLength", { count: MIN_PASSWORD_LENGTH }),
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: tt("passwordMismatch") });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      setMessage({
        type: "success",
        text: tt("success"),
      });

      window.setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/", { replace: true });
      }, 1500);
    } catch (error) {
      setMessage({
        type: "error",
        text: tt("failed", { message: error.message }),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(30,64,175,0.16),_transparent_30%),linear-gradient(160deg,_#f8fbff_0%,_#eef4ff_48%,_#ffffff_100%)]">
      <MessageAlert message={message} />

      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-10">
        <div className="w-full rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_30px_90px_rgba(15,23,42,0.1)] backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-t-[2rem] bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-8 text-white lg:rounded-l-[2rem] lg:rounded-tr-none sm:p-10">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100">
                <ShieldCheck size={14} />
                {tt("badge")}
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">{tt("heroTitle")}</h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-blue-100/85 sm:text-base">{tt("heroDescription")}</p>

              <div className="mt-8 space-y-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100/70">{tt("requirement")}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{tt("requirementValue")}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100/70">{tt("policy")}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{tt("policyValue")}</p>
                </div>
              </div>
            </section>

            <section className="p-8 sm:p-10">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowLeft size={15} />
                  {tt("back")}
                </button>

                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200">
                  <KeyRound size={20} />
                </div>
              </div>

              {checkingLink ? (
                <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-6 py-14 text-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                  <p className="mt-5 text-base font-bold text-slate-800">{tt("checkingTitle")}</p>
                  <p className="mt-2 text-sm text-slate-500">{tt("checkingDescription")}</p>
                </div>
              ) : recoveryReady ? (
                <form onSubmit={handleSubmit} className="mt-10 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">{tt("newPassword")}</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={tt("newPasswordPlaceholder")}
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">{tt("confirmPassword")}</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder={tt("confirmPasswordPlaceholder")}
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      autoComplete="new-password"
                      required
                    />
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
                    {loading ? tt("saving") : tt("submit")}
                  </button>
                </form>
              ) : (
                <div className="mt-10 rounded-3xl border border-rose-200 bg-rose-50 p-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm">
                    <CheckCircle2 size={20} />
                  </div>
                  <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">{tt("unusableTitle")}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{tt("unusableDescription")}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-700"
                    >
                      {tt("requestNewEmail")}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-white"
                    >
                      {tt("back")}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
