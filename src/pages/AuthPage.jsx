import React, { useState, useEffect, useCallback } from "react";
import Login from "./Login";
import Register from "./Register";
import { supabase } from "../lib/supabaseClient";
import { resolveEmailFromIdentifier } from "../lib/authHelpers";
import { resolveHomeRoute } from "../lib/roleAccess";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useScopedI18n } from "../i18n/useScopedI18n";
import MessageAlert from "../components/MessageAlert";
import bgImage1 from "../assets/1.png";
import bgImage2 from "../assets/14.png";
import bgImage3 from "../assets/9.png";
import bgImage4 from "../assets/6.png";
import bgImage5 from "../assets/4.png";

const HERO_IMAGES = [bgImage1, bgImage2, bgImage3, bgImage4, bgImage5];

const AUTH_PAGE_TRANSLATIONS = {
  th: {
    emailInUse: "อีเมลนี้ถูกใช้งานในระบบแล้ว",
    invalidWorkEmail: "อีเมลพนักงานไม่ถูกต้องหรือถูกใช้งานแล้ว",
    passwordPolicy: "รหัสผ่านไม่ผ่านเงื่อนไขของระบบ",
    registerFailed: "ลงทะเบียนไม่สำเร็จ",
    loginRequired: "กรุณากรอกข้อมูลให้ครบถ้วน",
    loginFailed: "เข้าสู่ระบบไม่สำเร็จ: {{message}}",
    invalidEmail: "กรุณากรอกอีเมลพนักงานให้ถูกต้อง",
    employeeCodeUsed: "รหัสพนักงานนี้ถูกลงทะเบียนไว้แล้ว",
    registerSuccess: "ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ",
    heroBodyLine1: "ระบบ IT Helpdesk อัจฉริยะ ออกแบบมาเพื่อยกระดับ",
    heroBodyLine2: "ประสิทธิภาพการทำงานของพนักงาน TDK ทุกแผนก",
    noAccount: "ยังไม่มีบัญชีในระบบ?",
    registerCta: "ลงทะเบียนพนักงานใหม่",
    haveAccount: "มีบัญชีอยู่แล้ว?",
    loginCta: "กลับไปหน้าเข้าสู่ระบบ",
    hotline: "IT Helpdesk Internal Line: 038-394-337",
  },
  en: {
    emailInUse: "This email is already in use.",
    invalidWorkEmail: "The employee email is invalid or already in use.",
    passwordPolicy: "The password does not meet system requirements.",
    registerFailed: "Registration failed.",
    loginRequired: "Please complete all required fields.",
    loginFailed: "Sign in failed: {{message}}",
    invalidEmail: "Please enter a valid employee email.",
    employeeCodeUsed: "This employee code has already been registered.",
    registerSuccess: "Registration completed. Please sign in.",
    heroBodyLine1: "An intelligent IT Helpdesk platform designed to elevate",
    heroBodyLine2: "operational efficiency for every TDK department.",
    noAccount: "Don't have an account yet?",
    registerCta: "Register a new employee",
    haveAccount: "Already have an account?",
    loginCta: "Back to sign in",
    hotline: "IT Helpdesk Internal Line: 038-394-337",
  },
  ko: {
    emailInUse: "이 이메일은 이미 사용 중입니다.",
    invalidWorkEmail: "직원 이메일이 올바르지 않거나 이미 사용 중입니다.",
    passwordPolicy: "비밀번호가 시스템 정책을 충족하지 않습니다.",
    registerFailed: "등록에 실패했습니다.",
    loginRequired: "필수 정보를 모두 입력해 주세요.",
    loginFailed: "로그인 실패: {{message}}",
    invalidEmail: "올바른 직원 이메일을 입력하세요.",
    employeeCodeUsed: "이 사번은 이미 등록되어 있습니다.",
    registerSuccess: "등록이 완료되었습니다. 로그인해 주세요.",
    heroBodyLine1: "모든 TDK 부서의 업무 효율을 높이기 위해 설계된",
    heroBodyLine2: "지능형 IT Helpdesk 플랫폼입니다.",
    noAccount: "아직 계정이 없으신가요?",
    registerCta: "신규 직원 등록",
    haveAccount: "이미 계정이 있으신가요?",
    loginCta: "로그인으로 돌아가기",
    hotline: "IT Helpdesk Internal Line: 038-394-337",
  },
};

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
  const { tt } = useScopedI18n(AUTH_PAGE_TRANSLATIONS);
  const [mode, setMode] = useState("login");
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isFinalSlide = currentImageIndex === HERO_IMAGES.length - 1;

  const navigate = useNavigate();

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

  const getRegisterErrorMessage = useCallback(
    (error) => {
      const messageText = String(error?.message || "").trim();
      const code = String(error?.code || "").trim().toLowerCase();
      const status = Number(error?.status);

      if (code === "user_already_exists" || /already registered|already exists/i.test(messageText)) {
        return tt("emailInUse");
      }

      if (status === 422 && /email/i.test(messageText)) {
        return tt("invalidWorkEmail");
      }

      if (/password/i.test(messageText)) {
        return tt("passwordPolicy");
      }

      return messageText || tt("registerFailed");
    },
    [tt],
  );

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

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
      setMessage({ type: "error", text: tt("loginRequired") });
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
      setMessage({ type: "error", text: tt("loginFailed", { message: err.message }) });
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (regData) => {
    setLoading(true);
    try {
      const email = String(regData.email || "").trim().toLowerCase();
      const employeeCodeValue = String(regData.employeeCode || "").trim().toUpperCase();

      if (!isValidEmail(email)) {
        throw new Error(tt("invalidEmail"));
      }

      const [
        { data: existingEmailProfile, error: existingEmailError },
        { data: existingEmployeeProfile, error: existingEmployeeError },
      ] = await Promise.all([
        supabase.from("profiles").select("id").eq("email", email).maybeSingle(),
        supabase.from("profiles").select("id").eq("employee_code", employeeCodeValue).maybeSingle(),
      ]);

      if (existingEmailError) throw existingEmailError;
      if (existingEmployeeError) throw existingEmployeeError;

      if (existingEmailProfile) {
        throw new Error(tt("emailInUse"));
      }

      if (existingEmployeeProfile) {
        throw new Error(tt("employeeCodeUsed"));
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
            employee_code: employeeCodeValue,
            department: regData.department,
            position: regData.position,
            id_card_url: regData.idCardUrl,
          },
        },
      });
      if (error) throw error;

      if (signUpData?.user) {
        const { error: upsertError } = await supabase.from("profiles").upsert({
          id: signUpData.user.id,
          email,
          employee_code: employeeCodeValue,
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
        }
      }

      setMessage({ type: "success", text: tt("registerSuccess") });
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
      }, 5000);
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
    <div className="app-theme min-h-screen flex text-slate-900 overflow-hidden bg-[#F8FAFC]">
      <MessageAlert message={message} />

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.img
            key={HERO_IMAGES[currentImageIndex]}
            src={HERO_IMAGES[currentImageIndex]}
            alt="Branding"
            onError={() => setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length)}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 4, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950 via-indigo-900/60 to-indigo-800/20" />

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
                    <motion.div variants={heroBarVariants} className="h-2 bg-indigo-500 rounded-full" />
                  </div>

                  <motion.p className="text-indigo-100/80 text-xl leading-relaxed font-medium">
                    <motion.span variants={heroTextLineVariants} className="block">
                      {tt("heroBodyLine1")}
                    </motion.span>
                    <motion.span variants={heroTextLineVariants} className="block">
                      {tt("heroBodyLine2")}
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

      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 relative bg-white lg:bg-transparent">
        <div className="lg:hidden absolute inset-0 -z-20 overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.img
              key={`mobile-${HERO_IMAGES[currentImageIndex]}`}
              src={HERO_IMAGES[currentImageIndex]}
              alt="Branding mobile"
              onError={() => setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length)}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-sky-50/85 to-white/95" />
        </div>

        <div className="lg:hidden absolute inset-0 bg-indigo-50/50 -z-10" />

        <div className="w-full max-w-[480px]">
          <motion.div
            layout
            className="bg-white rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden"
          >
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
                    <p className="text-slate-400 font-semibold text-sm">{tt("noAccount")}</p>
                    <button
                      onClick={() => setMode("register")}
                      className="mt-2 text-indigo-600 font-black text-sm uppercase tracking-wider hover:text-indigo-800 transition-colors"
                    >
                      {tt("registerCta")}
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
                    <p className="text-slate-400 font-semibold text-sm">{tt("haveAccount")}</p>
                    <button
                      onClick={() => setMode("login")}
                      className="mt-2 text-indigo-600 font-black text-sm uppercase tracking-wider hover:text-indigo-800 transition-colors"
                    >
                      {tt("loginCta")}
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
              {tt("hotline")}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
