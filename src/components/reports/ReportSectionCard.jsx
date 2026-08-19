import React from "react";

export default function ReportSectionCard({ title, subtitle, actions, children, className = "" }) {
  return (
    <article className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_22px_rgba(15,23,42,0.04)] ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-base font-bold text-slate-950">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </article>
  );
}
