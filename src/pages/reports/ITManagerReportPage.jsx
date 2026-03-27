import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import toast from "react-hot-toast";
import ITManagerDashboard from "../../components/reports/ITManagerDashboard";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { fetchITManagerReportData } from "../../services/reportService";

const IT_MANAGER_REPORT_PAGE_TRANSLATIONS = {
  th: {
    backLabel: "Reports Hub",
    loadingTitle: "กำลังโหลดรายงาน IT Manager",
    loadingSubtitle: "กำลังดึงข้อมูล queue, workload, aging และ SLA",
    unavailableTitle: "ไม่สามารถเปิดรายงาน IT Manager ได้",
    unavailableSubtitle: "ตรวจสอบตารางข้อมูลใน Supabase แล้วลองใหม่อีกครั้ง",
    retry: "ลองอีกครั้ง",
    errors: {
      load: "ไม่สามารถโหลดรายงาน IT Manager ได้",
    },
  },
  en: {
    backLabel: "Reports Hub",
    loadingTitle: "Loading IT manager report",
    loadingSubtitle: "Fetching queue, workload, aging, and SLA data.",
    unavailableTitle: "IT manager report unavailable",
    unavailableSubtitle: "Check the Supabase data tables and try again.",
    retry: "Retry",
    errors: {
      load: "Unable to load IT manager report",
    },
  },
  ko: {
    backLabel: "리포트 허브",
    loadingTitle: "IT 매니저 리포트를 불러오는 중입니다",
    loadingSubtitle: "대기열, 업무량, aging, SLA 데이터를 가져오고 있습니다",
    unavailableTitle: "IT 매니저 리포트를 열 수 없습니다",
    unavailableSubtitle: "Supabase 데이터 테이블을 확인한 뒤 다시 시도해 주세요",
    retry: "다시 시도",
    errors: {
      load: "IT 매니저 리포트를 불러올 수 없습니다",
    },
  },
};

function PageState({ title, subtitle, error, onRetry, loading, retryLabel, backLabel }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <ReportsTopbar backTo="/reports" backLabel={backLabel} />

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              {error ? (
                <TriangleAlert size={24} />
              ) : (
                <RefreshCw size={24} className={loading ? "animate-spin" : ""} />
              )}
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
                {retryLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ITManagerReportPage() {
  const { tt } = useScopedI18n(IT_MANAGER_REPORT_PAGE_TRANSLATIONS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const report = await fetchITManagerReportData();
      setData(report);
    } catch (err) {
      const message = err?.message || tt("errors.load");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [tt]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <PageState
        title={tt("loadingTitle")}
        subtitle={tt("loadingSubtitle")}
        loading
        retryLabel={tt("retry")}
        backLabel={tt("backLabel")}
      />
    );
  }

  if (error && !data) {
    return (
      <PageState
        title={tt("unavailableTitle")}
        subtitle={tt("unavailableSubtitle")}
        error={error}
        onRetry={loadData}
        retryLabel={tt("retry")}
        backLabel={tt("backLabel")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <ReportsTopbar backTo="/reports" backLabel={tt("backLabel")} />
        <ITManagerDashboard data={data} onRefresh={loadData} loading={loading} />
      </div>
    </div>
  );
}
