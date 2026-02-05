import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from 'react-router-dom';
import { 
  Bell, MapPin, Navigation, Clock, Camera, 
  CheckCircle, XCircle, LogOut, ChevronRight, 
  User, Calendar, Wrench, Shield, Power,
  Search, Filter, Home, List, History,
  Phone, Mail, Building, Map, ExternalLink,
  Download, Printer, Share2, Eye, Edit,
  ChevronLeft, ChevronDown, Check, X,
  Star, Award, TrendingUp, BarChart3,
  Smartphone, Laptop, Server, Wifi,
  FileText, Image as ImageIcon, UserCheck,
  Trash2, Calendar as CalendarIcon, Users,
  Activity, Zap, AlertCircle, MessageSquare,
  DownloadCloud, UploadCloud, Settings,
  Menu, X as XIcon, ChevronUp, Map as MapIcon,
  Briefcase, Monitor, HardDrive, Router,
  Database, Cloud, Cpu, Battery, Volume2,
  Printer as PrinterIcon, Keyboard, Mouse,
  Headphones, Wifi as WifiIcon, Shield as ShieldIcon
} from 'lucide-react';
import Swal from 'sweetalert2';

const ITDashboard = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('INCOMING');
  const [isOnline, setIsOnline] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [theme, setTheme] = useState('dark');
  
  const [stats, setStats] = useState({
    todayCompleted: 0,
    weeklyAvg: 0,
    responseTime: 0,
    satisfaction: 0,
    urgentCount: 0,
    inProgressCount: 0
  });

  const audioRef = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"));
  const notificationSoundRef = useRef(new Audio("https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3"));

  // เพฟนิกชันสลับธีม
const toggleTheme = () => {
  const newTheme = theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  localStorage.setItem('it-dashboard-theme', newTheme);
};

// โหลดธีมจาก localStorage
useEffect(() => {
  const savedTheme = localStorage.getItem('it-dashboard-theme') || 'dark';
  setTheme(savedTheme);
}, []);

  // Get current user from Supabase Auth
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userData = {
          id: user.id,
          name: user.user_metadata?.full_name || 'ช่างเทคนิค',
          email: user.email,
          employeeId: user.user_metadata?.employee_id || 'EMP001',
          department: user.user_metadata?.department || 'IT Support',
          phone: user.user_metadata?.phone || 'ไม่ระบุ',
          avatar: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.full_name || 'IT')}&background=3b82f6&color=fff&bold=true&size=128`
        };
        setCurrentUser(userData);
        console.log('Current user set:', userData);
      } else {
        console.log('No user found, redirecting to login');
        navigate('/login');
      }
    };
    getUser();
  }, [navigate]);

  // Fetch tickets with real-time updates
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (isMounted) {
        await fetchTickets();
      }
    };
    
    fetchData();
    
    // Real-time subscription
    const channel = supabase
      .channel('it_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tickets' },
        async (payload) => {
          if (isMounted) {
            if (payload.eventType === 'INSERT') {
              // Play notification sound
              try {
                await audioRef.current.play();
              } catch (e) {
                console.log("Audio play failed", e);
              }
              
              // Show notification
              showNewTicketNotification(payload.new);
              
              // Update notification count
              setNotificationCount(prev => prev + 1);
            }
            await fetchTickets();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Show new ticket notification with animation
  const showNewTicketNotification = (ticket) => {
    // Create floating notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-[1000] animate-slide-in-right';
    notification.innerHTML = `
      <div class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-xl shadow-2xl max-w-sm border border-blue-300">
        <div class="flex items-start gap-3">
          <div class="animate-pulse">
            <Bell class="w-6 h-6" />
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-lg">มีงานซ่อมใหม่!</h4>
              <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-white/80 hover:text-white">
                <X class="w-4 h-4" />
              </button>
            </div>
            <p class="text-sm mt-1 opacity-90">${ticket.title || 'งานซ่อมใหม่เข้ามา'}</p>
            <div class="flex items-center gap-2 mt-2 text-xs opacity-80">
              <User class="w-3 h-3" />
              <span>${ticket.reporter_name || 'ผู้ใช้'}</span>
              <span class="mx-1">•</span>
              <MapPin class="w-3 h-3" />
              <span>${ticket.location || 'สถานที่'}</span>
            </div>
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-white/20">
              <span class="text-xs">${new Date().toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</span>
              <button onclick="handleViewNewTicket('${ticket.id}')" class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors">
                ดูรายละเอียด
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 8 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.classList.add('animate-slide-out-right');
        setTimeout(() => notification.remove(), 300);
      }
    }, 8000);
    
    // Add global function for button
    window.handleViewNewTicket = (ticketId) => {
      const ticket = tickets.find(t => t.id === ticketId) || { id: ticketId };
      handleViewDetails(ticket);
      notification.remove();
    };
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      console.log('Fetching tickets...');
      
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched tickets:', data?.length || 0);
      setTickets(data || []);
      calculateStats(data || []);
      
      // Update notification count based on new tickets
      const newTickets = data?.filter(t => t.status === 'NEW') || [];
      setNotificationCount(newTickets.length);
      
    } catch (error) {
      console.error('Error fetching tickets:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลได้',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#3b82f6',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ticketsData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Today's completed tickets
    const todayCompleted = ticketsData.filter(t => {
      if (t.status === 'CLOSED' && t.closed_at) {
        const closedDate = new Date(t.closed_at);
        closedDate.setHours(0, 0, 0, 0);
        return closedDate.getTime() === today.getTime();
      }
      return false;
    }).length;

    // Average response time
    const completedTickets = ticketsData.filter(t => t.status === 'CLOSED' && t.started_at && t.closed_at);
    let totalResponseTime = 0;
    completedTickets.forEach(ticket => {
      const start = new Date(ticket.started_at);
      const end = new Date(ticket.closed_at);
      totalResponseTime += (end - start) / (1000 * 60); // in minutes
    });
    const avgResponseTime = completedTickets.length > 0 
      ? Math.round(totalResponseTime / completedTickets.length)
      : 0;

    // Urgent tickets
    const urgentCount = ticketsData.filter(t => t.priority === 'urgent' && t.status === 'NEW').length;
    
    // In progress tickets for current user
    const inProgressCount = ticketsData.filter(t => 
      t.status === 'IN_PROGRESS' && t.assigned_to === currentUser?.id
    ).length;

    setStats({
      todayCompleted,
      weeklyAvg: Math.round(ticketsData.length / 7),
      responseTime: avgResponseTime,
      satisfaction: 95,
      urgentCount,
      inProgressCount
    });
  };

  // Handle logout
  const handleLogout = async () => {
    const { value: confirm } = await Swal.fire({
      title: '<span class="text-white">ออกจากระบบ</span>',
      html: '<span class="text-white/80">คุณต้องการออกจากระบบหรือไม่?</span>',
      icon: 'question',
      background: '#1f2937',
      color: '#fff',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'rounded-2xl border border-gray-700',
        title: 'font-bold',
      },
    });

    if (confirm) {
      try {
        await supabase.auth.signOut();
        navigate('/login');
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  // Accept job
  const handleAcceptJob = async (id) => {
    if (!isOnline) {
      Swal.fire({
        icon: 'warning',
        title: '<span class="text-white">คุณอยู่ในสถานะออฟไลน์</span>',
        html: '<span class="text-white/80">กรุณาเปิดสถานะออนไลน์เพื่อรับงาน</span>',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }

    const { value: accept } = await Swal.fire({
      title: '<span class="text-white">ยืนยันการรับงาน</span>',
      html: '<span class="text-white/80">คุณต้องการรับงานนี้เข้าคลังงานของคุณหรือไม่?</span>',
      icon: 'question',
      background: '#1f2937',
      color: '#fff',
      showCancelButton: true,
      confirmButtonText: 'รับงาน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'rounded-2xl border border-gray-700',
      },
    });

    if (!accept) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'IN_PROGRESS', 
          assigned_to: currentUser?.id,
          assigned_name: currentUser?.name,
          assigned_employee_id: currentUser?.employeeId,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Play success sound
      notificationSoundRef.current.play().catch(e => console.log("Sound play failed", e));

      Swal.fire({
        icon: 'success',
        title: '<span class="text-white">รับงานสำเร็จ!</span>',
        html: '<span class="text-white/80">เริ่มเดินทางได้เลย</span>',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        background: '#1f2937',
        color: '#fff',
        customClass: {
          popup: 'rounded-xl border border-emerald-700',
        },
      });
      
      setActiveTab('ACTIVE');
      await fetchTickets();
    } catch (error) {
      console.error('Error accepting job:', error);
      Swal.fire({
        icon: 'error',
        title: '<span class="text-white">เกิดข้อผิดพลาด</span>',
        html: '<span class="text-white/80">ไม่สามารถรับงานได้</span>',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  // Delete history ticket
  const handleDeleteTicket = async (ticket) => {
    const { value: confirm } = await Swal.fire({
      title: '<span class="text-white">ยืนยันการลบ</span>',
      html: `
        <div class="text-left">
          <p class="text-white/80 mb-3">คุณต้องการลบประวัติงานนี้หรือไม่?</p>
          <div class="bg-rose-900/30 p-3 rounded-xl border border-rose-700/50">
            <p class="text-sm font-bold text-rose-300">Ticket #${ticket.id.toString().slice(-6)}</p>
            <p class="text-sm text-white/80 mt-1">${ticket.title}</p>
            <p class="text-xs text-white/60 mt-2">ข้อมูลจะถูกลบถาวรและไม่สามารถกู้คืนได้</p>
          </div>
        </div>
      `,
      icon: 'warning',
      background: '#1f2937',
      color: '#fff',
      showCancelButton: true,
      confirmButtonText: 'ลบประวัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl border border-gray-700',
      },
    });

    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticket.id);

      if (error) throw error;

      // Play delete sound
      notificationSoundRef.current.play().catch(e => console.log("Sound play failed", e));

      Swal.fire({
        icon: 'success',
        title: '<span class="text-white">ลบสำเร็จ!</span>',
        html: '<span class="text-white/80">ประวัติงานถูกลบเรียบร้อยแล้ว</span>',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        background: '#1f2937',
        color: '#fff',
        customClass: {
          popup: 'rounded-xl border border-emerald-700',
        },
      });

      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      Swal.fire({
        icon: 'error',
        title: '<span class="text-white">เกิดข้อผิดพลาด</span>',
        html: '<span class="text-white/80">ไม่สามารถลบประวัติได้</span>',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  // Open navigation
  const handleOpenNavigation = (location) => {
    if (!location) {
      Swal.fire({
        icon: 'warning',
        title: '<span class="text-white">ไม่ระบุสถานที่</span>',
        html: '<span class="text-white/80">ไม่สามารถเปิดการนำทางได้</span>',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }

    const encodedLocation = encodeURIComponent(location);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
    
    Swal.fire({
      title: '<span class="text-white">เปิดการนำทาง</span>',
      html: `<span class="text-white/80">ต้องการเปิด Google Maps ไปยัง ${location} หรือไม่?</span>`,
      icon: 'question',
      background: '#1f2937',
      color: '#fff',
      showCancelButton: true,
      confirmButtonText: 'เปิด Google Maps',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'rounded-2xl border border-gray-700',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        window.open(googleMapsUrl, '_blank');
      }
    });
  };

  // Close job with enhanced UI
  const handleCloseJob = async (ticket) => {
    const { value: formValues } = await Swal.fire({
      title: '<span class="text-white">บันทึกผลการซ่อม</span>',
      html: `
        <div class="text-left space-y-4">
          <div class="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 p-4 rounded-xl border border-blue-700/30">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-xs text-blue-300 font-bold">Ticket ID</p>
                <p class="font-mono font-bold text-white">#${ticket.id.toString().slice(-6)}</p>
              </div>
              <div>
                <p class="text-xs text-blue-300 font-bold">เวลาเริ่ม</p>
                <p class="text-white">${new Date(ticket.started_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>
            <p class="text-sm font-bold text-blue-200 mt-2">${ticket.title}</p>
          </div>

          <div>
            <label class="block text-sm font-bold text-blue-300 mb-1">
              สาเหตุ/วิธีแก้ไข <span class="text-rose-400">*</span>
            </label>
            <textarea 
              id="swal-solution" 
              class="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-white placeholder-gray-500" 
              rows="4" 
              placeholder="ระบุรายละเอียดการซ่อม..."
            ></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-bold text-blue-300 mb-1">อุปกรณ์ที่เปลี่ยน</label>
            <input 
              id="swal-parts" 
              class="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl outline-none text-sm text-white placeholder-gray-500" 
              placeholder="เช่น เมาส์, RAM 8GB, แบตเตอรี่โน๊ตบุ๊ค"
            />
          </div>

          <div>
            <label class="block text-sm font-bold text-blue-300 mb-1">
              รูปถ่ายหลังซ่อม <span class="text-rose-400">*</span>
            </label>
            <div class="relative">
              <input 
                type="file" 
                id="swal-file" 
                accept="image/*" 
                capture="environment" 
                class="block w-full text-sm text-gray-400
                  file:mr-4 file:py-3 file:px-4 file:rounded-xl 
                  file:border-0 file:text-sm file:font-semibold
                  file:bg-gradient-to-r file:from-blue-600 file:to-indigo-600 
                  file:text-white hover:file:from-blue-700 hover:file:to-indigo-700
                  file:cursor-pointer file:transition-all"
              />
              <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Camera class="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">ถ่ายรูปหลักฐานหลังซ่อมเสร็จ</p>
          </div>

          <div class="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 p-3 rounded-xl border border-amber-700/30">
            <p class="text-xs text-amber-300">
              <span class="font-bold">หมายเหตุ:</span> ระบบจะบันทึกเวลาเสร็จสิ้นงานโดยอัตโนมัติ
            </p>
          </div>
        </div>
      `,
      background: '#1f2937',
      color: '#fff',
      showCancelButton: true,
      confirmButtonText: 'บันทึกและปิดงาน',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      showLoaderOnConfirm: true,
      customClass: {
        popup: 'rounded-2xl border border-gray-700',
        input: 'bg-gray-800 border-gray-700 text-white',
      },
      preConfirm: () => {
        const solution = document.getElementById('swal-solution').value;
        const parts = document.getElementById('swal-parts').value;
        const file = document.getElementById('swal-file').files[0];
        
        if (!solution.trim()) {
          Swal.showValidationMessage('<span class="text-rose-400">กรุณาระบุวิธีแก้ไขปัญหา</span>');
          return false;
        }
        if (!file) {
          Swal.showValidationMessage('<span class="text-rose-400">กรุณาถ่ายรูปหลังซ่อมเสร็จ</span>');
          return false;
        }
        
        return { solution, parts, file };
      }
    });

    if (!formValues) return;

    try {
      // Upload image
      const fileExt = formValues.file.name.split('.').pop();
      const fileName = `after_${ticket.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ticket-images')
        .upload(fileName, formValues.file);

      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-images')
        .getPublicUrl(fileName);

      // Update database
      const { error: dbError } = await supabase
        .from('tickets')
        .update({
          status: 'CLOSED',
          solution_note: formValues.solution,
          parts_used: formValues.parts,
          image_after_url: publicUrl,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          closed_by: currentUser?.id,
          closed_by_name: currentUser?.name
        })
        .eq('id', ticket.id);

      if (dbError) throw dbError;

      // Play success sound
      notificationSoundRef.current.play().catch(e => console.log("Sound play failed", e));

      await Swal.fire({
        icon: 'success',
        title: '<span class="text-white">ปิดงานสำเร็จ!</span>',
        html: '<span class="text-white/80">บันทึกข้อมูลเรียบร้อยแล้ว</span>',
        timer: 2500,
        showConfirmButton: false,
        background: '#1f2937',
        color: '#fff',
        customClass: {
          popup: 'rounded-2xl border border-emerald-700',
        },
      });

      setActiveTab('HISTORY');
      fetchTickets();
    } catch (error) {
      console.error('Error closing job:', error);
      Swal.fire({
        icon: 'error',
        title: '<span class="text-white">เกิดข้อผิดพลาด</span>',
        html: `<span class="text-white/80">${error.message}</span>`,
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  // View ticket details
  const handleViewDetails = (ticket) => {
    Swal.fire({
      title: `<span class="text-white">รายละเอียด Ticket #${ticket.id.toString().slice(-6)}</span>`,
      html: `
        <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700">
              <p class="text-xs text-gray-400 font-bold uppercase">สถานะ</p>
              <p class="text-sm font-bold ${getStatusColor(ticket.status)} mt-1">${getStatusText(ticket.status)}</p>
            </div>
            <div class="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700">
              <p class="text-xs text-gray-400 font-bold uppercase">ความสำคัญ</p>
              <p class="text-sm font-bold ${getPriorityColor(ticket.priority)} mt-1">${getPriorityText(ticket.priority)}</p>
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 p-4 rounded-xl border border-blue-700/30">
            <p class="text-xs text-blue-300 font-bold uppercase mb-3">ผู้แจ้ง</p>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                ${ticket.reporter_name?.charAt(0) || 'U'}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-base font-bold text-white">${ticket.reporter_name || 'ไม่ระบุ'}</p>
                  <span class="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                    ${ticket.reporter_emp_id || 'ไม่ระบุรหัส'}
                  </span>
                  <span class="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                    ${ticket.reporter_dept || 'ไม่ระบุแผนก'}
                  </span>
                </div>
                <div class="flex items-center gap-3 mt-2 flex-wrap">
                  ${ticket.reporter_phone ? `
                  <div class="flex items-center gap-1">
                    <Phone class="w-3 h-3 text-gray-400" />
                    <span class="text-xs text-gray-300">${ticket.reporter_phone}</span>
                  </div>
                  ` : ''}
                  ${ticket.reporter_email ? `
                  <div class="flex items-center gap-1">
                    <Mail class="w-3 h-3 text-gray-400" />
                    <span class="text-xs text-gray-300 truncate max-w-[150px]">${ticket.reporter_email}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700">
            <p class="text-xs text-gray-400 font-bold uppercase mb-2">หัวข้อปัญหา</p>
            <p class="text-base font-semibold text-white">${ticket.title}</p>
          </div>
          
          <div class="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700">
            <p class="text-xs text-gray-400 font-bold uppercase mb-2">รายละเอียด</p>
            <p class="text-sm text-gray-300 italic leading-relaxed">"${ticket.description}"</p>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700">
              <div class="flex items-center gap-2 mb-2">
                <MapPin class="w-4 h-4 text-blue-400" />
                <p class="text-xs text-gray-400 font-bold uppercase">สถานที่</p>
              </div>
              <p class="text-sm text-white">${ticket.location || 'ไม่ระบุ'}</p>
            </div>
            <div class="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700">
              <div class="flex items-center gap-2 mb-2">
                <Server class="w-4 h-4 text-green-400" />
                <p class="text-xs text-gray-400 font-bold uppercase">IP Address</p>
              </div>
              <p class="text-sm text-white font-mono">${ticket.ip_address || 'ไม่ระบุ'}</p>
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 p-4 rounded-xl border border-blue-700/30">
            <p class="text-xs text-blue-300 font-bold uppercase mb-3">ประวัติเวลา</p>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span class="text-xs text-gray-300">แจ้งเมื่อ:</span>
                </div>
                <span class="text-sm font-medium text-white">
                  ${new Date(ticket.created_at).toLocaleString('th-TH')}
                </span>
              </div>
              
              ${ticket.started_at ? `
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span class="text-xs text-gray-300">รับงานเมื่อ:</span>
                </div>
                <span class="text-sm font-medium text-white">
                  ${new Date(ticket.started_at).toLocaleString('th-TH')}
                </span>
              </div>
              ` : ''}
              
              ${ticket.closed_at ? `
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span class="text-xs text-gray-300">ปิดงานเมื่อ:</span>
                </div>
                <span class="text-sm font-medium text-white">
                  ${new Date(ticket.closed_at).toLocaleString('th-TH')}
                </span>
              </div>
              ` : ''}
              
              ${ticket.started_at && ticket.closed_at ? `
              <div class="pt-3 border-t border-blue-800/50">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-300">ระยะเวลาซ่อม:</span>
                  <span class="text-sm font-bold text-white">
                    ${calculateDuration(ticket.started_at, ticket.closed_at)}
                  </span>
                </div>
              </div>
              ` : ''}
            </div>
          </div>
          
          ${ticket.solution_note ? `
          <div class="bg-gradient-to-r from-emerald-900/30 to-green-900/30 p-4 rounded-xl border border-emerald-700/30">
            <p class="text-xs text-emerald-300 font-bold uppercase mb-2">วิธีแก้ไข</p>
            <p class="text-sm text-gray-300 leading-relaxed">${ticket.solution_note}</p>
          </div>
          ` : ''}
          
          ${ticket.parts_used ? `
          <div class="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 p-4 rounded-xl border border-amber-700/30">
            <p class="text-xs text-amber-300 font-bold uppercase mb-2">อะไหล่ที่ใช้</p>
            <p class="text-sm text-white">${ticket.parts_used}</p>
          </div>
          ` : ''}
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${ticket.image_url ? `
            <div class="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700">
              <p class="text-xs text-gray-400 font-bold uppercase mb-3">รูปก่อนซ่อม</p>
              <img 
                src="${ticket.image_url}" 
                alt="Before" 
                class="w-full h-48 object-cover rounded-lg border border-gray-700 hover:scale-[1.02] transition-transform cursor-zoom-in"
                onclick="window.open('${ticket.image_url}', '_blank')"
              />
            </div>
            ` : ''}
            
            ${ticket.image_after_url ? `
            <div class="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700">
              <p class="text-xs text-gray-400 font-bold uppercase mb-3">รูปหลังซ่อม</p>
              <img 
                src="${ticket.image_after_url}" 
                alt="After" 
                class="w-full h-48 object-cover rounded-lg border border-gray-700 hover:scale-[1.02] transition-transform cursor-zoom-in"
                onclick="window.open('${ticket.image_after_url}', '_blank')"
              />
            </div>
            ` : ''}
          </div>
          
          ${ticket.status === 'CLOSED' && ticket.closed_by_name ? `
          <div class="bg-gradient-to-r from-emerald-900/30 to-green-900/30 p-4 rounded-xl border border-emerald-700/30">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-emerald-300 uppercase">ปิดงานโดย</p>
                <p class="text-sm font-medium text-white mt-1">${ticket.closed_by_name}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-emerald-300">รหัสพนักงาน</p>
                <p class="text-sm font-medium text-white">${ticket.assigned_employee_id || currentUser?.employeeId || 'ไม่ระบุ'}</p>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      `,
      width: 700,
      background: '#1f2937',
      color: '#fff',
      confirmButtonText: 'ปิด',
      confirmButtonColor: '#3b82f6',
      showCloseButton: true,
      customClass: {
        popup: 'rounded-2xl border border-gray-700',
        closeButton: 'text-gray-400 hover:text-white',
      },
    });
  };

  // Calculate duration between two dates
  const calculateDuration = (start, end) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = endTime - startTime;
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} ชม. ${minutes} นาที`;
    }
    return `${minutes} นาที`;
  };

  // Filter tickets
  const incomingTickets = tickets.filter(t => t.status === 'NEW');
  const myActiveTickets = tickets.filter(t => t.assigned_to === currentUser?.id && t.status === 'IN_PROGRESS');
  const historyTickets = tickets.filter(t => t.status === 'CLOSED');

  // Enhanced search filter
  const filteredTickets = (() => {
    let data = [];
    if (activeTab === 'INCOMING') data = incomingTickets;
    else if (activeTab === 'ACTIVE') data = myActiveTickets;
    else data = historyTickets;

    // Apply search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      data = data.filter(ticket => {
        const searchFields = [
          ticket.title,
          ticket.description,
          ticket.reporter_name,
          ticket.reporter_emp_id,
          ticket.reporter_dept,
          ticket.location,
          ticket.solution_note,
          ticket.parts_used,
          ticket.id?.toString()
        ].filter(Boolean);
        
        return searchFields.some(field => 
          field.toString().toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply date range filter for history tab
    if (activeTab === 'HISTORY' && dateRange.start && dateRange.end) {
      data = data.filter(ticket => {
        const ticketDate = new Date(ticket.closed_at || ticket.created_at);
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        
        return ticketDate >= start && ticketDate <= end;
      });
    }

    return data;
  })();

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'NEW': return 'text-rose-400';
      case 'IN_PROGRESS': return 'text-amber-400';
      case 'CLOSED': return 'text-emerald-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'NEW': return 'bg-gradient-to-r from-rose-900/30 to-pink-900/30 border-rose-700/30';
      case 'IN_PROGRESS': return 'bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-amber-700/30';
      case 'CLOSED': return 'bg-gradient-to-r from-emerald-900/30 to-green-900/30 border-emerald-700/30';
      default: return 'bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'NEW': return 'ใหม่';
      case 'IN_PROGRESS': return 'กำลังดำเนินการ';
      case 'CLOSED': return 'ปิดงานแล้ว';
      default: return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-rose-400';
      case 'normal': return 'text-amber-400';
      case 'low': return 'text-emerald-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'urgent': return 'ด่วนมาก';
      case 'normal': return 'สำคัญ';
      case 'low': return 'ปกติ';
      default: return priority;
    }
  };

  const getDeviceIcon = (deviceType) => {
    if (!deviceType) return <Monitor className="w-5 h-5 text-gray-400" />;
    
    const type = deviceType.toLowerCase();
    if (type.includes('laptop') || type.includes('notebook')) return <Laptop className="w-5 h-5 text-blue-400" />;
    if (type.includes('desktop') || type.includes('pc')) return <Monitor className="w-5 h-5 text-purple-400" />;
    if (type.includes('printer')) return <PrinterIcon className="w-5 h-5 text-amber-400" />;
    if (type.includes('server')) return <Server className="w-5 h-5 text-green-400" />;
    if (type.includes('router') || type.includes('network')) return <Router className="w-5 h-5 text-cyan-400" />;
    if (type.includes('phone') || type.includes('mobile')) return <Smartphone className="w-5 h-5 text-pink-400" />;
    if (type.includes('wifi') || type.includes('wireless')) return <WifiIcon className="w-5 h-5 text-indigo-400" />;
    return <Monitor className="w-5 h-5 text-gray-400" />;
  };

  // Date range picker component
  const DateRangePicker = () => {
    const today = new Date();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleApply = () => {
      if (startDate && endDate) {
        setDateRange({ start: startDate, end: endDate });
        setShowDateFilter(false);
      }
    };

    const handleClear = () => {
      setStartDate('');
      setEndDate('');
      setDateRange({ start: null, end: null });
      setShowDateFilter(false);
    };

    const quickPresets = [
      { label: 'วันนี้', days: 0 },
      { label: '7 วันที่ผ่านมา', days: -7 },
      { label: '30 วันที่ผ่านมา', days: -30 },
      { label: 'เดือนนี้', custom: () => {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: firstDay.toISOString().split('T')[0], end: lastDay.toISOString().split('T')[0] };
      }},
    ];

    const applyQuickPreset = (preset) => {
      if (preset.days !== undefined) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() + preset.days);
        
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
      } else if (preset.custom) {
        const dates = preset.custom();
        setStartDate(dates.start);
        setEndDate(dates.end);
      }
    };

    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700 p-5 absolute top-full right-0 mt-3 z-50 w-80 animate-slide-in-up">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-white text-lg">กรองตามวันที่</h3>
            <p className="text-xs text-gray-400 mt-1">เลือกช่วงเวลาที่ต้องการดู</p>
          </div>
          <button
            onClick={() => setShowDateFilter(false)}
            className="p-2 hover:bg-gray-700 rounded-xl transition-colors"
          >
            <XIcon size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">วันที่เริ่ม</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                max={endDate || today.toISOString().split('T')[0]}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">วันที่สิ้นสุด</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={startDate}
                max={today.toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-300 mb-3">เลือกเร็ว</p>
          <div className="grid grid-cols-2 gap-2">
            {quickPresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => applyQuickPreset(preset)}
                className="px-3 py-2.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all duration-300"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-800 hover:text-white transition-all duration-300"
          >
            ล้าง
          </button>
          <button
            onClick={handleApply}
            disabled={!startDate || !endDate}
            className={`flex-1 px-4 py-3 rounded-xl transition-all duration-300 ${
              startDate && endDate
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            ตกลง
          </button>
        </div>
      </div>
    );
  };

  // Calendar component
  const CalendarView = () => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const ticketsOnDate = (day) => {
      const date = new Date(today.getFullYear(), today.getMonth(), day);
      return tickets.filter(t => {
        const ticketDate = new Date(t.created_at);
        return ticketDate.getDate() === day &&
               ticketDate.getMonth() === today.getMonth() &&
               ticketDate.getFullYear() === today.getFullYear();
      }).length;
    };

    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-gray-700 p-5">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-white text-xl">
              {today.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-sm text-gray-400 mt-1">ปฏิทินงานซ่อม</p>
          </div>
          <button
            onClick={() => setShowCalendar(false)}
            className="p-2 hover:bg-gray-700 rounded-xl transition-colors"
          >
            <XIcon size={22} className="text-gray-400" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
            <div key={day} className="text-center py-2 text-sm font-bold text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => (
            <div
              key={index}
              className={`min-h-12 p-2 ${day ? 'cursor-pointer group' : ''}`}
              onClick={() => day && setSelectedDate(new Date(today.getFullYear(), today.getMonth(), day))}
            >
              {day && (
                <>
                  <div className={`relative text-center text-sm font-medium rounded-xl transition-all duration-300 ${
                    day === today.getDate() 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-300 group-hover:bg-gray-800'
                  }`}>
                    <div className="py-2">{day}</div>
                    {ticketsOnDate(day) > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        {ticketsOnDate(day) > 1 && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Sidebar component
  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:w-72`}>
      <div className="flex flex-col h-full">
        {/* Sidebar header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl">
              <Wrench size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">IT Technician</h1>
              <p className="text-xs text-gray-400">Dashboard Pro v4.0</p>
            </div>
          </div>
          
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-5 right-5 p-2 hover:bg-gray-700 rounded-lg"
          >
            <XIcon size={20} className="text-gray-400" />
          </button>
        </div>

        {/* User profile */}
        {currentUser && (
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-14 h-14 rounded-xl border-2 border-blue-500/30"
                />
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">{currentUser.name}</p>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                    {currentUser.employeeId}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{currentUser.department}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Phone size={12} className="text-gray-500" />
                  <p className="text-xs text-gray-500">{currentUser.phone}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 p-4 overflow-y-auto">
          <nav className="space-y-2">
            <button
              onClick={() => {
                setActiveTab('INCOMING');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'INCOMING' ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-300 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              <Bell size={20} />
              <span className="font-medium">งานใหม่</span>
              {incomingTickets.length > 0 && (
                <span className="ml-auto px-2 py-1 bg-blue-500 text-white text-xs rounded-full animate-pulse">
                  {incomingTickets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('ACTIVE');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'ACTIVE' ? 'bg-gradient-to-r from-amber-600/20 to-yellow-600/20 text-amber-300 border border-amber-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              <Activity size={20} />
              <span className="font-medium">กำลังทำ</span>
              {myActiveTickets.length > 0 && (
                <span className="ml-auto px-2 py-1 bg-amber-500 text-white text-xs rounded-full">
                  {myActiveTickets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('HISTORY');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'HISTORY' ? 'bg-gradient-to-r from-emerald-600/20 to-green-600/20 text-emerald-300 border border-emerald-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              <History size={20} />
              <span className="font-medium">ประวัติ</span>
              {historyTickets.length > 0 && (
                <span className="ml-auto px-2 py-1 bg-emerald-500 text-white text-xs rounded-full">
                  {historyTickets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setShowCalendar(true);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-300"
            >
              <CalendarIcon size={20} />
              <span className="font-medium">ปฏิทิน</span>
            </button>

            <button
              onClick={() => {
                setShowDateFilter(!showDateFilter);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-300"
            >
              <Filter size={20} />
              <span className="font-medium">ตัวกรอง</span>
            </button>
          </nav>

          {/* Stats summary in sidebar */}
          <div className="mt-8 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-gray-700">
            <h4 className="text-sm font-bold text-gray-300 mb-3">สรุปสถิติ</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">เสร็จวันนี้</span>
                <span className="text-sm font-bold text-emerald-400">{stats.todayCompleted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">งานด่วน</span>
                <span className="text-sm font-bold text-rose-400">{stats.urgentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">เวลาเฉลี่ย</span>
                <span className="text-sm font-bold text-blue-400">{stats.responseTime} นาที</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logout button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-rose-900/30 hover:to-pink-900/30 text-gray-300 hover:text-rose-300 border border-gray-700 hover:border-rose-700/30 rounded-xl transition-all duration-300"
          >
            <LogOut size={18} />
            <span className="font-medium">ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Render ticket list
  const renderTicketList = () => {
    if (loading && tickets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Wrench className="w-8 h-8 text-blue-400 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-400 font-medium mt-4 animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
      );
    }

    if (filteredTickets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-700">
            <Search size={40} className="text-gray-600" />
          </div>
          <p className="text-lg font-medium text-gray-300">ไม่พบรายการงาน</p>
          <p className="text-sm mt-2 text-gray-500 text-center">
            {searchQuery || (activeTab === 'HISTORY' && dateRange.start) 
              ? 'ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง' 
              : 'พักผ่อนรอเสียงแจ้งเตือนได้เลย'}
          </p>
          {(searchQuery || (activeTab === 'HISTORY' && dateRange.start)) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDateRange({ start: null, end: null });
              }}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg"
            >
              ล้างการค้นหา
            </button>
          )}
        </div>
      );
    }

    return (
      
      <div className="space-y-4 pb-24">
        {filteredTickets.map((ticket, index) => (
          <div 
            key={ticket.id} 
            className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-gray-700 overflow-hidden animate-fade-in-up`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Status header */}
            <div className={`px-5 py-4 ${getStatusBgColor(ticket.status)} border-b border-gray-700`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${ticket.status === 'NEW' ? 'bg-rose-500/20' : ticket.status === 'IN_PROGRESS' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                    {getDeviceIcon(ticket.device_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-300 bg-gray-800 px-2 py-1 rounded-md border border-gray-700">
                        TICKET #{ticket.id.toString().slice(-6)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${ticket.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : ticket.priority === 'normal' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                        {getPriorityText(ticket.priority)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-2 line-clamp-2">{ticket.title}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <p className="text-xs font-medium text-gray-300">
                      {new Date(ticket.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(ticket.created_at).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'})}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              {/* Reporter info with detailed information */}
              <div className="mb-5 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {ticket.reporter_name?.charAt(0) || 'U'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                      <UserCheck size={10} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <p className="text-sm font-bold text-white">{ticket.reporter_name || 'ไม่ระบุชื่อ'}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                          รหัส: {ticket.reporter_emp_id || 'ไม่ระบุ'}
                        </span>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                          แผนก: {ticket.reporter_dept || 'ไม่ระบุ'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {ticket.reporter_phone && (
                        <div className="flex items-center gap-1">
                          <Phone size={12} className="text-gray-400" />
                          <p className="text-xs text-gray-300">{ticket.reporter_phone}</p>
                        </div>
                      )}
                      {ticket.reporter_email && (
                        <div className="flex items-center gap-1">
                          <Mail size={12} className="text-gray-400" />
                          <p className="text-xs text-gray-300 truncate max-w-[150px]">{ticket.reporter_email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps timeline */}
              <div className="mb-5 p-4 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-xl border border-blue-700/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <p className="text-xs text-blue-300 font-medium">แจ้งเมื่อ</p>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {new Date(ticket.created_at).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(ticket.created_at).toLocaleDateString('th-TH', {day:'numeric', month:'short'})}
                    </p>
                  </div>
                  
                  {ticket.started_at && (
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <p className="text-xs text-amber-300 font-medium">รับงานเมื่อ</p>
                      </div>
                      <p className="text-sm font-bold text-white">
                        {new Date(ticket.started_at).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(ticket.started_at).toLocaleDateString('th-TH', {day:'numeric', month:'short'})}
                      </p>
                    </div>
                  )}
                  
                  {ticket.closed_at && (
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <p className="text-xs text-emerald-300 font-medium">ปิดงานเมื่อ</p>
                      </div>
                      <p className="text-sm font-bold text-white">
                        {new Date(ticket.closed_at).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(ticket.closed_at).toLocaleDateString('th-TH', {day:'numeric', month:'short'})}
                      </p>
                    </div>
                  )}
                </div>
                
                {ticket.started_at && ticket.closed_at && (
                  <div className="mt-4 pt-4 border-t border-blue-800/30">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-sm text-gray-300">ระยะเวลาซ่อม:</span>
                      <span className="text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1 rounded-full">
                        {calculateDuration(ticket.started_at, ticket.closed_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Location and description */}
              <div className="space-y-4 mb-5">
                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-gray-700">
                  <MapPin size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{ticket.location || 'ไม่ระบุสถานที่'}</p>
                    {ticket.ip_address && (
                      <div className="flex items-center gap-2 mt-2">
                        <Server size={12} className="text-green-400" />
                        <p className="text-xs text-gray-400 font-mono">IP: {ticket.ip_address}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleOpenNavigation(ticket.location)}
                    className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="เปิดการนำทาง"
                  >
                    <Navigation size={16} className="text-blue-400" />
                  </button>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare size={16} className="text-gray-400" />
                    <p className="text-xs text-gray-400 font-bold uppercase">รายละเอียดปัญหา</p>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">"{ticket.description}"</p>
                </div>

                {/* Images preview */}
                {(ticket.image_url || ticket.image_after_url) && (
                  <div className="flex gap-3">
                    {ticket.image_url && (
                      <div className="relative flex-1 group">
                        <img
                          src={ticket.image_url}
                          alt="Before"
                          className="w-full h-32 object-cover rounded-xl border border-gray-700 group-hover:scale-[1.02] transition-transform"
                        />
                        <span className="absolute bottom-2 right-2 px-2 py-1 bg-gray-900/80 text-gray-300 text-xs rounded-lg border border-gray-700">
                          Before
                        </span>
                      </div>
                    )}
                    {ticket.image_after_url && (
                      <div className="relative flex-1 group">
                        <img
                          src={ticket.image_after_url}
                          alt="After"
                          className="w-full h-32 object-cover rounded-xl border border-gray-700 group-hover:scale-[1.02] transition-transform"
                        />
                        <span className="absolute bottom-2 right-2 px-2 py-1 bg-emerald-900/80 text-emerald-300 text-xs rounded-lg border border-emerald-700">
                          After
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-6">
                {ticket.status === 'NEW' && (
                  <button
                    onClick={() => handleAcceptJob(ticket.id)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                  >
                    <CheckCircle size={20} />
                    <span>รับงานนี้</span>
                  </button>
                )}

                {ticket.status === 'IN_PROGRESS' && ticket.assigned_to === currentUser?.id && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleOpenNavigation(ticket.location)}
                      className="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-800 hover:text-white hover:border-blue-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Navigation size={18} />
                      <span>นำทาง</span>
                    </button>
                    <button
                      onClick={() => handleCloseJob(ticket)}
                      className="flex-[2] bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-xl font-bold hover:from-emerald-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <Camera size={20} />
                      <span>บันทึกและปิดงาน</span>
                    </button>
                  </div>
                )}

                {ticket.status === 'CLOSED' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-400">
                        <span className="font-medium">ระยะเวลา: </span>
                        <span className="text-white">
                          {ticket.started_at && ticket.closed_at ? calculateDuration(ticket.started_at, ticket.closed_at) : 'ไม่ระบุ'}
                        </span>
                      </div>
                      {ticket.closed_by_name && (
                        <div className="text-gray-400">
                          <span className="font-medium">ช่าง: </span>
                          <span className="text-white">{ticket.closed_by_name}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => handleViewDetails(ticket)}
                        className="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-800 hover:text-white border border-gray-700 hover:border-blue-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <Eye size={18} />
                        <span>ดูรายละเอียด</span>
                      </button>
                      <button
                        onClick={() => handleOpenNavigation(ticket.location)}
                        className="flex-1 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 text-blue-300 py-3 rounded-xl font-medium hover:bg-blue-900/50 border border-blue-700/30 hover:border-blue-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <Navigation size={18} />
                        <span>ดูที่ตั้ง</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTicket(ticket)}
                        className="flex-1 bg-gradient-to-r from-rose-900/30 to-pink-900/30 text-rose-300 py-3 rounded-xl font-medium hover:bg-rose-900/50 border border-rose-700/30 hover:border-rose-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <Trash2 size={18} />
                        <span>ลบประวัติ</span>
                      </button>
                    </div>
                  </div>
                )}

                {ticket.status === 'IN_PROGRESS' && ticket.assigned_to !== currentUser?.id && (
                  <div className="text-center py-4 text-gray-400 text-sm border-t border-gray-800">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center text-white">
                        <UserCheck size={14} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">กำลังดำเนินการโดย: {ticket.assigned_name || 'ผู้ปฏิบัติงานอื่น'}</p>
                        <p className="text-xs text-gray-500 mt-1">รหัสพนักงาน: {ticket.assigned_employee_id || 'ไม่ระบุ'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="lg:ml-72">
        {/* Top header */}
        <header className="sticky top-0 z-40 bg-gradient-to-r from-gray-900 to-gray-950 border-b border-gray-800">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 hover:bg-gray-800 rounded-xl"
                >
                  <Menu size={24} className="text-gray-400" />
                </button>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    IT Technician Dashboard
                  </h1>
                  <p className="text-xs text-gray-400">ระบบบริหารงานซ่อมบำรุงไอที</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Online status */}
                <button
                  onClick={() => setIsOnline(!isOnline)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${isOnline 
                    ? 'bg-gradient-to-r from-emerald-900/30 to-green-900/30 border-emerald-700/50 text-emerald-300 shadow-lg' 
                    : 'bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700 text-gray-400'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-bold">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </button>
                
                {/* Notifications */}
                <button
                  onClick={() => {
                    setActiveTab('INCOMING');
                    setNotificationCount(0);
                  }}
                  className="relative p-2 hover:bg-gray-800 rounded-xl transition-colors"
                  title="แจ้งเตือนงานใหม่"
                >
                  <Bell size={22} className="text-gray-400" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs rounded-full flex items-center justify-center animate-bounce">
                      {notificationCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className="mt-4 relative">
              <div className="relative flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="text"
                    placeholder="ค้นหา ticket, ชื่อผู้แจ้ง, แผนก, สถานที่, วิธีแก้ไข..."
                    className="w-full pl-12 pr-10 py-3 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white placeholder-gray-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
                
                {activeTab === 'HISTORY' && (
                  <div className="relative">
                    <button
                      onClick={() => setShowDateFilter(!showDateFilter)}
                      className={`px-4 py-3 border rounded-xl transition-all duration-300 flex items-center gap-2 ${
                        dateRange.start 
                          ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-700/50 text-blue-300' 
                          : 'bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700 text-gray-400 hover:text-white hover:border-blue-500/50'
                      }`}
                    >
                      <CalendarIcon size={18} />
                      <span className="hidden sm:inline">กรองวันที่</span>
                    </button>
                    
                    {showDateFilter && <DateRangePicker />}
                  </div>
                )}
              </div>
              
              {/* Active filters display */}
              {(searchQuery || dateRange.start) && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-xs text-gray-500">ตัวกรอง:</span>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 text-blue-300 text-xs rounded-xl border border-blue-700/30">
                      ค้นหา: {searchQuery}
                      <button onClick={() => setSearchQuery('')} className="hover:text-blue-100">
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {dateRange.start && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-900/30 to-green-900/30 text-emerald-300 text-xs rounded-xl border border-emerald-700/30">
                      วันที่: {new Date(dateRange.start).toLocaleDateString('th-TH')} - {new Date(dateRange.end).toLocaleDateString('th-TH')}
                      <button onClick={() => setDateRange({ start: null, end: null })} className="hover:text-emerald-100">
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Stats cards */}
        <div className="px-4 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Completed today */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 border border-gray-700 hover:border-emerald-700/50 transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">เสร็จวันนี้</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-2">{stats.todayCompleted}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp size={14} className="text-emerald-400" />
                    <span className="text-xs text-gray-500">จากเมื่อวาน +2</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle className="text-emerald-400" size={24} />
                </div>
              </div>
            </div>

            {/* Pending tickets */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 border border-gray-700 hover:border-rose-700/50 transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">งานรอรับ</p>
                  <p className="text-3xl font-bold text-rose-400 mt-2">{incomingTickets.length}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <AlertCircle size={14} className="text-rose-400" />
                    <span className="text-xs text-gray-500">ด่วน {stats.urgentCount} รายการ</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-rose-500/30">
                  <Bell className="text-rose-400" size={24} />
                </div>
              </div>
            </div>

            {/* In progress */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 border border-gray-700 hover:border-amber-700/50 transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">กำลังทำ</p>
                  <p className="text-3xl font-bold text-amber-400 mt-2">{myActiveTickets.length}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Activity size={14} className="text-amber-400" />
                    <span className="text-xs text-gray-500">ของคุณเท่านั้น</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center border border-amber-500/30">
                  <Wrench className="text-amber-400" size={24} />
                </div>
              </div>
            </div>

            {/* Average response time */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 border border-gray-700 hover:border-blue-700/50 transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">เวลาเฉลี่ย</p>
                  <p className="text-3xl font-bold text-blue-400 mt-2">{stats.responseTime} นาที</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock size={14} className="text-blue-400" />
                    <span className="text-xs text-gray-500">เฉลี่ยต่องาน</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                  <Clock className="text-blue-400" size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar view */}
        {showCalendar && (
          <div className="px-4 py-4">
            <CalendarView />
          </div>
        )}

        {/* Tab navigation */}
        <div className="px-4 py-4">
          <div className="flex space-x-2 bg-gradient-to-r from-gray-800 to-gray-900 p-2 rounded-2xl border border-gray-700">
            {[
              { id: 'INCOMING', label: 'งานใหม่', icon: Bell, count: incomingTickets.length, color: 'blue' },
              { id: 'ACTIVE', label: 'กำลังทำ', icon: Activity, count: myActiveTickets.length, color: 'amber' },
              { id: 'HISTORY', label: 'ประวัติ', icon: History, count: historyTickets.length, color: 'emerald' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 py-3.5 rounded-xl transition-all duration-300 ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r from-${tab.color}-600 to-${tab.color === 'blue' ? 'indigo' : tab.color === 'amber' ? 'yellow' : 'green'}-600 text-white shadow-lg`
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <tab.icon size={20} />
                <span className="font-medium text-sm">{tab.label}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="px-4 py-2 pb-32">
          {renderTicketList()}
        </div>

        {/* Bottom navigation for mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-gray-950 border-t border-gray-800 px-4 py-3 z-50 shadow-2xl">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/')}
              className={`flex flex-col items-center p-2 transition-all duration-300 ${activeTab === 'INCOMING' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Home size={22} />
              <span className="text-xs mt-1">หน้าหลัก</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('INCOMING');
                setSidebarOpen(false);
              }}
              className={`flex flex-col items-center p-2 transition-all duration-300 ${activeTab === 'INCOMING' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Bell size={22} />
              <span className="text-xs mt-1">งานใหม่</span>
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-4 w-2 h-2 bg-rose-500 rounded-full"></span>
              )}
            </button>
            
            <button
              onClick={() => {
                setActiveTab('ACTIVE');
                setSidebarOpen(false);
              }}
              className={`flex flex-col items-center p-2 transition-all duration-300 ${activeTab === 'ACTIVE' ? 'text-amber-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Wrench size={22} />
              <span className="text-xs mt-1">กำลังทำ</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('HISTORY');
                setSidebarOpen(false);
              }}
              className={`flex flex-col items-center p-2 transition-all duration-300 ${activeTab === 'HISTORY' ? 'text-emerald-400' : 'text-gray-400 hover:text-white'}`}
            >
              <History size={22} />
              <span className="text-xs mt-1">ประวัติ</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="flex flex-col items-center p-2 text-gray-400 hover:text-rose-400 transition-all duration-300"
            >
              <LogOut size={22} />
              <span className="text-xs mt-1">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slide-out-right {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        @keyframes slide-in-up {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fade-in-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .animate-slide-out-right {
          animation: slide-out-right 0.3s ease-in;
        }
        
        .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out;
        }
        
        /* Smooth scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        
        /* Selection color */
        ::selection {
          background: rgba(59, 130, 246, 0.3);
          color: white;
        }
      `}</style>
    </div>
  );
};

export default ITDashboard;