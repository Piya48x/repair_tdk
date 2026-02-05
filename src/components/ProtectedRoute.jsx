// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ProtectedRoute({ children, allowedRoles }) {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (profile && allowedRoles.includes(profile.role)) {
        setIsAllowed(true);
      }
    }
    setLoading(false);
  };

  if (loading) return <div>กำลังตรวจสอบสิทธิ์...</div>;
  
  return isAllowed ? children : <Navigate to="/" replace />;
}