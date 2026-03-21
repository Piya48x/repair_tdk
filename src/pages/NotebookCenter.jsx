import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Laptop, Moon, Sun } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import CentralChatDock from "../components/CentralChatDock";
import NotebookBorrowSection from "./dashboard/components/NotebookBorrowSection";
import { DASHBOARD_THEME_KEY } from "./dashboard/constants";

export default function NotebookCenter() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supportChatOpenSignal, setSupportChatOpenSignal] = useState(0);
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_THEME_KEY);
      return saved === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  const isDarkTheme = themeMode === "dark";

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/", { replace: true });
          return;
        }

        const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
        if (error) throw error;
        if (!mounted) return;

        setProfile(data || null);
      } catch (error) {
        console.error("Load notebook center profile error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const currentUser = useMemo(() => {
    if (!profile) return null;
    return {
      id: profile.id,
      name: profile.full_name || profile.employee_code || profile.email || "User",
      role: profile.role || "user",
      avatar: profile.avatar_url || profile.id_card_url || "",
    };
  }, [profile]);

  return (
    <div className={`app-theme min-h-screen transition-colors duration-300 ${isDarkTheme ? "bg-[#0b1220] text-slate-100" : "bg-[#f4f7fb] text-slate-800"}`}>
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${isDarkTheme ? "border-slate-700 bg-[#0f172a]/95" : "border-slate-200 bg-white/90"}`}>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
              aria-label="กลับไป Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1 rounded-full border border-[#2b59b0]/15 bg-[#2b59b0]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#2b59b0]">
                <Laptop size={12} />
                Notebook Center
              </p>
              <h1 className={`mt-1 text-xl font-black sm:text-2xl ${isDarkTheme ? "text-slate-100" : "text-slate-900"}`}>ยืม-คืนโน้ตบุ๊ก</h1>
              <p className={`text-xs sm:text-sm ${isDarkTheme ? "text-slate-300" : "text-slate-500"}`}>ถ่ายรูป notebook ก่อนยืนยัน และส่งคำขอให้ IT อนุมัติ</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
            >
              {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline">{isDarkTheme ? "โหมดสว่าง" : "โหมดมืด"}</span>
            </button>
            <button
              type="button"
              onClick={() => setSupportChatOpenSignal((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2b59b0] to-[#244a95] px-3 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_-18px_rgba(43,89,176,0.7)]"
            >
              เปิดแชท IT
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        {loading ? (
          <div className={`flex min-h-[50vh] items-center justify-center rounded-3xl border ${isDarkTheme ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
            <div className="text-sm font-semibold text-slate-500">กำลังโหลด Notebook Center...</div>
          </div>
        ) : currentUser ? (
          <NotebookBorrowSection
            currentUser={currentUser}
            isDarkTheme={isDarkTheme}
            onOpenChat={() => setSupportChatOpenSignal((value) => value + 1)}
          />
        ) : null}
      </main>

      {currentUser && (
        <CentralChatDock
          currentUser={currentUser}
          openSignal={supportChatOpenSignal}
          className="bottom-4 left-4 sm:bottom-6 sm:left-6"
        />
      )}
    </div>
  );
}
