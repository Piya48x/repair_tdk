import React, { useState, useEffect } from "react";
import Login from "./Login";
import Register from "./Register";
import { supabase } from "../lib/supabaseClient";
import { resolveEmailFromIdentifier } from "../lib/authHelpers";
import { resolveHomeRoute } from "../lib/roleAccess";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"; // เพิ่ม Motion
import MessageAlert from "../components/MessageAlert"; // Import the custom alert
import bgImage1 from "../assets/1.png";
import bgImage2 from "../assets/14.png";
import bgImage3 from "../assets/9.png";
import bgImage4 from "../assets/6.png";
import bgImage5 from "../assets/4.png";

const HERO_IMAGES = [bgImage1, bgImage2, bgImage3, bgImage4, bgImage5];

const heroTextContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.15,
      staggerChildren: 0.16,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.07,
      staggerDirection: -1,
    },
  },
};

const heroTextLineVariants = {
  hidden: { opacity: 0, x: -42 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    x: 42,
    transition: {
      duration: 0.45,
      ease: "easeInOut",
    },
  },
};

const heroBarVariants = {
  hidden: { width: 0, opacity: 0 },
  visible: {
    width: 96,
    opacity: 1,
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    width: 0,
    opacity: 0,
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // State for the alert message
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isFinalSlide = currentImageIndex === HERO_IMAGES.length - 1;

  const navigate = useNavigate();

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

  const getRegisterErrorMessage = (error) => {
    const messageText = String(error?.message || "").trim();
    const code = String(error?.code || "").trim().toLowerCase();
    const status = Number(error?.status);

    if (code === "user_already_exists" || /already registered|already exists/i.test(messageText)) {
      return "อีเมลนี้ถูกใช้งานในระบบแล้ว";
    }

    if (status === 422 && /email/i.test(messageText)) {
      return "อีเมลพนักงานไม่ถูกต้องหรือถูกใช้งานแล้ว";
    }

    if (/password/i.test(messageText)) {
      return "รหัสผ่านไม่ผ่านเงื่อนไขของระบบ";
    }

    return messageText || "ลงทะเบียนไม่สำเร็จ";
  };

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

  // Auto-redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          navigate(resolveHomeRoute(profile.role), { replace: true });
        }
      }
    };
    checkSession();
  }, [navigate]);

  const onLogin = async () => {
    if (!employeeCode || !password) {
      setMessage({ type: "error", text: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      return;
    }
    setLoading(true);
    try {
      const email = await resolveEmailFromIdentifier(supabase, employeeCode);

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

      navigate(resolveHomeRoute(profile.role), { replace: true });
    } catch (err) {
      setMessage({ type: "error", text: "เข้าสู่ระบบไม่สำเร็จ: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (regData) => {
    setLoading(true);
    try {
      const email = String(regData.email || "").trim().toLowerCase();
      const employeeCode = String(regData.employeeCode || "").trim().toUpperCase();

      if (!isValidEmail(email)) {
        throw new Error("กรุณากรอกอีเมลพนักงานให้ถูกต้อง");
      }

      const [
        { data: existingEmailProfile, error: existingEmailError },
        { data: existingEmployeeProfile, error: existingEmployeeError },
      ] = await Promise.all([
        supabase.from("profiles").select("id").eq("email", email).maybeSingle(),
        supabase.from("profiles").select("id").eq("employee_code", employeeCode).maybeSingle(),
      ]);

      if (existingEmailError) throw existingEmailError;
      if (existingEmployeeError) throw existingEmployeeError;

      if (existingEmailProfile) {
        throw new Error("อีเมลนี้ถูกใช้งานในระบบแล้ว");
      }

      if (existingEmployeeProfile) {
        throw new Error("รหัสพนักงานนี้ถูกลงทะเบียนไว้แล้ว");
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password: regData.password,
        options: {
          data: {
            full_name: regData.fullName,
            first_name_en: regData.firstNameEn,
            last_name_en: regData.lastNameEn,
            phone: regData.phone,
            location: regData.location,
            employee_code: employeeCode,
            department: regData.department,
            position: regData.position,
            id_card_url: regData.idCardUrl,
          },
        },
      });
      if (error) throw error;

      // Robustness: Explicitly ensure the profile is created/updated in the profiles table
      // This is crucial for new users to be able to login with their numeric ID immediately
      if (signUpData?.user) {
        console.log("Creating redundant profile for user:", signUpData.user.id);
        const { error: upsertError } = await supabase.from("profiles").upsert({
          id: signUpData.user.id,
          email: email,
          employee_code: employeeCode,
          full_name: regData.fullName,
          first_name_en: regData.firstNameEn,
          last_name_en: regData.lastNameEn,
          phone: regData.phone,
          location: regData.location,
          department: regData.department,
          position: regData.position,
          id_card_url: regData.idCardUrl,
          role: "user",
        });
        if (upsertError) {
          console.error("Profile Upsert Error (Check RLS):", upsertError);
          // Don't throw, just log. The DB trigger is the primary source of truth.
        }
      }

      setMessage({ type: "success", text: "ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ" });
      setMode("login");
    } catch (err) {
      setMessage({ type: "error", text: getRegisterErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000); // Clear message after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    const slider = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 8000);

    return () => clearInterval(slider);
  }, []);


  return (
    <div className="app-theme min-h-screen flex  text-slate-900 overflow-hidden bg-[#F8FAFC]">
      <MessageAlert message={message} />

      {/* LEFT SIDE: BRANDING WITH MOTION */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <AnimatePresence initial={false}>
         <motion.img
  key={HERO_IMAGES[currentImageIndex]}
  src={HERO_IMAGES[currentImageIndex]}
  alt="Branding"
  onError={() =>
    setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length)
  }
 initial={{ opacity: 0, scale: 1.08 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 1.05 }}
transition={{ duration: 4, ease: "easeInOut" }}
  className="absolute inset-0 w-full h-full object-cover"
/>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950 via-indigo-900/60 to-indigo-800/20" />

        {/* Decorative Floating Circles */}
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 15, 0], x: [0, 10, 0], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300/10 rounded-full blur-3xl"
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
            <AnimatePresence mode="wait">
              {!isFinalSlide && (
                <motion.div
                  key="hero-copy"
                  variants={heroTextContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.h1 className="text-7xl font-black text-white leading-tight tracking-tighter mb-6">
                    <motion.span variants={heroTextLineVariants} className="block">
                      Empowering
                    </motion.span>
                    <motion.span variants={heroTextLineVariants} className="block text-indigo-400 italic">
                      Industrial
                    </motion.span>
                    <motion.span variants={heroTextLineVariants} className="block">
                      Support
                    </motion.span>
                  </motion.h1>

                  <div className="mb-8">
                    <motion.div
                      variants={heroBarVariants}
                      className="h-2 bg-indigo-500 rounded-full"
                    />
                  </div>

                  <motion.p className="text-indigo-100/80 text-xl leading-relaxed font-medium">
                    <motion.span variants={heroTextLineVariants} className="block">
                      ระบบ IT Helpdesk อัจฉริยะ ออกแบบมาเพื่อยกระดับ
                    </motion.span>
                    <motion.span variants={heroTextLineVariants} className="block">
                      ประสิทธิภาพการทำงานของพนักงาน TDK ทุกแผนก
                    </motion.span>
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
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
        <div className="lg:hidden absolute inset-0 -z-20 overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.img
              key={`mobile-${HERO_IMAGES[currentImageIndex]}`}
              src={HERO_IMAGES[currentImageIndex]}
              alt="Branding mobile"
              onError={() =>
                setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length)
              }
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-sky-50/85 to-white/95" />
        </div>

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
                    onForgotPassword={() => navigate("/forgot-password")}
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

