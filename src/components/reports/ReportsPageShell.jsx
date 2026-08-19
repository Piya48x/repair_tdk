import React from "react";

export default function ReportsPageShell({ children, className = "" }) {
  return (
    <div className={`min-h-screen bg-[#f4f6f8] px-3 py-4 text-slate-900 sm:px-6 sm:py-6 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-[1480px]">{children}</div>
    </div>
  );
}
