import React, { useState, useEffect } from "react";

const STORAGE_KEY = "remember_login";

export default function Login({
  employeeCode,
  setEmployeeCode,
  password,
  setPassword,
  onLogin,
  loading,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // ===== โหลดค่าที่จำไว้ =====
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.employeeCode && data.password) {
          setEmployeeCode(data.employeeCode);
          setPassword(data.password);
          setRememberMe(true);
        }
      } catch (err) {
        console.error("Invalid saved login data");
      }
    }
  }, [setEmployeeCode, setPassword]);

  // ===== Submit =====
  const handleSubmit = (e) => {
    e.preventDefault();

    if (rememberMe) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          employeeCode,
          password,
        })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    onLogin();
  };

  return (
    <div className="w-full max-w-xl mx-auto animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">
          Sign in
        </h1>
        <p className="text-slate-500 font-medium">
          เข้าสู่ระบบ IT HELPDESK สำหรับพนักงาน
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        
        {/* Employee Code */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">
            Employee Code
          </label>
          <input
            type="text"
            value={employeeCode}
            onChange={(e) =>
              setEmployeeCode(e.target.value.toUpperCase())
            }
            placeholder="เช่น 4383"
            className="
              w-full px-5 py-4 rounded-2xl border-2 border-slate-200
              bg-white font-bold uppercase text-lg
              focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600
              outline-none transition-all
            "
            required
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="
                w-full px-5 py-4 pr-14 rounded-2xl border-2 border-slate-200
                bg-white text-lg font-bold
                focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600
                outline-none transition-all
              "
              required
            />

            {/* Eye Icon */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition"
            >
              {showPassword ? (
                // Eye Off
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3l18 18M10.584 10.586a2 2 0 102.828 2.828M9.878 9.878A3 3 0 0115 12m4.243 4.243C17.5 18.3 14.88 19.5 12 19.5c-4.478 0-8.268-2.943-9.543-7a10.05 10.05 0 012.132-3.368"
                  />
                </svg>
              ) : (
                // Eye
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
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

        {/* Remember Me */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-600"
            />
            <span className="text-sm font-bold text-slate-600">
              จดจำรหัสพนักงานและรหัสผ่าน
            </span>
          </label>

          <button
            type="button"
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            ลืมรหัสผ่าน?
          </button>
        </div>

        {/* Submit */}
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
          {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
