import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { insertTicketWithSchemaFallback } from '../lib/ticketSchemaCompat';
import { useScopedI18n } from '../i18n/useScopedI18n';
import {
  ArrowLeft,
  Monitor, Wifi, ShieldCheck, ShoppingCart,
  Server, FileText, Upload, X, CheckCircle,
  Loader2, ChevronRight, LayoutGrid, Search,
  Download, Laptop, MapPin, User, Building,
  Phone, Mail, Calendar, Briefcase, ListChecks
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

const PICK_UP_EQUIPMENT_TRANSLATIONS = {
  th: {
    headerSubtitle: 'สร้างคำขอแจ้งซ่อม • ระบบมาตรฐานองค์กร',
    searchPlaceholder: 'ค้นหาบริการ...',
    loadingUser: 'กำลังโหลดข้อมูลผู้ใช้...',
    loadingUserName: 'กำลังโหลด...',
    unknownDepartment: 'ไม่ระบุแผนก',
    unknownPhone: 'ไม่ระบุ',
    employeeFallback: 'พนักงาน',
    greeting: 'สวัสดี, {{name}} 👋',
    intro: 'ระบบรับแจ้งปัญหาและคำร้องขอบริการด้านไอที พร้อมระบบติดตาม GPS และปุ่มออกเอกสาร PDF เมื่อต้องการ',
    myRequests: 'การเบิกของคุณ',
    myRequestsHint: 'ดูรายการและสถานะการเบิกทั้งหมด',
    servicesCount: '{{count}} บริการ',
    gpsReady: '✓ พร้อมระบบติดตาม GPS Real-time',
    requesterInfo: 'ข้อมูลผู้ขอใช้บริการ',
    fullName: 'ชื่อ-นามสกุล',
    employeeCode: 'รหัสพนักงาน',
    department: 'แผนก',
    position: 'ตำแหน่ง',
    subject: 'หัวข้อ (Subject)',
    priority: 'ระดับความสำคัญ (Priority)',
    priorityOptions: {
      Low: '🟢 Low (รอได้ภายใน 3-5 วัน)',
      Normal: '🔵 Normal (มาตรฐาน 24 ชม.)',
      High: '🟡 High (ด่วน 4 ชม.)',
      Critical: '🔴 Critical (ฉุกเฉิน ทันที)',
    },
    gpsSectionTitle: 'ข้อมูลการยืมโน้ตบุ๊ค GPS Tracking',
    borrowDate: 'วันที่ยืม',
    returnDate: 'วันที่คืน',
    purpose: 'วัตถุประสงค์การใช้งาน',
    purposePlaceholder: 'ระบุวัตถุประสงค์ เช่น ไปประชุมลูกค้า, งานนอกสถานที่, ฯลฯ',
    gpsNote: 'หมายเหตุ:',
    gpsNoteBody: 'โน้ตบุ๊กจะถูกติดตั้งระบบ GPS Tracking สามารถติดตามตำแหน่งได้แบบ Real-time เพื่อความปลอดภัยและการจัดการทรัพย์สินขององค์กร',
    departmentPlaceholder: 'Ex. Marketing',
    location: 'สถานที่ (Location)',
    locationPlaceholder: 'Ex. Building A, 3rd Floor, Desk 301',
    description: 'รายละเอียดเพิ่มเติม (Description)',
    descriptionPlaceholder: 'กรุณาระบุรายละเอียดให้ชัดเจน เช่น หมายเลขเครื่อง, รุ่น, อาการที่พบ, ความต้องการเฉพาะ...',
    attachment: 'รูปภาพประกอบ (Attachment)',
    uploadDrop: 'ลากไฟล์มาวาง หรือ คลิกเพื่ออัพโหลด',
    uploadHint: 'รองรับ JPG, PNG, PDF (Max 5MB)',
    selectedFiles: 'ไฟล์ที่เลือก ({{count}})',
    uploading: 'กำลังอัพโหลด...',
    pdfTitle: 'ส่งออกเอกสาร PDF แบบกดเอง',
    pdfBody: 'ระบบจะไม่ดาวน์โหลด PDF อัตโนมัติแล้ว หากต้องการเอกสารให้กดปุ่ม Export PDF ก่อนส่งคำขอ',
    footerNoteLabel: 'หมายเหตุ:',
    footerNoteBody: 'กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนส่ง',
    cancel: 'ยกเลิก',
    processing: 'กำลังดำเนินการ...',
    confirmRequest: 'ยืนยันคำขอ',
    exportPdf: 'Export PDF',
    exportingPdf: 'กำลังสร้าง PDF...',
    sessionExpired: 'เซสชันของคุณหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
    saveSuccessTitle: '✅ บันทึกข้อมูลสำเร็จ!',
    saveSuccessBody: 'คำร้องของคุณถูกส่งแล้ว',
    fileCount: 'ไฟล์แนบ: {{count}} ไฟล์',
    pdfDownloaded: 'ไฟล์ PDF ได้ถูกดาวน์โหลดแล้ว',
    pdfReady: 'ไฟล์ PDF ถูกดาวน์โหลดแล้ว',
    redirectDashboard: 'ระบบจะนำท่านไปยังหน้า Dashboard',
    errorPrefix: '❌ เกิดข้อผิดพลาด:',
    fileTooLarge: 'ไฟล์ {{name}} ใหญ่เกิน 5MB',
  },
  en: {
    headerSubtitle: 'Create an IT service request • enterprise standard workflow',
    searchPlaceholder: 'Search services...',
    loadingUser: 'Loading user information...',
    loadingUserName: 'Loading...',
    unknownDepartment: 'Unspecified department',
    unknownPhone: 'Not provided',
    employeeFallback: 'Employee',
    greeting: 'Hello, {{name}} 👋',
    intro: 'Submit IT issues and service requests with GPS tracking support and manual PDF export when needed.',
    myRequests: 'Your Requests',
    myRequestsHint: 'View all equipment request records and statuses',
    servicesCount: '{{count}} services',
    gpsReady: '✓ Real-time GPS tracking included',
    requesterInfo: 'Requester Information',
    fullName: 'Full name',
    employeeCode: 'Employee ID',
    department: 'Department',
    position: 'Position',
    subject: 'Subject',
    priority: 'Priority',
    priorityOptions: {
      Low: '🟢 Low (within 3-5 days)',
      Normal: '🔵 Normal (standard 24 hrs)',
      High: '🟡 High (urgent 4 hrs)',
      Critical: '🔴 Critical (immediate)',
    },
    gpsSectionTitle: 'GPS Laptop Borrowing Details',
    borrowDate: 'Borrow date',
    returnDate: 'Return date',
    purpose: 'Purpose of use',
    purposePlaceholder: 'Describe the purpose, such as client meeting, field work, etc.',
    gpsNote: 'Note:',
    gpsNoteBody: 'This notebook will have GPS tracking enabled for real-time location monitoring to improve security and asset management.',
    departmentPlaceholder: 'Ex. Marketing',
    location: 'Location',
    locationPlaceholder: 'Ex. Building A, 3rd Floor, Desk 301',
    description: 'Additional Details',
    descriptionPlaceholder: 'Please describe the request clearly, including device number, model, symptoms, or any specific need...',
    attachment: 'Attachments',
    uploadDrop: 'Drag files here or click to upload',
    uploadHint: 'Supports JPG, PNG, PDF (Max 5MB)',
    selectedFiles: 'Selected files ({{count}})',
    uploading: 'Uploading...',
    pdfTitle: 'Manual PDF Export',
    pdfBody: 'The system no longer downloads a PDF automatically. Use Export PDF if you need the request document before submitting.',
    footerNoteLabel: 'Note:',
    footerNoteBody: 'Please review your information carefully before submitting.',
    cancel: 'Cancel',
    processing: 'Processing...',
    confirmRequest: 'Submit Request',
    exportPdf: 'Export PDF',
    exportingPdf: 'Generating PDF...',
    sessionExpired: 'Your session has expired. Please sign in again.',
    saveSuccessTitle: '✅ Saved successfully!',
    saveSuccessBody: 'Your request has been submitted.',
    fileCount: 'Attachments: {{count}} files',
    pdfDownloaded: 'The PDF has been downloaded.',
    pdfReady: 'The PDF has been downloaded.',
    redirectDashboard: 'The system will take you back to the Dashboard.',
    errorPrefix: '❌ Error:',
    fileTooLarge: 'File {{name}} is larger than 5MB',
  },
  ko: {
    headerSubtitle: 'IT 서비스 요청 생성 • 엔터프라이즈 표준 워크플로',
    searchPlaceholder: '서비스 검색...',
    loadingUser: '사용자 정보를 불러오는 중...',
    loadingUserName: '불러오는 중...',
    unknownDepartment: '부서 미지정',
    unknownPhone: '미입력',
    employeeFallback: '직원',
    greeting: '안녕하세요, {{name}} 👋',
    intro: 'GPS 추적 지원과 필요할 때 직접 PDF를 내보낼 수 있는 IT 문제 및 서비스 요청 시스템입니다.',
    myRequests: '내 장비 요청',
    myRequestsHint: '요청 목록과 상태를 확인하세요',
    servicesCount: '{{count}}개 서비스',
    gpsReady: '✓ 실시간 GPS 추적 지원',
    requesterInfo: '요청자 정보',
    fullName: '이름',
    employeeCode: '사번',
    department: '부서',
    position: '직책',
    subject: '제목',
    priority: '우선순위',
    priorityOptions: {
      Low: '🟢 Low (3-5일 내)',
      Normal: '🔵 Normal (기본 24시간)',
      High: '🟡 High (긴급 4시간)',
      Critical: '🔴 Critical (즉시)',
    },
    gpsSectionTitle: 'GPS 노트북 대여 정보',
    borrowDate: '대여일',
    returnDate: '반납일',
    purpose: '사용 목적',
    purposePlaceholder: '예: 고객 미팅, 외근 업무 등 사용 목적을 적어 주세요.',
    gpsNote: '안내:',
    gpsNoteBody: '이 노트북에는 실시간 위치 추적을 위한 GPS 시스템이 적용되며 보안과 자산 관리에 사용됩니다.',
    departmentPlaceholder: '예: Marketing',
    location: '위치',
    locationPlaceholder: '예: Building A, 3rd Floor, Desk 301',
    description: '추가 설명',
    descriptionPlaceholder: '장비 번호, 모델, 증상, 특별 요청 사항 등을 자세히 적어 주세요...',
    attachment: '첨부 파일',
    uploadDrop: '파일을 끌어오거나 클릭해서 업로드',
    uploadHint: 'JPG, PNG, PDF 지원 (최대 5MB)',
    selectedFiles: '선택한 파일 ({{count}})',
    uploading: '업로드 중...',
    pdfTitle: '수동 PDF 내보내기',
    pdfBody: '이제 PDF는 자동 다운로드되지 않습니다. 문서가 필요하면 제출 전에 Export PDF 버튼을 눌러 주세요.',
    footerNoteLabel: '안내:',
    footerNoteBody: '제출 전에 입력한 정보를 다시 확인해 주세요.',
    cancel: '취소',
    processing: '처리 중...',
    confirmRequest: '요청 제출',
    exportPdf: 'PDF 내보내기',
    exportingPdf: 'PDF 생성 중...',
    sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
    saveSuccessTitle: '✅ 저장되었습니다!',
    saveSuccessBody: '요청이 제출되었습니다.',
    fileCount: '첨부 파일: {{count}}개',
    pdfDownloaded: 'PDF가 다운로드되었습니다.',
    pdfReady: 'PDF가 다운로드되었습니다.',
    redirectDashboard: '시스템이 대시보드로 이동합니다.',
    errorPrefix: '❌ 오류:',
    fileTooLarge: '파일 {{name}} 이(가) 5MB를 초과합니다',
  },
};

function getLocalizedServiceCatalog(language) {
  if (language === 'en') {
    return SERVICE_CATALOG.map((category) => ({
      ...category,
      displayTitle: category.title,
      displaySubtitle: category.subtitle.includes('อ') ? {
        hardware: 'Computer equipment and hardware',
        software: 'Software and installation',
        network: 'Network and access rights',
        security: 'Security and CCTV',
        procurement: 'Procurement and budget',
        other: 'General service requests',
      }[category.id] : category.subtitle,
      actions: category.actions.map((action) => ({
        ...action,
        displayLabel: {
          req_new_device: 'Request New Equipment',
          req_replacement: 'Request Replacement Device',
          req_repair: 'Repair Equipment',
          req_peripherals: 'Peripheral Devices (Mouse/Keyboard)',
          req_laptop_gps: '🔒 Borrow GPS Tracking Laptop',
          req_install_sw: 'Install New Software',
          req_license: 'Request / Renew License',
          req_os_issue: 'Windows / OS Issue',
          req_wifi_guest: 'Request Guest WiFi',
          req_vpn: 'Request VPN Access',
          req_folder_access: 'Request Folder / Server Access',
          req_domain: 'Reset Password / Domain User',
          req_cctv_install: 'Install New CCTV',
          req_cctv_view: 'Request CCTV Playback',
          req_access_card: 'Access Card',
          req_purchase: 'Create IT Purchase Request (PR)',
          req_quotation: 'Request Quotation',
          req_consult: 'IT Consultation',
          req_relocate: 'Relocate Workspace',
        }[action.id] || action.label,
      })),
    }));
  }

  if (language === 'ko') {
    return SERVICE_CATALOG.map((category) => ({
      ...category,
      displayTitle: {
        hardware: '하드웨어 / 장비',
        software: '소프트웨어 / 애플리케이션',
        network: '네트워크 / 접근 권한',
        security: '보안 / CCTV',
        procurement: 'IT 구매',
        other: '일반 요청',
      }[category.id] || category.title,
      displaySubtitle: {
        hardware: '컴퓨터 장비 및 하드웨어',
        software: '프로그램 및 설치',
        network: '네트워크와 접근 권한',
        security: '보안 및 CCTV',
        procurement: '구매와 예산',
        other: '일반 서비스 요청',
      }[category.id] || category.subtitle,
      actions: category.actions.map((action) => ({
        ...action,
        displayLabel: {
          req_new_device: '신규 장비 요청',
          req_replacement: '대체 장비 요청',
          req_repair: '장비 수리 요청',
          req_peripherals: '주변기기 (마우스/키보드)',
          req_laptop_gps: '🔒 GPS 추적 노트북 대여',
          req_install_sw: '신규 소프트웨어 설치',
          req_license: '라이선스 요청 / 갱신',
          req_os_issue: 'Windows / OS 문제',
          req_wifi_guest: '게스트 WiFi 요청',
          req_vpn: 'VPN 사용 요청',
          req_folder_access: '폴더 / 서버 접근 권한 요청',
          req_domain: '비밀번호 초기화 / 도메인 계정',
          req_cctv_install: '신규 CCTV 설치',
          req_cctv_view: 'CCTV 재생 요청',
          req_access_card: '출입 카드',
          req_purchase: 'IT 구매 요청(PR)',
          req_quotation: '견적 요청',
          req_consult: 'IT 상담',
          req_relocate: '근무 위치 이동',
        }[action.id] || action.label,
      })),
    }));
  }

  return SERVICE_CATALOG.map((category) => ({
    ...category,
    displayTitle: {
      hardware: 'ฮาร์ดแวร์ / อุปกรณ์',
      software: 'ซอฟต์แวร์ / แอปพลิเคชัน',
      network: 'เครือข่าย / สิทธิ์การเข้าถึง',
      security: 'ความปลอดภัย / CCTV',
      procurement: 'จัดซื้อไอที',
      other: 'คำขอทั่วไป',
    }[category.id] || category.title,
    displaySubtitle: category.subtitle,
    actions: category.actions.map((action) => ({
      ...action,
      displayLabel: action.label,
    })),
  }));
}

const PickUpEquipment = () => {
  const navigate = useNavigate();
  const { language, tt } = useScopedI18n(PICK_UP_EQUIPMENT_TRANSLATIONS);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const requestFormRef = useRef(null);

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
  const localizedCatalog = getLocalizedServiceCatalog(language);

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
          department: profileData?.department || user.user_metadata?.department || tt('unknownDepartment'),
          position: profileData?.position || user.user_metadata?.position || tt('employeeFallback'),
          location: profileData?.location || user.user_metadata?.location || '',
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
          location: userData.location,
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
  }, [tt]);

  const handleOpenForm = (category, action) => {
    setSelectedRequest({
      ...action,
      categoryName: category.title,
      categoryDisplayName: category.displayTitle || category.title,
      displayLabel: action.displayLabel || action.label,
    });
    setFormData(prev => ({
      ...prev,
      title: action.displayLabel || action.label,
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
        alert(tt('fileTooLarge', { name: file.name }));
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
      alert(tt('sessionExpired'));
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
        reporter_emp_id: currentUser?.employeeId || null,
        reporter_dept: formData.department || currentUser?.department || null,
        reporter_avatar_url: currentUser?.avatar || null,
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

      // Insert into Supabase (fallback when optional profile columns are missing in schema)
      const { data, error } = await insertTicketWithSchemaFallback(
        supabase,
        ticketData,
        { select: 'id,ticket_no', single: true },
      );

      if (error) throw error;

      const newTicket = data;

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

      setIsSubmitting(false);
      handleCloseForm();

      // Reset file selection
      setSelectedFiles([]);
      setUploadProgress(0);

      // Success notification
      const fileInfo = selectedFiles.length > 0 ? `\n${tt('fileCount', { count: selectedFiles.length })}` : '';
      alert(`${tt('saveSuccessTitle')}\n\n${tt('saveSuccessBody')}${fileInfo}\n\n${tt('redirectDashboard')}`);

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Error submitting request:', error);
      setIsSubmitting(false);
      alert(`${tt('errorPrefix')} ${error.message}`);
    }
  };

  const handleManualPdfExport = async () => {
    if (!requestFormRef.current?.reportValidity()) return;

    try {
      setIsExportingPdf(true);
      await generateITRequestPDF(formData, selectedRequest, currentUser);
      alert(tt('pdfReady'));
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert(`${tt('errorPrefix')} ${error.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="app-theme min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">{tt('loadingUser')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-theme min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-800  selection:bg-blue-100 pb-20">

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
                {tt('headerSubtitle')}
              </p>
            </div>
          </div>

          {/* User Profile Display */}
          <div className="hidden md:flex items-center gap-6">
            <div className="relative hidden lg:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={tt('searchPlaceholder')}
                className="pl-10 pr-4 py-2.5 bg-slate-100/80 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all w-64 backdrop-blur"
              />
            </div>
            <div className="h-10 w-px bg-slate-200"></div>

            {/* User Info Card */}
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 shadow-sm hover:shadow-md transition-all">
              <div className="text-right hidden xl:block">
                <div className="text-sm font-bold text-slate-800">{currentUser?.name || tt('loadingUserName')}</div>
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
              {tt('greeting', { name: currentUser?.name?.split(' ')[0] || tt('employeeFallback') })}
            </h2>
          </div>
          <p className="text-slate-600 max-w-3xl text-lg font-light ml-15">
            {tt('intro')}
          </p>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => navigate('/my-borrow-requests')}
              className="inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3 text-left text-emerald-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                <ListChecks className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-sm font-bold">{tt('myRequests')}</span>
                <span className="block text-xs text-emerald-600">{tt('myRequestsHint')}</span>
              </span>
            </button>
          </div>

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
              <span className="text-sm font-medium text-slate-700">{currentUser?.phone || tt('unknownPhone')}</span>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {localizedCatalog.map((category) => (
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
                    {tt('servicesCount', { count: category.actions.length })}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{category.displayTitle || category.title}</h3>
                <p className="text-sm text-slate-500">{category.displaySubtitle || category.subtitle}</p>
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
                    <span>{action.displayLabel || action.label}</span>
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
                  {selectedRequest?.categoryDisplayName || selectedRequest?.categoryName}
                </span>
                <h3 className="mt-3 text-2xl font-bold text-slate-900">{selectedRequest?.displayLabel || selectedRequest?.label}</h3>
                {selectedRequest?.id === 'req_laptop_gps' && (
                  <p className="mt-2 text-sm text-emerald-600 flex items-center gap-2">
                    <Laptop className="w-4 h-4" />
                    <span className="font-medium">{tt('gpsReady')}</span>
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
              <form id="requestForm" ref={requestFormRef} onSubmit={handleSubmit} className="space-y-6">

                {/* User Info Display (Read-only) */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    {tt('requesterInfo')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500 text-xs">{tt('fullName')}</span>
                      <p className="font-semibold text-slate-800">{currentUser?.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">{tt('employeeCode')}</span>
                      <p className="font-semibold text-slate-800">{currentUser?.employeeId}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">{tt('department')}</span>
                      <p className="font-semibold text-slate-800">{currentUser?.department}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">{tt('position')}</span>
                      <p className="font-semibold text-slate-800">{currentUser?.position}</p>
                    </div>
                  </div>
                </div>

                {/* Section: Request Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      {tt('subject')} <span className="text-red-500">*</span>
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
                      {tt('priority')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white"
                    >
                      <option value="Low">{tt('priorityOptions.Low')}</option>
                      <option value="Normal">{tt('priorityOptions.Normal')}</option>
                      <option value="High">{tt('priorityOptions.High')}</option>
                      <option value="Critical">{tt('priorityOptions.Critical')}</option>
                    </select>
                  </div>
                </div>

                {/* GPS Laptop Specific Fields */}
                {selectedRequest?.id === 'req_laptop_gps' && (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border-2 border-emerald-200 space-y-4">
                    <h4 className="text-sm font-bold text-emerald-700 mb-4 flex items-center gap-2">
                      <Laptop className="w-4 h-4" />
                      {tt('gpsSectionTitle')}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          {tt('borrowDate')} <span className="text-red-500">*</span>
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
                          {tt('returnDate')} <span className="text-red-500">*</span>
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
                        {tt('purpose')} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows="3"
                        value={formData.purposeOfUse}
                        onChange={e => setFormData({ ...formData, purposeOfUse: e.target.value })}
                        placeholder={tt('purposePlaceholder')}
                        className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none"
                        required={selectedRequest?.id === 'req_laptop_gps'}
                      ></textarea>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-emerald-200">
                      <p className="text-xs text-emerald-700 flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>{tt('gpsNote')}</strong> {tt('gpsNoteBody')}
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
                      {tt('department')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                      placeholder={tt('departmentPlaceholder')}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      {tt('location')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder={tt('locationPlaceholder')}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Section: Details */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <FileText className="w-4 h-4 text-blue-600" />
                    {tt('description')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="5"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder={tt('descriptionPlaceholder')}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
                    required
                  ></textarea>
                </div>

                {/* File Upload UI */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <Upload className="w-4 h-4 text-blue-600" />
                    {tt('attachment')}
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
                    <p className="text-sm text-slate-600 font-medium">{tt('uploadDrop')}</p>
                    <p className="text-xs text-slate-400 mt-1">{tt('uploadHint')}</p>
                  </label>

                  {/* Selected Files List */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-semibold text-slate-700">{tt('selectedFiles', { count: selectedFiles.length })}</p>
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
                        <span className="text-sm font-semibold text-blue-700">{tt('uploading')}</span>
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
                    <p className="text-sm font-semibold text-blue-900">{tt('pdfTitle')}</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {tt('pdfBody')}
                    </p>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer (Sticky Bottom) */}
            <div className="p-6 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                <span className="font-semibold">{tt('footerNoteLabel')}</span> {tt('footerNoteBody')}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleManualPdfExport()}
                  disabled={isSubmitting || isExportingPdf || isUploading}
                  className="px-6 py-3 rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-100 border-2 border-blue-200 bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExportingPdf ? tt('exportingPdf') : tt('exportPdf')}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:shadow-md border-2 border-slate-200 hover:border-slate-300 transition-all disabled:opacity-50"
                >
                  {tt('cancel')}
                </button>
                <button
                  type="submit"
                  form="requestForm"
                  disabled={isSubmitting}
                  className="min-w-[180px] px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 active:scale-95 transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> {tt('processing')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {tt('confirmRequest')}
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

