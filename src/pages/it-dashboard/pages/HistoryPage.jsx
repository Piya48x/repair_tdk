import React from "react";
import TicketWorkspacePage from "./TicketWorkspacePage";

const HistoryPage = (props) => (
  <TicketWorkspacePage
    title="ประวัติ"
    subtitle="ตรวจสอบงานที่ปิดแล้วและข้อมูลย้อนหลัง"
    showCalendar={false}
    showReports={false}
    {...props}
  />
);

export default HistoryPage;
