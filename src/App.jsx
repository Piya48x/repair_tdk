import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { Toaster } from "react-hot-toast";

function AppInner() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />

      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'admin', 'auditor']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/ticket-history" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'admin', 'auditor']}>
          <TicketHistory />
        </ProtectedRoute>
      } />
      <Route path="/work-notes" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'admin', 'auditor']}>
          <WorkNotes />
        </ProtectedRoute>
      } />

      <Route path="/create-ticket" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'admin']}>
          <CreateTicket />
        </ProtectedRoute>
      } />

      <Route path="/admin-dashboard" element={
        <ProtectedRoute allowedRoles={['it_support', 'admin']}>
          <ITDashboard />
        </ProtectedRoute>
      } />
      <Route path="/it-service-dashboard" element={<Navigate to="/admin-dashboard" replace />} />

      <Route path="/audit-view" element={
        <ProtectedRoute allowedRoles={['auditor', 'admin']}>
          <AuditView />
        </ProtectedRoute>
      } />
      <Route path="/pick-up-equipment" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'admin']}>
          <PickUpEquipment />
        </ProtectedRoute>
      } />

      <Route path="/meeting-room-booking" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'admin']}>
          <MeetingRoomBooking />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
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
      <AppInner />
    </BrowserRouter>
  );
}
