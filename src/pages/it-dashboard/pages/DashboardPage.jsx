import React from "react";
import TicketWorkspacePage from "./TicketWorkspacePage";

const DashboardPage = (props) => (
  <TicketWorkspacePage
    title="ภาพรวมงานช่างเทคนิค"
    subtitle="ติดตามภาระงานและประสิทธิภาพในหน้าจอเดียว"
    {...props}
  />
);

export default DashboardPage;
