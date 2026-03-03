import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
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

const PERIOD_OPTIONS = [
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
  "notebook",
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

const getSlaHours = (priority = "normal") => {
  const key = String(priority || "normal").toLowerCase();
  return SLA_HOURS[key] || SLA_HOURS.normal;
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
  (parts || "")
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
  if (HARDWARE_KEYWORDS.some((k) => text.includes(k))) return "hardware";
  if (SOFTWARE_KEYWORDS.some((k) => text.includes(k))) return "software";
  return "other";
};

const estimateTicketValue = (ticket) => {
  const pool = `${ticket?.parts_used || ""} ${ticket?.title || ""} ${ticket?.category || ""}`;
  const lower = pool.toLowerCase();
  let best = 0;

  Object.entries(COST_HINTS).forEach(([keyword, value]) => {
    if (lower.includes(keyword.toLowerCase())) {
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

const CardMetric = ({
  title,
  value,
  subtitle,
  valueClass,
  icon: Icon,
  iconWrapClass,
  onClick,
}) => (
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
    className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
      onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md" : ""
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

const StatusBadge = ({ status }) => {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "NEW") {
    return <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">ตั๋วใหม่</span>;
  }

  if (normalized === "IN_PROGRESS") {
    return <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">กำลังดำเนินการ</span>;
  }

  if (isClosedStatus(normalized)) {
    return <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">ปิดงานแล้ว</span>;
  }

  return <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">รอดำเนินการ</span>;
};

export default function ITServiceDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [department, setDepartment] = useState("ALL");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("Load IT service dashboard failed:", error);
        setTickets([]);
      } else {
        setTickets(data || []);
      }

      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("it-service-dashboard-overview")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          load();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const periodDays = useMemo(() => PERIOD_OPTIONS.find((item) => item.id === period)?.days || 7, [period]);

  const periodStart = useMemo(() => {
    const now = new Date();
    if (periodDays === 1) return startOfDay(now);
    const start = new Date(now);
    start.setDate(start.getDate() - (periodDays - 1));
    return startOfDay(start);
  }, [periodDays]);

  const departments = useMemo(() => {
    const uniq = [...new Set(tickets.map((item) => item.department).filter(Boolean))];
    return uniq.sort((a, b) => a.localeCompare(b, "th"));
  }, [tickets]);

  const departmentTickets = useMemo(() => {
    if (department === "ALL") return tickets;
    return tickets.filter((item) => item.department === department);
  }, [tickets, department]);

  const scopedTickets = useMemo(() => {
    return departmentTickets.filter((item) => {
      const created = toDate(item.created_at);
      return created && created >= periodStart;
    });
  }, [departmentTickets, periodStart]);

  const repairTickets = scopedTickets.filter((item) => classifyTicketType(item) === "repair");
  const assetTickets = scopedTickets.filter((item) => classifyTicketType(item) === "asset");

  const todayKey = formatDateKey(new Date());

  const kpiNew = repairTickets.filter((item) => String(item.status || "").toUpperCase() === "NEW").length;
  const kpiInProgress = repairTickets.filter((item) => String(item.status || "").toUpperCase() === "IN_PROGRESS").length;

  const kpiOverdue = repairTickets.filter((item) => {
    if (isClosedStatus(item.status)) return false;
    const createdAt = toDate(item.created_at);
    if (!createdAt) return false;
    const diffHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
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
    const total = durations.reduce((sum, value) => sum + value, 0);
    return Math.round(total / durations.length);
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

  const assetDemand = useMemo(() => {
    const map = new Map();

    assetTickets.forEach((ticket) => {
      extractAssetItems(ticket).forEach((itemName) => {
        const key = itemName.trim();
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
  const kpiLowStock = assetDemand.filter((item) => item.count >= lowStockThreshold).length;

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
    return [...scopedTickets]
      .sort((a, b) => {
        const left = toDate(b.updated_at || b.closed_at || b.created_at)?.getTime() || 0;
        const right = toDate(a.updated_at || a.closed_at || a.created_at)?.getTime() || 0;
        return left - right;
      })
      .slice(0, 10)
      .map((item) => {
        const type = classifyTicketType(item) === "asset" ? "เบิก" : "ซ่อม";
        const durationMin = minutesBetween(
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
          duration: formatDuration(durationMin),
        };
      });
  }, [scopedTickets]);

  const goToRepairDashboard = (options = {}) => {
    navigate("/admin-dashboard", {
      state: {
        fromServiceDashboard: true,
        ...options,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50" style={{ fontFamily: "Inter, 'TH Sarabun New', sans-serif" }}>
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: "Inter, 'TH Sarabun New', sans-serif" }}>
      <div className="mx-auto max-w-[1400px] px-6 py-6 lg:py-8">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <button
              type="button"
              onClick={() => navigate("/admin-dashboard")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              กลับหน้าซ่อมงาน
            </button>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0056b3]">IT Service & Asset Management</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Enterprise Dashboard</h1>
              <p className="mt-2 text-sm text-slate-600">
                ภาพรวมงานซ่อม, การเบิกอุปกรณ์, SLA และประสิทธิภาพการปิดงานในมุมผู้บริหาร
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setPeriod(option.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    period === option.id
                      ? "bg-[#0056b3] text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}

              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
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
        </header>

        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-slate-900">KPI ฝั่งงานซ่อม</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CardMetric
              title="ตั๋วใหม่"
              value={formatCount(kpiNew)}
              subtitle="งานที่เข้ามาใหม่ในช่วงเวลาที่เลือก"
              valueClass="text-slate-900"
              icon={Ticket}
              iconWrapClass="bg-blue-50 text-blue-700"
              onClick={() =>
                goToRepairDashboard({
                  targetTab: "INCOMING",
                  status: "NEW",
                  searchQuery: "",
                })
              }
            />
            <CardMetric
              title="กำลังดำเนินการ"
              value={formatCount(kpiInProgress)}
              subtitle="งานที่กำลังปฏิบัติงานโดยทีมช่าง"
              valueClass="text-amber-600"
              icon={Wrench}
              iconWrapClass="bg-amber-50 text-amber-700"
              onClick={() =>
                goToRepairDashboard({
                  targetTab: "ACTIVE",
                  status: "IN_PROGRESS",
                  searchQuery: "",
                })
              }
            />
            <CardMetric
              title="เกินกำหนด SLA"
              value={formatCount(kpiOverdue)}
              subtitle="SLA Alert ต้องเร่งติดตาม"
              valueClass="text-red-600"
              icon={AlertTriangle}
              iconWrapClass="bg-red-50 text-red-700"
              onClick={() =>
                goToRepairDashboard({
                  targetTab: "INCOMING",
                  sortBy: "priority",
                  quickFilter: "URGENT",
                })
              }
            />
            <CardMetric
              title="ปิดงานแล้ววันนี้"
              value={formatCount(kpiClosedToday)}
              subtitle="งานที่ปิดสำเร็จภายในวันนี้"
              valueClass="text-emerald-600"
              icon={CheckCircle2}
              iconWrapClass="bg-emerald-50 text-emerald-700"
              onClick={() =>
                goToRepairDashboard({
                  targetTab: "HISTORY",
                  searchQuery: "",
                })
              }
            />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-slate-900">KPI ฝั่งคลังและทรัพย์สิน</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CardMetric
              title="อุปกรณ์พร้อมใช้"
              value={formatCount(kpiAvailableAssets)}
              subtitle="คำนวณจาก serial ที่พร้อมใช้งาน"
              valueClass="text-blue-700"
              icon={Boxes}
              iconWrapClass="bg-blue-50 text-blue-700"
              onClick={() =>
                goToRepairDashboard({
                  targetTab: "HISTORY",
                  quickFilter: "HARDWARE",
                })
              }
            />
            <CardMetric
              title="สินค้าใกล้หมด"
              value={formatCount(kpiLowStock)}
              subtitle="รายการที่มีความต้องการสูง (Low Stock)"
              valueClass="text-orange-600"
              icon={AlertTriangle}
              iconWrapClass="bg-orange-50 text-orange-700"
              onClick={() =>
                goToRepairDashboard({
                  targetTab: "HISTORY",
                  quickFilter: "HARDWARE",
                  sortBy: "priority",
                })
              }
            />
            <CardMetric
              title="มูลค่าอุปกรณ์ที่เบิกออก"
              value={formatCurrency(kpiIssuedValue)}
              subtitle="ประมาณการจากคำขอที่ปิดแล้ว"
              valueClass="text-indigo-700"
              icon={Package}
              iconWrapClass="bg-indigo-50 text-indigo-700"
              onClick={() =>
                goToRepairDashboard({
                  targetTab: "HISTORY",
                  quickFilter: "HARDWARE",
                })
              }
            />
            <CardMetric
              title="MTTR"
              value={formatDuration(mttrMinutes)}
              subtitle="Mean Time to Repair ต่อเคส"
              valueClass="text-slate-800"
              icon={Clock3}
              iconWrapClass="bg-slate-100 text-slate-700"
              onClick={() =>
                goToRepairDashboard({
                  targetTab: "HISTORY",
                })
              }
            />
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900">Service Trend</h3>
              <p className="text-xs text-slate-500">แนวโน้มรับแจ้งซ่อมเทียบปิดงานย้อนหลัง 7 วัน</p>
            </div>
            <div className="h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serviceTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1" }}
                    formatter={(value, name) => [value, name === "reported" ? "รับแจ้งซ่อม" : "ปิดงาน"]}
                  />
                  <Legend formatter={(value) => (value === "reported" ? "รับแจ้งซ่อม" : "ปิดงาน")} />
                  <Line type="monotone" dataKey="reported" stroke="#0056b3" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="completed" stroke="#16a34a" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900">Asset Distribution (Top 5)</h3>
              <p className="text-xs text-slate-500">รายการอุปกรณ์/ซอฟต์แวร์ที่มีการเบิกสูงสุด</p>
            </div>
            <div className="h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetDemand} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1" }}
                    formatter={(value) => [`${value} รายการ`, "จำนวน"]}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {assetDemand.map((item, index) => {
                      const color = item.group === "hardware" ? "#2563eb" : item.group === "software" ? "#7c3aed" : "#64748b";
                      return <Cell key={`asset-bar-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">Hardware</span>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">Software</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Other</span>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <article className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900">Recent Activities</h3>
              <p className="text-xs text-slate-500">รายการล่าสุด 5-10 รายการ</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2">ชื่อผู้แจ้ง</th>
                    <th className="px-3 py-2">แผนก</th>
                    <th className="px-3 py-2">ประเภท</th>
                    <th className="px-3 py-2">อุปกรณ์/ปัญหา</th>
                    <th className="px-3 py-2">สถานะล่าสุด</th>
                    <th className="px-3 py-2">ระยะเวลาที่ใช้ไป</th>
                    <th className="px-3 py-2">ลิงก์</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-slate-100 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() =>
                        goToRepairDashboard({
                          targetTab: isClosedStatus(row.status) ? "HISTORY" : "INCOMING",
                          searchQuery: String(row.id),
                        })
                      }
                    >
                      <td className="px-3 py-3 font-medium text-slate-900">{row.reporter}</td>
                      <td className="px-3 py-3">{row.department}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.type === "ซ่อม" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-3 py-3">{row.subject}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-3 text-slate-600">{row.duration}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0056b3]">
                          เปิดงาน
                          <ExternalLink size={12} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {recentActivities.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                ไม่พบข้อมูลกิจกรรมในช่วงเวลาที่เลือก
              </div>
            )}
          </article>

          <aside className="space-y-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Quick Action</h3>
              <p className="mt-1 text-xs text-slate-500">เริ่มงานสำคัญได้ทันที</p>

              <div className="mt-4 space-y-2">
                <button
                  onClick={() => navigate("/create-ticket")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0056b3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus size={16} />
                  เปิดตั๋วแจ้งซ่อมใหม่
                </button>

                <button
                  onClick={() => navigate("/pick-up-equipment")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Package size={16} />
                  ทำรายการเบิกอุปกรณ์
                </button>

                <button
                  onClick={() => navigate("/admin-dashboard")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <Wrench size={16} />
                  ไปหน้าปฏิบัติงานช่าง
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Overview</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex items-center justify-between">
                  <span>Ticket ทั้งหมด</span>
                  <span className="font-semibold text-slate-900">{formatCount(scopedTickets.length)}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>งานซ่อม</span>
                  <span className="font-semibold text-slate-900">{formatCount(repairTickets.length)}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>งานเบิก/ทรัพย์สิน</span>
                  <span className="font-semibold text-slate-900">{formatCount(assetTickets.length)}</span>
                </li>
              </ul>
            </article>
          </aside>
        </section>
      </div>
    </div>
  );
}
