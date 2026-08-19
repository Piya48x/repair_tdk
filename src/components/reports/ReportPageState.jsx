import React from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import ReportsPageShell from "./ReportsPageShell";
import ReportsTopbar from "./ReportsTopbar";

export default function ReportPageState({
  title,
  subtitle,
  error,
  onRetry,
  loading,
  retryLabel,
}) {
  return (
    <ReportsPageShell>
      <ReportsTopbar />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_24px_rgba(15,23,42,0.05)]">
        <div className="h-1 bg-blue-700" />
        <div className="mx-auto max-w-2xl px-6 py-10 text-center sm:px-8 sm:py-12">
          <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl border ${error ? "border-rose-100 bg-rose-50 text-rose-600" : "border-blue-100 bg-blue-50 text-blue-700"}`}>
            {error ? (
              <TriangleAlert size={22} />
            ) : (
              <RefreshCw size={22} className={loading ? "animate-spin" : ""} />
            )}
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
          {error ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      </section>
    </ReportsPageShell>
  );
}
