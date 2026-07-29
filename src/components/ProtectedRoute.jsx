import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { canAccessRoute } from "../lib/roleAccess";
import { useScopedI18n } from "../i18n/useScopedI18n";

const PROTECTED_ROUTE_TRANSLATIONS = {
  th: {
    checking: "กำลังตรวจสอบสิทธิ์การเข้าถึง...",
  },
  en: {
    checking: "Checking access permissions...",
  },
  ko: {
    checking: "접근 권한을 확인하는 중입니다...",
  },
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const { tt } = useScopedI18n(PROTECTED_ROUTE_TRANSLATIONS);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [hasAuthenticatedUser, setHasAuthenticatedUser] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        setLoading(true);
        setHasAuthenticatedUser(false);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            if (isMounted) {
              setIsAllowed(false);
              setLoading(false);
            }
            return;
          }
        }

        const user = session?.user || (await supabase.auth.getUser()).data.user;

        if (user) {
          if (isMounted) setHasAuthenticatedUser(true);
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, is_active")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.is_active === false) {
            await supabase.auth.signOut();
            if (isMounted) setIsAllowed(false);
            return;
          }

          if (profile && canAccessRoute(profile.role, allowedRoles)) {
            if (isMounted) setIsAllowed(true);
          }
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && isMounted) {
        setIsAllowed(false);
        setHasAuthenticatedUser(false);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium italic">{tt("checking")}</p>
        </div>
      </div>
    );
  }

  const returnTo = `${location.pathname}${location.search}`;
  const loginTarget = `/?returnTo=${encodeURIComponent(returnTo)}`;
  return isAllowed ? children : <Navigate to={hasAuthenticatedUser ? "/" : loginTarget} replace />;
}
