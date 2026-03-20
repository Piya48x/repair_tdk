import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import toast from "react-hot-toast";
import ExecutiveDashboard from "../../components/reports/ExecutiveDashboard";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import { fetchExecutiveReportData } from "../../services/reportService";
import { supabase } from "../../lib/supabaseClient";

function PageState({ title, subtitle, error, onRetry, loading }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <ReportsTopbar backTo="/reports" backLabel="Reports" />

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              {error ? <TriangleAlert size={24} /> : <RefreshCw size={24} className={loading ? "animate-spin" : ""} />}
            </div>
            <h1 className="mt-4 text-2xl font-black text-slate-900">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
            {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
            {error ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Retry
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExecutiveReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const report = await fetchExecutiveReportData();
      setData(report);
    } catch (err) {
      const message = err?.message || "Unable to load executive report";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel("executive-report-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "it_assets" },
        () => {
          void loadData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "it_licenses" },
        () => {
          void loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  if (loading && !data) {
    return (
      <PageState
        title="Loading executive report"
        subtitle="Fetching KPI, trend, asset, and license data."
        loading
      />
    );
  }

  if (error && !data) {
    return (
      <PageState
        title="Executive report unavailable"
        subtitle="Check Supabase tables and view availability, then retry."
        error={error}
        onRetry={loadData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <ReportsTopbar backTo="/reports" backLabel="Reports" />

        <ExecutiveDashboard data={data} onRefresh={loadData} loading={loading} />
      </div>
    </div>
  );
}
