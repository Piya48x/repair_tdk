import React from "react";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import GatepassExecutiveTabs from "./GatepassExecutiveTabs";
import TdkApprovedRegistryReportSection from "./TdkApprovedRegistryReportSection";

export default function TdkApprovedRegistryReportPage() {
  return (
    <>
      <ReportsTopbar currentUser={null} />
      <GatepassExecutiveTabs />
      <main className="space-y-5">
        <TdkApprovedRegistryReportSection />
      </main>
    </>
  );
}
