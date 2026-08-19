import React from "react";
import AssetsManagementWorkspace from "../../reports/ExecutiveAssetsManagementPage";

export default function AssetsManagementPage({ theme = "light" }) {
  return (
    <AssetsManagementWorkspace
      embedded
      theme={theme}
    />
  );
}
