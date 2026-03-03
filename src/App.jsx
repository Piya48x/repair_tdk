import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard";
import CreateTicket from "./pages/CreateTicket";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import TicketHistory from "./pages/TicketHistory";

// --- à¹€à¸žà¸´à¹ˆà¸¡à¸à¸²à¸£ Import 2 à¸«à¸™à¹‰à¸²à¹ƒà¸«à¸¡à¹ˆà¸•à¸£à¸‡à¸™à¸µà¹‰ ---
import ITDashboard from "./pages/ITDashboard"; // à¸ªà¸£à¹‰à¸²à¸‡à¹„à¸Ÿà¸¥à¹Œà¸™à¸µà¹‰à¹ƒà¸™à¹‚à¸Ÿà¸¥à¹€à¸”à¸­à¸£à¹Œ pages
import AuditView from "./pages/AuditView";     // à¸ªà¸£à¹‰à¸²à¸‡à¹„à¸Ÿà¸¥à¹Œà¸™à¸µà¹‰à¹ƒà¸™à¹‚à¸Ÿà¸¥à¹€à¸”à¸­à¸£à¹Œ pages
import { Ticket } from "lucide-react";
import PickUpEquipment from "./pages/PickUpEquipment.jsx";
import { Toaster } from "react-hot-toast";

function AppInner() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />

      {/* à¸«à¸™à¹‰à¸²à¸ªà¸³à¸«à¸£à¸±à¸šà¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸—à¸±à¹ˆà¸§à¹„à¸› */}
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

      {/* à¸«à¸™à¹‰à¸²à¸ªà¸³à¸«à¸£à¸±à¸šà¸ªà¸£à¹‰à¸²à¸‡à¸•à¸±à¹‹à¸§à¹à¸ˆà¹‰à¸‡à¸‹à¹ˆà¸­à¸¡ */}
      <Route path="/create-ticket" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'admin']}>
          <CreateTicket />
        </ProtectedRoute>
      } />

      {/* à¸«à¸™à¹‰à¸²à¸ªà¸³à¸«à¸£à¸±à¸š IT à¹à¸¥à¸° Admin à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™ */}
      <Route path="/admin-dashboard" element={
        <ProtectedRoute allowedRoles={['it_support', 'admin']}>
          <ITDashboard />
        </ProtectedRoute>
      } />
      <Route path="/it-service-dashboard" element={<Navigate to="/admin-dashboard" replace />} />

      {/* à¸«à¸™à¹‰à¸²à¸ªà¸³à¸«à¸£à¸±à¸š Auditor à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™ */}
      <Route path="/audit-view" element={
        <ProtectedRoute allowedRoles={['auditor', 'admin']}>
          <AuditView />
        </ProtectedRoute>
      } />
      {/* à¸«à¸™à¹‰à¸²à¸ªà¸³à¸«à¸£à¸±à¸š à¹€à¸šà¸´à¸à¸‚à¸­à¸‡ à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™ */}
      <Route path="/pick-up-equipment" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'admin']}>
          <PickUpEquipment />
        </ProtectedRoute>
      } />

      {/* à¸”à¸±à¸à¸ˆà¸±à¸š Path à¸—à¸µà¹ˆà¹„à¸¡à¹ˆà¸¡à¸µà¸­à¸¢à¸¹à¹ˆà¸ˆà¸£à¸´à¸‡à¹ƒà¸«à¹‰à¸à¸¥à¸±à¸šà¹„à¸›à¸«à¸™à¹‰à¸²à¹à¸£à¸ */}
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
