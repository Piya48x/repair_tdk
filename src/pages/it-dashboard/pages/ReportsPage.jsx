import React from "react";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import ITServiceOverviewPanel from "../components/ITServiceOverviewPanel";
import ITWorkReportPanel from "../components/ITWorkReportPanel";

const REPORTS_PAGE_TRANSLATIONS = {
  th: {
    title: "รายงานภาพรวม Dashboard IT Usage",
    description: "รวม KPI การแจ้งซ่อมและสรุปบันทึกงาน IT ไว้หน้าเดียว เพื่อใช้ติดตามงานและทำรายงานสำหรับบริษัท",
  },
  en: {
    title: "IT Usage Dashboard Overview",
    description: "Bring repair KPIs and IT work-log summaries into one page for operational tracking and company reporting.",
  },
  ko: {
    title: "IT 사용 대시보드 개요",
    description: "수리 KPI와 IT 작업 기록 요약을 한 화면에 모아 운영 추적과 회사 보고에 활용합니다.",
  },
};

const ReportsPage = ({
  theme,
  uiTheme,
  tickets,
  serviceRequests,
  onCreateTicket,
  onOpenWalkInTicket,
  onPickUpEquipment,
  onOpenRepairFromOverview,
  onNavigatePage,
}) => {
  const { tt } = useScopedI18n(REPORTS_PAGE_TRANSLATIONS);

  return (
    <div className="space-y-6">
      <section>
        <div className={`rounded-3xl border px-5 py-4 sm:px-6 ${uiTheme.surfaceCard}`}>
          <h3 className={`text-lg font-black ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
            {tt("title")}
          </h3>
          <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
            {tt("description")}
          </p>
        </div>
      </section>

      <section>
        <ITWorkReportPanel
          theme={theme}
          tickets={tickets}
          serviceRequests={serviceRequests}
          onNavigatePage={onNavigatePage}
        />
      </section>

      <section>
        <ITServiceOverviewPanel
          tickets={tickets}
          serviceRequests={serviceRequests}
          onCreateTicket={onCreateTicket}
          onOpenWalkInTicket={onOpenWalkInTicket}
          onPickUpEquipment={onPickUpEquipment}
          onOpenRepair={onOpenRepairFromOverview}
        />
      </section>
    </div>
  );
};

export default ReportsPage;
