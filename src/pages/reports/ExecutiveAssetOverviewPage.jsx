import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import AssetReadinessDashboard from "../../components/reports/AssetReadinessDashboard";
import ReportPageState from "../../components/reports/ReportPageState";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { supabase } from "../../lib/supabaseClient";
import { fetchAssetReadinessReportData } from "../../services/reportService";

const EXECUTIVE_ASSET_OVERVIEW_PAGE_TRANSLATIONS = {
  th: {
    backLabel: "งาน IT ทั้งหมด",
    loadingTitle: "กำลังโหลดสถานะและความพร้อมของทรัพย์สิน",
    loadingSubtitle: "กำลังดึงข้อมูลทรัพย์สินและสถานะล่าสุดจากทะเบียนกลาง",
    unavailableTitle: "ไม่สามารถเปิดข้อมูลทรัพย์สินได้",
    unavailableSubtitle: "ตรวจสอบตารางข้อมูลใน Supabase แล้วลองใหม่อีกครั้ง",
    retry: "ลองอีกครั้ง",
    errors: {
      load: "ไม่สามารถโหลดภาพรวมสินทรัพย์ได้",
    },
  },
  en: {
    backLabel: "All IT Work",
    loadingTitle: "Loading asset status and readiness",
    loadingSubtitle: "Fetching the latest asset and status data.",
    unavailableTitle: "Asset status unavailable",
    unavailableSubtitle: "Check the Supabase data tables and try again.",
    retry: "Retry",
    errors: {
      load: "Unable to load assets overview",
    },
  },
  ko: {
    backLabel: "전체 IT 업무",
    loadingTitle: "자산 상태 및 준비도를 불러오는 중입니다",
    loadingSubtitle: "최신 자산 및 상태 데이터를 가져오고 있습니다",
    unavailableTitle: "자산 상태를 열 수 없습니다",
    unavailableSubtitle: "Supabase 데이터 테이블을 확인한 뒤 다시 시도해 주세요",
    retry: "다시 시도",
    errors: {
      load: "자산 상태를 불러올 수 없습니다",
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
      const report = await fetchAssetReadinessReportData();
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
        { event: "*", schema: "public", table: "it_assets" },
        () => {
          void loadData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "it_asset_attachments" },
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
    <>
      <ReportsTopbar />
      <AssetReadinessDashboard
        data={data}
        onRefresh={loadData}
        loading={loading}
      />
    </>
  );
}
