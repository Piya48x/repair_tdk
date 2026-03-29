import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  Package,
  Wrench,
} from "lucide-react";
import ReportsTopbar from "../../components/reports/ReportsTopbar";
import { useScopedI18n } from "../../i18n/useScopedI18n";
import { supabase } from "../../lib/supabaseClient";
import {
  canAccessRoute,
  REPORT_ROUTE_PERMISSIONS,
  resolveWorkspaceRoute,
} from "../../lib/roleAccess";
import useNotebookApprovalRealtime from "../../hooks/useNotebookApprovalRealtime";

const REPORTS_HOME_TRANSLATIONS = {
  th: {
    tilesTitle: "Available Workspaces",
    tilesSubtitleDefault: "เลือก dashboard ตามสิทธิ์ของบัญชีและงานที่ต้องการทำ",
    operations: {
      title: "Operations Overview",
      description: "ดู KPI, trend, asset health และสัญญาณปฏิบัติการในมุมมองผู้บริหาร",
      subtitle: "สิทธิ์: Executive / Admin",
      cta: "เปิด overview",
      eyebrow: "Executive",
    },
    notebook: {
      title: "Notebook Approvals",
      description: "อนุมัติคำขอยืมและยืนยันการคืน notebook พร้อมดูหลักฐานประกอบในหน้าเดียว",
      subtitle: "สิทธิ์: Executive / Admin",
      cta: "เปิด approvals",
      eyebrow: "Approvals",
    },
    asset: {
      title: "Assets Overview",
      description: "ดู assets, licenses, access requests และสถานะงาน IT แบบ executive snapshot",
      subtitle: "สิทธิ์: Executive / Admin",
      cta: "เปิดภาพรวม",
      eyebrow: "Assets",
    },
    repair: {
      title: "Main Workspace",
      description: "กลับไปที่ user dashboard เพื่อสร้าง ticket ใหม่และติดตามงานฝั่งผู้ใช้งาน",
      subtitle: "สิทธิ์: User / Executive / IT Manager / Admin",
      cta: "ไปหน้า dashboard",
      eyebrow: "Workspace",
    },
    manager: {
      title: "IT Manager Report",
      description: "ติดตาม queue, SLA, technician workload และ benchmark สำหรับจัดลำดับงาน",
      subtitle: "สิทธิ์: IT Manager / Admin",
      cta: "เปิดรายงาน",
      eyebrow: "Operations",
    },
  },
  en: {
    tilesTitle: "Available Workspaces",
    tilesSubtitleDefault: "Open the dashboard that matches the role and current task.",
    operations: {
      title: "Operations Overview",
      description: "Review KPI, trend, asset health, and operational signals in the executive view.",
      subtitle: "Access: Executive / Admin",
      cta: "Open overview",
      eyebrow: "Executive",
    },
    notebook: {
      title: "Notebook Approvals",
      description: "Approve notebook borrow requests and confirm returns with evidence in one place.",
      subtitle: "Access: Executive / Admin",
      cta: "Open approvals",
      eyebrow: "Approvals",
    },
    asset: {
      title: "Assets Overview",
      description: "See assets, licenses, access requests, and service status in one executive snapshot.",
      subtitle: "Access: Executive / Admin",
      cta: "Open overview",
      eyebrow: "Assets",
    },
    repair: {
      title: "Main Workspace",
      description: "Return to the user dashboard to create tickets and monitor the end-user flow.",
      subtitle: "Access: User / Executive / IT Manager / Admin",
      cta: "Open dashboard",
      eyebrow: "Workspace",
    },
    manager: {
      title: "IT Manager Report",
      description: "Track queue health, SLA, technician workload, and operational benchmarks.",
      subtitle: "Access: IT Manager / Admin",
      cta: "Open report",
      eyebrow: "Operations",
    },
  },
  ko: {
    tilesTitle: "Available Workspaces",
    tilesSubtitleDefault: "권한과 현재 업무에 맞는 대시보드를 선택합니다.",
    operations: {
      title: "Operations Overview",
      description: "임원 관점에서 KPI, 추세, 자산 상태, 운영 신호를 빠르게 확인합니다.",
      subtitle: "권한: Executive / Admin",
      cta: "개요 열기",
      eyebrow: "Executive",
    },
    notebook: {
      title: "Notebook Approvals",
      description: "노트북 대여 승인과 반납 확인을 증빙과 함께 한 화면에서 처리합니다.",
      subtitle: "권한: Executive / Admin",
      cta: "승인 열기",
      eyebrow: "Approvals",
    },
    asset: {
      title: "Assets Overview",
      description: "자산, 라이선스, 접근 요청, 서비스 상태를 한 번에 봅니다.",
      subtitle: "권한: Executive / Admin",
      cta: "개요 열기",
      eyebrow: "Assets",
    },
    repair: {
      title: "Main Workspace",
      description: "사용자 대시보드로 돌아가 티켓 생성과 사용자 흐름을 확인합니다.",
      subtitle: "권한: User / Executive / IT Manager / Admin",
      cta: "대시보드 열기",
      eyebrow: "Workspace",
    },
    manager: {
      title: "IT Manager Report",
      description: "대기열, SLA, 기술자 업무량, 운영 벤치마크를 추적합니다.",
      subtitle: "권한: IT Manager / Admin",
      cta: "리포트 열기",
      eyebrow: "Operations",
    },
  },
};

function ReportTile({
  badgeCount = 0,
  title,
  description,
  to,
  icon: Icon,
  tone = "indigo",
  subtitle,
  ctaLabel,
  eyebrow,
  featured = false,
}) {
  const toneClass =
    tone === "emerald"
      ? "from-emerald-500 to-teal-500"
      : tone === "amber"
        ? "from-amber-500 to-orange-500"
        : tone === "sky"
          ? "from-sky-500 to-cyan-500"
          : tone === "violet"
            ? "from-violet-500 to-fuchsia-500"
            : "from-indigo-500 to-cyan-500";

  return (
    <Link
      to={to}
      className={`group flex h-full min-h-[260px] min-w-0 flex-col overflow-hidden rounded-[2rem] border bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)] sm:p-6 ${
        featured
          ? "border-slate-900/80 ring-1 ring-slate-900/10"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`inline-flex rounded-2xl bg-gradient-to-br p-3 text-white ${toneClass}`}>
          <Icon size={20} />
        </div>
        <div className="flex flex-col items-end gap-2">
          {badgeCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-black text-white shadow-[0_14px_24px_-16px_rgba(244,63,94,0.9)]">
              <span className="h-2 w-2 rounded-full bg-white/90 animate-pulse" />
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : null}
          {eyebrow ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {eyebrow}
            </span>
          ) : null}
        </div>
      </div>
      <h2 className="mt-5 break-words text-xl font-black text-slate-900">{title}</h2>
      <p className="mt-2 break-words text-sm leading-6 text-slate-500">{description}</p>
      {subtitle ? (
        <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-auto inline-flex min-w-0 items-center gap-2 pt-6 text-sm font-semibold text-slate-900">
        {ctaLabel}
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function ReportsHomePage() {
  const { tt } = useScopedI18n(REPORTS_HOME_TRANSLATIONS);
  const [currentUser, setCurrentUser] = useState(null);
  const [isIdentityReady, setIsIdentityReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session || !isMounted) return;

        const metadata = session.user.user_metadata || {};
        setCurrentUser({
          id: session.user.id,
          name:
            metadata.full_name ||
            metadata.employee_code ||
            session.user.email ||
            "User",
          role: metadata.role || "",
          avatar: metadata.avatar_url || "",
        });

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.warn("Load reports home profile error:", profileError);
        }

        if (!isMounted) return;

        setCurrentUser({
          id: session.user.id,
          name:
            profile?.full_name ||
            profile?.employee_code ||
            metadata.full_name ||
            metadata.employee_code ||
            session.user.email ||
            "User",
          role: profile?.role || metadata.role || "user",
          avatar:
            profile?.avatar_url ||
            profile?.id_card_url ||
            metadata.avatar_url ||
            "",
        });
      } finally {
        if (isMounted) {
          setIsIdentityReady(true);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentRole = String(currentUser?.role || "").trim().toLowerCase();
  const workspaceRoute = resolveWorkspaceRoute(currentRole || "user");
  const isExecutive = currentRole === "executive";
  const canSeeNotebookApprovals = canAccessRoute(currentRole, REPORT_ROUTE_PERMISSIONS.notebookApprovals);
  const { pendingCount: notebookApprovalBadgeCount } = useNotebookApprovalRealtime({
    enabled: canSeeNotebookApprovals,
  });

  const reportTiles = useMemo(
    () => [
      {
        key: "operations",
        title: tt("operations.title"),
        description: tt("operations.description"),
        subtitle: tt("operations.subtitle"),
        to: "/reports/executive",
        icon: LayoutDashboard,
        tone: "sky",
        ctaLabel: tt("operations.cta"),
        eyebrow: tt("operations.eyebrow"),
        roles: REPORT_ROUTE_PERMISSIONS.executive,
        featured: isExecutive,
      },
      {
        key: "notebook",
        title: tt("notebook.title"),
        description: tt("notebook.description"),
        subtitle: tt("notebook.subtitle"),
        to: "/reports/executive/notebook-approvals",
        icon: ClipboardCheck,
        tone: "violet",
        ctaLabel: tt("notebook.cta"),
        eyebrow: tt("notebook.eyebrow"),
        roles: REPORT_ROUTE_PERMISSIONS.notebookApprovals,
        featured: isExecutive,
        badgeCount: notebookApprovalBadgeCount,
      },
      {
        key: "asset",
        title: tt("asset.title"),
        description: tt("asset.description"),
        subtitle: tt("asset.subtitle"),
        to: "/reports/executive/assets-overview",
        icon: Package,
        tone: "emerald",
        ctaLabel: tt("asset.cta"),
        eyebrow: tt("asset.eyebrow"),
        roles: REPORT_ROUTE_PERMISSIONS.executive,
      },
      {
        key: "repair",
        title: tt("repair.title"),
        description: tt("repair.description"),
        subtitle: tt("repair.subtitle"),
        to: workspaceRoute,
        icon: Wrench,
        tone: "amber",
        ctaLabel: tt("repair.cta"),
        eyebrow: tt("repair.eyebrow"),
        roles: null,
      },
      {
        key: "manager",
        title: tt("manager.title"),
        description: tt("manager.description"),
        subtitle: tt("manager.subtitle"),
        to: "/reports/it",
        icon: BarChart3,
        tone: "indigo",
        ctaLabel: tt("manager.cta"),
        eyebrow: tt("manager.eyebrow"),
        roles: REPORT_ROUTE_PERMISSIONS.it,
      },
    ],
    [isExecutive, notebookApprovalBadgeCount, tt, workspaceRoute],
  );

  const visibleTiles = reportTiles.filter((tile) => {
    if (!tile.roles) return true;
    if (!currentRole) return false;
    return canAccessRoute(currentRole, tile.roles);
  });

  const tileGridClass =
    "grid grid-cols-1 gap-5 md:grid-cols-2 xl:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_48%,_#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <ReportsTopbar
          currentUser={currentUser}
          notebookApprovalBadgeCount={canSeeNotebookApprovals ? notebookApprovalBadgeCount : 0}
        />

        <section>
          <div className="mb-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              {tt("tilesTitle")}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {tt("tilesTitle")}
            </h2>
            {!isExecutive ? (
              <p className="mt-1 text-sm text-slate-500">
                {tt("tilesSubtitleDefault")}
              </p>
            ) : null}
          </div>

          {isIdentityReady ? (
            <div className={tileGridClass}>
              {visibleTiles.map((item) => (
                <ReportTile
                  key={item.key}
                  badgeCount={item.badgeCount}
                  title={item.title}
                  description={item.description}
                  subtitle={item.subtitle}
                  to={item.to}
                  icon={item.icon}
                  tone={item.tone}
                  ctaLabel={item.ctaLabel}
                  eyebrow={item.eyebrow}
                  featured={item.featured}
                />
              ))}
            </div>
          ) : (
            <div className={tileGridClass}>
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`reports-tile-skeleton-${index}`}
                  className="h-[260px] animate-pulse rounded-[2rem] border border-slate-200 bg-white/70 shadow-[0_12px_32px_rgba(15,23,42,0.05)]"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
