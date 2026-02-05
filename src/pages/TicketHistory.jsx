import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Search, Filter, Download, RefreshCw, Calendar, 
  Eye, ChevronRight, Clock, CheckCircle2, AlertCircle, X,
  FileText, Hash, User, Building2, Phone, Mail, Printer,
  BarChart3, TrendingUp, MoreVertical, CheckCircle, ExternalLink
} from "lucide-react";
import Swal from "sweetalert2";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

export default function TicketHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    closed: 0,
    avgResponse: "0h"
  });

  // รับข้อมูลจาก navigation state
  const initialFilter = location.state?.initialFilter || "ALL";
  const initialTickets = location.state?.tickets || [];

  useEffect(() => {
    // ตั้งค่าฟิลเตอร์เริ่มต้นจาก Dashboard
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
    
    if (initialTickets.length > 0) {
      setTickets(initialTickets);
      calculateStats(initialTickets);
      setLoading(false);
    } else {
      fetchTickets();
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/login");

      const { data: ticketsData, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTickets(ticketsData || []);
      calculateStats(ticketsData || []);

    } catch (error) {
      console.error("Error fetching tickets:", error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดประวัติได้',
        confirmButtonColor: '#4f46e5',
      });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const calculateStats = (ticketsData) => {
    const total = ticketsData.length;
    const pending = ticketsData.filter(t => t.status !== "CLOSED").length;
    const closed = ticketsData.filter(t => t.status === "CLOSED").length;
    
    // คำนวณเวลาเฉลี่ย
    let totalHours = 0;
    let counted = 0;
    
    ticketsData.forEach(ticket => {
      if (ticket.closed_at && ticket.created_at) {
        const created = new Date(ticket.created_at);
        const closed = new Date(ticket.closed_at);
        const hours = (closed - created) / (1000 * 60 * 60);
        if (hours > 0) {
          totalHours += hours;
          counted++;
        }
      }
    });

    const avgResponse = counted > 0 ? `${Math.round(totalHours / counted)}h` : "0h";

    setStats({
      total,
      pending,
      closed,
      avgResponse
    });
  };

  // ✅ **LOGIC: Filter Tickets**
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Filter by search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (ticket.title || "").toLowerCase().includes(query) ||
          (ticket.ticket_no || "").toLowerCase().includes(query) ||
          (ticket.description || "").toLowerCase().includes(query) ||
          (ticket.category || "").toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Filter by status
      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && ticket.status === "CLOSED") return false;
        if (statusFilter === "CLOSED" && ticket.status !== "CLOSED") return false;
        if (statusFilter !== "PENDING" && statusFilter !== "CLOSED" && ticket.status !== statusFilter) {
          return false;
        }
      }

      // Filter by priority
      if (priorityFilter !== "ALL" && ticket.priority !== priorityFilter) {
        return false;
      }

      // Filter by category
      if (categoryFilter !== "ALL" && ticket.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  // ✅ **LOGIC: Get Status Config**
  const getStatusConfig = (status) => {
    switch(status) {
      case 'NEW':
        return { 
          label: 'รอดำเนินการ', 
          color: 'text-rose-600', 
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          icon: Clock 
        };
      case 'IN_PROGRESS':
        return { 
          label: 'กำลังซ่อม', 
          color: 'text-amber-600', 
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: Clock 
        };
      case 'CLOSED':
        return { 
          label: 'สำเร็จ', 
          color: 'text-emerald-600', 
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          icon: CheckCircle2 
        };
      default:
        return { 
          label: 'ไม่ระบุ', 
          color: 'text-slate-600', 
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          icon: AlertCircle 
        };
    }
  };

  // ✅ **LOGIC: Get Priority Config**
  const getPriorityConfig = (priority) => {
    switch(priority) {
      case 'urgent':
        return { label: 'ด่วน', color: 'bg-gradient-to-r from-rose-500 to-pink-600' };
      case 'high':
        return { label: 'สูง', color: 'bg-gradient-to-r from-amber-500 to-orange-600' };
      case 'normal':
        return { label: 'ปกติ', color: 'bg-gradient-to-r from-blue-500 to-indigo-600' };
      case 'low':
        return { label: 'ต่ำ', color: 'bg-gradient-to-r from-emerald-500 to-green-600' };
      default:
        return { label: 'ไม่ระบุ', color: 'bg-gradient-to-r from-slate-500 to-slate-600' };
    }
  };

  // ✅ **LOGIC: Format Date**
  const formatDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุ';
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy', { locale: th });
    } catch {
      return 'ไม่ระบุ';
    }
  };

  // ✅ **LOGIC: Format DateTime**
  const formatDateTime = (dateString) => {
    if (!dateString) return 'ไม่ระบุ';
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy HH:mm', { locale: th });
    } catch {
      return 'ไม่ระบุ';
    }
  };

  // ✅ **LOGIC: Get Time Ago**
  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: th });
    } catch {
      return '';
    }
  };

  // ✅ **LOGIC: Handle Export**
  const handleExport = () => {
    Swal.fire({
      title: 'ส่งออกข้อมูล',
      text: 'ต้องการส่งออกข้อมูลเป็นไฟล์ CSV หรือไม่?',
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ส่งออก CSV',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        const headers = ['เลขที่', 'หัวข้อ', 'สถานะ', 'หมวดหมู่', 'ความเร่งด่วน', 'วันที่แจ้ง', 'วันที่ปิด'];
        const csvData = filteredTickets.map(ticket => [
          ticket.ticket_no || `T${ticket.id?.slice(-6) || '000000'}`,
          ticket.title,
          getStatusConfig(ticket.status).label,
          ticket.category,
          getPriorityConfig(ticket.priority).label,
          formatDate(ticket.created_at),
          ticket.closed_at ? formatDate(ticket.closed_at) : 'ยังไม่ปิด'
        ]);
        
        const csv = [headers, ...csvData].map(row => 
          row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ticket-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Swal.fire({
          icon: 'success',
          title: 'ส่งออกสำเร็จ',
          text: 'ไฟล์ CSV ได้ถูกดาวน์โหลดแล้ว',
          confirmButtonColor: '#4f46e5',
        });
      }
    });
  };

  // ✅ **LOGIC: Get Unique Categories**
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(tickets.map(t => t.category).filter(Boolean))];
    return ['ALL', ...uniqueCategories];
  }, [tickets]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">กำลังโหลดประวัติ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate("/dashboard")}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-800">ประวัติการแจ้งซ่อม</h1>
                <p className="text-slate-500 text-sm">ทั้งหมด {tickets.length} รายการ</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchTickets}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                title="รีเฟรช"
              >
                <RefreshCw size={20} className="text-slate-600" />
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                <Download size={18} />
                <span className="hidden sm:inline">ส่งออก</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ทั้งหมด</p>
                <p className="text-2xl font-black text-slate-800">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">รอดำเนินการ</p>
                <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock size={20} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">สำเร็จ</p>
                <p className="text-2xl font-black text-emerald-600">{stats.closed}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle size={20} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">เวลาเฉลี่ย</p>
                <p className="text-2xl font-black text-slate-800">{stats.avgResponse}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่แจ้งซ่อม, หัวข้อ, หรือคำอธิบาย..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status Filter */}
              <select
                className="px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="PENDING">รอดำเนินการ</option>
                <option value="CLOSED">สำเร็จ</option>
                <option value="NEW">งานใหม่</option>
                <option value="IN_PROGRESS">กำลังซ่อม</option>
              </select>

              {/* Priority Filter */}
              <select
                className="px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="ALL">ทุกความเร่งด่วน</option>
                <option value="urgent">ด่วน</option>
                <option value="high">สูง</option>
                <option value="normal">ปกติ</option>
                <option value="low">ต่ำ</option>
              </select>

              {/* Category Filter */}
              <select
                className="px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">ทุกหมวดหมู่</option>
                {categories.filter(c => c !== "ALL").map((category, index) => (
                  <option key={index} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b border-slate-100 bg-slate-50">
            <div className="col-span-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">หัวข้อ</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">สถานะ</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ความเร่งด่วน</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">วันที่แจ้ง</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">จัดการ</p>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-100">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => {
                const statusConfig = getStatusConfig(ticket.status);
                const priorityConfig = getPriorityConfig(ticket.priority);
                
                return (
                  <div 
                    key={ticket.id}
                    className="p-4 md:p-6 hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex flex-col md:grid md:grid-cols-12 gap-4 items-center">
                      {/* Ticket Info - Mobile */}
                      <div className="md:hidden w-full">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Hash size={12} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-500">
                              {ticket.ticket_no || `T${ticket.id?.slice(-6).toUpperCase() || '000000'}`}
                            </span>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 mb-2 line-clamp-2">{ticket.title}</h4>
                      </div>

                      {/* Desktop View */}
                      <div className="hidden md:block md:col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 mb-1">{ticket.title}</h4>
                            <div className="flex items-center gap-2">
                              <Hash size={12} className="text-slate-400" />
                              <span className="text-xs text-slate-500">
                                {ticket.ticket_no || `T${ticket.id?.slice(-6).toUpperCase() || '000000'}`}
                              </span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500">{ticket.category}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status - Desktop */}
                      <div className="hidden md:block md:col-span-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${statusConfig.color.replace('text', 'bg')}`}></div>
                          <span className="text-sm font-medium text-slate-700">{statusConfig.label}</span>
                        </div>
                      </div>

                      {/* Priority - Desktop */}
                      <div className="hidden md:block md:col-span-2">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                      </div>

                      {/* Date - Desktop */}
                      <div className="hidden md:block md:col-span-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-600">{formatDate(ticket.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions - Desktop */}
                      <div className="hidden md:block md:col-span-2">
                        <div className="flex items-center justify-end">
                          <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                            <Eye size={18} />
                          </button>
                          <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      <div className="md:hidden w-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="text-xs text-slate-500">{formatDate(ticket.created_at)}</span>
                            <span className={`px-2 py-1 rounded text-xs font-bold text-white ${priorityConfig.color}`}>
                              {priorityConfig.label}
                            </span>
                          </div>
                          <ChevronRight size={18} className="text-slate-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">ไม่พบรายการ</h3>
                <p className="text-slate-500 mb-6">
                  {searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL" || categoryFilter !== "ALL"
                    ? "ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา"
                    : "คุณยังไม่ได้แจ้งซ่อมใดๆ"}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                    setPriorityFilter("ALL");
                    setCategoryFilter("ALL");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            )}
          </div>

          {/* Pagination/Filters Summary */}
          {filteredTickets.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  แสดง {filteredTickets.length} จาก {tickets.length} รายการ
                </p>
                {(searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL" || categoryFilter !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("ALL");
                      setPriorityFilter("ALL");
                      setCategoryFilter("ALL");
                    }}
                    className="text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors"
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
                      {selectedTicket.ticket_no || `T${selectedTicket.id?.slice(-6).toUpperCase() || '000000'}`}
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusConfig(selectedTicket.status).bg} ${getStatusConfig(selectedTicket.status).color} ${getStatusConfig(selectedTicket.status).border} border`}>
                      {getStatusConfig(selectedTicket.status).label}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800">{selectedTicket.title}</h2>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={24} className="text-slate-500" />
                </button>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">รายละเอียดปัญหา</h3>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-slate-700 whitespace-pre-line">{selectedTicket.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-500 mb-2">หมวดหมู่</h4>
                      <p className="font-bold text-slate-800">{selectedTicket.category}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-500 mb-2">สถานที่</h4>
                      <p className="font-bold text-slate-800">{selectedTicket.location || 'ไม่ระบุ'}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">ข้อมูลการซ่อม</h3>
                    <div className="bg-indigo-50 p-4 rounded-2xl">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                            {selectedTicket.assigned_name?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{selectedTicket.assigned_name || 'รอการมอบหมาย'}</p>
                            <p className="text-xs text-slate-500">ช่างเทคนิค</p>
                          </div>
                        </div>
                        {selectedTicket.solution_note && (
                          <div className="bg-white p-3 rounded-xl border border-emerald-100">
                            <p className="text-xs font-bold text-emerald-600 mb-1">สรุปการซ่อม:</p>
                            <p className="text-sm text-emerald-800">{selectedTicket.solution_note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-500 mb-2">วันที่แจ้ง</h4>
                      <p className="font-bold text-slate-800">{formatDateTime(selectedTicket.created_at)}</p>
                    </div>
                    {selectedTicket.closed_at && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-500 mb-2">วันที่ปิด</h4>
                        <p className="font-bold text-slate-800">{formatDateTime(selectedTicket.closed_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                >
                  ปิด
                </button>
                <button
                  onClick={() => navigate("/create-ticket")}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                >
                  สร้างใบแจ้งซ่อมใหม่
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}