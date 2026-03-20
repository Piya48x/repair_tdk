import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Home, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";

export default function ReportsTopbar({ backTo, backLabel = "Reports", showHub = true }) {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error?.message || "Unable to sign out");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {backTo ? (
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ChevronLeft size={16} />
            {backLabel}
          </Link>
        ) : null}
        {showHub ? (
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Home size={16} />
            Reports Hub
          </Link>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut size={16} />
        {isLoggingOut ? "Signing out..." : "Logout"}
      </button>
    </div>
  );
}
