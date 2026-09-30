import React from "react";
import { NavLink } from "react-router-dom";
import { Building2, CarFront, LayoutDashboard, ShieldCheck } from "lucide-react";
import { useScopedI18n } from "../../i18n/useScopedI18n";

const COPY = {
  th: {
    overview: "Overview",
    daily: "Daily Gatepass",
    registry: "TDK Approved Registry",
    companies: "Company Summary",
  },
  en: {
    overview: "Overview",
    daily: "Daily Gatepass",
    registry: "TDK Approved Registry",
    companies: "Company Summary",
  },
  ko: {
    overview: "Overview",
    daily: "Daily Gatepass",
    registry: "TDK Approved Registry",
    companies: "Company Summary",
  },
};

const ITEMS = [
  { key: "overview", to: "/reports/gatepass/overview", icon: LayoutDashboard },
  { key: "daily", to: "/reports/gatepass/daily", icon: CarFront },
  { key: "registry", to: "/reports/gatepass/registry", icon: ShieldCheck },
  { key: "companies", to: "/reports/gatepass/company-summary", icon: Building2 },
];

export default function GatepassExecutiveTabs() {
  const { tt } = useScopedI18n(COPY);

  return (
    <nav aria-label="Gatepass report views" className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-1">
        {ITEMS.map(({ key, to, icon: Icon }) => (
          <NavLink
            key={key}
            to={to}
            className={({ isActive }) => `inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-xs font-bold transition sm:px-4 ${isActive ? "bg-[#102a56] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            <Icon size={15} />
            <span>{tt(key)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
