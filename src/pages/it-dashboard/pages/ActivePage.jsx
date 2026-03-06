import React from "react";
import TicketWorkspacePage from "./TicketWorkspacePage";

const ActivePage = (props) => (
  <TicketWorkspacePage
    title="กำลังดำเนินการ"
    subtitle="ติดตามงานที่รับผิดชอบและกำลังซ่อมอยู่"
    {...props}
  />
);

export default ActivePage;
