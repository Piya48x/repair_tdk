import { createContext, useContext } from "react";

export const ReportsLayoutContext = createContext({
  hasSidebar: false,
  openSidebar: () => {},
  sidebarCollapsed: false,
  chatOpenSignal: 0,
  chatOpenSignalTarget: "support",
  requestChatOpen: () => {},
  reportIdentity: null,
  setReportIdentity: () => {},
});

export function useReportsLayout() {
  return useContext(ReportsLayoutContext);
}
