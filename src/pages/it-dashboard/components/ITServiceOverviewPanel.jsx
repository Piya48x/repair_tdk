import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Package,
  Plus,
  Ticket,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { stripTicketStatusDetailFromParts } from "../../../lib/ticketRepairStatus";

const PERIOD_OPTIONS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "today", label: "วันนี้", days: 1 },
  { id: "7d", label: "7 วัน", days: 7 },
  { id: "30d", label: "30 วัน", days: 30 },
];

const SLA_HOURS = {
  critical: 2,
  urgent: 2,
  high: 4,
  normal: 8,
  low: 24,
};

const HARDWARE_KEYWORDS = [
  "hardware",
  "device",
  "equipment",
  "laptop",
  "desktop",
  "monitor",
  "printer",
  "mouse",
  "keyboard",
  "router",
  "ram",
  "ssd",
  "hdd",
  "battery",
  "ฮาร์ดแวร์",
  "อุปกรณ์",
  "เมาส์",
  "คีย์บอร์ด",
  "จอ",
  "เครื่องพิมพ์",
];

const SOFTWARE_KEYWORDS = [
  "software",
  "license",
  "windows",
  "os",
  "application",
  "app",
  "vpn",
  "domain",
  "email",
  "wifi",
  "program",
  "ซอฟต์แวร์",
  "โปรแกรม",
  "ไลเซนส์",
  "ระบบ",
];

const COST_HINTS = {
  laptop: 25000,
  notebook: 25000,
  monitor: 5500,
  printer: 6800,
  mouse: 400,
  keyboard: 750,
  router: 3200,
  ram: 1800,
  ssd: 2500,
  hdd: 2200,
  battery: 1500,
  software: 3800,
  windows: 5200,
  license: 4500,
  vpn: 1500,
  ฮาร์ดแวร์: 2500,
  อุปกรณ์: 2000,
  ซอฟต์แวร์: 3000,
  โปรแกรม: 3000,
  ไลเซนส์: 4500,
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const formatDateKey = (value) => {
  const date = toDate(value);
  if (!date) return "";
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatCount = (value) => value.toLocaleString("th-TH");

const formatCurrency = (value) =>
  value.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  });

const isClosedStatus = (status = "") => {
  const normalized = status.toUpperCase();
  return normalized === "CLOSED" || normalized === "COMPLETED" || normalized === "RESOLVED";
};

const classifyTicketType = (ticket) => {
  const source = `${ticket?.service_type || ""} ${ticket?.title || ""} ${ticket?.category || ""}`.toLowerCase();
  if (source.includes("repair") || source.includes("ซ่อม")) return "repair";
  if (
    source.includes("req_") ||
    source.includes("เบิก") ||
    source.includes("install") ||
    source.includes("license") ||
    source.includes("purchase")
  ) {
    return "asset";
  }
  return "repair";
};

const parseParts = (parts) =>
  stripTicketStatusDetailFromParts(parts || "")
    .split(/[,;|/\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const extractAssetItems = (ticket) => {
  const fromParts = parseParts(ticket?.parts_used);
  if (fromParts.length > 0) return fromParts;

  if (ticket?.title) return [ticket.title];
  if (ticket?.category) return [ticket.category];
  return ["ไม่ระบุ"];
};

const detectAssetGroup = (label = "") => {
  const text = label.toLowerCase();
  if (HARDWARE_KEYWORDS.some((item) => text.includes(item))) return "hardware";
  if (SOFTWARE_KEYWORDS.some((item) => text.includes(item))) return "software";
  return "other";
};

const estimateTicketValue = (ticket) => {
  const pool = `${stripTicketStatusDetailFromParts(ticket?.parts_used || "")} ${ticket?.title || ""} ${ticket?.category || ""}`;
  const lower = pool.toLowerCase();
  let best = 0;

  Object.entries(COST_HINTS).forEach(([key, value]) => {
    if (lower.includes(key.toLowerCase())) {
      best = Math.max(best, value);
    }
  });

  if (best > 0) return best;
  return classifyTicketType(ticket) === "asset" ? 1800 : 0;
};

const minutesBetween = (startValue, endValue) => {
  const start = toDate(startValue);
  const end = toDate(endValue);
  if (!start || !end || end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / 60000);
};

const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return "-";
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  if (hour <= 0) return `${minute} นาที`;
  return `${hour} ชม. ${minute} นาที`;
};

const getSlaHours = (priority = "normal") => {
  const key = String(priority || "normal").toLowerCase();
  return SLA_HOURS[key] || SLA_HOURS.normal;
};

const MetricCard = ({ title, value, subtitle, icon: Icon, iconWrapClass, valueClass, onClick }) => (
  <article
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={(event) => {
      if (!onClick) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    }}
    className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md" : ""
      }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className={`rounded-xl p-3 ${iconWrapClass}`}>
        <Icon size={20} />
      </div>
    </div>
  </article>
);

const CompactMetricCard = ({ title, value, subtitle, toneClass = "text-slate-900" }) => (
  <article className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
    <p className={`mt-2 text-2xl font-black ${toneClass}`}>{value}</p>
    <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
  </article>
);

const StatusBadge = ({ status }) => {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "NEW") {
    return <span className="inline-flex rounded-full border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-2.5 py-1 text-xs font-semibold text-[#2b59b0]">ตั๋วใหม่</span>;
  }

  if (normalized === "IN_PROGRESS") {
    return <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">กำลังดำเนินการ</span>;
  }

  if (isClosedStatus(normalized)) {
    return <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">ปิดงานแล้ว</span>;
  }

  return <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">รอดำเนินการ</span>;
};

const ITServiceOverviewPanel = ({
  tickets,
  serviceRequests = [],
  onCreateTicket,
  onOpenWalkInTicket,
  onPickUpEquipment,
  onOpenRepair,
}) => {
  const [period, setPeriod] = useState("all");
  const [department, setDepartment] = useState("ALL");

  const allTickets = useMemo(
    () => [...(tickets || []), ...(serviceRequests || [])],
    [serviceRequests, tickets],
  );

  const departments = useMemo(() => {
    const uniq = [
      ...new Set(
        allTickets
          .map((item) => item.department || item.reporter_dept)
          .filter(Boolean),
      ),
    ];
    return uniq.sort((a, b) => a.localeCompare(b, "th"));
  }, [allTickets]);

  const periodStart = useMemo(() => {
    const selected = PERIOD_OPTIONS.find((item) => item.id === period);
    if (!selected?.days) return null;

    const start = new Date();
    if (selected.days === 1) return startOfDay(start);
    start.setDate(start.getDate() - (selected.days - 1));
    return startOfDay(start);
  }, [period]);

  const filterByScope = useMemo(
    () => (rows = []) =>
      rows.filter((item) => {
        const departmentValue = item.department || item.reporter_dept || "";
        if (department !== "ALL" && departmentValue !== department) return false;
        if (!periodStart) return true;
        const created = toDate(item.created_at);
        return created && created >= periodStart;
      }),
    [department, periodStart],
  );

  const repairTickets = useMemo(() => filterByScope(tickets || []), [filterByScope, tickets]);
  const assetTickets = useMemo(() => {
    const fallbackRequests = (tickets || []).filter((item) => classifyTicketType(item) === "asset");
    const source = (serviceRequests || []).length > 0 ? serviceRequests : fallbackRequests;
    return filterByScope(source);
  }, [filterByScope, serviceRequests, tickets]);
  const departmentTickets = useMemo(
    () => [...repairTickets, ...assetTickets],
    [assetTickets, repairTickets],
  );

  const todayKey = formatDateKey(new Date());

  const kpiNew = repairTickets.filter((item) => String(item.status || "").toUpperCase() === "NEW").length;
  const kpiInProgress = repairTickets.filter((item) => String(item.status || "").toUpperCase() === "IN_PROGRESS").length;

  const kpiOverdue = repairTickets.filter((item) => {
    if (isClosedStatus(item.status)) return false;
    const created = toDate(item.created_at);
    if (!created) return false;
    const diffHours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
    return diffHours > getSlaHours(item.priority);
  }).length;

  const kpiClosedToday = departmentTickets.filter((item) => {
    if (!isClosedStatus(item.status)) return false;
    return formatDateKey(item.closed_at) === todayKey;
  }).length;

  const mttrMinutes = useMemo(() => {
    const closedRepair = repairTickets.filter((item) => isClosedStatus(item.status));
    const durations = closedRepair
      .map((item) => minutesBetween(item.started_at || item.created_at, item.closed_at))
      .filter((value) => value > 0);

    if (durations.length === 0) return 0;
    return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
  }, [repairTickets]);

  const knownSerials = useMemo(
    () => new Set(departmentTickets.map((item) => item.laptop_serial_number).filter(Boolean)),
    [departmentTickets],
  );

  const activeBorrowSerials = useMemo(() => {
    const today = startOfDay(new Date());

    return new Set(
      departmentTickets
        .filter((item) => {
          if (!item.laptop_serial_number) return false;
          if (isClosedStatus(item.status)) return false;
          const endDate = toDate(item.borrow_end_date);
          return endDate && endDate >= today;
        })
        .map((item) => item.laptop_serial_number),
    );
  }, [departmentTickets]);

  const kpiAvailableAssets =
    knownSerials.size > 0
      ? Math.max(knownSerials.size - activeBorrowSerials.size, 0)
      : assetTickets.filter((item) => isClosedStatus(item.status)).length;

  const topAssetData = useMemo(() => {
    const map = new Map();

    assetTickets.forEach((ticket) => {
      extractAssetItems(ticket).forEach((name) => {
        const key = name.trim();
        if (!key) return;
        map.set(key, (map.get(key) || 0) + 1);
      });
    });

    return [...map.entries()]
      .map(([name, count]) => ({
        name,
        count,
        group: detectAssetGroup(name),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [assetTickets]);

  const lowStockThreshold = period === "today" ? 1 : 3;
  const kpiLowStock = topAssetData.filter((item) => item.count >= lowStockThreshold).length;

  const kpiIssuedValue = useMemo(() => {
    return assetTickets
      .filter((item) => isClosedStatus(item.status))
      .reduce((sum, ticket) => sum + estimateTicketValue(ticket), 0);
  }, [assetTickets]);

  const serviceTrend = useMemo(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }, (_, idx) => {
      const day = new Date(today);
      day.setDate(day.getDate() - (6 - idx));
      return day;
    });

    return days.map((day) => {
      const key = formatDateKey(day);
      const reported = departmentTickets.filter(
        (item) => classifyTicketType(item) === "repair" && formatDateKey(item.created_at) === key,
      ).length;
      const completed = departmentTickets.filter(
        (item) => classifyTicketType(item) === "repair" && formatDateKey(item.closed_at) === key,
      ).length;

      return {
        label: day.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
        reported,
        completed,
      };
    });
  }, [departmentTickets]);

  const recentActivities = useMemo(() => {
    return [...departmentTickets]
      .sort((a, b) => {
        const left = toDate(b.updated_at || b.closed_at || b.created_at)?.getTime() || 0;
        const right = toDate(a.updated_at || a.closed_at || a.created_at)?.getTime() || 0;
        return left - right;
      })
      .slice(0, 10)
      .map((item) => {
        const type = classifyTicketType(item) === "asset" ? "เบิก" : "ซ่อม";
        const duration = minutesBetween(
          item.started_at || item.created_at,
          isClosedStatus(item.status) ? item.closed_at : new Date().toISOString(),
        );

        return {
          id: item.id,
          reporter: item.reporter_name || "ไม่ระบุ",
          department: item.department || "-",
          type,
          subject: item.title || item.category || "ไม่ระบุ",
          status: item.status,
          duration: formatDuration(duration),
        };
      });
  }, [departmentTickets]);
  const periodLabel = PERIOD_OPTIONS.find((option) => option.id === period)?.label || PERIOD_OPTIONS[0].label;
  const compactRecentActivities = recentActivities.slice(0, 6);
  const primaryMetrics = [
    {
      title: "ตั๋วใหม่",
      value: formatCount(kpiNew),
      subtitle: "งานรับแจ้งใหม่",
      icon: Ticket,
      iconWrapClass: "bg-[#2b59b0]/10 text-[#2b59b0]",
      valueClass: "text-slate-900",
      onClick: () => onOpenRepair?.({ tab: "INCOMING", searchQuery: "", quickFilter: "ALL", sortBy: "latest" }),
    },
    {
      title: "กำลังดำเนินการ",
      value: formatCount(kpiInProgress),
      subtitle: "งานที่กำลังซ่อม",
      icon: Wrench,
      iconWrapClass: "bg-amber-50 text-amber-700",
      valueClass: "text-amber-600",
      onClick: () => onOpenRepair?.({ tab: "ACTIVE", searchQuery: "", quickFilter: "MINE", sortBy: "latest" }),
    },
    {
      title: "เกินกำหนด SLA",
      value: formatCount(kpiOverdue),
      subtitle: "ต้องเร่งจัดการ",
      icon: AlertTriangle,
      iconWrapClass: "bg-red-50 text-red-700",
      valueClass: "text-red-600",
      onClick: () => onOpenRepair?.({ tab: "INCOMING", searchQuery: "", quickFilter: "URGENT", sortBy: "priority" }),
    },
    {
      title: "ปิดงานแล้ววันนี้",
      value: formatCount(kpiClosedToday),
      subtitle: "งานปิดวันนี้",
      icon: CheckCircle2,
      iconWrapClass: "bg-emerald-50 text-emerald-700",
      valueClass: "text-emerald-600",
      onClick: () => onOpenRepair?.({ tab: "HISTORY", searchQuery: "", quickFilter: "ALL", sortBy: "updated" }),
    },
  ];
  const secondaryMetrics = [
    {
      title: "อุปกรณ์พร้อมใช้",
      value: formatCount(kpiAvailableAssets),
      subtitle: "พร้อมจ่ายใช้งาน",
      toneClass: "text-[#2b59b0]",
    },
    {
      title: "สินค้าใกล้หมด",
      value: formatCount(kpiLowStock),
      subtitle: "ควรเช็ก stock",
      toneClass: "text-orange-600",
    },
    {
      title: "มูลค่าเบิกออก",
      value: formatCurrency(kpiIssuedValue),
      subtitle: "อ้างอิงงานปิดแล้ว",
      toneClass: "text-indigo-700",
    },
    {
      title: "MTTR",
      value: formatDuration(mttrMinutes),
      subtitle: "เวลาเฉลี่ยปิดงาน",
      toneClass: "text-slate-800",
    },
  ];

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm lg:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Operational Overview</h3>
          <p className="text-sm text-slate-600">สรุปงานที่ต้องเห็นก่อนแบบกระชับ ทั้งงานซ่อม คำขอ และทรัพย์สิน</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setPeriod(option.id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${period === option.id
                  ? "bg-[#2b59b0] text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
            >
              {option.label}
            </button>
          ))}

          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="min-w-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">ทุกแผนก</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          ช่วงเวลา: {periodLabel}
        </span>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          แผนก: {department === "ALL" ? "ทุกแผนก" : department}
        </span>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          รวม {formatCount(departmentTickets.length)} งาน
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {primaryMetrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {secondaryMetrics.map((metric) => (
          <CompactMetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">Service Trend (7 วัน)</h4>
          <p className="mb-2 text-xs text-slate-500">แนวโน้มรับแจ้งซ่อมเทียบปิดงาน</p>
          <div className="h-[240px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <LineChart data={serviceTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1" }}
                  formatter={(value, name) => [value, name === "reported" ? "รับแจ้งซ่อม" : "ปิดงาน"]}
                />
                <Legend formatter={(value) => (value === "reported" ? "รับแจ้งซ่อม" : "ปิดงาน")} />
                <Line type="monotone" dataKey="reported" stroke="#2b59b0" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="completed" stroke="#16a34a" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">Asset Distribution (Top 5)</h4>
          <p className="mb-2 text-xs text-slate-500">ความต้องการใช้งานอุปกรณ์/ซอฟต์แวร์</p>
          <div className="h-[240px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <BarChart data={topAssetData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1" }}
                  formatter={(value) => [`${value} รายการ`, "จำนวน"]}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {topAssetData.map((entry, index) => {
                    const color = entry.group === "hardware" ? "#2b59b0" : entry.group === "software" ? "#7c3aed" : "#64748b";
                    return <Cell key={`asset-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[#2b59b0]/10 px-2.5 py-1 text-[#2b59b0]">Hardware</span>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">Software</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Other</span>
          </div>
        </article>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">Latest Queue</h4>
          <p className="mb-3 text-xs text-slate-500">รายการล่าสุดที่ควรหยิบดูต่อ</p>

          <div className="space-y-3">
            {compactRecentActivities.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left transition hover:border-[#2b59b0]/25 hover:bg-white"
                onClick={() =>
                  onOpenRepair?.({
                    tab: isClosedStatus(item.status) ? "HISTORY" : "INCOMING",
                    searchQuery: String(item.id),
                    quickFilter: "ALL",
                    sortBy: "latest",
                  })
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.reporter}</p>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.type === "ซ่อม" ? "bg-[#2b59b0]/10 text-[#2b59b0]" : "bg-violet-50 text-violet-700"}`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-700">{item.subject}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.department} • {item.duration}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={item.status} />
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2b59b0]">
                      เปิดงาน
                      <ExternalLink size={12} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {compactRecentActivities.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
              ไม่พบข้อมูลกิจกรรมในเงื่อนไขที่เลือก
            </div>
          )}
        </article>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-900">Actions</h4>
            <p className="mt-1 text-xs text-slate-500">ทางลัดสำหรับงานที่ใช้บ่อย</p>

            <div className="mt-3 space-y-2">
              <button
                onClick={onCreateTicket}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2b59b0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244a95]"
              >
                <Plus size={16} />
                เปิดตั๋วแจ้งซ่อมใหม่
              </button>

              <button
                onClick={onOpenWalkInTicket}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-4 py-2.5 text-sm font-semibold text-[#2b59b0] transition hover:bg-[#2b59b0]/15"
              >
                <Plus size={16} />
                บันทึกงาน (Walk-in)
              </button>

              <button
                onClick={onPickUpEquipment}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Package size={16} />
                ทำรายการเบิกอุปกรณ์
              </button>
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
};

export default ITServiceOverviewPanel;
