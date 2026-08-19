import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import ExecutiveAssetOverviewDashboard from "../../components/reports/ExecutiveAssetOverviewDashboard";
import ReportPageState from "../../components/reports/ReportPageState";
import ReportsPageShell from "../../components/reports/ReportsPageShell";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
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
      <ReportPageState
        title={tt("loadingTitle")}
        subtitle={tt("loadingSubtitle")}
        loading
        retryLabel={tt("retry")}
      />
    );
  }

  if (error && !data) {
    return (
      <ReportPageState
        title={tt("unavailableTitle")}
        subtitle={tt("unavailableSubtitle")}
        error={error}
        onRetry={loadData}
        retryLabel={tt("retry")}
      />
    );
  }

  return (
    <ReportsPageShell>
      <ReportsTopbar />
      <ExecutiveAssetOverviewDashboard
        data={data}
        onRefresh={loadData}
        loading={loading}
      />
    </ReportsPageShell>
  );
}
