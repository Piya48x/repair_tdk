import React from "react";
import TicketWorkspacePage from "./TicketWorkspacePage";

const TicketsPage = (props) => (
  <TicketWorkspacePage
    title="งานซ่อม"
    subtitle="จัดการรายการงานซ่อมทั้งหมดของศูนย์บริการ"
    showCalendar={false}
    showReports={false}
    {...props}
  />
);

export default TicketsPage;
