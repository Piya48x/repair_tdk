import React from "react";

export default function DashboardGlobalStyles() {
  return (
    <style>{`
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes scale-in {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes slide-in-right {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes fade-out {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      @keyframes float {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-5px);
        }
      }

      .animate-fade-in {
        animation: fade-in 0.3s ease-out;
      }

      .animate-scale-in {
        animation: scale-in 0.3s ease-out;
      }

      .animate-slide-in-right {
        animation: slide-in-right 0.3s ease-out;
      }

      .animate-fade-out {
        animation: fade-out 0.3s ease-out;
      }

      .animate-float {
        animation: float 3s ease-in-out infinite;
      }

      .dashboard-theme {
        transition: background-color 0.25s ease, color 0.25s ease;
      }

      .dashboard-theme--light .border-white\/70,
      .dashboard-theme--light .border-white\/80,
      .dashboard-theme--light .border-slate-100,
      .dashboard-theme--light .border-slate-200 {
        border-color: rgba(191, 219, 254, 0.78) !important;
      }

      .dashboard-theme--light .bg-white\/95,
      .dashboard-theme--light .bg-white\/90,
      .dashboard-theme--light .bg-white\/85,
      .dashboard-theme--light .bg-white\/80,
      .dashboard-theme--light .bg-white\/75,
      .dashboard-theme--light .bg-white\/65,
      .dashboard-theme--light .bg-white\/50 {
        background-color: rgba(255, 255, 255, 0.86) !important;
      }

      .dashboard-theme--light .bg-slate-50,
      .dashboard-theme--light .bg-slate-50\/80,
      .dashboard-theme--light .bg-slate-50\/70,
      .dashboard-theme--light .bg-slate-100 {
        background-color: rgba(239, 246, 255, 0.82) !important;
      }

      .dashboard-theme--light .hover\:bg-slate-50:hover {
        background-color: rgba(219, 234, 254, 0.85) !important;
      }

      .dashboard-theme--dark .border-white\/70,
      .dashboard-theme--dark .border-white\/80,
      .dashboard-theme--dark .border-slate-100,
      .dashboard-theme--dark .border-slate-200,
      .dashboard-theme--dark .border-slate-700\/70 {
        border-color: rgba(100, 116, 139, 0.38) !important;
      }

      .dashboard-theme--dark .bg-white,
      .dashboard-theme--dark .bg-white\/95,
      .dashboard-theme--dark .bg-white\/85,
      .dashboard-theme--dark .bg-white\/80,
      .dashboard-theme--dark .bg-white\/75,
      .dashboard-theme--dark .bg-white\/65,
      .dashboard-theme--dark .bg-white\/50 {
        background-color: rgba(15, 23, 42, 0.82) !important;
      }

      .dashboard-theme--dark .bg-slate-50,
      .dashboard-theme--dark .bg-slate-50\/80,
      .dashboard-theme--dark .bg-slate-50\/70,
      .dashboard-theme--dark .bg-slate-100 {
        background-color: rgba(30, 41, 59, 0.72) !important;
      }

      .dashboard-theme--dark .text-slate-900,
      .dashboard-theme--dark .text-slate-800,
      .dashboard-theme--dark .text-slate-700 {
        color: #e2e8f0 !important;
      }

      .dashboard-theme--dark .text-slate-600,
      .dashboard-theme--dark .text-slate-500,
      .dashboard-theme--dark .text-slate-400 {
        color: #94a3b8 !important;
      }

      .dashboard-theme--dark .hover\:bg-slate-50:hover {
        background-color: rgba(51, 65, 85, 0.75) !important;
      }

      .dashboard-theme--dark .from-slate-50,
      .dashboard-theme--dark .to-slate-100 {
        --tw-gradient-from: rgba(30, 41, 59, 0.7) var(--tw-gradient-from-position) !important;
        --tw-gradient-to: rgba(51, 65, 85, 0.7) var(--tw-gradient-to-position) !important;
      }

      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      .dashboard-theme--dark ::-webkit-scrollbar-track {
        background: #0f172a;
      }

      .dashboard-theme--dark ::-webkit-scrollbar-thumb {
        background: #475569;
      }

      .dashboard-theme--dark ::-webkit-scrollbar-thumb:hover {
        background: #64748b;
      }
    `}</style>
  );
}
