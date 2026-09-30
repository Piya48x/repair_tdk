import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CarFront, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import {
  fetchTdkApprovedRegistry,
  isTdkApprovedRegistrySchemaError,
} from "../it-dashboard/services/tdkApprovedRegistryService";
import GatepassExecutiveTabs from "./GatepassExecutiveTabs";

const COPY = {
  th: {
    title: "Company Summary",
    subtitle: "สัดส่วนรถ TDK APPROVED แยกตามบริษัท เพื่อเห็นความกระจุกตัวและจำนวนรถได้ทันที",
    refresh: "รีเฟรช",
    companies: "บริษัททั้งหมด",
    vehicles: "รถที่ใช้งาน",
    largest: "บริษัทที่มีรถมากที่สุด",
    average: "เฉลี่ยต่อบริษัท",
    distribution: "Vehicle Distribution by Company",
    distributionHint: "เรียงตามจำนวนทะเบียนรถที่ใช้งานอยู่",
    details: "Company Registry Detail",
    search: "ค้นหาบริษัท...",
    company: "บริษัท",
    count: "จำนวนรถ",
    share: "สัดส่วน",
    plates: "ตัวอย่างทะเบียน",
    empty: "ยังไม่มีข้อมูลบริษัทในทะเบียนหลัก",
    setup: "กรุณารัน SQL Gatepass เวอร์ชันล่าสุดก่อนใช้งานรายงาน",
  },
  en: {
    title: "Company Summary",
    subtitle: "TDK APPROVED fleet distribution by company for fast executive review.",
    refresh: "Refresh",
    companies: "Companies",
    vehicles: "Active vehicles",
    largest: "Largest fleet",
    average: "Average per company",
    distribution: "Vehicle Distribution by Company",
    distributionHint: "Ranked by active registered vehicles",
    details: "Company Registry Detail",
    search: "Search company...",
    company: "Company",
    count: "Vehicles",
    share: "Share",
    plates: "Sample plates",
    empty: "No company registry data yet.",
    setup: "Run the latest Gatepass SQL before using this report.",
  },
};

export default function GatepassCompanySummaryPage() {
  const { tt } = useScopedI18n(COPY);
  const [registry, setRegistry] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchTdkApprovedRegistry({ includeInactive: false });
      setRegistry(rows);
      setSchemaMissing(false);
      setError("");
    } catch (loadError) {
      console.error("Load Gatepass company summary failed", loadError);
      if (isTdkApprovedRegistrySchemaError(loadError)) setSchemaMissing(true);
      else setError(loadError?.message || "Unable to load company summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const companies = useMemo(() => {
    const map = new Map();
    registry.forEach((row) => {
      const company = String(row.company_name || "Unspecified").trim() || "Unspecified";
      const current = map.get(company) || { company, vehicles: 0, plates: [] };
      current.vehicles += 1;
      if (current.plates.length < 5 && row.vehicle_plate) current.plates.push(row.vehicle_plate);
      map.set(company, current);
    });
    return [...map.values()]
      .map((item) => ({ ...item, share: registry.length ? (item.vehicles / registry.length) * 100 : 0 }))
      .sort((a, b) => b.vehicles - a.vehicles);
  }, [registry]);

  const filteredCompanies = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter((item) => item.company.toLowerCase().includes(needle));
  }, [companies, search]);

  const largest = companies[0];
  const average = companies.length ? registry.length / companies.length : 0;

  return (
    <>
      <ReportsTopbar currentUser={null} />
      <GatepassExecutiveTabs />
      <main className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#214f91]"><Building2 size={13} />Fleet distribution</div><h1 className="mt-1.5 text-xl font-bold text-slate-950 sm:text-2xl">{tt("title")}</h1><p className="mt-1 text-xs text-slate-500 sm:text-sm">{tt("subtitle")}</p></div>
            <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />{tt("refresh")}</button>
          </div>
        </section>

        {schemaMissing ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{tt("setup")}</section> : null}
        {error ? <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</section> : null}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: tt("companies"), value: companies.length, icon: Building2 },
            { label: tt("vehicles"), value: registry.length, icon: ShieldCheck },
            { label: tt("largest"), value: largest?.vehicles || 0, detail: largest?.company || "-", icon: CarFront },
            { label: tt("average"), value: average.toFixed(1), icon: Building2 },
          ].map(({ label, value, detail, icon: Icon }) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>{detail ? <p className="mt-1 truncate text-[10px] text-slate-400">{detail}</p> : null}</div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#214f91]"><Icon size={17} /></span></div></article>)}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5"><h2 className="text-sm font-bold text-slate-900">{tt("distribution")}</h2><p className="mt-1 text-[11px] text-slate-500">{tt("distributionHint")}</p></div>
          <div className="h-[360px] p-3 sm:p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={companies.slice(0, 12)} layout="vertical" margin={{ top: 4, right: 24, left: 12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edf1f6" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="company" width={118} tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", fontSize: 11 }} /><Bar dataKey="vehicles" fill="#214f91" radius={[0, 4, 4, 0]} barSize={18} /></BarChart></ResponsiveContainer></div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="text-sm font-bold text-slate-900">{tt("details")}</h2><p className="mt-1 text-[11px] text-slate-500">{filteredCompanies.length} / {companies.length}</p></div><label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tt("search")} className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs outline-none focus:border-[#2b59b0] sm:w-72" /></label></div>
          {filteredCompanies.length ? <div className="overflow-x-auto"><table className="min-w-[720px] w-full text-left text-xs"><thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">{tt("company")}</th><th className="px-4 py-3 text-right">{tt("count")}</th><th className="px-4 py-3 text-right">{tt("share")}</th><th className="px-4 py-3">{tt("plates")}</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredCompanies.map((item, index) => <tr key={item.company} className="hover:bg-slate-50"><td className="px-4 py-3 text-slate-400">{index + 1}</td><td className="px-4 py-3 font-bold text-slate-900">{item.company}</td><td className="px-4 py-3 text-right font-bold text-slate-900">{item.vehicles}</td><td className="px-4 py-3 text-right text-slate-500">{item.share.toFixed(1)}%</td><td className="px-4 py-3 text-slate-500">{item.plates.join(", ") || "-"}</td></tr>)}</tbody></table></div> : <div className="flex min-h-44 items-center justify-center p-6 text-sm text-slate-400">{tt("empty")}</div>}
        </section>
      </main>
    </>
  );
}
