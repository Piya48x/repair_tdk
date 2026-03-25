import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, LayoutDashboard, Package, Shield, Wrench } from "lucide-react";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import ReportsTopbar from "../../components/reports/ReportsTopbar";

const REPORTS_HOME_TRANSLATIONS = {
  th: {
    heroBadge: "Reports Hub / ศูนย์กลางรายงาน",
    heroTitle: "Executive selection for IT reporting",
    heroDescription: "เลือกดูรายงานตามบทบาทได้ตามต้องการ ทั้งภาพรวมงาน IT, รายงานอุปกรณ์, งานแจ้งซ่อม และหน้าภาพรวมการปฏิบัติงาน",
    ctaOpen: "Open",
    manager: {
      title: "IT Manager Report",
      description: "ภาพรวมการทำงานของทีม IT, คิวงาน, SLA และภาระงานรายวัน",
      subtitle: "สิทธิ์: IT Manager / Admin",
      cta: "Open report / เปิดรายงาน",
    },
    asset: {
      title: "Asset Report",
      description: "รายงานภาพรวมอุปกรณ์และงาน IT สำหรับดู repair, requisition, access request และสถานะ stock",
      subtitle: "สิทธิ์: Executive / Admin",
      cta: "Open overview / เปิดภาพรวม",
    },
    repair: {
      title: "Repair Request",
      description: "ไปยัง user dashboard เพื่อดูงานแจ้งซ่อมและสร้างรายการใหม่เหมือนผู้ใช้งานทั่วไป",
      subtitle: "สิทธิ์: User / MD / Executive / IT Manager",
      cta: "Open dashboard / ไปหน้าผู้ใช้",
    },
    operations: {
      title: "Operations Overview",
      description: "ภาพรวมผลงานการแจ้งซ่อม เบิกของ และงาน IT อื่น ๆ แบบ dashboard overview สำหรับผู้บริหาร",
      subtitle: "สิทธิ์: Executive / Admin",
      cta: "Open overview / เปิดภาพรวม",
    },
  },
  en: {
    heroBadge: "Reports Hub",
    heroTitle: "Executive selection for IT reporting",
    heroDescription: "Choose the report view you need by role, including IT operations, asset reporting, repair requests, and executive performance overviews.",
    ctaOpen: "Open",
    manager: {
      title: "IT Manager Report",
      description: "Team workload, ticket queue, SLA performance, and daily IT operations in one view.",
      subtitle: "Access: IT Manager / Admin",
      cta: "Open report",
    },
    asset: {
      title: "Asset Report",
      description: "High-level asset and IT activity reporting for repairs, requisitions, access requests, and stock status.",
      subtitle: "Access: Executive / Admin",
      cta: "Open overview",
    },
    repair: {
      title: "Repair Request",
      description: "Go to the user dashboard to review repair requests and create new tickets like a regular end user.",
      subtitle: "Access: User / MD / Executive / IT Manager",
      cta: "Open dashboard",
    },
    operations: {
      title: "Operations Overview",
      description: "Executive dashboard view of repair work, equipment requests, and broader IT operations.",
      subtitle: "Access: Executive / Admin",
      cta: "Open overview",
    },
  },
  ko: {
    heroBadge: "Reports Hub / 보고서 허브",
    heroTitle: "IT 보고를 위한 경영진 선택 화면",
    heroDescription: "역할에 따라 IT 운영, 자산 보고, 수리 요청, 운영 개요 보고서를 선택해 확인할 수 있습니다.",
    ctaOpen: "열기",
    manager: {
      title: "IT Manager Report",
      description: "IT 팀 업무량, 티켓 큐, SLA 성과, 일일 운영 현황을 한 화면에서 확인합니다.",
      subtitle: "권한: IT Manager / Admin",
      cta: "보고서 열기",
    },
    asset: {
      title: "Asset Report",
      description: "수리, 구매 요청, 권한 요청, 재고 상태를 포함한 자산 및 IT 활동 개요 보고서입니다.",
      subtitle: "권한: Executive / Admin",
      cta: "개요 열기",
    },
    repair: {
      title: "Repair Request",
      description: "일반 사용자와 동일하게 사용자 대시보드에서 수리 요청을 확인하고 새 티켓을 생성합니다.",
      subtitle: "권한: User / MD / Executive / IT Manager",
      cta: "대시보드 열기",
    },
    operations: {
      title: "Operations Overview",
      description: "수리 작업, 물품 요청, 기타 IT 운영 실적을 위한 경영진용 대시보드 개요입니다.",
      subtitle: "권한: Executive / Admin",
      cta: "개요 열기",
    },
  },
};

function ReportTile({ title, description, to, icon: Icon, tone = "indigo", subtitle, ctaLabel }) {
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
  const { tt } = useScopedI18n(REPORTS_HOME_TRANSLATIONS);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <ReportsTopbar />

        <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl sm:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              <Shield size={14} />
              {tt("heroBadge")}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{tt("heroTitle")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">{tt("heroDescription")}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ReportTile
            title={tt("manager.title")}
            description={tt("manager.description")}
            subtitle={tt("manager.subtitle")}
            to="/reports/it"
            icon={BarChart3}
            tone="indigo"
            ctaLabel={tt("manager.cta")}
          />
          <ReportTile
            title={tt("asset.title")}
            description={tt("asset.description")}
            subtitle={tt("asset.subtitle")}
            to="/reports/executive/assets-overview"
            icon={Package}
            tone="emerald"
            ctaLabel={tt("asset.cta")}
          />
          <ReportTile
            title={tt("repair.title")}
            description={tt("repair.description")}
            subtitle={tt("repair.subtitle")}
            to="/dashboard"
            icon={Wrench}
            tone="amber"
            ctaLabel={tt("repair.cta")}
          />
          <ReportTile
            title={tt("operations.title")}
            description={tt("operations.description")}
            subtitle={tt("operations.subtitle")}
            to="/reports/executive"
            icon={LayoutDashboard}
            tone="sky"
            ctaLabel={tt("operations.cta")}
          />
        </section>
      </div>
    </div>
  );
}
