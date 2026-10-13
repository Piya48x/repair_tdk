import React from "react";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import TdkApprovedRegistryReportSection from "./TdkApprovedRegistryReportSection";

export default function TdkApprovedRegistryReportPage() {
  return (
    <>
      <ReportsTopbar currentUser={null} />
      <main className="space-y-5">
        <TdkApprovedRegistryReportSection />
      </main>
    </>
  );
}
