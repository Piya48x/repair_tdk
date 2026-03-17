import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import MessageAlert from "../components/MessageAlert";
import { supabase } from "../lib/supabaseClient";

const MIN_PASSWORD_LENGTH = 8;

function getRecoveryErrorMessage(error) {
  const rawMessage = String(error?.message || "");

  if (/expired|invalid|otp/i.test(rawMessage)) {
    return "ลิงก์รีเซตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว";
  }

  return rawMessage || "ไม่สามารถตรวจสอบลิงก์รีเซตได้";
}

export default function ResetPassword() {
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
              text: "ลิงก์รีเซตไม่ถูกต้อง กรุณาขออีเมลรีเซตใหม่อีกครั้ง",
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
              text: "ไม่พบ recovery session จากลิงก์นี้ กรุณาขออีเมลรีเซตใหม่",
            });
            setCheckingLink(false);
          }
        }, 1200);
      } catch (error) {
        if (isMounted) {
          setMessage({
            type: "error",
            text: getRecoveryErrorMessage(error),
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
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage({
        type: "error",
        text: `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`,
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน" });
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
        text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กำลังพากลับไปหน้าเข้าสู่ระบบ",
      });

      window.setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/", { replace: true });
      }, 1500);
    } catch (error) {
      setMessage({
        type: "error",
        text: `รีเซตรหัสผ่านไม่สำเร็จ: ${error.message}`,
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
                Secure Reset
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
                ตั้งรหัสผ่านใหม่
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-blue-100/85 sm:text-base">
                หน้านี้ทำงานกับ recovery link จาก Supabase โดยตรง เมื่อกดลิงก์จากอีเมล ระบบจะเปิด session ชั่วคราวเพื่อให้ตั้งรหัสผ่านใหม่ได้ทันที
              </p>

              <div className="mt-8 space-y-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100/70">Requirement</p>
                  <p className="mt-2 text-sm font-semibold text-white">รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100/70">Link Policy</p>
                  <p className="mt-2 text-sm font-semibold text-white">ลิงก์รีเซตใช้ครั้งเดียวและหมดอายุได้</p>
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
                  กลับหน้าเข้าสู่ระบบ
                </button>

                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200">
                  <KeyRound size={20} />
                </div>
              </div>

              {checkingLink ? (
                <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-6 py-14 text-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                  <p className="mt-5 text-base font-bold text-slate-800">กำลังตรวจสอบ recovery link</p>
                  <p className="mt-2 text-sm text-slate-500">รอสักครู่เพื่อเปิด session สำหรับการรีเซตรหัสผ่าน</p>
                </div>
              ) : recoveryReady ? (
                <form onSubmit={handleSubmit} className="mt-10 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">รหัสผ่านใหม่</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="อย่างน้อย 8 ตัวอักษร"
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">ยืนยันรหัสผ่านใหม่</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="กรอกรหัสผ่านเดิมอีกครั้ง"
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
                    {loading ? "กำลังบันทึกรหัสผ่านใหม่..." : "ยืนยันการเปลี่ยนรหัสผ่าน"}
                  </button>
                </form>
              ) : (
                <div className="mt-10 rounded-3xl border border-rose-200 bg-rose-50 p-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm">
                    <CheckCircle2 size={20} />
                  </div>
                  <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
                    ใช้ลิงก์นี้รีเซตไม่ได้แล้ว
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    recovery session ไม่ถูกสร้างจากลิงก์นี้ อาจเกิดจากลิงก์หมดอายุ ถูกเปิดซ้ำ หรือ redirect URL ยังไม่ตรงกับระบบ
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-700"
                    >
                      ขออีเมลรีเซตใหม่
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-white"
                    >
                      กลับหน้าเข้าสู่ระบบ
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
