import React from "react";
import TicketWorkspacePage from "./TicketWorkspacePage";

const HistoryPage = (props) => (
  <TicketWorkspacePage
    title="ประวัติ"
    subtitle="ตรวจสอบงานที่ปิดแล้วและข้อมูลย้อนหลัง"
    {...props}
  />
);

export default HistoryPage;
