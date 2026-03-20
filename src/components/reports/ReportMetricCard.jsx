import React from "react";

const TONE_CLASSES = {
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
};

const VALUE_TONE_CLASSES = {
  indigo: "text-indigo-700",
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
  slate: "text-slate-700",
  cyan: "text-cyan-700",
};

export default function ReportMetricCard({ title, value, hint, icon: Icon, tone = "indigo" }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`mt-2 text-3xl font-black tracking-tight ${VALUE_TONE_CLASSES[tone] || VALUE_TONE_CLASSES.indigo}`}>
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className={`rounded-2xl border p-3 ${TONE_CLASSES[tone] || TONE_CLASSES.indigo}`}>
          <Icon size={18} />
        </div>
      </div>
    </article>
  );
}
