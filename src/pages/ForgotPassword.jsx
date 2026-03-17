import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import MessageAlert from "../components/MessageAlert";
import { supabase } from "../lib/supabaseClient";
import {
  getPasswordResetRedirectUrl,
  resolveEmailFromIdentifier,
} from "../lib/authHelpers";

export default function ForgotPassword() {
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
      setMessage({ type: "error", text: "กรุณากรอกอีเมลหรือรหัสพนักงาน" });
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
        text: "ส่งลิงก์รีเซตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมลของคุณ",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: `ส่งลิงก์รีเซตไม่สำเร็จ: ${error.message}`,
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
              Password Recovery
            </div>

            <h1 className="mt-6 max-w-lg text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              รีเซ็ตรหัสผ่านพนักงานแบบใช้งานจริง
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              กรอกรหัสพนักงานหรืออีเมล ระบบจะส่งลิงก์รีเซตไปยังบัญชีที่ผูกไว้กับโปรไฟล์ของคุณโดยตรง
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Step 1</p>
                <p className="mt-2 text-sm font-bold text-slate-800">ระบุบัญชี</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">กรอกรหัสพนักงานหรืออีเมลที่ใช้เข้าสู่ระบบ</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Step 2</p>
                <p className="mt-2 text-sm font-bold text-slate-800">เปิดอีเมล</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">กดลิงก์จาก Supabase recovery email ที่ระบบส่งให้</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Step 3</p>
                <p className="mt-2 text-sm font-bold text-slate-800">ตั้งรหัสใหม่</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">ระบบจะพาไปหน้า `reset-password` เพื่อยืนยันรหัสผ่านใหม่</p>
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
              กลับหน้าเข้าสู่ระบบ
            </button>

            <div className="mt-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200">
                <KeyRound size={24} />
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900">ลืมรหัสผ่าน</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                รองรับการค้นหาจาก `Employee Code` หรืออีเมลเดียวกับที่ใช้ login
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Employee Code / Email</label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="เช่น EMP00123 หรือ name@tdk.co.th"
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
                {loading ? "กำลังส่งลิงก์รีเซต..." : "ส่งลิงก์รีเซตรหัสผ่าน"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">After Submit</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {sentEmail
                  ? `ระบบส่งลิงก์ไปที่ ${sentEmail} แล้ว หากไม่พบอีเมลให้ตรวจสอบ Spam/Junk`
                  : "เมื่อส่งสำเร็จ ระบบจะส่งอีเมลรีเซตไปยังบัญชีที่ผูกไว้กับโปรไฟล์พนักงาน"}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
