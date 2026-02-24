// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ProtectedRoute({ children, allowedRoles }) {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        setLoading(true);

        // 1. Get current session (faster for UI)
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // Wait a tiny bit and try getUser (more reliable)
          const { data: { user } } = await supabase.auth.getUser();
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
          // 2. Check role from profiles
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (profile && allowedRoles.includes(profile.role)) {
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

    // Listen for auth state changes to handle logout while on page
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && isMounted) {
        setIsAllowed(false);
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
          <p className="text-slate-600 font-medium italic">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
        </div>
      </div>
    );
  }

  return isAllowed ? children : <Navigate to="/" replace />;
}