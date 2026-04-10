import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { insertTicketWithSchemaFallback } from "../lib/ticketSchemaCompat";
import { useScopedI18n } from "../i18n/useScopedI18n";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import { toast, Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  Building,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Info,
  LayoutGrid,
  Loader2,
  Mail,
  Monitor,
  Printer,
  Server,
  Upload,
  User,
  MapPin,
  Wifi,
  X,
  AlertTriangle,
  Paperclip,
  Phone,
  FlipHorizontal,
  ShieldCheck,
  CircleDashed,
  FileText,
  Briefcase,
  Hash,
  Crown,
  Gem,
  Heart,
  Sparkles,
  Layers,
  HardDrive,
  Image as ImageIcon,
  Zap,
  Shield,
  Clock
} from "lucide-react";

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const IMAGE_FILE_ACCEPT = "image/*";
const GENERIC_FILE_ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";

const CATEGORIES = [
  {
    id: "Hardware",
    label: "คอมพิวเตอร์ / อุปกรณ์",
    desc: "PC, Notebook, จอภาพ, อุปกรณ์ต่อพ่วง",
    icon: Monitor,
    selectedClass: "from-[#2b59b0] to-[#244a95] border-[#2b59b0]/30",
    iconClass: "text-[#2b59b0]",
    softClass: "bg-[#2b59b0]/10",
    gradient: "from-[#2b59b0] via-[#2b59b0] to-[#244a95]"
  },
  {
    id: "Network",
    label: "เครือข่าย / Wi-Fi",
    desc: "LAN, Wi-Fi, VPN, Internet",
    icon: Wifi,
    selectedClass: "from-[#2b59b0] to-[#244a95] border-[#2b59b0]/30",
    iconClass: "text-[#2b59b0]",
    softClass: "bg-[#2b59b0]/10",
    gradient: "from-[#2b59b0] via-[#2b59b0] to-[#244a95]"
  },
  {
    id: "Printer",
    label: "เครื่องพิมพ์ / สแกน",
    desc: "Printer, Scanner, Copier",
    icon: Printer,
    selectedClass: "from-[#2b59b0] to-[#244a95] border-[#2b59b0]/30",
    iconClass: "text-[#2b59b0]",
    softClass: "bg-[#2b59b0]/10",
    gradient: "from-[#2b59b0] via-[#2b59b0] to-[#244a95]"
  },
  {
    id: "Email",
    label: "อีเมลองค์กร",
    desc: "Outlook, Exchange, การส่งรับเมล",
    icon: Mail,
    selectedClass: "from-[#2b59b0] to-[#244a95] border-[#2b59b0]/30",
    iconClass: "text-[#2b59b0]",
    softClass: "bg-[#2b59b0]/10",
    gradient: "from-[#2b59b0] via-[#2b59b0] to-[#244a95]"
  },
  {
    id: "System",
    label: "ระบบงาน / ซอฟต์แวร์",
    desc: "OS, แอปพลิเคชัน, สิทธิ์การใช้งาน",
    icon: Server,
    selectedClass: "from-[#2b59b0] to-[#244a95] border-[#2b59b0]/30",
    iconClass: "text-[#2b59b0]",
    softClass: "bg-[#2b59b0]/10",
    gradient: "from-[#2b59b0] via-[#2b59b0] to-[#244a95]"
  },
];

const ISSUES = {
  Hardware: [
    "เครื่องเปิดไม่ติด",
    "เครื่องทำงานช้ามาก",
    "จอฟ้า (Blue Screen)",
    "อุปกรณ์ต่อพ่วงใช้งานไม่ได้",
    "พัดลมหรือเสียงเครื่องผิดปกติ",
  ],
  Network: [
    "เชื่อมต่อ Wi-Fi ไม่ได้",
    "อินเทอร์เน็ตช้า/หลุดบ่อย",
    "VPN เชื่อมต่อไม่ได้",
    "เข้า Shared Folder ไม่ได้",
    "DNS / IP Error",
  ],
  Printer: [
    "สั่งพิมพ์ไม่ออก",
    "กระดาษติด",
    "หมึกหมด/สีเพี้ยน",
    "สแกนเอกสารไม่ได้",
    "Driver มีปัญหา",
  ],
  Email: [
    "รับส่งอีเมลไม่ได้",
    "ลืมรหัสผ่าน",
    "Outlook ไม่ซิงก์",
    "กล่องเมลเต็ม",
    "ตั้งค่า Signature",
  ],
  System: [
    "โปรแกรมค้าง / Error",
    "ขอสิทธิ์ Admin",
    "ติดตั้งโปรแกรม",
    "อัปเดตระบบไม่ผ่าน",
    "เข้าใช้งานระบบภายในไม่ได้",
  ],
};

const URGENCY = [
  {
    id: "low",
    label: "ปกติ",
    desc: "ภายใน 48 ชั่วโมง",
    priority: "P3",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
    chip: "bg-emerald-100 text-emerald-700",
    selectedBg: "bg-emerald-50",
    gradient: "from-emerald-500 to-teal-500",
    color: "emerald"
  },
  {
    id: "normal",
    label: "เร่งด่วน",
    desc: "ภายใน 24 ชั่วโมง",
    priority: "P2",
    dot: "bg-amber-500",
    border: "border-amber-200",
    chip: "bg-amber-100 text-amber-700",
    selectedBg: "bg-amber-50",
    gradient: "from-amber-500 to-orange-500",
    color: "amber"
  },
  {
    id: "urgent",
    label: "วิกฤต",
    desc: "ต้องการความช่วยเหลือทันที",
    priority: "P1",
    dot: "bg-rose-500",
    border: "border-rose-200",
    chip: "bg-rose-100 text-rose-700",
    selectedBg: "bg-rose-50",
    gradient: "from-rose-500 to-red-500",
    color: "rose"
  },
];

function formatThaiDateTime(date) {
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return { date: `${day} ${month} ${year}`, time: `${hours}:${minutes}` };
}

function formatAttachmentSize(size) {
  const bytes = Number(size || 0);
  if (!bytes) return "-";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function isImageFile(file) {
  const mimeType = String(file?.type || "").toLowerCase();
  if (mimeType.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(String(file?.name || ""));
}

function inferClipboardFileName(file) {
  if (file?.name) return file.name;
  const extension = String(file?.type || "").split("/")[1] || "png";
  return `clipboard_${Date.now()}.${extension}`;
}

function resolveProfileLocation(source = {}) {
  return (
    source.location ||
    source.work_location ||
    source.workLocation ||
    source.work_site ||
    source.site ||
    source["work location / site"] ||
    ""
  );
}

function buildProfileSnapshot(profile = {}, metadata = {}, authUser = null) {
  return {
    ...metadata,
    ...profile,
    email: profile.email || authUser?.email || metadata.email || "",
    employee_code: profile.employee_code || metadata.employee_code || metadata.employee_id || "",
    full_name: profile.full_name || metadata.full_name || "",
    phone: profile.phone || metadata.phone || metadata.mobile_phone || "",
    department: profile.department || metadata.department || "",
    position: profile.position || metadata.position || "",
    avatar_url: profile.avatar_url || metadata.avatar_url || null,
    id_card_url: profile.id_card_url || metadata.id_card_url || null,
    location: resolveProfileLocation(profile) || resolveProfileLocation(metadata),
  };
}

const sectionAnim = {
  initial: { y: 15, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.4 },
};

const CREATE_TICKET_TRANSLATIONS = {
  th: {
    headerSubtitle: "สร้างคำขอแจ้งซ่อม • ระบบมาตรฐานองค์กร",
    ready: "พร้อมใช้งาน",
    successTitle: "แจ้งปัญหาสำเร็จ",
    successSubtitle: "ระบบบันทึกคำขอเรียบร้อยแล้ว ทีม IT จะติดต่อกลับตามระดับความเร่งด่วน",
    goDashboard: "ไปยัง Dashboard",
    ticketReference: "Ticket Reference",
    profileLabel: "Employee Profile",
    slaResponse: "SLA Response",
    secure: "Secure",
    standard: "Standard",
    enterpriseEdition: "Enterprise Edition",
    supportLabel: "24/7 Support",
    workLocation: "สถานที่",
    employeeFallback: "พนักงาน",
    defaultDepartment: "ฝ่ายเทคโนโลยีสารสนเทศ",
    defaultPosition: "เจ้าหน้าที่ระบบ",
    employeeLevel: "ระดับพนักงาน",
    categoryTitle: "หมวดหมู่ปัญหา",
    categorySubtitle: "เลือกหมวดหมู่ที่ตรงกับปัญหาของคุณ",
    required: "จำเป็น *",
    issueTitle: "รายละเอียดปัญหา",
    issueSubtitle: "กรุณาอธิบายปัญหาให้ชัดเจน",
    commonIssues: "ปัญหาที่พบบ่อย",
    extraDescription: "คำอธิบายเพิ่มเติม",
    issuePlaceholder: "ระบุอาการที่พบ ข้อความผิดพลาด เวลาที่เกิดเหตุ และสิ่งที่ได้ลองแก้ไขแล้ว...",
    issueHint: "การระบุรายละเอียดที่ชัดเจนช่วยให้ทีมงานแก้ไขปัญหาได้เร็วขึ้น",
    attachmentsTitle: "หลักฐานประกอบ",
    attachmentsSubtitle: "รูปภาพ, เอกสาร, หรือภาพหน้าจอ",
    attached: "แนบแล้ว",
    optional: "ไม่บังคับ",
    cameraTitle: "ถ่ายภาพหลักฐาน",
    cameraOverlayHint: "ถ่ายแล้วรูปจะทับบนกล้อง ไม่เปลืองพื้นที่",
    cameraReviewHint: "รูปนี้จะถูกใช้เป็นหลักฐานทันที",
    cameraReviewFooter: "กดยืนยันรูปนี้ หรือถ่ายใหม่ได้",
    cameraFooter: "รองรับสลับกล้องหน้า/หลัง",
    switchCamera: "สลับกล้อง",
    retake: "ถ่ายใหม่",
    takePhoto: "ถ่ายภาพ",
    usePhoto: "ใช้รูปนี้",
    closeCamera: "ปิดกล้อง",
    openCamera: "เปิดกล้อง",
    openCameraHint: "ถ่ายภาพหน้างานทันที",
    addAttachment: "เพิ่มหลักฐาน",
    attachmentMenuHint: "เลือกจากกล้อง รูปภาพ หรือไฟล์",
    attachFromCamera: "ใช้กล้อง",
    attachFromGallery: "เลือกรูปภาพ",
    attachFromFile: "แนบไฟล์",
    uploadFile: "อัปโหลดไฟล์",
    uploadFileHint: "รองรับรูปภาพ, PDF, Office และ TXT ไม่เกิน 5MB",
    attachmentFile: "ไฟล์แนบ",
    galleryFile: "รูปภาพจากเครื่อง",
    documentFile: "เอกสารหรือไฟล์",
    pasteCaptureTitle: "วางภาพหน้าจอหรือไฟล์จากคลิปบอร์ด",
    pasteCaptureHint: "คลิกช่องนี้ แล้วกด Win + Shift + S จากนั้น Ctrl + V เพื่อวางหลักฐานได้ทันที",
    pasteCaptureEmpty: "พร้อมรับภาพจากหน้าจอ, รูปภาพ หรือไฟล์ที่คัดลอกมา",
    removeAttachment: "ลบไฟล์แนบ",
    readyToUse: "พร้อมใช้งาน",
    urgencyTitle: "ระดับความเร่งด่วน",
    urgencySubtitle: "เลือกตามผลกระทบ",
    processingTime: "เวลาดำเนินการ",
    summaryTitle: "สรุปคำขอ",
    readyToSubmit: "พร้อมส่ง",
    reporter: "ผู้แจ้ง",
    category: "หมวดหมู่",
    urgency: "ความเร่งด่วน",
    notSelected: "ยังไม่เลือก",
    attachmentSummary: "หลักฐานแนบ",
    hasAttachment: "มีไฟล์แนบ",
    noAttachment: "ไม่มีไฟล์แนบ",
    detail: "รายละเอียด",
    characters: "ตัวอักษร",
    submitting: "กำลังส่งคำขอ...",
    submit: "ยืนยันการแจ้งซ่อม",
    tipTitle: "เคล็ดลับการแจ้งซ่อม",
    tipBody: "ระบุขั้นตอนที่ทำก่อนเกิดปัญหา เวลาที่เริ่มเกิดปัญหา และแนบภาพหน้าจอหรือภาพหน้างาน เพื่อให้ทีมงานแก้ไขปัญหาได้รวดเร็วขึ้น",
    quickHelpTitle: "Quick Help",
    quickHelpBody: "หากงานเร่งหรือมีข้อสงสัยเรื่องการแจ้งซ่อม สามารถติดต่อทีม IT ได้โดยตรง",
    quickHelpPhone: "โทร",
    quickHelpEmail: "อีเมล",
    quickHelpLine: "OA",
    errors: {
      fileTooLarge: "ไฟล์แนบต้องมีขนาดไม่เกิน 5MB",
      cameraUnavailable: "กล้องไม่พร้อมใช้งาน",
      captureFailed: "ไม่สามารถถ่ายรูปได้",
      saveImageFailed: "ไม่สามารถบันทึกรูปได้",
      imageAttached: "แนบรูปภาพเรียบร้อย",
      fileAttached: "แนบไฟล์เรียบร้อย",
      imagePasted: "วางภาพจากคลิปบอร์ดเรียบร้อย",
      formInvalid: "กรุณาเลือกหมวดหมู่และระบุรายละเอียดปัญหา",
      userNotFound: "ไม่พบผู้ใช้งาน",
      submitSuccess: "ส่งคำขอเรียบร้อยแล้ว",
      submitFailed: "เกิดข้อผิดพลาด",
    },
  },
  en: {
    headerSubtitle: "Create an IT service request • enterprise standard workflow",
    ready: "Ready",
    successTitle: "Issue Submitted",
    successSubtitle: "Your request has been saved. The IT team will contact you based on the selected urgency.",
    goDashboard: "Go to Dashboard",
    ticketReference: "Ticket Reference",
    profileLabel: "Employee Profile",
    slaResponse: "SLA Response",
    secure: "Secure",
    standard: "Standard",
    enterpriseEdition: "Enterprise Edition",
    supportLabel: "24/7 Support",
    workLocation: "Location",
    employeeFallback: "Employee",
    defaultDepartment: "Information Technology",
    defaultPosition: "System Officer",
    employeeLevel: "Employee Level",
    categoryTitle: "Issue Category",
    categorySubtitle: "Choose the category that best matches your issue",
    required: "Required *",
    issueTitle: "Issue Details",
    issueSubtitle: "Please describe the issue clearly",
    commonIssues: "Common Issues",
    extraDescription: "Additional Description",
    issuePlaceholder: "Describe the symptoms, error messages, time of occurrence, and what you have already tried...",
    issueHint: "Clear details help the team solve the issue faster.",
    attachmentsTitle: "Attachments",
    attachmentsSubtitle: "Images, documents, or screenshots",
    attached: "Attached",
    optional: "Optional",
    cameraTitle: "Capture Evidence",
    cameraOverlayHint: "The captured image stays on top of the camera preview to save space.",
    cameraReviewHint: "This image will be used as evidence immediately.",
    cameraReviewFooter: "Confirm this image or take another one.",
    cameraFooter: "Supports switching between front and back cameras.",
    switchCamera: "Switch Camera",
    retake: "Retake",
    takePhoto: "Take Photo",
    usePhoto: "Use This Photo",
    closeCamera: "Close Camera",
    openCamera: "Open Camera",
    openCameraHint: "Capture an on-site photo instantly",
    addAttachment: "Add evidence",
    attachmentMenuHint: "Choose camera, photo library, or file",
    attachFromCamera: "Use camera",
    attachFromGallery: "Choose image",
    attachFromFile: "Attach file",
    uploadFile: "Upload File",
    uploadFileHint: "Supports images, PDF, Office files, and TXT up to 5MB",
    attachmentFile: "Attachment",
    galleryFile: "Image from device",
    documentFile: "Document or file",
    pasteCaptureTitle: "Paste a screenshot or file from the clipboard",
    pasteCaptureHint: "Click this area, then press Win + Shift + S and Ctrl + V to drop evidence instantly",
    pasteCaptureEmpty: "Ready for screenshots, copied images, or copied files",
    removeAttachment: "Remove attachment",
    readyToUse: "Ready",
    urgencyTitle: "Urgency Level",
    urgencySubtitle: "Choose based on impact",
    processingTime: "Response time",
    summaryTitle: "Request Summary",
    readyToSubmit: "Ready to submit",
    reporter: "Reporter",
    category: "Category",
    urgency: "Urgency",
    notSelected: "Not selected",
    attachmentSummary: "Attachment",
    hasAttachment: "File attached",
    noAttachment: "No attachment",
    detail: "Details",
    characters: "characters",
    submitting: "Submitting...",
    submit: "Submit Ticket",
    tipTitle: "Reporting Tip",
    tipBody: "Describe what happened before the issue started, when it started, and attach screenshots or on-site photos so the team can resolve it faster.",
    quickHelpTitle: "Quick Help",
    quickHelpBody: "If the issue is urgent or you need help submitting the ticket, contact the IT team directly.",
    quickHelpPhone: "Phone",
    quickHelpEmail: "Email",
    quickHelpLine: "OA",
    errors: {
      fileTooLarge: "Attachments must be 5MB or smaller.",
      cameraUnavailable: "Camera is not available.",
      captureFailed: "Unable to capture the photo.",
      saveImageFailed: "Unable to save the photo.",
      imageAttached: "Image attached successfully.",
      fileAttached: "File attached successfully.",
      imagePasted: "Clipboard image attached successfully.",
      formInvalid: "Please choose a category and describe the issue.",
      userNotFound: "User not found.",
      submitSuccess: "Request submitted successfully.",
      submitFailed: "Error",
    },
  },
  ko: {
    headerSubtitle: "IT 서비스 요청 생성 • 엔터프라이즈 표준 워크플로",
    ready: "사용 가능",
    successTitle: "문제가 접수되었습니다",
    successSubtitle: "요청이 저장되었습니다. 선택한 긴급도에 따라 IT 팀이 연락드립니다.",
    goDashboard: "대시보드로 이동",
    ticketReference: "티켓 참조번호",
    profileLabel: "직원 프로필",
    slaResponse: "응답 SLA",
    secure: "보안",
    standard: "표준",
    enterpriseEdition: "엔터프라이즈 에디션",
    supportLabel: "24/7 지원",
    workLocation: "위치",
    employeeFallback: "직원",
    defaultDepartment: "정보기술부서",
    defaultPosition: "시스템 담당자",
    employeeLevel: "직원 등급",
    categoryTitle: "문제 분류",
    categorySubtitle: "현재 문제와 가장 잘 맞는 분류를 선택하세요",
    required: "필수 *",
    issueTitle: "문제 상세",
    issueSubtitle: "문제를 명확하게 설명해 주세요",
    commonIssues: "자주 발생하는 문제",
    extraDescription: "추가 설명",
    issuePlaceholder: "증상, 오류 메시지, 발생 시간, 이미 시도한 조치를 적어 주세요...",
    issueHint: "상세한 정보는 문제 해결 속도를 높여 줍니다.",
    attachmentsTitle: "첨부 자료",
    attachmentsSubtitle: "이미지, 문서, 또는 스크린샷",
    attached: "첨부됨",
    optional: "선택 사항",
    cameraTitle: "증빙 사진 촬영",
    cameraOverlayHint: "촬영 후 이미지가 카메라 위에 유지되어 공간을 아낍니다.",
    cameraReviewHint: "이 사진이 바로 증빙 자료로 사용됩니다.",
    cameraReviewFooter: "이 사진을 확정하거나 다시 촬영할 수 있습니다.",
    cameraFooter: "전면/후면 카메라 전환을 지원합니다.",
    switchCamera: "카메라 전환",
    retake: "다시 촬영",
    takePhoto: "사진 촬영",
    usePhoto: "이 사진 사용",
    closeCamera: "카메라 닫기",
    openCamera: "카메라 열기",
    openCameraHint: "현장 사진을 바로 촬영",
    addAttachment: "증빙 추가",
    attachmentMenuHint: "카메라, 이미지, 파일 중에서 선택",
    attachFromCamera: "카메라 사용",
    attachFromGallery: "이미지 선택",
    attachFromFile: "파일 첨부",
    uploadFile: "파일 업로드",
    uploadFileHint: "이미지, PDF, Office 파일, TXT를 5MB 이하로 첨부할 수 있습니다",
    attachmentFile: "첨부 파일",
    galleryFile: "기기 이미지",
    documentFile: "문서 또는 파일",
    pasteCaptureTitle: "클립보드에서 스크린샷 또는 파일 붙여넣기",
    pasteCaptureHint: "이 영역을 클릭한 다음 Win + Shift + S 후 Ctrl + V를 눌러 증빙을 바로 붙여넣으세요",
    pasteCaptureEmpty: "스크린샷, 복사한 이미지, 복사한 파일을 받을 준비가 되었습니다",
    removeAttachment: "첨부 삭제",
    readyToUse: "사용 가능",
    urgencyTitle: "긴급도",
    urgencySubtitle: "영향도 기준으로 선택",
    processingTime: "대응 시간",
    summaryTitle: "요청 요약",
    readyToSubmit: "제출 준비 완료",
    reporter: "신청자",
    category: "분류",
    urgency: "긴급도",
    notSelected: "선택 안 함",
    attachmentSummary: "첨부 자료",
    hasAttachment: "파일 첨부됨",
    noAttachment: "첨부 파일 없음",
    detail: "상세 내용",
    characters: "자",
    submitting: "제출 중...",
    submit: "티켓 제출",
    tipTitle: "신고 팁",
    tipBody: "문제가 시작되기 전 상황, 시작 시점, 스크린샷이나 현장 사진을 함께 남기면 IT 팀이 더 빨리 처리할 수 있습니다.",
    quickHelpTitle: "Quick Help",
    quickHelpBody: "긴급한 문제이거나 접수 도움이 필요하면 IT 팀에 바로 연락하세요.",
    quickHelpPhone: "전화",
    quickHelpEmail: "이메일",
    quickHelpLine: "OA",
    errors: {
      fileTooLarge: "첨부 파일은 5MB 이하여야 합니다.",
      cameraUnavailable: "카메라를 사용할 수 없습니다.",
      captureFailed: "사진을 촬영할 수 없습니다.",
      saveImageFailed: "사진을 저장할 수 없습니다.",
      imageAttached: "사진이 첨부되었습니다.",
      fileAttached: "파일이 첨부되었습니다.",
      imagePasted: "클립보드 이미지가 첨부되었습니다.",
      formInvalid: "분류를 선택하고 문제 내용을 입력해 주세요.",
      userNotFound: "사용자를 찾을 수 없습니다.",
      submitSuccess: "요청이 제출되었습니다.",
      submitFailed: "오류",
    },
  },
};

const CREATE_TICKET_LOCALE = {
  th: "th-TH",
  en: "en-US",
  ko: "ko-KR",
};

function getLocalizedCategories(language) {
  if (language === "ko") {
    return [
      { ...CATEGORIES[0], label: "컴퓨터 / 장비", desc: "PC, 노트북, 모니터, 주변기기" },
      { ...CATEGORIES[1], label: "네트워크 / Wi-Fi", desc: "LAN, Wi-Fi, VPN, 인터넷" },
      { ...CATEGORIES[2], label: "프린터 / 스캔", desc: "프린터, 스캐너, 복합기" },
      { ...CATEGORIES[3], label: "기업 이메일", desc: "Outlook, Exchange, 메일 송수신" },
      { ...CATEGORIES[4], label: "시스템 / 소프트웨어", desc: "OS, 애플리케이션, 사용 권한" },
    ];
  }
  if (language === "en") {
    return [
      { ...CATEGORIES[0], label: "Computer / Equipment", desc: "PC, notebook, monitor, peripherals" },
      { ...CATEGORIES[1], label: "Network / Wi-Fi", desc: "LAN, Wi-Fi, VPN, Internet" },
      { ...CATEGORIES[2], label: "Printer / Scan", desc: "Printer, scanner, copier" },
      { ...CATEGORIES[3], label: "Corporate Email", desc: "Outlook, Exchange, mail delivery" },
      { ...CATEGORIES[4], label: "System / Software", desc: "OS, applications, access rights" },
    ];
  }
  return CATEGORIES;
}

function getLocalizedIssues(language) {
  if (language === "ko") {
    return {
      Hardware: ["전원이 켜지지 않음", "기기가 매우 느림", "블루스크린", "주변기기가 동작하지 않음", "팬 소음이 비정상적임"],
      Network: ["Wi-Fi 연결 불가", "인터넷이 느리거나 자주 끊김", "VPN 연결 불가", "공유 폴더 접근 불가", "DNS / IP 오류"],
      Printer: ["인쇄가 되지 않음", "용지 걸림", "잉크 부족/색상 이상", "문서 스캔 불가", "드라이버 문제"],
      Email: ["메일 송수신 불가", "비밀번호 분실", "Outlook 동기화 실패", "메일함 용량 초과", "서명 설정"],
      System: ["프로그램 멈춤 / 오류", "Admin 권한 요청", "프로그램 설치", "시스템 업데이트 실패", "사내 시스템 접속 불가"],
    };
  }
  if (language === "en") {
    return {
      Hardware: ["Device does not power on", "Device is very slow", "Blue screen", "Peripheral is not working", "Fan noise is abnormal"],
      Network: ["Cannot connect to Wi-Fi", "Internet is slow or unstable", "Cannot connect to VPN", "Cannot access shared folder", "DNS / IP error"],
      Printer: ["Cannot print", "Paper jam", "Ink empty / wrong colors", "Cannot scan documents", "Driver issue"],
      Email: ["Cannot send or receive email", "Forgot password", "Outlook is not syncing", "Mailbox is full", "Set up signature"],
      System: ["Program freezes / error", "Request admin rights", "Install software", "System update failed", "Cannot access internal system"],
    };
  }
  return ISSUES;
}

function getLocalizedUrgency(language) {
  if (language === "ko") {
    return [
      { ...URGENCY[0], label: "일반", desc: "48시간 이내" },
      { ...URGENCY[1], label: "긴급", desc: "24시간 이내" },
      { ...URGENCY[2], label: "위급", desc: "즉시 지원 필요" },
    ];
  }
  if (language === "en") {
    return [
      { ...URGENCY[0], label: "Normal", desc: "Within 48 hours" },
      { ...URGENCY[1], label: "Urgent", desc: "Within 24 hours" },
      { ...URGENCY[2], label: "Critical", desc: "Immediate assistance required" },
    ];
  }
  return URGENCY;
}

function formatLocalizedDateTime(date, language) {
  const locale = CREATE_TICKET_LOCALE[language] || CREATE_TICKET_LOCALE.en;
  return {
    date: date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
  };
}

const CreateTicket = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const { language, tt } = useScopedI18n(CREATE_TICKET_TRANSLATIONS);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketRef, setTicketRef] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [tempImage, setTempImage] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    position: "",
    location: "",
    category: "",
    issue: "",
    urgency: "normal",
    attachment: null,
    profilePic: null,
  });

  const [preview, setPreview] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const hasAttachment = Boolean(form.attachment);
  const attachmentIsImage = isImageFile(form.attachment);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        const user = authUser || session.user;

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        const metadata = user.user_metadata || {};
        const profileData = buildProfileSnapshot(profile || {}, metadata, user);
        const avatarUrl = profileData.avatar_url || profileData.id_card_url || null;
        const resolvedLocation = resolveProfileLocation(profileData);

        setForm((p) => ({
          ...p,
          employeeId: profileData.employee_code || "EMP-001",
          employeeName: profileData.full_name || tt("employeeFallback"),
          department: profileData.department || tt("defaultDepartment"),
          position: profileData.position || tt("defaultPosition"),
          location: resolvedLocation,
          profilePic: avatarUrl,
        }));
      } catch (err) {
        console.error("Profile Error:", err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (!attachmentMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        setAttachmentMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setAttachmentMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [attachmentMenuOpen]);

  const assignAttachment = useCallback((file, options = {}) => {
    if (!file) return false;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      toast.error(tt("errors.fileTooLarge"));
      return false;
    }

    const nextPreview = options.previewUrl ?? (isImageFile(file) ? URL.createObjectURL(file) : null);

    setPreview((currentPreview) => {
      if (currentPreview && currentPreview !== nextPreview && currentPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }
      return nextPreview;
    });

    setForm((previousForm) => ({ ...previousForm, attachment: file }));
    setTempImage(null);
    setIsReviewing(false);
    setIsCameraActive(false);
    setAttachmentMenuOpen(false);

    if (options.toastKey) {
      toast.success(tt(options.toastKey));
    }

    return true;
  }, [tt]);

  const handleFile = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    assignAttachment(file, {
      toastKey: isImageFile(file) ? "errors.imageAttached" : "errors.fileAttached",
    });
  }, [assignAttachment]);

  const clearAttachment = () => {
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setTempImage(null);
    setIsReviewing(false);
    setAttachmentMenuOpen(false);
    setForm((p) => ({ ...p, attachment: null }));
  };

  const capture = useCallback(() => {
    if (!webcamRef.current || typeof webcamRef.current.getScreenshot !== "function") {
      toast.error(tt("errors.cameraUnavailable"));
      return;
    }

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setTempImage(imageSrc);
        setIsReviewing(true);
      }
    } catch (err) {
      console.error("Capture error", err);
      toast.error(tt("errors.captureFailed"));
    }
  }, [tt]);

  const confirmCapture = () => {
    if (!tempImage) return;
    fetch(tempImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        assignAttachment(file, {
          previewUrl: tempImage,
          toastKey: "errors.imageAttached",
        });
      })
      .catch(() => toast.error(tt("errors.saveImageFailed")));
  };

  const handleAttachmentPaste = useCallback((event) => {
    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const clipboardFileItem = clipboardItems.find((item) => item.kind === "file");
    const clipboardFile = clipboardFileItem?.getAsFile?.() || event.clipboardData?.files?.[0];

    if (!clipboardFile) return;

    event.preventDefault();

    const normalizedFile =
      clipboardFile.name
        ? clipboardFile
        : new File([clipboardFile], inferClipboardFileName(clipboardFile), {
            type: clipboardFile.type || "application/octet-stream",
          });

    assignAttachment(normalizedFile, {
      toastKey: isImageFile(normalizedFile) ? "errors.imagePasted" : "errors.fileAttached",
    });
  }, [assignAttachment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.issue.trim()) {
      toast.error(tt("errors.formInvalid"));
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error(tt("errors.userNotFound"));

      let fileUrl = null;
      let resolvedTicketLocation = String(form.location || "").trim();
      if (!resolvedTicketLocation) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        const profileSnapshot = buildProfileSnapshot(profile || {}, user.user_metadata || {}, user);
        resolvedTicketLocation = resolveProfileLocation(profileSnapshot);
      }
      if (form.attachment) {
        try {
          const ext = form.attachment.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_ticket.${ext}`;
          const { error: uploadError } = await supabase
            .storage
            .from("ticket-attachments")
            .upload(fileName, form.attachment);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase
              .storage
              .from("ticket-attachments")
              .getPublicUrl(fileName);
            fileUrl = publicUrl;
          }
        } catch (uploadErr) {
          console.warn("Upload warning:", uploadErr?.message || uploadErr);
        }
      }

      const ticketPayload = {
        creator_id: user.id,
        reporter_name: form.employeeName,
        reporter_emp_id: form.employeeId || null,
        reporter_dept: form.department || null,
        reporter_avatar_url: form.profilePic || null,
        reporter_email: user.email || "",
        department: form.department,
        location: resolvedTicketLocation || null,
        category: form.category,
        title: form.issue.substring(0, 60),
        description: form.issue,
        priority: form.urgency,
        status: "NEW",
        image_url: fileUrl,
      };

      const { data, error } = await insertTicketWithSchemaFallback(
        supabase,
        ticketPayload,
        { select: "id,ticket_no", single: true },
      );

      if (error) throw error;

      const ref = data?.ticket_no || `T${String(data.id).padStart(6, "0")}`;
      setTicketRef(ref);
      setSuccess(true);
      toast.success(tt("errors.submitSuccess"));
    } catch (err) {
      toast.error(`${tt("errors.submitFailed").replace(": {{message}}", "")}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const localizedCategories = getLocalizedCategories(language);
  const localizedIssues = getLocalizedIssues(language);
  const localizedUrgency = getLocalizedUrgency(language);
  const thaiDateTime = formatLocalizedDateTime(currentTime, language);
  const selectedCategory = localizedCategories.find((c) => c.id === form.category);
  const selectedUrgency = localizedUrgency.find((u) => u.id === form.urgency);
  const canSubmit = !!form.category && !!form.issue.trim() && !loading;

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="app-theme min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-50 p-6 "
      >
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25 }}
          className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-8"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[#2b59b0]" />
          <div className="relative">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
              <div className="absolute h-24 w-24 animate-pulse rounded-3xl bg-[#2b59b0]/15 blur-xl" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-[#2b59b0] shadow-lg shadow-[#2b59b0]/25">
                <CheckCircle2 className="text-white" size={48} />
              </div>
            </div>

            <h1 className="text-center text-2xl font-semibold text-slate-900 sm:text-[30px]">
              {tt("successTitle")}
            </h1>
            <p className="mt-2 text-center text-sm text-slate-600 sm:text-base">
              {tt("successSubtitle")}
            </p>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-[11px] font-medium tracking-wide text-slate-500">
                {tt("ticketReference")}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#2b59b0] sm:text-4xl">
                #{String(ticketRef || "").toUpperCase()}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedCategory && (
                  <span className="rounded-full border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-3 py-1.5 text-xs font-semibold text-[#2b59b0]">
                    {selectedCategory.label}
                  </span>
                )}
                {selectedUrgency && (
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedUrgency.chip}`}>
                    {selectedUrgency.label} ({selectedUrgency.priority})
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate("/dashboard")}
              className="mt-6 w-full rounded-xl bg-[#2b59b0] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#244a95] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/30"
            >
              {tt("goDashboard")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="app-theme app-safe-bottom min-h-screen overflow-x-clip bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-800 selection:bg-blue-100 antialiased">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      {/* Clean enterprise background */}

      {/* Premium Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="app-safe-top mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "#f1f5f9" }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-200/80 bg-white/90 p-2.5 text-slate-700 shadow-sm transition-all hover:shadow-md"
            >
              <ArrowLeft size={18} />
            </motion.button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 sm:text-xl">
                  IT Service Desk
                </h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                  {tt("standard")}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                {tt("headerSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:justify-end lg:w-auto">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="hidden items-center gap-3 rounded-xl border border-slate-200/70 bg-white/70 px-4 py-2 backdrop-blur-sm shadow-sm sm:flex"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
                <Calendar size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">{thaiDateTime.date}</p>
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">{thaiDateTime.time}</p>
              </div>
            </motion.div>

            <div className="flex w-full items-center justify-between gap-2 min-[420px]:w-auto min-[420px]:justify-end">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2">
                <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <div className="absolute -inset-1 animate-ping rounded-full bg-emerald-500 opacity-20" />
                </div>
                <span className="text-xs font-bold text-emerald-700">{tt("ready")}</span>
              </div>

              <div className="flex items-center rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm">
                <LanguageSwitcher mode="nav" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-3 py-5 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:py-8">
        {/* Left Column - Main Form */}
        <div className="space-y-5 lg:col-span-8 sm:space-y-6">
          <form id="create-ticket-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Card */}
            <motion.section
              {...sectionAnim}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_12px_32px_-22px_rgba(15,23,42,0.3)] sm:p-8"
            >
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-md shadow-slate-200/70 sm:h-24 sm:w-24">
                    <div className="h-full w-full overflow-hidden rounded-[14px] border border-white bg-white">
                      {form.profilePic ? (
                        <img
                          src={form.profilePic}
                          alt="Profile"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${form.employeeName}&background=6366f1&color=fff&size=96`;
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                          <User size={36} className="text-slate-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2">
                    <div className="relative">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-md">
                        <CheckCircle2 size={12} className="text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2b59b0]">
                        {tt("profileLabel")}
                      </p>
                      <h2 className="text-xl font-black text-slate-800 sm:text-2xl">
                        {form.employeeName || tt("employeeFallback")}
                      </h2>
                    </div>
                    <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
                      <Hash size={12} className="inline mr-1" />
                      {form.employeeId || "EMP-001"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Briefcase size={16} className="text-indigo-500" />
                      <span className="font-medium">{form.position || tt("defaultPosition")}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building size={16} className="text-indigo-500" />
                      <span className="font-medium">{form.department || tt("defaultDepartment")}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={16} className="text-indigo-500" />
                      <span className="font-medium">
                        {tt("workLocation")}: {String(form.location || "").trim() || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Category Selection */}
            <motion.section
              {...sectionAnim}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="relative">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600" />
                      <div className="absolute -inset-1 animate-pulse rounded-full bg-indigo-500/20 blur-sm" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 sm:text-base">{tt("categoryTitle")}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{tt("categorySubtitle")}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    {tt("required")}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {localizedCategories.map((cat) => {
                    const Icon = cat.icon;
                    const selected = form.category === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        type="button"
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setForm((p) => ({ ...p, category: cat.id, issue: "" }))}
                        className={`
                          relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300
                          ${selected
                            ? `bg-gradient-to-br ${cat.selectedClass} text-white shadow-md`
                            : "bg-white border-slate-200/80 hover:border-slate-400 hover:shadow-sm"
                          }
                        `}
                      >
                        <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/5 blur-2xl" />

                        <div className="relative">
                          <div className="mb-4 flex items-center justify-between">
                            <div className={`
                              rounded-xl p-2.5 transition-all duration-300
                              ${selected ? 'bg-white' : cat.softClass}
                            `}>
                              <Icon size={20} className={cat.iconClass} />
                            </div>
                            {selected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="rounded-full bg-white/20 p-1"
                              >
                                <CheckCircle2 size={16} className="text-white" />
                              </motion.div>
                            )}
                          </div>

                          <p className={`text-sm font-bold mb-1 ${selected ? 'text-white' : 'text-slate-800'}`}>
                            {cat.label}
                          </p>
                          <p className={`text-xs ${selected ? 'text-white/80' : 'text-slate-500'}`}>
                            {cat.desc}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.section>

            {/* Issue Details */}
            <AnimatePresence mode="wait">
              {form.category && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                >
                  <div className="relative">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-amber-500 to-orange-500" />
                          <div className="absolute -inset-1 animate-pulse rounded-full bg-amber-500/20 blur-sm" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 sm:text-base">{tt("issueTitle")}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{tt("issueSubtitle")}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        {tt("required")}
                      </span>
                    </div>

                    <div className="mb-5">
                      <label className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <Sparkles size={14} className="text-amber-500" />
                        {tt("commonIssues")}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(localizedIssues[form.category] || []).map((item, idx) => (
                          <motion.button
                            key={item}
                            type="button"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.03 }}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setForm((p) => ({ ...p, issue: item }))}
                            className={`
                              rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 border-2
                              ${form.issue === item
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-lg shadow-amber-200/50"
                                : "bg-slate-100 border-transparent text-slate-700 hover:bg-amber-50 hover:border-amber-300"
                              }
                            `}
                          >
                            {item}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <FileText size={14} className="text-blue-500" />
                        {tt("extraDescription")}
                      </label>
                      <div className="relative group/textarea">
                        <textarea
                          required
                          maxLength={500}
                          value={form.issue}
                          onChange={(e) => setForm((p) => ({ ...p, issue: e.target.value }))}
                          onFocus={() => setFocusedField('description')}
                          onBlur={() => setFocusedField(null)}
                          placeholder={tt("issuePlaceholder")}
                          className={`
                            min-h-[180px] w-full rounded-2xl border-2 px-5 py-4 text-sm
                            outline-none transition-all duration-300 resize-none
                            bg-slate-50/80 placeholder:text-slate-400
                            ${focusedField === 'description'
                              ? 'border-indigo-500 bg-white ring-4 ring-indigo-100/50 shadow-md'
                              : 'border-slate-200/80 hover:border-slate-300'
                            }
                          `}
                        />
                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                          <div className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-lg border border-slate-200 shadow-sm">
                            <span className="text-xs font-bold text-slate-500">
                              {form.issue.length}/500
                            </span>
                          </div>
                          {form.issue.length > 20 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg"
                            >
                              <CheckCircle2 size={14} className="text-white" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Info size={14} />
                        {tt("issueHint")}
                      </p>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Attachment Section */}
            <motion.section
              {...sectionAnim}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="relative">
                <input
                  ref={imageInputRef}
                  type="file"
                  hidden
                  accept={IMAGE_FILE_ACCEPT}
                  onChange={handleFile}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept={GENERIC_FILE_ACCEPT}
                  onChange={handleFile}
                />

                <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-cyan-600 to-teal-600" />
                      <div className="absolute -inset-1 animate-pulse rounded-full bg-cyan-500/20 blur-sm" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 sm:text-base">{tt("attachmentsTitle")}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{tt("attachmentsSubtitle")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                      ${hasAttachment
                        ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-200/50"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                      }
                    `}>
                      <Camera size={14} />
                      {hasAttachment ? tt("attached") : tt("optional")}
                    </div>

                    <div ref={attachmentMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setAttachmentMenuOpen((open) => !open)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#2b59b0]/30 hover:text-[#244a95]"
                      >
                        <Paperclip size={14} />
                        <span className="hidden sm:inline">{tt("addAttachment")}</span>
                      </button>

                      <AnimatePresence>
                        {attachmentMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                          >
                            <p className="px-3 pb-2 pt-1 text-[11px] font-semibold text-slate-500">
                              {tt("attachmentMenuHint")}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setAttachmentMenuOpen(false);
                                setIsCameraActive(true);
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-[#244a95]"
                            >
                              <Camera size={16} className="text-indigo-600" />
                              {tt("attachFromCamera")}
                            </button>
                            <button
                              type="button"
                              onClick={() => imageInputRef.current?.click()}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              <ImageIcon size={16} className="text-emerald-600" />
                              {tt("attachFromGallery")}
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-amber-50 hover:text-amber-700"
                            >
                              <FileText size={16} className="text-amber-600" />
                              {tt("attachFromFile")}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {isCameraActive ? (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-200 bg-black/5 shadow-lg">
                      <Webcam
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.92}
                        mirrored={facingMode === "user"}
                        videoConstraints={{ facingMode }}
                        className={`aspect-video w-full object-cover transition duration-200 ${isReviewing ? "opacity-25" : "opacity-100"}`}
                      />
                      {isReviewing && tempImage && (
                        <img src={tempImage} alt="preview capture" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-slate-950/80 to-transparent px-4 py-3 text-white">
                        <div className="min-w-0">
                          <p className="text-sm font-bold">{tt("cameraTitle")}</p>
                          <p className="text-[11px] text-white/75">
                            {isReviewing ? tt("cameraReviewHint") : tt("cameraOverlayHint")}
                          </p>
                        </div>
                        {isReviewing && (
                          <span className="inline-flex rounded-full border border-white/15 bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                            {tt("readyToUse")}
                          </span>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] text-white/75">
                          {isReviewing ? tt("cameraReviewFooter") : tt("cameraFooter")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {!isReviewing && (
                            <button
                              type="button"
                              onClick={() => setFacingMode((mode) => (mode === "user" ? "environment" : "user"))}
                              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                            >
                              <FlipHorizontal size={14} />
                              <span className="hidden sm:inline">{tt("switchCamera")}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={isReviewing ? () => { setIsReviewing(false); setTempImage(null); } : capture}
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isReviewing ? "bg-white text-[#244a95]" : "bg-white text-[#244a95]"}`}
                          >
                            <Camera size={14} />
                            {isReviewing ? tt("retake") : tt("takePhoto")}
                          </button>
                          {isReviewing && (
                            <button
                              type="button"
                              onClick={confirmCapture}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                              <CheckCircle2 size={14} />
                              {tt("usePhoto")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCameraActive(false);
                        setIsReviewing(false);
                        setTempImage(null);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      {tt("closeCamera")}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-cyan-50/60 p-4 shadow-inner sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                        <Camera size={13} />
                        {tt("attachFromCamera")}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                        <ImageIcon size={13} />
                        {tt("galleryFile")}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                        <FileText size={13} />
                        {tt("documentFile")}
                      </span>
                    </div>

                    <div
                      tabIndex={0}
                      onPaste={handleAttachmentPaste}
                      onFocus={() => setFocusedField("attachmentPaste")}
                      onBlur={() => setFocusedField((current) => (current === "attachmentPaste" ? null : current))}
                      className={`
                        group rounded-2xl border-2 border-dashed bg-white/90 p-5 outline-none transition-all
                        ${focusedField === "attachmentPaste"
                          ? "border-[#2b59b0] shadow-lg shadow-[#2b59b0]/10"
                          : "border-slate-200 hover:border-[#2b59b0]/40"
                        }
                      `}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2b59b0]/10 to-cyan-100 text-[#2b59b0]">
                          <Upload size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800">{tt("pasteCaptureTitle")}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{tt("pasteCaptureHint")}</p>
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {tt("pasteCaptureEmpty")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-[11px] leading-5 text-slate-500">
                      {tt("uploadFileHint")}
                    </p>
                  </div>
                )}

                {hasAttachment && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 overflow-hidden rounded-2xl border-2 border-slate-200/80 bg-white shadow-lg"
                  >
                    {attachmentIsImage && preview ? (
                      <img src={preview} alt="attachment preview" className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="flex items-center gap-3 bg-gradient-to-r from-slate-50 to-white px-4 py-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                          <FileText size={22} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {form.attachment?.name || tt("attachmentFile")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatAttachmentSize(form.attachment?.size)} • {tt("readyToUse")}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${attachmentIsImage ? "bg-gradient-to-br from-indigo-100 to-purple-100" : "bg-gradient-to-br from-amber-100 to-orange-100"}`}>
                          {attachmentIsImage ? (
                            <ImageIcon size={16} className="text-indigo-600" />
                          ) : (
                            <FileText size={16} className="text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="max-w-[13rem] truncate text-xs font-bold text-slate-700">
                            {form.attachment?.name || tt("attachmentFile")}
                          </p>
                          <p className="text-[9px] text-slate-500">
                            {formatAttachmentSize(form.attachment?.size)} • {tt("readyToUse")}
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={clearAttachment}
                        aria-label={tt("removeAttachment")}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.section>
          </form>
        </div>

        {/* Right Column - Summary & Submit */}
        <div className="lg:col-span-4 space-y-6">
          {/* Priority Card */}
          <motion.section
            {...sectionAnim}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="relative">
                  <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-amber-500 to-red-500" />
                  <div className="absolute -inset-1 animate-pulse rounded-full bg-amber-500/20 blur-sm" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 sm:text-base">{tt("urgencyTitle")}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{tt("urgencySubtitle")}</p>
                </div>
              </div>

              <div className="space-y-3">
                {localizedUrgency.map((item, idx) => {
                  const active = form.urgency === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setForm((p) => ({ ...p, urgency: item.id }))}
                      className={`
                        w-full rounded-xl border-2 p-4 text-left transition-all duration-300
                        ${active
                          ? `${item.border} ${item.selectedBg} shadow-lg`
                          : "bg-white border-slate-200/80 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-white"
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${item.dot} ${active ? 'animate-pulse' : ''}`} />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className={`text-sm font-bold ${active ? `text-${item.color}-700` : 'text-slate-800'}`}>
                                {item.label}
                              </p>
                              <span className={`
                                rounded-full px-2 py-0.5 text-[9px] font-bold font-mono
                                ${active ? item.chip : 'bg-slate-100 text-slate-600 border border-slate-200'}
                              `}>
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">SLA: {item.desc}</p>
                          </div>
                        </div>
                        {active && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`h-2 w-2 rounded-full bg-${item.color}-500 animate-pulse`}
                          />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* SLA Timeline */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-500" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{tt("slaResponse")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {localizedUrgency.map((u) => (
                      <div
                        key={u.id}
                        className={`
                          h-1.5 rounded-full transition-all duration-300
                          ${form.urgency === u.id
                            ? `w-8 bg-gradient-to-r ${u.gradient}`
                            : 'w-4 bg-slate-200'
                          }
                        `}
                      />
                    ))}
                  </div>
                </div>
                {selectedUrgency && (
                  <p className="text-[9px] text-slate-500 mt-2">
                    {tt("processingTime")}: <span className="font-bold text-slate-700">{selectedUrgency.desc}</span>
                  </p>
                )}
              </div>
            </div>
          </motion.section>

          {/* Premium Summary Card */}
          <motion.section
            {...sectionAnim}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="relative">
                  <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600" />
                  <div className="absolute -inset-1 animate-pulse rounded-full bg-indigo-500/20 blur-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <FileText size={16} className="text-white" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                    {tt("summaryTitle")}
                  </h3>
                </div>
                {canSubmit && (
                  <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                    <Sparkles size={12} className="text-amber-600" />
                    <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">{tt("readyToSubmit")}</span>
                  </div>
                )}
              </div>

              {/* Summary Grid */}
              <div className="space-y-3">
                <div className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-4 border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                      <User size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{tt("reporter")}</p>
                      <p className="text-sm font-bold text-slate-800">{form.employeeName || "-"}</p>
                      <p className="text-[10px] text-slate-500">{form.position || "-"} • {form.department || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
                  <div className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-3 border border-slate-200/80">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tt("category")}</p>
                    {selectedCategory ? (
                      <div className="flex items-center gap-1.5">
                        <div className={`h-6 w-6 rounded-lg ${selectedCategory.softClass} flex items-center justify-center`}>
                          <selectedCategory.icon size={14} className={selectedCategory.iconClass} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">{selectedCategory.label}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">{tt("notSelected")}</p>
                    )}
                  </div>

                  <div className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-3 border border-slate-200/80">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tt("urgency")}</p>
                    {selectedUrgency ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${selectedUrgency.dot} animate-pulse`} />
                        <span className="text-xs font-bold text-slate-800">{selectedUrgency.label}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${selectedUrgency.chip}`}>
                          {selectedUrgency.priority}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">{tt("notSelected")}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-3 border border-slate-200/80">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">{tt("attachmentSummary")}</p>
                  {hasAttachment ? (
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${attachmentIsImage ? "bg-gradient-to-br from-cyan-100 to-teal-100" : "bg-gradient-to-br from-amber-100 to-orange-100"}`}>
                        {attachmentIsImage ? (
                          <ImageIcon size={16} className="text-cyan-600" />
                        ) : (
                          <FileText size={16} className="text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="max-w-[12rem] truncate text-xs font-bold text-slate-800">
                          {form.attachment?.name || tt("hasAttachment")}
                        </p>
                        <p className="text-[8px] text-slate-500">
                          {formatAttachmentSize(form.attachment?.size)} • {tt("readyToSubmit")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Camera size={16} className="text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500">{tt("noAttachment")}</p>
                    </div>
                  )}
                </div>

                {form.issue && (
                  <div className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-3 border border-slate-200/80">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tt("detail")}</p>
                    <p className="text-xs text-slate-700 line-clamp-2">{form.issue}</p>
                    <p className="text-[8px] text-slate-400 mt-1">{form.issue.length}/500 {tt("characters")}</p>
                  </div>
                )}
              </div>

              {/* Premium Submit Button */}
              <div className="relative mt-6">
                <button
                  type="submit"
                  form="create-ticket-form"
                  disabled={!canSubmit}
                  className={`
                    relative w-full py-4 px-6 rounded-xl font-bold text-sm
                    flex items-center justify-center gap-3 transition-all duration-300
                    overflow-hidden group/btn
                    ${canSubmit && !loading
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />

                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span className="bg-gradient-to-r from-white via-indigo-100 to-white bg-clip-text text-transparent">
                        {tt("submitting")}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <Zap size={18} className="text-yellow-300 fill-yellow-300 group-hover/btn:rotate-12 group-hover/btn:scale-125 transition-all duration-300" />
                        <div className="absolute -inset-1 bg-white/30 rounded-full blur-sm animate-ping opacity-0 group-hover/btn:opacity-100" />
                      </div>
                      <span className="bg-gradient-to-r from-white via-indigo-100 to-white bg-clip-text text-transparent">
                        {tt("submit")}
                      </span>
                      <ChevronRight size={18} className="group-hover/btn:translate-x-2 transition-transform duration-300" />
                    </>
                  )}
                </button>
              </div>

              {/* Security & Time Footer */}
              <div className="mt-5 flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/80 backdrop-blur rounded-lg border border-slate-200/80 shadow-sm">
                  <Shield size={12} className="text-indigo-600" />
                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{tt("secure")}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/80 backdrop-blur rounded-lg border border-slate-200/80 shadow-sm">
                  <Clock size={12} className="text-indigo-600" />
                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{thaiDateTime.time}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg border border-slate-200 shadow-sm">
                  <Crown size={12} className="text-amber-600" />
                  <span className="text-[8px] font-bold text-slate-700 uppercase tracking-wider">{tt("standard")}</span>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2b59b0]/10 to-cyan-100 text-[#244a95]">
                <Phone size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">{tt("quickHelpTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{tt("quickHelpBody")}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <a
                href="tel:038394337"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:border-[#2b59b0]/25 hover:bg-[#2b59b0]/5"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Phone size={14} className="text-[#2b59b0]" />
                  {tt("quickHelpPhone")}
                </span>
                <span className="font-bold text-slate-800">038 394 337</span>
              </a>
              <a
                href="mailto:it@tdk.co.th"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:border-[#2b59b0]/25 hover:bg-[#2b59b0]/5"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Mail size={14} className="text-[#2b59b0]" />
                  {tt("quickHelpEmail")}
                </span>
                <span className="truncate font-bold text-slate-800">it@tdk.co.th</span>
              </a>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                <span className="flex items-center gap-2 font-semibold">
                  <Hash size={14} className="text-[#2b59b0]" />
                  {tt("quickHelpLine")}
                </span>
                <span className="font-bold text-slate-800">TF Team</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Info size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1">{tt("tipTitle")}</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {tt("tipBody")}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Premium Footer */}
      <footer className="app-safe-bottom relative z-10 mx-auto w-full max-w-7xl px-3 pb-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200/80 pt-5 text-[9px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Building size={12} className="text-indigo-400" />
            IT Service Management System v3.0
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <Gem size={12} className="text-indigo-400" />
            {tt("enterpriseEdition")}
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <Heart size={12} className="text-indigo-400" />
            {tt("supportLabel")}
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="text-indigo-400" />
            {thaiDateTime.date}
          </span>
        </div>
      </footer>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CreateTicket;

