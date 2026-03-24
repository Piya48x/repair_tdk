import React from "react";
import { DASHBOARD_PAGE_IDS } from "../constants/dashboardPages";
import DashboardPage from "./DashboardPage";
import TicketsPage from "./TicketsPage";
import ActivePage from "./ActivePage";
import HistoryPage from "./HistoryPage";
import CalendarPage from "./CalendarPage";
import AccessRequestsPage from "./AccessRequestsPage";
import NotebookBorrowRequestsPage from "./NotebookBorrowRequestsPage";
import ITWorkEvidencePage from "./ITWorkEvidencePage";
import ReportsPage from "./ReportsPage";
import SettingsPage from "./SettingsPage";

const ITDashboardPageRenderer = ({ currentPage, ...workspaceProps }) => {
  switch (currentPage) {
    case DASHBOARD_PAGE_IDS.DASHBOARD:
      return <DashboardPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.TICKETS:
      return <TicketsPage {...workspaceProps} />;
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
      return <ITWorkEvidencePage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.REPORTS:
      return <ReportsPage {...workspaceProps} />;
    case DASHBOARD_PAGE_IDS.SETTINGS:
      return <SettingsPage theme={workspaceProps.theme} uiTheme={workspaceProps.uiTheme} />;
    default:
      return <DashboardPage {...workspaceProps} />;
  }
};

export default ITDashboardPageRenderer;
