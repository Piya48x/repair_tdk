import React, { useState } from "react";
import { useScopedI18n } from "../i18n/useScopedI18n";

const LOGIN_TRANSLATIONS = {
  th: {
    title: "Sign in",
    subtitle: "เข้าสู่ระบบ IT HELPDESK สำหรับพนักงาน",
    identifierLabel: "Employee Code / Email",
    identifierPlaceholder: "รหัสพนักงาน หรือ Email",
    passwordLabel: "Password",
    rememberMe: "จดจำรหัสพนักงานและรหัสผ่าน",
    forgotPassword: "ลืมรหัสผ่าน?",
    submitting: "กำลังตรวจสอบ...",
    submit: "เข้าสู่ระบบ",
  },
  en: {
    title: "Sign in",
    subtitle: "Access the IT HELPDESK system for employees.",
    identifierLabel: "Employee Code / Email",
    identifierPlaceholder: "Employee code or email",
    passwordLabel: "Password",
    rememberMe: "Remember employee code and password",
    forgotPassword: "Forgot password?",
    submitting: "Checking...",
    submit: "Sign in",
  },
  ko: {
    title: "Sign in",
    subtitle: "직원용 IT HELPDESK 시스템에 로그인합니다.",
    identifierLabel: "Employee Code / Email",
    identifierPlaceholder: "사번 또는 이메일",
    passwordLabel: "Password",
    rememberMe: "사번과 비밀번호 기억하기",
    forgotPassword: "비밀번호를 잊으셨나요?",
    submitting: "확인 중...",
    submit: "로그인",
  },
};

export default function Login({
  employeeCode,
  setEmployeeCode,
  password,
  setPassword,
  rememberMe,
  setRememberMe,
  onLogin,
  onForgotPassword,
  loading,
}) {
  const { tt } = useScopedI18n(LOGIN_TRANSLATIONS);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin();
  };

  return (
    <div className="w-full max-w-xl mx-auto animate-in fade-in duration-700">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">{tt("title")}</h1>
        <p className="text-slate-500 font-medium">{tt("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">{tt("identifierLabel")}</label>
          <input
            type="text"
            value={employeeCode}
            onChange={(event) => setEmployeeCode(event.target.value)}
            placeholder={tt("identifierPlaceholder")}
            className="
              w-full px-5 py-4 rounded-2xl border-2 border-slate-200
              bg-white font-bold text-lg
              focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600
              outline-none transition-all
            "
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">{tt("passwordLabel")}</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="
                w-full px-5 py-4 pr-14 rounded-2xl border-2 border-slate-200
                bg-white text-lg font-bold
                focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600
                outline-none transition-all
              "
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition"
            >
              {showPassword ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3l18 18M10.584 10.586a2 2 0 102.828 2.828M9.878 9.878A3 3 0 0115 12m4.243 4.243C17.5 18.3 14.88 19.5 12 19.5c-4.478 0-8.268-2.943-9.543-7a10.05 10.05 0 012.132-3.368"
                  />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-600"
            />
            <span className="text-sm font-bold text-slate-600">{tt("rememberMe")}</span>
          </label>

          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            {tt("forgotPassword")}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`
            w-full py-5 rounded-2xl text-xl font-black text-white
            transition-all duration-300 shadow-xl
            ${
              loading
                ? "bg-slate-300 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 active:scale-[0.98] shadow-blue-200"
            }
          `}
        >
          {loading ? tt("submitting") : tt("submit")}
        </button>
      </form>
    </div>
  );
}
