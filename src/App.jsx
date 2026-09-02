import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard";
import CreateTicket from "./pages/CreateTicket";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import TicketHistory from "./pages/TicketHistory";
import ITDashboard from "./pages/ITDashboard";
import AuditView from "./pages/AuditView";
import PickUpEquipment from "./pages/PickUpEquipment.jsx";
import MeetingRoomBooking from "./pages/MeetingRoomBooking.jsx";
import WorkNotes from "./pages/WorkNotes.jsx";
import AccessRequest from "./pages/AccessRequest.jsx";
import NotebookCenter from "./pages/NotebookCenter.jsx";
import MyStatus from "./pages/MyStatus.jsx";
import MyBorrowRequests from "./pages/MyBorrowRequests.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ReportsHomePage from "./pages/reports/ReportsHomePage.jsx";
import ITManagerReportPage from "./pages/reports/ITManagerReportPage.jsx";
import ExecutiveReportPage from "./pages/reports/ExecutiveReportPage.jsx";
import ExecutiveAssetOverviewPage from "./pages/reports/ExecutiveAssetOverviewPage.jsx";
import ExecutiveNotebookApprovalsPage from "./pages/reports/ExecutiveNotebookApprovalsPage.jsx";
import AssetQrDetailPage from "./pages/AssetQrDetailPage.jsx";
import { REPORT_ROUTE_PERMISSIONS } from "./lib/roleAccess";
import { Toaster } from "react-hot-toast";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";

function AppInner() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'it_manager', 'executive', 'admin', 'auditor']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/ticket-history" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'executive', 'admin', 'auditor']}>
          <TicketHistory />
        </ProtectedRoute>
      } />
      <Route path="/work-notes" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'executive', 'admin', 'auditor']}>
          <WorkNotes />
        </ProtectedRoute>
      } />
      <Route path="/access-request" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'executive', 'admin', 'auditor']}>
          <AccessRequest />
        </ProtectedRoute>
      } />
      <Route path="/notebook-center" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'executive', 'admin', 'auditor']}>
          <NotebookCenter />
        </ProtectedRoute>
      } />
      <Route path="/my-status" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'it_manager', 'executive', 'admin', 'auditor']}>
          <MyStatus />
        </ProtectedRoute>
      } />
      <Route path="/my-borrow-requests" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'it_manager', 'executive', 'admin', 'auditor']}>
          <MyBorrowRequests />
        </ProtectedRoute>
      } />

      <Route path="/create-ticket" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'it_manager', 'executive', 'admin']}>
          <CreateTicket />
        </ProtectedRoute>
      } />

      <Route path="/admin-dashboard" element={
        <ProtectedRoute allowedRoles={['it_support', 'admin']}>
          <ITDashboard />
        </ProtectedRoute>
      } />
      <Route
        path="/admin-dashboard/assets-management"
        element={(
          <Navigate
            to="/admin-dashboard"
            replace
            state={{ dashboardPage: "ASSET_MANAGEMENT" }}
          />
        )}
      />
      <Route path="/reports" element={
        <ProtectedRoute allowedRoles={REPORT_ROUTE_PERMISSIONS.index}>
          <ReportsHomePage />
        </ProtectedRoute>
      } />
      <Route path="/reports/it" element={
        <ProtectedRoute allowedRoles={REPORT_ROUTE_PERMISSIONS.it}>
          <ITManagerReportPage />
        </ProtectedRoute>
      } />
      <Route path="/reports/executive" element={
        <ProtectedRoute allowedRoles={REPORT_ROUTE_PERMISSIONS.executive}>
          <ExecutiveReportPage />
        </ProtectedRoute>
      } />
      <Route path="/reports/executive/notebook-approvals" element={
        <ProtectedRoute allowedRoles={REPORT_ROUTE_PERMISSIONS.notebookApprovals}>
          <ExecutiveNotebookApprovalsPage />
        </ProtectedRoute>
      } />
      <Route path="/reports/executive/assets-overview" element={
        <ProtectedRoute allowedRoles={REPORT_ROUTE_PERMISSIONS.executive}>
          <ExecutiveAssetOverviewPage />
        </ProtectedRoute>
      } />
      <Route
        path="/reports/executive/assets-management"
        element={(
          <Navigate
            to="/admin-dashboard"
            replace
            state={{ dashboardPage: "ASSET_MANAGEMENT" }}
          />
        )}
      />
      <Route path="/asset-qr/:assetTag" element={
        <ProtectedRoute allowedRoles={["user", "it_support", "it_manager", "executive", "admin", "auditor"]}>
          <AssetQrDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/it-service-dashboard" element={<Navigate to="/admin-dashboard" replace />} />

      <Route path="/audit-view" element={
        <ProtectedRoute allowedRoles={['auditor', 'admin']}>
          <AuditView />
        </ProtectedRoute>
      } />
      <Route path="/pick-up-equipment" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'executive', 'admin']}>
          <PickUpEquipment />
        </ProtectedRoute>
      } />

      <Route path="/meeting-room-booking" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'executive', 'admin']}>
          <MeetingRoomBooking />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppChrome() {
  const location = useLocation();
  const hideFloatingLanguageSwitcher =
    location.pathname === "/dashboard" ||
    location.pathname === "/my-borrow-requests" ||
    location.pathname === "/notebook-center" ||
    location.pathname === "/create-ticket" ||
    location.pathname === "/admin-dashboard" ||
    location.pathname.startsWith("/asset-qr/") ||
    location.pathname.startsWith("/reports");
  const isAuthSurface =
    location.pathname === "/" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password";

  return hideFloatingLanguageSwitcher ? null : <LanguageSwitcher mode={isAuthSurface ? "auth" : "floating"} />;
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Toaster />
      <AppChrome />
      <AppInner />
    </BrowserRouter>
  );
}
