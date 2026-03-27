import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import { ArrowLeft, Camera, CheckCircle2, FlipHorizontal, History, Loader2, MapPin, MessageCircle, RefreshCw, Search, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import { supabase } from "../../../lib/supabaseClient";
import {
  formatNotebookTime,
  isNotebookPermissionDenied,
  isNotebookSchemaError,
  loadMyNotebookBorrowLogs,
  loadNotebookDashboard,
  requestNotebookBorrow,
  requestNotebookReturn,
  uploadNotebookReturnProof,
  uploadNotebookProof,
  NOTEBOOK_LOG_STATUS,
  NOTEBOOK_STATUS,
  normalizeText,
} from "../../../services/notebookBorrowService";

const NOTEBOOK_BORROW_TRANSLATIONS = {
  th: {
    header: {
      badge: "Notebook Center",
      title: "ยืม-คืนโน้ตบุ๊ก",
      subtitle: "ถ่ายรูป notebook ก่อนยืนยัน และส่งคำขอให้ IT อนุมัติ",
      refresh: "รีเฟรช",
      openChat: "เปิดแชท IT",
    },
    status: {
      available: "พร้อมให้ยืม",
      borrowed: "ถูกยืม",
      repair: "ซ่อม",
      stale: "สถานะค้าง",
      pending: "รออนุมัติ",
      borrowing: "กำลังยืม",
      returned: "คืนเรียบร้อย",
      inUse: "กำลังใช้งาน",
      returnPending: "รอยืนยันคืน",
    },
    duration: {
      daysHours: "{{days}} วัน {{hours}} ชม.",
      hoursMinutes: "{{hours}} ชม. {{minutes}} นาที",
      hoursOnly: "{{hours}} ชม.",
      minutes: "{{minutes}} นาที",
    },
    errors: {
      schemaOutdated: "ระบบฐานข้อมูล notebook ยังไม่อัปเดต กรุณาให้ IT รัน migration ล่าสุด",
      permissionDenied: "ไม่มีสิทธิ์เข้าถึง notebook schema หรือ RLS ยังไม่พร้อม",
      loadFailed: "โหลดข้อมูล notebook ไม่สำเร็จ",
    },
    toasts: {
      borrowedByOther: "Notebook {{code}} กำลังถูกยืมโดย {{name}}",
      staleBorrowed: "Notebook {{code}} มีสถานะค้าง กรุณาให้ admin หรือ IT รีเซ็ตก่อน",
      notAvailable: "Notebook เครื่องนี้ไม่ว่าง",
      pendingBorrow: "มีคำขอยืม notebook {{code}} รออนุมัติอยู่",
      activeBorrow: "คุณยังยืม notebook {{code}} อยู่ กรุณาคืนก่อน",
      pendingReturn: "Notebook {{code}} อยู่ระหว่างรอ IT ยืนยันการคืน",
      unresolved: "คุณมีรายการ notebook ค้างอยู่",
      captureFailed: "ถ่ายรูปไม่สำเร็จ",
      saveCameraFailed: "ไม่สามารถบันทึกรูปจากกล้องได้",
      returnCaptureFailed: "ถ่ายรูปตอนคืนไม่สำเร็จ",
      saveReturnCameraFailed: "ไม่สามารถบันทึกรูปตอนคืนได้",
      reasonRequired: "กรุณาระบุเหตุผลในการยืม",
      locationRequired: "กรุณาระบุสถานที่ใช้งาน",
      borrowPhotoRequired: "กรุณาถ่ายรูป notebook ก่อนยืนยัน",
      borrowSubmitted: "ส่งคำขอยืม notebook แล้ว",
      activeBorrowPrefix: "คุณมี notebook ค้างอยู่แล้ว:",
      schemaContactIt: "ฐานข้อมูล notebook ยังไม่อัปเดต กรุณาติดต่อ IT",
      noPermissionForRequest: "ไม่มีสิทธิ์ใช้งานคำขอนี้",
      borrowSubmitFailed: "ส่งคำขอยืมไม่สำเร็จ",
      returnAlreadyRequested: "คุณส่งคำขอคืนไปแล้ว กรุณารอ IT ยืนยัน",
      returnNotEligible: "รายการนี้ไม่อยู่ในสถานะที่คืนได้แล้ว",
      returnStatusChanged: "รายการนี้ไม่อยู่ในสถานะยืมแล้ว ระบบจะรีเฟรชข้อมูลล่าสุด",
      returnPhotoRequired: "กรุณาถ่ายรูปตอนคืน notebook ก่อน",
      returnSubmitted: "ส่งคำขอคืน notebook แล้ว",
      returnNoLongerBorrowed: "Notebook รายการนี้ไม่อยู่ในสถานะยืมแล้ว",
      returnSubmitFailed: "ส่งคำขอคืนไม่สำเร็จ",
    },
    sections: {
      pendingRequestTitle: "คำขอรออนุมัติ",
      pendingRequestSubtitle: "รอ IT อนุมัติ ก่อนจึงจะถือว่ายืมสำเร็จ",
      activeBorrowTitle: "รายการที่กำลังยืม",
      searchPlaceholder: "ค้นหา asset code หรือ model ของเครื่องที่ว่าง",
      loading: "กำลังโหลด notebook...",
      availableNow: "พร้อมให้ยืมตอนนี้",
      noAvailable: "ไม่มี notebook ว่างให้ยืม",
      currentBorrower: "ผู้ยืมปัจจุบัน",
      latestUser: "ผู้ใช้งานล่าสุด",
      noBorrowerFound: "ไม่พบผู้ยืม",
      borrowedHint: "เครื่องนี้กำลังถูกยืมอยู่ ให้เลือก notebook ที่ว่างเครื่องอื่นแทน",
      staleHint: "เครื่องนี้มีสถานะค้างจากข้อมูลเดิม จึงขึ้นว่า \"ถูกยืม\" แต่ยังคืนจากหน้านี้ไม่ได้ ต้องให้ admin หรือ IT รีเซ็ตก่อน",
      time: "เวลา",
      noImage: "ไม่มีรูป",
      assetLabel: "Asset",
      waitReset: "รอ admin หรือ IT รีเซ็ตสถานะ",
      borrowedBy: "กำลังถูกยืมโดย {{name}}",
      occupied: "มีผู้ใช้งาน",
      pendingApprovalCode: "รออนุมัติ {{code}}",
      borrowingCode: "กำลังยืม {{code}}",
      pendingReturnCode: "รอยืนยันคืน {{code}}",
      clearPending: "รอเคลียร์รายการ",
      historyTitle: "ประวัติของฉัน",
      noHistory: "ยังไม่มีประวัติการยืม notebook",
      borrowedAt: "ยืม: {{value}}",
      returnedAt: "คืน: {{value}}",
      durationUsed: "ใช้ไป: {{value}}",
    },
    actions: {
      returnNotebook: "คืน notebook",
      repairInProgress: "อยู่ระหว่างซ่อม",
      returnShort: "คืน",
      borrowShort: "ยืม",
      uploadImage: "อัปโหลดรูป",
      cancel: "ยกเลิก",
      submitBorrow: "ส่งคำขอยืม",
      confirmReturn: "ยืนยันคืน",
      switchCamera: "สลับกล้อง",
      retake: "ถ่ายใหม่",
      capture: "ถ่ายรูป",
    },
    borrowModal: {
      badge: "Borrow Notebook",
      cameraUnavailable: "กล้องไม่พร้อมใช้งาน",
      cameraFallback: "สามารถอัปโหลดรูปแทนได้",
      cameraTitle: "ถ่ายรูป notebook",
      previewReady: "รูปนี้จะถูกใช้เป็นหลักฐานก่อนยืนยัน",
      previewPending: "ถ่ายแล้วรูปจะถูกซ้อนทับบนกล้องทันที",
      ready: "พร้อมใช้",
      switchHintReady: "ถ่ายใหม่ได้ตลอด หรือสลับกล้องหน้า/หลัง",
      switchHintPending: "รองรับกล้องหน้า/หลัง และแสดงตัวอย่างทันที",
      notebookLabel: "Notebook",
      reasonLabel: "เหตุผลในการยืม",
      reasonPlaceholder: "เช่น ใช้ประชุม, ทดสอบระบบ, ใช้ทำงานนอกสถานที่",
      locationLabel: "สถานที่ใช้งาน",
      locationPlaceholder: "เช่น Office, Home, Meeting room",
      submitHint: "คำขอนี้จะถูกส่งไปยัง CentralChatDock และหน้าอนุมัติของ IT",
    },
    returnModal: {
      badge: "Return Notebook",
      subtitle: "ถ่ายรูปตอนคืนก่อนส่งคำขอ และรอ IT ยืนยันการรับคืน",
      cameraUnavailable: "กล้องไม่พร้อมใช้งาน",
      cameraFallback: "อัปโหลดรูปตอนคืนแทนได้",
      cameraTitle: "ถ่ายรูปตอนคืน",
      previewReady: "รูปนี้จะถูกส่งเป็นหลักฐานคืน notebook",
      previewPending: "ต้องมีรูปตอนคืนก่อนถึงจะส่งคำขอคืนได้",
      ready: "พร้อมใช้",
      switchHintReady: "ถ่ายใหม่ได้ตลอด หรือสลับกล้องหน้า/หลัง",
      switchHintPending: "รองรับกล้องหน้า/หลัง และแสดงรูปทับกล้องทันที",
      summaryTitle: "สรุปรายการ",
      returner: "ผู้คืน: {{name}}",
      borrowedWhen: "ยืมเมื่อ {{value}}",
      durationUsed: "ใช้ไป {{value}}",
      requiredHint: "ต้องมีรูปตอนคืนก่อนถึงจะส่งคำขอคืนได้",
      submitHint: "เมื่อกดยืนยัน ระบบจะส่งคำขอคืนพร้อมรูปหลักฐานให้ IT ตรวจสอบ",
    },
    common: {
      close: "ปิด",
      otherUser: "ผู้ใช้งานอื่น",
      userFallback: "ผู้ใช้",
    },
  },
  en: {
    header: {
      badge: "Notebook Center",
      title: "Notebook Borrow and Return",
      subtitle: "Take a notebook photo before confirming and send the request to IT for approval.",
      refresh: "Refresh",
      openChat: "Open IT chat",
    },
    status: {
      available: "Available",
      borrowed: "Borrowed",
      repair: "Repair",
      stale: "Stale status",
      pending: "Pending approval",
      borrowing: "Borrowing",
      returned: "Returned",
      inUse: "In use",
      returnPending: "Return pending",
    },
    duration: {
      daysHours: "{{days}}d {{hours}}h",
      hoursMinutes: "{{hours}}h {{minutes}}m",
      hoursOnly: "{{hours}}h",
      minutes: "{{minutes}}m",
    },
    errors: {
      schemaOutdated: "The notebook database schema is outdated. Please ask IT to run the latest migration.",
      permissionDenied: "You do not have access to the notebook schema or RLS is not ready.",
      loadFailed: "Failed to load notebook data.",
    },
    toasts: {
      borrowedByOther: "Notebook {{code}} is currently borrowed by {{name}}.",
      staleBorrowed: "Notebook {{code}} has a stale borrowed status. Please ask admin or IT to reset it first.",
      notAvailable: "This notebook is not available.",
      pendingBorrow: "Your borrow request for notebook {{code}} is still pending approval.",
      activeBorrow: "You are still borrowing notebook {{code}}. Please return it first.",
      pendingReturn: "Notebook {{code}} is waiting for IT return confirmation.",
      unresolved: "You still have a notebook item pending.",
      captureFailed: "Failed to capture the photo.",
      saveCameraFailed: "Unable to save the camera photo.",
      returnCaptureFailed: "Failed to capture the return photo.",
      saveReturnCameraFailed: "Unable to save the return photo.",
      reasonRequired: "Please enter a borrowing reason.",
      locationRequired: "Please enter the usage location.",
      borrowPhotoRequired: "Please take a notebook photo before confirming.",
      borrowSubmitted: "Borrow request submitted.",
      activeBorrowPrefix: "You already have an active notebook borrow:",
      schemaContactIt: "The notebook database schema is outdated. Please contact IT.",
      noPermissionForRequest: "You do not have permission for this request.",
      borrowSubmitFailed: "Failed to submit the borrow request.",
      returnAlreadyRequested: "Your return request has already been submitted. Please wait for IT confirmation.",
      returnNotEligible: "This item can no longer be returned from here.",
      returnStatusChanged: "This item is no longer in borrowed status. The latest data will be refreshed.",
      returnPhotoRequired: "Please take a return photo before submitting.",
      returnSubmitted: "Return request submitted.",
      returnNoLongerBorrowed: "This notebook is no longer in borrowed status.",
      returnSubmitFailed: "Failed to submit the return request.",
    },
    sections: {
      pendingRequestTitle: "Pending Request",
      pendingRequestSubtitle: "IT approval is required before the borrow is considered complete.",
      activeBorrowTitle: "Currently Borrowed",
      searchPlaceholder: "Search by available asset code or model",
      loading: "Loading notebooks...",
      availableNow: "Available now",
      noAvailable: "No notebooks are currently available.",
      currentBorrower: "Current borrower",
      latestUser: "Latest user",
      noBorrowerFound: "No borrower found",
      borrowedHint: "This notebook is already borrowed. Please select another available unit.",
      staleHint: "This notebook still shows as borrowed from stale data, so it cannot be returned from this page until admin or IT resets it.",
      time: "Time",
      noImage: "No image",
      assetLabel: "Asset",
      waitReset: "Waiting for admin or IT to reset the status",
      borrowedBy: "Borrowed by {{name}}",
      occupied: "Occupied",
      pendingApprovalCode: "Pending approval {{code}}",
      borrowingCode: "Borrowing {{code}}",
      pendingReturnCode: "Return pending {{code}}",
      clearPending: "Waiting for pending item to clear",
      historyTitle: "My History",
      noHistory: "No notebook borrow history yet.",
      borrowedAt: "Borrowed: {{value}}",
      returnedAt: "Returned: {{value}}",
      durationUsed: "Used: {{value}}",
    },
    actions: {
      returnNotebook: "Return notebook",
      repairInProgress: "Under repair",
      returnShort: "Return",
      borrowShort: "Borrow",
      uploadImage: "Upload image",
      cancel: "Cancel",
      submitBorrow: "Submit borrow request",
      confirmReturn: "Confirm return",
      switchCamera: "Switch camera",
      retake: "Retake",
      capture: "Take photo",
    },
    borrowModal: {
      badge: "Borrow Notebook",
      cameraUnavailable: "Camera unavailable",
      cameraFallback: "You can upload a photo instead.",
      cameraTitle: "Take notebook photo",
      previewReady: "This photo will be used as evidence before confirmation.",
      previewPending: "The captured photo will overlay the camera preview immediately.",
      ready: "Ready",
      switchHintReady: "You can retake it anytime or switch between front and rear cameras.",
      switchHintPending: "Front and rear cameras are supported with instant preview.",
      notebookLabel: "Notebook",
      reasonLabel: "Borrow reason",
      reasonPlaceholder: "For example: meeting, system testing, or offsite work",
      locationLabel: "Usage location",
      locationPlaceholder: "For example: Office, Home, Meeting room",
      submitHint: "This request will be sent to CentralChatDock and the IT approval page.",
    },
    returnModal: {
      badge: "Return Notebook",
      subtitle: "Take a return photo before submitting and wait for IT to confirm receipt.",
      cameraUnavailable: "Camera unavailable",
      cameraFallback: "You can upload a return photo instead.",
      cameraTitle: "Take return photo",
      previewReady: "This photo will be submitted as return evidence.",
      previewPending: "A return photo is required before the return request can be submitted.",
      ready: "Ready",
      switchHintReady: "You can retake it anytime or switch between front and rear cameras.",
      switchHintPending: "Front and rear cameras are supported and the preview is shown immediately.",
      summaryTitle: "Summary",
      returner: "Returner: {{name}}",
      borrowedWhen: "Borrowed on {{value}}",
      durationUsed: "Used for {{value}}",
      requiredHint: "A return photo is required before submitting the return request.",
      submitHint: "When you confirm, the system will send the return request with evidence to IT for review.",
    },
    common: {
      close: "Close",
      otherUser: "Another user",
      userFallback: "User",
    },
  },
  ko: {
    header: {
      badge: "Notebook Center",
      title: "노트북 대여 및 반납",
      subtitle: "확인 전에 노트북 사진을 촬영하고 IT 승인 요청을 보냅니다.",
      refresh: "새로고침",
      openChat: "IT 채팅 열기",
    },
    status: {
      available: "대여 가능",
      borrowed: "대여 중",
      repair: "수리 중",
      stale: "정리 필요",
      pending: "승인 대기",
      borrowing: "사용 중",
      returned: "반납 완료",
      inUse: "사용 중",
      returnPending: "반납 확인 대기",
    },
    duration: {
      daysHours: "{{days}}일 {{hours}}시간",
      hoursMinutes: "{{hours}}시간 {{minutes}}분",
      hoursOnly: "{{hours}}시간",
      minutes: "{{minutes}}분",
    },
    errors: {
      schemaOutdated: "노트북 데이터베이스 스키마가 최신이 아닙니다. IT에 최신 마이그레이션 실행을 요청하세요.",
      permissionDenied: "노트북 스키마에 접근할 수 없거나 RLS가 아직 준비되지 않았습니다.",
      loadFailed: "노트북 데이터를 불러오지 못했습니다.",
    },
    toasts: {
      borrowedByOther: "노트북 {{code}}은(는) 현재 {{name}} 님이 대여 중입니다.",
      staleBorrowed: "노트북 {{code}}은(는) 정리되지 않은 대여 상태입니다. 먼저 관리자나 IT가 초기화해야 합니다.",
      notAvailable: "이 노트북은 현재 사용할 수 없습니다.",
      pendingBorrow: "노트북 {{code}} 대여 요청이 아직 승인 대기 중입니다.",
      activeBorrow: "현재 노트북 {{code}}을(를) 대여 중입니다. 먼저 반납하세요.",
      pendingReturn: "노트북 {{code}}은(는) IT 반납 확인 대기 중입니다.",
      unresolved: "아직 정리되지 않은 노트북 항목이 있습니다.",
      captureFailed: "사진 촬영에 실패했습니다.",
      saveCameraFailed: "카메라 사진을 저장할 수 없습니다.",
      returnCaptureFailed: "반납 사진 촬영에 실패했습니다.",
      saveReturnCameraFailed: "반납 사진을 저장할 수 없습니다.",
      reasonRequired: "대여 사유를 입력하세요.",
      locationRequired: "사용 위치를 입력하세요.",
      borrowPhotoRequired: "확인 전에 노트북 사진을 촬영하세요.",
      borrowSubmitted: "대여 요청이 접수되었습니다.",
      activeBorrowPrefix: "이미 진행 중인 노트북 대여가 있습니다:",
      schemaContactIt: "노트북 데이터베이스 스키마가 최신이 아닙니다. IT에 문의하세요.",
      noPermissionForRequest: "이 요청을 처리할 권한이 없습니다.",
      borrowSubmitFailed: "대여 요청 제출에 실패했습니다.",
      returnAlreadyRequested: "이미 반납 요청을 보냈습니다. IT 확인을 기다리세요.",
      returnNotEligible: "이 항목은 더 이상 이 화면에서 반납할 수 없습니다.",
      returnStatusChanged: "이 항목은 더 이상 대여 상태가 아닙니다. 최신 데이터를 새로고침합니다.",
      returnPhotoRequired: "반납 전에 반납 사진을 촬영하세요.",
      returnSubmitted: "반납 요청이 접수되었습니다.",
      returnNoLongerBorrowed: "이 노트북은 더 이상 대여 상태가 아닙니다.",
      returnSubmitFailed: "반납 요청 제출에 실패했습니다.",
    },
    sections: {
      pendingRequestTitle: "승인 대기 요청",
      pendingRequestSubtitle: "IT 승인이 완료되어야 대여가 확정됩니다.",
      activeBorrowTitle: "현재 대여 중",
      searchPlaceholder: "사용 가능한 자산 코드나 모델로 검색",
      loading: "노트북을 불러오는 중...",
      availableNow: "지금 대여 가능",
      noAvailable: "현재 대여 가능한 노트북이 없습니다.",
      currentBorrower: "현재 대여자",
      latestUser: "최근 사용자",
      noBorrowerFound: "대여자 없음",
      borrowedHint: "이 노트북은 이미 대여 중입니다. 다른 사용 가능한 기기를 선택하세요.",
      staleHint: "이 노트북은 오래된 데이터 때문에 여전히 대여 중으로 표시되어 이 화면에서 반납할 수 없습니다. 관리자나 IT가 먼저 초기화해야 합니다.",
      time: "시간",
      noImage: "이미지 없음",
      assetLabel: "자산",
      waitReset: "관리자 또는 IT 초기화 대기",
      borrowedBy: "{{name}} 님이 대여 중",
      occupied: "사용 중",
      pendingApprovalCode: "승인 대기 {{code}}",
      borrowingCode: "대여 중 {{code}}",
      pendingReturnCode: "반납 확인 대기 {{code}}",
      clearPending: "대기 항목 정리 중",
      historyTitle: "내 이력",
      noHistory: "노트북 대여 이력이 아직 없습니다.",
      borrowedAt: "대여: {{value}}",
      returnedAt: "반납: {{value}}",
      durationUsed: "사용 시간: {{value}}",
    },
    actions: {
      returnNotebook: "노트북 반납",
      repairInProgress: "수리 중",
      returnShort: "반납",
      borrowShort: "대여",
      uploadImage: "이미지 업로드",
      cancel: "취소",
      submitBorrow: "대여 요청 제출",
      confirmReturn: "반납 확인",
      switchCamera: "카메라 전환",
      retake: "다시 촬영",
      capture: "사진 촬영",
    },
    borrowModal: {
      badge: "Borrow Notebook",
      cameraUnavailable: "카메라를 사용할 수 없습니다",
      cameraFallback: "대신 사진을 업로드할 수 있습니다.",
      cameraTitle: "노트북 사진 촬영",
      previewReady: "이 사진은 확인 전 증빙으로 사용됩니다.",
      previewPending: "촬영한 사진이 즉시 카메라 화면 위에 표시됩니다.",
      ready: "준비 완료",
      switchHintReady: "언제든 다시 촬영하거나 전후면 카메라를 전환할 수 있습니다.",
      switchHintPending: "전후면 카메라를 지원하며 즉시 미리보기가 표시됩니다.",
      notebookLabel: "노트북",
      reasonLabel: "대여 사유",
      reasonPlaceholder: "예: 회의, 시스템 테스트, 외부 근무",
      locationLabel: "사용 위치",
      locationPlaceholder: "예: Office, Home, Meeting room",
      submitHint: "이 요청은 CentralChatDock과 IT 승인 화면으로 전송됩니다.",
    },
    returnModal: {
      badge: "Return Notebook",
      subtitle: "반납 요청 전 반납 사진을 촬영하고 IT 확인을 기다리세요.",
      cameraUnavailable: "카메라를 사용할 수 없습니다",
      cameraFallback: "대신 반납 사진을 업로드할 수 있습니다.",
      cameraTitle: "반납 사진 촬영",
      previewReady: "이 사진은 반납 증빙으로 제출됩니다.",
      previewPending: "반납 요청을 보내려면 반납 사진이 필요합니다.",
      ready: "준비 완료",
      switchHintReady: "언제든 다시 촬영하거나 전후면 카메라를 전환할 수 있습니다.",
      switchHintPending: "전후면 카메라를 지원하며 즉시 사진이 표시됩니다.",
      summaryTitle: "요약",
      returner: "반납자: {{name}}",
      borrowedWhen: "{{value}}에 대여",
      durationUsed: "{{value}} 사용",
      requiredHint: "반납 요청을 제출하려면 반납 사진이 필요합니다.",
      submitHint: "확인하면 시스템이 증빙 사진과 함께 반납 요청을 IT에 보냅니다.",
    },
    common: {
      close: "닫기",
      otherUser: "다른 사용자",
      userFallback: "사용자",
    },
  },
};

function formatDuration(startValue, endValue, tt) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  const diff = Math.max(0, end.getTime() - start.getTime());
  const totalHours = Math.floor(diff / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return tt("duration.daysHours", { days, hours });
  if (hours > 0) {
    return minutes > 0
      ? tt("duration.hoursMinutes", { hours, minutes })
      : tt("duration.hoursOnly", { hours });
  }
  return tt("duration.minutes", { minutes });
}

function getNotebookCodeFromLog(log, notebooksById) {
  if (!log) return "-";
  return (
    log.asset_code ||
    notebooksById.get(String(log.notebook_id || ""))?.asset_code ||
    "-"
  );
}

function hasNotebookBorrowOwner(notebook) {
  return normalizeText(notebook?.current_user_id) !== "";
}

function isNotebookBorrowStateInconsistent(notebook) {
  return notebook?.status === NOTEBOOK_STATUS.BORROWED && !hasNotebookBorrowOwner(notebook);
}

function getNotebookDisplayStatusMeta(notebook, statusMeta, tt) {
  if (isNotebookBorrowStateInconsistent(notebook)) {
    return { label: tt("status.stale"), cls: "border-rose-200 bg-rose-50 text-rose-700" };
  }

  return statusMeta[notebook?.status] || statusMeta[NOTEBOOK_STATUS.AVAILABLE];
}

export default function NotebookBorrowSection({ currentUser, isDarkTheme = false, onOpenChat }) {
  const { tt } = useScopedI18n(NOTEBOOK_BORROW_TRANSLATIONS);
  const currentUserId = String(currentUser?.id || "");
  const currentUserName = currentUser?.name || currentUser?.full_name || tt("common.userFallback");
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const returnWebcamRef = useRef(null);
  const returnFileInputRef = useRef(null);
  const channelRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [notebooks, setNotebooks] = useState([]);
  const [myLogs, setMyLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [borrowReason, setBorrowReason] = useState("");
  const [borrowLocation, setBorrowLocation] = useState("");
  const [borrowFile, setBorrowFile] = useState(null);
  const [borrowPreview, setBorrowPreview] = useState("");
  const [borrowFacingMode, setBorrowFacingMode] = useState("environment");
  const [cameraError, setCameraError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnDialogLog, setReturnDialogLog] = useState(null);
  const [returnFile, setReturnFile] = useState(null);
  const [returnPreview, setReturnPreview] = useState("");
  const [returnFacingMode, setReturnFacingMode] = useState("environment");
  const [returnCameraError, setReturnCameraError] = useState(false);
  const statusMeta = useMemo(
    () => ({
      [NOTEBOOK_STATUS.AVAILABLE]: { label: tt("status.available"), cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
      [NOTEBOOK_STATUS.BORROWED]: { label: tt("status.borrowed"), cls: "border-blue-200 bg-blue-50 text-blue-700" },
      [NOTEBOOK_STATUS.REPAIR]: { label: tt("status.repair"), cls: "border-amber-200 bg-amber-50 text-amber-700" },
    }),
    [tt],
  );
  const logMeta = useMemo(
    () => ({
      [NOTEBOOK_LOG_STATUS.PENDING]: { label: tt("status.pending"), cls: "border-amber-200 bg-amber-50 text-amber-700" },
      [NOTEBOOK_LOG_STATUS.APPROVED]: { label: tt("status.borrowing"), cls: "border-blue-200 bg-blue-50 text-blue-700" },
      [NOTEBOOK_LOG_STATUS.RETURNED]: { label: tt("status.returned"), cls: "border-violet-200 bg-violet-50 text-violet-700" },
    }),
    [tt],
  );

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!currentUserId) return;
    if (!silent) setLoading(true);
    try {
      const [{ data: notebookRows, error: notebookError }, { data: logRows, error: logError }] =
        await Promise.all([loadNotebookDashboard(), loadMyNotebookBorrowLogs()]);
      if (notebookError) throw notebookError;
      if (logError) throw logError;
      setNotebooks(Array.isArray(notebookRows) ? notebookRows : []);
      setMyLogs(Array.isArray(logRows) ? logRows : []);
      setErrorMessage("");
    } catch (error) {
      console.error("Load notebook error:", error);
      if (isNotebookSchemaError(error)) setErrorMessage(tt("errors.schemaOutdated"));
      else if (isNotebookPermissionDenied(error)) setErrorMessage(tt("errors.permissionDenied"));
      else setErrorMessage(tt("errors.loadFailed"));
      setNotebooks([]);
      setMyLogs([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentUserId, tt]);

  useEffect(() => {
    if (!currentUserId) return undefined;
    loadData();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel(`notebook-borrow-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notebooks" }, () => loadData({ silent: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "borrow_logs" }, () => loadData({ silent: true }))
      .subscribe();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [currentUserId, loadData]);

  useEffect(() => {
    return () => {
      if (borrowPreview && borrowPreview.startsWith("blob:")) URL.revokeObjectURL(borrowPreview);
    };
  }, [borrowPreview]);

  useEffect(() => {
    return () => {
      if (returnPreview && returnPreview.startsWith("blob:")) URL.revokeObjectURL(returnPreview);
    };
  }, [returnPreview]);

  const notebooksById = useMemo(() => {
    const map = new Map();
    notebooks.forEach((item) => map.set(String(item?.id || ""), item));
    return map;
  }, [notebooks]);

  const latestLogByNotebook = useMemo(() => {
    const map = new Map();
    myLogs.forEach((log) => {
      const key = String(log?.notebook_id || "");
      if (!map.has(key)) map.set(key, log);
    });
    return map;
  }, [myLogs]);

  const activeBorrowLog = useMemo(
    () =>
      myLogs.find((log) => {
        if (log?.status !== NOTEBOOK_LOG_STATUS.APPROVED) return false;
        const notebook = notebooksById.get(String(log?.notebook_id || ""));
        if (!notebook) return true;
        return (
          notebook?.status === NOTEBOOK_STATUS.BORROWED &&
          String(notebook?.current_user_id || "") === currentUserId
        );
      }) || null,
    [currentUserId, myLogs, notebooksById],
  );
  const pendingBorrowRequest = useMemo(
    () => myLogs.find((log) => log?.status === NOTEBOOK_LOG_STATUS.PENDING) || null,
    [myLogs],
  );
  const pendingReturnLog = useMemo(
    () => myLogs.find((log) => log?.status === NOTEBOOK_LOG_STATUS.RETURNED && !log?.return_confirmed_at) || null,
    [myLogs],
  );
  const filteredNotebooks = useMemo(() => {
    const keyword = normalizeText(searchQuery).toLowerCase();
    return notebooks.filter((item) => {
      if (!keyword) return true;
      const source = [item?.asset_code, item?.model, item?.status, item?.current_user_name]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");
      return source.includes(keyword);
    });
  }, [notebooks, searchQuery]);

  const visibleNotebooks = useMemo(() => {
    const getSortRank = (item) => {
      const ownerId = String(item?.current_user_id || "");
      const isMineActive = item?.status === NOTEBOOK_STATUS.BORROWED && ownerId === currentUserId;
      const isBorrowedByOther = item?.status === NOTEBOOK_STATUS.BORROWED && ownerId !== "" && ownerId !== currentUserId;
      const isInconsistentBorrowed = isNotebookBorrowStateInconsistent(item);

      if (item?.status === NOTEBOOK_STATUS.AVAILABLE && ownerId === "") return 0;
      if (isMineActive) return 1;
      if (isBorrowedByOther) return 2;
      if (isInconsistentBorrowed) return 3;
      if (item?.status === NOTEBOOK_STATUS.REPAIR) return 4;
      return 5;
    };

    return [...filteredNotebooks].sort((left, right) => {
      const rankDiff = getSortRank(left) - getSortRank(right);
      if (rankDiff !== 0) return rankDiff;
      return String(left?.asset_code || "").localeCompare(String(right?.asset_code || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [currentUserId, filteredNotebooks]);

  const availableNotebooks = useMemo(
    () =>
      visibleNotebooks.filter(
        (item) =>
          item?.status === NOTEBOOK_STATUS.AVAILABLE &&
          String(item?.current_user_id || "") === "",
      ),
    [visibleNotebooks],
  );

  const closeBorrowModal = useCallback(() => {
    setSelectedNotebook(null);
    setBorrowReason("");
    setBorrowLocation("");
    setBorrowFile(null);
    setCameraError(false);
    setBorrowFacingMode("environment");
    if (borrowPreview && borrowPreview.startsWith("blob:")) URL.revokeObjectURL(borrowPreview);
    setBorrowPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [borrowPreview]);

  const closeReturnDialog = useCallback(() => {
    setReturnDialogLog(null);
    setReturnFile(null);
    setReturnCameraError(false);
    setReturnFacingMode("environment");
    if (returnPreview && returnPreview.startsWith("blob:")) URL.revokeObjectURL(returnPreview);
    setReturnPreview("");
    if (returnFileInputRef.current) returnFileInputRef.current.value = "";
  }, [returnPreview]);

  const setPhotoFile = useCallback((file) => {
    if (!file) return;
    if (borrowPreview && borrowPreview.startsWith("blob:")) URL.revokeObjectURL(borrowPreview);
    setBorrowFile(file);
    setBorrowPreview(URL.createObjectURL(file));
  }, [borrowPreview]);

  const setReturnPhotoFile = useCallback((file) => {
    if (!file) return;
    if (returnPreview && returnPreview.startsWith("blob:")) URL.revokeObjectURL(returnPreview);
    setReturnFile(file);
    setReturnPreview(URL.createObjectURL(file));
  }, [returnPreview]);

  const handleBorrow = useCallback((notebook) => {
    if (!notebook) return;
    const ownerId = String(notebook?.current_user_id || "");
    const isBorrowedByOther = notebook?.status === NOTEBOOK_STATUS.BORROWED && ownerId !== "" && ownerId !== currentUserId;
    const isInconsistentBorrowed = isNotebookBorrowStateInconsistent(notebook);
    if (isBorrowedByOther || isInconsistentBorrowed || notebook?.status !== NOTEBOOK_STATUS.AVAILABLE) {
      const borrowerName = normalizeText(notebook?.current_user_name) || tt("common.otherUser");
      toast.error(
        isBorrowedByOther
          ? tt("toasts.borrowedByOther", { code: notebook?.asset_code || "-", name: borrowerName })
          : isInconsistentBorrowed
            ? tt("toasts.staleBorrowed", { code: notebook?.asset_code || "-" })
            : tt("toasts.notAvailable"),
      );
      return;
    }
    if (pendingBorrowRequest || activeBorrowLog || pendingReturnLog) {
      const pendingNotebookCode = getNotebookCodeFromLog(pendingBorrowRequest, notebooksById);
      const activeNotebookCode = getNotebookCodeFromLog(activeBorrowLog, notebooksById);
      const returnNotebookCode = getNotebookCodeFromLog(pendingReturnLog, notebooksById);
      if (pendingBorrowRequest) {
        toast.error(tt("toasts.pendingBorrow", { code: pendingNotebookCode }));
      } else if (activeBorrowLog) {
        toast.error(tt("toasts.activeBorrow", { code: activeNotebookCode }));
      } else if (pendingReturnLog) {
        toast.error(tt("toasts.pendingReturn", { code: returnNotebookCode }));
      } else {
        toast.error(tt("toasts.unresolved"));
      }
      return;
    }
    setSelectedNotebook(notebook);
    setBorrowReason("");
    setBorrowLocation("");
    setBorrowFile(null);
    setCameraError(false);
    setBorrowFacingMode("environment");
    if (borrowPreview && borrowPreview.startsWith("blob:")) URL.revokeObjectURL(borrowPreview);
    setBorrowPreview("");
  }, [activeBorrowLog, borrowPreview, currentUserId, notebooksById, pendingBorrowRequest, pendingReturnLog, tt]);

  const captureFromCamera = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot?.();
    if (!imageSrc) return toast.error(tt("toasts.captureFailed"));
    try {
      const blob = await fetch(imageSrc).then((response) => response.blob());
      setPhotoFile(new File([blob], `notebook_${Date.now()}.jpg`, { type: "image/jpeg" }));
    } catch (error) {
      console.error(error);
      toast.error(tt("toasts.saveCameraFailed"));
    }
  }, [setPhotoFile, tt]);

  const captureReturnFromCamera = useCallback(async () => {
    const imageSrc = returnWebcamRef.current?.getScreenshot?.();
    if (!imageSrc) return toast.error(tt("toasts.returnCaptureFailed"));
    try {
      const blob = await fetch(imageSrc).then((response) => response.blob());
      setReturnPhotoFile(new File([blob], `notebook_return_${Date.now()}.jpg`, { type: "image/jpeg" }));
    } catch (error) {
      console.error(error);
      toast.error(tt("toasts.saveReturnCameraFailed"));
    }
  }, [setReturnPhotoFile, tt]);

  const handleBorrowSubmit = useCallback(async () => {
    if (!selectedNotebook) return;
    const reason = normalizeText(borrowReason);
    const location = normalizeText(borrowLocation);
    if (!reason) return toast.error(tt("toasts.reasonRequired"));
    if (!location) return toast.error(tt("toasts.locationRequired"));
    if (!borrowFile) return toast.error(tt("toasts.borrowPhotoRequired"));

    setIsSubmitting(true);
    try {
      const imageUrl = await uploadNotebookProof(borrowFile, currentUserId);
      const { error } = await requestNotebookBorrow({
        notebookId: Number(selectedNotebook.id),
        reason,
        location,
        imageUrl,
        imageName: borrowFile.name || null,
        imageMimeType: borrowFile.type || null,
        imageSize: borrowFile.size || null,
      });
      if (error) throw error;
      toast.success(tt("toasts.borrowSubmitted"));
      closeBorrowModal();
      await loadData({ silent: true });
    } catch (error) {
      console.error(error);
      if (String(error?.message || "").includes("active notebook borrow")) {
        toast.error(String(error?.message || "").replace("You already have an active notebook borrow:", tt("toasts.activeBorrowPrefix")));
        await loadData({ silent: true });
        return;
      }
      if (isNotebookSchemaError(error)) toast.error(tt("toasts.schemaContactIt"));
      else if (isNotebookPermissionDenied(error)) toast.error(tt("toasts.noPermissionForRequest"));
      else toast.error(error?.message || tt("toasts.borrowSubmitFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }, [borrowFile, borrowLocation, borrowReason, closeBorrowModal, currentUserId, loadData, selectedNotebook, tt]);

  const handleReturnRequest = useCallback((log) => {
    if (!log) return;
    const currentLogId = Number(log?.log_id || log?.id || 0);
    const pendingReturnId = Number(pendingReturnLog?.log_id || pendingReturnLog?.id || 0);
    if (pendingReturnId > 0 && currentLogId !== pendingReturnId) {
      toast.error(tt("toasts.returnAlreadyRequested"));
      loadData({ silent: true });
      return;
    }
    if (log?.status !== NOTEBOOK_LOG_STATUS.APPROVED) {
      toast.error(tt("toasts.returnNotEligible"));
      loadData({ silent: true });
      return;
    }
    const notebook = notebooksById.get(String(log?.notebook_id || ""));
    const isStillBorrowedByMe =
      notebook?.status === NOTEBOOK_STATUS.BORROWED &&
      String(notebook?.current_user_id || "") === currentUserId;
    if (!isStillBorrowedByMe) {
      toast.error(tt("toasts.returnStatusChanged"));
      loadData({ silent: true });
      return;
    }
    if (returnPreview && returnPreview.startsWith("blob:")) URL.revokeObjectURL(returnPreview);
    setReturnDialogLog(log);
    setReturnFile(null);
    setReturnCameraError(false);
    setReturnFacingMode("environment");
    setReturnPreview("");
  }, [currentUserId, loadData, notebooksById, pendingReturnLog, returnPreview, tt]);

  const handleConfirmReturn = useCallback(async () => {
    if (!returnDialogLog) return;
    if (!returnFile) return toast.error(tt("toasts.returnPhotoRequired"));
    setIsSubmitting(true);
    try {
      const returnImageUrl = await uploadNotebookReturnProof(returnFile, currentUserId);
      const { error } = await requestNotebookReturn({
        logId: Number(returnDialogLog.log_id || returnDialogLog.id),
        returnImageUrl,
        returnImageName: returnFile.name || null,
        returnImageMimeType: returnFile.type || null,
        returnImageSize: returnFile.size || null,
      });
      if (error) throw error;
      toast.success(tt("toasts.returnSubmitted"));
      closeReturnDialog();
      await loadData({ silent: true });
    } catch (error) {
      console.error(error);
      if (String(error?.code || "") === "P0001" && String(error?.message || "").toLowerCase().includes("not currently borrowed")) {
        toast.error(tt("toasts.returnNoLongerBorrowed"));
        closeReturnDialog();
        await loadData({ silent: true });
        return;
      }
      if (isNotebookSchemaError(error)) toast.error(tt("toasts.schemaContactIt"));
      else if (isNotebookPermissionDenied(error)) toast.error(tt("toasts.noPermissionForRequest"));
      else toast.error(error?.message || tt("toasts.returnSubmitFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }, [closeReturnDialog, currentUserId, loadData, returnDialogLog, returnFile, tt]);

  if (!currentUserId) return null;

  const shellClass = isDarkTheme ? "border-slate-700 bg-slate-900/80 text-slate-100" : "border-blue-100 bg-white/95 text-slate-800";
  const mutedClass = isDarkTheme ? "border-slate-700 bg-slate-800/75" : "border-slate-200 bg-slate-50";
  const subtleTextClass = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const headingClass = isDarkTheme ? "text-slate-100" : "text-slate-900";
  const bodyClass = isDarkTheme ? "text-slate-300" : "text-slate-600";
  const returnNotebook = returnDialogLog ? notebooksById.get(String(returnDialogLog.notebook_id || "")) : null;

  return (
    <section className={`overflow-hidden rounded-3xl border ${shellClass}`}>
      <div className="bg-gradient-to-r from-[#1c376d] via-[#2b59b0] to-[#244a95] px-4 py-4 text-white sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/75">{tt("header.badge")}</p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">{tt("header.title")}</h2>
            <p className="mt-1 text-sm text-white/80">{tt("header.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => loadData()} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
              <RefreshCw size={14} />
              {tt("header.refresh")}
            </button>
            <button type="button" onClick={() => onOpenChat?.()} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white px-3 py-2 text-sm font-semibold text-[#244a95] transition hover:bg-white/90">
              <MessageCircle size={14} />
              {tt("header.openChat")}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {errorMessage && <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${isDarkTheme ? "border-rose-700 bg-rose-900/30 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{errorMessage}</div>}

        {pendingBorrowRequest && (
          <div className={`rounded-3xl border px-4 py-4 ${isDarkTheme ? "border-amber-700/50 bg-amber-950/30" : "border-amber-200 bg-amber-50/70"}`}>
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-500">{tt("sections.pendingRequestTitle")}</p>
            <h3 className={`mt-1 text-lg font-black ${headingClass}`}>{getNotebookCodeFromLog(pendingBorrowRequest, notebooksById)}</h3>
            <p className={`mt-1 text-sm ${bodyClass}`}>{tt("sections.pendingRequestSubtitle")}</p>
          </div>
        )}

        {activeBorrowLog && (
          <div className={`rounded-3xl border px-4 py-4 ${isDarkTheme ? "border-blue-700/50 bg-blue-950/30" : "border-blue-200 bg-blue-50/70"}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-blue-500">{tt("sections.activeBorrowTitle")}</p>
                <h3 className={`mt-1 text-lg font-black ${headingClass}`}>{getNotebookCodeFromLog(activeBorrowLog, notebooksById)}</h3>
                <p className={`mt-1 text-sm ${bodyClass}`}>{formatNotebookTime(activeBorrowLog.borrow_time)} • {currentUserName}</p>
              </div>
              <button type="button" onClick={() => handleReturnRequest(activeBorrowLog)} className="inline-flex items-center gap-2 rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#244a95]">
                <Upload size={14} className="hidden" />
                <ArrowLeft size={14} />
                {tt("actions.returnNotebook")}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={tt("sections.searchPlaceholder")}
              className={`w-full rounded-2xl border py-2.5 pl-9 pr-3 text-sm outline-none ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => loadData()} className={`rounded-2xl px-3 py-2 text-sm font-semibold ${isDarkTheme ? "border border-slate-600 bg-slate-800 text-slate-200" : "border border-slate-200 bg-white text-slate-700"}`}>
              {tt("header.refresh")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className={`flex min-h-[220px] items-center justify-center rounded-3xl border ${mutedClass}`}>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              {tt("sections.loading")}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:max-w-xs">
              <article className={`rounded-2xl border p-4 ${mutedClass}`}>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${subtleTextClass}`}>{tt("sections.availableNow")}</p>
                <p className="mt-1 text-2xl font-black text-emerald-500">{availableNotebooks.length}</p>
              </article>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {availableNotebooks.length === 0 ? (
                <div className={`rounded-3xl border border-dashed p-8 text-center ${mutedClass} lg:col-span-3`}>
                  <p className={`text-sm font-semibold ${headingClass}`}>{tt("sections.noAvailable")}</p>
                </div>
              ) : (
                availableNotebooks.map((notebook) => {
                  const notebookMeta = getNotebookDisplayStatusMeta(notebook, statusMeta, tt);
                  const myLog = latestLogByNotebook.get(String(notebook?.id || ""));
                  const currentOwnerId = String(notebook?.current_user_id || "");
                  const isMineActive = notebook?.status === NOTEBOOK_STATUS.BORROWED && currentOwnerId === currentUserId;
                  const isBorrowedByOther = notebook?.status === NOTEBOOK_STATUS.BORROWED && currentOwnerId !== "" && currentOwnerId !== currentUserId;
                  const isInconsistentBorrowed = isNotebookBorrowStateInconsistent(notebook);
                  const isMinePending = myLog?.status === NOTEBOOK_LOG_STATUS.PENDING;
                  const isMineReturnPending = myLog?.status === NOTEBOOK_LOG_STATUS.RETURNED && !myLog?.return_confirmed_at;
                  const isBlockedByOtherBorrow = Boolean(
                    pendingBorrowRequest ||
                    activeBorrowLog ||
                    pendingReturnLog ||
                    isMinePending ||
                    isMineReturnPending ||
                    isInconsistentBorrowed,
                  );
                  const canBorrow = notebook?.status === NOTEBOOK_STATUS.AVAILABLE && currentOwnerId === "" && !isBlockedByOtherBorrow;
                  const borrowerName = normalizeText(notebook?.current_user_name) || tt("common.otherUser");
                  const notebookImageUrl = normalizeText(notebook?.asset_image_url);

                  return (
                    <article key={notebook.id} className={`rounded-3xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-800/75" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`h-16 w-24 overflow-hidden rounded-2xl border ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-slate-50"}`}>
                            {notebookImageUrl ? (
                              <img src={notebookImageUrl} alt={notebook.asset_code || tt("borrowModal.notebookLabel")} className="h-full w-full object-cover" />
                            ) : (
                              <div className={`flex h-full items-center justify-center px-2 text-center text-[11px] font-bold ${subtleTextClass}`}>
                                {tt("sections.noImage")}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2b59b0]/70">{tt("sections.assetLabel")}</p>
                            <h3 className={`mt-1 text-lg font-black ${headingClass}`}>{notebook.asset_code}</h3>
                            <p className={`mt-1 text-sm ${bodyClass}`}>{notebook.model || "-"}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${notebookMeta.cls}`}>{notebookMeta.label}</span>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-100 bg-slate-50"}`}>
                          <span className={`text-xs ${subtleTextClass}`}>{isBorrowedByOther ? tt("sections.currentBorrower") : tt("sections.latestUser")}</span>
                          <span className={`max-w-[60%] truncate text-xs font-bold ${headingClass}`}>
                            {isBorrowedByOther
                              ? borrowerName
                              : isInconsistentBorrowed
                                ? tt("sections.noBorrowerFound")
                                : notebook.current_user_name || "-"}
                          </span>
                        </div>
                        {isBorrowedByOther && (
                          <div className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${isDarkTheme ? "border-blue-700/50 bg-blue-950/35 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
                            {tt("sections.borrowedHint")}
                          </div>
                        )}
                        {isInconsistentBorrowed && (
                          <div className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${isDarkTheme ? "border-rose-700/50 bg-rose-950/35 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                            {tt("sections.staleHint")}
                          </div>
                        )}
                        <div className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-100 bg-slate-50"}`}>
                          <span className={`text-xs ${subtleTextClass}`}>{tt("sections.time")}</span>
                          <span className={`text-xs font-bold ${headingClass}`}>{formatNotebookTime(notebook.borrow_time || notebook.latest_log_requested_at)}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {isMinePending && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${logMeta[NOTEBOOK_LOG_STATUS.PENDING].cls}`}>{tt("status.pending")}</span>}
                        {isMineActive && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${logMeta[NOTEBOOK_LOG_STATUS.APPROVED].cls}`}>{tt("status.inUse")}</span>}
                        {isMineReturnPending && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${logMeta[NOTEBOOK_LOG_STATUS.RETURNED].cls}`}>{tt("status.returnPending")}</span>}
                      </div>

                      <div className="mt-4">
                        {notebook?.status === NOTEBOOK_STATUS.REPAIR ? (
                          <button type="button" disabled className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{tt("actions.repairInProgress")}</button>
                        ) : isMineActive ? (
                          <button type="button" onClick={() => handleReturnRequest(myLog)} className="w-full rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white">{tt("actions.returnShort")}</button>
                        ) : canBorrow ? (
                          <button type="button" onClick={() => handleBorrow(notebook)} className="w-full rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white">{tt("actions.borrowShort")}</button>
                        ) : (
                          <button type="button" disabled className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
                            {isInconsistentBorrowed
                              ? tt("sections.waitReset")
                              : isBorrowedByOther
                              ? tt("sections.borrowedBy", { name: borrowerName })
                              : notebook?.status === NOTEBOOK_STATUS.BORROWED
                                ? tt("sections.occupied")
                              : pendingBorrowRequest
                                ? tt("sections.pendingApprovalCode", { code: getNotebookCodeFromLog(pendingBorrowRequest, notebooksById) })
                                : activeBorrowLog
                                  ? tt("sections.borrowingCode", { code: getNotebookCodeFromLog(activeBorrowLog, notebooksById) })
                                  : pendingReturnLog
                                    ? tt("sections.pendingReturnCode", { code: getNotebookCodeFromLog(pendingReturnLog, notebooksById) })
                                    : tt("sections.clearPending")}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#2b59b0]" />
                <h3 className={`text-sm font-black ${headingClass}`}>{tt("sections.historyTitle")}</h3>
              </div>
              {myLogs.length === 0 ? (
                <div className={`rounded-3xl border border-dashed p-8 text-center ${mutedClass}`}>
                  <p className={`text-sm font-semibold ${headingClass}`}>{tt("sections.noHistory")}</p>
                </div>
              ) : (
                myLogs.slice(0, 8).map((log) => {
                  const notebook = notebooksById.get(String(log?.notebook_id || ""));
                  const meta = logMeta[log?.status] || logMeta[NOTEBOOK_LOG_STATUS.PENDING];
                  const durationText = log?.return_time ? formatDuration(log.borrow_time, log.return_time, tt) : log?.borrow_time ? formatDuration(log.borrow_time, new Date().toISOString(), tt) : "-";
                  return (
                    <article key={log.log_id} className={`rounded-3xl border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-800/75" : "border-slate-200 bg-white"}`}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isDarkTheme ? "border-slate-600 bg-slate-900/60 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{notebook?.asset_code || log?.asset_code || "-"}</span>
                          </div>
                          <h4 className={`mt-2 text-base font-black ${headingClass}`}>{notebook?.model || log?.model || "-"}</h4>
                          <p className={`mt-1 text-sm ${bodyClass}`}>{log?.reason || "-"} • {log?.location || "-"}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className={`rounded-full border px-2.5 py-1 ${isDarkTheme ? "border-slate-700 bg-slate-900/70 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{tt("sections.borrowedAt", { value: formatNotebookTime(log?.borrow_time || log?.requested_at) })}</span>
                            <span className={`rounded-full border px-2.5 py-1 ${isDarkTheme ? "border-slate-700 bg-slate-900/70 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{tt("sections.returnedAt", { value: formatNotebookTime(log?.return_time) })}</span>
                            <span className={`rounded-full border px-2.5 py-1 ${isDarkTheme ? "border-slate-700 bg-slate-900/70 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{tt("sections.durationUsed", { value: durationText })}</span>
                          </div>
                        </div>
                        {log?.status === NOTEBOOK_LOG_STATUS.APPROVED && (
                          <button type="button" onClick={() => handleReturnRequest(log)} className="rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white">{tt("actions.returnShort")}</button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {selectedNotebook && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
          <button type="button" onClick={closeBorrowModal} className="absolute inset-0" aria-label={tt("common.close")} />
          <div className={`relative z-10 flex w-full max-w-5xl max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-[1.6rem] border sm:rounded-[2rem] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2b59b0]/80">{tt("borrowModal.badge")}</p>
                <h3 className={`mt-1 text-xl font-black ${headingClass}`}>{selectedNotebook.asset_code}</h3>
                <p className={`mt-1 text-sm ${bodyClass}`}>{selectedNotebook.model || "-"}</p>
              </div>
              <button type="button" onClick={closeBorrowModal} className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-600"}`}>
                <X size={15} />
              </button>
            </div>
            <div className="grid flex-1 min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:px-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
              <div className="space-y-4">
                <div className={`overflow-hidden rounded-[1.75rem] border ${isDarkTheme ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-100"}`}>
                  {cameraError ? (
                    <div className="flex min-h-[280px] items-center justify-center text-center">
                      <div>
                        <Camera size={28} className="mx-auto text-[#2b59b0]" />
                        <p className={`mt-3 text-sm font-semibold ${headingClass}`}>{tt("borrowModal.cameraUnavailable")}</p>
                        <p className={`mt-1 text-xs ${bodyClass}`}>{tt("borrowModal.cameraFallback")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-950 sm:aspect-video">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.92}
                        mirrored={borrowFacingMode === "user"}
                        videoConstraints={{ facingMode: borrowFacingMode }}
                        onUserMediaError={() => setCameraError(true)}
                        className={`absolute inset-0 h-full w-full object-cover transition duration-200 ${borrowPreview ? "opacity-25" : "opacity-100"}`}
                      />
                      {borrowPreview && (
                        <img src={borrowPreview} alt="borrow-preview" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-slate-950/80 to-transparent px-4 py-3 text-white">
                        <div className="min-w-0">
                          <p className="text-sm font-bold">{tt("borrowModal.cameraTitle")}</p>
                          <p className="text-[11px] text-white/75">
                            {borrowPreview ? tt("borrowModal.previewReady") : tt("borrowModal.previewPending")}
                          </p>
                        </div>
                        {borrowPreview && (
                          <span className="inline-flex rounded-full border border-white/15 bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                            {tt("borrowModal.ready")}
                          </span>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] text-white/75">
                          {borrowPreview ? tt("borrowModal.switchHintReady") : tt("borrowModal.switchHintPending")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setBorrowFacingMode((mode) => (mode === "user" ? "environment" : "user"))}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15 max-sm:flex-1 max-sm:justify-center"
                          >
                            <FlipHorizontal size={14} />
                            <span className="hidden sm:inline">{tt("actions.switchCamera")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={captureFromCamera}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-[#244a95] max-sm:flex-1 max-sm:justify-center"
                          >
                            <Camera size={14} />
                            {borrowPreview ? tt("actions.retake") : tt("actions.capture")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold max-sm:flex-1 max-sm:justify-center ${isDarkTheme ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}>
                    <Upload size={14} />
                    {tt("actions.uploadImage")}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => setPhotoFile(event.target.files?.[0])} />
                </div>
              </div>

              <div className="space-y-4">
                <div className={`rounded-[1.75rem] border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-800/70" : "border-slate-100 bg-slate-50/80"}`}>
                  <p className={`text-sm font-bold ${headingClass}`}>{tt("borrowModal.notebookLabel")}</p>
                  <p className={`mt-1 text-sm ${bodyClass}`}>{selectedNotebook.asset_code}</p>
                </div>
                <label className="block">
                  <span className={`text-xs font-bold uppercase tracking-wider ${subtleTextClass}`}>{tt("borrowModal.reasonLabel")}</span>
                  <textarea
                    rows={4}
                    value={borrowReason}
                    onChange={(event) => setBorrowReason(event.target.value)}
                    placeholder={tt("borrowModal.reasonPlaceholder")}
                    className={`mt-2 w-full rounded-[1.4rem] border px-4 py-3 text-sm outline-none ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
                  />
                </label>
                <label className="block">
                  <span className={`text-xs font-bold uppercase tracking-wider ${subtleTextClass}`}>{tt("borrowModal.locationLabel")}</span>
                  <div className="relative mt-2">
                    <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={borrowLocation}
                      onChange={(event) => setBorrowLocation(event.target.value)}
                      placeholder={tt("borrowModal.locationPlaceholder")}
                      className={`w-full rounded-[1.4rem] border py-3 pl-9 pr-4 text-sm outline-none ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
                    />
                  </div>
                </label>
              </div>
            </div>
            <div className={`shrink-0 flex flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
              <div className={`text-xs ${subtleTextClass}`}>{tt("borrowModal.submitHint")}</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={closeBorrowModal} className={`rounded-2xl px-3 py-2 text-sm font-semibold max-sm:w-full ${isDarkTheme ? "border border-slate-700 bg-slate-800 text-slate-100" : "border border-slate-200 bg-white text-slate-700"}`}>{tt("actions.cancel")}</button>
                <button type="button" onClick={handleBorrowSubmit} disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 max-sm:w-full">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {tt("actions.submitBorrow")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {returnDialogLog && (
        <div className="fixed inset-0 z-[81] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
          <button type="button" onClick={closeReturnDialog} className="absolute inset-0" aria-label={tt("common.close")} />
          <div className={`relative z-10 flex w-full max-w-5xl max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-[1.6rem] border sm:rounded-[2rem] ${isDarkTheme ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
            <div className="border-b border-slate-200/70 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2b59b0]/80">{tt("returnModal.badge")}</p>
                  <h3 className={`mt-1 text-xl font-black ${headingClass}`}>{returnNotebook?.asset_code || "-"}</h3>
                  <p className={`mt-1 text-sm ${bodyClass}`}>{tt("returnModal.subtitle")}</p>
                </div>
                <button
                  type="button"
                  onClick={closeReturnDialog}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border ${isDarkTheme ? "border-slate-600 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="grid flex-1 min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:px-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
              <div className="space-y-4">
                <div className={`overflow-hidden rounded-[1.5rem] border ${isDarkTheme ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-100"}`}>
                  {returnCameraError ? (
                    <div className="flex min-h-[240px] items-center justify-center text-center">
                      <div>
                        <Camera size={28} className="mx-auto text-[#2b59b0]" />
                        <p className={`mt-3 text-sm font-semibold ${headingClass}`}>{tt("returnModal.cameraUnavailable")}</p>
                        <p className={`mt-1 text-xs ${bodyClass}`}>{tt("returnModal.cameraFallback")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-950 sm:aspect-video">
                      <Webcam
                        ref={returnWebcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.92}
                        mirrored={returnFacingMode === "user"}
                        videoConstraints={{ facingMode: returnFacingMode }}
                        onUserMediaError={() => setReturnCameraError(true)}
                        className={`absolute inset-0 h-full w-full object-cover transition duration-200 ${returnPreview ? "opacity-25" : "opacity-100"}`}
                      />
                      {returnPreview && (
                        <img src={returnPreview} alt="return-preview" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-slate-950/80 to-transparent px-4 py-3 text-white">
                        <div className="min-w-0">
                          <p className="text-sm font-bold">{tt("returnModal.cameraTitle")}</p>
                          <p className="text-[11px] text-white/75">{returnPreview ? tt("returnModal.previewReady") : tt("returnModal.previewPending")}</p>
                        </div>
                        {returnPreview && (
                          <span className="inline-flex rounded-full border border-white/15 bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                            {tt("returnModal.ready")}
                          </span>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] text-white/75">{returnPreview ? tt("returnModal.switchHintReady") : tt("returnModal.switchHintPending")}</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setReturnFacingMode((mode) => (mode === "user" ? "environment" : "user"))}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                          >
                            <FlipHorizontal size={14} />
                            <span className="hidden sm:inline">{tt("actions.switchCamera")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={captureReturnFromCamera}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-[#244a95] max-sm:flex-1 max-sm:justify-center"
                          >
                            <Camera size={14} />
                            {returnPreview ? tt("actions.retake") : tt("actions.capture")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => returnFileInputRef.current?.click()} className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold max-sm:flex-1 max-sm:justify-center ${isDarkTheme ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}>
                    <Upload size={14} />
                    {tt("actions.uploadImage")}
                  </button>
                  <input ref={returnFileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => setReturnPhotoFile(event.target.files?.[0])} />
                </div>
              </div>

              <div className="space-y-3">
                <div className={`rounded-[1.5rem] border p-4 ${isDarkTheme ? "border-slate-700 bg-slate-800/70" : "border-slate-50 bg-slate-50"}`}>
                  <p className={`text-sm font-bold ${headingClass}`}>{tt("returnModal.summaryTitle")}</p>
                  <p className={`mt-1 text-sm ${bodyClass}`}>{returnNotebook?.model || "-"}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-1">
                    <span className={`rounded-2xl border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>{tt("returnModal.returner", { name: currentUserName })}</span>
                    <span className={`rounded-2xl border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>{tt("returnModal.borrowedWhen", { value: formatNotebookTime(returnDialogLog.borrow_time) })}</span>
                    <span className={`rounded-2xl border px-3 py-2 ${isDarkTheme ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>{tt("returnModal.durationUsed", { value: formatDuration(returnDialogLog.borrow_time, new Date().toISOString(), tt) })}</span>
                  </div>
                </div>
                <div className={`rounded-[1.5rem] border px-4 py-3 text-sm ${isDarkTheme ? "border-blue-700/40 bg-blue-950/30 text-blue-100" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
                  {tt("returnModal.requiredHint")}
                </div>
              </div>
            </div>
            <div className={`flex flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${isDarkTheme ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
              <p className={`text-xs ${subtleTextClass}`}>{tt("returnModal.submitHint")}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={closeReturnDialog} className={`rounded-2xl px-3 py-2 text-sm font-semibold ${isDarkTheme ? "border border-slate-700 bg-slate-800 text-slate-100" : "border border-slate-200 bg-white text-slate-700"}`}>{tt("actions.cancel")}</button>
                <button type="button" onClick={handleConfirmReturn} disabled={isSubmitting || !returnFile} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2b59b0] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {tt("actions.confirmReturn")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
