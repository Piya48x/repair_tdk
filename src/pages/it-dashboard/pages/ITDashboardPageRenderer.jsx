import React from "react";
import { DASHBOARD_PAGE_IDS } from "../constants/dashboardPages";
import DashboardPage from "./DashboardPage";
import TicketsPage from "./TicketsPage";
import ServiceRequestsPage from "./ServiceRequestsPage";
import StockManagementPage from "./StockManagementPage";
import AssetsManagementPage from "./AssetsManagementPage";
import AssetQrCenterPage from "./AssetQrCenterPage";
import AssetStockAuditPage from "./AssetStockAuditPage";
import ActivePage from "./ActivePage";
import HistoryPage from "./HistoryPage";
import CalendarPage from "./CalendarPage";
import AccessRequestsPage from "./AccessRequestsPage";
import NotebookBorrowRequestsPage from "./NotebookBorrowRequestsPage";
import ITWorkEvidencePage from "./ITWorkEvidencePage";
import ReportsPage from "./ReportsPage";
import SettingsPage from "./SettingsPage";

const ITDashboardPageRenderer = ({ currentPage, ...workspaceProps }) => {
  const renderStockPage = (stockManagementSection) => (
    <StockManagementPage {...workspaceProps} stockManagementSection={stockManagementSection} />
  );

  switch (currentPage) {
    case DASHBOARD_PAGE_IDS.DASHBOARD:
      return <DashboardPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.TICKETS:
      return <TicketsPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.SERVICE_REQUESTS:
      return <ServiceRequestsPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.STOCK_MANAGEMENT:
      return renderStockPage(workspaceProps.stockManagementSection || "issue");
    case DASHBOARD_PAGE_IDS.STOCK_WALK_IN:
      return renderStockPage("issue");
    case DASHBOARD_PAGE_IDS.STOCK_RECEIVE:
      return renderStockPage("receive");
    case DASHBOARD_PAGE_IDS.STOCK_HISTORY:
      return renderStockPage("history");
    case DASHBOARD_PAGE_IDS.ASSET_MANAGEMENT:
      return <AssetsManagementPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.ASSET_QR_CENTER:
      return <AssetQrCenterPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.ASSET_STOCK_AUDIT:
      return <AssetStockAuditPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.ACTIVE:
      return <ActivePage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.HISTORY:
      return <HistoryPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.CALENDAR:
      return <CalendarPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.ACCESS_REQUESTS:
      return <AccessRequestsPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.NOTEBOOK_BORROW:
      return <NotebookBorrowRequestsPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.IT_WORK_LOGS:
    case DASHBOARD_PAGE_IDS.IT_WORK_GENERAL:
      return <ITWorkEvidencePage {...workspaceProps} viewMode="general" />;
    case DASHBOARD_PAGE_IDS.IT_ASSET_MOVEMENTS:
      return <ITWorkEvidencePage {...workspaceProps} viewMode="movements" />;
    case DASHBOARD_PAGE_IDS.IT_WORK_HISTORY:
      return <ITWorkEvidencePage {...workspaceProps} viewMode="history" />;
    case DASHBOARD_PAGE_IDS.REPORTS:
      return <ReportsPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.SETTINGS:
      return (
        <SettingsPage
          theme={workspaceProps.theme}
          uiTheme={workspaceProps.uiTheme}
          currentUser={workspaceProps.currentUser}
          onCurrentUserUpdate={workspaceProps.onCurrentUserUpdate}
        />
      );
    default:
      return <DashboardPage {...workspaceProps} />;
  }
};

export default ITDashboardPageRenderer;
