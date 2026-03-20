import React from "react";
import ITServiceOverviewPanel from "../components/ITServiceOverviewPanel";

const ReportsPage = ({
  theme,
  uiTheme,
  tickets,
  onCreateTicket,
  onOpenWalkInTicket,
  onPickUpEquipment,
  onOpenRepairFromOverview,
}) => (
  <>
    <section className="mb-6">
      <div className={`rounded-lg border px-4 py-3 ${uiTheme.surfaceCard}`}>
        <h3 className={`text-base font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
          รายงานภาพรวม
        </h3>
        <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
          สรุป KPI และกราฟวิเคราะห์สำหรับฝ่ายซ่อมและคลัง
        </p>
      </div>
    </section>

    <section>
      <ITServiceOverviewPanel
        tickets={tickets}
        onCreateTicket={onCreateTicket}
        onOpenWalkInTicket={onOpenWalkInTicket}
        onPickUpEquipment={onPickUpEquipment}
        onOpenRepair={onOpenRepairFromOverview}
      />
    </section>
  </>
);

export default ReportsPage;
