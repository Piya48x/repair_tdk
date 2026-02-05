import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard";
import CreateTicket from "./pages/CreateTicket";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import TicketHistory from "./pages/TicketHistory";

// --- เพิ่มการ Import 2 หน้าใหม่ตรงนี้ ---
import ITDashboard from "./pages/ITDashboard"; // สร้างไฟล์นี้ในโฟลเดอร์ pages
import AuditView from "./pages/AuditView";     // สร้างไฟล์นี้ในโฟลเดอร์ pages
import { Ticket } from "lucide-react";
import PickUpEquipment from "./pages/PickUpEquipment.jsx";

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

      {/* หน้าสำหรับพนักงานทั่วไป */}
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

      {/* หน้าสำหรับสร้างตั๋วแจ้งซ่อม */}
      <Route path="/create-ticket" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'admin']}>
          <CreateTicket />
        </ProtectedRoute>
      } />

      {/* หน้าสำหรับ IT และ Admin เท่านั้น */}
      <Route path="/admin-dashboard" element={
        <ProtectedRoute allowedRoles={['it_support', 'admin']}>
          <ITDashboard />
        </ProtectedRoute>
      } />

      {/* หน้าสำหรับ Auditor เท่านั้น */}
      <Route path="/audit-view" element={
        <ProtectedRoute allowedRoles={['auditor', 'admin']}>
          <AuditView />
        </ProtectedRoute>
      } />
      {/* หน้าสำหรับ เบิกของ เท่านั้น */}
      <Route path="/pick-up-equipment" element={
        <ProtectedRoute allowedRoles={['user', 'it_support', 'admin']}>
          <PickUpEquipment />
        </ProtectedRoute>
      } />

      {/* ดักจับ Path ที่ไม่มีอยู่จริงให้กลับไปหน้าแรก */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}