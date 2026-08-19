import React from "react";

export default function ReportPageHero({
  eyebrow,
  title,
  description,
  action = null,
  status = "",
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_24px_rgba(15,23,42,0.05)]">
      <div className="h-1 bg-blue-700" />
      <div className="flex flex-col gap-5 px-5 py-5 sm:px-7 sm:py-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {status ? (
        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[11px] text-slate-500 sm:px-7">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {status}
        </div>
      ) : null}
    </section>
  );
}
