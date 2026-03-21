import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, LayoutDashboard, Package, Shield, Wrench } from "lucide-react";
import ReportsTopbar from "../../components/reports/ReportsTopbar";

function ReportTile({ title, description, to, icon: Icon, tone = "indigo", subtitle, ctaLabel = "Open" }) {
  const toneClass =
    tone === "emerald"
      ? "from-emerald-500 to-teal-500"
      : tone === "amber"
        ? "from-amber-500 to-orange-500"
        : tone === "sky"
          ? "from-sky-500 to-cyan-500"
          : "from-indigo-500 to-cyan-500";

  return (
    <Link
      to={to}
      className="group flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
    >
      <div className={`inline-flex rounded-2xl bg-gradient-to-br p-3 text-white ${toneClass}`}>
        <Icon size={20} />
      </div>
      <h2 className="mt-5 text-xl font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {subtitle ? <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400">{subtitle}</p> : null}
      <div className="mt-auto pt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        {ctaLabel}
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function ReportsHomePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <ReportsTopbar />

        <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl sm:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              <Shield size={14} />
              Reports Hub / ศูนย์กลางรายงาน
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Executive selection for IT reporting
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              เลือกดูรายงานตามบทบาทได้ตามต้องการ ทั้งภาพรวมงาน IT, รายงานอุปกรณ์, งานแจ้งซ่อม และหน้าภาพรวมการปฏิบัติงาน
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ReportTile
            title="IT Manager Report"
            description="ภาพรวมการทำงานของทีม IT, คิวงาน, SLA และภาระงานรายวัน"
            subtitle="สิทธิ์: IT Manager / Admin"
            to="/reports/it"
            icon={BarChart3}
            tone="indigo"
            ctaLabel="Open report / เปิดรายงาน"
          />
          <ReportTile
            title="Asset Report"
            description="รายงานภาพรวมอุปกรณ์และงาน IT สำหรับดู repair, requisition, access request และสถานะ stock"
            subtitle="สิทธิ์: Executive / Admin"
            to="/reports/executive/assets-overview"
            icon={Package}
            tone="emerald"
            ctaLabel="Open overview / เปิดภาพรวม"
          />
          <ReportTile
            title="Repair Request"
            description="ไปยัง user dashboard เพื่อดูงานแจ้งซ่อมและสร้างรายการใหม่เหมือนผู้ใช้งานทั่วไป"
            subtitle="สิทธิ์: User / MD / Executive / IT Manager"
            to="/dashboard"
            icon={Wrench}
            tone="amber"
            ctaLabel="Open dashboard / ไปหน้าผู้ใช้"
          />
          <ReportTile
            title="Operations Overview"
            description="ภาพรวมผลงานการแจ้งซ่อม เบิกของ และงาน IT อื่น ๆ แบบ dashboard overview สำหรับผู้บริหาร"
            subtitle="สิทธิ์: Executive / Admin"
            to="/reports/executive"
            icon={LayoutDashboard}
            tone="sky"
            ctaLabel="Open overview / เปิดภาพรวม"
          />
        </section>
      </div>
    </div>
  );
}
