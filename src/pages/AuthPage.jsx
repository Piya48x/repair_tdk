import React, { useState, useEffect } from "react";
import Login from "./Login";
import Register from "./Register";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"; // เพิ่ม Motion
import bgImage from "../assets/1.png";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const buildEmail = (code) => `emp_${code.toLowerCase()}@company.local`;

  useEffect(() => {
    const savedCode = localStorage.getItem("rememberedCode");
    const savedPass = localStorage.getItem("rememberedPass");
    if (savedCode && savedPass) {
      setEmployeeCode(savedCode);
      setPassword(savedPass);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (mode === "register") {
      setEmployeeCode("");
      setPassword("");
    } else {
      const savedCode = localStorage.getItem("rememberedCode");
      const savedPass = localStorage.getItem("rememberedPass");
      if (savedCode) setEmployeeCode(savedCode);
      if (savedPass) setPassword(savedPass);
    }
  }, [mode]);

  const onLogin = async () => {
    if (!employeeCode || !password) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setLoading(true);
    try {
      const email = buildEmail(employeeCode);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;

      if (rememberMe) {
        localStorage.setItem("rememberedCode", employeeCode);
        localStorage.setItem("rememberedPass", password);
      } else {
        localStorage.removeItem("rememberedCode");
        localStorage.removeItem("rememberedPass");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      switch (profile.role) {
        case "admin":
        case "it_support": navigate("/admin-dashboard"); break;
        case "auditor": navigate("/audit-view"); break;
        default: navigate("/dashboard");
      }
    } catch (err) {
      alert("เข้าสู่ระบบไม่สำเร็จ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (regData) => {
    setLoading(true);
    try {
      const email = buildEmail(regData.employeeCode);
      const { error } = await supabase.auth.signUp({
        email,
        password: regData.password,
        options: {
          data: {
            full_name: regData.fullName,
            employee_code: regData.employeeCode,
            department: regData.department,
            position: regData.position,
            id_card_url: regData.idCardUrl,
          },
        },
      });
      if (error) throw error;
      alert("ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ");
      setMode("login");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans text-slate-900 overflow-hidden bg-[#F8FAFC]">
      
      {/* LEFT SIDE: BRANDING WITH MOTION */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
          src={bgImage} 
          alt="Branding" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950 via-indigo-900/60 to-indigo-800/20" />
        
        {/* Decorative Floating Circles */}
        <motion.div 
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" 
        />

        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-indigo-900 text-2xl shadow-2xl">T</div>
            <span className="text-white font-black text-2xl uppercase tracking-tighter">TDK Industrial</span>
          </motion.div>

          <div className="max-w-xl">
            <motion.h1 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-7xl font-black text-white leading-tight tracking-tighter mb-6"
            >
              Empowering <br /> 
              <span className="text-indigo-400 italic">Industrial</span> <br /> 
              Support
            </motion.h1>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="h-2 bg-indigo-500 rounded-full mb-8" 
            />
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-indigo-100/80 text-xl leading-relaxed font-medium"
            >
              ระบบ IT Helpdesk อัจฉริยะ ออกแบบมาเพื่อยกระดับ <br />ประสิทธิภาพการทำงานของพนักงาน TDK ทุกแผนก
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="text-indigo-200 text-sm font-bold tracking-[0.3em]"
          >
            V2.0.4 • STABLE RELEASE • 2026
          </motion.div>
        </div>
      </div>

      {/* RIGHT SIDE: FORM WITH ANIMATED PRESENCE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 relative bg-white lg:bg-transparent">
        {/* Mobile Background Glow */}
        <div className="lg:hidden absolute inset-0 bg-indigo-50/50 -z-10" />

        <div className="w-full max-w-[480px]">
          <motion.div 
            layout
            className="bg-white rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden"
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-blue-500" />

            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Login
                    employeeCode={employeeCode}
                    setEmployeeCode={setEmployeeCode}
                    password={password}
                    setPassword={setPassword}
                    rememberMe={rememberMe}
                    setRememberMe={setRememberMe}
                    onLogin={onLogin}
                    loading={loading}
                  />
                  <div className="pt-8 text-center border-t border-slate-50 mt-8">
                    <p className="text-slate-400 font-semibold text-sm">ยังไม่มีบัญชีในระบบ?</p>
                    <button 
                      onClick={() => setMode("register")} 
                      className="mt-2 text-indigo-600 font-black text-sm uppercase tracking-wider hover:text-indigo-800 transition-colors"
                    >
                      ลงทะเบียนพนักงานใหม่
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="register-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Register onRegister={onRegister} loading={loading} />
                  <div className="pt-8 text-center border-t border-slate-50 mt-8">
                    <p className="text-slate-400 font-semibold text-sm">มีบัญชีอยู่แล้ว?</p>
                    <button 
                      onClick={() => setMode("login")} 
                      className="mt-2 text-indigo-600 font-black text-sm uppercase tracking-wider hover:text-indigo-800 transition-colors"
                    >
                      กลับไปหน้าเข้าสู่ระบบ
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-10 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              IT Helpdesk Internal Line: 038-394-337
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}