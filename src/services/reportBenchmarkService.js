function clamp(value, min, max) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

function percentage(value, total) {
  if (!total) return 0;
  return Math.round((Number(value || 0) / Math.max(Number(total || 0), 1)) * 100);
}

export function buildReportBenchmark(data, mode = "executive") {
  const kpi = data?.kpi || {};
  const topIssues = data?.topIssues || [];
  const topDepartments = data?.topDepartments || [];
  const assetSummary = data?.assetSummary || {};
  const licenseSummary = data?.licenseSummary || {};

  const totalTickets = Number(kpi.totalTickets || data?.totalTickets || 0);
  const openTickets = Number(kpi.openTickets || data?.queue?.total || 0);
  const overdueTickets = Number(kpi.overdueTickets || data?.queue?.overdueTickets || 0);
  const avgResolutionTimeMinutes = Number(kpi.avgResolutionTimeMinutes || 0);
  const walkInRatio = Number(data?.walkInRatio || 0);

  const backlogRate = percentage(openTickets, totalTickets);
  const overdueRate = percentage(overdueTickets, totalTickets);
  const assetRiskRate = percentage(assetSummary.riskyAssets || 0, assetSummary.totalAssets || 0);
  const licenseExpiryRate = percentage(licenseSummary.expiring30 || 0, licenseSummary.totalLicenses || 0);
  const licenseUsageRate = percentage(licenseSummary.usedSeats || 0, licenseSummary.totalSeats || 0);

  const gapAnalysis = [
    {
      dimension: "Incident Response",
      current: clamp(100 - overdueRate * 1.3 - backlogRate * 0.45, 28, 97),
      target: 92,
    },
    {
      dimension: "SLA Governance",
      current: clamp(100 - overdueRate * 1.7, 22, 96),
      target: 95,
    },
    {
      dimension: "Process Standardization",
      current: clamp(100 - walkInRatio * 1.05, 20, 95),
      target: 93,
    },
    {
      dimension: "Asset Lifecycle",
      current: clamp(100 - assetRiskRate * 0.9, 24, 95),
      target: 91,
    },
    {
      dimension: "License Compliance",
      current: clamp(100 - licenseExpiryRate * 1.15 - Math.max(licenseUsageRate - 85, 0) * 0.6, 25, 96),
      target: 94,
    },
  ].map((item) => ({
    ...item,
    gap: Math.max(item.target - item.current, 0),
  }));

  const primaryIssue = topIssues[0];
  const primaryDepartment = topDepartments[0];
  const strongestDimension = [...gapAnalysis].sort((a, b) => b.current - a.current)[0];
  const weakestDimension = [...gapAnalysis].sort((a, b) => b.gap - a.gap)[0];

  const highlights = [
    {
      title: "Key Highlight 01",
      heading: "Service exposure / ความเสี่ยงงานบริการ",
      description: `${overdueTickets} overdue tickets (${overdueRate}%) remain outside best-practice tolerance.`,
      tone: overdueRate > 15 ? "rose" : overdueRate > 7 ? "amber" : "emerald",
    },
    {
      title: "Key Highlight 02",
      heading: "Demand concentration / การกระจุกตัวของงาน",
      description: primaryDepartment
        ? `${primaryDepartment.label} is the heaviest-demand department and ${primaryIssue?.label || "service issues"} is the leading issue cluster.`
        : "Demand is currently distributed without a single dominant department in the available data.",
      tone: "indigo",
    },
    {
      title: "Key Highlight 03",
      heading: "Process standardization / มาตรฐานกระบวนการ",
      description: `${walkInRatio}% of requests still arrive as walk-in or manual flow, above digital-first service desk norms.`,
      tone: walkInRatio > 25 ? "amber" : "indigo",
    },
    {
      title: "Key Highlight 04",
      heading: "Asset and license governance / สินทรัพย์และใบอนุญาต",
      description: `${assetSummary.riskyAssets || 0} aging assets and ${licenseSummary.expiring30 || 0} licenses expiring in 30 days need proactive planning.`,
      tone: assetRiskRate > 20 || licenseExpiryRate > 10 ? "rose" : "emerald",
    },
    {
      title: "Key Highlight 05",
      heading: "Best practice leverage / จุดที่ควรเร่งใช้",
      description: strongestDimension
        ? `${strongestDimension.dimension} is currently the closest to benchmark and can be used as the first internal success story.`
        : "Use the strongest current process as the first internal benchmark anchor.",
      tone: "emerald",
    },
  ];

  const strategicComparison = [
    {
      area: "Incident intake",
      current: `Walk-in ${walkInRatio}% of total requests`,
      benchmark: "Digital-first intake below 10%",
      gap: `${Math.max(walkInRatio - 10, 0)}% above target`,
      priority: walkInRatio > 25 ? "High" : "Medium",
    },
    {
      area: "Backlog control",
      current: `${openTickets} open tickets (${backlogRate}%)`,
      benchmark: "Open backlog below 20% of period volume",
      gap: `${Math.max(backlogRate - 20, 0)}% above target`,
      priority: backlogRate > 25 ? "High" : "Medium",
    },
    {
      area: "SLA governance",
      current: `${overdueTickets} overdue tickets (${overdueRate}%)`,
      benchmark: "Overdue below 5% with weekly review",
      gap: `${Math.max(overdueRate - 5, 0)}% above target`,
      priority: overdueRate > 10 ? "High" : "Medium",
    },
    {
      area: "Asset lifecycle",
      current: `${assetSummary.riskyAssets || 0} aging assets (${assetRiskRate}%)`,
      benchmark: "Assets over 3 years below 15%",
      gap: `${Math.max(assetRiskRate - 15, 0)}% above target`,
      priority: assetRiskRate > 20 ? "High" : "Medium",
    },
    {
      area: "License compliance",
      current: `${licenseSummary.expiring30 || 0} near-expiry licenses`,
      benchmark: "No critical renewals inside 30 days",
      gap: `${licenseSummary.expiring30 || 0} items to remediate`,
      priority: Number(licenseSummary.expiring30 || 0) > 0 ? "High" : "Low",
    },
  ];

  const actionPlan = gapAnalysis.map((item, index) => ({
    topic: item.dimension,
    readiness: item.current,
    target: item.target,
    owner:
      index === 0
        ? "Service Desk"
        : index === 1
          ? "IT Governance"
          : index === 2
            ? "Process Owner"
            : index === 3
              ? "Infrastructure"
              : "Software Asset Mgmt",
    nextStep:
      index === 0
        ? "Tighten triage and first response"
        : index === 1
          ? "Run weekly SLA governance review"
          : index === 2
            ? "Push portal-first request intake"
            : index === 3
              ? "Prioritize refresh by risk tier"
              : "Advance renewal planning window",
  }));

  const expectedImpact = [
    {
      label: "SLA breach reduction",
      current: overdueTickets,
      target: Math.max(Math.round(overdueTickets * 0.45), 0),
      unit: "tickets",
      delta: Math.max(overdueTickets - Math.round(overdueTickets * 0.45), 0),
    },
    {
      label: "Resolution time improvement",
      current: avgResolutionTimeMinutes,
      target: Math.max(Math.round(avgResolutionTimeMinutes * 0.8), 0),
      unit: "minutes",
      delta: Math.max(avgResolutionTimeMinutes - Math.round(avgResolutionTimeMinutes * 0.8), 0),
    },
    {
      label: "Asset risk reduction",
      current: Number(assetSummary.riskyAssets || 0),
      target: Math.max(Math.round(Number(assetSummary.riskyAssets || 0) * 0.6), 0),
      unit: "assets",
      delta: Math.max(Number(assetSummary.riskyAssets || 0) - Math.round(Number(assetSummary.riskyAssets || 0) * 0.6), 0),
    },
    {
      label: "License renewal readiness",
      current: Number(licenseSummary.expiring30 || 0),
      target: 0,
      unit: "licenses",
      delta: Number(licenseSummary.expiring30 || 0),
    },
  ];

  const executiveSummary = [
    {
      theme: "What to emulate / จุดแข็งที่ควรเลียนแบบ",
      emulate: strongestDimension
        ? `${strongestDimension.dimension} is the closest to best practice and should be formalized as an internal model.`
        : "Use the strongest current process as an internal reference model.",
      challenge: "The practice must be made repeatable across all teams, not only in isolated cases.",
      kpi: "Adoption rate, process compliance, cycle time stability",
    },
    {
      theme: "Operational visibility / การมองเห็นงาน",
      emulate: "One-page reporting with backlog, risk, and renewal signals visible to leadership.",
      challenge: "Data quality across tickets, assets, and licenses must stay current.",
      kpi: "Dashboard freshness, open backlog %, near-expiry count",
    },
    {
      theme: "Governance discipline / วินัยการกำกับดูแล",
      emulate: "Weekly review cadence and earlier escalation before SLA or renewal breaches occur.",
      challenge: weakestDimension
        ? `${weakestDimension.dimension} has the widest gap and will require sustained leadership attention.`
        : "Requires cross-functional follow-through.",
      kpi: "Overdue %, SLA hit rate, escalation lead time",
    },
    {
      theme: "Adoption challenge / ความท้าทายในการปรับใช้",
      emulate: "Digital-first behavior, standard intake, and lifecycle planning.",
      challenge: mode === "it_manager"
        ? "Frontline teams need tighter queue discipline and clearer ownership."
        : "Organization-wide change management and budgeting will be required.",
      kpi: "Walk-in ratio, refresh completion, renewal completion",
    },
  ];

  return {
    metrics: {
      backlogRate,
      overdueRate,
      assetRiskRate,
      licenseExpiryRate,
      licenseUsageRate,
      walkInRatio,
    },
    highlights,
    strategicComparison,
    actionPlan,
    expectedImpact,
    executiveSummary,
    gapAnalysis,
  };
}
