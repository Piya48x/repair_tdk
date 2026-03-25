import React from "react";

export default function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  toneClass = "text-[var(--brand-primary)]",
}) {
  return (
    <div className="app-surface rounded-3xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 ${toneClass}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}
