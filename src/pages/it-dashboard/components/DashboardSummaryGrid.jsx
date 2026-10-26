import React from "react";

export default function DashboardSummaryGrid({
  items = [],
  theme,
  uiTheme,
  className = "mb-4",
  cardClassName = "rounded-lg",
}) {
  if (!items.length) return null;

  const labelClass = theme === "dark" ? "text-slate-400" : "text-slate-500";
  const hintClass = theme === "dark" ? "text-slate-500" : "text-slate-400";
  const gridColumnClass = items.length >= 5
    ? "sm:grid-cols-3 xl:grid-cols-5"
    : "xl:grid-cols-4";

  return (
    <section className={className}>
      <div className={`grid grid-cols-2 gap-3 ${gridColumnClass}`}>
        {items.map((item) => {
          const Card = item.onClick ? "button" : "article";

          return (
            <Card
              key={item.key}
              type={item.onClick ? "button" : undefined}
              onClick={item.onClick}
              aria-label={item.onClick ? `เปิด${item.title}` : undefined}
              className={`${cardClassName} h-full border p-4 text-left ${uiTheme.surfaceCard} ${
                item.onClick
                  ? "cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b59b0]/60"
                  : ""
              }`}
            >
              <p className={`text-xs ${labelClass}`}>{item.title}</p>
              <p className={`mt-1.5 text-2xl font-black ${item.valueClass}`}>{item.value}</p>
              {item.hint ? <p className={`mt-1 text-[11px] ${hintClass}`}>{item.hint}</p> : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
