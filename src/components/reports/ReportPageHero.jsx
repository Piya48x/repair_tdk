import React from "react";

export default function ReportPageHero({
  eyebrow,
  title,
  description,
  action = null,
  status = "",
  compact = false,
}) {
  return (
    <section className={`overflow-hidden border border-slate-200 bg-white shadow-[0_5px_24px_rgba(15,23,42,0.05)] ${compact ? "rounded-xl" : "rounded-2xl"}`}>
      <div className={compact ? "h-0.5 bg-blue-700" : "h-1 bg-blue-700"} />
      <div className={compact
        ? "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5"
        : "flex flex-col gap-5 px-5 py-5 sm:px-7 sm:py-6 lg:flex-row lg:items-end lg:justify-between"}
      >
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className={`font-bold uppercase text-blue-700 ${compact ? "text-[9px] tracking-[0.18em]" : "text-[10px] tracking-[0.2em]"}`}>
              {eyebrow}
            </p>
          ) : null}
          <h1 className={`font-bold tracking-tight text-slate-950 ${compact ? "mt-1 text-xl sm:text-2xl" : "mt-2 text-2xl sm:text-3xl"}`}>
            {title}
          </h1>
          {description ? (
            <p className={`max-w-2xl text-slate-500 ${compact ? "mt-1 text-xs leading-5 sm:line-clamp-2" : "mt-2 text-sm leading-6"}`}>
              {description}
            </p>
          ) : null}
        </div>
        {compact ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {status ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {status}
              </span>
            ) : null}
            {action}
          </div>
        ) : action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {status && !compact ? (
        <div className={`flex items-center border-t border-slate-100 bg-slate-50/70 text-slate-500 ${compact ? "gap-1.5 px-4 py-1.5 text-[10px] sm:px-5" : "gap-2 px-5 py-2.5 text-[11px] sm:px-7"}`}>
          <span className={`rounded-full bg-emerald-500 ${compact ? "h-1.5 w-1.5" : "h-2 w-2"}`} />
          {status}
        </div>
      ) : null}
    </section>
  );
}
