import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import toast from "react-hot-toast";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import ExecutiveAssetOverviewDashboard from "../../components/reports/ExecutiveAssetOverviewDashboard";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { supabase } from "../../lib/supabaseClient";
import { fetchExecutiveAssetOverviewData } from "../../services/reportService";

const EXECUTIVE_ASSET_OVERVIEW_PAGE_TRANSLATIONS = {
  th: {
    backLabel: "Reports Hub",
    loadingTitle: "กำลังโหลดภาพรวมสินทรัพย์",
    loadingSubtitle: "กำลังดึงข้อมูล tickets, assets, licenses และ access requests",
    unavailableTitle: "ไม่สามารถเปิดภาพรวมสินทรัพย์ได้",
    unavailableSubtitle: "ตรวจสอบตารางข้อมูลใน Supabase แล้วลองใหม่อีกครั้ง",
    retry: "ลองอีกครั้ง",
    errors: {
      load: "ไม่สามารถโหลดภาพรวมสินทรัพย์ได้",
    },
  },
  en: {
    backLabel: "Reports Hub",
    loadingTitle: "Loading assets overview",
    loadingSubtitle: "Fetching tickets, assets, licenses, and access requests.",
    unavailableTitle: "Assets overview unavailable",
    unavailableSubtitle: "Check the Supabase data tables and try again.",
    retry: "Retry",
    errors: {
      load: "Unable to load assets overview",
    },
  },
  ko: {
    backLabel: "리포트 허브",
    loadingTitle: "자산 개요를 불러오는 중입니다",
    loadingSubtitle: "티켓, 자산, 라이선스, 접근 요청 데이터를 가져오고 있습니다",
    unavailableTitle: "자산 개요를 열 수 없습니다",
    unavailableSubtitle: "Supabase 데이터 테이블을 확인한 뒤 다시 시도해 주세요",
    retry: "다시 시도",
    errors: {
      load: "자산 개요를 불러올 수 없습니다",
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

export default function ExecutiveAssetOverviewPage() {
  const { tt } = useScopedI18n(EXECUTIVE_ASSET_OVERVIEW_PAGE_TRANSLATIONS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const report = await fetchExecutiveAssetOverviewData();
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

  useEffect(() => {
    const channel = supabase
      .channel("executive-asset-overview-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          void loadData();
        },
      )
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "access_requests" },
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
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_45%,_#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <ReportsTopbar backTo="/reports" backLabel={tt("backLabel")} />
        <ExecutiveAssetOverviewDashboard
          data={data}
          onRefresh={loadData}
          loading={loading}
        />
      </div>
    </div>
  );
}
