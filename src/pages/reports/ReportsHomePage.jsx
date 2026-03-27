import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  LayoutDashboard,
  Package,
  Shield,
  Wrench,
} from "lucide-react";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import ReportsTopbar from "../../components/reports/ReportsTopbar";

const REPORTS_HOME_TRANSLATIONS = {
  th: {
    heroBadge: "Reports Hub",
    heroTitle: "เลือกมุมมองรายงาน IT ตามบทบาทได้จากหน้าเดียว",
    heroDescription:
      "รวมมุมมองสำหรับ IT Manager, ผู้บริหาร, ภาพรวมทรัพย์สิน และลิงก์กลับไปยังหน้าผู้ใช้งาน เพื่อสลับงานได้เร็วขึ้นทั้งบนจอใหญ่และมือถือ",
    manager: {
      title: "รายงาน IT Manager",
      description:
        "ติดตาม queue, SLA, technician workload, walk-in ratio และ benchmark สำหรับจัดลำดับงานประจำวัน",
      subtitle: "สิทธิ์: IT Manager / Admin",
      cta: "เปิดรายงาน",
    },
    asset: {
      title: "ภาพรวม Asset",
      description:
        "ดูทรัพย์สิน, license, access request และสถานะงาน IT รวมกันในมุมมองเดียวสำหรับผู้บริหาร",
      subtitle: "สิทธิ์: Executive / Admin",
      cta: "เปิดภาพรวม",
    },
    repair: {
      title: "หน้าแจ้งซ่อม",
      description:
        "กลับไปที่ user dashboard เพื่อสร้าง ticket ใหม่และตรวจสอบประสบการณ์ใช้งานแบบ end user",
      subtitle: "สิทธิ์: User / Executive / IT Manager / Admin",
      cta: "ไปหน้า dashboard",
    },
    operations: {
      title: "Operations Overview",
      description:
        "มุมมอง executive ที่สรุป KPI, trend, asset health และ operational signals แบบอ่านเร็ว",
      subtitle: "สิทธิ์: Executive / Admin",
      cta: "เปิด overview",
    },
  },
  en: {
    heroBadge: "Reports Hub",
    heroTitle: "Choose the IT reporting view that matches the role and task",
    heroDescription:
      "One entry point for IT manager operations, executive dashboards, asset oversight, and a quick jump back to the end-user workspace.",
    manager: {
      title: "IT Manager Report",
      description:
        "Track queue health, SLA, technician workload, walk-in ratio, and operational benchmarks in one place.",
      subtitle: "Access: IT Manager / Admin",
      cta: "Open report",
    },
    asset: {
      title: "Assets Overview",
      description:
        "Review assets, licenses, access requests, and service activity together for executive oversight.",
      subtitle: "Access: Executive / Admin",
      cta: "Open overview",
    },
    repair: {
      title: "Repair Workspace",
      description:
        "Return to the user dashboard to create new tickets and review the end-user service experience.",
      subtitle: "Access: User / Executive / IT Manager / Admin",
      cta: "Open dashboard",
    },
    operations: {
      title: "Operations Overview",
      description:
        "Executive summary of KPI, trend, asset health, and operational signals across the IT service landscape.",
      subtitle: "Access: Executive / Admin",
      cta: "Open overview",
    },
  },
  ko: {
    heroBadge: "리포트 허브",
    heroTitle: "역할과 상황에 맞는 IT 리포트를 한 화면에서 선택합니다",
    heroDescription:
      "IT 매니저 운영 화면, 임원용 대시보드, 자산 개요, 그리고 사용자 워크스페이스 복귀 링크까지 한 곳에 정리했습니다.",
    manager: {
      title: "IT 매니저 리포트",
      description:
        "작업 대기열, SLA, 기술자 업무량, walk-in 비율, 운영 벤치마크를 한 번에 확인합니다.",
      subtitle: "권한: IT Manager / Admin",
      cta: "리포트 열기",
    },
    asset: {
      title: "자산 개요",
      description:
        "자산, 라이선스, 접근 요청, 서비스 현황을 함께 확인하는 임원용 뷰입니다.",
      subtitle: "권한: Executive / Admin",
      cta: "개요 열기",
    },
    repair: {
      title: "수리 요청 화면",
      description:
        "사용자 대시보드로 돌아가 새 티켓을 만들고 실제 사용자 경험 흐름을 확인합니다.",
      subtitle: "권한: User / Executive / IT Manager / Admin",
      cta: "대시보드 열기",
    },
    operations: {
      title: "운영 개요",
      description:
        "KPI, 추세, 자산 상태, 운영 신호를 빠르게 읽을 수 있도록 정리한 임원용 요약 화면입니다.",
      subtitle: "권한: Executive / Admin",
      cta: "개요 열기",
    },
  },
};

function ReportTile({
  title,
  description,
  to,
  icon: Icon,
  tone = "indigo",
  subtitle,
  ctaLabel,
}) {
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
      className="group flex h-full min-h-[270px] flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl sm:p-6"
    >
      <div className={`inline-flex rounded-2xl bg-gradient-to-br p-3 text-white ${toneClass}`}>
        <Icon size={20} />
      </div>
      <h2 className="mt-5 text-xl font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {subtitle ? (
        <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-slate-900">
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
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              {tt("heroTitle")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              {tt("heroDescription")}
            </p>
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
