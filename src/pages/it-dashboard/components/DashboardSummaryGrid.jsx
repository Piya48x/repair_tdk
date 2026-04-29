import React from "react";

export default function DashboardSummaryGrid({
  items = [],
  theme,
  uiTheme,
  className = "mb-4",
}) {
  if (!items.length) return null;

  const labelClass = theme === "dark" ? "text-slate-400" : "text-slate-500";
  const hintClass = theme === "dark" ? "text-slate-500" : "text-slate-400";

  return (
    <section className={className}>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.key} className={`rounded-lg border p-4 ${uiTheme.surfaceCard}`}>
            <p className={`text-xs ${labelClass}`}>{item.title}</p>
            <p className={`mt-1.5 text-2xl font-black ${item.valueClass}`}>{item.value}</p>
            {item.hint ? <p className={`mt-1 text-[11px] ${hintClass}`}>{item.hint}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
