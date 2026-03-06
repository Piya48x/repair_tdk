import React from "react";
import TicketWorkspacePage from "./TicketWorkspacePage";

const TicketsPage = (props) => (
  <TicketWorkspacePage
    title="งานซ่อม"
    subtitle="จัดการรายการงานซ่อมทั้งหมดของศูนย์บริการ"
    {...props}
  />
);

export default TicketsPage;
