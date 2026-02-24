import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  ArrowLeft,
  Monitor, Wifi, ShieldCheck, ShoppingCart,
  Server, FileText, Upload, X, CheckCircle,
  Loader2, ChevronRight, LayoutGrid, Search,
  Download, Laptop, MapPin, User, Building,
  Phone, Mail, Calendar, Briefcase
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { generateITRequestPDF } from '../utils/pdfGenerator';


// --- Configuration: Service Catalog ---
const SERVICE_CATALOG = [
  {
    id: 'hardware',
    title: 'Hardware & Equipment',
    subtitle: 'อุปกรณ์คอมพิวเตอร์และฮาร์ดแวร์',
    icon: <Monitor className="w-6 h-6 text-blue-600" />,
    actions: [
      { id: 'req_new_device', label: 'เบิกอุปกรณ์ใหม่ (New Equipment)' },
      { id: 'req_replacement', label: 'ขอเปลี่ยนเครื่องทดแทน (Replacement)' },
      { id: 'req_repair', label: 'แจ้งซ่อมอุปกรณ์ (Repair)' },
      { id: 'req_peripherals', label: 'อุปกรณ์ต่อพ่วง (Mouse/Keyboard)' },
      { id: 'req_laptop_gps', label: '🔒 ขอยืมโน้ตบุ๊ค GPS Tracking' },
    ]
  },
  {
    id: 'software',
    title: 'Software & Application',
    subtitle: 'โปรแกรมและการติดตั้ง',
    icon: <LayoutGrid className="w-6 h-6 text-indigo-600" />,
    actions: [
      { id: 'req_install_sw', label: 'ติดตั้งโปรแกรมใหม่ (Install Software)' },
      { id: 'req_license', label: 'ขอ License / ต่ออายุ' },
      { id: 'req_os_issue', label: 'ปัญหา Windows/OS' },
    ]
  },
  {
    id: 'network',
    title: 'Network & Access',
    subtitle: 'เครือข่ายและสิทธิ์การเข้าถึง',
    icon: <Wifi className="w-6 h-6 text-emerald-600" />,
    actions: [
      { id: 'req_wifi_guest', label: 'ขอรหัส WiFi (Guest)' },
      { id: 'req_vpn', label: 'ขอใช้งาน VPN (Remote Work)' },
      { id: 'req_folder_access', label: 'ขอสิทธิ์เข้าถึง Folder/Server' },
      { id: 'req_domain', label: 'Reset Password / Domain User' },
    ]
  },
  {
    id: 'security',
    title: 'Security & CCTV',
    subtitle: 'ความปลอดภัยและกล้องวงจรปิด',
    icon: <ShieldCheck className="w-6 h-6 text-rose-600" />,
    actions: [
      { id: 'req_cctv_install', label: 'ติดตั้งกล้องวงจรปิดใหม่' },
      { id: 'req_cctv_view', label: 'ขอดูย้อนหลัง CCTV' },
      { id: 'req_access_card', label: 'บัตรผ่านเข้า-ออก (Access Card)' },
    ]
  },
  {
    id: 'procurement',
    title: 'IT Procurement',
    subtitle: 'การจัดซื้อและงบประมาณ',
    icon: <ShoppingCart className="w-6 h-6 text-orange-600" />,
    actions: [
      { id: 'req_purchase', label: 'ขอจัดซื้อ (PR) อุปกรณ์ไอท' },
      { id: 'req_quotation', label: 'ขอใบเสนอราคา (Quotation)' },
    ]
  },
  {
    id: 'other',
    title: 'General Requests',
    subtitle: 'คำขอทั่วไป',
    icon: <Server className="w-6 h-6 text-slate-500" />,
    actions: [
      { id: 'req_consult', label: 'ปรึกษาปัญหาไอท (Consult)' },
      { id: 'req_relocate', label: 'ย้ายจุดทำงาน (Relocate)' },
    ]
  },
];

const PickUpEquipment = () => {
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    location: '',
    priority: 'Normal',
    requesterName: '',
    requesterEmail: '',
    requesterPhone: '',
    // GPS Laptop specific fields
    borrowStartDate: '',
    borrowEndDate: '',
    purposeOfUse: '',
    laptopSerialNumber: '',
  });

  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Load user profile from Supabase
  useEffect(() => {
    let isMounted = true;

    const checkSessionAndLoadProfile = async () => {
      try {
        setProfileLoading(true);

        // 1. Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          // No need to navigate here, ProtectedRoute handles it
          return;
        }

        const user = session.user;

        // 2. Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        const email = user.email;
        const username = email.split('@')[0];
        const derivedEmpId = username.replace(/\D/g, '') || 'EMP-0000';

        const userData = {
          id: user.id,
          name: profileData?.full_name || user.user_metadata?.full_name || username.toUpperCase(),
          email: user.email,
          employeeId: profileData?.employee_code || user.user_metadata?.employee_code || derivedEmpId,
          department: profileData?.department || user.user_metadata?.department || 'ไม่ระบุแผนก',
          position: profileData?.position || user.user_metadata?.position || 'พนักงาน',
          avatar: profileData?.avatar_url || profileData?.id_card_url || user.user_metadata?.avatar_url || user.user_metadata?.picture,
          phone: profileData?.phone || user.user_metadata?.phone || '-',
        };

        setCurrentUser(userData);

        setFormData(prev => ({
          ...prev,
          requesterName: userData.name,
          requesterEmail: userData.email,
          requesterPhone: userData.phone,
          department: userData.department,
        }));

      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    };

    checkSessionAndLoadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenForm = (category, action) => {
    setSelectedRequest({ ...action, categoryName: category.title });
    setFormData(prev => ({
      ...prev,
      title: action.label,
      // Reset GPS-specific fields
      borrowStartDate: '',
      borrowEndDate: '',
      purposeOfUse: '',
      laptopSerialNumber: '',
    }));
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTimeout(() => setSelectedRequest(null), 300);
  };



  // Handle file selection
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);

    // Validate file size (max 5MB per file)
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`ไฟล์ ${file.name} ใหญ่เกิน 5MB`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  // Remove selected file
  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload files to Supabase Storage
  const uploadFiles = async (ticketId) => {
    if (selectedFiles.length === 0) return [];

    setIsUploading(true);
    const uploadedUrls = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${ticketId}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `ticket-attachments/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('it-service-attachments')
          .upload(filePath, file);

        if (error) {
          console.error('Upload error:', error);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('it-service-attachments')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Quick session check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('เซสชันของคุณหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      navigate('/');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for Supabase
      const ticketData = {
        title: formData.title,
        description: formData.description,
        department: formData.department,
        location: formData.location,
        priority: formData.priority.toLowerCase(),
        reporter_name: formData.requesterName,
        reporter_email: formData.requesterEmail,
        reporter_phone: formData.requesterPhone,
        status: 'NEW',
        category: selectedRequest?.categoryName || 'General',
        service_type: selectedRequest?.id || 'other',
        // ✅ FIX: Add creator_id
        creator_id: currentUser?.id,
        // GPS Laptop specific
        borrow_start_date: formData.borrowStartDate || null,
        borrow_end_date: formData.borrowEndDate || null,
        purpose_of_use: formData.purposeOfUse || null,
        laptop_serial_number: formData.laptopSerialNumber || null,
        created_at: new Date().toISOString(),
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('tickets')
        .insert([ticketData])
        .select();

      if (error) throw error;

      const newTicket = data[0];

      // Upload files if any
      let attachmentUrls = [];
      if (selectedFiles.length > 0) {
        attachmentUrls = await uploadFiles(newTicket.id);

        // Update ticket with attachment URLs
        if (attachmentUrls.length > 0) {
          await supabase
            .from('tickets')
            .update({ attachment_urls: attachmentUrls })
            .eq('id', newTicket.id);
        }
      }

      // Generate PDF
      await generateITRequestPDF(formData, selectedRequest, currentUser);

      setIsSubmitting(false);
      handleCloseForm();

      // Reset file selection
      setSelectedFiles([]);
      setUploadProgress(0);

      // Success notification
      const fileInfo = selectedFiles.length > 0 ? `\nไฟล์แนบ: ${selectedFiles.length} ไฟล์` : '';
      alert(`✅ บันทึกข้อมูลสำเร็จ!\n\nคำร้องของคุณถูกส่งแล้ว\nไฟล์ PDF ได้ถูกดาวน์โหลดแล้ว${fileInfo}\n\nระบบจะนำท่านไปยังหน้า IT Dashboard`);

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Error submitting request:', error);
      setIsSubmitting(false);
      alert('❌ เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">กำลังโหลดข้อมูลผู้ใช้...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-800 font-sans selection:bg-blue-100 pb-20">

      {/* --- 1. Header (CreateTicket Style) --- */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/90 border-b border-slate-200/60 shadow-lg transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-200/80 bg-white/90 p-2.5 text-slate-700 shadow-sm transition-all hover:shadow-md hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 sm:text-xl">
                  IT Service Desk
                </h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                  Standard
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                สร้างคำขอแจ้งซ่อม • ระบบมาตรฐานองค์กร
              </p>
            </div>
          </div>

          {/* User Profile Display */}
          <div className="hidden md:flex items-center gap-6">
            <div className="relative hidden lg:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาบริการ..."
                className="pl-10 pr-4 py-2.5 bg-slate-100/80 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all w-64 backdrop-blur"
              />
            </div>
            <div className="h-10 w-px bg-slate-200"></div>

            {/* User Info Card */}
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 shadow-sm hover:shadow-md transition-all">
              <div className="text-right hidden xl:block">
                <div className="text-sm font-bold text-slate-800">{currentUser?.name || 'Loading...'}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {currentUser?.department || '-'}
                </div>
              </div>
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 shadow-lg">
                  <div className="w-full h-full rounded-full bg-white overflow-hidden">
                    {currentUser?.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- 2. Main Content --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Page Title with User Greeting */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-1 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"></div>
            <h2 className="text-4xl font-bold text-slate-900">
              สวัสดี, {currentUser?.name?.split(' ')[0] || 'คุณ'} 👋
            </h2>
          </div>
          <p className="text-slate-600 max-w-3xl text-lg font-light ml-15">
            ระบบรับแจ้งปัญหาและคำร้องขอบริการด้านไอที พร้อมระบบติดตาม GPS และการออกเอกสาร PDF อัตโนมัติ
          </p>

          {/* User Quick Info */}
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-sm">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">{currentUser?.position}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-sm">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-slate-700">{currentUser?.email}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-sm">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-slate-700">{currentUser?.phone || 'ไม่ระบุ'}</span>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {SERVICE_CATALOG.map((category) => (
            <div
              key={category.id}
              className="group flex flex-col bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-lg hover:shadow-2xl hover:shadow-blue-200/50 hover:border-blue-300 transition-all duration-500 overflow-hidden hover:-translate-y-1"
            >
              {/* Card Header */}
              <div className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-br from-slate-50/50 to-white/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3.5 bg-white rounded-2xl shadow-md border border-slate-100 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    {category.icon}
                  </div>
                  <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    {category.actions.length} บริการ
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{category.title}</h3>
                <p className="text-sm text-slate-500">{category.subtitle}</p>
              </div>

              {/* Action Buttons List */}
              <div className="p-4 flex-1 flex flex-col gap-2 bg-gradient-to-b from-white to-slate-50/30">
                {category.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleOpenForm(category, action)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium text-slate-700 transition-all flex items-center justify-between group/btn border border-transparent
                      ${action.id === 'req_laptop_gps'
                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-emerald-200 shadow-sm'
                        : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 hover:border-blue-200'
                      }`}
                  >
                    <span>{action.label}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all text-blue-600" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- 3. Enhanced Modal Form --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">

          {/* Backdrop with Blur */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
            onClick={!isSubmitting ? handleCloseForm : undefined}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden ring-1 ring-slate-900/10">

            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-3 py-1.5 rounded-lg shadow-sm">
                  {selectedRequest?.categoryName}
                </span>
                <h3 className="mt-3 text-2xl font-bold text-slate-900">{selectedRequest?.label}</h3>
                {selectedRequest?.id === 'req_laptop_gps' && (
                  <p className="mt-2 text-sm text-emerald-600 flex items-center gap-2">
                    <Laptop className="w-4 h-4" />
                    <span className="font-medium">✓ พร้อมระบบติดตาม GPS Real-time</span>
                  </p>
                )}
              </div>
              {!isSubmitting && (
                <button
                  onClick={handleCloseForm}
                  className="p-2.5 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition-all hover:rotate-90 duration-300"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Scrollable Form Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar bg-white">
              <form id="requestForm" onSubmit={handleSubmit} className="space-y-6">

                {/* User Info Display (Read-only) */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    ข้อมูลผู้ขอใช้บริการ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500 text-xs">ชื่อ-นามสกุล</span>
                      <p className="font-semibold text-slate-800">{currentUser?.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">รหัสพนักงาน</span>
                      <p className="font-semibold text-slate-800">{currentUser?.employeeId}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">แผนก</span>
                      <p className="font-semibold text-slate-800">{currentUser?.department}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">ตำแหน่ง</span>
                      <p className="font-semibold text-slate-800">{currentUser?.position}</p>
                    </div>
                  </div>
                </div>

                {/* Section: Request Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      หัวข้อ (Subject) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      required
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      ระดับความสำคัญ (Priority) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white"
                    >
                      <option value="Low">🟢 Low (รอได้ภายใน 3-5 วัน)</option>
                      <option value="Normal">🔵 Normal (มาตรฐาน 24 ชม.)</option>
                      <option value="High">🟡 High (ด่วน 4 ชม.)</option>
                      <option value="Critical">🔴 Critical (ฉุกเฉิน ทันที)</option>
                    </select>
                  </div>
                </div>

                {/* GPS Laptop Specific Fields */}
                {selectedRequest?.id === 'req_laptop_gps' && (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border-2 border-emerald-200 space-y-4">
                    <h4 className="text-sm font-bold text-emerald-700 mb-4 flex items-center gap-2">
                      <Laptop className="w-4 h-4" />
                      ข้อมูลการยืมโน้ตบุ๊ค GPS Tracking
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          วันที่ยืม <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.borrowStartDate}
                          onChange={e => setFormData({ ...formData, borrowStartDate: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                          required={selectedRequest?.id === 'req_laptop_gps'}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          วันที่คืน <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.borrowEndDate}
                          onChange={e => setFormData({ ...formData, borrowEndDate: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                          required={selectedRequest?.id === 'req_laptop_gps'}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        วัตถุประสงค์การใช้งาน <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows="3"
                        value={formData.purposeOfUse}
                        onChange={e => setFormData({ ...formData, purposeOfUse: e.target.value })}
                        placeholder="ระบุวัตถุประสงค์ เช่น ไปประชุมลูกค้า, งานนอกสถานที่, ฯลฯ"
                        className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none"
                        required={selectedRequest?.id === 'req_laptop_gps'}
                      ></textarea>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-emerald-200">
                      <p className="text-xs text-emerald-700 flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>หมายเหตุ:</strong> โน้ตบุ๊กจะถูกติดตั้งระบบ GPS Tracking สามารถติดตามตำแหน่งได้แบบ Real-time
                          เพื่อความปลอดภัยและการจัดการทรัพย์สินขององค์กร
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Section: Location Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      <Building className="w-4 h-4 text-blue-600" />
                      แผนก (Department) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Ex. Marketing"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      สถานที่ (Location) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ex. Building A, 3rd Floor, Desk 301"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Section: Details */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <FileText className="w-4 h-4 text-blue-600" />
                    รายละเอียดเพิ่มเติม (Description) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="5"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="กรุณาระบุรายละเอียดให้ชัดเจน เช่น หมายเลขเครื่อง, รุ่น, อาการที่พบ, ความต้องการเฉพาะ..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
                    required
                  ></textarea>
                </div>

                {/* File Upload UI */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <Upload className="w-4 h-4 text-blue-600" />
                    รูปภาพประกอบ (Attachment)
                  </label>

                  {/* File Input */}
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <label
                    htmlFor="file-upload"
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-400 transition-all cursor-pointer bg-slate-50/50 group block"
                  >
                    <Upload className="w-10 h-10 text-slate-400 mb-3 group-hover:text-blue-500 transition-colors" />
                    <p className="text-sm text-slate-600 font-medium">ลากไฟล์มาวาง หรือ คลิกเพื่ออัพโหลด</p>
                    <p className="text-xs text-slate-400 mt-1">รองรับ JPG, PNG, PDF (Max 5MB)</p>
                  </label>

                  {/* Selected Files List */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-semibold text-slate-700">ไฟล์ที่เลือก ({selectedFiles.length})</p>
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                              <p className="text-xs text-slate-500">
                                {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                          >
                            <X className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-700">กำลังอัพโหลด...</span>
                        <span className="text-sm font-bold text-blue-700">{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* PDF Export Notice */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 flex items-start gap-3">
                  <Download className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">การออกเอกสาร PDF อัตโนมัติ</p>
                    <p className="text-xs text-blue-700 mt-1">
                      เมื่อกดยืนยัน ระบบจะสร้างเอกสารคำร้องขอบริการในรูปแบบ PDF พร้อมข้อมูลครบถ้วนและลายเซ็นดิจิทัล
                    </p>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer (Sticky Bottom) */}
            <div className="p-6 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                <span className="font-semibold">หมายเหตุ:</span> กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนส่ง
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:shadow-md border-2 border-slate-200 hover:border-slate-300 transition-all disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  form="requestForm"
                  disabled={isSubmitting}
                  className="min-w-[180px] px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 active:scale-95 transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      ยืนยันและออก PDF
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div >
      )}
    </div >
  );
};

export default PickUpEquipment;
