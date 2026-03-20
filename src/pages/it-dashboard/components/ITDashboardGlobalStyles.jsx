import React from "react";
import { getITDashboardTheme } from "../theme/itDashboardTheme";

const ITDashboardGlobalStyles = ({ theme }) => {
  const uiTheme = getITDashboardTheme(theme);

  return (
    <style>{`
      .animate-slide-in-right {
        animation: slide-in-right 0.3s ease-out;
      }

      .animate-slide-out-right {
        animation: slide-out-right 0.3s ease-in;
      }

      .animate-fade-in-up {
        animation: fade-in-up 0.5s ease-out;
      }

      .animate-scale-in {
        animation: scale-in 0.2s ease-out;
      }

      @keyframes slide-in-right {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slide-in-left {
        from {
          transform: translateX(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slide-out-left {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(-100%);
          opacity: 0;
        }
      }

      @keyframes overlay-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes overlay-fade-out {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      .animate-slide-in-left {
        animation: slide-in-left 0.3s ease-out;
      }

      .animate-slide-out-left {
        animation: slide-out-left 0.3s ease-in;
      }

      .animate-overlay-fade-in {
        animation: overlay-fade-in 0.3s ease-out;
      }

      .animate-overlay-fade-out {
        animation: overlay-fade-out 0.3s ease-in;
      }

      @keyframes slide-out-right {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      @keyframes fade-in-up {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes scale-in {
        from {
          transform: scale(0.96);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }

      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: ${uiTheme.scrollbarTrack};
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb {
        background: ${uiTheme.scrollbarThumb};
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: ${uiTheme.scrollbarThumbHover};
      }

      ::selection {
        background: rgba(43, 89, 176, 0.3);
        color: ${uiTheme.selectionText};
      }
    `}</style>
  );
};

export default ITDashboardGlobalStyles;
