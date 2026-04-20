import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Download,
  RefreshCw,
  Calendar,
  Eye,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Laptop,
  FileText,
  Hash,
  TrendingUp,
  Filter,
  ExternalLink,
  Sparkles,
  CircleSlash,
  Hammer,
  UserRound,
} from "lucide-react";
import Swal from "sweetalert2";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useScopedI18n } from "../i18n/useScopedI18n";
import {
  getTicketAttachmentEntries,
  getTicketAttachmentUrls,
  getTicketDisplayNote,
} from "../lib/ticketAttachmentMetadata";
import {
  formatNotebookDuration,
  formatNotebookTime,
  isNotebookPermissionDenied,
  isNotebookSchemaError,
  loadMyNotebookBorrowLogs,
  NOTEBOOK_LOG_STATUS,
} from "../services/notebookBorrowService";
import { splitTicketBuckets } from "../lib/serviceRequestUtils";


const TICKET_HISTORY_TRANSLATIONS = {
  th: {
    notebookPending: 'รออนุมัติ',
    notebookApproved: 'กำลังยืม',
    notebookReturned: 'รอยืนยันคืน',
    statusAll: 'ทุกสถานะ',
    statusPending: 'รอดำเนินการ',
    statusNew: 'งานใหม่',
    statusInProgress: 'กำลังซ่อม',
    statusClosed: 'สำเร็จ',
    priorityAll: 'ทุกความเร่งด่วน',
    priorityUrgent: 'ด่วน',
    priorityHigh: 'สูง',
    priorityNormal: 'ปกติ',
    priorityLow: 'ต่ำ',
    priorityUnknown: 'ไม่ระบุ',
    notFound: 'ไม่ระบุ',
    avgHours: '{{n}} ชม.',
    avgZero: '0 ชม.',
    searchPlaceholder: 'ค้นหาเลขที่แจ้งซ่อม, หัวข้อ, หมวดหมู่, รายละเอียด...',
    categoryAll: 'ทุกหมวดหมู่',
    showCount: 'แสดง {{filtered}} จาก {{total}} รายการ',
    activeFilter: 'มีตัวกรองที่ใช้งาน',
    clearAll: 'ล้างตัวกรองทั้งหมด',
    clearFilter: 'ล้างตัวกรอง',
    colTitle: 'หัวข้อ',
    colStatus: 'สถานะ',
    colPriority: 'ความเร่งด่วน',
    colDate: 'วันที่แจ้ง',
    colActions: 'จัดการ',
    noTitle: 'ไม่ระบุหัวข้อ',
    noCategory: 'ไม่ระบุหมวดหมู่',
    emptyTitle: 'ไม่พบรายการ',
    emptyFiltered: 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา',
    emptyNoHistory: 'คุณยังไม่มีประวัติการแจ้งซ่อม',
    viewDetail: 'ดูรายละเอียด',
    notebookSectionBadge: 'Notebook Center',
    notebookSectionTitle: 'ประวัติยืม-คืนโน้ตบุ๊ก',
    notebookSectionSubtitle: 'บันทึกการยืม วันที่คืน ระยะเวลา เหตุผล และสถานที่ใช้งาน',
    nbTotal: 'ทั้งหมด',
    nbPending: 'รออนุมัติ',
    nbActive: 'กำลังยืม',
    nbReturned: 'คืนแล้ว',
    nbLoading: 'กำลังโหลดประวัติ notebook...',
    nbEmptyTitle: 'ยังไม่มีประวัติยืม-คืน notebook',
    nbEmptyDesc: 'เมื่อมีการยืมหรือคืน notebook รายการจะมาแสดงในส่วนนี้',
    nbBorrowCount: 'ยืม {{n}} ครั้ง',
    nbBorrowTime: 'ยืม',
    nbReturnTime: 'คืน',
    nbUsedTime: 'ใช้ไป',
    nbReasonLocation: 'เหตุผล / สถานที่',
    nbLocation: 'ใช้ที่:',
    nbProofImage: 'รูปประกอบ',
    nbNoImage: 'ไม่มีรูปประกอบ',
    nbOpenImage: 'เปิดรูปประกอบ',
    nbBorrower: 'ผู้ยืม:',
    nbReturnConfirmed: 'ยืนยันคืนแล้ว',
    nbAwaitingIT: 'รอยืนยันจาก IT',
    errorSchema: 'ยังไม่ได้ติดตั้ง schema notebook borrowing',
    errorPermission: 'ไม่มีสิทธิ์ดูประวัติ notebook ของคุณ',
    errorLoad: 'ไม่สามารถโหลดประวัติยืม-คืน notebook ได้',
    exportNoData: 'ไม่มีข้อมูลให้ส่งออก',
    exportNoDataSub: 'กรุณาปรับตัวกรองหรือลองอีกครั้ง',
    exportConfirmTitle: 'ส่งออกข้อมูล',
    exportConfirmText: 'ต้องการส่งออกเป็นไฟล์ Excel (.xlsx) พร้อมรูปประกอบหรือไม่?',
    exportBtn: 'ส่งออก Excel',
    exportCancel: 'ยกเลิก',
    exportSuccessTitle: 'ส่งออกสำเร็จ',
    exportSuccessText: 'ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว (ระบบจะแนบรูปแรกของแต่ละ Ticket)',
    exportErrorTitle: 'ส่งออกไม่สำเร็จ',
    exportErrorText: 'ไม่สามารถสร้างไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง',
    excelNo: 'เลขที่',
    excelTitle: 'หัวข้อ',
    excelStatus: 'สถานะ',
    excelCategory: 'หมวดหมู่',
    excelPriority: 'ความเร่งด่วน',
    excelCreatedAt: 'วันที่แจ้ง',
    excelClosedAt: 'วันที่ปิด',
    excelImage: 'รูปภาพ',
    excelImageLinks: 'ลิงก์รูปภาพ',
    excelHasImage: 'แนบรูปแล้ว',
    excelNotClosed: 'ยังไม่ปิด',
    ticketLoadError: 'เกิดข้อผิดพลาด',
    ticketLoadErrorText: 'ไม่สามารถโหลดประวัติการแจ้งซ่อมได้',
    detailNoTitle: 'ไม่ระบุหัวข้อ',
    detailCloseLabel: 'ปิดหน้าต่างรายละเอียด',
    detailProblem: 'รายละเอียดปัญหา',
    detailNoProblem: 'ไม่ระบุรายละเอียด',
    detailAttachments: 'หลักฐานที่แนบมา',
    detailOpenAttach: 'เปิดรูปแนบ',
    detailAttachAlt: 'หลักฐานแนบ',
    detailRepairInfo: 'ข้อมูลการซ่อม',
    detailAssigned: 'ผู้รับผิดชอบ',
    detailPending: 'รอการมอบหมาย',
    detailSolution: 'สรุปการซ่อม',
    detailCategory: 'หมวดหมู่',
    detailLocation: 'สถานที่',
    detailCreatedAt: 'วันที่แจ้ง',
    detailClosedAt: 'วันที่ปิด',
    detailNotClosed: 'ยังไม่ปิด',
    detailUnknown: 'ไม่ระบุ',
    detailClose: 'ปิด',
    detailNewTicket: 'สร้างใบแจ้งซ่อมใหม่',
    fetchErrorTitle: 'เกิดข้อผิดพลาด',
    fetchErrorText: 'ไม่สามารถโหลดประวัติการแจ้งซ่อมได้',
  },
  en: {
    notebookPending: 'Pending Approval',
    notebookApproved: 'Borrowed',
    notebookReturned: 'Awaiting Return',
    statusAll: 'All statuses',
    statusPending: 'Pending',
    statusNew: 'New',
    statusInProgress: 'In Progress',
    statusClosed: 'Closed',
    priorityAll: 'All priorities',
    priorityUrgent: 'Urgent',
    priorityHigh: 'High',
    priorityNormal: 'Normal',
    priorityLow: 'Low',
    priorityUnknown: 'Unknown',
    notFound: 'Unknown',
    avgHours: '{{n}} hrs',
    avgZero: '0 hrs',
    searchPlaceholder: 'Search ticket no., title, category, description...',
    categoryAll: 'All categories',
    showCount: 'Showing {{filtered}} of {{total}} items',
    activeFilter: 'Active filters applied',
    clearAll: 'Clear all filters',
    clearFilter: 'Clear filters',
    colTitle: 'Title',
    colStatus: 'Status',
    colPriority: 'Priority',
    colDate: 'Date',
    colActions: 'Actions',
    noTitle: 'No title',
    noCategory: 'No category',
    emptyTitle: 'No results found',
    emptyFiltered: 'No items match the current search criteria',
    emptyNoHistory: 'You have no repair ticket history yet',
    viewDetail: 'View detail',
    notebookSectionBadge: 'Notebook Center',
    notebookSectionTitle: 'Notebook Borrow History',
    notebookSectionSubtitle: 'Records of borrowing dates, return dates, duration, reasons, and locations.',
    nbTotal: 'Total',
    nbPending: 'Pending',
    nbActive: 'Borrowed',
    nbReturned: 'Returned',
    nbLoading: 'Loading notebook history...',
    nbEmptyTitle: 'No notebook borrow history yet',
    nbEmptyDesc: 'Entries will appear here once a notebook is borrowed or returned.',
    nbBorrowCount: 'Borrowed {{n}} time(s)',
    nbBorrowTime: 'Borrowed',
    nbReturnTime: 'Returned',
    nbUsedTime: 'Duration',
    nbReasonLocation: 'Reason / Location',
    nbLocation: 'Used at:',
    nbProofImage: 'Proof image',
    nbNoImage: 'No image attached',
    nbOpenImage: 'Open proof image',
    nbBorrower: 'Borrower:',
    nbReturnConfirmed: 'Return confirmed',
    nbAwaitingIT: 'Awaiting IT confirmation',
    errorSchema: 'Notebook borrowing schema is not installed',
    errorPermission: 'You do not have permission to view notebook history',
    errorLoad: 'Unable to load notebook borrow history',
    exportNoData: 'No data to export',
    exportNoDataSub: 'Please adjust the filters and try again',
    exportConfirmTitle: 'Export data',
    exportConfirmText: 'Export to Excel (.xlsx) with attached images?',
    exportBtn: 'Export Excel',
    exportCancel: 'Cancel',
    exportSuccessTitle: 'Export successful',
    exportSuccessText: 'Excel file downloaded (first image per ticket is embedded)',
    exportErrorTitle: 'Export failed',
    exportErrorText: 'Unable to create the Excel file. Please try again.',
    excelNo: 'No.',
    excelTitle: 'Title',
    excelStatus: 'Status',
    excelCategory: 'Category',
    excelPriority: 'Priority',
    excelCreatedAt: 'Created at',
    excelClosedAt: 'Closed at',
    excelImage: 'Image',
    excelImageLinks: 'Image links',
    excelHasImage: 'Attached',
    excelNotClosed: 'Not closed',
    ticketLoadError: 'Error',
    ticketLoadErrorText: 'Unable to load ticket history',
    detailNoTitle: 'No title',
    detailCloseLabel: 'Close detail panel',
    detailProblem: 'Problem description',
    detailNoProblem: 'No description provided',
    detailAttachments: 'Attached evidence',
    detailOpenAttach: 'Open attached image',
    detailAttachAlt: 'Attachment',
    detailRepairInfo: 'Repair information',
    detailAssigned: 'Assigned to',
    detailPending: 'Awaiting assignment',
    detailSolution: 'Repair summary',
    detailCategory: 'Category',
    detailLocation: 'Location',
    detailCreatedAt: 'Created at',
    detailClosedAt: 'Closed at',
    detailNotClosed: 'Not closed yet',
    detailUnknown: 'Unknown',
    detailClose: 'Close',
    detailNewTicket: 'Create new ticket',
    fetchErrorTitle: 'Error',
    fetchErrorText: 'Unable to load ticket history',
  },
  ko: {
    notebookPending: '승인 대기',
    notebookApproved: '대여 중',
    notebookReturned: '반납 확인 대기',
    statusAll: '전체 상태',
    statusPending: '대기 중',
    statusNew: '신규',
    statusInProgress: '수리 중',
    statusClosed: '완료',
    priorityAll: '전체 긴급도',
    priorityUrgent: '긴급',
    priorityHigh: '높음',
    priorityNormal: '보통',
    priorityLow: '낮음',
    priorityUnknown: '미상',
    notFound: '미상',
    avgHours: '{{n}}시간',
    avgZero: '0시간',
    searchPlaceholder: '티켓 번호, 제목, 카테고리, 설명 검색...',
    categoryAll: '전체 카테고리',
    showCount: '{{filtered}} / {{total}}건 표시',
    activeFilter: '필터 적용 중',
    clearAll: '전체 필터 초기화',
    clearFilter: '필터 초기화',
    colTitle: '제목',
    colStatus: '상태',
    colPriority: '긴급도',
    colDate: '접수일',
    colActions: '관리',
    noTitle: '제목 없음',
    noCategory: '카테고리 없음',
    emptyTitle: '결과 없음',
    emptyFiltered: '검색 조건에 맞는 항목이 없습니다',
    emptyNoHistory: '수리 접수 이력이 없습니다',
    viewDetail: '상세 보기',
    notebookSectionBadge: 'Notebook Center',
    notebookSectionTitle: '노트북 대여 이력',
    notebookSectionSubtitle: '대여일, 반납일, 사용 기간, 사유, 사용 장소를 기록합니다.',
    nbTotal: '전체',
    nbPending: '승인 대기',
    nbActive: '대여 중',
    nbReturned: '반납 완료',
    nbLoading: '노트북 이력 불러오는 중...',
    nbEmptyTitle: '노트북 대여 이력이 없습니다',
    nbEmptyDesc: '노트북을 대여하거나 반납하면 여기에 표시됩니다.',
    nbBorrowCount: '{{n}}회 대여',
    nbBorrowTime: '대여',
    nbReturnTime: '반납',
    nbUsedTime: '사용 기간',
    nbReasonLocation: '사유 / 위치',
    nbLocation: '사용 장소:',
    nbProofImage: '증빙 사진',
    nbNoImage: '첨부 사진 없음',
    nbOpenImage: '증빙 사진 열기',
    nbBorrower: '대여자:',
    nbReturnConfirmed: '반납 확인됨',
    nbAwaitingIT: 'IT 확인 대기 중',
    errorSchema: '노트북 대여 스키마가 설치되지 않았습니다',
    errorPermission: '노트북 이력을 조회할 권한이 없습니다',
    errorLoad: '노트북 대여 이력을 불러올 수 없습니다',
    exportNoData: '내보낼 데이터가 없습니다',
    exportNoDataSub: '필터를 조정한 후 다시 시도해 주세요',
    exportConfirmTitle: '데이터 내보내기',
    exportConfirmText: '이미지 포함 Excel(.xlsx)로 내보내시겠습니까?',
    exportBtn: 'Excel 내보내기',
    exportCancel: '취소',
    exportSuccessTitle: '내보내기 완료',
    exportSuccessText: 'Excel 파일이 다운로드되었습니다 (티켓당 첫 번째 이미지 포함)',
    exportErrorTitle: '내보내기 실패',
    exportErrorText: 'Excel 파일을 생성할 수 없습니다. 다시 시도해 주세요.',
    excelNo: '번호',
    excelTitle: '제목',
    excelStatus: '상태',
    excelCategory: '카테고리',
    excelPriority: '긴급도',
    excelCreatedAt: '접수일',
    excelClosedAt: '완료일',
    excelImage: '이미지',
    excelImageLinks: '이미지 링크',
    excelHasImage: '첨부됨',
    excelNotClosed: '미완료',
    ticketLoadError: '오류',
    ticketLoadErrorText: '티켓 이력을 불러올 수 없습니다',
    detailNoTitle: '제목 없음',
    detailCloseLabel: '상세 패널 닫기',
    detailProblem: '문제 설명',
    detailNoProblem: '설명 없음',
    detailAttachments: '첨부 증빙',
    detailOpenAttach: '첨부 이미지 열기',
    detailAttachAlt: '첨부',
    detailRepairInfo: '수리 정보',
    detailAssigned: '담당자',
    detailPending: '담당자 배정 대기',
    detailSolution: '수리 요약',
    detailCategory: '카테고리',
    detailLocation: '위치',
    detailCreatedAt: '접수일',
    detailClosedAt: '완료일',
    detailNotClosed: '미완료',
    detailUnknown: '미상',
    detailClose: '닫기',
    detailNewTicket: '새 수리 접수 생성',
    fetchErrorTitle: '오류',
    fetchErrorText: '티켓 이력을 불러올 수 없습니다',
  },
};

const buildNotebookLogMeta = (tt) => ({
  pending: { label: tt('notebookPending'), cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: tt('notebookApproved'), cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  returned: { label: tt('notebookReturned'), cls: 'bg-violet-50 text-violet-700 border-violet-200' },
});

const buildStatusOptions = (tt) => [
  { value: 'ALL', label: tt('statusAll') },
  { value: 'PENDING', label: tt('statusPending') },
  { value: 'NEW', label: tt('statusNew') },
  { value: 'IN_PROGRESS', label: tt('statusInProgress') },
  { value: 'CLOSED', label: tt('statusClosed') },
];

const buildPriorityOptions = (tt) => [
  { value: 'ALL', label: tt('priorityAll') },
  { value: 'urgent', label: tt('priorityUrgent') },
  { value: 'high', label: tt('priorityHigh') },
  { value: 'normal', label: tt('priorityNormal') },
  { value: 'low', label: tt('priorityLow') },
];

const buildStatusConfig = (tt) => ({
  NEW: { label: tt('statusNew'), chipClass: 'bg-rose-50 text-rose-700 border-rose-200', dotClass: 'bg-rose-500', icon: Clock },
  IN_PROGRESS: { label: tt('statusInProgress'), chipClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-500', icon: Hammer },
  CLOSED: { label: tt('statusClosed'), chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500', icon: CheckCircle2 },
  default: { label: tt('notFound'), chipClass: 'bg-slate-50 text-slate-700 border-slate-200', dotClass: 'bg-slate-400', icon: AlertCircle },
});

const buildPriorityConfig = (tt) => ({
  urgent: { label: tt('priorityUrgent'), chipClass: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white' },
  high: { label: tt('priorityHigh'), chipClass: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' },
  normal: { label: tt('priorityNormal'), chipClass: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' },
  low: { label: tt('priorityLow'), chipClass: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' },
  default: { label: tt('priorityUnknown'), chipClass: 'bg-slate-500 text-white' },
});

const BRAND_PRIMARY = "#2b59b0";



const fallbackTicketNo = (ticket) =>
  `T${String(ticket?.id || "").slice(-6).toUpperCase().padStart(6, "0")}`;

const toDisplayDate = (dateString) => {
  if (!dateString) return "ไม่ระบุ";
  try {
    return format(new Date(dateString), "dd MMM yyyy", { locale: th });
  } catch {
    return "ไม่ระบุ";
  }
};

const toDisplayDateTime = (dateString) => {
  if (!dateString) return "ไม่ระบุ";
  try {
    return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: th });
  } catch {
    return "ไม่ระบุ";
  }
};

const toTimeAgo = (dateString) => {
  if (!dateString) return "";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: th });
  } catch {
    return "";
  }
};

const getTicketImageUrls = (ticket) => getTicketAttachmentUrls(ticket);

const isImageAttachmentUrl = (url) =>
  /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)(?:[?#].*)?$/i.test(String(url || ""));

const getAttachmentName = (url) => {
  try {
    const pathname = new URL(String(url || "")).pathname;
    return decodeURIComponent(pathname.split("/").pop() || "attachment");
  } catch {
    const cleanUrl = String(url || "").split("?")[0];
    return decodeURIComponent(cleanUrl.split("/").pop() || "attachment");
  }
};

const getImageExtension = (url, mimeType = "") => {
  const mime = mimeType.toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("webp")) return "jpeg";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpeg";

  const lower = String(url || "").toLowerCase();
  if (lower.includes(".png")) return "png";
  if (lower.includes(".gif")) return "gif";
  if (lower.includes(".webp")) return "jpeg";
  return "jpeg";
};

const fetchImageAsBase64 = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`โหลดรูปไม่สำเร็จ: ${response.status}`);

  const blob = await response.blob();
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return {
    base64: String(base64),
    extension: getImageExtension(url, blob.type),
  };
};

export default function TicketHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tt, t } = useScopedI18n(TICKET_HISTORY_TRANSLATIONS);
  const NOTEBOOK_LOG_META = buildNotebookLogMeta(tt);
  const STATUS_OPTIONS = buildStatusOptions(tt);
  const PRIORITY_OPTIONS = buildPriorityOptions(tt);
  const statusConfig = buildStatusConfig(tt);
  const priorityConfig = buildPriorityConfig(tt);

  const initialFilter = location.state?.initialFilter || "ALL";
  const initialTickets = Array.isArray(location.state?.tickets)
    ? splitTicketBuckets(location.state.tickets).repairTickets
    : [];

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [notebookLogs, setNotebookLogs] = useState([]);
  const [notebookLoading, setNotebookLoading] = useState(true);
  const [notebookError, setNotebookError] = useState("");
  const selectedTicketAttachments = useMemo(
    () => getTicketAttachmentEntries(selectedTicket),
    [selectedTicket],
  );
  const selectedTicketSolution = useMemo(
    () => getTicketDisplayNote(selectedTicket),
    [selectedTicket],
  );

  useEffect(() => {
    if (initialFilter) setStatusFilter(initialFilter);

    if (initialTickets.length > 0) {
      setTickets(initialTickets);
      setLoading(false);
      fetchNotebookLogs();
      return;
    }

    const load = async () => {
      await fetchTickets();
      await fetchNotebookLogs();
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTicket) return;

    const handleEsc = (event) => {
      if (event.key === "Escape") setSelectedTicket(null);
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [selectedTicket]);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("creator_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTickets(splitTicketBuckets(data || []).repairTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      Swal.fire({ icon: 'error', title: tt('fetchErrorTitle'), text: tt('fetchErrorText'), confirmButtonColor: BRAND_PRIMARY });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotebookLogs = useCallback(async () => {
    try {
      setNotebookLoading(true);
      const { data, error } = await loadMyNotebookBorrowLogs();
      if (error) throw error;

      setNotebookLogs(Array.isArray(data) ? data : []);
      setNotebookError("");
    } catch (error) {
      console.error("Error fetching notebook logs:", error);
      if (isNotebookSchemaError(error)) {
        setNotebookError("ยังไม่ได้ติดตั้ง schema notebook borrowing");
      } else if (isNotebookPermissionDenied(error)) {
        setNotebookError("ไม่มีสิทธิ์ดูประวัติ notebook ของคุณ");
      } else {
        setNotebookError("ไม่สามารถโหลดประวัติยืม-คืน notebook ได้");
      }
      setNotebookLogs([]);
    } finally {
      setNotebookLoading(false);
    }
  }, []);

  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter((t) => t.status !== "CLOSED").length;
    const closed = tickets.filter((t) => t.status === "CLOSED").length;

    let totalHours = 0;
    let counted = 0;

    tickets.forEach((ticket) => {
      if (ticket.closed_at && ticket.created_at) {
        const created = new Date(ticket.created_at);
        const closedAt = new Date(ticket.closed_at);
        const hours = (closedAt - created) / (1000 * 60 * 60);
        if (hours > 0) {
          totalHours += hours;
          counted += 1;
        }
      }
    });

    return {
      total,
      pending,
      closed,
      avgResponse: counted > 0 ? `${Math.round(totalHours / counted)} ชม.` : "0 ชม.",
    };
  }, [tickets]);

  const categories = useMemo(() => {
    const unique = [...new Set(tickets.map((t) => t.category).filter(Boolean))];
    return ["ALL", ...unique];
  }, [tickets]);

  const notebookStats = useMemo(() => {
    const statsCount = {
      total: notebookLogs.length,
      pending: 0,
      approved: 0,
      returned: 0,
      active: 0,
    };

    notebookLogs.forEach((log) => {
      if (log.status === NOTEBOOK_LOG_STATUS.PENDING) statsCount.pending += 1;
      if (log.status === NOTEBOOK_LOG_STATUS.APPROVED) statsCount.approved += 1;
      if (log.status === NOTEBOOK_LOG_STATUS.RETURNED) statsCount.returned += 1;
      if (log.status === NOTEBOOK_LOG_STATUS.APPROVED || (log.status === NOTEBOOK_LOG_STATUS.RETURNED && !log.return_confirmed_at)) {
        statsCount.active += 1;
      }
    });

    return statsCount;
  }, [notebookLogs]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matched =
          (ticket.title || "").toLowerCase().includes(query) ||
          (ticket.ticket_no || "").toLowerCase().includes(query) ||
          (ticket.description || "").toLowerCase().includes(query) ||
          (ticket.category || "").toLowerCase().includes(query);
        if (!matched) return false;
      }

      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && ticket.status === "CLOSED") return false;
        if (statusFilter === "CLOSED" && ticket.status !== "CLOSED") return false;
        if (!["PENDING", "CLOSED"].includes(statusFilter) && ticket.status !== statusFilter) return false;
      }

      if (priorityFilter !== "ALL" && ticket.priority !== priorityFilter) return false;
      if (categoryFilter !== "ALL" && ticket.category !== categoryFilter) return false;

      return true;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const hasActiveFilters =
    !!searchQuery.trim() || statusFilter !== "ALL" || priorityFilter !== "ALL" || categoryFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryFilter("ALL");
  };

  const handleExport = async () => {
    if (filteredTickets.length === 0) {
      Swal.fire({
        icon: "info",
        title: "ไม่มีข้อมูลให้ส่งออก",
        text: "กรุณาปรับตัวกรองหรือลองอีกครั้ง",
        confirmButtonColor: BRAND_PRIMARY,
      });
      return;
    }

    const result = await Swal.fire({ title: tt('exportConfirmTitle'), text: tt('exportConfirmText'), icon: 'question', showCancelButton: true, confirmButtonText: tt('exportBtn'), cancelButtonText: tt('exportCancel'), confirmButtonColor: BRAND_PRIMARY, cancelButtonColor: '#6b7280' });
    if (!result.isConfirmed) return;

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IT Service Desk";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Ticket History", {
        views: [{ state: "frozen", ySplit: 1 }],
      });

      worksheet.columns = [
        { header: tt("excelNo"), key: "ticketNo", width: 16 },
        { header: tt("excelTitle"), key: "title", width: 36 },
        { header: tt("excelStatus"), key: "status", width: 16 },
        { header: tt("excelCategory"), key: "category", width: 18 },
        { header: tt("excelPriority"), key: "priority", width: 14 },
        { header: tt("excelCreatedAt"), key: "createdAt", width: 18 },
        { header: tt("excelClosedAt"), key: "closedAt", width: 18 },
        { header: tt("excelImage"), key: "image", width: 14 },
        { header: tt("excelImageLinks"), key: "imageLinks", width: 48 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FF1E3A8A" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E7FF" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      for (const ticket of filteredTickets) {
        const status = statusConfig[ticket.status] || statusConfig.default;
        const priority = priorityConfig[ticket.priority] || priorityConfig.default;
        const imageUrls = getTicketImageUrls(ticket);

        const row = worksheet.addRow({
          ticketNo: ticket.ticket_no || fallbackTicketNo(ticket),
          title: ticket.title || "-",
          status: status.label,
          category: ticket.category || "-",
          priority: priority.label,
          createdAt: toDisplayDateTime(ticket.created_at),
          closedAt: ticket.closed_at ? toDisplayDateTime(ticket.closed_at) : "ยังไม่ปิด",
          image: imageUrls.length > 0 ? "แนบรูปแล้ว" : "-",
          imageLinks: imageUrls.length > 0 ? imageUrls.join("\n") : "-",
        });

        row.alignment = { vertical: "middle" };
        row.getCell("B").alignment = { wrapText: true, vertical: "middle" };
        row.getCell("I").alignment = { wrapText: true, vertical: "middle" };

        if (imageUrls.length > 0) {
          const primaryImageUrl = imageUrls[0];
          try {
            const { base64, extension } = await fetchImageAsBase64(primaryImageUrl);
            const imageId = workbook.addImage({ base64, extension });
            row.height = 68;
            worksheet.addImage(imageId, {
              tl: { col: 7.2, row: row.number - 0.85 },
              ext: { width: 84, height: 84 },
              editAs: "oneCell",
            });
          } catch (imageError) {
            console.warn("Cannot embed image:", primaryImageUrl, imageError);
          }
        }
      }

      worksheet.autoFilter = {
        from: "A1",
        to: "I1",
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `ticket-history-${format(new Date(), "yyyy-MM-dd")}.xlsx`);

      Swal.fire({ icon: 'success', title: tt('exportSuccessTitle'), text: tt('exportSuccessText'), confirmButtonColor: BRAND_PRIMARY });
    } catch (error) {
      console.error("Export excel error:", error);
      Swal.fire({ icon: 'error', title: tt('exportErrorTitle'), text: tt('exportErrorText'), confirmButtonColor: BRAND_PRIMARY });
    }
  };

  if (loading) {
    return (
      <div className="app-theme app-page-bg min-h-screen flex items-center justify-center px-4  selection:bg-blue-100 antialiased">
        <div className="app-surface text-center p-8">
          <div className="mx-auto h-14 w-14 rounded-2xl border-4 border-[var(--brand-border)] border-t-[var(--brand-primary)] animate-spin" />
          <p className="mt-4 text-sm font-semibold text-slate-600">{t("ticketHistory.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-theme app-page-bg min-h-screen text-slate-800  selection:bg-blue-100 antialiased">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="app-btn-secondary p-2.5"
              aria-label={t("common.backDashboard")}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
                <Sparkles size={12} />
                {t("ticketHistory.badge")}
              </p>
              <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{t("ticketHistory.title")}</h1>
              <p className="text-xs text-slate-500 sm:text-sm">{t("ticketHistory.totalItems", { count: tickets.length })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={fetchTickets}
              className="app-btn-secondary inline-flex items-center gap-2"
              title={t("ticketHistory.refresh")}
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">{t("ticketHistory.refresh")}</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="app-btn-primary inline-flex items-center gap-2"
            >
              <Download size={16} />
              <span>{t("ticketHistory.exportExcel")}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("ticketHistory.all")}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800">{stats.total}</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-soft)]">
                <FileText size={18} className="text-[var(--brand-primary)]" />
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("ticketHistory.pending")}</p>
                <p className="mt-1 text-2xl font-semibold text-amber-600">{stats.pending}</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Clock size={18} className="text-amber-600" />
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("ticketHistory.success")}</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-600">{stats.closed}</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("ticketHistory.averageTime")}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800">{stats.avgResponse}</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <TrendingUp size={18} className="text-blue-600" />
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="relative w-full xl:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tt("searchPlaceholder")}
                className="app-input py-2.5 pl-11 pr-4"
              />
            </div>

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 xl:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="app-input"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="app-input"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="app-input"
              >
                <option value="ALL">{tt("categoryAll")}</option>
                {categories
                  .filter((c) => c !== "ALL")
                  .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                <Filter size={12} />
                {tt('showCount', { filtered: filteredTickets.length, total: tickets.length })}
              </span>
              {hasActiveFilters && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-soft)] px-2.5 py-1 font-semibold text-[var(--brand-primary)]">
                  {tt('activeFilter')}
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              >
                <CircleSlash size={13} />
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-12 gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 md:grid">
            <div className="col-span-4">{tt("colTitle")}</div>
            <div className="col-span-2">{tt("colStatus")}</div>
            <div className="col-span-2">{tt("colPriority")}</div>
            <div className="col-span-2">{tt("colDate")}</div>
            <div className="col-span-2 text-right">{tt("colActions")}</div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <Search size={30} className="text-slate-300" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-700">{tt("emptyTitle")}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {hasActiveFilters ? tt("emptyFiltered") : tt("emptyNoHistory")}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="app-btn-primary mt-6 inline-flex items-center gap-2"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTickets.map((ticket) => {
                const status = statusConfig[ticket.status] || statusConfig.default;
                const priority = priorityConfig[ticket.priority] || priorityConfig.default;
                const StatusIcon = status.icon;

                return (
                  <article
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="cursor-pointer px-4 py-4 transition hover:bg-slate-50 sm:px-6"
                  >
                    <div className="md:hidden">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                            <Hash size={12} />
                            {ticket.ticket_no || fallbackTicketNo(ticket)}
                          </p>
                          <h3 className="mt-1 text-sm font-bold text-slate-800 line-clamp-2">{ticket.title || tt("noTitle")}</h3>
                        </div>
                        <ChevronRight size={18} className="text-slate-300" />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.chipClass}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${priority.chipClass}`}>{priority.label}</span>
                        <span className="text-[11px] text-slate-500">{ticket.category || tt("noCategory")}</span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                        <Calendar size={12} />
                        <span>{toDisplayDate(ticket.created_at)}</span>
                        <span>•</span>
                        <span>{toTimeAgo(ticket.created_at)}</span>
                      </div>
                    </div>

                    <div className="hidden items-center gap-3 md:grid md:grid-cols-12">
                      <div className="col-span-4 min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-800">{ticket.title || tt("noTitle")}</h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Hash size={11} />
                            {ticket.ticket_no || fallbackTicketNo(ticket)}
                          </span>
                          <span>•</span>
                          <span className="truncate">{ticket.category || tt("noCategory")}</span>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.chipClass}`}>
                          <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                          {status.label}
                        </span>
                      </div>

                      <div className="col-span-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${priority.chipClass}`}>{priority.label}</span>
                      </div>

                      <div className="col-span-2 text-sm text-slate-600">
                        <p>{toDisplayDate(ticket.created_at)}</p>
                        <p className="text-xs text-slate-400">{toTimeAgo(ticket.created_at)}</p>
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-primary)]"
                          aria-label={tt("viewDetail")}
                        >
                          <Eye size={16} />
                        </button>
                        <ChevronRight size={17} className="text-slate-300" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
                <Sparkles size={12} />
                Notebook Center
              </p>
              <h2 className="mt-2 text-lg font-black text-slate-900 sm:text-xl">{tt("notebookSectionTitle")}</h2>
              <p className="mt-1 text-sm text-slate-500">
                บันทึกการยืม วันที่คืน ระยะเวลา เหตุผล และสถานที่ใช้งาน
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-auto">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tt("nbTotal")}</p>
                <p className="mt-1 text-lg font-black text-slate-800">{notebookStats.total}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">รออนุมัติ</p>
                <p className="mt-1 text-lg font-black text-amber-600">{notebookStats.pending}</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">กำลังยืม</p>
                <p className="mt-1 text-lg font-black text-blue-600">{notebookStats.active}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">คืนแล้ว</p>
                <p className="mt-1 text-lg font-black text-emerald-600">{notebookStats.returned}</p>
              </div>
            </div>
          </div>

          {notebookError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {notebookError}
            </div>
          )}

          {notebookLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <RefreshCw size={16} className="animate-spin" />
                กำลังโหลดประวัติ notebook...
              </div>
            </div>
          ) : notebookLogs.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white">
                <AlertCircle size={22} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-700">{tt("nbEmptyTitle")}</p>
              <p className="mt-1 text-xs text-slate-500">{tt("nbEmptyDesc")}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {notebookLogs.slice(0, 12).map((log) => {
                const meta = NOTEBOOK_LOG_META[log.status] || NOTEBOOK_LOG_META.pending;
                const durationText = log.return_time
                  ? formatNotebookDuration(log.borrow_time, log.return_time)
                  : log.borrow_time
                    ? formatNotebookDuration(log.borrow_time, new Date().toISOString())
                    : "-";

                return (
                  <article key={log.log_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#2b59b0]/20 bg-[#2b59b0]/10 px-2.5 py-1 text-[11px] font-semibold text-[#2b59b0]">
                            <Laptop size={12} />
                            {log.asset_code || "-"}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>
                            <Clock size={12} />
                            {meta.label}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            {tt("nbBorrowCount", { n: log.borrow_count || 0 })}
                          </span>
                        </div>

                        <h3 className="mt-2 text-base font-bold text-slate-900">{log.model || "-"}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {log.approved_by_name || log.confirmed_by_name || "-"} • {log.notebook_status || "-"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {tt("nbBorrowTime")} {formatNotebookTime(log.borrow_time || log.requested_at)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {tt("nbReturnTime")} {formatNotebookTime(log.return_time)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {tt("nbUsedTime")} {durationText}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr,0.8fr]">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{tt("nbReasonLocation")}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{log.reason || "-"}</p>
                        <p className="mt-2 text-sm text-slate-600">{tt("nbLocation")} {log.location || "-"}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{tt("nbProofImage")}</p>
                        {log.image_url ? (
                          <button
                            type="button"
                            onClick={() => window.open(log.image_url, "_blank", "noopener,noreferrer")}
                            className="mt-3 block overflow-hidden rounded-xl border border-slate-200 bg-white"
                            title={tt("nbOpenImage")}
                          >
                            <img src={log.image_url} alt={log.asset_code || "notebook-proof"} className="h-36 w-full object-cover" />
                          </button>
                        ) : (
                          <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                            ไม่มีรูปประกอบ
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                        <UserRound size={12} />
                        {tt("nbBorrower")} {log.user_name || "-"}
                      </span>
                      {log.return_confirmed_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                          <CheckCircle2 size={12} />
                          {tt("nbReturnConfirmed")} {formatNotebookTime(log.return_confirmed_at)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                          <Clock size={12} />
                          รอยืนยันจาก IT
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-primary)]">
                      {selectedTicket.ticket_no || fallbackTicketNo(selectedTicket)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${(statusConfig[selectedTicket.status] || statusConfig.default).chipClass}`}
                    >
                      {(statusConfig[selectedTicket.status] || statusConfig.default).label}
                    </span>
                  </div>
                  <h2 className="truncate text-lg font-black text-slate-900 sm:text-2xl">{selectedTicket.title || tt("detailNoTitle")}</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                  aria-label={tt("detailCloseLabel")}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="space-y-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{tt("detailProblem")}</p>
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                        {selectedTicket.description || tt("detailNoProblem")}
                      </p>
                    </div>
                  </div>

                  {selectedTicketAttachments.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{tt("detailAttachments")}</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {selectedTicketAttachments.map((entry, index) => (
                          <button
                            key={`${entry.url}-${index}`}
                            type="button"
                            onClick={() => window.open(entry.url, "_blank", "noopener,noreferrer")}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                            title={tt("detailOpenAttach")}
                          >
                            <img
                              src={entry.url}
                              alt={`${entry.type === "after" ? "After" : "Before"} ${index + 1}`}
                              className="h-24 w-24 object-cover transition hover:scale-105"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-soft)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-primary)]">{tt("detailRepairInfo")}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-semibold text-white">
                        {selectedTicket.assigned_name?.charAt(0) || "T"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{selectedTicket.assigned_name || tt("detailPending")}</p>
                        <p className="text-xs text-slate-500">{tt("detailAssigned")}</p>
                      </div>
                    </div>

                    {selectedTicketSolution && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
                        <p className="text-xs font-bold text-emerald-700">{tt("detailSolution")}</p>
                        <p className="mt-1 text-sm text-slate-700">{selectedTicketSolution}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">หมวดหมู่</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{selectedTicket.category || tt("detailUnknown")}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">สถานที่</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{selectedTicket.location || tt("detailUnknown")}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">วันที่แจ้ง</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{toDisplayDateTime(selectedTicket.created_at)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{tt("detailClosedAt")}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {selectedTicket.closed_at ? toDisplayDateTime(selectedTicket.closed_at) : tt("detailNotClosed")}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <X size={16} />
                  ปิด
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/create-ticket")}
                  className="app-btn-primary inline-flex flex-1 items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
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


