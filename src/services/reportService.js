import { supabase } from "../lib/supabaseClient";

const DEFAULT_SLA_HOURS = {
  urgent: 2,
  high: 4,
  normal: 8,
  low: 24,
};

const REPORT_TICKET_COLUMNS =
  "id,title,category,service_type,channel,priority,status,department,reporter_name,assigned_to,assigned_name,created_at,started_at,closed_at,updated_at";

function normalizeText(value) {
  return String(value || "").trim();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isClosedStatus(status) {
  const normalized = normalizeText(status).toUpperCase();
  return normalized === "CLOSED" || normalized === "COMPLETED" || normalized === "RESOLVED";
}

function slaHoursForPriority(priority) {
  return DEFAULT_SLA_HOURS[normalizeText(priority).toLowerCase()] || DEFAULT_SLA_HOURS.normal;
}

function getTicketStart(ticket) {
  return parseDate(ticket?.started_at || ticket?.created_at);
}

function getTicketResolutionMinutes(ticket) {
  const start = getTicketStart(ticket);
  const end = parseDate(ticket?.closed_at || ticket?.updated_at || ticket?.created_at);
  if (!start || !end || end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function getTicketAgeHours(ticket, now = new Date()) {
  const start = getTicketStart(ticket);
  if (!start) return 0;
  return Math.max(0, (now.getTime() - start.getTime()) / 36e5);
}

function isOverdue(ticket, now = new Date()) {
  if (isClosedStatus(ticket?.status)) return false;
  const start = getTicketStart(ticket);
  if (!start) return false;
  return now.getTime() > start.getTime() + slaHoursForPriority(ticket?.priority) * 36e5;
}

function groupCounts(items, keySelector) {
  const map = new Map();
  items.forEach((item) => {
    const key = normalizeText(keySelector(item)) || "ไม่ระบุ";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);
}

const CORE_MENU_CATEGORY_RULES = [
  {
    key: "pc",
    keywords: [
      "pc",
      "desktop",
      "computer",
      "workstation",
      "all in one",
      "aoi",
      "คอม",
      "คอมพิวเตอร์",
      "เดสก์ท็อป",
      "เดสกทอป",
      "พีซี",
    ],
  },
  {
    key: "notebook",
    keywords: [
      "notebook",
      "laptop",
      "macbook",
      "โน้ตบุ๊ก",
      "โน๊ตบุ๊ก",
      "โน้ตบุ๊ค",
      "โน๊ตบุ๊ค",
      "แล็ปท็อป",
      "แลปทอป",
    ],
  },
  {
    key: "monitor",
    keywords: [
      "monitor",
      "display",
      "screen",
      "จอ",
      "จอมอนิเตอร์",
      "มอนิเตอร์",
      "moniter",
      "monitors",
    ],
  },
  {
    key: "printer",
    keywords: [
      "printer",
      "print",
      "เครื่องพิมพ์",
      "พรินเตอร์",
      "ปริ้นเตอร์",
      "ปริ้น",
    ],
  },
];

const ASSET_BROKEN_STATUSES = new Set(["repair", "retired", "lost", "broken", "damaged"]);
const LICENSE_USABLE_STATUSES = new Set(["active", "pending_renewal"]);

function normalizeCategoryText(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStatusKey(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "_");
}

function normalizeAssetStatusKey(value) {
  const normalized = normalizeStatusKey(value);
  if (!normalized) return "";

  if (
    [
      "broken",
      "damage",
      "damaged",
      "defect",
      "faulty",
      "เสีย",
      "เสียหาย",
      "พัง",
      "ชำรุด",
      "ใช้งานไม่ได้",
      "ใช้ไม่ได้",
    ].includes(normalized)
  ) {
    return "broken";
  }
  if (["repair", "maintenance", "fixing", "ซ่อม", "กำลังซ่อม", "ส่งซ่อม"].includes(normalized)) {
    return "repair";
  }
  if (["retired", "decommissioned", "disposed", "ปลดระวาง", "ตัดจำหน่าย", "จำหน่าย"].includes(normalized)) {
    return "retired";
  }
  if (["lost", "missing", "สูญหาย", "หาย"].includes(normalized)) {
    return "lost";
  }
  if (["assigned", "มอบหมาย", "มอบหมายแล้ว"].includes(normalized)) {
    return "assigned";
  }
  if (["spare", "สำรอง"].includes(normalized)) {
    return "spare";
  }
  if (["available", "stock", "ready", "ว่าง", "พร้อมใช้", "พร้อมใช้งาน"].includes(normalized)) {
    return "available";
  }
  if (["active", "inuse", "in_use", "ใช้งาน", "ใช้งานอยู่", "ใช้งานได้"].includes(normalized)) {
    return "in_use";
  }

  return normalized;
}

function normalizePositiveInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(Math.round(parsed), 0);
}

function isAssetBrokenStatus(status) {
  return ASSET_BROKEN_STATUSES.has(normalizeAssetStatusKey(status));
}

function isLicenseUsableStatus(status) {
  const normalized = normalizeStatusKey(status);
  if (!normalized) return true;
  return LICENSE_USABLE_STATUSES.has(normalized);
}

function detectCoreMenuCategory(asset) {
  const source = normalizeCategoryText(
    `${asset?.asset_category || ""} ${asset?.category || ""} ${asset?.asset_name || ""} ${asset?.model || ""}`,
  );
  if (!source) return "";

  const matched = CORE_MENU_CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => source.includes(keyword)),
  );
  return matched?.key || "";
}

function buildCoreMenuSummary(assetRows, licenseRows) {
  const assets = Array.isArray(assetRows) ? assetRows : [];
  const licenses = Array.isArray(licenseRows) ? licenseRows : [];
  const stock = {
    pc: { total: 0, usable: 0, broken: 0 },
    notebook: { total: 0, usable: 0, broken: 0 },
    monitor: { total: 0, usable: 0, broken: 0 },
    printer: { total: 0, usable: 0, broken: 0 },
    licenses: { total: 0, usable: 0, broken: 0 },
    all: { total: 0, usable: 0, broken: 0 },
  };

  const summary = {
    pc: 0,
    notebook: 0,
    monitor: 0,
    printer: 0,
    licenses: 0,
    assetsTracked: assets.length,
    stock,
  };

  assets.forEach((asset) => {
    const category = detectCoreMenuCategory(asset);
    if (!category) return;
    summary[category] += 1;

    stock[category].total += 1;
    stock.all.total += 1;
    if (isAssetBrokenStatus(asset?.status)) {
      stock[category].broken += 1;
      stock.all.broken += 1;
    } else {
      stock[category].usable += 1;
      stock.all.usable += 1;
    }
  });

  licenses.forEach((license) => {
    const quantity = normalizePositiveInt(license?.quantity_total, 1);
    if (quantity <= 0) return;

    stock.licenses.total += quantity;
    stock.all.total += quantity;
    if (isLicenseUsableStatus(license?.status)) {
      stock.licenses.usable += quantity;
      stock.all.usable += quantity;
    } else {
      stock.licenses.broken += quantity;
      stock.all.broken += quantity;
    }
  });

  summary.licenses = stock.licenses.total;

  return summary;
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(date) {
  return date.toLocaleDateString("th-TH", {
    month: "short",
    year: "2-digit",
  });
}

function buildMonthlyTrend(tickets, months = 12) {
  const now = new Date();
  const series = Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    return {
      key: formatMonthKey(date),
      label: formatMonthLabel(date),
      value: 0,
      closed: 0,
    };
  });

  const bucketMap = new Map(series.map((item) => [item.key, item]));
  tickets.forEach((ticket) => {
    const created = parseDate(ticket?.created_at);
    if (!created) return;
    const key = formatMonthKey(created);
    const target = bucketMap.get(key);
    if (target) {
      target.value += 1;
    }
    const closed = parseDate(ticket?.closed_at);
    if (closed) {
      const closedKey = formatMonthKey(closed);
      const closedTarget = bucketMap.get(closedKey);
      if (closedTarget) {
        closedTarget.closed += 1;
      }
    }
  });

  return series;
}

function buildExecutiveKpiFallback(tickets) {
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((ticket) => !isClosedStatus(ticket.status)).length;
  const overdueTickets = tickets.filter((ticket) => isOverdue(ticket)).length;
  const resolvedTickets = tickets.filter((ticket) => isClosedStatus(ticket.status));
  const avgResolutionMinutes = resolvedTickets.length
    ? Math.round(
        resolvedTickets.reduce((sum, ticket) => sum + getTicketResolutionMinutes(ticket), 0) /
          resolvedTickets.length,
      )
    : 0;

  return {
    total_tickets: totalTickets,
    open_tickets: openTickets,
    overdue_tickets: overdueTickets,
    avg_resolution_time_minutes: avgResolutionMinutes,
  };
}

function buildAssetSummary(rows) {
  const assets = Array.isArray(rows) ? rows : [];
  const now = new Date();
  const riskyCutoff = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());

  const totalAssets = assets.length;
  const activeAssets = assets.filter((item) => {
    const status = normalizeAssetStatusKey(item?.status);
    return ["in_use", "assigned"].includes(status);
  }).length;
  const riskyAssets = assets.filter((item) => {
    const purchaseDate = parseDate(item?.purchase_date);
    return purchaseDate && purchaseDate <= riskyCutoff;
  }).length;
  const spareAssets = assets.filter((item) => {
    const status = normalizeAssetStatusKey(item?.status);
    return ["spare", "available"].includes(status);
  }).length;

  const byCategory = groupCounts(assets, (item) => item?.asset_category || item?.category || "อื่นๆ");
  const byStatus = groupCounts(assets, (item) => item?.status || "unknown");

  return {
    totalAssets,
    activeAssets,
    spareAssets,
    riskyAssets,
    byCategory: byCategory.slice(0, 6),
    byStatus: byStatus.slice(0, 6),
  };
}

function buildLicenseSummary(rows) {
  const licenses = Array.isArray(rows) ? rows : [];
  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);
  const in90Days = new Date(now);
  in90Days.setDate(in90Days.getDate() + 90);

  const totalSeats = licenses.reduce((sum, item) => sum + (Number(item?.quantity_total) || 0), 0);
  const usedSeats = licenses.reduce((sum, item) => sum + (Number(item?.quantity_assigned) || 0), 0);
  const availableSeats = Math.max(totalSeats - usedSeats, 0);

  const expiring30 = licenses.filter((item) => {
    const expiry = parseDate(item?.expiry_date);
    return expiry && expiry <= in30Days;
  }).length;
  const expiring90 = licenses.filter((item) => {
    const expiry = parseDate(item?.expiry_date);
    return expiry && expiry <= in90Days;
  }).length;

  const byStatus = groupCounts(licenses, (item) => item?.status || "unknown");

  return {
    totalLicenses: licenses.length,
    totalSeats,
    usedSeats,
    availableSeats,
    expiring30,
    expiring90,
    byStatus: byStatus.slice(0, 6),
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

function percentage(value, total) {
  if (!total) return 0;
  return Math.round((Number(value || 0) / Math.max(Number(total || 0), 1)) * 100);
}

function buildBenchmarkInsights({
  kpi,
  assetSummary,
  licenseSummary,
  topIssues,
  topDepartments,
  walkInRatio = 0,
  mode = "executive",
}) {
  const totalTickets = Number(kpi?.totalTickets || 0);
  const openTickets = Number(kpi?.openTickets || 0);
  const overdueTickets = Number(kpi?.overdueTickets || 0);
  const avgResolutionMinutes = Number(kpi?.avgResolutionTimeMinutes || 0);
  const backlogRate = percentage(openTickets, totalTickets);
  const overdueRate = percentage(overdueTickets, totalTickets);
  const assetRiskRate = percentage(assetSummary?.riskyAssets || 0, assetSummary?.totalAssets || 0);
  const licenseExpiryRate = percentage(licenseSummary?.expiring30 || 0, licenseSummary?.totalLicenses || 0);
  const licenseUsageRate = percentage(licenseSummary?.usedSeats || 0, licenseSummary?.totalSeats || 0);

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

  const biggestGap = [...gapAnalysis].sort((left, right) => right.gap - left.gap)[0];
  const primaryIssue = topIssues?.[0];
  const primaryDepartment = topDepartments?.[0];

  const highlights = [
    {
      title: "Service exposure / ความเสี่ยงงานบริการ",
      detail: `${overdueTickets} overdue tickets (${overdueRate}%) still sit outside best-practice response tolerance.`,
      emphasis: overdueRate > 15 ? "High" : overdueRate > 7 ? "Medium" : "Controlled",
      tone: overdueRate > 15 ? "rose" : overdueRate > 7 ? "amber" : "emerald",
    },
    {
      title: "Process discipline / วินัยกระบวนการ",
      detail: `${walkInRatio}% of work arrives as walk-in or manual flow, which is above international digital service desk norms.`,
      emphasis: walkInRatio > 25 ? "Shadow work risk" : "Moderate risk",
      tone: walkInRatio > 25 ? "amber" : "indigo",
    },
    {
      title: "Asset lifecycle / วงจรอุปกรณ์",
      detail: `${assetSummary?.riskyAssets || 0} assets are older than 3 years, indicating refresh pressure in the installed base.`,
      emphasis: assetRiskRate > 25 ? "Refresh needed" : "Manageable",
      tone: assetRiskRate > 25 ? "rose" : "emerald",
    },
    {
      title: "License governance / การควบคุม license",
      detail: `${licenseSummary?.expiring30 || 0} licenses expire within 30 days and ${licenseUsageRate}% of capacity is already used.`,
      emphasis: licenseExpiryRate > 10 ? "Renewal watch" : "Stable",
      tone: licenseExpiryRate > 10 ? "amber" : "indigo",
    },
    {
      title: "Demand concentration / การกระจุกตัวของงาน",
      detail: primaryDepartment
        ? `${primaryDepartment.label} is the highest-demand department, while ${primaryIssue?.label || "service issues"} remains the dominant issue type.`
        : "Demand is distributed without a single dominant department in the available data.",
      emphasis: primaryDepartment ? "Focus area" : "Distributed demand",
      tone: "indigo",
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
      benchmark: "Overdue below 5% with weekly executive review",
      gap: `${Math.max(overdueRate - 5, 0)}% above target`,
      priority: overdueRate > 10 ? "High" : "Medium",
    },
    {
      area: "Asset lifecycle",
      current: `${assetSummary?.riskyAssets || 0} aging assets (${assetRiskRate}%)`,
      benchmark: "Assets over 3 years below 15%",
      gap: `${Math.max(assetRiskRate - 15, 0)}% above target`,
      priority: assetRiskRate > 20 ? "High" : "Medium",
    },
    {
      area: "License compliance",
      current: `${licenseSummary?.expiring30 || 0} near-expiry licenses`,
      benchmark: "No unplanned renewals inside 30 days",
      gap: `${licenseSummary?.expiring30 || 0} items to remediate`,
      priority: (licenseSummary?.expiring30 || 0) > 0 ? "High" : "Low",
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
          ? "Weekly SLA review cadence"
          : index === 2
            ? "Reduce manual / walk-in intake"
            : index === 3
              ? "Refresh aging devices"
              : "Renew critical licenses earlier",
  }));

  const expectedImpact = [
    {
      label: "SLA breach reduction",
      current: overdueTickets,
      target: Math.max(Math.round(overdueTickets * 0.45), 0),
      unit: "tickets",
      impact: overdueTickets > 0 ? `-${Math.max(overdueTickets - Math.round(overdueTickets * 0.45), 0)} tickets` : "Stable",
    },
    {
      label: "Resolution time improvement",
      current: avgResolutionMinutes,
      target: Math.max(Math.round(avgResolutionMinutes * 0.8), 0),
      unit: "minutes",
      impact: avgResolutionMinutes > 0 ? `-${Math.max(avgResolutionMinutes - Math.round(avgResolutionMinutes * 0.8), 0)} min` : "Stable",
    },
    {
      label: "Asset risk reduction",
      current: Number(assetSummary?.riskyAssets || 0),
      target: Math.max(Math.round(Number(assetSummary?.riskyAssets || 0) * 0.6), 0),
      unit: "assets",
      impact: `${Math.max(Number(assetSummary?.riskyAssets || 0) - Math.round(Number(assetSummary?.riskyAssets || 0) * 0.6), 0)} assets refreshed`,
    },
    {
      label: "License renewal readiness",
      current: Number(licenseSummary?.expiring30 || 0),
      target: 0,
      unit: "licenses",
      impact: `${Number(licenseSummary?.expiring30 || 0)} renewals shifted earlier`,
    },
  ];

  const executiveSummary = [
    {
      theme: "What to emulate / จุดแข็งที่ควรเลียนแบบ",
      emulate: "Digital-first intake, weekly SLA review, and lifecycle discipline across assets and licenses.",
      challenge: "Requires tighter operating cadence and less ad-hoc work intake.",
      kpi: "Walk-in ratio, overdue rate, SLA hit rate",
    },
    {
      theme: "Operational visibility / การมองเห็นงาน",
      emulate: "One-page reporting with backlog, risk, and renewal signals visible to management.",
      challenge: "Data quality must remain current across tickets, assets, and licenses.",
      kpi: "Dashboard freshness, open backlog %, near-expiry count",
    },
    {
      theme: "Asset refresh governance / การกำกับดูแลอุปกรณ์",
      emulate: "Planned refresh before aging devices degrade service quality.",
      challenge: "Needs budget alignment and asset ownership clarity.",
      kpi: "Assets >3 years, incident per aging asset, refresh completion",
    },
    {
      theme: "Service standardization / มาตรฐานกระบวนการ",
      emulate: biggestGap
        ? `${biggestGap.dimension} should be the first benchmark workstream.`
        : "Formalize standard work and escalation controls.",
      challenge: "Behavior change across departments and support teams.",
      kpi: "First response SLA, manual intake ratio, closure cycle time",
    },
  ];

  return {
    mode,
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

function buildItManagerMetrics(tickets) {
  const now = new Date();
  const queueTickets = tickets.filter((ticket) => !isClosedStatus(ticket.status));
  const newTickets = queueTickets.filter((ticket) => normalizeText(ticket.status).toUpperCase() === "NEW").length;
  const inProgressTickets = queueTickets.filter(
    (ticket) => normalizeText(ticket.status).toUpperCase() === "IN_PROGRESS",
  ).length;
  const overdueTickets = queueTickets.filter((ticket) => isOverdue(ticket, now)).length;
  const walkInTickets = tickets.filter(
    (ticket) => normalizeText(ticket.channel || ticket.service_type).toLowerCase() === "walk-in",
  ).length;

  const workloadMap = new Map();
  queueTickets.forEach((ticket) => {
    const name = normalizeText(ticket?.assigned_name) || "Unassigned";
    const current = workloadMap.get(name) || { label: name, total: 0, overdue: 0 };
    current.total += 1;
    if (isOverdue(ticket, now)) {
      current.overdue += 1;
    }
    workloadMap.set(name, current);
  });

  const workload = [...workloadMap.values()]
    .sort((left, right) => right.total - left.total)
    .slice(0, 8);

  const agingBuckets = [
    { label: "0-4h", min: 0, max: 4, count: 0 },
    { label: "4-24h", min: 4, max: 24, count: 0 },
    { label: ">24h", min: 24, max: Infinity, count: 0 },
  ];

  queueTickets.forEach((ticket) => {
    const age = getTicketAgeHours(ticket, now);
    const target = agingBuckets.find((bucket) => age >= bucket.min && age < bucket.max);
    if (target) target.count += 1;
  });

  const slaSummary = {
    breach: overdueTickets,
    warning: queueTickets.filter((ticket) => {
      if (isOverdue(ticket, now)) return false;
      const start = getTicketStart(ticket);
      if (!start) return false;
      const remainingHours = slaHoursForPriority(ticket?.priority) - getTicketAgeHours(ticket, now);
      return remainingHours > 0 && remainingHours <= 2;
    }).length,
    onTrack: queueTickets.filter((ticket) => {
      if (isOverdue(ticket, now)) return false;
      const start = getTicketStart(ticket);
      if (!start) return false;
      return slaHoursForPriority(ticket?.priority) - getTicketAgeHours(ticket, now) > 2;
    }).length,
  };

  return {
    queue: {
      newTickets,
      inProgressTickets,
      overdueTickets,
      total: queueTickets.length,
    },
    workload,
    agingBuckets,
    slaSummary,
    walkInRatio: tickets.length > 0 ? Math.round((walkInTickets / tickets.length) * 100) : 0,
    walkInCount: walkInTickets,
    totalTickets: tickets.length,
  };
}

function buildAccessRequestSummary(rows) {
  const requests = Array.isArray(rows) ? rows : [];
  const summary = requests.reduce(
    (accumulator, item) => {
      const status = normalizeText(item?.status);
      if (status === "Pending Approval") accumulator.pending += 1;
      if (status === "Approved") accumulator.approved += 1;
      if (status === "Rejected") accumulator.rejected += 1;
      if (status === "Completed") accumulator.completed += 1;
      return accumulator;
    },
    { pending: 0, approved: 0, rejected: 0, completed: 0 },
  );

  return {
    ...summary,
    total: summary.pending + summary.approved + summary.rejected + summary.completed,
  };
}

async function safeSingle(query) {
  const { data, error } = await query;
  if (error) return { data: null, error };
  return { data, error: null };
}

async function fetchExecutiveAssets() {
  const assetsWithEvidence = await supabase
    .from("it_assets")
    .select("*, it_asset_attachments(id, file_name, file_url, created_at)")
    .order("updated_at", { ascending: false });

  if (!assetsWithEvidence.error) return assetsWithEvidence;

  const errorText = `${assetsWithEvidence.error?.code || ""} ${assetsWithEvidence.error?.message || ""}`.toLowerCase();
  const evidenceSchemaUnavailable =
    errorText.includes("it_asset_attachments") ||
    errorText.includes("could not find a relationship") ||
    errorText.includes("pgrst200");

  if (!evidenceSchemaUnavailable) return assetsWithEvidence;

  return supabase.from("it_assets").select("*").order("updated_at", { ascending: false });
}

export async function fetchReportTickets({ months = 12 } = {}) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  const { data, error } = await supabase
    .from("tickets")
    .select(REPORT_TICKET_COLUMNS)
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchExecutiveReportData() {
  const [kpiResult, tickets, assetsResult, licensesResult] = await Promise.all([
    safeSingle(supabase.from("executive_kpi").select("*").maybeSingle()),
    fetchReportTickets({ months: 12 }),
    fetchExecutiveAssets(),
    supabase.from("it_licenses").select("*").order("updated_at", { ascending: false }),
  ]);

  const assets = assetsResult.data || [];
  const licenses = licensesResult.data || [];

  const kpi =
    kpiResult?.data || buildExecutiveKpiFallback(tickets);

  return {
    kpi: {
      totalTickets: Number(kpi.total_tickets || 0),
      openTickets: Number(kpi.open_tickets || 0),
      overdueTickets: Number(kpi.overdue_tickets || 0),
      avgResolutionTimeMinutes: Number(kpi.avg_resolution_time_minutes || 0),
    },
    trend: buildMonthlyTrend(tickets, 12),
    topIssues: groupCounts(tickets, (ticket) => ticket?.category || ticket?.service_type || ticket?.title).slice(0, 6),
    topDepartments: groupCounts(tickets, (ticket) => ticket?.department || "ไม่ระบุ").slice(0, 6),
    assetSummary: buildAssetSummary(assets),
    licenseSummary: buildLicenseSummary(licenses),
    coreMenuSummary: buildCoreMenuSummary(assets, licenses),
    assetRows: assets,
    licenseRows: licenses,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchExecutiveAssetOverviewData() {
  const [tickets, assetsResult, licensesResult, accessRequestsResult] = await Promise.all([
    fetchReportTickets({ months: 12 }),
    supabase.from("it_assets").select("*").order("updated_at", { ascending: false }),
    supabase.from("it_licenses").select("*").order("updated_at", { ascending: false }),
    supabase
      .from("access_requests")
      .select("id, requester_name, department, system_name, status, urgency, created_at, processed_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  const assets = assetsResult.data || [];
  const licenses = licensesResult.data || [];
  const accessRequests = accessRequestsResult.data || [];
  const kpi = buildExecutiveKpiFallback(tickets);
  const ticketStatusBreakdown = groupCounts(tickets, (ticket) => ticket?.status || "UNKNOWN").slice(0, 6);
  const serviceMix = groupCounts(tickets, (ticket) => ticket?.service_type || ticket?.category || ticket?.title).slice(0, 8);

  return {
    kpi: {
      totalTickets: Number(kpi.total_tickets || 0),
      openTickets: Number(kpi.open_tickets || 0),
      overdueTickets: Number(kpi.overdue_tickets || 0),
      avgResolutionTimeMinutes: Number(kpi.avg_resolution_time_minutes || 0),
    },
    trend: buildMonthlyTrend(tickets, 12),
    topIssues: serviceMix,
    topDepartments: groupCounts(tickets, (ticket) => ticket?.department || "ไม่ระบุ").slice(0, 6),
    assetSummary: buildAssetSummary(assets),
    licenseSummary: buildLicenseSummary(licenses),
    coreMenuSummary: buildCoreMenuSummary(assets, licenses),
    assetRows: assets,
    licenseRows: licenses,
    accessRequestSummary: buildAccessRequestSummary(accessRequests),
    accessRequestRows: accessRequests,
    ticketRows: tickets,
    ticketStatusBreakdown,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchITManagerReportData() {
  const [tickets, assetsResult, licensesResult] = await Promise.all([
    fetchReportTickets({ months: 12 }),
    supabase.from("it_assets").select("*").order("created_at", { ascending: false }),
    supabase.from("it_licenses").select("*").order("created_at", { ascending: false }),
  ]);

  const managerMetrics = buildItManagerMetrics(tickets);

  return {
    ...managerMetrics,
    tickets,
    assetSummary: buildAssetSummary(assetsResult.data || []),
    licenseSummary: buildLicenseSummary(licensesResult.data || []),
    trend: buildMonthlyTrend(tickets, 6),
    topDepartments: groupCounts(tickets, (ticket) => ticket?.department || "ไม่ระบุ").slice(0, 6),
    generatedAt: new Date().toISOString(),
  };
}

export function formatMinutes(minutes = 0) {
  const total = Number(minutes) || 0;
  if (total <= 0) return "-";
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours <= 0) return `${mins} นาที`;
  return `${hours} ชม. ${mins} นาที`;
}
