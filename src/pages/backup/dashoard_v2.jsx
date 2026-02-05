import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Settings, 
  Bell, 
  Search, 
  Menu, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  BarChart3, 
  MoreVertical,
  Monitor,
  Wifi,
  Printer,
  MousePointer2
} from 'lucide-react';

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* --- Sidebar --- */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-slate-200 transition-all duration-300 flex flex-col fixed h-full z-20 md:relative`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-center border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Monitor size={20} />
            </div>
            {isSidebarOpen && <span className="text-slate-800">IT Service</span>}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem icon={LayoutDashboard} text="ภาพรวม (Overview)" active collapsed={!isSidebarOpen} />
          <SidebarItem icon={Ticket} text="รายการแจ้งซ่อม" badge="5" collapsed={!isSidebarOpen} />
          <SidebarItem icon={Users} text="ทีมงาน IT" collapsed={!isSidebarOpen} />
          <SidebarItem icon={BarChart3} text="รายงานผล" collapsed={!isSidebarOpen} />
          <div className="pt-4 mt-4 border-t border-slate-100">
            <SidebarItem icon={Settings} text="ตั้งค่าระบบ" collapsed={!isSidebarOpen} />
          </div>
        </nav>

        {/* User Mini Profile (Bottom Sidebar) */}
        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
              alt="Admin" 
              className="w-10 h-10 rounded-full border-2 border-indigo-100"
            />
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-slate-700 truncate">Admin IT</p>
                <p className="text-xs text-slate-400 truncate">System Admin</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="ค้นหา Ticket, Serial No..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
              />
            </div>
            <button className="relative p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800">Dashboard ภาพรวม</h1>
              <p className="text-slate-500">สถานะงานซ่อมและการให้บริการประจำวันนี้</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                title="งานทั้งหมด" 
                value="124" 
                trend="+12%" 
                trendUp={true} 
                icon={Ticket} 
                color="indigo" 
              />
              <StatCard 
                title="กำลังดำเนินการ" 
                value="8" 
                subtext="Tickets"
                icon={Clock} 
                color="amber" 
              />
              <StatCard 
                title="รอดำเนินการ" 
                value="3" 
                subtext="High Priority"
                icon={AlertCircle} 
                color="rose" 
              />
              <StatCard 
                title="เสร็จสิ้นเดือนนี้" 
                value="85" 
                trend="+5%" 
                trendUp={true} 
                icon={CheckCircle2} 
                color="emerald" 
              />
            </div>

            {/* Charts & Tables Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Recent Tickets Table (Takes up 2/3 space) */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800">รายการแจ้งซ่อมล่าสุด</h3>
                  <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">ดูทั้งหมด</button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-3 font-medium">Ticket ID</th>
                        <th className="pb-3 font-medium">ปัญหาที่พบ</th>
                        <th className="pb-3 font-medium">ผู้แจ้ง</th>
                        <th className="pb-3 font-medium">สถานะ</th>
                        <th className="pb-3 font-medium text-right">เวลา</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <TicketRow 
                        id="#TK-204" 
                        issue="Printer กระดาษติด" 
                        category="Hardware"
                        user="คุณสมชาย (บัญชี)" 
                        status="pending" 
                        time="10 นาทีที่แล้ว" 
                      />
                      <TicketRow 
                        id="#TK-203" 
                        issue="ขอติดตั้ง Adobe Photoshop" 
                        category="Software"
                        user="คุณวิภา (Design)" 
                        status="progress" 
                        time="2 ชม. ที่แล้ว" 
                      />
                      <TicketRow 
                        id="#TK-202" 
                        issue="Wifi ชั้น 3 ใช้งานไม่ได้" 
                        category="Network"
                        user="คุณเอก (HR)" 
                        status="progress" 
                        time="3 ชม. ที่แล้ว" 
                      />
                      <TicketRow 
                        id="#TK-201" 
                        issue="หน้าจอเปิดไม่ติด" 
                        category="Hardware"
                        user="คุณนุ่น (Marketing)" 
                        status="done" 
                        time="เมื่อวาน" 
                      />
                       <TicketRow 
                        id="#TK-200" 
                        issue="เข้า Shared Drive ไม่ได้" 
                        category="Network"
                        user="คุณบอย (Sales)" 
                        status="done" 
                        time="เมื่อวาน" 
                      />
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Mini Charts / Summary */}
              <div className="space-y-6">
                {/* Device Types Chart (Mock) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">ประเภทปัญหา</h3>
                  <div className="space-y-4">
                    <ProgressBar label="Hardware (Printer/PC)" value={45} color="bg-indigo-500" />
                    <ProgressBar label="Software & License" value={30} color="bg-blue-400" />
                    <ProgressBar label="Network / Internet" value={15} color="bg-emerald-400" />
                    <ProgressBar label="User Error / Other" value={10} color="bg-slate-300" />
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                    <span>ยอดรวมเดือนนี้</span>
                    <span className="font-bold text-slate-800">140 เคส</span>
                  </div>
                </div>

                {/* Team Availability */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">สถานะทีม Support</h3>
                  <div className="space-y-4">
                    <TeamMember name="ช่างนนท์" status="online" task="กำลังซ่อม Printer ชั้น 2" />
                    <TeamMember name="ช่างก้อง" status="busy" task="ประชุมทีม IT" />
                    <TeamMember name="Support ใหม่" status="offline" task="พักเที่ยง" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// --- Sub Components ---

function SidebarItem({ icon: Icon, text, active, badge, collapsed }) {
  return (
    <button 
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
        ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
        ${collapsed ? 'justify-center' : ''}
      `}
    >
      <Icon size={20} className={active ? 'text-indigo-600' : 'text-slate-500'} />
      {!collapsed && (
        <>
          <span className="font-medium text-sm flex-1 text-left">{text}</span>
          {badge && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem]">
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}

function StatCard({ title, value, trend, trendUp, subtext, icon: Icon, color }) {
  const colorClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && (
            <span className={trendUp ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
              {trend}
            </span>
          )}
          {subtext && <span className="text-slate-400">{subtext}</span>}
          {trend && <span className="text-slate-400">จากเมื่อวาน</span>}
        </div>
      </div>
      <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
        <Icon size={24} />
      </div>
    </div>
  );
}

function TicketRow({ id, issue, category, user, status, time }) {
  const statusStyles = {
    pending: "bg-rose-100 text-rose-700",
    progress: "bg-amber-100 text-amber-700",
    done: "bg-emerald-100 text-emerald-700",
  };
  
  const statusLabels = {
    pending: "รอดำเนินการ",
    progress: "กำลังซ่อม",
    done: "เสร็จสิ้น",
  };

  return (
    <tr className="border-b border-slate-50 last:border-none hover:bg-slate-50 transition-colors group">
      <td className="py-4 font-medium text-slate-700">{id}</td>
      <td className="py-4">
        <div className="flex flex-col">
          <span className="text-slate-800 font-medium">{issue}</span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
             {category}
          </span>
        </div>
      </td>
      <td className="py-4 text-slate-600">{user}</td>
      <td className="py-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
          {statusLabels[status]}
        </span>
      </td>
      <td className="py-4 text-right text-slate-400 text-sm">{time}</td>
    </tr>
  );
}

function ProgressBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-900 font-medium">{value}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div 
          className={`${color} h-2 rounded-full transition-all duration-500`} 
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
}

function TeamMember({ name, status, task }) {
  const statusColor = {
    online: "bg-emerald-500",
    busy: "bg-amber-500",
    offline: "bg-slate-300"
  };

  return (
    <div className="flex items-center gap-3 pb-3 border-b border-slate-50 last:border-none last:pb-0">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
          {name.charAt(0)}
        </div>
        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColor[status]}`}></div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">{name}</p>
        <p className="text-xs text-slate-400">{task}</p>
      </div>
    </div>
  );
}